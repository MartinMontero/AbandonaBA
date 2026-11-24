// Remesas de EE. UU. a México. Funciones puras; las pruebas usan tests/cambiate-vectors.json.
export type Funding = 'bank' | 'card' | 'cash';

/**
 * total: lo que gasta el remitente en USD (envío + comisión + impuesto).
 * R1 (supuesto, por confirmar): el impuesto de 1% se calcula sobre el envío sin la comisión.
 * R2 (supuesto): se compara contra un tipo de cambio de referencia con fecha (Banxico FIX).
 */
export function transfer(o: { total: number; fee: number; funding: Funding; rate: number; refRate: number; taxPct?: number }) {
  const taxPct = o.taxPct ?? 1;
  if (!(o.total > 0) || !(o.fee >= 0) || o.total <= o.fee || !(o.rate > 0) || !(o.refRate > 0)) return null;
  const sent = o.funding === 'cash' ? (o.total - o.fee) / (1 + taxPct / 100) : o.total - o.fee;
  const tax = o.funding === 'cash' ? sent * (taxPct / 100) : 0;
  const pesos = sent * o.rate;
  const refValue = o.total * o.refRate;
  // Lo que se pierde frente al tipo de cambio de referencia, en pesos: comisión + impuesto + diferencia en el tipo de cambio.
  const feePesos = o.fee * o.refRate;
  const taxPesos = tax * o.refRate;
  const marginPesos = sent * (o.refRate - o.rate);
  const lossPesos = refValue - pesos;
  return { sent, tax, pesos, refValue, costPct: (1 - pesos / refValue) * 100, feePesos, taxPesos, marginPesos, lossPesos };
}

/** Wise no puede depositar a las cuentas cuyos tres primeros dígitos de CLABE están en su lista de exclusión. */
export function wiseCanReceive(clabePrefix: string, excludedPrefixes: string[]): boolean {
  const p = clabePrefix.replace(/\D/g, '').slice(0, 3);
  if (p.length < 3) return true; // sin dato no se excluye; la página pide los 3 dígitos
  return !excludedPrefixes.includes(p);
}
