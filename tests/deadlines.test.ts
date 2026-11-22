import { describe, it, expect } from 'vitest';
import { addMonths, addDays, computeDeadlines } from '../src/lib/deadlines';
import { buildIcs } from '../src/lib/ics';
import { parseDate } from '../src/lib/tenure';
import { fmtMXN, fmtNum } from '../src/lib/format';

const d = (s: string) => parseDate(s)!;
const iso = (x: Date) => x.toISOString().slice(0, 10);

describe('addMonths', () => {
  it('fin de mes: 31 de diciembre + 2 meses = 28 de febrero', () => { expect(iso(addMonths(d('2026-12-31'), 2))).toBe('2027-02-28'); });
  it('fin de mes bisiesto: 31 de diciembre de 2027 + 2 meses = 29 de febrero de 2028', () => { expect(iso(addMonths(d('2027-12-31'), 2))).toBe('2028-02-29'); });
  it('29 de febrero + 12 meses = 28 de febrero', () => { expect(iso(addMonths(d('2028-02-29'), 12))).toBe('2029-02-28'); });
  it('cruza el año', () => { expect(iso(addMonths(d('2026-11-30'), 2))).toBe('2027-01-30'); });
  it('addDays cruza febrero bisiesto', () => { expect(iso(addDays(d('2028-02-28'), 2))).toBe('2028-03-01'); });
});
describe('computeDeadlines', () => {
  it('despido: dos meses', () => { const r = computeDeadlines(d('2026-12-15'), 'despido'); expect(iso(r.find((x) => x.id === 'art518')!.date!)).toBe('2027-02-15'); });
  it('rescisión: muestra la fecha más temprana (30 días vs un mes)', () => {
    const r = computeDeadlines(d('2026-01-31'), 'rescision'); const x = r.find((y) => y.id === 'art517')!;
    expect(iso(x.date!)).toBe('2026-02-28'); // un mes = 28 feb; 30 días = 2 mar
  });
  it('afore: día 46', () => { const r = computeDeadlines(d('2026-12-01'), 'despido'); expect(iso(r.find((x) => x.id === 'afore')!.date!)).toBe('2027-01-15'); });
  it('renuncia no trae plazo de despido', () => { expect(computeDeadlines(d('2026-12-01'), 'renuncia').some((x) => x.id === 'art518')).toBe(false); });
});
describe('ics', () => {
  it('estructura básica', () => {
    const s = buildIcs([{ uid: 'a', date: d('2027-02-15'), summary: 'Plazo, importante; prueba' }], new Date('2026-11-22T00:00:00Z'));
    expect(s).toMatch(/^BEGIN:VCALENDAR\r\n/); expect(s).toContain('DTSTART;VALUE=DATE:20270215'); expect(s).toContain('DTEND;VALUE=DATE:20270216');
    expect(s).toContain('SUMMARY:Plazo\\, importante\\; prueba'); expect(s.trim().endsWith('END:VCALENDAR')).toBe(true);
  });
});
describe('format', () => {
  it('es-MX', () => { expect(fmtMXN(131017.285)).toMatch(/131,017\.2[89]/); expect(fmtNum(1234.5)).toBe('1,234.50'); expect(fmtMXN(NaN)).toBe('—'); });
});
