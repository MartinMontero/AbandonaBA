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
    const lines = [
      `Se envían ${usd.format(r.sent)} después de la comisión${cash ? ' y del impuesto de EE. UU.' : ''}.`,
      cash ? `Impuesto de EE. UU. (1%): ${usd.format(r.tax)}. Lo paga quien envía. Si paga desde su cuenta o con tarjeta, no lo paga.` : 'Sin impuesto de EE. UU. si paga desde su cuenta o con tarjeta emitida en EE. UU.',
      `Con el tipo de cambio de referencia recibirías ${mxn.format(r.refValue)}. Esta cotización queda ${r.costPct >= 0 ? 'por debajo' : 'por encima'} en ${pct.format(Math.abs(r.costPct))}%.`,
    ];
    out.innerHTML = `<h3>Con esta cotización recibes</h3><span class="big">${mxn.format(r.pesos)}</span><ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul>`;
  }
  form.addEventListener('input', update);
  update();
}
