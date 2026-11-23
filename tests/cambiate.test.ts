import { describe, it, expect } from 'vitest';
import v from './cambiate-vectors.json';
import m from './matcher-cases.json';
import data from '../src/data/cambiate.json';
import { toMxn, insuredPart } from '../src/lib/udi';
import { blendedInterest, simpleInterest, operativaFee, loanRemaining, bandsInterest } from '../src/lib/savings';
import { transfer, wiseCanReceive } from '../src/lib/remesas';
import { gapPesosPerYear, sieforeForBirthYear } from '../src/lib/afore';
import { match } from '../src/lib/matcher';

const near = (a: number, b: number, tol = 0.01) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

describe('protección de depósitos', () => {
  for (const p of v.proteccion) it(p.id, () => near(toMxn(p.udis, v.udi), p.mxn));
  it('por tipo de entidad', () => {
    const lim = { ipabUdis: 400000, prosofipoUdis: 25000 };
    expect(insuredPart(5_000_000, 'banco', v.udi, lim).uninsured).toBeGreaterThan(0);
    expect(insuredPart(100, 'ifpe', v.udi, lim).insured).toBe(0);
    expect(insuredPart(100, 'no-se', v.udi, lim).insured).toBe(0);
    near(insuredPart(300000, 'sofipo', v.udi, lim).insured, 223195.68);
  });
});

describe('ahorro', () => {
  for (const c of v.ahorro) it(c.id, () => {
    if ('conditionsMet' in c) {
      const r = blendedInterest(c as any);
      near(r.interest, c.interest);
      if ('blendedPct' in c) near(r.blendedPct, (c as any).blendedPct, 0.0001);
    } else near(simpleInterest((c as any).amount, (c as any).ratePct), c.interest);
  });
  it('entradas inválidas no rompen', () => {
    expect(blendedInterest({ amount: -5, rateHiPct: 13, capMxn: 1, rateBasePct: 1, conditionsMet: true }).interest).toBe(0);
    expect(blendedInterest({ amount: 0, rateHiPct: 13, capMxn: 1, rateBasePct: 1, conditionsMet: true }).blendedPct).toBe(0);
  });
});

describe('ahorro por tramos (ofertas publicadas)', () => {
  for (const c of (v as any).tramos) it(c.id, () => near(bandsInterest(c.amount, c.bands), c.interest));
  it('tramos vacíos o montos negativos dan cero', () => { expect(bandsInterest(100, [])).toBe(0); expect(bandsInterest(-5, [{ upto: null, rate: 5 }])).toBe(0); });
});

describe('Cuenta Operativa', () => {
  const op = data.institutions[0].products.find((p: any) => p.id === 'cuenta-operativa') as any;
  for (const c of v.operativa) it(c.id, () => {
    const r = operativaFee({ balance: c.balance, payroll: c.payroll, termInvestment: c.termInvestment, feeMxn: op.fee_admin_mxn, ivaPct: 16, exemptBalance: 10000 });
    near(r.monthly, c.monthly);
    if ('yearly' in c) near(r.yearly, (c as any).yearly);
    if ('share' in c) near(r.shareOfBalance as number, (c as any).share, 0.0001);
  });
});

describe('remesas', () => {
  for (const c of v.remesas) it(c.id, () => {
    const r = transfer({ total: c.total, fee: c.fee, funding: c.funding as any, rate: c.rate, refRate: c.refRate })!;
    near(r.sent, c.sent, 0.0001);
    near(r.pesos, c.pesos);
    near(r.costPct, c.costPct, 0.001);
  });
  it('entradas inválidas', () => {
    expect(transfer({ total: 0, fee: 1, funding: 'bank', rate: 18, refRate: 18 })).toBeNull();
    expect(transfer({ total: 1, fee: 5, funding: 'bank', rate: 18, refRate: 18 })).toBeNull();
    expect(transfer({ total: 100, fee: 1, funding: 'bank', rate: 0, refRate: 18 })).toBeNull();
  });
  const wise = data.remittance_providers.find((p) => p.id === 'wise') as any;
  const prefixes = wise.excluded.map((e: any) => e.clabe_prefix).filter(Boolean);
  for (const c of v.wise) it(`Wise y CLABE «${c.clabe}»`, () => expect(wiseCanReceive(c.clabe, prefixes)).toBe(c.puede));
  it('la lista de exclusión de Wise incluye 127, 137 y 677', () => expect(prefixes).toEqual(expect.arrayContaining(['127', '137', '677'])));
});

describe('Afore y crédito', () => {
  for (const c of v.afore) it('brecha en pesos', () => near(gapPesosPerYear(c.balance, c.gap), c.pesos));
  for (const c of v.siefore) it(`siefore ${c.year}`, () => expect(sieforeForBirthYear(c.year)).toBe(c.es));
  for (const c of v.credito) it('lo que falta por pagar', () => near(loanRemaining(c.weekly, c.weeks), c.restante));
});

describe('selector de necesidades (datos de prueba)', () => {
  for (const c of m.casos) it(c.id, () => {
    const r = match(c.a as any, m.candidatos as any, m.udi);
    expect(r.ids).toEqual(c.ids);
    for (const id of c.excluidos) expect(r.excluded.map((e) => e.id)).toContain(id);
  });
  it('sin datos verificados no adivina', () => {
    const t = m.todos_vencidos_o_sin_verificar;
    const r = match(t.a as any, t.candidatos as any, m.udi);
    expect(r.ids).toEqual([]);
    expect(r.message).toBe(t.mensaje);
  });
  it('el orden es alfabético, nunca por destacado', () => {
    const r = match({ smartphone: 'si', wantsPayrollMove: false, savingsMxn: 1 }, [...(m.candidatos as any)].reverse(), m.udi);
    expect(r.ids).toEqual([...r.ids].sort());
  });
});

describe('selector: orden por pesos y datos nulos', () => {
  it('orden por pesos al año, empates alfabéticos', () => {
    const c = (id: string, score: number) => ({ id, type: 'banco' as const, appOnly: false, acceptsPortabilidad: true, verified: true, stale: false, protectedUdis: 400000, score });
    const r = match({ smartphone: 'si', wantsPayrollMove: false, savingsMxn: 100 }, [c('b', 50), c('a', 50), c('c', 90), c('d', 10)], 8.9);
    expect(r.ids).toEqual(['c', 'a', 'b']);
    expect(r.eligible).toEqual(['c', 'a', 'b', 'd']);
  });
  it('sin puntaje se ordena alfabéticamente', () => {
    const c = (id: string) => ({ id, type: 'banco' as const, appOnly: false, acceptsPortabilidad: true, verified: true, stale: false, protectedUdis: 400000 });
    expect(match({ smartphone: 'si', wantsPayrollMove: false, savingsMxn: 0 }, [c('z'), c('m'), c('a')], 8.9).ids).toEqual(['a', 'm', 'z']);
  });
  it('un null solo excluye cuando la regla lo necesita', () => {
    const n = { id: 'n', type: 'banco' as const, appOnly: null, acceptsPortabilidad: null, verified: true, stale: false, protectedUdis: null };
    expect(match({ smartphone: 'si', wantsPayrollMove: false, savingsMxn: 0 }, [n], 8.9).ids).toEqual(['n']);
    expect(match({ smartphone: 'no', wantsPayrollMove: false, savingsMxn: 0 }, [n], 8.9).ids).toEqual([]);
    expect(match({ smartphone: 'si', wantsPayrollMove: true, savingsMxn: 0 }, [n], 8.9).ids).toEqual([]);
  });
});

describe('banderas de canal y portabilidad en los datos', () => {
  it('cada institución trae ambas, con fuente, fecha y herramienta', () => {
    for (const i of data.institutions as any[]) {
      for (const k of ['channels', 'payroll_portability']) {
        expect(i[k], `${i.id}.${k}`).toBeTruthy();
        expect(i[k].source_url).toMatch(/^https:\/\//);
        expect(i[k].read_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(i[k].tool).toBeTruthy();
        expect(['verificado-primaria', 'verificado-secundaria', 'sin-verificar']).toContain(i[k].status);
      }
    }
  });
  it('un valor null solo aparece con etiqueta sin-verificar', () => {
    for (const i of data.institutions as any[]) {
      if (i.channels.app_required === null) expect(i.channels.status).toBe('sin-verificar');
      if (i.payroll_portability.accepts === null) expect(i.payroll_portability.status).toBe('sin-verificar');
    }
  });
});

describe('datos de Cámbiate', () => {
  const flat: { label: string; status: string; source_url?: string; read_date?: string; tool?: string }[] = [];
  const walk = (o: any, path: string) => {
    if (o && typeof o === 'object') {
      if ('status' in o && 'source_url' in o) flat.push({ label: path, status: o.status, source_url: o.source_url, read_date: o.read_date, tool: o.tool });
      for (const [k, val] of Object.entries(o)) walk(val, path + '.' + k);
    }
  };
  walk(data, 'cambiate');
  it('hay valores con etiqueta', () => expect(flat.length).toBeGreaterThan(8));
  it('cada valor con etiqueta trae fuente, fecha de lectura y herramienta', () => {
    for (const f of flat) { expect(f.source_url, f.label).toMatch(/^https:\/\//); expect(f.read_date, f.label).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(f.tool, f.label).toBeTruthy(); }
  });
  it('las etiquetas son de las tres permitidas', () => {
    for (const f of flat) expect(['verificado-primaria', 'verificado-secundaria', 'sin-verificar'], f.label).toContain(f.status);
  });
  it('ningún teléfono sin fuente ni fecha', () => {
    for (const i of data.institutions) for (const c of i.official_contact ?? []) { expect(c.source_url).toMatch(/^https:\/\//); expect(c.read_date).toBeTruthy(); }
  });
});
