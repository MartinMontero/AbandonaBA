"""Servicio HTTP (FastAPI) del RAG de la LFT.

Privacidad: este servicio no registra ni guarda el texto de las preguntas, ni IPs, ni cookies.
El log de accesos de uvicorn se desactiva al arrancar (ver `run()`), y no hay almacenamiento de consultas.
"""
from __future__ import annotations

import hmac
import threading
from collections.abc import Callable
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .config import Settings, get_settings
from .decision import build_decision_engine
from .generator import ArticleOut, LegalRAG, QueryResponse, build_generator
from .parser import normalize_articulo_id
from .retriever import HybridRetriever, IndexNotReady


class QueryRequest(BaseModel):
    question: str = Field(min_length=3)
    include_transitorios: bool = False
    exclude_derogados: bool = False


class ArticleLookupResponse(BaseModel):
    articulo_id: str
    found: bool
    is_derogado: bool
    reform_date: str
    chunks: list[ArticleOut]
    lft_ultima_reforma_dof: str = ""


class ServiceState:
    """Contenedor perezoso de dependencias pesadas, reemplazable en pruebas."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._retriever: HybridRetriever | None = None
        self._rag: LegalRAG | None = None
        self.lock = threading.Semaphore(1)  # una generación a la vez: la CPU es el cuello de botella

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


def create_app(settings: Settings | None = None, state_factory: Callable[[Settings], Any] | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title="lft-rag", version="0.1.0", docs_url=None, redoc_url=None, openapi_url=None)
    state = (state_factory or ServiceState)(settings)
    app.state.svc = state

    def require_token(authorization: str | None = Header(default=None)) -> None:
        expected = settings.lft_service_token
        if not expected:
            return
        given = (authorization or "").removeprefix("Bearer ").strip()
        if not given or not hmac.compare_digest(given.encode(), expected.encode()):
            raise HTTPException(status_code=401, detail="No autorizado")

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
            "manifest": manifest,
            "decision_backend": settings.decision_backend,
            "generator_backend": settings.generator_backend,
            "embedding_model_id": settings.embedding_model_id,
            "auth_required": bool(settings.lft_service_token),
        }

    @app.get("/v1/legal/articles/{articulo_id}", response_model=ArticleLookupResponse, dependencies=[Depends(require_token)])
    def article(articulo_id: str, include_transitorios: bool = False) -> ArticleLookupResponse:
        if len(articulo_id) > 80:
            raise HTTPException(status_code=422, detail="Identificador demasiado largo")
        chunks = state.retriever.get_article_chunks(articulo_id, include_transitorios=include_transitorios)
        canon = normalize_articulo_id(articulo_id)
        if not chunks:
            raise HTTPException(status_code=404, detail=f"Artículo {canon} no encontrado en la LFT indexada")
        return ArticleLookupResponse(
            articulo_id=chunks[0].articulo_id,
            found=True,
            is_derogado=chunks[0].is_derogado,
            reform_date=chunks[0].reform_date,
            chunks=[ArticleOut.from_chunk(c) for c in chunks],
            lft_ultima_reforma_dof=str(state.retriever.manifest.get("lft_ultima_reforma_dof", "")),
        )

    @app.post("/v1/legal/query", response_model=QueryResponse, dependencies=[Depends(require_token)])
    def query(req: QueryRequest) -> QueryResponse:
        question = req.question.strip()
        if len(question) > settings.max_question_chars:
            raise HTTPException(status_code=422, detail=f"La pregunta excede {settings.max_question_chars} caracteres")
        if not state.lock.acquire(blocking=False):
            raise HTTPException(status_code=503, detail="El servicio está atendiendo otra consulta; intenta en un momento")
        try:
            return state.rag.answer(question, req.include_transitorios, req.exclude_derogados)
        finally:
            state.lock.release()

    return app


def run() -> None:
    import uvicorn

    s = get_settings()
    uvicorn.run(create_app(s), host=s.lft_api_host, port=s.lft_api_port, access_log=False, log_level="warning")


# `uvicorn src.api:app` usa esta instancia; se crea perezosamente para no exigir .env al importar en pruebas.
def __getattr__(name: str) -> Any:
    if name == "app":
        return create_app()
    raise AttributeError(name)
