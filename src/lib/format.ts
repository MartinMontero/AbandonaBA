const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num2 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function fmtMXN(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return mxn.format(Math.round((n + Number.EPSILON) * 100) / 100);
}
export function fmtNum(n: number): string {
  return Number.isFinite(n) ? num2.format(n) : '—';
}
export function fmtDateEs(d: Date): string {
  return new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}
export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
