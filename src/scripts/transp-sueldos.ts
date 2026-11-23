// «¿Y tu sueldo?»: dónde queda un pago frente al salario mínimo. Todo en el aparato; no se guarda nada.
import { toMonthly, timesMinWage, type Period } from '../lib/equivalencias';

const form = document.getElementById('s-form');
if (form) {
  const daily = Number((form as HTMLElement).dataset.mw);
  const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const out = document.getElementById('s-out')!;
  const empty = document.getElementById('s-empty')!;
  const run = () => {
    const raw = (document.getElementById('s-pay') as HTMLInputElement).value;
    const pay = Number(raw.replace(',', '.'));
    const has = raw !== '' && pay >= 0;
    out.hidden = !has;
    empty.hidden = has;
    if (!has) return;
    const monthly = toMonthly(pay, (document.getElementById('s-period') as HTMLSelectElement).value as Period);
    const times = timesMinWage(monthly, daily);
    out.innerHTML = `<h3>Tu pago, por mes</h3><span class="big">${mxn.format(monthly)}</span><ul><li>Es ${times.toLocaleString('es-MX', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} veces el salario mínimo general de 2026.</li><li>Es una comparación de tamaños, no una evaluación de tu empleo.</li></ul>`;
  };
  form.addEventListener('input', run);
  run();
}
