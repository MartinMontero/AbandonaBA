// Calculadora de liquidación. Funciones puras. Ver docs/ARCHITECTURE.md.
import valores from '../data/valores-2026.json';
import { vacationDaysForYear } from './tenure';

export type Zone = 'general' | 'frontera';
export type Method = 'A' | 'B';
export type VacationBasis = 'completos' | 'encurso';
export type FractionMode = 'completos' | 'proporcional';
export type CommissionPeriod = 'semana' | 'treinta';

export interface Values { minWageGeneral: number; minWageBorder: number; uma: number }
export function getValue(id: string): number {
  const v = (valores as { id: string; value: number }[]).find((x) => x.id === id);
  if (!v) throw new Error('valor desconocido: ' + id);
  return v.value;
}
export const defaultValues: Values = {
  minWageGeneral: getValue('minwage_general'),
  minWageBorder: getValue('minwage_border'),
  uma: getValue('uma_daily'),
};

export interface Inputs {
  weeklyBase: number;
  commissions: number; // monto según commissionPeriod
  commissionPeriod?: CommissionPeriod; // D4
  yearsCompleted: number; // n completos
  yearsProportional?: number; // n con fracción (>= completos)
  zone?: Zone;
  vacationBasis?: VacationBasis; // D3
  vacationDaysOverride?: number; // para vectores de prueba
  fractionMode?: FractionMode; // D5
  art439Days?: number; // D1: 120 | 121.6
  daysWorkedPerWeek?: number; // método B (D2)
  aguinaldoDays?: number;
  daysWorkedInYear?: number;
  wageDaysOwed?: number;
  vacationDaysOwed?: number;
}

export interface Step { label: string; formula: string; value: number; unit: string; article: string }
export type ExitId = 'renuncia' | 'art439' | 'art51' | 'art48';
export interface Exit { id: ExitId; label: string; article: string; indemnity: number; premium: number; total: number; formula: string; note: string }
export interface Scenario {
  method: Method; baseDaily: number; commissionDaily: number; vacationDays: number; sdi: number; cap: number; capped: boolean;
  nUsed: number; premium: number; exits: Record<ExitId, Exit>; steps: Step[]; isrExempt: number; isrExemptAlt: number;
}
export interface Finiquito { wages: number; aguinaldo: number; vacation: number; total: number }
export interface Result { A: Scenario; B: Scenario; finiquito: Finiquito; warnings: string[]; inputsClean: Inputs }

const MAX = 1e9;
function clean(x: unknown, warnings: string[], name: string): number {
  const n = typeof x === 'number' ? x : Number(x);
  if (!Number.isFinite(n) || n < 0) {
    if (x !== undefined && x !== '' && x !== null) warnings.push(`Valor no válido en «${name}»; se usó 0.`);
    return 0;
  }
  if (n > MAX) { warnings.push(`Valor demasiado grande en «${name}»; se limitó a ${MAX}.`); return MAX; }
  return n;
}

export function vacationDays(i: Pick<Inputs, 'yearsCompleted' | 'vacationBasis' | 'vacationDaysOverride'>): number {
  if (i.vacationDaysOverride !== undefined) return i.vacationDaysOverride;
  const n = Math.floor(i.yearsCompleted);
  return vacationDaysForYear(i.vacationBasis === 'encurso' ? n + 1 : Math.max(n, 1));
}

function scenario(i: Inputs, method: Method, v: Values): Scenario {
  const zone = i.zone ?? 'general';
  const dw = i.daysWorkedPerWeek && i.daysWorkedPerWeek > 0 ? Math.min(i.daysWorkedPerWeek, 7) : 6;
  const A = i.aguinaldoDays ?? getValue('aguinaldo_days');
  const period = i.commissionPeriod ?? 'semana';
  const baseDaily = i.weeklyBase / 7; // Art. 89 último párrafo: salario semanal entre siete
  let cd: number;
  if (period === 'semana') cd = method === 'A' ? i.commissions / 7 : i.commissions / dw;
  else cd = method === 'A' ? i.commissions / 30 : i.commissions / ((30 * dw) / 7);
  const V = vacationDays(i);
  const factor = 1 + A / 365 + (V * getValue('vacation_premium')) / 365;
  const sdi = (baseDaily + cd) * factor;
  const smin = zone === 'frontera' ? v.minWageBorder : v.minWageGeneral;
  const cap = getValue('seniority_cap_multiplier') * smin;
  const capped = sdi > cap;
  const mode = i.fractionMode ?? 'completos';
  const n = mode === 'proporcional' ? (i.yearsProportional ?? i.yearsCompleted) : Math.floor(i.yearsCompleted);
  const premium = getValue('seniority_days_per_year') * n * Math.min(sdi, cap);
  const d439 = i.art439Days ?? getValue('art439_days');
  const dpy = getValue('art439_days_per_year');
  const d48 = getValue('art48_days');
  const f = (x: number) => x.toFixed(2);
  const mk = (e: Omit<Exit, 'total'>): Exit => ({ ...e, total: e.indemnity + e.premium });
  const exits: Record<ExitId, Exit> = {
    renuncia: mk({ id: 'renuncia', label: 'Renuncia', article: 'Arts. 5, 33 y 162 fr. III', indemnity: 0, premium: n >= getValue('seniority_resign_years') ? premium : 0, formula: n >= 15 ? `prima = 12 × ${f(n)} × ${f(Math.min(sdi, cap))}` : 'sin indemnización; prima solo con 15 años o más', note: 'Solo el finiquito. Una renuncia firmada bajo presión puede cuestionarse (por confirmar).' }),
    art439: mk({ id: 'art439', label: 'Reducción por maquinaria nueva (Art. 439)', article: 'Arts. 439 y 162', indemnity: (d439 + dpy * n) * sdi, premium, formula: `(${d439} + ${dpy} × ${f(n)}) × ${f(sdi)} + prima`, note: 'Requiere convenio o autorización del Tribunal. Es el mínimo; un contrato puede mejorarlo.' }),
    art51: mk({ id: 'art51', label: 'Rescisión por culpa del patrón (Art. 51)', article: 'Arts. 51, 52, 50 y 162', indemnity: (d48 + dpy * n) * sdi, premium, formula: `(${d48} + ${dpy} × ${f(n)}) × ${f(sdi)} + prima`, note: 'Tú debes probar la causa. El plazo para separarte es corto: mira Mis plazos.' }),
    art48: mk({ id: 'art48', label: 'Despido injustificado (Art. 48)', article: 'Arts. 48, 50 y 162', indemnity: d48 * sdi, premium, formula: `${d48} × ${f(sdi)} + prima, más, según el juicio, salarios vencidos`, note: 'Si el patrón no prueba la causa, el Art. 48 suma salarios vencidos hasta por 12 meses. No se calculan aquí.' }),
  };
  const per = getValue('isr_exempt_umas_per_year');
  const steps: Step[] = [
    { label: 'Salario base diario', formula: `${f(i.weeklyBase)} ÷ 7`, value: baseDaily, unit: 'MXN/día', article: 'Art. 89, último párrafo' },
    { label: `Comisión diaria (método ${method})`, formula: period === 'semana' ? (method === 'A' ? `${f(i.commissions)} ÷ 7` : `${f(i.commissions)} ÷ ${dw}`) : (method === 'A' ? `${f(i.commissions)} ÷ 30` : `${f(i.commissions)} ÷ ${((30 * dw) / 7).toFixed(2)}`), value: cd, unit: 'MXN/día', article: 'Art. 89: promedio de 30 días efectivamente trabajados' },
    { label: 'Días de vacaciones (V)', formula: i.vacationDaysOverride !== undefined ? 'dato indicado' : i.vacationBasis === 'encurso' ? 'tabla, año en curso' : 'tabla, años completos', value: V, unit: 'días', article: 'Art. 76' },
    { label: 'Días de aguinaldo (A)', formula: 'mínimo legal', value: A, unit: 'días', article: 'Art. 87' },
    { label: 'Factor de integración', formula: `1 + ${A}/365 + ${V} × 0.25/365`, value: factor, unit: '', article: 'Arts. 80, 84, 87' },
    { label: 'Salario diario integrado (SDI)', formula: `(${f(baseDaily)} + ${f(cd)}) × ${factor.toFixed(6)}`, value: sdi, unit: 'MXN/día', article: 'Arts. 84 y 89' },
    { label: 'Tope para la prima de antigüedad', formula: `2 × ${f(smin)}`, value: cap, unit: 'MXN/día', article: 'Arts. 162 fr. II y 486' },
    { label: 'Años usados (n)', formula: mode === 'proporcional' ? 'con fracción' : 'solo completos', value: n, unit: 'años', article: 'Art. 162 (por confirmar)' },
    { label: 'Prima de antigüedad', formula: `12 × ${f(n)} × ${f(Math.min(sdi, cap))}`, value: premium, unit: 'MXN', article: 'Art. 162' },
    { label: 'Art. 439: indemnización', formula: `(${d439} + 20 × ${f(n)}) × ${f(sdi)}`, value: exits.art439.indemnity, unit: 'MXN', article: 'Art. 439' },
    { label: 'Art. 51: indemnización', formula: `(${d48} + 20 × ${f(n)}) × ${f(sdi)}`, value: exits.art51.indemnity, unit: 'MXN', article: 'Arts. 50 y 52' },
    { label: 'Art. 48: indemnización', formula: `${d48} × ${f(sdi)}`, value: exits.art48.indemnity, unit: 'MXN', article: 'Art. 48' },
  ];
  const completed = Math.floor(i.yearsCompleted);
  const fracPart = Math.max(0, (i.yearsProportional ?? completed) - completed);
  return { method, baseDaily, commissionDaily: cd, vacationDays: V, sdi, cap, capped, nUsed: n, premium, exits, steps, // LISR Art. 93 fr. XIII (leído): toda fracción de más de seis meses se considera año completo.
    isrExempt: per * v.uma * (completed + (fracPart > 0.5 ? 1 : 0)), isrExemptAlt: per * v.uma * completed };
}

export function calcular(input: Inputs, v: Values = defaultValues): Result {
  const warnings: string[] = [];
  const i: Inputs = {
    ...input,
    weeklyBase: clean(input.weeklyBase, warnings, 'sueldo base semanal'),
    commissions: clean(input.commissions, warnings, 'comisiones'),
    yearsCompleted: clean(input.yearsCompleted, warnings, 'años de servicio'),
    yearsProportional: input.yearsProportional === undefined ? undefined : clean(input.yearsProportional, warnings, 'años con fracción'),
  };
  if (i.yearsProportional !== undefined && i.yearsProportional < i.yearsCompleted) i.yearsProportional = i.yearsCompleted;
  const smin = (i.zone ?? 'general') === 'frontera' ? v.minWageBorder : v.minWageGeneral;
  const dw = i.daysWorkedPerWeek && i.daysWorkedPerWeek > 0 ? i.daysWorkedPerWeek : 6;
  if (i.weeklyBase > 0 && i.weeklyBase < smin * dw) warnings.push(`Tu sueldo base semanal parece menor al salario mínimo por ${dw} días (${(smin * dw).toFixed(2)}). Revisa el dato.`);
  if (i.weeklyBase === 0 && i.commissions === 0) warnings.push('Escribe tu sueldo base semanal para ver un resultado.');
  const A = scenario(i, 'A', v);
  const B = scenario(i, 'B', v);
  const aguinaldoDays = i.aguinaldoDays ?? getValue('aguinaldo_days');
  const base = i.weeklyBase / 7;
  const wages = clean(i.wageDaysOwed ?? 0, warnings, 'días de sueldo pendientes') * (base + A.commissionDaily);
  const aguinaldo = aguinaldoDays * base * (Math.min(clean(i.daysWorkedInYear ?? 0, warnings, 'días trabajados en el año'), 366) / 365);
  const vac = clean(i.vacationDaysOwed ?? 0, warnings, 'días de vacaciones pendientes') * base * (1 + getValue('vacation_premium'));
  return { A, B, finiquito: { wages, aguinaldo, vacation: vac, total: wages + aguinaldo + vac }, warnings, inputsClean: i };
}
