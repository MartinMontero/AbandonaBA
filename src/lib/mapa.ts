// Mapa de conexiones de Transparencia. Funciones puras: todas las cifras salen de src/data/transparencia.json.
// El mapa no afirma causas. Cada conexión es de uno de cuatro tipos: es una resta del estado de resultados,
// la dice la empresa en un reporte, es un cálculo propio que describe, o falta un documento.
import map from '../data/mapa-conexiones.json';
import { T, annual, latest, ann, n, pesos, median, minWageDaily } from './transparencia';
import { toMonthly, timesMinWage } from './equivalencias';

export type PKey = '2022' | '2023' | '2024' | '2025' | '2026';
export const periods: { key: PKey; label: string; long: string }[] = [
  { key: '2022', label: '2022', long: 'el año 2022' },
  { key: '2023', label: '2023', long: 'el año 2023' },
  { key: '2024', label: '2024', long: 'el año 2024' },
  { key: '2025', label: '2025', long: 'el año 2025' },
  { key: '2026', label: 'Ene–sep 2026', long: 'enero a septiembre de 2026' },
];
export const defaultPeriod: PKey = '2026';

/** Fila de cifras de cada periodo: un año completo o el acumulado de enero a septiembre de 2026. */
export const periodRow = (k: PKey): any => (k === '2026' ? latest.ytd : ann(Number(k)));
const prevOf = (k: PKey): PKey | null => { const i = periods.findIndex((p) => p.key === k); return i > 0 ? periods[i - 1].key : null; };

// ---------- Sigue el dinero ----------
export interface Flow {
  k: PKey; ii: number; ie: number; prov: number; admin: number; other: number; op: number; tax: number; part: number; net: number;
  per: Record<'ie' | 'prov' | 'admin' | 'other' | 'op' | 'tax' | 'net', number>;
}
export function flow(k: PKey): Flow {
  const r = periodRow(k);
  const ii = r.interest_income, ie = r.interest_expense, prov = r.provisions, admin = r.admin_expenses, op = r.operating_result, tax = r.income_tax, net = r.net_income;
  const other = op - (ii - ie - prov - admin);
  const part = net - (op - tax);
  const per = (x: number) => (x / ii) * 100;
  return { k, ii, ie, prov, admin, other, op, tax, part, net, per: { ie: per(ie), prov: per(prov), admin: per(admin), other: per(other), op: per(op), tax: per(tax), net: per(net) } };
}
export type FlowKey = 'ii' | 'ie' | 'prov' | 'admin' | 'other' | 'op' | 'tax' | 'net';
export const flowRows: { id: string; key: FlowKey; label: string; sign: string; node: string | null }[] = [
  { id: 'ingresos', key: 'ii', label: 'Intereses que cobra el banco', sign: '', node: 'ingresos' },
  { id: 'gastos_int', key: 'ie', label: 'Intereses que paga', sign: '−', node: 'gastos_int' },
  { id: 'reserva', key: 'prov', label: 'Apartado por riesgo de crédito', sign: '−', node: 'reserva' },
  { id: 'admin', key: 'admin', label: 'Gastos de administración y promoción', sign: '−', node: 'admin' },
  { id: 'otros', key: 'other', label: 'Comisiones, intermediación y otros (neto)', sign: '±', node: 'otros' },
  { id: 'op', key: 'op', label: 'Resultado de la operación', sign: '=', node: null },
  { id: 'impuestos', key: 'tax', label: 'Impuestos', sign: '−', node: 'impuestos' },
  { id: 'utilidad', key: 'net', label: 'Utilidad neta', sign: '=', node: 'utilidad' },
];
/** Por cada 100 pesos de intereses cobrados. */
export const per100 = (f: Flow, key: FlowKey): number => (key === 'ii' ? 100 : f.per[key as keyof Flow['per']]);
export const f1 = (x: number) => x.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** Lo que más cambió frente al periodo anterior del mapa, por cada 100 pesos (cálculo propio). */
export function changes(k: PKey) {
  const p = prevOf(k);
  if (!p) return null;
  const a = flow(p), b = flow(k);
  const ids: FlowKey[] = ['ie', 'prov', 'admin', 'other', 'tax'];
  const rows = ids.map((key) => ({ key, label: flowRows.find((r) => r.key === key)!.label, from: a.per[key as keyof Flow['per']], to: b.per[key as keyof Flow['per']] }))
    .map((r) => ({ ...r, delta: r.to - r.from })).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  return { prev: p, net: { from: a.per.net, to: b.per.net }, top: rows.slice(0, 2) };
}
export const maxPartPer100 = Math.max(...periods.map((p) => Math.abs(flow(p.key).part / flow(p.key).ii) * 100));

// ---------- Piezas ----------
export const groups: { id: string; name: string }[] = map.groups;
export const kinds = map.kinds as Record<string, { label: string; help: string }>;
export const sources = map.sources as Record<string, { name: string; url: string; read: string }>;
export const nodes = map.nodes as any[];
export const edges = map.edges as any[];
export const nodeById = (id: string) => nodes.find((x) => x.id === id);

const ctx: any = {
  rs: latest.report_says, rs25: ann(2025).report_says, L: latest, y25: ann(2025),
  tx: T.elektra.tax, grp: T.compensation.group, emp: T.elektra.employees, st: T.structure.quarterly,
};
/** Rellena {ruta.a.cifra} con la cifra del archivo de datos. Siempre en positivo: el texto dice «subió» o «bajó». */
export function fill(text: string): string {
  return text.replace(/\{([A-Za-z0-9_.]+)\}/g, (_m, path: string) => {
    const v = path.split('.').reduce((o: any, key: string) => (o == null ? undefined : o[key]), ctx);
    if (v === undefined || v === null) throw new Error(`Falta la cifra {${path}} en el mapa.`);
    return typeof v === 'number' ? Math.abs(v).toLocaleString('es-MX', { maximumFractionDigits: 2 }) : String(v);
  });
}

const sumContrib = (r: any): number | null => (r && r.capital_contributions ? r.capital_contributions.reduce((s: number, x: any) => s + x.amount_mdp, 0) : null);
export const dividends2026: number = (latest.dividends_2026 as any[]).reduce((s, x) => s + x.amount, 0);
const dividendsOf = (k: PKey): number | null => (k === '2026' ? dividends2026 : (ann(Number(k))?.dividends ?? null));
const contributionsOf = (k: PKey): number | null => sumContrib(periodRow(k));

const series: Record<string, (k: PKey) => number | null> = {
  consumo: (k) => (k === '2026' ? latest.consumer_pct : ann(Number(k)).consumer_pct),
  ingresos: (k) => periodRow(k).interest_income,
  captacion: (k) => (k === '2026' ? latest.deposits : ann(Number(k)).deposits),
  gastos_int: (k) => periodRow(k).interest_expense,
  admin: (k) => periodRow(k).admin_expenses,
  otros: (k) => flow(k).other,
  utilidad: (k) => periodRow(k).net_income,
  reserva: (k) => periodRow(k).provisions,
  morosidad: (k) => (k === '2026' ? latest.imor_pct : ann(Number(k)).imor_pct),
  capital: (k) => (k === '2026' ? latest.icap_pct : ann(Number(k)).icap_pct),
  plantilla: (k) => (k === '2026' ? null : ann(Number(k)).employees_direct),
  puntos: (k) => (k === '2026' ? latest.contact_points : ann(Number(k)).contact_points),
  remuneracion: (k) => (k === '2025' ? T.compensation.group.amount_mdp : null),
  dividendos: dividendsOf,
  aportaciones: contributionsOf,
  impuestos: (k) => periodRow(k).income_tax,
};
const stock = new Set(['consumo', 'captacion', 'morosidad', 'capital', 'plantilla', 'puntos']);

export interface Shown { big: string; label: string; note: string }
const pct = (v: number) => `${v.toLocaleString('es-MX', { maximumFractionDigits: 2 })}%`;
const azPosts = (T.pay_postings as any[]).filter((p) => p.employer_id === 'azteca').map((p) => toMonthly(p.pay, p.period));
export const sueldosMediana = median(azPosts);
export const sueldosCuantas = azPosts.length;
const bankSub = (T.elektra.structure.subsidiaries as any[]).find((s) => String(s.name).startsWith('Banco Azteca, S.A.'));

/** Lo que muestra una pieza en un periodo. Las piezas «fijas» no cambian con el periodo. */
export function shown(id: string, k: PKey): Shown {
  const nd = nodeById(id);
  if (id === 'grupo') return { big: `${n(bankSub.pct)}%`, label: 'del banco es de Grupo Elektra', note: 'Según su página de estructura, al 31 de diciembre de 2024.' };
  if (id === 'sueldos') return { big: pesos(sueldosMediana), label: `al mes: mediana de ${sueldosCuantas} ofertas de cajero de Banco Azteca`, note: `Son ${n(timesMinWage(sueldosMediana, minWageDaily), 1)} veces el salario mínimo mensual (cálculo propio).` };
  if (id === 'adeudo') return { big: n(T.elektra.tax.total_mdp), label: 'millones de pesos, en parcialidades', note: 'Según Grupo Elektra, acuerdo del 29 de enero de 2026.' };
  const v = series[id](k);
  const when = stock.has(id) ? (k === '2026' ? 'al 30 de septiembre de 2026' : `al 31 de diciembre de ${k}`) : (k === '2026' ? 'de enero a septiembre de 2026' : `en ${k}`);
  if (v === null || v === undefined) {
    return { big: '—', label: '', note: id === 'plantilla' ? 'El banco publica esta cifra una vez al año, no en el reporte trimestral.' : id === 'remuneracion' ? 'Solo tenemos el total de 2025.' : 'No hay cifra para este periodo.' };
  }
  if (nd.zero && v === 0) return { big: 'Ninguna', label: 'mencionada en el reporte de ese periodo', note: '' };
  const big = nd.unit === 'pct' ? pct(v) : nd.unit === 'mdp1' ? n(v, 1) : n(v);
  return { big, label: nd.label ?? '', note: when.charAt(0).toUpperCase() + when.slice(1) + '.' };
}

// ---------- Cálculos propios ----------
const yearly: Record<string, (y: number) => number | null> = {
  icap: (y) => ann(y)?.icap_pct ?? null,
  dividends: (y) => ann(y)?.dividends ?? null,
  contributions: (y) => sumContrib(ann(y)),
  reserve_share: (y) => { const r = ann(y); return r ? (r.provisions / r.interest_income) * 100 : null; },
  imor: (y) => ann(y)?.imor_pct ?? null,
  consumer: (y) => ann(y)?.consumer_pct ?? null,
  employees: (y) => ann(y)?.employees_direct ?? null,
  admin: (y) => ann(y)?.admin_expenses ?? null,
};
const seriesLabel: Record<string, string> = {
  icap: 'el índice de capital', dividends: 'los dividendos', contributions: 'las aportaciones', reserve_share: 'lo apartado por riesgo (como parte de los ingresos por intereses)',
  imor: 'la morosidad', consumer: 'el peso del crédito al consumo', employees: 'el personal del banco', admin: 'los gastos de administración',
};
/** De un año al siguiente, ¿las dos cifras subieron o bajaron a la vez? Solo describe. */
export function comove(a: string, b: string) {
  const years = annual.map((r: any) => r.year as number).sort((x, y) => x - y);
  let same = 0, opp = 0, flat = 0, from: number | null = null, to: number | null = null;
  for (let i = 1; i < years.length; i++) {
    const y0 = years[i - 1], y1 = years[i];
    const a0 = yearly[a](y0), a1 = yearly[a](y1), b0 = yearly[b](y0), b1 = yearly[b](y1);
    if ([a0, a1, b0, b1].some((v) => v === null || v === undefined)) continue;
    if (from === null) from = y0;
    to = y1;
    const da = (a1 as number) - (a0 as number), db = (b1 as number) - (b0 as number);
    if (da === 0 || db === 0) { flat++; continue; }
    if ((da > 0) === (db > 0)) same++; else opp++;
  }
  return { same, opp, flat, total: same + opp, from, to };
}
export function comoveText(a: string, b: string): string {
  const c = comove(a, b);
  if (c.total === 0) return 'No hay años suficientes para comparar.';
  const flat = c.flat ? ` En ${c.flat} año${c.flat > 1 ? 's' : ''} una de las dos no cambió.` : '';
  return `Compara ${seriesLabel[a]} con ${seriesLabel[b]}, año con año, de ${c.from} a ${c.to}: de ${c.total} cambios, ${c.same} fueron en el mismo sentido y ${c.opp} al revés.${flat} Son pocos datos: no prueban que una cosa cause la otra.`;
}
export function ratioText(k: PKey): string {
  const d = dividendsOf(k), net = periodRow(k).net_income;
  if (d === null || !(net > 0)) return 'No hay cifras para este periodo.';
  return `Los dividendos fueron el ${n((d / net) * 100)}% de la utilidad neta del mismo periodo (${n(d)} ÷ ${n(net)}).`;
}
export function netFlowText(k: PKey): string {
  const d = dividendsOf(k), a = contributionsOf(k) ?? 0;
  if (d === null) return 'No hay cifras para este periodo.';
  if (a === 0) return `Salieron ${n(d)} millones en dividendos. El reporte de ese periodo no menciona aportaciones.`;
  const diff = d - a;
  const rest = diff > 0 ? `salieron ${n(diff)} más de los que entraron` : diff < 0 ? `entraron ${n(-diff)} más de los que salieron` : 'es igual';
  return `Salieron ${n(d)} millones en dividendos y entraron ${n(a)} en aportaciones: ${rest}.`;
}
export const ratioCaution = 'Un dividendo puede salir de utilidades de años anteriores. El cálculo no dice de cuáles salió.';

// ---------- Conexiones ----------
export const factsOf = (id: string) => (map.facts as any[]).filter((f) => f.node === id).map((f) => ({ text: fill(f.text), src: sources[f.src] }));
export function relationsOf(id: string) {
  const mine = edges.filter((e) => e.from === id || e.to === id);
  const partnerOf = (e: any) => (e.from === id ? e.to : e.from);
  const mk = (e: any) => ({ e, partner: nodeById(partnerOf(e)), incoming: e.to === id });
  const by = (kind: string) => mine.filter((e) => e.kind === kind).map(mk);
  return { identidad: by('identidad'), dice: by('dice'), calculo: by('calculo'), hueco: by('hueco') };
}
export const edgeSource = (e: any) => sources[e.src];
export const edgeText = (e: any) => fill(e.text);
/** Texto de un cálculo propio: por periodo (razón y neto) o fijo (se mueven juntas). */
export function calcText(e: any, k?: PKey): string {
  const c = e.calc;
  if (c.type === 'ratio') return ratioText(k as PKey);
  if (c.type === 'net') return netFlowText(k as PKey);
  return comoveText(c.a, c.b);
}
export const calcByPeriod = (e: any) => e.calc.type === 'ratio' || e.calc.type === 'net';
export const looked = (e: any) => (e.looked as string[]).map((s) => sources[s]);
export const inputs = (e: any) => (e.inputs as string[]).map((s) => sources[s]);
