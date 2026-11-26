// Uso: node scripts/e2e.mjs [prod|review] [argumentos de playwright...]
// Levanta el Worker real con `wrangler dev --local` (sin bindings remotos: CI no tiene credenciales de Cloudflare;
// las pruebas de /consulta-lft/ simulan /api/lft/* en el navegador) (producción en 8787, revisión en 8788), corre Playwright y cierra solo sus procesos.
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const which = process.argv[2] === 'prod' || process.argv[2] === 'review' ? process.argv[2] : undefined;
const rest = process.argv.slice(which ? 3 : 2);
const wrangler = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const targets = [];
if (!which || which === 'prod') targets.push({ port: 8787, args: [] });
if (!which || which === 'review') targets.push({ port: 8788, args: ['--env', 'review'] });

const children = [];
async function waitFor(url, ms = 90000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { const r = await fetch(url); if (r.status === 200) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('no respondió: ' + url);
}
// workerd sobrevive a veces a su padre; se cierran solo los de ESTE repositorio.
function killOrphans() {
  spawnSync('powershell', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'workerd.exe' -and $_.CommandLine -like '*AbandonaBA*' } | ForEach-Object { taskkill /PID $_.ProcessId /T /F | Out-Null }`], { stdio: 'ignore' });
}
killOrphans();
function stop() {
  for (const c of children) { try { spawnSync('taskkill', ['/PID', String(c.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {} }
  killOrphans();
}
process.on('exit', stop);
let code = 1;
try {
  for (const t of targets) {
    const log = fs.openSync(path.join(os.tmpdir(), `wrangler-e2e-${t.port}.log`), 'w');
    const c = spawn(process.execPath, [wrangler, 'dev', '--local', ...t.args, '--port', String(t.port), '--ip', '127.0.0.1'], { cwd: root, stdio: ['pipe', log, log], windowsHide: true, env: { ...process.env, NO_COLOR: '1', WRANGLER_SEND_METRICS: 'false' } });
    children.push(c);
  }
  for (const t of targets) await waitFor(`http://127.0.0.1:${t.port}/`);
  const pw = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
  const r = spawnSync(process.execPath, [pw, 'test', ...rest], { cwd: root, stdio: 'inherit', env: { ...process.env, E2E_ONLY: which ?? '' } });
  code = r.status ?? 1;
} catch (e) {
  console.error(String(e));
} finally {
  stop();
}
process.exit(code);
