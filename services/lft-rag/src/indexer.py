"""Indexación versionada: SHA-256 del PDF + modelo de embeddings → ChromaDB (coseno) y BM25 serializado."""
from __future__ import annotations

import hashlib
import json
import pickle
import re
import shutil
import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .config import Settings
from .parser import ArticleChunk, parse_pdf

MANIFEST = "manifest.json"
BM25_FILE = "bm25_index.pkl"
CHUNKS_FILE = "chunks.json"
CHROMA_DIR = "chroma"

_STOPWORDS_ES = frozenset(
    """a al algo algunas algunos ante antes como con contra cual cuando de del desde donde durante e el ella ellas
    ellos en entre era eran es esa esas ese eso esos esta estas este esto estos fue fueron ha han hasta hay la las
    le les lo los mas me mi mis mucho muy ni no nos o os otra otras otro otros para pero poco por porque que quien
    quienes se sea sean ser si sin sobre su sus tambien tanto te tiene tienen todo todos tu tus un una unas uno unos
    y ya cada dicha dicho dichos dichas misma mismo mismos mismas sera seran podra podran debera deberan""".split()
)


def fold_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def tokenize_es(text: str) -> list[str]:
    """Tokenizador BM25 para español jurídico: minúsculas, sin acentos, sin stopwords, conserva `15-a`, `512-d`, `bis`."""
    t = fold_accents(text.lower()).replace("ñ", "n")
    # Unir sufijos ordinales ("3o.", "1º") al número.
    t = re.sub(r"\b(\d+)\s*(?:o\.|º|°)", r"\1", t)
    tokens = re.findall(r"\d+-[a-z]\b|[a-z0-9]+", t)
    return [tok for tok in tokens if tok not in _STOPWORDS_ES and (len(tok) > 1 or tok.isdigit())]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


@dataclass
class IngestResult:
    skipped: bool
    manifest: dict[str, Any]


class EmbeddingModelUnavailable(RuntimeError):
    pass


def load_embedder(model_id: str) -> Any:
    from sentence_transformers import SentenceTransformer

    try:
        return SentenceTransformer(model_id, device="cpu")
    except Exception as exc:  # noqa: BLE001 - se re-lanza con instrucciones claras
        msg = str(exc)
        if "gated" in msg.lower() or "401" in msg or "403" in msg or "restricted" in msg.lower():
            raise EmbeddingModelUnavailable(
                f"El modelo de embeddings '{model_id}' es de acceso restringido en Hugging Face. "
                "Solicita acceso en su página, inicia sesión con `hf auth login`, o usa temporalmente "
                "EMBEDDING_MODEL_ID=ibm-granite/granite-embedding-97m-multilingual-r2 (su modelo base, abierto)."
            ) from exc
        raise


def make_token_counter(embedder: Any) -> Any:
    tok = getattr(embedder, "tokenizer", None)
    if tok is None:
        return None

    def count(text: str) -> int:
        return len(tok(text, add_special_tokens=True, truncation=False)["input_ids"])

    return count


def read_manifest(index_dir: Path) -> dict[str, Any] | None:
    p = index_dir / MANIFEST
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def load_chunks(index_dir: Path) -> list[ArticleChunk]:
    data = json.loads((index_dir / CHUNKS_FILE).read_text(encoding="utf-8"))
    return [ArticleChunk(**c) for c in data]


def ingest(pdf_path: Path, settings: Settings, force: bool = False, embedder: Any = None) -> IngestResult:
    index_dir = settings.resolved_index_dir()
    pdf_path = Path(pdf_path).resolve()
    if not pdf_path.exists():
        raise FileNotFoundError(pdf_path)
    with pdf_path.open("rb") as f:
        if f.read(5) != b"%PDF-":
            raise ValueError(f"{pdf_path} no es un PDF (encabezado %PDF ausente)")

    digest = sha256_file(pdf_path)
    current = read_manifest(index_dir)
    if (
        not force
        and current
        and current.get("pdf_sha256") == digest
        and current.get("embedding_model_id") == settings.embedding_model_id
        and current.get("max_chunk_tokens") == settings.max_chunk_tokens
        and (index_dir / BM25_FILE).exists()
        and (index_dir / CHROMA_DIR).exists()
    ):
        return IngestResult(skipped=True, manifest=current)

    embedder = embedder or load_embedder(settings.embedding_model_id)
    chunks, reform_version = parse_pdf(
        pdf_path, max_tokens=settings.max_chunk_tokens, count_tokens=make_token_counter(embedder)
    )
    if not chunks:
        raise RuntimeError("El parser no produjo fragmentos; revisa el PDF.")

    # Reconstrucción limpia del índice.
    if index_dir.exists():
        for name in (CHROMA_DIR, BM25_FILE, CHUNKS_FILE, MANIFEST):
            p = index_dir / name
            if p.is_dir():
                shutil.rmtree(p)
            elif p.exists():
                p.unlink()
    index_dir.mkdir(parents=True, exist_ok=True)

    import chromadb

    client = chromadb.PersistentClient(path=str(index_dir / CHROMA_DIR))
    collection = client.get_or_create_collection(
        name=settings.chroma_collection, metadata={"hnsw:space": "cosine"}
    )
    batch = 64
    for i in range(0, len(chunks), batch):
        part = chunks[i : i + batch]
        vectors = embedder.encode(
            [c.text for c in part], normalize_embeddings=True, batch_size=16, show_progress_bar=False
        )
        collection.add(
            ids=[c.chunk_id for c in part],
            documents=[c.text for c in part],
            metadatas=[c.metadata() for c in part],
            embeddings=[v.tolist() for v in vectors],
        )

    from rank_bm25 import BM25Okapi

    corpus = [tokenize_es(c.text) for c in chunks]
    bm25 = BM25Okapi(corpus)
    with (index_dir / BM25_FILE).open("wb") as f:
        pickle.dump({"bm25": bm25, "chunk_ids": [c.chunk_id for c in chunks]}, f)

    (index_dir / CHUNKS_FILE).write_text(
        json.dumps([c.__dict__ for c in chunks], ensure_ascii=False), encoding="utf-8"
    )

    manifest = {
        "pdf_filename": pdf_path.name,
        "pdf_sha256": digest,
        "lft_ultima_reforma_dof": reform_version,
        "embedding_model_id": settings.embedding_model_id,
        "max_chunk_tokens": settings.max_chunk_tokens,
        "total_chunks": len(chunks),
        "substantive_chunks": sum(1 for c in chunks if not c.is_transitorio),
        "transitorio_chunks": sum(1 for c in chunks if c.is_transitorio),
        "derogado_chunks": sum(1 for c in chunks if c.is_derogado),
        "substantive_articles": len({c.articulo_id for c in chunks if not c.is_transitorio}),
        "indexed_at_utc": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    (index_dir / MANIFEST).write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return IngestResult(skipped=False, manifest=manifest)
