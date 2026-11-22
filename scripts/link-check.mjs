// Revisa cada URL externa de los archivos de datos, contenido y páginas. Escribe docs/link-check.json con estado y fecha.
// Uso: node scripts/link-check.mjs [--strict]
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(json|md|astro|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}
const files = [...walk(path.join(root, 'src'))];
const urls = new Map();
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  for (const m of t.matchAll(/https?:\/\/[^\s"'<>)\]\\`]+/g)) {
    const u = m[0].replace(/[.,;]+$/, '');
    if (/abandonabancoazteca\.mx|github\.com\/MartinMontero|wa\.me|localhost|127\.0\.0\.1|www\.w3\.org|schemas\.|example\./.test(u)) continue;
    if (!urls.has(u)) urls.set(u, new Set());
    urls.get(u).add(path.relative(root, f).split(path.sep).join('/'));
  }
}
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
async function check(u) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      const r = await fetch(u, { method, redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,*/*' }, signal: ctrl.signal });
      clearTimeout(t);
      if (r.ok || method === 'GET') return { status: r.status, final: r.url };
    } catch (e) {
      if (method === 'GET') return { status: 0, error: String(e.cause?.code || e.message) };
    }
  }
}
const list = [...urls.keys()];
const results = [];
let i = 0;
async function worker() {
  while (i < list.length) {
    const u = list[i++];
    const r = await check(u);
    results.push({ url: u, ...r, files: [...urls.get(u)] });
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
results.sort((a, b) => a.url.localeCompare(b.url));
const date = new Date().toISOString().slice(0, 10);
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs', 'link-check.json'), JSON.stringify({ date, results }, null, 1));
const bad = results.filter((r) => !(r.status >= 200 && r.status < 400));
for (const r of results) console.log((r.status >= 200 && r.status < 400 ? 'OK  ' : 'FALLA') + ' ' + r.status + ' ' + r.url);
console.log(`\n${results.length} enlaces, ${bad.length} con problema (${date}).`);
if (bad.length && process.argv.includes('--strict')) process.exit(1);
