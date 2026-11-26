import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// El servicio lft-rag no corre en CI: se simulan las respuestas de /api/lft/* en el navegador.
const art = (id: string, derogado = false) => ({
  articulo_id: id, articulo_label: id, titulo: 'TITULO TERCERO - Condiciones de Trabajo', capitulo: 'CAPITULO V - Salario', seccion: '',
  is_derogado: derogado, is_transitorio: false, reform_date: '30-11-2012', decreto: '', part_index: 1, part_total: 1, page_start: 25,
  text: derogado ? 'Se deroga.' : 'Los trabajadores tendrán derecho a un aguinaldo anual que deberá pagarse antes del día veinte de diciembre.\n\nArtículo reformado DOF 30-11-2012',
  source_url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf#page=25', relevance_score: null, rrf_score: 0.03,
});
const response = (status: string, answer: string, articles: unknown[]) => ({
  status, answer, cited_articles: status === 'VERIFIED' ? ['87'] : [], filtered_articles: articles, is_supported_prob: status === 'VERIFIED' ? 0.94 : null,
  has_hallucinated_citation_prob: null, deterministic_citation_passed: status === 'VERIFIED' ? true : null,
  unverified_reasons: status === 'UNVERIFIED' ? ['Respaldo insuficiente (is_supported=0.40 < 0.75).'] : [],
  decision_backend: 'jev', generator_backend: 'ollama', lft_ultima_reforma_dof: '14-05-2026',
  disclaimer: 'Esto no es asesoría legal ni crea una relación abogado-cliente.',
});

async function stub(page: Page, estado: object, consulta?: object) {
  await page.route('**/api/lft/estado', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(estado) }));
  if (consulta) await page.route('**/api/lft/consulta', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(consulta) }));
}

test('sin servicio: avisa «no disponible» y el botón queda desactivado', async ({ page }) => {
  await stub(page, { available: false });
  await page.goto('/consulta-lft/');
  await expect(page.locator('#lft-estado')).toContainText('no está disponible');
  await page.fill('#lft-q', '¿Cuántos días de aguinaldo me tocan?');
  await expect(page.locator('#lft-go')).toBeDisabled();
  await expect(page.locator('#lft-aviso')).toContainText('no crea una relación abogado-cliente');
});

test('respuesta verificada: muestra la respuesta, los artículos y el aviso; avisa del tercero (TypeSafe)', async ({ page, context }) => {
  await stub(page, { available: true, lft_ultima_reforma_dof: '14-05-2026', decision_backend: 'jev', generator_backend: 'ollama' },
    response('VERIFIED', 'Según el Artículo 87, el aguinaldo equivale a quince días de salario.', [art('87')]));
  await page.goto('/consulta-lft/');
  await expect(page.locator('#lft-estado')).toContainText('TypeSafe');
  await expect(page.locator('#lft-terceros')).toContainText('se envían a TypeSafe');
  await expect(page.locator('#lft-reforma')).toHaveText('DOF 14-05-2026');
  await page.fill('#lft-q', '¿Cuántos días de aguinaldo me tocan?');
  await page.click('#lft-go');
  await expect(page.locator('#lft-out .result-box')).toContainText('Según el Artículo 87');
  await expect(page.locator('#lft-out .precepto')).toContainText('aguinaldo anual');
  await expect(page.locator('#lft-out')).toContainText('abogado-cliente');
  const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(a11y.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  const store = await page.evaluate(() => ({ l: localStorage.length, s: sessionStorage.length }));
  expect(store).toEqual({ l: 0, s: 0 });
});

test('sin verificar: no muestra el borrador, sólo artículos oficiales, y marca los derogados', async ({ page }) => {
  await stub(page, { available: true, lft_ultima_reforma_dof: '14-05-2026', decision_backend: 'off', generator_backend: 'ollama' },
    response('UNVERIFIED', 'No pudimos verificar automáticamente la respuesta redactada.', [art('87'), art('15-A', true)]));
  await page.goto('/consulta-lft/');
  await page.fill('#lft-q', 'subcontratación');
  await page.click('#lft-go');
  await expect(page.locator('#lft-out .result-box')).toHaveCount(0);
  await expect(page.locator('#lft-out')).toContainText('No pudimos verificar');
  await expect(page.locator('#lft-out')).toContainText('DEROGADO');
  await expect(page.locator('#lft-out .warning')).toContainText('derogado');
});

test('el texto del servicio se escapa (sin inyección de HTML)', async ({ page }) => {
  await stub(page, { available: true, decision_backend: 'off', generator_backend: 'none' },
    response('SOURCES_ONLY', '<img src=x onerror="window.__pwned=1">', [art('87')]));
  await page.goto('/consulta-lft/');
  await page.fill('#lft-q', 'aguinaldo');
  await page.click('#lft-go');
  await expect(page.locator('#lft-out')).toContainText('<img src=x');
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  await expect(page.locator('#lft-out img')).toHaveCount(0);
});
