// Identificadores canónicos de artículos de la LFT y tokenización para la búsqueda de texto completo.
// Es una copia de normalize_articulo_id y tokenize_es de services/lft-rag (Python); tests/lft-native.test.ts
// comprueba los mismos casos que tests/test_parser.py.

const ADVERBIALS: Record<string, string> = {
  bis: 'Bis', ter: 'Ter', quater: 'Quáter', cuater: 'Quáter', quinquies: 'Quinquies', sexies: 'Sexies',
  septies: 'Septies', octies: 'Octies', nonies: 'Nonies', novies: 'Nonies', decies: 'Decies',
};
const ADV = '(?:Bis|Ter|Qu[áa]ter|Cu[áa]ter|Quinquies|Sexies|Septies|Octies|Nonies|Novies|Decies)';

export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

export function normalizeArticuloId(raw: string): string {
  let s = raw.trim().replace(/^(?:art[íi]culos?|arts?\.)\s*/i, '').trim().replace(/[.\-–: ]+$/, '').trim();
  const m = new RegExp(`^(\\d{1,4})\\s*(?:o\\.?|º\\.?|°\\.?)?\\s*(?:-?\\s*([A-Za-zÑñ])(?![a-záéíóúñ]))?\\s*(${ADV})?\\.?$`, 'i').exec(s);
  if (m) {
    let out = m[1].replace(/^0+(?=\d)/, '');
    if (m[2]) out += '-' + m[2].toUpperCase();
    if (m[3]) out += ' ' + ADVERBIALS[fold(m[3]).toLowerCase()];
    return out;
  }
  if (fold(s).toLowerCase() === 'unico') return 'Único';
  return s.replace(/\s+/g, ' ');
}

const STOPWORDS = new Set(`a al algo algunas algunos ante antes como con contra cual cuando de del desde donde durante e el ella ellas
ellos en entre era eran es esa esas ese eso esos esta estas este esto estos fue fueron ha han hasta hay la las
le les lo los mas me mi mis mucho muy ni no nos o os otra otras otro otros para pero poco por porque que quien
quienes se sea sean ser si sin sobre su sus tambien tanto te tiene tienen todo todos tu tus un una unas uno unos
y ya cada dicha dicho dichos dichas misma mismo mismos mismas sera seran podra podran debera deberan
cuanto cuantos cuanta cuantas cual cuales corresponde corresponden toca tocan puedo puede debo`.split(/\s+/));

/** Tokens de búsqueda: minúsculas, sin acentos, sin palabras vacías; conserva «15-a», «512-d», «bis». */
export function tokenizeEs(text: string): string[] {
  const t = fold(text.toLowerCase()).replace(/ñ/g, 'n').replace(/\b(\d+)\s*(?:o\.|º|°)/g, '$1');
  const toks = t.match(/\d+-[a-z]\b|[a-z0-9]+/g) ?? [];
  return toks.filter((x) => !STOPWORDS.has(x) && (x.length > 1 || /^\d$/.test(x)));
}

// Palabras de todos los días → términos que usa la LFT. La gente escribe «me corrieron» y la ley dice «rescisión»;
// sin este puente, la búsqueda trae artículos con palabras parecidas pero de otro tema (p. ej. riesgos de trabajo).
// Se aplica igual a la búsqueda por palabras y a la de significado. Sólo agrega términos: nunca quita los del usuario.
// Cada regla se escribe sobre el texto en minúsculas y sin acentos.
export const LEGAL_SYNONYMS: [RegExp, string][] = [
  [/\b(corri\w*|corrie\w*|correr|echar\w*|sacaron|despid\w*|despedi\w*|corte de personal|recorte)\b/, 'despido rescisión de la relación de trabajo sin responsabilidad para el patrón aviso escrito indemnización reinstalación'],
  [/\binjustificad\w*|sin (causa|motivo|razon|decirme|avisar)/, 'despido injustificado indemnización tres meses de salario reinstalación salarios vencidos'],
  [/\b(acos\w*|hostig\w*|maltrat\w*|humill\w*|grit\w*|amenaz\w*|violencia)\b/, 'hostigamiento acoso sexual rescisión sin responsabilidad para el trabajador separarse indemnización'],
  [/\b(dejar el trabajo|irme|me voy|separarme|me separo|renunciar por)\b/, 'separarse del trabajo rescisión sin responsabilidad para el trabajador'],
  [/\b(demand\w*|reclam\w*|plazo\w*|prescri\w*|cuanto tiempo tengo)\b/, 'prescripción prescriben acciones de trabajo dos meses separados del trabajo'],
  [/\b(home office|desde (mi )?casa|remot\w*|a distancia|teletrabaj\w*)\b/, 'teletrabajo'],
  [/\b(utilidad\w*|reparto|ptu)\b/, 'participación de los trabajadores en las utilidades de las empresas'],
  [/\b(embaraz\w*|maternidad|lactan\w*|parto|bebe)\b/, 'madres trabajadoras embarazo descanso antes y después del parto lactancia'],
  [/\b(paternidad|papa)\b/, 'permiso de paternidad'],
  [/\b(liquid\w*|finiquito)\b/, 'indemnización terminación de la relación de trabajo prima de antigüedad'],
  [/\bhoras? extras?\b|\btiempo extra\b/, 'jornada extraordinaria horas extraordinarias prolongar la jornada'],
  [/\b(maquina\w*|computadora\w*|automatiz\w*|tecnolog\w*|inteligencia artificial)\b/, 'implantación de maquinaria procedimientos de trabajo nuevos reajuste reducción de personal'],
  [/\b(jefe|jefa|empresa|empleador\w*)\b/, 'patrón persona empleadora'],
  [/\b(sueldo|paga|pago|quincena)\b/, 'salario'],
  [/\b(incapacidad|accidente\w*|enfermedad\w*|lesion\w*)\b/, 'riesgos de trabajo accidente de trabajo enfermedad de trabajo incapacidad'],
  [/\b(dias? de vacacion\w*|vacaciones\b.*\b(dias?|anos?)|cuantos dias\b.*\bvacacion\w*)\b/, 'periodo anual de vacaciones pagadas doce días laborables años de servicios'],
  [/\b(antes del ano|primer ano|proporcional\w*|no ha? complet\w*|menos de un ano|no cumpl\w* (?:un |el )?ano)\b/, 'termina antes de que se cumpla el año de servicios remuneración proporcionada al tiempo de servicios prestados'],
  [/\b(domingo\w*|prima dominical)\b/, 'día de descanso semanal domingo prima dominical veinticinco por ciento'],
  [/\bdescanso\b|\bdia libre\b/, 'día de descanso semanal'],
  [/\b(discrimin\w*)\b/, 'discriminación'],
  [/\b(contrato|contratacion)\b/, 'relación de trabajo contrato individual de trabajo'],
];

/** Términos legales que corresponden a las palabras de la pregunta (vacío si no aplica ninguno). */
export function legalExpansion(question: string): string {
  const t = fold(question.toLowerCase());
  return LEGAL_SYNONYMS.filter(([re]) => re.test(t)).map(([, terms]) => terms).join(' ');
}

/** Consulta FTS5 segura: cada token entre comillas, unidos con OR (BM25 ordena). Incluye la expansión legal. */
export function ftsQuery(question: string): string {
  const uniq = [...new Set([...tokenizeEs(question), ...tokenizeEs(legalExpansion(question))])].slice(0, 40);
  return uniq.map((t) => `"${t.replace(/"/g, '')}"`).join(' OR ');
}

/** Texto que se convierte en vector: la pregunta tal cual más, si aplica, su traducción a términos de la LFT. */
export function embeddingText(question: string): string {
  const exp = legalExpansion(question);
  return exp ? `${question}\n(Términos de la Ley Federal del Trabajo: ${exp})` : question;
}

export function rrfFuse(rankings: string[][], k = 60): [string, number][] {
  const scores = new Map<string, number>();
  for (const ranking of rankings) ranking.forEach((id, i) => scores.set(id, (scores.get(id) ?? 0) + 1 / (k + i + 1)));
  return [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
