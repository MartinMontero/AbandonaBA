// Mide la recuperación de «Consulta la LFT» contra tests/lft-retrieval-eval.json (artículos esperados verificados
// contra el texto oficial indexado). Uso: node scripts/lft-eval.mjs [baseURL]   (por omisión, producción)
// Métricas: hit@5 (algún artículo esperado entre los 5 mostrados) y MRR (1/posición del primero esperado).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.argv[2] ?? 'https://abandonabancoazteca.com').replace(/\/+$/, '');
const cases = JSON.parse(fs.readFileSync(path.join(root, 'tests', process.env.LFT_EVAL_SET ?? 'lft-retrieval-eval.json'), 'utf8'));

let hits = 0, rr = 0;
for (const c of cases) {
  const r = await fetch(`${base}/api/lft/consulta`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: c.q }) });
  if (!r.ok) { console.log(`HTTP ${r.status}  ${c.q}`); continue; }
  const got = (await r.json()).filtered_articles.map((a) => a.articulo_id);
  const pos = got.findIndex((id) => c.expect.includes(id));
  if (pos >= 0) { hits++; rr += 1 / (pos + 1); }
  console.log(`${pos >= 0 ? `✓${pos + 1}` : '✗ '}  [${got.join(', ')}]  ← ${c.q}  (esperado ${c.expect.join('/')})`);
  await new Promise((res) => setTimeout(res, 3200)); // respeta el límite de 20 consultas por minuto
}
console.log(`\nhit@5 ${hits}/${cases.length} (${Math.round((100 * hits) / cases.length)} %)  MRR ${(rr / cases.length).toFixed(3)}`);
