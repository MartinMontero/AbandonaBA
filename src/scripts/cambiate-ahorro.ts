// Ahorro: interés de una oferta, referencias y protección. Todo en el aparato.
import data from '../data/cambiate.json';
import { blendedInterest, simpleInterest } from '../lib/savings';
import { insuredPart, type EntityKind } from '../lib/udi';

const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const pct = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const el = (id: string) => document.getElementById(id) as HTMLInputElement & HTMLSelectElement;
const num = (id: string) => Number(el(id).value.replace(',', '.'));
const filled = (id: string) => el(id).value !== '';
const gd = data.institutions[0].products.find((p: any) => p.id === 'guardadito') as any;
const limits = { ipabUdis: data.protection.ipab.limit_udis, prosofipoUdis: data.protection.prosofipo.limit_udis };

const form = document.getElementById('a-form');
if (form) {
  const out = document.getElementById('a-out')!;
  const empty = document.getElementById('a-empty')!;
  const pout = document.getElementById('p-out')!;
  function run() {
    const amount = num('a-amount');
    const ready = filled('a-amount') && amount > 0 && filled('a-hi') && filled('a-base');
    out.hidden = !ready;
    empty.hidden = ready;
    el('a-gd').textContent = amount > 0 ? `Con ${mxn.format(amount)} ganarías ${mxn.format(simpleInterest(amount, gd.gat_nominal_pct))} al año.` : '';
    el('a-cetes').textContent = amount > 0 ? `Con ${mxn.format(amount)} serían unos ${mxn.format(simpleInterest(amount, data.meta.cetes28.value))} al año, antes de impuestos.` : '';
    if (ready) {
      const r = blendedInterest({ amount, rateHiPct: num('a-hi'), capMxn: filled('a-cap') ? num('a-cap') : amount, rateBasePct: num('a-base'), conditionsMet: el('a-cond').value === 'si' });
      out.innerHTML = `<h3>Ganarías cerca de</h3><span class="big">${mxn.format(r.interest)} al año</span><ul><li>Es una tasa efectiva de ${pct.format(r.blendedPct)}% sobre tu cantidad, antes de impuestos.</li><li>${el('a-cond').value === 'si' ? 'Contamos la tasa alta solo hasta el tope.' : 'Sin cumplir las condiciones, todo se paga a la tasa del resto.'}</li></ul>`;
    }
    if (amount > 0) {
      const p = insuredPart(amount, el('p-kind').value as EntityKind, data.meta.udi.value, limits);
      pout.hidden = false;
      pout.innerHTML = `<h3>De ${mxn.format(amount)}</h3><span class="big">${mxn.format(p.insured)} protegidos</span><ul><li>${p.uninsured > 0 ? `${mxn.format(p.uninsured)} no tendrían ese seguro.` : 'Todo queda dentro del límite.'}</li><li>${p.note}.</li></ul>`;
    } else pout.hidden = true;
  }
  document.getElementById('p-form')?.addEventListener('input', run);
  form.addEventListener('input', run);
  run();
}
