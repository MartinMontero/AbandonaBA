// Genera docs/LEGAL-REGISTER.md desde src/data/claims-register.json (nunca se edita a mano).
import fs from 'node:fs';
import path from 'node:path';
import { enrichedRegister } from '../src/lib/claims.mjs';

const reg = enrichedRegister();
const lines = ['# Registro de afirmaciones (generado)', '', '> Generado desde `src/data/claims-register.json` por `scripts/gen-legal-register.mjs`. No editar a mano.', ''];
for (const c of reg) {
  lines.push(`## ${c.id} · ${c.status} · prioridad ${c.tier}`, '', c.statement, '',
    '**Fuentes:** ' + c.sources.map((s) => `[${s.name}](${s.url}) (leída ${s.read})`).join('; '), '',
    `**Conflicto abierto:** ${c.conflict}`, '', `**Debe confirmar:** ${c.must_confirm}`, '', `**Pregunta para el abogado:** ${c.attorney_question}`, '',
    `**Páginas:** ${c.pages.length ? c.pages.join(', ') : '(ninguna)'}`, '');
}
fs.writeFileSync(path.join(process.cwd(), 'docs', 'LEGAL-REGISTER.md'), lines.join('\n'));
console.log('LEGAL-REGISTER.md:', reg.length, 'afirmaciones');
