# Arquitectura (corta)

- **Un código, dos builds.** `REVIEW_MODE=1` cambia el directorio de salida (`dist-review`), añade las rutas `/revision*` (con `injectRoute`, solo en revisión), el banner, `noindex` y el panel «Para el abogado». Nada más cambia.
- **Estático primero.** Astro 7 genera HTML. Cero JavaScript de terceros. Los scripts son módulos pequeños: `site.ts` (salida rápida, aviso sin conexión, service worker), `calculadora.ts`, `plazos.ts`, `equipo.ts`, y en revisión `revision.ts` y `pruebas.ts`.
- **Cabeceras.** `scripts/post-build.mjs` escribe `_headers` (CSP estricta, sin `unsafe-inline`; `X-Robots-Tag` solo en revisión). Cloudflare las aplica a los archivos estáticos sin ejecutar el Worker, así no se consume la cuota gratuita de 100,000 solicitudes diarias. `src/worker.ts` solo sirve de red de seguridad.
- **Una sola fuente de datos.** `src/data/valores-2026.json` (cifras) y `src/data/claims-register.json` (afirmaciones). La calculadora y las páginas leen de ahí. Las pruebas fallan si una página escribe una cifra en pesos a mano, cita una afirmación desconocida o deja una afirmación sin página.
- **Calculadora.** `src/lib/calc.ts` son funciones puras. `tests/vectors.json` alimenta tanto Vitest como `/revision/pruebas`, así no se separan.
- **Sin conexión.** `public/sw.js` precarga `precache.json` (generado en el build, con versión por hash).
- **Privacidad.** Sin cookies, sin almacenamiento, sin solicitudes a terceros, `observability` apagado.
