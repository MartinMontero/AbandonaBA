import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { shareLinks, canShare } from '../src/lib/share';

const root = process.cwd();
function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

describe('compartir: enlaces', () => {
  const url = 'https://abandonabancoazteca.com/transparencia/mapa/';
  const links = shareLinks(url, 'Mapa de conexiones');
  it('trae WhatsApp, Facebook, X e Instagram, en ese orden', () => {
    expect(links.map((l) => l.id)).toEqual(['whatsapp', 'facebook', 'x', 'instagram']);
  });
  it('WhatsApp, Facebook y X llevan la dirección de la página codificada', () => {
    const u = encodeURIComponent(url);
    expect(links[0].href).toBe(`https://wa.me/?text=Mapa%20de%20conexiones%20${u}`);
    expect(links[1].href).toBe(`https://www.facebook.com/sharer/sharer.php?u=${u}`);
    expect(links[2].href).toBe(`https://x.com/intent/post?url=${u}&text=Mapa%20de%20conexiones`);
  });
  it('Instagram no tiene enlace para compartir: copia el enlace y abre Instagram', () => {
    expect(links[3].copy).toBe(true);
    expect(links[3].href).toBe('https://www.instagram.com/');
  });
  it('todos son https, sin scripts ni parámetros de seguimiento, y avisan que abren otra pestaña', () => {
    for (const l of links) {
      expect(l.href).toMatch(/^https:\/\//);
      expect(l.href).not.toMatch(/utm_|fbclid|ref=|javascript:/i);
      expect(l.aria).toMatch(/otra pestaña/);
    }
    for (const l of shareLinks(url, 'Map', false)) expect(l.aria).toMatch(/new tab/);
  });
  it('no se comparte la página de error ni las de revisión', () => {
    expect(canShare('/404/')).toBe(false);
    expect(canShare('/revision/')).toBe(false);
    expect(canShare('/revision/dictamen/')).toBe(false);
    expect(canShare('/')).toBe(true);
    expect(canShare('/transparencia/mapa/')).toBe(true);
    expect(canShare('/en/')).toBe(true);
  });
});

describe('compartir: en todas las páginas construidas', () => {
  const pages = walk(path.join(root, 'dist')).filter((f) => f.endsWith('.html'));
  const maybe = pages.length ? it : it.skip;
  maybe('cada página, menos la de error, trae los cinco botones y ningún script de otra empresa', () => {
    for (const f of pages) {
      const html = fs.readFileSync(f, 'utf8');
      const rel = path.relative(path.join(root, 'dist'), f).replace(/\\/g, '/');
      if (rel === '404.html' || rel === '404/index.html') { expect(html, rel).not.toContain('class="share"'); continue; }
      expect(html, rel).toContain('class="share"');
      for (const needle of ['wa.me/', 'facebook.com/sharer/sharer.php', 'x.com/intent/post', 'instagram.com/', 'data-copy']) expect(html, `${rel} ${needle}`).toContain(needle);
      const share = html.slice(html.indexOf('class="share"'));
      expect(share.slice(0, share.indexOf('</section>')), rel).not.toContain('data-say=');
      expect(html, rel).not.toMatch(/<script[^>]+src="https?:\/\//i);
      expect(html, rel).not.toMatch(/connect\.facebook\.net|platform\.twitter\.com|platform\.x\.com|instagram\.com\/embed/i);
    }
  });
});
