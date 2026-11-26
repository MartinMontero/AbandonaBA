"""CLI `lft-rag`: ingest, ingest-all, query, inspect-article y serve (LFT + LSS)."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Literal

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from .config import get_settings

app = typer.Typer(add_completion=False, help="RAG jurídico local sobre la LFT y LSS (México).")
console = Console()


def _print_json(data: Any) -> None:
    sys.stdout.buffer.write((json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    sys.stdout.flush()


def _render_manifest(m: dict[str, Any], skipped: bool) -> None:
    if skipped:
        console.print(
            f"[yellow]Índice al día (corpus {str(m.get('corpus_version_hash', ''))[:12]}…); no se reindexó.[/] Usa --force para forzar."
        )
    else:
        console.print("[green]Índice construido.[/]")
    t = Table(show_header=False)
    for k, v in m.items():
        t.add_row(k, json.dumps(v, ensure_ascii=False) if isinstance(v, dict) else str(v))
    console.print(t)


@app.command()
def ingest(
    pdf_path: Path = typer.Argument(..., exists=True, dir_okay=False, help="PDF oficial de la ley (LFT o LSS)"),
    law: Literal["LFT", "LSS"] = typer.Option("LFT", "--law", help="Estatuto del PDF: LFT | LSS"),
    force: bool = typer.Option(False, "--force", help="Reindexar aunque el SHA-256 y el modelo no hayan cambiado"),
    as_json: bool = typer.Option(False, "--json"),
) -> None:
    """Parsea, fragmenta e indexa el PDF de un estatuto (LFT o LSS)."""
    from .indexer import ingest as do_ingest

    result = do_ingest(pdf_path, get_settings(), force=force, law_code=law)
    if as_json:
        _print_json({"skipped": result.skipped, "manifest": result.manifest})
        return
    _render_manifest(result.manifest, result.skipped)


@app.command("ingest-all")
def ingest_all_cmd(
    lft_pdf: Path | None = typer.Option(None, "--lft", help="Ruta al PDF de la LFT"),
    lss_pdf: Path | None = typer.Option(None, "--lss", help="Ruta al PDF de la LSS"),
    force: bool = typer.Option(False, "--force", help="Reindexar todos los estatutos"),
    as_json: bool = typer.Option(False, "--json"),
) -> None:
    """Indexa LFT y LSS en el corpus unificado."""
    from .indexer import ingest_all

    s = get_settings()
    sources: dict[Literal["LFT", "LSS"], Path] = {
        "LFT": lft_pdf or s.resolved_pdf_path("LFT"),
        "LSS": lss_pdf or s.resolved_pdf_path("LSS"),
    }
    result = ingest_all(sources, s, force=force)
    if as_json:
        _print_json({"skipped": result.skipped, "manifest": result.manifest})
        return
    _render_manifest(result.manifest, result.skipped)


@app.command()
def query(
    question: str = typer.Argument(...),
    law_filter: Literal["LFT", "LSS", "ALL"] = typer.Option("ALL", "--law-filter", help="LFT | LSS | ALL"),
    decision_backend: str = typer.Option(None, "--decision-backend", help="jev | jeff | off"),
    include_transitorios: bool = typer.Option(False, "--include-transitorios"),
    exclude_derogados: bool = typer.Option(False, "--exclude-derogados"),
    as_json: bool = typer.Option(False, "--json"),
) -> None:
    """Ejecuta el pipeline completo (RRF → Compuerta 1 → generador → Compuerta 2)."""
    from .decision import build_decision_engine
    from .generator import LegalRAG, build_generator
    from .retriever import HybridRetriever

    s = get_settings()
    rag = LegalRAG(s, HybridRetriever(s), build_decision_engine(s, decision_backend), build_generator(s))
    resp = rag.answer(question, include_transitorios, exclude_derogados, law_filter=law_filter)
    if as_json:
        _print_json(resp.model_dump())
        return
    color = {"VERIFIED": "green", "UNVERIFIED": "red", "INSUFFICIENT_CONTEXT": "yellow", "SOURCES_ONLY": "cyan"}[resp.status]
    console.print(Panel(resp.answer, title=f"[{color}]{resp.status}[/]", subtitle=f"decision={resp.decision_backend} generator={resp.generator_backend}"))
    for r in resp.unverified_reasons:
        console.print(f"[red]•[/] {r}")
    t = Table("Ley", "Artículo", "Estado", "Reforma DOF", "Relevancia", "RRF", "Jerarquía")
    for a in resp.filtered_articles:
        t.add_row(
            a.law_code,
            a.articulo_id + (f" ({a.part_index}/{a.part_total})" if a.part_total > 1 else ""),
            "[red]DEROGADO[/]" if a.is_derogado else "vigente",
            a.reform_date or "—",
            "—" if a.relevance_score is None else f"{a.relevance_score:.2f}",
            "—" if a.rrf_score is None else f"{a.rrf_score:.4f}",
            " / ".join(p for p in (a.titulo, a.capitulo) if p),
        )
    console.print(t)
    console.print(f"[dim]{resp.disclaimer}[/]")


@app.command("inspect-article")
def inspect_article(
    articulo_id: str = typer.Argument(..., help='p. ej. "47", "3 Bis", "15-A", "27"'),
    law: Literal["LFT", "LSS"] = typer.Option("LFT", "--law", help="Estatuto: LFT | LSS"),
    include_transitorios: bool = typer.Option(False, "--include-transitorios"),
    as_json: bool = typer.Option(False, "--json"),
) -> None:
    """Búsqueda exacta y determinista de un artículo por su identificador y estatuto."""
    from .generator import ArticleOut
    from .parser import normalize_articulo_id
    from .retriever import HybridRetriever

    r = HybridRetriever(get_settings())
    chunks = r.get_article_chunks(articulo_id, include_transitorios=include_transitorios, law_code=law)
    canon = normalize_articulo_id(articulo_id)
    law_reforma = (r.manifest.get("laws", {}).get(law, {}) or {}).get(
        "ultima_reforma_dof", r.manifest.get("lft_ultima_reforma_dof", "")
    )
    out = {
        "query": articulo_id,
        "law_code": law,
        "articulo_id": chunks[0].articulo_id if chunks else canon,
        "found": bool(chunks),
        "is_derogado": chunks[0].is_derogado if chunks else None,
        "reform_date": chunks[0].reform_date if chunks else None,
        "ultima_reforma_dof": law_reforma,
        "lft_ultima_reforma_dof": r.manifest.get("lft_ultima_reforma_dof", ""),
        "lss_ultima_reforma_dof": r.manifest.get("lss_ultima_reforma_dof", ""),
        "chunks": [ArticleOut.from_chunk(c).model_dump() for c in chunks],
    }
    if as_json:
        _print_json(out)
        if not chunks:
            raise typer.Exit(code=1)
        return
    if not chunks:
        console.print(f"[red]Artículo {canon} ({law}) no encontrado.[/]")
        raise typer.Exit(code=1)
    c0 = chunks[0]
    head = f"{law} · Artículo {c0.articulo_label} — {'[red]DEROGADO[/]' if c0.is_derogado else 'vigente'} — última reforma DOF {c0.reform_date or '—'}"
    console.print(Panel("\n\n".join(c.body for c in chunks), title=head, subtitle=" / ".join(p for p in (c0.titulo, c0.capitulo, c0.seccion) if p)))


@app.command()
def serve() -> None:
    """Arranca la API HTTP + MCP en LFT_API_HOST:LFT_API_PORT (sin log de accesos)."""
    from .api import run

    run()


if __name__ == "__main__":
    app()
