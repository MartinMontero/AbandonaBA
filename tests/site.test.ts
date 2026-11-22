import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { claimPages, claimIds } from '../src/lib/claims.mjs';
import valores from '../src/data/valores-2026.json';
import { legalReview } from '../src/data/site.config';

const root = process.cwd();
function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const htmlOf = (d: string) => walk(path.join(root, d)).filter((f) => f.endsWith('.html'));
const read = (f: string) => fs.readFileSync(f, 'utf8');

describe('registro de afirmaciones', () => {
  const { map, unknown } = claimPages();
  it('ninguna página cita una afirmación desconocida', () => { expect(unknown).toEqual([]); });
  it('toda afirmación se usa en al menos una página', () => {
    const orphan = claimIds.filter((id: string) => map[id].length === 0);
    expect(orphan).toEqual([]);
  });
  it('cada valor apunta a una afirmación existente', () => {
    for (const v of valores) expect(claimIds).toContain(v.claim_id);
  });
  it('cada valor tiene fuente, fecha y estado válido', () => {
    for (const v of valores) {
      expect(v.source_url).toMatch(/^https:\/\//); expect(v.as_of).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['verificado-primaria', 'verificado-secundaria', 'sin-verificar']).toContain(v.status);
    }
  });
});

describe('cifras en pesos trazables', () => {
  const files = [...walk(path.join(root, 'src/content')), ...walk(path.join(root, 'src/pages')), ...walk(path.join(root, 'src/components'))].filter((f) => /\.(md|astro)$/.test(f));
  const re = /\$\s?\d|\b\d{1,3}(,\d{3})+(\.\d+)?\s*(pesos|MXN)|\b\d+\.\d{2}\s*pesos/;
  it('ninguna página escribe a mano una cifra en pesos', () => {
    const bad = files.filter((f) => re.test(read(f)));
    expect(bad.map((f) => path.relative(root, f))).toEqual([]);
  });
  it('los tokens {{v:id}} existen en valores-2026.json', () => {
    const ids = new Set(valores.map((v) => v.id));
    for (const f of files) for (const m of read(f).matchAll(/\{\{v:([a-z0-9_]+)\}\}/g)) expect(ids.has(m[1])).toBe(true);
  });
});

describe('compuerta de revisión legal', () => {
  it('pendiente por defecto, sin revisores', () => { expect(legalReview.status).toBe('pendiente'); expect(legalReview.reviewers).toEqual([]); });
});

const hasProd = fs.existsSync(path.join(root, 'dist'));
const hasRev = fs.existsSync(path.join(root, 'dist-review'));

describe.skipIf(!hasProd)('build de producción', () => {
  const pages = htmlOf('dist');
  const all = pages.map(read).join('\n');
  it('sin rutas ni textos de revisión', () => {
    expect(fs.existsSync(path.join(root, 'dist/revision'))).toBe(false);
    for (const s of ['VERSIÓN DE REVISIÓN', 'Para el abogado', 'noindex', 'review-banner', '/revision/']) expect(all).not.toContain(s);
    expect(read(path.join(root, 'dist/_headers'))).not.toContain('X-Robots-Tag');
  });
  it('sin scripts en línea ni estilos en línea ni recursos externos', () => {
    for (const f of pages) {
      const h = read(f);
      expect(h.match(/<script(?![^>]*\ssrc=)[^>]*>/g) ?? []).toEqual([]);
      expect(h.match(/<style[\s>]/g) ?? []).toEqual([]);
      expect(h.match(/<(script|img|iframe)[^>]+src="https?:\/\/[^"]+"|<link[^>]+rel="(stylesheet|icon|manifest|preload|modulepreload)"[^>]*href="https?:\/\/[^"]+"/g) ?? []).toEqual([]);
    }
  });
  it('tiene lang, title, h1 y la advertencia del banco', () => {
    for (const f of pages) { const h = read(f); expect(h).toMatch(/<html lang="(es|en)"/); expect(h).toMatch(/<title>.+<\/title>/); expect(h).toMatch(/<h1[ >]/); expect(h).toContain(h.includes('<html lang="en"') ? 'Do not use bank devices' : 'No uses equipos, Wi-Fi ni internet del banco'); }
  });
  it('robots permite y hay sitemap', () => {
    expect(read(path.join(root, 'dist/robots.txt'))).toContain('Allow: /');
    expect(fs.existsSync(path.join(root, 'dist/sitemap.xml'))).toBe(true);
  });
  it('las páginas legales muestran la nota de revisión pendiente', () => {
    for (const r of ['calculadora', 'salidas', 'no-firmes', 'plazos', 'checklist-salida']) expect(read(path.join(root, 'dist', r, 'index.html'))).toContain('En revisión por abogado laboral. No es asesoría legal.');
  });
});

describe.skipIf(!hasRev)('build de revisión', () => {
  const pages = htmlOf('dist-review').filter((f) => !f.endsWith('404.html'));
  it('banner y noindex en cada página', () => {
    for (const f of htmlOf('dist-review')) { const h = read(f); expect(h).toContain('VERSIÓN DE REVISIÓN PARA ABOGADOS'); expect(h).toContain('noindex, nofollow, noarchive'); }
  });
  it('cabecera X-Robots-Tag, robots Disallow y sin sitemap', () => {
    expect(read(path.join(root, 'dist-review/_headers'))).toContain('X-Robots-Tag: noindex, nofollow, noarchive');
    expect(read(path.join(root, 'dist-review/robots.txt'))).toContain('Disallow: /');
    expect(fs.existsSync(path.join(root, 'dist-review/sitemap.xml'))).toBe(false);
  });
  it('rutas de revisión presentes', () => {
    for (const r of ['revision', 'revision/pruebas', 'revision/dictamen']) expect(fs.existsSync(path.join(root, 'dist-review', r, 'index.html'))).toBe(true);
  });
  it('panel «Para el abogado» en cada página legal', () => {
    for (const r of ['calculadora', 'salidas', 'no-firmes', 'plazos', 'checklist-salida', 'situacion']) expect(read(path.join(root, 'dist-review', r, 'index.html'))).toContain('Para el abogado');
  });
  it('la matriz incluye cada afirmación sin huérfanas', () => {
    const h = read(path.join(root, 'dist-review/revision/index.html'));
    for (const id of claimIds) expect(h).toContain(`id="${id}"`);
    expect(pages.length).toBeGreaterThan(20);
  });
  it('la nota de cookie de Access está solo en revisión', () => { expect(read(path.join(root, 'dist-review/acerca/index.html'))).toContain('Cloudflare Access'); });
});
