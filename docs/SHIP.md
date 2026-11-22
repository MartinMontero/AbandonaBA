# SHIP (2026-11-22)

## Veredicto
- **Versión de revisión para abogados: SHIP WITH FIXES.** Funciona de punta a punta y pasa las pruebas, pero no debe desplegarse sin Access activo (paso 5 de `docs/REVIEW-DEPLOY.md`) y hay que completar el contacto y el enlace en `docs/review-pack/LEEME.es.md`.
- **Producción: DO NOT SHIP todavía.** Falta el dictamen del abogado (`legalReview` sigue «pendiente»), y la lectura de las fuentes primarias que faltan (CDMX, INFONAVIT y otras; ver BLOCKERS.md).

## Tabla de salvedades
| Salvedad | Efecto |
|---|---|
| Revisión legal pendiente | Todas las páginas legales lo dicen. Los textos son borrador. |
| Exención de ISR | 90 × UMA, apoyado en el Transitorio Tercero de 2016 (leído); pendiente que el abogado lo confirme. |
| Varias cifras solo verificadas en prensa | Marcadas `verificado-secundaria` o `sin-verificar` en cada página. |
| Directorio sin teléfonos | Solo enlaces comprobados. |
| F10, F13 y F14 parciales | Ver BLOCKERS.md. |
| Cabeceras vía `_headers` | Cambio deliberado frente al prompt (cuota gratuita). |

## UNTESTED
Cloudflare Access real y su script; `check-review-gate.ps1` contra un despliegue protegido; `workers_dev` por entorno al desplegar; cualquier despliegue; otros navegadores y un Android real; impresión en papel (A4 y Carta); teclado en `/revision`; los workflows de GitHub. Detalle en VERIFICATION.md.

## Pasos para publicar producción (cuando digas GO; yo ejecuto)
No ejecutes esto hasta que el abogado firme y cambies `legalReview` en `src/data/site.config.ts`.
```powershell
cd $HOME\dev\AbandonaBA
npm ci
npm run verify
npx wrangler login
npx wrangler deploy --env=""
```
Éxito: imprime una URL de `workers.dev` o la de tu dominio. Para activar el dominio propio: en `wrangler.jsonc` descomenta el bloque `routes` (requiere que `abandonabancoazteca.mx` sea una zona de tu cuenta), vuelve a desplegar y comprueba en una ventana privada. Ese paso toca DNS: hazlo solo cuando quieras publicar.

Para la versión de revisión sigue `docs/REVIEW-DEPLOY.md`.
