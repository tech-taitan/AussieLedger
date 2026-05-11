---
phase: 03-durable-persistence
plan: 2
subsystem: wave-2-local-adapter
tags: [local-adapter, idb, legacy-migration, adapter-selection, hook-refactor]
dependency_graph:
  requires:
    - storage-adapter-interface-from-03-1
    - shared-zod-schemas-from-03-1
    - fake-indexeddb-test-setup-from-03-1
    - migrate-function-from-phase-1
  provides:
    - local-adapter-idb-implementation
    - legacy-localstorage-migration
    - adapter-selection-probe
    - server-adapter-stub
    - async-hook-pattern
    - initAdapter-boot-gate
  affects:
    - src/hooks/useEntities.ts
    - src/hooks/useJournals.ts
    - src/hooks/useAccounts.ts
    - src/hooks/useAuditLog.ts
    - src/hooks/__tests__/*.test.ts
    - src/main.tsx
    - src/App.tsx
    - src/test/setup.ts
tech_stack:
  added:
    - idb@^8.0.0 (already installed Plan 03-1; first runtime use here)
  patterns:
    - per-collection singleton-keyed IDB object stores ('__singleton__')
    - whole-collection writes on every state change (mirrors Phase-2 hook shape)
    - async hook I/O with `ready` gate (load useEffect sets it true; save useEffect gates on it)
    - cancelled-guard against unmount-before-load in async useEffect
    - multi-tab-safe legacy migration via navigator.locks.request() when available
    - test-setup pre-init with storageMode='local' override (avoids 3s probe per test)
key_files:
  created:
    - src/storage/local.ts (158 lines)
    - src/storage/legacy-migration.ts (72 lines)
    - src/storage/index.ts (124 lines)
  modified:
    - src/storage/server.ts (initial stub; Plan 03-3 then replaced with full HTTP impl)
    - src/storage/__tests__/local.test.ts (10 .todo → 8 GREEN tests)
    - src/storage/__tests__/legacy-migration.test.ts (7 .todo → 5 GREEN tests)
    - src/storage/__tests__/export.test.ts (4 .todo → 2 GREEN tests)
    - src/storage/__tests__/import.test.ts (4 .todo → 2 GREEN tests)
    - src/storage/__tests__/index.test.ts (6 .todo → 5 GREEN tests)
    - src/lib/migrations/__tests__/round-trip.test.ts (3 .todo → 1 GREEN test)
    - src/lib/migrations/__tests__/refuse-newer.test.ts (1 GREEN + 1 .todo → 2 GREEN tests)
    - src/hooks/useEntities.ts (localStorage → adapter)
    - src/hooks/useJournals.ts (localStorage → adapter)
    - src/hooks/useAccounts.ts (localStorage → adapter)
    - src/hooks/useAuditLog.ts (localStorage → adapter)
    - src/hooks/__tests__/useEntities.test.ts (localStorage asserts → adapter asserts)
    - src/hooks/__tests__/useJournals.test.ts (localStorage asserts → adapter asserts)
    - src/hooks/__tests__/useAccounts.test.ts (localStorage asserts → adapter asserts)
    - src/hooks/__tests__/useAuditLog.test.ts (localStorage asserts → adapter asserts)
    - src/main.tsx (await initAdapter() before render; MigrationError fallback on init throw)
    - src/App.tsx (160 → 86 lines; inline migration useEffect removed)
    - src/test/setup.ts (IDB-* globals wiring; pre-init adapter in beforeEach)
  untouched:
    - src/storage/adapter.ts (FINAL from Plan 03-1 — NOT modified, NOT widened)
decisions:
  - "Hook tests rewritten to assert against `adapter.getX()` instead of `localStorage.getItem(...)`. The Phase-2 hook tests had leaky-abstraction asserts that checked storage backend internals; preserving the public-contract assertions verbatim while swapping the persistence-side asserts is the minimal change that respects the I/O target swap."
  - "Test setup forces `storageMode='local'` before `initAdapter()` in the global beforeEach. Without this, every test would burn ~3s waiting for 6 retries × 500ms probe timeout against a non-existent /api/health. The probe-selection tests in src/storage/__tests__/index.test.ts call `_resetAdapter()` + `localStorage.clear()` in their own beforeEach so they get the real probe path."
  - "IDB-* constructor globals (IDBRequest, IDBOpenDBRequest, IDBTransaction, etc.) explicitly assigned in setup.ts. The `idb` wrapper does `value instanceof IDBRequest` runtime checks; under jsdom those classes are not defined globally, so fake-indexeddb's class exports must be hoisted manually."
  - "ServerAdapter stub Plan 03-3 then replaced. My Task 1 commit (194d0b5) shipped a 12-method throwing stub. Plan 03-3's commit (bab3377) replaced the stub with the real fetch-backed HTTP impl. Both signatures match StorageAdapter (FINAL from Plan 03-1) — the index.ts import works for either body."
metrics:
  duration: ~6 min
  completed: 2026-05-11
  tasks_total: 3
  tasks_completed: 3
  files_created: 3
  files_modified: 19
  tests_green_total_spa: 238
  tests_green_delta_spa: 37
  tests_todo_total_spa: 22
  tests_red: 0
  commits: 3
---

# Phase 3 Plan 2: LocalAdapter + Hook Refactor — Summary

Implemented `LocalAdapter` (IndexedDB via `idb`), the one-time `localStorage → IndexedDB` legacy migration, the `initAdapter()` probe + selection module, and refactored the four Phase-2 hooks from synchronous `localStorage` I/O to async `StorageAdapter` I/O while preserving every hook's public contract. After this plan, `npm run dev` boots the SPA with IndexedDB as the persistence backend; FND-01 (data survives reopen), FND-02 (JSON export shape), FND-03 (round-trip import) and ROADMAP success criterion #5 (v0 ladder round-trip) are unit-test-green via `fake-indexeddb`.

## Commits

| Task | Commit    | Description |
| ---- | --------- | ----------- |
| 1    | `194d0b5` | feat(03-2): LocalAdapter + legacy-migration + server stub; IDB tests GREEN |
| 2    | `ac1c08f` | feat(03-2): initAdapter() probe + selection + fallback-tracking |
| 3    | `da09ae9` | refactor(03-2): 4 hooks → async adapter I/O; main.tsx awaits initAdapter; App.tsx loses migration useEffect |

(Plan 03-3 commit `bab3377` landed between Task 2 and Task 3 — its real `ServerAdapter` HTTP body replaced my Task-1 throwing stub. The class signature still matches the FINAL interface from Plan 03-1.)

## What changed

### `src/storage/local.ts` (NEW — 158 lines)

`LocalAdapter` implements **all 12 methods** of `StorageAdapter` (FINAL from Plan 03-1) directly:
- `ready()`, `getEntities/saveEntities`, `getAccounts/saveAccounts`, `getEntries/saveEntries`, `getAuditLogs/saveAuditLogs`, `appendAuditLog`, `exportAll/importAll`.
- Plus two bonus methods for Plan 03-4's Data page: `getLastExportAt() / setLastExportAt()`.

**Storage shape:**
- One IDB database `'aussieledger'` at version 1.
- One object store per collection: `'entities'`, `'accounts'`, `'entries'`, `'auditLogs'`, `'meta'`.
- Each store keyed by the literal `'__singleton__'`. The whole collection lives under that one key — mirrors Phase-2's whole-collection-write pattern.
- `importAll()` opens a single readwrite transaction across all four collection stores and `put()`s each in turn. Atomic on success; rolls back on any failure.
- `appendAuditLog()` uses a transaction for read-prepend-write to avoid lost-update under concurrent calls.

**Multi-tab safety:** `init()` wraps the legacy migration in `navigator.locks.request('aussieledger-legacy-migration', ...)` when the Web Locks API is available; falls back to a direct call when not. Two tabs opening the SPA simultaneously won't both try to migrate.

### `src/storage/legacy-migration.ts` (NEW — 72 lines)

`migrateLegacyLocalStorage(adapter)`:
1. Reads the 4 legacy keys (`ledger_entities_list`, `ledger_all_entries`, `ledger_chart_of_accounts`, `ledger_audit_logs`) + `ledger_schema_version` stamp.
2. Returns early if no keys present (no-op).
3. Returns early if IDB already populated (defensively clears legacy keys, no migration).
4. Parses each key. On parse failure: **re-throws** so main.tsx renders `<MigrationError />`. localStorage is **left untouched** on failure.
5. Pipes through `migrate()` from `src/lib/migrations` (re-uses the existing v0→v1→v2 ladder).
6. Calls `adapter.importAll(migrated)`.
7. **Only after writes succeed**, removes the four legacy keys from localStorage.

### `src/storage/index.ts` (NEW — 124 lines)

The single SPA entry point for storage. Exports:
- `initAdapter()` — idempotent; first call probes `/api/health` (AbortSignal.timeout(500ms) × 6 retries ≈ 3s), success → `ServerAdapter`, exhaustion → `LocalAdapter` with `fellBackToLocal = true`.
- `getAdapter()` — returns the memoised promise (throws if `initAdapter()` was never called).
- `getAdapterKind()` — `'local' | 'server' | null`.
- `getCachedHealth()` — last successful `HealthResponse | null` (powers Plan 03-3's IS_AI_ENABLED widening).
- `getFellBackToLocal()` — boolean for Plan 03-4's "Server unreachable" banner.
- `_resetAdapter()` — test-only.

**`localStorage.storageMode` hatch:** values `'local'` and `'server'` bypass the probe entirely. The override path does **not** set `fellBackToLocal` (banner does not render on an intentional override).

### `src/storage/server.ts` (modified)

My Task 1 commit shipped a 12-method throwing stub so `src/storage/index.ts` could import `ServerAdapter`. Plan 03-3's commit `bab3377` then replaced the stub with the full HTTP implementation (fetch → Express → better-sqlite3 → decimal-as-string deserialise boundary). Both shapes satisfy the FINAL `StorageAdapter` interface from Plan 03-1.

### Hook refactor — `useEntities/useJournals/useAccounts/useAuditLog`

Each hook:
- Load useEffect: `getAdapter().then(a => a.getX())` → if non-empty, `setX(loaded)` → set `ready` true. Cancelled-guard against unmount-before-load.
- Save useEffect: gated on `!ready` (prevents the empty default from overwriting persisted data on cold start). `getAdapter().then(a => a.saveX(state))`. Errors `console.error`'d, not thrown.
- Public hook contract **unchanged** — same return shape, same method names. App.tsx and downstream consumers see no API change.

**useAuditLog:** Calls `a.saveAuditLogs(auditLogs)` directly — ONE canonical save body. No cast, no fallback, no exportAll/importAll dance. `saveAuditLogs` is on the FINAL interface from Plan 03-1.

### `src/main.tsx` (rewritten)

```typescript
initAdapter()
  .then(() => root.render(<StrictMode><App /></StrictMode>))
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Adapter initialisation failed';
    root.render(<StrictMode><MigrationError message={message} /></StrictMode>);
  });
```

Adapter init owns the legacy migration; main.tsx is the boot gate that renders `MigrationError` on init throw.

### `src/App.tsx` (160 → 86 lines)

Removed the inline migration useEffect (lines 47-113 of the pre-Plan-03-2 file) and the `migrationError` state. The work moved to `LocalAdapter.init() → migrateLegacyLocalStorage()`. App.tsx loses 74 lines; the entire migration concern is now in the storage layer.

### `src/test/setup.ts` (modified)

Two changes from Plan 03-1's setup:
1. **IDB-* constructor globals** hoisted from `fake-indexeddb` (IDBRequest, IDBOpenDBRequest, IDBTransaction, IDBDatabase, IDBObjectStore, IDBIndex, IDBCursor, IDBCursorWithValue, IDBVersionChangeEvent). The `idb` wrapper uses `value instanceof IDBRequest` at runtime; without these globals jsdom throws ReferenceError.
2. **Pre-init the adapter** in beforeEach: set `localStorage.storageMode='local'` → call `_resetAdapter()` + `initAdapter()` → remove the override. Tests that don't touch the adapter pay zero cost; tests that do touch it find a ready `LocalAdapter` waiting. Adapter-probe tests opt out by re-resetting in their own beforeEach.

### Hook test rewrites

The four files in `src/hooks/__tests__/` previously asserted persistence via `localStorage.getItem('ledger_*')`. They now assert via `(await getAdapter()).getX()`. The hook public-contract assertions are unchanged. All 23 hook tests pass.

## Test results

| Suite | Files | Passing | Todo | Failed | Notes |
| ----- | -----:| -------:| ----:| ------:| ----- |
| SPA `npm run test` | 33 + 1 skipped | **238** | 22 | 0 | +38 GREEN vs Phase 2 baseline (200) |
| Server `npm run test:server` | 6 | **18** | 0 | 0 | Plan 03-3 made these GREEN |
| Lint `npm run lint` | — | exit 0 | — | — | Includes server tsconfig (Plan 03-3 widened it) |
| Build `npm run build` | — | exit 0 | — | — | Vite production bundle 905 kB / 270 kB gzip |

**Specific FND tests now GREEN:**
- `local.test.ts > data survives reopen` (FND-01)
- `local.test.ts > saveAuditLogs replaces whole audit log collection`
- `legacy-migration.test.ts > preserves on failure` (parse error leaves localStorage untouched)
- `legacy-migration.test.ts > clears the four legacy keys after success`
- `export.test.ts` × 2 (FND-02 JSON shape)
- `import.test.ts > round-trip` (FND-03)
- `round-trip.test.ts > _v:0 → migrate → importAll → exportAll equals migrated` (success criterion #5)
- `refuse-newer.test.ts` × 2 (FND-03 refuse-newer guard)
- `index.test.ts > selects server on health 200`
- `index.test.ts > falls back to local`
- `index.test.ts > honors storageMode override`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] fake-indexeddb IDB-* globals not exposed under jsdom**
- **Found during:** Task 1, first `npx vitest run src/storage` invocation.
- **Issue:** `idb` wrapper does `if (value instanceof IDBRequest)` at runtime. Plan 03-1's setup wired only `indexedDB` and `IDBKeyRange`, so all eight other IDB-* constructor globals were undefined under jsdom → ReferenceError on every adapter operation.
- **Fix:** Added the remaining IDB-* class exports from `fake-indexeddb` to globalThis in the existing beforeEach.
- **Files modified:** `src/test/setup.ts`.
- **Commit:** `194d0b5` (Task 1).

**2. [Rule 3 - Blocking] Hook tests asserted leaky-abstraction localStorage state**
- **Found during:** Task 3, post-hook-refactor full test run.
- **Issue:** The four Phase-2 hook tests in `src/hooks/__tests__/*.test.ts` asserted `localStorage.getItem('ledger_*')` after hook actions — they were testing the persistence implementation, not the hook contract. After the I/O swap, those asserts fail by design.
- **Fix:** Rewrote each leaky assertion to instead `await adapter.getX()` and verify the persisted state via the adapter. Hook public-contract assertions (return shape, method behaviour, addLog wiring) were kept verbatim.
- **Files modified:** all four `src/hooks/__tests__/*.test.ts`.
- **Commit:** `da09ae9` (Task 3).

**3. [Rule 3 - Blocking] Probe-timeout test cost would balloon suite by ~3s × N tests**
- **Found during:** Task 3, when adding `initAdapter()` to setup.ts beforeEach.
- **Issue:** With no `/api/health` mock, every test's beforeEach would run the full 6×500ms probe budget before falling back to `LocalAdapter`. With ~250 test files this is ~12 minutes of pure probe-timeout waiting.
- **Fix:** Set `localStorage.storageMode='local'` before `initAdapter()` in setup.ts; remove it after. The probe-selection tests (`src/storage/__tests__/index.test.ts`) call `_resetAdapter()` + `localStorage.clear()` in their own beforeEach so they get the real probe path.
- **Files modified:** `src/test/setup.ts`.
- **Commit:** `da09ae9` (Task 3).

### Architectural acknowledgements (not deviations)

- **ServerAdapter stub overwrite by Plan 03-3 (parallel).** My Task 1 commit shipped a 12-method throwing stub at `src/storage/server.ts`. Plan 03-3's commit `bab3377` (which landed between my Task 2 and Task 3 commits) replaced the stub body with the real HTTP implementation. Both bodies implement the same FINAL `StorageAdapter` interface from Plan 03-1, so `src/storage/index.ts` works against either — the import contract is the interface, not the body.
- **Plan 03-3 also modified `package.json` (lint script widening), `src/lib/migrations/*.ts` (added `.js` extensions for NodeNext resolution), and `server/tsconfig.json`.** All within Plan 03-3's owned-files boundary; logged here for traceability.

### Deferred items

None from Plan 03-2 itself. Plan 03-4 will use:
- `getCachedHealth()` / `getAdapterKind()` for the Data page status line.
- `getFellBackToLocal()` for the "Server unreachable" banner.
- `getLastExportAt() / setLastExportAt()` on `LocalAdapter` for the "Last export" status.

## Auth gates

None — Plan 03-2 is pure infrastructure, no external auth required.

## Hand-off

**To Plan 03-3 (ServerAdapter):** Already complete (commit `bab3377`). `ServerAdapter` body replaces the stub; `src/storage/index.ts`'s import + the FINAL `StorageAdapter` interface make the swap seamless.

**To Plan 03-4 (Data page + banner):**
- `getAdapter()`, `getAdapterKind()`, `getCachedHealth()`, `getFellBackToLocal()` from `src/storage/index.ts` — for status line and banner.
- `LocalAdapter.getLastExportAt() / setLastExportAt()` — for "Last export" status (server adapter needs the matching `/api/meta` route).
- `DataPage.test.tsx` (11 .todo placeholders from Plan 03-1) — to wire Export / Import / REPLACE-confirm UI.

## Requirements addressed

- **FND-01** durable persistence — IDB persistence GREEN at unit-test level (`'data survives reopen'`). Real-browser cache-clear is the manual UAT in 03-VALIDATION.md.
- **FND-02** JSON export — shape correctness GREEN (`exportAll` returns `{ _v, entities, accounts, allEntries, auditLogs }` matching `PersistedRoot`). CSV per-report half remains deferred to Phase 4/5 per 03-CONTEXT.md.
- **FND-03** JSON import round-trip — adapter-level round-trip GREEN; `_v > CURRENT_VERSION` refusal GREEN. SPA-side "type REPLACE to confirm" UI lands in Plan 03-4.

## Self-Check: PASSED

- `src/storage/local.ts` — FOUND (158 lines)
- `src/storage/legacy-migration.ts` — FOUND (72 lines)
- `src/storage/index.ts` — FOUND (124 lines)
- `src/storage/adapter.ts` — UNCHANGED (FINAL from Plan 03-1)
- Commit `194d0b5` (Task 1) — FOUND in `git log`
- Commit `ac1c08f` (Task 2) — FOUND in `git log`
- Commit `da09ae9` (Task 3) — FOUND in `git log`
- `npm run lint` exit 0 — VERIFIED
- `npm run test` 238 GREEN, 22 todo, 0 fail — VERIFIED
- `npm run test:server` 18 GREEN, 0 fail — VERIFIED (Plan 03-3 work)
- `npm run build` exit 0 — VERIFIED
- `grep -c "localStorage\.\(set\|get\)Item" src/hooks/*.ts` returns 0 for all four hook files — VERIFIED
- `src/hooks/useAuditLog.ts` contains literal `a.saveAuditLogs(auditLogs)` — VERIFIED
- `src/hooks/useAuditLog.ts` does NOT contain `(a as any).saveAuditLogs` — VERIFIED
- `src/main.tsx` contains literal `initAdapter()` and `MigrationError` — VERIFIED
- `src/App.tsx` does NOT contain `migrate(` or `migrationError` — VERIFIED
