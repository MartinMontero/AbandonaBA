"""Configuración del servicio lft-rag, leída de variables de entorno o de `.env` (pydantic-settings)."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(SERVICE_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Capa de decisión System One ---
    decision_backend: Literal["jev", "jeff", "off"] = "off"
    typesafe_api_key: str = ""
    typesafe_base_url: str = "https://api.typesafe.ai"
    jev_model_id: str = "jev-1.14.0"
    jeff_runtime: Literal["local", "remote"] = "remote"
    jeff_server_url: str = "https://api.jeffhub.ai"
    jeff_api_key: str = ""
    jeff_temperature: float = 1.0

    relevance_threshold: float = 1.5
    groundedness_threshold: float = 0.75
    hallucination_threshold: float = 0.30

    # --- Índice y recuperación ---
    embedding_model_id: str = "soylic/soylic-embeddings-leyes-mexicanas"
    max_chunk_tokens: int = 480
    index_dir: Path = Field(default=SERVICE_ROOT / "data" / "index")
    chroma_collection: str = "lft_articulos"
    dense_top_k: int = 15
    bm25_top_k: int = 15
    rrf_k: int = 60
    rrf_candidates: int = 10
    max_filtered_articles: int = 5

    # --- Generador ---
    generator_backend: Literal["transformers", "llamacpp", "ollama", "none"] = "none"
    generator_model_id: str = "Danielbrdz/Barcenas-8b-Juridico-Mexicano"
    generator_load_in_4bit: bool = True
    generator_gguf_path: str = ""
    generator_max_new_tokens: int = 700
    generator_timeout_s: float = 300.0
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model_name: str = "rjmalagon/barcena-8b-juridico-mexicano:q8_0"

    # --- API HTTP ---
    lft_api_host: str = "127.0.0.1"
    lft_api_port: int = 8090
    lft_service_token: str = ""
    max_question_chars: int = 1000

    def resolved_index_dir(self) -> Path:
        p = Path(self.index_dir)
        return p if p.is_absolute() else (SERVICE_ROOT / p).resolve()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
