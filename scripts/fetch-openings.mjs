// Consulta listados públicos de empleo y guarda un resumen con fecha en src/data/vacantes.json.
// Solo usa los listados que las propias empresas publican (APIs que usan sus páginas de empleo). No guarda datos personales.
// Uso: node scripts/fetch-openings.mjs
import fs from 'node:fs';
import path from 'node:path';

import { execFileSync } from 'node:child_process';
// User-Agent honesto. Workday rechaza con 429 al cliente HTTP de Node pero acepta a curl con su agente normal.
const UA = 'abandonabancoazteca-openings/1.0 (+https://github.com/MartinMontero/AbandonaBA)';
function curlPostJson(url, body) {
  const out = execFileSync(process.platform === 'win32' ? 'curl.exe' : 'curl', ['-s', '--max-time', '40', '-H', 'Content-Type: application/json', '-H', 'Accept: application/json', '-d', JSON.stringify(body), url], { encoding: 'utf8' });
  return JSON.parse(out);
}
const date = new Date().toISOString().slice(0, 10);

// Familias de puestos de un banco de sucursal y sus equivalentes.
const families = [
  ['Cajero y servicio', /cajer|personal de caja|\bcaja\b|teller|atenci[oó]n a clientes?|servicio al cliente|customer (service|support|experience)|soporte|contact/i],
  ['Asesor, ventas y crédito', /ejecutiv[oa]|asesor|promotor|ventas|sales|account executive|cr[eé]dito/i],
  ['Cobranza y campo', /cobranza|collection|recuperaci[oó]n|gestor/i],
  ['Verificación, fraude y cumplimiento', /fraud|fraude|kyc|aml|compliance|cumplimiento|prevenci[oó]n|verificaci[oó]n|riesgo|risk/i],
  ['Gerencia de sucursal', /gerente (de )?sucursal|subgerente|subdirector|branch manager|administrador/i],
];
const tech = /engineer|developer|software|data scientist|machine learning|\bml\b|devops|designer|dise[ñn]ador|product manager|ux\b/i;
function family(title) {
  if (tech.test(title)) return null;
  for (const [name, re] of families) if (re.test(title)) return name;
  return null;
}
async function getJson(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { 'user-agent': UA, accept: 'application/json', ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(url + ' ' + r.status);
  return r.json();
}
async function getText(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA } });
  if (!r.ok) throw new Error(url + ' ' + r.status);
  return r.text();
}
const out = [];
async function run(name, source, fn) {
  try {
    const { total, jobs } = await fn();
    const fit = jobs.map((j) => ({ ...j, family: family(j.title) })).filter((j) => j.family);
    const byFamily = {};
    for (const j of fit) (byFamily[j.family] ||= []).push(j);
    out.push({ company: name, source, total_mexico: total, fit_count: fit.length, counts: Object.fromEntries(Object.entries(byFamily).map(([k, v]) => [k, v.length])), examples: Object.fromEntries(Object.entries(byFamily).map(([k, v]) => [k, [...v].sort((a, b) => Number(/discapacidad|inclusi[oó]n/i.test(a.title)) - Number(/discapacidad|inclusi[oó]n/i.test(b.title))).slice(0, 4).map(({ title, location, url }) => ({ title, location, url }))])), seen: date });
    console.log(`${name}: ${total ?? 'total no medido'} abiertas en México, ${fit.length} afines`);
  } catch (e) {
    out.push({ company: name, source, error: String(e.message).slice(0, 120), seen: date });
    console.log(`${name}: ERROR ${e.message}`);
  }
}

// BBVA (Workday)
await run('BBVA México', 'https://bbva.wd3.myworkdayjobs.com/en-US/BBVA', async () => {
  const seen = new Map();
  for (const q of ['Personal de Cajas', 'Cajero', 'Ejecutivo', 'Asesor', 'Cobranza', 'Gestor', 'Atención', 'Fraude']) {
    let j;
    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise((r) => setTimeout(r, 2500 * (attempt + 1))); // Workday limita el ritmo (429)
      try { j = curlPostJson('https://bbva.wd3.myworkdayjobs.com/wday/cxs/bbva/BBVA/jobs', { appliedFacets: {}, limit: 20, offset: 0, searchText: q }); if (!j.jobPostings) throw new Error('sin jobPostings'); break; } catch (e) { if (attempt === 4) throw e; }
    }
    for (const p of j.jobPostings) if (!/Madrid|Colombia|Peru|Per[uú]\b|Cajamarca|Argentina|Turkey|Spain|Lima|Bogot|Barcelona|Valencia|Chile|Uruguay|Paraguay|Lisboa|C[uú]cuta|Norte de Santander|Medell|Antioquia|Cundinamarca/i.test(p.locationsText || '')) seen.set(p.externalPath, { title: p.title.trim(), location: p.locationsText, url: 'https://bbva.wd3.myworkdayjobs.com/en-US/BBVA' + p.externalPath });
  }
  return { total: seen.size, jobs: [...seen.values()] };
});
// Ashby: Nu, Kueski
for (const [name, slug] of [['Nu México', 'nubank'], ['Kueski', 'Kueski']]) {
  await run(name, `https://jobs.ashbyhq.com/${slug}`, async () => {
    const j = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
    const mx = j.jobs.filter((x) => /Mex|México|CDMX|Ciudad de/i.test(`${x.location} ${(x.secondaryLocations || []).map((s) => s.location).join(' ')}`));
    return { total: mx.length, jobs: mx.map((x) => ({ title: x.title.trim(), location: x.location, url: x.jobUrl })) };
  });
}
// Greenhouse: Plata, Clara, Spin
for (const [name, slug, site] of [['Plata', 'platacard', 'https://plata.careers/'], ['Clara', 'clara', 'https://job-boards.greenhouse.io/clara'], ['Spin by OXXO', 'spin', 'https://job-boards.greenhouse.io/spin']]) {
  await run(name, site, async () => {
    const j = await getJson(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`);
    const mx = j.jobs.filter((x) => /Mex|México|CDMX|Ciudad de/i.test(x.location?.name || ''));
    return { total: mx.length, jobs: mx.map((x) => ({ title: x.title.trim(), location: x.location.name, url: x.absolute_url })) };
  });
}
// SuccessFactors: Compartamos, Afirme
async function sf(base, queries) {
  const seen = new Map();
  let total = null;
  for (const q of queries) {
    const h = await getText(`${base}/search/?q=${encodeURIComponent(q)}&locale=es_MX`);
    for (const m of h.matchAll(/<a[^>]+href="(\/job\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
      const title = m[2].replace(/<[^>]+>|\s+/g, ' ').trim();
      if (title) seen.set(m[1], { title, location: decodeURIComponent(m[1].split('/')[2] || '').replace(/-/g, ' '), url: base + m[1] });
    }
  }
  // El total real del sitio no se lee de forma fiable; solo se cuentan los puestos encontrados con estas búsquedas.
  return { total: null, jobs: [...seen.values()] };
}
await run('Compartamos Banco', 'https://vacantesbancocompartamos.gentera.com.mx/', () => sf('https://vacantesbancocompartamos.gentera.com.mx', ['cajero', 'cobranza', 'asesor', 'ejecutivo', 'gerente sucursal', 'fraude']));
await run('Banca Afirme', 'https://empleos.afirme.com/', () => sf('https://empleos.afirme.com', ['cajero', 'cobranza', 'asesor', 'ejecutivo', 'gerente sucursal', 'fraude']));

fs.writeFileSync(path.join(process.cwd(), 'src', 'data', 'vacantes.json'), JSON.stringify({ seen: date, note: 'Instantánea de listados públicos de cada empresa. Cambian a diario: confirma en el enlace.', companies: out }, null, 1));
console.log('escrito src/data/vacantes.json');
