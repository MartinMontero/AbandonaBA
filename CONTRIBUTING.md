# Cómo contribuir

## Reglas
- Español sencillo, frases cortas. «Inteligencia Aumentada» en lugar de «IA» en los textos del sitio.
- Nada que cueste dinero por uso. Sin servicios de terceros en el navegador. Sin productos de Meta, OpenAI ni xAI.
- Ninguna cifra en pesos escrita a mano en las páginas: va en `src/data/valores-2026.json` y se cita con `{{v:id}}` en Markdown o con `getValue()` en `.astro`.
- No subas datos personales, documentos ni correos de abogados.

## Cómo actualizar un valor legal
1. Lee la fuente **primaria** (diputados.gob.mx, DOF, imss.gob.mx, consar.gob.mx, inegi.org.mx, gob.mx/conasami).
2. Edita el valor en `src/data/valores-2026.json`: `value`, `source_name`, `source_url`, `as_of` y `status`. Solo pon `verificado-primaria` si leíste la fuente oficial.
3. Si cambia lo que dice una afirmación, edítala en `src/data/claims-register.json` (incluye `attorney_question`).
4. Si cambia una cifra que usan los vectores (`tests/vectors.json`), recalcula los esperados y explica por qué en el pull request.
5. Corre `npm run verify` y `npm run verify:review`.
6. Abre un pull request con la fuente y la fecha de lectura.

## Revisión legal
`src/data/site.config.ts` tiene `legalReview`. El build falla si se marca «firmada» sin revisor y fecha. Solo un abogado puede pedir ese cambio.
