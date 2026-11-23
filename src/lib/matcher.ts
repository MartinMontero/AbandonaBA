// Selector de necesidades: reglas puras. Un dato sin verificar (null) en un campo del que depende una regla excluye la opción.
export interface Answers {
  smartphone: 'si' | 'a-veces' | 'no';
  wantsPayrollMove: boolean;
  savingsMxn: number;
}
export interface Candidate {
  id: string;
  type: 'banco' | 'sofipo' | 'ifpe';
  appOnly: boolean | null; // true: exige la app; false: hay otra forma (sucursal); null: sin verificar
  acceptsPortabilidad: boolean | null; // true: la recibe; false: todavía no; null: sin verificar
  verified: boolean; // los demás campos de la ficha están verificados
  stale: boolean; // vencido por la regla de antigüedad
  protectedUdis: number | null;
  score?: number; // pesos al año con la cantidad de la persona (opcional); orden descendente
}
export interface MatchResult { ids: string[]; excluded: { id: string; why: string }[]; eligible: string[]; message: string | null }

export function match(a: Answers, cands: Candidate[], udiValue: number, sofipoLimitUdis = 25000): MatchResult {
  const excluded: { id: string; why: string }[] = [];
  const keep: Candidate[] = [];
  for (const c of cands) {
    if (!c.verified) { excluded.push({ id: c.id, why: 'datos sin verificar' }); continue; }
    if (c.stale) { excluded.push({ id: c.id, why: 'vencido' }); continue; }
    if (a.smartphone === 'no') {
      if (c.appOnly === true) { excluded.push({ id: c.id, why: 'solo funciona con app' }); continue; }
      if (c.appOnly === null) { excluded.push({ id: c.id, why: 'no sabemos si exige la app' }); continue; }
    }
    if (a.wantsPayrollMove) {
      if (c.acceptsPortabilidad === false) { excluded.push({ id: c.id, why: 'todavía no recibe portabilidad de nómina' }); continue; }
      if (c.acceptsPortabilidad === null) { excluded.push({ id: c.id, why: 'no dice si recibe portabilidad de nómina' }); continue; }
    }
    if (c.type === 'sofipo' && a.savingsMxn > sofipoLimitUdis * udiValue) { excluded.push({ id: c.id, why: 'tu ahorro pasa del límite de protección de una SOFIPO' }); continue; }
    keep.push(c);
  }
  // Orden: más pesos al año con tu cantidad (si hay), y los empates por orden alfabético. Nunca por destacado.
  const sorted = [...keep].sort((x, y) => (y.score ?? 0) - (x.score ?? 0) || x.id.localeCompare(y.id, 'es'));
  const eligible = sorted.map((c) => c.id);
  const ids = eligible.slice(0, 3);
  return { ids, excluded, eligible, message: ids.length === 0 ? 'No hay suficientes datos verificados para sugerirte una opción.' : null };
}
