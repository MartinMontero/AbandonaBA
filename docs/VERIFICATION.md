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
| C13 CDMX | `segurodedesempleo.cdmx.gob.mx` y `tramites.cdmx.gob.mx` con curl y con Chromium sin interfaz | ambos **agotan el tiempo a nivel de red** (ERR_CONNECTION_TIMED_OUT); no es un problema de la herramienta de lectura. No se desactivó la verificación de certificados |
| C09 jornada | Decreto DOF 01-05-2026 (PDF de la Cámara de Diputados), texto completo | **verificado-primaria; corrige un error de la primera versión**: en 2026 rige 48 horas, no 40 (ver DISCREPANCIES #8) |
| C06 salario mínimo | Resolución de Conasami 2026 (PDF), extraído con pdftotext | 315.04 y 440.87 aparecen en el texto de la resolución |
| Directorio | `centrolaboral.gob.mx` | **error corregido**: `www.centrolaboral.gob.mx` lleva al portal del Comité de Ética del CFCRL; el sitio del CFCRL es `gob.mx/cfcrl` |
| INFONAVIT | curl y Chromium | el cortafuegos del sitio devuelve «Access Denied» (403) también a un navegador real; no se intentó evadirlo |
| PROFEDET, CONSAR | Chromium sin interfaz | la página carga pero entrega texto vacío; contenido **sin leer** |

## Cuarta ronda (2026-11-22)
| Afirmación | Qué se leyó | Resultado |
|---|---|---|
| C22 BBVA | API pública de la bolsa de BBVA (Workday) y la oferta «Personal de Cajas (Del Valle)» | **verificado-primaria**: sueldo mensual 15,952, bono anual 32,200, 60 días de aguinaldo; 45 resultados para «Personal de Cajas» hoy |
| C26 RESICO | LISR Art. 113-E | tope de 3.5 millones y tasas de 1.00% a 2.50% confirmados |
| C26 SAS | LGSM Art. 260 (reforma 2023) | tope 7,678,849.94, que se actualiza cada enero; la cifra de 2026 puede ser otra; la cita en el SAT **no** se encontró |
| C26 Modalidad 10 | LSS Art. 13 fr. I | independientes pueden asegurarse voluntariamente; el nombre «Modalidad 10» no está en la ley |
| C11 semanas y tope | LSS transitorio (750 + 25 por año hasta 2031); decreto de 2016 | el tope en salario mínimo del DF se lee como UMA por el Transitorio Tercero; la regla de CONSAR **no** se leyó |
| Noticias de `/situacion` | La Verdad, Jointly, Xataka, SDP Noticias, La Jornada (por navegador), Independent (AP) | citas confirmadas: «estupidez increíble», «ataque al empleo», «Tenía 15 mil cajeros. Tenía, cuate», «Voy a poner una máquina», cena de Ramón Alberto Garza (La Verdad), «ya ha comenzado a recortar» (La Jornada), 7 de 9 amparos y más de 2.6 mil millones de dólares (Independent). La frase atribuida a él sobre la tecnología aparece en SDP como publicación suya en redes; el original sigue sin verse |

## Quinta ronda: vacantes afines en otros bancos y fintech (2026-11-22)
`npm run openings` consulta los listados públicos de cada empresa y guarda `src/data/vacantes.json` con la fecha.
| Empresa | Cómo se leyó | Resultado ese día |
|---|---|---|
| BBVA México | API pública de Workday (con curl; el cliente HTTP de Node recibe 429) | 83 abiertas en México; 66 afines (caja, ejecutivo, cobranza, fraude y AML) |
| Nu México | API pública de Ashby | 21 abiertas en México; 2 afines (Compliance, AML Ops) |
| Plata | API pública de Greenhouse | 102 abiertas en México; 49 afines (cobranza telefónica y de campo, ventas, atención, AML) |
| Clara | Greenhouse | 66 abiertas en México; 27 afines (ejecutivo de cuenta, fraude) |
| Kueski, Spin by OXXO | Ashby y Greenhouse | abiertas pero casi todas técnicas o de producto; 0 afines |
| Compartamos Banco | sitio de empleo (SuccessFactors) | 60 afines encontradas, incluido «CAJERO SUCURSAL» y «GESTOR COBRANZA» (el total del sitio no se mide) |
| Banca Afirme | sitio de empleo (SuccessFactors) | 27 afines encontradas, incluido «CAJA» y asesores |
No se pudo consultar por programa: Banorte, Santander, BanCoppel, Mifel, Banjercito, Banregio, Scotiabank, Banamex/Citi, HSBC, Inbursa, Banco del Bienestar, Hey Banco, Mercado Pago, Stori, Klar y otros (ver `docs/HUMAN-CHECKS.md`). Los buscadores muestran vacantes de cajero de Banorte y Santander en bolsas de terceros (OCC, Computrabajo): no se tomaron como confirmadas.

La lista de lo que aún necesita una persona está en `docs/HUMAN-CHECKS.md`.

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
