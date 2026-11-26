// «Consulta la LFT» dentro del Worker, sin servidores propios. Todo corre en Cloudflare:
//   - D1 (LFT_DB): texto oficial de cada fragmento de la LFT, metadatos y búsqueda de texto completo FTS5 (BM25).
//   - Vectorize (LFT_VEC): un vector por fragmento, @cf/baai/bge-m3.
//   - Workers AI (AI): convierte la pregunta en un vector con el mismo modelo.
// La pregunta no se guarda ni se registra, y no sale de Cloudflare. Los datos se cargan con
// scripts/lft-cloudflare-index.mjs y scripts/lft-cloudflare-load.ps1 a partir del parser de services/lft-rag.
//
// Rutas públicas, mismo origen (CSP connect-src 'self'):
//   GET  /api/lft/estado            → disponibilidad y fecha de la última reforma indexada
//   GET  /api/lft/articulo/:id      → búsqueda exacta por artículo
//   POST /api/lft/consulta          → búsqueda híbrida (vectorial + BM25, fusión RRF) → artículos oficiales
// El límite de frecuencia usa una clave fija (no la IP).
import { embeddingText, ftsQuery, normalizeArticuloId, rrfFuse } from './lft/normalize';

export interface RateLimiter { limit(opts: { key: string }): Promise<{ success: boolean }> }
interface D1Result<T> { results: T[] }
interface D1Stmt { bind(...v: unknown[]): D1Stmt; all<T = Record<string, unknown>>(): Promise<D1Result<T>>; first<T = Record<string, unknown>>(): Promise<T | null> }
export interface D1Like { prepare(sql: string): D1Stmt }
export interface VectorizeLike {
  query(vector: number[], opts: { topK: number; filter?: Record<string, unknown>; returnMetadata?: 'none' | 'indexed' | 'all' }): Promise<{ matches: { id: string; score: number }[] }>;
}
export interface AiLike { run(model: string, input: { text: string[] }): Promise<{ data: number[][] }> }
export interface LftEnv {
  LFT_DB?: D1Like;
  LFT_VEC?: VectorizeLike;
  AI?: AiLike;
  LFT_RATE_LIMITER?: RateLimiter;
}

export const LFT_PREFIX = '/api/lft/';
export const MAX_QUESTION_CHARS = 1000;
export const MAX_BODY_BYTES = 4096;
export const EMBEDDING_MODEL = '@cf/baai/bge-m3';
const LFT_PDF_URL = 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf';
const TOP_K = 25;          // candidatos de cada búsqueda (vectorial y por palabras)
const RRF_K = 60;
const RRF_CANDIDATES = 25;
const MAX_ARTICLES = 5;     // artículos distintos que se muestran (las partes de un mismo artículo no ocupan dos lugares)

export const DISCLAIMER_ES = 'Esto no es asesoría legal ni crea una relación abogado-cliente. Es información general obtenida automáticamente del texto de la Ley Federal del Trabajo y puede contener errores u omisiones. Verifica todo con una persona abogada laboral en México; la PROFEDET ofrece asesoría gratuita.';
const MSG_SOURCES_ONLY = 'Por ahora este servicio sólo muestra fuentes: estos son los artículos oficiales de la Ley Federal del Trabajo más relacionados con tu pregunta, sin una respuesta redactada. Léelos y confírmalos con una persona abogada laboral.';
const MSG_INSUFFICIENT = 'No encontramos en la Ley Federal del Trabajo artículos suficientemente relacionados con tu pregunta como para responderla. Intenta reformularla con términos concretos (por ejemplo: «aguinaldo», «vacaciones», «despido injustificado») o consulta directamente a una persona abogada laboral.';
const UNAVAILABLE = 'La consulta de la Ley Federal del Trabajo no está disponible en este momento. Intenta más tarde; mientras tanto, lee la ley en diputados.gob.mx o llama a PROFEDET.';

interface ChunkRow {
  vid: string; articulo_id: string; articulo_label: string; titulo: string; capitulo: string; seccion: string;
  is_derogado: number; is_transitorio: number; reform_date: string; decreto: string; part_index: number;
  part_total: number; page_start: number; body: string;
}
const COLS = 'vid, articulo_id, articulo_label, titulo, capitulo, seccion, is_derogado, is_transitorio, reform_date, decreto, part_index, part_total, page_start, body';

function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });
}

function toArticle(r: ChunkRow, rrf: number | null = null) {
  return {
    articulo_id: r.articulo_id, articulo_label: r.articulo_label, titulo: r.titulo, capitulo: r.capitulo, seccion: r.seccion,
    is_derogado: !!r.is_derogado, is_transitorio: !!r.is_transitorio, reform_date: r.reform_date, decreto: r.decreto,
    part_index: r.part_index, part_total: r.part_total, page_start: r.page_start, text: r.body,
    source_url: r.page_start ? `${LFT_PDF_URL}#page=${r.page_start}` : LFT_PDF_URL,
    relevance_score: null, rrf_score: rrf,
  };
}

async function meta(db: D1Like): Promise<Record<string, string>> {
  const { results } = await db.prepare('SELECT k, v FROM meta').all<{ k: string; v: string }>();
  return Object.fromEntries(results.map((r) => [r.k, r.v]));
}

function ready(env: LftEnv): env is Required<Pick<LftEnv, 'LFT_DB' | 'LFT_VEC' | 'AI'>> & LftEnv {
  return !!(env.LFT_DB && env.LFT_VEC && env.AI);
}

export async function retrieve(env: Required<Pick<LftEnv, 'LFT_DB' | 'LFT_VEC' | 'AI'>>, question: string, includeTransitorios: boolean, excludeDerogados: boolean) {
  const filter: Record<string, unknown> = {};
  if (!includeTransitorios) filter.is_transitorio = false;
  if (excludeDerogados) filter.is_derogado = false;
  const fts = ftsQuery(question);
  const conds = [includeTransitorios ? '' : 'c.is_transitorio = 0', excludeDerogados ? 'c.is_derogado = 0' : ''].filter(Boolean);
  const [emb, lexical] = await Promise.all([
    env.AI.run(EMBEDDING_MODEL, { text: [embeddingText(question)] }),
    fts
      ? env.LFT_DB.prepare(`SELECT c.vid FROM chunks_fts f JOIN chunks c ON c.rowid = f.rowid WHERE chunks_fts MATCH ?1${conds.length ? ' AND ' + conds.join(' AND ') : ''} ORDER BY bm25(chunks_fts) LIMIT ${TOP_K}`).bind(fts).all<{ vid: string }>()
      : Promise.resolve({ results: [] as { vid: string }[] }),
  ]);
  const dense = await env.LFT_VEC.query(emb.data[0], { topK: TOP_K, filter: Object.keys(filter).length ? filter : undefined, returnMetadata: 'none' });
  const fused = rrfFuse([dense.matches.map((m) => m.id), lexical.results.map((r) => r.vid)], RRF_K).slice(0, RRF_CANDIDATES);
  if (!fused.length) return [];
  const ids = fused.map(([id]) => id);
  const { results } = await env.LFT_DB.prepare(`SELECT ${COLS} FROM chunks WHERE vid IN (${ids.map((_, i) => `?${i + 1}`).join(', ')})`).bind(...ids).all<ChunkRow>();
  const byId = new Map(results.map((r) => [r.vid, r]));
  return fused.filter(([id]) => byId.has(id)).map(([id, score]) => ({ row: byId.get(id)!, rrf: score }));
}

export async function handleLft(request: Request, env: LftEnv): Promise<Response> {
  const url = new URL(request.url);
  const sub = url.pathname.slice(LFT_PREFIX.length);

  if (sub === 'estado') {
    if (request.method !== 'GET') return json(405, { detail: 'Método no permitido' }, { Allow: 'GET' });
    if (!ready(env)) return json(200, { available: false });
    try {
      const m = await meta(env.LFT_DB);
      return json(200, {
        available: Number(m.total_chunks ?? 0) > 0,
        lft_ultima_reforma_dof: m.lft_ultima_reforma_dof ?? '',
        pdf_sha256: m.pdf_sha256 ?? '',
        indexed_at_utc: m.cf_indexed_at_utc ?? m.indexed_at_utc ?? '',
        decision_backend: 'off',
        generator_backend: 'none',
      });
    } catch {
      return json(200, { available: false });
    }
  }

  if (env.LFT_RATE_LIMITER) {
    const { success } = await env.LFT_RATE_LIMITER.limit({ key: 'lft-global' });
    if (!success) return json(429, { detail: 'Hay muchas consultas en este momento. Espera un minuto e intenta de nuevo.' }, { 'Retry-After': '60' });
  }

  if (sub.startsWith('articulo/')) {
    if (request.method !== 'GET') return json(405, { detail: 'Método no permitido' }, { Allow: 'GET' });
    let raw: string;
    try { raw = decodeURIComponent(sub.slice('articulo/'.length)); } catch { return json(422, { detail: 'Identificador de artículo inválido' }); }
    if (!/^[0-9A-Za-zÁÉÍÓÚáéíóúÑñº°. ()-]{1,60}$/.test(raw)) return json(422, { detail: 'Identificador de artículo inválido' });
    if (!ready(env)) return json(503, { detail: UNAVAILABLE });
    const includeTrans = url.searchParams.get('include_transitorios') === 'true';
    const id = normalizeArticuloId(raw);
    try {
      const { results } = await env.LFT_DB.prepare(`SELECT ${COLS} FROM chunks WHERE articulo_id = ?1${includeTrans ? '' : ' AND is_transitorio = 0'} ORDER BY part_index`).bind(id).all<ChunkRow>();
      if (!results.length) return json(404, { detail: `Artículo ${id} no encontrado en la LFT indexada` });
      const m = await meta(env.LFT_DB);
      return json(200, {
        articulo_id: results[0].articulo_id, found: true, is_derogado: !!results[0].is_derogado, reform_date: results[0].reform_date,
        chunks: results.map((r) => toArticle(r)), lft_ultima_reforma_dof: m.lft_ultima_reforma_dof ?? '',
      });
    } catch {
      return json(503, { detail: UNAVAILABLE });
    }
  }

  if (sub === 'consulta') {
    if (request.method !== 'POST') return json(405, { detail: 'Método no permitido' }, { Allow: 'POST' });
    if (!(request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/json')) return json(415, { detail: 'Se espera JSON' });
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) return json(413, { detail: 'La consulta es demasiado larga' });
    let body: unknown;
    try { body = JSON.parse(rawBody); } catch { return json(400, { detail: 'JSON inválido' }); }
    const b = body as Record<string, unknown>;
    if (!b || typeof b !== 'object' || typeof b.question !== 'string') return json(422, { detail: 'Falta la pregunta' });
    const question = b.question.trim();
    if (question.length < 3) return json(422, { detail: 'Escribe una pregunta más completa' });
    if (question.length > MAX_QUESTION_CHARS) return json(422, { detail: `La pregunta no puede pasar de ${MAX_QUESTION_CHARS} caracteres` });
    if (!ready(env)) return json(503, { detail: UNAVAILABLE });
    try {
      const hits = await retrieve(env, question, b.include_transitorios === true, b.exclude_derogados === true);
      const m = await meta(env.LFT_DB);
      const seen = new Set<string>();
      const articles = hits.filter((h) => !seen.has(h.row.articulo_id) && seen.add(h.row.articulo_id)).slice(0, MAX_ARTICLES).map((h) => toArticle(h.row, h.rrf));
      return json(200, {
        status: articles.length ? 'SOURCES_ONLY' : 'INSUFFICIENT_CONTEXT',
        answer: articles.length ? MSG_SOURCES_ONLY : MSG_INSUFFICIENT,
        cited_articles: [], filtered_articles: articles,
        is_supported_prob: null, has_hallucinated_citation_prob: null, deterministic_citation_passed: null, unverified_reasons: [],
        decision_backend: 'off', generator_backend: 'none',
        lft_ultima_reforma_dof: m.lft_ultima_reforma_dof ?? '', disclaimer: DISCLAIMER_ES,
      });
    } catch {
      return json(503, { detail: UNAVAILABLE });
    }
  }

  return json(404, { detail: 'No encontrado' });
}
