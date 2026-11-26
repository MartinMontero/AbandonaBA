// Proxy del Worker hacia el servicio lft-rag (Consulta la LFT).
// Rutas públicas, mismo origen (CSP connect-src 'self'):
//   GET  /api/lft/estado            → /health (sólo campos públicos)
//   GET  /api/lft/articulo/:id      → /v1/legal/articles/:id
//   POST /api/lft/consulta          → /v1/legal/query
// Privacidad: no se registra el cuerpo, la IP ni encabezados del visitante; al servicio sólo se reenvía el JSON validado.
// El límite de frecuencia usa una clave fija (no la IP), así que protege la máquina sin identificar a nadie.

export interface RateLimiter { limit(opts: { key: string }): Promise<{ success: boolean }> }
export interface LftEnv {
  LFT_RAG_BASE_URL?: string;
  LFT_SERVICE_TOKEN?: string;
  LFT_RATE_LIMITER?: RateLimiter;
}

export const LFT_PREFIX = '/api/lft/';
export const MAX_QUESTION_CHARS = 1000;
export const MAX_BODY_BYTES = 4096;
// El borde de Cloudflare corta en ~100 s las respuestas de un origen vía túnel (error 524); se corta antes con un mensaje útil.
const QUERY_TIMEOUT_MS = 95_000;
const LOOKUP_TIMEOUT_MS = 20_000;

function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });
}

const OFFLINE = 'La consulta de la Ley Federal del Trabajo no está disponible en este momento: el servidor que la atiende está apagado o en mantenimiento. Mientras tanto, lee la ley en diputados.gob.mx o llama a PROFEDET.';

async function upstream(env: LftEnv, path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const base = (env.LFT_RAG_BASE_URL ?? '').replace(/\/+$/, '');
  if (!base) return json(503, { detail: OFFLINE });
  const headers = new Headers({ Accept: 'application/json' });
  if (init.body) headers.set('Content-Type', 'application/json');
  if (env.LFT_SERVICE_TOKEN) headers.set('Authorization', `Bearer ${env.LFT_SERVICE_TOKEN}`);
  let res: Response;
  try {
    res = await fetch(base + path, { ...init, headers, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    const timeout = (e as Error)?.name === 'TimeoutError' || (e as Error)?.name === 'AbortError';
    return json(timeout ? 504 : 503, { detail: timeout ? 'El servicio tardó demasiado en responder. Intenta con una pregunta más concreta.' : OFFLINE });
  }
  // Errores del servicio: se pasan códigos útiles pero nunca detalles internos (p. ej. 401 por token mal configurado).
  if (res.status === 401 || res.status >= 500) {
    return json(res.status === 503 ? 503 : 502, { detail: res.status === 503 ? 'El servicio está ocupado o preparando el índice. Intenta en un momento.' : OFFLINE });
  }
  const text = await res.text();
  return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export async function handleLft(request: Request, env: LftEnv): Promise<Response> {
  const url = new URL(request.url);
  const sub = url.pathname.slice(LFT_PREFIX.length);

  if (sub === 'estado') {
    if (request.method !== 'GET') return json(405, { detail: 'Método no permitido' }, { Allow: 'GET' });
    const res = await upstream(env, '/health', { method: 'GET' }, LOOKUP_TIMEOUT_MS);
    if (!res.ok) return json(200, { available: false });
    const h = (await res.json()) as { ready?: boolean; manifest?: { lft_ultima_reforma_dof?: string; pdf_sha256?: string; indexed_at_utc?: string } | null; decision_backend?: string; generator_backend?: string };
    return json(200, {
      available: !!h.ready,
      lft_ultima_reforma_dof: h.manifest?.lft_ultima_reforma_dof ?? '',
      pdf_sha256: h.manifest?.pdf_sha256 ?? '',
      indexed_at_utc: h.manifest?.indexed_at_utc ?? '',
      decision_backend: h.decision_backend ?? 'off',
      generator_backend: h.generator_backend ?? 'none',
    });
  }

  if (env.LFT_RATE_LIMITER) {
    const { success } = await env.LFT_RATE_LIMITER.limit({ key: 'lft-global' });
    if (!success) return json(429, { detail: 'Hay muchas consultas en este momento. Espera un minuto e intenta de nuevo.' }, { 'Retry-After': '60' });
  }

  if (sub.startsWith('articulo/')) {
    if (request.method !== 'GET') return json(405, { detail: 'Método no permitido' }, { Allow: 'GET' });
    const id = decodeURIComponent(sub.slice('articulo/'.length));
    if (!/^[0-9A-Za-zÁÉÍÓÚáéíóúÑñº°. -]{1,40}$/.test(id)) return json(422, { detail: 'Identificador de artículo inválido' });
    return upstream(env, `/v1/legal/articles/${encodeURIComponent(id)}`, { method: 'GET' }, LOOKUP_TIMEOUT_MS);
  }

  if (sub === 'consulta') {
    if (request.method !== 'POST') return json(405, { detail: 'Método no permitido' }, { Allow: 'POST' });
    if (!(request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/json')) return json(415, { detail: 'Se espera JSON' });
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json(413, { detail: 'La consulta es demasiado larga' });
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return json(400, { detail: 'JSON inválido' }); }
    const b = body as Record<string, unknown>;
    if (!b || typeof b !== 'object' || typeof b.question !== 'string') return json(422, { detail: 'Falta la pregunta' });
    const question = b.question.trim();
    if (question.length < 3) return json(422, { detail: 'Escribe una pregunta más completa' });
    if (question.length > MAX_QUESTION_CHARS) return json(422, { detail: `La pregunta no puede pasar de ${MAX_QUESTION_CHARS} caracteres` });
    // Sólo se reenvían campos conocidos, con tipos forzados.
    const forward = { question, include_transitorios: b.include_transitorios === true, exclude_derogados: b.exclude_derogados === true };
    return upstream(env, '/v1/legal/query', { method: 'POST', body: JSON.stringify(forward) }, QUERY_TIMEOUT_MS);
  }

  return json(404, { detail: 'No encontrado' });
}
