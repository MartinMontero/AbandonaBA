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

## 8. Segunda ronda de verificación con Chrome (2026-11-23)

Se leyeron las páginas oficiales de Nu, Openbank, Ualá, Klar y Mercado Pago. Detalle en `src/data/cambiate.json` y en CB08, CB11 y CB12 del registro.

| Institución | Qué se leyó | Etiqueta |
|---|---|---|
| Nu México | Tabla de GAT: Cajitas 6.50%, Ahorro Congelado 6.55% a 6.80%, Cajita Turbo 13.00% (calculado el 18-nov; vigencia al 30-nov); IPAB hasta 400,000 UDIs | primaria |
| Openbank | 13% fijo en los primeros 30,000 pesos con una compra, pago o recarga al mes; 7% ordinario hasta 1,000,000; 6.5% arriba; GAT; calculado el 7-sep-2026, vigente al 7-feb-2027; IPAB 400,000 UDIs | primaria |
| Ualá | 6.75% base, 12% con 3,000 de consumo o nómina, 15% con 6,000; solo hasta 30,000 de saldo; vigente al 30-nov; IPAB 400,000 UDIs | primaria |
| Klar (SOFIPO) | 3% (Light) y 5% (Plus y Platino) a la vista; 15% en Fondos de Rendimientos; cálculo del 5-nov al 7-dic; Fondo de Protección 25,000 UDIS | primaria |
| Mercado Pago | «hasta 15%» como suma de un beneficio y el rendimiento de un fondo de GBM; sin protección ni condiciones leídas | no se calcula |

Discrepancias con la prensa: Openbank dice 30,000 pesos (no 40,000); Cajita Turbo y Klar no muestran en su página de GAT el tope ni la condición de gasto que citaba la prensa, así que no se calculan.

Qué cambió en el sitio: `/cambiate/ahorro/` ahora ordena las ofertas verificadas con la cantidad de la persona (solo los niveles que puede cumplir; vencidas en gris). La función `bandsInterest` y 9 pruebas nuevas cubren los tramos.

Sigue pendiente: Stori, Bineo, Spin, los bancos grandes, el selector (faltan banderas de «solo app» y portabilidad por institución), Afore y Buró.

## 9. Tercera ronda: Stori, bineo, Spin y bancos grandes (2026-11-23)

| Institución | Qué se leyó | Cómo | Etiqueta |
|---|---|---|---|
| bineo (Banorte) | Pockets: 75% de Cetes 28; GAT 4.69% / 0.54% (calc. 1-sep-2026, vigente al 1-mar-2027); «sin saldo mínimo y sin comisiones»; IPAB 400 mil UDIS; regla de ISR sobre 5 UMAs anualizadas (≈ 214,090.75) | Chrome | primaria (CB34); la regla de ISR es secundaria (CB27) |
| Stori (SOFIPO) | GAT nominal por producto y plazo; Fondo de Protección 25,000 UDIS | Chrome | primaria (CB33). Sin tasa, topes ni vigencia en la página: no se calcula |
| Spin by OXXO | IFPE (Compropago). Aviso legal: el Gobierno Federal no garantiza los recursos | Chrome | primaria (CB33). Sin producto de ahorro con tasa |
| BBVA México | Libretón Básico Cuenta Digital: administración 62 pesos + IVA con exención por retiros; sin saldo mínimo; IPAB 400 mil UDI; Línea BBVA | PDFs oficiales con `pdftotext` | primaria (CB31). Sin tasa de interés publicada |
| Banamex | Ahorro Fácil 0.00% (GAT real -3.79%, calc. 18-nov, vigente al 22-dic); pagarés de personas físicas de 0.91% a 1.16% de GAT; IPAB 400,000 UDIs | PDF de GAT | primaria (CB32). Comisiones de la cuenta Switch ilegibles: no se publican |

Sin leer, y por qué:
- **Santander:** la página de la cuenta SuperDigital devolvió vacío en dos intentos y «Dinero Creciente» no muestra tasa.
- **Banorte, HSBC, Scotiabank, Inbursa, BanCoppel:** no se alcanzó a revisarlos en esta pasada.
- **Comisiones de Nu, Ualá, Klar y Banamex:** no se leyeron.
- Los topes y condiciones de Cajita Turbo (Nu) y de Fondos de Rendimientos (Klar) siguen sin aparecer en páginas oficiales.

Resultado en el sitio: `/cambiate/ahorro/` suma bineo y Banamex al orden (Banamex rinde 0 pesos) y explica por qué Stori y Spin no se calculan; `/cambiate/cuanto-me-cuesta/` suma una tabla de comisiones publicadas (Azteca, BBVA, bineo, Openbank).

Dato útil para los bancos grandes: Banamex paga 0.00% en su ahorro básico y alrededor de 1% en pagarés, frente a 6.5% a 7% de las ofertas digitales sin condición.

## 10. Cuarta ronda: Santander, Banorte, HSBC, Scotiabank, BanCoppel e Inbursa (2026-11-23)

| Institución | Qué se leyó | Cómo | Etiqueta |
|---|---|---|---|
| Santander | Súper Cuenta Básica: sin monto de apertura, sin comisión por manejo, sin saldo promedio mínimo; IPAB 400 mil UDIS | folleto PDF con `pdftotext` y Chrome | primaria (CB35) |
| Banorte | Cuenta Enlace Digital: apertura de 0 pesos; «sin membresía ni comisiones» si la cuenta está activa | Chrome | primaria (CB36); sin aviso del IPAB leído |
| HSBC | Ahorro Flexible: 1.00% fijo (GAT real -3.00%), vigente al 1-mar-2027; sin comisión de administración; IPAB 400 mil UDIs | PDFs oficiales | primaria (CB37) |
| Scotiabank | Cuenta Scotia digital: sin comisión de manejo 3 meses; condiciones para conservar el beneficio; sin montos | Chrome | primaria (CB38), incompleta |
| BanCoppel | Cuenta Efectiva Digital: GAT 0.00% (real -3.97%), vigente al 24-mar-2027. Inversión Creciente: tabla de tasas bloqueada («Access Denied»); no se saltó el bloqueo | Chrome y curl | primaria (CB39) |
| Inbursa | La página de cuentas básicas no mostró contenido en dos intentos | Chrome | sin verificar |

Con esto el ahorro sin condiciones queda así para 40,000 pesos: Openbank 2,800; Nu 2,600; Ualá 2,025; bineo 1,857; HSBC 400; Banamex y BanCoppel 0.

## 11. Quinta ronda: canal de apertura y portabilidad de nómina; el selector ya funciona (2026-11-23)

Se leyó, en la página oficial de cada institución, si la cuenta exige la app y si recibe portabilidad de nómina (claim CB40; datos en `channels` y `payroll_portability` de `cambiate.json`).

| Institución | Sucursal u otra vía | Recibe portabilidad |
|---|---|---|
| Banco Azteca, BBVA, Banamex, Santander, Banorte, HSBC, Scotiabank, BanCoppel | sí (con cita) | sí |
| Ualá | solo app | sí (desde la app) |
| Nu, Openbank | digitales; **no dicen si exigen la app** | no todavía («próximamente») |
| Klar, Stori, Mercado Pago, bineo, Spin | solo app | **no mencionan nada** (sin verificar) |

Qué cambió en el sitio y en el código:
- `src/lib/matcher.ts`: los campos pueden ser `null` (sin verificar); un `null` excluye la opción solo cuando la regla lo necesita. Orden por pesos al año con la cantidad de la persona; empates alfabéticos.
- `/cambiate/que-me-conviene/`: tres preguntas (celular, nómina, cuánto ahorrar) y hasta tres opciones, cada una con por qué, un «ojo», su protección y su fecha. Debajo, la lista de por qué no aparecen las demás. Las reglas están en `src/data/matcher-rules.json` y se publican en `/cambiate/metodo/`.
- Se exige protección de depósitos verificada para sugerir. Por eso Banorte, Scotiabank y BanCoppel no aparecen todavía, aunque tienen sucursales.
- 25 casos de oro (`tests/matcher-cases.json`): 11 escritos a mano y 14 generados con una versión independiente de las reglas en Python (no con el mismo código). Todas pasan.

Con 40,000 pesos y celular, el selector sugiere Openbank, Nu y Ualá. Sin celular: HSBC, Banamex y BBVA. Con nómina: Ualá, HSBC y Banamex.

Sigue pendiente: aviso de protección de Banorte, Scotiabank y BanCoppel; portabilidad de Klar, Stori, Mercado Pago, bineo y Spin; si Nu y Openbank exigen la app; Inbursa; Afore, Buró, cerrar cuenta y crédito.
