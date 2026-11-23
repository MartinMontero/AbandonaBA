# Estado del prompt v3 (Cámbiate) — 2026-11-23

Este documento resume lo que se hizo, lo que se verificó, lo que no y por qué. Nada se desplegó. La rama `build/v0` no se fusionó.

## 1. Cambios frente a lo que decía el prompt v3

El prompt v3 repite instrucciones que la persona responsable cambió después, en el chat. Se mantuvo lo más reciente y se anota aquí para que lo confirme:

| Prompt v3 | Se mantuvo | Motivo |
|---|---|---|
| Usar «Inteligencia Aumentada», nunca «IA» | «IA (inteligencia artificial)» | Instrucción del chat el 2026-11-22: usar el término de la industria |
| Salida rápida a `gob.mx` | `google.com` | Instrucción del chat |
| `src\components\ui` con componentes obligatorios y prueba de consistencia | No se creó | La carpeta de componentes y las clases CSS ya existentes cubren el diseño; se anota como desviación |

## 2. Inventario de herramientas (sección 0A)

| Herramienta | Presente | Uso |
|---|---|---|
| WebSearch / WebFetch (agente `web-fetch`) | sí | Wise, Remitly, Prosofipo, texto de 26 U.S.C. 4475, LTOSF |
| PowerShell / Bash | sí | Descarga del PDF de la LTOSF y lectura con `pdftotext`; pruebas; builds |
| Claude in Chrome | sí | Páginas con JavaScript: Banco Azteca (Operativa, Guardadito, préstamos) y portada de Banxico (UDI, Cetes 28, FIX) |
| Navegador integrado | sí | Sin uso en esta pasada |
| Computer use | no se usó | No hizo falta |

`WebFetch` no ejecuta JavaScript: las páginas de Banco Azteca y de Banxico devolvieron solo el título. Se leyeron con Chrome.

## 3. Verificado hoy (2026-11-23), con herramienta

| Dato | Valor | Fuente | Herramienta | Etiqueta |
|---|---|---|---|---|
| UDI | 8.925504 (22-nov-2026) | banxico.org.mx (portada) | Chrome | verificado-primaria |
| Cetes 28 | 6.19% (17-nov-2026) | banxico.org.mx (portada) | Chrome | verificado-primaria |
| FIX | 19.0228 (20-nov-2026) | banxico.org.mx (portada) | Chrome | verificado-primaria |
| Cuenta Operativa: 400 pesos + IVA, tres exenciones, teléfonos, nota IPAB 400 mil UDIs | ver `cambiate.json` | bancoazteca.com.mx | Chrome | verificado-primaria (CB01, CB06) |
| Guardadito: GAT nominal 0.00%, real -3.61%, vigencia al 28-nov-2026 | | bancoazteca.com.mx | Chrome | verificado-primaria (CB03) |
| Préstamo en efectivo: CAT 85.5% sin IVA, tasa 48.17%, 2,000 a 200,000 pesos, vigencia al 28-feb-2027 | | bancoazteca.com.mx | Chrome | verificado-primaria (CB04) |
| Fondo de SOFIPOs: hasta 25,000 UDIS | | prosofipo.mx | WebFetch | verificado-primaria (CB07) |
| Wise: CLABE y tarjeta, sin efectivo; lista de exclusión (127, 137, 677, CIBanco, Intercam, Vector) | | wise.com | WebFetch | verificado-primaria (CB17) |
| Remitly: depósito, cartera y efectivo; red nombrada incl. Elektra / Banco Azteca | | remitly.com | WebFetch | verificado-primaria (CB18) |
| Impuesto EE. UU. 1% (26 U.S.C. 4475) | | law.cornell.edu | WebFetch | verificado-secundaria (copia, no oficial) (CB19) |

Descarga: `LTOSF.pdf` (575 KB) de diputados.gob.mx a `.cache/sources/` (ignorado por git).

## 4. Discrepancias nuevas

1. **Guardadito.** El prompt decía 0.01% de interés y cargo por inactividad de 10 pesos (folleto de ~2023). La página oficial de hoy da GAT nominal 0.00% y no muestra esos puntos. Se usó la página. Su vigencia termina el 28-nov-2026.
2. **Portabilidad de nómina.** La guía de BBVA cita el Art. 18 de la LTOSF. El texto de la LTOSF (reforma DOF 14-11-2025) no contiene «portabilidad» ni «nómina». No se cita artículo. CB16 queda verificado-secundaria.
3. **Costo de Wise con tarjeta de débito.** La investigación anotó 41.11 USD para enviar 1,000 USD. La página de hoy muestra 18.20 USD (sin fecha). Se publican como muestra sin fecha y no se usan para ordenar.
4. **UDI.** El prompt citaba 8.927827 (23-nov, sitios que citan Banxico). Banxico muestra 8.925504 el 22-nov. Se usa el de Banxico con su fecha. Los vectores de prueba usan 8.927827 y lo dicen.
5. **Límite del IPAB.** Lo declara Banco Azteca en su página. La página del IPAB en gob.mx no mostró el límite. Se etiqueta «lo declara el banco».

## 5. Lo que se construyó

- Datos: `src/data/cambiate.json` (solo valores verificados, con fuente, fecha y herramienta), `claims-register.json` con CB01, CB03, CB04, CB06, CB07, CB16, CB17, CB18 y CB19 (prioridad D en la mesa de revisión).
- Código: `udi.ts`, `savings.ts`, `remesas.ts`, `afore.ts`, `matcher.ts` y 41 pruebas con los vectores de la sección 7B (`tests/cambiate-vectors.json`, `tests/matcher-cases.json`).
- Páginas: `/cambiate/`, `/cambiate/remesas/`, `/cambiate/cuanto-me-cuesta/`, `/cambiate/ahorro/`, `/cambiate/nomina/`, `/cambiate/metodo/`, `/cambiate/fuentes/`.
- Compuerta de revisión financiera (`financialReview`) y nota en cada página de Cámbiate.

## 6. Pendiente y por qué (BLOCKERS)

| Pieza del prompt | Estado | Causa |
|---|---|---|
| F24 selector «¿Qué me conviene?» con recomendaciones | motor y pruebas hechos; sin página | Solo hay datos verificados de Banco Azteca, Wise y Remitly. Una página que recomiende instituciones sería adivinar. 8 casos de prueba de 25 |
| F26 comparador de ahorro de varias instituciones | calculadora de una oferta + referencias | Sin tasas verificadas de Nu, Ualá, Mercado Pago, Openbank, Klar ni Bineo |
| F27 lista ordenada de todos los servicios de remesas | calculadora con la cotización del usuario; Wise y Remitly con datos verificados | Sin cotizaciones con fecha de otros servicios. Las cotizaciones de Wise de la página no traen fecha |
| F29 cerrar cuenta, F30 crédito, F31 Buró | sin página | Buró y Círculo de Crédito (403) y CONDUSEF (certificado) no se pudieron leer; la cancelación solo tiene una línea oficial («acudir a sucursal con identificación») |
| F32 Afore | `afore.ts` listo; sin página | La tabla de rendimientos de CONSAR (SISET) y los pasos del traspaso no se leyeron en esta pasada |
| F33 sin celular, F35 páginas por institución | sin página | Dependen de datos de otras instituciones |
| F20 pruebas en vivo de Cámbiate en `/revision/pruebas` | pendiente | Falta conectar los vectores nuevos al ejecutor de la mesa de revisión |
| Matriz de reglas `matcher-rules.json` publicada | pendiente | Depende de F24 |
| CB05, CB08 a CB15, CB20 a CB30 | sin re-leer | Sin tiempo en esta pasada; siguen sin entrar a la página |
| Cetes 28 en el comparador | sí, con fecha | |

## 7. Qué debe decidir la persona responsable

1. Confirmar las dos decisiones de la sección 1 (término «IA» y salida rápida a Google).
2. Si quiere que siga con la verificación de otras instituciones (Chrome) para habilitar el selector y el comparador de ahorro.
3. El uso de la bandera nacional en el encabezado y el ícono (la revisión de abogados debe confirmarlo).
