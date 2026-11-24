// Contenido del documento de revisión para abogados laboralistas (/revision/documento/).
// El texto de los preceptos NO se escribe aquí: sale de fundamentos-laborales.json, extraído del texto vigente publicado
// por la Cámara de Diputados (scripts/fundamentos-laborales.py). Aquí solo van la lectura que hace el sitio y las preguntas.

export interface Ficha {
  id: string;            // id de la afirmación en claims-register.json
  titulo: string;
  afirmacion: string;    // lo que afirma el sitio, en una o dos frases
  fundamento: string[];  // claves de fundamentos-laborales.json
  lectura: string;       // cómo aplica el sitio el precepto
  abiertos: string[];    // puntos que se someten a dictamen
  pregunta: string;      // la pregunta concreta que debe resolver quien revisa
  extra?: { name: string; url: string }[]; // fuentes que no son un artículo del texto consolidado
}
export interface Materia { clave: string; titulo: string; intro: string; fichas: Ficha[] }

export const materias: Materia[] = [
  {
    clave: 'I',
    titulo: 'Reducción de personal y formas de terminación',
    intro: 'Regula la ruta que más importa si el banco sustituye puestos por automatización y las tres vías de salida que el sitio compara en la calculadora.',
    fichas: [
      {
        id: 'C01',
        titulo: 'Reducción de personal por maquinaria o procedimientos nuevos (Art. 439)',
        afirmacion: 'Si la implantación de maquinaria o de procedimientos de trabajo nuevos reduce personal, a falta de convenio el patrón necesita autorización del Tribunal mediante el procedimiento especial colectivo; quienes quedan fuera tienen derecho a cuatro meses de salario, veinte días por año de servicios (o la cantidad pactada si es mayor) y la prima de antigüedad.',
        fundamento: ['LFT-439', 'LFT-437', 'LFT-438'],
        lectura: 'El sitio presenta el Art. 439 como una de cuatro rutas de salida y calcula su monto: 4 meses = 120 días de salario integrado, más 20 días por año de servicios, más la prima del Art. 162. No afirma que el banco vaya a despedir a nadie: explica qué dice la ley «si tu puesto desaparece». El Art. 437 se cita solo como regla de escalafón (se reajusta a los de menor antigüedad) y el Art. 438 como regla de reanudación de actividades.',
        abiertos: [
          '¿Encuadra la sustitución de cajeros por cajeros automáticos, aplicaciones o robots en «implantación de maquinaria o de procedimientos de trabajo nuevos»?',
          'Cómo se aplica en la práctica el procedimiento especial colectivo del Art. 897 y siguientes cuando el patrón es un banco con alcance nacional.',
          'Si «cuatro meses de salario» se cuenta como 120 días o como 121.6 días (4 × 30.4). El sitio usa 120 y muestra la otra lectura (decisión D1).',
          'Si el contrato individual o colectivo mejora el monto («la cantidad estipulada en los contratos de trabajo si fuese mayor»).',
        ],
        pregunta: '¿Aplica el Art. 439 a la sustitución de cajeros por tecnología, y la indemnización mínima es 120 días más 20 días por año más la prima de antigüedad, o corresponde otra lectura?',
      },
      {
        id: 'C02',
        titulo: 'Despido injustificado y rescisión por causa imputable al patrón (Arts. 48, 50, 51 y 52)',
        afirmacion: 'El trabajador despedido puede pedir reinstalación o tres meses de salario, más salarios vencidos hasta por doce meses e intereses del 2% mensual sobre quince meses de salario. Si se separa por una causa del Art. 51, tiene treinta días para hacerlo y le corresponden las indemnizaciones del Art. 50.',
        fundamento: ['LFT-48', 'LFT-50', 'LFT-51', 'LFT-52'],
        lectura: 'La calculadora estima el despido (Art. 48) como 90 días de salario integrado más la prima de antigüedad, y la rescisión (Arts. 50 y 51) como 90 días más 20 días por año más la prima. Los salarios vencidos no se cuantifican: se muestran como «más, según el juicio». La lectura del Art. 50 es: la fracción II (20 días por año, relación indeterminada) y la fracción III (tres meses, salarios vencidos e intereses) se suman («Además de las indemnizaciones…»).',
        abiertos: [
          'Si en la rescisión del Art. 51 la fracción III del Art. 50 se suma a la II, como lo lee el sitio, o si se aplica de otro modo.',
          'Quién debe probar la causa de rescisión en el Art. 51 (el Art. 48 pone la carga en el patrón cuando es despido).',
          'Si «tres meses» equivalen a 90 días o a 3 × 30.4 días.',
          'Que el Art. 50 fr. II se reformó el 24-12-2024 y que su fracción IV (plataformas digitales) no es relevante para este caso.',
        ],
        pregunta: 'En la rescisión por causa imputable al patrón, ¿la indemnización es 90 días más 20 días por año más la prima de antigüedad, o las fracciones del Art. 50 se combinan de otra manera?',
      },
      {
        id: 'C03',
        titulo: 'Prima de antigüedad y su tope salarial (Arts. 162, 485 y 486)',
        afirmacion: 'La prima de antigüedad es de doce días de salario por año de servicios, con un salario máximo del doble del mínimo del área geográfica; se paga al despedido, con o sin justificación, y a quien renuncia solo con quince años de servicios o más.',
        fundamento: ['LFT-162', 'LFT-485', 'LFT-486'],
        lectura: 'La calculadora aplica el tope de dos salarios mínimos (general o de la frontera norte) únicamente a la prima, porque el Art. 162 fr. II remite a los Arts. 485 y 486 solo para determinar el salario de la prima. No aplica ese tope a las indemnizaciones de los Arts. 48, 50 y 439.',
        abiertos: [
          'Si el tope del Art. 486 debe aplicarse también a las indemnizaciones de los Arts. 48, 50 y 439. El sitio lo lee en sentido negativo.',
          'Cómo se cuenta la fracción de año en la prima (decisión D5): solo años completos o proporcional.',
        ],
        pregunta: 'Para la prima de antigüedad, ¿cuenta la fracción de año o solo los años completos? ¿Se aplica el tope del Art. 486 a las indemnizaciones de los Arts. 48, 50 y 439?',
      },
      {
        id: 'C18',
        titulo: 'Aviso escrito de rescisión y su efecto (Art. 47)',
        afirmacion: 'El patrón que despide debe dar aviso escrito con la conducta y las fechas, entregado personalmente en el momento del despido o comunicado al Tribunal dentro de cinco días hábiles. La falta de aviso presume la separación no justificada y la prescripción no corre hasta que el trabajador lo recibe.',
        fundamento: ['LFT-47'],
        lectura: 'El sitio (páginas «No firmes esto» y «Salidas») dice que, ante un despido, el trabajador debe pedir copia del aviso y anotar la fecha en que se le entregó. Presenta la falta de aviso como presunción de despido injustificado, salvo prueba en contrario.',
        abiertos: [
          'Cómo interactúa la regla del Art. 47 sobre el inicio de la prescripción con el plazo de dos meses del Art. 518.',
        ],
        pregunta: 'Si el patrón nunca entrega el aviso, ¿el plazo de dos meses del Art. 518 no comienza a correr hasta que el trabajador lo recibe personalmente?',
      },
      {
        id: 'C21',
        titulo: 'Nulidad de la renuncia de derechos y requisitos del convenio (Arts. 5 y 33)',
        afirmacion: 'Es nula la renuncia a salarios devengados, indemnizaciones y demás prestaciones; todo convenio o liquidación debe constar por escrito, contener una relación circunstanciada de los hechos y derechos, y ser ratificado ante el Centro de Conciliación o el Tribunal.',
        fundamento: ['LFT-33', 'LFT-5'],
        lectura: 'La página «No firmes esto» aconseja no firmar hojas en blanco, renuncias sin fecha ni convenios no ratificados, y llevar cualquier documento a PROFEDET antes de firmar. El sitio no afirma que un convenio sin ratificar sea inexistente: dice que puede reclamarse su nulidad solo en lo que contenga renuncia de derechos.',
        abiertos: [
          'Qué requisitos exactos debe cumplir un convenio de terminación para ser válido y definitivo.',
          'El efecto de un finiquito firmado sin intervención de la autoridad: hasta dónde puede reclamarse.',
        ],
        pregunta: '¿Qué requisitos debe cumplir un convenio de terminación para ser válido, y qué puede reclamarse de uno celebrado sin la intervención de la autoridad?',
      },
      {
        id: 'C20',
        titulo: 'Base salarial de las indemnizaciones (Arts. 84 y 89)',
        afirmacion: 'La indemnización se calcula con el salario del día en que nace el derecho, con la cuota diaria y la parte proporcional de las prestaciones; si la retribución es variable, con el promedio de los treinta días efectivamente trabajados; el salario semanal se divide entre siete.',
        fundamento: ['LFT-89', 'LFT-84'],
        lectura: 'La calculadora arma el salario diario integrado así: (sueldo base semanal ÷ 7 + comisión diaria) × (1 + aguinaldo ÷ 365 + vacaciones × 25% ÷ 365). Las comisiones se dividen entre 7 (método A) o entre seis días trabajados (método B); el sitio muestra ambos como rango.',
        abiertos: [
          'Si las comisiones semanales se dividen entre siete o entre los días efectivamente trabajados (decisión D2).',
          'Si la ventana del promedio son 30 días efectivamente trabajados o un periodo distinto (decisión D4).',
          'Si en el factor de integración debe usarse la prima vacacional y los días de vacaciones del último año completo o del año en curso (decisión D3).',
        ],
        pregunta: 'Para comisiones semanales, ¿se divide entre siete o entre los días efectivamente trabajados, y qué días de vacaciones integran el salario?',
      },
    ],
  },
  {
    clave: 'II',
    titulo: 'Competencia, conciliación y prescripción',
    intro: 'Determina ante quién se acude primero y con qué plazos. Un error aquí cuesta el derecho, por eso el sitio muestra siempre la fecha más temprana.',
    fichas: [
      {
        id: 'C17',
        titulo: 'Competencia federal en servicios de banca y crédito (Art. 527)',
        afirmacion: 'La aplicación de las normas de trabajo en los servicios de banca y crédito corresponde a las autoridades federales, por lo que la conciliación se solicita ante el Centro Federal de Conciliación y Registro Laboral.',
        fundamento: ['LFT-527-22'],
        lectura: 'El sitio remite al Centro Federal de Conciliación y Registro Laboral para quienes trabajan en el banco. Parte de que el patrón formal es una institución de crédito.',
        abiertos: [
          'Si la competencia sigue siendo federal cuando el patrón formal es una empresa de servicios laborales distinta del banco (véase C24).',
        ],
        pregunta: 'Si el patrón formal no es la institución de crédito, ¿la competencia sigue siendo federal?',
      },
      {
        id: 'C05',
        titulo: 'Conciliación prejudicial: obligatoriedad, duración y excepciones (Arts. 684-B, 684-D y 685 Ter)',
        afirmacion: 'Antes de acudir a los Tribunales hay que solicitar la conciliación; el procedimiento no excede de 45 días naturales; están exceptuados, entre otros, los conflictos de discriminación, acoso u hostigamiento sexual, seguridad social, designación de beneficiarios y tutela de derechos fundamentales laborales.',
        fundamento: ['LFT-684-B', 'LFT-684-D', 'LFT-685-Ter'],
        lectura: 'El sitio presenta la conciliación como paso previo obligatorio en la generalidad de los casos y explica las excepciones del Art. 685 Ter en lenguaje llano. El plazo de 45 días se cita del Art. 684-D (una versión anterior lo atribuía por error al 684-E; ya está corregido).',
        abiertos: [
          'Si la lista de excepciones del Art. 685 Ter que muestra el sitio es completa y correcta para un trabajador bancario.',
        ],
        pregunta: '¿La lista del Art. 685 Ter que explica el sitio es completa y correcta para un trabajador bancario?',
      },
      {
        id: 'C04',
        titulo: 'Plazos de prescripción y su suspensión o interrupción (Arts. 47, 52, 516, 517, 518 y 521)',
        afirmacion: 'La acción del trabajador separado prescribe en dos meses desde el día siguiente a la separación (Art. 518); las demás acciones, en un año (Art. 516); la acción para separarse del trabajo, en un mes (Art. 517 fr. II) y, por una causa del Art. 51, dentro de treinta días (Art. 52).',
        fundamento: ['LFT-518', 'LFT-516', 'LFT-517', 'LFT-52', 'LFT-521'],
        lectura: 'La página «Mis plazos» calcula, desde la fecha de salida, el plazo de dos meses, el de un año y, para quien se separa por culpa del patrón, el menor entre un mes y treinta días. Siempre muestra la fecha más temprana. Informa que la solicitud de conciliación afecta el plazo, sin afirmar si lo suspende o lo interrumpe.',
        abiertos: [
          'Qué plazo debe usar quien se separa por causa imputable al patrón: el mes del Art. 517 o los treinta días del Art. 52.',
          'Si la presentación de la solicitud de conciliación suspende (Art. 518) o interrumpe (Art. 521 fr. III) el plazo y cuándo vuelve a correr. Los dos artículos emplean verbos distintos.',
        ],
        pregunta: '¿Qué plazo debe usar quien se separa por culpa del patrón, un mes o treinta días? Y tras pedir la conciliación, ¿el plazo se suspende o se interrumpe, y cuándo vuelve a correr?',
      },
    ],
  },
  {
    clave: 'III',
    titulo: 'Prestaciones, jornada y descuentos',
    intro: 'Estos preceptos alimentan la parte del finiquito que no depende de la forma de salida.',
    fichas: [
      {
        id: 'C19',
        titulo: 'Vacaciones, prima vacacional y aguinaldo (Arts. 76, 79, 80 y 87)',
        afirmacion: 'Doce días de vacaciones al primer año, dos más por año hasta veinte, y dos más por cada cinco años a partir del sexto; prima no menor al 25% sobre los salarios del periodo; aguinaldo de al menos quince días antes del 20 de diciembre, con parte proporcional.',
        fundamento: ['LFT-76', 'LFT-79', 'LFT-80', 'LFT-87'],
        lectura: 'La calculadora usa la tabla del Art. 76 para los días de vacaciones y calcula el aguinaldo proporcional sobre el salario base diario. La prima vacacional se calcula sobre el salario de vacaciones (base), no sobre el integrado.',
        abiertos: ['Si la prima del Art. 80 se calcula sobre el salario de vacaciones o sobre el salario integrado.'],
        pregunta: '¿La prima vacacional se calcula sobre el salario base o sobre el integrado, y el aguinaldo proporcional sobre cuál salario?',
      },
      {
        id: 'C27',
        titulo: 'Descuentos al salario por deudas con el patrón (Art. 110, fracción I)',
        afirmacion: 'Los descuentos al salario están prohibidos salvo los casos de ley; el pago de deudas con el patrón por anticipos, pagos en exceso, errores, pérdidas o artículos de la empresa no puede exceder de un mes de salario ni de treinta por ciento del excedente del salario mínimo.',
        fundamento: ['LFT-110'],
        lectura: 'La lista «Lo que el banco te debe y lo que le debes» advierte que los descuentos están limitados por la ley y recomienda pedir por escrito el saldo de cualquier crédito interno y cómo se trata al terminar la relación. No afirma que el banco pueda o no compensar ese saldo con la liquidación.',
        abiertos: [
          'Cómo se aplica el límite de la fracción I a un crédito de nómina interno con el patrón cuando la relación termina.',
          'Si el banco puede compensar ese saldo con las prestaciones de la liquidación y en qué medida.',
        ],
        pregunta: '¿Puede el banco descontar de la liquidación el saldo de un crédito interno con el patrón sin respetar el tope de un mes de salario y el límite del treinta por ciento del excedente del mínimo?',
      },
      {
        id: 'C09',
        titulo: 'Reducción gradual de la jornada (reforma DOF 01-05-2026)',
        afirmacion: 'La jornada ordinaria máxima baja a 40 horas semanales de forma gradual: 48 en 2026, 46 en 2027, 44 en 2028, 42 en 2029 y 40 en 2030; las horas extra máximas escalan de 9 a 12; la reducción no implica disminución de sueldos, salarios ni prestaciones.',
        fundamento: ['LFT-59', 'LFT-61', 'LFT-66'],
        lectura: 'El sitio no afirma que hoy rija un máximo de 40 horas: informa que en 2026 rige 48 y explica el calendario. Los artículos 59, 61 y 66 se citan del texto consolidado; los transitorios (que fijan la gradualidad) del decreto publicado en el DOF.',
        abiertos: [
          'La parte del decreto sobre la fracción XXXIV del Art. 132 (registro electrónico de jornada), que según el Transitorio Quinto entra en vigor el 1 de enero de 2027, y las multas del Art. 994.',
          'Consecuencias para quien rota turnos de ocho horas con descansos distintos.',
        ],
        pregunta: '¿Cuál es el máximo semanal y de horas extra que rige cada año de 2026 a 2030, y cómo se aplica a quien trabaja turnos rotativos?',
        extra: [{ name: 'DOF 01-05-2026, Decreto que reforma la LFT en materia de reducción de la jornada laboral (Transitorios Primero a Séptimo)', url: 'https://www.diputados.gob.mx/LeyesBiblio/ref/lft/LFT_ref52_01may26.pdf' }],
      },
    ],
  },
  {
    clave: 'IV',
    titulo: 'Seguridad social e impuestos sobre los pagos por separación',
    intro: 'Dinero y cobertura médica mientras se encuentra otro trabajo, y qué parte de la indemnización está exenta.',
    fichas: [
      {
        id: 'C08',
        titulo: 'Exención de ISR de los pagos por separación (LISR Art. 93, fracción XIII)',
        afirmacion: 'Están exentos los pagos por separación hasta el equivalente a 90 veces el salario mínimo general del área geográfica por cada año de servicio; toda fracción de más de seis meses se considera año completo; por el excedente se paga el impuesto.',
        fundamento: ['LISR-93-XIII'],
        lectura: 'El sitio calcula 90 × UMA × años (con la regla de la fracción) y lo presenta como información, no como cálculo de impuestos. El texto de la LISR sigue diciendo «salario mínimo»; el sitio lo entiende referido a la UMA por el Transitorio Tercero del decreto de desindexación (DOF 27-01-2016).',
        abiertos: [
          'Que el Art. 93 fr. XIII sea un supuesto al que aplique el Transitorio Tercero de 2016 (UMA en lugar de salario mínimo).',
          'Cómo trata el SAT el cálculo y la fracción de año.',
        ],
        pregunta: '¿Confirma que, por el Transitorio Tercero de 2016, la exención se calcula con UMA y no con salario mínimo, y que la fracción de más de seis meses cuenta como año completo?',
        extra: [
          { name: 'DOF 27-01-2016, Decreto de desindexación del salario mínimo, Transitorios Segundo y Tercero', url: 'https://dof.gob.mx/nota_detalle_popup.php?codigo=5423663' },
          { name: 'Ley para Determinar el Valor de la Unidad de Medida y Actualización, Art. 2 fr. III', url: 'https://www.ordenjuridico.gob.mx/Documentos/Federal/html/wo120912.html' },
        ],
      },
      {
        id: 'C10',
        titulo: 'Conservación de derechos del IMSS tras la separación (LSS Art. 109)',
        afirmacion: 'Quien queda privado de trabajo remunerado y cubrió al menos ocho cotizaciones semanales ininterrumpidas conserva ocho semanas de asistencia médica, de maternidad, quirúrgica, farmacéutica y hospitalaria, igual que sus beneficiarios.',
        fundamento: ['LSS-109'],
        lectura: 'La página «Dinero mientras encuentro trabajo» informa las ocho semanas y remite al IMSS para confirmar la vigencia.',
        abiertos: ['Si el Consejo Técnico ha ampliado el plazo en los términos del segundo párrafo del Art. 109.'],
        pregunta: '¿Hay alguna ampliación vigente del plazo de ocho semanas?',
      },
      {
        id: 'C11',
        titulo: 'Retiro parcial por desempleo de la subcuenta de retiro (LSS Arts. 191 y 198)',
        afirmacion: 'Desde el día natural 46 de desempleo se puede retirar, según el inciso, treinta días del último salario base de cotización (con tope de diez veces el salario mínimo mensual del Distrito Federal) o el menor entre 90 días del salario de las últimas 250 semanas y 11.5% de la subcuenta, en hasta seis mensualidades; solo si no se retiró en los cinco años anteriores. Reduce las semanas cotizadas.',
        fundamento: ['LSS-191', 'LSS-198'],
        lectura: 'El sitio explica «lo que ganas y lo que pierdes» (efectivo ahora contra semanas de cotización) sin recomendar retirar. Para el tope del inciso a) sigue el texto de la ley; la mención al salario mínimo se entiende referida a la UMA por el Transitorio Tercero de 2016, lo que coincide con la prensa; la regla de la CONSAR que lo aplique no se pudo leer.',
        abiertos: [
          'Si el tope del inciso a) se calcula hoy con el salario mínimo de la Ciudad de México o con UMA, y qué dicen las reglas vigentes de la CONSAR.',
          'Cuántas semanas de cotización se exigen en 2026 (el sitio no publica una cifra).',
        ],
        pregunta: '¿El tope del inciso a) se calcula hoy con el salario mínimo de la Ciudad de México o con UMA?',
      },
    ],
  },
];
