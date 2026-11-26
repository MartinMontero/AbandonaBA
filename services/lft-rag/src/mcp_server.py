"""Servidor MCP multi-ley (LFT + LSS) con FastMCP (stdio para Claude Code + Streamable HTTP en /mcp)."""
from __future__ import annotations

import contextlib
import sys
from collections.abc import Callable
from typing import Any, Literal

from fastmcp import FastMCP
from mcp.types import ToolAnnotations

from .config import LawCode, LawFilter, Settings, get_settings
from .parser import normalize_articulo_id

mcp = FastMCP("legal-rag")

_state_provider: Callable[[], Any] | None = None
_default_state: Any | None = None


def set_state_provider(provider: Callable[[], Any] | None) -> None:
    """Permite que FastAPI (o pruebas) inyecte su ServiceState compartido."""
    global _state_provider
    _state_provider = provider


def _get_state() -> Any:
    if _state_provider is not None:
        return _state_provider()
    global _default_state
    if _default_state is None:
        from .api import ServiceState

        _default_state = ServiceState(get_settings())
    return _default_state


_READ_ONLY = ToolAnnotations(readOnlyHint=True, idempotentHint=True)


def _run_query(
    question: str,
    law_filter: LawFilter = "ALL",
    include_transitorios: bool = False,
    exclude_derogados: bool = False,
) -> dict[str, Any]:
    s: Settings = _get_state().settings
    q = question.strip()
    if len(q) < 3:
        raise ValueError("Escribe una pregunta más completa (mínimo 3 caracteres).")
    if len(q) > s.max_question_chars:
        raise ValueError(f"La pregunta excede {s.max_question_chars} caracteres.")
    resp = _get_state().rag.answer(
        q,
        include_transitorios=include_transitorios,
        exclude_derogados=exclude_derogados,
        law_filter=law_filter,
    )
    return resp.model_dump()


def _run_inspect(
    articulo_id: str,
    law_code: LawCode = "LFT",
    include_transitorios: bool = False,
) -> dict[str, Any]:
    from .generator import ArticleOut

    retr = _get_state().retriever
    chunks = retr.get_article_chunks(
        articulo_id, include_transitorios=include_transitorios, law_code=law_code
    )
    canon = normalize_articulo_id(articulo_id)
    law_reforma = (retr.manifest.get("laws", {}).get(law_code, {}) or {}).get(
        "ultima_reforma_dof", retr.manifest.get("lft_ultima_reforma_dof", "")
    )
    return {
        "law_code": law_code,
        "articulo_id": chunks[0].articulo_id if chunks else canon,
        "found": bool(chunks),
        "is_derogado": chunks[0].is_derogado if chunks else None,
        "reform_date": chunks[0].reform_date if chunks else None,
        "ultima_reforma_dof": law_reforma,
        "corpus_version_hash": retr.manifest.get("corpus_version_hash", ""),
        "chunks": [ArticleOut.from_chunk(c).model_dump() for c in chunks],
    }


@mcp.tool(annotations=_READ_ONLY)
def query_legal_corpus(
    question: str,
    law_filter: Literal["LFT", "LSS", "ALL"] = "ALL",
    include_transitorios: bool = False,
    exclude_derogados: bool = False,
) -> dict[str, Any]:
    """Consulta el corpus jurídico mexicano (LFT y LSS / IMSS) con recuperación híbrida y compuertas de verificación."""
    return _run_query(question, law_filter, include_transitorios, exclude_derogados)


@mcp.tool(annotations=_READ_ONLY)
def query_lft(
    question: str,
    include_transitorios: bool = False,
    exclude_derogados: bool = False,
) -> dict[str, Any]:
    """Alias compatible: consulta el corpus jurídico (por omisión LFT + LSS)."""
    return _run_query(question, "ALL", include_transitorios, exclude_derogados)


@mcp.tool(annotations=_READ_ONLY)
def inspect_statute_article(
    articulo_id: str,
    law_code: Literal["LFT", "LSS"] = "LFT",
    include_transitorios: bool = False,
) -> dict[str, Any]:
    """Búsqueda exacta y determinista de un artículo por estatuto ('LFT' o 'LSS') e identificador canónico."""
    return _run_inspect(articulo_id, law_code, include_transitorios)


@mcp.tool(annotations=_READ_ONLY)
def inspect_lft_article(
    articulo_id: str,
    include_transitorios: bool = False,
) -> dict[str, Any]:
    """Alias compatible: búsqueda exacta de un artículo de la Ley Federal del Trabajo (LFT)."""
    return _run_inspect(articulo_id, "LFT", include_transitorios)


def main() -> None:
    # En stdio, cualquier escritura accidental a stdout corrompe JSON-RPC; redirigimos imports/logs a stderr.
    with contextlib.redirect_stdout(sys.stderr):
        _ = get_settings()
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
