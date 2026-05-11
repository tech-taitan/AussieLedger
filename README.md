<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AussieLedger

Free, self-hosted, open-source Australian bookkeeping-to-tax-return tool for all four AU entity types (Company, Trust, Sole Trader, Partnership).

View the AI Studio reference build: https://ai.studio/apps/266bde54-dfb0-47e1-837f-206e78d7e3da

---

## Quick start

**Prerequisites:** Node.js 20 LTS or 22 LTS.

```bash
npm install
npm run dev          # development at http://localhost:3000 (IndexedDB; no server)
```

That's it for the simplest setup. For the server-backed shape (Express + SQLite),
see [Deployment shapes](#deployment-shapes) below.

> Optional: set `GEMINI_API_KEY` in `.env.local` if you want AI-assisted account
> matching during trial-balance import. The app is fully functional without it.

---

## Deployment shapes

AussieLedger ships with two deployment options. Both produce a fully working app;
pick the one that matches your usage.

### 1. Local single-user (no server) — IndexedDB

The simplest setup. No backend, no SQLite. Data lives in your browser's
IndexedDB.

```bash
npm install
npm run dev          # development at http://localhost:3000
npm run build        # production build into dist/
npm run preview      # serve the production build locally
```

Pros: zero infrastructure. Cons: data lives in *this* browser on *this* machine.
If you "Clear all site data" in the browser, your AussieLedger data is gone —
**Export your data periodically via the Data page** (sidebar → Data → Export).

### 2. Self-hosted firm (Express + SQLite)

Add the optional server tier for a shared instance (single firm, behind reverse
proxy). Data persists in a SQLite file on the server.

```bash
npm install                       # installs better-sqlite3 as optional dep
npm run dev:full                  # vite + server, both with hot reload
npm run build && npm run build:server
npm run start:server              # production server only
```

`npm run start:server` listens on `http://127.0.0.1:4000` by default. The SPA's
Vite proxy forwards `/api/*` from `http://localhost:3000` to the server during
development. In production, serve the built SPA (from `dist/`) through the same
reverse proxy that fronts the server, so `/api/*` reaches the Express process.

### Windows prerequisites for `dev:full` / `start:server`

`better-sqlite3` is a native Node module. **Windows builds from source**; there
are no prebuilt binaries shipped. You need:

1. **Python 3** on `PATH` — install from the Microsoft Store (recommended) or
   python.org. Anaconda/embeddable distributions do not set PATH correctly.
2. **Visual Studio Build Tools 2022** with the "Desktop development with C++"
   workload (~6 GB on disk; the free Build Tools download — no full IDE
   required).
3. **Node 20 LTS or 22 LTS**.

After installing the tools, run `npm rebuild better-sqlite3 --build-from-source`.
macOS and Linux receive prebuilt binaries automatically.

`better-sqlite3` is an `optionalDependencies` entry — `npm install` succeeds even
when the build fails. In that case, `npm run dev` continues to work (IndexedDB
only); `dev:full` will fail loudly when the server tries to load the missing
native binding.

### Server environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `4000` | Server bind port |
| `HOST` | `127.0.0.1` | Server bind interface — **change to `0.0.0.0` only if running behind a trusted reverse proxy** |
| `DB_PATH` | `./data/ledger.db` | SQLite file path |
| `GEMINI_API_KEY` | unset | Gemini API key — when set, enables AI-assisted import; when unset, deterministic fuzzy match is the only path |

`data/` is gitignored. Production deploys should mount or back up
`data/ledger.db*` (the WAL + SHM companions matter — back up while the server
is stopped, or use `cp data/ledger.db*`).

### Auth / shared-firm note

Phase 3 ships **no built-in auth**. The server binds `127.0.0.1` by default. For
shared/firm use on a VPS:

1. Set `HOST=0.0.0.0` (or keep `127.0.0.1` and reverse-proxy via loopback).
2. Front the server with **Caddy** or **nginx** + basic auth, OR put it behind
   a VPN.

Auth + multi-user features are tracked for a later milestone.

---

## Data durability

| Action | IndexedDB (no server) | SQLite (server) |
|--------|-----------------------|------------------|
| Close + reopen browser | Survives | Survives |
| Clear "cookies and cached images" | Survives | Survives |
| "Clear all site data" (Chrome Application tab) | **Lost** | Survives |
| Server restart | n/a | Survives |
| `rm -rf data/` | n/a | **Lost** |

**Export your data regularly via the Data page** — it's the single recovery
path for the local IDB shape. On the Data page, the Import flow requires you to
type the literal word `REPLACE` (uppercase, case-sensitive) before replacing an
existing instance — to prevent accidental wipes.

---

## AI features (optional)

AI-assisted account matching (in the Trial Balance import flow) is **optional**.
The application is fully functional without an API key:

- In **local mode** (no server): set `GEMINI_API_KEY` in `.env.local` before
  `npm run dev` / `npm run build`. The key is bundled into the SPA — acceptable
  only for fully-private self-hosted installs.
- In **server mode**: set `GEMINI_API_KEY` in the server's environment. The key
  stays server-side; the SPA calls `/api/ai/match-accounts` which proxies to
  Gemini.

When neither is configured, the deterministic Levenshtein-based matcher
(Phase 2) is the only path.

---

## Development scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Vite dev server (IndexedDB; no Express) |
| `npm run dev:server` | tsx-watch Express server (without SPA) |
| `npm run dev:full` | Both above, concurrently — Vite proxies `/api` to Express |
| `npm run build` | Vite production build of the SPA (output: `dist/`) |
| `npm run build:server` | TypeScript compile of the server (output: `server/dist/`) |
| `npm run start:server` | Run the compiled server (production) |
| `npm run test` | Vitest SPA test suite (jsdom + fake-indexeddb) |
| `npm run test:server` | Vitest server suite (node env + better-sqlite3 in-memory) |
| `npm run lint` | TypeScript noEmit type-check (SPA + server) |
| `node scripts/test-dev-full.mjs` | Integration smoke: boot `dev:full`, hit `/api/health`, kill |
