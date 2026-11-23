import { test, expect } from '@playwright/test';

test.describe('Banco de empleo', () => {
  test('elegir un puesto ordena por encaje y muestra la pista', async ({ page }) => {
    await page.goto('/empleos/');
    const total = await page.locator('#cards > li:not([hidden])').count();
    expect(total).toBeGreaterThan(30);
    await page.getByLabel('Cajero/a').check();
    await expect(page.locator('#summary')).toContainText('Cajero/a');
    const first = page.locator('#cards > li:not([hidden])').first();
    await expect(first.locator('[data-fit-badge]')).toContainText('Encaja muy bien');
    await expect(first.locator('[data-role-hint]:not([hidden])')).toBeVisible();
    // el orden del DOM coincide con el visual: los de encaje 3 van antes que los de encaje 0
    const levels = await page.locator('#cards > li:not([hidden]) [data-fit-badge]').evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.level)));
    expect([...levels].sort((a, b) => b - a)).toEqual(levels);
  });

  test('solo con vacantes vistas deja únicamente empresas con datos', async ({ page }) => {
    await page.goto('/empleos/');
    await page.getByLabel('Gestor/a de cobranza').check();
    const before = await page.locator('#cards > li:not([hidden])').count();
    await page.getByRole('switch', { name: /Solo con vacantes/ }).check();
    const after = await page.locator('#cards > li:not([hidden])').count();
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
    await expect(page.locator('#cards > li:not([hidden])').first().locator('.hint-line:not([hidden]) a').first()).toHaveAttribute('href', /^https:\/\//);
  });

  test('filtrar por tipo, buscar por nombre y marcar como revisada', async ({ page }) => {
    await page.goto('/empleos/');
    await page.getByLabel('Fintech', { exact: true }).check();
    const types = await page.locator('#cards > li:not([hidden])').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.type));
    expect(new Set(types)).toEqual(new Set(['fintech']));
    await page.getByLabel('Todos').check();
    await page.fill('#q', 'banorte');
    await expect(page.locator('#cards > li:not([hidden])')).toHaveCount(1);
    await page.locator('#cards > li:not([hidden]) .done').check();
    await expect(page.locator('#reviewed')).toContainText('Revisaste 1 de 1');
  });

  test('todos los enlaces externos abren en otra pestaña con rel seguro y sin tráfico propio', async ({ page, baseURL }) => {
    const external: string[] = [];
    page.on('request', (r) => { if (!r.url().startsWith(baseURL!) && !r.url().startsWith('data:')) external.push(r.url()); });
    await page.goto('/empleos/');
    const bad = await page.locator('#cards a[href^="http"]').evaluateAll((as) => as.filter((a) => (a as HTMLAnchorElement).target !== '_blank' || !/noopener/.test((a as HTMLAnchorElement).rel)).length);
    expect(bad).toBe(0);
    expect(external).toEqual([]);
  });

  test('copiar enlaces muestra el aviso no bloqueante', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await page.goto('/empleos/');
    await page.getByLabel('Asesor/a financiero').check();
    await page.click('#copy-top');
    await expect(page.locator('#snackbar')).toBeVisible();
  });

  test('objetivos táctiles de al menos 44 px en 360 de ancho', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/empleos/');
    const small = await page.locator('.chip span, .job-actions .btn, .navbar a, .quick-exit').evaluateAll((els) => els.filter((e) => { const r = (e as HTMLElement).getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44); }).map((e) => (e as HTMLElement).textContent?.trim().slice(0, 20)));
    expect(small).toEqual([]);
  });

  test('barra inferior en teléfono y riel lateral en pantalla ancha', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/empleos/');
    const bottom = await page.locator('nav.navbar').evaluate((n) => { const r = n.getBoundingClientRect(); return { top: r.top, h: r.height, w: r.width }; });
    expect(bottom.w).toBeGreaterThan(300); expect(bottom.top).toBeGreaterThan(500);
    await expect(page.locator('nav.navbar a[aria-current="page"]')).toHaveText(/Empleos/);
    await page.setViewportSize({ width: 1000, height: 700 });
    const rail = await page.locator('nav.navbar').evaluate((n) => { const r = n.getBoundingClientRect(); return { left: r.left, w: r.width, h: r.height }; });
    expect(rail.left).toBe(0); expect(rail.w).toBeLessThan(120); expect(rail.h).toBeGreaterThan(600);
  });
});
