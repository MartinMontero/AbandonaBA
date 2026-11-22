import { describe, it, expect } from 'vitest';
import vec from './vectors.json';
import { calcular, vacationDays } from '../src/lib/calc';
import { tenureBetween, parseDate, vacationDaysForYear } from '../src/lib/tenure';

function pick(r: ReturnType<typeof calcular>, m: 'A' | 'B') {
  const s = r[m];
  return { sdi: s.sdi, art439: s.exits.art439.total, art51: s.exits.art51.total, art48: s.exits.art48.total, premium: s.premium, isrExempt: s.isrExempt, cap: s.cap } as Record<string, number>;
}
describe('vectores', () => {
  for (const v of vec.vectors) {
    it(v.id + ': ' + v.label, () => {
      const r = calcular({ ...(vec.base as any), ...(v.input as any) });
      const got = pick(r, v.method as 'A' | 'B');
      for (const [k, e] of Object.entries(v.expect)) expect(Math.abs(got[k] - (e as number))).toBeLessThanOrEqual(vec.tolerance);
    });
  }
});
describe('bordes', () => {
  const base = { weeklyBase: 2205.28, commissions: 0, yearsCompleted: 5 };
  it('sin comisiones: A == B', () => { const r = calcular(base); expect(r.A.sdi).toBeCloseTo(r.B.sdi, 6); });
  it('solo comisiones', () => { expect(calcular({ weeklyBase: 0, commissions: 1000, yearsCompleted: 3 }).A.sdi).toBeGreaterThan(0); });
  it('n<1: sin prima con años completos', () => { expect(calcular({ ...base, yearsCompleted: 0, yearsProportional: 0.6 }).A.premium).toBe(0); });
  it('n<1 proporcional: prima > 0', () => { expect(calcular({ ...base, yearsCompleted: 0, yearsProportional: 0.6, fractionMode: 'proporcional' }).A.premium).toBeGreaterThan(0); });
  it('renuncia con 15+ años paga prima; con 14 no', () => {
    expect(calcular({ ...base, yearsCompleted: 15 }).A.exits.renuncia.total).toBeGreaterThan(0);
    expect(calcular({ ...base, yearsCompleted: 14 }).A.exits.renuncia.total).toBe(0);
  });
  it('tope en frontera = 2 × 440.87', () => { expect(calcular({ ...base, zone: 'frontera' }).A.cap).toBeCloseTo(881.74, 2); });
  it('SDI sobre el tope se limita', () => { const r = calcular({ weeklyBase: 20000, commissions: 5000, yearsCompleted: 5 }); expect(r.A.capped).toBe(true); expect(r.A.premium).toBeCloseTo(12 * 5 * r.A.cap, 6); });
  it('entradas negativas, vacías y NaN', () => {
    const r = calcular({ weeklyBase: -5, commissions: NaN, yearsCompleted: '' as any });
    expect(Number.isFinite(r.A.sdi)).toBe(true); expect(r.warnings.length).toBeGreaterThan(0);
  });
  it('entradas enormes se limitan', () => { expect(Number.isFinite(calcular({ weeklyBase: 1e300, commissions: 1e300, yearsCompleted: 1e300 }).A.exits.art439.total)).toBe(true); });
  it('D1 cambia el resultado', () => { expect(calcular({ ...base, art439Days: 121.6 }).A.exits.art439.total).toBeGreaterThan(calcular(base).A.exits.art439.total); });
  it('D3: año en curso usa V(n+1)', () => { expect(vacationDays({ yearsCompleted: 5, vacationBasis: 'completos' })).toBe(20); expect(vacationDays({ yearsCompleted: 5, vacationBasis: 'encurso' })).toBe(22); });
  it('D4: 30 días da otro resultado que semanal', () => { const a = calcular({ ...base, commissions: 900 }); const b = calcular({ ...base, commissions: 900, commissionPeriod: 'treinta' }); expect(a.A.sdi).not.toBeCloseTo(b.A.sdi, 2); });
  it('D5: fracción proporcional sube la prima', () => { const a = calcular({ ...base, yearsProportional: 5.7 }); const b = calcular({ ...base, yearsProportional: 5.7, fractionMode: 'proporcional' }); expect(b.A.premium).toBeGreaterThan(a.A.premium); });
  it('advertencia de sueldo bajo', () => { expect(calcular({ ...base, weeklyBase: 1740 }).warnings.join()).toMatch(/menor al salario mínimo/); });
  it('semana mínima 315.04 × 6', () => { expect(315.04 * 6).toBeCloseTo(1890.24, 2); });
});
describe('antigüedad y vacaciones', () => {
  it('tabla Art. 76', () => { expect([1, 2, 3, 4, 5, 6, 10, 11, 15, 16].map(vacationDaysForYear)).toEqual([12, 14, 16, 18, 20, 22, 22, 24, 24, 26]); });
  it('fechas: años completos y bisiestos', () => {
    // Convención: el aniversario de un 29 de febrero cae el 28 de febrero en años no bisiestos.
    expect(tenureBetween(parseDate('2020-02-29')!, parseDate('2025-02-27')!).completed).toBe(4);
    expect(tenureBetween(parseDate('2020-02-29')!, parseDate('2025-02-28')!).completed).toBe(5);
  });
  it('fecha inválida', () => { expect(parseDate('2025-02-30')).toBeNull(); });
});
