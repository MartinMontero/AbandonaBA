import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import v from './transparencia-vectors.json';
import data from '../src/data/transparencia.json';
import valores from '../src/data/valores-2026.json';
import { yearsOfWork, monthsOfPay, toMonthly, timesMinWage, type Period } from '../src/lib/equivalencias';

const root = path.resolve(__dirname, '..');
const near = (a: number, b: number, tol = 0.01) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

describe('equivalencias: años de trabajo al salario mínimo', () => {
  for (const c of v.anios) it(c.id, () => near(yearsOfWork(c.mxn, c.daily), c.years));
  it('el salario mínimo de los vectores es el de valores-2026.json', () => {
    const g = (valores as any[]).find((x) => x.id === 'minwage_general').value;
    const b = (valores as any[]).find((x) => x.id === 'minwage_border').value;
    expect(v.anios.find((a) => a.id === 'mil-millones-general')!.daily).toBe(g);
    expect(v.anios.find((a) => a.id === 'mil-millones-frontera')!.daily).toBe(b);
  });
  for (const c of v.meses) it(c.id, () => near(monthsOfPay(c.mxn, c.monthly), c.months));
  for (const c of v.mensual) it(c.id, () => near(toMonthly(c.pay, c.period as Period), c.monthly));
  it('veces el salario mínimo', () => near(timesMinWage(315.04 * 30.4, 315.04), 1, 1e-9));
  it('entradas inválidas se rechazan con un mensaje claro', () => {
    expect(() => yearsOfWork(-1, 315.04)).toThrow();
    expect(() => yearsOfWork(1, 0)).toThrow();
    expect(() => monthsOfPay(1, 0)).toThrow();
    expect(() => toMonthly(NaN, 'mensual')).toThrow();
  });
  it('cantidades muy grandes no se rompen', () => expect(Number.isFinite(yearsOfWork(1e15, 315.04))).toBe(true));
});

describe('transparencia.json: cada cifra trae fuente, fecha, voz y etiqueta', () => {
  const items: { label: string; o: any }[] = [];
  const walk = (o: any, p: string) => {
    if (o && typeof o === 'object') {
      if ('source_url' in o || 'posting_url' in o) items.push({ label: p, o });
      for (const [k, val] of Object.entries(o)) walk(val, p + '.' + k);
    }
  };
  walk(data, 'transparencia');
  const voices = ['autoridad', 'tribunal', 'empresa', 'medio', 'calculo'];
  const statuses = ['verificado-primaria', 'verificado-secundaria', 'sin-verificar'];
  it('hay elementos con fuente', () => expect(items.length).toBeGreaterThan(15));
  it('cada uno tiene https, fecha, voz y etiqueta permitidas', () => {
    for (const { label, o } of items) {
      expect(o.source_url ?? o.posting_url, label).toMatch(/^https:\/\//);
      expect(o.read_date ?? o.seen_date ?? o.date, label).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(voices, label).toContain(o.voice);
      expect(statuses, label).toContain(o.status);
    }
  });
  it('lo que solo afirma una parte nunca tiene voz de tribunal sin una sentencia leída', () => {
    for (const { label, o } of items) if (o.voice === 'tribunal') expect(o.status, label).toBe('verificado-primaria');
  });
  it('los porcentajes de remuneración no se presentan como pesos', () => {
    expect((data as any).compensation.amounts_in_pesos).toBe(false);
    expect((data as any).compensation.base_stated).toBe(false);
  });
});

describe('reglas editoriales de Transparencia', () => {
  const files = ['src/pages/transparencia', 'src/components/Cifra.astro', 'src/components/TranspNote.astro', 'src/data/transparencia.json']
    .flatMap((f) => {
      const p = path.join(root, f);
      return fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((x) => path.join(p, x)) : [p];
    });
  const text = files.map((f) => ({ f, t: fs.readFileSync(f, 'utf-8') }));
  const banned = /\b(evasi[oó]n|evadi\w*|fraude\w*|lavado|robo|corrupci[oó]n|corrupt\w*)\b/i;
  it('no usa palabras de juicio en la voz del sitio', () => {
    for (const { f, t } of text) expect(t.match(banned)?.[0] ?? null, f).toBeNull();
  });
  it('cada página de Transparencia enlaza el método y la corrección', () => {
    for (const { f, t } of text.filter((x) => x.f.endsWith('.astro') && x.f.includes('pages'))) {
      if (f.endsWith('metodo.astro')) continue;
      expect(t, f).toContain('TranspNote');
    }
  });
  it('ninguna página de Transparencia escribe a mano pesos con símbolo', () => {
    for (const { f, t } of text.filter((x) => x.f.includes('pages'))) expect(/\$\s?\d/.test(t), f).toBe(false);
  });
});
