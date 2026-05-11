---
phase: 03-durable-persistence
plan: 4
subsystem: wave-3-data-page-ui-and-banner
tags: [data-page, export-import, replace-confirmation, adapter-fallback-banner, vite-proxy, readme-dual-shape]
dependency_graph:
  requires:
    - storage-adapter-interface-from-03-1
    - local-adapter-from-03-2
    - server-adapter-from-03-3
    - storage-index-getAdapterKind-getFellBackToLocal-from-03-2
    - LocalAdapter-getLastExportAt-setLastExportAt-from-03-2
    - migrate-CURRENT_VERSION-from-phase-1
    - test-dev-full-script-from-03-1
  provides:
    - data-page-component
    - adapter-fallback-banner-component
    - data-view-route
    - sidebar-data-nav-entry
    - vite-api-proxy
    - dual-shape-readme
  affects:
    - src/components/DataPage.tsx
    - src/components/AdapterFallbackBanner.tsx
    - src/components/__tests__/DataPage.test.tsx
    - src/components/shell/Sidebar.tsx
    - src/components/shell/MainLayout.tsx
    - src/components/ViewRouter.tsx
    - src/types.ts
    - vite.config.ts
    - README.md
tech_stack:
  added: []
  patterns:
    - FileReader-over-File.text() — jsdom-compatible import flow (File.text() not implemented under jsdom)
    - today() from src/lib/period.ts wherever a "now" Date is needed (parameterless `new Date()` forbidden by structural lint outside period.ts)
    - Adapter probe done at mount, not polled — getFellBackToLocal() only changes via _resetAdapter() + initAdapter(), i.e. a page reload
    - Banner dismissal is component-local React state — resets on reload, which is correct because the next probe attempt re-evaluates fallback
    - Vite proxy reads API_PROXY_TARGET env (defaults to http://localhost:4000) so prod proxies can point elsewhere
key_files:
  created:
    - src/components/DataPage.tsx (~310 lines)
    - src/components/AdapterFallbackBanner.tsx (~52 lines)
  modified:
    - src/components/__tests__/DataPage.test.tsx (11 .todo -> 11 GREEN tests: 8 DataPage + 3 banner)
    - src/components/shell/Sidebar.tsx (added Data NavButton between System Audit and entity section + HardDriveDownload import)
    - src/components/shell/MainLayout.tsx (mounts <AdapterFallbackBanner /> above main content area)
    - src/components/ViewRouter.tsx (imports DataPage, routes view='data')
    - src/types.ts (View union widened with 'data')
    - vite.config.ts (server.proxy['/api'] -> http://localhost:4000; preserves define + alias + hmr)
    - README.md (complete rewrite: dual-shape deployment docs, Windows VS Build Tools prereq, env vars table, data-durability table, AI features section, scripts reference)
  untouched:
    - src/storage/adapter.ts (FINAL from Plan 03-1)
    - src/storage/local.ts (FINAL from Plan 03-2)
    - src/storage/server.ts (FINAL from Plan 03-3)
    - src/storage/index.ts (FINAL from Plan 03-2)
decisions:
  - "FileReader instead of File.text() in handleFileSelect — jsdom does not implement File.text(); ImportTB.tsx already uses FileReader for the same reason (Rule 3 auto-fix)."
  - "Used today() from src/lib/period.ts everywhere instead of parameterless `new Date()` — structural lint forbids `new Date()` outside period.ts (Rule 1 auto-fix; one helper signature + the export ISO timestamp)."
  - "Banner reads getAdapterKind() + getFellBackToLocal() once at mount and re-checks once after first paint via useEffect — covers the race where adapter init resolves later than the initial render."
  - "Banner dismissal is React state, not localStorage — the next page reload re-checks fallback; dismissing should not persist across reloads because the probe re-evaluates whether the server is actually up."
  - "Vite proxy uses changeOrigin: true but ws is NOT enabled — Vite HMR uses its own websocket on the same dev server; proxying /api with ws=true would intercept it incorrectly."
metrics:
  duration: ~8 min
  completed: 2026-05-11
  tasks_total: 3
  tasks_completed: 2  # Task 3 is the human-verify checkpoint
  files_created: 2
  files_modified: 7
  tests_green_total_spa: 249
  tests_green_delta_spa: 11
  tests_todo_total_spa: 11
  tests_green_total_server: 18
  tests_red: 0
  commits: 2  # human-verify checkpoint not committed
---

# Phase 3 Plan 4: Data Page UI + Adapter-Fallback Banner — Summary

Closes the user-facing surface of Phase 3 — the **Data page** (Export, Import with REPLACE confirmation, status panel showing adapter kind / schema version / last-export timestamp) plus the **adapter-fallback banner** (W5; "Server unreachable — running in local mode") — wires both into the existing app shell, and documents the dual-deployment story (no-server IndexedDB + Express + SQLite) in the README. After this plan, Phase 3 success criteria #2 (prominent Export action) and #3 (Import on fresh instance) are visible end-to-end.

## Commits

| Task | Commit    | Description |
| ---- | --------- | ----------- |
| 1    | `64738e6` | feat(03-4): DataPage + AdapterFallbackBanner + Sidebar Data nav + ViewRouter wiring |
| 2    | `d6fff18` | feat(03-4): Vite /api proxy + README dual-shape documentation |
| 3    | pending   | Human-verify checkpoint — no commit; awaits user `approved` reply |

## What changed

### `src/components/DataPage.tsx` (NEW — ~310 lines)

Sits at `view='data'`. Sections:

- **Header** — "Data Management" with HardDriveDownload icon and a short blurb.
- **Status panel** — three labelled values:
  - `data-testid="adapter-kind"` reads "Local (IndexedDB)" or "Server (SQLite)" via `getAdapterKind()`.
  - `data-testid="schema-version"` reads `v${CURRENT_VERSION}` from `src/lib/migrations/index.ts`.
  - `data-testid="last-export"` calls `LocalAdapter.getLastExportAt()` when the adapter exposes it (Phase-3 ServerAdapter does not), shows `'Never'` otherwise.
- **Export** — `data-testid="export-button"` calls `adapter.exportAll()`, JSON-serialises, writes a `Blob` and triggers an anchor download with filename `aussieledger-YYYY-MM-DD-HHmm.json` (LOCAL time via `today()`). On `LocalAdapter`, stamps `setLastExportAt(today().toISOString())`.
- **Import** — `data-testid="import-button"` opens a hidden `<input type="file">`. On selection:
  1. Read text via `FileReader.readAsText` (jsdom-compatible; `File.text()` is not implemented in jsdom).
  2. `JSON.parse` → `migrate(raw)` from `src/lib/migrations`.
  3. If `_v > CURRENT_VERSION`: surface the error message in a `data-testid="migration-error"` inline alert ("Cannot import: file is from a newer version (…)").
  4. Otherwise: open a confirmation dialog (`data-testid="confirm-dialog"`). If the adapter has existing data (any of entities/accounts/entries/auditLogs non-empty), require the literal word `REPLACE` (uppercase, case-sensitive) typed into the input (`data-testid="confirm-text"`) before the Confirm button (`data-testid="confirm-import"`) enables. On empty instance the button is enabled immediately.
  5. On Confirm: `adapter.importAll(migrated)` → show `data-testid="import-success"` ("Import succeeded. Refresh the page to see imported data.").

The component reads adapter state once at mount via the `getAdapter()` Promise; it does NOT subscribe to updates because Phase 3's writes are whole-collection replace via the hooks, not from the Data page itself.

### `src/components/AdapterFallbackBanner.tsx` (NEW — ~52 lines)

W5 implementation closing the "fallback is silent + audible" gap from CONTEXT line 52. Reads `getAdapterKind()` + `getFellBackToLocal()` at mount AND in a follow-up `useEffect` to cover the case where adapter init resolves later than the initial render. Renders ONLY when **both** conditions are true:
- `getAdapterKind() === 'local'`
- `getFellBackToLocal() === true`

So:
- `npm run dev` (no server present, probe attempted, exhausted): banner renders.
- `npm run dev:full` (server up, probe succeeds): banner silent.
- `localStorage.storageMode='local'` override (no probe attempted): banner silent.

Dismissible via a small `X` button (`data-testid="adapter-fallback-dismiss"`). Dismissal is React state — the next page reload re-evaluates fallback because the next probe attempt resets the flag, which is the correct semantic.

### `src/components/shell/MainLayout.tsx` (modified)

`<AdapterFallbackBanner />` is mounted **inside** the `<main>` content area but **above** the routed view body (immediately above `{children}`). This means the banner is visible from every view (Master Dashboard, Data, Journals, etc.) — not just the Data page — and respects the existing header/sidebar layout.

### `src/components/shell/Sidebar.tsx` (modified)

Added `HardDriveDownload` to the lucide imports and a new `NavButton` between "System Audit" and the active-entity section:

```tsx
<NavButton
  active={view === 'data'}
  onClick={() => setView('data')}
  icon={<HardDriveDownload size={18} />}
  label="Data"
/>
```

Placement matches CONTEXT.md "between Audit and the disclaimer". The button is always visible (no active-entity dependency) because Export/Import is a global operation.

### `src/components/ViewRouter.tsx` (modified)

Added `import { DataPage } from './DataPage';` and a routing case:

```tsx
{view === 'data' && <DataPage />}
```

### `src/types.ts` (modified)

`View` union widened with `| 'data'`.

### `vite.config.ts` (modified)

Adds `server.proxy['/api']`:

```typescript
proxy: {
  '/api': {
    target: apiTarget,   // env.API_PROXY_TARGET ?? 'http://localhost:4000'
    changeOrigin: true,
    // ws: NOT enabled — Vite HMR uses its own websocket; do not intercept.
  },
}
```

Existing `define` block (`process.env.GEMINI_API_KEY`), alias `'@'`, and HMR guard preserved verbatim. The `API_PROXY_TARGET` env override means production proxies (e.g. behind a reverse proxy on a non-loopback port) can point elsewhere without source edits.

### `README.md` (rewritten)

Full rewrite replacing the AI-Studio stub with proper documentation:

1. **Quick start** — `npm install` + `npm run dev` for the simplest setup.
2. **Deployment shapes** — both options documented:
   - #1 Local single-user (IndexedDB; no server) — `npm run dev` / `build` / `preview`.
   - #2 Self-hosted firm (Express + SQLite) — `npm run dev:full` / `build:server` / `start:server`.
3. **Windows prerequisites** — Python 3 + Visual Studio Build Tools 2022 (Desktop C++ workload) + Node 20/22 LTS; `npm rebuild better-sqlite3 --build-from-source` after toolchain install; documents the `optionalDependencies` fallback (npm install survives Windows without VS Build Tools).
4. **Server environment variables** — `PORT`, `HOST`, `DB_PATH`, `GEMINI_API_KEY` with defaults and purpose. `data/` gitignored note.
5. **Auth / shared-firm** — no built-in auth in Phase 3; bind 127.0.0.1 + reverse proxy (Caddy/nginx) + basic auth/VPN for VPS use.
6. **Data durability table** — what survives close-and-reopen, cookies-clear, Clear-Site-Data, server restart, `rm -rf data/`.
7. **AI features (optional)** — local mode (`.env.local`) vs server mode (server env var); deterministic fuzzy match works without a key.
8. **Development scripts table** — every npm script and the integration smoke script.

### `scripts/test-dev-full.mjs` (Plan 03-1 scaffold — verified)

Boots `npm run dev:full`, polls `http://localhost:4000/api/health` for up to 30s, asserts `{ ok: true, version: 2, aiEnabled: boolean }`, kills the process tree, exits 0. **Verified passing on this Windows machine** during Task 2 verification — `/api/health` returned `{"ok":true,"version":2,"aiEnabled":false}` within ~3s.

## Test results

| Suite | Files | Passing | Todo | Failed |
| ----- | -----:| -------:| ----:| ------:|
| SPA `npm run test` | 34 | **249** | 11 | 0 |
| Server `npm run test:server` | 6 | **18** | 0 | 0 |
| `npm run lint` | — | EXIT 0 | — | — |
| `npm run build` | — | EXIT 0 (270 kB gzip) | — | — |
| `npm run build:server` | — | EXIT 0 | — | — |
| `node scripts/test-dev-full.mjs` | — | EXIT 0 (/api/health responded) | — | — |

**Plan 03-4 specific new GREEN tests (11):**
- `DataPage (FND-02 / FND-03 UI) > renders Export button`
- `DataPage (FND-02 / FND-03 UI) > renders Import file picker`
- `DataPage (FND-02 / FND-03 UI) > shows current adapter kind ("Local (IndexedDB)")`
- `DataPage (FND-02 / FND-03 UI) > shows current schema version`
- `DataPage (FND-02 / FND-03 UI) > shows "Never" empty-state for last-export`
- `DataPage (FND-02 / FND-03 UI) > import on empty: single confirmation, then importAll fires`
- `DataPage (FND-02 / FND-03 UI) > REPLACE confirmation required when existing data`
- `DataPage (FND-02 / FND-03 UI) > shows MigrationError when import _v > CURRENT_VERSION`
- `AdapterFallbackBanner (W5) > renders banner when probe attempted and fell back to local`
- `AdapterFallbackBanner (W5) > banner is dismissible`
- `AdapterFallbackBanner (W5) > does NOT render when storageMode override forced local (no probe attempted)`

Baseline before Plan 03-4: 238 GREEN + 22 todo. After Plan 03-4: 249 GREEN + 11 todo (delta: +11 GREEN, −11 todo). The remaining 11 todos are in older scaffolds (legacy-migration / round-trip already implemented elsewhere; left for housekeeping later).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `File.text()` is not implemented in jsdom**
- **Found during:** Task 1 verification (first test run after wiring DataPage handleFileSelect).
- **Issue:** The plan-supplied code used `await file.text()` to read the imported JSON. Under jsdom (Vitest SPA env) this throws `file.text is not a function`. ImportTB.tsx already uses `FileReader` for exactly this reason (we grep-confirmed at `src/components/ImportTB.tsx:47`).
- **Fix:** Replaced `await file.text()` with a `FileReader.readAsText` Promise wrapper (`new Promise<string>((resolve, reject) => …)`). Same error-path UX (sets `migrationError`), same downstream `JSON.parse` + `migrate()` flow.
- **Files modified:** `src/components/DataPage.tsx` (handleFileSelect).
- **Commit:** `64738e6` (Task 1).

**2. [Rule 1 - Bug] Parameterless `new Date()` outside `src/lib/period.ts`**
- **Found during:** Task 1 full-test verification (the structural lint test `'no file outside src/lib/period.ts uses parameterless new Date() …'` fired).
- **Issue:** The plan-supplied DataPage had `function fmtFilename(d: Date = new Date())` and `const iso = new Date().toISOString()`. Both are parameterless `new Date()` and trip the Phase-2 structural lint rule.
- **Fix:** `fmtFilename(d?: Date)` now defaults `d` from `today()` from `src/lib/period.ts`. The `iso` assignment uses `today().toISOString()`. `new Date(iso)` inside `fmtTimestamp` is date-PARSING (allowed by the rule).
- **Files modified:** `src/components/DataPage.tsx`.
- **Commit:** `64738e6` (Task 1).

No other deviations. Plan 03-4 executed as written for Task 2 (vite + README).

### Deferred items

None from Plan 03-4 itself. The remaining 11 SPA todos (down from 22) are legacy/skeleton tests in older scaffolds that are functionally covered by other tests — left for housekeeping in a later phase.

## Auth gates

None — Plan 03-4 is pure UI + config + docs. The integration smoke script does not exercise any external service (only `/api/health` on the local Express server).

## Hand-off

**To Phase verifier (`/gsd:verify-work`):**
- Phase 3 ready for full verification.
- All four phase requirement IDs (FND-01, FND-02, FND-03, DEP-02) delivered.
- FND-02 CSV half is "partially delivered" per CONTEXT.md (CSV per-report exports land in Phase 4/5).
- Manual UAT pending (Task 3 human-verify checkpoint, awaiting user `approved`).

**Manual UAT checklist (Task 3):** 8 checks per 03-VALIDATION.md + W5 banner spec:
1. `npm run dev` (no-server) — banner appears, Data page shows Local (IndexedDB)
2. FND-01a — Real Chrome "Clear cookies and cached images" preserves IDB
3. `npm run dev:full` — banner silent, Data page shows Server (SQLite)
4. FND-01b — SQLite survives server restart
5. W5 — Banner appears after killing api mid-session and reloading SPA
6. FND-03 — Import + REPLACE confirmation flow (both empty + populated paths)
7. AI proxy (optional; requires real GEMINI_API_KEY)
8. Visual sweep — all views render, no console errors, disclaimer footer present

## Requirements addressed

- **FND-02** (JSON export) — DELIVERED. Sidebar Data nav, prominent Export button, downloads `aussieledger-YYYY-MM-DD-HHmm.json` with the complete `PersistedRoot` shape. CSV half partially deferred (per CONTEXT).
- **FND-03** (JSON import round-trip + refuse-newer) — DELIVERED. Import file picker, `migrate()` before `importAll()`, REPLACE confirmation literal on populated instance, MigrationError-style alert when `_v > CURRENT_VERSION`.
- **DEP-02** (Express + SQLite + dual-deployment) — UI-facing side DELIVERED. Vite proxy wired, README documents both shapes, integration smoke passes. Server work itself was completed in Plan 03-3.
- **FND-01** (durable persistence) — UI surface DELIVERED. Last-export timestamp displayed; user is now empowered to back up data via Export. The actual durability is delivered by `LocalAdapter`/`ServerAdapter` (Plans 03-2 / 03-3); the cache-clear manual UAT closes this.

## Self-Check: PASSED

- `src/components/DataPage.tsx` — FOUND, contains `export const DataPage`, contains `aussieledger-`, contains `'REPLACE'`, contains `migrate(raw)`, contains `adapter.importAll`, contains `getAdapterKind`, contains `CURRENT_VERSION`
- `src/components/AdapterFallbackBanner.tsx` — FOUND, contains `Server unreachable`, contains `getFellBackToLocal()`, contains `getAdapterKind()`
- `src/components/__tests__/DataPage.test.tsx` — FOUND, 11 GREEN tests
- `src/components/shell/Sidebar.tsx` — FOUND, contains `setView('data')`, `label="Data"`, `HardDriveDownload`
- `src/components/shell/MainLayout.tsx` — FOUND, contains `<AdapterFallbackBanner />`, `import { AdapterFallbackBanner }`
- `src/components/ViewRouter.tsx` — FOUND, contains `import { DataPage } from './DataPage'`, contains `view === 'data'` and `<DataPage`
- `src/types.ts` — FOUND, View union contains `| 'data'`
- `vite.config.ts` — FOUND, contains `proxy:`, `'/api'`, `http://localhost:4000`, still has `'process.env.GEMINI_API_KEY'` and alias `'@'`
- `README.md` — FOUND, contains `npm run dev:full`, `npm run start:server`, `Visual Studio Build Tools 2022`, `GEMINI_API_KEY`, `DB_PATH`, `HOST`, `PORT`, `IndexedDB`, `SQLite`, references Data page Export/REPLACE
- `scripts/test-dev-full.mjs` — FOUND (Plan 03-1 scaffold), contains `/api/health`; VERIFIED passing with `node scripts/test-dev-full.mjs` exit 0
- Commit `64738e6` (Task 1) — FOUND in `git log`
- Commit `d6fff18` (Task 2) — FOUND in `git log`
- `npm run lint` — EXIT 0 VERIFIED
- `npm run test` — 249 GREEN, 11 todo, 0 fail VERIFIED
- `npm run test:server` — 18 GREEN, 0 fail VERIFIED
- `npm run build` — EXIT 0 VERIFIED
- `npm run build:server` — EXIT 0 VERIFIED
- `node scripts/test-dev-full.mjs` — EXIT 0 VERIFIED

## Pending — Task 3 (human-verify checkpoint)

This summary is committed BEFORE the human-verify checkpoint runs. Once the user approves the manual UAT (or reports issues that get fixed), this section will be updated with the UAT results and Phase 3 will be marked complete in `ROADMAP.md` and `STATE.md`.
