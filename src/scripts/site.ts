// Cliente mínimo: salida rápida, aviso sin conexión, copiar, imprimir y service worker. Sin red, sin cookies, sin almacenamiento.
const exitUrl = document.body.dataset.exitUrl || 'https://www.gob.mx/';
const go = () => location.replace(exitUrl);

document.getElementById('quick-exit')?.addEventListener('click', go);

let lastEsc = 0;
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const now = Date.now();
  if (now - lastEsc < 800) go();
  lastEsc = now;
});

document.documentElement.classList.add('js');

// Tablas de los textos: con pocas columnas se vuelven tarjetas apiladas en el teléfono (cada celda lleva su rótulo);
// las demás se envuelven en una región desplazable que se puede enfocar con el teclado.
document.querySelectorAll<HTMLTableElement>('main table').forEach((t) => {
  if (t.closest('.table-wrap')) return;
  const heads = Array.from(t.querySelectorAll('thead th')).map((h) => (h.textContent || '').trim());
  if (heads.length > 0 && heads.length <= 5 && t.closest('.prose')) {
    t.classList.add('rt');
    t.querySelectorAll('tbody tr').forEach((tr) => {
      Array.from(tr.children).forEach((c, i) => { if (heads[i]) c.setAttribute('data-label', heads[i]); });
    });
    return;
  }
  const w = document.createElement('div');
  w.className = 'table-wrap';
  w.tabIndex = 0;
  w.setAttribute('role', 'region');
  w.setAttribute('aria-label', 'Tabla desplazable');
  t.replaceWith(w);
  w.append(t);
});

// Barra superior: sombra al desplazarse.
const bar = document.getElementById('app-bar');
const onScroll = () => bar?.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Entrada suave de las secciones (se respeta prefers-reduced-motion en el CSS).
const reveals = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
if ('IntersectionObserver' in window && reveals.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px 6% 0px', threshold: 0 });
  reveals.forEach((r) => io.observe(r));
} else {
  reveals.forEach((r) => r.classList.add('in'));
}

// Tabla de contenido: marca la sección visible.
const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.toc a'));
if (tocLinks.length && 'IntersectionObserver' in window) {
  const map = new Map<Element, HTMLAnchorElement>();
  tocLinks.forEach((a) => { const el = document.getElementById(decodeURIComponent(a.hash.slice(1))); if (el) map.set(el, a); });
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      tocLinks.forEach((a) => a.removeAttribute('aria-current'));
      map.get(e.target)?.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-15% 0px -75% 0px' });
  map.forEach((_, el) => spy.observe(el));
}

const offline = document.getElementById('offline-banner');
const sync = () => { if (offline) offline.hidden = navigator.onLine; };
window.addEventListener('online', sync);
window.addEventListener('offline', sync);
sync();

// Aviso no bloqueante (snackbar): se oculta solo.
const snack = document.getElementById('snackbar');
let snackTimer: number | undefined;
export function say(msg: string) {
  if (!snack) return;
  snack.textContent = msg;
  snack.hidden = false;
  window.clearTimeout(snackTimer);
  snackTimer = window.setTimeout(() => { snack.hidden = true; }, 4000);
}
(window as unknown as { aba?: { say: (m: string) => void } }).aba = { say };

document.querySelectorAll<HTMLElement>('[data-copy]').forEach((b) =>
  b.addEventListener('click', async () => {
    const text = b.dataset.copy || '';
    try { await navigator.clipboard.writeText(text); say('Copiado'); } catch { say('No se pudo copiar. Cópialo a mano.'); }
  }),
);
document.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => window.print()));

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// Abre el acordeón al que apunta el enlace (#id), para que los hitos lleven directo al detalle.
function openHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  const el = document.getElementById(id);
  if (el instanceof HTMLDetailsElement) { el.open = true; el.scrollIntoView({ block: 'start' }); }
}
window.addEventListener('hashchange', openHash);
openHash();

// Frases listas para copiar (botones con data-say).
document.querySelectorAll<HTMLButtonElement>('[data-say]').forEach((b) => {
  b.addEventListener('click', async () => {
    const text = (b.textContent ?? '').trim();
    const say = (window as unknown as { aba?: { say: (s: string) => void } }).aba?.say;
    try { await navigator.clipboard.writeText(text); say?.('Frase copiada'); } catch { say?.('No se pudo copiar. Selecciónala y cópiala a mano.'); }
  });
});
