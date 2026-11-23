# Sistema de diseño (auditoría, componentes y patrones)

Base: *The Design Field Manual (Apple HIG vs Google Material Design)*. Regla del manual: capa de tokens de Material con la contención de Apple. Piso de accesibilidad: WCAG 2.2 AA.

## 1. Auditoría de la versión anterior (2026-11-23)
| Hallazgo | Evidencia | Decisión |
|---|---|---|
| Sin jerarquía: todo era texto corrido en una sola columna | Portada con tres párrafos y una lista de botones iguales | Portada con héroe, mosaicos, pasos y cifras |
| Una sola «voz» visual: botones, cajas y avisos casi idénticos | Mismos bordes y fondos para todo | Niveles: relleno, tonal, texto; avisos con color semántico |
| Tablas crudas, incómodas en teléfono | Tablas con desplazamiento horizontal | Tablas que se vuelven tarjetas apiladas en <720 px |
| Calculadora como formulario largo y tabla | Resultado en una tabla de cinco columnas | Formulario por pasos y tarjetas de resultado con cifras grandes |
| Sin identidad de marca | Paleta gris azulada apagada, sin ilustración | Paleta viva generada de una semilla, ilustración propia, marca con escudo |
| Navegación poco clara | Cinco destinos sin contexto | Barra inferior y riel con estado actual; mosaicos por situación |
| Cumplimiento | Tokens ya usados, pero sin escala tipográfica ni movimiento | Escala tipográfica, movimiento y modo oscuro completos |

## 2. Tokens
| Categoría | Tokens | Origen |
|---|---|---|
| Color | `--md-sys-color-*` (primary, secondary, tertiary, error, surface y niveles `surface-container-*`, outline, inverse-*, y personalizados ok, warn, accent) | `scripts/gen-tokens.mjs` con Material Color Utilities, semilla `#2f4fd6`, esquema Vibrant, claro y oscuro |
| Espacio | `--space-half` a `--space-7` (cuadrícula de 8 px, en `rem`) | `src/styles/global.css` |
| Forma | `--radius-sm`, `-md`, `-lg`, `-xl`, `-full` | ídem |
| Tipografía | `--font` (pila del sistema), `--type-body`, `-small`, `-label`, `-title`, `-headline`, `-display` (fluidas con `clamp`) | ídem |
| Elevación | `--elev-1` a `--elev-3` | ídem |
| Movimiento | `--motion-duration-short/medium`, `--motion-easing-standard/emphasized` | ídem, con `prefers-reduced-motion` |
Regla: ningún componente usa colores literales; solo tokens. Los únicos literales son los del archivo de tokens y blanco y negro de la hoja de impresión.

## 3. Componentes
| Componente | Variantes | Estados | Accesibilidad |
|---|---|---|---|
| Botón `.btn` | relleno (principal), `.tonal`, `.text`, `.lg` | reposo, hover (elevación), activo, foco visible, deshabilitado | objetivo de 48 px; un principal por vista |
| Mosaico `.tile` | normal, `.urgent` (error), `.accent` | reposo, hover (sube y cambia de fondo), foco | enlace completo con título y descripción; ícono decorativo `aria-hidden` |
| Pasos `.steps` | lista numerada | — | `ol` real |
| Cifra `.stat` | — | — | texto con fuente legal |
| Aviso `.callout` | `info`, `ok`, normal (alerta) | — | ícono con texto, no solo color |
| Etiqueta `.tag` | `t-verificado-primaria`, `-secundaria`, `t-sin-verificar` | — | texto + borde + color |
| Tabla responsiva `.rt` | tabla / tarjetas apiladas | — | rótulos por celda con `data-label` |
| Campo, selector, interruptor | `input`, `select`, `role="switch"` | foco con anillo y halo | etiqueta visible, 52 px de alto |
| Barra superior | con sombra al desplazarse | — | salida rápida siempre visible |
| Navegación | barra inferior (<600 px), riel (≥600 px) | `aria-current="page"` | `nav` con nombre; sin cajones |
| Tarjeta de resultado `.exit-card` | normal, `.featured` | hover | cifras en `strong` con id |
| Línea de tiempo `.deadline` | — | — | `ol` |
| Avisos no bloqueantes `.snackbar` | — | entra y sale solo | `role="status"` |

## 4. Patrones
- **Portada:** héroe con propuesta, dos acciones, tres garantías y una ilustración; luego «¿Qué necesitas hoy?» por situación, ruta en tres pasos, cifras de la ley, «Después de salir», hechos y confianza.
- **Página de contenido:** encabezado con etiqueta de categoría, título, entrada y nota de revisión; columna de lectura centrada; tabla de contenido lateral en pantallas anchas con la sección activa marcada.
- **Herramientas** (calculadora, plazos, banco de empleo): formulario o filtros arriba; resultados como tarjetas; todo se calcula en el aparato.
- **Entrada animada:** secciones que aparecen al desplazarse, desactivada con `prefers-reduced-motion`.

## 5. Pendiente
- Rediseñar una por una las páginas de contenido restantes con los nuevos componentes (hoy heredan estilos y navegación).
- Componentes de Material Web no se usaron: se escribieron primitivas propias para cuidar el peso (≤ 60 KB de JavaScript).
- Revisión visual en un Android real y con lector de pantalla.
