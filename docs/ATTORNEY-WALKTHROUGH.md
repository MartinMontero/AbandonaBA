# Recorrido para el abogado (generado)

Generado el 2026-11-22 desde el build de revisión con `node scripts/build-review-pack.mjs`. Los valores salen del mismo código de la calculadora (`src/lib/calc.ts`). Todos los datos de entrada son inventados.

Ruta de clics en cada escenario: **Calculadora** › escribir sueldo base semanal, comisiones y años › abrir «Ver el cálculo paso a paso» › cambiar las decisiones D1 a D5 en el bloque «Cómo se cuenta» para ver el otro resultado. La mesa de revisión (`/revision/`) muestra las cinco decisiones lado a lado.

## Cajero con cinco años

Entradas: sueldo base semanal 2205.28, comisiones semanales 900, años completos 5, zona general.

SDI método A: $467.92. SDI método B: $490.52. Parte exenta de ISR (90 × UMA × años): $52,789.50.

| Salida | Método A (comisión ÷ 7) | Método B (comisión ÷ 6) |
|---|---|---|
| renuncia | $0.00 | $0.00 |
| art439 | $131,017.29 | $137,346.06 |
| art51 | $116,979.73 | $122,630.41 |
| art48 | $70,187.84 | $73,578.25 |

## Cajero con dos años

Entradas: sueldo base semanal 2205.28, comisiones semanales 900, años completos 2, zona general.

SDI método A: $466.10. SDI método B: $488.61. Parte exenta de ISR (90 × UMA × años): $21,115.80.

| Salida | Método A (comisión ÷ 7) | Método B (comisión ÷ 6) |
|---|---|---|
| renuncia | $0.00 | $0.00 |
| art439 | $85,761.64 | $89,904.34 |
| art51 | $71,778.76 | $75,246.02 |
| art48 | $53,134.93 | $55,701.60 |

## Cajero con siete años

Entradas: sueldo base semanal 2205.28, comisiones semanales 900, años completos 7, zona general.

SDI método A: $468.53. SDI método B: $491.16. Parte exenta de ISR (90 × UMA × años): $73,905.30.

| Salida | Método A (comisión ÷ 7) | Método B (comisión ÷ 6) |
|---|---|---|
| renuncia | $0.00 | $0.00 |
| art439 | $161,173.15 | $168,958.59 |
| art51 | $147,117.35 | $154,223.83 |
| art48 | $81,523.63 | $85,461.61 |

## Pago solo con comisiones (sin sueldo base)

Entradas: sueldo base semanal 0, comisiones semanales 2500, años completos 3, zona general.

SDI método A: $375.73. SDI método B: $438.36. Parte exenta de ISR (90 × UMA × años): $31,673.70.

| Salida | Método A (comisión ÷ 7) | Método B (comisión ÷ 6) |
|---|---|---|
| renuncia | $0.00 | $0.00 |
| art439 | $81,158.51 | $94,684.93 |
| art51 | $69,886.50 | $81,534.25 |
| art48 | $47,342.47 | $55,232.88 |

## Trabajador en la frontera norte

Entradas: sueldo base semanal 3085.09, comisiones semanales 900, años completos 5, zona frontera.

SDI método A: $600.49. SDI método B: $623.10. Parte exenta de ISR (90 × UMA × años): $52,789.50.

| Salida | Método A (comisión ÷ 7) | Método B (comisión ÷ 6) |
|---|---|---|
| renuncia | $0.00 | $0.00 |
| art439 | $168,138.04 | $174,466.81 |
| art51 | $150,123.25 | $155,773.94 |
| art48 | $90,073.95 | $93,464.36 |

## Renuncia con 15 años o más

Entradas: sueldo base semanal 2205.28, comisiones semanales 900, años completos 16, zona general.

SDI método A: $469.74. SDI método B: $492.43. Parte exenta de ISR (90 × UMA × años): $168,926.40.

| Salida | Método A (comisión ÷ 7) | Método B (comisión ÷ 6) |
|---|---|---|
| renuncia | $90,190.46 | $94,547.09 |
| art439 | $296,876.92 | $311,217.51 |
| art51 | $282,784.66 | $296,444.53 |
| art48 | $132,467.23 | $138,866.04 |
