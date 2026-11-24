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
| ~~Vacantes de Banorte~~ (resuelto el 22 nov con su Chrome) | https://empleos.banorte.com/ | Se abrió: áreas SUCURSALES, FUERZA DE VENTA, CENTRO DE CONTACTO, RIESGOS Y CRÉDITO | Falta mirar los puestos concretos |
| Vacantes de Santander México (enlace hallado, sin abrir) | https://www.santander.com.mx/personas/bolsa-de-trabajo.html | Se encontró el enlace en su página con su Chrome; no se abrió | Puestos de caja o ejecutivo |
| Vacantes de BanCoppel (enlace hallado, sin abrir) | https://fa-eqwz-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/es/sites/CX_3001 | Se encontró el enlace en su página con su Chrome | Puestos de caja o ejecutivo |
| Vacantes de Mifel | https://www.mifel.com.mx | Su página no muestra enlace de empleo (ni con su Chrome) | Enlace de empleo, si existe |
| Vacantes de Banjercito (el banco del Ejército) | https://www.banjercito.com.mx | Su sitio no carga ni con su Chrome (error de conexión) | Si publica vacantes y dónde |
| Vacantes de Banregio (enlace hallado, sin abrir) | https://www.banregio.com/conoce-mas/bolsa-trabajo.php | Se encontró el enlace en su página con su Chrome | Puestos de caja o ejecutivo |
| Vacantes de Scotiabank | https://www.scotiabank.com/careers/es/carreras.html | La página carga pero no lista puestos; el buscador no se pudo consultar | Buscar «cajero», «ejecutivo» en México |
| Vacantes de Banamex / Citi | https://jobs.citi.com/ (desde https://www.banamex.com/conocenos/bolsa-de-trabajo) | El listado no se pudo leer | Filtrar México |
| Vacantes de HSBC México | https://www.about.hsbc.com.mx/es-mx | Solo se halló la página «Acerca de HSBC»; falta el enlace de empleo | Enlace de empleo |
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

## Parte 2 (Cámbiate): lo que se bloqueó y necesita a una persona (2026-11-23)

| Pendiente | Enlace directo | Por qué se bloqueó |
|---|---|---|
| Inbursa: cuentas, tasas y aviso de protección | https://www.inbursa.com/sites/gfi/cuentas/basicas | La página se mostró vacía |
| BanCoppel: tasas vigentes de Inversión Creciente | https://www.bancoppel.com/descubre-mas/inversion-creciente/ | «Access Denied» al abrir el PDF de tasas; las tablas anexas son de 2022 |
| Klar: portabilidad de nómina; topes de «Fondos de Rendimientos» | https://www.klar.mx/soporte-faq | No la mencionan |
| Stori: portabilidad de nómina | https://www.storicard.com/preguntas-frecuentes | No la mencionan |
| bineo: portabilidad de nómina | https://www.bineo.com/cuenta-bineo | No la mencionan |
| Nu: ¿exige la app?, portabilidad y topes de Cajita Turbo | https://nubank.com.mx/cuenta/ | No lo dicen |
| Openbank: ¿exige la app? | https://www.openbank.mx/cuenta-basica-nomina/ | No lo dice |
| Mercado Pago: tipo de institución y protección de depósitos | https://www.mercadopago.com.mx/ | No lo dicen |
| Banamex: comisiones de la cuenta Switch | https://www.banamex.com/resources/pdf/es/ley_transparencia/comisiones/Anexo-de-Comisiones-Switch.pdf | PDF ilegible |
| Banorte: comisiones de otras cuentas | https://www.banorte.com/Personal/Cuentas/Cuenta-Enlace-Digital.html | No las publica la página |
| Scotiabank: protección de la cuenta de cheques | https://www.scotiabank.com.mx/personas/cuentas-bancarias/cuenta-scotia.aspx | El folleto solo nombra productos de inversión |
| Afore: rendimiento neto (IRN) por Afore y horizonte | https://www.consar.gob.mx/gobmx/aplicativo/siset/Series.aspx?cd=212&cdAlt=False | La tabla exige elegir «Detalle por Afores»; no se copió ninguna cifra |
| Afore: ¿el traspaso es gratuito? | https://www.consar.gob.mx/gobmx/aplicativo/catsar/Principal/TramiteExt.aspx?idTramite=9 | La página no lo dice |
| Buró: ley aplicable y tiempo que guarda una deuda | https://www.burodecredito.com.mx/personas-f%C3%ADsicas/productos/reporte-de-cr%C3%A9dito-especial/reclamaciones.html | No se leyó la ley |
| Cerrar cuenta: norma vigente que respalda el acuse y el documento de no adeudo | https://www.gob.mx/condusef/prensa/si-dejas-tu-cuenta-de-ahorro-en-ceros-no-significa-que-este-cancelada | La nota es de 2012 y no cita la norma completa |
| Cerrar cuenta en Banco Azteca: requisitos propios | https://www.bancoazteca.com.mx/ | No se encontraron en su página |
| CAT: circular que fija el método | https://www.banxico.org.mx/CAT/Explicaciones.html | Se leyó la calculadora, no la circular 21/2009 |
| Portabilidad de nómina: base legal y plazo | https://www.banxico.org.mx/marco-normativo/normativa-emitida-por-el-banco-de-mexico/ | No se leyó la circular ni la norma |
| Impuesto de EE. UU. a remesas (§4475) y si las comisiones entran en la base | https://www.law.cornell.edu/uscode/text/26/4475 | Solo se leyó una fuente secundaria; falta el IRS o el Federal Register |
| Wise y Remitly: cotizaciones con fecha | https://wise.com/mx/ y https://www.remitly.com/mx/es | Muestran el precio solo con datos de sesión |
| Ofertas que vencen el 2026-11-30 (Nu, Ualá): volver a leerlas | https://nubank.com.mx/cuenta/ | Vencen pronto |

## Parte 3 (Transparencia): lo que se bloqueó o falta y necesita a una persona (2026-11-23, segunda ronda)

Ronda de investigación profunda. Se leyeron completos los reportes y estados financieros del banco de 2021 a 3T 2026, el Reporte Anual 2025 de Grupo Elektra, el reporte de remuneración, los reportes 3T 2026 de BBVA, Santander, Banorte y Banamex, los archivos de datos abiertos del SAT y 13 ofertas de empleo. Lo siguiente no se pudo leer, o solo se leyó en prensa.

| Pendiente | Enlace directo | Qué pasó |
|---|---|---|
| Sentencias de la Suprema Corte de noviembre de 2025 (amparo directo en revisión 6321/2024 y los otros seis) | https://www.scjn.gob.mx/ | Buscadores sin comunicado oficial; solo prensa. Falta confirmar montos por caso (33,306 millones frente a 48,326 en total) |
| Comunicado del SAT o de Hacienda sobre el acuerdo de pago de enero de 2026 y los pagos posteriores | https://www.gob.mx/sat | No apareció el comunicado; solo prensa que lo cita |
| Comunicado de Grupo Salinas de enero de 2026 y su balance tributario de agosto (319 mil millones) | https://www.excelsior.com.mx/nacional/grupo-salinas-transparenta-balance-tributario | Solo prensa; sin confirmación del SAT |
| Buró de Entidades Financieras: reclamaciones por contrato de cada banco | https://www.buro.gob.mx/general_gob.php?id_sector=0&id_periodo=51 | La sección de bancos no respondió (tres intentos en dos navegadores) |
| Buró de Entidades Financieras, vista mensual | https://www.buro.gob.mx/general_gob_mensual.php?idAnio=2026&idMes=8 | Cargó la portada, no la tabla |
| CNBV, Portafolio de Información: banca múltiple | https://portafolioinfo.cnbv.gob.mx/Paginas/Inicio.aspx | Cargó, pero no se extrajeron cifras |
| Página de información financiera de Banco Azteca | https://www.grupoelektra.com.mx/es/banco-azteca-financieros | Se ve en blanco en Chrome; los PDF se descargaron con enlace directo |
| Tabla de utilidad neta consolidada de Grupo Elektra | https://www.grupoelektra.com.mx/Documents/ES/Downloads/Reporte-Anual-Grupo-Elektra-2025.pdf#page=84 | El texto extraído mezcla las filas; no se publica ninguna cifra |
| Notas a los estados financieros consolidados de Grupo Elektra (litigios fiscales por empresa) | https://www.grupoelektra.com.mx/Documents/ES/Downloads/Reporte-Anual-Grupo-Elektra-2025.pdf#page=232 | No se leyeron completas |
| ROE y ROA de Banco Azteca (resumen financiero 3T 2026) | https://www.grupoelektra.com.mx/api/pdfEkt/4297 | La tabla se extrae desordenada y las cifras son sobre cifras no consolidadas |
| Notas del banco sobre Servicios Laborales y Ejecutivos (número de trabajadores) | https://www.grupoelektra.com.mx/api/pdfEkt/4294 | No dicen cuántas personas emplea; falta una nota específica |
| Morosidad y capitalización de Santander México | https://www.bmv.com.mx/docs-pub/eventemi/eventemi_1599969_1.pdf | La tabla se extrae desordenada |
| BanCoppel: reportes 2026 | https://www.bancoppel.com/ | El sitio dio «Access Denied» a lectores automáticos; no se localizó el reporte en la BMV |
| Empleados, ROE del banco y morosidad del banco de Banorte | https://bmv.com.mx/docs-pub/infingps/gpsinfin_1601140_2026-03_2.pdf | Las cifras de Banorte son del grupo financiero |
| Número de empleados y ROE de Banamex | https://www.banamex.com/inversionistas/assets/pdf/esp/financiera/BanamexEstadosFinancieros3T26.pdf | No se leyó |
| Dividendos y empleados de Banco Azteca en 2021 | https://www.grupoelektra.com.mx/api/pdfEkt/3427 | El reporte del 4T 2021 solo habla del cuarto trimestre |
| Reportes de remuneración anteriores (tendencia) | https://www.grupoelektra.com.mx/Documents/ES/remuneracion/Reporte_Anual_del_Sistema_de_Remuneracion_2023.pdf | Solo se leyó el de 2025 |
| Avisos a la bolsa y asamblea de accionistas de Grupo Elektra (desglose de la remuneración agregada de 4,443.8 millones) | https://www.bmv.com.mx/es/emisoras/eventosrelevantes/ELEKTRA-27-CGEN_CAPIT | Cargó, no se leyó |
| Resultados trimestrales de Grupo Elektra | https://www.grupoelektra.com.mx/es/resultados-trimestrales | No se leyeron |
| Página de Data México sobre cajeros (salario promedio) | https://www.economia.gob.mx/datamexico/es/profile/occupation/cajeros-cobradores-y-pagadores | Carga con JavaScript; la cifra llegó por una búsqueda |
| Sueldos de Santander y Banamex para cajeros (misma ciudad y semana) | https://mx.computrabajo.com/trabajo-de-cajero-banamex | Los listados no mostraban el pago |
| Sitio de empleo propio de Banco Azteca | https://mx.computrabajo.com/trabajo-de-cajero-banco-azteca | No se localizó su página oficial de empleo; solo el listado de terceros |
| Plataforma Nacional de Transparencia: reglas vigentes | https://www.plataformadetransparencia.org.mx/ | La página carga; no se verificó qué institución recibe hoy las solicitudes. La página de gob.mx del INAI ya no abre |
| Patrimonio del accionista mayoritario en una clasificación reconocida | (sin enlace) | Decisión editorial: no se publica sin método y fecha verificados |

Revisión editorial pendiente de la persona que dictamina: cómo se nombra a las personas en `/transparencia/quien-es-quien/` (solo cargos de la empresa; no se nombra a familiares).

## Opiniones de empleados (2026-11-23)

| Pendiente | Enlace directo | Qué pasó |
|---|---|---|
| Calificación y reseñas de Banco Azteca en Glassdoor | https://www.glassdoor.com/Reviews/Banco-Azteca-Reviews-E641153.htm | «Just a moment…» (verificación contra robots); no se saltó. La cifra de 3.4 con 41 reseñas viene de un resultado de búsqueda; otra página dice 3.2 |
| Calificación y reseñas de Banco Azteca en Indeed | https://mx.indeed.com/cmp/Banco-Azteca | «Additional Verification Required»; no se saltó. 3.8 con 5,734 evaluaciones viene de búsqueda |
| BBVA en Glassdoor (México, no mundial) | https://www.glassdoor.com/Reviews/BBVA-Reviews-E1237.htm | La cifra de 3.9 es mundial. El enlace usa el número de empresa que aparece en los resultados |
| BBVA en Indeed (promedio) | https://mx.indeed.com/cmp/Bbva | Hay 7,813 evaluaciones; no se leyó el promedio |
| Santander México en Indeed | https://mx.indeed.com/cmp/Santander | 3.8 con 12,573 evaluaciones de un resultado de búsqueda |
| Banorte en Glassdoor (fecha de la cifra) | https://www.glassdoor.com/Reviews/Banorte-Reviews-E8236.htm | 4.1 con 90 reseñas, sin fecha |
| Banamex en Glassdoor (promedio) | https://www.glassdoor.com/Reviews/Banamex-Reviews-E7833.htm | 1,274 reseñas, sin promedio leído |
| BanCoppel en Indeed | https://mx.indeed.com/cmp/Bancoppel | 4.1 con 1,168 evaluaciones; la cifra cambia según la página |
| Santander, Banorte y BanCoppel en la otra plataforma | https://mx.indeed.com/cmp/Banco-Azteca | No se encontraron páginas |
| Términos de servicio de Glassdoor y de cada proveedor de datos | https://www.openwebninja.com/api/real-time-glassdoor-data | No se leyeron; necesarios antes de la fase 1 (ver docs/DESIGN-OPINIONES.md) |
