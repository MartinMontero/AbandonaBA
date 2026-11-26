"""Recuperación híbrida multi-ley (densa + BM25) fusionada con RRF, y búsqueda exacta por artículo."""
from __future__ import annotations

import pickle
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .config import LawCode, LawFilter, Settings
from .indexer import BM25_FILE, CHROMA_DIR, load_chunks, load_embedder, read_manifest, tokenize_es
from .parser import ArticleChunk, normalize_articulo_id


@dataclass
class RetrievedCandidate:
    chunk: ArticleChunk
    rrf_score: float
    dense_rank: int | None
    bm25_rank: int | None


class IndexNotReady(RuntimeError):
    pass


def rrf_fuse(rankings: list[list[str]], k: int = 60) -> list[tuple[str, float]]:
    """score(d) = Σ 1 / (k + rank_d), con rank empezando en 1."""
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking, start=1):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank)
    return sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))


def _allowed(
    c: ArticleChunk,
    include_transitorios: bool,
    exclude_derogados: bool,
    law_filter: LawFilter = "ALL",
) -> bool:
    if law_filter != "ALL" and c.law_code != law_filter:
        return False
    if c.is_transitorio and not include_transitorios:
        return False
    if c.is_derogado and exclude_derogados:
        return False
    return True


class HybridRetriever:
    def __init__(self, settings: Settings, embedder: Any = None) -> None:
        self.settings = settings
        self.index_dir: Path = settings.resolved_index_dir()
        manifest = read_manifest(self.index_dir)
        if manifest is None:
            raise IndexNotReady(
                f"No hay índice en {self.index_dir}. Ejecuta `lft-rag ingest-all` primero."
            )
        self.manifest = manifest
        self.chunks = load_chunks(self.index_dir)
        self.by_id = {c.chunk_id: c for c in self.chunks}
        with (self.index_dir / BM25_FILE).open("rb") as f:
            data = pickle.load(f)  # noqa: S301 - archivo generado localmente por `ingest`
        self.bm25 = data["bm25"]
        self.bm25_ids: list[str] = data["chunk_ids"]
        self._embedder = embedder
        self._collection: Any = None

    @property
    def embedder(self) -> Any:
        if self._embedder is None:
            self._embedder = load_embedder(self.manifest["embedding_model_id"])
        return self._embedder

    @property
    def collection(self) -> Any:
        if self._collection is None:
            import chromadb

            client = chromadb.PersistentClient(path=str(self.index_dir / CHROMA_DIR))
            self._collection = client.get_collection(self.settings.chroma_collection)
        return self._collection

    def _dense(
        self,
        query: str,
        include_transitorios: bool,
        exclude_derogados: bool,
        law_filter: LawFilter = "ALL",
    ) -> list[str]:
        vec = self.embedder.encode([query], normalize_embeddings=True, show_progress_bar=False)[0].tolist()
        conds: list[dict[str, Any]] = []
        if law_filter != "ALL":
            conds.append({"law_code": law_filter})
        if not include_transitorios:
            conds.append({"is_transitorio": False})
        if exclude_derogados:
            conds.append({"is_derogado": False})
        where: dict[str, Any] | None = None
        if len(conds) == 1:
            where = conds[0]
        elif conds:
            where = {"$and": conds}
        res = self.collection.query(query_embeddings=[vec], n_results=self.settings.dense_top_k, where=where)
        return list(res["ids"][0])

    def _bm25(
        self,
        query: str,
        include_transitorios: bool,
        exclude_derogados: bool,
        law_filter: LawFilter = "ALL",
    ) -> list[str]:
        tokens = tokenize_es(query)
        if not tokens:
            return []
        scores = self.bm25.get_scores(tokens)
        order = sorted(range(len(scores)), key=lambda i: -scores[i])
        out: list[str] = []
        for i in order:
            if scores[i] <= 0:
                break
            cid = self.bm25_ids[i]
            if _allowed(self.by_id[cid], include_transitorios, exclude_derogados, law_filter):
                out.append(cid)
            if len(out) >= self.settings.bm25_top_k:
                break
        return out

    def retrieve(
        self,
        query: str,
        include_transitorios: bool = False,
        exclude_derogados: bool = False,
        law_filter: LawFilter = "ALL",
    ) -> list[RetrievedCandidate]:
        dense = self._dense(query, include_transitorios, exclude_derogados, law_filter)
        lexical = self._bm25(query, include_transitorios, exclude_derogados, law_filter)
        fused = rrf_fuse([dense, lexical], k=self.settings.rrf_k)[: self.settings.rrf_candidates]
        d_rank = {cid: i for i, cid in enumerate(dense, start=1)}
        b_rank = {cid: i for i, cid in enumerate(lexical, start=1)}
        return [
            RetrievedCandidate(self.by_id[cid], score, d_rank.get(cid), b_rank.get(cid))
            for cid, score in fused
            if cid in self.by_id
        ]

    def get_article_chunks(
        self,
        articulo_query: str,
        include_transitorios: bool = False,
        law_code: LawCode = "LFT",
    ) -> list[ArticleChunk]:
        """Búsqueda exacta y determinista por identificador canónico y estatuto (p. ej. "47" LFT, "27" LSS)."""
        wanted = normalize_articulo_id(articulo_query)
        hits = [
            c
            for c in self.chunks
            if c.law_code == law_code
            and c.articulo_id == wanted
            and (include_transitorios or not c.is_transitorio)
        ]
        if not hits and include_transitorios:
            low = wanted.lower()
            hits = [
                c
                for c in self.chunks
                if c.law_code == law_code and c.is_transitorio and c.articulo_id.lower() == low
            ]
        return sorted(hits, key=lambda c: c.part_index)
