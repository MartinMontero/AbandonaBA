# Abandona Banco Azteca

Sitio gratuito, anónimo y sin cuentas, con calculadoras e información para personas que trabajan en un banco en México: cómo irse en las mejores condiciones y qué hacer después. Primero en español.

> Estado: **borrador pendiente de revisión por un abogado laboral.** No es asesoría legal. No está afiliado a Banco Azteca ni a Grupo Salinas.

## Qué hay aquí
- Calculadora de liquidación en el navegador (`src/lib/calc.ts`), con el cálculo paso a paso y las cinco decisiones de cálculo abiertas (D1 a D5).
- Plazos, guía «No firmes esto», checklist de salida, dinero puente, trabajo, negocio, equipo, cooperativa.
- Una **versión de revisión** del mismo código (`REVIEW_MODE=1`) con la mesa de revisión para abogados.
- Cada cifra legal vive en `src/data/valores-2026.json`, con fuente, fecha y una de tres etiquetas: `verificado-primaria`, `verificado-secundaria`, `sin-verificar`.

## Privacidad
Sin cookies, sin cuentas, sin estadísticas, sin solicitudes a terceros. Lo que escribes no sale de tu aparato. Cloudflare, como proveedor de red, puede ver metadatos de la conexión (como la IP).

## Correr y probar (Windows, PowerShell)
```powershell
npm ci
npm run build          # producción -> dist
npm run build:review   # revisión   -> dist-review
npm run preview        # Worker real con wrangler dev (puerto 8787)
npm test               # pruebas unitarias
npm run verify         # build, pruebas, e2e, dry-run (producción)
npm run verify:review  # lo mismo para la versión de revisión
```
Node 22.23.4 o superior. Las pruebas e2e usan Playwright (`npx playwright install chromium`).

## Cambiar un valor legal y publicarlo
Lee [CONTRIBUTING.md](CONTRIBUTING.md). En corto: edita `src/data/valores-2026.json` (y la afirmación en `src/data/claims-register.json`), corre `npm run verify`, y despliega con tu propia cuenta de Cloudflare (`npx wrangler login`; `npx wrangler deploy --env=""`). Nada depende de la máquina ni de las cuentas de quien lo creó. Todo corre en el plan gratuito.

## Documentos
`docs/AUDIT.md`, `docs/VERIFICATION.md`, `docs/DISCREPANCIES.md`, `docs/BLOCKERS.md`, `docs/SHIP.md`, `docs/REVIEW-DEPLOY.md`, `docs/LEGAL-REGISTER.md`.

Licencias: código MIT; textos CC BY-SA 4.0.
