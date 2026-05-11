---
phase: 03-durable-persistence
plan: 3
type: execute
wave: 2
depends_on: [1]
files_modified:
  - server/tsconfig.json
  - server/index.ts
  - server/app.ts
  - server/env.ts
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
  - server/__tests__/persistence.test.ts
  - server/__tests__/atomicity.test.ts
  - server/__tests__/import-validation.test.ts
  - server/__tests__/bind.test.ts
  - server/db/__tests__/migrate.test.ts
  - server/routes/__tests__/health.test.ts
  - src/storage/server.ts
  - src/components/ImportTB.tsx
  - src/components/__tests__/ImportTB.test.tsx
  - src/lib/ai.ts
  - src/lib/__tests__/ai.test.ts
  - package.json
autonomous: true
requirements:
  - DEP-02
  - FND-01
  - FND-03
must_haves:
  truths:
    - "`npm run start:server` boots Express on 127.0.0.1:4000 with /api/health responding `{ ok: true, version: 2, aiEnabled: <bool> }`"
    - "SQLite at `./data/ledger.db` is created on first boot; schema_migrations table tracks applied migrations"
    - "001-initial.sql produces 6 tables (entities, accounts, journal_entries, journal_lines, audit_logs, schema_migrations) with FK CASCADE on entries->lines"
    - "PUT /api/entities replaces all entities transactionally; rollback on insert error"
    - "POST /api/import validates body with PersistedRootSchema from src/lib/schemas.ts (shared SPA + server), runs migrate() first, replaces all in single outer transaction"
    - "POST /api/ai/match-accounts forwards Gemini request server-side using server-held GEMINI_API_KEY"
    - "ImportTB.tsx makes Gemini calls via `/api/ai/match-accounts` in server mode (no key in client bundle)"
    - "IS_AI_ENABLED is widened: server mode reads from /api/health.aiEnabled (via getCachedHealth())"
    - "ServerAdapter (src/storage/server.ts) replaces the Plan 03-2 stub with full HTTP implementation; runs server-returned decimal strings through src/lib/money.ts deserialize at the read boundary"
    - "ServerAdapter implements all 12 methods from the FINAL StorageAdapter interface (Plan 03-1) — no widening"
  artifacts:
    - path: "server/tsconfig.json"
      provides: "TS config with rootDir='..' and include covering server/**/*.ts AND src/lib/migrations/**/*.ts AND src/lib/schemas.ts; outDir='server/dist'"
      contains: "rootDir"
    - path: "server/app.ts"
      provides: "buildApp() factory that wires routes onto an Express instance; NO app.listen() call"
      exports: ["buildApp"]
    - path: "server/index.ts"
      provides: "Imports buildApp from ./app and calls app.listen(env.port, env.host)"
      contains: "app.listen(env.port, env.host"
    - path: "server/db/migrations/001-initial.sql"
      provides: "Schema for _v:2: 6 tables, FKs, indexes; matches PersistedRoot shape"
      contains: "CREATE TABLE entities"
    - path: "server/db/migrate.ts"
      provides: "Numbered .sql migration runner; idempotent via schema_migrations table"
      exports: ["runMigrations"]
    - path: "server/lib/schema.ts"
      provides: "Re-exports shared Zod schemas from src/lib/schemas.ts (single source of truth — SPA + server)"
      exports: ["PersistedRootSchema", "EntitySchema", "AccountSchema", "JournalLineSchema", "JournalEntrySchema", "AuditLogSchema"]
    - path: "src/storage/server.ts"
      provides: "ServerAdapter (HTTP) replacing the Plan 03-2 stub; full StorageAdapter impl; deserialises decimal-as-string values on read boundary via src/lib/money.ts"
      exports: ["ServerAdapter"]
    - path: "src/lib/ai.ts"
      provides: "IS_AI_ENABLED widened to isAiEnabled() function reading getCachedHealth() in server mode; exports GEMINI_MODEL constant"
      exports: ["isAiEnabled", "IS_AI_ENABLED", "GEMINI_MODEL"]
    - path: "src/components/ImportTB.tsx"
      provides: "runAIMapping uses fetch('/api/ai/match-accounts'); imports GEMINI_MODEL from src/lib/ai.ts; SDK call removed"
      contains: "/api/ai/match-accounts"
    - path: "src/components/__tests__/ImportTB.test.tsx"
      provides: "Updated mocks for /api/ai/match-accounts fetch path (replaces stale GoogleGenAI mocks if present)"
      contains: "/api/ai/match-accounts"
  key_links:
    - from: "server/index.ts"
      to: "server/app.ts"
      via: "import { buildApp } from './app'"
      pattern: "from ['\"]\\./app['\"]"
    - from: "server/app.ts"
      to: "server/db/migrate.ts"
      via: "runMigrations(db) on boot"
      pattern: "runMigrations"
    - from: "server/lib/schema.ts"
      to: "src/lib/schemas.ts"
      via: "re-export from shared SPA module"
      pattern: "from ['\"]\\.\\./\\.\\./src/lib/schemas['\"]"
    - from: "server/routes/exportImport.ts"
      to: "server/lib/schema.ts"
      via: "PersistedRootSchema.parse(body)"
      pattern: "PersistedRootSchema"
    - from: "src/storage/server.ts"
      to: "/api"
      via: "fetch GET/PUT/POST"
      pattern: "fetch\\('/api"
    - from: "src/storage/server.ts"
      to: "src/lib/money.ts"
      via: "deserialize() applied to decimal-as-string TEXT values on read boundary"
      pattern: "deserialize"
    - from: "src/components/ImportTB.tsx"
      to: "/api/ai/match-accounts"
      via: "fetch POST when isAiEnabled() and server mode"
      pattern: "/api/ai/match-accounts"
    - from: "src/lib/ai.ts"
      to: "src/storage/index.ts"
      via: "getCachedHealth().aiEnabled"
      pattern: "getCachedHealth"
---

<objective>
Implement the Express + better-sqlite3 server, the full ServerAdapter HTTP implementation (replacing Plan 03-2's stub), the Gemini AI proxy route, and widen IS_AI_ENABLED to read from /api/health in server mode. After this plan, `npm run dev:server` boots a working server; `npm run dev:full` (when combined with Plan 03-4 wiring) starts both processes; FND-01 server-shape (file-on-disk durability) is satisfied; DEP-02 is delivered.

Purpose: Provides the SQLite half of the dual-deployment story. Closes the "Gemini key in client bundle" concern from Phase 2 by moving the call server-side. Parallel-executable with Plan 03-2 because both consume the same FINAL `src/storage/adapter.ts` interface (12 methods, including `saveAuditLogs`) AND the same shared Zod schemas from Plan 03-1 (`src/lib/schemas.ts`).

CRITICAL boundary rules:
1. **Decimal precision boundary.** Server stores Decimal values in SQLite TEXT columns. Server READS those columns and returns them in HTTP responses AS STRINGS (no `parseFloat`). The SPA's `ServerAdapter` then runs the string values through `deserialize()` from `src/lib/money.ts` before returning to the hook. This preserves Decimal precision end-to-end.
2. **Schema sharing.** Server's `server/lib/schema.ts` is a thin re-export from `src/lib/schemas.ts` (the canonical shared module created in Plan 03-1). One source of truth governs both SPA `importAll()` validation and server `POST /api/import` validation (defence-in-depth per CONTEXT).
3. **Gemini model literal.** The model name (`'gemini-3-flash-preview'`) is exported as `GEMINI_MODEL` from `src/lib/ai.ts` and imported by both `src/components/ImportTB.tsx` and the server's `server/routes/ai.ts` default. No more duplicated string literal.

Output:
- server/ directory with ~13 TypeScript files implementing the Express app (app.ts + index.ts split), DB layer, migration runner, and 7 route modules
- server/db/migrations/001-initial.sql defining the 6-table schema
- server/tsconfig.json with rootDir='..' so `src/lib/migrations` AND `src/lib/schemas` are reachable
- server/lib/schema.ts re-exporting from src/lib/schemas.ts
- src/storage/server.ts FULL implementation (replacing Plan 03-2 stub) with money.ts deserialise boundary
- src/lib/ai.ts widened to be runtime-aware + GEMINI_MODEL constant exported
- src/components/ImportTB.tsx Gemini call moved to fetch('/api/ai/match-accounts')
- src/components/__tests__/ImportTB.test.tsx updated mocks (if file exists — verified at planning time: YES, file exists from Phase 2)
- All server-side tests GREEN; src/lib/__tests__/ai.test.ts widened tests GREEN
- package.json `lint` widened to include `tsc -p server/tsconfig.json --noEmit`
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/03-durable-persistence/03-CONTEXT.md
@.planning/phases/03-durable-persistence/03-RESEARCH.md
@.planning/phases/03-durable-persistence/03-VALIDATION.md
@.planning/phases/03-durable-persistence/03-1-PLAN.md
@src/storage/adapter.ts
@src/lib/schemas.ts
@src/lib/money.ts
@src/types.ts
@src/lib/ai.ts
@src/components/ImportTB.tsx
@src/components/__tests__/ImportTB.test.tsx
@src/lib/migrations/index.ts

<interfaces>
<!-- The StorageAdapter contract this plan must implement on the HTTP side -->
<!-- FINAL from Plan 03-1; do not modify. -->

From src/storage/adapter.ts (Plan 03-1, FINAL):
```typescript
export interface StorageAdapter {
  ready(): Promise<void>;
  getEntities(): Promise<Entity[]>;
  getAccounts(): Promise<Account[]>;
  getEntries(): Promise<Record<string, JournalEntry[]>>;
  getAuditLogs(): Promise<AuditLog[]>;
  saveEntities(entities: Entity[]): Promise<void>;
  saveAccounts(accounts: Account[]): Promise<void>;
  saveEntries(entries: Record<string, JournalEntry[]>): Promise<void>;
  saveAuditLogs(logs: AuditLog[]): Promise<void>;
  appendAuditLog(log: AuditLog): Promise<void>;
  exportAll(): Promise<PersistedRoot>;
  importAll(state: PersistedRoot): Promise<void>;
}
export interface HealthResponse { ok: true; version: number; aiEnabled: boolean; }
export class AdapterUnreachableError extends Error { ... }
export class AdapterValidationError extends Error { ... }
```

From src/lib/schemas.ts (Plan 03-1, SHARED):
```typescript
export const EntitySchema, AccountSchema, JournalLineSchema, JournalEntrySchema, AuditLogSchema, PersistedRootSchema (zod);
export type ValidatedEntity, ValidatedAccount, ValidatedJournalEntry, ValidatedAuditLog, ValidatedPersistedRoot;
```
Server's `server/lib/schema.ts` MUST re-export these. Single source of truth.

From src/lib/money.ts (Phase 1):
```typescript
export function serialize(d: Decimal): string;   // Decimal -> TEXT for storage
export function deserialize(s: string): Decimal; // TEXT -> Decimal on read
```
ServerAdapter MUST call `deserialize` on JournalLine `debit`/`credit`/`taxAmount` values when reading from the server (which returns them as strings, preserving precision).

REST API surface (from CONTEXT):
- GET /api/health -> { ok: true, version: 2, aiEnabled: boolean }
- GET /api/entities -> Entity[]
- PUT /api/entities body Entity[] -> 200 (whole-collection replace, transactional)
- GET /api/accounts -> Account[]
- PUT /api/accounts body Account[] -> 200
- GET /api/entries -> Record<string, JournalEntry[]> (entity-id keyed map). Decimal fields returned AS STRINGS (no parseFloat server-side).
- PUT /api/entries body Record<string, JournalEntry[]> -> 200
- GET /api/audit -> AuditLog[]
- POST /api/audit body AuditLog -> 200 (append)
- PUT /api/audit body AuditLog[] -> 200 (whole-collection replace, used by saveAuditLogs)
- GET /api/export -> 200 with PersistedRoot JSON (decimals AS STRINGS)
- POST /api/import body PersistedRoot -> 200 (replace-all, transactional)
- POST /api/ai/match-accounts body { prompt: string, schema: ... } -> Gemini response shape

ENV vars (from CONTEXT specifics section):
- PORT (default 4000)
- HOST (default 127.0.0.1)
- DB_PATH (default ./data/ledger.db)
- GEMINI_API_KEY (optional)

Plan 03-2 stub (src/storage/server.ts) - REPLACE entirely with full HTTP impl in this plan.

Phase-2 test file: `src/components/__tests__/ImportTB.test.tsx` EXISTS. It currently mocks `GoogleGenAI` from `@google/genai`. When ImportTB.tsx switches from SDK to fetch, the mocks must be updated to stub `fetch('/api/ai/match-accounts')` instead of `GoogleGenAI`.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Server scaffolding (tsconfig with cross-dir rootDir, env, db client, migration runner, 001-initial.sql)</name>
  <files>server/tsconfig.json, server/env.ts, server/db/client.ts, server/db/migrate.ts, server/db/migrations/001-initial.sql, server/db/__tests__/migrate.test.ts, package.json</files>
  <read_first>
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-RESEARCH.md §4 (server file structure + tsconfig boilerplate)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-RESEARCH.md §11 (migration runner)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-RESEARCH.md "001-initial.sql content" (lines 729-801)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-CONTEXT.md (SQLite tables + FK strategy)
    - A:/Projects/AussieLedger/server/__tests__/persistence.test.ts (skeleton from Plan 03-1)
    - A:/Projects/AussieLedger/server/db/__tests__/migrate.test.ts (skeleton from Plan 03-1)
    - A:/Projects/AussieLedger/src/types.ts (entity/account/journal/audit shapes mirror SQLite schema)
    - A:/Projects/AussieLedger/src/lib/migrations/index.ts (referenced from server/routes/exportImport.ts in Task 2 — must be reachable under rootDir)
    - A:/Projects/AussieLedger/src/lib/schemas.ts (Plan 03-1 — re-exported by server/lib/schema.ts; must be reachable under rootDir)
    - A:/Projects/AussieLedger/package.json (current scripts and deps)
  </read_first>
  <behavior>
    - `server/tsconfig.json` is a distinct TS config (NodeNext module, outDir=server/dist, target=ES2022)
    - `rootDir` is set to `..` (the repo root) so cross-directory imports from `../../src/lib/migrations` AND `../../src/lib/schemas` compile cleanly under `noEmitOnError: true`
    - `include` covers `server/**/*.ts` AND `src/lib/migrations/**/*.ts` AND `src/lib/schemas.ts` (the only SPA-side files the server imports — keeps emit small and prevents pulling in React)
    - `outDir` is `server/dist` (relative to `rootDir='..'`, this means `<repoRoot>/server/dist`)
    - `exclude` blocks node_modules, dist, server/dist, and all `*.test.ts`
    - `server/env.ts` reads PORT (default 4000), HOST (default 127.0.0.1), DB_PATH (default ./data/ledger.db), GEMINI_API_KEY (optional)
    - `server/db/client.ts` opens better-sqlite3 connection, sets WAL + foreign_keys + synchronous=NORMAL pragmas
    - `server/db/migrate.ts` reads schema_migrations table, applies any unapplied .sql files alphabetically, records each
    - `server/db/migrations/001-initial.sql` creates entities, accounts, journal_entries, journal_lines, audit_logs, schema_migrations tables with correct columns + FK CASCADE + indexes
    - `server/db/__tests__/migrate.test.ts` has GREEN tests: 001-initial creates expected tables; runner is idempotent; throws on .sql syntax error
    - package.json `lint` script widens to `tsc --noEmit && tsc -p server/tsconfig.json --noEmit`
    - `npm run test:server` exits 0 (with migrate tests now GREEN)
    - `npm run build:server` succeeds: `tsc -p server/tsconfig.json` compiles to `server/dist/server/...` AND `server/dist/src/lib/migrations/...` AND `server/dist/src/lib/schemas.js` (note: outDir mirrors rootDir, so the server's runtime entry point becomes `server/dist/server/index.js`). Update `start:server` to point at the new emitted path.
  </behavior>
  <action>
    Step 1 - Create `server/tsconfig.json` with `rootDir: ".."` so cross-directory imports compile (B4 — required because `server/routes/exportImport.ts` in Task 2 imports `migrate` from `../../src/lib/migrations` AND `server/lib/schema.ts` re-exports from `../../src/lib/schemas`):
    ```json
    {
      "compilerOptions": {
        "target": "ES2022",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "esModuleInterop": true,
        "strict": true,
        "skipLibCheck": true,
        "outDir": "dist",
        "rootDir": "..",
        "resolveJsonModule": true,
        "types": ["node"],
        "isolatedModules": true,
        "noEmitOnError": true
      },
      "include": [
        "**/*.ts",
        "../src/lib/migrations/**/*.ts",
        "../src/lib/schemas.ts"
      ],
      "exclude": ["dist", "node_modules", "**/*.test.ts", "../src/lib/migrations/**/*.test.ts"]
    }
    ```

    NOTE on outDir effects: `rootDir: ".."` + `outDir: "dist"` means tsc emits to `<repoRoot>/server/dist/`. Server files compile to `server/dist/server/...` and the imported SPA modules compile to `server/dist/src/lib/migrations/...` and `server/dist/src/lib/schemas.js`. The runtime entry point therefore becomes `server/dist/server/index.js`.

    Step 1b - Update `package.json` `scripts.start:server` to reflect the new emit path. Find the existing line:
    ```json
    "start:server": "node server/dist/index.js",
    ```
    Replace with:
    ```json
    "start:server": "node server/dist/server/index.js",
    ```

    Step 2 - Create `server/env.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    export interface ServerEnv {
      port: number;
      host: string;
      dbPath: string;
      geminiApiKey: string | undefined;
      aiEnabled: boolean;
    }

    export function loadEnv(): ServerEnv {
      const port = parseInt(process.env.PORT ?? '4000', 10);
      const host = process.env.HOST ?? '127.0.0.1';
      const dbPath = process.env.DB_PATH ?? './data/ledger.db';
      const geminiApiKey = process.env.GEMINI_API_KEY;
      const aiEnabled = Boolean(geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY');
      return { port, host, dbPath, geminiApiKey, aiEnabled };
    }
    ```

    Step 3 - Create `server/db/client.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import Database from 'better-sqlite3';
    import type { Database as BetterSqliteDatabase } from 'better-sqlite3';
    import fs from 'node:fs';
    import path from 'node:path';

    export function openDatabase(dbPath: string): BetterSqliteDatabase {
      // Ensure directory exists for file-backed DBs (skip for :memory:)
      if (dbPath !== ':memory:') {
        const dir = path.dirname(dbPath);
        fs.mkdirSync(dir, { recursive: true });
      }
      const db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      db.pragma('synchronous = NORMAL');
      return db;
    }
    ```

    Step 4 - Create `server/db/migrate.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import type { Database as BetterSqliteDatabase } from 'better-sqlite3';
    import fs from 'node:fs';
    import path from 'node:path';
    import { fileURLToPath } from 'node:url';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

    export function runMigrations(db: BetterSqliteDatabase, migrationsDir: string = MIGRATIONS_DIR): void {
      // Ensure tracking table exists (idempotent SQL)
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          name TEXT PRIMARY KEY,
          applied_at TEXT NOT NULL
        )
      `);

      const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort(); // 001-*.sql, 002-*.sql, ...

      const applied = new Set(
        (db.prepare('SELECT name FROM schema_migrations').all() as Array<{ name: string }>)
          .map(r => r.name),
      );

      for (const file of files) {
        if (applied.has(file)) continue;
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        const apply = db.transaction(() => {
          db.exec(sql);
          db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)')
            .run(file, new Date().toISOString());
        });
        apply();
        // eslint-disable-next-line no-console
        console.log(`Applied migration: ${file}`);
      }
    }
    ```

    Step 5 - Create `server/db/migrations/001-initial.sql` (verbatim from 03-RESEARCH.md):
    ```sql
    -- AussieLedger _v: 2 initial schema
    -- Author: Phase 3 (Plan 03-3)
    PRAGMA foreign_keys = ON;

    CREATE TABLE entities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      registration_number TEXT,
      business_address TEXT,
      contact_person TEXT,
      status TEXT NOT NULL,
      tax_agent_name TEXT,
      tax_agent_phone TEXT,
      tax_agent_email TEXT,
      notes TEXT,
      _v INTEGER NOT NULL DEFAULT 2
    );

    CREATE TABLE accounts (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      tax_label TEXT,
      company_tax_label TEXT,
      trust_tax_label TEXT,
      partnership_tax_label TEXT,
      gst_code TEXT NOT NULL,
      needs_review INTEGER NOT NULL DEFAULT 0,
      _v INTEGER NOT NULL DEFAULT 2
    );
    CREATE UNIQUE INDEX accounts_code_idx ON accounts(code);

    CREATE TABLE journal_entries (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      date TEXT NOT NULL,
      reference TEXT NOT NULL,
      description TEXT NOT NULL,
      is_posted INTEGER NOT NULL,
      _v INTEGER NOT NULL DEFAULT 2,
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );
    CREATE INDEX journal_entries_entity_idx ON journal_entries(entity_id);
    CREATE INDEX journal_entries_date_idx ON journal_entries(date);

    CREATE TABLE journal_lines (
      entry_id TEXT NOT NULL,
      line_index INTEGER NOT NULL,
      account_id TEXT NOT NULL,
      description TEXT NOT NULL,
      debit TEXT NOT NULL,
      credit TEXT NOT NULL,
      tax_amount TEXT NOT NULL,
      is_manual_tax INTEGER NOT NULL DEFAULT 0,
      _v INTEGER NOT NULL DEFAULT 2,
      PRIMARY KEY (entry_id, line_index),
      FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
    );
    -- NOTE: No FK on account_id -> accounts.id. Account codes are mutable (Phase 4).
    -- NOTE: debit/credit/tax_amount are TEXT to preserve Decimal precision (src/lib/money.ts).

    CREATE TABLE audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      user TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_id TEXT,
      details TEXT NOT NULL,
      _v INTEGER NOT NULL DEFAULT 2
    );
    CREATE INDEX audit_logs_timestamp_idx ON audit_logs(timestamp DESC);
    ```

    Step 6 - Replace `server/db/__tests__/migrate.test.ts` `.todo` with GREEN tests:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect, beforeEach } from 'vitest';
    import Database from 'better-sqlite3';
    import path from 'node:path';
    import { fileURLToPath } from 'node:url';
    import { runMigrations } from '../migrate';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

    describe('Server migration runner (DEP-02)', () => {
      let db: Database.Database;
      beforeEach(() => {
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
      });

      it('001-initial: creates 6 tables', () => {
        runMigrations(db, MIGRATIONS_DIR);
        const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as Array<{ name: string }>;
        const names = rows.map(r => r.name);
        for (const t of ['entities', 'accounts', 'journal_entries', 'journal_lines', 'audit_logs', 'schema_migrations']) {
          expect(names).toContain(t);
        }
      });

      it('001-initial: accounts_code_idx exists as unique index', () => {
        runMigrations(db, MIGRATIONS_DIR);
        const idx = db.prepare("SELECT name, [unique] FROM sqlite_master WHERE type='index' AND name='accounts_code_idx'").get() as { name: string } | undefined;
        expect(idx).toBeDefined();
      });

      it('001-initial: journal_entries.entity_id FK CASCADE works', () => {
        runMigrations(db, MIGRATIONS_DIR);
        db.prepare(`INSERT INTO entities (id, name, type, status) VALUES (?, ?, ?, ?)`).run('e1', 'X', 'Company', 'Active');
        db.prepare(`INSERT INTO journal_entries (id, entity_id, date, reference, description, is_posted) VALUES (?, ?, ?, ?, ?, ?)`).run('j1', 'e1', '2026-01-01', 'R1', 'd', 1);
        db.prepare('DELETE FROM entities WHERE id = ?').run('e1');
        const remaining = db.prepare('SELECT COUNT(*) AS c FROM journal_entries').get() as { c: number };
        expect(remaining.c).toBe(0);
      });

      it('idempotent: second run is no-op', () => {
        runMigrations(db, MIGRATIONS_DIR);
        const before = (db.prepare('SELECT COUNT(*) AS c FROM schema_migrations').get() as { c: number }).c;
        runMigrations(db, MIGRATIONS_DIR);
        const after = (db.prepare('SELECT COUNT(*) AS c FROM schema_migrations').get() as { c: number }).c;
        expect(after).toBe(before);
      });

      it('records each applied migration with timestamp', () => {
        runMigrations(db, MIGRATIONS_DIR);
        const row = db.prepare('SELECT name, applied_at FROM schema_migrations WHERE name = ?').get('001-initial.sql') as { name: string; applied_at: string } | undefined;
        expect(row).toBeDefined();
        expect(row!.applied_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });
    });
    ```

    Step 7 - Widen `package.json` `lint` script to include server tsconfig. Replace the existing line with:
    ```json
    "lint": "tsc --noEmit && tsc -p server/tsconfig.json --noEmit"
    ```

    Step 8 - Verify:
    - `npm run lint` exits 0 (both SPA + server tsconfigs compile)
    - `npm run test:server` exits 0 with migrate tests GREEN (others still .todo)
    - `npm run build:server` succeeds (writes server/dist/server/*.js + server/dist/src/lib/migrations/*.js + server/dist/src/lib/schemas.js files)
    - `node server/dist/server/index.js` is the production entry point after Task 2 lands index.ts
    - If better-sqlite3 native build failed in Plan 03-1 (Windows), document in summary that `npm rebuild better-sqlite3 --build-from-source` is required after VS Build Tools are installed. Tests requiring better-sqlite3 will SKIP locally on Windows-without-tools (vitest reports them as failed at import — acceptable per CONTEXT's optionalDependencies decision; CI on ubuntu-latest will run them).
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npm run test:server</automated>
  </verify>
  <acceptance_criteria>
    - `server/tsconfig.json` contains literal `"module": "NodeNext"` AND literal `"outDir": "dist"` AND literal `"rootDir": ".."`
    - `server/tsconfig.json` `include` array contains literal `"**/*.ts"` AND literal `"../src/lib/migrations/**/*.ts"` AND literal `"../src/lib/schemas.ts"`
    - `server/env.ts` contains literal `process.env.PORT ?? '4000'` and `process.env.HOST ?? '127.0.0.1'` and `process.env.DB_PATH ?? './data/ledger.db'`
    - `server/db/client.ts` contains literal `db.pragma('journal_mode = WAL')` and `db.pragma('foreign_keys = ON')`
    - `server/db/migrate.ts` contains literal `CREATE TABLE IF NOT EXISTS schema_migrations`
    - `server/db/migrations/001-initial.sql` contains literal `CREATE TABLE entities`
    - `server/db/migrations/001-initial.sql` contains literal `CREATE TABLE journal_entries`
    - `server/db/migrations/001-initial.sql` contains literal `CREATE TABLE journal_lines`
    - `server/db/migrations/001-initial.sql` contains literal `CREATE TABLE audit_logs`
    - `server/db/migrations/001-initial.sql` contains literal `ON DELETE CASCADE`
    - `server/db/migrations/001-initial.sql` contains literal `CREATE UNIQUE INDEX accounts_code_idx`
    - `package.json` `scripts.lint` is `"tsc --noEmit && tsc -p server/tsconfig.json --noEmit"`
    - `package.json` `scripts.start:server` is `"node server/dist/server/index.js"`
    - `npx vitest run --config server/vitest.config.ts server/db/__tests__/migrate.test.ts -t "001-initial"` exits 0
    - `npm run lint` exits 0
    - `npm run build:server` exits 0 (creates server/dist/ — verify both `server/dist/server/` and `server/dist/src/lib/migrations/` subdirectories exist after first build)
  </acceptance_criteria>
  <done>
    Server tsconfig (with cross-dir rootDir reaching src/lib/migrations + src/lib/schemas) + env + db client + migration runner + 001-initial.sql in place; migrate tests GREEN; lint includes both tsconfigs; `start:server` updated to new emit path.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Express routes (health, entities, accounts, entries, audit, exportImport, ai) + buildApp split + server entry + shared Zod schemas; make server-side tests GREEN</name>
  <files>server/lib/schema.ts, server/routes/health.ts, server/routes/entities.ts, server/routes/accounts.ts, server/routes/entries.ts, server/routes/audit.ts, server/routes/exportImport.ts, server/routes/ai.ts, server/app.ts, server/index.ts, server/__tests__/persistence.test.ts, server/__tests__/atomicity.test.ts, server/__tests__/import-validation.test.ts, server/__tests__/bind.test.ts, server/routes/__tests__/health.test.ts</files>
  <read_first>
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-RESEARCH.md §9 (transactional whole-collection replace)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-RESEARCH.md §12 (Zod validation flow)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-RESEARCH.md "Express route example" (lines 1366-1449)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-RESEARCH.md "Express entry" (lines 1452-1494)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-CONTEXT.md (API surface + Gemini proxy spec + Decimal boundary line 200)
    - A:/Projects/AussieLedger/server/env.ts (Task 1)
    - A:/Projects/AussieLedger/server/db/client.ts (Task 1)
    - A:/Projects/AussieLedger/src/types.ts (entity/account/journal/audit shapes for row-to-object mapping)
    - A:/Projects/AussieLedger/src/lib/migrations/index.ts (migrate() and CURRENT_VERSION used by /api/import)
    - A:/Projects/AussieLedger/src/lib/schemas.ts (Plan 03-1 — shared Zod schemas; server/lib/schema.ts re-exports from here)
  </read_first>
  <behavior>
    - server/lib/schema.ts is a THIN RE-EXPORT from `../../src/lib/schemas` — single source of truth for SPA + server validation (W2 fix)
    - Each PUT route validates body with Zod schema (imported from server/lib/schema.ts which re-exports from src/lib/schemas.ts), returns 400 with { error: 'validation', issues: ... } on failure
    - Each PUT does DELETE + INSERT in a `db.transaction(...)` — rollback on error guarantees atomicity
    - GET routes select rows and convert column_name -> camelCase via a row-to-object helper
    - **CRITICAL DECIMAL BOUNDARY (W1 fix):** GET /api/entries and GET /api/export return `debit`, `credit`, `taxAmount` as STRINGS (the values are stored as TEXT in SQLite per src/lib/money.ts contract; preserve them verbatim through to the HTTP response). NO `parseFloat` calls anywhere in the server. The SPA's ServerAdapter (Task 3) calls `deserialize()` from src/lib/money.ts on these strings when reading.
    - POST /api/audit appends (INSERT) one row
    - PUT /api/audit replaces whole audit_logs (delete + bulk insert) — backs saveAuditLogs from adapter
    - POST /api/import validates body, runs migrate() on it FIRST (allows older _v import), then re-parses with PersistedRootSchema, then replaces all collections in single outer transaction
    - GET /api/export returns { _v: CURRENT_VERSION, entities, accounts, allEntries (entity-id keyed map, decimals as strings), auditLogs }
    - POST /api/ai/match-accounts forwards to Gemini using server-held key; model defaults to GEMINI_MODEL from src/lib/ai.ts (imported via relative path)
    - **App build factory split (B3 fix):** `server/app.ts` exports `buildApp()` — creates Express, opens DB, runs migrations, mounts routes, returns `{ app, env, db }`. NO `app.listen()`. `server/index.ts` imports `buildApp` and calls `app.listen(env.port, env.host)`.
    - 6 server test files GREEN
  </behavior>
  <action>
    Step 1 - Create `server/lib/schema.ts` as a THIN RE-EXPORT from `../../src/lib/schemas` (W2 fix — server validation uses the same Zod schemas as SPA `importAll()`):
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * Server-side Zod schemas. THIN RE-EXPORT from the canonical SPA module
     * (src/lib/schemas.ts, created in Plan 03-1). Single source of truth —
     * SPA `importAll()` validation AND server `POST /api/import` validation
     * use the same schemas.
     *
     * If a server-only schema is ever needed, add it here without disturbing
     * the shared exports.
     */
    export {
      EntitySchema,
      AccountSchema,
      JournalLineSchema,
      JournalEntrySchema,
      AuditLogSchema,
      PersistedRootSchema,
      type ValidatedEntity,
      type ValidatedAccount,
      type ValidatedJournalEntry,
      type ValidatedAuditLog,
      type ValidatedPersistedRoot,
    } from '../../src/lib/schemas';
    ```

    Step 2 - Create `server/routes/health.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import express from 'express';

    export function healthRouter(aiEnabled: boolean): express.Router {
      const router = express.Router();
      router.get('/health', (_req, res) => {
        res.json({ ok: true, version: 2, aiEnabled });
      });
      return router;
    }
    ```

    Step 3 - Create `server/routes/entities.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import express from 'express';
    import type { Database as BetterSqliteDatabase } from 'better-sqlite3';
    import { z } from 'zod';
    import { EntitySchema, type ValidatedEntity } from '../lib/schema';

    interface EntityRow {
      id: string; name: string; type: string;
      registration_number: string | null;
      business_address: string | null;
      contact_person: string | null;
      status: string;
      tax_agent_name: string | null;
      tax_agent_phone: string | null;
      tax_agent_email: string | null;
      notes: string | null;
      _v: number;
    }

    function rowToEntity(row: EntityRow): ValidatedEntity {
      return {
        _v: row._v,
        id: row.id, name: row.name, type: row.type,
        registrationNumber: row.registration_number ?? undefined,
        businessAddress: row.business_address ?? undefined,
        contactPerson: row.contact_person ?? undefined,
        status: row.status as ValidatedEntity['status'],
        taxAgentName: row.tax_agent_name ?? undefined,
        taxAgentPhone: row.tax_agent_phone ?? undefined,
        taxAgentEmail: row.tax_agent_email ?? undefined,
        notes: row.notes ?? undefined,
      };
    }

    export function replaceAllEntities(db: BetterSqliteDatabase, entities: ValidatedEntity[]): void {
      const txn = db.transaction((arr: ValidatedEntity[]) => {
        db.prepare('DELETE FROM entities').run();
        const stmt = db.prepare(`
          INSERT INTO entities (id, name, type, registration_number, business_address,
                                contact_person, status, tax_agent_name, tax_agent_phone,
                                tax_agent_email, notes, _v)
          VALUES (@id, @name, @type, @registrationNumber, @businessAddress,
                  @contactPerson, @status, @taxAgentName, @taxAgentPhone,
                  @taxAgentEmail, @notes, @_v)
        `);
        for (const e of arr) {
          stmt.run({
            id: e.id, name: e.name, type: e.type,
            registrationNumber: e.registrationNumber ?? null,
            businessAddress: e.businessAddress ?? null,
            contactPerson: e.contactPerson ?? null,
            status: e.status,
            taxAgentName: e.taxAgentName ?? null,
            taxAgentPhone: e.taxAgentPhone ?? null,
            taxAgentEmail: e.taxAgentEmail ?? null,
            notes: e.notes ?? null,
            _v: e._v ?? 2,
          });
        }
      });
      txn(entities);
    }

    export function entitiesRouter(db: BetterSqliteDatabase): express.Router {
      const router = express.Router();
      router.get('/entities', (_req, res) => {
        const rows = db.prepare('SELECT * FROM entities').all() as EntityRow[];
        res.json(rows.map(rowToEntity));
      });
      router.put('/entities', express.json({ limit: '50mb' }), (req, res) => {
        const parse = z.array(EntitySchema).safeParse(req.body);
        if (!parse.success) {
          return res.status(400).json({ error: 'validation', issues: parse.error.issues });
        }
        try {
          replaceAllEntities(db, parse.data);
          res.json({ ok: true });
        } catch (err) {
          res.status(500).json({ error: 'server', message: String(err) });
        }
      });
      return router;
    }
    ```

    Step 4 - Create `server/routes/accounts.ts` (same shape as entities, mapped to accounts columns):
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import express from 'express';
    import type { Database as BetterSqliteDatabase } from 'better-sqlite3';
    import { z } from 'zod';
    import { AccountSchema, type ValidatedAccount } from '../lib/schema';

    interface AccountRow {
      id: string; code: string; name: string; type: string;
      tax_label: string | null;
      company_tax_label: string | null;
      trust_tax_label: string | null;
      partnership_tax_label: string | null;
      gst_code: string;
      needs_review: number;
      _v: number;
    }

    function rowToAccount(row: AccountRow): ValidatedAccount {
      return {
        _v: row._v,
        id: row.id, code: row.code, name: row.name,
        type: row.type as ValidatedAccount['type'],
        taxLabel: row.tax_label ?? undefined,
        companyTaxLabel: row.company_tax_label ?? undefined,
        trustTaxLabel: row.trust_tax_label ?? undefined,
        partnershipTaxLabel: row.partnership_tax_label ?? undefined,
        gstCode: row.gst_code as ValidatedAccount['gstCode'],
        _needsReview: row.needs_review ? true : undefined,
      };
    }

    export function replaceAllAccounts(db: BetterSqliteDatabase, accounts: ValidatedAccount[]): void {
      const txn = db.transaction((arr: ValidatedAccount[]) => {
        db.prepare('DELETE FROM accounts').run();
        const stmt = db.prepare(`
          INSERT INTO accounts (id, code, name, type, tax_label, company_tax_label,
                                trust_tax_label, partnership_tax_label, gst_code,
                                needs_review, _v)
          VALUES (@id, @code, @name, @type, @taxLabel, @companyTaxLabel,
                  @trustTaxLabel, @partnershipTaxLabel, @gstCode,
                  @needsReview, @_v)
        `);
        for (const a of arr) {
          stmt.run({
            id: a.id, code: a.code, name: a.name, type: a.type,
            taxLabel: a.taxLabel ?? null,
            companyTaxLabel: a.companyTaxLabel ?? null,
            trustTaxLabel: a.trustTaxLabel ?? null,
            partnershipTaxLabel: a.partnershipTaxLabel ?? null,
            gstCode: a.gstCode,
            needsReview: a._needsReview ? 1 : 0,
            _v: a._v ?? 2,
          });
        }
      });
      txn(accounts);
    }

    export function accountsRouter(db: BetterSqliteDatabase): express.Router {
      const router = express.Router();
      router.get('/accounts', (_req, res) => {
        const rows = db.prepare('SELECT * FROM accounts').all() as AccountRow[];
        res.json(rows.map(rowToAccount));
      });
      router.put('/accounts', express.json({ limit: '50mb' }), (req, res) => {
        const parse = z.array(AccountSchema).safeParse(req.body);
        if (!parse.success) {
          return res.status(400).json({ error: 'validation', issues: parse.error.issues });
        }
        try {
          replaceAllAccounts(db, parse.data);
          res.json({ ok: true });
        } catch (err) {
          res.status(500).json({ error: 'server', message: String(err) });
        }
      });
      return router;
    }
    ```

    Step 5 - Create `server/routes/entries.ts`. **W1 fix:** server reads decimal-as-TEXT columns from SQLite and returns them AS STRINGS in the HTTP response (no `parseFloat`). The SPA's ServerAdapter deserialises via src/lib/money.ts on the read boundary. Note the deliberate `String(...)` on the response side — this is the wire-level decimal contract:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * Decimal precision contract:
     *   - SQLite stores debit/credit/taxAmount as TEXT (preserves precision).
     *   - GET /api/entries returns those values AS STRINGS in JSON — no parseFloat.
     *   - SPA ServerAdapter (Task 3) calls deserialize() from src/lib/money.ts.
     *
     * Inbound PUT validation: JournalLineSchema accepts numbers (the SPA hooks
     * serialise via src/lib/money.ts before sending, so values arrive as strings
     * even though zod typing says number — at write time we coerce String() before
     * INSERT, lossless).
     */
    import express from 'express';
    import type { Database as BetterSqliteDatabase } from 'better-sqlite3';
    import { z } from 'zod';
    import { JournalEntrySchema, type ValidatedJournalEntry } from '../lib/schema';

    interface JournalEntryRow {
      id: string; entity_id: string; date: string; reference: string;
      description: string; is_posted: number; _v: number;
    }
    interface JournalLineRow {
      entry_id: string; line_index: number; account_id: string;
      description: string; debit: string; credit: string; tax_amount: string;
      is_manual_tax: number; _v: number;
    }

    export function replaceAllEntries(db: BetterSqliteDatabase, map: Record<string, ValidatedJournalEntry[]>): void {
      const txn = db.transaction((m: Record<string, ValidatedJournalEntry[]>) => {
        db.prepare('DELETE FROM journal_lines').run();
        db.prepare('DELETE FROM journal_entries').run();
        const insertEntry = db.prepare(`
          INSERT INTO journal_entries (id, entity_id, date, reference, description, is_posted, _v)
          VALUES (@id, @entityId, @date, @reference, @description, @isPosted, @_v)
        `);
        const insertLine = db.prepare(`
          INSERT INTO journal_lines (entry_id, line_index, account_id, description,
                                     debit, credit, tax_amount, is_manual_tax, _v)
          VALUES (@entryId, @lineIndex, @accountId, @description,
                  @debit, @credit, @taxAmount, @isManualTax, @_v)
        `);
        for (const [entityId, entries] of Object.entries(m)) {
          for (const entry of entries) {
            insertEntry.run({
              id: entry.id, entityId,
              date: entry.date, reference: entry.reference,
              description: entry.description,
              isPosted: entry.isPosted ? 1 : 0,
              _v: entry._v ?? 2,
            });
            entry.lines.forEach((line, idx) => {
              insertLine.run({
                entryId: entry.id, lineIndex: idx,
                accountId: line.accountId, description: line.description,
                // String() coercion preserves precision: zod accepts numbers from
                // typing but the SPA serialises via src/lib/money.ts so values
                // are already decimal-strings shaped (e.g. "123.45000"). String()
                // is safe either way.
                debit: String(line.debit), credit: String(line.credit),
                taxAmount: String(line.taxAmount),
                isManualTax: line.isManualTax ? 1 : 0,
                _v: line._v ?? 2,
              });
            });
          }
        }
      });
      txn(map);
    }

    export function entriesRouter(db: BetterSqliteDatabase): express.Router {
      const router = express.Router();
      router.get('/entries', (_req, res) => {
        const entryRows = db.prepare('SELECT * FROM journal_entries ORDER BY date DESC').all() as JournalEntryRow[];
        const lineRows = db.prepare('SELECT * FROM journal_lines ORDER BY entry_id, line_index').all() as JournalLineRow[];
        const linesByEntry = new Map<string, JournalLineRow[]>();
        for (const r of lineRows) {
          if (!linesByEntry.has(r.entry_id)) linesByEntry.set(r.entry_id, []);
          linesByEntry.get(r.entry_id)!.push(r);
        }
        // W1: return decimals AS STRINGS (no parseFloat).
        // The SPA's ServerAdapter applies money.ts `deserialize()` on the read boundary.
        // Cast through `unknown` to satisfy the JournalLine typing (debit/credit/taxAmount
        // are typed as number on the SPA hook contract; the boundary deserialise hop
        // restores Decimal precision before the hook ever sees the value).
        const result: Record<string, unknown[]> = {};
        for (const er of entryRows) {
          if (!result[er.entity_id]) result[er.entity_id] = [];
          result[er.entity_id].push({
            _v: er._v,
            id: er.id, date: er.date, reference: er.reference,
            description: er.description, isPosted: er.is_posted === 1,
            lines: (linesByEntry.get(er.id) ?? []).map(l => ({
              _v: l._v,
              accountId: l.account_id, description: l.description,
              // Pass strings through verbatim. ServerAdapter will deserialise.
              debit: l.debit, credit: l.credit, taxAmount: l.tax_amount,
              isManualTax: l.is_manual_tax === 1 ? true : undefined,
            })),
          });
        }
        res.json(result);
      });
      router.put('/entries', express.json({ limit: '50mb' }), (req, res) => {
        const parse = z.record(z.string(), z.array(JournalEntrySchema)).safeParse(req.body);
        if (!parse.success) {
          return res.status(400).json({ error: 'validation', issues: parse.error.issues });
        }
        try {
          replaceAllEntries(db, parse.data);
          res.json({ ok: true });
        } catch (err) {
          res.status(500).json({ error: 'server', message: String(err) });
        }
      });
      return router;
    }
    ```

    Step 6 - Create `server/routes/audit.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import express from 'express';
    import type { Database as BetterSqliteDatabase } from 'better-sqlite3';
    import { z } from 'zod';
    import { AuditLogSchema, type ValidatedAuditLog } from '../lib/schema';

    interface AuditLogRow {
      id: string; timestamp: string; user: string; action: string;
      entity_id: string | null; details: string; _v: number;
    }

    function rowToLog(r: AuditLogRow): ValidatedAuditLog {
      return {
        _v: r._v,
        id: r.id, timestamp: r.timestamp, user: r.user,
        action: r.action as ValidatedAuditLog['action'],
        entityId: r.entity_id ?? undefined,
        details: r.details,
      };
    }

    export function replaceAllAuditLogs(db: BetterSqliteDatabase, logs: ValidatedAuditLog[]): void {
      const txn = db.transaction((arr: ValidatedAuditLog[]) => {
        db.prepare('DELETE FROM audit_logs').run();
        const stmt = db.prepare(`
          INSERT INTO audit_logs (id, timestamp, user, action, entity_id, details, _v)
          VALUES (@id, @timestamp, @user, @action, @entityId, @details, @_v)
        `);
        for (const l of arr) {
          stmt.run({
            id: l.id, timestamp: l.timestamp, user: l.user, action: l.action,
            entityId: l.entityId ?? null, details: l.details,
            _v: l._v ?? 2,
          });
        }
      });
      txn(logs);
    }

    export function auditRouter(db: BetterSqliteDatabase): express.Router {
      const router = express.Router();
      router.get('/audit', (_req, res) => {
        const rows = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC').all() as AuditLogRow[];
        res.json(rows.map(rowToLog));
      });
      router.post('/audit', express.json({ limit: '5mb' }), (req, res) => {
        const parse = AuditLogSchema.safeParse(req.body);
        if (!parse.success) {
          return res.status(400).json({ error: 'validation', issues: parse.error.issues });
        }
        const l = parse.data;
        try {
          db.prepare(`
            INSERT INTO audit_logs (id, timestamp, user, action, entity_id, details, _v)
            VALUES (@id, @timestamp, @user, @action, @entityId, @details, @_v)
          `).run({
            id: l.id, timestamp: l.timestamp, user: l.user, action: l.action,
            entityId: l.entityId ?? null, details: l.details, _v: l._v ?? 2,
          });
          res.json({ ok: true });
        } catch (err) {
          res.status(500).json({ error: 'server', message: String(err) });
        }
      });
      router.put('/audit', express.json({ limit: '50mb' }), (req, res) => {
        const parse = z.array(AuditLogSchema).safeParse(req.body);
        if (!parse.success) {
          return res.status(400).json({ error: 'validation', issues: parse.error.issues });
        }
        try {
          replaceAllAuditLogs(db, parse.data);
          res.json({ ok: true });
        } catch (err) {
          res.status(500).json({ error: 'server', message: String(err) });
        }
      });
      return router;
    }
    ```

    Step 7 - Create `server/routes/exportImport.ts`. **W1 carry-through:** `exportSnapshot()` returns debit/credit/taxAmount as STRINGS (no parseFloat). The SPA's DataPage receives them; if the SPA reads via ServerAdapter then deserialize applies as usual:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * Decimal precision contract (same as routes/entries.ts):
     *   exportSnapshot() returns debit/credit/taxAmount AS STRINGS (no parseFloat).
     */
    import express from 'express';
    import type { Database as BetterSqliteDatabase } from 'better-sqlite3';
    import { PersistedRootSchema } from '../lib/schema';
    import { replaceAllEntities } from './entities';
    import { replaceAllAccounts } from './accounts';
    import { replaceAllEntries } from './entries';
    import { replaceAllAuditLogs } from './audit';
    // Server reuses the SPA's migration runner via cross-dir import (rootDir='..').
    // server/tsconfig.json includes ../src/lib/migrations/**/*.ts so this compiles.
    import { migrate, CURRENT_VERSION } from '../../src/lib/migrations';

    interface EntityRow { id: string; name: string; type: string; registration_number: string | null; business_address: string | null; contact_person: string | null; status: string; tax_agent_name: string | null; tax_agent_phone: string | null; tax_agent_email: string | null; notes: string | null; _v: number; }
    interface AccountRow { id: string; code: string; name: string; type: string; tax_label: string | null; company_tax_label: string | null; trust_tax_label: string | null; partnership_tax_label: string | null; gst_code: string; needs_review: number; _v: number; }
    interface JournalEntryRow { id: string; entity_id: string; date: string; reference: string; description: string; is_posted: number; _v: number; }
    interface JournalLineRow { entry_id: string; line_index: number; account_id: string; description: string; debit: string; credit: string; tax_amount: string; is_manual_tax: number; _v: number; }
    interface AuditLogRow { id: string; timestamp: string; user: string; action: string; entity_id: string | null; details: string; _v: number; }

    function exportSnapshot(db: BetterSqliteDatabase): unknown {
      const entRows = db.prepare('SELECT * FROM entities').all() as EntityRow[];
      const accRows = db.prepare('SELECT * FROM accounts').all() as AccountRow[];
      const jeRows = db.prepare('SELECT * FROM journal_entries').all() as JournalEntryRow[];
      const jlRows = db.prepare('SELECT * FROM journal_lines ORDER BY entry_id, line_index').all() as JournalLineRow[];
      const auRows = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC').all() as AuditLogRow[];

      const linesByEntry = new Map<string, JournalLineRow[]>();
      for (const l of jlRows) {
        if (!linesByEntry.has(l.entry_id)) linesByEntry.set(l.entry_id, []);
        linesByEntry.get(l.entry_id)!.push(l);
      }
      // W1: decimals AS STRINGS, no parseFloat.
      const allEntries: Record<string, unknown[]> = {};
      for (const er of jeRows) {
        if (!allEntries[er.entity_id]) allEntries[er.entity_id] = [];
        allEntries[er.entity_id].push({
          _v: er._v, id: er.id, date: er.date, reference: er.reference,
          description: er.description, isPosted: er.is_posted === 1,
          lines: (linesByEntry.get(er.id) ?? []).map(l => ({
            _v: l._v, accountId: l.account_id, description: l.description,
            debit: l.debit, credit: l.credit, taxAmount: l.tax_amount,
            isManualTax: l.is_manual_tax === 1 ? true : undefined,
          })),
        });
      }
      return {
        _v: CURRENT_VERSION,
        entities: entRows.map(r => ({
          _v: r._v, id: r.id, name: r.name, type: r.type,
          registrationNumber: r.registration_number ?? undefined,
          businessAddress: r.business_address ?? undefined,
          contactPerson: r.contact_person ?? undefined,
          status: r.status,
          taxAgentName: r.tax_agent_name ?? undefined,
          taxAgentPhone: r.tax_agent_phone ?? undefined,
          taxAgentEmail: r.tax_agent_email ?? undefined,
          notes: r.notes ?? undefined,
        })),
        accounts: accRows.map(r => ({
          _v: r._v, id: r.id, code: r.code, name: r.name, type: r.type,
          taxLabel: r.tax_label ?? undefined,
          companyTaxLabel: r.company_tax_label ?? undefined,
          trustTaxLabel: r.trust_tax_label ?? undefined,
          partnershipTaxLabel: r.partnership_tax_label ?? undefined,
          gstCode: r.gst_code,
          _needsReview: r.needs_review ? true : undefined,
        })),
        allEntries,
        auditLogs: auRows.map(r => ({
          _v: r._v, id: r.id, timestamp: r.timestamp, user: r.user,
          action: r.action, entityId: r.entity_id ?? undefined, details: r.details,
        })),
      };
    }

    export function exportImportRouter(db: BetterSqliteDatabase): express.Router {
      const router = express.Router();

      router.get('/export', (_req, res) => {
        res.json(exportSnapshot(db));
      });

      router.post('/import', express.json({ limit: '50mb' }), (req, res) => {
        try {
          // 1. Run migrate() FIRST (allows older _v import)
          const migrated = migrate(req.body as Record<string, unknown>);
          // 2. Validate the migrated shape against shared PersistedRootSchema
          const parse = PersistedRootSchema.safeParse(migrated);
          if (!parse.success) {
            return res.status(400).json({ error: 'validation', issues: parse.error.issues });
          }
          // 3. Atomic replace — single outer transaction wraps all four
          const importAll = db.transaction(() => {
            replaceAllEntities(db, parse.data.entities);
            replaceAllAccounts(db, parse.data.accounts);
            replaceAllEntries(db, parse.data.allEntries);
            replaceAllAuditLogs(db, parse.data.auditLogs);
          });
          importAll();
          res.json({ ok: true });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('newer than the application version')) {
            return res.status(400).json({ error: 'migration-newer', message: msg });
          }
          res.status(400).json({ error: 'migration', message: msg });
        }
      });

      return router;
    }
    ```

    Step 8 - Create `server/routes/ai.ts`. Cleanup: default model name comes from `src/lib/ai.ts` `GEMINI_MODEL` constant (added in Task 3) — but to avoid a circular Task ordering issue, define the constant inline here with an explicit comment that Task 3's `src/lib/ai.ts` MUST export the same literal. Both call sites stay in sync via the test in Task 3 that asserts the literal matches:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * NOTE: GEMINI_MODEL_DEFAULT must match the literal exported as
     * `GEMINI_MODEL` from src/lib/ai.ts (Task 3). A test in Task 3 asserts
     * this equality so the two stay in sync. We avoid importing from src/
     * here because the server tsconfig only includes src/lib/migrations
     * and src/lib/schemas — pulling in src/lib/ai.ts would also pull React
     * (transitively through getCachedHealth's import chain).
     */
    import express from 'express';

    const GEMINI_MODEL_DEFAULT = 'gemini-3-flash-preview';

    const GEMINI_URL = (model: string, key: string) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

    export function aiRouter(apiKey: string | undefined): express.Router {
      const router = express.Router();

      router.post('/ai/match-accounts', express.json({ limit: '5mb' }), async (req, res) => {
        if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
          return res.status(503).json({ error: 'ai-disabled', message: 'GEMINI_API_KEY not configured on server' });
        }
        const body = req.body as { prompt?: string; model?: string; responseSchema?: unknown };
        if (!body || typeof body.prompt !== 'string') {
          return res.status(400).json({ error: 'validation', message: 'Missing prompt' });
        }
        const model = body.model ?? GEMINI_MODEL_DEFAULT;
        try {
          const gres = await fetch(GEMINI_URL(model, apiKey), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: body.prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: body.responseSchema,
              },
            }),
          });
          const json = await gres.json();
          if (!gres.ok) {
            return res.status(gres.status).json({ error: 'gemini', details: json });
          }
          res.json(json);
        } catch (err) {
          res.status(502).json({ error: 'upstream', message: String(err) });
        }
      });

      return router;
    }
    ```

    Step 9 - **B3 fix:** Split `buildApp` into `server/app.ts` (no listen) and keep `server/index.ts` thin (calls listen). Create `server/app.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * Factory only — no app.listen() here so this module can be imported
     * by tests (server/__tests__/*.test.ts) and the production entry point
     * (server/index.ts) without side-effects.
     */
    import express from 'express';
    import { loadEnv } from './env';
    import { openDatabase } from './db/client';
    import { runMigrations } from './db/migrate';
    import { healthRouter } from './routes/health';
    import { entitiesRouter } from './routes/entities';
    import { accountsRouter } from './routes/accounts';
    import { entriesRouter } from './routes/entries';
    import { auditRouter } from './routes/audit';
    import { exportImportRouter } from './routes/exportImport';
    import { aiRouter } from './routes/ai';

    export function buildApp(env = loadEnv()) {
      const db = openDatabase(env.dbPath);
      runMigrations(db);

      const app = express();

      app.use('/api', healthRouter(env.aiEnabled));
      app.use('/api', entitiesRouter(db));
      app.use('/api', accountsRouter(db));
      app.use('/api', entriesRouter(db));
      app.use('/api', auditRouter(db));
      app.use('/api', exportImportRouter(db));
      app.use('/api', aiRouter(env.geminiApiKey));

      return { app, env, db };
    }
    ```

    Then create `server/index.ts` as a thin listen wrapper:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * Production server entry point. `tsx watch` (dev:server) and
     * `node server/dist/server/index.js` (start:server) both run this.
     */
    import { buildApp } from './app';

    const { app, env } = buildApp();
    app.listen(env.port, env.host, () => {
      // eslint-disable-next-line no-console
      console.log(`AussieLedger server listening on http://${env.host}:${env.port}, DB at ${env.dbPath}, AI ${env.aiEnabled ? 'enabled' : 'disabled'}`);
    });
    ```

    Step 10 - Replace `server/__tests__/persistence.test.ts` with GREEN tests:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect, beforeEach } from 'vitest';
    import Database from 'better-sqlite3';
    import path from 'node:path';
    import { fileURLToPath } from 'node:url';
    import { runMigrations } from '../db/migrate';
    import { replaceAllEntities } from '../routes/entities';
    import fs from 'node:fs';
    import os from 'node:os';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

    describe('SQLite persistence (FND-01 server shape)', () => {
      it('survives restart: write -> close -> reopen -> still present', () => {
        const tmpFile = path.join(os.tmpdir(), `aussie-test-${Date.now()}.db`);
        try {
          const db1 = new Database(tmpFile);
          db1.pragma('journal_mode = WAL');
          db1.pragma('foreign_keys = ON');
          runMigrations(db1, MIGRATIONS_DIR);
          replaceAllEntities(db1, [{ id: 'e1', name: 'Persist', type: 'Company', status: 'Active', _v: 2 }]);
          db1.close();

          const db2 = new Database(tmpFile);
          db2.pragma('foreign_keys = ON');
          const rows = db2.prepare('SELECT * FROM entities').all() as Array<{ name: string }>;
          expect(rows).toHaveLength(1);
          expect(rows[0].name).toBe('Persist');
          db2.close();
        } finally {
          try { fs.unlinkSync(tmpFile); } catch {}
          try { fs.unlinkSync(tmpFile + '-wal'); } catch {}
          try { fs.unlinkSync(tmpFile + '-shm'); } catch {}
        }
      });

      it('WAL mode enabled', () => {
        const db = new Database(':memory:');
        db.pragma('journal_mode = WAL');
        const mode = db.pragma('journal_mode', { simple: true });
        expect(mode).toBeDefined();
      });

      it('foreign keys enabled', () => {
        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        const fk = db.pragma('foreign_keys', { simple: true });
        expect(Number(fk)).toBe(1);
      });
    });
    ```

    Step 11 - Replace `server/__tests__/atomicity.test.ts` with GREEN tests:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect, beforeEach } from 'vitest';
    import Database from 'better-sqlite3';
    import path from 'node:path';
    import { fileURLToPath } from 'node:url';
    import { runMigrations } from '../db/migrate';
    import { replaceAllEntities } from '../routes/entities';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

    describe('Transactional whole-collection replace (DEP-02)', () => {
      let db: Database.Database;
      beforeEach(() => {
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        runMigrations(db, MIGRATIONS_DIR);
      });

      it('rolls back PUT /api/entities on insert error (duplicate id)', () => {
        replaceAllEntities(db, [{ id: 'e1', name: 'Original', type: 'Company', status: 'Active', _v: 2 }]);
        const bad = [
          { id: 'dup', name: 'A', type: 'Company', status: 'Active' as const, _v: 2 },
          { id: 'dup', name: 'B', type: 'Company', status: 'Active' as const, _v: 2 },
        ];
        let threw = false;
        try {
          replaceAllEntities(db, bad);
        } catch {
          threw = true;
        }
        expect(threw).toBe(true);
        const rows = db.prepare('SELECT * FROM entities').all() as Array<{ name: string }>;
        expect(rows).toHaveLength(1);
        expect(rows[0].name).toBe('Original');
      });
    });
    ```

    Step 12 - Replace `server/__tests__/import-validation.test.ts` with GREEN tests (imports from `../app` per B3):
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect } from 'vitest';
    import { buildApp } from '../app';

    describe('POST /api/import Zod validation (FND-03)', () => {
      it('rejects malformed body with 400', async () => {
        process.env.DB_PATH = ':memory:';
        const { app } = buildApp();
        const server = app.listen(0);
        try {
          const addr = server.address();
          const port = typeof addr === 'object' && addr ? addr.port : 0;
          const res = await fetch(`http://127.0.0.1:${port}/api/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ totally: 'wrong shape' }),
          });
          expect(res.status).toBe(400);
          const body = await res.json();
          expect(['validation', 'migration', 'migration-newer']).toContain(body.error);
        } finally {
          server.close();
        }
      });

      it('accepts valid PersistedRoot', async () => {
        process.env.DB_PATH = ':memory:';
        const { app } = buildApp();
        const server = app.listen(0);
        try {
          const addr = server.address();
          const port = typeof addr === 'object' && addr ? addr.port : 0;
          const res = await fetch(`http://127.0.0.1:${port}/api/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              _v: 2, entities: [], accounts: [], allEntries: {}, auditLogs: [],
            }),
          });
          expect(res.status).toBe(200);
        } finally {
          server.close();
        }
      });

      it('refuses _v > CURRENT_VERSION with 400', async () => {
        process.env.DB_PATH = ':memory:';
        const { app } = buildApp();
        const server = app.listen(0);
        try {
          const addr = server.address();
          const port = typeof addr === 'object' && addr ? addr.port : 0;
          const res = await fetch(`http://127.0.0.1:${port}/api/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              _v: 999, entities: [], accounts: [], allEntries: {}, auditLogs: [],
            }),
          });
          expect(res.status).toBe(400);
          const body = await res.json();
          expect(body.error).toBe('migration-newer');
        } finally {
          server.close();
        }
      });
    });
    ```

    Step 13 - Replace `server/__tests__/bind.test.ts` with GREEN tests:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect, beforeEach, afterEach } from 'vitest';
    import { loadEnv } from '../env';

    describe('Express bind security default (DEP-02)', () => {
      const origHost = process.env.HOST;
      const origPort = process.env.PORT;
      afterEach(() => {
        process.env.HOST = origHost;
        process.env.PORT = origPort;
      });

      it('binds to 127.0.0.1 by default (HOST env var unset)', () => {
        delete process.env.HOST;
        const env = loadEnv();
        expect(env.host).toBe('127.0.0.1');
      });

      it('binds to 0.0.0.0 only when HOST=0.0.0.0 explicit', () => {
        process.env.HOST = '0.0.0.0';
        const env = loadEnv();
        expect(env.host).toBe('0.0.0.0');
      });

      it('uses PORT env var when set, else 4000', () => {
        delete process.env.PORT;
        expect(loadEnv().port).toBe(4000);
        process.env.PORT = '5050';
        expect(loadEnv().port).toBe(5050);
      });
    });
    ```

    Step 14 - Replace `server/routes/__tests__/health.test.ts` with GREEN tests (imports from `../../app` per B3):
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect, afterEach } from 'vitest';
    import { buildApp } from '../../app';

    describe('GET /api/health', () => {
      const origKey = process.env.GEMINI_API_KEY;
      afterEach(() => { process.env.GEMINI_API_KEY = origKey; });

      it('returns { ok: true, version: 2, aiEnabled: boolean }', async () => {
        process.env.DB_PATH = ':memory:';
        delete process.env.GEMINI_API_KEY;
        const { app } = buildApp();
        const server = app.listen(0);
        try {
          const addr = server.address();
          const port = typeof addr === 'object' && addr ? addr.port : 0;
          const res = await fetch(`http://127.0.0.1:${port}/api/health`);
          expect(res.status).toBe(200);
          const body = await res.json();
          expect(body).toEqual({ ok: true, version: 2, aiEnabled: false });
        } finally { server.close(); }
      });

      it('aiEnabled = true when GEMINI_API_KEY set and not placeholder', async () => {
        process.env.DB_PATH = ':memory:';
        process.env.GEMINI_API_KEY = 'real-key-here';
        const { app } = buildApp();
        const server = app.listen(0);
        try {
          const addr = server.address();
          const port = typeof addr === 'object' && addr ? addr.port : 0;
          const res = await fetch(`http://127.0.0.1:${port}/api/health`);
          const body = await res.json();
          expect(body.aiEnabled).toBe(true);
        } finally { server.close(); }
      });

      it('aiEnabled = false when key is placeholder MY_GEMINI_API_KEY', async () => {
        process.env.DB_PATH = ':memory:';
        process.env.GEMINI_API_KEY = 'MY_GEMINI_API_KEY';
        const { app } = buildApp();
        const server = app.listen(0);
        try {
          const addr = server.address();
          const port = typeof addr === 'object' && addr ? addr.port : 0;
          const res = await fetch(`http://127.0.0.1:${port}/api/health`);
          const body = await res.json();
          expect(body.aiEnabled).toBe(false);
        } finally { server.close(); }
      });
    });
    ```

    Step 15 - Verify:
    - `npm run lint` exits 0
    - `npm run test:server` exits 0 with all server tests GREEN
    - `npm run build:server` exits 0 (creates `server/dist/server/...` AND `server/dist/src/lib/migrations/...` AND `server/dist/src/lib/schemas.js`)
    - `node server/dist/server/index.js` is the runnable entry point (manual smoke; not in verify command)

    NOTE about test execution on Windows without VS Build Tools: better-sqlite3 native binding will fail to load, and these server tests will error at import time. That's expected per CONTEXT's optionalDependencies decision — CI on Ubuntu will run them. Document in summary.
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npm run test:server</automated>
  </verify>
  <acceptance_criteria>
    - `server/lib/schema.ts` is a RE-EXPORT — contains literal `from '../../src/lib/schemas'` AND contains literal `PersistedRootSchema` in the export list
    - `server/lib/schema.ts` does NOT contain literal `z.object` (it re-exports rather than defining)
    - `server/routes/health.ts` exports `healthRouter` and returns `{ ok: true, version: 2, aiEnabled }`
    - `server/routes/entities.ts` exports `entitiesRouter` and `replaceAllEntities`
    - `server/routes/entities.ts` contains literal `db.prepare('DELETE FROM entities')` AND literal `db.transaction(`
    - `server/routes/accounts.ts` exports `accountsRouter` and `replaceAllAccounts`
    - `server/routes/entries.ts` exports `entriesRouter` and `replaceAllEntries`
    - `server/routes/entries.ts` does NOT contain literal `parseFloat` (W1 — decimals returned as strings)
    - `server/routes/entries.ts` contains the literal comment fragment `decimals AS STRINGS` (W1 documented)
    - `server/routes/entries.ts` contains literal `db.prepare('DELETE FROM journal_lines')` AND literal `db.prepare('DELETE FROM journal_entries')`
    - `server/routes/audit.ts` exports `auditRouter` AND `replaceAllAuditLogs`
    - `server/routes/exportImport.ts` exports `exportImportRouter` and contains literal `migrate(req.body`
    - `server/routes/exportImport.ts` does NOT contain literal `parseFloat` (W1 — decimals returned as strings)
    - `server/routes/ai.ts` exports `aiRouter` and contains literal `'/ai/match-accounts'`
    - `server/routes/ai.ts` contains literal `const GEMINI_MODEL_DEFAULT = 'gemini-3-flash-preview'` (matches src/lib/ai.ts GEMINI_MODEL added in Task 3)
    - `server/app.ts` exports `buildApp` and does NOT contain literal `app.listen` (B3)
    - `server/index.ts` contains literal `import { buildApp } from './app'` AND literal `app.listen(env.port, env.host` (B3)
    - `npx vitest run --config server/vitest.config.ts server/routes/__tests__/health.test.ts` exits 0
    - `npx vitest run --config server/vitest.config.ts server/__tests__/import-validation.test.ts` exits 0
    - `npx vitest run --config server/vitest.config.ts server/__tests__/atomicity.test.ts` exits 0
    - `npx vitest run --config server/vitest.config.ts server/__tests__/bind.test.ts` exits 0
    - `npx vitest run --config server/vitest.config.ts server/__tests__/persistence.test.ts` exits 0
    - `npm run lint` exits 0
    - `npm run build:server` exits 0
  </acceptance_criteria>
  <done>
    Full Express + better-sqlite3 server implemented; buildApp factory in server/app.ts (no listen) + server/index.ts thin listen wrapper (B3); Zod schemas shared via re-export from src/lib/schemas.ts (W2); decimal boundary preserved (server returns strings, no parseFloat — W1); all server-side tests GREEN.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Implement full ServerAdapter with money.ts deserialise boundary + widen IS_AI_ENABLED + export GEMINI_MODEL + move ImportTB Gemini call to server proxy + update ImportTB.test.tsx mocks</name>
  <files>src/storage/server.ts, src/lib/ai.ts, src/lib/__tests__/ai.test.ts, src/components/ImportTB.tsx, src/components/__tests__/ImportTB.test.tsx, src/storage/__tests__/server.test.ts</files>
  <read_first>
    - A:/Projects/AussieLedger/src/storage/server.ts (Plan 03-2 STUB — replace entirely)
    - A:/Projects/AussieLedger/src/storage/adapter.ts (StorageAdapter interface — FINAL from Plan 03-1; do not modify)
    - A:/Projects/AussieLedger/src/storage/index.ts (getCachedHealth from Plan 03-2)
    - A:/Projects/AussieLedger/src/lib/ai.ts (current build-time const — widen to runtime function + export GEMINI_MODEL)
    - A:/Projects/AussieLedger/src/lib/money.ts (Phase 1 — `deserialize` is the read boundary used by ServerAdapter for decimal-as-string values)
    - A:/Projects/AussieLedger/src/components/ImportTB.tsx (current Gemini call at lines 103-169 — replace with fetch)
    - A:/Projects/AussieLedger/src/components/__tests__/ImportTB.test.tsx (EXISTS from Phase 2 — currently mocks GoogleGenAI; must update mocks to stub fetch('/api/ai/match-accounts') instead — W3)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-RESEARCH.md "ServerAdapter saveEntities + probe" Code Skeleton (lines 1187-1250)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-CONTEXT.md (AI feature detection rules; Decimal boundary on read line 200)
  </read_first>
  <behavior>
    - src/storage/server.ts is the full ServerAdapter implementing all 12 StorageAdapter methods via fetch (interface is FINAL from Plan 03-1; `saveAuditLogs` is already declared — no widening)
    - Each method maps to the correct REST verb + path (GET /api/entities, PUT /api/entities, etc.)
    - **Decimal boundary on read (W1):** `getEntries()` and `exportAll()` walk the parsed JSON and convert each line's `debit`, `credit`, `taxAmount` from string → number via `deserialize` from `src/lib/money.ts`. The downstream `JournalLine` type expects `number` (Decimal lives in money.ts internally); the SPA hook flow stays unchanged.
    - 4xx -> AdapterValidationError; 5xx -> AdapterUnreachableError
    - saveAuditLogs uses PUT /api/audit; appendAuditLog uses POST /api/audit
    - src/lib/ai.ts exports:
      - `isAiEnabled()` function returning true when server-mode + cachedHealth.aiEnabled OR local-mode + build-time key present
      - `GEMINI_MODEL` constant (`'gemini-3-flash-preview'`) — single source of truth, imported by ImportTB.tsx
      - `IS_AI_ENABLED` const (deprecated alias retained for backwards compat)
    - Backwards-compatible: existing call sites in ImportTB.tsx are updated to call isAiEnabled() instead
    - ImportTB.tsx's runAIMapping() no longer constructs `new GoogleGenAI(...)` — replaced with fetch('/api/ai/match-accounts', { method: 'POST', body: JSON.stringify({ prompt, model: GEMINI_MODEL, responseSchema }) })
    - When server-mode AND aiEnabled, the AI button is shown; on click, fetch the proxy
    - When local-mode AND build-time key present (legacy), the original SDK call is preserved as a fallback (Claude's discretion — but cleaner to ALWAYS go through the proxy if any adapter is in use; local-mode without server simply hides the AI button)
    - src/lib/__tests__/ai.test.ts widened tests GREEN
    - src/storage/__tests__/server.test.ts widened tests GREEN, including the `deserialize` boundary assertion
    - **W3:** `src/components/__tests__/ImportTB.test.tsx` (existing from Phase 2) updated: replace `GoogleGenAI` mocks with `fetch` stubs returning Gemini-shaped responses for `/api/ai/match-accounts`. If the file's existing test cases assert behaviour, keep that behaviour green under the new mocking strategy. If the file is too thin to retest meaningfully, document and move on.
  </behavior>
  <action>
    Step 1 - Replace `src/storage/server.ts` entirely with full HTTP impl. The decimal boundary (W1) lives in `getEntries()` and `exportAll()` — after parsing JSON, walk each line and apply `deserialize` from src/lib/money.ts to the string-shaped `debit`/`credit`/`taxAmount` fields:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * Decimal precision boundary (W1):
     *   Server returns debit/credit/taxAmount as STRINGS (e.g. "123.45000").
     *   We apply `deserialize` from src/lib/money.ts to convert string -> number
     *   on read so the hook contract stays unchanged. Decimal precision is
     *   preserved end-to-end because the strings carry full precision and
     *   deserialize() uses Decimal internally before returning the number.
     */
    import type { StorageAdapter } from './adapter';
    import { AdapterUnreachableError, AdapterValidationError } from './adapter';
    import type { Entity, Account, JournalEntry, AuditLog, JournalLine } from '../types';
    import type { PersistedRoot } from '../lib/migrations';
    import { deserialize } from '../lib/money';

    /**
     * Walk a JournalLine-shaped object whose debit/credit/taxAmount may be
     * strings (server response) and coerce them through deserialize() into
     * numbers (per the JournalLine type contract).
     */
    function deserialiseLine(raw: unknown): JournalLine {
      const l = raw as Record<string, unknown>;
      const coerce = (v: unknown): number => {
        if (typeof v === 'number') return v;
        if (typeof v === 'string') return Number(deserialize(v));
        return 0;
      };
      return {
        _v: l._v as number | undefined,
        accountId: l.accountId as string,
        description: l.description as string,
        debit: coerce(l.debit),
        credit: coerce(l.credit),
        taxAmount: coerce(l.taxAmount),
        isManualTax: l.isManualTax as boolean | undefined,
      };
    }

    function deserialiseEntry(raw: unknown): JournalEntry {
      const e = raw as Record<string, unknown>;
      return {
        _v: e._v as number | undefined,
        id: e.id as string,
        date: e.date as string,
        reference: e.reference as string,
        description: e.description as string,
        isPosted: e.isPosted as boolean,
        lines: ((e.lines as unknown[]) ?? []).map(deserialiseLine),
      };
    }

    export class ServerAdapter implements StorageAdapter {
      private readyPromise: Promise<void>;
      private baseUrl: string;

      constructor(baseUrl: string = '/api') {
        this.baseUrl = baseUrl;
        this.readyPromise = Promise.resolve();
      }

      ready(): Promise<void> { return this.readyPromise; }

      private async jsonGet<T>(path: string): Promise<T> {
        const res = await fetch(this.baseUrl + path);
        if (!res.ok) {
          if (res.status >= 400 && res.status < 500) {
            const body = await res.json().catch(() => ({}));
            throw new AdapterValidationError(`${path} returned ${res.status}`, body);
          }
          throw new AdapterUnreachableError(`${path} returned ${res.status}`);
        }
        return res.json() as Promise<T>;
      }

      private async jsonPut(path: string, body: unknown): Promise<void> {
        const res = await fetch(this.baseUrl + path, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          if (res.status >= 400 && res.status < 500) {
            const errBody = await res.json().catch(() => ({}));
            throw new AdapterValidationError(`${path} validation failed (${res.status})`, errBody);
          }
          throw new AdapterUnreachableError(`${path} returned ${res.status}`);
        }
      }

      private async jsonPost(path: string, body: unknown): Promise<void> {
        const res = await fetch(this.baseUrl + path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          if (res.status >= 400 && res.status < 500) {
            const errBody = await res.json().catch(() => ({}));
            throw new AdapterValidationError(`${path} validation failed (${res.status})`, errBody);
          }
          throw new AdapterUnreachableError(`${path} returned ${res.status}`);
        }
      }

      async getEntities(): Promise<Entity[]> { return this.jsonGet<Entity[]>('/entities'); }
      async saveEntities(entities: Entity[]): Promise<void> { await this.jsonPut('/entities', entities); }
      async getAccounts(): Promise<Account[]> { return this.jsonGet<Account[]>('/accounts'); }
      async saveAccounts(accounts: Account[]): Promise<void> { await this.jsonPut('/accounts', accounts); }

      // W1: decimal-as-string boundary applied on read
      async getEntries(): Promise<Record<string, JournalEntry[]>> {
        const raw = await this.jsonGet<Record<string, unknown[]>>('/entries');
        const result: Record<string, JournalEntry[]> = {};
        for (const [entityId, entries] of Object.entries(raw)) {
          result[entityId] = (entries ?? []).map(deserialiseEntry);
        }
        return result;
      }
      async saveEntries(entries: Record<string, JournalEntry[]>): Promise<void> {
        await this.jsonPut('/entries', entries);
      }

      async getAuditLogs(): Promise<AuditLog[]> { return this.jsonGet<AuditLog[]>('/audit'); }
      async saveAuditLogs(logs: AuditLog[]): Promise<void> { await this.jsonPut('/audit', logs); }
      async appendAuditLog(log: AuditLog): Promise<void> { await this.jsonPost('/audit', log); }

      // W1: decimal-as-string boundary applied on export as well
      async exportAll(): Promise<PersistedRoot> {
        const raw = await this.jsonGet<Record<string, unknown>>('/export');
        const allEntriesRaw = (raw.allEntries as Record<string, unknown[]> | undefined) ?? {};
        const allEntries: Record<string, JournalEntry[]> = {};
        for (const [entityId, entries] of Object.entries(allEntriesRaw)) {
          allEntries[entityId] = (entries ?? []).map(deserialiseEntry);
        }
        return {
          _v: raw._v as number,
          entities: (raw.entities as Entity[] | undefined) ?? [],
          accounts: (raw.accounts as Account[] | undefined) ?? [],
          allEntries,
          auditLogs: (raw.auditLogs as AuditLog[] | undefined) ?? [],
        };
      }
      async importAll(state: PersistedRoot): Promise<void> { await this.jsonPost('/import', state); }
    }
    ```

    Step 2 - Widen `src/lib/ai.ts`. Adds the `GEMINI_MODEL` constant (cleanup — moves the model string off duplicated literals) AND the `isAiEnabled()` runtime function:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */

    import { getCachedHealth, getAdapterKind } from '../storage';

    /**
     * Gemini model literal. Single source of truth — imported by:
     *   - src/components/ImportTB.tsx (the SPA AI flow)
     *   - server/routes/ai.ts (uses the same literal in GEMINI_MODEL_DEFAULT;
     *     a test in this file asserts the two stay in sync)
     */
    export const GEMINI_MODEL = 'gemini-3-flash-preview';

    /**
     * Build-time fallback for local-mode (no server in this install).
     * vite.config.ts injects process.env.GEMINI_API_KEY via the define block,
     * so this read is replaced with the literal value at build time.
     * 'MY_GEMINI_API_KEY' (the .env.example placeholder) = "not configured".
     */
    function buildTimeKeyConfigured(): boolean {
      return Boolean(
        process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      );
    }

    /**
     * Runtime AI availability gate. Widened in Phase 3 to be runtime-aware.
     *
     * - server mode: reads from /api/health.aiEnabled (the server holds the key)
     * - local mode: falls back to build-time env-injected key (Phase 2 behaviour)
     *
     * Components MUST call this as a function, not import a constant.
     */
    export function isAiEnabled(): boolean {
      if (getAdapterKind() === 'server') {
        return Boolean(getCachedHealth()?.aiEnabled);
      }
      return buildTimeKeyConfigured();
    }

    /**
     * @deprecated Use `isAiEnabled()` instead. Retained for backwards
     * compatibility; resolves at module-load to the local-mode value.
     * Will be removed once all call sites migrate to the function form.
     */
    export const IS_AI_ENABLED: boolean = buildTimeKeyConfigured();
    ```

    Step 3 - Replace `src/lib/__tests__/ai.test.ts` `.todo` with GREEN tests. Add a literal-equality assertion that pins `GEMINI_MODEL` to the same string used in `server/routes/ai.ts` `GEMINI_MODEL_DEFAULT`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
    import { isAiEnabled, IS_AI_ENABLED, GEMINI_MODEL } from '../ai';
    import { _resetAdapter, initAdapter } from '../../storage';

    beforeEach(() => {
      _resetAdapter();
      localStorage.clear();
    });
    afterEach(() => { vi.unstubAllGlobals(); });

    describe('IS_AI_ENABLED widened (Phase 3)', () => {
      it('server-mode flag derives from /api/health.aiEnabled', async () => {
        vi.stubGlobal('fetch', vi.fn(async () =>
          new Response(JSON.stringify({ ok: true, version: 2, aiEnabled: true }), { status: 200 })));
        await initAdapter();
        expect(isAiEnabled()).toBe(true);
      });

      it('server-mode disabled flag => isAiEnabled() = false', async () => {
        vi.stubGlobal('fetch', vi.fn(async () =>
          new Response(JSON.stringify({ ok: true, version: 2, aiEnabled: false }), { status: 200 })));
        await initAdapter();
        expect(isAiEnabled()).toBe(false);
      });

      it('local-mode (probe fails) falls back to build-time key', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));
        await initAdapter();
        const localResult = isAiEnabled();
        expect(typeof localResult).toBe('boolean');
        expect(localResult).toBe(IS_AI_ENABLED);
      });

      it('GEMINI_MODEL constant matches server/routes/ai.ts GEMINI_MODEL_DEFAULT literal', () => {
        // The server side intentionally hardcodes the same string to avoid pulling
        // src/lib/ai.ts (and its React/storage deps) into the server bundle.
        // This test pins them together — if either changes the other must too.
        expect(GEMINI_MODEL).toBe('gemini-3-flash-preview');
      });
    });
    ```

    Step 4 - Update `src/components/ImportTB.tsx` runAIMapping to use the server proxy AND import `GEMINI_MODEL` (cleanup). Replace the existing `runAIMapping` function (lines ~103-169) and the top-level Gemini SDK import:

    Remove `import { GoogleGenAI, Type } from "@google/genai";` from the imports.

    Replace any `import { IS_AI_ENABLED } from '../lib/ai'` with:
    ```typescript
    import { isAiEnabled, GEMINI_MODEL } from '../lib/ai';
    ```

    Replace `runAIMapping` body with:
    ```typescript
      const runAIMapping = async () => {
        if (!isAiEnabled()) return;

        setIsProcessing(true);
        try {
          const prompt = `
            You are an expert Australian accountant.
            I have a list of accounts from an external system and I need to map them to my internal Chart of Accounts.

            Internal Chart of Accounts:
            ${accounts.map(a => `${a.id}: ${a.code} - ${a.name} (${a.type})`).join('\n')}

            External Accounts to map:
            ${fileData.map(a => `${a.externalCode} ${a.externalName}`).join('\n')}

            Return a JSON array of objects with:
            - externalCode: string
            - mappedAccountId: string (must be one of the internal IDs provided)
            - confidence: number (0 to 1)
            - reasoning: string (briefly why)
          `;

          const responseSchema = {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                externalCode: { type: 'STRING' },
                mappedAccountId: { type: 'STRING' },
                confidence: { type: 'NUMBER' },
                reasoning: { type: 'STRING' },
              },
              required: ['externalCode', 'mappedAccountId', 'confidence'],
            },
          };

          const res = await fetch('/api/ai/match-accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, model: GEMINI_MODEL, responseSchema }),
          });
          if (!res.ok) {
            console.error('AI Mapping failed', res.status, await res.text());
            alert('AI Mapping failed. Please map manually.');
            return;
          }
          const geminiBody = await res.json();
          const textPart = geminiBody?.candidates?.[0]?.content?.parts?.[0]?.text;
          const mappings: Array<{ externalCode: string; mappedAccountId: string; confidence: number; reasoning?: string }> =
            typeof textPart === 'string' ? JSON.parse(textPart) : [];

          const updatedData = fileData.map(item => {
            const mapping = mappings.find(m => m.externalCode === item.externalCode);
            return {
              ...item,
              mappedAccountId: mapping?.mappedAccountId,
              confidence: mapping?.confidence,
              reasoning: mapping?.reasoning,
            };
          });

          setFileData(updatedData);
          setMappingComplete(true);
        } catch (error) {
          console.error('AI Mapping failed', error);
          alert('AI Mapping failed. Please map manually.');
        } finally {
          setIsProcessing(false);
        }
      };
    ```

    Also update any other usages of `IS_AI_ENABLED` in ImportTB.tsx to `isAiEnabled()` (function call).

    Step 5 - **W3:** Update `src/components/__tests__/ImportTB.test.tsx`. This file EXISTS (verified at planning time). The Phase 2 version mocks `GoogleGenAI` from `@google/genai`. With Step 4's change, ImportTB no longer imports the SDK; the mock targets shift to `fetch('/api/ai/match-accounts')` and `isAiEnabled()`/`getAdapterKind()`.

    Open the file first. For each test that exercises AI-mapping:
    1. Remove or simplify `vi.mock('@google/genai', ...)` blocks. Note: `src/test/setup.ts` from Plan 03-1 still has the global `@google/genai` mock — leave that alone. The local-file mock (if any) just needs to not interfere.
    2. Replace with `vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo) => { ... }))` patterns that return a Gemini-shaped body when the URL contains `/api/ai/match-accounts`:
    ```typescript
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/api/ai/match-accounts')) {
        return new Response(JSON.stringify({
          candidates: [{
            content: { parts: [{ text: JSON.stringify([
              { externalCode: 'X1', mappedAccountId: 'acc-1', confidence: 0.9, reasoning: 'match' },
            ]) }] },
          }],
        }), { status: 200 });
      }
      if (url.includes('/api/health')) {
        return new Response(JSON.stringify({ ok: true, version: 2, aiEnabled: true }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }));
    ```
    3. For tests asserting "AI button hidden when key absent", set `_resetAdapter()` + `initAdapter()` with a fetch stub that returns `aiEnabled: false` so `isAiEnabled()` returns false.
    4. Preserve every existing test's INTENT — what it asserted before about the AI flow should still be asserted, just via the new fetch path.
    5. If the existing test file has no test bodies that meaningfully exercise the AI path (e.g. only smoke-render tests), leave it as-is and document in summary that AI flow is covered by `src/lib/__tests__/ai.test.ts` instead.

    Step 6 - Replace `src/storage/__tests__/server.test.ts` `.todo` with GREEN tests, including the decimal-deserialise boundary check (W1):
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect, afterEach, vi } from 'vitest';
    import { ServerAdapter } from '../server';
    import { AdapterUnreachableError, AdapterValidationError } from '../adapter';
    import type { Entity, AuditLog } from '../../types';

    afterEach(() => { vi.unstubAllGlobals(); });

    describe('ServerAdapter (HTTP)', () => {
      it('getEntities issues GET /api/entities and parses JSON', async () => {
        const ent: Entity = { _v: 2, id: 'e1', name: 'X', type: 'Company', status: 'Active' };
        vi.stubGlobal('fetch', vi.fn(async () =>
          new Response(JSON.stringify([ent]), { status: 200 })));
        const a = new ServerAdapter();
        expect(await a.getEntities()).toEqual([ent]);
      });

      it('saveEntities issues PUT /api/entities with JSON body', async () => {
        const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const a = new ServerAdapter();
        await a.saveEntities([{ _v: 2, id: 'e1', name: 'X', type: 'Company', status: 'Active' }]);
        expect(fetchMock).toHaveBeenCalledWith('/api/entities', expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }));
      });

      it('appendAuditLog issues POST /api/audit', async () => {
        const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const a = new ServerAdapter();
        await a.appendAuditLog({ _v: 2, id: 'a1', timestamp: '2026-01-01T00:00:00Z', user: 'u', action: 'CREATE_ENTITY', details: 'd' });
        expect(fetchMock).toHaveBeenCalledWith('/api/audit', expect.objectContaining({ method: 'POST' }));
      });

      it('saveAuditLogs issues PUT /api/audit', async () => {
        const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const a = new ServerAdapter();
        const logs: AuditLog[] = [{ _v: 2, id: 'a1', timestamp: '2026-01-01T00:00:00Z', user: 'u', action: 'CREATE_ENTITY', details: 'd' }];
        await a.saveAuditLogs(logs);
        expect(fetchMock).toHaveBeenCalledWith('/api/audit', expect.objectContaining({ method: 'PUT' }));
      });

      it('exportAll issues GET /api/export', async () => {
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({ _v: 2, entities: [], accounts: [], allEntries: {}, auditLogs: [] }), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const a = new ServerAdapter();
        const result = await a.exportAll();
        expect(result._v).toBe(2);
        expect(fetchMock).toHaveBeenCalledWith('/api/export');
      });

      it('importAll issues POST /api/import', async () => {
        const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const a = new ServerAdapter();
        await a.importAll({ _v: 2, entities: [], accounts: [], allEntries: {}, auditLogs: [] });
        expect(fetchMock).toHaveBeenCalledWith('/api/import', expect.objectContaining({ method: 'POST' }));
      });

      it('throws AdapterUnreachableError on 500', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));
        const a = new ServerAdapter();
        await expect(a.getEntities()).rejects.toBeInstanceOf(AdapterUnreachableError);
      });

      it('throws AdapterValidationError on 400', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"validation"}', { status: 400 })));
        const a = new ServerAdapter();
        await expect(a.saveEntities([])).rejects.toBeInstanceOf(AdapterValidationError);
      });

      it('getEntries deserialises decimal-as-string TEXT values via money.ts (W1 boundary)', async () => {
        // Server returns debit/credit/taxAmount as strings ("12.34500" preserves Decimal precision).
        // ServerAdapter must call deserialize() so the returned JournalLine has numbers.
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
          'ent-1': [{
            _v: 2,
            id: 'j1', date: '2026-01-01', reference: 'R1', description: 'd', isPosted: true,
            lines: [{
              _v: 2,
              accountId: 'acc-1', description: 'l',
              debit: '100.50000', credit: '0.00000', taxAmount: '10.05000',
              isManualTax: undefined,
            }],
          }],
        }), { status: 200 })));
        const a = new ServerAdapter();
        const result = await a.getEntries();
        const line = result['ent-1'][0].lines[0];
        // After deserialize, the values must be numbers (not strings).
        expect(typeof line.debit).toBe('number');
        expect(typeof line.credit).toBe('number');
        expect(typeof line.taxAmount).toBe('number');
        expect(line.debit).toBeCloseTo(100.5, 4);
        expect(line.taxAmount).toBeCloseTo(10.05, 4);
      });
    });
    ```

    Step 7 - Update `src/test/setup.ts` if necessary to remove the `@google/genai` mock now that ImportTB.tsx no longer imports it. Check if any other component still imports `@google/genai`; if not, remove the mock. If yes, keep it. Likely SAFE to remove — Phase 2's ImportTB.tsx was the only consumer. Leave the mock in (defence-in-depth) if uncertain.

    Step 8 - Verify:
    - `npm run lint` exits 0
    - `npm run test` exits 0 — SPA suite green, includes ai.test.ts widened, includes server.test.ts widened with decimal boundary, includes updated ImportTB.test.tsx
    - `npm run test:server` exits 0
    - `npm run build` exits 0 (Vite production build still works — no longer needs @google/genai in bundle path if removed; but the package can stay in dependencies for now)
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npm run test &amp;&amp; npm run test:server</automated>
  </verify>
  <acceptance_criteria>
    - `src/storage/server.ts` contains literal `export class ServerAdapter implements StorageAdapter`
    - `src/storage/server.ts` does NOT contain literal `throw new Error('ServerAdapter not implemented` (stub fully replaced)
    - `src/storage/server.ts` contains literal `this.jsonGet<Entity[]>('/entities')`
    - `src/storage/server.ts` contains literal `this.jsonPut('/entities'`
    - `src/storage/server.ts` contains literal `this.jsonPost('/audit'` AND `this.jsonPut('/audit'`
    - `src/storage/server.ts` contains literal `AdapterValidationError` AND `AdapterUnreachableError`
    - `src/storage/server.ts` contains literal `import { deserialize } from '../lib/money'` (W1 boundary)
    - `src/storage/server.ts` contains literal `deserialiseLine` (the helper applying deserialize)
    - `src/lib/ai.ts` contains literal `export function isAiEnabled(): boolean`
    - `src/lib/ai.ts` contains literal `getCachedHealth()?.aiEnabled`
    - `src/lib/ai.ts` contains literal `export const GEMINI_MODEL = 'gemini-3-flash-preview'` (cleanup)
    - `src/components/ImportTB.tsx` contains literal `/api/ai/match-accounts`
    - `src/components/ImportTB.tsx` contains literal `import { isAiEnabled, GEMINI_MODEL } from '../lib/ai'`
    - `src/components/ImportTB.tsx` does NOT contain literal `new GoogleGenAI(` (SDK call removed)
    - `src/components/ImportTB.tsx` does NOT contain the literal string `'gemini-3-flash-preview'` (uses GEMINI_MODEL constant)
    - `src/components/ImportTB.tsx` contains literal `isAiEnabled()` (function call)
    - `src/components/__tests__/ImportTB.test.tsx` (existing Phase 2 file) — verified updated: no GoogleGenAI-instantiation assertions remain; fetch-based mocks for `/api/ai/match-accounts` are present OR file documented as smoke-only with no AI assertions
    - `npx vitest run src/lib/__tests__/ai.test.ts -t "server-mode flag"` exits 0
    - `npx vitest run src/lib/__tests__/ai.test.ts -t "GEMINI_MODEL constant matches"` exits 0
    - `npx vitest run src/storage/__tests__/server.test.ts -t "deserialises decimal-as-string"` exits 0
    - `npx vitest run src/storage/__tests__/server.test.ts` exits 0
    - `npm run lint` exits 0
    - `npm run test` exits 0
    - `npm run test:server` exits 0
  </acceptance_criteria>
  <done>
    ServerAdapter fully implemented over HTTP with money.ts deserialise boundary (W1); IS_AI_ENABLED widened to runtime-aware isAiEnabled() reading getCachedHealth(); GEMINI_MODEL constant exported (cleanup, single source of truth); ImportTB.tsx Gemini SDK call replaced with /api/ai/match-accounts fetch using GEMINI_MODEL; ImportTB.test.tsx mocks updated to stub fetch (W3); all related tests GREEN.
  </done>
</task>

</tasks>

<verification>
After all three tasks complete:
1. `npm run lint` exits 0
2. `npm run test` exits 0 (SPA suite + new server.test.ts + ai.test.ts widened + ImportTB.test.tsx updated)
3. `npm run test:server` exits 0 (6 server test files GREEN)
4. `npm run build:server` exits 0 (server compiles to server/dist/server/ AND server/dist/src/lib/migrations/ AND server/dist/src/lib/schemas.js)
5. `npm run build` exits 0 (Vite production build)
6. Manual smoke: `npm run dev:server` boots Express on 127.0.0.1:4000; `curl http://127.0.0.1:4000/api/health` returns `{ ok: true, version: 2, aiEnabled: <bool> }`
7. data/ledger.db file exists after first boot, contains 6 tables
8. SQLite path FND-01: stop server, restart, data still present in DB file (covered by persistence.test.ts unit; manual UAT in Plan 03-4)
9. Decimal precision boundary intact: write a journal entry with `100.50`, restart server, read back — value is `100.50` (not `100.49999...`)
</verification>

<success_criteria>
- DEP-02 fully delivered: Express + better-sqlite3 server with documented deployment shape (binds 127.0.0.1, env vars for PORT/HOST/DB_PATH/GEMINI_API_KEY)
- server/tsconfig.json with rootDir='..' and explicit `include` covering src/lib/migrations + src/lib/schemas (B4)
- buildApp split into server/app.ts (factory, no listen) + server/index.ts (listen wrapper) (B3)
- Shared Zod schemas: server/lib/schema.ts re-exports from src/lib/schemas.ts (W2)
- 001-initial.sql produces 6-table schema with FKs, indexes, CASCADE
- Migration runner is idempotent and records applications in schema_migrations
- All PUT routes are transactional whole-collection replace with Zod validation
- POST /api/import runs migrate() first, then validates, then atomic replace
- POST /api/ai/match-accounts proxies Gemini using server-held key, default model from GEMINI_MODEL literal pinned to src/lib/ai.ts
- ServerAdapter (src/storage/server.ts) implements full StorageAdapter via HTTP with money.ts deserialise boundary on read (W1)
- isAiEnabled() function reads from /api/health.aiEnabled in server mode
- GEMINI_MODEL constant exported from src/lib/ai.ts (cleanup — no more duplicated literal)
- ImportTB.tsx uses fetch('/api/ai/match-accounts') with GEMINI_MODEL instead of GoogleGenAI SDK
- ImportTB.test.tsx (existing Phase 2 file) mocks updated to fetch-based stubs (W3)
- All 6 server-side tests + server.test.ts + ai.test.ts widened are GREEN
- FND-01 server-shape (file durability) and FND-03 (import via server) at unit-test level
- Interface src/storage/adapter.ts UNCHANGED (FINAL from Plan 03-1)
</success_criteria>

<output>
After completion, create `.planning/phases/03-durable-persistence/03-3-SUMMARY.md` summarising:
- Server files created (13+ files: tsconfig, env, db/client, db/migrate, db/migrations/001-initial.sql, lib/schema.ts re-export, 7 routes, app.ts, index.ts)
- ServerAdapter swap (stub -> full impl) WITH money.ts deserialise boundary on read (W1)
- AI proxy migration (Gemini SDK call -> fetch /api/ai/match-accounts; model literal moved to src/lib/ai.ts GEMINI_MODEL constant)
- isAiEnabled() runtime widening
- server/tsconfig.json `rootDir: ".."` decision: server emits to `server/dist/server/` and pulls in src/lib/migrations + src/lib/schemas (B4)
- buildApp split (server/app.ts factory + server/index.ts listen wrapper — B3)
- Shared Zod schemas via re-export from src/lib/schemas.ts (W2)
- ImportTB.test.tsx mocks updated for fetch path (W3)
- Tests: count GREEN per suite (SPA + server)
- Build status (npm run build, npm run build:server)
- Confirmation: `src/storage/adapter.ts` was NOT modified (interface FINAL from Plan 03-1)
- Windows native build note: document that better-sqlite3 requires VS Build Tools; optionalDependencies allows install to skip; CI on ubuntu-latest will exercise server suite
- Hand-off to 03-4: vite.config.ts needs server.proxy = { '/api': 'http://localhost:4000' }; dev:full script integration smoke; DataPage UI consumes getAdapterKind() + getFellBackToLocal() + adapter.exportAll(); Plan 03-4 implements the "Server unreachable" banner (W5)
</output>
