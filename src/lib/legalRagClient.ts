// Cliente del Worker para el origen legal-rag (LFT + LSS) detrás de Cloudflare Access,
// con caché KV versionada por hash del manifiesto y reintento con token de respaldo.

import type { LftArticle, LftArticleLookup, LftQueryResponse, LftStatus } from './lftLegalClient';
import { LftServiceError, MAX_QUESTION_CHARS, isLftQueryResponse } from './lftLegalClient';

export type LawCode = 'LFT' | 'LSS';
export type LawFilter = 'LFT' | 'LSS' | 'ALL';
export type CacheStatus = 'HIT' | 'MISS' | 'BYPASS';

export interface KVNamespaceLike {
  get(key: string, type?: 'text'): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

export interface LegalRagEnv {
  LEGAL_RAG_ORIGIN?: string;
  LEGAL_RAG_CACHE?: KVNamespaceLike;
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
  CF_ACCESS_CLIENT_ID_FALLBACK?: string;
  CF_ACCESS_CLIENT_SECRET_FALLBACK?: string;
}

export interface LegalRagQueryOpts {
  question: string;
  lawFilter?: LawFilter;
  includeTransitorios?: boolean;
  excludeDerogados?: boolean;
  bypassCache?: boolean;
}

export interface CachedQueryResult {
  data: LftQueryResponse & { corpus_version_hash?: string; lss_ultima_reforma_dof?: string };
  cache_status: CacheStatus;
  corpus_version_hash: string;
}

export interface CachedArticleResult {
  data: LftArticleLookup & { law_code?: LawCode; corpus_version_hash?: string };
  cache_status: CacheStatus;
  corpus_version_hash: string;
}

const META_CORPUS_KEY = 'meta:active_corpus_hash';
const HASH_MEMORY_TTL_MS = 5 * 60 * 1000;
const VERIFIED_QUERY_TTL_S = 604_800; // 7 días
const ARTICLE_LOOKUP_TTL_S = 2_592_000; // 30 días

let cachedHash = '';
let cachedHashExpiresAt = 0;

export function resetIsolateHashCache(): void {
  cachedHash = '';
  cachedHashExpiresAt = 0;
}

export function normalizeQueryForCache(question: string): string {
  return question.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function buildQueryCacheKey(
  corpusHash: string,
  lawFilter: LawFilter,
  excludeDerogados: boolean,
  querySha256: string,
  includeTransitorios = false,
): string {
  const vig = excludeDerogados ? 'vig' : 'all';
  const suffix = includeTransitorios ? ':tr' : '';
  return `v1:${corpusHash}:q:${lawFilter}:${vig}${suffix}:${querySha256}`;
}

export function buildArticleCacheKey(
  corpusHash: string,
  lawCode: LawCode,
  canonicalArticuloId: string,
  includeTransitorios = false,
): string {
  return `v1:${corpusHash}:art:${lawCode}:${canonicalArticuloId}${includeTransitorios ? ':tr' : ''}`;
}

export function createLegalRagClient(
  env: LegalRagEnv,
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number; ctx?: ExecutionContextLike } = {},
) {
  const base = (env.LEGAL_RAG_ORIGIN ?? 'http://127.0.0.1:8090').replace(/\/+$/, '');
  const f = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 60_000;

  async function fetchWithServiceToken(path: string, init: RequestInit = {}): Promise<Response> {
    const doFetch = async (clientId?: string, clientSecret?: string): Promise<Response> => {
      const headers = new Headers(init.headers);
      headers.set('Accept', 'application/json');
      if (init.body) headers.set('Content-Type', 'application/json');
      if (clientId && clientSecret) {
        headers.set('CF-Access-Client-Id', clientId);
        headers.set('CF-Access-Client-Secret', clientSecret);
      }
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        return await f(base + path, { ...init, headers, redirect: 'manual', signal: ctrl.signal });
      } finally {
        clearTimeout(timer);
      }
    };

    let res = await doFetch(env.CF_ACCESS_CLIENT_ID, env.CF_ACCESS_CLIENT_SECRET);
    if (
      (res.status === 401 || res.status === 403) &&
      env.CF_ACCESS_CLIENT_ID_FALLBACK &&
      env.CF_ACCESS_CLIENT_SECRET_FALLBACK
    ) {
      res = await doFetch(env.CF_ACCESS_CLIENT_ID_FALLBACK, env.CF_ACCESS_CLIENT_SECRET_FALLBACK);
    }
    return res;
  }

  async function refreshHashFromHealth(): Promise<string> {
    try {
      const res = await fetchWithServiceToken('/health');
      if (!res.ok) return '';
      const data = (await res.json()) as {
        corpus_version_hash?: string;
        manifest?: { corpus_version_hash?: string; pdf_sha256?: string } | null;
      };
      const hash = data.corpus_version_hash || data.manifest?.corpus_version_hash || data.manifest?.pdf_sha256 || '';
      if (hash) {
        cachedHash = hash;
        cachedHashExpiresAt = Date.now() + HASH_MEMORY_TTL_MS;
        if (env.LEGAL_RAG_CACHE) {
          await env.LEGAL_RAG_CACHE.put(META_CORPUS_KEY, hash, { expirationTtl: 86_400 });
        }
      }
      return hash;
    } catch {
      return '';
    }
  }

  async function resolveCorpusHash(): Promise<string> {
    const now = Date.now();
    if (cachedHash && now < cachedHashExpiresAt) return cachedHash;

    if (env.LEGAL_RAG_CACHE) {
      const kvHash = await env.LEGAL_RAG_CACHE.get(META_CORPUS_KEY, 'text');
      if (kvHash) {
        cachedHash = kvHash;
        cachedHashExpiresAt = now + HASH_MEMORY_TTL_MS;
        if (opts.ctx) opts.ctx.waitUntil(refreshHashFromHealth());
        return kvHash;
      }
    }

    const liveHash = await refreshHashFromHealth();
    return liveHash || 'unversioned';
  }

  async function parseJsonOrThrow<T>(res: Response): Promise<T> {
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      /* cuerpo no JSON */
    }
    if (!res.ok) {
      const detail =
        data && typeof data === 'object' && 'detail' in data
          ? String((data as { detail: unknown }).detail)
          : `HTTP ${res.status}`;
      throw new LftServiceError(res.status, detail);
    }
    return data as T;
  }

  return {
    resolveCorpusHash,

    async query(req: LegalRagQueryOpts): Promise<CachedQueryResult> {
      const rawQuestion = req.question.trim();
      if (rawQuestion.length < 3) throw new LftServiceError(422, 'Escribe una pregunta más completa');
      if (rawQuestion.length > MAX_QUESTION_CHARS) {
        throw new LftServiceError(422, `La pregunta no puede pasar de ${MAX_QUESTION_CHARS} caracteres`);
      }

      const lawFilter: LawFilter = req.lawFilter ?? 'ALL';
      const excludeDerogados = req.excludeDerogados === true;
      const includeTransitorios = req.includeTransitorios === true;
      const bypass = req.bypassCache === true;

      const corpusHash = await resolveCorpusHash();
      const qHash = await sha256Hex(normalizeQueryForCache(rawQuestion));
      const cacheKey = buildQueryCacheKey(corpusHash, lawFilter, excludeDerogados, qHash, includeTransitorios);

      if (!bypass && env.LEGAL_RAG_CACHE && corpusHash !== 'unversioned') {
        const hitRaw = await env.LEGAL_RAG_CACHE.get(cacheKey, 'text');
        if (hitRaw) {
          const parsed = JSON.parse(hitRaw) as CachedQueryResult['data'];
          if (isLftQueryResponse(parsed) && parsed.status === 'VERIFIED') {
            return { data: parsed, cache_status: 'HIT', corpus_version_hash: corpusHash };
          }
        }
      }

      const res = await fetchWithServiceToken('/v1/legal/query', {
        method: 'POST',
        body: JSON.stringify({
          question: rawQuestion,
          law_filter: lawFilter,
          include_transitorios: includeTransitorios,
          exclude_derogados: excludeDerogados,
        }),
      });
      const data = await parseJsonOrThrow<CachedQueryResult['data']>(res);
      if (!isLftQueryResponse(data)) throw new LftServiceError(502, 'Respuesta inesperada del servicio');

      const effectiveHash = data.corpus_version_hash || corpusHash;
      if (effectiveHash && effectiveHash !== cachedHash) {
        cachedHash = effectiveHash;
        cachedHashExpiresAt = Date.now() + HASH_MEMORY_TTL_MS;
      }

      // Invariante estricto: SOLO se guarda en KV cuando status === 'VERIFIED'.
      const status: LftStatus = data.status;
      if (!bypass && env.LEGAL_RAG_CACHE && status === 'VERIFIED' && effectiveHash !== 'unversioned') {
        const writeKey = buildQueryCacheKey(effectiveHash, lawFilter, excludeDerogados, qHash, includeTransitorios);
        const putPromise = env.LEGAL_RAG_CACHE.put(writeKey, JSON.stringify(data), {
          expirationTtl: VERIFIED_QUERY_TTL_S,
        });
        if (opts.ctx) opts.ctx.waitUntil(putPromise);
        else await putPromise;
      }

      return {
        data,
        cache_status: bypass ? 'BYPASS' : 'MISS',
        corpus_version_hash: effectiveHash,
      };
    },

    async article(
      lawCode: LawCode,
      canonicalArticuloId: string,
      optsArg: { includeTransitorios?: boolean; bypassCache?: boolean } = {},
    ): Promise<CachedArticleResult> {
      const includeTransitorios = optsArg.includeTransitorios === true;
      const bypass = optsArg.bypassCache === true;
      const corpusHash = await resolveCorpusHash();
      const cacheKey = buildArticleCacheKey(corpusHash, lawCode, canonicalArticuloId, includeTransitorios);

      if (!bypass && env.LEGAL_RAG_CACHE && corpusHash !== 'unversioned') {
        const hitRaw = await env.LEGAL_RAG_CACHE.get(cacheKey, 'text');
        if (hitRaw) {
          const parsed = JSON.parse(hitRaw) as CachedArticleResult['data'];
          return { data: parsed, cache_status: 'HIT', corpus_version_hash: corpusHash };
        }
      }

      const q = includeTransitorios ? '?include_transitorios=true' : '';
      const res = await fetchWithServiceToken(
        `/v1/legal/articles/${encodeURIComponent(lawCode)}/${encodeURIComponent(canonicalArticuloId)}${q}`,
      );
      const data = await parseJsonOrThrow<CachedArticleResult['data']>(res);
      const effectiveHash = data.corpus_version_hash || corpusHash;

      if (!bypass && env.LEGAL_RAG_CACHE && effectiveHash !== 'unversioned') {
        const writeKey = buildArticleCacheKey(effectiveHash, lawCode, canonicalArticuloId, includeTransitorios);
        const putPromise = env.LEGAL_RAG_CACHE.put(writeKey, JSON.stringify(data), {
          expirationTtl: ARTICLE_LOOKUP_TTL_S,
        });
        if (opts.ctx) opts.ctx.waitUntil(putPromise);
        else await putPromise;
      }

      return {
        data,
        cache_status: bypass ? 'BYPASS' : 'MISS',
        corpus_version_hash: effectiveHash,
      };
    },
  };
}

export type { LftArticle, LftArticleLookup, LftQueryResponse, LftStatus };
