// Protección de depósitos: el límite en pesos sale de las UDIS y del valor de la UDI de la fecha.
export const toMxn = (udis: number, udiValue: number): number => udis * udiValue;

/** Parte de tu dinero que cubre el seguro según el tipo de entidad. */
export type EntityKind = 'banco' | 'sofipo' | 'ifpe' | 'no-se';
export function insuredPart(amountMxn: number, kind: EntityKind, udiValue: number, limits: { ipabUdis: number; prosofipoUdis: number }) {
  if (!(amountMxn >= 0)) return { insured: 0, uninsured: 0, limit: 0, note: 'dato inválido' };
  if (kind === 'banco') { const limit = toMxn(limits.ipabUdis, udiValue); const insured = Math.min(amountMxn, limit); return { insured, uninsured: amountMxn - insured, limit, note: 'IPAB, por persona y por banco' }; }
  if (kind === 'sofipo') { const limit = toMxn(limits.prosofipoUdis, udiValue); const insured = Math.min(amountMxn, limit); return { insured, uninsured: amountMxn - insured, limit, note: 'Fondo de protección de SOFIPOs, solo si la SOFIPO está asociada' }; }
  if (kind === 'ifpe') return { insured: 0, uninsured: amountMxn, limit: 0, note: 'Las IFPE no tienen seguro del IPAB' };
  return { insured: 0, uninsured: amountMxn, limit: 0, note: 'Averigua si es banco, SOFIPO o IFPE antes de depositar' };
}
