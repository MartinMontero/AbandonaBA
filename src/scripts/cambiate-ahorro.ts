// Ahorro: ofertas verificadas, referencias, oferta propia y protección. Todo ocurre en el aparato.
import data from '../data/cambiate.json';
import { blendedInterest, simpleInterest, bandsInterest, type Band } from '../lib/savings';
import { insuredPart, toMxn, type EntityKind } from '../lib/udi';

const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const mxn0 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const el = (id: string) => document.getElementById(id) as HTMLInputElement & HTMLSelectElement;
const num = (id: string) => Number(el(id).value.replace(',', '.'));
const filled = (id: string) => el(id).value !== '';
const gd = data.institutions[0].products.find((p: any) => p.id === 'guardadito') as any;
const limits = { ipabUdis: data.protection.ipab.limit_udis, prosofipoUdis: data.protection.prosofipo.limit_udis };
const udi = data.meta.udi.value;
const today = new Date().toISOString().slice(0, 10);

function bandText(bands: Band[]): string {
  if (bands.length === 1 && bands[0].upto === null) return `${bands[0].rate}% sobre todo tu saldo`;
  let from = 0;
  return bands
    .map((b) => {
      const t = b.upto === null ? `${b.rate}% sobre lo que pase de ${mxn0.format(from)}` : `${b.rate}% hasta ${mxn0.format(b.upto)}`;
      if (b.upto !== null) from = b.upto;
      return t;
    })
    .join('; ');
}
function protectionText(inst: any): string {
  const p = inst.protection;
  if (p.scheme === 'IPAB') return `IPAB hasta ${mxn0.format(toMxn(p.limit_udis, udi))} (${p.limit_udis.toLocaleString('es-MX')} UDIs)`;
  if (p.scheme === 'PROSOFIPO') return `Fondo de SOFIPOs hasta ${mxn0.format(toMxn(p.limit_udis, udi))}, solo si está asociada`;
  return 'protección sin verificar';
}

interface Row { inst: any; prod: any; lvl: any }
const rows: Row[] = [];
for (const inst of data.institutions as any[]) for (const prod of inst.products) if (prod.kind === 'ahorro') for (const lvl of prod.levels) rows.push({ inst, prod, lvl });

function renderOffers() {
  const list = document.getElementById('o-list')!;
  const empty = document.getElementById('o-empty')!;
  const amount = num('o-amount');
  const ok = filled('o-amount') && amount > 0;
  empty.hidden = ok;
  const spend = el('o-spend').value === 'si';
  const term = el('o-term').value === 'si';
  const eligible = rows.filter((r) => r.lvl.computable && (r.lvl.condition_kind === 'none' || (r.lvl.condition_kind === 'spend' && spend) || (r.lvl.condition_kind === 'term' && term)));
  const scored = ok ? eligible.map((r) => ({ r, interest: bandsInterest(amount, r.lvl.bands), stale: r.prod.valid_to < today })) : [];
  scored.sort((a, b) => Number(a.stale) - Number(b.stale) || b.interest - a.interest || (a.r.inst.name + a.r.lvl.name).localeCompare(b.r.inst.name + b.r.lvl.name, 'es'));
  list.innerHTML = scored
    .map(({ r, interest, stale }) =>
      `<li class="offer${stale ? ' stale' : ''}"><h3>${r.inst.name}: ${r.lvl.name}</h3><span class="big">${stale ? 'vencida' : mxn.format(interest)}</span><p>${stale ? 'vencido: verifica en el sitio oficial.' : 'al año, antes de impuestos.'}</p><p class="ref-line">Tasa: ${bandText(r.lvl.bands)}. GAT nominal ${pct.format(r.lvl.gat_nominal_pct)}%, GAT real ${pct.format(r.lvl.gat_real_pct)}%.</p><p class="ref-line">${r.lvl.condition_es ? 'Condición: ' + r.lvl.condition_es : 'Sin condición de gasto.'}</p><p class="ref-line">Calculada el ${r.prod.calc_date}. Vigente hasta el ${r.prod.valid_to}.</p><p class="ref-line">Protección: ${protectionText(r.inst)}.</p><a class="btn tonal" href="${r.prod.source_url}" rel="noopener noreferrer">Ver en el sitio oficial</a></li>`,
    )
    .join('');
  const prods = (data.institutions as any[]).flatMap((i) => i.products.filter((p: any) => p.kind === 'ahorro').map((p: any) => ({ i, p })));
  const unk: string[] = [];
  for (const { i, p } of prods) {
    const bad = p.levels.filter((l: any) => !l.computable);
    if (bad.length) unk.push(`<li><strong>${i.name}: ${p.name}.</strong> ${bad.map((l: any) => `${l.name}: ${l.published_es ?? 'tasa ' + l.bands[0].rate + '%'}`).join('; ')}. ${p.unk_note_es ?? bad.map((l: any) => l.note ?? '').join(' ')}</li>`);
    if (!p.levels.length) unk.push(`<li><strong>${i.name}: ${p.name}.</strong> ${p.seen_es ?? ''} ${p.notes ?? ''}</li>`);
  }
  for (const i of data.institutions as any[]) if (i.products.length === 0) unk.push(`<li><strong>${i.name}.</strong> No encontramos un producto de ahorro con tasa publicada. ${i.protection.seen}.</li>`);
  const noLevels: string[] = [];
  document.getElementById('o-unk-list')!.innerHTML = unk.concat(noLevels).join('');
}
for (const id of ['o-amount', 'o-spend', 'o-term']) el(id)?.addEventListener('input', renderOffers);
if (document.getElementById('o-form')) renderOffers();

const form = document.getElementById('a-form');
if (form) {
  const out = document.getElementById('a-out')!;
  const empty = document.getElementById('a-empty')!;
  const pout = document.getElementById('p-out')!;
  const run = () => {
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
      const p = insuredPart(amount, el('p-kind').value as EntityKind, udi, limits);
      pout.hidden = false;
      pout.innerHTML = `<h3>De ${mxn.format(amount)}</h3><span class="big">${mxn.format(p.insured)} protegidos</span><ul><li>${p.uninsured > 0 ? `${mxn.format(p.uninsured)} no tendrían ese seguro.` : 'Todo queda dentro del límite.'}</li><li>${p.note}.</li></ul>`;
    } else pout.hidden = true;
  };
  document.getElementById('p-form')?.addEventListener('input', run);
  form.addEventListener('input', run);
  run();
}
