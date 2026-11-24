import { describe, it, expect } from 'vitest';
import { transfer } from '../src/lib/remesas';

const near = (a: number, b: number, tol = 0.01) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
describe('remesas: cuánto se pierde frente a la referencia', () => {
  it('desde cuenta: solo la comisión cuando el tipo de cambio es el de referencia', () => {
    const r = transfer({ total: 200, fee: 1.99, funding: 'bank', rate: 18, refRate: 18 })!;
    near(r.lossPesos, 35.82); near(r.feePesos, 35.82); near(r.taxPesos, 0); near(r.marginPesos, 0);
  });
  it('en efectivo: comisión más impuesto', () => {
    const r = transfer({ total: 200, fee: 1.99, funding: 'cash', rate: 18, refRate: 18 })!;
    near(r.lossPesos, 71.11); near(r.taxPesos, 35.29);
  });
  it('la pérdida es la suma de sus partes', () => {
    const r = transfer({ total: 300, fee: 4.5, funding: 'cash', rate: 17.6, refRate: 18.2 })!;
    near(r.lossPesos, r.feePesos + r.taxPesos + r.marginPesos, 1e-6);
    near(r.lossPesos, r.refValue - r.pesos, 1e-6);
  });
  it('un tipo de cambio mejor que el de referencia da diferencia a favor', () => {
    const r = transfer({ total: 200, fee: 0, funding: 'bank', rate: 18.5, refRate: 18 })!;
    expect(r.marginPesos).toBeLessThan(0);
  });
});
