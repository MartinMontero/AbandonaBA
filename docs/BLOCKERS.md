# BLOQUEOS y pendientes

| Tema | Estado | Causa raíz / qué falta |
|---|---|---|
| **Exención de ISR (C08)** | Resuelto con fuente primaria | Transitorio Tercero del decreto del DOF 27-01-2016 (leído) reconduce «salario mínimo» a UMA. Falta que el abogado confirme la aplicación y el criterio del SAT. |
| Artículos transitorios de la reforma de 40 horas (C09) | Abierto | El texto consolidado no los trae; falta leer el decreto del DOF 01-05-2026. |
| Primarias aún no leídas: CDMX Seguro de Desempleo (el sitio oficial no respondió), INFONAVIT (403 a robots) | Abierto | Leídas en la tercera ronda: INEGI (UMA), DOF 2016 (desindexación), Ley de la UMA y DOF 18-11-2026 (FINABIEN). Ver VERIFICATION.md. |
| Noticias de `/situacion` | Abierto | Solo se comprobó que los enlaces cargan; el texto no se releyó. Los enlaces de Instagram y deprecated.now no se usaron. |
| Teléfonos y direcciones del directorio (F08) | No hecho | No se leyeron en los sitios oficiales; se omitieron según la regla. Faltan tribunales laborales federales y CONDUSEF (su sitio no respondió). |
| Enlaces que fallaron la revisión | Esperan tu aprobación o revisión a mano | Indeed México, OCC Mundial, Coppel (403 a robots) y CONDUSEF (sin respuesta). Se quitaron de los listados. |
| F10: empleadores | Parcial | Solo sitios principales, sin enlaces de «trabaja con nosotros» ni vacantes salvo BBVA (C22, no re-verificada). Faltan empleadores de la lista (Banco del Bienestar, BanBajío, Mifel, Bancrea, Spin, Ualá, Openbank, Hey Banco, Plata, Kapital, Fondeadora, Konfío, Ria, MoneyGram, Viamericas, OXXO, Telcel, Konecta, Atento), bolsas (Bumeran, Glassdoor, Workana) y capacitación (Bécate, CECATI, ICAT): no se comprobaron. |
| F13: aliados de cooperativas | No hecho | CEREAL, CILAS, ProDESC, SINACTRAHO, Confederación Nacional Cooperativa no se comprobaron. |
| F14: lecciones | Parcial | Las 10 lecciones están en una sola página (el prompt pedía una por página) y no hay tabla `herramientas-ia.json`: no se verificó ninguna herramienta gratuita. Fuente Atkinson no incluida: se usan fuentes del sistema. |
| F02: guía de preguntas | Parcial | Es texto, no un asistente interactivo. |
| Cloudflare Access | Sin probar; requiere método de pago en la cuenta | Ver AUDIT.md y REVIEW-DEPLOY.md. |
| CI de GitHub | Sin ejecutar | Los workflows están escritos y no se han corrido. El runner de e2e usa PowerShell y `taskkill`: solo Windows (`windows-latest`). |
| Aviso «Última revisión legal» | Pendiente | `legalReview.status = "pendiente"` hasta que firme un abogado. |
| Cambio deliberado al prompt | Informado | Cabeceras vía `_headers` en vez de que el Worker las ponga; razones en AUDIT.md. |
| C26 | Añadida | El prompt tenía C01–C25; se añadió C26 (bases fiscales de negocio) para no dejar cifras sin afirmación. |
