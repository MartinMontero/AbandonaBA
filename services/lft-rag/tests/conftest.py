from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

import pytest

from src.config import Settings
from src.decision import NoulQuestion, NoulResult, ScoreResult
from src.parser import ArticleChunk
from src.retriever import RetrievedCandidate


def make_chunk(aid: str, body: str, derogado: bool = False, transitorio: bool = False, part: int = 1, total: int = 1) -> ArticleChunk:
    return ArticleChunk(
        chunk_id=f"{aid}::{part}",
        articulo_id=aid,
        articulo_label=aid,
        text=f"[TITULO SEGUNDO]\nArtículo {aid}.- {body}",
        body=body,
        titulo="TITULO SEGUNDO - Relaciones Individuales de Trabajo",
        capitulo="CAPITULO IV - Rescisión de las relaciones de trabajo",
        is_derogado=derogado,
        is_transitorio=transitorio,
        reform_date="01-05-2019",
        part_index=part,
        part_total=total,
        page_start=15,
    )


CHUNKS = [
    make_chunk("47", "Son causas de rescisión de la relación de trabajo, sin responsabilidad para el patrón: ..."),
    make_chunk("48", "El trabajador podrá solicitar ante la Autoridad Conciliatoria que se le reinstale o que se le indemnice con tres meses de salario."),
    make_chunk("50", "Las indemnizaciones a que se refiere el artículo anterior consistirán en veinte días de salarios por cada año."),
    make_chunk("15-A", "Se deroga.", derogado=True),
    make_chunk("87", "Los trabajadores tendrán derecho a un aguinaldo anual que deberá pagarse antes del día veinte de diciembre, equivalente a quince días de salario."),
]


class FakeRetriever:
    def __init__(self, chunks: Sequence[ArticleChunk] = CHUNKS) -> None:
        self.chunks = list(chunks)
        self.manifest = {"lft_ultima_reforma_dof": "14-05-2026", "pdf_sha256": "abc", "total_chunks": len(self.chunks)}
        self.calls: list[tuple[str, bool, bool]] = []

    def retrieve(
        self,
        query: str,
        include_transitorios: bool = False,
        exclude_derogados: bool = False,
        law_filter: str = "ALL",
    ) -> list[RetrievedCandidate]:
        self.calls.append((query, include_transitorios, exclude_derogados))
        out = [
            c for c in self.chunks
            if (law_filter == "ALL" or c.law_code == law_filter)
            and (include_transitorios or not c.is_transitorio)
            and not (exclude_derogados and c.is_derogado)
        ]
        return [RetrievedCandidate(c, 1.0 / (60 + i), i, i) for i, c in enumerate(out, start=1)]

    def get_article_chunks(
        self, articulo_query: str, include_transitorios: bool = False, law_code: str = "LFT"
    ) -> list[ArticleChunk]:
        from src.parser import normalize_articulo_id

        wanted = normalize_articulo_id(articulo_query)
        return [c for c in self.chunks if c.law_code == law_code and c.articulo_id == wanted]


class FakeDecision:
    """Motor de decisión programable: puntajes por artículo y probabilidades fijas para la compuerta 2."""

    name = "fake"

    def __init__(self, scores: Mapping[str, float] | None = None, supported: float | None = 0.95, hallucinated: float | None = 0.05) -> None:
        self.scores = dict(scores or {})
        self.supported = supported
        self.hallucinated = hallucinated
        self.score_calls = 0
        self.noul_states: list[Mapping[str, Any]] = []

    @property
    def enabled(self) -> bool:
        return True

    def score(self, state: Mapping[str, Any], instructions: str, criteria: Sequence[str]) -> ScoreResult | None:
        self.score_calls += 1
        aid = state["passage"].split("Artículo ", 1)[1].split(".-", 1)[0]
        return ScoreResult(score=self.scores.get(aid, 0.0))

    def noul(self, state: Mapping[str, Any], instructions: str, true: str, false: str) -> NoulResult | None:
        return None

    def noul_batch(self, state: Mapping[str, Any], questions: Mapping[str, NoulQuestion]) -> dict[str, NoulResult | None]:
        self.noul_states.append(state)
        out: dict[str, NoulResult | None] = {}
        for k in questions:
            v = self.supported if k == "is_supported" else self.hallucinated
            out[k] = None if v is None else NoulResult(v)
        return out


class FakeGenerator:
    name = "fake-gen"

    def __init__(self, text: str) -> None:
        self.text = text
        self.calls = 0

    def generate(self, system: str, user: str) -> str:
        self.calls += 1
        assert "ARTÍCULOS RECUPERADOS" in user
        return self.text


@pytest.fixture
def settings(tmp_path: Any) -> Settings:
    return Settings(_env_file=None, index_dir=tmp_path / "index", lft_service_token="")
