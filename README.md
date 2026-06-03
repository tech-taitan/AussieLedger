# AussieLedger

Free Australian bookkeeping → tax return tool. Your data stays in your browser.

**Try the live demo at https://aussieledger.techtaitan.com**

> _Screenshot coming v1.3._

AU only. All four entity types (Company, Trust, Sole Trader / Individual, Partnership).
Open source under Apache 2.0. No accounts, no hosted data server, no telemetry.

## What This Is

AussieLedger meets you where you sit in the bookkeeping → tax workflow. Pick the path that fits.

### For business owners

Take your trial balance, record your year's adjustments and journals in plain English, and walk away with a print-ready working paper to hand to the ATO via myGov or to your tax agent. No subscription, no paid services in the critical path.

### For tax agents

A no-cost workspace for your smaller clients. Multi-client list, fast entity switching, print-ready Form I / Form C / Form T / Form P / BAS / IAS working papers with ATO field codes. Owner mode and agent mode share the same engine — switch modes in Settings.

### For developers

Architecture-at-a-glance for contributors:

- **StorageAdapter** is FINAL — 12 methods locked at Phase 3; LocalAdapter (IndexedDB) and ServerAdapter (HTTP → Express → SQLite) implement the same contract. Widening is via duck-typing on the concrete adapter (e.g. `getDbName()`, `getPersistGranted()`), never on the interface. Same SPA, two backends.
- **Tax engine is pure functions** in `src/lib/tax/` — per-FY label modules under `returns/`, `rates/`, `labels/`. Decimal arithmetic via `decimal.js` throughout; money never touches native floats.
- **Print working papers** use `window.print()` + `@media print` CSS. No PDF library, no server-side rendering, ATO field codes shown alongside plain-English labels.
- **Demo isolation** ships via a separate `aussieledger-demo` IndexedDB namespace, gated on `window.location.pathname.startsWith('/demo')`. Your real data lives in `aussieledger` and is never touched by the `/demo` route.
- **Stack:** React 19 + Vite 6 + TypeScript 5.8 + IndexedDB via `idb` (LocalAdapter) + Express + `better-sqlite3` (ServerAdapter). PWA via `vite-plugin-pwa`. No telemetry, no analytics, no third-party scripts (CSP `script-src 'self'`).
- **License:** Apache 2.0. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, test patterns, and how to add a new FY.

## Quick Start

### Option 1: Try the demo

Visit **https://aussieledger.techtaitan.com/demo** to explore AussieLedger with a sample sole-trader entity pre-seeded across FY2025-26. The demo runs in your browser against an isolated `aussieledger-demo` IndexedDB namespace — your real data (if any) is untouched. Click "Exit demo" in the top banner to return to the production app.

### Option 2: Clone and self-host

```bash
git clone <repo-url>
cd AussieLedger
npm install && npm run build
npm run dev
```

Visit http://localhost:3000. On first load, you'll be asked to pick **owner mode** (single business) or **agent mode** (multiple clients).

## Deployment Shapes

AussieLedger ships in three shapes from the same codebase.

### Single-user local (no server)

```bash
npm install
npm run dev
```
Data persists in your browser's IndexedDB. Survives cache clear unless you clear site data. Export your data periodically via the Data page.

### Small-firm VPS (Vite + Express + SQLite)

```bash
npm install
npm run build
npm run build:server
npm run start:server &
# serve dist/ via your reverse proxy (Caddy / nginx)
```

Set env vars: `PORT` (default 4000), `DB_PATH` (default ./data/ledger.db), `GEMINI_API_KEY` (optional — enables AI account-matching in TB import). For multi-user access, run behind your reverse proxy with basic auth or VPN.

Windows dev note: `npm run dev:full` requires Visual Studio Build Tools for the native `better-sqlite3` compile.

### Public hosting (Vercel)

The live demo at **https://aussieledger.techtaitan.com** runs on Vercel's free Hobby tier with a custom domain. To self-host your own public deploy:

1. Fork this repo on GitHub.
2. In the [Vercel dashboard](https://vercel.com/new), import your fork as a new project. Vercel auto-detects the Vite preset — no build-command override needed.
3. Set `VITE_HOSTED_MODE` to `true` in Project Settings → Environment Variables. This pins the public build to browser-only IndexedDB storage and enables the hosted-mode UI paths. Leave it unset only for the self-host paths described above.
4. Push to `main` — Vercel auto-deploys. CSP + security headers ship via `vercel.json`; SPA deep-link fallback also configured there.
5. (Optional) Add a custom domain in Project Settings → Domains.

Never inject `GEMINI_API_KEY` or set a `VITE_GEMINI_API_KEY` build-time env var — the `npm run build` script greps the bundle for Gemini-key shapes (`scripts/scan-aiza.mjs`) and exits non-zero if any are found. AI features on the public hosted version are disabled — see the Optional AI section below.

## How It Works

- **Persistence:** StorageAdapter abstracts the storage layer. LocalAdapter (IndexedDB) + ServerAdapter (HTTP → Express → SQLite). Public hosted builds are pinned to LocalAdapter; self-hosted builds use a runtime probe to select an optional local Express server.
- **Tax engine:** Pure functions in `src/lib/tax/` consume Chart of Accounts + Journal Entries and produce ATO-label-tagged working papers. Decimal arithmetic throughout (decimal.js).
- **Print working papers:** `window.print()` + `@media print` CSS. No PDF library. ATO field codes shown alongside plain-English labels.
- **Year-end wizard:** Guided 7-step flow (confirm → unreconciled → GST codes → unmapped → preview → attest → finalise). Locks the FY when finalised; post-finalise corrections route through Reverse-and-Re-post.
- **PWA:** Installable to your OS home screen via the browser's URL-bar install affordance. Service worker precaches the SPA shell; updates surface via a non-intrusive banner (never auto-reload mid-form).

## Optional: AI Account-Matching

If `GEMINI_API_KEY` is set as an environment variable for the optional self-hosted Express server, the TB import shows an "AI re-match accounts" button. Without that local server and key, you'll see a one-line note saying AI suggestions are disabled — the rest of the app works exactly the same.

**Hosted AI status:** AI features are not available on the public hosted version at `aussieledger.techtaitan.com`. Self-hosting the Express server with your own `GEMINI_API_KEY` is the supported path today. The public hosted build does not send data to Google.

## Privacy

AussieLedger doesn't set cookies, doesn't load third-party scripts, doesn't ship analytics, and doesn't have a hosted server for your data. The trust signals are documented on the **[/privacy page](https://aussieledger.techtaitan.com/privacy)** on the live deploy — every claim is verifiable in your browser's DevTools.

Open source under Apache 2.0 — full source at https://github.com/tech-taitan/AussieLedger. The privacy page is the receipts: each bullet is a single verifiable claim, not a legal-document section.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for dev setup, test patterns, the hard schema-migration rule, and how to add a new FY.

## License

Apache 2.0. See [LICENSE](./LICENSE).

AussieLedger produces working papers, not tax advice. The lodging entity retains all responsibility for the return.
