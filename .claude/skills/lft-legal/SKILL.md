---
name: lft-legal
description: Verify Mexican labor law (Ley Federal del Trabajo) against the official, locally indexed LFT text before writing or auditing any legal constant, formula, citation or copy in this repo. Use whenever work touches finiquito, liquidación, indemnización, despido, rescisión, aguinaldo, vacaciones (vacaciones dignas), prima vacacional, prima de antigüedad, PTU, salario mínimo, jornada, teletrabajo, subcontratación/outsourcing, IMSS/labor compliance, plazos de prescripción, or any "Art. N" of the LFT — e.g. src/lib/calc.ts, src/lib/deadlines.ts, src/data/*.json, src/content/**, claims-register.
---

# LFT legal verification (lft-rag)

Use the local `lft-rag` CLI instead of memory for anything the Ley Federal del Trabajo says. It reads the official
Cámara de Diputados PDF (`services/lft-rag/data/raw/LFT.pdf`), indexed by `lft-rag ingest`.

## Commands (run from `services/lft-rag/`)

```powershell
.venv\Scripts\lft-rag.exe inspect-article "87" --json          # exact article text, derogado, reform_date, título/capítulo
.venv\Scripts\lft-rag.exe inspect-article "3 Bis" --json         # suffixes: "15-A", "512-D Bis", "279 Quáter", "353-Ñ"
.venv\Scripts\lft-rag.exe query "¿Cuántos días de aguinaldo?" --json   # hybrid search + gates
.venv\Scripts\lft-rag.exe ingest data\raw\LFT.pdf                 # no-op unless the PDF SHA-256 or embedding model changed
```

HTTP alternative when the service is running (`lft-rag serve`, port 8090; needs `Authorization: Bearer $LFT_SERVICE_TOKEN`
if set in `services/lft-rag/.env`): `GET /v1/legal/articles/{id}`, `POST /v1/legal/query`, `GET /health`.

## Rules

1. Before hardcoding a statutory number (days, months, percentages, deadlines) or citing "Art. N", run
   `inspect-article "N" --json` and quote from `chunks[].text`. Prefer `inspect-article` over `query`: it is deterministic.
2. **Hard blockers** — stop and tell the user instead of writing the code/copy:
   - `"is_derogado": true` (the whole article is repealed; e.g. 15-A … 15-D since DOF 23-04-2021).
   - `query` returns `"status": "UNVERIFIED"` or `"INSUFFICIENT_CONTEXT"`.
   - `inspect-article` exits 1 / `"found": false`.
3. Record the article and `reform_date` next to any constant you add (this repo also tracks sources in
   `src/data/valores-2026.json` and `src/data/claims-register.json` — follow that pattern).
4. A repealed *fracción* inside a vigente article (e.g. Art. 47 IV "(Se deroga)") does NOT set `is_derogado`; read the text.

## Gotchas

- `query` with `GENERATOR_BACKEND=none` returns `SOURCES_ONLY` (articles, no drafted answer). That is expected; read the
  articles yourself. With `DECISION_BACKEND=off`, any drafted answer is always `UNVERIFIED` by design.
- `jeff` gating is English-trained; on Spanish text its probabilities are not calibrated. `jev` needs `TYPESAFE_API_KEY`
  and sends the question, articles and draft to TypeSafe.
- Transitorios are excluded by default; pass `--include-transitorios` and use ids like
  `"Transitorio Primero (Decreto 5)"` for decree transitory rules.
- Embeddings: `soylic/soylic-embeddings-leyes-mexicanas` is gated on Hugging Face; the local `.env` may use its open base
  `ibm-granite/granite-embedding-97m-multilingual-r2`. Changing `EMBEDDING_MODEL_ID` triggers a full re-index on `ingest`.
- CPU only on this machine: `query` takes seconds without a generator, minutes with Barcenas-8B via Ollama.
- The index reflects the PDF's "Última Reforma DOF" (`lft_ultima_reforma_dof` in the manifest). If a reform is newer,
  re-download the PDF and re-run `ingest`.
- On Windows, pipe-free use: `--json` writes UTF-8 bytes directly to stdout.
