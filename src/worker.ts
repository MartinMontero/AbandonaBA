// Worker mínimo. Los archivos estáticos (y sus cabeceras, vía _headers) los sirve la plataforma sin invocar este código.
// Este script atiende lo que no coincide con un archivo: la página 404 y, en /api/lft/*, el proxy de «Consulta la LFT»,
// el único uso de IA del sitio (ver /consulta-lft/ y /acerca/#datos).
// No registra nada, no guarda IP, user agent ni preguntas, y no usa KV, D1, R2 ni colas.
import { handleLft, LFT_PREFIX, type LftEnv } from './lib/lftProxy';

interface Env extends LftEnv { ASSETS: { fetch(request: Request): Promise<Response> }; REVIEW_MODE?: string }

const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

export function secure(res: Response, env: { REVIEW_MODE?: string }): Response {
  const h = new Headers(res.headers);
  h.set('Content-Security-Policy', CSP);
  h.set('Referrer-Policy', 'no-referrer');
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  h.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  if (env.REVIEW_MODE === '1') h.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith(LFT_PREFIX)) return secure(await handleLft(request, env), env);
    const res = await env.ASSETS.fetch(request);
    return secure(res, env);
  },
};
