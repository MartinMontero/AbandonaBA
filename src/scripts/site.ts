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

// Las tablas de los textos (Markdown) no traen contenedor: se envuelven para que se desplacen en el teléfono y se puedan enfocar con el teclado.
document.querySelectorAll('main table').forEach((t) => {
  if (t.closest('.table-wrap')) return;
  const w = document.createElement('div');
  w.className = 'table-wrap';
  w.tabIndex = 0;
  w.setAttribute('role', 'region');
  w.setAttribute('aria-label', 'Tabla desplazable');
  t.replaceWith(w);
  w.append(t);
});

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
