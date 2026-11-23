# Lo que necesita que una persona abra la página (2026-11-22)

Se intentó con `curl`, `pdftotext` y Chromium sin interfaz. Estos no se pudieron leer. Cuando alguien los abra en un navegador normal, copie lo que dice (o una captura) y se registra con su fuente y fecha.

| Qué falta | Enlace | Por qué no se pudo | Qué hay que anotar |
|---|---|---|---|
| Seguro de Desempleo CDMX: monto, requisitos, fechas de registro (C13) | https://www.segurodedesempleo.cdmx.gob.mx/padron/AVISO_SEGUNDA_CONVOCATORIA_2026.pdf y https://tramites.cdmx.gob.mx/desempleo/ | Tiempo agotado a nivel de red desde esta máquina (curl y Chromium) | Monto mensual, meses, edad, residencia, antigüedad con patrón de la CDMX, próxima fecha |
| INFONAVIT: prórroga, 0% de interés, Fondo de Protección de Pagos (C14) | https://www.infonavit.org.mx | Cortafuegos «Access Denied» incluso con navegador real; no se intentó evadirlo | Reglas vigentes para quien pierde el empleo |
| CONSAR: regla vigente del retiro por desempleo, tope en UMA o salario mínimo (C11) | https://www.gob.mx/consar | La página carga pero entrega texto vacío al navegador sin interfaz | Monto máximo de la modalidad A y requisitos |
| PROFEDET: servicio gratuito, teléfonos y sedes (F08) | https://www.gob.mx/profedet | Texto vacío al navegador sin interfaz | Cómo pedir cita, teléfonos, direcciones |
| CFCRL: cómo se pide la conciliación, teléfonos (F08) | https://www.gob.mx/cfcrl | Solo se comprobó el título de la página | Pasos, modalidades en línea y presencial, contacto |
| STPS: quejas NOM-035 y «Ley Silla» (F08) | https://www.gob.mx/stps | No se leyó | Cómo presentar la queja |
| INAES: trámite SEPCOOP, requisitos y documentos (C16) | https://www.gob.mx/inaes/acciones-y-programas/padron-nacional-de-sociedades-cooperativas | No se leyó | Documentos que piden |
| CONDUSEF: lista de SOCAP supervisadas (F13) | https://www.condusef.gob.mx | Carga solo con un navegador; la lista no se revisó | Dónde se consulta la lista |
| SAT: cita presencial de la SAS y tope vigente 2026 (C26) | https://www.sat.gob.mx/ | Es una aplicación con scripts; no se encontró la regla | Regla que habla de la cita y el tope 2026 |
| IMSS: amparos contra el acuerdo de Modalidad 40 (C12) | https://www.imss.gob.mx/ | No hay fuente oficial; solo prensa | Si hay suspensiones vigentes |
| Festival de las Ideas, «¡No me dejen solo!» (6 de nov.) | https://www.instagram.com/jcfrias/reel/Df9r0q1Bncc/ y https://www.instagram.com/reel/DfjJnBbRPvc/ | Requieren sesión | Qué dice el video y quién lo publica |
| Indeed México | https://mx.indeed.com | 403 a robots | Que cargue y siga activo |
| OCC Mundial | https://www.occ.com.mx | 403 a robots | Que cargue y siga activo |
| Coppel | https://www.coppel.com | 403 a robots | Que cargue y siga activo |
| Vacantes de Banorte | https://www.banorte.com | Error de protocolo HTTP/2 en el sitio, con curl y con Chromium; sin bolsa propia encontrada | Enlace de «Trabaja con nosotros» y si hay cajero/ejecutivo |
| Vacantes de Santander México | https://www.santander.com.mx | 403 a automatización | Enlace de empleo y vacantes de caja o ejecutivo |
| Vacantes de BanCoppel | https://www.bancoppel.com | 403 a automatización | Ídem |
| Vacantes de Mifel | https://www.mifel.com.mx | 403 a automatización | Ídem |
| Vacantes de Banjercito (el banco del Ejército) | https://www.banjercito.com.mx | Demasiadas redirecciones; la búsqueda solo trajo una ficha de Indeed sin vacantes | Si publica vacantes y dónde |
| Vacantes de Banregio | https://www.banregio.com | Carga sin texto | Enlace de empleo |
| Vacantes de Scotiabank | https://www.scotiabank.com/careers/es/carreras.html | La página carga pero no lista puestos; el buscador no se pudo consultar | Buscar «cajero», «ejecutivo» en México |
| Vacantes de Banamex / Citi | https://jobs.citi.com/ (desde https://www.banamex.com/conocenos/bolsa-de-trabajo) | El listado no se pudo leer | Filtrar México |
| Vacantes de HSBC México | https://www.hsbc.com.mx | No se encontró enlace de empleo en la página | Enlace de empleo |
| Vacantes de Inbursa | https://bolsadetrabajogfi.inbursa.com/ | No se intentó consultar el listado | Puestos de caja o ejecutivo |
| Vacantes de Banco del Bienestar y Hey Banco | https://www.bancodelbienestar.gob.mx y https://www.heybanco.com | Sin respuesta (tiempo agotado) | Enlace de empleo |
| Vacantes de Klar, Stori, Mercado Pago, Ualá, Openbank, Revolut, Fondeadora, Konfío, Kapital | https://www.klar.mx/bolsa-de-trabajo (Klar); el resto sin listado público consultable | Sin interfaz programática pública encontrada; Klar muestra una lista en su página | Puestos de atención, cobranza, riesgo |
| Convocatorias de bancos de desarrollo (Bancomext, Banobras, Nafin, SHF) | Portal del empleo del gobierno: https://www.empleo.gob.mx | No se consultaron | Si publican vacantes |
| Verificar a mano cualquier vacante de OCC, Computrabajo o Indeed de Banorte y Santander | https://www.occ.com.mx/empleos/bolsa-de-trabajo-banorte/ | Bloquea automatización; solo aparecen por buscador | Que sigan activas |
| Empleadores restantes de `src/data/empleadores.json` | Cada sitio de la lista | Solo se comprobó que carguen | Enlace de empleo de cada uno |
| Filtros de contratación del Grupo Salinas (C23) | Ofertas del Grupo (sin enlace fijo) | Son ofertas cambiantes | Capturas con fecha de «no adeudos» y «no haber laborado» |
| Estructura de empleo del banco (C24) | Recibo CFDI y constancia del IMSS de cada trabajador | Datos personales, no públicos | Qué patrón aparece |
| Horarios reales (C25) | Horarios de cada sucursal | Solo reportes | Documentos del trabajador |

## Preguntas que solo resuelve un abogado
Todas están en `docs/LEGAL-REGISTER.md` como «Pregunta para el abogado». Las nuevas de esta ronda: suspensión o interrupción del plazo por la conciliación (Arts. 518 y 521); criterio del SAT sobre la exención de ISR con UMA; efecto de un convenio no ratificado; efecto de la falta de aviso de despido (Art. 47); resto del Art. 5.
