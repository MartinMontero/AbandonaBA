// Un solo código, dos builds: producción (dist) y revisión para abogados (dist-review).
import { defineConfig } from 'astro/config';
import fs from 'node:fs';

export const REVIEW = process.env.REVIEW_MODE === '1';
const valores = JSON.parse(fs.readFileSync(new URL('./src/data/valores-2026.json', import.meta.url), 'utf8'));
const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const num = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 4 });

function fmtToken(id) {
  const v = valores.find((x) => x.id === id);
  if (!v) throw new Error('Token {{v:' + id + '}} no existe en valores-2026.json');
  return String(v.unit).startsWith('MXN') ? mxn.format(v.value) : num.format(v.value);
}
// Reemplaza {{v:id}} en los Markdown por el valor de valores-2026.json (plugin de Vite, antes de que Astro procese el Markdown).
function valuesPlugin() {
  const re = /\{\{v:([a-z0-9_]+)\}\}/g;
  return {
    name: 'valores-tokens',
    enforce: 'pre',
    transform(code, id) {
      if (!id.split('?')[0].endsWith('.md')) return null;
      return { code: code.replace(re, (_, k) => fmtToken(k)), map: null };
    },
  };
}

const reviewRoutes = {
  name: 'rutas-de-revision',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      if (!REVIEW) return;
      injectRoute({ pattern: '/revision', entrypoint: './src/review/revision.astro' });
      injectRoute({ pattern: '/revision/pruebas', entrypoint: './src/review/pruebas.astro' });
      injectRoute({ pattern: '/revision/dictamen', entrypoint: './src/review/dictamen.astro' });
      injectRoute({ pattern: '/revision/documento', entrypoint: './src/review/documento.astro' });
    },
  },
};

export default defineConfig({
  site: 'https://abandonabancoazteca.mx',
  outDir: REVIEW ? './dist-review' : './dist',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never' },
  vite: { build: { assetsInlineLimit: 0 }, plugins: [valuesPlugin()] },
  integrations: [reviewRoutes],
  devToolbar: { enabled: false },
});
