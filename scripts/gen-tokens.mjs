// Genera src/styles/tokens.css desde una sola semilla con Material Color Utilities (HCT), como pide el manual de diseño.
// Uso: node scripts/gen-tokens.mjs
import fs from 'node:fs';
import { argbFromHex, hexFromArgb, Hct, SchemeVibrant, MaterialDynamicColors, themeFromSourceColor } from '@material/material-color-utilities';

const SEED = '#2f4fd6';
const roles = ['primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer', 'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer', 'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer', 'error', 'onError', 'errorContainer', 'onErrorContainer', 'surface', 'onSurface', 'onSurfaceVariant', 'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest', 'outline', 'outlineVariant', 'inverseSurface', 'inverseOnSurface', 'inversePrimary', 'scrim'];
const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const custom = [{ name: 'ok', value: argbFromHex('#2e7d32'), blend: true }, { name: 'warn', value: argbFromHex('#b26a00'), blend: true }, { name: 'accent', value: argbFromHex('#f0a000'), blend: true }];
const theme = themeFromSourceColor(argbFromHex(SEED), custom);

function block(dark) {
  const scheme = new SchemeVibrant(Hct.fromInt(argbFromHex(SEED)), dark, 0);
  const lines = roles.map((r) => `  --md-sys-color-${kebab(r)}: ${hexFromArgb(MaterialDynamicColors[r].getArgb(scheme))};`);
  for (const c of theme.customColors) {
    const t = (dark ? c.dark : c.light);
    const n = c.color.name;
    lines.push(`  --md-sys-color-${n}: ${hexFromArgb(t.color)};`, `  --md-sys-color-on-${n}: ${hexFromArgb(t.onColor)};`, `  --md-sys-color-${n}-container: ${hexFromArgb(t.colorContainer)};`, `  --md-sys-color-on-${n}-container: ${hexFromArgb(t.onColorContainer)};`);
  }
  return lines.join('\n');
}
const css = `/* GENERADO por scripts/gen-tokens.mjs (semilla ${SEED}). No editar a mano. */
:root {
${block(false)}
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root {
${block(true).split('\n').map((l) => '  ' + l).join('\n')}
  }
}
`;
fs.mkdirSync('src/styles', { recursive: true });
fs.writeFileSync('src/styles/tokens.css', css);
console.log('tokens.css escrito:', css.split('\n').length, 'líneas');
