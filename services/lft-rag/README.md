# lft-rag

RAG jurídico local sobre la **Ley Federal del Trabajo** (texto vigente de la Cámara de Diputados), con compuertas de
decisión System One. Atiende la página pública `/consulta-lft/` (vía el Worker) y sirve a Claude Code como herramienta
de verificación (`.claude/skills/lft-legal/`).

## Instalar e indexar

```powershell
cd services\lft-rag
uv sync --extra dev                    # Python 3.13 (.python-version); torch de CPU
copy .env.example .env                 # y ajusta (ver comentarios)
curl.exe -fL --retry 3 -A "Mozilla/5.0" -o data\raw\LFT.pdf https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf
.venv\Scripts\lft-rag.exe ingest data\raw\LFT.pdf
```

`ingest` calcula el SHA-256 del PDF y guarda `data/index/manifest.json`; no reindexa si el PDF, el modelo de embeddings
y el tamaño de fragmento no cambiaron (usa `--force` para forzar).

## Usar

```powershell
.venv\Scripts\lft-rag.exe inspect-article "47" --json
.venv\Scripts\lft-rag.exe query "¿Cuántos días de aguinaldo me tocan?" --json
.venv\Scripts\lft-rag.exe serve        # http://127.0.0.1:8090, sin log de accesos
uv run pytest -v
```

## Pipeline

1. **Parser** (`src/parser.py`): quita encabezados/pies, IDs canónicos (`1o.`→`1`, `3o. Bis`, `15-A`, `512-D Bis`,
   `279 Quáter`, `353-Ñ`), jerarquía título/capítulo/sección con subtítulos, derogación a nivel artículo (no por una
   fracción derogada), última fecha DOF, transitorios por decreto, y subdivisión por fracciones sin cortar oraciones.
2. **Índice** (`src/indexer.py`): embeddings normalizados en ChromaDB (coseno) + BM25 con tokens jurídicos.
3. **Recuperación** (`src/retriever.py`): 15 densos + 15 BM25, fusión RRF (k=60), 10 candidatos; búsqueda exacta por ID.
4. **Compuerta 1**: `Score` 0–3 por candidato, umbral 1.5, máximo 5. Si ninguno pasa → `INSUFFICIENT_CONTEXT` sin llamar al LLM.
5. **Generador** (Barcenas-8B: `ollama`, `llamacpp`, `transformers` o `none` → `SOURCES_ONLY`).
6. **Verificación**: regex determinista de citas (ignora Constitución y otras leyes) + **Compuerta 2** (`Noul`:
   `is_supported ≥ 0.75`, `has_hallucinated_citation ≤ 0.30`). Si algo falla → `UNVERIFIED` y sólo artículos oficiales.
   Con `DECISION_BACKEND=off` una respuesta redactada nunca se marca `VERIFIED`.

## Backends de decisión

| `DECISION_BACKEND` | Qué usa | Notas |
|---|---|---|
| `jev` | `typesafe_sdk.TypeSafeClient.system_one` con `Score`/`Noul`, modelo `jev-1.14.0` | Requiere `TYPESAFE_API_KEY`. Envía pregunta, artículos y borrador a TypeSafe: debe anunciarse en `/consulta-lft/`. |
| `jeff` | `jeff-sdk` (`mstrasser/jeff-base` v1.4) con los adaptadores `passage-relevant` y `ground` | `uv sync --extra jeff`. Local sólo en Apple silicon/NVIDIA; si no, `JEFF_RUNTIME=remote` + `JEFF_API_KEY`. Entrenado en inglés. Sin adaptador para citas inventadas (se usa la regex). |
| `off` | nada | La regex de citas siempre corre. |

## Privacidad

El servicio no registra ni persiste preguntas, respuestas ni IPs: uvicorn corre con `access_log=False` y no hay
almacenamiento de consultas. `/health` expone sólo el manifiesto del índice y los backends configurados.

## Límites conocidos

- El borde de Cloudflare corta en ~100 s las respuestas de un origen vía túnel; con generación en CPU, una respuesta
  redactada puede tardar más. El proxy del Worker corta a los 95 s con un mensaje claro.
- `soylic/soylic-embeddings-leyes-mexicanas` requiere aprobación manual en Hugging Face; mientras tanto se puede usar
  `ibm-granite/granite-embedding-97m-multilingual-r2`, su modelo base abierto.
