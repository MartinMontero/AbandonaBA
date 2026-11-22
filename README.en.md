# Abandona Banco Azteca

A free, anonymous, no-account site with calculators and information for people who work at a bank in Mexico: how to leave on the best terms and what to do next. Spanish first; the English pages are a short summary.

> Status: **draft pending review by a labor attorney.** Not legal advice. Not affiliated with Banco Azteca or Grupo Salinas.

## What is here
- A severance calculator that runs in the browser (`src/lib/calc.ts`), with a step-by-step panel and five open calculation conventions (D1 to D5).
- A **review build** of the same codebase (`REVIEW_MODE=1`) with a workbench for attorneys.
- Every legal figure lives in `src/data/valores-2026.json` with a source, a date and one of three labels: `verificado-primaria`, `verificado-secundaria`, `sin-verificar`.

## Privacy
No cookies, accounts, analytics or third-party requests. What you type never leaves your device. Cloudflare, as the network provider, can see connection metadata such as IP addresses.

## Run it (Windows, PowerShell)
```powershell
npm ci
npm run build
npm run build:review
npm run preview
npm run verify
npm run verify:review
```

## Fix a legal figure and redeploy
See [CONTRIBUTING.md](CONTRIBUTING.md). Everything runs on Cloudflare's free plan with your own account; nothing depends on the original author's machine or accounts.

Licenses: code MIT; text CC BY-SA 4.0.
