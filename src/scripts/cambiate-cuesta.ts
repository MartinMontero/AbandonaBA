// «Cuánto me cuesta quedarme»: comisión de la Cuenta Operativa y préstamo. Todo en el aparato.
import data from '../data/cambiate.json';
import { operativaFee, loanRemaining } from '../lib/savings';

const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const pct = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const op = data.institutions[0].products.find((p: any) => p.id === 'cuenta-operativa') as any;
const val = (id: string) => Number((document.getElementById(id) as HTMLInputElement).value.replace(',', '.'));
const checked = (id: string) => (document.getElementById(id) as HTMLInputElement).checked;

const cform = document.getElementById('c-form');
if (cform) {
  const out = document.getElementById('c-out')!;
  const empty = document.getElementById('c-empty')!;
  const run = () => {
    const balance = val('c-balance');
    const has = (document.getElementById('c-balance') as HTMLInputElement).value !== '' && balance >= 0;
    out.hidden = !has;
    empty.hidden = has;
    if (!has) return;
    const r = operativaFee({ balance, payroll: checked('c-payroll'), termInvestment: checked('c-term'), feeMxn: op.fee_admin_mxn, ivaPct: 16, exemptBalance: op.exempt_balance_mxn });
    out.innerHTML = r.exempt
      ? `<h3>Con lo que marcaste</h3><span class="big">Sin comisión</span><p>Cumples una de las exenciones publicadas por Banco Azteca.</p>`
      : `<h3>Sin ninguna exención pagarías</h3><span class="big">${mxn.format(r.monthly)} al mes</span><ul><li>${mxn.format(r.yearly)} al año.</li><li>${r.shareOfBalance !== null ? `Es el ${pct.format(r.shareOfBalance * 100)}% de tu saldo promedio cada mes.` : 'Tu saldo es cero.'}</li><li>Cálculo: ${op.fee_admin_mxn} pesos más 16% de IVA. La promoción de reducción no está incluida.</li></ul>`;
  };
  cform.addEventListener('input', run);
  run();
}

const lform = document.getElementById('l-form');
if (lform) {
  const out = document.getElementById('l-out')!;
  const empty = document.getElementById('l-empty')!;
  const run = () => {
    const wk = val('l-week'), weeks = val('l-weeks'), alt = val('l-alt');
    const has = wk > 0 && weeks > 0;
    out.hidden = !has;
    empty.hidden = has;
    if (!has) return;
    const rem = loanRemaining(wk, weeks);
    const diff = (document.getElementById('l-alt') as HTMLInputElement).value !== '' && alt >= 0 ? rem - alt : null;
    out.innerHTML = `<h3>Te falta por pagar</h3><span class="big">${mxn.format(rem)}</span><ul><li>${mxn.format(wk)} por ${weeks} semanas.</li>${diff === null ? '' : `<li>Con la otra oferta pagarías ${mxn.format(alt)}: ${diff >= 0 ? `ahorrarías ${mxn.format(diff)}` : `pagarías ${mxn.format(-diff)} más`}. Revisa que incluya todos los cargos.</li>`}</ul>`;
  };
  lform.addEventListener('input', run);
  run();
}
