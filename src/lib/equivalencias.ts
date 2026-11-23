// Comparaciones de tamaño para la sección Transparencia. Funciones puras; todo ocurre en el aparato.
// Convención: el salario mínimo se paga todos los días del año, incluidos los de descanso (365 días).
// Los factores de 30.4 días y 4.345 semanas por mes son convenciones de este sitio y se muestran en la página.
export const DAYS_PER_YEAR = 365;
export const DAYS_PER_MONTH = 30.4;
export const WEEKS_PER_MONTH = 4.345;

export type Period = 'diario' | 'semanal' | 'quincenal' | 'mensual';

const ok = (n: number) => typeof n === 'number' && Number.isFinite(n) && n >= 0;

export function annualMinWage(daily: number): number {
  if (!(daily > 0)) throw new Error('El salario mínimo diario debe ser mayor que cero.');
  return daily * DAYS_PER_YEAR;
}

/** Años de trabajo al salario mínimo que equivale una cantidad en pesos. */
export function yearsOfWork(amountMxn: number, dailyMinWage: number): number {
  if (!ok(amountMxn)) throw new Error('Escribe una cantidad de cero o más.');
  return amountMxn / annualMinWage(dailyMinWage);
}

/** Meses de un sueldo mensual que equivale una cantidad en pesos. */
export function monthsOfPay(amountMxn: number, monthlyPay: number): number {
  if (!ok(amountMxn)) throw new Error('Escribe una cantidad de cero o más.');
  if (!(monthlyPay > 0)) throw new Error('El sueldo mensual debe ser mayor que cero.');
  return amountMxn / monthlyPay;
}

/** Pasa un pago a su equivalente mensual con los factores de este sitio. */
export function toMonthly(pay: number, period: Period): number {
  if (!ok(pay)) throw new Error('Escribe un pago de cero o más.');
  switch (period) {
    case 'diario': return pay * DAYS_PER_MONTH;
    case 'semanal': return pay * WEEKS_PER_MONTH;
    case 'quincenal': return pay * 2;
    case 'mensual': return pay;
  }
}

/** Cuántas veces el salario mínimo mensual es un pago mensual. */
export function timesMinWage(monthlyPay: number, dailyMinWage: number): number {
  if (!ok(monthlyPay)) throw new Error('Escribe un pago de cero o más.');
  return monthlyPay / (dailyMinWage * DAYS_PER_MONTH);
}
