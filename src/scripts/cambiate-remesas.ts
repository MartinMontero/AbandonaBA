// Calculadora de remesas. Todo ocurre en el aparato; no se guarda ni se envía nada.
import data from '../data/cambiate.json';
import { transfer, wiseCanReceive, type Funding } from '../lib/remesas';

const form = document.getElementById('r-form');
if (form) {
  const $ = (id: string) => document.getElementById(id) as HTMLInputElement & HTMLSelectElement;
  const out = document.getElementById('r-out')!;
  const empty = document.getElementById('r-empty')!;
  const wiseNote = document.getElementById('r-wise')!;
  const wise = data.remittance_providers.find((p) => p.id === 'wise')!;
  const prefixes = wise.excluded.map((e) => e.clabe_prefix).filter((x): x is string => !!x);
  const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const usd = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' });
  const pct = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const num = (el: HTMLInputElement) => Number(el.value.replace(',', '.'));

  function update() {
    const clabe = $('r-clabe').value.replace(/\D/g, '').slice(0, 3);
    if ($('r-clabe').value !== clabe) $('r-clabe').value = clabe;
    if (clabe.length === 3) {
      const ok = wiseCanReceive(clabe, prefixes);
      wiseNote.textContent = ok
        ? `Con el código ${clabe}, Wise no aparece en su lista de bancos excluidos. Confírmalo en su app antes de enviar.`
        : `Con el código ${clabe}, Wise NO puede depositar a ese banco. Elige otra forma de recibir.`;
    }
    const r = transfer({ total: num($('r-total')), fee: num($('r-fee')), funding: $('r-funding').value as Funding, rate: num($('r-rate')), refRate: num($('r-ref')) });
    out.hidden = !r;
    empty.hidden = !!r;
    if (!r) return;
    const cash = $('r-funding').value === 'cash';
    const times = Math.max(1, Math.round(num($('r-times'))) || 1);
    const lost = r.lossPesos;
    const parts = [
      `Comisión de la app: ${mxn.format(r.feePesos)}.`,
      cash ? `Impuesto de EE. UU. (1%): ${mxn.format(r.taxPesos)}. Lo paga quien envía; si paga desde su cuenta o con tarjeta, no lo paga.` : 'Impuesto de EE. UU.: ninguno si paga desde su cuenta o con tarjeta emitida en EE. UU.',
      r.marginPesos >= 0 ? `Diferencia en el tipo de cambio: ${mxn.format(r.marginPesos)}. Es lo que la empresa gana al cambiar dólares a pesos a un precio peor que el de referencia.` : `Diferencia en el tipo de cambio: ${mxn.format(-r.marginPesos)} a tu favor, porque la app ofrece un tipo de cambio mejor que el de referencia.`,
    ];
    const head = lost > 0 ? `En este envío se pierden ${mxn.format(lost)}` : `En este envío no se pierde nada frente a la referencia`;
    const year = lost > 0 ? `<li><strong>Si se repite ${times} ${times === 1 ? 'vez' : 'veces'} al año, son ${mxn.format(lost * times)} al año.</strong></li>` : '';
    out.innerHTML = `<h3>¿Cuánto pierdes?</h3><span class="big">${head}</span><p>Es ${pct.format(Math.abs(r.costPct))}% de lo que gastó quien envía (${usd.format(num($('r-total')))}). Si no hubiera comisión, impuesto ni diferencia, llegarían ${mxn.format(r.refValue)}. Con esta cotización llegan <strong>${mxn.format(r.pesos)}</strong>.</p><ul>${parts.map((l) => `<li>${l}</li>`).join('')}${year}</ul><p class="ref-line">Es una comparación con el FIX de Banxico, no una promesa de que otra empresa cobre menos.</p>`;
  }
  form.addEventListener('input', update);
  update();
}
