import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const vec = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tests', 'vectors.json'), 'utf8'));

function routesFor(review: boolean): string[] {
  const dir = path.join(process.cwd(), review ? 'dist-review' : 'dist');
  const out: string[] = [];
  const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'index.html') out.push('/' + path.relative(dir, d).split(path.sep).join('/') + (path.relative(dir, d) ? '/' : '')); } };
  walk(dir);
  return out.sort();
}
const review = (t: any) => !!t.project.metadata.review;

async function trackExternal(page: Page, base: string) {
  const external: string[] = [];
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(base) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u); });
  return external;
}

test('cada ruta: 200, lang, title, h1, sin tráfico externo, sin cookies ni almacenamiento', async ({ page, baseURL, context }, info) => {
  const external = await trackExternal(page, baseURL!);
  for (const r of routesFor(review(info))) {
    const res = await page.goto(r);
    expect(res!.status(), r).toBe(200);
    expect(await page.getAttribute('html', 'lang'), r).toMatch(/^(es|en)$/);
    expect((await page.title()).length, r).toBeGreaterThan(3);
    await expect(page.locator('h1').first(), r).toBeVisible();
    const h = res!.headers();
    if (review(info)) expect(h['x-robots-tag'], r).toContain('noindex'); else expect(h['x-robots-tag'], r).toBeUndefined();
  }
  expect(external).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  const store = await page.evaluate(async () => ({ l: localStorage.length, s: sessionStorage.length, db: (await (indexedDB as any).databases?.())?.length ?? 0 }));
  expect(store).toEqual({ l: 0, s: 0, db: 0 });
});

test('cabeceras de seguridad y caché', async ({ request }, info) => {
  const r = await request.get('/calculadora/');
  const h = r.headers();
  expect(h['content-security-policy']).toContain("default-src 'self'");
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['referrer-policy']).toBe('no-referrer');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['permissions-policy']).toContain('camera=()');
  expect(h['cross-origin-opener-policy']).toBe('same-origin');
  expect(h['strict-transport-security']).toContain('max-age');
  const html = await (await request.get('/calculadora/')).text();
  const asset = /\/_astro\/[^"]+\.js/.exec(html)![0];
  expect((await request.get(asset)).headers()['cache-control']).toBe('public, max-age=31536000, immutable');
  expect((await request.get('/no-existe-xyz/')).status()).toBe(404);
  expect((await request.get('/.well-known/security.txt')).status()).toBe(200);
  const robots = await (await request.get('/robots.txt')).text();
  if (review(info)) expect(robots).toContain('Disallow: /'); else expect(robots).toContain('Allow: /');
});

test('salida rápida: botón y doble Escape', async ({ page }) => {
  await page.route('https://www.gob.mx/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>gob</title>' }));
  await page.goto('/');
  await page.click('#quick-exit');
  await page.waitForURL('https://www.gob.mx/');
  await page.goto('/');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.waitForURL('https://www.gob.mx/');
});

async function fillCalc(page: Page, extra: Record<string, string> = {}) {
  await page.goto('/calculadora/');
  await page.fill('#weeklyBase', String(vec.base.weeklyBase));
  await page.fill('#commissions', String(vec.base.commissions));
  await page.fill('#years', '5');
  for (const [k, v] of Object.entries(extra)) { const el = page.locator('#' + k); (await el.evaluate((e) => e.tagName)) === 'SELECT' ? await el.selectOption(v) : await el.fill(v); }
}
const money = (t: string) => Number(t.replace(/[^0-9.]/g, ''));

test('calculadora reproduce los vectores y las decisiones D1 a D5 cambian el resultado', async ({ page }) => {
  await fillCalc(page);
  const v = vec.vectors[0].expect, b = vec.vectors[1].expect;
  expect(Math.abs(money(await page.locator('#out-art439-A').innerText()) - v.art439!)).toBeLessThanOrEqual(1);
  expect(Math.abs(money(await page.locator('#out-art51-A').innerText()) - v.art51!)).toBeLessThanOrEqual(1);
  expect(Math.abs(money(await page.locator('#out-art48-A').innerText()) - v.art48!)).toBeLessThanOrEqual(1);
  expect(Math.abs(money(await page.locator('#out-art439-B').innerText()) - b.art439!)).toBeLessThanOrEqual(1);
  expect(Math.abs(money(await page.locator('#out-isr').innerText()) - 52789.5)).toBeLessThanOrEqual(1);
  // panel paso a paso: SDI método A = paso 5 (índice 5)
  await page.click('#pasos summary');
  expect(await page.evaluate(() => (document.getElementById('pasos') as HTMLDetailsElement).open), 'details abierto').toBe(true);
  await page.locator('#step-A-5').scrollIntoViewIfNeeded();
  const box = await page.locator('#step-A-5').boundingBox();
  expect(box, 'caja ' + JSON.stringify(box)).not.toBeNull();
  await expect(page.locator('#step-A-5')).toBeVisible();
  const sdi = money((await page.locator('#step-A-5').textContent()) ?? '');
  expect(Math.abs(sdi - 467.92), 'SDI paso a paso ' + sdi).toBeLessThanOrEqual(1);
  const base = await page.locator('#out-art439-A').innerText();
  for (const [id, val] of [['art439Days', '121.6'], ['vacationBasis', 'encurso'], ['commissionPeriod', 'treinta']] as const) {
    await page.selectOption('#' + id, val);
    expect(await page.locator('#out-art439-A').innerText(), id).not.toBe(base);
    await page.selectOption('#' + id, id === 'art439Days' ? '120' : id === 'vacationBasis' ? 'completos' : 'semana');
  }
  await page.fill('#entry', '2020-01-15'); await page.fill('#exit', '2026-12-01'); await page.fill('#years', '');
  await page.selectOption('#fractionMode', 'completos');
  const comp = await page.locator('#out-art439-A').innerText();
  await page.selectOption('#fractionMode', 'proporcional');
  expect(await page.locator('#out-art439-A').innerText()).not.toBe(comp);
  await expect(page.locator('.assumptions')).toContainText('Pendiente de revisión legal');
});

test('plazos: fechas y descarga .ics', async ({ page }) => {
  await page.goto('/plazos/');
  await page.fill('#p-date', '2026-12-31');
  await expect(page.locator('#plazo-art518')).toContainText('28 de febrero de 2027');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#p-ics')]);
  const text = fs.readFileSync((await dl.path())!, 'utf8');
  expect(text).toContain('BEGIN:VCALENDAR'); expect(text).toContain('BEGIN:VEVENT'); expect(text.trim().endsWith('END:VCALENDAR')).toBe(true);
});

test('checklist y equipo funcionan y no guardan', async ({ page }) => {
  await page.goto('/checklist-salida/');
  await page.check('#chk-0');
  await page.reload();
  expect(await page.isChecked('#chk-0')).toBe(false);
  await page.goto('/equipo/');
  await page.check('input[value="cobranza"]');
  await expect(page.locator('#e-msg')).toContainText('cobranza');
});

test('revisión: pruebas en vivo, dictamen y matriz', async ({ page }, info) => {
  test.skip(!review(info), 'solo build de revisión');
  await page.goto('/revision/pruebas/');
  await expect(page.locator('#resumen')).toContainText('0 FAIL');
  expect(await page.locator('td.fail').count()).toBe(0);
  await page.goto('/revision/dictamen/');
  await expect(page.locator('table.dict').first().locator('tbody tr')).toHaveCount(26);
  await page.goto('/revision/');
  await expect(page.locator('#D1-a')).toBeVisible();
  await page.fill('#r-base', '3000'); await page.click('#r-reset');
  expect(await page.inputValue('#r-base')).toBe('2205.28');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.review-banner')).toBeVisible();
});
test('producción no tiene rutas de revisión', async ({ request }, info) => {
  test.skip(review(info), 'solo producción');
  for (const r of ['/revision/', '/revision/pruebas/', '/revision/dictamen/']) expect((await request.get(r)).status()).toBe(404);
});

test('sin conexión después de la primera visita', async ({ page, context }) => {
  await page.goto('/calculadora/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null || true);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  await page.goto('/calculadora/');
  await page.fill('#weeklyBase', '2205.28'); await page.fill('#years', '5');
  await expect(page.locator('#out-art439-A')).toBeVisible();
  await page.goto('/plazos/');
  await expect(page.locator('h1')).toHaveText('Mis plazos');
  await context.setOffline(false);
});

test('peso de página y JavaScript dentro del presupuesto', async ({ page, baseURL }, info) => {
  for (const r of routesFor(review(info))) {
    let total = 0, js = 0;
    const handler = async (res: any) => { try { const b = await res.body(); total += zlib.gzipSync(b).length; if (/javascript/.test(res.headers()['content-type'] || '')) js += zlib.gzipSync(b).length; } catch {} };
    page.on('response', handler);
    await page.goto(r, { waitUntil: 'networkidle' });
    page.off('response', handler);
    expect(total, r + ' total gzip').toBeLessThanOrEqual(200 * 1024);
    expect(js, r + ' js gzip').toBeLessThanOrEqual(60 * 1024);
  }
});

test('accesibilidad: sin violaciones serias o críticas', async ({ page }, info) => {
  for (const r of routesFor(review(info))) {
    await page.goto(r);
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    const bad = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${r}: ${v.id} (${v.nodes.length})`);
    expect(bad).toEqual([]);
  }
});

test('ninguna página se desborda a lo ancho en 360 px', async ({ page }, info) => {
  await page.setViewportSize({ width: 360, height: 640 });
  const wide: string[] = [];
  for (const r of routesFor(review(info))) {
    await page.goto(r);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    if (sw > 361) wide.push(`${r}: ${sw}`);
  }
  expect(wide).toEqual([]);
});

test('teclado: se llega a la calculadora y se enfoca el campo', async ({ page }) => {
  await page.goto('/calculadora/');
  await page.keyboard.press('Tab'); // salto al contenido
  await page.keyboard.press('Enter');
  for (let i = 0; i < 40; i++) { await page.keyboard.press('Tab'); if ((await page.evaluate(() => document.activeElement?.id)) === 'weeklyBase') break; }
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('weeklyBase');
  await page.keyboard.type('2205.28');
  await expect(page.locator('#resultado')).toContainText('Resultado por salida');
});
