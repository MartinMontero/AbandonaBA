# Abandona Banco Azteca

Sitio gratuito, anónimo y sin cuentas con calculadoras, guías prácticas y herramientas de verificación para personas que trabajan en un banco en México —cómo salir en las mejores condiciones legales y qué hacer después— y para clientes que evalúan cambiar de institución. Primero en español, con resumen en inglés (`/en/`).

> **Estado:** borrador pendiente de revisión formal (`legalReview`, `financialReview` y `editorialReview` en estado `pendiente` dentro de `src/data/site.config.ts`). **No es asesoría legal ni financiera.** No está afiliado a Banco Azteca ni a Grupo Salinas.

---

## Por qué existe este proyecto

Cuando una persona trabajadora enfrenta presiones para renunciar o firmar un convenio rápido, suele estar en desventaja de información: no sabe cuánto le corresponde por ley, qué plazos legales corren en su contra ni cómo documentar lo ocurrido sin ponerse en riesgo.

Este sitio reúne en un solo lugar, sin registro ni rastreo:
1. **Cálculos transparentes en tu propio aparato** para saber cuánto corresponde antes de firmar cualquier documento.
2. **Rutas accionables paso a paso** (qué no firmar, cómo reunir evidencia, dónde pedir asesoría gratuita y qué plazos legales existen).
3. **Búsqueda directa en la Ley Federal del Trabajo (LFT)** sin redactar consejos inventados: muestra los artículos oficiales completos.
4. **Opciones reales después de salir** (comparador de empleos en bancos/fintech, emprender, cooperativas, ahorro puente) y herramientas para **clientes que quieren cambiar de banco**.
5. **Transparencia documental** sobre cifras públicas, sueldos, utilidades, impuestos y estructura corporativa, separando hechos verificados en fuentes primarias de notas de prensa o puntos aún sin verificar.

---

## Qué hace la herramienta (por secciones)

### 1. Salida laboral y defensa de derechos
- **Calculadora de liquidación y finiquito (`/calculadora/`, `src/lib/calc.ts`):** estima paso a paso los conceptos aplicables con valores vigentes de 2026 (`src/data/valores-2026.json`), expone las cinco decisiones de cálculo abiertas (`D1`–`D5`) y genera un resumen imprimible para llevar a PROFEDET.
- **Calculadora de plazos (`/plazos/`, `src/lib/deadlines.ts`, `src/lib/ics.ts`):** calcula fechas límite legales (prescripción, conciliación) y permite descargar recordatorios en formato `.ics`.
- **Guías prácticas:**
  - `/no-firmes/` — qué revisar y qué no firmar bajo presión (renuncias en blanco, convenios sin ratificar).
  - `/evidencia/` — cómo documentar hechos y conservar comprobantes (CFDI, horarios, comunicaciones).
  - `/salidas/` y `/checklist-salida/` — comparación de rutas de salida y lista de verificación.
  - `/ayuda-gratis/` — directorio de instancias gratuitas (PROFEDET, Centros de Conciliación).
  - `/situacion/` y `/glosario/` — contexto de los hechos recientes y glosario laboral/financiero en lenguaje claro.

### 2. Consulta la LFT con IA y guía interactiva (`/consulta-lft/`)
- **Búsqueda híbrida en la Ley Federal del Trabajo (`/api/lft/*`, `src/lib/lftProxy.ts`, `src/lib/lft/normalize.ts`):** combina embeddings con Cloudflare Workers AI (`@cf/baai/bge-m3`), búsqueda vectorial en Vectorize y búsqueda en D1 para localizar los artículos oficiales de la LFT más relevantes para una pregunta en lenguaje cotidiano.
- **Sin respuestas inventadas:** la IA solo recupera y ordena artículos; el sitio muestra el texto oficial completo, su fecha de reforma, aviso si está derogado y enlace al PDF oficial de la Cámara de Diputados.
- **Guía de campo interactiva de 5 capítulos (`src/components/FieldGuideLft.astro`):** explica cómo funciona la búsqueda (*Panorama*, *Simulador* paso a paso, *Candados* contra alucinaciones, *Protocolo* de cláusulas y *Conexión* técnica).

### 3. Qué sigue después: empleo, negocio y transición
- **Empleos (`/empleos/`, `src/lib/matcher.ts`) y opiniones (`/empleos/opiniones/`):** herramienta para comparar puestos en bancos y fintech en México según lo que haces hoy, junto con datos agregados de opiniones de empleados.
- **Emprender y transición:** `/emprender/`, `/negocio/`, `/cooperativa/`, `/trabajo/`, `/puente/` (dinero puente) e `/inteligencia-aumentada/` (herramientas de IA para el trabajo diario).
- **Equipo (`/equipo/`):** guía práctica para organizarse con compañeras y compañeros.

### 4. Para clientes: Cámbiate de banco (`/cambiate/`)
Guías y calculadoras para mover finanzas personales sin tropiezos:
- `/cambiate/que-me-conviene/` — orientador según necesidades.
- `/cambiate/cuanto-me-cuesta/` — comparación de costos y comisiones.
- `/cambiate/ahorro/` (`src/lib/savings.ts`), `/cambiate/afore/` (`src/lib/afore.ts`), `/cambiate/remesas/` (`src/lib/remesas.ts`).
- `/cambiate/nomina/`, `/cambiate/credito/`, `/cambiate/buro/`, `/cambiate/cerrar-cuenta/`, `/cambiate/fuentes/`, `/cambiate/metodo/`.

### 5. Transparencia documental (`/transparencia/`)
Análisis basado en reportes financieros, documentos públicos y fuentes citadas:
- `/transparencia/dinero/`, `/transparencia/utilidades/`, `/transparencia/sueldos/`
- `/transparencia/equivalencias/` (`src/lib/equivalencias.ts`, `src/lib/udi.ts`)
- `/transparencia/impuestos/`, `/transparencia/directivos/`, `/transparencia/quien-es-quien/`
- `/transparencia/linea-de-tiempo/`, `/transparencia/mapa/` (`src/lib/mapa.ts`)
- `/transparencia/como-verificarlo/` y `/transparencia/metodo/`

### 6. Reportes ciudadanos, seguridad y accesibilidad (`/acerca/`, `/actualizaciones/`)
- **Formulario ciudadano de errores (`/acerca/#errores`, `POST /api/reporte`, `src/lib/issueReport.ts`):** permite a cualquier persona reportar datos erróneos, fallos visuales o sugerencias en español simple sin crear cuenta ni entrar a GitHub; el Worker valida los campos, aplica límite de tasa y abre el issue en GitHub del lado del servidor.
- **Salida rápida y protección:** botón de salida rápida (o tecla `Esc` dos veces) que redirige fuera del sitio al instante, y aviso permanente para no entrar desde equipos o Wi-Fi del banco.
- **Control de calidad:** pruebas de accesibilidad (`@axe-core/playwright`), contraste, navegación por teclado y diseño móvil desde `360 px`.

---

## Arquitectura, privacidad y funcionamiento sin conexión

- **Stack:** Sitio estático en **Astro 7** + **Cloudflare Worker** mínimo (`src/worker.ts`) con bindings `ASSETS`, `AI`, `LFT_DB` (D1), `LFT_VEC` (Vectorize), `LEGAL_RAG_CACHE` (KV) y `LFT_RATE_LIMITER`.
- **Seguridad y privacidad:** CSP estricta (`default-src 'self'; script-src 'self'; connect-src 'self'`), `Referrer-Policy: no-referrer`, cero cookies, cero analítica y cero peticiones a terceros. Cloudflare, como proveedor de red, puede ver metadatos de conexión como la IP.
- **Sin conexión tras la primera visita:** el *service worker* (`public/sw.js`) precarga en `precache.json` todas las rutas estáticas, CSS, scripts e íconos, por lo que calculadoras y guías funcionan sin internet después de abrir el sitio una vez.
- **Dos excepciones que requieren internet** (excluidas de la caché `/api/*` en `public/sw.js`):
  1. **Consulta la LFT (`/api/lft/*`):** procesada en Cloudflare sin guardar la pregunta, la respuesta ni tu IP.
  2. **Enviar un reporte (`/api/reporte`):** crea el issue en GitHub desde el Worker.

---

## Trazabilidad legal y versión de revisión

- Cada cifra legal vive en `src/data/valores-2026.json` y cada afirmación verificable en `src/data/claims-register.json`, con una de tres etiquetas:
  - `verificado-primaria`: leído directamente en fuente oficial (LFT, DOF, INEGI, Banxico, reportes corporativos, etc.).
  - `verificado-secundaria`: visto solo en prensa o sitios de terceros.
  - `sin-verificar`: pendiente de comprobación.
- `src/data/site.config.ts` impide compilar si `legalReview`, `financialReview` o `editorialReview` se marcan como `'firmada'` sin nombres de revisores y fecha.
- **Versión de revisión (`REVIEW_MODE=1`):** genera una compilación separada (`dist-review`) con banner de borrador y mesa de revisión para abogados/revisores (`npm run build:review`).

---

## Correr, probar y desplegar (Windows, PowerShell)

Requisitos: **Node.js `>= 22.23.4`** y Chromium de Playwright para pruebas e2e (`npx playwright install chromium`).

```powershell
npm ci
npm run build          # compilación de producción -> dist
npm run build:review   # compilación de revisión   -> dist-review
npm run preview        # Worker local con wrangler dev (puerto 8787)
npm test               # pruebas unitarias (Vitest)
npm run verify         # build + registro legal + unitarias + Playwright e2e/a11y + dry-run
npm run verify:review  # verificación completa para la versión de revisión
npm run link-check     # verificación de enlaces internos y externos
```

### Despliegue en Cloudflare
```powershell
npx wrangler login
npx wrangler deploy --env=""
```

Para habilitar el formulario ciudadano de reportes (`POST /api/reporte`) en producción, configura el secreto `GITHUB_ISSUE_TOKEN` en el Worker con un **token fine-grained** limitado exclusivamente a **Issues (Read & Write)** sobre este repositorio:
```powershell
npx wrangler secret put GITHUB_ISSUE_TOKEN
```

---

## Documentación interna (`docs/`)

`docs/ARCHITECTURE.md`, `docs/AUDIT.md`, `docs/VERIFICATION.md`, `docs/DISCREPANCIES.md`, `docs/BLOCKERS.md`, `docs/HUMAN-CHECKS.md`, `docs/ATTORNEY-WALKTHROUGH.md`, `docs/DESIGN-SYSTEM.md`, `docs/SHIP.md`, `docs/REVIEW-DEPLOY.md`, `docs/LEGAL-REGISTER.md`, `docs/UPDATE-CALENDAR.md`.

Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de modificar cifras legales o afirmaciones verificadas.

Licencias: código **MIT**; textos **CC BY-SA 4.0**.
