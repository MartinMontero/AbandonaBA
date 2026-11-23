// «¿Qué me conviene?»: arma los candidatos con los datos verificados y aplica las reglas de src/lib/matcher.ts.
// Todo ocurre en el aparato; no se guarda ni se envía nada.
import data from '../data/cambiate.json';
import { match, type Candidate } from '../lib/matcher';
import { bandsInterest } from '../lib/savings';
import { toMxn } from '../lib/udi';

const form = document.getElementById('m-form');
if (form) {
  const el = (id: string) => document.getElementById(id) as HTMLInputElement & HTMLSelectElement;
  const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const udi = data.meta.udi.value;
  const today = new Date().toISOString().slice(0, 10);
  const insts = (data.institutions as any[]).filter((i) => i.id !== 'banco-azteca');
  const byId = Object.fromEntries(insts.map((i) => [i.id, i]));
  const msg = document.getElementById('m-msg')!;
  const out = document.getElementById('m-out')!;
  const copy = document.getElementById('m-copy') as HTMLButtonElement;
  let lastText = '';

  const savingsProds = (i: any) => i.products.filter((p: any) => p.kind === 'ahorro');
  const freeLevels = (i: any) => savingsProds(i).flatMap((p: any) => p.levels.filter((l: any) => l.computable && l.condition_kind === 'none').map((l: any) => ({ p, l })));

  function candidates(amount: number): Candidate[] {
    return insts.map((i) => {
      const lv = freeLevels(i);
      const live = lv.filter(({ p }: any) => p.valid_to >= today);
      const hasData = lv.length > 0 || i.products.some((p: any) => p.fee_summary);
      const allStale = lv.length > 0 && live.length === 0;
      const known = ['banco', 'sofipo', 'ifpe'].includes(i.type);
      const protectionOk = i.protection.status !== 'sin-verificar';
      return {
        id: i.id,
        type: i.type,
        appOnly: i.channels.app_required,
        acceptsPortabilidad: i.payroll_portability.accepts,
        verified: known && hasData && protectionOk,
        stale: allStale,
        protectedUdis: i.protection.limit_udis,
        score: Math.max(0, ...live.map(({ l }: any) => bandsInterest(amount, l.bands))),
      } as Candidate;
    });
  }

  function why(id: string): string {
    const i = byId[id];
    if (!i) return 'datos sin verificar';
    if (!['banco', 'sofipo', 'ifpe'].includes(i.type)) return 'no pudimos confirmar qué tipo de institución es';
    if (i.protection.status === 'sin-verificar') return 'no leímos su aviso de protección de depósitos';
    if (!freeLevels(i).length && !i.products.some((p: any) => p.fee_summary)) return 'no leímos una tasa ni una comisión completas';
    return 'datos sin verificar';
  }

  function card(id: string, amount: number, wantsPay: boolean): { html: string; text: string } {
    const i = byId[id];
    const live = freeLevels(i).filter(({ p }: any) => p.valid_to >= today);
    const best = live.map((x: any) => ({ ...x, v: bandsInterest(amount, x.l.bands) })).sort((a: any, b: any) => b.v - a.v)[0];
    const reasons: string[] = [];
    if (best && amount > 0) reasons.push(`Con ${mxn.format(amount)} ganarías unos ${mxn.format(best.v)} al año, sin condiciones de gasto (${best.l.name}).`);
    else if (best) reasons.push(`Tiene una oferta de ahorro sin condiciones de gasto: ${best.l.name}.`);
    else reasons.push('No tiene una tasa de ahorro verificada; la incluimos por su cuenta y sus comisiones.');
    reasons.push(i.channels.app_required === false ? 'Puedes abrir y usar la cuenta en sucursal.' : 'Funciona desde la app.');
    if (wantsPay) reasons.push('Recibe portabilidad de nómina.');
    let ojo = '';
    const prod = (best?.p ?? i.products[0]) as any;
    if (best && best.l.bands[best.l.bands.length - 1].rate === 0 && amount > (best.l.bands[0].upto ?? Infinity)) ojo = `Solo gana la parte hasta ${mxn.format(best.l.bands[0].upto)}.`;
    else if (best && prod.valid_to) ojo = `La oferta vale hasta el ${prod.valid_to}.`;
    else if (i.type === 'sofipo') ojo = `Es una SOFIPO: la protección llega a unos ${mxn.format(toMxn(i.protection.limit_udis, udi))}.`;
    else if (i.type === 'ifpe') ojo = 'Es una IFPE: no tiene seguro del IPAB.';
    else ojo = i.products.find((p: any) => p.fee_summary)?.fee_summary?.text_es ?? 'Revisa las comisiones en el contrato.';
    const prot = i.protection.scheme === 'IPAB' ? `IPAB hasta ${mxn.format(toMxn(i.protection.limit_udis, udi))}` : i.protection.scheme === 'PROSOFIPO' ? 'Fondo de SOFIPOs (hasta 25,000 UDIS)' : 'sin seguro del IPAB';
    const html = `<li class="offer"><h3>${i.name}</h3><ul>${reasons.map((r) => `<li>${r}</li>`).join('')}</ul><p class="ref-line"><strong>Ojo:</strong> ${ojo}</p><p class="ref-line">Protección: ${prot}. Datos leídos el ${i.channels.read_date}.</p><a class="btn tonal" href="${(prod?.source_url ?? i.channels.source_url)}" rel="noopener noreferrer">Ver en el sitio oficial</a></li>`;
    return { html, text: `${i.name}: ${reasons.join(' ')} Ojo: ${ojo}` };
  }

  function run() {
    const phone = el('m-phone').value as 'si' | 'a-veces' | 'no';
    const wantsPay = el('m-pay').value === 'si';
    const amount = el('m-amount').value === '' ? 0 : Math.max(0, Number(el('m-amount').value.replace(',', '.')));
    const r = match({ smartphone: phone, wantsPayrollMove: wantsPay, savingsMxn: amount }, candidates(amount), udi);
    msg.hidden = !r.message;
    if (r.message) (msg.querySelector('p') as HTMLElement).textContent = r.message;
    const cards = r.ids.map((id) => card(id, amount, wantsPay));
    out.innerHTML = cards.map((c) => c.html).join('');
    lastText = cards.map((c, n) => `${n + 1}. ${c.text}`).join('\n');
    copy.hidden = cards.length === 0;
    const reasonText: Record<string, string> = {};
    for (const e of r.excluded) reasonText[e.id] = e.why === 'datos sin verificar' ? why(e.id) : e.why;
    const rest = r.eligible.slice(3).map((id) => `<li><strong>${byId[id].name}:</strong> cumple las reglas, pero quedó fuera de las tres primeras (se ordena por pesos al año con tu cantidad y, si empatan, por orden alfabético).</li>`);
    const ex = r.excluded.map((e) => `<li><strong>${byId[e.id]?.name ?? e.id}:</strong> ${reasonText[e.id]}.</li>`);
    document.getElementById('m-excl-list')!.innerHTML = rest.concat(ex).join('');
  }
  form.addEventListener('input', run);
  copy.addEventListener('click', async () => {
    const say = (window as unknown as { aba?: { say: (s: string) => void } }).aba?.say;
    try { await navigator.clipboard.writeText(lastText); say?.('Resultado copiado'); } catch { say?.('No se pudo copiar. Selecciona el texto y cópialo a mano.'); }
  });
  run();
}
