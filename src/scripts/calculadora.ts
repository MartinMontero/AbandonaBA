import { calcular, type Inputs, type Result, type ExitId } from '../lib/calc';
import { fmtMXN, fmtNum } from '../lib/format';
import { parseDate, tenureBetween } from '../lib/tenure';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const val = (id: string) => ($(id) as HTMLInputElement).value.trim();
const num = (id: string) => (val(id) === '' ? 0 : Number(val(id).replace(/,/g, '')));

export function readInputs(): Inputs {
  const entry = parseDate(val('entry'));
  const exit = parseDate(val('exit'));
  let yearsCompleted = num('years');
  let yearsProportional: number | undefined;
  let daysWorkedInYear = num('daysYear');
  if (entry && exit) {
    const t = tenureBetween(entry, exit);
    yearsCompleted = t.completed;
    yearsProportional = t.proportional;
    if (!val('daysYear')) {
      const jan1 = Date.UTC(exit.getUTCFullYear(), 0, 1);
      daysWorkedInYear = Math.floor((exit.getTime() - Math.max(jan1, entry.getTime())) / 86400000) + 1;
    }
  }
  return {
    weeklyBase: num('weeklyBase'),
    commissions: num('commissions'),
    commissionPeriod: val('commissionPeriod') as Inputs['commissionPeriod'],
    yearsCompleted,
    yearsProportional,
    zone: val('zone') as Inputs['zone'],
    vacationBasis: val('vacationBasis') as Inputs['vacationBasis'],
    fractionMode: val('fractionMode') as Inputs['fractionMode'],
    art439Days: Number(val('art439Days')),
    daysWorkedPerWeek: num('daysPerWeek') || 6,
    aguinaldoDays: val('aguinaldoDays') === '' ? undefined : num('aguinaldoDays'),
    daysWorkedInYear,
    wageDaysOwed: num('wageDays'),
    vacationDaysOwed: num('vacDays'),
  };
}

const EXITS: ExitId[] = ['renuncia', 'art439', 'art51', 'art48'];

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

export function renderResult(r: Result): string {
  const max = Math.max(...EXITS.map((e) => Math.max(r.A.exits[e].total, r.B.exits[e].total)), 1);
  const fin = r.finiquito;
  const warn = r.warnings.map((w) => `<p class="callout" role="alert">${esc(w)}</p>`).join('');
  const cards = EXITS.map((e) => {
    const a = r.A.exits[e], b = r.B.exits[e];
    const same = Math.abs(a.total - b.total) < 0.005;
    const range = same ? 'Los dos métodos dan lo mismo.' : `Rango: ${fmtMXN(Math.min(a.total, b.total))} a ${fmtMXN(Math.max(a.total, b.total))}`;
    return `<article class="exit-card${e === 'art439' ? ' featured' : ''}">
      <header><h3>${esc(a.label)}</h3><span class="art">${esc(a.article)}</span></header>
      <div class="amounts">
        <div><span class="k">Método A</span><strong id="out-${e}-A">${fmtMXN(a.total)}</strong></div>
        <div><span class="k">Método B</span><strong id="out-${e}-B">${fmtMXN(b.total)}</strong></div>
      </div>
      <p class="range">${range}</p>
      <details><summary>Cómo se calcula</summary><p><small>${esc(a.formula)}</small></p><p>${esc(a.note)}</p></details>
    </article>`;
  }).join('');
  const bars = EXITS.map((e) => {
    const t = r.A.exits[e].total + fin.total;
    return `<li><div class="bar-row"><span>${esc(r.A.exits[e].label)}</span><strong>${fmtMXN(t)}</strong></div><div class="bar" aria-hidden="true"><span data-w="${Math.max(1, (t / (max + fin.total)) * 100).toFixed(1)}"></span></div></li>`;
  }).join('');
  const steps = (s: Result['A']) => `<h4>Método ${s.method} ${s.method === 'A' ? '(comisión ÷ 7)' : '(comisión ÷ días trabajados)'}</h4>
    <div class="table-wrap" tabindex="0" role="region" aria-label="Tabla desplazable"><table><thead><tr><th>Concepto</th><th>Cuenta</th><th>Valor</th><th>Artículo</th></tr></thead><tbody>${
      s.steps.map((x, i) => `<tr><th scope="row">${esc(x.label)}</th><td>${esc(x.formula)}</td><td id="step-${s.method}-${i}">${x.unit.startsWith('MXN') ? fmtMXN(x.value) : fmtNum(x.value)} ${x.unit.startsWith('MXN') ? '' : esc(x.unit)}</td><td>${esc(x.article)}</td></tr>`).join('')
    }</tbody></table></div>`;
  const prop = r.A.nUsed;
  return `${warn}
  <div class="assumptions" role="note">Estimación con valores de 2026. Pendiente de revisión legal. Lleva esta hoja a PROFEDET.</div>
  <div class="print-only">Información general. En revisión por abogado laboral. No es asesoría legal.</div>
  <h2>Lo que paga cada salida</h2>
  <div class="exit-grid">${cards}</div>
  <p class="fine">Método A: comisión entre 7. Método B: comisión entre los días que trabajas a la semana. Esta diferencia (D2) está pendiente de revisión legal. Años usados en la prima: ${fmtNum(prop)}. SDI método A: ${fmtMXN(r.A.sdi)}; método B: ${fmtMXN(r.B.sdi)}${r.A.capped ? '. El SDI pasa el tope; la prima usa el tope.' : '.'}</p>
  <h2>Finiquito: se suma a cualquier salida</h2>
  <div class="fin-card">
    <dl>
      <div><dt>Sueldo y comisiones pendientes</dt><dd id="out-fin-wages">${fmtMXN(fin.wages)}</dd></div>
      <div><dt>Aguinaldo proporcional (simplificado, sobre el sueldo base)</dt><dd id="out-fin-aguinaldo">${fmtMXN(fin.aguinaldo)}</dd></div>
      <div><dt>Vacaciones pendientes con prima del 25%</dt><dd id="out-fin-vac">${fmtMXN(fin.vacation)}</dd></div>
      <div><dt>PTU</dt><dd>Cuando se reparta</dd></div>
    </dl>
    <p class="fin-total">Total del finiquito <strong id="out-fin-total">${fmtMXN(fin.total)}</strong></p>
  </div>
  <h2>Lo que te llevas, salida por salida</h2>
  <p class="fine">Método A, con el finiquito incluido.</p>
  <ul class="plain bars">${bars}</ul>
  <h2>Parte exenta de ISR</h2>
  <div class="callout info"><p>90 × UMA × años de servicio = <strong id="out-isr">${fmtMXN(r.A.isrExempt)}</strong>. La fracción de más de seis meses cuenta como año completo (LISR Art. 93 fr. XIII). Sin contar fracciones: ${fmtMXN(r.A.isrExemptAlt)}.</p><p>Solo es información, no un cálculo de impuestos. La ley dice «salario mínimo», pero el Transitorio Tercero del decreto del 27 de enero de 2016 manda leerlo como UMA. Confírmalo con un contador.</p></div>
  <details id="pasos" class="card"><summary>Ver el cálculo paso a paso</summary>${steps(r.A)}${steps(r.B)}
  <p><small>El promedio de pago variable usa la ventana que elegiste (semanal o total de 30 días). Supuesto D4: Art. 89 habla de 30 días efectivamente trabajados.</small></p></details>`;
}
export function mount() {
  const out = $('resultado');
  const update = () => {
    const wasOpen = (document.getElementById('pasos') as HTMLDetailsElement | null)?.open ?? false;
    out.innerHTML = renderResult(calcular(readInputs()));
    if (wasOpen) (document.getElementById('pasos') as HTMLDetailsElement).open = true;
    // CSP: sin estilos en línea; el ancho se pone por CSSOM.
    out.querySelectorAll<HTMLElement>('[data-w]').forEach((el) => { el.style.width = (el.dataset.w || '0') + '%'; });
  };
  document.querySelectorAll('#calc input, #calc select').forEach((el) => { el.addEventListener('input', update); }); // solo «input»: «change» al salir del campo re-dibujaba el resultado y se comía el primer toque en otro control
  $('calc').addEventListener('submit', (e) => { e.preventDefault(); update(); });
  $('example').addEventListener('click', () => {
    ($('weeklyBase') as HTMLInputElement).value = '2205.28';
    ($('commissions') as HTMLInputElement).value = '900';
    ($('years') as HTMLInputElement).value = '5';
    ($('entry') as HTMLInputElement).value = '';
    ($('exit') as HTMLInputElement).value = '';
    update();
  });
  $('reset').addEventListener('click', () => { ($('calc') as HTMLFormElement).reset(); update(); });
  update();
}
if (document.getElementById('calc')) mount();
