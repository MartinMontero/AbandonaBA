// Cliente tipado del servicio lft-rag (services/lft-rag). Los tipos reflejan los modelos Pydantic de
// services/lft-rag/src/generator.py y src/api.py. Se usa en el navegador (vía el proxy del Worker, mismo origen)
// y desde scripts de Node contra el servicio local.

export type LftStatus = 'VERIFIED' | 'UNVERIFIED' | 'INSUFFICIENT_CONTEXT' | 'SOURCES_ONLY';

export interface LftArticle {
  articulo_id: string;
  articulo_label: string;
  titulo: string;
  capitulo: string;
  seccion: string;
  is_derogado: boolean;
  is_transitorio: boolean;
  reform_date: string;
  decreto: string;
  part_index: number;
  part_total: number;
  page_start: number;
  text: string;
  source_url: string;
  relevance_score: number | null;
  rrf_score: number | null;
}

interface LftQueryBase {
  answer: string;
  cited_articles: string[];
  filtered_articles: LftArticle[];
  is_supported_prob: number | null;
  has_hallucinated_citation_prob: number | null;
  deterministic_citation_passed: boolean | null;
  unverified_reasons: string[];
  decision_backend: string;
  generator_backend: string;
  lft_ultima_reforma_dof: string;
  disclaimer: string;
}
export type LftQueryResponse =
  | (LftQueryBase & { status: 'VERIFIED' })
  | (LftQueryBase & { status: 'UNVERIFIED' })
  | (LftQueryBase & { status: 'INSUFFICIENT_CONTEXT' })
  | (LftQueryBase & { status: 'SOURCES_ONLY' });

export interface LftQueryRequest {
  question: string;
  include_transitorios?: boolean;
  exclude_derogados?: boolean;
}

export interface LftArticleLookup {
  articulo_id: string;
  found: boolean;
  is_derogado: boolean;
  reform_date: string;
  chunks: LftArticle[];
  lft_ultima_reforma_dof: string;
}

export interface LftHealth {
  ready: boolean;
  manifest: null | {
    pdf_filename: string;
    pdf_sha256: string;
    lft_ultima_reforma_dof: string;
    embedding_model_id: string;
    total_chunks: number;
    substantive_chunks: number;
    transitorio_chunks: number;
    derogado_chunks: number;
    indexed_at_utc: string;
  };
  decision_backend: 'jev' | 'jeff' | 'off';
  generator_backend: 'transformers' | 'llamacpp' | 'ollama' | 'none';
  embedding_model_id: string;
  auth_required: boolean;
}

export class LftServiceError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'LftServiceError';
  }
}

export const MAX_QUESTION_CHARS = 1000;

export interface LftClientOptions {
  /** URL base del servicio (p. ej. http://127.0.0.1:8090) o del proxy (p. ej. /api/lft en el navegador). */
  baseUrl: string;
  /** Rutas: las del servicio directo (/v1/legal/...) o las del proxy público (/consulta, /articulo/...). */
  mode?: 'service' | 'proxy';
  token?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Interpreta un estado como una decisión de interfaz; el `never` obliga a manejar cada estado. */
export function describeStatus(status: LftStatus): { label: string; tone: 'ok' | 'warn' | 'bad'; showAnswer: boolean } {
  switch (status) {
    case 'VERIFIED':
      return { label: 'Respuesta verificada contra los artículos citados', tone: 'ok', showAnswer: true };
    case 'UNVERIFIED':
      return { label: 'Sin verificar: sólo te mostramos los artículos oficiales', tone: 'bad', showAnswer: false };
    case 'INSUFFICIENT_CONTEXT':
      return { label: 'No encontramos artículos suficientes', tone: 'warn', showAnswer: false };
    case 'SOURCES_ONLY':
      return { label: 'Modo de fuentes: artículos oficiales sin respuesta redactada', tone: 'warn', showAnswer: false };
    default: {
      const never: never = status;
      throw new Error(`Estado desconocido: ${String(never)}`);
    }
  }
}

export function isLftQueryResponse(x: unknown): x is LftQueryResponse {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.status === 'string' &&
    ['VERIFIED', 'UNVERIFIED', 'INSUFFICIENT_CONTEXT', 'SOURCES_ONLY'].includes(o.status) &&
    typeof o.answer === 'string' &&
    Array.isArray(o.filtered_articles)
  );
}

export function createLftClient(opts: LftClientOptions) {
  const base = opts.baseUrl.replace(/\/+$/, '');
  const mode = opts.mode ?? 'service';
  const f = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 120_000;

  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body) headers.set('Content-Type', 'application/json');
    if (opts.token) headers.set('Authorization', `Bearer ${opts.token}`);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await f(base + path, { ...init, headers, signal: ctrl.signal });
      const text = await res.text();
      let data: unknown = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* cuerpo no JSON */ }
      if (!res.ok) {
        const detail = data && typeof data === 'object' && 'detail' in data ? String((data as { detail: unknown }).detail) : `HTTP ${res.status}`;
        throw new LftServiceError(res.status, detail);
      }
      return data as T;
    } catch (e) {
      if (e instanceof LftServiceError) throw e;
      if ((e as Error).name === 'AbortError') throw new LftServiceError(504, 'El servicio tardó demasiado en responder');
      throw new LftServiceError(503, 'El servicio de consulta no está disponible');
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async query(req: LftQueryRequest): Promise<LftQueryResponse> {
      const question = req.question.trim();
      if (question.length < 3) throw new LftServiceError(422, 'Escribe una pregunta más completa');
      if (question.length > MAX_QUESTION_CHARS) throw new LftServiceError(422, `La pregunta no puede pasar de ${MAX_QUESTION_CHARS} caracteres`);
      const data = await call<unknown>(mode === 'proxy' ? '/consulta' : '/v1/legal/query', {
        method: 'POST',
        body: JSON.stringify({ ...req, question }),
      });
      if (!isLftQueryResponse(data)) throw new LftServiceError(502, 'Respuesta inesperada del servicio');
      return data;
    },
    article(id: string, includeTransitorios = false): Promise<LftArticleLookup> {
      const q = includeTransitorios ? '?include_transitorios=true' : '';
      const path = mode === 'proxy' ? `/articulo/${encodeURIComponent(id)}` : `/v1/legal/articles/${encodeURIComponent(id)}`;
      return call<LftArticleLookup>(path + q);
    },
    health(): Promise<LftHealth> {
      return call<LftHealth>(mode === 'proxy' ? '/estado' : '/health');
    },
  };
}
