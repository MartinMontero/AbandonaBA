// Endpoint /api/reporte: recibe reportes ciudadanos desde /acerca/#errores y crea un issue en GitHub
// sin enviar al usuario al repositorio ni pedirle cuenta. No guarda IP, user-agent ni cookies.
import type { RateLimiter } from './lftProxy';

export interface ReportEnv {
  GITHUB_ISSUE_TOKEN?: string;
  GITHUB_REPO?: string;
  LFT_RATE_LIMITER?: RateLimiter;
}

export const REPORT_PATH = '/api/reporte';
const DEFAULT_REPO = 'MartinMontero/AbandonaBA';
const MAX_BODY_BYTES = 8192;

const TIPO_LABELS: Record<string, { label: string; ghLabel: string }> = {
  dato: { label: 'Dato, fecha o cálculo incorrecto', ghLabel: 'bug' },
  pagina: { label: 'Algo no funciona o se ve mal', ghLabel: 'bug' },
  ley: { label: 'Actualización de ley o falta información', ghLabel: 'documentation' },
  sugerencia: { label: 'Idea o mejora', ghLabel: 'enhancement' },
};

function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });
}

export async function handleReport(
  request: Request,
  env: ReportEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== 'POST') {
    return json(405, { detail: 'Método no permitido' }, { Allow: 'POST' });
  }
  if (!(request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/json')) {
    return json(415, { detail: 'Se espera JSON' });
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    return json(413, { detail: 'El reporte es demasiado largo' });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json(400, { detail: 'Solicitud inválida' });
  }
  if (!body || typeof body !== 'object') {
    return json(422, { detail: 'Faltan los datos del reporte' });
  }

  const b = body as Record<string, unknown>;

  // Honeypot antispam silencioso
  if (typeof b.website === 'string' && b.website.trim().length > 0) {
    return json(201, { ok: true, number: 0 });
  }

  const tipoKey = typeof b.tipo === 'string' ? b.tipo.trim() : '';
  const tipo = TIPO_LABELS[tipoKey];
  if (!tipo) {
    return json(422, { detail: 'Elige qué tipo de problema encontraste.' });
  }

  const titulo = typeof b.titulo === 'string' ? b.titulo.trim().replace(/\s+/g, ' ') : '';
  if (titulo.length < 5 || titulo.length > 120) {
    return json(422, { detail: 'Escribe un resumen corto (entre 5 y 120 caracteres).' });
  }

  const detalle = typeof b.detalle === 'string' ? b.detalle.trim() : '';
  if (detalle.length < 10 || detalle.length > 2000) {
    return json(422, { detail: 'Cuéntanos un poco más de detalle (entre 10 y 2000 caracteres).' });
  }

  if (b.confirmNoPersonal !== true) {
    return json(422, { detail: 'Confirma que no incluiste datos personales antes de enviar.' });
  }

  const pagina = typeof b.pagina === 'string' ? b.pagina.trim().slice(0, 120) : '';

  if (env.LFT_RATE_LIMITER) {
    const { success } = await env.LFT_RATE_LIMITER.limit({ key: 'reporte-global' });
    if (!success) {
      return json(
        429,
        { detail: 'Se enviaron varios reportes seguidos. Espera un minuto e intenta de nuevo.' },
        { 'Retry-After': '60' },
      );
    }
  }

  const token = env.GITHUB_ISSUE_TOKEN?.trim();
  if (!token) {
    return json(503, {
      detail: 'El buzón de reportes no está disponible en este momento. Intenta más tarde.',
    });
  }

  const repo = (env.GITHUB_REPO ?? DEFAULT_REPO).trim();
  const safeDetail = detalle.replace(/```/g, "'''");
  const issueBody = [
    `**Tipo:** ${tipo.label}`,
    `**Página o sección:** ${pagina || 'No especificada'}`,
    '',
    '### Descripción',
    safeDetail,
    '',
    '---',
    '_Reporte enviado de forma anónima desde el formulario ciudadano (`/acerca/#errores`)._',
  ].join('\n');

  try {
    const res = await fetchImpl(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'AbandonaBA-ReportBot/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        title: `[Reporte] ${titulo}`,
        body: issueBody,
        labels: [tipo.ghLabel, 'reporte-ciudadano'],
      }),
    });

    if (!res.ok) {
      return json(502, {
        detail: 'No pudimos guardar tu reporte en este momento. Intenta de nuevo en un minuto.',
      });
    }

    const created = (await res.json()) as { number?: number };
    return json(201, { ok: true, number: created.number ?? 0 });
  } catch {
    return json(503, {
      detail: 'Hubo un problema de conexión al enviar tu reporte. Intenta de nuevo.',
    });
  }
}
