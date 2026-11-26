# AbandonaBA — notas para Claude Code

Sitio Astro 7 estático + Worker mínimo (`src/worker.ts`). Pruebas: `npm test` (vitest), `npm run verify` (build, vitest, e2e, `wrangler deploy --dry-run`).

## Derecho laboral: verificar siempre contra la LFT oficial

- Toda constante, fórmula, plazo o cita de la Ley Federal del Trabajo en `src/lib/*.ts`, `src/data/*` o `src/content/**`
  debe citar un artículo **vigente** verificado con `lft-rag` (skill `.claude/skills/lft-legal/`). No uses memoria.
- Verifica con: `services/lft-rag/.venv/Scripts/lft-rag.exe inspect-article "<id>" --json` (exacto) o `query "<pregunta>" --json`.
- `is_derogado: true`, `status: "UNVERIFIED"` o `"INSUFFICIENT_CONTEXT"` bloquean el cambio: avisa en vez de escribirlo.
- Índice: `lft-rag ingest data/raw/LFT.pdf` en `services/lft-rag/` (omite si el SHA-256 no cambió).

## Servicio lft-rag (`services/lft-rag/`, Python 3.13, uv)

- Pruebas: `uv run pytest -v` en `services/lft-rag/`. API: `lft-rag serve` → `http://127.0.0.1:8090` (`/health`,
  `/v1/legal/articles/{id}`, `/v1/legal/query`); bearer `LFT_SERVICE_TOKEN` de `services/lft-rag/.env`.
- Nunca se suben: `services/lft-rag/.env`, `.dev.vars`, `services/lft-rag/data/` (PDF, índice), `*.gguf`, `*.pkl`.
- El servicio no registra ni guarda preguntas (uvicorn sin access log). No agregues logs con texto de usuarios.

## «Consulta la LFT» (`/consulta-lft/`), el único uso de IA del sitio

- El navegador sólo habla con `/api/lft/*` (mismo origen; CSP `connect-src 'self'`). El Worker (`src/lib/lftProxy.ts`)
  reenvía a `LFT_RAG_BASE_URL` con `LFT_SERVICE_TOKEN`; límite global con clave fija, nunca la IP.
- Cualquier cambio que envíe datos a un tercero (p. ej. `DECISION_BACKEND=jev`) debe reflejarse en `/consulta-lft/`
  («Dónde corre») y en `/acerca/#datos` antes de activarse.
- La página debe mantener: aviso de IA, por qué se usa, qué se guarda (nada), límites, «no es asesoría legal» y
  «no crea una relación abogado-cliente», verificar con abogado laboral y PROFEDET. `tests/lft.test.ts` lo comprueba.
- Sólo `VERIFIED` muestra texto redactado; los demás estados muestran únicamente artículos oficiales.
