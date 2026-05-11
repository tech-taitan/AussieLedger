---
phase: 03-durable-persistence
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - src/test/setup.ts
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
  - src/lib/__tests__/ai.test.ts
  - server/vitest.config.ts
  - server/__tests__/persistence.test.ts
  - server/__tests__/atomicity.test.ts
  - server/__tests__/import-validation.test.ts
  - server/__tests__/bind.test.ts
  - server/db/__tests__/migrate.test.ts
  - server/routes/__tests__/health.test.ts
  - scripts/test-dev-full.mjs
  - .gitignore
autonomous: true
requirements:
  - FND-01
  - FND-02
  - FND-03
  - DEP-02
must_haves:
  truths:
    - "Wave-0 test files compile and reference real interfaces (no test placeholders)"
    - "All Phase-3 test files fail loudly with 'not implemented' instead of import/resolve errors"
    - "`StorageAdapter` interface in src/storage/adapter.ts is the single source of truth that downstream plans implement against (finalised at Wave 0, including saveAuditLogs)"
    - "Zod schemas in src/lib/schemas.ts are shared between SPA and server (defence-in-depth)"
    - "Test infrastructure (fake-indexeddb + better-sqlite3 in-memory + server vitest config) loads correctly"
  artifacts:
    - path: "src/storage/adapter.ts"
      provides: "StorageAdapter interface (12 methods including saveAuditLogs), AdapterUnreachableError, AdapterValidationError, AdapterKind type"
      exports: ["StorageAdapter", "AdapterKind", "AdapterUnreachableError", "AdapterValidationError"]
    - path: "src/lib/schemas.ts"
      provides: "Zod schemas shared SPA + server: EntitySchema, AccountSchema, JournalLineSchema, JournalEntrySchema, AuditLogSchema, PersistedRootSchema"
      exports: ["EntitySchema", "AccountSchema", "JournalLineSchema", "JournalEntrySchema", "AuditLogSchema", "PersistedRootSchema"]
    - path: "src/test/setup.ts"
      provides: "fake-indexeddb global assignment in beforeEach, preserves existing ResizeObserver + matchMedia + @google/genai mocks"
      contains: "new IDBFactory()"
    - path: "server/vitest.config.ts"
      provides: "node-env Vitest config for server-side tests"
      contains: "environment: 'node'"
    - path: "package.json"
      provides: "New devDeps (concurrently@^9, fake-indexeddb@^6, @types/better-sqlite3@^7.6.13), new deps (idb@^8, zod@^3.23.8), optionalDependencies (better-sqlite3@^11.7.0), test:server script"
      contains: "test:server"
    - path: "scripts/test-dev-full.mjs"
      provides: "Integration smoke spawning concurrently script, curling /api/health, killing both processes"
  key_links:
    - from: "src/storage/__tests__/*.test.ts"
      to: "src/storage/adapter.ts"
      via: "import { StorageAdapter, AdapterKind } from '../adapter'"
      pattern: "from ['\"]\\.\\./adapter['\"]"
    - from: "src/test/setup.ts"
      to: "fake-indexeddb"
      via: "import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'"
      pattern: "fake-indexeddb"
    - from: "package.json"
      to: "test:server"
      via: "scripts['test:server']"
      pattern: "vitest run --config server/vitest.config.ts"
---

<objective>
Wave 0 — scaffold every Phase-3 test file, the StorageAdapter interface (FINAL — including `saveAuditLogs`), the shared Zod schemas (SPA + server), the test infrastructure (fake-indexeddb shim + server-side Vitest config), and install all new dependencies. After this plan lands, every Wave-0 test exists and fails for the right reason ("not implemented") instead of failing at import resolution, and downstream plans (03-2, 03-3) have a working test target to make GREEN.

Purpose: Without Wave 0, the executors for 03-2 and 03-3 would spend their context budget on test setup. By landing all 21 test files plus the FINAL StorageAdapter interface contract AND the shared Zod schemas up front, parallel execution of 03-2 (LocalAdapter) and 03-3 (ServerAdapter) becomes possible — they share the same interface AND validation schemas.

Output:
- `src/storage/adapter.ts` — StorageAdapter interface (FINAL with `saveAuditLogs`) + error classes
- `src/lib/schemas.ts` — Zod schemas shared between SPA and server
- 21 test files (skeleton scaffolds — see Wave-0 list in 03-VALIDATION.md)
- `server/vitest.config.ts` — node-env Vitest config
- `package.json` — new deps + `test:server` script
- `scripts/test-dev-full.mjs` — integration smoke
- `src/test/setup.ts` extended with fake-indexeddb manual setup
- `.gitignore` updated (server `data/` directory)
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-durable-persistence/03-CONTEXT.md
@.planning/phases/03-durable-persistence/03-RESEARCH.md
@.planning/phases/03-durable-persistence/03-VALIDATION.md
@.planning/phases/02-decompose-and-tax-engine/02-4-SUMMARY.md
@src/types.ts
@src/lib/migrations/index.ts
@src/test/setup.ts
@package.json

<interfaces>
<!-- Key types and contracts the executor needs. Extracted from existing codebase. -->
<!-- Executor should use these directly — no codebase exploration needed. -->

From src/lib/migrations/index.ts:
```typescript
export interface PersistedRoot {
  _v: number;
  entities?: unknown;
  allEntries?: unknown;
  auditLogs?: unknown;
  accounts?: unknown;
}
export const CURRENT_VERSION = 2;
export function migrate(raw: Record<string, unknown>): PersistedRoot;
```

From src/types.ts (Phase 2 _v:2 shape):
```typescript
export interface Entity { _v?: number; id: string; name: string; type: string; status: 'Active' | 'Archived' | 'Deactivated'; registrationNumber?: string; businessAddress?: string; contactPerson?: string; taxAgentName?: string; taxAgentPhone?: string; taxAgentEmail?: string; notes?: string; }
export interface Account { _v?: number; id: string; code: string; name: string; type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'; taxLabel?: string; companyTaxLabel?: string; trustTaxLabel?: string; partnershipTaxLabel?: string; gstCode: 'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP'; _needsReview?: boolean; }
export interface JournalLine { _v?: number; accountId: string; description: string; debit: number; credit: number; taxAmount: number; isManualTax?: boolean; }
export interface JournalEntry { _v?: number; id: string; date: string; reference: string; description: string; lines: JournalLine[]; isPosted: boolean; }
export interface AuditLog { _v?: number; id: string; timestamp: string; user: string; action: 'CREATE_ENTITY' | 'UPDATE_ENTITY' | 'POST_JOURNAL' | 'DELETE_JOURNAL' | 'IMPORT_DATA'; entityId?: string; details: string; }
```

From src/test/setup.ts (current — must preserve mocks below):
```typescript
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => { cleanup(); });
class ResizeObserverPolyfill { observe() {} unobserve() {} disconnect() {} }
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverPolyfill }).ResizeObserver = ResizeObserverPolyfill;
Object.defineProperty(window, 'matchMedia', { writable: true, value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }) });
vi.mock('@google/genai', () => ({ GoogleGenAI: class GoogleGenAIMock { constructor() {} }, Type: {} }));
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Install Wave-0 deps, add scripts, gitignore data/, extend test setup with fake-indexeddb</name>
  <files>package.json, src/test/setup.ts, .gitignore, server/vitest.config.ts</files>
  <read_first>
    - A:/Projects/AussieLedger/package.json (current scripts + deps)
    - A:/Projects/AussieLedger/src/test/setup.ts (preserve all existing mocks)
    - A:/Projects/AussieLedger/.gitignore (current ignore set)
    - A:/Projects/AussieLedger/vitest.config.ts (SPA Vitest config — read for shape; do NOT modify)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-RESEARCH.md §1 (idb), §3 (concurrently), §8 (fake-indexeddb), §15 (dependencies table)
  </read_first>
  <behavior>
    - npm install resolves with new deps even when better-sqlite3 native build fails (optionalDependencies)
    - `npx vitest run --config server/vitest.config.ts` exits 0 (empty server suite at this point — but config must load with node env)
    - `npm run test` continues to pass all 200 existing tests (no regressions from setup.ts changes)
    - fake-indexeddb is fresh per test (new IDBFactory() in beforeEach)
    - test setup preserves existing ResizeObserver + matchMedia + @google/genai mocks verbatim
  </behavior>
  <action>
    Step 1 — Add to `package.json` `dependencies` (alphabetical with existing entries):
    ```json
    "idb": "^8.0.0",
    "zod": "^3.23.8"
    ```

    Step 2 — Add new top-level `optionalDependencies` section to `package.json` (sibling of `dependencies`):
    ```json
    "optionalDependencies": {
      "better-sqlite3": "^11.7.0"
    }
    ```

    Step 3 — Add to `package.json` `devDependencies`:
    ```json
    "@types/better-sqlite3": "^7.6.13",
    "concurrently": "^9.1.0",
    "fake-indexeddb": "^6.0.0"
    ```

    Step 4 — Replace `package.json` `scripts` block so the final scripts block is exactly:
    ```json
    "scripts": {
      "dev": "vite --port=3000 --host=0.0.0.0",
      "dev:server": "tsx watch server/index.ts",
      "dev:full": "concurrently -k -n vite,api -c blue,magenta \"npm:dev\" \"npm:dev:server\"",
      "build": "vite build",
      "build:server": "tsc -p server/tsconfig.json",
      "start:server": "node server/dist/index.js",
      "preview": "vite preview",
      "clean": "rm -rf dist",
      "lint": "tsc --noEmit",
      "test": "vitest run",
      "test:watch": "vitest",
      "test:coverage": "vitest run --coverage",
      "test:server": "vitest run --config server/vitest.config.ts"
    }
    ```
    NOTE: Do NOT change the `lint` script to include server/tsconfig.json yet — server/tsconfig.json does not exist until Plan 03-3. Adding `tsc -p server/tsconfig.json --noEmit` here would break `npm run lint`. Plan 03-3 will widen `lint` once `server/tsconfig.json` exists.

    Step 5 — Run `npm install`. If `better-sqlite3` fails to build (Windows without VS Build Tools), that is ACCEPTABLE per CONTEXT — optionalDependencies allows install to continue. Confirm `idb`, `zod`, `concurrently`, `fake-indexeddb`, `@types/better-sqlite3` are in `node_modules/`.

    Step 6 — Extend `src/test/setup.ts` to add fake-indexeddb manual setup. The final file MUST be exactly:
    ```typescript
    import '@testing-library/jest-dom/vitest';
    import { afterEach, beforeEach, vi } from 'vitest';
    import { cleanup } from '@testing-library/react';
    import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';

    afterEach(() => {
      cleanup();
    });

    // Fresh IndexedDB factory per test — full isolation, no cross-test state leak.
    // Manual assignment (NOT 'fake-indexeddb/auto') because Vitest setup-file load order
    // can leave 'auto' incomplete. See research §8.
    beforeEach(() => {
      (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
      (globalThis as unknown as { IDBKeyRange: typeof IDBKeyRange }).IDBKeyRange = IDBKeyRange;
    });

    // ResizeObserver polyfill — Recharts (FinancialTrendChart) requires it; jsdom does not provide it.
    class ResizeObserverPolyfill {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserverPolyfill }).ResizeObserver =
      ResizeObserverPolyfill;

    // matchMedia polyfill — some lucide / motion paths use it.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    // ImportTB.tsx imports @google/genai at module top level. The Gemini SDK
    // reads process env on construction; mock to avoid real network attempts in tests.
    vi.mock('@google/genai', () => ({
      GoogleGenAI: class GoogleGenAIMock {
        constructor() {}
      },
      Type: {},
    }));
    ```

    Step 7 — Create `server/vitest.config.ts` with this exact content:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { defineConfig } from 'vitest/config';
    import path from 'node:path';

    export default defineConfig({
      test: {
        environment: 'node',
        globals: false,
        include: ['server/**/*.test.ts'],
        exclude: ['node_modules', 'dist', 'server/dist'],
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '..'),
        },
      },
    });
    ```

    Step 8 — Update `.gitignore` to add (append at end if not already present):
    ```
    # Phase 3: SQLite + server build artefacts
    data/
    server/dist/
    *.db
    *.db-wal
    *.db-shm
    ```

    Step 9 — Verify everything compiles and existing tests pass:
    - `npm run lint` → exits 0
    - `npm run test` → all existing tests still pass (count should be 200 GREEN per phase 2 summary)
    - `npx vitest run --config server/vitest.config.ts` → exits 0 (empty server suite is allowed; Vitest reports "No test files found" but exits 0 when `--passWithNoTests` is the default — if it doesn't, that's fine because Task 2 creates server test files immediately).
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npm run test</automated>
  </verify>
  <acceptance_criteria>
    - `package.json` `dependencies` contains exact string `"idb": "^8.0.0"` and `"zod": "^3.23.8"`
    - `package.json` contains top-level `optionalDependencies` object containing `"better-sqlite3": "^11.7.0"`
    - `package.json` `devDependencies` contains `"concurrently": "^9.1.0"`, `"fake-indexeddb": "^6.0.0"`, `"@types/better-sqlite3": "^7.6.13"`
    - `package.json` `scripts` contains the literal string `"dev:server": "tsx watch server/index.ts"`
    - `package.json` `scripts` contains the literal string `"dev:full": "concurrently -k -n vite,api -c blue,magenta \"npm:dev\" \"npm:dev:server\""`
    - `package.json` `scripts` contains the literal string `"test:server": "vitest run --config server/vitest.config.ts"`
    - `package.json` `scripts` contains the literal string `"build:server": "tsc -p server/tsconfig.json"`
    - `package.json` `scripts` contains the literal string `"start:server": "node server/dist/index.js"`
    - `src/test/setup.ts` contains the literal substring `import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';`
    - `src/test/setup.ts` contains the literal substring `new IDBFactory()` inside a `beforeEach(`
    - `src/test/setup.ts` still contains the literal substring `vi.mock('@google/genai'` (preserved)
    - `src/test/setup.ts` still contains the literal substring `ResizeObserverPolyfill` (preserved)
    - `server/vitest.config.ts` exists and contains the literal substring `environment: 'node'`
    - `.gitignore` contains lines `data/` and `server/dist/` and `*.db`
    - `node_modules/idb/package.json` exists
    - `node_modules/zod/package.json` exists
    - `node_modules/concurrently/package.json` exists
    - `node_modules/fake-indexeddb/package.json` exists
    - `npm run lint` exits 0
    - `npm run test` exits 0
  </acceptance_criteria>
  <done>
    All new deps installed, scripts added, fake-indexeddb wired into test setup, server vitest config created, existing test suite green (no regressions).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Define StorageAdapter interface (FINAL with saveAuditLogs) + shared Zod schemas + scaffold all SPA-side Wave-0 test files</name>
  <files>
    src/storage/adapter.ts,
    src/lib/schemas.ts,
    src/storage/__tests__/local.test.ts,
    src/storage/__tests__/server.test.ts,
    src/storage/__tests__/index.test.ts,
    src/storage/__tests__/legacy-migration.test.ts,
    src/storage/__tests__/export.test.ts,
    src/storage/__tests__/import.test.ts,
    src/lib/migrations/__tests__/round-trip.test.ts,
    src/lib/migrations/__tests__/refuse-newer.test.ts,
    src/components/__tests__/DataPage.test.tsx,
    src/lib/__tests__/ai.test.ts
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/types.ts
    - A:/Projects/AussieLedger/src/lib/migrations/index.ts
    - A:/Projects/AussieLedger/src/lib/ai.ts
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-CONTEXT.md (export shape, REPLACE confirmation, legacy keys, "schemas shared between SPA and server")
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-RESEARCH.md §5 (adapter contract typing — copy verbatim), §7 (legacy migration), §12 (Zod schema)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-VALIDATION.md (exact `-t` test names — bind to vitest test names verbatim)
  </read_first>
  <behavior>
    - `src/storage/adapter.ts` defines `StorageAdapter` interface with **12 methods** (including `saveAuditLogs`), `AdapterKind` type, `AdapterUnreachableError` + `AdapterValidationError` classes
    - The interface is FINAL at Wave 0 — Plans 03-2 and 03-3 implement against this verbatim, neither widens it
    - `src/lib/schemas.ts` exports the Zod schemas for `Entity`, `Account`, `JournalLine`, `JournalEntry`, `AuditLog`, `PersistedRoot` — shared between SPA (used by `importAll()` validation) and server (imported by `server/lib/schema.ts` via relative path)
    - Test files import from `../adapter`, `../local`, `../server`, `../index` — local/server/index are EXPECTED to not yet exist; test files use `it.todo()` or skipped-with-reason placeholders so they fail loudly with "not yet implemented" or are listed as TODO, NOT with module-resolution errors
    - Each test file pins the exact `-t` test name from 03-VALIDATION.md so `<automated>` commands in plans 03-2/03-3/03-4 hit them
    - `src/storage/__tests__/local.test.ts` includes a test titled exactly `"data survives reopen"` (to match VALIDATION.md mapping)
    - `src/storage/__tests__/index.test.ts` includes tests titled `"selects server on health 200"`, `"falls back to local"`, `"honors storageMode override"`
    - `src/storage/__tests__/legacy-migration.test.ts` includes test titled `"preserves on failure"`
    - `src/lib/migrations/__tests__/round-trip.test.ts` includes test for `_v:0 → _v:2` ladder
    - `src/lib/__tests__/ai.test.ts` includes test titled `"server-mode flag"`
    - `src/components/__tests__/DataPage.test.tsx` includes tests `"import on empty"` and `"REPLACE confirmation"`
    - Adapter interface file MUST also be importable from server-side code (no React imports, no DOM globals)
    - Shared schemas file MUST also be importable from server-side code (pure zod, no React, no DOM globals)
  </behavior>
  <action>
    Step 1 — Create `src/storage/adapter.ts` with this exact content. The interface is FINAL at Wave 0; downstream plans implement against this verbatim (per 03-RESEARCH.md §5 + Code Skeletons):
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import type { Entity, Account, JournalEntry, AuditLog } from '../types';
    import type { PersistedRoot } from '../lib/migrations';

    /**
     * Per-collection coarse adapter API. Implementations: LocalAdapter (IndexedDB)
     * and ServerAdapter (HTTP → Express → better-sqlite3). Hooks consume only this
     * interface — they never know which backend is in use.
     *
     * Whole-collection save pattern is preserved from Phase 2 hooks: hooks pass
     * the full collection on every state change. Adapters MUST treat saveX() as
     * transactional whole-collection replace.
     *
     * Interface is FINAL at Wave 0 — Plans 03-2 (LocalAdapter) and 03-3
     * (ServerAdapter) implement this contract verbatim without widening.
     */
    export interface StorageAdapter {
      /** Resolves once the adapter is fully initialised and first read has landed. Idempotent. */
      ready(): Promise<void>;

      /** Per-collection coarse reads. Always returns the current full collection. */
      getEntities(): Promise<Entity[]>;
      getAccounts(): Promise<Account[]>;
      getEntries(): Promise<Record<string, JournalEntry[]>>;
      getAuditLogs(): Promise<AuditLog[]>;

      /** Per-collection coarse writes. Whole-collection replace, transactional. */
      saveEntities(entities: Entity[]): Promise<void>;
      saveAccounts(accounts: Account[]): Promise<void>;
      saveEntries(entries: Record<string, JournalEntry[]>): Promise<void>;
      /** Whole-collection replace of audit logs. Backs `useAuditLog`'s save useEffect. */
      saveAuditLogs(logs: AuditLog[]): Promise<void>;

      /** Append-only audit log; cheaper than full re-save when only one log is added. */
      appendAuditLog(log: AuditLog): Promise<void>;

      /** Full state snapshot for export. */
      exportAll(): Promise<PersistedRoot>;

      /** Replace all state from a (migrated) PersistedRoot. Atomic. */
      importAll(state: PersistedRoot): Promise<void>;
    }

    /** Discriminator for diagnostics / status line on Data page. */
    export type AdapterKind = 'local' | 'server';

    /** Health probe response shape from /api/health. */
    export interface HealthResponse {
      ok: true;
      version: number;
      aiEnabled: boolean;
    }

    /** Thrown when a network adapter cannot reach its server. */
    export class AdapterUnreachableError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'AdapterUnreachableError';
      }
    }

    /** Thrown when a payload fails Zod validation at the adapter boundary. */
    export class AdapterValidationError extends Error {
      constructor(message: string, public issues?: unknown) {
        super(message);
        this.name = 'AdapterValidationError';
      }
    }
    ```

    Step 1b — Create `src/lib/schemas.ts` with the shared Zod schemas. Server-side code (`server/lib/schema.ts` in Plan 03-3) will re-export these so a SINGLE source of truth governs both SPA `importAll()` validation and server `POST /api/import` validation (per CONTEXT line: "shared between SPA and server (defence-in-depth)"):
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * Shared validation schemas — same module is imported by:
     *   - SPA: `src/storage/local.ts` `importAll()` validates inbound state before write
     *   - Server: `server/lib/schema.ts` re-exports these for `POST /api/import` validation
     *
     * Pure zod. No React. No DOM globals. Safe to import from node-env tests.
     */
    import { z } from 'zod';

    export const EntitySchema = z.object({
      _v: z.number().optional(),
      id: z.string(),
      name: z.string(),
      type: z.string(),
      registrationNumber: z.string().optional(),
      businessAddress: z.string().optional(),
      contactPerson: z.string().optional(),
      status: z.enum(['Active', 'Archived', 'Deactivated']),
      taxAgentName: z.string().optional(),
      taxAgentPhone: z.string().optional(),
      taxAgentEmail: z.string().optional(),
      notes: z.string().optional(),
    });

    export const AccountSchema = z.object({
      _v: z.number().optional(),
      id: z.string(),
      code: z.string(),
      name: z.string(),
      type: z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']),
      taxLabel: z.string().optional(),
      companyTaxLabel: z.string().optional(),
      trustTaxLabel: z.string().optional(),
      partnershipTaxLabel: z.string().optional(),
      gstCode: z.enum(['GST', 'FRE', 'INP', 'N-T', 'CAP']),
      _needsReview: z.boolean().optional(),
    });

    export const JournalLineSchema = z.object({
      _v: z.number().optional(),
      accountId: z.string(),
      description: z.string(),
      debit: z.number(),
      credit: z.number(),
      taxAmount: z.number(),
      isManualTax: z.boolean().optional(),
    });

    export const JournalEntrySchema = z.object({
      _v: z.number().optional(),
      id: z.string(),
      date: z.string(),
      reference: z.string(),
      description: z.string(),
      lines: z.array(JournalLineSchema),
      isPosted: z.boolean(),
    });

    export const AuditLogSchema = z.object({
      _v: z.number().optional(),
      id: z.string(),
      timestamp: z.string(),
      user: z.string(),
      action: z.enum(['CREATE_ENTITY', 'UPDATE_ENTITY', 'POST_JOURNAL', 'DELETE_JOURNAL', 'IMPORT_DATA']),
      entityId: z.string().optional(),
      details: z.string(),
    });

    export const PersistedRootSchema = z.object({
      _v: z.number(),
      entities: z.array(EntitySchema),
      accounts: z.array(AccountSchema),
      allEntries: z.record(z.string(), z.array(JournalEntrySchema)),
      auditLogs: z.array(AuditLogSchema),
    });

    export type ValidatedEntity = z.infer<typeof EntitySchema>;
    export type ValidatedAccount = z.infer<typeof AccountSchema>;
    export type ValidatedJournalEntry = z.infer<typeof JournalEntrySchema>;
    export type ValidatedAuditLog = z.infer<typeof AuditLogSchema>;
    export type ValidatedPersistedRoot = z.infer<typeof PersistedRootSchema>;
    ```

    Step 2 — Create `src/storage/__tests__/local.test.ts` with skeleton tests. Tests use `it.todo()` where implementation is still pending (so they show as TODO not RED, matching Phase 2's convention with 11 TODOs):
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';
    // Phase 3 Plan 03-2 will implement `LocalAdapter` and these tests will go GREEN.
    // import { LocalAdapter } from '../local';

    describe('LocalAdapter (IndexedDB)', () => {
      it.todo('data survives reopen (FND-01 IDB persistence)');
      it.todo('empty initial state returns DEFAULT_ENTITIES via hook, not from adapter');
      it.todo('saveEntities then getEntities returns identical array');
      it.todo('saveEntries with multi-entity map preserves keys');
      it.todo('appendAuditLog prepends to existing logs');
      it.todo('saveAuditLogs replaces whole audit log collection');
      it.todo('importAll replaces all collections atomically');
      it.todo('exportAll returns PersistedRoot with _v = CURRENT_VERSION');
      it.todo('ready() resolves after init completes');
      it.todo('ready() is idempotent (resolves the same promise on repeat calls)');
    });
    ```

    Step 3 — Create `src/storage/__tests__/server.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';
    // Phase 3 Plan 03-3 will implement `ServerAdapter` (HTTP shim).
    // import { ServerAdapter } from '../server';

    describe('ServerAdapter (HTTP)', () => {
      it.todo('getEntities issues GET /api/entities and parses JSON');
      it.todo('saveEntities issues PUT /api/entities with JSON body');
      it.todo('appendAuditLog issues POST /api/audit');
      it.todo('saveAuditLogs issues PUT /api/audit with array body');
      it.todo('exportAll issues GET /api/export');
      it.todo('importAll issues POST /api/import');
      it.todo('throws AdapterUnreachableError on 500');
      it.todo('throws AdapterValidationError on 400');
      it.todo('deserialises Decimal-as-string TEXT values from server via src/lib/money.ts');
    });
    ```

    Step 4 — Create `src/storage/__tests__/index.test.ts` (test names bound to VALIDATION.md):
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';
    // Phase 3 Plan 03-2 / 03-3 will implement `initAdapter()` / `getAdapter()`.
    // import { initAdapter, getAdapter, getAdapterKind } from '../index';

    describe('Adapter selection probe', () => {
      it.todo('selects server on health 200');
      it.todo('falls back to local');
      it.todo('honors storageMode override');
      it.todo('memoises adapter promise across calls');
      it.todo('stashes /api/health aiEnabled flag for IS_AI_ENABLED');
      it.todo('records fallback-occurred flag when probe was attempted and exhausted');
    });
    ```

    Step 5 — Create `src/storage/__tests__/legacy-migration.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';
    // Phase 3 Plan 03-2 will implement legacy migration as part of LocalAdapter init.

    describe('localStorage → IndexedDB legacy migration', () => {
      it.todo('reads ledger_entities_list, ledger_all_entries, ledger_chart_of_accounts, ledger_audit_logs');
      it.todo('runs assembled blob through migrate() ladder');
      it.todo('writes migrated state to IndexedDB');
      it.todo('clears the four legacy keys ONLY after writes succeed');
      it.todo('preserves on failure: parse error leaves localStorage untouched and surfaces MigrationError');
      it.todo('no-op when IndexedDB already populated');
      it.todo('uses navigator.locks.request when available');
    });
    ```

    Step 6 — Create `src/storage/__tests__/export.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';
    // Phase 3 Plan 03-2 will implement exportAll() on LocalAdapter.

    describe('Export shape (FND-02 JSON)', () => {
      it.todo('returns { _v: 2, entities, accounts, allEntries, auditLogs }');
      it.todo('_v matches CURRENT_VERSION from src/lib/migrations');
      it.todo('allEntries is keyed by entity id');
      it.todo('empty collections serialise as empty arrays / empty object');
    });
    ```

    Step 7 — Create `src/storage/__tests__/import.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';
    // Phase 3 Plan 03-2 will implement importAll() on LocalAdapter.

    describe('Import round-trip (FND-03)', () => {
      it.todo('round-trip: export → fresh adapter → importAll → exportAll equal');
      it.todo('importAll on populated adapter replaces all collections atomically');
      it.todo('importAll runs Zod validation (PersistedRootSchema from src/lib/schemas.ts) before write');
      it.todo('importAll passes input through migrate() ladder first');
    });
    ```

    Step 8 — Create `src/lib/migrations/__tests__/round-trip.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';
    // Phase 3 Plan 03-2 will wire migrate() to adapter.importAll/exportAll.

    describe('Migration round-trip (success criterion #5)', () => {
      it.todo('hand-built _v:0 blob → migrate() → importAll → exportAll === migrated');
      it.todo('_v:0 fixture is the most-stale shape: no _v field, no partnershipTaxLabel, 3-code GST set');
      it.todo('no data loss across v0 → v1 → v2 ladder');
    });
    ```

    Step 9 — Create `src/lib/migrations/__tests__/refuse-newer.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect } from 'vitest';
    import { migrate, CURRENT_VERSION } from '../index';

    describe('Migration refuse-newer guard (FND-03)', () => {
      // This test CAN run today — migrate() already throws on newer _v.
      it('throws when _v > CURRENT_VERSION (refuses downgrade)', () => {
        const future: Record<string, unknown> = { _v: CURRENT_VERSION + 1, entities: [] };
        expect(() => migrate(future)).toThrow(/newer than the application version/);
      });

      it.todo('import flow renders MigrationError component when refuse-newer fires');
    });
    ```

    Step 10 — Create `src/components/__tests__/DataPage.test.tsx`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';
    // Phase 3 Plan 03-4 will implement DataPage.tsx.

    describe('DataPage (FND-02 / FND-03 UI)', () => {
      it.todo('renders Export button');
      it.todo('renders Import file picker');
      it.todo('shows current adapter kind ("Local (IndexedDB)" or "Server (SQLite)")');
      it.todo('shows current schema version');
      it.todo('shows last-export timestamp from meta store');
      it.todo('shows empty-state copy when no exports yet');
      it.todo('import on empty: single confirmation, then importAll fires');
      it.todo('import with existing data: REPLACE confirmation required (literal uppercase, case-sensitive)');
      it.todo('rejects REPLACE when user types wrong text (case mismatch or partial)');
      it.todo('Export action downloads file named aussieledger-YYYY-MM-DD-HHmm.json');
      it.todo('renders adapter-fallback banner when probe attempted and exhausted');
    });
    ```

    Step 11 — Create `src/lib/__tests__/ai.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';
    // Phase 3 Plan 03-3 will widen IS_AI_ENABLED to read from /api/health.aiEnabled.

    describe('IS_AI_ENABLED widened (Phase 3)', () => {
      it.todo('local-mode flag derives from import.meta.env.VITE_GEMINI_API_KEY (unchanged from Phase 2)');
      it.todo('server-mode flag derives from /api/health.aiEnabled');
      it.todo('returns false when key is the placeholder MY_GEMINI_API_KEY');
    });
    ```

    Step 12 — Verify with `npm run lint && npm run test`. All new test files must parse and load (so `npm run test` lists them but reports `.todo` skips). The one real test in `refuse-newer.test.ts` must pass. The 200 existing tests must continue passing.
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npm run test</automated>
  </verify>
  <acceptance_criteria>
    - `src/storage/adapter.ts` exists and contains literal `export interface StorageAdapter`
    - `src/storage/adapter.ts` contains literal `export class AdapterUnreachableError extends Error`
    - `src/storage/adapter.ts` contains literal `export class AdapterValidationError extends Error`
    - `src/storage/adapter.ts` contains literal `export type AdapterKind = 'local' | 'server'`
    - `src/storage/adapter.ts` contains literal `export interface HealthResponse`
    - `src/storage/adapter.ts` contains all 12 method signatures including `saveAuditLogs(logs: AuditLog[]): Promise<void>` AND `appendAuditLog(log: AuditLog): Promise<void>` AND `saveEntries(entries: Record<string, JournalEntry[]>): Promise<void>` AND the other 9 (`ready`, `getEntities`, `getAccounts`, `getEntries`, `getAuditLogs`, `saveEntities`, `saveAccounts`, `exportAll`, `importAll`)
    - `src/lib/schemas.ts` contains literal `export const PersistedRootSchema = z.object`
    - `src/lib/schemas.ts` contains literal `export const EntitySchema` AND `export const AccountSchema` AND `export const JournalLineSchema` AND `export const JournalEntrySchema` AND `export const AuditLogSchema`
    - `src/storage/__tests__/local.test.ts` contains literal substring `'data survives reopen'`
    - `src/storage/__tests__/local.test.ts` contains literal substring `'saveAuditLogs replaces whole audit log collection'`
    - `src/storage/__tests__/index.test.ts` contains literal substrings `'selects server on health 200'` AND `'falls back to local'` AND `'honors storageMode override'`
    - `src/storage/__tests__/legacy-migration.test.ts` contains literal substring `'preserves on failure'`
    - `src/lib/__tests__/ai.test.ts` contains literal substring `'server-mode flag'`
    - `src/components/__tests__/DataPage.test.tsx` contains literal substrings `'import on empty'` AND `'REPLACE confirmation'`
    - `src/lib/migrations/__tests__/refuse-newer.test.ts` contains a runnable (non-todo) `it(` block that calls `migrate({_v: CURRENT_VERSION + 1, ...})` and expects throw
    - `npm run lint` exits 0
    - `npm run test` exits 0 with all existing tests GREEN, refuse-newer test GREEN, all other new tests as TODO (not RED)
    - Running `npx vitest run src/lib/migrations/__tests__/refuse-newer.test.ts` exits 0 with at least one passing test
  </acceptance_criteria>
  <done>
    StorageAdapter interface (12 methods including saveAuditLogs) FINAL + shared Zod schemas in src/lib/schemas.ts + 10 SPA-side test files exist; lint passes; test suite green with new TODO entries; one runnable test (`refuse-newer`) passes against the existing migrate() function. Plans 03-2 and 03-3 implement against this interface verbatim; neither widens it.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Scaffold server-side Wave-0 test files + integration smoke script</name>
  <files>
    server/__tests__/persistence.test.ts,
    server/__tests__/atomicity.test.ts,
    server/__tests__/import-validation.test.ts,
    server/__tests__/bind.test.ts,
    server/db/__tests__/migrate.test.ts,
    server/routes/__tests__/health.test.ts,
    scripts/test-dev-full.mjs
  </files>
  <read_first>
    - A:/Projects/AussieLedger/server/vitest.config.ts (just created in Task 1)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-CONTEXT.md (server API surface section)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-RESEARCH.md §4 (server file layout), §9 (transactional replace), §11 (migration runner)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-VALIDATION.md (server-side test commands)
  </read_first>
  <behavior>
    - 6 server-side `*.test.ts` files exist under `server/__tests__/`, `server/db/__tests__/`, `server/routes/__tests__/`
    - Each is a skeleton with `it.todo()` placeholders — they don't yet import the server modules (which don't exist until Plan 03-3) but the test NAMES from 03-VALIDATION.md are pinned
    - `npx vitest run --config server/vitest.config.ts` exits 0 (all .todo)
    - `scripts/test-dev-full.mjs` exists and is executable as `node scripts/test-dev-full.mjs` — but it MAY exit non-zero because dev:full requires the server to be implemented (this is acceptable for Wave 0; Plan 03-4 makes it pass)
  </behavior>
  <action>
    Step 1 — Create `server/__tests__/persistence.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';
    // Phase 3 Plan 03-3 implements `server/db/client.ts` and the routes.

    describe('SQLite persistence (FND-01)', () => {
      it.todo('survives restart: write entity → close DB → reopen → entity still present');
      it.todo('whole-collection replace via PUT /api/entities is atomic');
      it.todo('WAL mode enabled (pragma journal_mode = WAL)');
      it.todo('foreign keys enabled (pragma foreign_keys = ON)');
    });
    ```

    Step 2 — Create `server/__tests__/atomicity.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';

    describe('Transactional whole-collection replace (DEP-02)', () => {
      it.todo('rolls back PUT /api/entities on insert error (e.g. unique constraint)');
      it.todo('rolls back PUT /api/entries on child-row error');
      it.todo('POST /api/import wraps all four replaces in a single outer transaction');
      it.todo('partial state never visible on failure');
    });
    ```

    Step 3 — Create `server/__tests__/import-validation.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';

    describe('POST /api/import Zod validation (FND-03)', () => {
      it.todo('rejects malformed body with 400 and { error: "validation", details: ... }');
      it.todo('accepts valid PersistedRoot');
      it.todo('runs migrate() before validation (older _v accepted)');
      it.todo('refuses _v > CURRENT_VERSION with 400');
      it.todo('uses PersistedRootSchema from src/lib/schemas.ts (shared with SPA)');
    });
    ```

    Step 4 — Create `server/__tests__/bind.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';

    describe('Express bind security default (DEP-02)', () => {
      it.todo('binds to 127.0.0.1 by default (HOST env var unset)');
      it.todo('binds to 0.0.0.0 only when HOST=0.0.0.0 explicit');
      it.todo('uses PORT env var when set, else 4000');
    });
    ```

    Step 5 — Create `server/db/__tests__/migrate.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';

    describe('Server migration runner (DEP-02)', () => {
      it.todo('001-initial: creates entities, accounts, journal_entries, journal_lines, audit_logs, schema_migrations tables');
      it.todo('001-initial: accounts_code_idx exists as unique index');
      it.todo('001-initial: journal_entries.entity_id FK ON DELETE CASCADE');
      it.todo('runs migrations in alphabetical order');
      it.todo('idempotent: second run is no-op (no duplicate apply)');
      it.todo('records each applied migration in schema_migrations with timestamp');
      it.todo('throws on .sql syntax error and leaves transaction rolled back');
    });
    ```

    Step 6 — Create `server/routes/__tests__/health.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';

    describe('GET /api/health (DEP-02 + AI proxy)', () => {
      it.todo('returns { ok: true, version: 2, aiEnabled: boolean }');
      it.todo('aiEnabled = true when GEMINI_API_KEY set and not MY_GEMINI_API_KEY');
      it.todo('aiEnabled = false when key unset');
      it.todo('aiEnabled = false when key is placeholder MY_GEMINI_API_KEY');
    });
    ```

    Step 7 — Create `scripts/test-dev-full.mjs` (per 03-VALIDATION.md and 03-RESEARCH.md):
    ```javascript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * Integration smoke for `npm run dev:full`:
     *   1. Spawn `npm run dev:full`
     *   2. Poll http://localhost:4000/api/health for up to 30s
     *   3. Assert response is { ok: true, version: 2, aiEnabled: <bool> }
     *   4. Kill the spawned process tree (concurrently -k handles children)
     *
     * Exits 0 on success, 1 on failure.
     * Plan 03-4 wires the dev:full script and the server into a passing state.
     * Wave 0 ships this script as the integration-test entry point.
     */
    import { spawn } from 'node:child_process';
    import process from 'node:process';

    const PROBE_URL = 'http://localhost:4000/api/health';
    const TIMEOUT_MS = 30_000;
    const POLL_INTERVAL_MS = 500;

    async function pollHealth() {
      const start = Date.now();
      while (Date.now() - start < TIMEOUT_MS) {
        try {
          const res = await fetch(PROBE_URL);
          if (res.ok) {
            const body = await res.json();
            if (body && body.ok === true && typeof body.version === 'number' && typeof body.aiEnabled === 'boolean') {
              return body;
            }
          }
        } catch {
          // not ready yet
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      }
      throw new Error(`Health probe timed out after ${TIMEOUT_MS}ms`);
    }

    const child = spawn('npm', ['run', 'dev:full'], {
      stdio: ['ignore', 'inherit', 'inherit'],
      shell: process.platform === 'win32',
      detached: false,
    });

    let exitCode = 1;
    try {
      const health = await pollHealth();
      console.log('[test-dev-full] /api/health responded:', JSON.stringify(health));
      exitCode = 0;
    } catch (err) {
      console.error('[test-dev-full] FAIL:', err && err.message ? err.message : err);
      exitCode = 1;
    } finally {
      // concurrently -k kills its child processes when the parent dies
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(child.pid), '/f', '/t']);
        } else {
          child.kill('SIGTERM');
        }
      } catch {}
      process.exit(exitCode);
    }
    ```

    Step 8 — Verify:
    - `npx vitest run --config server/vitest.config.ts` exits 0 (all `.todo` is acceptable)
    - `node scripts/test-dev-full.mjs` IS allowed to fail at this point (server doesn't exist yet) — DO NOT include this in the verify command. The script's existence and shape is what matters.
  </action>
  <verify>
    <automated>npm run test:server</automated>
  </verify>
  <acceptance_criteria>
    - `server/__tests__/persistence.test.ts` exists and contains literal `'survives restart'` as a test name fragment
    - `server/__tests__/atomicity.test.ts` exists and contains literal `'rolls back'`
    - `server/__tests__/import-validation.test.ts` exists and contains literal `'rejects malformed body with 400'`
    - `server/__tests__/bind.test.ts` exists and contains literal `'127.0.0.1'`
    - `server/db/__tests__/migrate.test.ts` exists and contains literal `'001-initial'`
    - `server/routes/__tests__/health.test.ts` exists and contains literal `"{ ok: true, version: 2, aiEnabled: boolean }"` (escape as needed; the literal must appear as a test description)
    - `scripts/test-dev-full.mjs` exists, starts with `import { spawn } from 'node:child_process'`, and contains literal `http://localhost:4000/api/health`
    - `npm run test:server` exits 0 (all `.todo` tests skip cleanly)
    - `npm run lint` exits 0 (no server tsconfig needed yet — these .ts files import only vitest globals)
  </acceptance_criteria>
  <done>
    6 server-side test scaffolds in place; `npm run test:server` runs and exits 0; `scripts/test-dev-full.mjs` is the integration entry point that Plan 03-4 will make pass.
  </done>
</task>

</tasks>

<verification>
After all three tasks complete:

1. `npm run lint` exits 0
2. `npm run test` exits 0 — count is 200 prior tests + 1 new refuse-newer test = 201 GREEN; many new TODOs counted but not RED
3. `npm run test:server` exits 0 — 0 GREEN, all `.todo`
4. `node_modules/idb/package.json` and `node_modules/zod/package.json` and `node_modules/fake-indexeddb/package.json` and `node_modules/concurrently/package.json` all exist
5. `package.json` has new scripts: `dev:server`, `dev:full`, `build:server`, `start:server`, `test:server`
6. `package.json` has new top-level `optionalDependencies` section with `better-sqlite3`
7. `src/storage/adapter.ts` is the canonical interface contract (FINAL — 12 methods including saveAuditLogs)
8. `src/lib/schemas.ts` is the canonical shared Zod schema set (SPA + server)
9. 6 SPA test scaffolds in `src/storage/__tests__/`
10. 2 SPA migration tests in `src/lib/migrations/__tests__/`
11. 1 SPA component test scaffold in `src/components/__tests__/DataPage.test.tsx`
12. 1 SPA AI test scaffold in `src/lib/__tests__/ai.test.ts`
13. 6 server test scaffolds across `server/__tests__/`, `server/db/__tests__/`, `server/routes/__tests__/`
14. `scripts/test-dev-full.mjs` exists
15. `.gitignore` updated for `data/`, `server/dist/`, `*.db*`
</verification>

<success_criteria>
- `src/storage/adapter.ts` is committed and exports `StorageAdapter` (12 methods including `saveAuditLogs`), `AdapterKind`, `HealthResponse`, `AdapterUnreachableError`, `AdapterValidationError`
- `src/lib/schemas.ts` is committed and exports `PersistedRootSchema`, `EntitySchema`, `AccountSchema`, `JournalLineSchema`, `JournalEntrySchema`, `AuditLogSchema`
- All 21 Wave-0 files from 03-VALIDATION.md exist with at least skeleton content
- `npm run test` and `npm run test:server` both exit 0
- Plans 03-2 and 03-3 can begin in parallel because they share the FINAL interface contract AND shared schemas from this plan
- All 4 requirements (FND-01, FND-02, FND-03, DEP-02) are addressed at the test-scaffold level (real implementations come in 03-2/03-3/03-4)
</success_criteria>

<output>
After completion, create `.planning/phases/03-durable-persistence/03-1-SUMMARY.md` summarising:
- Files created (count + key paths — including the new `src/lib/schemas.ts`)
- Files modified (package.json, src/test/setup.ts, .gitignore)
- Tests: count GREEN / RED / TODO (expected: 201 GREEN, 0 RED, ~50+ TODO across all new files)
- Dependency installation status (especially whether better-sqlite3 native build succeeded on Windows; ACCEPTABLE if it failed — optionalDependencies)
- Hand-off to 03-2 and 03-3: both can begin in parallel; both consume `src/storage/adapter.ts` AND `src/lib/schemas.ts` (interface is FINAL — neither plan widens it)
</output>
