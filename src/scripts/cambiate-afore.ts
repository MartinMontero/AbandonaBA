// «Mi Afore»: cuánto vale una diferencia de rendimiento. Todo en el aparato; no se guarda nada.
import { gapPesosPerYear } from '../lib/afore';

const form = document.getElementById('a-form');
if (form) {
  const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const out = document.getElementById('a-out')!;
  const empty = document.getElementById('a-empty')!;
  const num = (id: string) => Number((document.getElementById(id) as HTMLInputElement).value.replace(',', '.'));
  const run = () => {
    const balance = num('a-balance');
    const gap = num('a-gap');
    const has = (document.getElementById('a-balance') as HTMLInputElement).value !== '' && (document.getElementById('a-gap') as HTMLInputElement).value !== '' && balance >= 0 && gap >= 0;
    out.hidden = !has;
    empty.hidden = has;
    if (!has) return;
    const y = gapPesosPerYear(balance, gap);
    out.innerHTML = `<h3>La diferencia sería de</h3><span class="big">${mxn.format(y)} al año</span><ul><li>Es ${gap} puntos sobre ${mxn.format(balance)}.</li><li>Si el rendimiento se repitiera igual cada año. No es una promesa.</li></ul>`;
  };
  form.addEventListener('input', run);
  run();
}
