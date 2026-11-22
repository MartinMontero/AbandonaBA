// Genera docs/review-pack/*.pdf y docs/ATTORNEY-WALKTHROUGH.md desde el build de revisión (dist-review).
// Uso: npm run build:review && node scripts/build-review-pack.mjs
// Todos los datos son inventados. Los PDF son instantáneas de la herramienta en la fecha indicada.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = process.cwd();
const dist = path.join(root, 'dist-review');
const outDir = path.join(root, 'docs', 'review-pack');
fs.mkdirSync(outDir, { recursive: true });
const date = new Date().toISOString().slice(0, 10);

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(dist, p);
  if (!f.startsWith(dist)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(8799, '127.0.0.1', r));
const base = 'http://127.0.0.1:8799';

const pages = [['/revision/', 'revision'], ['/revision/dictamen/', 'dictamen-en-blanco'], ['/salidas/', 'salidas'], ['/no-firmes/', 'no-firmes'], ['/plazos/', 'plazos'], ['/checklist-salida/', 'checklist-salida']];
const scenarios = [
  { id: '01-cajero-5-anios', label: 'Cajero con cinco años', i: { weeklyBase: '2205.28', commissions: '900', years: '5' } },
  { id: '02-cajero-2-anios', label: 'Cajero con dos años', i: { weeklyBase: '2205.28', commissions: '900', years: '2' } },
  { id: '03-cajero-7-anios', label: 'Cajero con siete años', i: { weeklyBase: '2205.28', commissions: '900', years: '7' } },
  { id: '04-solo-comisiones', label: 'Pago solo con comisiones (sin sueldo base)', i: { weeklyBase: '0', commissions: '2500', years: '3' } },
  { id: '05-frontera-norte', label: 'Trabajador en la frontera norte', i: { weeklyBase: '3085.09', commissions: '900', years: '5', zone: 'frontera' } },
  { id: '06-renuncia-15-anios', label: 'Renuncia con 15 años o más', i: { weeklyBase: '2205.28', commissions: '900', years: '16' } },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'es-MX' });
const page = await ctx.newPage();
const pdfOpts = { format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } };

for (const [url, name] of pages) {
  await page.goto(base + url, { waitUntil: 'networkidle' });
  await page.pdf({ path: path.join(outDir, `${name}.pdf`), ...pdfOpts });
}

const money = async (sel) => ((await page.locator(sel).first().textContent()) || '').trim();
const walk = [];
for (const s of scenarios) {
  await page.goto(base + '/calculadora/', { waitUntil: 'networkidle' });
  await page.fill('#weeklyBase', s.i.weeklyBase); await page.fill('#commissions', s.i.commissions); await page.fill('#years', s.i.years);
  if (s.i.zone) await page.selectOption('#zone', s.i.zone);
  await page.click('#pasos summary');
  const r = {};
  for (const e of ['renuncia', 'art439', 'art51', 'art48']) r[e] = { A: await money(`#out-${e}-A`), B: await money(`#out-${e}-B`) };
  r.sdiA = await money('#step-A-5'); r.sdiB = await money('#step-B-5'); r.isr = await money('#out-isr');
  await page.pdf({ path: path.join(outDir, `calculadora-${s.id}.pdf`), ...pdfOpts });
  walk.push({ ...s, r });
}
await browser.close();
server.close();

const rows = (w) => ['renuncia', 'art439', 'art51', 'art48'].map((e) => `| ${e} | ${w.r[e].A} | ${w.r[e].B} |`).join('\n');
const md = [
  '# Recorrido para el abogado (generado)',
  '',
  `Generado el ${date} desde el build de revisión con \`node scripts/build-review-pack.mjs\`. Los valores salen del mismo código de la calculadora (\`src/lib/calc.ts\`). Todos los datos de entrada son inventados.`,
  '',
  'Ruta de clics en cada escenario: **Calculadora** › escribir sueldo base semanal, comisiones y años › abrir «Ver el cálculo paso a paso» › cambiar las decisiones D1 a D5 en el bloque «Cómo se cuenta» para ver el otro resultado. La mesa de revisión (`/revision/`) muestra las cinco decisiones lado a lado.',
  '',
  ...walk.flatMap((w) => [
    `## ${w.label}`,
    '',
    `Entradas: sueldo base semanal ${w.i.weeklyBase}, comisiones semanales ${w.i.commissions}, años completos ${w.i.years}, zona ${w.i.zone ?? 'general'}.`,
    '',
    `SDI método A: ${w.r.sdiA}. SDI método B: ${w.r.sdiB}. Parte exenta de ISR (90 × UMA × años): ${w.r.isr}.`,
    '',
    '| Salida | Método A (comisión ÷ 7) | Método B (comisión ÷ 6) |',
    '|---|---|---|',
    rows(w),
    '',
  ]),
].join('\n');
fs.writeFileSync(path.join(root, 'docs', 'ATTORNEY-WALKTHROUGH.md'), md);

fs.writeFileSync(path.join(outDir, 'LEEME.es.md'), [
  '# Paquete de revisión para el abogado',
  '',
  `Fecha de las instantáneas: ${date}.`,
  '',
  '**Qué se adjunta.** PDF de la mesa de revisión, de la hoja de dictamen en blanco, de las páginas Salidas, No firmes, Plazos y Checklist, y seis resultados impresos de la calculadora con datos inventados.',
  '',
  '**Cómo abrir la herramienta en vivo.** Enlace: [COMPLETAR: URL de la versión de revisión]. Método de acceso: [COMPLETAR: se le enviará un PIN de un solo uso a su correo].',
  '',
  '**Qué evaluar primero.** (1) Calculadora y sus decisiones D1 a D5; (2) la página Salidas y el Art. 439; (3) plazos; (4) No firmes esto; (5) checklist. Cada afirmación tiene una pregunta concreta en la mesa de revisión (`/revision/`).',
  '',
  '**Cómo nos hace llegar sus hallazgos.** Imprima o guarde como PDF la hoja de dictamen y envíela por el medio que se le indicó por separado. El sitio no recoge nada.',
  '',
  'Los PDF son instantáneas de la herramienta en la fecha indicada. Si la herramienta en vivo cambió, manda ella.',
  '',
  'Contacto: [COMPLETAR: línea de contacto].',
  '',
].join('\n'));
console.log('review-pack listo:', fs.readdirSync(outDir).length, 'archivos');
