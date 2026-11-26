"""Servicio HTTP (FastAPI) + Streamable HTTP FastMCP (/mcp) con validación Zero Trust RS256.

Privacidad: este servicio no registra ni guarda el texto de las preguntas, ni IPs, ni cookies.
El log de accesos de uvicorn se desactiva al arrancar (ver `run()`), y no hay almacenamiento de consultas.
"""
from __future__ import annotations

import hmac
import threading
from collections.abc import AsyncIterator, Callable, Mapping
from contextlib import asynccontextmanager
from typing import Any

import jwt
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from jwt import PyJWKClient
from pydantic import BaseModel, Field

from .config import LawCode, LawFilter, Settings, get_settings
from .decision import build_decision_engine
from .generator import ArticleOut, LegalRAG, QueryResponse, build_generator
from .mcp_server import mcp, set_state_provider
from .parser import normalize_articulo_id
from .retriever import HybridRetriever, IndexNotReady


class QueryRequest(BaseModel):
    question: str = Field(min_length=3)
    law_filter: LawFilter = "ALL"
    include_transitorios: bool = False
    exclude_derogados: bool = False


class ArticleLookupResponse(BaseModel):
    law_code: LawCode = "LFT"
    articulo_id: str
    found: bool
    is_derogado: bool
    reform_date: str
    chunks: list[ArticleOut]
    ultima_reforma_dof: str = ""
    lft_ultima_reforma_dof: str = ""
    lss_ultima_reforma_dof: str = ""
    corpus_version_hash: str = ""


class ServiceState:
    """Contenedor perezoso de dependencias pesadas, reemplazable en pruebas."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._retriever: HybridRetriever | None = None
        self._rag: LegalRAG | None = None
        self.lock = threading.Semaphore(1)

    @property
    def retriever(self) -> HybridRetriever:
        if self._retriever is None:
            self._retriever = HybridRetriever(self.settings)
        return self._retriever

    @property
    def rag(self) -> LegalRAG:
        if self._rag is None:
            self._rag = LegalRAG(
                self.settings,
                self.retriever,
                build_decision_engine(self.settings),
                build_generator(self.settings),
            )
        return self._rag


def build_jwks_client(settings: Settings) -> PyJWKClient | None:
    issuer = settings.cf_access_issuer()
    if not settings.cf_access_aud or not issuer:
        return None
    return PyJWKClient(f"{issuer}/cdn-cgi/access/certs", cache_keys=True, lifespan=3600)


def _header_ci(headers: Mapping[str, str], name: str) -> str:
    low = name.lower()
    for k, v in headers.items():
        if k.lower() == low:
            return v
    return ""


def verify_zero_trust_caller(
    headers: Mapping[str, str],
    client_host: str | None,
    settings: Settings,
    jwks_client: PyJWKClient | None,
) -> None:
    """Puerta de origen: exige JWT RS256 de Cloudflare Access o bypass estricto en loopback local."""
    if settings.cf_access_aud:
        token = _header_ci(headers, "Cf-Access-Jwt-Assertion").strip()
        if not token:
            raise HTTPException(status_code=401, detail="Falta Cf-Access-Jwt-Assertion")
        issuer = settings.cf_access_issuer()
        if jwks_client is None or not issuer:
            raise HTTPException(status_code=500, detail="CF_ACCESS_TEAM_DOMAIN no configurado")
        try:
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=settings.cf_access_aud,
                issuer=issuer,
                options={"require": ["exp", "iat"]},
            )
        except jwt.PyJWTError as exc:
            raise HTTPException(status_code=403, detail=f"Token Zero Trust inválido: {exc}") from exc
        return

    expected = settings.effective_dev_token()
    if not expected:
        return

    if client_host not in {"127.0.0.1", "::1"}:
        raise HTTPException(status_code=403, detail="Bypass local rechazado desde origen no loopback")

    auth = _header_ci(headers, "Authorization")
    given = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else ""
    if not given:
        given = _header_ci(headers, "X-Dev-Token").strip()
    if not given or not hmac.compare_digest(given.encode("utf-8"), expected.encode("utf-8")):
        raise HTTPException(status_code=401, detail="No autorizado")


class ProtectedMcpApp:
    """Envuelve el ASGI de FastMCP (/mcp) con la misma validación Zero Trust que FastAPI."""

    def __init__(
        self,
        inner: Any,
        settings: Settings,
        jwks_client: PyJWKClient | None,
    ) -> None:
        self.inner = inner
        self.settings = settings
        self.jwks_client = jwks_client

    async def __call__(self, scope: dict[str, Any], receive: Any, send: Any) -> None:
        if scope["type"] in {"http", "websocket"}:
            raw_headers = {
                k.decode("latin-1"): v.decode("latin-1") for k, v in scope.get("headers", [])
            }
            client = scope.get("client")
            client_host = client[0] if client else None
            try:
                verify_zero_trust_caller(raw_headers, client_host, self.settings, self.jwks_client)
            except HTTPException as exc:
                resp = JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
                await resp(scope, receive, send)
                return
        await self.inner(scope, receive, send)


def create_app(
    settings: Settings | None = None,
    state_factory: Callable[[Settings], Any] | None = None,
    jwks_client: PyJWKClient | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    state = (state_factory or ServiceState)(settings)
    set_state_provider(lambda: state)
    jwks = jwks_client if jwks_client is not None else build_jwks_client(settings)
    mcp_http_app = mcp.http_app(path="/")

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        async with mcp_http_app.lifespan(app):
            yield

    app = FastAPI(
        title="legal-rag",
        version="0.2.0",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
        lifespan=lifespan,
    )
    app.state.svc = state

    def require_caller(request: Request) -> None:
        client_host = request.client.host if request.client else None
        verify_zero_trust_caller(request.headers, client_host, settings, jwks)

    @app.exception_handler(IndexNotReady)
    def _index_not_ready(_: Request, exc: IndexNotReady) -> JSONResponse:
        return JSONResponse(status_code=503, content={"detail": str(exc)})

    @app.get("/health")
    def health() -> dict[str, Any]:
        try:
            manifest = state.retriever.manifest
            ready = True
        except IndexNotReady:
            manifest, ready = None, False
        return {
            "ready": ready,
            "corpus_version_hash": (manifest or {}).get("corpus_version_hash", ""),
            "manifest": manifest,
            "decision_backend": settings.decision_backend,
            "generator_backend": settings.generator_backend,
            "embedding_model_id": settings.embedding_model_id,
            "auth_required": bool(settings.cf_access_aud or settings.effective_dev_token()),
            "zero_trust_enabled": bool(settings.cf_access_aud),
        }

    def _lookup_article(
        law_code: LawCode, articulo_id: str, include_transitorios: bool
    ) -> ArticleLookupResponse:
        if len(articulo_id) > 80:
            raise HTTPException(status_code=422, detail="Identificador demasiado largo")
        chunks = state.retriever.get_article_chunks(
            articulo_id, include_transitorios=include_transitorios, law_code=law_code
        )
        canon = normalize_articulo_id(articulo_id)
        if not chunks:
            raise HTTPException(status_code=404, detail=f"Artículo {canon} ({law_code}) no encontrado")
        m = state.retriever.manifest
        law_reforma = (m.get("laws", {}).get(law_code, {}) or {}).get(
            "ultima_reforma_dof", m.get("lft_ultima_reforma_dof", "")
        )
        return ArticleLookupResponse(
            law_code=law_code,
            articulo_id=chunks[0].articulo_id,
            found=True,
            is_derogado=chunks[0].is_derogado,
            reform_date=chunks[0].reform_date,
            chunks=[ArticleOut.from_chunk(c) for c in chunks],
            ultima_reforma_dof=str(law_reforma),
            lft_ultima_reforma_dof=str(m.get("lft_ultima_reforma_dof", "")),
            lss_ultima_reforma_dof=str(m.get("lss_ultima_reforma_dof", "")),
            corpus_version_hash=str(m.get("corpus_version_hash", "")),
        )

    @app.get(
        "/v1/legal/articles/{law_code}/{articulo_id}",
        response_model=ArticleLookupResponse,
        dependencies=[Depends(require_caller)],
    )
    def article_by_law(
        law_code: LawCode, articulo_id: str, include_transitorios: bool = False
    ) -> ArticleLookupResponse:
        return _lookup_article(law_code, articulo_id, include_transitorios)

    @app.get(
        "/v1/legal/articles/{articulo_id}",
        response_model=ArticleLookupResponse,
        dependencies=[Depends(require_caller)],
    )
    def article(articulo_id: str, include_transitorios: bool = False) -> ArticleLookupResponse:
        return _lookup_article("LFT", articulo_id, include_transitorios)

    @app.post("/v1/legal/query", response_model=QueryResponse, dependencies=[Depends(require_caller)])
    def query(req: QueryRequest) -> QueryResponse:
        question = req.question.strip()
        if len(question) > settings.max_question_chars:
            raise HTTPException(status_code=422, detail=f"La pregunta excede {settings.max_question_chars} caracteres")
        if not state.lock.acquire(blocking=False):
            raise HTTPException(status_code=503, detail="El servicio está atendiendo otra consulta; intenta en un momento")
        try:
            return state.rag.answer(
                question,
                req.include_transitorios,
                req.exclude_derogados,
                law_filter=req.law_filter,
            )
        finally:
            state.lock.release()

    app.mount("/mcp", ProtectedMcpApp(mcp_http_app, settings, jwks))
    return app


def run() -> None:
    import uvicorn

    s = get_settings()
    uvicorn.run(create_app(s), host=s.lft_api_host, port=s.lft_api_port, access_log=False, log_level="warning")


def __getattr__(name: str) -> Any:
    if name == "app":
        return create_app()
    raise AttributeError(name)
