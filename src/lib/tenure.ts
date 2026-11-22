// Antigüedad y tabla de vacaciones (LFT Art. 76, reforma DOF 27-12-2022).
export interface Tenure { completed: number; fractionYears: number; proportional: number }

function addYears(d: Date, y: number): Date {
  const r = new Date(Date.UTC(d.getUTCFullYear() + y, d.getUTCMonth(), d.getUTCDate()));
  // 29 de febrero -> 28 de febrero en años no bisiestos
  if (r.getUTCMonth() !== d.getUTCMonth()) r.setUTCDate(0);
  return r;
}

export function parseDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null;
}

export function tenureBetween(entry: Date, exit: Date): Tenure {
  if (exit <= entry) return { completed: 0, fractionYears: 0, proportional: 0 };
  let completed = 0;
  while (addYears(entry, completed + 1) <= exit) completed++;
  const start = addYears(entry, completed);
  const end = addYears(entry, completed + 1);
  const frac = (exit.getTime() - start.getTime()) / (end.getTime() - start.getTime());
  return { completed, fractionYears: frac, proportional: completed + frac };
}

/** Días de vacaciones del año de servicio k (k >= 1). */
export function vacationDaysForYear(k: number): number {
  if (!Number.isFinite(k) || k < 1) return 0;
  const y = Math.floor(k);
  if (y <= 5) return 10 + 2 * y; // 12,14,16,18,20
  return 22 + 2 * Math.floor((y - 6) / 5); // 22 (6-10), 24 (11-15), ...
}
