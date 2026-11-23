# Diseño: cómo se aplicó «The Design Field Manual»

Fuente: `The Design Field Manual - Apple HIG vs Google Material Design.pdf` (13 páginas). Regla del manual: capa de tokens de Material con la contención de Apple.

| Directriz del manual | Qué se hizo | Dónde |
|---|---|---|
| Tokens `--md-sys-color-*` desde una sola semilla, con Material Color Utilities (HCT) | Semilla `#0b3d91`; `npm run tokens` genera el CSS | `scripts/gen-tokens.mjs`, `src/styles/tokens.css` |
| Sin colores literales en los componentes | Todos los componentes usan tokens. Los únicos literales son los del propio archivo de tokens y blanco y negro de la hoja de impresión | `src/styles/*.css` |
| Cuadrícula de 8 px en `rem`, radios, movimiento | `--space-*`, `--radius-*`, `--motion-*` | `src/styles/global.css` |
| Modo oscuro con `prefers-color-scheme` | Conjunto de tokens oscuro generado | `tokens.css` |
| Tipografía del sistema, escala en `rem` | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, system-ui` | `global.css` |
| WCAG 2.2 AA como piso; contraste 4.5:1 y 3:1; `:focus-visible`; foco no tapado por barras fijas | axe en 4 configuraciones sin violaciones serias o críticas; `scroll-padding` para la cabecera y la barra inferior | `tests/e2e` |
| Objetivos de 44 a 48 px | Botones, chips y barra de 48 px; prueba automática a 360 px | `tests/e2e/empleos.spec.ts` |
| Barra inferior en compacto (<600 px), riel desde 600 px, sin cajones; `<nav>` + `aria-current` | Cinco destinos: Inicio, Calcular, Plazos, Empleos, Ayuda | `Base.astro`, `global.css` |
| Tres niveles de botón, un primario por vista | Relleno, tonal y texto | `.btn`, `.btn.tonal`, `.btn.text` |
| Interruptor nativo `input type=checkbox role=switch` con etiqueta | «Solo con vacantes…» y «Ya la revisé» | `empleos.astro`, `empleos.css` |
| Avisos no bloqueantes como snackbar | «Copiado» y «Copiaste N enlaces» | `site.ts` |
| Respetar `prefers-reduced-motion` | Reducción global | `global.css` |
| Vidrio solo en barras, con color sólido de respaldo | No se usó vidrio: la contención pesa más que el efecto | — |
| HTML semántico primero | `nav`, `main`, `fieldset/legend`, `ol` de tarjetas | `empleos.astro` |

## Desviaciones y pendientes
- No se usaron los componentes de Material Web; se escribieron primitivas propias con tokens para no añadir JavaScript y cumplir el presupuesto de 60 KB.
- No se añadió `llms.txt` ni JSON-LD de Schema.org (el manual lo marca como opcional).
- Los íconos de la barra son SVG propios simples, no los de Material.
- Las páginas de contenido anteriores a esta ronda heredaron los tokens y la navegación nueva, pero no se rediseñaron una por una.
- El manual pide volver a verificar medidas exactas en el momento de construir; las cifras usadas (48 px, 8 px, 600 px) coinciden con lo que dice.
