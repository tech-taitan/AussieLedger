# Phase 3: Durable Persistence — Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 replaces `localStorage` with a `StorageAdapter` interface that has two implementations — `LocalAdapter` (IndexedDB, no-server) and `ServerAdapter` (HTTP → Express → better-sqlite3) — selected at runtime by a `/api/health` probe. Hooks and components only see the adapter. JSON export/import works end-to-end with the existing schema migration runner. Existing `localStorage` data is auto-migrated on first run. The Gemini AI call moves to a server-side proxy, closing the "API key in client bundle" item from Phase 2.

**In scope:**
- `StorageAdapter` interface in `src/storage/adapter.ts` with a **per-collection coarse API**: `getEntities/saveEntities`, `getAccounts/saveAccounts`, `getEntries/saveEntries`, `getAuditLogs/appendAuditLog`, `exportAll/importAll`, `ready()`
- `LocalAdapter` (IndexedDB via `idb`) in `src/storage/local.ts` — one DB, one object store per collection, mirrors the SQL table shape
- `ServerAdapter` in `src/storage/server.ts` — `fetch()`-based, one route per collection, JSON body
- Runtime adapter selection in `src/storage/index.ts`: probe `/api/health` (~500ms × 6 retries = ~3s), success → `ServerAdapter`, exhaustion → `LocalAdapter` with a small dev banner ("Server unreachable — running in local mode")
- One-time localStorage → IndexedDB migration on first boot: read the four legacy keys (`ledger_entities_list`, `ledger_all_entries`, `ledger_audit_logs`, `ledger_chart_of_accounts`), pipe through `migrate()` from `src/lib/migrations/`, write to IndexedDB, **clear localStorage keys after success**
- Refactor Phase-2 hooks (`useEntities`, `useJournals`, `useAccounts`, `useAuditLog`) from direct `localStorage` calls to adapter calls; preserve the "whole-collection save on state change" pattern
- Express server in `server/` directory: REST routes per collection (`GET/PUT /api/entities`, `/api/accounts`, `/api/entries`, `GET /api/audit`, `POST /api/audit`, `GET /api/export`, `POST /api/import`, `GET /api/health`, `POST /api/ai/match-accounts`)
- better-sqlite3 schema with normalised tables: `entities`, `accounts`, `journal_entries`, `journal_lines`, `audit_logs`, `schema_migrations`
- Numbered `.sql` migration runner in `server/db/migrate.ts`; first migration `001-initial.sql` creates the v2-equivalent schema
- Sidebar nav entry **"Data"** containing: Export button, Import file picker, last-export timestamp, current schema version
- Export produces `{ _v: 2, entities, accounts, allEntries, auditLogs }` as a single JSON file
- Import: replace-with-confirmation flow — if any data exists, require the user to type `REPLACE` in a confirm dialog before proceeding
- Round-trip schema-migration test: serialize a hand-built `_v: 0` blob → run through `migrate()` → import via `importAll()` → assert state matches the v2 expectation
- `npm run dev:full` script using `concurrently` to start Vite (with `/api` proxy to `localhost:4000`) and Express side-by-side
- Move the Gemini call from `src/components/ImportTB.tsx` to `POST /api/ai/match-accounts`; SPA calls `fetch('/api/ai/match-accounts')` when server present
- `IS_AI_ENABLED` logic from Phase 2 widens to: `serverAdapterPresent ? serverReportsAiEnabled : import.meta.env.VITE_GEMINI_API_KEY` — server presence enables AI without bundle-injected key

**Out of scope (later phases):**
- Auth on the server shape (none in Phase 3; bind localhost + document reverse-proxy approach for VPS) — revisit in v2 if real shared-firm usage materialises
- CSV export (FND-02 second half) — per-report CSV lands incrementally in Phase 4/5 alongside trial balance and journal list
- Multi-client workspace data model — Phase 6's tax-agent mode decides whether to add `workspace_id` later; Phase 3 commits to **one install = one workspace**
- Native PDF export (TAX-02) — Phase 5
- IndexedDB → SQLite live data sync — never; the user picks one shape per install, no cross-shape sync
- Server logging/observability beyond stdout — defer

</domain>

<decisions>
## Implementation Decisions

### Workspace shape

- **One install = one workspace.** Every entity in the instance lives in a single IndexedDB DB / single SQLite file. No `workspace_id` column. Tax-agent multi-client (Phase 6) will be solved by either an entity-list view OR by running multiple instances — that's a Phase 6 decision, not a Phase 3 commitment.
- **Schema is normalised, not blob.** SQLite tables: `entities`, `accounts`, `journal_entries`, `journal_lines`, `audit_logs`, plus `schema_migrations` for the runner. IndexedDB mirrors this with one object store per collection. Required for Phase 4's BOOK-12 (search journals by amount/account/date) and trial-balance queries to scale.
- **Per-collection coarse adapter API.** The adapter exposes `getX/saveX` per collection (entities, accounts, entries, accounts, audit), plus `appendAuditLog`, `exportAll`, `importAll`, `ready()`. NOT per-record CRUD. Hook code from Phase 2 changes minimally — `localStorage.setItem(KEY, JSON.stringify(...))` becomes `adapter.saveX(...)`.
- **Naive whole-collection save.** Hooks continue writing the full collection on every state change (`useEffect` on the slice). SQLite adapter translates `saveEntries(map)` into `DELETE FROM journal_lines WHERE entry_id IN (...); DELETE FROM journal_entries WHERE entity_id = ?; INSERT ...` in a transaction. Sub-optimal at 10k+ entries; perfectly fine for v1 audience. Revisit if Phase 4's search shows lag.

### Adapter selection & startup

- **Runtime probe.** On boot, `src/storage/index.ts` does `fetch('/api/health', { signal: AbortSignal.timeout(500) })` with retries (500ms × 6 = ~3s total). Success → `ServerAdapter`. Exhaustion → `LocalAdapter`. Same build artefact serves both deployment shapes.
- **Fallback is silent + audible.** On fallback to `LocalAdapter` *after* the probe was attempted (i.e. user expected a server), display a small non-blocking banner: *"Server unreachable — running in local mode. Refresh once the server is up."* The banner is dismissible. The banner does NOT appear when there's no server expectation at all (e.g. `npm run dev` from a fresh clone with no server config) — heuristic for "server expected" is TBD by planner (likely: env flag or presence of a `server/data/` directory at build time).
- **`AbortSignal.timeout(500)`** for the probe — native, no extra dep.
- **No build-time mode flag.** Same artefact for both shapes. Override is via documented browser DevTools toggle (`localStorage.setItem('storageMode', 'local'|'server')`) if a power user needs to force one — Claude's discretion on whether to implement this hatch or skip it.

### localStorage → IndexedDB migration

- **One-time, automatic, transparent.** On first boot after Phase 3 ships, before adapter selection completes, check if IndexedDB is empty AND any of the four legacy `localStorage` keys exist (`ledger_entities_list`, `ledger_all_entries`, `ledger_audit_logs`, `ledger_chart_of_accounts`).
- **If yes:**
  1. Parse each key (use the existing per-slice JSON.parse + error fallback shape from Phase 2 hooks).
  2. Assemble into a `PersistedRoot`-shaped object with `_v` lifted from whichever value is highest (or `0` if missing).
  3. Run through `migrate()` from `src/lib/migrations/index.ts` — re-uses the existing v0→v1→v2 ladder, no Phase-3-specific migration code needed.
  4. Write each collection to IndexedDB via the adapter's `saveX` methods.
  5. **Only after all writes succeed**, remove the four legacy keys from `localStorage`.
- **Failure case.** If any step throws, leave `localStorage` untouched and surface the existing `MigrationError` component (from Phase 1) so the user can recover. No partial state.
- **No prompt.** This is not a "do you want to migrate?" dialog. It's silent first-run plumbing.

### `npm run dev:full` shape

- **Add `concurrently` as a devDependency.**
- **`package.json` scripts:**
  - `dev`: unchanged (Vite only, IndexedDB mode)
  - `dev:server`: `tsx watch server/index.ts`
  - `dev:full`: `concurrently -k -n vite,api -c blue,magenta "npm:dev" "npm:dev:server"`
  - `build`: existing Vite build
  - `build:server`: `tsc -p server/tsconfig.json` (or `tsx` runtime — Claude's discretion)
  - `start:server`: `node server/dist/index.js` (production)
- **Vite proxy:** Add `server.proxy['/api']: 'http://localhost:4000'` to `vite.config.ts`. Server port is `4000` (configurable via env).
- **Server entry point:** `server/index.ts`. Reads `PORT` (default 4000), `DB_PATH` (default `./data/ledger.db`), `GEMINI_API_KEY` from env. `data/` is gitignored.

### Export / Import

- **Format:** JSON only in Phase 3. CSV (FND-02) is deferred to per-report exports landing in Phase 4/5. Documented as "FND-02 partially delivered" in the verification.
- **Filename:** `aussieledger-{YYYY-MM-DD}-{HHmm}.json` (e.g. `aussieledger-2026-05-11-1430.json`). Local time, no timezone suffix.
- **Export payload:**
  ```json
  {
    "_v": 2,
    "entities": [...],
    "accounts": [...],
    "allEntries": { "ent-1": [...], "ent-2": [...] },
    "auditLogs": [...]
  }
  ```
  Shape matches the in-memory `PersistedRoot`. No metadata wrapper (`exportedAt`, `appVersion`) in Phase 3 — keep it boringly identical to the persisted state so import is trivially "replace state with this".
- **Import semantics: replace, with confirmation.**
  - If IndexedDB / SQLite is empty: import proceeds directly with a single confirmation dialog.
  - If data exists: dialog reads *"This will REPLACE all current data in this instance with the contents of `{filename}`. Type `REPLACE` to confirm."* Free-text confirmation. No merge, no prompt-for-mode UI in v1.
  - On confirm: clear all collections via the adapter, then write imported state via `importAll(json)`.
- **Import migration:** Imported JSON is passed through `migrate()` before write — so an old `_v: 0` or `_v: 1` export can be imported on a current `_v: 2` instance and arrives upgraded.
- **Refuse newer:** If imported `_v` is **higher** than the app's `CURRENT_VERSION`, refuse with the `MigrationError` component — same behaviour as the existing runner.
- **UI location:** Sidebar nav adds a **"Data"** entry (between "Audit" and the disclaimer, or wherever the existing nav structure dictates — Claude's discretion). Page contains:
  - Export button → triggers download of current state as JSON
  - Import button → file picker → confirmation dialog → replace
  - Status line: last export timestamp (stored in adapter as a small metadata blob), current schema version, current adapter type ("Local" or "Server (SQLite)")

### Server scope

- **No auth in Phase 3.** Express binds to `127.0.0.1` by default; binding to `0.0.0.0` is an explicit env var flip (`HOST=0.0.0.0`). README documents: "For shared-firm use on a VPS, run behind a reverse proxy (Caddy/nginx) with basic auth or a VPN." PROJECT.md's open question on auth stays open.
- **AI proxy ships in Phase 3.** New route `POST /api/ai/match-accounts` accepts the existing Gemini request shape and forwards to Google with the server's `GEMINI_API_KEY`. SPA's `ImportTB.tsx` calls this route instead of `new GoogleGenAI()` directly when running in server mode.
- **AI feature detection:**
  - Local mode: `IS_AI_ENABLED = Boolean(import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')` — unchanged from Phase 2.
  - Server mode: `IS_AI_ENABLED = response from /api/health includes { aiEnabled: true }` — server reports whether it has a key configured. SPA bundle no longer needs the key.
- **API surface (REST per collection):**
  - `GET /api/health` → `{ ok: true, version: 2, aiEnabled: boolean }`
  - `GET /api/entities` → `Entity[]`
  - `PUT /api/entities` body `Entity[]` → 200 (whole-collection replace, transactional)
  - `GET /api/accounts` → `Account[]`
  - `PUT /api/accounts` body `Account[]` → 200
  - `GET /api/entries` → `Record<string, JournalEntry[]>` (entity-id keyed map)
  - `PUT /api/entries` body `Record<string, JournalEntry[]>` → 200
  - `GET /api/audit` → `AuditLog[]`
  - `POST /api/audit` body `AuditLog` → 200 (append-only)
  - `GET /api/export` → 200 with full state as JSON download
  - `POST /api/import` body full state JSON → 200 (replace-all, transactional)
  - `POST /api/ai/match-accounts` body Gemini request → Gemini response shape
- **All `PUT` writes are transactional** (better-sqlite3 `db.transaction(...)`). Adapter-side, hooks save the whole collection at once; SQLite delete-then-insert within a single transaction.
- **Server-side schema migrations:** Numbered `.sql` files under `server/db/migrations/`. Tiny runner reads `schema_migrations` table on boot, applies any unapplied files in alphabetical order, records each as applied. Migrations are reviewable as plain SQL. `001-initial.sql` creates all six tables matching `_v: 2` shape; future schema bumps add `002-...`, `003-...`.

### Round-trip migration test (ROADMAP criterion #5)

- A Vitest test in `src/storage/__tests__/round-trip.test.ts` (or `src/lib/migrations/__tests__/round-trip.test.ts`):
  1. Construct a hand-built blob in `_v: 0` shape — minimal but representative (one entity, one account, one journal entry, one audit log).
  2. Call `migrate(blob)` → assert result is `_v: 2` and shape matches current types.
  3. Call `adapter.importAll(blob)` (with a fresh in-memory adapter) → call `adapter.exportAll()` → assert exported equals migrated.
- This test pins the migration ladder against regression. Lives in the SPA test suite (not the server test suite).

### Claude's Discretion

- **IndexedDB wrapper.** Use `idb` (Jake Archibald's, ~1KB) or hand-rolled — Claude's call. `idb` is friendly enough that I'd recommend it but don't prescribe.
- **ID strategy.** Existing IDs are string (`'ent-1'`, etc.) generated client-side. Phase 3 preserves this — SQLite `id TEXT PRIMARY KEY`, no autoincrement. Foreign keys are TEXT-to-TEXT.
- **Account FK from journal_lines.** When `journal_lines` references an account, store the account *code* (existing convention) as TEXT; do not add a hard FK constraint to `accounts.code` (because users can edit account codes — Phase 4). Defer hard FK enforcement until Phase 4 decides the account-code-immutability question.
- **Soft-delete vs hard-delete.** Hard-delete for entities/accounts/entries in Phase 3 (matches Phase 2 hooks). Soft-delete is a Phase 4 audit-trail decision.
- **Server logging.** Plain stdout / stderr. No logger lib. README documents `npm run start:server > server.log 2>&1` for the VPS shape.
- **Dev banner shape.** Toast vs persistent strip vs inline — Claude's call; match existing visual system.
- **Hatch for forcing adapter mode** (`localStorage.setItem('storageMode', ...)`) — implement if cheap, skip if it complicates the boot path.
- **better-sqlite3 native build for Windows dev.** The repo author is on Windows (`win32`); better-sqlite3 needs `node-gyp` + Visual Studio Build Tools. README documents this prerequisite for `dev:full`; the `dev` script (no server) has no native deps.
- **Empty-state copy for the Data page** when no exports have happened yet.
- **Test fixture organisation** for the round-trip test — single shared fixture vs inline.
- **Path of the IndexedDB database name** — `aussieledger` is fine; document the eviction behaviour.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & requirements
- `.planning/PROJECT.md` — vision, constraints, "Out of Scope" (especially "Hosted multi-tenant SaaS" and "Bank reconciliation"); "Open Questions" — auth on self-hosted instance and persistence mechanism are answered for v1 by this phase.
- `.planning/REQUIREMENTS.md` §FND-01, §FND-02, §FND-03, §DEP-02 — Phase 3 requirements; note FND-02's CSV half is partially deferred.
- `.planning/ROADMAP.md` Phase 3 — goal, 5 success criteria, dependency on Phase 2.

### Prior phases (carry forward)
- `.planning/phases/01-safety-net/01-CONTEXT.md` — locked decisions on `_v` root field, migration runner contract, `MigrationError` component, decimal.js wrapper, TFN-not-stored.
- `.planning/phases/02-decompose-and-tax-engine/02-CONTEXT.md` — locked decisions on hooks layout (Phase 3 refactors these to call adapter, not localStorage), `IS_AI_ENABLED` gate (Phase 3 widens it), `AI proxy deferred to Phase 3` (this phase delivers it).
- `.planning/phases/01-safety-net/01-1-SUMMARY.md` — what Phase 1 delivered (`src/lib/migrations/index.ts` contract, `MigrationError` component).
- `.planning/phases/02-decompose-and-tax-engine/02-4-SUMMARY.md` — App.tsx demolition + migration v1→v2 register; hooks are now the persistence owners.

### Research outputs (this milestone)
- `.planning/research/ARCHITECTURE.md` — § "Recommended Storage Strategy" (Option D: Express + better-sqlite3 + IndexedDB fallback is **the** adopted recommendation); § "Recommended Project Structure" — `src/storage/`, `server/`, `data/` layout; § "Component Boundaries" — StorageAdapter responsibilities.
- `.planning/research/PITFALLS.md` — § persistence pitfalls (cache clear, no schema migration, key in bundle); all three are Phase 3 mitigations.
- `.planning/research/STACK.md` — better-sqlite3 selection rationale; `idb` mention if applicable.
- `.planning/research/SUMMARY.md` — overall phase-ordering rationale; "persistence" placement.

### Codebase map (current state)
- `.planning/codebase/ARCHITECTURE.md` — § "Persistence Pipeline" describes current `useEffect` save pattern; Phase 3 keeps the shape, swaps the I/O.
- `.planning/codebase/STRUCTURE.md` — file/dir conventions; new `src/storage/` and `server/` directories follow these.
- `.planning/codebase/CONCERNS.md` — § "localStorage as persistence" and § "Gemini key in client bundle" — Phase 3 closes both.
- `.planning/codebase/STACK.md` — confirms Express + better-sqlite3 are already declared deps (`express` installed but unused; better-sqlite3 not yet — Phase 3 adds it).

### External (during implementation; not blocking for plan)
- `better-sqlite3` docs — sync API, `db.transaction(fn)`, WAL pragma for the small-firm shape.
- `idb` docs (if chosen) — `openDB()`, version upgrade callback.
- `concurrently` docs — `-k` (kill others on exit), `-n` (names), `-c` (colours).
- Vite `server.proxy` config — `/api` → `localhost:4000`.
- MDN IndexedDB — quota/eviction caveats; document in README that browser-clearing-site-data deletes IndexedDB too (the "durability" guarantee assumes the user keeps their browser data).
- ATO doesn't apply here — this phase is pure infrastructure.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- `src/lib/migrations/index.ts` — `migrate(raw): PersistedRoot` already handles v0→v1→v2. Phase 3 reuses this in three places: adapter `read()` path, localStorage→IndexedDB upgrade, and `importAll()`.
- `src/lib/migrations/v1-to-v2.ts` — pattern for adding a migration step. Phase 3 may add `2 → 3` only if the IndexedDB shape diverges from the persisted root in any way (likely not needed).
- `src/components/MigrationError.tsx` (Phase 1) — error UI for migration failures. Phase 3 reuses on import-of-newer-version and on localStorage-upgrade failure.
- Phase 2 hooks: `useEntities`, `useJournals`, `useAccounts`, `useAuditLog` — Phase 3 swaps the I/O sites only. Hook *contract* (what consumers see) is unchanged. The `useEffect`-on-load and `useEffect`-on-change pattern is preserved.
- `src/lib/money.ts` — `serialize`/`deserialize` already exist; Decimal values cross the wire as strings. Adapter layer needs to call these on read/write boundaries.
- `src/lib/ai.ts` (Phase 2) — `IS_AI_ENABLED` flag. Phase 3 widens its sources.
- `vite.config.ts` — already has a `define` block for env vars; Phase 3 adds the `server.proxy` block.

### Established patterns
- One JSON blob per `localStorage` key today: `ledger_entities_list`, `ledger_all_entries` (entity-id → entries map), `ledger_audit_logs`, `ledger_chart_of_accounts`. Adapter API mirrors this granularity to keep the hook refactor minimal.
- Hooks own a single state slice + persistence side-effect. Phase 3 hooks stay this shape; only the side-effect changes from `localStorage.setItem` to `await adapter.saveX()` (note: async).
- Async migration on the existing `useEffect` load is the new shape — current code is synchronous (`localStorage.getItem`). Hooks gain a `ready` boolean to defer renders until first load completes.
- The `App.tsx` migration error path (Phase 1) wraps the initial load in a try/catch and renders `<MigrationError />` if it throws — preserved.
- Test setup at `src/test/setup.ts` already polyfills `ResizeObserver`/`matchMedia`. Phase 3 adds a `fake-indexeddb` shim for IndexedDB tests.

### Integration points
- **Adapter selection:** New module `src/storage/index.ts` is the single entry point. Called once from `src/main.tsx` (or App's top-level `useEffect`), awaited before the rest of the app boots.
- **Hooks:** Each Phase-2 hook currently does:
  ```ts
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try { setEntities(JSON.parse(raw)); } catch {}
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(entities)); }, [entities]);
  ```
  Becomes:
  ```ts
  useEffect(() => { adapter.getEntities().then(setEntities).then(() => setReady(true)); }, []);
  useEffect(() => { if (ready) adapter.saveEntities(entities); }, [entities, ready]);
  ```
  `ready` guard prevents the save-effect from firing before the initial load lands. This pattern is identical in all four hooks.
- **`src/components/ImportTB.tsx`** — current AI call site (`new GoogleGenAI(...)` at line ~79 in Phase 2's post-refactor file). Becomes `fetch('/api/ai/match-accounts', { method: 'POST', body: JSON.stringify(request) })` in server mode; unchanged in local mode.
- **App.tsx top-level boot:** Currently shows the SPA immediately. Phase 3 introduces a brief startup gate while the probe + adapter init runs. Could be a minimal "Starting…" splash or just let the existing layout render with empty data and let hooks fill it (current behaviour). Claude's discretion.
- **`vite.config.ts`** — add `server.proxy = { '/api': 'http://localhost:4000' }`.
- **Sidebar (`src/components/shell/Sidebar.tsx` from Phase 2)** — add a "Data" `NavButton` with a download/upload-ish icon (lucide has `DatabaseZap`, `HardDriveDownload`, `FileJson` — pick one).
- **Test infrastructure:** Add `fake-indexeddb` (devDep) for adapter unit tests. For server tests, use `better-sqlite3`'s in-memory mode (`new Database(':memory:')`).

### Things that don't change
- Visual design system (Tailwind v4, CSS variables) — preserved.
- Domain types in `src/types.ts` — Phase 3 does not change the data model. `_v` stays at 2; if SQLite needs a field IndexedDB doesn't (or vice versa), use a JSON-stringified column rather than schema divergence.
- Decimal.js wrapper, ABN validator, disclaimer, PdfGate — unchanged.
- Hook contracts (what consumers call) — unchanged.
- Tax engine (`src/lib/tax/`) — does not touch persistence. Unchanged.
- Phase 2's hard rules: no React in `src/lib/tax/`, no `new Date()` outside `src/lib/period.ts`. Adapter / server code must comply (use `today()` for any timestamps).

</code_context>

<specifics>
## Specific Ideas

- **Express server port:** `4000` (configurable via `PORT` env var). Vite proxy `/api` → `http://localhost:4000`.
- **SQLite file path:** `./data/ledger.db` (configurable via `DB_PATH` env var). `data/` is gitignored.
- **IndexedDB database name:** `aussieledger` (no version suffix; bump the IDB version field when the object stores change).
- **Probe timing:** 500ms timeout per attempt, 6 attempts, ~3s budget total before falling back.
- **Export filename:** `aussieledger-{YYYY-MM-DD}-{HHmm}.json`, e.g. `aussieledger-2026-05-11-1430.json`. Local time.
- **Import confirmation phrase:** the literal string `REPLACE` (uppercase). Case-sensitive. No partial-match.
- **Server-side env vars:** `PORT`, `DB_PATH`, `GEMINI_API_KEY`, `HOST` (default `127.0.0.1`).
- **`/api/health` response shape:** `{ ok: true, version: 2, aiEnabled: boolean }`. SPA reads `aiEnabled` to widen the `IS_AI_ENABLED` flag.
- **Server logs the boot line:** `AussieLedger server listening on http://{HOST}:{PORT}, DB at {DB_PATH}, AI {aiEnabled}` — for README troubleshooting.
- **Migration test fixture:** an `_v: 0` shape (no `_v` field on any record, no `partnershipTaxLabel` on accounts, original 3-code GST set) — the most-stale shape any real user could have. Going through the full v0→v1→v2 ladder is the regression guard.

</specifics>

<deferred>
## Deferred Ideas

- **CSV export (FND-02 second half)** — per-report CSV exports land in Phase 4/5 next to each report screen (trial balance, journal list, audit log).
- **Auth on the server shape** — PROJECT.md's open question stays open. Document the "bind localhost + reverse proxy" workaround. Revisit in v2 if a real shared-firm user materialises.
- **Workspace_id / multi-client data model** — Phase 6 decides. If Phase 6 picks "switcher UI", a 2→3 migration adds `workspace_id` and back-fills all existing records to `default`.
- **Live IndexedDB ↔ SQLite sync** — never. Users pick one shape per install.
- **Server-side request logging / metrics** — defer until a real ops concern arises.
- **Hard FK from `journal_lines.account_code` → `accounts.code`** — wait for Phase 4's decision on whether account codes are immutable.
- **Soft-delete for entities/accounts/journals** — Phase 4 audit-trail work decides.
- **Native PDF export** — Phase 5 (TAX-02).
- **Force-mode hatch** (`localStorage.setItem('storageMode', ...)`) — implement only if cheap; otherwise skip.
- **Server-side schema downgrade** — explicitly refused, same as the SPA's `migrate()` runner.
- **Per-record adapter API** — defer until a real query performance issue forces it.

</deferred>

---

*Phase: 03-durable-persistence*
*Context gathered: 2026-05-11*
