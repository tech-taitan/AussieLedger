# AussieLedger

A free Australian bookkeeping and tax-return tool. Your data stays in your browser.

**Try the live demo at https://aussieledger.techtaitan.com**

> _Screenshot coming v1.3._

For all four Australian entity types (Company, Trust, Sole Trader / Individual, Partnership). Open source under Apache 2.0. No accounts, no hosted data server, no telemetry.

> AussieLedger produces working papers, not tax advice. Have a registered tax agent or qualified accountant review every figure before lodging or making business decisions.

## What does this do?

You take your Trial Balance (the export from your existing bookkeeping software, or the closing balances from your spreadsheet), upload it, record any year-end adjustments and journals in plain English, and the app produces a print-ready working paper. You hand that working paper to the ATO via myGov, or to your tax agent.

Three things to know up front:

1. **Your data never leaves your computer.** It sits in your browser's local storage. The app has no central server.
2. **It works offline once loaded.** You can install it like an app from your browser's address bar.
3. **It is free.** No subscription, no paid feature behind a paywall, no advertising.

## Who is this for?

### Business owners

If you keep your own books in Xero, MYOB, QuickBooks, a spreadsheet, or even on paper:
1. Export your closing-balance Trial Balance.
2. Upload it here.
3. Run through the year-end checks.
4. Print the working paper and hand it to the ATO or your accountant.

### Tax agents and accountants

A no-cost workspace for your smaller clients. Multi-client list, fast entity switching, print-ready Form I / Form C / Form T / Form P / BAS / IAS working papers with ATO field codes. Owner mode and agent mode share the same engine. Switch modes in Settings.

### Developers

Stack: React 19 + Vite 6 + TypeScript 5.8, IndexedDB via `idb` for browser storage, optional Express + `better-sqlite3` server for small-firm self-hosting. PWA via `vite-plugin-pwa`. No telemetry, no analytics, no third-party scripts. See the [Architecture](#architecture-for-developers) section below.

## Try it without installing anything

Go to **https://aussieledger.techtaitan.com/demo**. A sample sole-trader entity is pre-seeded across FY2025-26 so you can click around and see what the app does. The demo runs in your browser in an isolated storage namespace. Your real data (if you have any) is not touched. Click "Exit demo" in the top banner to return to the production app.

## Download the code (step by step)

You have two ways to download the code. **Option A** is the easiest if you are not familiar with Git or GitHub.

### Option A. Download as a ZIP file (easiest)

1. Go to the project page on GitHub: https://github.com/tech-taitan/AussieLedger
2. Click the green **Code** button near the top right.
3. In the dropdown, click **Download ZIP**.
4. Open the downloaded file and unzip it to a folder of your choice (for example, your Documents folder).

### Option B. Use Git (recommended if you plan to update later)

1. Install Git if you do not already have it. Download from https://git-scm.com/downloads and follow the installer prompts.
2. Open a terminal (on Windows, "Command Prompt" or "PowerShell"; on macOS, "Terminal").
3. Move to the folder where you want the code to live. For example:
   ```
   cd Documents
   ```
4. Run this command to download the project:
   ```
   git clone https://github.com/tech-taitan/AussieLedger.git
   ```
5. Move into the new folder:
   ```
   cd AussieLedger
   ```

When you want to pull the latest updates later, open the terminal in the same `AussieLedger` folder and run:
```
git pull
```

## Run the app on your own computer

Once you have the code (Option A or B above), follow these steps. Anyone comfortable copy-pasting four commands can do this.

### Step 1. Install Node.js

Node.js is the platform the app runs on. You only have to install it once.

1. Go to https://nodejs.org/
2. Download the **LTS** version (the one labelled "Recommended For Most Users").
3. Run the installer and accept the defaults.
4. To check it worked, open a terminal and type:
   ```
   node --version
   ```
   You should see a version number like `v20.11.0`. If you do, you are ready.

### Step 2. Open a terminal in the AussieLedger folder

* **Windows:** open File Explorer, navigate to the AussieLedger folder, click in the address bar at the top, type `cmd`, and press Enter.
* **macOS:** right-click the AussieLedger folder in Finder and choose "New Terminal at Folder" (you may need to enable this once in System Settings).
* **Any platform:** open a terminal and `cd` into the folder.

### Step 3. Install the app's dependencies

In the terminal, run:
```
npm install
```
This downloads everything the app needs. It takes a few minutes the first time. You only have to do this once (and again whenever you pull an update).

### Step 4. Start the app

```
npm run dev
```

You will see a message like `Local: http://localhost:3000`. Open that link in your browser. That is the app. Press `Ctrl+C` in the terminal to stop it when you are done.

On first load, the app asks you to pick **owner mode** (single business) or **agent mode** (multiple clients).

## How the app is meant to be used

1. **Set up your entity.** On first run, pick whether you are an Individual, Sole Trader, Company, Trust, or Partnership. Fill in the basic details (entity name, ABN, financial year).
2. **Upload your Trial Balance.** Click "Upload Trial Balance" and pick the CSV or XLSX from your accounting software. The app maps the columns and accounts for you. You confirm each mapping. Anything it cannot match it asks about; nothing is hidden.
3. **Review what changed.** The Trial Balance view shows every account, with subtotals. Click a parent row's chevron to expand or collapse children. The totals at the bottom must balance.
4. **Run the year-end wizard.** Seven plain-English steps: confirm the period, deal with any unreconciled items, check GST codes, deal with unmapped accounts, preview, sign the attestation, and finalise. Finalising locks the FY.
5. **Print or export.** Print the working paper for the relevant return (Form I, Form C, Form T, Form P, BAS or IAS). The print version shows ATO field codes next to plain-English labels so a tax agent can transcribe it into ATO software in minutes.

## Deployment options

The same code can run three ways.

### Just on your own computer

Follow the "Run the app on your own computer" steps above. Your data lives in your browser's IndexedDB. It survives cache clears but not "clear all site data". Export periodically from the Data page.

### Small-firm server

```
npm install
npm run build
npm run build:server
npm run start:server &
```
Then serve the `dist/` folder via Caddy or nginx. Set env vars: `PORT` (default 4000), `DB_PATH` (default `./data/ledger.db`), `GEMINI_API_KEY` (optional, enables AI account-matching in the import). Put basic auth or VPN in front of it for multi-user access.

Windows note: `npm run dev:full` requires Visual Studio Build Tools because `better-sqlite3` compiles a native module on install.

### Public hosting on Vercel

The live demo at **https://aussieledger.techtaitan.com** runs on Vercel's free Hobby tier. To self-host your own public deploy:

1. Fork this repo on GitHub.
2. In the [Vercel dashboard](https://vercel.com/new), import your fork as a new project. Vercel auto-detects the Vite preset.
3. Set `VITE_HOSTED_MODE` to `true` in Project Settings, Environment Variables. This pins the public build to browser-only storage.
4. Push to `main`. Vercel auto-deploys. CSP and security headers ship via `vercel.json`.
5. (Optional) Add a custom domain in Project Settings, Domains.

Never inject `GEMINI_API_KEY` or set a `VITE_GEMINI_API_KEY` build-time variable. The `npm run build` script greps the bundle for Gemini-key shapes and exits with an error if any are found. AI features on the public hosted version are disabled, by design.

## Optional: AI account-matching

If you self-host the Express server and set `GEMINI_API_KEY`, the TB import shows an "AI re-match accounts" button. Without that local server and key, you see a one-line note saying AI suggestions are disabled. The rest of the app works exactly the same.

AI features are **not** available on the public hosted version at `aussieledger.techtaitan.com`. The public build does not send data to Google.

## Privacy

AussieLedger does not set cookies, does not load third-party scripts, does not ship analytics, and does not have a hosted server for your data. The trust signals are documented on the **[/privacy page](https://aussieledger.techtaitan.com/privacy)** on the live deploy. Every claim is verifiable in your browser's DevTools.

Open source under Apache 2.0. Full source at https://github.com/tech-taitan/AussieLedger. The privacy page is the receipts; each bullet is a single verifiable claim, not a legal-document section.

## Architecture (for developers)

* **StorageAdapter** is FINAL: 12 methods locked at Phase 3. LocalAdapter (IndexedDB) and ServerAdapter (HTTP → Express → SQLite) implement the same contract. Widening is via duck-typing on the concrete adapter (for example `getDbName()`, `getPersistGranted()`), never on the interface. Same SPA, two backends.
* **Tax engine is pure functions** in `src/lib/tax/`. Per-FY label modules under `returns/`, `rates/`, `labels/`. Decimal arithmetic via `decimal.js` throughout; money never touches native floats.
* **Print working papers** use `window.print()` and `@media print` CSS. No PDF library, no server-side rendering. ATO field codes shown alongside plain-English labels.
* **Demo isolation** ships via a separate `aussieledger-demo` IndexedDB namespace, gated on `window.location.pathname.startsWith('/demo')`. Your real data lives in `aussieledger` and is never touched by the `/demo` route.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for dev setup, test patterns, the hard schema-migration rule, and how to add a new FY.

## License

Apache 2.0. See [LICENSE](./LICENSE).

AussieLedger produces working papers, not tax advice. The lodging entity retains all responsibility for the return.
