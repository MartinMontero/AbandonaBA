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
  const warn = r.warnings.map((w) => `<p class="warning" role="alert">${esc(w)}</p>`).join('');
  const rows = EXITS.map((e) => {
    const a = r.A.exits[e], b = r.B.exits[e];
    const range = Math.abs(a.total - b.total) < 0.005 ? fmtMXN(a.total) : `${fmtMXN(Math.min(a.total, b.total))} a ${fmtMXN(Math.max(a.total, b.total))}`;
    return `<tr><th scope="row">${esc(a.label)}<br><small>${esc(a.article)}</small></th>
      <td id="out-${e}-A">${fmtMXN(a.total)}</td><td id="out-${e}-B">${fmtMXN(b.total)}</td><td>${range}</td>
      <td><small>${esc(a.formula)}<br>${esc(a.note)}</small></td></tr>`;
  }).join('');
  const bars = EXITS.map((e) => {
    const t = r.A.exits[e].total + fin.total;
    return `<li>${esc(r.A.exits[e].label)}: ${fmtMXN(t)} <div class="bar" aria-hidden="true"><span data-w="${Math.max(1, (t / (max + fin.total)) * 100).toFixed(1)}"></span></div></li>`;
  }).join('');
  const steps = (s: Result['A']) => `<h4>Método ${s.method} ${s.method === 'A' ? '(comisión ÷ 7)' : '(comisión ÷ días trabajados)'}</h4>
    <div class="table-wrap"><table><thead><tr><th>Concepto</th><th>Cuenta</th><th>Valor</th><th>Artículo</th></tr></thead><tbody>${
      s.steps.map((x, i) => `<tr><th scope="row">${esc(x.label)}</th><td>${esc(x.formula)}</td><td id="step-${s.method}-${i}">${x.unit.startsWith('MXN') ? fmtMXN(x.value) : fmtNum(x.value)} ${x.unit.startsWith('MXN') ? '' : esc(x.unit)}</td><td>${esc(x.article)}</td></tr>`).join('')
    }</tbody></table></div>`;
  const prop = r.A.nUsed;
  return `${warn}
  <div class="assumptions" role="note">Estimación con valores de 2026. Pendiente de revisión legal. Lleva esta hoja a PROFEDET.</div>
  <div class="print-only">Información general. En revisión por abogado laboral. No es asesoría legal.</div>
  <h2>Resultado por salida</h2>
  <div class="table-wrap"><table><thead><tr><th>Salida</th><th>Método A</th><th>Método B</th><th>Rango</th><th>Cuenta y aviso</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p><small>Método A: comisión entre 7. Método B: comisión entre los días que trabajas a la semana. Esta diferencia (D2) está pendiente de revisión legal. Años usados en la prima: ${fmtNum(prop)}. SDI método A: ${fmtMXN(r.A.sdi)}; método B: ${fmtMXN(r.B.sdi)}${r.A.capped ? '. El SDI pasa el tope; la prima usa el tope.' : '.'}</small></p>
  <h2>Finiquito (se suma a cualquier salida)</h2>
  <ul><li>Sueldo y comisiones pendientes: <span id="out-fin-wages">${fmtMXN(fin.wages)}</span></li>
  <li>Aguinaldo proporcional (simplificado, sobre el sueldo base): <span id="out-fin-aguinaldo">${fmtMXN(fin.aguinaldo)}</span></li>
  <li>Vacaciones pendientes con prima del 25%: <span id="out-fin-vac">${fmtMXN(fin.vacation)}</span></li>
  <li>PTU: cuando se reparta.</li></ul>
  <p>Total del finiquito: <strong id="out-fin-total">${fmtMXN(fin.total)}</strong></p>
  <h2>Lo que te llevas, salida por salida (método A, con finiquito)</h2><ul class="plain">${bars}</ul>
  <h2>Parte exenta de ISR (solo información)</h2>
  <p>90 × UMA × años completos = <strong id="out-isr">${fmtMXN(r.A.isrExempt)}</strong>. Si cuentas la fracción de más de seis meses como año: ${fmtMXN(r.A.isrExemptAlt)}. No es un cálculo de impuestos. El texto de la ley dice «salario mínimo»; ver la página de revisión legal.</p>
  <details id="pasos"><summary>Ver el cálculo paso a paso</summary>${steps(r.A)}${steps(r.B)}
  <p><small>El promedio de pago variable usa la ventana que elegiste (semanal o total de 30 días). Supuesto D4: Art. 89 habla de 30 días efectivamente trabajados.</small></p></details>`;
}

export function mount() {
  const out = $('resultado');
  const update = () => {
    out.innerHTML = renderResult(calcular(readInputs()));
    // CSP: sin estilos en línea; el ancho se pone por CSSOM.
    out.querySelectorAll<HTMLElement>('[data-w]').forEach((el) => { el.style.width = (el.dataset.w || '0') + '%'; });
  };
  document.querySelectorAll('#calc input, #calc select').forEach((el) => { el.addEventListener('input', update); el.addEventListener('change', update); });
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
