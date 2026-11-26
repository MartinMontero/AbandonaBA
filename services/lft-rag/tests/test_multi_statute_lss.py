from __future__ import annotations

from .conftest import FakeDecision, FakeGenerator, FakeRetriever, make_chunk

from src.config import Settings
from src.generator import (
    LegalRAG,
    extract_cited_statute_articles,
    format_articles_for_prompt,
    verify_citations_deterministically,
)
from src.indexer import compute_corpus_version_hash
from src.parser import ArticleChunk, _split_into_articles, build_chunks


def _make_lss_chunk(aid: str, body: str, part: int = 1) -> ArticleChunk:
    return ArticleChunk(
        chunk_id=f"lss_art_{aid}_part_{part - 1}",
        articulo_id=aid,
        articulo_label=aid,
        text=f"[TITULO SEGUNDO]\nArtículo {aid}.- {body}",
        body=body,
        titulo="TITULO SEGUNDO - Del Régimen Obligatorio",
        capitulo="CAPITULO I - Generalidades",
        is_derogado=False,
        is_transitorio=False,
        reform_date="15-01-2026",
        part_index=part,
        part_total=1,
        page_start=10,
        law_code="LSS",
    )


def test_lss_and_lft_chunk_ids_do_not_collide() -> None:
    lft_text = "Artículo 27.- El salario en la LFT se fija por unidad de tiempo."
    lss_text = "Artículo 27.- El salario base de cotización se integra con los pagos hechos en efectivo."

    lft_chunks = build_chunks([lft_text], max_tokens=480, law_code="LFT")
    lss_chunks = build_chunks([lss_text], max_tokens=480, law_code="LSS")

    assert len(lft_chunks) == 1
    assert len(lss_chunks) == 1
    assert lft_chunks[0].law_code == "LFT"
    assert lss_chunks[0].law_code == "LSS"
    assert lft_chunks[0].chunk_id.startswith("lft_art_27_part_")
    assert lss_chunks[0].chunk_id.startswith("lss_art_27_part_")
    assert lft_chunks[0].chunk_id != lss_chunks[0].chunk_id


def test_law_filter_isolates_lft_and_lss(settings: Settings) -> None:
    chunks = [
        make_chunk("27", "Salario en la LFT."),
        _make_lss_chunk("27", "Salario base de cotización en el IMSS."),
    ]
    retriever = FakeRetriever(chunks)
    rag = LegalRAG(settings, retriever, FakeDecision(scores={"27": 3.0}), FakeGenerator(""))

    res_lss = rag.answer("¿Cómo se integra el salario base?", law_filter="LSS")
    assert all(a.law_code == "LSS" for a in res_lss.filtered_articles)
    assert len(res_lss.filtered_articles) == 1

    res_lft = rag.answer("¿Cómo se fija el salario?", law_filter="LFT")
    assert all(a.law_code == "LFT" for a in res_lft.filtered_articles)
    assert len(res_lft.filtered_articles) == 1


def test_extract_cited_statute_articles_and_verify() -> None:
    text = (
        "Conforme al Artículo 27 de la LSS y al artículo 84 de la Ley Federal del Trabajo. "
        "También véase el artículo 123 constitucional."
    )
    cited = extract_cited_statute_articles(text)
    assert ("LSS", "27") in cited
    assert ("LFT", "84") in cited
    assert all(art != "123" for _, art in cited)

    lss_27 = _make_lss_chunk("27", "Salario base de cotización.")
    lft_84 = make_chunk("84", "Salario integrado LFT.")

    check_ok = verify_citations_deterministically(
        "El Artículo 27 de la LSS y el Artículo 84 de la LFT regulan el salario.",
        [lss_27, lft_84],
    )
    assert check_ok.passed is True
    assert check_ok.missing == []

    check_bad = verify_citations_deterministically(
        "Según el Artículo 999 de la LSS.",
        [lss_27],
    )
    assert check_bad.passed is False
    assert "LSS:999" in check_bad.missing


def test_format_articles_for_prompt_labels_statutes() -> None:
    lft_c = make_chunk("84", "Salario integrado.")
    lss_c = _make_lss_chunk("27", "Salario base de cotización.")
    rendered = format_articles_for_prompt([lft_c, lss_c])
    assert "LEY: LFT" in rendered
    assert "LEY: LSS (IMSS)" in rendered


def test_corpus_version_hash_is_deterministic_and_sensitive() -> None:
    h1 = compute_corpus_version_hash({"LFT": {"pdf_sha256": "aaa"}, "LSS": {"pdf_sha256": "bbb"}}, "model-1")
    h2 = compute_corpus_version_hash({"LSS": {"pdf_sha256": "bbb"}, "LFT": {"pdf_sha256": "aaa"}}, "model-1")
    h3 = compute_corpus_version_hash({"LFT": {"pdf_sha256": "aaa-changed"}, "LSS": {"pdf_sha256": "bbb"}}, "model-1")

    assert h1 == h2
    assert h1 != h3
    assert len(h1) == 64
