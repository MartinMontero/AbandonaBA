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

## Segunda ronda de verificación (2026-11-22, después de la primera entrega)
| Afirmación | Qué se leyó | Resultado |
|---|---|---|
| C06 | Conasami (gob.mx/conasami): notas oficiales del 3 y 9 de diciembre de 2025 | 315.04 y 440.87 confirmados → **verificado-primaria**. El PDF de la resolución no se pudo extraer; la fecha del DOF (9-dic-2025) es la que da Conasami. Sin resolución de 2027 a la fecha |
| C12 | DOF 21/10/2026, texto del acuerdo | **verificado-primaria**. Corrección: el acuerdo no dice «sin pagos retroactivos» en lo leído; sí dice base = último SBC (o menos) + una UMA, nunca menos de un salario mínimo, solo digital; los ya inscritos siguen igual. La entrada en vigor el 22 de octubre es deducción mía. Los amparos siguen sin verificar |
| C16 | Comunicado 03/2026 de INAES y LGSC (última reforma DOF 16-04-2025) | **verificado-primaria**: gratuito, 20 días hábiles, mínimo cinco socios, un voto, reserva ≥25% (productores), educación ≥1%. **Corrección:** el comunicado no habla de ratificación de identidad por parte de los fundadores; se quitó |
| C19 | LFT Art. 80 | prima vacacional ≥ 25% confirmada |
| C03 | LFT Art. 486 | tope = doble del salario mínimo del área; con varias áreas, doble del promedio |
| C04 | LFT Art. 521 | la solicitud de conciliación **interrumpe** (521 fr. III) mientras el 518 dice que **suspende**: pregunta nueva para el abogado |
| C05 | LFT Art. 685 Ter completo | lista confirmada |
| C21 | LFT Art. 33 completo y encabezado del Art. 5 | ratificación y nulidad confirmadas |

## Tercera ronda (2026-11-22)
| Afirmación | Qué se leyó | Resultado |
|---|---|---|
| C08 ISR | DOF 27-01-2016 decreto de desindexación (Transitorios 2 y 3); Ley para Determinar el Valor de la UMA; LISR Art. 93 fr. XIII completo | **Resuelto**: Transitorio Tercero reconduce «salario mínimo» a UMA; fracción de más de seis meses = año completo. La calculadora ya aplica la fracción. Queda pendiente el criterio del SAT (no leído) |
| C07 UMA | INEGI, Comunicado de prensa 1/26 (8-ene-2026) | 117.31 / 3,566.22 / 42,794.64, vigente desde el 1-feb-2026 → **verificado-primaria**. La publicación en el DOF del 9-ene no se leyó |
| C15 FINABIEN | DOF 18-11-2026 vía SIDOF, texto completo | **verificado-primaria**: vigor al día siguiente; 180 + 180 días; sin montos ni tasas |
| C13 CDMX | `segurodedesempleo.cdmx.gob.mx` (aviso de segunda convocatoria 2026, PDF) | el servidor **no respondió** (tiempo agotado). No se desactivó la verificación de certificados |

## SIGUE sin verificar (se intentó y no se pudo, o no se intentó)
| Afirmación | Intento | Motivo |
|---|---|---|
| C07 UMA 2026 | INEGI | la página se dibuja con scripts y no entregó cifras; no se usó ninguna fuente de prensa. **117.31 y 3,566.22 siguen como verificado-secundaria** (vienen de tu borrador) |
| C13 CDMX | cdmx.gob.mx, trabajo.cdmx.gob.mx | error de conexión / conexión rechazada |
| C14 INFONAVIT | infonavit.org.mx | 403 a robots |
| C15 FINABIEN | gob.mx/finabien y DOF | la página de la agencia cargó sin el decreto; el DOF www falla por certificado. No se encontró el decreto |
| C22 BBVA, C23, C24, C25, C26 | no se intentó | requieren ofertas con fecha, informes o reglas del SAT |
| Noticias de `/situacion` | no se releyeron | solo se comprobó que los enlaces cargan. No se abrieron `jcfrias`, `deprecated.now` ni Instagram |

## UNTESTED
- Cloudflare Access real (Access gratuito, PIN, política por correo, `check-review-gate.ps1` contra un despliegue protegido, `review-access-setup.ps1` contra la API real).
- `workers_dev` por entorno al desplegar de verdad; `wrangler delete --env review`.
- Despliegue real (ninguno se hizo).
- Pruebas en navegadores distintos de Chromium y en un Android real.
- Impresión real en papel (A4 y Carta): solo se generaron PDF A4.
- Teclado en `/revision` (solo se probó la calculadora).
