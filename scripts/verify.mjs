// Uso: node scripts/verify.mjs [review]
// Producción: build, pruebas unitarias y de separación, e2e contra el Worker real, dry-run de wrangler.
// Revisión (REVIEW_MODE=1): lo mismo para el build de revisión.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const review = process.argv[2] === 'review' || process.env.REVIEW_MODE === '1';
const node = process.execPath;
const steps = [
  ['build', [path.join(root, 'scripts', 'build.mjs'), ...(review ? ['review'] : [])]],
  ['regenerar registro legal', [path.join(root, 'scripts', 'gen-legal-register.mjs')]],
  ['pruebas unitarias', [path.join(root, 'node_modules', 'vitest', 'vitest.mjs'), 'run']],
  ['e2e (Worker real)', [path.join(root, 'scripts', 'e2e.mjs'), review ? 'review' : 'prod']],
  ['wrangler deploy --dry-run', [path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js'), 'deploy', '--dry-run', ...(review ? ['--env', 'review'] : ['--env='])]],
];
let failed = 0;
for (const [name, args] of steps) {
  console.log(`\n=== ${name} (${review ? 'revisión' : 'producción'}) ===`);
  const r = spawnSync(node, args, { cwd: root, stdio: 'inherit', env: { ...process.env, REVIEW_MODE: review ? '1' : '0' } });
  if (r.status !== 0) { console.log(`FALLA: ${name}`); failed++; break; }
}
console.log(failed ? '\nVERIFY: FALLA' : '\nVERIFY: OK');
process.exit(failed ? 1 : 0);
