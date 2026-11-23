// «Compáralo tú mismo»: años de trabajo al salario mínimo. Todo en el aparato; no se guarda nada.
import { yearsOfWork } from '../lib/equivalencias';

const form = document.getElementById('q-form');
if (form) {
  const ds = (form as HTMLElement).dataset;
  const out = document.getElementById('q-out')!;
  const empty = document.getElementById('q-empty')!;
  const nf = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const run = () => {
    const raw = (document.getElementById('q-mdp') as HTMLInputElement).value;
    const mdp = Number(raw.replace(',', '.'));
    const has = raw !== '' && mdp >= 0;
    out.hidden = !has;
    empty.hidden = has;
    if (!has) return;
    const zone = (document.getElementById('q-zone') as HTMLSelectElement).value;
    const daily = Number(zone === 'border' ? ds.border : ds.general);
    const years = yearsOfWork(mdp * 1_000_000, daily);
    out.innerHTML = `<h3>Equivale a</h3><span class="big">${nf.format(years)} años de trabajo</span><ul><li>Al salario mínimo diario de ${nf.format(daily)} pesos, ${zone === 'border' ? 'de la frontera norte' : 'general'}.</li><li>Es una comparación de tamaños, no una acusación.</li></ul>`;
  };
  form.addEventListener('input', run);
  run();
}
