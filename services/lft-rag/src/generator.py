"""Pipeline multi-ley (LFT + LSS): Compuerta 1 → generador Barcenas-8B → verificador determinista → Compuerta 2."""
from __future__ import annotations

import re
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any, Literal, Protocol

import httpx
from pydantic import BaseModel, Field

from .config import LawCode, LawFilter, Settings
from .decision import DecisionEngine, NoulQuestion
from .parser import ARTICLE_ID_CORE, ArticleChunk, normalize_articulo_id
from .retriever import HybridRetriever, RetrievedCandidate

Status = Literal["VERIFIED", "UNVERIFIED", "INSUFFICIENT_CONTEXT", "SOURCES_ONLY"]

LFT_PDF_URL = "https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf"
LSS_PDF_URL = "https://www.diputados.gob.mx/LeyesBiblio/pdf/LSS.pdf"

DISCLAIMER_ES = (
    "Esto no es asesoría legal ni crea una relación abogado-cliente. Es información general generada "
    "automáticamente a partir del texto vigente de la Ley Federal del Trabajo (LFT) y la Ley del Seguro Social (LSS) "
    "y puede contener errores u omisiones. Verifica todo con una persona abogada laboral en México; "
    "la PROFEDET ofrece asesoría gratuita."
)
MSG_INSUFFICIENT = (
    "No encontramos en la Ley Federal del Trabajo ni en la Ley del Seguro Social artículos suficientemente "
    "relacionados con tu pregunta como para responderla. Intenta reformularla con términos concretos "
    "(por ejemplo: «aguinaldo», «vacaciones», «despido injustificado», «salario base de cotización») "
    "o consulta directamente a una persona abogada laboral."
)
MSG_UNVERIFIED = (
    "No pudimos verificar automáticamente la respuesta redactada, así que no la mostramos. Abajo están los "
    "artículos oficiales de la LFT y/o LSS que parecen relacionados con tu pregunta: léelos directamente y "
    "confírmalos con una persona abogada laboral."
)
MSG_SOURCES_ONLY = (
    "Por ahora este servicio sólo muestra fuentes: estos son los artículos oficiales de la LFT y/o LSS más "
    "relacionados con tu pregunta, sin una respuesta redactada. Léelos y confírmalos con una persona abogada laboral."
)

RELEVANCE_INSTRUCTIONS = (
    "Evalúa qué tan útil es este fragmento de la Ley Federal del Trabajo (LFT) o de la Ley del Seguro Social (LSS) "
    "de México para responder la pregunta jurídica del usuario."
)
RELEVANCE_CRITERIA = [
    "0: Irrelevante para la pregunta.",
    "1: Tangencialmente relacionado.",
    "2: Contexto directamente relevante.",
    "3: Responde directamente la pregunta jurídica.",
]
GATE2_QUESTIONS = {
    "is_supported": NoulQuestion(
        instructions=(
            "¿Cada afirmación jurídica, cifra, plazo y atribución de ley (LFT vs LSS) del borrador está respaldada "
            "literalmente por los artículos recuperados (retrieved_articles)?"
        ),
        true="Sí: todo lo que afirma el borrador aparece en los artículos recuperados o se sigue directamente de ellos.",
        false="No: al menos una afirmación, cifra, plazo o ley no está en los artículos recuperados.",
    ),
    "has_hallucinated_citation": NoulQuestion(
        instructions=(
            "¿El borrador cita algún artículo, fracción, estatuto (LFT/LSS) o tesis que no aparece en los artículos "
            "recuperados, o atribuye a un artículo un contenido que no tiene?"
        ),
        true="Sí: hay al menos una cita inventada o mal atribuida.",
        false="No: todas las citas corresponden a los artículos recuperados y a su contenido.",
    ),
}

SYSTEM_PROMPT = """Eres un asistente de investigación sobre la Ley Federal del Trabajo (LFT) y la Ley del Seguro Social (LSS / IMSS) de México.
Reglas estrictas:
1. Responde ÚNICAMENTE con base en los artículos de la LFT y/o LSS que se te proporcionan. No uses conocimiento externo.
2. Cita cada afirmación indicando siempre la ley y el artículo exactos (p. ej. «Artículo 84 de la LFT», «Artículo 27 de la LSS»), especialmente al contrastar conceptos laborales frente a seguridad social (como salario integrado vs. salario base de cotización).
3. Si un artículo está marcado como DEROGADO, adviértelo explícitamente y no lo presentes como vigente.
4. No inventes ni extrapoles cifras, montos, porcentajes ni plazos: sólo repite los que aparecen literalmente.
5. Si los artículos no bastan para responder, dilo con claridad.
6. Escribe en español claro y breve. No das asesoría legal; recuerda al final verificar con una persona abogada laboral."""


# ---------------------------------------------------------------------------
# Modelos de respuesta (contrato HTTP)
# ---------------------------------------------------------------------------


class ArticleOut(BaseModel):
    law_code: LawCode = "LFT"
    articulo_id: str
    articulo_label: str
    titulo: str
    capitulo: str
    seccion: str
    is_derogado: bool
    is_transitorio: bool
    reform_date: str
    decreto: str
    part_index: int
    part_total: int
    page_start: int
    text: str
    source_url: str
    relevance_score: float | None = None
    rrf_score: float | None = None

    @classmethod
    def from_chunk(
        cls, c: ArticleChunk, relevance: float | None = None, rrf: float | None = None
    ) -> ArticleOut:
        base_url = LSS_PDF_URL if c.law_code == "LSS" else LFT_PDF_URL
        return cls(
            law_code=c.law_code,
            articulo_id=c.articulo_id,
            articulo_label=c.articulo_label,
            titulo=c.titulo,
            capitulo=c.capitulo,
            seccion=c.seccion,
            is_derogado=c.is_derogado,
            is_transitorio=c.is_transitorio,
            reform_date=c.reform_date,
            decreto=c.decreto,
            part_index=c.part_index,
            part_total=c.part_total,
            page_start=c.page_start,
            text=c.body,
            source_url=f"{base_url}#page={c.page_start}" if c.page_start else base_url,
            relevance_score=relevance,
            rrf_score=rrf,
        )


class QueryResponse(BaseModel):
    status: Status
    answer: str
    cited_articles: list[str] = Field(default_factory=list)
    filtered_articles: list[ArticleOut] = Field(default_factory=list)
    is_supported_prob: float | None = None
    has_hallucinated_citation_prob: float | None = None
    deterministic_citation_passed: bool | None = None
    unverified_reasons: list[str] = Field(default_factory=list)
    decision_backend: str
    generator_backend: str
    lft_ultima_reforma_dof: str = ""
    lss_ultima_reforma_dof: str = ""
    corpus_version_hash: str = ""
    disclaimer: str = DISCLAIMER_ES


# ---------------------------------------------------------------------------
# Verificador determinista de citas multi-ley
# ---------------------------------------------------------------------------

_ID_PIECE = re.sub(r"\(\?P<[a-z]+>", "(?:", ARTICLE_ID_CORE)
_CITATION_RE = re.compile(
    r"\b(?:Art[íi]culos?|Arts?\.)\s+(?P<list>"
    + _ID_PIECE
    + r"(?:\s*(?:,|\by\b|\be\b|\bo\b|\bal\b|\ba\b)\s*"
    + _ID_PIECE
    + r")*)",
    re.IGNORECASE,
)
_ID_IN_LIST_RE = re.compile(_ID_PIECE, re.IGNORECASE)
_STATUTE_TAIL_RE = re.compile(
    r"^[^.;\n]{0,80}?\b(?:de la\s+)?(?P<law>LFT|Ley Federal del Trabajo|LSS|Ley del Seguro Social)\b",
    re.IGNORECASE,
)
_OTHER_LAW_RE = re.compile(
    r"^[^.;\n]{0,80}?\b(?:de la Constituci[óo]n|constitucional|Apartado\s+[AB]\b|"
    r"de la Ley (?!Federal del Trabajo|del Seguro Social)[A-ZÁÉÍÓÚ]|"
    r"del C[óo]digo|de la LISR|del Reglamento)",
    re.IGNORECASE,
)


def _tail_law_code(tail: str) -> LawCode | None:
    m = _STATUTE_TAIL_RE.match(tail)
    if not m:
        return None
    raw = m.group("law").lower()
    if "seguro social" in raw or raw == "lss":
        return "LSS"
    return "LFT"


def extract_cited_statute_articles(answer: str) -> list[tuple[LawCode | None, str]]:
    """Extrae pares `(law_code | None, canonical_articulo_id)` ignorando Constitución y leyes no indexadas."""
    found: list[tuple[LawCode | None, str]] = []
    for m in _CITATION_RE.finditer(answer):
        tail = answer[m.end() : m.end() + 120]
        if _OTHER_LAW_RE.match(tail):
            continue
        law_code = _tail_law_code(tail)
        for idm in _ID_IN_LIST_RE.finditer(m.group("list")):
            canon = normalize_articulo_id(idm.group(0))
            pair = (law_code, canon)
            if canon and pair not in found:
                found.append(pair)
    return found


def extract_citations(answer: str) -> list[str]:
    """Compatibilidad: devuelve los IDs canónicos citados (LFT y LSS)."""
    out: list[str] = []
    for _, aid in extract_cited_statute_articles(answer):
        if aid not in out:
            out.append(aid)
    return out


@dataclass
class CitationCheck:
    passed: bool
    cited: list[str]
    missing: list[str]
    cited_pairs: list[tuple[LawCode | None, str]] | None = None


def verify_citations_deterministically(
    answer: str, allowed_chunks: Sequence[ArticleChunk]
) -> CitationCheck:
    pairs = extract_cited_statute_articles(answer)
    allowed_pairs = {(c.law_code, normalize_articulo_id(c.articulo_id)) for c in allowed_chunks}
    allowed_ids = {aid for _, aid in allowed_pairs}

    cited_labels: list[str] = []
    missing: list[str] = []
    for law_code, aid in pairs:
        label = f"{law_code}:{aid}" if law_code else aid
        if label not in cited_labels:
            cited_labels.append(label)
        if law_code is not None:
            if (law_code, aid) not in allowed_pairs:
                missing.append(label)
        elif aid not in allowed_ids:
            missing.append(aid)

    return CitationCheck(
        passed=bool(pairs) and not missing,
        cited=cited_labels,
        missing=missing,
        cited_pairs=pairs,
    )


def verify_citations(answer: str, allowed_ids: Sequence[str]) -> CitationCheck:
    """Compatibilidad con pruebas de un solo estatuto."""
    cited = extract_citations(answer)
    allowed = {normalize_articulo_id(a) for a in allowed_ids}
    missing = [c for c in cited if c not in allowed]
    return CitationCheck(passed=bool(cited) and not missing, cited=cited, missing=missing)


# ---------------------------------------------------------------------------
# Backends de generación
# ---------------------------------------------------------------------------


class Generator(Protocol):
    name: str

    def generate(self, system: str, user: str) -> str: ...


class NoneGenerator:
    name = "none"

    def generate(self, system: str, user: str) -> str:  # pragma: no cover
        raise RuntimeError("GENERATOR_BACKEND=none no genera texto")


class OllamaGenerator:
    name = "ollama"

    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        self._model = settings.ollama_model_name
        self._max = settings.generator_max_new_tokens
        self._client = client or httpx.Client(base_url=settings.ollama_base_url, timeout=settings.generator_timeout_s)

    def generate(self, system: str, user: str) -> str:
        r = self._client.post(
            "/api/chat",
            json={
                "model": self._model,
                "stream": False,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                "options": {"temperature": 0.1, "num_predict": self._max},
            },
        )
        r.raise_for_status()
        return str(r.json()["message"]["content"]).strip()


class LlamaCppGenerator:
    name = "llamacpp"

    def __init__(self, settings: Settings) -> None:
        if not settings.generator_gguf_path:
            raise RuntimeError("GENERATOR_BACKEND=llamacpp requiere GENERATOR_GGUF_PATH.")
        from llama_cpp import Llama

        self._llm = Llama(model_path=settings.generator_gguf_path, n_ctx=8192, verbose=False)
        self._max = settings.generator_max_new_tokens

    def generate(self, system: str, user: str) -> str:
        out = self._llm.create_chat_completion(
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.1,
            max_tokens=self._max,
        )
        return str(out["choices"][0]["message"]["content"]).strip()


class TransformersGenerator:
    name = "transformers"

    def __init__(self, settings: Settings) -> None:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        kwargs: dict[str, Any] = {}
        if torch.cuda.is_available():
            kwargs["device_map"] = "auto"
            if settings.generator_load_in_4bit:
                from transformers import BitsAndBytesConfig

                kwargs["quantization_config"] = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_quant_type="nf4",
                    bnb_4bit_compute_dtype=torch.bfloat16,
                    bnb_4bit_use_double_quant=True,
                )
            else:
                kwargs["torch_dtype"] = torch.bfloat16
        else:
            kwargs["torch_dtype"] = torch.float32
        self._tok = AutoTokenizer.from_pretrained(settings.generator_model_id)
        self._model = AutoModelForCausalLM.from_pretrained(settings.generator_model_id, **kwargs)
        self._max = settings.generator_max_new_tokens

    def generate(self, system: str, user: str) -> str:
        import torch

        msgs = [{"role": "system", "content": system}, {"role": "user", "content": user}]
        ids = self._tok.apply_chat_template(msgs, add_generation_prompt=True, return_tensors="pt").to(
            self._model.device
        )
        with torch.no_grad():
            out = self._model.generate(ids, max_new_tokens=self._max, do_sample=False)
        return str(self._tok.decode(out[0][ids.shape[-1] :], skip_special_tokens=True)).strip()


def build_generator(settings: Settings) -> Generator:
    backend = settings.generator_backend
    if backend == "ollama":
        return OllamaGenerator(settings)
    if backend == "llamacpp":
        return LlamaCppGenerator(settings)
    if backend == "transformers":
        return TransformersGenerator(settings)
    return NoneGenerator()


# ---------------------------------------------------------------------------
# Orquestación
# ---------------------------------------------------------------------------


def format_articles_for_prompt(chunks: Sequence[ArticleChunk]) -> str:
    blocks = []
    for i, c in enumerate(chunks, start=1):
        law_tag = "LEY: LSS (IMSS)" if c.law_code == "LSS" else "LEY: LFT"
        estado = "DEROGADO" if c.is_derogado else "vigente"
        jer = " / ".join(p for p in (c.titulo, c.capitulo, c.seccion) if p)
        parte = f" (Parte {c.part_index}/{c.part_total})" if c.part_total > 1 else ""
        reforma = f"; última reforma DOF {c.reform_date}" if c.reform_date else ""
        blocks.append(f"[{i}] {law_tag} | Artículo {c.articulo_label}{parte} — {jer} — {estado}{reforma}\n{c.body}")
    return "\n\n".join(blocks)


class LegalRAG:
    def __init__(
        self,
        settings: Settings,
        retriever: HybridRetriever,
        decision: DecisionEngine,
        generator: Generator,
    ) -> None:
        self.s = settings
        self.retriever = retriever
        self.decision = decision
        self.generator = generator

    def _base(self, status: Status, answer: str, articles: list[ArticleOut]) -> QueryResponse:
        m = self.retriever.manifest
        return QueryResponse(
            status=status,
            answer=answer,
            filtered_articles=articles,
            decision_backend=self.decision.name,
            generator_backend=self.generator.name,
            lft_ultima_reforma_dof=str(m.get("lft_ultima_reforma_dof", "")),
            lss_ultima_reforma_dof=str(m.get("lss_ultima_reforma_dof", "")),
            corpus_version_hash=str(m.get("corpus_version_hash", "")),
        )

    def gate1(
        self, question: str, candidates: Sequence[RetrievedCandidate]
    ) -> list[tuple[RetrievedCandidate, float | None]]:
        """Compuerta 1: puntúa cada candidato 0..3, descarta < umbral y conserva como máximo N."""
        if not self.decision.enabled:
            return [(c, None) for c in candidates[: self.s.max_filtered_articles]]
        scored: list[tuple[RetrievedCandidate, float | None]] = []
        for c in candidates:
            res = self.decision.score(
                {
                    "question": question,
                    "law_code": c.chunk.law_code,
                    "articulo_id": c.chunk.articulo_id,
                    "passage": c.chunk.text,
                },
                RELEVANCE_INSTRUCTIONS,
                RELEVANCE_CRITERIA,
            )
            if res is None:
                scored.append((c, None))
            elif res.score >= self.s.relevance_threshold:
                scored.append((c, res.score))
        scored.sort(key=lambda t: -(t[1] if t[1] is not None else -1.0))
        return scored[: self.s.max_filtered_articles]

    def answer(
        self,
        question: str,
        include_transitorios: bool = False,
        exclude_derogados: bool = False,
        law_filter: LawFilter = "ALL",
    ) -> QueryResponse:
        candidates = self.retriever.retrieve(
            question, include_transitorios, exclude_derogados, law_filter=law_filter
        )
        kept = self.gate1(question, candidates)
        articles = [ArticleOut.from_chunk(c.chunk, rel, c.rrf_score) for c, rel in kept]
        if not kept:
            return self._base("INSUFFICIENT_CONTEXT", MSG_INSUFFICIENT, [])

        if isinstance(self.generator, NoneGenerator):
            return self._base("SOURCES_ONLY", MSG_SOURCES_ONLY, articles)

        chunks = [c.chunk for c, _ in kept]
        context = format_articles_for_prompt(chunks)
        draft = self.generator.generate(SYSTEM_PROMPT, f"ARTÍCULOS RECUPERADOS:\n{context}\n\nPREGUNTA: {question}")

        check = verify_citations_deterministically(draft, chunks)
        reasons: list[str] = []
        if not check.cited:
            reasons.append("El borrador no cita ningún artículo de la LFT ni de la LSS.")
        if check.missing:
            reasons.append("Cita artículos que no están entre los recuperados: " + ", ".join(check.missing))

        gate2 = self.decision.noul_batch(
            {
                "user_query": question,
                "retrieved_articles": context,
                "retrieved_metadata": [{"law_code": c.law_code, "articulo_id": c.articulo_id} for c in chunks],
                "draft_answer": draft,
                "sources": [f"[{c.law_code}] Artículo {c.articulo_label}: {c.body}" for c in chunks],
                "answer": draft,
            },
            GATE2_QUESTIONS,
        )
        sup, hal = gate2.get("is_supported"), gate2.get("has_hallucinated_citation")
        if sup is None:
            reasons.append(f"Respaldo no evaluado por un modelo de decisión (backend '{self.decision.name}').")
        elif sup.prob < self.s.groundedness_threshold:
            reasons.append(f"Respaldo insuficiente (is_supported={sup.prob:.2f} < {self.s.groundedness_threshold}).")
        if hal is not None and hal.prob > self.s.hallucination_threshold:
            reasons.append(
                f"Posible cita inventada (has_hallucinated_citation={hal.prob:.2f} > {self.s.hallucination_threshold})."
            )

        resp = self._base("VERIFIED" if not reasons else "UNVERIFIED", draft if not reasons else MSG_UNVERIFIED, articles)
        resp.cited_articles = check.cited
        resp.deterministic_citation_passed = check.passed
        resp.is_supported_prob = sup.prob if sup else None
        resp.has_hallucinated_citation_prob = hal.prob if hal else None
        resp.unverified_reasons = reasons
        return resp
