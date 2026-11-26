"""CLI `lft-rag`: ingest, query, inspect-article y serve. Todas las consultas aceptan --json para uso programático."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from .config import get_settings

app = typer.Typer(add_completion=False, help="RAG jurídico local sobre la Ley Federal del Trabajo (México).")
console = Console()


def _print_json(data: Any) -> None:
    sys.stdout.buffer.write((json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    sys.stdout.flush()


@app.command()
def ingest(
    pdf_path: Path = typer.Argument(..., exists=True, dir_okay=False, help="PDF oficial de la LFT"),
    force: bool = typer.Option(False, "--force", help="Reindexar aunque el SHA-256 y el modelo no hayan cambiado"),
    as_json: bool = typer.Option(False, "--json"),
) -> None:
    """Parsea, fragmenta e indexa el PDF (omite el trabajo si nada cambió)."""
    from .indexer import ingest as do_ingest

    result = do_ingest(pdf_path, get_settings(), force=force)
    if as_json:
        _print_json({"skipped": result.skipped, "manifest": result.manifest})
        return
    m = result.manifest
    if result.skipped:
        console.print(f"[yellow]Índice al día (SHA-256 {m['pdf_sha256'][:12]}…); no se reindexó.[/] Usa --force para forzar.")
    else:
        console.print("[green]Índice construido.[/]")
    t = Table(show_header=False)
    for k, v in m.items():
        t.add_row(k, str(v))
    console.print(t)


@app.command()
def query(
    question: str = typer.Argument(...),
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
    resp = rag.answer(question, include_transitorios, exclude_derogados)
    if as_json:
        _print_json(resp.model_dump())
        return
    color = {"VERIFIED": "green", "UNVERIFIED": "red", "INSUFFICIENT_CONTEXT": "yellow", "SOURCES_ONLY": "cyan"}[resp.status]
    console.print(Panel(resp.answer, title=f"[{color}]{resp.status}[/]", subtitle=f"decision={resp.decision_backend} generator={resp.generator_backend}"))
    for r in resp.unverified_reasons:
        console.print(f"[red]•[/] {r}")
    t = Table("Artículo", "Estado", "Reforma DOF", "Relevancia", "RRF", "Jerarquía")
    for a in resp.filtered_articles:
        t.add_row(
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
    articulo_id: str = typer.Argument(..., help='p. ej. "47", "3 Bis", "15-A", "512-D Bis"'),
    include_transitorios: bool = typer.Option(False, "--include-transitorios"),
    as_json: bool = typer.Option(False, "--json"),
) -> None:
    """Búsqueda exacta y determinista de un artículo por su identificador."""
    from .generator import ArticleOut
    from .parser import normalize_articulo_id
    from .retriever import HybridRetriever

    r = HybridRetriever(get_settings())
    chunks = r.get_article_chunks(articulo_id, include_transitorios=include_transitorios)
    canon = normalize_articulo_id(articulo_id)
    out = {
        "query": articulo_id,
        "articulo_id": chunks[0].articulo_id if chunks else canon,
        "found": bool(chunks),
        "is_derogado": chunks[0].is_derogado if chunks else None,
        "reform_date": chunks[0].reform_date if chunks else None,
        "lft_ultima_reforma_dof": r.manifest.get("lft_ultima_reforma_dof", ""),
        "chunks": [ArticleOut.from_chunk(c).model_dump() for c in chunks],
    }
    if as_json:
        _print_json(out)
        if not chunks:
            raise typer.Exit(code=1)
        return
    if not chunks:
        console.print(f"[red]Artículo {canon} no encontrado.[/]")
        raise typer.Exit(code=1)
    c0 = chunks[0]
    head = f"Artículo {c0.articulo_label} — {'[red]DEROGADO[/]' if c0.is_derogado else 'vigente'} — última reforma DOF {c0.reform_date or '—'}"
    console.print(Panel("\n\n".join(c.body for c in chunks), title=head, subtitle=" / ".join(p for p in (c0.titulo, c0.capitulo, c0.seccion) if p)))


@app.command()
def serve() -> None:
    """Arranca la API HTTP en LFT_API_HOST:LFT_API_PORT (sin log de accesos)."""
    from .api import run

    run()


if __name__ == "__main__":
    app()
