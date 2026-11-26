import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildQueryCacheKey,
  createLegalRagClient,
  normalizeQueryForCache,
  resetIsolateHashCache,
  sha256Hex,
  type KVNamespaceLike,
} from '../src/lib/legalRagClient';

function makeMemoryKv(): KVNamespaceLike & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function verifiedPayload(corpusHash = 'hash-v1') {
  return {
    status: 'VERIFIED' as const,
    answer: 'El aguinaldo es de 15 días conforme al Artículo 87 de la LFT.',
    cited_articles: ['87'],
    filtered_articles: [],
    is_supported_prob: 0.96,
    has_hallucinated_citation_prob: 0.02,
    deterministic_citation_passed: true,
    unverified_reasons: [],
    decision_backend: 'jev',
    generator_backend: 'ollama',
    lft_ultima_reforma_dof: '14-05-2026',
    disclaimer: 'Información orientativa.',
    corpus_version_hash: corpusHash,
  };
}

describe('legalRagClient (KV cache + Service Token fallback)', () => {
  beforeEach(() => {
    resetIsolateHashCache();
  });

  it('caches VERIFIED responses and serves KV HIT on second identical query', async () => {
    const kv = makeMemoryKv();
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/health')) {
        return new Response(JSON.stringify({ ready: true, corpus_version_hash: 'hash-v1' }), { status: 200 });
      }
      return new Response(JSON.stringify(verifiedPayload('hash-v1')), { status: 200 });
    });

    const client = createLegalRagClient(
      {
        LEGAL_RAG_ORIGIN: 'https://rag.example.test',
        LEGAL_RAG_CACHE: kv,
        CF_ACCESS_CLIENT_ID: 'id-1',
        CF_ACCESS_CLIENT_SECRET: 'sec-1',
      },
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    const first = await client.query({ question: '¿Cuántos días de aguinaldo?' });
    expect(first.cache_status).toBe('MISS');

    const second = await client.query({ question: '  ¿Cuántos días de aguinaldo?  ' });
    expect(second.cache_status).toBe('HIT');
    expect(second.data.answer).toContain('Artículo 87');
    // Sólo /health + 1 POST /v1/legal/query
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never caches UNVERIFIED or INSUFFICIENT_CONTEXT responses', async () => {
    const kv = makeMemoryKv();
    const statuses = ['UNVERIFIED', 'INSUFFICIENT_CONTEXT'] as const;

    for (const status of statuses) {
      resetIsolateHashCache();
      kv.store.clear();
      const fetchMock = vi.fn(async (url: string) => {
        if (url.endsWith('/health')) {
          return new Response(JSON.stringify({ ready: true, corpus_version_hash: 'hash-v1' }), { status: 200 });
        }
        return new Response(
          JSON.stringify({
            status,
            answer: '',
            cited_articles: [],
            filtered_articles: [],
            is_supported_prob: null,
            has_hallucinated_citation_prob: null,
            deterministic_citation_passed: null,
            unverified_reasons: ['gate_failed'],
            decision_backend: 'jev',
            generator_backend: 'ollama',
            lft_ultima_reforma_dof: '14-05-2026',
            disclaimer: 'Aviso.',
            corpus_version_hash: 'hash-v1',
          }),
          { status: 200 },
        );
      });

      const client = createLegalRagClient(
        { LEGAL_RAG_ORIGIN: 'https://rag.example.test', LEGAL_RAG_CACHE: kv },
        { fetchImpl: fetchMock as unknown as typeof fetch },
      );

      const res = await client.query({ question: 'Pregunta sin verificar' });
      expect(res.cache_status).toBe('MISS');
      const qHash = await sha256Hex(normalizeQueryForCache('Pregunta sin verificar'));
      const key = buildQueryCacheKey('hash-v1', 'ALL', false, qHash, false);
      expect(kv.store.has(key)).toBe(false);
    }
  });

  it('invalidates cache automatically when corpus_version_hash changes', async () => {
    const kv = makeMemoryKv();
    let activeHash = 'hash-v1';
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/health')) {
        return new Response(JSON.stringify({ ready: true, corpus_version_hash: activeHash }), { status: 200 });
      }
      return new Response(JSON.stringify(verifiedPayload(activeHash)), { status: 200 });
    });

    const client = createLegalRagClient(
      { LEGAL_RAG_ORIGIN: 'https://rag.example.test', LEGAL_RAG_CACHE: kv },
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    const r1 = await client.query({ question: '¿Aguinaldo?' });
    expect(r1.cache_status).toBe('MISS');
    expect(r1.corpus_version_hash).toBe('hash-v1');

    // Simular reforma DOF: nuevo hash en KV/origen y limpiar caché en memoria del isolate
    activeHash = 'hash-v2';
    await kv.put('meta:active_corpus_hash', 'hash-v2');
    resetIsolateHashCache();

    const r2 = await client.query({ question: '¿Aguinaldo?' });
    expect(r2.cache_status).toBe('MISS');
    expect(r2.corpus_version_hash).toBe('hash-v2');
  });

  it('bypasses KV when bypassCache=true', async () => {
    const kv = makeMemoryKv();
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/health')) {
        return new Response(JSON.stringify({ ready: true, corpus_version_hash: 'hash-v1' }), { status: 200 });
      }
      return new Response(JSON.stringify(verifiedPayload('hash-v1')), { status: 200 });
    });

    const client = createLegalRagClient(
      { LEGAL_RAG_ORIGIN: 'https://rag.example.test', LEGAL_RAG_CACHE: kv },
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    await client.query({ question: '¿Aguinaldo?' });
    const bypassed = await client.query({ question: '¿Aguinaldo?', bypassCache: true });
    expect(bypassed.cache_status).toBe('BYPASS');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries once with fallback Service Token on 403 and always sets redirect=manual', async () => {
    const kv = makeMemoryKv();
    const seenHeaders: Array<{ id: string | null; redirect: string | undefined }> = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const hdrs = new Headers(init?.headers);
      seenHeaders.push({ id: hdrs.get('CF-Access-Client-Id'), redirect: init?.redirect });
      if (url.endsWith('/health')) {
        return new Response(JSON.stringify({ ready: true, corpus_version_hash: 'hash-v1' }), { status: 200 });
      }
      if (hdrs.get('CF-Access-Client-Id') === 'primary-id') {
        return new Response('Forbidden', { status: 403 });
      }
      return new Response(JSON.stringify(verifiedPayload('hash-v1')), { status: 200 });
    });

    const client = createLegalRagClient(
      {
        LEGAL_RAG_ORIGIN: 'https://rag.example.test',
        LEGAL_RAG_CACHE: kv,
        CF_ACCESS_CLIENT_ID: 'primary-id',
        CF_ACCESS_CLIENT_SECRET: 'primary-sec',
        CF_ACCESS_CLIENT_ID_FALLBACK: 'fallback-id',
        CF_ACCESS_CLIENT_SECRET_FALLBACK: 'fallback-sec',
      },
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    const res = await client.query({ question: '¿Aguinaldo?' });
    expect(res.data.status).toBe('VERIFIED');
    expect(seenHeaders.every((s) => s.redirect === 'manual')).toBe(true);
    expect(seenHeaders.some((s) => s.id === 'fallback-id')).toBe(true);
  });
});
