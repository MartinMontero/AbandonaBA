// Plazos. Aritmética de fechas en UTC. Fuentes: LFT Arts. 516, 517, 518, 52 (leídos en diputados.gob.mx).
import { toISO } from './format';

export type ExitType = 'renuncia' | 'despido' | 'rescision' | 'reduccion';
export interface Deadline { id: string; label: string; date: Date | null; note: string; article: string; status: 'verificado-primaria' | 'verificado-secundaria' | 'sin-verificar' }

/** Suma meses de calendario; si el día no existe en el mes destino, usa el último día de ese mes. */
export function addMonths(d: Date, months: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + months;
  const day = d.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, last)));
}
export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}

/** Art. 518: corre desde el día siguiente a la separación; dos meses. El último día es la misma fecha numérica dos meses después. */
export function computeDeadlines(exit: Date, type: ExitType): Deadline[] {
  const out: Deadline[] = [];
  if (type === 'despido' || type === 'reduccion') {
    out.push({ id: 'art518', label: 'Reclamar el despido (dos meses)', date: addMonths(exit, 2), article: 'Art. 518', status: 'verificado-primaria', note: 'El plazo corre desde el día siguiente a la separación. Si el patrón no te entregó personalmente el aviso escrito del despido, el Art. 47 dice que el plazo no empieza a correr hasta que lo recibas; por precaución, cuenta desde la fecha del despido. Pedir la conciliación afecta el plazo (Art. 518 dice que lo suspende y el Art. 521 que lo interrumpe); confirma con PROFEDET hasta cuándo.' });
  }
  if (type === 'rescision') {
    const m = addMonths(exit, 1);
    const d30 = addDays(exit, 30);
    out.push({ id: 'art517', label: 'Separarte por culpa del patrón: un mes (por precaución, cuenta 30 días)', date: m < d30 ? m : d30, article: 'Arts. 517 fr. II y 52', status: 'verificado-primaria', note: `El Art. 517 dice un mes (${toISO(m)}) y el Art. 52 dice treinta días (${toISO(d30)}). Se muestra la fecha más temprana. Cuenta desde que ocurrió la causa, no desde que te vas.` });
  }
  out.push({ id: 'art516', label: 'Otras reclamaciones de trabajo (un año)', date: addDays(addMonths(exit, 12), 0), article: 'Art. 516', status: 'verificado-primaria', note: 'Aplica a prestaciones como aguinaldo o vacaciones pendientes. Corre desde que la obligación es exigible.' });
  out.push({ id: 'afore', label: 'Retiro parcial de la Afore por desempleo (desde el día 46)', date: addDays(exit, 45), article: 'LSS Art. 191', status: 'verificado-primaria', note: 'Desde el día natural 46. Revisa los requisitos con tu Afore.' });
  out.push({ id: 'imss', label: 'Atención médica del IMSS sigue por 8 semanas', date: addDays(exit, 56), article: 'LSS Art. 109', status: 'verificado-primaria', note: 'Si cotizaste al menos 8 semanas seguidas antes de quedarte sin trabajo. Fecha aproximada.' });
  const y = exit.getUTCFullYear();
  const aguin = new Date(Date.UTC(y, 11, 20));
  out.push({ id: 'aguinaldo', label: 'Aguinaldo: se paga antes del 20 de diciembre', date: exit <= aguin ? aguin : null, article: 'Art. 87', status: 'verificado-primaria', note: 'Si te vas antes, te toca la parte proporcional (Art. 87).' });
  out.push({ id: 'ptu', label: 'PTU: se reparte en mayo del año siguiente', date: new Date(Date.UTC(y + 1, 4, 31)), article: 'LFT Art. 122 (por confirmar)', status: 'sin-verificar', note: 'Fecha límite aproximada. Si trabajaste parte del año, te toca la parte proporcional.' });
  out.push({ id: 'estatal', label: 'Programas estatales (por ejemplo, el Seguro de Desempleo de la CDMX)', date: null, article: '—', status: 'verificado-secundaria', note: 'Revisa fechas oficiales. Hay ventanas de un solo día.' });
  return out.filter((d) => d.date === null || d.date >= exit || d.id === 'estatal');
}
