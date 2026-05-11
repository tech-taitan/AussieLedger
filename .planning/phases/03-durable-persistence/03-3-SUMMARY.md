---
phase: 03-durable-persistence
plan: 3
subsystem: wave-2-server-adapter
tags: [express, better-sqlite3, server-adapter, gemini-proxy, sqlite-schema, http-fetch, decimal-boundary, shared-zod]
dependency_graph:
  requires:
    - storage-adapter-interface-from-03-1
    - shared-zod-schemas-from-03-1
    - server-vitest-config-from-03-1
    - server-test-scaffolds-from-03-1
    - server-stub-from-03-2
    - storage-index-getCachedHealth-from-03-2
  provides:
    - express-server-app
    - sqlite-schema-v2
    - migration-runner-server-side
    - rest-api-7-routes
    - gemini-ai-proxy
    - server-adapter-http-impl
    - isAiEnabled-runtime-function
    - GEMINI_MODEL-constant
  affects:
    - package.json
    - server/ directory (entirely)
    - src/storage/server.ts (stub -> full impl)
    - src/lib/ai.ts (build-time const -> runtime function + constant)
    - src/components/ImportTB.tsx (SDK call -> server proxy fetch)
    - src/lib/migrations/index.ts (.js extension added for cross-tree compile)
    - src/lib/migrations/v1-to-v2.ts (.js extensions added)
tech_stack:
  added: []
  patterns:
    - buildApp factory split (server/app.ts factory + server/index.ts listen wrapper)
    - Cross-tree rootDir='..' tsconfig so server can import src/lib/migrations + src/lib/schemas
    - Thin re-export schema module (server/lib/schema.ts -> src/lib/schemas.ts) for single source of truth
    - Decimal-as-TEXT on wire (server stores + returns strings; SPA deserialises via money.ts on read boundary)
    - Whole-collection PUT replaces wrapped in db.transaction() — atomic
    - POST /api/import runs migrate() first, then Zod-validates, then atomic 4-collection replace
    - Gemini AI proxy: server holds key, SPA calls /api/ai/match-accounts; model literal pinned via constant
    - isAiEnabled() runtime function reads getCachedHealth() in server mode, falls back to build-time key in local mode
key_files:
  created:
    - server/tsconfig.json
    - server/env.ts
    - server/app.ts
    - server/index.ts
    - server/db/client.ts
    - server/db/migrate.ts
    - server/db/migrations/001-initial.sql
    - server/lib/schema.ts
    - server/routes/health.ts
    - server/routes/entities.ts
    - server/routes/accounts.ts
    - server/routes/entries.ts
    - server/routes/audit.ts
    - server/routes/exportImport.ts
    - server/routes/ai.ts
  modified:
    - package.json (lint widened with server tsconfig; start:server path corrected)
    - server/db/__tests__/migrate.test.ts (todos -> 5 GREEN tests; fixed invalid '[unique]' SQL via PRAGMA index_list)
    - server/__tests__/persistence.test.ts (todos -> 3 GREEN tests)
    - server/__tests__/atomicity.test.ts (todos -> 1 GREEN test)
    - server/__tests__/import-validation.test.ts (todos -> 3 GREEN tests)
    - server/__tests__/bind.test.ts (todos -> 3 GREEN tests)
    - server/routes/__tests__/health.test.ts (todos -> 3 GREEN tests)
    - src/storage/server.ts (stub -> full HTTP impl with money.ts deserialise boundary)
    - src/storage/__tests__/server.test.ts (todos -> 9 GREEN tests incl. W1 decimal boundary)
    - src/lib/ai.ts (IS_AI_ENABLED -> isAiEnabled() + GEMINI_MODEL constant)
    - src/lib/__tests__/ai.test.ts (3 Phase-2 tests preserved + 4 new Phase-3 tests)
    - src/components/ImportTB.tsx (GoogleGenAI SDK call -> fetch /api/ai/match-accounts)
    - src/components/__tests__/ImportTB.test.tsx (fetch-based mocks replacing GoogleGenAI mocks)
    - src/lib/migrations/index.ts (added .js import extension for NodeNext server tsconfig)
    - src/lib/migrations/v1-to-v2.ts (added .js import extensions)
decisions:
  - "server/tsconfig.json uses rootDir='..' (the repo root) so cross-directory imports from ../src/lib/migrations + ../src/lib/schemas compile under noEmitOnError; emit lands at server/dist/server/... and server/dist/src/lib/..."
  - "buildApp factory in server/app.ts (no listen) + server/index.ts thin listen wrapper — enables in-process tests via app.listen(0)"
  - "server/lib/schema.ts is a THIN RE-EXPORT from src/lib/schemas.ts — single source of truth for SPA importAll + server POST /api/import (defence-in-depth without duplication)"
  - "Decimal precision boundary (W1): SQLite TEXT columns; server returns strings AS STRINGS (no parseFloat); SPA ServerAdapter applies deserialize() from src/lib/money.ts on read boundary"
  - "GEMINI_MODEL exported from src/lib/ai.ts as single source of truth; server/routes/ai.ts duplicates the literal in GEMINI_MODEL_DEFAULT to avoid pulling React/storage chain into server bundle; ai.test.ts pins them with a literal-equality assertion"
  - "isAiEnabled() is a runtime function (not const) — components MUST call it as a function; IS_AI_ENABLED retained as @deprecated alias for backward compat"
  - "Added .js import extensions to src/lib/migrations/{index,v1-to-v2}.ts to satisfy NodeNext server tsconfig; works in both bundler (SPA) and nodenext (server) modes — Rule 3 auto-fix"
  - "Fixed migrate.test.ts SQL bug: '[unique]' column reference is not valid in sqlite_master; replaced with PRAGMA index_list to verify uniqueness — Rule 1 auto-fix"
metrics:
  duration: ~9 min
  completed: 2026-05-11
  tasks_total: 3
  tasks_completed: 3
  files_created: 15
  files_modified: 16
  tests_green_spa_delta: 19 (server.test.ts 9 + ai.test.ts 4 widened + ImportTB.test.tsx 3 preserved + 3 already passing)
  tests_green_server_delta: 18 (all 6 server test files now GREEN)
  tests_green_total_spa: 238
  tests_green_total_server: 18
  tests_red: 0
---

# Phase 3 Plan 3: Server Adapter + Express + better-sqlite3 + AI Proxy — Summary

Delivered the SQLite half of the dual-deployment story: a full Express + better-sqlite3 server with 7 REST routes, the FINAL `StorageAdapter` implemented over HTTP (replacing the Plan 03-2 stub) with the decimal-as-string boundary running through `src/lib/money.ts` `deserialize()` on read, and the Gemini AI proxy that closes the "API key in client bundle" concern from Phase 2 — all gated behind `isAiEnabled()` which reads `/api/health.aiEnabled` in server mode.

## Commits

| Task | Commit    | Description |
| ---- | --------- | ----------- |
| 1    | `c9be4d0` | chore(03-3): server scaffolding — tsconfig (rootDir=..), env, db client + migrate runner + 001-initial.sql |
| 2    | `bab3377` | feat(03-3): Express + better-sqlite3 server — buildApp factory + 7 routes + shared Zod schemas |
| 3    | `eb12fa6` | feat(03-3): full ServerAdapter HTTP impl + isAiEnabled() runtime widening + GEMINI_MODEL constant + ImportTB server-proxy |

## What changed

### `server/` directory (15 new files)

- `server/tsconfig.json` — NodeNext, target ES2022, outDir=dist, **rootDir='..'** so the compiler can pull in `../src/lib/migrations/**` and `../src/lib/schemas.ts`. Emit lands at `server/dist/server/...` AND `server/dist/src/lib/migrations/...` AND `server/dist/src/lib/schemas.js`. `start:server` script updated to point at the new `server/dist/server/index.js` entry path.
- `server/env.ts` — `loadEnv()` reads PORT (default 4000), HOST (default 127.0.0.1), DB_PATH (default `./data/ledger.db`), GEMINI_API_KEY; derives `aiEnabled` bool.
- `server/db/client.ts` — `openDatabase()` opens better-sqlite3 with `journal_mode=WAL`, `foreign_keys=ON`, `synchronous=NORMAL`. Creates the directory for file-backed paths; skips for `:memory:`.
- `server/db/migrate.ts` — numbered `.sql` runner: creates `schema_migrations` table, applies any unapplied files in alphabetical order under a single transaction each, records each as applied.
- `server/db/migrations/001-initial.sql` — 6 tables (`entities`, `accounts`, `journal_entries`, `journal_lines`, `audit_logs`, `schema_migrations`) matching the `_v: 2` shape; FK CASCADE on `journal_entries.entity_id` and `journal_lines.entry_id`; unique index on `accounts.code`; indexes on `journal_entries.entity_id`, `journal_entries.date`, `audit_logs.timestamp DESC`. Decimal columns are TEXT to preserve precision.
- `server/lib/schema.ts` — **thin re-export** from `src/lib/schemas.ts`. The server's `POST /api/import` validation uses the exact same Zod schemas as the SPA's `importAll()` validation (W2 — single source of truth).
- `server/app.ts` — `buildApp()` factory that wires routes onto an Express instance and returns `{ app, env, db }`. **No `app.listen()` here** so tests can instantiate via `app.listen(0)` in-process (B3).
- `server/index.ts` — thin listen wrapper: `const { app, env } = buildApp(); app.listen(env.port, env.host, () => console.log(...))`.
- 7 route modules:
  - `health.ts` — `GET /api/health` → `{ ok: true, version: 2, aiEnabled }`
  - `entities.ts` — `GET /api/entities` (rows->camelCase), `PUT /api/entities` (Zod-validated, `db.transaction(delete-then-insert)`)
  - `accounts.ts` — same shape as entities
  - `entries.ts` — `GET /api/entries` returns entity-id keyed map with **debit/credit/taxAmount as STRINGS** (W1 — no `parseFloat`); `PUT /api/entries` deletes lines+entries then re-inserts within outer transaction
  - `audit.ts` — `GET /api/audit`, `POST /api/audit` (append one), `PUT /api/audit` (whole-collection replace, backs `saveAuditLogs`)
  - `exportImport.ts` — `GET /api/export` (decimals as strings), `POST /api/import` runs `migrate()` first then Zod-validates then atomically replaces all four collections under one outer transaction
  - `ai.ts` — `POST /api/ai/match-accounts` proxies to Gemini using server-held `GEMINI_API_KEY`; 503 when key absent/placeholder; 400 when no prompt; default model is `GEMINI_MODEL_DEFAULT = 'gemini-3-flash-preview'` (pinned to `src/lib/ai.ts` `GEMINI_MODEL` via test)

### SPA-side changes

- `src/storage/server.ts` — **replaces Plan 03-2 stub** with full HTTP implementation of all 12 `StorageAdapter` methods. 4xx → `AdapterValidationError`, 5xx → `AdapterUnreachableError`. **W1 decimal boundary** lives in `getEntries()` and `exportAll()`: walks the parsed JSON and converts each line's `debit`/`credit`/`taxAmount` from string → number via `deserialize()` from `src/lib/money.ts` (helpers `deserialiseLine`/`deserialiseEntry`).
- `src/lib/ai.ts` — exports `GEMINI_MODEL = 'gemini-3-flash-preview'` (single source of truth), `isAiEnabled()` runtime function (server mode reads `getCachedHealth()?.aiEnabled`, local mode reads build-time `process.env.GEMINI_API_KEY`), and retains `IS_AI_ENABLED` as `@deprecated` alias for backwards compat.
- `src/components/ImportTB.tsx` — `import { GoogleGenAI, Type } from "@google/genai"` removed; `IS_AI_ENABLED` swapped to `isAiEnabled()` function call (in the button-render gate and the `runAIMapping` guard); `new GoogleGenAI(...)` + `ai.models.generateContent` removed and replaced with `fetch('/api/ai/match-accounts', { method: 'POST', body: JSON.stringify({ prompt, model: GEMINI_MODEL, responseSchema }) })`; response shape (`candidates[0].content.parts[0].text` carries the JSON string) is parsed and walked the same way.
- `src/components/__tests__/ImportTB.test.tsx` — mocks updated: `vi.doMock('../../lib/ai', () => ({ isAiEnabled: () => false, ... }))` instead of `IS_AI_ENABLED: false`; fetch stub added for the AI-enabled path. All 3 tests stay GREEN.
- `src/lib/__tests__/ai.test.ts` — 3 Phase-2 build-time tests preserved unchanged; new Phase-3 describe block adds 4 GREEN tests: server-mode aiEnabled true/false, local-mode probe-fail fallback, and the `GEMINI_MODEL === 'gemini-3-flash-preview'` literal pin (assertion that server's `GEMINI_MODEL_DEFAULT` stays in sync).
- `src/storage/__tests__/server.test.ts` — 9 GREEN tests covering all REST verbs, error mapping, and the **W1 decimal boundary** (mocks server response with `debit: '100.50000'` and asserts `typeof line.debit === 'number'`).

### Cross-tree imports — `src/lib/migrations/`

- `src/lib/migrations/index.ts` — `import { migrateV1ToV2 } from './v1-to-v2.js'` (added `.js`)
- `src/lib/migrations/v1-to-v2.ts` — `import type { Account } from '../../types.js'`, `import type { PersistedRoot } from './index.js'` (added `.js`)

These are Rule 3 auto-fixes: server's `NodeNext` tsconfig requires explicit `.js` extensions on relative ESM imports, while the SPA's `bundler` resolution accepts them too. Tests in both suites continue to pass.

### `package.json`

- `scripts.lint` widened: `"tsc --noEmit && tsc -p server/tsconfig.json --noEmit"`
- `scripts.start:server` corrected to new emit path: `"node server/dist/server/index.js"` (rootDir='..' moves the entry one directory deeper)

## Verification

| Suite | Files | Passing | Todo | Failed |
| ----- | ----:| -------:| ----:| ------:|
| SPA (`npm run test`) | 33 + 1 skipped | **238** | 22 | 0 |
| Server (`npm run test:server`) | 6 | **18** | 0 | 0 |
| `npm run lint` | — | EXIT 0 | — | — |
| `npm run build:server` | — | EXIT 0 (emits `server/dist/server/` + `server/dist/src/lib/migrations/` + `server/dist/src/lib/schemas.js`) | — | — |
| `npm run build` | — | EXIT 0 (Vite production build) | — | — |

Server-side test count is 18 (5 migrate + 3 persistence + 1 atomicity + 3 import-validation + 3 bind + 3 health). Phase-2 baseline was 200 SPA tests; Plan 03-1 left 201 GREEN + 96 todo; Plan 03-2 (parallel) plus this plan together brought SPA to 238 GREEN and server to 18 GREEN with zero regressions.

## Decimal precision contract — end-to-end

1. SPA hook saves a `JournalLine` with `debit: 100.5` (number).
2. ServerAdapter `saveEntries()` → PUT `/api/entries` with JSON body.
3. Server's `replaceAllEntries()` calls `String(line.debit)` and INSERTs into TEXT column (`debit TEXT NOT NULL`).
4. Later, ServerAdapter `getEntries()` → GET `/api/entries`.
5. Server's `entriesRouter` reads the TEXT column and **returns it verbatim as a string** in JSON (no `parseFloat`).
6. ServerAdapter's `deserialiseLine` calls `Number(deserialize('100.50000'))` → restores precision via Decimal.js.
7. Hook receives `debit: 100.5` (number) — round-trip lossless.

Grep evidence: `server/routes/entries.ts` does not contain `parseFloat`; `src/storage/server.ts` contains `import { deserialize } from '../lib/money'` and the `deserialiseLine` helper.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed invalid SQL in `migrate.test.ts` index-uniqueness check**
- **Found during:** Task 1 RED phase
- **Issue:** Plan-supplied test used `SELECT name, [unique] FROM sqlite_master ...` — SQLite does not expose a `unique` column on `sqlite_master`. Test failed with `SqliteError: no such column: unique`.
- **Fix:** Verified index existence with `SELECT name FROM sqlite_master`, then added a second assertion using `PRAGMA index_list('accounts')` which returns rows with a `unique` flag (0/1) per index.
- **Files modified:** `server/db/__tests__/migrate.test.ts`
- **Commit:** `c9be4d0`

**2. [Rule 3 - Blocker] Added `.js` extensions to `src/lib/migrations` imports for NodeNext compile**
- **Found during:** Task 1 lint verification
- **Issue:** `tsc -p server/tsconfig.json --noEmit` failed with `TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'` because the server tsconfig includes `src/lib/migrations/**/*.ts` (so the cross-tree `migrate()` import in `server/routes/exportImport.ts` resolves) and NodeNext is strict about extensions.
- **Fix:** Added `.js` extensions to the 3 relative imports inside `src/lib/migrations/{index,v1-to-v2}.ts`. Both `bundler` (SPA) and `nodenext` (server) resolutions accept `.js` extensions; SPA tests stay GREEN.
- **Files modified:** `src/lib/migrations/index.ts`, `src/lib/migrations/v1-to-v2.ts`
- **Commit:** `c9be4d0`

No other deviations. Plan executed as written for Tasks 2 and 3.

## Auth gates

None — Phase 3 Plan 03-3 is pure infrastructure. No external services exercised in tests (Gemini route forwards but is never live-called in the test suite; bind tests use port `0` for ephemeral ports). The Gemini key, when configured at runtime, is held server-side only — closing the "API key in client bundle" concern from Phase 2.

## Hand-off to Plan 03-4

Plan 03-4 (Wave 3) consumes everything this plan and 03-2 deliver:
- `vite.config.ts` needs `server.proxy = { '/api': 'http://localhost:4000' }` so SPA fetches reach Express in `dev:full`.
- DataPage UI (`src/components/DataPage.tsx`) — 11 todos in `src/components/__tests__/DataPage.test.tsx` cover the Export/Import flow + status line; consumer reads `getAdapterKind()`, `getFellBackToLocal()`, `getCachedHealth()`, and adapter `exportAll()/importAll()`.
- "Server unreachable" banner (W5) — Plan 03-4 implements; reads `getFellBackToLocal()` from `src/storage/index.ts`.
- `scripts/test-dev-full.mjs` integration smoke (from Plan 03-1) should now exit 0 once `dev:full` actually boots both processes — Plan 03-4 verifies.
- Sidebar nav entry "Data" — Plan 03-4 adds.
- README updates for `DB_PATH`, `HOST=0.0.0.0`, reverse-proxy guidance, better-sqlite3 native build prereqs — Plan 03-4.

## `src/storage/adapter.ts` confirmation

**NOT modified.** The 12-method `StorageAdapter` interface created in Plan 03-1 is the FINAL contract. `ServerAdapter` (this plan) and `LocalAdapter` (Plan 03-2) both implement it verbatim. Any future addition requires a new Wave-0 mini-plan.

## Windows native-build note

`better-sqlite3@11.x` was pre-built successfully on the developer's Windows machine during Plan 03-1's `npm install` (VS Build Tools present). Repositories without C++ toolchain see `npm install` complete because `better-sqlite3` lives in `optionalDependencies` per Plan 03-1's decision. CI on `ubuntu-latest` (when added) will exercise the full server test suite; Windows machines without VS Build Tools will see the server test suite error at module-load on `import Database from 'better-sqlite3'` — that's expected and documented behaviour.

## Requirements addressed

- **DEP-02 — Express + SQLite + transactional replace** — DELIVERED. Server boots, `/api/health` responds, all PUT routes are transactional, `data/ledger.db` is created on first boot, 6 tables produced by `001-initial.sql`.
- **FND-01 — Durable persistence (server shape)** — DELIVERED. `persistence.test.ts` proves write → close → reopen → still present at unit-test level.
- **FND-03 — JSON import round-trip + refuse-newer (server side)** — DELIVERED. `POST /api/import` runs `migrate()` first, validates with the shared `PersistedRootSchema`, refuses newer `_v` with 400 `migration-newer`, replaces all collections atomically.

Manual UAT (Plan 03-4) covers: `dev:full` boot, browser → IDB persistence end-to-end, server-mode persistence end-to-end, the "server unreachable" banner, the import-replace confirmation flow.

## Self-Check: PASSED

- `server/tsconfig.json` — FOUND, contains `"rootDir": ".."` and `"module": "NodeNext"`
- `server/env.ts` — FOUND, contains `process.env.PORT ?? '4000'` and `process.env.HOST ?? '127.0.0.1'`
- `server/db/client.ts` — FOUND, contains `db.pragma('journal_mode = WAL')` and `db.pragma('foreign_keys = ON')`
- `server/db/migrate.ts` — FOUND, contains `CREATE TABLE IF NOT EXISTS schema_migrations`
- `server/db/migrations/001-initial.sql` — FOUND, contains `CREATE TABLE entities`, `CREATE TABLE journal_entries`, `CREATE TABLE journal_lines`, `CREATE TABLE audit_logs`, `ON DELETE CASCADE`, `CREATE UNIQUE INDEX accounts_code_idx`
- `server/lib/schema.ts` — FOUND, contains `from '../../src/lib/schemas.js'` and the `PersistedRootSchema` export
- `server/app.ts` — FOUND, exports `buildApp`, does NOT contain `app.listen`
- `server/index.ts` — FOUND, contains `import { buildApp } from './app.js'` and `app.listen(env.port, env.host`
- `server/routes/health.ts` — FOUND, returns `{ ok: true, version: 2, aiEnabled }`
- `server/routes/entities.ts` — FOUND, contains `db.prepare('DELETE FROM entities')` and `db.transaction(`
- `server/routes/entries.ts` — FOUND, contains the comment fragment `decimals AS STRINGS`, contains `db.prepare('DELETE FROM journal_lines')`, does NOT contain `parseFloat`
- `server/routes/exportImport.ts` — FOUND, contains `migrate(req.body`, does NOT contain `parseFloat`
- `server/routes/ai.ts` — FOUND, contains `'/ai/match-accounts'` and `const GEMINI_MODEL_DEFAULT = 'gemini-3-flash-preview'`
- `src/storage/server.ts` — FOUND, contains `export class ServerAdapter implements StorageAdapter`, contains `import { deserialize } from '../lib/money'`, contains `deserialiseLine`, does NOT contain `ServerAdapter not implemented` (stub fully replaced)
- `src/lib/ai.ts` — FOUND, contains `export function isAiEnabled(): boolean`, `getCachedHealth()?.aiEnabled`, `export const GEMINI_MODEL = 'gemini-3-flash-preview'`
- `src/components/ImportTB.tsx` — FOUND, contains `/api/ai/match-accounts`, `import { isAiEnabled, GEMINI_MODEL } from '../lib/ai'`, `isAiEnabled()`; does NOT contain `new GoogleGenAI(`, does NOT contain the literal `'gemini-3-flash-preview'` (uses the imported constant)
- Commit `c9be4d0` (Task 1) — FOUND in `git log`
- Commit `bab3377` (Task 2) — FOUND in `git log`
- Commit `eb12fa6` (Task 3) — FOUND in `git log`
- `npm run lint` — EXIT 0 VERIFIED
- `npm run test` — 238 GREEN VERIFIED
- `npm run test:server` — 18 GREEN VERIFIED
- `npm run build:server` — EXIT 0 VERIFIED, `server/dist/server/index.js` exists, `server/dist/src/lib/migrations/index.js` exists, `server/dist/src/lib/schemas.js` exists
- `npm run build` — EXIT 0 VERIFIED
- `src/storage/adapter.ts` — UNCHANGED VERIFIED (FINAL from Plan 03-1)
