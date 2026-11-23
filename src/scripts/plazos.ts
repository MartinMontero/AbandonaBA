import { computeDeadlines, type ExitType } from '../lib/deadlines';
import { buildIcs } from '../lib/ics';
import { parseDate } from '../lib/tenure';
import { fmtDateEs, toISO } from '../lib/format';

const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
let current: ReturnType<typeof computeDeadlines> = [];

function update() {
  const d = parseDate($('p-date').value);
  const out = document.getElementById('p-out')!;
  const dl = document.getElementById('p-ics') as HTMLButtonElement;
  if (!d) { out.innerHTML = '<p>Escribe la fecha en que saliste, o la fecha estimada.</p>'; dl.disabled = true; current = []; return; }
  current = computeDeadlines(d, $('p-type').value as ExitType);
  dl.disabled = false;
  out.innerHTML = `<ol class="plain timeline">${current.map((x) => `<li class="deadline"><div class="when"><span id="plazo-${x.id}">${x.date ? fmtDateEs(x.date) : 'Revisa fechas oficiales'}</span></div><div class="what"><strong>${esc(x.label)}</strong> <span class="tag t-${x.status}">${x.status}</span><p>${esc(x.article)}. ${esc(x.note)}</p></div></li>`).join('')}</ol>`;
}
['p-date', 'p-type'].forEach((id) => { $(id).addEventListener('input', update); $(id).addEventListener('change', update); });
document.getElementById('p-ics')!.addEventListener('click', () => {
  const ev = current.filter((x) => x.date).map((x) => ({ uid: x.id + '-' + toISO(x.date!), date: x.date!, summary: x.label, description: x.note }));
  const blob = new Blob([buildIcs(ev)], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'mis-plazos.ics'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
update();
