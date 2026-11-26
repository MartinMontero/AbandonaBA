from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from src.config import Settings
from src.decision import (
    JeffDecisionEngine,
    JevDecisionEngine,
    NoOpDecisionEngine,
    build_decision_engine,
    entropy_confidence,
    expected_score,
)
from src.generator import LegalRAG, NoneGenerator, extract_citations, verify_citations
from src.indexer import tokenize_es
from src.retriever import rrf_fuse

from .conftest import FakeDecision, FakeGenerator, FakeRetriever

# ---------------------------------------------------------------------------
# Verificador determinista de citas
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Según el Artículo 47, Título Segundo, el patrón...", ["47"]),
        ("Los Artículos 47, 48 y 50 regulan el despido.", ["47", "48", "50"]),
        ("Ver el Artículo 3o. Bis sobre hostigamiento.", ["3 Bis"]),
        ("El Artículo 15-A está derogado.", ["15-A"]),
        ("El artículo 512-D Bis prevé...", ["512-D Bis"]),
        ("artículos 76 e 78", ["76", "78"]),
        ("Art. 87 de la LFT", ["87"]),
    ],
)
def test_extract_citations(text: str, expected: list[str]) -> None:
    assert extract_citations(text) == expected


def test_constitutional_and_other_laws_are_ignored() -> None:
    text = (
        "Conforme al artículo 123, Apartado A, de la Constitución y al artículo 123 constitucional, "
        "además del artículo 109 de la Ley del Seguro Social, el Artículo 48 dispone la reinstalación."
    )
    assert extract_citations(text) == ["48"]


def test_verify_citations_detects_hallucinated_ids() -> None:
    ok = verify_citations("El Artículo 48 y el Artículo 50 establecen...", ["47", "48", "50"])
    assert ok.passed and ok.missing == []
    bad = verify_citations("El Artículo 48 y el Artículo 999 establecen...", ["48"])
    assert not bad.passed and bad.missing == ["999"]
    none = verify_citations("Tienes derecho a una indemnización.", ["48"])
    assert not none.passed and none.cited == []


# ---------------------------------------------------------------------------
# Utilidades numéricas y de recuperación
# ---------------------------------------------------------------------------


def test_expected_score_and_entropy() -> None:
    assert expected_score({0: 0.0, 1: 0.0, 2: 0.0, 3: 1.0}) == 3.0
    assert expected_score({0: 0.25, 1: 0.25, 2: 0.25, 3: 0.25}) == pytest.approx(1.5)
    assert entropy_confidence([1.0, 0.0, 0.0]) == pytest.approx(1.0)
    assert entropy_confidence([0.5, 0.5]) == pytest.approx(0.0)


def test_rrf_fusion_formula() -> None:
    fused = dict(rrf_fuse([["a", "b", "c"], ["b", "c", "d"]], k=60))
    assert fused["b"] == pytest.approx(1 / 62 + 1 / 61)
    assert fused["a"] == pytest.approx(1 / 61)
    assert max(fused, key=fused.get) == "b"


def test_bm25_tokenizer_keeps_legal_tokens() -> None:
    toks = tokenize_es("Artículo 15-A, 512-D Bis y 3o. Ter: indemnización del trabajador")
    assert "15-a" in toks and "512-d" in toks and "bis" in toks and "ter" in toks
    assert "3" in toks
    assert "indemnizacion" in toks
    assert "del" not in toks and "y" not in toks


# ---------------------------------------------------------------------------
# Compuertas del pipeline
# ---------------------------------------------------------------------------


def rag(settings: Settings, decision: Any, generator: Any, retriever: Any = None) -> LegalRAG:
    return LegalRAG(settings, retriever or FakeRetriever(), decision, generator)


def test_gate1_short_circuits_before_generator(settings: Settings) -> None:
    gen = FakeGenerator("El Artículo 48 ...")
    resp = rag(settings, FakeDecision(scores={}), gen).answer("¿Cuántos días de aguinaldo me tocan?")
    assert resp.status == "INSUFFICIENT_CONTEXT"
    assert gen.calls == 0
    assert resp.filtered_articles == []
    assert "No encontramos" in resp.answer


def test_gate1_threshold_and_top_k(settings: Settings) -> None:
    settings.max_filtered_articles = 2
    dec = FakeDecision(scores={"47": 1.4, "48": 3.0, "50": 2.0, "87": 1.6, "15-A": 0.0})
    gen = FakeGenerator("Conforme al Artículo 48 y al Artículo 50, ...")
    resp = rag(settings, dec, gen).answer("¿Qué me corresponde si me despiden?")
    assert [a.articulo_id for a in resp.filtered_articles] == ["48", "50"]
    assert all((a.relevance_score or 0) >= settings.relevance_threshold for a in resp.filtered_articles)


def test_verified_path(settings: Settings) -> None:
    dec = FakeDecision(scores={"48": 3.0, "50": 2.5}, supported=0.92, hallucinated=0.04)
    gen = FakeGenerator("Según el Artículo 48, Título Segundo, puedes pedir indemnización; el Artículo 50 fija veinte días por año.")
    resp = rag(settings, dec, gen).answer("¿Qué me corresponde si me despiden?")
    assert resp.status == "VERIFIED"
    assert resp.answer.startswith("Según el Artículo 48")
    assert resp.cited_articles == ["48", "50"]
    assert resp.deterministic_citation_passed is True
    assert resp.is_supported_prob == pytest.approx(0.92)
    assert resp.unverified_reasons == []
    state = dec.noul_states[0]
    assert {"user_query", "retrieved_articles", "draft_answer"} <= set(state)


@pytest.mark.parametrize(
    ("supported", "hallucinated", "draft", "reason_fragment"),
    [
        (0.50, 0.05, "Según el Artículo 48 ...", "Respaldo insuficiente"),
        (0.95, 0.60, "Según el Artículo 48 ...", "Posible cita inventada"),
        (0.95, 0.05, "Según el Artículo 999 ...", "no están entre los recuperados"),
        (0.95, 0.05, "Tienes derecho a una indemnización.", "no cita ningún artículo"),
    ],
)
def test_gate2_failures_return_unverified_with_sources(
    settings: Settings, supported: float, hallucinated: float, draft: str, reason_fragment: str
) -> None:
    dec = FakeDecision(scores={"48": 3.0}, supported=supported, hallucinated=hallucinated)
    resp = rag(settings, dec, FakeGenerator(draft)).answer("¿Qué me corresponde si me despiden?")
    assert resp.status == "UNVERIFIED"
    assert draft not in resp.answer  # el borrador no verificado nunca se muestra
    assert "No pudimos verificar" in resp.answer
    assert [a.articulo_id for a in resp.filtered_articles] == ["48"]
    assert any(reason_fragment in r for r in resp.unverified_reasons)
    assert resp.is_supported_prob == pytest.approx(supported)


def test_decision_off_never_claims_verified(settings: Settings) -> None:
    gen = FakeGenerator("Según el Artículo 47 ...")
    resp = rag(settings, NoOpDecisionEngine(), gen).answer("despido")
    assert gen.calls == 1
    assert len(resp.filtered_articles) == settings.max_filtered_articles
    assert resp.status == "UNVERIFIED"
    assert resp.deterministic_citation_passed is True
    assert any("no evaluado" in r for r in resp.unverified_reasons)


def test_generator_none_returns_sources_only(settings: Settings) -> None:
    resp = rag(settings, NoOpDecisionEngine(), NoneGenerator()).answer("aguinaldo")
    assert resp.status == "SOURCES_ONLY"
    assert resp.generator_backend == "none"
    assert len(resp.filtered_articles) == settings.max_filtered_articles
    assert resp.lft_ultima_reforma_dof == "14-05-2026"
    assert "abogado-cliente" in resp.disclaimer


def test_derogados_kept_by_default_and_flagged(settings: Settings) -> None:
    retr = FakeRetriever()
    resp = rag(settings, NoOpDecisionEngine(), NoneGenerator(), retr).answer("subcontratación")
    flagged = [a for a in resp.filtered_articles if a.articulo_id == "15-A"]
    assert flagged and flagged[0].is_derogado is True
    rag(settings, NoOpDecisionEngine(), NoneGenerator(), retr).answer("x", exclude_derogados=True)
    assert retr.calls[-1] == ("x", False, True)


# ---------------------------------------------------------------------------
# Backends de decisión (clientes simulados)
# ---------------------------------------------------------------------------


class _FakeTypeSafe:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    def system_one(self, state: Any, questions: Any, model: Any = None) -> Any:
        self.calls.append({"state": state, "questions": questions, "model": model})
        answers: dict[str, Any] = {}
        for k, q in questions.items():
            if q.type == "score":
                answers[k] = SimpleNamespace(score=2.6, confidence=0.8, probabilities={0: 0.0, 1: 0.1, 2: 0.2, 3: 0.7})
            else:
                answers[k] = SimpleNamespace(noul=0.9 if k == "is_supported" else 0.1)
        return SimpleNamespace(answers=answers)


def test_jev_engine_uses_score_and_noul(settings: Settings) -> None:
    fake = _FakeTypeSafe()
    eng = JevDecisionEngine(settings, client=fake)
    s = eng.score({"question": "q", "passage": "p"}, "inst", ["0", "1", "2", "3"])
    assert s is not None and s.score == pytest.approx(2.6) and s.probabilities[3] == pytest.approx(0.7)
    from src.generator import GATE2_QUESTIONS

    res = eng.noul_batch({"user_query": "q"}, GATE2_QUESTIONS)
    assert res["is_supported"].prob == pytest.approx(0.9)  # type: ignore[union-attr]
    assert res["has_hallucinated_citation"].prob == pytest.approx(0.1)  # type: ignore[union-attr]
    q = fake.calls[-1]["questions"]["is_supported"]
    assert q.type == "noul" and set(q.criteria) == {"true", "false"}
    assert fake.calls[0]["model"] == "jev-1.14.0"


class _FakeJeff:
    def __init__(self) -> None:
        self.refs: list[tuple[str, Any]] = []

    def function(self, ref: str, context: Any = None) -> Any:
        self.refs.append((ref, context))

        def call(_input: str) -> Any:
            if ref.endswith("relevant"):
                return SimpleNamespace(probabilities={"no": 0.1, "partly": 0.2, "yes": 0.7})
            return SimpleNamespace(probabilities={"supported": 0.8, "partly_supported": 0.1, "contradicted": 0.05, "unsupported": 0.05})

        return call


def test_jeff_engine_maps_adapters(settings: Settings) -> None:
    fake = _FakeJeff()
    eng = JeffDecisionEngine(settings, client=fake)
    s = eng.score({"question": "q", "passage": "p"}, "inst", ["0", "1", "2", "3"])
    assert s is not None and s.score == pytest.approx(1.5 * 0.2 + 3 * 0.7)
    from src.generator import GATE2_QUESTIONS

    res = eng.noul_batch({"sources": ["Artículo 48: ..."], "answer": "a"}, GATE2_QUESTIONS)
    assert res["is_supported"].prob == pytest.approx(0.8)  # type: ignore[union-attr]
    assert res["has_hallucinated_citation"] is None  # sin adaptador: no se inventa un valor
    assert fake.refs[0][0] == "jeff.retrieval.passage-relevant.relevant"
    assert fake.refs[1][0] == "jeff.retrieval.ground.grounding"


def test_build_decision_engine_validates(settings: Settings) -> None:
    assert build_decision_engine(settings, "off").name == "off"
    with pytest.raises(RuntimeError, match="TYPESAFE_API_KEY"):
        build_decision_engine(settings, "jev")
    with pytest.raises(ValueError):
        build_decision_engine(settings, "bogus")
