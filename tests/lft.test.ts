import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import worker from '../src/worker';
import { handleLft, MAX_QUESTION_CHARS, type LftEnv } from '../src/lib/lftProxy';
import { createLftClient, describeStatus, isLftQueryResponse, LftServiceError, type LftStatus } from '../src/lib/lftLegalClient';

const okQuery = {
  status: 'SOURCES_ONLY', answer: 'fuentes', cited_articles: [], filtered_articles: [], is_supported_prob: null,
  has_hallucinated_citation_prob: null, deterministic_citation_passed: null, unverified_reasons: [],
  decision_backend: 'off', generator_backend: 'none', lft_ultima_reforma_dof: '14-05-2026', disclaimer: 'No es asesoría legal.',
};

function env(extra: Partial<LftEnv> = {}): LftEnv {
  return { LFT_RAG_BASE_URL: 'http://svc.test', LFT_SERVICE_TOKEN: 'tok', ...extra };
}
const post = (body: unknown, headers: Record<string, string> = { 'Content-Type': 'application/json' }) =>
  new Request('https://site.test/api/lft/consulta', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });

afterEach(() => vi.unstubAllGlobals());

describe('proxy /api/lft (Worker)', () => {
  it('reenvía la consulta validada con el token y sin campos extra', async () => {
    const f = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify(okQuery), { status: 200 }));
    vi.stubGlobal('fetch', f);
    const res = await handleLft(post({ question: '  ¿aguinaldo?  ', include_transitorios: 'yes', evil: 1 }), env());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('http://svc.test/v1/legal/query');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer tok');
    expect(JSON.parse(String(init.body))).toEqual({ question: '¿aguinaldo?', include_transitorios: false, exclude_derogados: false });
  });

  it('rechaza entradas inválidas sin llamar al servicio', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    expect((await handleLft(post({ question: 'x' }), env())).status).toBe(422);
    expect((await handleLft(post({ question: 'x'.repeat(MAX_QUESTION_CHARS + 1) }), env())).status).toBe(422);
    expect((await handleLft(post({}), env())).status).toBe(422);
    expect((await handleLft(post('{no json'), env())).status).toBe(400);
    expect((await handleLft(post({ question: 'hola mundo' }, { 'Content-Type': 'text/plain' }), env())).status).toBe(415);
    expect((await handleLft(post({ question: 'y'.repeat(5000) }), env())).status).toBe(413);
    expect((await handleLft(new Request('https://site.test/api/lft/consulta'), env())).status).toBe(405);
    expect((await handleLft(new Request('https://site.test/api/lft/articulo/%3Cscript%3E'), env())).status).toBe(422);
    expect((await handleLft(new Request('https://site.test/api/lft/otra'), env())).status).toBe(404);
    expect(f).not.toHaveBeenCalled();
  });

  it('servicio apagado, sin URL o con error interno → 503/502 con mensaje en español y sin detalles internos', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('connect ECONNREFUSED'); }));
    const down = await handleLft(post({ question: '¿aguinaldo?' }), env());
    expect(down.status).toBe(503);
    expect((await down.json()).detail).toContain('no está disponible');
    expect((await handleLft(post({ question: '¿aguinaldo?' }), env({ LFT_RAG_BASE_URL: '' }))).status).toBe(503);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"detail":"No autorizado"}', { status: 401 })));
    const unauth = await handleLft(post({ question: '¿aguinaldo?' }), env());
    expect(unauth.status).toBe(502);
    expect(JSON.stringify(await unauth.json())).not.toContain('autorizado');
  });

  it('/estado expone sólo campos públicos y nunca falla', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ready: true, manifest: { lft_ultima_reforma_dof: '14-05-2026', pdf_sha256: 'abc', indexed_at_utc: 'x', embedding_model_id: 'm' }, decision_backend: 'off', generator_backend: 'none', auth_required: true }), { status: 200 })));
    const r = await handleLft(new Request('https://site.test/api/lft/estado'), env());
    expect(await r.json()).toEqual({ available: true, lft_ultima_reforma_dof: '14-05-2026', pdf_sha256: 'abc', indexed_at_utc: 'x', decision_backend: 'off', generator_backend: 'none' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    const d = await handleLft(new Request('https://site.test/api/lft/estado'), env());
    expect(d.status).toBe(200);
    expect(await d.json()).toEqual({ available: false });
  });

  it('el límite de frecuencia usa una clave fija (no la IP) y responde 429', async () => {
    const limit = vi.fn(async () => ({ success: false }));
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const req = post({ question: '¿aguinaldo?' }, { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.9' });
    const r = await handleLft(req, env({ LFT_RATE_LIMITER: { limit } }));
    expect(r.status).toBe(429);
    expect(limit).toHaveBeenCalledWith({ key: 'lft-global' });
    expect(f).not.toHaveBeenCalled();
  });

  it('el Worker enruta /api/lft/* al proxy con las cabeceras de seguridad y el resto a ASSETS', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(okQuery), { status: 200 })));
    const assets = { fetch: vi.fn(async () => new Response('<h1>404</h1>', { status: 404 })) };
    const api = await worker.fetch(post({ question: '¿aguinaldo?' }), { ASSETS: assets, ...env() });
    expect(api.status).toBe(200);
    expect(api.headers.get('Content-Security-Policy')).toContain("connect-src 'self'");
    expect(assets.fetch).not.toHaveBeenCalled();
    const page = await worker.fetch(new Request('https://site.test/nada/'), { ASSETS: assets, ...env() });
    expect(page.status).toBe(404);
    expect(assets.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('cliente tipado lftLegalClient', () => {
  it('cubre cada estado de forma exhaustiva y sólo muestra la respuesta si está verificada', () => {
    const all: LftStatus[] = ['VERIFIED', 'UNVERIFIED', 'INSUFFICIENT_CONTEXT', 'SOURCES_ONLY'];
    expect(all.filter((s) => describeStatus(s).showAnswer)).toEqual(['VERIFIED']);
    expect(() => describeStatus('OTRO' as LftStatus)).toThrow();
  });

  it('usa las rutas del servicio o del proxy y valida la respuesta', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify(okQuery), { status: 200 }));
    const svc = createLftClient({ baseUrl: 'http://127.0.0.1:8090/', token: 't', fetchImpl: f as unknown as typeof fetch });
    const r = await svc.query({ question: '¿aguinaldo?' });
    expect(isLftQueryResponse(r)).toBe(true);
    expect(f.mock.calls[0][0]).toBe('http://127.0.0.1:8090/v1/legal/query');
    const proxy = createLftClient({ baseUrl: '/api/lft', mode: 'proxy', fetchImpl: f as unknown as typeof fetch });
    await proxy.query({ question: '¿aguinaldo?' });
    expect(f.mock.calls[1][0]).toBe('/api/lft/consulta');
    f.mockImplementationOnce(async () => new Response('{"detail":"x"}', { status: 200 }));
    await expect(svc.query({ question: '¿aguinaldo?' })).rejects.toBeInstanceOf(LftServiceError);
  });

  it('convierte errores de red y HTTP en LftServiceError con el detalle del servicio', async () => {
    const down = createLftClient({ baseUrl: 'http://x', fetchImpl: (async () => { throw new TypeError('fail'); }) as unknown as typeof fetch });
    await expect(down.health()).rejects.toMatchObject({ status: 503 });
    const nf = createLftClient({ baseUrl: 'http://x', fetchImpl: (async () => new Response('{"detail":"Artículo 9999 no encontrado"}', { status: 404 })) as unknown as typeof fetch });
    await expect(nf.article('9999')).rejects.toMatchObject({ status: 404, message: 'Artículo 9999 no encontrado' });
    await expect(nf.query({ question: 'a' })).rejects.toMatchObject({ status: 422 });
  });
});

describe('transparencia de la página de consulta', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/pages/consulta-lft.astro'), 'utf8');
  it('dice que usa IA, por qué, qué guarda y que no es asesoría ni relación abogado-cliente', () => {
    for (const s of ['Usa inteligencia artificial', 'Por qué usamos IA', 'Qué guardamos y qué no', 'No guardamos nada', 'no crea una relación abogado-cliente', 'persona abogada laboral', 'PROFEDET', 'Límites']) expect(src).toContain(s);
  });
  it('acerca reconoce la excepción', () => {
    expect(fs.readFileSync(path.join(process.cwd(), 'src/pages/acerca.astro'), 'utf8')).toContain('/consulta-lft/');
  });
});
