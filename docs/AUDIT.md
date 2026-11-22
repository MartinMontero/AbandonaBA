# AUDIT (2026-11-22)

Qué existe, qué permite la plataforma y qué se verificó en vivo. Todo lo no leído está marcado.

## Estado inicial
- Repo `MartinMontero/AbandonaBA`: vacío (sin commits), clonado en `$HOME\dev\AbandonaBA`; trabajo en la rama `build/v0`. Nada se fusionó a `main`.
- Máquina: Windows, Node v24.16.0, npm 11.13.0, git 2.54, wrangler 4.152 global (el proyecto fija 4.166.0), osv-scanner instalado.

## Versiones (npm registry, 2026-11-22)
astro 7.4.13, wrangler 4.166.0, vitest 5.1.1, @playwright/test 1.65.1, @axe-core/playwright 4.14.0, sharp 0.35.5, typescript 7.0.2.
Astro 7 usa el procesador Markdown Sätteri; `markdown.remarkPlugins` exige un paquete extra. Se evitó con un plugin de Vite propio que sustituye `{{v:id}}` (sin dependencia nueva).

## Dependencias (justificación)
| Paquete | Para qué |
|---|---|
| astro | generador estático |
| wrangler (dev) | Worker, `dev`, `deploy --dry-run` |
| vitest (dev) | pruebas unitarias |
| @playwright/test, @axe-core/playwright (dev) | e2e y accesibilidad |
| sharp (dev) | tarjetas PNG (ver BLOCKERS: aún no implementado) |
| typescript (dev) | tipos |
Sin dependencias en tiempo de ejecución en el navegador.

## Plataforma Cloudflare
- Archivos estáticos: «requests to static assets are free and unlimited»; Worker gratis 100,000 solicitudes/día; 20,000 archivos por versión; 25 MiB por archivo. Fuente: https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ y /workers/platform/limits/ (leídas 2026-11-22).
- Con `run_worker_first`, las solicitudes siempre invocan el Worker y al pasar la cuota reciben 429. **Decisión de diseño:** no se usa `run_worker_first`. Las cabeceras de seguridad salen de un archivo `_headers` generado en cada build (https://developers.cloudflare.com/workers/static-assets/headers/): se aplican a los archivos estáticos sin invocar el Worker, así el sitio nunca se cae por cuota. `src/worker.ts` queda como red de seguridad que aplica las mismas cabeceras a lo que el Worker llegue a servir. El prompt pedía que el Worker pusiera las cabeceras; esto es un cambio deliberado. Verificado contra `wrangler dev` real (ver VERIFICATION.md).
- `_headers`: 100 reglas, 2,000 caracteres por línea; no aplica a respuestas generadas por código del Worker.
- Wrangler: `assets.directory`, `binding`, `html_handling`, `not_found_handling: "404-page"`; `observability.enabled: false`; entornos con `env.<nombre>` heredan `assets` y `observability`; `vars` y bindings no se heredan. El nombre del Worker del entorno se fija explícitamente (`abandonabancoazteca-review`). El comportamiento de `workers_dev` por entorno **no estaba explícito en la documentación leída**; se declara `workers_dev: true` en el entorno y `preview_urls: false`. `wrangler deploy --env review --dry-run` lo valida (ver VERIFICATION.md).
- `compatibility_date`: la documentación usa la fecha de hoy en su ejemplo; se fijó `2026-11-22`.

## Cloudflare Access para la versión de revisión
- Plan gratuito de Zero Trust: 50 usuarios (https://www.cloudflare.com/plans/sase-zero-trust.md, espejo en markdown, leído 2026-11-22; verificar en la página HTML del plan antes de contar con ello). Basta para unos cuantos abogados.
- **Requiere datos de pago al dar de alta Zero Trust, aunque no se cobra en el plan gratuito** (https://developers.cloudflare.com/cloudflare-one/setup/). Esto debe decidirlo el dueño de la cuenta; no se tocó nada.
- Mecanismos documentados para un Worker (https://developers.cloudflare.com/workers/configuration/cloudflare-access/): (1) panel: Workers & Pages › Worker › pestaña Access › «Protect this Worker behind Access»; (2) aplicación autohospedada en Zero Trust para el hostname `workers.dev`; (3) API `POST /accounts/{account_id}/access/apps` con `destinations` de tipo `worker`/`preview_worker`. Con alcance «All traffic» cubre workers.dev y previews.
- Login por PIN de un solo uso: se crea el proveedor `onetimepin` con `POST /accounts/{id}/access/identity_providers` (https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/). Limitar la aplicación a ese proveedor se hace con `allowed_idps` (inferido del texto de la API; no hay ejemplo documentado «solo OTP»).
- **No verificado:** el esquema exacto de la política `allow` con `include: email` (no se leyó la página de políticas) y si existe soporte en la CLI `cf`. Por eso `scripts\review-access-setup.ps1` está escrito contra la API REST, **sin probar**, con modo `-WhatIf`, y `docs\REVIEW-DEPLOY.md` incluye también los pasos de panel como camino principal.
- Sin condición de parada: Access gratuito cubre el caso, siempre que la cuenta acepte registrar un método de pago.

## Fuentes primarias leídas (texto extraído localmente con pdftotext)
LFT (última reforma DOF 14-05-2026), Ley del Seguro Social (última reforma DOF 15-01-2026), LISR. Detalle por afirmación en `docs/VERIFICATION.md` y diferencias con el borrador en `docs/DISCREPANCIES.md`.
