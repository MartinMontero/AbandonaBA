// Uso: node scripts/build.mjs [review]
// Un solo comando por build: astro build + post-proceso (cabeceras, robots, sitemap, precache).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const review = process.argv[2] === 'review';
const env = { ...process.env, REVIEW_MODE: review ? '1' : '0' };
const node = process.execPath;
const astro = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');

let r = spawnSync(node, [astro, 'build'], { cwd: root, env, stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);
r = spawnSync(node, [path.join(root, 'scripts', 'post-build.mjs'), review ? 'review' : 'prod'], { cwd: root, env, stdio: 'inherit' });
process.exit(r.status ?? 0);
