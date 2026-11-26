// Construye el índice de «Consulta la LFT» para Cloudflare (sin servidores propios):
//   - D1: artículos (texto oficial y metadatos) + búsqueda de texto completo FTS5 (BM25) + manifiesto.
//   - Vectorize: un vector por fragmento con @cf/baai/bge-m3 (el mismo modelo que usa el Worker para la pregunta).
//
// Entrada: services/lft-rag/data/index/{chunks.json,manifest.json}, producidos por `lft-rag ingest` (parser determinista).
// Salida:  .cache/lft-cf/seed.sql y .cache/lft-cf/vectors.ndjson (ignorados por git).
// Uso:     node scripts/lft-cloudflare-index.mjs   (requiere `cf auth login` y CLOUDFLARE_ACCOUNT_ID)
// Después: powershell -File scripts/lft-cloudflare-load.ps1
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const idx = path.join(root, 'services', 'lft-rag', 'data', 'index');
const out = path.join(root, '.cache', 'lft-cf');
fs.mkdirSync(out, { recursive: true });

const EMBEDDING_MODEL = '@cf/baai/bge-m3';
const chunks = JSON.parse(fs.readFileSync(path.join(idx, 'chunks.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(idx, 'manifest.json'), 'utf8'));
if (!process.env.CLOUDFLARE_ACCOUNT_ID) throw new Error('Define CLOUDFLARE_ACCOUNT_ID');

// El CLI `cf` se ejecuta con Node directamente (sin shell) y el cuerpo va en un archivo:
// así se evitan los problemas de comillas y de longitud de línea de Windows.
function findCfEntry() {
  if (process.env.CF_CLI_ENTRY) return process.env.CF_CLI_ENTRY;
  const r = spawnSync('npm', ['root', '-g'], { encoding: 'utf8', shell: process.platform === 'win32' });
  const entry = path.join(r.stdout.trim(), 'cf', 'bin', 'cf');
  if (!fs.existsSync(entry)) throw new Error('No se encontró el CLI cf (npm install --global cf) o define CF_CLI_ENTRY');
  return entry;
}
const cfEntry = findCfEntry();
const bodyFile = path.join(out, 'embed-body.json');

function embed(texts) {
  fs.writeFileSync(bodyFile, JSON.stringify({ text: texts }));
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = spawnSync(process.execPath, [cfEntry, 'ai', 'run', EMBEDDING_MODEL, '--body', '@' + bodyFile], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    try {
      const d = JSON.parse(r.stdout);
      const data = (d.result ?? d).data;
      if (Array.isArray(data) && data.length === texts.length) return data;
    } catch {}
    console.error(`  reintento ${attempt}: ${(r.stderr || r.stdout || '').slice(0, 300)}`);
  }
  throw new Error('No se pudieron calcular los embeddings');
}

const vectors = [];
const BATCH = 32;
for (let i = 0; i < chunks.length; i += BATCH) {
  const part = chunks.slice(i, i + BATCH);
  const vecs = embed(part.map((c) => c.text));
  part.forEach((c, j) => vectors.push({ id: `c${i + j}`, values: vecs[j], metadata: { is_transitorio: !!c.is_transitorio, is_derogado: !!c.is_derogado } }));
  if ((i / BATCH) % 10 === 0) console.log(`embeddings ${Math.min(i + BATCH, chunks.length)}/${chunks.length}`);
}
fs.writeFileSync(path.join(out, 'vectors.ndjson'), vectors.map((v) => JSON.stringify(v)).join('\n') + '\n');
fs.rmSync(bodyFile, { force: true });

const q = (s) => `'${String(s ?? '').replace(/'/g, "''")}'`;
const b = (x) => (x ? 1 : 0);
const sql = [
  'DROP TABLE IF EXISTS chunks_fts;',
  'DROP TABLE IF EXISTS chunks;',
  'DROP TABLE IF EXISTS meta;',
  'CREATE TABLE chunks (vid TEXT PRIMARY KEY, chunk_id TEXT NOT NULL, articulo_id TEXT NOT NULL, articulo_label TEXT NOT NULL, titulo TEXT NOT NULL, capitulo TEXT NOT NULL, seccion TEXT NOT NULL, is_derogado INTEGER NOT NULL, is_transitorio INTEGER NOT NULL, reform_date TEXT NOT NULL, decreto TEXT NOT NULL, decreto_num INTEGER NOT NULL, part_index INTEGER NOT NULL, part_total INTEGER NOT NULL, page_start INTEGER NOT NULL, body TEXT NOT NULL, text TEXT NOT NULL);',
  'CREATE INDEX chunks_articulo ON chunks (articulo_id, part_index);',
  // Sin acentos y conservando guiones (15-a, 512-d) como parte del token.
  `CREATE VIRTUAL TABLE chunks_fts USING fts5(text, content='chunks', content_rowid='rowid', tokenize="unicode61 remove_diacritics 2 tokenchars '-'");`,
  'CREATE TABLE meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);',
];
chunks.forEach((c, i) => {
  const vals = [q(`c${i}`), q(c.chunk_id), q(c.articulo_id), q(c.articulo_label), q(c.titulo), q(c.capitulo), q(c.seccion), b(c.is_derogado), b(c.is_transitorio), q(c.reform_date), q(c.decreto), c.decreto_num | 0, c.part_index | 0, c.part_total | 0, c.page_start | 0, q(c.body), q(c.text)];
  sql.push(`INSERT INTO chunks VALUES (${vals.join(', ')});`);
});
sql.push('INSERT INTO chunks_fts (rowid, text) SELECT rowid, text FROM chunks;');
const meta = { ...manifest, embedding_model_id: EMBEDDING_MODEL, cf_indexed_at_utc: new Date().toISOString().replace(/\.\d+Z$/, 'Z') };
for (const [k, v] of Object.entries(meta)) sql.push(`INSERT INTO meta VALUES (${q(k)}, ${q(v)});`);
fs.writeFileSync(path.join(out, 'seed.sql'), sql.join('\n') + '\n');

console.log(`listo: ${chunks.length} fragmentos -> ${path.relative(root, out)}/seed.sql y vectors.ndjson`);
