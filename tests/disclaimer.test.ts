import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { siteConfig } from '../src/data/site.config';
import directorio from '../src/data/directorio.json';

const root = process.cwd();
function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

describe('aviso general del pie', () => {
  it('nombra a PROFEDET una sola vez y su enlace es el de la página oficial del directorio', () => {
    expect(siteConfig.disclaimer.split('PROFEDET').length - 1).toBe(1);
    const pf = (directorio as any[]).find((d) => d.id === 'profedet');
    expect(siteConfig.profedetUrl).toBe(pf.url);
    expect(siteConfig.profedetUrl).toMatch(/^https:\/\/www\.gob\.mx\//);
  });
  const pages = walk(path.join(root, 'dist')).filter((f) => f.endsWith('.html'));
  (pages.length ? it : it.skip)('cada página construida enlaza PROFEDET en el aviso del pie y deja el texto completo', () => {
    for (const f of pages) {
      const html = fs.readFileSync(f, 'utf8');
      const foot = html.slice(html.indexOf('<footer'));
      expect(foot, f).toContain(`<a href="${siteConfig.profedetUrl}" rel="noopener noreferrer">PROFEDET</a>`);
      const text = foot.replace(/<[^>]+>/g, '');
      expect(text.replace(/\s+/g, ' '), f).toContain(siteConfig.disclaimer);
    }
  });
});
