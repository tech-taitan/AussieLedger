# AussieLedger

Free Australian bookkeeping → tax return tool. Your data stays in your browser.

**Try the live demo at https://aussieledger.techtaitan.com**

> _Screenshot coming v1.3._

AU only. All four entity types (Company, Trust, Sole Trader / Individual, Partnership).
Open source under Apache 2.0. No accounts, no servers, no telemetry.

## What This Is

**For small-business owners** — take your trial balance, record your year's adjustments and journals in plain English, and walk away with a print-ready working paper to hand to the ATO via myGov or to your tax agent. No subscription, no paid services in the critical path.

**For tax agents** — a no-cost workspace for your smaller clients. Multi-client list, fast entity switching, print-ready Form I / Form C / Form T / Form P / BAS / IAS working papers with ATO field codes.

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
3. (Optional) Set `VITE_HOSTED_MODE` to `true` in Project Settings → Environment Variables. This enables the hosted-mode UI paths (iOS ITP banner, etc.). Leave unset for the self-host paths described above.
4. Push to `main` — Vercel auto-deploys. CSP + security headers ship via `vercel.json`; SPA deep-link fallback also configured there.
5. (Optional) Add a custom domain in Project Settings → Domains.

Never set a `VITE_GEMINI_API_KEY` build-time env var — the `npm run build` script greps the bundle for Gemini-key shapes (`scripts/scan-aiza.mjs`) and exits non-zero if any are found. AI features on the public hosted version are deferred to v5 — see the Optional AI section below.

## How It Works

- **Persistence:** StorageAdapter abstracts the storage layer. LocalAdapter (IndexedDB) + ServerAdapter (HTTP → Express → SQLite). Same SPA bundle, runtime probe picks the shape.
- **Tax engine:** Pure functions in `src/lib/tax/` consume Chart of Accounts + Journal Entries and produce ATO-label-tagged working papers. Decimal arithmetic throughout (decimal.js).
- **Print working papers:** `window.print()` + `@media print` CSS. No PDF library. ATO field codes shown alongside plain-English labels.
- **Year-end wizard:** Guided 7-step flow (confirm → unreconciled → GST codes → unmapped → preview → attest → finalise). Locks the FY when finalised; post-finalise corrections route through Reverse-and-Re-post.
- **PWA:** Installable to your OS home screen via the browser's URL-bar install affordance. Service worker precaches the SPA shell; updates surface via a non-intrusive banner (never auto-reload mid-form).

## Optional: AI Account-Matching

If `GEMINI_API_KEY` is set in `.env.local` (single-user) or as a server env var (small-firm), the TB import shows an "AI re-match accounts" button. Without a key, you'll see a one-line note saying AI suggestions are disabled — the rest of the app works exactly the same.

**Hosted AI status:** AI features are not yet available on the public hosted version at `aussieledger.techtaitan.com`. Self-hosting with your own `GEMINI_API_KEY` is the supported path today. Hosted AI (with user-supplied keys, direct browser-to-Google calls, never via an AussieLedger server) is planned for v5 — the CSP allowlist for `generativelanguage.googleapis.com` is already in place.

## Privacy

AussieLedger doesn't set cookies, doesn't load third-party scripts, doesn't ship analytics, and doesn't have a server for your data. The trust signals are documented on the **[/privacy page](https://aussieledger.techtaitan.com/privacy)** on the live deploy — every claim is verifiable in your browser's DevTools.

Open source under Apache 2.0 — full source at https://github.com/tech-taitan/AussieLedger. The privacy page is the receipts: each bullet is a single verifiable claim, not a legal-document section.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for dev setup, test patterns, the hard schema-migration rule, and how to add a new FY.

## License

Apache 2.0. See [LICENSE](./LICENSE).

AussieLedger produces working papers, not tax advice. The lodging entity retains all responsibility for the return.
