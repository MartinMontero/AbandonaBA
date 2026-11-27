// Controlador interactivo de la Guía de IA Legal (CSP-safe, sin manejadores inline).

type ScenarioKey = 'vacation' | 'wifi' | 'tariff';
type EngineKind = 'local' | 'cloud';
type InterfaceKey = 'cli' | 'api' | 'edge';

interface SimStep {
  title: string;
  badge: string;
  status?: 'pass' | 'warn' | 'repair' | 'abstain';
  statusDynamic?: (bug: boolean) => 'pass' | 'warn' | 'repair' | 'abstain';
  plain?: string;
  plainDynamic?: (eng: EngineKind, bug: boolean) => string;
  tech?: string;
  techDynamic?: (eng: EngineKind, bug: boolean) => string;
  metricLabel: string;
  metricValue?: string;
  metricValueDynamic?: (bug: boolean) => string;
}

const scenarios: Record<ScenarioKey, { query: string; steps: SimStep[] }> = {
  vacation: {
    query: '"¿Cuántos días de vacaciones pagadas me tocan al cumplir 3 años?"',
    steps: [
      {
        title: '1. Recepción de tu Pregunta',
        badge: 'FastAPI / Typer CLI',
        status: 'pass',
        plain:
          'Escribes tu duda tal como la preguntarías en la vida diaria, ya sea desde una página web ciudadana conectada a FastAPI, un asistente en Cloudflare Workers o la consola local.',
        tech: 'Solicitud validada con esquema tipado Pydantic; se asigna identificador de rastreo para auditoría determinista.',
        metricLabel: 'Entrada Recibida',
        metricValue: 'Consulta Laboral Válida (0.4 ms)',
      },
      {
        title: '2. Capa de Decisión Rápida (System One)',
        badge: 'Enrutamiento Veloz',
        status: 'pass',
        plainDynamic: (eng) =>
          eng === 'local'
            ? 'Operando en tu propia computadora mediante Firelex Jeff (sin enviar tus datos a internet), esta capa detecta en milisegundos que preguntas por un cálculo de prestaciones por antigüedad y activa la búsqueda doble en la LFT.'
            : 'Operando en la nube con TypeSafe Jev, el clasificador ultrarrápido identifica en 18 milisegundos que es una consulta directa de derechos por antigüedad y lanza la búsqueda doble.',
        techDynamic: (eng) =>
          eng === 'local'
            ? 'Modelo: Firelex Jeff (Local) | Intención: calculo_prestaciones_lft | ¿Requiere dividir pregunta?: No | Privacidad: 100% local.'
            : 'Modelo: TypeSafe Jev (Nube) | Decisión tipada por esquema | División de consulta: No | Latencia: ~18 ms.',
        metricLabel: 'Decisión de Ruta',
        metricValue: 'Consulta Directa de Prestaciones',
      },
      {
        title: '3. Búsqueda Híbrida (ChromaDB + BM25)',
        badge: 'Significado + Palabras Exactas',
        status: 'pass',
        plain:
          'Dos buscadores revisan al mismo tiempo el texto oficial de la Cámara de Diputados: ChromaDB entiende la idea de "días pagados al cumplir 3 años", mientras BM25 localiza palabras exactas de la ley como "vacaciones", "años de servicios" y "Artículo 76".',
        tech: 'Fusión RRF combina vectores densos en ChromaDB (similitud 0.89 en Art. 76) con coincidencias léxicas dispersas BM25 (Art. 76, Art. 78 y Art. 80).',
        metricLabel: 'Artículos Encontrados',
        metricValue: 'Art. 76, Art. 78 y Art. 80 LFT',
      },
      {
        title: '4. Candado de Relevancia (Filtro Previo)',
        badge: 'Aduana Antes de Redactar',
        status: 'pass',
        plain:
          'Antes de dejar escribir a la IA, un evaluador revisa si los artículos hallados realmente responden tu duda. Conserva los Artículos 76, 78 y 80 (vacaciones y prima vacacional), y descarta el Artículo 75 (pago por trabajar en días festivos) para no revolver temas.',
        tech: 'Cross-encoder califica (Pregunta, Art. 76) = 0.96 [PASA], (Pregunta, Art. 80) = 0.84 [PASA], (Pregunta, Art. 75 días festivos) = 0.41 [DESCARTADO < 0.65].',
        metricLabel: 'Veredicto del Filtro',
        metricValue: 'APROBADO — Artículos Exactos Conservados',
      },
      {
        title: '5. Redacción con Barcenas-8b-Juridico-Mexicano',
        badge: 'Modelo Jurídico Mexicano',
        statusDynamic: (bug) => (bug ? 'warn' : 'pass'),
        plainDynamic: (_, bug) =>
          bug
            ? '¡RESBALÓN SIMULADO! Aunque el Artículo 76 vigente marca 12 días el primer año más 2 días por cada año subsecuente (16 días al año 3), la IA se confunde con la ley vieja anterior a 2023 y escribe en su borrador: "Te corresponden 10 días de vacaciones conforme al Artículo 76."'
            : 'Entrenado en lenguaje jurídico mexicano, Barcenas-8b lee el Artículo 76 vigente (12 días el año 1, 14 el año 2 y 16 el año 3) y redacta con claridad que te corresponden 16 días laborables pagados más 25% de prima vacacional.',
        techDynamic: (_, bug) =>
          bug
            ? 'Contaminación de memoria paramétrica pre-reforma Vacaciones Dignas 2023 ("10 días" en vez de los "16 días" derivados del Art. 76 vigente).'
            : 'Modelo: Danielbrdz/Barcenas-8b-Juridico-Mexicano | Temperatura baja (0.1) | Anclaje explícito a los Artículos 76 y 80 de la LFT.',
        metricLabel: 'Borrador Redactado',
        metricValueDynamic: (bug) => (bug ? '"10 días de vacaciones" (Dato Viejo Falso)' : '"16 días laborables" citando Art. 76 LFT'),
      },
      {
        title: '6. Candado de Sustento (Verificación Anti-Inventos)',
        badge: 'Auditoría Posterior',
        statusDynamic: (bug) => (bug ? 'repair' : 'pass'),
        plainDynamic: (_, bug) =>
          bug
            ? '¡ATRAPADO Y CORREGIDO A TIEMPO! El verificador lógico compara el borrador contra el Artículo 76 oficial y descubre que "10 días" contradice la ley vigente (Año 1=12, Año 2=14, Año 3=16). Bloquea el borrador, exige 1 corrección puntual y verifica que ahora sí diga "16 días".'
            : 'El verificador parte el borrador frase por frase, revisa cada número y cada artículo citado contra el PDF oficial de la LFT y comprueba un 97% de fidelidad lógica: cero inventos.',
        techDynamic: (_, bug) =>
          bug
            ? 'Pase 1: NLI = CONTRADICCIÓN (0.94) en conteo de días vs Art. 76. Acción: 1 Reparación Dirigida con reporte de error -> Pase 2: Corregido a 16 días -> NLI = ENTAILMENT (0.97).'
            : 'Chequeo Regex de citas: Art. 76 y 80 presentes [OK]. Modelo NLI local: Entailment 0.97 [APROBADO]. Juez LLM extra: No requerido.',
        metricLabel: 'Resultado de Auditoría',
        metricValueDynamic: (bug) => (bug ? 'Error Atrapado -> Corregido en Intento 1' : 'APROBADO (97% Sustento Comprobado)'),
      },
      {
        title: '7. Entrega de Respuesta Verificada',
        badge: 'Respuesta Confiable',
        status: 'pass',
        plain:
          'Recibes la respuesta correcta y comprobada: al cumplir 3 años de antigüedad en México tienes derecho a 16 días laborables de vacaciones pagadas (Art. 76) más una prima vacacional mínima del 25% (Art. 80), con las citas exactas de la ley vigente.',
        tech: 'Respuesta JSON entregada con texto verificado, extractos literales de la LFT de la Cámara de Diputados y métricas de verificación.',
        metricLabel: 'Entrega Final',
        metricValue: '16 Días Verificados + Citas Art. 76 y 80',
      },
    ],
  },
  wifi: {
    query: '"Hago home office, ¿mi jefe me tiene que ayudar a pagar el internet?"',
    steps: [
      {
        title: '1. Recepción de tu Pregunta',
        badge: 'FastAPI / Typer CLI',
        status: 'pass',
        plain:
          'Haces la pregunta como hablamos todos los días en México ("home office", "mi jefe", "pagar el internet"), sin necesidad de saber que en la ley se llama "Teletrabajo" ni "servicios de telecomunicaciones".',
        tech: 'Consulta en español coloquial mexicano ingresa al flujo; se preserva el contexto semántico para búsqueda vectorial.',
        metricLabel: 'Estilo de Pregunta',
        metricValue: 'Lenguaje Cotidiano ("Home Office")',
      },
      {
        title: '2. Capa de Decisión Rápida (System One)',
        badge: 'Enrutamiento Veloz',
        status: 'pass',
        plainDynamic: (eng) =>
          `Con ${eng === 'local' ? 'Firelex Jeff de forma local' : 'TypeSafe Jev en la nube'}, System One identifica de inmediato que preguntas por obligaciones especiales del patrón hacia personas que trabajan a distancia.`,
        techDynamic: (eng) =>
          `Enrutador (${eng === 'local' ? 'Firelex Jeff' : 'TypeSafe Jev'}) clasifica la consulta bajo OBLIGACIONES_PATRONALES / TELETRABAJO.`,
        metricLabel: 'Decisión de Ruta',
        metricValue: 'Obligaciones del Patrón en Teletrabajo',
      },
      {
        title: '3. Búsqueda Híbrida (ChromaDB + BM25)',
        badge: 'Significado + Palabras Exactas',
        status: 'pass',
        plain:
          'Aquí brilla la búsqueda por significado de ChromaDB: conecta tu frase "home office e internet" directamente con el Capítulo de Teletrabajo ("servicios de telecomunicaciones", Art. 330-E). Al mismo tiempo, BM25 trae artículos generales de herramientas y seguridad en fábricas.',
        tech: 'ChromaDB recupera el Capítulo XII Bis (Teletrabajo, Art. 330-A y 330-E Fracción III); BM25 suma Art. 132 Fracciones III y XVI.',
        metricLabel: 'Candidatos Recuperados',
        metricValue: 'Art. 330-E, Art. 330-A y Art. 132 XVI',
      },
      {
        title: '4. Candado de Relevancia (Filtro Previo)',
        badge: 'Aduana Antes de Redactar',
        status: 'pass',
        plain:
          'El filtro Cross-Encoder desecha la regla de seguridad en fábricas y talleres (Art. 132 XVI) que solo apareció por compartir la palabra "patrón", dejando únicamente los artículos exactos de Teletrabajo (Art. 330-A y 330-E).',
        tech: '(Pregunta, Art. 330-E) = 0.93 [PASA]; (Pregunta, Art. 330-A requisito >40% del tiempo) = 0.79 [PASA]; (Pregunta, Art. 132 XVI higiene en fábricas) = 0.28 [DESCARTADO].',
        metricLabel: 'Veredicto del Filtro',
        metricValue: 'APROBADO — Ruido Eliminado, 2 Artículos Útiles',
      },
      {
        title: '5. Redacción con Barcenas-8b-Juridico-Mexicano',
        badge: 'Modelo Jurídico Mexicano',
        statusDynamic: (bug) => (bug ? 'warn' : 'pass'),
        plainDynamic: (_, bug) =>
          bug
            ? '¡RESBALÓN SIMULADO! El modelo exagera y escribe que tu jefe está obligado a pagar el 100% del recibo total de internet de tu casa, olvidando aclarar que la ley marca el pago "proporcional" y exige trabajar más del 40% del tiempo en modalidad remota.'
            : 'Barcenas-8b explica con claridad y exactitud: si realizas más del 40% de tu jornada desde casa (Art. 330-A), el patrón tiene la obligación de asumir los costos de internet y la parte proporcional de electricidad (Art. 330-E Fracción III).',
        techDynamic: (_, bug) =>
          bug
            ? 'Sobregeneralización en el borrador: omitió la condición ">40% del tiempo" (Art. 330-A) y el matiz de costo proporcional (Art. 330-E III).'
            : 'Sintetiza con precisión la condición de aplicabilidad del Art. 330-A y la obligación patronal expresa del Art. 330-E Fracción III.',
        metricLabel: 'Precisión del Borrador',
        metricValueDynamic: (bug) => (bug ? 'Omitió "Parte Proporcional" y ">40%"' : 'Incluye Regla >40% y Pago Proporcional'),
      },
      {
        title: '6. Candado de Sustento (Verificación Anti-Inventos)',
        badge: 'Auditoría Posterior',
        statusDynamic: (bug) => (bug ? 'repair' : 'pass'),
        plainDynamic: (_, bug) =>
          bug
            ? '¡MATIZ CORREGIDO! El detector rápido NLI nota que "100% del recibo completo" no aparece en la ley y llama al Juez IA Local, quien señala el matiz faltante ("parte proporcional" y ">40% del tiempo") para que Barcenas-8b lo corrija en 1 intento.'
            : 'Tanto las reglas de citas como el verificador lógico confirman que cada condición (más del 40% del tiempo en casa, telecomunicaciones y electricidad proporcional, Art. 330-E III) está respaldada palabra por palabra.',
        techDynamic: (_, bug) =>
          bug
            ? 'NLI = NEUTRAL (0.68) -> Escalado a Juez LLM Local 8B -> Detecta omisión de "parte proporcional" -> Reparación Dirigida 1 exitosa (Entailment 0.95).'
            : 'Citas verificadas por Regex; NLI Entailment = 0.95 en las 3 afirmaciones atómicas.',
        metricLabel: 'Resultado de Auditoría',
        metricValueDynamic: (bug) => (bug ? 'Matiz Legal Reparado con Juez Local' : 'APROBADO (95% Sustento Comprobado)'),
      },
      {
        title: '7. Entrega de Respuesta Verificada',
        badge: 'Respuesta Confiable',
        status: 'pass',
        plain:
          'Obtienes una orientación clara, aterrizada a tu situación y respaldada exactamente por los Artículos 330-A y 330-E Fracción III—sin haber tenido que hablar como abogado para preguntar.',
        tech: 'Se entrega explicación ciudadana acompañada del texto literal vigente del Art. 330-E Fracción III.',
        metricLabel: 'Entrega Final',
        metricValue: 'Respuesta Verificada + Art. 330-A y 330-E',
      },
    ],
  },
  tariff: {
    query: '"¿Cuánto cobra la aduana por importar una camioneta usada de Texas?"',
    steps: [
      {
        title: '1. Recepción de tu Pregunta',
        badge: 'FastAPI / Typer CLI',
        status: 'pass',
        plain:
          'Alguien hace una pregunta sobre impuestos de aduana y regularización de vehículos fronterizos—un tema que pertenece a la Ley Aduanera y al SAT, NO a la Ley Federal del Trabajo.',
        tech: 'Solicitud recibida; el sistema nunca asume a ciegas que un tema está en la LFT sin verificar evidencia documental.',
        metricLabel: 'Materia Real',
        metricValue: 'Aduanas / Comercio Exterior (Ajeno a LFT)',
      },
      {
        title: '2. Capa de Decisión Rápida (System One)',
        badge: 'Enrutamiento Veloz',
        status: 'pass',
        plainDynamic: (eng) =>
          `${eng === 'local' ? 'Firelex Jeff' : 'TypeSafe Jev'} detecta baja relación con temas laborales y ordena revisar el índice con el candado de relevancia en alerta máxima.`,
        techDynamic: (eng) =>
          `Enrutador (${eng === 'local' ? 'Firelex Jeff' : 'TypeSafe Jev'}) marca confianza_dominio_laboral = 0.22 y exige validación estricta en pre-generación.`,
        metricLabel: 'Alerta Temprana',
        metricValue: 'Baja Probabilidad de Materia Laboral',
      },
      {
        title: '3. Búsqueda Híbrida (ChromaDB + BM25)',
        badge: 'Significado + Palabras Exactas',
        status: 'warn',
        plain:
          'Como todo buscador siempre devuelve "lo más parecido que encuentre", ChromaDB y BM25 sacan artículos sobre choferes de autotransporte (Art. 256) y mexicanos contratados en el extranjero (Art. 28). ¡Ninguno habla de aranceles ni aduanas!',
        tech: 'Coincidencias superficiales: Art. 256 (Trabajo de Autotransportes) y Art. 28 (Trabajadores fuera de la República). Sin candado, esto confundiría al LLM.',
        metricLabel: 'Coincidencias Débiles',
        metricValue: 'Art. 256 y Art. 28 (No responden la duda)',
      },
      {
        title: '4. Candado de Relevancia (Reintento y Alto Total)',
        badge: 'Freno de Seguridad Activado',
        status: 'abstain',
        plain:
          '¡FRENO DE SEGURIDAD! Todos los artículos sacan una calificación bajísima de 0.18 (muy lejos del mínimo de 0.65). System One reformula la búsqueda una vez por si hubiera alguna regla laboral fronteriza—sigue en 0.21. ¡El candado detiene todo en seco!',
        tech: 'Pase 1 puntaje máx: 0.18 (< 0.65). Acción: 1 reescritura de consulta con System One -> Pase 2 máx: 0.21 (< 0.65) -> ABSTENCION_SIN_ARTICULO_RELEVANTE.',
        metricLabel: 'Veredicto del Filtro',
        metricValue: 'BLOQUEADO tras 1 Reintento (0.21 < 0.65)',
      },
      {
        title: '5. Redactor Apagado a Propósito (Cero Riesgo de Inventar)',
        badge: 'Omitido por Seguridad',
        status: 'abstain',
        plain:
          'Barcenas-8b NI SIQUIERA SE ENCIENDE. Si dejáramos hablar a la IA sin artículos válidos, podría inventarte un porcentaje de arancel aduanero falso. Al no llamarla, el riesgo de alucinación baja exactamente a cero.',
        tech: 'Invocación al LLM omitida; ahorra cómputo local en GPU e impide por completo cualquier invención paramétrica.',
        metricLabel: 'Palabras Inventadas',
        metricValue: '0 Palabras (Generador Omitido)',
      },
      {
        title: '6. Candado de Sustento (Registro de Abstención)',
        badge: 'Métrica Registrada',
        status: 'abstain',
        plain:
          'El sistema anota esta abstención en su bitácora de calidad para que el equipo técnico distinga entre preguntas fuera de tema y posibles huecos de búsqueda.',
        tech: 'Telemetría registrada: motivo_abstencion="relevancia_previa_bajo_umbral".',
        metricLabel: 'Bitácora de Calidad',
        metricValue: 'Registrado en Tasa de Abstención',
      },
      {
        title: '7. Respuesta Honesta al Ciudadano',
        badge: 'Abstención Transparente',
        status: 'abstain',
        plain:
          'El sistema te responde con total honestidad: "No se encontró ningún artículo aplicable en la Ley Federal del Trabajo (LFT) sobre impuestos de importación de vehículos, ya que la LFT únicamente regula relaciones laborales."',
        tech: 'Respuesta HTTP 200 estructurada (`verified: false, abstained: true`) entregada limpiamente a la interfaz.',
        metricLabel: 'Entrega Final',
        metricValue: 'Aviso Honesto de Alcance Legal',
      },
    ],
  },
};

const labChunks = [
  {
    article: 'Artículo 330-E, Fracción III (Teletrabajo)',
    score: 0.93,
    summary:
      'Obliga a los patrones a asumir los costos derivados del trabajo en modalidad de teletrabajo, incluyendo pago de servicios de telecomunicación y parte proporcional de electricidad.',
    verdictHint: 'Responde de forma directa y exacta tu pregunta.',
  },
  {
    article: 'Artículo 330-A (Definición de Teletrabajo)',
    score: 0.78,
    summary:
      'Establece que se considera teletrabajo cuando más del 40% del tiempo laboral se desarrolla en el domicilio de la persona trabajadora usando tecnologías.',
    verdictHint: 'Condición indispensable para saber si te aplica.',
  },
  {
    article: 'Artículo 132, Fracción III (Útiles de Trabajo)',
    score: 0.54,
    summary:
      'Regla general que obliga al patrón a proporcionar oportunamente útiles, instrumentos y materiales necesarios para ejecutar el trabajo.',
    verdictHint: 'Regla muy general, no específica de internet en casa.',
  },
  {
    article: 'Artículo 132, Fracción XVI (Seguridad en Fábricas)',
    score: 0.28,
    summary:
      'Obliga a instalar y operar fábricas, talleres, oficinas y locales conforme a reglamentos de seguridad y salud para prevenir accidentes.',
    verdictHint: 'Ruido por palabras sueltas ("patrón", "oficinas").',
  },
];

const engineTabs = [
  {
    title: 'Capa 1: Cross-Encoder Reordenador (Antes de Redactar)',
    meta: 'Corre ANTES de que la IA escriba | Velocidad: ~20–40 ms local | Peso: Muy ligero (ej. BGE-Reranker / DeBERTa-v3)',
    plain:
      'Cuando ChromaDB busca entre más de mil artículos de la LFT, hace un vistazo rápido convirtiendo tu pregunta y cada artículo por separado. En cambio, el Cross-Encoder pone tu pregunta y cada artículo candidato uno al lado del otro y compara palabra por palabra, dándole una calificación estricta de 0 a 1.',
    tech: 'Concatena [CLS] Pregunta [SEP] Articulo_LFT [SEP] pasando por atención cruzada completa. Aplica un corte duro (ej. 0.65) sobre los 15–20 candidatos híbridos y desecha el ruido antes de generar.',
  },
  {
    title: 'Capa 2: Reglas Fijas de Código / Regex (Después de Redactar)',
    meta: 'Corre DESPUÉS de redactar | Velocidad: Menos de 1 milisegundo | Peso: Puro código Python en CPU',
    plain:
      'Antes de gastar energía con inteligencia artificial revisora, unas reglas simples de programación hacen la revisión obvia: ¿La IA citó un "Artículo 9999" que no existe? ¿Mencionó un artículo que ni siquiera venía en los resultados aprobados? El código atrapa citas inventadas al instante.',
    tech: 'Extrae cada mención de `Artículo \\d+` y `Fracción [IVXLCDM]+` con expresiones regulares deterministas y comprueba que pertenezcan al conjunto exacto de metadatos recuperados.',
  },
  {
    title: 'Capa 3: Detector Lógico NLI Local (Auditor de Cada Respuesta)',
    meta: 'Revisa TODAS las respuestas | Velocidad: ~30–50 ms local | Peso: Clasificador compacto (ej. Vectara HHEM / DeBERTa NLI)',
    plain:
      'Las siglas NLI significan "Inferencia de Lenguaje Natural". Este pequeño modelo divide el borrador de la IA en afirmaciones individuales y comprueba matemáticamente cada una contra el artículo oficial, clasificándola en tres opciones: Respaldada (Entailment), Contradicción (¡alucinación detectada!) o Neutra (dato extra sin respaldo).',
    tech: 'Evalúa pares `(Premisa = Artículo LFT Oficial, Hipótesis = Afirmación del Borrador)`. Atrapa contradicciones directas con mínimo uso de memoria de video (VRAM).',
  },
  {
    title: 'Capa 4: Juez IA Local / LLM-as-a-Judge (Desempate para Matices Legales)',
    meta: 'Se enciende SOLO en casos dudosos o neutros | Velocidad: 1–3 segundos | Peso: Modelo Juez de 8B (ej. Patronus Lynx)',
    plain:
      'En las leyes mexicanas abundan las excepciones ("salvo pacto en contrario", "cuando exceda el 40%"). Cuando una regla combina varios párrafos y el detector rápido NLI duda, el sistema despierta a una segunda inteligencia artificial entrenada exclusivamente como un juez estricto de lectura legal.',
    tech: 'Emplea un modelo juez independiente con rúbrica estructurada (`Pass`/`Fail` + fragmento exacto del error) para evitar puntos ciegos compartidos con el redactor y guiar la reparación.',
  },
];

const interfaceSnippets: Record<InterfaceKey, { desc: string; code: string }> = {
  cli: {
    desc: 'Ideal para investigadores, defensorías o equipos técnicos: permite procesar el PDF oficial vigente de la Cámara de Diputados, consultar desde la computadora sin depender de terceros y correr las pruebas automáticas de calidad.',
    code: `# 1. Leer de forma exacta el PDF oficial de la Cámara de Diputados e indexar ChromaDB + BM25
$ lft-rag ingest ./pdfs_oficiales/LFT_vigente_diputados.pdf --law LFT

# 2. Consultar localmente con Firelex Jeff (System One) + Barcenas-8b-Juridico-Mexicano
$ lft-rag ask "¿Cuántos días de vacaciones pagadas me tocan al cumplir 3 años?" --engine jeff

[System One] Intención: calculo_prestaciones_lft (11ms, 100% local)
[Búsqueda Híbrida] Art. 76 (0.96), Art. 80 (0.84) | Descartados 3 fragmentos < 0.65
[Sustento Legal] APROBADO (NLI Entailment: 0.97, Citas comprobadas: Art. 76 y Art. 80)
-> Respuesta verificada: Al tercer año de servicios te corresponden 16 días laborables...`,
  },
  api: {
    desc: 'El servicio FastAPI funciona como una "ventanilla universal": permite que una app móvil para trabajadores, un portal sindical o el área de Recursos Humanos de una PyME consulten la LFT y la LSS recibiendo las citas verificadas.',
    code: `POST /v1/legal/query HTTP/1.1
Content-Type: application/json

{
  "question": "Hago home office, ¿mi jefe me tiene que ayudar a pagar el internet?",
  "law_filter": "LFT",
  "relevance_threshold": 0.65
}

// Respuesta HTTP 200 Verificada
{
  "status": "VERIFIED",
  "answer": "Sí. Si trabajas más del 40% del tiempo desde casa (Teletrabajo), el patrón debe asumir costos de internet y electricidad proporcional.",
  "cited_articles": ["330-A", "330-E"],
  "deterministic_citation_passed": true
}`,
  },
  edge: {
    desc: 'Con Cloudflare Workers se puede publicar un portal ciudadano rápido y protegido en todo México, o bien conectar este motor directamente a Claude Code vía MCP para asistir en auditorías y herramientas legales sin inventar artículos.',
    code: `// Conector en Cloudflare Workers -> Servicio Verificado FastAPI (con caché KV y Zero Trust)
export default {
  async fetch(request, env) {
    const { question } = await request.json();
    const res = await fetch(\`\${env.LEGAL_RAG_ORIGIN_URL}/v1/legal/query\`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cf-Access-Client-Id": env.CF_ACCESS_CLIENT_ID,
        "Cf-Access-Client-Secret": env.CF_ACCESS_CLIENT_SECRET
      },
      body: JSON.stringify({ question, law_filter: "ALL" })
    });
    return new Response(await res.text(), { headers: { "Content-Type": "application/json" } });
  }
};`,
  },
};

export function initFieldGuide(): void {
  const root = document.getElementById('guia-ia');
  if (!root) return;

  const state: {
    scenario: ScenarioKey;
    stepIndex: number;
    systemOneEngine: EngineKind;
    injectHallucination: boolean;
    cutoff: number;
    activeEngineTab: number;
    activeInterface: InterfaceKey;
    lastFocusedElement: HTMLElement | null;
    snackbarTimer: number | null;
  } = {
    scenario: 'vacation',
    stepIndex: 0,
    systemOneEngine: 'local',
    injectHallucination: false,
    cutoff: 0.65,
    activeEngineTab: 0,
    activeInterface: 'cli',
    lastFocusedElement: null,
    snackbarTimer: null,
  };

  function showSnackbar(message: string) {
    const el = document.getElementById('snackbar');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    el.classList.add('show');
    if (state.snackbarTimer !== null) window.clearTimeout(state.snackbarTimer);
    state.snackbarTimer = window.setTimeout(() => {
      el.classList.remove('show');
      el.hidden = true;
    }, 3000);
  }

  function techEnabled(): boolean {
    const sw = document.getElementById('fg-tech-switch') as HTMLInputElement | null;
    return sw ? sw.checked : true;
  }

  function renderSimulator() {
    const scen = scenarios[state.scenario];
    const listEl = document.getElementById('fg-step-list');
    const detailEl = document.getElementById('fg-stage-detail');
    if (!listEl || !detailEl) return;

    listEl.innerHTML = '';
    scen.steps.forEach((step, idx) => {
      const isCurrent = idx === state.stepIndex;
      const st = step.statusDynamic ? step.statusDynamic(state.injectHallucination) : step.status ?? 'pass';

      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `fg-rail-btn${isCurrent ? ' is-current' : ''}`;
      btn.setAttribute('aria-current', isCurrent ? 'step' : 'false');
      btn.addEventListener('click', () => {
        state.stepIndex = idx;
        renderSimulator();
      });

      const titleSpan = document.createElement('span');
      titleSpan.className = 'fg-rail-title';
      titleSpan.textContent = step.title;

      const badgeSpan = document.createElement('span');
      badgeSpan.className = `fg-rail-dot st-${st}`;
      badgeSpan.setAttribute('aria-hidden', 'true');
      badgeSpan.textContent = st === 'warn' || st === 'repair' ? '↻' : st === 'abstain' ? '×' : '✓';

      btn.append(titleSpan, badgeSpan);
      li.appendChild(btn);
      listEl.appendChild(li);
    });

    const active = scen.steps[state.stepIndex];
    const activeStatus = active.statusDynamic
      ? active.statusDynamic(state.injectHallucination)
      : active.status ?? 'pass';
    const plainText = active.plainDynamic
      ? active.plainDynamic(state.systemOneEngine, state.injectHallucination)
      : active.plain ?? '';
    const techText = active.techDynamic
      ? active.techDynamic(state.systemOneEngine, state.injectHallucination)
      : active.tech ?? '';
    const metricVal = active.metricValueDynamic
      ? active.metricValueDynamic(state.injectHallucination)
      : active.metricValue ?? '';

    let pillClass = 'fg-pill-ok';
    let pillText = active.badge;
    if (activeStatus === 'warn') {
      pillClass = 'fg-pill-err';
      pillText = 'Resbalón de Ley Vieja Simulado';
    } else if (activeStatus === 'repair') {
      pillClass = 'fg-pill-warn';
      pillText = '1 Corrección Automática Aplicada';
    } else if (activeStatus === 'abstain') {
      pillClass = 'fg-pill-err';
    }

    detailEl.innerHTML = '';

    const topRow = document.createElement('div');
    topRow.className = 'fg-stage-top';
    const qSpan = document.createElement('span');
    qSpan.className = 'fg-mono-muted';
    qSpan.textContent = `Pregunta activa: ${scen.query}`;
    const pillSpan = document.createElement('span');
    pillSpan.className = `fg-pill ${pillClass}`;
    pillSpan.textContent = pillText;
    topRow.append(qSpan, pillSpan);

    const h3 = document.createElement('h3');
    h3.className = 'fg-stage-title';
    h3.textContent = active.title;

    const pPlain = document.createElement('p');
    pPlain.className = 'fg-stage-plain';
    pPlain.textContent = plainText;

    const metricBox = document.createElement('div');
    metricBox.className = 'fg-metric-box';
    const mLabel = document.createElement('span');
    mLabel.className = 'fg-metric-label';
    mLabel.textContent = active.metricLabel;
    const mValue = document.createElement('span');
    mValue.className = 'fg-metric-value';
    mValue.textContent = metricVal;
    metricBox.append(mLabel, mValue);

    const techBox = document.createElement('div');
    techBox.className = `tech-nuance fg-tech-box${techEnabled() ? '' : ' fg-hidden'}`;
    const techHead = document.createElement('span');
    techHead.className = 'fg-tech-head';
    techHead.textContent = 'Por Debajo del Capó (Rastro Técnico)';
    const techP = document.createElement('p');
    techP.className = 'fg-tech-body';
    techP.textContent = techText;
    techBox.append(techHead, techP);

    detailEl.append(topRow, h3, pPlain, metricBox, techBox);

    const prevBtn = document.getElementById('fg-prev-step') as HTMLButtonElement | null;
    const nextBtn = document.getElementById('fg-next-step') as HTMLButtonElement | null;
    if (prevBtn) prevBtn.disabled = state.stepIndex === 0;
    if (nextBtn) nextBtn.disabled = state.stepIndex === scen.steps.length - 1;
  }

  function selectScenario(key: ScenarioKey) {
    state.scenario = key;
    state.stepIndex = 0;
    (['vacation', 'wifi', 'tariff'] as ScenarioKey[]).forEach((k) => {
      const btn = document.getElementById(`fg-scen-${k}`);
      if (!btn) return;
      const active = k === key;
      btn.setAttribute('aria-checked', String(active));
      btn.classList.toggle('is-active', active);
    });
    renderSimulator();
  }

  function updateRelevanceLab(val: string) {
    const cutoff = parseFloat(val);
    state.cutoff = cutoff;
    const readout = document.getElementById('fg-cutoff-readout');
    if (readout) readout.textContent = cutoff.toFixed(2);

    const kept = labChunks.filter((c) => c.score >= cutoff);
    const verdictEl = document.getElementById('fg-relevance-verdict');
    if (verdictEl) {
      if (kept.length === 0) {
        verdictEl.className = 'fg-verdict fg-verdict-err';
        verdictEl.textContent = `¡Exigencia (${cutoff.toFixed(2)}) demasiado alta! Ningún artículo pasó. El sistema reintenta reformular la pregunta 1 vez y, si sigue en cero, SE ABSTIENE en lugar de adivinar.`;
      } else if (cutoff <= 0.3) {
        verdictEl.className = 'fg-verdict fg-verdict-err';
        verdictEl.textContent = `¡Cuidado! Con un filtro tan bajo (${cutoff.toFixed(2)}) se coló el Art. 132 XVI sobre accidentes en fábricas, lo cual puede confundir al modelo al redactar.`;
      } else if (cutoff >= 0.8) {
        verdictEl.className = 'fg-verdict fg-verdict-warn';
        verdictEl.textContent = `Ojo: Con (${cutoff.toFixed(2)}) pasó el Art. 330-E, pero dejaste fuera el Art. 330-A (que aclara el requisito de trabajar >40% del tiempo en casa). El punto ideal ronda 0.65.`;
      } else {
        verdictEl.className = 'fg-verdict fg-verdict-ok';
        verdictEl.textContent = `Punto ideal (${cutoff.toFixed(2)}): Pasan los dos artículos clave de Teletrabajo a Barcenas-8b y queda bloqueado el ruido de seguridad en fábricas.`;
      }
    }

    const gridEl = document.getElementById('fg-chunks-grid');
    if (gridEl) {
      gridEl.innerHTML = '';
      labChunks.forEach((chunk) => {
        const passes = chunk.score >= cutoff;
        const card = document.createElement('div');
        card.className = `fg-chunk-card${passes ? ' is-pass' : ' is-drop'}`;

        const head = document.createElement('div');
        head.className = 'fg-chunk-head';
        const title = document.createElement('span');
        title.className = 'fg-chunk-title';
        title.textContent = chunk.article;
        const badge = document.createElement('span');
        badge.className = `fg-chunk-badge${passes ? ' is-pass' : ''}`;
        badge.textContent = `${chunk.score.toFixed(2)} • ${passes ? 'PASA' : 'DESCARTADO'}`;
        head.append(title, badge);

        const sum = document.createElement('p');
        sum.className = 'fg-chunk-sum';
        sum.textContent = chunk.summary;

        const hint = document.createElement('p');
        hint.className = 'fg-chunk-hint';
        hint.textContent = chunk.verdictHint;

        card.append(head, sum, hint);
        gridEl.appendChild(card);
      });
    }
  }

  function selectEngineTab(idx: number) {
    state.activeEngineTab = idx;
    for (let i = 0; i < 4; i++) {
      const btn = document.getElementById(`fg-eng-tab-${i}`);
      if (!btn) continue;
      const selected = i === idx;
      btn.setAttribute('aria-selected', String(selected));
      btn.classList.toggle('is-active', selected);
    }
    const data = engineTabs[idx];
    const panel = document.getElementById('fg-eng-panel');
    if (!panel) return;
    panel.innerHTML = '';

    const h4 = document.createElement('h4');
    h4.className = 'fg-eng-title';
    h4.textContent = data.title;
    const meta = document.createElement('p');
    meta.className = 'fg-eng-meta';
    meta.textContent = data.meta;
    const plain = document.createElement('p');
    plain.className = 'fg-eng-plain';
    plain.textContent = data.plain;
    const tech = document.createElement('div');
    tech.className = `tech-nuance fg-tech-box${techEnabled() ? '' : ' fg-hidden'}`;
    const techP = document.createElement('p');
    techP.className = 'fg-tech-body';
    techP.textContent = data.tech;
    tech.appendChild(techP);

    panel.append(h4, meta, plain, tech);
  }

  function selectInterfaceTab(key: InterfaceKey) {
    state.activeInterface = key;
    (['cli', 'api', 'edge'] as InterfaceKey[]).forEach((k) => {
      const btn = document.getElementById(`fg-iface-tab-${k}`);
      if (!btn) return;
      const active = k === key;
      btn.setAttribute('aria-selected', String(active));
      btn.classList.toggle('is-active', active);
    });
    const descEl = document.getElementById('fg-iface-desc');
    const codeEl = document.getElementById('fg-iface-code');
    if (descEl) descEl.textContent = interfaceSnippets[key].desc;
    if (codeEl) codeEl.textContent = interfaceSnippets[key].code;
  }

  function toggleClauseStripDemo(stripped: boolean) {
    const box = document.getElementById('fg-strip-box');
    const sent = document.getElementById('fg-strip-sentence');
    const exp = document.getElementById('fg-strip-exp');
    if (!box || !sent || !exp) return;

    box.classList.toggle('is-danger', stripped);
    if (stripped) {
      sent.innerHTML =
        '"Conforme a la Ley Federal del Trabajo, una persona despedida tiene derecho a 3 meses de salario por indemnización constitucional <del>[excepción borrada en silencio]</del>."';
      exp.textContent =
        '¡EL SENTIDO LEGAL SE VOLTEÓ POR COMPLETO! Al borrar esa última frase, engañas al trabajador o a una PyME haciéndoles creer que siempre se pagan 3 meses aunque haya un despido justificado comprobado bajo el Artículo 47. Por eso el sistema repara o se abstiene: jamás recorta a ciegas.';
    } else {
      sent.innerHTML =
        '"Conforme a la Ley Federal del Trabajo, una persona despedida tiene derecho a 3 meses de salario por indemnización constitucional, <mark>salvo que el patrón compruebe una causa justificada de rescisión sin responsabilidad conforme al Artículo 47</mark>."';
      exp.textContent =
        'Regla jurídica completa: Refleja con exactitud tanto el derecho a la indemnización (Art. 48) como la excepción por despido justificado (Art. 47).';
    }
  }

  function openSpecDialog(triggerEl: HTMLElement | null) {
    state.lastFocusedElement = triggerEl ?? (document.activeElement as HTMLElement | null);
    const backdrop = document.getElementById('fg-dialog-backdrop');
    if (!backdrop) return;
    backdrop.classList.remove('fg-hidden');
    document.getElementById('fg-dialog-close-top')?.focus();
  }

  function closeSpecDialog() {
    const backdrop = document.getElementById('fg-dialog-backdrop');
    if (!backdrop) return;
    backdrop.classList.add('fg-hidden');
    state.lastFocusedElement?.focus();
  }

  // Bind all interactive controls
  (['vacation', 'wifi', 'tariff'] as ScenarioKey[]).forEach((k) => {
    document.getElementById(`fg-scen-${k}`)?.addEventListener('click', () => selectScenario(k));
  });

  document.getElementById('fg-engine-toggle')?.addEventListener('click', () => {
    state.systemOneEngine = state.systemOneEngine === 'local' ? 'cloud' : 'local';
    const lbl = document.getElementById('fg-engine-label');
    if (lbl) lbl.textContent = state.systemOneEngine === 'local' ? 'Local: Firelex Jeff' : 'Nube: TypeSafe Jev';
    renderSimulator();
    showSnackbar(
      state.systemOneEngine === 'local'
        ? 'System One cambiado al modelo local Firelex Jeff.'
        : 'System One cambiado al enrutador en la nube TypeSafe Jev.'
    );
  });

  document.getElementById('fg-bug-switch')?.addEventListener('change', (e) => {
    const checked = (e.currentTarget as HTMLInputElement).checked;
    state.injectHallucination = checked;
    if (checked && state.scenario === 'tariff') {
      selectScenario('vacation');
    }
    if (checked && state.stepIndex < 4) {
      state.stepIndex = 4;
    }
    renderSimulator();
    showSnackbar(
      checked
        ? '¡Resbalón activado! Revisa los Pasos 5 y 6 para ver cómo lo atrapa y corrige.'
        : 'Redacción limpia de Barcenas-8b restaurada.'
    );
  });

  document.getElementById('fg-prev-step')?.addEventListener('click', () => {
    state.stepIndex = Math.max(0, state.stepIndex - 1);
    renderSimulator();
  });

  document.getElementById('fg-next-step')?.addEventListener('click', () => {
    const max = scenarios[state.scenario].steps.length - 1;
    state.stepIndex = Math.min(max, state.stepIndex + 1);
    renderSimulator();
  });

  document.getElementById('fg-start-demo')?.addEventListener('click', () => {
    selectScenario('vacation');
    showSnackbar('Caso A cargado — avanza por las 7 etapas aquí abajo.');
  });

  document.getElementById('fg-cutoff-slider')?.addEventListener('input', (e) => {
    updateRelevanceLab((e.currentTarget as HTMLInputElement).value);
  });

  for (let i = 0; i < 4; i++) {
    document.getElementById(`fg-eng-tab-${i}`)?.addEventListener('click', () => selectEngineTab(i));
  }

  document.getElementById('fg-strip-switch')?.addEventListener('change', (e) => {
    toggleClauseStripDemo((e.currentTarget as HTMLInputElement).checked);
  });

  (['cli', 'api', 'edge'] as InterfaceKey[]).forEach((k) => {
    document.getElementById(`fg-iface-tab-${k}`)?.addEventListener('click', () => selectInterfaceTab(k));
  });

  document.getElementById('fg-copy-snippet')?.addEventListener('click', async () => {
    const text = interfaceSnippets[state.activeInterface].code;
    try {
      await navigator.clipboard.writeText(text);
      showSnackbar('Ejemplo copiado al portapapeles.');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showSnackbar('Ejemplo copiado al portapapeles.');
      } catch {
        showSnackbar('No se pudo copiar automáticamente; selecciona el texto.');
      }
      document.body.removeChild(ta);
    }
  });

  document.getElementById('fg-tech-switch')?.addEventListener('change', (e) => {
    const show = (e.currentTarget as HTMLInputElement).checked;
    root.querySelectorAll('.tech-nuance').forEach((el) => {
      el.classList.toggle('fg-hidden', !show);
    });
    showSnackbar(show ? 'Notas de detalle técnico visibles.' : 'Modo de lectura ciudadana sencilla activo.');
  });

  root.querySelectorAll('[data-fg-open-glossary]').forEach((btn) => {
    btn.addEventListener('click', (e) => openSpecDialog(e.currentTarget as HTMLElement));
  });
  document.getElementById('fg-dialog-close-top')?.addEventListener('click', closeSpecDialog);
  document.getElementById('fg-dialog-close-bottom')?.addEventListener('click', closeSpecDialog);
  document.getElementById('fg-dialog-backdrop')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSpecDialog();
  });
  document.addEventListener('keydown', (e) => {
    const backdrop = document.getElementById('fg-dialog-backdrop');
    if (e.key === 'Escape' && backdrop && !backdrop.classList.contains('fg-hidden')) {
      closeSpecDialog();
    }
  });

  // Initial render
  renderSimulator();
  updateRelevanceLab('0.65');
  selectEngineTab(0);
  selectInterfaceTab('cli');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFieldGuide);
} else {
  initFieldGuide();
}
