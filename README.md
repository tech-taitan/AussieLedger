# AussieLedger

Free, self-hosted, open-source Australian bookkeeping → tax return tool.
AU only. All four entity types (Company, Trust, Sole Trader / Individual, Partnership).

## What This Is

**For small-business owners** — take your trial balance, record your year's adjustments and journals in plain English, and walk away with a print-ready working paper to hand to the ATO via myGov or to your tax agent. No subscription, no paid services in the critical path.

**For tax agents** — a no-cost workspace for your smaller clients. Multi-client list, fast entity switching, print-ready Form I / Form C / Form T / Form P / BAS / IAS working papers with ATO field codes.

## Quick Start

```bash
git clone <repo-url>
cd AussieLedger
npm install && npm run build
npm run dev
```

Visit http://localhost:3000. On first load, you'll be asked to pick **owner mode** (single business) or **agent mode** (multiple clients).

## Deployment Shapes

AussieLedger ships in two shapes from the same codebase.

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

## How It Works

- **Persistence:** StorageAdapter abstracts the storage layer. LocalAdapter (IndexedDB) + ServerAdapter (HTTP → Express → SQLite). Same SPA bundle, runtime probe picks the shape.
- **Tax engine:** Pure functions in `src/lib/tax/` consume Chart of Accounts + Journal Entries and produce ATO-label-tagged working papers. Decimal arithmetic throughout (decimal.js).
- **Print working papers:** `window.print()` + `@media print` CSS. No PDF library. ATO field codes shown alongside plain-English labels.
- **Year-end wizard:** Guided 7-step flow (confirm → unreconciled → GST codes → unmapped → preview → attest → finalise). Locks the FY when finalised; post-finalise corrections route through Reverse-and-Re-post.

## Optional: AI Account-Matching

If `GEMINI_API_KEY` is set in `.env.local` (single-user) or as a server env var (small-firm), the TB import shows an "AI re-match accounts" button. Without a key, you'll see a one-line note saying AI suggestions are disabled — the rest of the app works exactly the same.

## Self-host your own deploy

The repo's CI/CD pipeline auto-deploys every push to `main` to Cloudflare Pages at `https://aussieledger.pages.dev`. If you want to fork the repo and deploy your own instance to your own Cloudflare account, you need three things:

1. **A Cloudflare Pages project** named `aussieledger` (or rename it and update `--project-name=` in `.github/workflows/ci.yml`). Create it in the [Cloudflare Pages dashboard](https://dash.cloudflare.com) → "Create application" → "Pages" → "Upload assets" (direct-upload mode; not git-connected — GitHub Actions handles the trigger).

2. **A fine-grained Cloudflare API token** scoped to the Pages project. Create at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → "Create Custom Token" with permissions `Account > Cloudflare Pages > Edit` + `Account > Account Settings > Read`.

3. **Two GitHub Secrets** on your fork (Settings → Secrets and variables → Actions):
   - `CLOUDFLARE_API_TOKEN` — the token from step 2
   - `CLOUDFLARE_ACCOUNT_ID` — visible in the Cloudflare dashboard's right sidebar

After that, push to `main` and watch the `deploy` job in `.github/workflows/ci.yml` ship to your `<your-project>.pages.dev` URL. Pull requests get separate preview deploys at `pr-{N}.<your-project>.pages.dev`.

The pipeline includes a defensive `AIza` scan that blocks any build where a Gemini API key shape ends up in `dist/` — see [PITFALLS.md §1](./.planning/research/PITFALLS.md) for the security rationale. Never set `VITE_GEMINI_API_KEY` (or any `VITE_`-prefixed secret) in your CI environment.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for dev setup, test patterns, the hard schema-migration rule, and how to add a new FY.

## License

Apache 2.0. See [LICENSE](./LICENSE).

AussieLedger produces working papers, not tax advice. The lodging entity retains all responsibility for the return.
