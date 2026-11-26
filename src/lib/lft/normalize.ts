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

/** Consulta FTS5 segura: cada token entre comillas, unidos con OR (BM25 ordena). Máximo 24 tokens. */
export function ftsQuery(question: string): string {
  const uniq = [...new Set(tokenizeEs(question))].slice(0, 24);
  return uniq.map((t) => `"${t.replace(/"/g, '')}"`).join(' OR ');
}

export function rrfFuse(rankings: string[][], k = 60): [string, number][] {
  const scores = new Map<string, number>();
  for (const ranking of rankings) ranking.forEach((id, i) => scores.set(id, (scores.get(id) ?? 0) + 1 / (k + i + 1)));
  return [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
