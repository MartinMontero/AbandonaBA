"""Indexación versionada multi-ley (LFT + LSS): SHA-256 por estatuto + hash compuesto → ChromaDB y BM25."""
from __future__ import annotations

import hashlib
import json
import pickle
import re
import shutil
import unicodedata
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .config import LawCode, Settings
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
    t = re.sub(r"\b(\d+)\s*(?:o\.|º|°)", r"\1", t)
    tokens = re.findall(r"\d+-[a-z]\b|[a-z0-9]+", t)
    return [tok for tok in tokens if tok not in _STOPWORDS_ES and (len(tok) > 1 or tok.isdigit())]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def compute_corpus_version_hash(laws: Mapping[str, Mapping[str, Any]], embedding_model_id: str) -> str:
    """Hash determinista SHA-256 sobre `{law_code}:{pdf_sha256}:{embedding_model_id}` ordenado por estatuto."""
    parts = [
        f"{law_code}:{info['pdf_sha256']}:{embedding_model_id}"
        for law_code, info in sorted(laws.items())
    ]
    return hashlib.sha256("\n".join(parts).encode("utf-8")).hexdigest()


@dataclass
class IngestResult:
    skipped: bool
    manifest: dict[str, Any]


class EmbeddingModelUnavailable(RuntimeError):
    pass


def load_embedder(model_id: str) -> Any:
    from sentence_transformers import SentenceTransformer

    try:
        return SentenceTransformer(model_id, device="cpu", model_kwargs={"torch_dtype": "float32"})
    except Exception as exc:  # noqa: BLE001
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


def _validate_pdf(pdf_path: Path) -> Path:
    pdf_path = Path(pdf_path).resolve()
    if not pdf_path.exists():
        raise FileNotFoundError(pdf_path)
    with pdf_path.open("rb") as f:
        if f.read(5) != b"%PDF-":
            raise ValueError(f"{pdf_path} no es un PDF (encabezado %PDF ausente)")
    return pdf_path


def _clean_index_dir(index_dir: Path) -> None:
    if index_dir.exists():
        for name in (CHROMA_DIR, BM25_FILE, CHUNKS_FILE, MANIFEST):
            p = index_dir / name
            if p.is_dir():
                shutil.rmtree(p)
            elif p.exists():
                p.unlink()
    index_dir.mkdir(parents=True, exist_ok=True)


def _law_entry(
    pdf_path: Path, digest: str, reform_version: str, chunks: list[ArticleChunk], indexed_at: str
) -> dict[str, Any]:
    return {
        "pdf_filename": pdf_path.name,
        "pdf_sha256": digest,
        "ultima_reforma_dof": reform_version,
        "total_chunks": len(chunks),
        "substantive_chunks": sum(1 for c in chunks if not c.is_transitorio),
        "transitorio_chunks": sum(1 for c in chunks if c.is_transitorio),
        "derogado_chunks": sum(1 for c in chunks if c.is_derogado),
        "substantive_articles": len({c.articulo_id for c in chunks if not c.is_transitorio}),
        "indexed_at_utc": indexed_at,
    }


def _build_manifest(
    laws: dict[str, dict[str, Any]],
    all_chunks: list[ArticleChunk],
    settings: Settings,
    indexed_at: str,
) -> dict[str, Any]:
    lft = laws.get("LFT", {})
    lss = laws.get("LSS", {})
    primary = lft or next(iter(laws.values()), {})
    return {
        "laws": laws,
        "corpus_version_hash": compute_corpus_version_hash(laws, settings.embedding_model_id),
        "pdf_filename": primary.get("pdf_filename", ""),
        "pdf_sha256": primary.get("pdf_sha256", ""),
        "lft_ultima_reforma_dof": lft.get("ultima_reforma_dof", ""),
        "lss_ultima_reforma_dof": lss.get("ultima_reforma_dof", ""),
        "embedding_model_id": settings.embedding_model_id,
        "max_chunk_tokens": settings.max_chunk_tokens,
        "total_chunks": len(all_chunks),
        "substantive_chunks": sum(1 for c in all_chunks if not c.is_transitorio),
        "transitorio_chunks": sum(1 for c in all_chunks if c.is_transitorio),
        "derogado_chunks": sum(1 for c in all_chunks if c.is_derogado),
        "substantive_articles": len({(c.law_code, c.articulo_id) for c in all_chunks if not c.is_transitorio}),
        "indexed_at_utc": indexed_at,
    }


def _write_bm25_and_chunks(index_dir: Path, all_chunks: list[ArticleChunk]) -> None:
    from rank_bm25 import BM25Okapi

    corpus = [tokenize_es(c.text) for c in all_chunks]
    bm25 = BM25Okapi(corpus)
    with (index_dir / BM25_FILE).open("wb") as f:
        pickle.dump({"bm25": bm25, "chunk_ids": [c.chunk_id for c in all_chunks]}, f)

    (index_dir / CHUNKS_FILE).write_text(
        json.dumps([c.__dict__ for c in all_chunks], ensure_ascii=False), encoding="utf-8"
    )


def _add_chunks_to_chroma(collection: Any, chunks: list[ArticleChunk], embedder: Any) -> None:
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


def ingest(
    pdf_path: Path,
    settings: Settings,
    force: bool = False,
    embedder: Any = None,
    law_code: LawCode = "LFT",
) -> IngestResult:
    index_dir = settings.resolved_index_dir()
    pdf_path = _validate_pdf(pdf_path)
    digest = sha256_file(pdf_path)
    current = read_manifest(index_dir)
    laws_prev: dict[str, dict[str, Any]] = dict((current or {}).get("laws") or {})

    same_config = (
        current is not None
        and current.get("embedding_model_id") == settings.embedding_model_id
        and current.get("max_chunk_tokens") == settings.max_chunk_tokens
        and (index_dir / BM25_FILE).exists()
        and (index_dir / CHUNKS_FILE).exists()
        and (index_dir / CHROMA_DIR).exists()
    )
    if not force and same_config and laws_prev.get(law_code, {}).get("pdf_sha256") == digest:
        return IngestResult(skipped=True, manifest=current)

    embedder = embedder or load_embedder(settings.embedding_model_id)
    new_chunks, reform_version = parse_pdf(
        pdf_path,
        max_tokens=settings.max_chunk_tokens,
        count_tokens=make_token_counter(embedder),
        law_code=law_code,
    )
    if not new_chunks:
        raise RuntimeError(f"El parser no produjo fragmentos para {law_code}; revisa el PDF.")

    import chromadb

    if not same_config or force and not laws_prev:
        _clean_index_dir(index_dir)
        other_chunks: list[ArticleChunk] = []
        laws: dict[str, dict[str, Any]] = {}
    else:
        index_dir.mkdir(parents=True, exist_ok=True)
        other_chunks = [c for c in load_chunks(index_dir) if c.law_code != law_code]
        laws = laws_prev

    client = chromadb.PersistentClient(path=str(index_dir / CHROMA_DIR))
    collection = client.get_or_create_collection(
        name=settings.chroma_collection, metadata={"hnsw:space": "cosine"}
    )
    if other_chunks:
        collection.delete(where={"law_code": law_code})
    _add_chunks_to_chroma(collection, new_chunks, embedder)

    now = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    laws[law_code] = _law_entry(pdf_path, digest, reform_version, new_chunks, now)
    all_chunks = other_chunks + new_chunks
    _write_bm25_and_chunks(index_dir, all_chunks)

    manifest = _build_manifest(laws, all_chunks, settings, now)
    (index_dir / MANIFEST).write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return IngestResult(skipped=False, manifest=manifest)


def ingest_all(
    sources: Mapping[LawCode, Path],
    settings: Settings,
    force: bool = False,
    embedder: Any = None,
) -> IngestResult:
    """Ingesta secuencial de múltiples estatutos compartiendo el mismo modelo de embeddings."""
    last: IngestResult | None = None
    all_skipped = True
    for law_code, pdf_path in sources.items():
        if not Path(pdf_path).exists():
            continue
        if embedder is None:
            current = read_manifest(settings.resolved_index_dir())
            laws_prev = (current or {}).get("laws") or {}
            digest = sha256_file(Path(pdf_path))
            if force or laws_prev.get(law_code, {}).get("pdf_sha256") != digest or not current:
                embedder = load_embedder(settings.embedding_model_id)
        res = ingest(pdf_path, settings, force=force, embedder=embedder, law_code=law_code)
        all_skipped = all_skipped and res.skipped
        last = res
    if last is None:
        raise FileNotFoundError("No se encontró ningún PDF de estatuto para indexar.")
    return IngestResult(skipped=all_skipped, manifest=last.manifest)
