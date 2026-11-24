# Diseño: sección de opiniones de empleados («tipo Glassdoor»)

Fecha: 2026-11-23. Estado: **fase 0 publicada en la versión de revisión; fase 1 espera decisión**.

## 1. Qué se pidió y qué restricciones del proyecto aplican

Se pidió una sección que funcione como Glassdoor, usando datos o una API de una empresa que ya exista, sin inventar la herramienta.

Restricciones que no se negocian en este proyecto:
- **Cero costo por uso.** Nada de APIs de pago ni de servicios medidos. Antes de añadir algo que pueda costar, se pregunta.
- **Cero solicitudes de terceros desde el navegador de quien visita.** CSP `connect-src 'self'`, sin cookies, sin analítica, sin incrustaciones.
- **Cero invención de cifras.** Cada dato lleva fuente, fecha, herramienta y etiqueta.
- **Sin cuentas ni claves creadas por el asistente.** Abrir una cuenta o guardar una clave exige una decisión tuya.
- **Sin saltarse bloqueos.** Si una página pide verificación contra robots, no se evade.
- **Sin inventar la herramienta:** no se construye un sistema propio para recoger reseñas.

## 2. Hallazgos (leídos el 2026-11-23)

| Hecho | Fuente | Etiqueta |
|---|---|---|
| Glassdoor **no tiene API pública**: la API de socios devuelve HTTP 410 desde agosto de 2025 y nunca hubo clave de uso libre | JobsPipe (probado el 30-sep-2026) | verificado-secundaria |
| Glassdoor cerró el acceso público a su API en 2021; solo la tienen empleadores con acceso | Zuplo (dev.to) | verificado-secundaria |
| Glassdoor **no ofrece un widget** para incrustar reseñas de otras empresas | No se encontró ninguno en las seis páginas leídas | sin-verificar |
| **Glassdoor e Indeed bloquean la lectura automática**: «Just a moment…» y «Additional Verification Required» | Chrome, 23-nov-2026 | verificado-primaria |
| **JobsPipe no recoge Glassdoor**; ofrece ofertas de otras bolsas, sin reseñas ni calificaciones | JobsPipe | verificado-secundaria |

## 3. Opciones de datos (los proveedores de la lista)

| Proveedor | Qué da | Nivel gratuito | Precio de pago | Observaciones |
|---|---|---|---|---|
| [OpenWeb Ninja, Real-Time Glassdoor Data](https://www.openwebninja.com/api/real-time-glassdoor-data) | Búsqueda de empresa (calificación, número de reseñas y de salarios, calificaciones por categoría, aprobación del director, % que recomienda), reseñas, entrevistas, salarios, ofertas | 100 solicitudes al mes, límite duro, sin tarjeta | 25 dólares al mes (Pro) y más | Cabe en el nivel gratuito para unas diez empresas |
| [SearchAPI](https://www.searchapi.io/glassdoor-api) | Reseñas de una empresa por su id de Glassdoor (pros, contras, calificaciones, puesto, respuesta del empleador), con filtros | 100 solicitudes gratuitas, sin tarjeta | 4 dólares por mil búsquedas; 40 dólares al mes | Ofrece una «garantía de protección legal» para el proveedor, no para quien publica |
| [Bright Data](https://brightdata.com/products/web-scraper/glassdoor) | Conjuntos de datos de empresas, reseñas y ofertas | 5,000 registros al mes gratis, sin tarjeta | 1.5 dólares por mil registros; 499 al mes | Pide cuenta y verificación; el más completo y el más pesado |
| [ScrapingBee](https://www.scrapingbee.com/scrapers/glassdoor-jobs-api/) | Ofertas, rangos de sueldo y reseñas, leyendo páginas de Glassdoor | Créditos de prueba limitados | 49 dólares al mes (Freelance) y más | Es un raspador genérico: hay que escribir el análisis |
| [JobsPipe](https://jobspipe.dev/sources/glassdoor) | Ofertas de 30 o más bolsas | Clave gratuita (1,000 ofertas) | n. d. | **No recoge Glassdoor**: no sirve para reseñas |

Lectura: los cuatro primeros leen páginas de Glassdoor y las venden en formato estructurado. Ninguno es Glassdoor.

## 4. Arquitecturas consideradas

| # | Opción | Costo | Privacidad | Riesgo legal | Veredicto |
|---|---|---|---|---|---|
| A | El navegador de quien visita llama a la API | Por uso | Rompe CSP y expone la clave | Alto | **Rechazada** |
| B | Un Worker llama a la API en cada visita | Por uso | Clave secreta en el Worker | Alto | **Rechazada** (costo por uso) |
| C | Incrustar widget o iframe de Glassdoor | Cero | Rompe CSP y rastrea | n. a. | **Imposible**: no existe widget |
| D | Raspador propio | Cero | Cero | Alto; además lo bloquean | **Rechazada** (es inventar la herramienta) |
| E | Recoger reseñas propias de las personas | Cero | Complejo | Alto | **Rechazada** (se pidió no inventar) |
| F | **Instantánea al construir el sitio** con un nivel gratuito, solo agregados | Cero si cabe en el nivel gratuito | Cero | Medio; requiere dictamen | **Recomendada para la fase 1** |
| G | **Enlaces y cifras vistas, atribuidas** | Cero | Cero | Bajo | **Fase 0, ya publicada** |

## 5. Diseño recomendado

```
Fase 0 (publicada)                    Fase 1 (necesita tu decisión)
-------------------------------       ------------------------------------------
resultados de búsqueda + lectura      script local `refresh-opiniones` (tú lo corres)
directa de listados                      lee OPENWEBNINJA_API_KEY de tu entorno
        |                                        |
        v                                        v
src/data/opiniones-empleados.json  <----  mismo archivo, con via="proveedor"
        |
        v
/empleos/opiniones/  (HTML estático; sin JavaScript de terceros)
```

- **Dónde corre la consulta:** en tu computadora, a mano, una vez al mes; nunca en el navegador de quien visita ni en el Worker. Por eso no hay costo por visita ni solicitudes de terceros.
- **Qué se guarda:** calificación, escala, número de reseñas, fecha, enlace, plataforma, cómo se obtuvo. **Nunca texto de reseñas.**
- **Qué se muestra:** una tabla por empleador con calificación, número de reseñas, fecha, etiqueta de verificación y un enlace «Ver reseñas». Se avisa cuando hay pocas reseñas (menos de 100). No se ordena a los bancos por calificación.
- **Reglas de datos:** cada fila con fuente https, fecha de lectura, herramienta y etiqueta; una calificación sin número de reseñas no se muestra; un conflicto entre fuentes se muestra, no se escoge.
- **Pruebas:** `tests/opiniones.test.ts` revisa forma de los datos, rangos y que no existan campos de texto de reseñas.

### Fase 1, lo que haría falta
1. Que **tú** abras la cuenta del proveedor (recomiendo OpenWeb Ninja por su nivel gratuito y su respuesta con calificaciones agregadas) y guardes la clave como variable de entorno. El asistente no abre cuentas ni guarda claves.
2. Que la persona que dictamina temas de prensa y propiedad intelectual **dé su visto bueno**: los términos de servicio de Glassdoor no se leyeron y el proveedor asume su riesgo, no el de quien publica.
3. Un script `scripts/refresh-opiniones.mjs` (aún no escrito) con tope de solicitudes por corrida, para no pasar de las 100 del mes.

## 6. Qué cambia si crece
- Si se quiere comparar sueldos por puesto: el proveedor da un conteo de salarios, pero publicar rangos por puesto sí es republicar datos de Glassdoor. Se necesitaría otro dictamen. Los sueldos ofrecidos en ofertas ya están en Transparencia.
- Si el nivel gratuito se agota o cambia: bajar la frecuencia o quitar empleadores.
- Si Glassdoor reabre una API oficial: sustituiría al proveedor y bajaría el riesgo legal.
- Si alguna vez se quiere que las personas opinen aquí: es un proyecto distinto, con moderación y responsabilidad por lo publicado; no se ha diseñado.

## 7. Decisiones que quedan abiertas
1. ¿Se pasa a la fase 1 (instantánea con un proveedor)? Requiere cuenta, clave y visto bueno legal.
2. ¿Se quiere solo Glassdoor o también Indeed y Computrabajo? Ninguno tiene API pública; Indeed bloquea igual.
3. ¿Se muestran estas cifras en producción o solo en la versión de revisión mientras se dictamina?

## 8. Términos de servicio leídos (2026-11-23)

Se leyeron los términos de Glassdoor (en la copia del Internet Archive del 16-nov-2026, porque la página oficial dio 403 a la lectura automática), de Indeed y de los cuatro proveedores. Los puntos, con su enlace, están en `src/data/opiniones-empleados.json` (clave `terms`).

| Quién | Qué dice | Consecuencia para este sitio |
|---|---|---|
| **Glassdoor** (Indeed, Inc.) | Prohíbe raspar o minar datos sin permiso por escrito; copiar su contenido sin permiso; enlazar de forma profunda sin permiso salvo que ofrezca API o incrustación. La licencia de las reseñas es de Glassdoor | Ningún proveedor de raspado le da permiso a quien publica. **Mostrar calificaciones y enlazar a páginas de empresa tiene un riesgo que debe dictaminar la persona de prensa y propiedad intelectual** |
| **Indeed** | El contenido es para uso personal y no comercial de quien busca empleo | Un sitio que publica sus cifras no es «uso personal» |
| **OpenWeb Ninja** | Permite usar y redistribuir los datos en productos propios; la persona usuaria responde por los términos de la fuente original | La más permisiva; el riesgo frente a Glassdoor queda en quien publica |
| **SearchAPI** | Datos de páginas públicas; solo se usan con licencia o si la ley lo permite; prohíbe revender | Igual: riesgo en quien publica |
| **ScrapingBee** | Solo uso profesional; el uso personal está «estrictamente» prohibido; prohíbe incumplir términos de otros sitios | **Descartada** para personas trabajadoras que lo usen por su cuenta |
| **Bright Data** | Licencia solo para operaciones internas de negocio; sin sublicencia | **Descartada** (además no admite llamadas desde el navegador) |

### Modelo «cada persona trae su propia cuenta» (BYOK)
Se probó con una consulta previa de CORS si el navegador puede llamar directo al proveedor (sin enviar claves): **OpenWeb Ninja, SearchAPI y ScrapingBee sí; Bright Data no.**

Lo que implicaría para este sitio:
- **Un cambio en la promesa de privacidad.** Hoy ninguna página hace solicitudes a terceros. Con BYOK, una página sí las haría, solo tras una acción explícita, con una excepción de CSP para un solo dominio y solo en esa ruta.
- **La clave de la persona** se escribiría en la página y viviría solo en memoria; nunca se guardaría. Hoy el sitio se compromete a no pedir contraseñas ni claves.
- **La persona quedaría identificada ante el proveedor** (correo y, si pasa del nivel gratuito, tarjeta) y sus consultas sobre un empleador serían visibles para él. Es un riesgo para quien teme represalias.
- **Los términos del proveedor** obligan a la persona, no al sitio: ScrapingBee y Bright Data no sirven para uso personal; OpenWeb Ninja y SearchAPI son compatibles en el papel.
- **No se puede probar en vivo sin una clave.** Se probaría con respuestas de ejemplo; las pruebas reales quedarían como UNTESTED hasta que alguien con clave las corra.

Alternativa más segura con la misma idea: **instantánea mensual hecha por ti** (sección 5), que no pide nada a quienes visitan.

### Sobre «saltarse» los bloqueos de Glassdoor e Indeed
No se saltan. Evadir una verificación contra robots está fuera de lo que este asistente hace, y además chocaría con los términos de Glassdoor leídos arriba. Lo que sí es posible: abrir la página en tu propio navegador, pasar la verificación tú, y decirme las cifras o dejarme leer la página ya cargada en tu sesión.

## 9. Decisiones abiertas (actualizado)
1. ¿Se mantienen las calificaciones de Glassdoor e Indeed en la página mientras se dictamina, o se dejan solo los enlaces?
2. ¿Los enlaces a Glassdoor se dejan profundos (página de la empresa) o se apuntan a su portada, dado lo que dicen sus términos?
3. ¿Se construye la opción BYOK (con las implicaciones de privacidad de arriba) o se prefiere la instantánea mensual?
4. ¿Se hace de una vez la lectura manual de las cifras en tu navegador para sustituir las de resultados de búsqueda?

## 10. Decisiones tomadas
- **2026-11-23, dueño del proyecto:** se mantienen las calificaciones de Glassdoor e Indeed en `/empleos/opiniones/` mientras se dictamina. La pregunta de la afirmación T18 sigue abierta para la persona de prensa y propiedad intelectual: si basta con mostrar calificaciones agregadas atribuidas y fechadas y enlazar a las páginas de empresa, o si hay que dejar solo enlaces o apuntar a la portada de Glassdoor.
- Sin cambios de código con esta decisión. Siguen sin resolver los puntos 2 a 4 de la sección 9.
