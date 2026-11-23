// Selector de necesidades: reglas puras. No se publica una página que recomiende instituciones hasta que haya
// datos verificados suficientes; hoy se prueba con datos de prueba (tests/matcher-cases.json).
export interface Answers {
  smartphone: 'si' | 'a-veces' | 'no';
  wantsPayrollMove: boolean;
  savingsMxn: number;
}
export interface Candidate {
  id: string;
  type: 'banco' | 'sofipo' | 'ifpe';
  appOnly: boolean;
  acceptsPortabilidad: boolean;
  verified: boolean; // todos los campos de los que depende la regla están verificados
  stale: boolean; // vencido por la regla de antigüedad
  protectedUdis: number | null;
}
export interface MatchResult { ids: string[]; excluded: { id: string; why: string }[]; message: string | null }

export function match(a: Answers, cands: Candidate[], udiValue: number, sofipoLimitUdis = 25000): MatchResult {
  const excluded: { id: string; why: string }[] = [];
  const keep: Candidate[] = [];
  for (const c of cands) {
    if (!c.verified) { excluded.push({ id: c.id, why: 'datos sin verificar' }); continue; }
    if (c.stale) { excluded.push({ id: c.id, why: 'vencido' }); continue; }
    if (a.smartphone === 'no' && c.appOnly) { excluded.push({ id: c.id, why: 'solo funciona con app' }); continue; }
    if (a.wantsPayrollMove && !c.acceptsPortabilidad) { excluded.push({ id: c.id, why: 'no recibe portabilidad de nómina' }); continue; }
    if (c.type === 'sofipo' && a.savingsMxn > sofipoLimitUdis * udiValue) { excluded.push({ id: c.id, why: 'tu ahorro pasa del límite de protección de una SOFIPO' }); continue; }
    keep.push(c);
  }
  // Empates y orden: alfabético, nunca por destacado.
  const ids = keep.map((c) => c.id).sort((x, y) => x.localeCompare(y, 'es')).slice(0, 3);
  return { ids, excluded, message: ids.length === 0 ? 'No hay suficientes datos verificados para sugerirte una opción.' : null };
}
