// «Consulta la LFT»: habla sólo con /api/lft/* (mismo origen). No guarda nada en el navegador.
import { createLftClient, describeStatus, LftServiceError, MAX_QUESTION_CHARS, type LftArticle, type LftQueryResponse } from '../lib/lftLegalClient';

const client = createLftClient({ baseUrl: '/api/lft', mode: 'proxy', timeoutMs: 100_000 });
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const paras = (s: string) => s.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

const q = $<HTMLTextAreaElement>('lft-q');
const go = $<HTMLButtonElement>('lft-go');
const out = $<HTMLDivElement>('lft-out');
const estado = $<HTMLParagraphElement>('lft-estado');
let available = false;
let busy = false;

function sync() {
  const n = q.value.trim().length;
  $('lft-count').textContent = String(q.value.length);
  go.disabled = !available || busy || n < 3 || n > MAX_QUESTION_CHARS;
}

function articleHtml(a: LftArticle): string {
  const parte = a.part_total > 1 ? ` (parte ${a.part_index} de ${a.part_total})` : '';
  const name = a.is_transitorio ? a.articulo_label : `Artículo ${a.articulo_label}`;
  const state = a.is_derogado
    ? '<span class="tag t-sin-verificar">DEROGADO: ya no está vigente</span>'
    : '<span class="tag t-verificado-primaria">vigente</span>';
  const jer = [a.titulo, a.capitulo, a.seccion].filter(Boolean).map(esc).join(' · ');
  const reforma = a.reform_date ? ` · Última reforma DOF ${esc(a.reform_date)}` : '';
  return `<article class="precepto">
    <h3>${esc(name)}${esc(parte)} ${state}</h3>
    <p class="hint">${jer}${reforma}</p>
    ${paras(a.text)}
    <p><a href="${esc(a.source_url)}" rel="noopener noreferrer">Ver en el PDF oficial${a.page_start ? ` (página ${a.page_start})` : ''}</a></p>
  </article>`;
}

function render(r: LftQueryResponse) {
  const d = describeStatus(r.status);
  const tag = d.tone === 'ok' ? 't-verificado-primaria' : d.tone === 'warn' ? 't-verificado-secundaria' : 't-sin-verificar';
  const derogados = r.filtered_articles.filter((a) => a.is_derogado).length;
  let html = `<h2 id="resultado" tabindex="-1">Resultado <span class="tag ${tag}">${esc(d.label)}</span></h2>`;
  html += d.showAnswer ? `<div class="result-box">${paras(r.answer)}</div>` : `<div class="callout info"><p>${esc(r.answer)}</p></div>`;
  if (derogados) html += `<p class="warning">Ojo: ${derogados === 1 ? 'uno de los artículos está derogado' : `${derogados} de los artículos están derogados`}; ya no se aplican.</p>`;
  if (r.filtered_articles.length) {
    html += `<h2>Artículos oficiales de la LFT${r.lft_ultima_reforma_dof ? ` <span class="hint">(texto vigente con última reforma DOF ${esc(r.lft_ultima_reforma_dof)})</span>` : ''}</h2>`;
    html += r.filtered_articles.map(articleHtml).join('');
  }
  if (r.unverified_reasons.length) {
    html += `<details class="acc"><summary>Por qué no se verificó (detalle técnico)</summary><div class="acc-b"><ul>${r.unverified_reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></details>`;
  }
  html += `<div class="callout"><p>${esc(r.disclaimer)}</p></div>`;
  out.innerHTML = html;
  $('resultado').focus();
}

async function ask() {
  if (go.disabled) return;
  busy = true; sync();
  go.textContent = 'Buscando en la ley…';
  out.innerHTML = '<p class="hint">Buscando los artículos que aplican. Puede tardar hasta un minuto.</p>';
  try {
    render(await client.query({ question: q.value, include_transitorios: $<HTMLInputElement>('lft-trans').checked }));
  } catch (e) {
    const msg = e instanceof LftServiceError ? e.message : 'No pudimos completar la consulta.';
    out.innerHTML = `<div class="callout"><p>${esc(msg)}</p><p>Puedes leer la ley completa en el <a href="https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf" rel="noopener noreferrer">PDF oficial</a>.</p></div>`;
  } finally {
    busy = false; go.textContent = 'Consultar'; sync();
  }
}

async function checkStatus() {
  try {
    const r = await fetch('/api/lft/estado', { headers: { Accept: 'application/json' } });
    const s = (await r.json()) as { available: boolean; lft_ultima_reforma_dof?: string; decision_backend?: string; generator_backend?: string };
    available = !!s.available;
    if (!available) {
      estado.textContent = 'La consulta no está disponible en este momento. Intenta más tarde.';
      return;
    }
    estado.textContent = 'La consulta está disponible.';
    if (s.lft_ultima_reforma_dof) $('lft-reforma').textContent = `DOF ${s.lft_ultima_reforma_dof}`;
    $('lft-modo').textContent = s.generator_backend === 'none'
      ? 'Hoy funciona en modo de fuentes: te muestra los artículos oficiales, sin redactar una respuesta.'
      : 'Además, un modelo de lenguaje redacta una respuesta corta usando sólo esos artículos.';
    if (s.decision_backend === 'jev') {
      $('lft-terceros').textContent = 'Ahora mismo la verificación usa TypeSafe, un servicio externo: tu pregunta, los artículos encontrados y el borrador se envían a TypeSafe para revisar la respuesta. No le enviamos tu IP ni datos de tu navegador.';
      estado.textContent += ' Aviso: la verificación usa un servicio externo (TypeSafe); lee «Dónde corre».';
    } else if (s.decision_backend === 'jeff') {
      $('lft-terceros').textContent = 'Ahora mismo la verificación usa Jeff (jeffhub.ai): tu pregunta, los artículos encontrados y el borrador pueden enviarse a ese servicio para revisar la respuesta. No le enviamos tu IP ni datos de tu navegador.';
      estado.textContent += ' Aviso: la verificación puede usar un servicio externo (Jeff); lee «Dónde corre».';
    }
  } catch {
    available = false;
    estado.textContent = 'La consulta no está disponible en este momento.';
  } finally {
    sync();
  }
}

q.addEventListener('input', sync);
q.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void ask(); } });
go.addEventListener('click', () => { void ask(); });
sync();
void checkStatus();
