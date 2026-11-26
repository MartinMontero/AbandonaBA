from __future__ import annotations

import threading
from typing import Any

import pytest
from fastapi.testclient import TestClient

from src.api import create_app
from src.config import Settings
from src.decision import NoOpDecisionEngine
from src.generator import LegalRAG, NoneGenerator
from src.retriever import IndexNotReady

from .conftest import FakeDecision, FakeGenerator, FakeRetriever


class FakeState:
    def __init__(self, settings: Settings, decision: Any = None, generator: Any = None, ready: bool = True) -> None:
        self.settings = settings
        self.lock = threading.Semaphore(1)
        self._ready = ready
        self._retr = FakeRetriever()
        self._rag = LegalRAG(settings, self._retr, decision or NoOpDecisionEngine(), generator or NoneGenerator())

    @property
    def retriever(self) -> FakeRetriever:
        if not self._ready:
            raise IndexNotReady("sin índice")
        return self._retr

    @property
    def rag(self) -> LegalRAG:
        if not self._ready:
            raise IndexNotReady("sin índice")
        return self._rag


def client(settings: Settings, **kw: Any) -> TestClient:
    return TestClient(create_app(settings, state_factory=lambda s: FakeState(s, **kw)))


def test_health_reports_manifest(settings: Settings) -> None:
    r = client(settings).get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ready"] is True
    assert body["manifest"]["lft_ultima_reforma_dof"] == "14-05-2026"
    assert body["auth_required"] is False


def test_health_when_index_missing(settings: Settings) -> None:
    r = client(settings, ready=False).get("/health")
    assert r.status_code == 200 and r.json()["ready"] is False


def test_article_lookup_and_normalization(settings: Settings) -> None:
    c = client(settings)
    r = c.get("/v1/legal/articles/15-a")
    assert r.status_code == 200
    body = r.json()
    assert body["articulo_id"] == "15-A" and body["is_derogado"] is True
    assert body["chunks"][0]["source_url"].endswith("#page=15")
    assert c.get("/v1/legal/articles/47").json()["is_derogado"] is False
    assert c.get("/v1/legal/articles/9999").status_code == 404


def test_query_sources_only(settings: Settings) -> None:
    r = client(settings).post("/v1/legal/query", json={"question": "¿Cuánto aguinaldo me toca?"})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "SOURCES_ONLY"
    assert body["filtered_articles"]
    assert {"status", "answer", "cited_articles", "filtered_articles", "is_supported_prob",
            "has_hallucinated_citation_prob", "deterministic_citation_passed", "unverified_reasons", "disclaimer"} <= set(body)


def test_query_verified_with_mocked_backends(settings: Settings) -> None:
    dec = FakeDecision(scores={"87": 3.0})
    gen = FakeGenerator("Según el Artículo 87, Título Tercero, el aguinaldo equivale a quince días de salario.")
    r = client(settings, decision=dec, generator=gen).post("/v1/legal/query", json={"question": "aguinaldo"})
    body = r.json()
    assert body["status"] == "VERIFIED" and body["cited_articles"] == ["87"]


def test_query_validation(settings: Settings) -> None:
    settings.max_question_chars = 20
    c = client(settings)
    assert c.post("/v1/legal/query", json={"question": "x" * 21}).status_code == 422
    assert c.post("/v1/legal/query", json={"question": ""}).status_code == 422
    assert c.post("/v1/legal/query", json={}).status_code == 422


def test_query_busy_returns_503(settings: Settings) -> None:
    app = create_app(settings, state_factory=lambda s: FakeState(s))
    app.state.svc.lock.acquire()
    try:
        r = TestClient(app).post("/v1/legal/query", json={"question": "aguinaldo"})
        assert r.status_code == 503
    finally:
        app.state.svc.lock.release()


def test_index_not_ready_returns_503(settings: Settings) -> None:
    r = client(settings, ready=False).post("/v1/legal/query", json={"question": "aguinaldo"})
    assert r.status_code == 503


@pytest.mark.parametrize("header", [None, "Bearer wrong", "wrong-token"])
def test_bearer_token_required_when_configured(settings: Settings, header: str | None) -> None:
    settings.lft_service_token = "s3cret"
    c = client(settings)
    headers = {"Authorization": header} if header else {}
    assert c.get("/v1/legal/articles/47", headers=headers).status_code == 401
    assert c.post("/v1/legal/query", json={"question": "aguinaldo"}, headers=headers).status_code == 401


def test_bearer_token_accepted(settings: Settings) -> None:
    settings.lft_service_token = "s3cret"
    c = client(settings)
    ok = {"Authorization": "Bearer s3cret"}
    assert c.get("/v1/legal/articles/47", headers=ok).status_code == 200
    assert c.get("/health").json()["auth_required"] is True  # /health es público pero no expone datos sensibles


def test_no_docs_endpoints_exposed(settings: Settings) -> None:
    c = client(settings)
    assert c.get("/docs").status_code == 404
    assert c.get("/openapi.json").status_code == 404
