// Datos y ayudas para la sección Transparencia. Todas las cifras salen de src/data/transparencia.json.
import raw from '../data/transparencia.json';
import valores from '../data/valores-2026.json';

export const T = raw as any;
export const n = (x: number, d = 0) => x.toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });
/** Millones de pesos, escritos completos: «1,806 millones de pesos». */
export const mdp = (x: number) => `${n(Math.abs(x))} millones de pesos`;
export const pesos = (x: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(x);

export const voices: Record<string, string> = {
  autoridad: 'Lo dice una autoridad',
  tribunal: 'Lo dice un tribunal',
  empresa: 'Lo dice la empresa',
  medio: 'Lo dice la prensa',
  calculo: 'Cálculo propio',
};

const val = (id: string) => (valores as any[]).find((v) => v.id === id);
export const minWageDaily: number = val('minwage_general').value;
export const minWageBorder: number = val('minwage_border').value;
export const minWageSource = val('minwage_general');

export const fin = (id: string) => (T.financials as any[]).find((f) => f.id === id);
export const timeline = [...(T.timeline as any[])].sort((a, b) => a.date.localeCompare(b.date));
