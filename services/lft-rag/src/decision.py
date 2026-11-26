"""Capa de decisión System One unificada: `jev` (TypeSafe), `jeff` (jeff-sdk) u `off`.

Todas las implementaciones exponen la misma interfaz:
  - score(state, instructions, criteria)      -> ScoreResult | None   (rúbrica 0..N-1, puntaje esperado)
  - noul(state, instructions, true, false)    -> NoulResult | None    (probabilidad de "sí/verdadero")
  - noul_batch(state, questions)              -> dict[nombre, NoulResult | None]

`None` significa "este backend no puede juzgar esta pregunta"; quien llama decide qué hacer (nunca se inventa un valor).
"""
from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable

from .config import Settings

JSONState = Mapping[str, Any]


@dataclass(frozen=True)
class ScoreResult:
    score: float
    confidence: float | None = None
    probabilities: dict[int, float] = field(default_factory=dict)


@dataclass(frozen=True)
class NoulResult:
    prob: float


@dataclass(frozen=True)
class NoulQuestion:
    instructions: str
    true: str
    false: str


@runtime_checkable
class DecisionEngine(Protocol):
    name: str

    @property
    def enabled(self) -> bool: ...

    def score(self, state: JSONState, instructions: str, criteria: Sequence[str]) -> ScoreResult | None: ...

    def noul(self, state: JSONState, instructions: str, true: str, false: str) -> NoulResult | None: ...

    def noul_batch(self, state: JSONState, questions: Mapping[str, NoulQuestion]) -> dict[str, NoulResult | None]: ...


def expected_score(probabilities: Mapping[int, float]) -> float:
    total = sum(probabilities.values()) or 1.0
    return sum(i * p for i, p in probabilities.items()) / total


def entropy_confidence(probabilities: Sequence[float]) -> float:
    """1 - H(p)/ln(N): 1 = seguro, 0 = uniforme."""
    n = len(probabilities)
    if n <= 1:
        return 1.0
    total = sum(probabilities) or 1.0
    h = -sum((p / total) * math.log(p / total) for p in probabilities if p > 0)
    return max(0.0, 1.0 - h / math.log(n))


# ---------------------------------------------------------------------------
# off
# ---------------------------------------------------------------------------


class NoOpDecisionEngine:
    name = "off"

    @property
    def enabled(self) -> bool:
        return False

    def score(self, state: JSONState, instructions: str, criteria: Sequence[str]) -> ScoreResult | None:
        return None

    def noul(self, state: JSONState, instructions: str, true: str, false: str) -> NoulResult | None:
        return None

    def noul_batch(self, state: JSONState, questions: Mapping[str, NoulQuestion]) -> dict[str, NoulResult | None]:
        return {k: None for k in questions}


# ---------------------------------------------------------------------------
# jev (TypeSafe System One)
# ---------------------------------------------------------------------------


class JevDecisionEngine:
    name = "jev"

    def __init__(self, settings: Settings, client: Any = None) -> None:
        if client is None:
            if not settings.typesafe_api_key:
                raise RuntimeError("DECISION_BACKEND=jev requiere TYPESAFE_API_KEY.")
            from typesafe_sdk import TypeSafeClient

            client = TypeSafeClient(
                api_key=settings.typesafe_api_key,
                base_url=settings.typesafe_base_url or None,
                model=settings.jev_model_id,
                timeout=60.0,
            )
        self._client = client
        self._model = settings.jev_model_id

    @property
    def enabled(self) -> bool:
        return True

    def score(self, state: JSONState, instructions: str, criteria: Sequence[str]) -> ScoreResult | None:
        from typesafe_sdk import Score

        resp = self._client.system_one(
            state=dict(state),
            questions={"q": Score(instructions=instructions, criteria=list(criteria))},
            model=self._model,
        )
        ans = resp.answers["q"]
        probs = {int(k): float(v) for k, v in ans.probabilities.items()}
        return ScoreResult(score=float(ans.score), confidence=float(ans.confidence), probabilities=probs)

    def noul(self, state: JSONState, instructions: str, true: str, false: str) -> NoulResult | None:
        return self.noul_batch(state, {"q": NoulQuestion(instructions, true, false)})["q"]

    def noul_batch(self, state: JSONState, questions: Mapping[str, NoulQuestion]) -> dict[str, NoulResult | None]:
        from typesafe_sdk import Noul

        resp = self._client.system_one(
            state=dict(state),
            questions={
                k: Noul(instructions=q.instructions, criteria={"true": q.true, "false": q.false})
                for k, q in questions.items()
            },
            model=self._model,
        )
        return {k: NoulResult(prob=float(resp.answers[k].noul)) for k in questions}


# ---------------------------------------------------------------------------
# jeff (jeff-sdk: base mstrasser/jeff-base v1.4 + adaptadores)
# ---------------------------------------------------------------------------

JEFF_RELEVANCE_FN = "jeff.retrieval.passage-relevant.relevant"
JEFF_GROUNDING_FN = "jeff.retrieval.ground.grounding"
JEFF_SOURCE_DESC = (
    "Ley Federal del Trabajo de México (texto vigente publicado por la Cámara de Diputados), dividida por artículo."
)


class JeffDecisionEngine:
    """Usa adaptadores calibrados de Jeff en lugar de preguntas libres.

    - score(): `passage-relevant` (no/partly/yes) mapeado a la escala 0..3 → 0, 1.5, 3.
      Requiere state["question"] y state["passage"].
    - noul_batch(): "is_supported" → `ground.grounding` (P(supported)); requiere state["sources"] y state["answer"].
      Otras preguntas (p. ej. has_hallucinated_citation) no tienen adaptador y devuelven None.
    Nota: Jeff está entrenado en inglés; con texto jurídico en español su calibración no está garantizada.
    """

    name = "jeff"

    def __init__(self, settings: Settings, client: Any = None) -> None:
        if client is None:
            try:
                import jeff
            except ImportError as exc:  # pragma: no cover - depende del extra instalado
                raise RuntimeError("DECISION_BACKEND=jeff requiere `uv sync --extra jeff` (Python >= 3.13).") from exc
            if settings.jeff_runtime == "local":
                client = jeff.Jeff.local(["passage-relevant", "ground"])
            else:
                if not settings.jeff_api_key:
                    raise RuntimeError("JEFF_RUNTIME=remote requiere JEFF_API_KEY.")
                client = jeff.Jeff.remote(settings.jeff_server_url, token=settings.jeff_api_key, timeout_s=60)
        self._client = client

    @property
    def enabled(self) -> bool:
        return True

    def score(self, state: JSONState, instructions: str, criteria: Sequence[str]) -> ScoreResult | None:
        question, passage = state.get("question"), state.get("passage")
        if not question or not passage:
            return None
        decision = self._client.function(
            JEFF_RELEVANCE_FN, context={"source": JEFF_SOURCE_DESC, "question": str(question)}
        )(str(passage))
        p = {k.lower(): float(v) for k, v in decision.probabilities.items()}
        p_no, p_partly, p_yes = p.get("no", 0.0), p.get("partly", 0.0), p.get("yes", 0.0)
        top = len(criteria) - 1 if criteria else 3
        probs = {0: p_no, round(top / 2): p_partly, top: p_yes}
        score = (top / 2) * p_partly + top * p_yes
        return ScoreResult(score=score, confidence=entropy_confidence([p_no, p_partly, p_yes]), probabilities=probs)

    def noul(self, state: JSONState, instructions: str, true: str, false: str) -> NoulResult | None:
        return None

    def noul_batch(self, state: JSONState, questions: Mapping[str, NoulQuestion]) -> dict[str, NoulResult | None]:
        out: dict[str, NoulResult | None] = {k: None for k in questions}
        if "is_supported" in questions and state.get("sources") and state.get("answer"):
            decision = self._client.function(JEFF_GROUNDING_FN, context={"sources": state["sources"]})(
                str(state["answer"])
            )
            p = {k.lower(): float(v) for k, v in decision.probabilities.items()}
            out["is_supported"] = NoulResult(prob=p.get("supported", 0.0))
        return out


def build_decision_engine(settings: Settings, backend: str | None = None) -> DecisionEngine:
    choice = (backend or settings.decision_backend).lower()
    if choice == "jev":
        return JevDecisionEngine(settings)
    if choice == "jeff":
        return JeffDecisionEngine(settings)
    if choice == "off":
        return NoOpDecisionEngine()
    raise ValueError(f"DECISION_BACKEND desconocido: {choice}")
