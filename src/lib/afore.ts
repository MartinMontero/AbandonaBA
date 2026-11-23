// Afore. Aún no hay página pública que use esto: los rendimientos de CONSAR no se pudieron leer completos el 2026-11-23.
// El mapa de años de nacimiento a SIEFORE es el de la investigación y está sin verificar contra CONSAR.
export const gapPesosPerYear = (balance: number, gapPoints: number) => (Math.max(0, balance) * gapPoints) / 100;

export function sieforeForBirthYear(year: number): string {
  if (year >= 2000) return 'SB Inicial';
  if (year >= 1995) return 'SB 95-99';
  if (year >= 1990) return 'SB 90-94';
  if (year >= 1985) return 'SB 85-89';
  if (year >= 1980) return 'SB 80-84';
  if (year >= 1975) return 'SB 75-79';
  if (year >= 1970) return 'SB 70-74';
  if (year >= 1965) return 'SB 65-69';
  if (year >= 1960) return 'SB 60-64';
  return 'SB Pensiones';
}
