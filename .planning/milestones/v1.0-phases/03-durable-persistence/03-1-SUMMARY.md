---
phase: 03-durable-persistence
plan: 1
subsystem: wave-0-foundations
tags: [storage-adapter, zod-schemas, fake-indexeddb, vitest-server, deps-install]
dependency_graph:
  requires:
    - migrate-function-from-phase-1
    - persisted-types-from-phase-2
    - vitest-setup-from-phase-1
  provides:
    - storage-adapter-interface
    - shared-zod-schemas
    - fake-indexeddb-test-setup
    - server-vitest-config
    - wave-0-test-scaffolds
    - test-dev-full-integration-smoke
  affects:
    - package.json
    - package-lock.json
    - .gitignore
    - src/test/setup.ts
tech_stack:
  added:
    - idb@^8.0.0 (dep)
    - zod@^3.23.8 (dep)
    - better-sqlite3@^11.7.0 (optionalDependencies)
    - "@types/better-sqlite3@^7.6.13 (devDep)"
    - concurrently@^9.1.0 (devDep)
    - fake-indexeddb@^6.0.0 (devDep)
  patterns:
    - per-collection coarse adapter API (12 methods incl. saveAuditLogs)
    - shared Zod schemas (SPA + server defence-in-depth)
    - fresh IDBFactory per test (beforeEach manual assign, not /auto)
    - separate server vitest config (node env, not jsdom)
key_files:
  created:
    - src/storage/adapter.ts
    - src/lib/schemas.ts
    - src/storage/__tests__/local.test.ts
    - src/storage/__tests__/server.test.ts
    - src/storage/__tests__/index.test.ts
    - src/storage/__tests__/legacy-migration.test.ts
    - src/storage/__tests__/export.test.ts
    - src/storage/__tests__/import.test.ts
    - src/lib/migrations/__tests__/round-trip.test.ts
    - src/lib/migrations/__tests__/refuse-newer.test.ts
    - src/components/__tests__/DataPage.test.tsx
    - server/vitest.config.ts
    - server/__tests__/persistence.test.ts
    - server/__tests__/atomicity.test.ts
    - server/__tests__/import-validation.test.ts
    - server/__tests__/bind.test.ts
    - server/db/__tests__/migrate.test.ts
    - server/routes/__tests__/health.test.ts
    - scripts/test-dev-full.mjs
  modified:
    - package.json (deps + scripts + optionalDependencies)
    - package-lock.json (lock for new deps)
    - .gitignore (data/, server/dist/, *.db*)
    - src/test/setup.ts (fake-indexeddb beforeEach)
    - src/lib/__tests__/ai.test.ts (Phase 3 widening TODO describe block)
decisions:
  - "StorageAdapter interface FINAL at Wave 0: 12 methods including saveAuditLogs"
  - "Zod schemas live in src/lib/schemas.ts (single source of truth, SPA + server import same module)"
  - "fake-indexeddb manual assignment in beforeEach (not /auto entry — Vitest setup-file load order)"
  - "better-sqlite3 in optionalDependencies so npm install survives Windows without VS Build Tools"
  - "test:server script uses separate node-env Vitest config; SPA suite stays jsdom"
  - "lint script unchanged (no server/tsconfig.json yet — Plan 03-3 widens it)"
metrics:
  duration: ~5 min
  completed: 2026-05-11
  tasks_total: 3
  tasks_completed: 3
  files_created: 19
  files_modified: 5
  tests_green_total: 201
  tests_green_delta: 1
  tests_todo_total_spa: 69
  tests_todo_total_server: 27
  tests_red: 0
---

# Phase 3 Plan 1: Wave-0 Foundations — Summary

Scaffolded every Phase-3 test file, the FINAL `StorageAdapter` interface (12 methods including `saveAuditLogs`), shared Zod schemas (SPA + server), fake-indexeddb test setup, server-side Vitest config, and installed all new dependencies — so Plans 03-2 and 03-3 can execute in parallel against an immutable interface contract without spending context on scaffolding.

## Commits

| Task | Commit  | Description |
| ---- | ------- | ----------- |
| 1    | `b3fa462` | chore(03-1): Wave-0 deps + scripts + fake-indexeddb test setup |
| 2    | `e8e17d1` | feat(03-1): StorageAdapter interface + shared Zod schemas + SPA test scaffolds |
| 3    | `ac5b2f7` | test(03-1): server-side Wave-0 test scaffolds + dev:full integration smoke |

## What changed

### `package.json`
- **Dependencies** added: `idb@^8.0.0`, `zod@^3.23.8`
- **Optional dependencies** (new top-level section): `better-sqlite3@^11.7.0`
- **devDependencies** added: `@types/better-sqlite3@^7.6.13`, `concurrently@^9.1.0`, `fake-indexeddb@^6.0.0`
- **Scripts** added: `dev:server`, `dev:full`, `build:server`, `start:server`, `test:server`

### `src/storage/adapter.ts` (NEW — single source of truth)
The `StorageAdapter` interface is FINAL at Wave 0. It exposes:
- `ready()`
- `getEntities() / getAccounts() / getEntries() / getAuditLogs()`
- `saveEntities() / saveAccounts() / saveEntries() / saveAuditLogs()`
- `appendAuditLog()`
- `exportAll() / importAll()`

Total: **12 methods**, including `saveAuditLogs` (whole-collection replace, mirrors how `useAuditLog` saves on every state change). Plus `AdapterKind` type, `HealthResponse` interface, `AdapterUnreachableError`, and `AdapterValidationError` classes. Plans 03-2 (LocalAdapter) and 03-3 (ServerAdapter) implement this verbatim — neither widens it.

### `src/lib/schemas.ts` (NEW — shared SPA + server)
Pure Zod, no React, no DOM globals. Exports `EntitySchema`, `AccountSchema`, `JournalLineSchema`, `JournalEntrySchema`, `AuditLogSchema`, `PersistedRootSchema` plus `Validated*` type aliases. SPA `importAll()` validates inbound state against `PersistedRootSchema`; server `POST /api/import` re-uses the same schema for defence-in-depth.

### `src/test/setup.ts` (MODIFIED)
Added `import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'` and a `beforeEach()` that assigns a fresh `IDBFactory` to `globalThis.indexedDB`. Manual assignment (not `fake-indexeddb/auto`) per research §8 — Vitest setup-file load order can leave `/auto` incomplete. ResizeObserver, matchMedia, and `@google/genai` mocks all preserved verbatim.

### `server/vitest.config.ts` (NEW)
Separate Vitest config with `environment: 'node'`, scoped include `server/**/*.test.ts`. Wired into `package.json` via `test:server` script.

### `.gitignore` (MODIFIED)
Added: `data/`, `server/dist/`, `*.db`, `*.db-wal`, `*.db-shm`.

### Wave-0 test scaffolds — 17 new files

**SPA-side (10 new + 1 modified)** — all `it.todo` placeholders pinned to exact test names from `03-VALIDATION.md`:
- `src/storage/__tests__/local.test.ts` (10 todos — incl. `'data survives reopen'`, `'saveAuditLogs replaces whole audit log collection'`)
- `src/storage/__tests__/server.test.ts` (9 todos)
- `src/storage/__tests__/index.test.ts` (6 todos — incl. `'selects server on health 200'`, `'falls back to local'`, `'honors storageMode override'`)
- `src/storage/__tests__/legacy-migration.test.ts` (7 todos — incl. `'preserves on failure'`)
- `src/storage/__tests__/export.test.ts` (4 todos)
- `src/storage/__tests__/import.test.ts` (4 todos)
- `src/lib/migrations/__tests__/round-trip.test.ts` (3 todos)
- `src/lib/migrations/__tests__/refuse-newer.test.ts` (1 runnable test GREEN + 1 todo)
- `src/components/__tests__/DataPage.test.tsx` (11 todos — incl. `'import on empty'`, `'REPLACE confirmation'`)
- `src/lib/__tests__/ai.test.ts` (existing 3 tests preserved + new TODO describe block for `'server-mode flag'`)

**Server-side (6 new)** — all `it.todo` placeholders:
- `server/__tests__/persistence.test.ts` (4 todos)
- `server/__tests__/atomicity.test.ts` (4 todos)
- `server/__tests__/import-validation.test.ts` (5 todos)
- `server/__tests__/bind.test.ts` (3 todos)
- `server/db/__tests__/migrate.test.ts` (7 todos)
- `server/routes/__tests__/health.test.ts` (4 todos)

### `scripts/test-dev-full.mjs` (NEW)
Integration smoke: spawns `npm run dev:full`, polls `http://localhost:4000/api/health` for up to 30s, asserts response shape, kills process tree (`taskkill /f /t` on Windows, `SIGTERM` elsewhere). Plan 03-4 makes this exit 0.

## Test results

| Suite | Files | Passing | Todo | Failed |
| ----- | -----:| -------:| ----:| ------:|
| SPA (`npm run test`)   | 26 + 8 skipped | **201** | 69 | 0 |
| Server (`npm run test:server`) | 0 + 6 skipped | 0   | 27 | 0 |

- Phase 2 baseline: 200 SPA passing. Phase 3 Wave 0 net delta: **+1 GREEN** (`refuse-newer.test.ts` runnable test), **+69 SPA TODO**, **+27 server TODO**.
- Existing test suite has **zero regressions** — all 200 Phase-2 tests still pass.
- `npm run lint` exits 0 (server `.test.ts` files import only Vitest globals; no server module imports yet).

## Dependency installation

- `npm install` completed successfully in ~6s.
- `better-sqlite3@11.x` **native build succeeded** on this Windows machine (VS Build Tools present). Phase verifier may discover Windows machines without C++ toolchain — `optionalDependencies` ensures `npm install` still succeeds; the SPA-only `dev` script never touches better-sqlite3.

## Deviations from Plan

**None.** Plan executed exactly as written. Three minor notes:

1. The existing `src/lib/__tests__/ai.test.ts` already had 3 passing Phase-2 tests. I **appended** the Phase-3 widening describe block (3 new TODOs) rather than overwriting, per plan intent ("preserve existing tests; add `'server-mode flag'`"). Acceptance criteria satisfied.
2. Three server-side tests use `it.todo` only — `npm run test:server` shows them as `skipped` at the file level (Vitest treats files containing only todos as skipped). This is expected and `npm run test:server` exits 0.
3. `package.json` `lint` script intentionally NOT widened to include `server/tsconfig.json` (per plan): `server/tsconfig.json` doesn't exist until Plan 03-3. Adding it now would break `npm run lint`. Plan 03-3 widens lint at the same time as creating that file.

## Auth gates

None — Phase 3 Wave 0 is pure scaffolding; no external auth required.

## Hand-off to Plans 03-2 and 03-3

Both plans can now begin **in parallel**:

- **Plan 03-2 (LocalAdapter)** consumes `src/storage/adapter.ts` (12-method interface, FINAL) + `src/lib/schemas.ts` (for `importAll()` Zod validation) and makes the 6 SPA storage test files + 2 migration test files GREEN.
- **Plan 03-3 (ServerAdapter + Express + better-sqlite3)** consumes the same `adapter.ts` (for `ServerAdapter` class shape) + `src/lib/schemas.ts` (server re-exports for `POST /api/import` validation) and makes the 6 server test files GREEN.

Neither plan may widen the `StorageAdapter` interface. Any new method requires going back to Wave 0 (i.e. a new mini-plan).

## Requirements addressed (at scaffold level)

- **FND-01** durable persistence — scaffolded in `local.test.ts` (`'data survives reopen'`) + `server/persistence.test.ts` (`'survives restart'`)
- **FND-02** JSON export — scaffolded in `export.test.ts`
- **FND-03** JSON import round-trip + refuse-newer — `import.test.ts` + `refuse-newer.test.ts` (1 runnable GREEN test against `migrate()`)
- **DEP-02** Express + SQLite + transactional replace — scaffolded across all 6 server-side test files

Real implementations land in Plans 03-2 / 03-3 / 03-4.

## Self-Check: PASSED

- `src/storage/adapter.ts` — FOUND
- `src/lib/schemas.ts` — FOUND
- `server/vitest.config.ts` — FOUND
- `scripts/test-dev-full.mjs` — FOUND
- All 10 SPA test scaffolds — FOUND (verified via `ls src/storage/__tests__/ src/lib/migrations/__tests__/`)
- All 6 server test scaffolds — FOUND (verified via `ls server/__tests__/ server/db/__tests__/ server/routes/__tests__/`)
- Commit `b3fa462` (Task 1) — FOUND in `git log`
- Commit `e8e17d1` (Task 2) — FOUND in `git log`
- Commit `ac5b2f7` (Task 3) — FOUND in `git log`
- `npm run lint` exit 0 — VERIFIED
- `npm run test` 201 GREEN — VERIFIED
- `npm run test:server` 27 todo, 0 fail — VERIFIED
- `node_modules/{idb,zod,concurrently,fake-indexeddb,better-sqlite3,@types/better-sqlite3}` — all FOUND
