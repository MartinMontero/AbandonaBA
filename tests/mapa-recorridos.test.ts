import { describe, it, expect } from 'vitest';
import { latest } from '../src/lib/transparencia';
import {
  periods, splitOf, splitPrev, squares, bridge, ownersRows, ownersTotals, peopleRows, peopleChange, wageBars, quarterly, huecos, periodRow, flow, edges,
} from '../src/lib/mapa';

describe('recorridos del mapa: el reparto de cien pesos', () => {
  it('el método de cuadros siempre suma 100', () => {
    for (const p of [[33.3, 33.3, 33.4], [0.4, 0.4, 99.2], [12.5, 12.5, 12.5, 12.5, 50], [1.9, 0.8, 22.1, 9.2, 66.0]]) {
      expect(squares(p).reduce((a, b) => a + b, 0)).toBe(100);
    }
  });
  it('cada periodo y el mismo periodo de 2025 reparten cien cuadros y lo que queda coincide con la utilidad neta', () => {
    const all = [...periods.map((p) => ({ k: p.key as string, s: splitOf(p.key), r: periodRow(p.key) })), { k: 'prev', s: splitPrev(), r: latest.ytd_prev }];
    for (const { k, s, r } of all) {
      expect(s.segs.reduce((a, g) => a + g.sq, 0), k).toBe(100);
      expect(s.segs.reduce((a, g) => a + g.pct, 0), k).toBeCloseTo(100, 6);
      expect(Math.abs(s.left - r.net_income), k).toBeLessThanOrEqual(10);
      expect(s.segs[0].key, k).toBe('net');
      expect(s.netSq, k).toBeGreaterThan(0);
    }
  });
  it('los gastos de administración son la parte más grande en todos los periodos (lo que dice el titular del paso 2)', () => {
    for (const p of periods) {
      const s = splitOf(p.key);
      const big = [...s.segs].sort((a, b) => b.pct - a.pct)[0];
      expect(big.key, p.key).toBe('admin');
    }
  });
});

describe('recorridos del mapa: por qué bajó la utilidad', () => {
  const b = bridge();
  it('los dos estados de resultados suman exactamente el cambio de la utilidad', () => {
    const sum = b.items.reduce((s, i) => s + i.effect, 0);
    expect(sum + b.partChange).toBe(b.change);
    expect(b.start).toBe(latest.net_ytd_prev);
    expect(b.end).toBe(latest.net_ytd);
    expect(b.change).toBe(-2657);
  });
  it('cada cambio coincide con la variación que dice el propio reporte del 3T 2026', () => {
    const rs = latest.report_says;
    const e = (id: string) => b.items.find((i) => i.id === id)!.effect;
    expect(e('ii')).toBe(rs.interest_income_delta);
    expect(e('ie')).toBe(-rs.interest_expense_delta);
    expect(e('prov')).toBe(-rs.provisions_delta);
    expect(e('admin')).toBe(-rs.admin_delta);
    expect(e('trading')).toBe(-rs.trading_delta);
    expect(e('other')).toBe(-rs.other_delta);
  });
  it('va ordenado por tamaño y el mayor cambio es el que dice el titular', () => {
    const abs = b.items.map((i) => Math.abs(i.effect));
    expect([...abs].sort((x, y) => y - x)).toEqual(abs);
    expect(b.items[0].id).toBe('other');
    expect(b.maxAbs).toBe(abs[0]);
  });
  it('la utilidad de cada trimestre trae su pérdida', () => {
    expect(quarterly.length).toBeGreaterThanOrEqual(5);
    expect(quarterly.filter((q) => q.value < 0).length).toBe(1);
  });
});

describe('recorridos del mapa: dueños y personas', () => {
  it('dividendos y aportaciones de cada periodo suman los totales del titular', () => {
    const t = ownersTotals();
    expect(t.div).toBe(13660);
    expect(t.contrib).toBe(10650);
    expect(t.diff).toBe(3010);
    expect(ownersRows().filter((r) => r.ratio !== null && r.ratio > 100).length).toBe(2);
  });
  it('el personal y los gastos de administración parten de 100 en 2022', () => {
    const r = peopleRows();
    expect(r[0].empIdx).toBe(100);
    expect(r[0].admIdx).toBe(100);
    const c = peopleChange();
    expect(c.empAbs).toBe(r[0].employees - r[r.length - 1].employees);
    expect(c.empPct).toBeLessThan(0);
    expect(c.admPct).toBeGreaterThan(0);
  });
  it('las barras de sueldos traen mínimo, promedio nacional y mediana de ofertas', () => {
    const w = wageBars();
    expect(w.map((x) => x.id)).toEqual(['min', 'avg', 'med']);
    for (const x of w) expect(x.value).toBeGreaterThan(0);
  });
  it('los huecos que se muestran en los pasos existen en el mapa', () => {
    const ids = huecos().map((e) => e.id);
    for (const id of ['h_div_grupo', 'h_admin_plan', 'h_sueldos_plan', 'h_remun_plan']) expect(ids).toContain(id);
    for (const id of ['d_consumo', 'd_captacion', 'd_moroso']) expect(edges.some((e) => e.id === id)).toBe(true);
  });
  it('el resultado de la operación de enero a septiembre de 2025 sale de su propio estado', () => {
    const p = latest.ytd_prev;
    expect(p.statement_url).toMatch(/^https:\/\//);
    expect(p.operating_result).toBe(5975);
    expect(Object.values(p.other_items as Record<string, number>).reduce((a, c) => a + c, 0)).toBe(p.operating_result - (p.interest_income - p.interest_expense - p.provisions - p.admin_expenses));
    expect(flow('2026').ii).toBe(latest.ytd.interest_income);
  });
});
