// Ahorro: interés anual simple, antes de impuestos (R3: se muestra antes de la retención de ISR).

/** Interés anual con tasa alta hasta un tope y tasa base sobre el resto. La tasa alta solo cuenta si cumples las condiciones. */
export function blendedInterest(o: { amount: number; rateHiPct: number; capMxn: number; rateBasePct: number; conditionsMet: boolean }) {
  const M = Math.max(0, o.amount);
  const hi = o.conditionsMet ? Math.min(M, Math.max(0, o.capMxn)) : 0;
  const rest = M - hi;
  const interest = (hi * o.rateHiPct + rest * o.rateBasePct) / 100;
  return { interest, blendedPct: M > 0 ? (interest / M) * 100 : 0 };
}

export const simpleInterest = (amount: number, ratePct: number) => (Math.max(0, amount) * ratePct) / 100;

/** Comisión mensual de la Cuenta Operativa con IVA, o 0 si se cumple alguna exención publicada. */
export function operativaFee(o: { balance: number; payroll: boolean; termInvestment: boolean; feeMxn: number; ivaPct: number; exemptBalance: number }) {
  const exempt = o.balance >= o.exemptBalance || o.payroll || o.termInvestment;
  const monthly = exempt ? 0 : o.feeMxn * (1 + o.ivaPct / 100);
  return { exempt, monthly, yearly: monthly * 12, shareOfBalance: o.balance > 0 ? monthly / o.balance : null };
}

/** Lo que falta por pagar de un préstamo con pago semanal. */
export const loanRemaining = (weeklyPayment: number, weeksLeft: number) => Math.max(0, weeklyPayment) * Math.max(0, weeksLeft);

/** Tramos de una oferta: `upto` es el tope acumulado del tramo (null = sin tope). Interés anual simple, antes de impuestos. */
export interface Band { upto: number | null; rate: number }
export function bandsInterest(amount: number, bands: Band[]): number {
  let left = Math.max(0, amount);
  let from = 0;
  let total = 0;
  for (const b of bands) {
    if (left <= 0) break;
    const size = b.upto === null ? left : Math.max(0, Math.min(left, b.upto - from));
    total += (size * b.rate) / 100;
    left -= size;
    if (b.upto !== null) from = b.upto;
  }
  return total;
}
