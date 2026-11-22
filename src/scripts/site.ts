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

const offline = document.getElementById('offline-banner');
const sync = () => { if (offline) offline.hidden = navigator.onLine; };
window.addEventListener('online', sync);
window.addEventListener('offline', sync);
sync();

document.querySelectorAll<HTMLElement>('[data-copy]').forEach((b) =>
  b.addEventListener('click', async () => {
    const text = b.dataset.copy || '';
    try { await navigator.clipboard.writeText(text); b.textContent = 'Copiado'; } catch { b.textContent = 'Copia el enlace a mano'; }
  }),
);
document.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => window.print()));

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
