from __future__ import annotations

import datetime as dt
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.testclient import TestClient

from .conftest import FakeRetriever, make_chunk
from src.api import create_app, verify_zero_trust_caller
from src.config import Settings
from src.decision import NoOpDecisionEngine
from src.generator import LegalRAG, NoneGenerator
from src.parser import ArticleChunk


def _lss_chunk(aid: str, body: str) -> ArticleChunk:
    return ArticleChunk(
        chunk_id=f"lss_art_{aid}_part_0",
        articulo_id=aid,
        articulo_label=aid,
        text=f"[TITULO SEGUNDO]\nArtículo {aid}.- {body}",
        body=body,
        titulo="TITULO SEGUNDO",
        capitulo="CAPITULO I",
        is_derogado=False,
        is_transitorio=False,
        reform_date="15-01-2026",
        part_index=1,
        part_total=1,
        page_start=5,
        law_code="LSS",
    )


class _FakeState:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        chunks = [
            make_chunk("47", "Causas de rescisión sin responsabilidad para el patrón."),
            _lss_chunk("27", "El salario base de cotización se integra con pagos en efectivo."),
        ]
        self.retriever = FakeRetriever(chunks)
        self.retriever.manifest = {
            "corpus_version_hash": "hash-test-1234",
            "lft_ultima_reforma_dof": "14-05-2026",
            "lss_ultima_reforma_dof": "15-01-2026",
            "laws": {
                "LFT": {"ultima_reforma_dof": "14-05-2026"},
                "LSS": {"ultima_reforma_dof": "15-01-2026"},
            },
            "total_chunks": len(chunks),
        }
        self.rag = LegalRAG(settings, self.retriever, NoOpDecisionEngine(), NoneGenerator())
        import threading

        self.lock = threading.Semaphore(1)


class _StubJwkClient:
    def __init__(self, public_key: object) -> None:
        self._key = public_key

    def get_signing_key_from_jwt(self, token: str) -> SimpleNamespace:
        return SimpleNamespace(key=self._key)


def _generate_rsa_pair():
    priv = rsa.generate_private_key(public_exponent=65537, key_size=2048, backend=default_backend())
    return priv, priv.public_key()


def _sign_cf_jwt(priv: object, *, aud: str, iss: str, exp_delta_s: int = 300) -> str:
    now = dt.datetime.now(dt.timezone.utc)
    payload = {
        "aud": [aud],
        "iss": iss,
        "iat": int(now.timestamp()),
        "exp": int((now + dt.timedelta(seconds=exp_delta_s)).timestamp()),
        "sub": "service-token",
    }
    return jwt.encode(payload, priv, algorithm="RS256")


def test_zero_trust_rs256_jwt_validation_and_mcp_gate(settings: Settings) -> None:
    priv, pub = _generate_rsa_pair()
    zt_settings = Settings(
        _env_file=None,
        index_dir=settings.index_dir,
        cf_access_team_domain="team-test",
        cf_access_aud="aud-test-123",
    )
    app = create_app(zt_settings, state_factory=lambda s: _FakeState(s), jwks_client=_StubJwkClient(pub))  # type: ignore[arg-type]

    with TestClient(app) as client:
        # Sin token -> 401
        assert client.get("/v1/legal/articles/LFT/47").status_code == 401
        assert client.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "initialize"}).status_code == 401

        # Token expirado -> 403
        expired = _sign_cf_jwt(priv, aud="aud-test-123", iss="https://team-test.cloudflareaccess.com", exp_delta_s=-60)
        assert client.get("/v1/legal/articles/LFT/47", headers={"Cf-Access-Jwt-Assertion": expired}).status_code == 403

        # Audiencia incorrecta -> 403
        wrong_aud = _sign_cf_jwt(priv, aud="other-aud", iss="https://team-test.cloudflareaccess.com")
        assert client.get("/v1/legal/articles/LFT/47", headers={"Cf-Access-Jwt-Assertion": wrong_aud}).status_code == 403

        # Token válido -> 200 en LFT y LSS
        valid = _sign_cf_jwt(priv, aud="aud-test-123", iss="https://team-test.cloudflareaccess.com")
        headers = {"Cf-Access-Jwt-Assertion": valid}
        r_lft = client.get("/v1/legal/articles/LFT/47", headers=headers)
        assert r_lft.status_code == 200
        assert r_lft.json()["law_code"] == "LFT"

        r_lss = client.get("/v1/legal/articles/LSS/27", headers=headers)
        assert r_lss.status_code == 200
        assert r_lss.json()["law_code"] == "LSS"

        # Query filtrada por LSS
        r_q = client.post("/v1/legal/query", json={"question": "¿Qué es el salario base?", "law_filter": "LSS"}, headers=headers)
        assert r_q.status_code == 200
        assert all(a["law_code"] == "LSS" for a in r_q.json()["filtered_articles"])

        # /health público expone corpus_version_hash y zero_trust_enabled
        r_health = client.get("/health")
        assert r_health.status_code == 200
        assert r_health.json()["corpus_version_hash"] == "hash-test-1234"
        assert r_health.json()["zero_trust_enabled"] is True

        # Docs deshabilitados en producción
        assert client.get("/docs").status_code == 404
        assert client.get("/openapi.json").status_code == 404


def test_localhost_dev_bypass_rejects_non_loopback(settings: Settings) -> None:
    dev_settings = Settings(
        _env_file=None,
        index_dir=settings.index_dir,
        lft_dev_bypass_token="local-secret-xyz",
        cf_access_aud="",
    )
    with pytest.raises(HTTPException) as exc:
        verify_zero_trust_caller(
            {"Authorization": "Bearer local-secret-xyz"},
            "203.0.113.10",
            dev_settings,
            None,
        )
    assert exc.value.status_code == 403

    # Loopback con token correcto pasa
    verify_zero_trust_caller(
        {"Authorization": "Bearer local-secret-xyz"},
        "127.0.0.1",
        dev_settings,
        None,
    )
