// Genera _headers, robots.txt, sitemap.xml (solo producción), security.txt y precache.json en el directorio de salida.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const review = process.argv[2] === 'review';
const out = path.join(root, review ? 'dist-review' : 'dist');
const site = 'https://abandonabancoazteca.mx';

function walk(dir, base = dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, acc);
    else acc.push('/' + path.relative(base, p).split(path.sep).join('/'));
  }
  return acc;
}

const csp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
const security = [
  `Content-Security-Policy: ${csp}`,
  'Referrer-Policy: no-referrer',
  'X-Content-Type-Options: nosniff',
  'Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy: same-origin',
  'Strict-Transport-Security: max-age=63072000; includeSubDomains',
];
if (review) security.push('X-Robots-Tag: noindex, nofollow, noarchive');
const headers = [
  '/*',
  ...security.map((h) => '  ' + h),
  '',
  '/_astro/*',
  '  ! Cache-Control',
  '  Cache-Control: public, max-age=31536000, immutable',
  '',
  '/sw.js',
  '  ! Cache-Control',
  '  Cache-Control: no-cache',
  '',
].join('\n');
fs.writeFileSync(path.join(out, '_headers'), headers);

fs.writeFileSync(path.join(out, 'robots.txt'), review ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`);

const files = walk(out);
const pages = files.filter((f) => f.endsWith('/index.html')).map((f) => f.replace(/index\.html$/, ''));
if (!review) {
  const urls = pages.filter((p) => p !== '/404/').map((p) => `  <url><loc>${site}${p}</loc></url>`).join('\n');
  fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}

fs.mkdirSync(path.join(out, '.well-known'), { recursive: true });
fs.writeFileSync(path.join(out, '.well-known', 'security.txt'), [
  'Contact: https://github.com/MartinMontero/AbandonaBA/issues',
  'Expires: 2027-11-22T00:00:00.000Z',
  'Preferred-Languages: es, en',
  'Policy: https://github.com/MartinMontero/AbandonaBA/blob/main/SECURITY.md',
  '# Los issues de GitHub no son anónimos. No publiques datos personales ni documentos.',
  '',
].join('\n'));

// Precache: todo menos tarjetas PNG y archivos de control.
const skip = (f) => /^\/(_headers|sw\.js|precache\.json|robots\.txt|sitemap\.xml)$/.test(f) || f.startsWith('/cards/') || f.endsWith('.map');
const precache = files.filter((f) => !skip(f)).map((f) => (f.endsWith('/index.html') ? f.replace(/index\.html$/, '') : f)).sort();
const version = crypto.createHash('sha256').update(precache.map((f) => f + fs.statSync(path.join(out, f.endsWith('/') ? f + 'index.html' : f)).size).join('|')).digest('hex').slice(0, 12);
fs.writeFileSync(path.join(out, 'precache.json'), JSON.stringify({ version, urls: precache }));
const swPath = path.join(out, 'sw.js');
if (fs.existsSync(swPath)) fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace('__VERSION__', version));
console.log(`post-build ${review ? 'review' : 'prod'}: ${files.length} archivos, ${pages.length} páginas, versión ${version}`);
