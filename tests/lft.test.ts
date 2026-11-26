import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import worker from '../src/worker';
import { handleLft, MAX_QUESTION_CHARS, EMBEDDING_MODEL, type LftEnv } from '../src/lib/lftProxy';
import { normalizeArticuloId, tokenizeEs, ftsQuery, rrfFuse } from '../src/lib/lft/normalize';
import { createLftClient, describeStatus, isLftQueryResponse, LftServiceError, type LftStatus } from '../src/lib/lftLegalClient';

// ---------------------------------------------------------------------------
// Bindings simulados de D1, Vectorize y Workers AI
// ---------------------------------------------------------------------------
const row = (vid: string, articulo_id: string, body: string, extra: Partial<Record<string, unknown>> = {}) => ({
  vid, articulo_id, articulo_label: articulo_id, titulo: 'TITULO TERCERO - Condiciones de Trabajo', capitulo: '', seccion: '',
  is_derogado: 0, is_transitorio: 0, reform_date: '30-11-2012', decreto: '', part_index: 1, part_total: 1, page_start: 25, body, ...extra,
});
const ROWS = [
  row('c1', '87', 'Los trabajadores tendrán derecho a un aguinaldo anual.'),
  row('c2', '76', 'Las personas trabajadoras que tengan más de un año de servicios disfrutarán de un periodo anual de vacaciones.'),
  row('c3', '15-A', 'Se deroga.', { is_derogado: 1, page_start: 6 }),
  row('c4', 'Transitorio Primero (Decreto 5)', 'El presente Decreto entrará en vigor.', { is_transitorio: 1 }),
];
const META = [{ k: 'lft_ultima_reforma_dof', v: '14-05-2026' }, { k: 'pdf_sha256', v: 'abc' }, { k: 'cf_indexed_at_utc', v: '2026-11-26T08:00:00Z' }, { k: 'total_chunks', v: '1752' }];

function fakeEnv(opts: { dense?: string[]; lexical?: string[]; failAi?: boolean } = {}) {
  const sqls: { sql: string; args: unknown[] }[] = [];
  const db = {
    prepare(sql: string) {
      let args: unknown[] = [];
      const stmt = {
        bind(...v: unknown[]) { args = v; return stmt; },
        async all() {
          sqls.push({ sql, args });
          if (sql.startsWith('SELECT k, v FROM meta')) return { results: META };
          if (sql.includes('chunks_fts')) return { results: (opts.lexical ?? ['c1', 'c2']).map((vid) => ({ vid })) };
          if (sql.includes('WHERE vid IN')) return { results: ROWS.filter((r) => args.includes(r.vid)) };
          if (sql.includes('WHERE articulo_id = ?1')) return { results: ROWS.filter((r) => r.articulo_id === args[0] && (sql.includes('is_transitorio = 0') ? !r.is_transitorio : true)) };
          return { results: [] };
        },
        async first() { return null; },
      };
      return stmt;
    },
  };
  const vec = { query: vi.fn(async () => ({ matches: (opts.dense ?? ['c1', 'c3']).map((id, i) => ({ id, score: 1 - i / 10 })) })) };
  const ai = { run: vi.fn(async () => { if (opts.failAi) throw new Error('ai down'); return { data: [[0.1, 0.2, 0.3]] }; }) };
  const env: LftEnv = { LFT_DB: db, LFT_VEC: vec, AI: ai };
  return { env, sqls, vec, ai };
}
const post = (body: unknown, headers: Record<string, string> = { 'Content-Type': 'application/json' }) =>
  new Request('https://site.test/api/lft/consulta', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
const get = (p: string) => new Request('https://site.test/api/lft/' + p);

describe('Consulta la LFT dentro del Worker (D1 + Vectorize + Workers AI)', () => {
  it('consulta: híbrida, fusiona por RRF, sólo artículos oficiales y sin transitorios por defecto', async () => {
    const { env, vec, ai, sqls } = fakeEnv();
    const r = await handleLft(post({ question: '  ¿Cuántos días de aguinaldo me tocan?  ', evil: 1 }), env);
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    const d = await r.json();
    expect(d.status).toBe('SOURCES_ONLY');
    // c1 aparece en ambas listas (gana); c2 y c3 empatan (1/62) y se desempata por id.
    expect(d.filtered_articles.map((a: { articulo_id: string }) => a.articulo_id)).toEqual(['87', '76', '15-A']);
    expect(d.filtered_articles[2].is_derogado).toBe(true);
    expect(d.filtered_articles[0].source_url).toBe('https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf#page=25');
    expect(d.lft_ultima_reforma_dof).toBe('14-05-2026');
    expect(d.disclaimer).toContain('abogado-cliente');
    expect(ai.run).toHaveBeenCalledWith(EMBEDDING_MODEL, { text: ['¿Cuántos días de aguinaldo me tocan?'] });
    expect(vec.query.mock.calls[0][1]).toMatchObject({ topK: 15, filter: { is_transitorio: false } });
    const fts = sqls.find((s) => s.sql.includes('chunks_fts'))!;
    expect(fts.sql).toContain('c.is_transitorio = 0');
    expect(fts.args[0]).toBe('"dias" OR "aguinaldo"');
  });

  it('incluir transitorios y excluir derogados cambia los filtros', async () => {
    const { env, vec, sqls } = fakeEnv();
    await handleLft(post({ question: 'subcontratación', include_transitorios: true, exclude_derogados: true }), env);
    expect(vec.query.mock.calls[0][1]).toMatchObject({ filter: { is_derogado: false } });
    const fts = sqls.find((s) => s.sql.includes('chunks_fts'))!;
    expect(fts.sql).not.toContain('is_transitorio = 0');
    expect(fts.sql).toContain('c.is_derogado = 0');
  });

  it('sin resultados → INSUFFICIENT_CONTEXT sin artículos', async () => {
    const { env } = fakeEnv({ dense: [], lexical: [] });
    const d = await (await handleLft(post({ question: 'zzz qqq' }), env)).json();
    expect(d.status).toBe('INSUFFICIENT_CONTEXT');
    expect(d.filtered_articles).toEqual([]);
  });

  it('artículo exacto: normaliza el identificador y marca derogados', async () => {
    const { env } = fakeEnv();
    const r = await handleLft(get('articulo/15-a'), env);
    expect(r.status).toBe(200);
    const d = await r.json();
    expect(d.articulo_id).toBe('15-A');
    expect(d.is_derogado).toBe(true);
    expect(d.chunks[0].source_url).toMatch(/#page=6$/);
    expect((await handleLft(get('articulo/9999'), env)).status).toBe(404);
    expect((await handleLft(get('articulo/%3Cscript%3E'), env)).status).toBe(422);
  });

  it('rechaza entradas inválidas sin llamar a la IA', async () => {
    const { env, ai } = fakeEnv();
    expect((await handleLft(post({ question: 'x' }), env)).status).toBe(422);
    expect((await handleLft(post({ question: 'x'.repeat(MAX_QUESTION_CHARS + 1) }), env)).status).toBe(422);
    expect((await handleLft(post({}), env)).status).toBe(422);
    expect((await handleLft(post('{no json'), env)).status).toBe(400);
    expect((await handleLft(post({ question: 'hola mundo' }, { 'Content-Type': 'text/plain' }), env)).status).toBe(415);
    expect((await handleLft(post({ question: 'y'.repeat(5000) }), env)).status).toBe(413);
    expect((await handleLft(get('consulta'), env)).status).toBe(405);
    expect((await handleLft(get('otra'), env)).status).toBe(404);
    expect(ai.run).not.toHaveBeenCalled();
  });

  it('sin bindings o si falla la IA → 503 en español; /estado dice no disponible', async () => {
    const bare = await handleLft(post({ question: '¿aguinaldo?' }), {});
    expect(bare.status).toBe(503);
    expect((await bare.json()).detail).toContain('no está disponible');
    expect(await (await handleLft(get('estado'), {})).json()).toEqual({ available: false });
    const { env } = fakeEnv({ failAi: true });
    expect((await handleLft(post({ question: '¿aguinaldo?' }), env)).status).toBe(503);
  });

  it('/estado lee el manifiesto de D1', async () => {
    const { env } = fakeEnv();
    expect(await (await handleLft(get('estado'), env)).json()).toEqual({
      available: true, lft_ultima_reforma_dof: '14-05-2026', pdf_sha256: 'abc', indexed_at_utc: '2026-11-26T08:00:00Z', decision_backend: 'off', generator_backend: 'none',
    });
  });

  it('el límite de frecuencia usa una clave fija (no la IP) y responde 429 antes de consultar', async () => {
    const { env, ai } = fakeEnv();
    const limit = vi.fn(async () => ({ success: false }));
    const req = post({ question: '¿aguinaldo?' }, { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.9' });
    const r = await handleLft(req, { ...env, LFT_RATE_LIMITER: { limit } });
    expect(r.status).toBe(429);
    expect(limit).toHaveBeenCalledWith({ key: 'lft-global' });
    expect(ai.run).not.toHaveBeenCalled();
  });

  it('el Worker enruta /api/lft/* con las cabeceras de seguridad y el resto a ASSETS', async () => {
    const { env } = fakeEnv();
    const assets = { fetch: vi.fn(async () => new Response('<h1>404</h1>', { status: 404 })) };
    const api = await worker.fetch(post({ question: '¿aguinaldo?' }), { ASSETS: assets, ...env });
    expect(api.status).toBe(200);
    expect(api.headers.get('Content-Security-Policy')).toContain("connect-src 'self'");
    expect(assets.fetch).not.toHaveBeenCalled();
    const page = await worker.fetch(new Request('https://site.test/nada/'), { ASSETS: assets, ...env });
    expect(page.status).toBe(404);
  });
});

describe('normalización (igual que services/lft-rag)', () => {
  it.each([
    ['1o.', '1'], ['Artículo 3o. Bis', '3 Bis'], ['3 bis', '3 Bis'], ['15-a', '15-A'], ['330-A', '330-A'], ['512-D bis', '512-D Bis'],
    ['279 Cuáter', '279 Quáter'], ['279 Quater', '279 Quáter'], ['100 Quinquies', '100 Quinquies'], ['1º', '1'], ['353-ñ', '353-Ñ'], ['Único', 'Único'], ['Art. 47', '47'],
  ])('%s → %s', (raw, expected) => { expect(normalizeArticuloId(raw)).toBe(expected); });

  it('tokens BM25 conservan términos jurídicos y quitan palabras vacías', () => {
    const toks = tokenizeEs('Artículo 15-A, 512-D Bis y 3o. Ter: indemnización del trabajador');
    for (const t of ['15-a', '512-d', 'bis', 'ter', '3', 'indemnizacion']) expect(toks).toContain(t);
    expect(toks).not.toContain('del');
    expect(ftsQuery('"; DROP TABLE chunks; --')).toBe('"drop" OR "table" OR "chunks"');
  });

  it('RRF: score = Σ 1/(k + rank)', () => {
    const fused = Object.fromEntries(rrfFuse([['a', 'b', 'c'], ['b', 'c', 'd']], 60));
    expect(fused.b).toBeCloseTo(1 / 62 + 1 / 61);
    expect(fused.a).toBeCloseTo(1 / 61);
  });
});

describe('cliente tipado lftLegalClient', () => {
  const okQuery = {
    status: 'SOURCES_ONLY', answer: 'fuentes', cited_articles: [], filtered_articles: [], is_supported_prob: null,
    has_hallucinated_citation_prob: null, deterministic_citation_passed: null, unverified_reasons: [],
    decision_backend: 'off', generator_backend: 'none', lft_ultima_reforma_dof: '14-05-2026', disclaimer: 'No es asesoría legal.',
  };
  it('cubre cada estado de forma exhaustiva y sólo muestra la respuesta si está verificada', () => {
    const all: LftStatus[] = ['VERIFIED', 'UNVERIFIED', 'INSUFFICIENT_CONTEXT', 'SOURCES_ONLY'];
    expect(all.filter((s) => describeStatus(s).showAnswer)).toEqual(['VERIFIED']);
    expect(() => describeStatus('OTRO' as LftStatus)).toThrow();
  });
  it('usa las rutas del servicio o del proxy y valida la respuesta', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify(okQuery), { status: 200 }));
    const svc = createLftClient({ baseUrl: 'http://127.0.0.1:8090/', token: 't', fetchImpl: f as unknown as typeof fetch });
    expect(isLftQueryResponse(await svc.query({ question: '¿aguinaldo?' }))).toBe(true);
    expect(f.mock.calls[0][0]).toBe('http://127.0.0.1:8090/v1/legal/query');
    const proxy = createLftClient({ baseUrl: '/api/lft', mode: 'proxy', fetchImpl: f as unknown as typeof fetch });
    await proxy.query({ question: '¿aguinaldo?' });
    expect(f.mock.calls[1][0]).toBe('/api/lft/consulta');
    f.mockImplementationOnce(async () => new Response('{"detail":"x"}', { status: 200 }));
    await expect(svc.query({ question: '¿aguinaldo?' })).rejects.toBeInstanceOf(LftServiceError);
  });
  it('convierte errores de red y HTTP en LftServiceError', async () => {
    const down = createLftClient({ baseUrl: 'http://x', fetchImpl: (async () => { throw new TypeError('fail'); }) as unknown as typeof fetch });
    await expect(down.health()).rejects.toMatchObject({ status: 503 });
    const nf = createLftClient({ baseUrl: 'http://x', fetchImpl: (async () => new Response('{"detail":"Artículo 9999 no encontrado"}', { status: 404 })) as unknown as typeof fetch });
    await expect(nf.article('9999')).rejects.toMatchObject({ status: 404, message: 'Artículo 9999 no encontrado' });
  });
});

describe('transparencia de la página de consulta', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/pages/consulta-lft.astro'), 'utf8');
  it('dice que usa IA, por qué, dónde corre, qué guarda y que no es asesoría ni relación abogado-cliente', () => {
    for (const s of ['Usa inteligencia artificial', 'Por qué usamos IA', 'Dónde corre', 'Cloudflare', 'Qué guardamos y qué no', 'No guardamos nada', 'no crea una relación abogado-cliente', 'persona abogada laboral', 'PROFEDET', 'Límites']) expect(src).toContain(s);
  });
  it('ya no promete ni depende de una computadora del proyecto', () => {
    for (const f of ['src/pages/consulta-lft.astro', 'src/pages/acerca.astro', 'src/content/en/acerca.md', 'src/scripts/consulta-lft.ts']) {
      expect(fs.readFileSync(path.join(process.cwd(), f), 'utf8'), f).not.toMatch(/computadora del proyecto|computer run by the project|computadora que la atiende/);
    }
  });
});
