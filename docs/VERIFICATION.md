# VERIFICACIÓN (2026-11-22)

Qué se ejecutó de verdad y qué no. Lo no ejecutado está marcado **UNTESTED**.

## Ejecutado
| Qué | Cómo | Resultado |
|---|---|---|
| Pruebas unitarias (calculadora, vectores, bordes, fechas, ICS, formato, trazabilidad de cifras y afirmaciones, separación producción/revisión) | `npm test` (Vitest 5.1.1) | 55 de 55 pasan |
| E2E contra el Worker real (`wrangler dev`), cuatro proyectos: producción y revisión, escritorio y 360×640 | `npm run verify` y `npm run verify:review` (Playwright 1.65.1, Chromium) | 22 pasan y 2 se omiten por diseño en cada build; 0 fallos. Cubre: todas las rutas 200, `lang`/`title`/`h1`, sin tráfico externo, sin cookies, sin almacenamiento, cabeceras, `X-Robots-Tag` solo en revisión, salida rápida (botón y doble Escape), vectores de la calculadora y D1–D5, panel paso a paso, `.ics`, checklist y equipo, `/revision/pruebas`, `/revision/dictamen`, sin conexión tras la primera visita, peso ≤ 200 KB gzip y JS ≤ 60 KB gzip por página, axe WCAG 2.2 AA sin violaciones serias o críticas, recorrido solo con teclado en la calculadora |
| `wrangler deploy --dry-run` (producción) y `--env review --dry-run` | | pasan; **no se desplegó nada** |
| osv-scanner sobre `package-lock.json` | `osv-scanner scan source -L package-lock.json` | sin problemas (425 paquetes) |
| `npm audit` | | 0 vulnerabilidades |
| Enlaces externos | `node scripts/link-check.mjs` | 50 comprobados; 4 fallaron (indeed, coppel, occ: 403 a robots; condusef: sin respuesta) y se **quitaron** de los listados. Informe: `docs/link-check.json` |
| `check-review-gate.ps1` contra `wrangler dev --env review` (sin Access) | | reporta `FAIL "gate open"`, como debe |
| `review-access-setup.ps1 -WhatIf` con datos de prueba | | imprime el plan, no llama a la API |
| Sintaxis de ambos `.ps1` | analizador de PowerShell | 0 errores |
| Paquete de revisión | `npm run review-pack` | 13 archivos: 12 PDF y LEEME; los PDF muestran el banner y la nota de revisión pendiente |

## Dos corridas consecutivas
Se corrieron en orden: verify (producción), verify:review, verify (producción), verify:review y verify de nuevo; las cinco pasadas terminaron en `VERIFY: OK` con el mismo código (55 pruebas unitarias y 22 e2e que pasan, 2 omitidas por diseño, por build). Después de la última edición solo de documentos no se volvió a correr.

## Fuentes primarias leídas (texto extraído con pdftotext)
| Afirmación | Qué se leyó | Resultado |
|---|---|---|
| C01 | LFT Art. 439 (+ 437, 438) | texto coincide; 437/438 corregidos |
| C02 | LFT Arts. 48, 50, 51, 52 | coincide; intereses del Art. 48 añadidos; carga de la prueba del Art. 51 sin leer |
| C03 | LFT Art. 162 | coincide; Art. 486 (tope) **no leído** |
| C04 | LFT Arts. 516–518, 52 | conflicto resuelto: un mes (517) y 30 días (52) |
| C05 | LFT Arts. 684-B, 684-E, 685 Ter | excepciones están en 685 Ter |
| C08 | LISR Art. 93 fr. XIII | **dice salario mínimo, no UMA** (DISCREPANCIES #7) |
| C09 | LFT Arts. 59, 61, 66 | Art. 59 ya dice 40 horas; transitorios no leídos |
| C10 | LSS Art. 109 | coincide |
| C11 | LSS Art. 191 | tope en salario mínimo del Distrito Federal |
| C17 | LFT Art. 527 fr. I num. 22 | confirmado |
| C18 | LFT Art. 47 | aviso escrito confirmado; presunción sin leer |
| C19 | LFT Arts. 76, 79, 87 | coincide; Art. 80 sin leer |
| C20 | LFT Art. 89 | coincide |
| C21 | LFT Art. 33 | primer párrafo leído; ratificación en la parte final (cortada) **sin leer**; Art. 5 no encontrado |

## NO verificado (se queda como verificado-secundaria o sin-verificar)
C06, C07 (Conasami, INEGI no leídos), C12, C13, C14, C15, C16 (comunicado de INAES **no releído**), C22 (no se volvió a ver la oferta de BBVA), C23, C24, C25, C26. Las fuentes de prensa de `/situacion` solo se comprobaron como enlaces accesibles; su texto **no se releyó**. No se abrieron `jcfrias` ni `deprecated.now` ni los reels de Instagram.

## UNTESTED
- Cloudflare Access real (Access gratuito, PIN, política por correo, `check-review-gate.ps1` contra un despliegue protegido, `review-access-setup.ps1` contra la API real).
- `workers_dev` por entorno al desplegar de verdad; `wrangler delete --env review`.
- Despliegue real (ninguno se hizo).
- Pruebas en navegadores distintos de Chromium y en un Android real.
- Impresión real en papel (A4 y Carta): solo se generaron PDF A4.
- Teclado en `/revision` (solo se probó la calculadora).
