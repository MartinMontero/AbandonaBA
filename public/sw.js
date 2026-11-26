// Service worker escrito a mano. Precarga todas las rutas y datos; funciona sin conexión después de la primera visita.
const VERSION = '__VERSION__';
const CACHE = 'aba-' + VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const res = await fetch('/precache.json', { cache: 'no-store' });
    const { urls } = await res.json();
    const cache = await caches.open(CACHE);
    await Promise.all(urls.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('aba-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // /api/* (Consulta la LFT) nunca pasa por la caché: las respuestas no se guardan en el aparato.
  if (new URL(req.url).pathname.startsWith('/api/')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(req);
    } catch (e) {
      if (req.mode === 'navigate') return (await cache.match('/')) || Response.error();
      return Response.error();
    }
  })());
});
