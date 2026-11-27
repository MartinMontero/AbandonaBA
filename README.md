# Abandona Banco Azteca

Sitio gratuito, anónimo y sin cuentas, con calculadoras e información para personas que trabajan en un banco en México: cómo irse en las mejores condiciones y qué hacer después. Primero en español.

> Estado: **borrador pendiente de revisión por un abogado laboral.** No es asesoría legal. No está afiliado a Banco Azteca ni a Grupo Salinas.

## Qué hay aquí
- Calculadora de liquidación y finiquito en el navegador (`src/lib/calc.ts`), con el cálculo paso a paso y las cinco decisiones de cálculo abiertas (D1 a D5).
- Plazos, guía «No firmes esto», checklist de salida, dinero puente, empleos, emprender, equipo, cooperativa, cámbiate y transparencia.
- **Consulta la LFT (`/consulta-lft/`)**: búsqueda en el texto vigente de la Ley Federal del Trabajo con Cloudflare Workers AI (`@cf/baai/bge-m3`), Vectorize y D1, acompañada de una guía interactiva de 5 capítulos (`src/components/FieldGuideLft.astro`).
- **Reportar un error (`/acerca/#errores`)**: formulario pensado para cualquier persona (sin enviar a GitHub), respaldado por `POST /api/reporte` en el Worker (`src/lib/issueReport.ts`).
- Una **versión de revisión** del mismo código (`REVIEW_MODE=1`) con la mesa de revisión para abogados.
- Cada cifra legal vive en `src/data/valores-2026.json` (y cada afirmación en `src/data/claims-register.json`), con fuente, fecha y una de tres etiquetas: `verificado-primaria`, `verificado-secundaria`, `sin-verificar`.

## Privacidad y uso sin conexión
Sin cookies, sin cuentas, sin estadísticas ni solicitudes a terceros. Lo que escribes en las calculadoras no sale de tu aparato. Cloudflare, como proveedor de red, puede ver metadatos de la conexión (como la IP).

- **Sin conexión tras la primera visita:** el *service worker* (`public/sw.js`) precarga todas las páginas estáticas, estilos, scripts e íconos, por lo que calculadoras y guías funcionan sin internet después de abrir el sitio una vez.
- **Excepciones que requieren internet** (no pasan por la caché `/api/*`):
  1. **Consulta la LFT** (`/api/lft/*`), que procesa tu pregunta en Cloudflare sin guardar la pregunta, la respuesta ni tu IP.
  2. **Enviar un reporte de error** (`POST /api/reporte`), que crea un issue en GitHub desde el Worker.

## Correr y probar (Windows, PowerShell)
```powershell
npm ci
npm run build          # producción -> dist
npm run build:review   # revisión   -> dist-review
npm run preview        # Worker real con wrangler dev (puerto 8787)
npm test               # pruebas unitarias (Vitest)
npm run verify         # build, registro legal, unitarias, Playwright e2e + a11y, dry-run (producción)
npm run verify:review  # lo mismo para la versión de revisión
```
Node 22.23.4 o superior. Las pruebas e2e usan Playwright (`npx playwright install chromium`).

## Cambiar un valor legal y publicarlo
Lee [CONTRIBUTING.md](CONTRIBUTING.md). En corto: edita `src/data/valores-2026.json` (y la afirmación en `src/data/claims-register.json`), corre `npm run verify`, y despliega con tu cuenta de Cloudflare (`npx wrangler login`; `npx wrangler deploy --env=""`).

Para habilitar el formulario de reportes (`/api/reporte`) en tu Worker, configura el secreto `GITHUB_ISSUE_TOKEN` con un token fine-grained limitado a **Issues (Read & Write)** en el repositorio:
```powershell
npx wrangler secret put GITHUB_ISSUE_TOKEN
```

## Documentos
`docs/ARCHITECTURE.md`, `docs/AUDIT.md`, `docs/VERIFICATION.md`, `docs/DISCREPANCIES.md`, `docs/BLOCKERS.md`, `docs/HUMAN-CHECKS.md`, `docs/SHIP.md`, `docs/REVIEW-DEPLOY.md`, `docs/LEGAL-REGISTER.md`.

Licencias: código MIT; textos CC BY-SA 4.0.
