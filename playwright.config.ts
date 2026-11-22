import { defineConfig, devices } from '@playwright/test';

// Las pruebas corren contra el Worker real (wrangler dev), no contra un simulacro.
const only = process.env.E2E_ONLY; // 'prod' | 'review'
const mobile = { ...devices['Pixel 5'], viewport: { width: 360, height: 640 } };
const projects = [
  { name: 'prod-desktop', metadata: { review: false }, use: { baseURL: 'http://127.0.0.1:8787', viewport: { width: 1280, height: 800 } } },
  { name: 'prod-mobile', metadata: { review: false }, use: { ...mobile, baseURL: 'http://127.0.0.1:8787' } },
  { name: 'review-desktop', metadata: { review: true }, use: { baseURL: 'http://127.0.0.1:8788', viewport: { width: 1280, height: 800 } } },
  { name: 'review-mobile', metadata: { review: true }, use: { ...mobile, baseURL: 'http://127.0.0.1:8788' } },
].filter((p) => !only || p.name.startsWith(only));


export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  projects: projects as any,
  // Los servidores (wrangler dev) los levanta scripts/e2e.mjs; aquí solo se usan las URL.
});
