"""Configuración del servicio legal-rag (LFT + LSS), leída de variables de entorno o `.env`."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_ROOT = Path(__file__).resolve().parent.parent

LawCode = Literal["LFT", "LSS"]
LawFilter = Literal["LFT", "LSS", "ALL"]


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
    lft_pdf_path: Path = Field(default=SERVICE_ROOT / "data" / "raw" / "LFT.pdf")
    lss_pdf_path: Path = Field(default=SERVICE_ROOT / "data" / "raw" / "LSS.pdf")
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

    # --- API HTTP y Zero Trust ---
    lft_api_host: str = "127.0.0.1"
    lft_api_port: int = 8090
    lft_service_token: str = ""
    lft_dev_bypass_token: str = ""
    cf_access_team_domain: str = ""
    cf_access_aud: str = ""
    max_question_chars: int = 1000

    def resolved_index_dir(self) -> Path:
        p = Path(self.index_dir)
        return p if p.is_absolute() else (SERVICE_ROOT / p).resolve()

    def resolved_pdf_path(self, law_code: LawCode) -> Path:
        p = Path(self.lft_pdf_path if law_code == "LFT" else self.lss_pdf_path)
        return p if p.is_absolute() else (SERVICE_ROOT / p).resolve()

    def effective_dev_token(self) -> str:
        return self.lft_dev_bypass_token or self.lft_service_token

    def cf_access_issuer(self) -> str:
        dom = self.cf_access_team_domain.strip().rstrip("/")
        if not dom:
            return ""
        if dom.startswith("https://") or dom.startswith("http://"):
            return dom
        if "." not in dom:
            return f"https://{dom}.cloudflareaccess.com"
        return f"https://{dom}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
