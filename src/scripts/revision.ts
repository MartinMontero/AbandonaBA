import { calcular, type Inputs } from '../lib/calc';
import { fmtMXN } from '../lib/format';
import { decisions } from '../data/routes';

const EXAMPLE = { weeklyBase: 2205.28, commissions: 900, yearsCompleted: 5, yearsProportional: 5.7 };
const $ = (id: string) => document.getElementById(id) as HTMLInputElement;

function base(): Inputs {
  return { weeklyBase: Number($('r-base').value) || 0, commissions: Number($('r-comm').value) || 0, yearsCompleted: Math.floor(Number($('r-years').value) || 0), yearsProportional: Number($('r-years').value) || 0, zone: 'general' };
}
function render() {
  const b = base();
  const out = decisions.map((d) => {
    let ra, rb, ta: number, tb: number;
    if (d.id === 'D2') {
      const r = calcular(b); ta = r.A.exits.art439.total; tb = r.B.exits.art439.total;
    } else {
      ra = calcular({ ...b, [d.key]: d.va } as Inputs); rb = calcular({ ...b, [d.key]: d.vb } as Inputs);
      ta = ra.A.exits.art439.total; tb = rb.A.exits.art439.total;
    }
    // D5 afecta la prima; D1, D3 y D4 afectan el Art. 439 completo. Se muestra el total del Art. 439 en ambos casos.
    return `<tr><th scope="row">${d.id}</th><td>${d.text}</td><td id="${d.id}-a">${d.a}: ${fmtMXN(ta)}</td><td id="${d.id}-b">${d.b}: ${fmtMXN(tb)}</td><td id="${d.id}-diff">${fmtMXN(Math.abs(tb - ta))}</td></tr>`;
  }).join('');
  document.getElementById('decisiones-out')!.innerHTML = `<div class="table-wrap" tabindex="0" role="region" aria-label="Tabla desplazable"><table><thead><tr><th>Id</th><th>Decisión</th><th>Opción 1 (Art. 439 total)</th><th>Opción 2 (Art. 439 total)</th><th>Diferencia</th></tr></thead><tbody>${out}</tbody></table></div>`;
}
function reset() {
  $('r-base').value = String(EXAMPLE.weeklyBase); $('r-comm').value = String(EXAMPLE.commissions); $('r-years').value = String(EXAMPLE.yearsProportional);
  render();
}
['r-base', 'r-comm', 'r-years'].forEach((id) => $(id)?.addEventListener('input', render));
document.getElementById('r-reset')?.addEventListener('click', reset);
if ($('r-base')) reset();
