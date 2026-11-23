// Genera tarjetas PNG (1080x1080 y 1080x1920) desde plantillas SVG con sharp. Sin nombres ni logos del banco.
// Uso: node scripts/build-cards.mjs   (los PNG quedan en public/cards y se suben al repositorio)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'public', 'cards');
fs.mkdirSync(out, { recursive: true });
const base = 'abandonabancoazteca.mx';
const note = 'Información general. En revisión por abogado laboral. No es asesoría legal.';

const cards = [
  { slug: 'no-firmes', title: ['No firmes esto'], lines: ['Ni hojas en blanco.', 'Ni renuncias sin fecha.', 'Ni convenios sin ratificar.', 'Pide copia y revisa con PROFEDET.'], url: '/no-firmes/' },
  { slug: 'plazos', title: ['Mis plazos'], lines: ['Despido: 2 meses.', 'Separarte por culpa del patrón:', 'un mes (cuenta 30 días).', 'Calcula tus fechas hoy.'], url: '/plazos/' },
  { slug: 'checklist-salida', title: ['Lo que el banco', 'te debe y le debes'], lines: ['Préstamos, ahorro, nómina,', 'Afore, aguinaldo, vacaciones.', 'Pide todo por escrito.'], url: '/checklist-salida/' },
  { slug: 'art439', title: ['Art. 439', 'en 30 segundos'], lines: ['Si una máquina nueva', 'deja sin puesto a alguien,', 'se necesita convenio o', 'autorización del Tribunal.'], url: '/salidas/' },
  { slug: 'ayuda-gratis', title: ['Ayuda gratis'], lines: ['PROFEDET da asesoría gratuita.', 'La conciliación es el primer paso', 'antes del Tribunal.'], url: '/ayuda-gratis/' },
  { slug: 'empleos', title: ['Banco de empleo'], lines: ['Bancos, fintech y bolsas', 'en un solo lugar.', 'Elige lo que haces hoy', 'y mira dónde encaja.'], url: '/empleos/' },
  { slug: 'si-te-piden-renunciar', title: ['Si te piden', 'renunciar'], lines: ['No firmes bajo presión.', 'Calcula primero.', 'La forma de irte decide', 'lo que te llevas.'], url: '/salidas/' },
];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function svg(card, w, h) {
  const pad = 80;
  let y = h === 1920 ? 360 : 220;
  const t = card.title.map((l, i) => `<text x="${pad}" y="${y + i * 110}" font-size="96" font-weight="700" fill="#ffffff">${esc(l)}</text>`).join('');
  y += card.title.length * 110 + 50;
  const body = card.lines.map((l, i) => `<text x="${pad}" y="${y + i * 64}" font-size="46" fill="#f2f2f2">${esc(l)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Arial, Helvetica, sans-serif">
  <rect width="${w}" height="${h}" fill="#111111"/><rect x="0" y="0" width="${w}" height="16" fill="#ff9800"/>
  ${t}${body}
  <text x="${pad}" y="${h - 150}" font-size="40" font-weight="700" fill="#ff9800">${base}${esc(card.url)}</text>
  <text x="${pad}" y="${h - 90}" font-size="28" fill="#cccccc">${esc(note)}</text>
</svg>`;
}
for (const c of cards) for (const [w, h] of [[1080, 1080], [1080, 1920]]) {
  await sharp(Buffer.from(svg(c, w, h))).png().toFile(path.join(out, `${c.slug}-${w}x${h}.png`));
}
console.log('tarjetas:', fs.readdirSync(out).length);
