// Registro de afirmaciones y mapa afirmación -> páginas. Se calcula escaneando el código fuente.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd(); // build y pruebas corren desde la raíz del repo
export const register = JSON.parse(fs.readFileSync(path.join(root, 'src/data/claims-register.json'), 'utf8'));
export const claimIds = register.map((c) => c.id);

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}
function routeOf(file) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  let m;
  if ((m = /^src\/content\/(es|en)\/(.+)\.md$/.exec(rel))) {
    const slug = m[2] === 'index' ? '' : m[2];
    return (m[1] === 'en' ? '/en/' : '/') + (slug ? slug + '/' : '');
  }
  if ((m = /^src\/pages\/(.+)\.astro$/.exec(rel)) && !m[1].includes('[')) return m[1] === 'index' ? '/' : '/' + m[1].replace(/\/index$/, '') + '/';
  if ((m = /^src\/review\/(.+)\.astro$/.exec(rel))) return '/revision' + (m[1] === 'revision' ? '' : '/' + m[1]) + '/';
  return null;
}
/** { C01: ['/salidas/', ...] } — solo páginas con ids en el frontmatter `claims:` o en `data-claims` / `claims=` de los .astro. */
export function claimPages() {
  const map = Object.fromEntries(claimIds.map((id) => [id, []]));
  const unknown = [];
  const files = [...walk(path.join(root, 'src/content'), ['.md']), ...walk(path.join(root, 'src/pages'), ['.astro']), ...walk(path.join(root, 'src/review'), ['.astro'])];
  for (const f of files) {
    const route = routeOf(f);
    if (!route) continue;
    const text = fs.readFileSync(f, 'utf8');
    const declared = [];
    const fm = /^claims:\s*\[([^\]]*)\]/m.exec(text);
    if (fm) declared.push(...fm[1].split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean));
    const a = /claims=\{?\[([^\]]*)\]/.exec(text);
    if (a) declared.push(...a[1].split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean));
    for (const id of new Set(declared)) {
      if (!map[id]) unknown.push({ file: path.relative(root, f), id });
      else if (!map[id].includes(route)) map[id].push(route);
    }
  }
  return { map, unknown };
}
export function enrichedRegister() {
  const { map } = claimPages();
  return register.map((c) => ({ ...c, pages: map[c.id] }));
}
