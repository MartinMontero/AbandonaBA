import { describe, it, expect } from 'vitest';
import map from '../src/data/mapa-conexiones.json';
import claims from '../src/data/claims-register.json';
import {
  periods, flow, flowRows, per100, changes, nodes, edges, groups, kinds, sources, fill, shown, comove, comoveText, relationsOf,
  factsOf, edgeText, calcText, periodRow, nodeById, maxPartPer100,
} from '../src/lib/mapa';

const KINDS = ['identidad', 'dice', 'calculo', 'hueco'];

describe('mapa de conexiones: estructura', () => {
  it('piezas con id único, grupo válido, nombre y definición cortos', () => {
    const ids = nodes.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const x of nodes) {
      expect(groups.map((g) => g.id), x.id).toContain(x.group);
      expect(x.name.length, x.id).toBeGreaterThan(3);
      expect(x.short.length, x.id).toBeLessThanOrEqual(26);
      expect(x.what.split(' ').length, x.id).toBeLessThanOrEqual(26);
      expect(x.more, x.id).toMatch(/^\/transparencia\//);
    }
  });
  it('cada conexión une piezas que existen y es de uno de los cuatro tipos', () => {
    const ids = new Set(nodes.map((x) => x.id));
    const eids = edges.map((e) => e.id);
    expect(new Set(eids).size).toBe(eids.length);
    for (const e of edges) {
      expect(KINDS, e.id).toContain(e.kind);
      expect(ids.has(e.from), `${e.id} from`).toBe(true);
      expect(ids.has(e.to), `${e.id} to`).toBe(true);
      expect(e.from, e.id).not.toBe(e.to);
    }
    expect(Object.keys(kinds).sort()).toEqual([...KINDS].sort());
  });
  it('lo que dice la empresa y lo que es una resta traen fuente https; los huecos dicen qué se revisó; los cálculos, sus datos', () => {
    for (const e of edges) {
      if (e.kind === 'identidad' || e.kind === 'dice') {
        expect(sources[e.src], e.id).toBeTruthy();
        expect(sources[e.src].url, e.id).toMatch(/^https:\/\//);
        expect(sources[e.src].read, e.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      if (e.kind === 'hueco') {
        expect(e.looked.length, e.id).toBeGreaterThan(0);
        for (const s of e.looked) expect(sources[s].url, e.id).toMatch(/^https:\/\//);
      }
      if (e.kind === 'calculo') {
        expect(e.inputs.length, e.id).toBeGreaterThan(0);
        for (const s of e.inputs) expect(sources[s].url, e.id).toMatch(/^https:\/\//);
        expect(['ratio', 'net', 'comove'], e.id).toContain(e.calc.type);
      }
    }
  });
  it('las restas llegan todas a la utilidad neta', () => {
    for (const e of edges.filter((x) => x.kind === 'identidad')) expect(e.to).toBe('utilidad');
    expect(edges.filter((x) => x.kind === 'identidad').map((x) => x.from).sort()).toEqual(['admin', 'gastos_int', 'impuestos', 'ingresos', 'otros', 'reserva']);
  });
  it('todas las fuentes del mapa apuntan a documentos con https', () => {
    for (const [k, s] of Object.entries(sources)) { expect(s.url, k).toMatch(/^https:\/\//); expect(s.read, k).toMatch(/^\d{4}-\d{2}-\d{2}$/); }
  });
  it('todos los textos se llenan con cifras del archivo de datos, sin huecos sin resolver', () => {
    for (const e of edges.filter((x) => x.text)) expect(edgeText(e), e.id).not.toMatch(/[{}]/);
    for (const x of nodes) for (const f of factsOf(x.id)) expect(f.text, x.id).not.toMatch(/[{}]/);
    expect(() => fill('{no.existe}')).toThrow();
  });
  it('el mapa no usa palabras cargadas ni afirma causas', () => {
    const banned = /(evasi[oó]n|evade|fraude|robo|abuso|culpa|ilegal|corrup|saque|ocult|escond|trampa)/i;
    const all = JSON.stringify(map);
    expect(all).not.toMatch(banned);
    for (const e of edges.filter((x) => x.kind === 'calculo')) {
      for (const p of periods) { const t = calcText(e, p.key); expect(t, e.id).not.toMatch(banned); }
    }
  });
  it('las citas entre comillas del mapa tienen menos de 15 palabras', () => {
    const all = JSON.stringify(map);
    for (const m of all.matchAll(/«([^»]+)»/g)) expect(m[1].split(/\s+/).length, m[1]).toBeLessThan(15);
  });
  it('cita su afirmación del registro y esa afirmación existe', () => {
    expect((claims as any[]).some((c) => c.id === map.claim)).toBe(true);
  });
});

describe('mapa de conexiones: dinero y cálculos', () => {
  it('cada renglón entre el margen y el resultado de la operación suma lo mismo que la resta', () => {
    for (const p of periods) {
      const r = periodRow(p.key);
      const f = flow(p.key);
      expect(r.other_items, p.key).toBeTruthy();
      const sum = Object.values(r.other_items as Record<string, number>).reduce((a, b) => a + b, 0);
      expect(sum, p.key).toBe(f.other);
    }
  });
  it('la utilidad neta es resultado de la operación menos impuestos más una participación mínima', () => {
    for (const p of periods) { const f = flow(p.key); expect(Math.abs(f.part), p.key).toBeLessThanOrEqual(10); expect(f.net).toBe(f.op - f.tax + f.part); }
    expect(maxPartPer100).toBeLessThan(0.05);
  });
  it('los cien pesos se reparten: lo que queda es la utilidad más impuestos', () => {
    for (const p of periods) {
      const f = flow(p.key);
      const left = 100 - f.per.ie - f.per.prov - f.per.admin + f.per.other;
      expect(left).toBeCloseTo(f.per.op, 6);
      expect(per100(f, 'ii')).toBe(100);
      expect(flowRows.length).toBe(8);
    }
  });
  it('lo que más cambió se calcula contra el periodo anterior y el primero no tiene comparación', () => {
    expect(changes('2022')).toBeNull();
    const c = changes('2026')!;
    expect(c.prev).toBe('2025');
    expect(c.top.length).toBe(2);
    expect(Math.abs(c.top[0].delta)).toBeGreaterThanOrEqual(Math.abs(c.top[1].delta));
  });
  it('cada pieza muestra algo en cada periodo, y el hueco se escribe como guion con su razón', () => {
    for (const x of nodes) for (const p of periods) {
      const s = shown(x.id, p.key);
      expect(s.big.length, `${x.id} ${p.key}`).toBeGreaterThan(0);
      if (s.big === '—') expect(s.note.length, `${x.id} ${p.key}`).toBeGreaterThan(0);
    }
    expect(shown('plantilla', '2026').big).toBe('—');
    expect(shown('aportaciones', '2022').big).toBe('Ninguna');
    expect(shown('aportaciones', '2025').big).toBe('6,050');
  });
  it('«se mueven juntas» cuenta años con cambio y nunca inventa más cambios de los que hay', () => {
    for (const e of edges.filter((x) => x.kind === 'calculo' && x.calc.type === 'comove')) {
      const c = comove(e.calc.a, e.calc.b);
      expect(c.same + c.opp, e.id).toBe(c.total);
      expect(c.total + c.flat, e.id).toBeLessThanOrEqual(4);
      expect(comoveText(e.calc.a, e.calc.b), e.id).toContain('Son pocos datos');
    }
  });
  it('las aportaciones y los dividendos coinciden con lo que dice cada reporte', () => {
    const sum = (k: any) => periodRow(k).capital_contributions.reduce((s: number, x: any) => s + x.amount_mdp, 0);
    expect([sum('2022'), sum('2023'), sum('2024'), sum('2025'), sum('2026')]).toEqual([0, 2350, 2250, 6050, 0]);
  });
  it('cada pieza tiene conexiones de al menos un tipo y nadie queda aislada', () => {
    for (const x of nodes) {
      const r = relationsOf(x.id);
      expect(r.identidad.length + r.dice.length + r.calculo.length + r.hueco.length, x.id).toBeGreaterThan(0);
    }
    expect(nodeById('utilidad')).toBeTruthy();
  });
});
