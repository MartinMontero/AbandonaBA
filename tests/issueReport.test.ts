import { describe, it, expect, vi } from 'vitest';
import { handleReport, type ReportEnv } from '../src/lib/issueReport';

const post = (body: unknown, headers: Record<string, string> = { 'Content-Type': 'application/json' }) =>
  new Request('https://site.test/api/reporte', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const validPayload = {
  tipo: 'dato',
  pagina: 'Calculadora',
  titulo: 'Vacaciones con un día menos',
  detalle: 'Al poner 3 años de antigüedad me gustaría verificar si son 16 días.',
  confirmNoPersonal: true,
  website: '',
};

describe('Endpoint /api/reporte', () => {
  it('crea un issue en GitHub con los datos validados y devuelve su folio', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ number: 123 }), { status: 201 }));
    const env: ReportEnv = { GITHUB_ISSUE_TOKEN: 'gho_test_token', GITHUB_REPO: 'MartinMontero/AbandonaBA' };

    const res = await handleReport(post(validPayload), env, fetchMock as unknown as typeof fetch);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toEqual({ ok: true, number: 123 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.github.com/repos/MartinMontero/AbandonaBA/issues');
    expect(init.method).toBe('POST');
    const sent = JSON.parse(String(init.body));
    expect(sent.title).toBe('[Reporte] Vacaciones con un día menos');
    expect(sent.body).toContain('**Página o sección:** Calculadora');
    expect(sent.labels).toContain('reporte-ciudadano');
  });

  it('honeypot activo responde 201 sin llamar a GitHub', async () => {
    const fetchMock = vi.fn();
    const env: ReportEnv = { GITHUB_ISSUE_TOKEN: 'gho_test_token' };
    const res = await handleReport(post({ ...validPayload, website: 'http://spam.example' }), env, fetchMock as unknown as typeof fetch);
    expect(res.status).toBe(201);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('valida campos obligatorios y rechaza entradas inválidas', async () => {
    const fetchMock = vi.fn();
    const env: ReportEnv = { GITHUB_ISSUE_TOKEN: 'gho_test_token' };

    expect((await handleReport(post({ ...validPayload, titulo: 'abc' }), env, fetchMock as unknown as typeof fetch)).status).toBe(422);
    expect((await handleReport(post({ ...validPayload, detalle: 'corto' }), env, fetchMock as unknown as typeof fetch)).status).toBe(422);
    expect((await handleReport(post({ ...validPayload, confirmNoPersonal: false }), env, fetchMock as unknown as typeof fetch)).status).toBe(422);
    expect((await handleReport(post({ ...validPayload, tipo: 'otro' }), env, fetchMock as unknown as typeof fetch)).status).toBe(422);
    expect((await handleReport(new Request('https://site.test/api/reporte', { method: 'GET' }), env, fetchMock as unknown as typeof fetch)).status).toBe(405);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('respeta el rate limiter y devuelve 503 si falta el token', async () => {
    const fetchMock = vi.fn();
    const limited = await handleReport(
      post(validPayload),
      { GITHUB_ISSUE_TOKEN: 't', LFT_RATE_LIMITER: { limit: async () => ({ success: false }) } },
      fetchMock as unknown as typeof fetch,
    );
    expect(limited.status).toBe(429);

    const noToken = await handleReport(post(validPayload), {}, fetchMock as unknown as typeof fetch);
    expect(noToken.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
