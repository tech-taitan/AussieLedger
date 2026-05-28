# Phase 3: Durable Persistence — Research

**Researched:** 2026-05-11
**Domain:** Storage adapter (IndexedDB local + Express/better-sqlite3 server), JSON export/import, server-side migration runner, Gemini AI proxy
**Confidence:** HIGH on locked architecture; MEDIUM on Windows native-build prerequisites (verified against multiple official issues); HIGH on validation strategy

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Workspace shape**
- One install = one workspace. Single IndexedDB DB / single SQLite file. No `workspace_id` column.
- Schema is normalised, not blob. SQLite tables: `entities`, `accounts`, `journal_entries`, `journal_lines`, `audit_logs`, plus `schema_migrations`. IndexedDB mirrors with one object store per collection.
- Per-collection coarse adapter API: `getX/saveX` per collection (entities, accounts, entries, audit), `appendAuditLog`, `exportAll`, `importAll`, `ready()`. NOT per-record CRUD.
- Naive whole-collection save preserved from Phase 2 hooks. SQLite adapter translates `saveEntries(map)` into `DELETE FROM journal_lines WHERE entry_id IN (...); DELETE FROM journal_entries WHERE entity_id = ?; INSERT ...` in a transaction.

**Adapter selection & startup**
- Runtime probe `fetch('/api/health', { signal: AbortSignal.timeout(500) })` × 6 (~3s budget). Success → `ServerAdapter`. Exhaustion → `LocalAdapter`.
- Banner ONLY when server was expected (heuristic TBD by planner — likely env flag or `server/data/` presence at build time).
- `AbortSignal.timeout(500)` — native, no extra dep.
- Same build artefact for both shapes. No build-time mode flag.

**localStorage → IndexedDB migration**
- One-time, automatic, transparent. Reads four legacy keys (`ledger_entities_list`, `ledger_all_entries`, `ledger_audit_logs`, `ledger_chart_of_accounts`).
- Assembles into `PersistedRoot`, runs through existing `migrate()` from `src/lib/migrations/index.ts`, writes to IndexedDB.
- Removes legacy keys ONLY after all writes succeed.
- Failure → leave localStorage untouched, surface `MigrationError` component.
- No prompt — silent first-run plumbing.

**`npm run dev:full` shape**
- Add `concurrently` as devDependency.
- Scripts:
  - `dev`: unchanged (Vite only)
  - `dev:server`: `tsx watch server/index.ts`
  - `dev:full`: `concurrently -k -n vite,api -c blue,magenta "npm:dev" "npm:dev:server"`
  - `build:server`: `tsc -p server/tsconfig.json` (or `tsx` runtime — Claude's discretion)
  - `start:server`: `node server/dist/index.js`
- Vite proxy `/api` → `http://localhost:4000`. Server port `4000`, configurable via `PORT`.
- Server entry `server/index.ts`. Reads `PORT`, `DB_PATH` (default `./data/ledger.db`), `GEMINI_API_KEY`, `HOST` (default `127.0.0.1`).
- `data/` is gitignored.

**Export / Import**
- JSON only in Phase 3. CSV (FND-02 second half) deferred.
- Filename: `aussieledger-{YYYY-MM-DD}-{HHmm}.json`. Local time, no timezone suffix.
- Export payload: `{ "_v": 2, "entities": [...], "accounts": [...], "allEntries": { "ent-1": [...] }, "auditLogs": [...] }`. No metadata wrapper.
- Import semantics: replace-with-confirmation. Type literal `REPLACE` (uppercase, case-sensitive, no partial match).
- Imported JSON passed through `migrate()` before write.
- Refuse newer version with `MigrationError` component.
- UI: sidebar nav adds "Data" entry. Page contains Export button, Import button, last-export timestamp, current schema version, current adapter type.

**Server scope**
- No auth in Phase 3. Express binds `127.0.0.1` by default; `HOST=0.0.0.0` is an explicit env flip. README documents reverse-proxy approach for VPS.
- AI proxy ships: `POST /api/ai/match-accounts` forwards to Google with server's `GEMINI_API_KEY`.
- AI feature detection:
  - Local: `Boolean(import.meta.env.VITE_GEMINI_API_KEY && ... !== 'MY_GEMINI_API_KEY')`
  - Server: `/api/health` returns `{ ok, version, aiEnabled }`; SPA reads `aiEnabled`.
- API surface (REST per collection):
  - `GET /api/health` → `{ ok: true, version: 2, aiEnabled: boolean }`
  - `GET /api/entities` / `PUT /api/entities` (whole-collection replace, transactional)
  - `GET /api/accounts` / `PUT /api/accounts`
  - `GET /api/entries` / `PUT /api/entries` (entity-id keyed map)
  - `GET /api/audit` / `POST /api/audit` (append-only)
  - `GET /api/export` / `POST /api/import`
  - `POST /api/ai/match-accounts`
- All `PUT` writes transactional (`db.transaction(...)`). Adapter-side, hooks save whole collection; SQLite delete-then-insert within single transaction.
- Server-side schema migrations: numbered `.sql` files under `server/db/migrations/`. Runner reads `schema_migrations` table on boot, applies unapplied files in alphabetical order. `001-initial.sql` creates all six tables matching `_v: 2` shape.

**Round-trip migration test**
- Vitest test (location: `src/storage/__tests__/round-trip.test.ts` or `src/lib/migrations/__tests__/round-trip.test.ts`).
- Hand-built `_v: 0` blob → `migrate(blob)` → `adapter.importAll(blob)` → `adapter.exportAll()` → assert exported equals migrated.

### Claude's Discretion

- **IndexedDB wrapper:** `idb` (Jake Archibald) vs hand-rolled — Claude's call (`idb` recommended but not prescribed).
- **ID strategy:** Existing string IDs preserved. SQLite `id TEXT PRIMARY KEY`, no autoincrement. FKs are TEXT-to-TEXT.
- **Account FK from journal_lines:** Store account *code* as TEXT; do not add a hard FK constraint to `accounts.code` (defer until Phase 4 decides immutability).
- **Soft-delete vs hard-delete:** Hard-delete in Phase 3 (matches Phase 2 hooks).
- **Server logging:** Plain stdout/stderr. No logger lib.
- **Dev banner shape:** Toast vs persistent strip vs inline — Claude's call; match existing visual system.
- **Force-mode hatch** (`localStorage.setItem('storageMode', ...)`) — implement if cheap, skip if it complicates the boot path.
- **better-sqlite3 native build for Windows dev:** README documents prerequisites for `dev:full`.
- **Empty-state copy** for the Data page when no exports have happened yet.
- **Test fixture organisation** for the round-trip test — single shared fixture vs inline.
- **IndexedDB database name** — `aussieledger` is fine; document eviction behaviour.

### Deferred Ideas (OUT OF SCOPE)

- CSV export (FND-02 second half) — per-report CSV lands in Phase 4/5.
- Auth on the server shape — document the "bind localhost + reverse proxy" workaround.
- Workspace_id / multi-client data model — Phase 6 decides.
- Live IndexedDB ↔ SQLite sync — never. Users pick one shape per install.
- Server-side request logging / metrics — defer.
- Hard FK from `journal_lines.account_code` → `accounts.code` — wait for Phase 4.
- Soft-delete for entities/accounts/journals — Phase 4 audit-trail decides.
- Native PDF export — Phase 5 (TAX-02).
- Server-side schema downgrade — explicitly refused.
- Per-record adapter API — defer until query performance forces it.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FND-01 | User's bookkeeping data survives a browser cache clear (durable persistence; not localStorage-only) | IndexedDB durability in §10; SQLite file in §11. Section "Validation Architecture" describes Cache-Clear test (UNIT for IDB write, MANUAL for browser cache-clear). |
| FND-02 | User can export their entire dataset as JSON and CSV | JSON export shape locked in CONTEXT; §12 covers import validation. CSV deferred — verification must explicitly document FND-02 as "partially delivered". |
| FND-03 | User can import a previously-exported JSON dataset to restore on the same or different instance | §12 import validation; round-trip test (`success criterion #3 + #5`). |
| DEP-02 | An optional Express + better-sqlite3 server can be started for shared/firm instances, with documented deployment steps | §2 Windows build, §3 concurrently, §4 server file structure, §11 migration runner. README must document both shapes. |

</phase_requirements>

## Summary

This phase implements a `StorageAdapter` interface with two concrete implementations: `LocalAdapter` (IndexedDB via `idb`) and `ServerAdapter` (HTTP → Express → better-sqlite3). Adapter selection happens once at boot via a `/api/health` probe; failure falls back to local mode. All hooks are refactored from synchronous `localStorage` calls to async adapter calls with a `ready` guard. An Express+better-sqlite3 server (under `server/`) provides REST endpoints per collection with whole-collection transactional replaces. A numbered `.sql` migration runner manages the SQLite schema. The Gemini AI call moves to a server-side proxy. Existing `localStorage` data is auto-migrated through the Phase 1/2 `migrate()` ladder before being copied to IndexedDB.

**Primary recommendation:** Use `idb@^8` for the IndexedDB wrapper. Use `better-sqlite3@^11` server-side with `@types/better-sqlite3` for types. Use `concurrently@^9` for the `dev:full` script. Use `fake-indexeddb@^6` for tests with manual global assignment (not `/auto`) due to Vitest setup-file load order. Use `zod@^3.23` for `/api/import` body validation — small (~2kB), zero-dep, idiomatic with TypeScript. Defer signing/auth/sync. Document Windows native-build prerequisites in README.

---

## Recommended Approach

### 1. `idb` vs hand-rolled IndexedDB

**Recommendation:** **Use `idb` (Jake Archibald)**, current major version **8.x**.

**Rationale:**
- ~1.2 kB brotli'd. Negligible bundle cost.
- Thin promise wrapper over raw IndexedDB. No abstraction overhead — every `idb` call maps one-to-one to a native IndexedDB request, just returned as a promise.
- Strong TypeScript types via a generic `DBSchema` interface that ties object store names to their value/key types at compile time.
- Mature: stable API for years, no major breakages, used in Google's `workbox` and many PWA codebases.
- Hand-rolled IndexedDB is 80–120 lines of error-prone request/onupgradeneeded/onsuccess wiring that doesn't compose with `await`. The bug surface area dwarfs the dependency.

Skeleton (see §"Code Skeletons" for full LocalAdapter).

**Confidence:** HIGH (verified: npm registry, official GitHub).

### 2. better-sqlite3 on Windows

**Recommendation:** Use `better-sqlite3@^11` (current major). Document prerequisites in README. Provide an escape hatch (`dev:server` only — not `dev:full`) so Windows users who can't build natively can still use the SPA in `npm run dev` (IndexedDB) mode.

**Windows prerequisites for `npm install` to succeed:**

1. **Python 3.x** on PATH (used by `node-gyp` to drive the build). Microsoft Store Python works; Anaconda/Python embeddable does not (no PATH integration).
2. **Visual Studio Build Tools 2022** with the "Desktop development with C++" workload installed. The free Build Tools download is sufficient — no full Visual Studio IDE required. Approx 6 GB on disk.
3. **Node version compatibility:** As of 2026, better-sqlite3 ships prebuilt binaries for **Linux x64/arm64 and macOS x64/arm64 only**. **Windows always builds from source.** This is verified against GitHub issue #355 ("prebuild binaries for windows") which remains open as of research date. Therefore, the Windows author MUST have a working `node-gyp` toolchain.
4. **Node LTS recommended.** Stay on Node 20.x or 22.x LTS — better-sqlite3 prebuilt manifest lags Node majors by weeks/months. Newer-than-LTS Node forces a from-source build even on platforms that normally have prebuilds.

**Pre-built binary path to avoid the build:** None on Windows. There is no `--ignore-scripts` shortcut that yields a working binary; the package genuinely needs to compile.

**Mitigation strategy for the repo:**
- Add a one-time README setup note: "On Windows, install Python 3 (Microsoft Store) and Visual Studio Build Tools 2022 with the C++ workload before `npm install`. macOS/Linux receive prebuilt binaries."
- Make `better-sqlite3` an `optionalDependencies` entry rather than a hard `dependencies` entry. This way `npm install` continues even if the native build fails — the SPA still works in IndexedDB-only mode (`npm run dev`). The `dev:full` script will then fail loudly when the server tries to load the missing native binding, which is the right signal.
- Consider documenting `npm install --no-optional` for the local-only setup path.

**Alternatives considered:**
- `sqlite3` (the older one): different API, async-first, larger surface. Rejected. Project research already locked better-sqlite3.
- `node:sqlite` (Node 22.5+ built-in, behind `--experimental-sqlite`): synchronous API, no native build, no prebuilt issues. **Promising for v2.** Not recommended for Phase 3 because (a) requires Node 22.5+ and `--experimental-sqlite` flag at runtime, (b) API surface still moving, (c) CONTEXT locks better-sqlite3.

**Confidence:** MEDIUM-HIGH (Windows path verified via GitHub issue #355 directly; Node-LTS recommendation is established advice; node:sqlite is a forward-looking alternative not in Phase 3 scope).

### 3. `concurrently` integration

**Recommendation:** Use `concurrently@^9` (current major). Lock the script verbatim from CONTEXT:

```json
{
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "dev:server": "tsx watch server/index.ts",
    "dev:full": "concurrently -k -n vite,api -c blue,magenta \"npm:dev\" \"npm:dev:server\"",
    "build": "vite build",
    "build:server": "tsc -p server/tsconfig.json",
    "start:server": "node server/dist/index.js",
    "test": "vitest run",
    "lint": "tsc --noEmit && tsc -p server/tsconfig.json --noEmit"
  }
}
```

**Flag explanation:**
- `-k` = `--kill-others`: when any child exits, kill the rest. Critical so Ctrl+C from the terminal cleanly stops both. (CONTEXT spec'd `-k`; this is correct.)
- `-n vite,api` = process names (instead of command strings) in log prefixes. Cleaner output.
- `-c blue,magenta` = colours for the two prefixes. Visible against typical terminal backgrounds.
- `"npm:dev"` and `"npm:dev:server"` = shorthand that concurrently resolves to `npm run dev` and `npm run dev:server`. Avoids quoting issues on Windows cmd.exe.

**Vite proxy config snippet** for `vite.config.ts` (preserving WebSocket HMR — Vite HMR uses its own dev-server socket, NOT `/api`, so `ws: true` is NOT needed on the `/api` proxy. Setting `ws: true` would actually break things by intercepting non-/api websocket traffic):

```typescript
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: { alias: { '@': path.resolve(__dirname, '.') } },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          // ws: false — Vite HMR uses its own websocket; do NOT enable ws here.
          // Path is forwarded as-is: /api/health → http://localhost:4000/api/health
        },
      },
    },
  };
});
```

**Windows-specific note:** `concurrently` handles cross-platform process spawning correctly (uses `cross-spawn` internally). No PowerShell/cmd.exe quoting issues if you use `npm:script-name` shorthand.

**Confidence:** HIGH (verified: official concurrently README + Vite server.proxy docs).

### 4. Server file structure

**Recommended layout:**

```
server/
├── tsconfig.json              # Distinct from SPA tsconfig; outDir=dist, module=commonjs or nodenext
├── index.ts                   # Express app, port binding, route registration
├── env.ts                     # Reads PORT/DB_PATH/HOST/GEMINI_API_KEY with defaults; single source of truth
├── db/
│   ├── client.ts              # better-sqlite3 singleton, WAL pragma, connection setup
│   ├── migrate.ts             # ~30-line migration runner (reads schema_migrations table, applies .sql files in order)
│   └── migrations/
│       └── 001-initial.sql    # CREATE TABLE entities, accounts, journal_entries, journal_lines, audit_logs, schema_migrations
├── routes/
│   ├── health.ts              # GET /api/health → { ok, version, aiEnabled }
│   ├── entities.ts            # GET, PUT /api/entities
│   ├── accounts.ts            # GET, PUT /api/accounts
│   ├── entries.ts             # GET, PUT /api/entries
│   ├── audit.ts               # GET, POST /api/audit
│   ├── exportImport.ts        # GET /api/export, POST /api/import
│   └── ai.ts                  # POST /api/ai/match-accounts (Gemini proxy)
└── lib/
    └── schema.ts              # Zod schemas for request body validation (shared between routes)
```

**Why this layout:**
- One file per route file = trivially findable when debugging "what does PUT /api/entries do?"
- `db/migrate.ts` separate from `db/client.ts` because the runner has its own test surface (golden test: known migrations directory → final schema state).
- `lib/schema.ts` shared because `PUT /api/entities` and `POST /api/import` both validate similar Entity arrays.
- `env.ts` centralises defaults so tests can override via process.env without touching individual routes.

**TypeScript boilerplate (server/tsconfig.json):**
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
    "rootDir": ".",
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["**/*.ts"],
  "exclude": ["dist", "node_modules"]
}
```

`tsx` handles `.ts` imports at dev-time so no `.js` extension dance is needed during `npm run dev:server`. Production (`build:server` then `start:server`) emits CommonJS or ESM to `server/dist/`.

**Confidence:** HIGH (standard Express+TS pattern; verified against w3tecch/express-typescript-boilerplate as reference).

### 5. Adapter contract typing

**Interface in `src/storage/adapter.ts`:**

```typescript
import type { Entity, Account, JournalEntry, AuditLog } from '../types';
import type { PersistedRoot } from '../lib/migrations';

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

  /** Append-only audit log; cheaper than full re-save. */
  appendAuditLog(log: AuditLog): Promise<void>;

  /** Full state snapshot for export. */
  exportAll(): Promise<PersistedRoot>;

  /** Replace all state from a (migrated) PersistedRoot. Atomic. */
  importAll(state: PersistedRoot): Promise<void>;
}

/** Discriminator for diagnostics / status line on Data page. */
export type AdapterKind = 'local' | 'server';
export interface AdapterInfo {
  kind: AdapterKind;
  ready(): Promise<void>;
}
```

**`ready()` semantics — RECOMMENDED: promise that resolves once first load completes.**

Why promise, not boolean flag:
- React hooks need to `await` it on mount, then set a local `ready` boolean for render gating. The adapter owns its own initialisation state; consumers don't need to poll.
- Idempotent: calling `ready()` 100 times returns the same already-resolved promise after init.
- Composable: `Promise.all([adapter.ready(), otherInit()])` is trivial; an `isReady` boolean isn't.

Implementation pattern (both adapters):
```typescript
class LocalAdapter implements StorageAdapter {
  private readyPromise: Promise<void>;
  constructor() { this.readyPromise = this.init(); }
  ready() { return this.readyPromise; }
  private async init() { /* open DB, run legacy migration, ... */ }
}
```

**Async error propagation:**
- Adapter methods reject with `Error` instances with descriptive `.message`.
- `ServerAdapter` wraps fetch failures into custom error classes (`AdapterUnreachableError`, `AdapterValidationError`) so hooks can distinguish "server gone" from "bad data".
- Hooks should NOT swallow errors silently. The save path should surface a toast on failure ("Failed to save journals — your changes are not persisted").
- `MigrationError` component already exists from Phase 1 — reuse for irrecoverable migration/version errors at boot.

**Confidence:** HIGH.

### 6. Hook refactor pattern

**Before (Phase 2 `useEntities`):**
```typescript
const [entities, setEntities] = useState<Entity[]>(DEFAULT_ENTITIES);

useEffect(() => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Entity[];
    if (Array.isArray(parsed)) setEntities(parsed);
  } catch (err) { console.error(...); }
}, []);

useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entities));
}, [entities]);
```

**After (Phase 3):**
```typescript
import { getAdapter } from '../storage';

const [entities, setEntities] = useState<Entity[]>(DEFAULT_ENTITIES);
const [ready, setReady] = useState(false);

useEffect(() => {
  let cancelled = false;
  (async () => {
    const adapter = await getAdapter();
    await adapter.ready();
    const loaded = await adapter.getEntities();
    if (cancelled) return;
    if (loaded.length > 0) setEntities(loaded);
    setReady(true);
  })().catch(err => {
    console.error('useEntities load failed', err);
    setReady(true); // unblock UI even on error; user can re-import
  });
  return () => { cancelled = true; };
}, []);

useEffect(() => {
  if (!ready) return;
  getAdapter().then(a => a.saveEntities(entities)).catch(err => {
    console.error('useEntities save failed', err);
  });
}, [entities, ready]);
```

**Key changes:**
1. `getAdapter()` returns a memoised `Promise<StorageAdapter>` — adapter selection probe runs once.
2. `ready` guard prevents the save effect from firing before the initial load lands (which would otherwise overwrite real data with `DEFAULT_ENTITIES` on first render).
3. `cancelled` flag handles the unmount-before-load case.
4. Errors are logged but don't crash the render — degraded UX is better than a white screen for a save failure.

**Composition pattern (avoid "all four ready" gate at App level):**

Each hook owns its own `ready` state. App.tsx does NOT gate the entire render on `entitiesReady && accountsReady && journalsReady && auditReady`. Instead:

- Each hook's `useEffect`-on-change writes only when *its own* `ready` is true.
- Components render with `DEFAULT_ENTITIES` / `CHART_OF_ACCOUNTS` / empty arrays initially. They look identical to the cold-boot state.
- The IndexedDB load completes in <50ms typically (fast even on cold cache); the user sees no flicker.
- For a clean UX, expose a top-level `adapter.ready()` await in `main.tsx` BEFORE `createRoot().render(<App />)`. This blocks the entire initial paint for ~50–3000ms (worst case: server probe exhausts) but avoids any flash-of-default-content. **Recommended.**

```typescript
// src/main.tsx
import { initAdapter } from './storage';

initAdapter().then(() => {
  createRoot(document.getElementById('root')!).render(<App />);
}).catch(err => {
  // Render MigrationError on adapter init failure
  createRoot(document.getElementById('root')!).render(<MigrationError error={err} />);
});
```

Then hooks still keep their `ready` guard internally for the save side, but they can call `getAdapter()` synchronously because it's already resolved.

**Confidence:** HIGH.

### 7. localStorage migration gotchas

**The 4 legacy keys may exist at any of three states:**

| Scenario | What user has | Treatment |
|----------|---------------|-----------|
| Fresh user, never opened the app | Nothing | `localStorage` empty + IndexedDB empty → seed DEFAULTS into IndexedDB |
| Phase 1 prototype user | Legacy keys with `_v: 0` or missing `_v` | Run through `migrate()` ladder 0→1→2 |
| Phase 2 user | Legacy keys with `_v: 2` (post Phase 2's `1→2` migration) | Run through `migrate()` (becomes a no-op for already-current data) |

**Note:** Phase 1 stamped `_v: 1` on persisted root, but the individual `localStorage` keys store *arrays* and *maps*, not the root object. The `_v` lives on each entity/account/log via the optional `_v?: number` field — and not all records carry it (it's optional). Migration treats missing as `0`.

**Safe sequence (in adapter init, before first read):**

```typescript
async function migrateLegacyLocalStorage(adapter: StorageAdapter) {
  // 1. Read all four keys atomically (sync localStorage reads — no race within this function call)
  const keys = {
    entities: localStorage.getItem('ledger_entities_list'),
    entries: localStorage.getItem('ledger_all_entries'),
    accounts: localStorage.getItem('ledger_chart_of_accounts'),
    audit: localStorage.getItem('ledger_audit_logs'),
  };

  // 2. If none exist, nothing to migrate
  const anyExist = Object.values(keys).some(v => v !== null);
  if (!anyExist) return;

  // 3. Check IndexedDB is empty (otherwise this migration already ran)
  const existing = await adapter.getEntities();
  if (existing.length > 0) {
    // Already migrated. Defensively clear legacy keys.
    for (const k of ['ledger_entities_list', 'ledger_all_entries', 'ledger_audit_logs', 'ledger_chart_of_accounts']) {
      localStorage.removeItem(k);
    }
    return;
  }

  // 4. Parse, assemble PersistedRoot, run migrate()
  let raw: Record<string, unknown> = { _v: 0 };
  try {
    if (keys.entities) raw.entities = JSON.parse(keys.entities);
    if (keys.entries) raw.allEntries = JSON.parse(keys.entries);
    if (keys.accounts) raw.accounts = JSON.parse(keys.accounts);
    if (keys.audit) raw.auditLogs = JSON.parse(keys.audit);
  } catch (err) {
    throw new Error(`Legacy localStorage parse failed: ${err}`);
  }

  const migrated = migrate(raw); // throws if invalid; surface to MigrationError

  // 5. Write to IndexedDB via importAll (atomic)
  await adapter.importAll(migrated);

  // 6. ONLY after success, clear legacy keys
  for (const k of ['ledger_entities_list', 'ledger_all_entries', 'ledger_audit_logs', 'ledger_chart_of_accounts']) {
    localStorage.removeItem(k);
  }
}
```

**Multi-tab race conditions:**

The scenario: user has Tab A open (Phase 2 build, writing to localStorage), then opens Tab B (Phase 3 build, runs migration). If Tab A is mid-save, Tab B reads partial state.

**Mitigation strategy — accept the risk and document it.**

Phase 3 is a one-time upgrade. The user is unlikely to have two tabs open *during the deployment of Phase 3 to themselves*. If they do, the worst case is:
- Tab B reads stale data, migrates it, writes to IDB.
- Tab A continues writing to localStorage (which Tab B has now cleared).
- Next reload, Tab A's localStorage writes are lost.

This is bad but bounded: only Tab A's *unsaved-to-IDB* changes are lost, and the user has the JSON export as a recovery.

**Recommended:** Add a `BroadcastChannel('aussieledger')` for future use, but DO NOT block Phase 3 on tab coordination. Document: "If you have AussieLedger open in multiple tabs during the v2 → v3 upgrade, close all but one tab, refresh, and re-open the others."

A more robust alternative — use Web Locks API for the migration step:
```typescript
await navigator.locks.request('aussieledger-legacy-migration', async () => {
  await migrateLegacyLocalStorage(adapter);
});
```

Web Locks is supported in all current browsers. Cost: trivial. **Recommend including** because it's two lines.

**Confidence:** HIGH on sequence; MEDIUM on multi-tab risk assessment (the project hasn't seen multi-tab usage; this is hypothetical).

### 8. `fake-indexeddb` for tests

**Recommendation:** `fake-indexeddb@^6` — current major as of 2026. Vitest 2.x compatible.

**Setup pattern in `src/test/setup.ts`** (extend existing setup):

```typescript
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Existing ResizeObserver + matchMedia + @google/genai mocks preserved...

// IndexedDB shim — manual global assignment (NOT 'fake-indexeddb/auto')
// because Vitest's setup-file load order can leave 'auto' incomplete.
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';

beforeEach(() => {
  // Fresh factory per test — isolation guarantee
  (globalThis as any).indexedDB = new IDBFactory();
  (globalThis as any).IDBKeyRange = IDBKeyRange;
});

afterEach(() => {
  cleanup();
});
```

**Why NOT `fake-indexeddb/auto`:**
- `auto` registers globals at module-load time, but Vitest setup files have known issues with module load order in worker pools (vitest discussion #908). Manual assignment in `beforeEach` is the reliable pattern.
- Manual `new IDBFactory()` per test gives complete isolation — no cross-test state leak.

**Multi-store transaction support:** YES. `fake-indexeddb` is a full IDB implementation including multi-object-store transactions, version upgrades, indexes, key ranges. It passes the W3C IDB test suite. Confidence HIGH.

**Coverage in adapter tests:**
- `local.test.ts`: open DB → write entities → close → reopen → assert entities read back
- `local.test.ts`: write entries map → write again with different entity-id keys → assert no leakage across entities
- `local.test.ts`: importAll() with full migrated PersistedRoot → exportAll() → deep-equal assertion

**Server-side tests** use `better-sqlite3` with `new Database(':memory:')` — no fake-indexeddb needed.

**Confidence:** HIGH (verified npm latest; pattern used widely).

### 9. better-sqlite3 transactional whole-collection replace

**Recommended pattern for `PUT /api/entries`:**

```typescript
// server/routes/entries.ts
import type { Database } from 'better-sqlite3';

interface EntriesMap { [entityId: string]: JournalEntry[]; }

export function replaceAllEntries(db: Database, entriesMap: EntriesMap): void {
  const txn = db.transaction((map: EntriesMap) => {
    // 1. Delete all child rows first (journal_lines references journal_entries.id)
    db.prepare('DELETE FROM journal_lines').run();
    // 2. Delete all parent rows
    db.prepare('DELETE FROM journal_entries').run();

    // 3. Re-insert in order: entries first, then lines
    const insertEntry = db.prepare(`
      INSERT INTO journal_entries (id, entity_id, date, reference, description, is_posted, _v)
      VALUES (@id, @entityId, @date, @reference, @description, @isPosted, @_v)
    `);
    const insertLine = db.prepare(`
      INSERT INTO journal_lines (entry_id, line_index, account_id, description, debit, credit, tax_amount, is_manual_tax, _v)
      VALUES (@entryId, @lineIndex, @accountId, @description, @debit, @credit, @taxAmount, @isManualTax, @_v)
    `);

    for (const [entityId, entries] of Object.entries(map)) {
      for (const entry of entries) {
        insertEntry.run({
          id: entry.id,
          entityId,
          date: entry.date,
          reference: entry.reference,
          description: entry.description,
          isPosted: entry.isPosted ? 1 : 0,
          _v: entry._v ?? 2,
        });
        entry.lines.forEach((line, idx) => {
          insertLine.run({
            entryId: entry.id,
            lineIndex: idx,
            accountId: line.accountId,
            description: line.description,
            debit: String(line.debit),  // Decimal serialised as TEXT — see §14
            credit: String(line.credit),
            taxAmount: String(line.taxAmount),
            isManualTax: line.isManualTax ? 1 : 0,
            _v: line._v ?? 2,
          });
        });
      }
    }
  });

  txn(entriesMap); // synchronous; throws on any error, atomically rolling back
}
```

**Foreign key strategy:**
- Define `journal_lines.entry_id` with `FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE`.
- Set `PRAGMA foreign_keys = ON` on the connection (off by default in SQLite).
- With FK + cascade, you can simplify the delete to just `DELETE FROM journal_entries` and let cascade do the children. **BUT** SQLite's cascade-delete fires constraint checks per row, which can be 10–100× slower than the explicit two-step DELETE on large datasets. **Recommendation:** keep the explicit `DELETE FROM journal_lines; DELETE FROM journal_entries;` order for performance. Keep the FK ON CASCADE as a safety net for any future per-row deletes.
- **Account code FK:** CONTEXT locks this — store `journal_lines.account_code TEXT` with NO FK to `accounts.code`. Account codes are editable in Phase 4; hard FK would block code renames.

**Per-collection replace patterns are similar:**
- `PUT /api/entities` → `DELETE FROM entities; INSERT ...` in `db.transaction`. No children.
- `PUT /api/accounts` → `DELETE FROM accounts; INSERT ...`. No children referenced (FK from journal_lines.account_code is intentionally soft).
- `POST /api/audit` → append-only `INSERT INTO audit_logs ...`. No delete needed.
- `POST /api/import` → wraps all of the above + audit replace in a single outer transaction:

```typescript
const importAll = db.transaction((root: PersistedRoot) => {
  replaceAllEntities(db, root.entities);
  replaceAllAccounts(db, root.accounts);
  replaceAllEntries(db, root.allEntries);
  replaceAllAuditLogs(db, root.auditLogs);
});
```

`db.transaction` composes — calling an inner transactional function from within an outer one is safe in better-sqlite3.

**WAL mode** — enable on first connection:
```typescript
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL'); // WAL + NORMAL is the standard small-firm-app setting
```

**Confidence:** HIGH (better-sqlite3 docs + SQLite docs verified).

### 10. IndexedDB durability vs `localStorage`

**FND-01 precise guarantee:**

**IndexedDB survives:**
- Browser process restart (close/reopen browser).
- OS reboot.
- Tab close + reopen.
- Browser update (Chrome/Firefox treat extension/storage upgrades as preserved).
- "Clear cookies and other site data" with IndexedDB unchecked.

**IndexedDB does NOT survive:**
- "Clear all site data" with IndexedDB **checked** (default in Chrome's "Cookies and other site data" + "Cached images and files" combined option — but explicit IndexedDB checkbox).
- DevTools → Application → Clear storage → "Clear site data" button.
- Browser quota eviction under disk pressure (rare; happens after weeks-to-months of >90% disk usage on the user's device).
- Browsing in Incognito/Private mode (IDB persists for session, wiped on tab close).
- User explicitly deletes the AussieLedger site via browser site-settings UI.

**Critical distinction vs `localStorage`:**
- `localStorage` is wiped by "Cookies and other site data" (the simplest one-click clear). Most users who say "I cleared my cache" mean this.
- IndexedDB requires the user to explicitly select "Site data" or "IndexedDB" — a deeper menu in Chrome/Firefox UI.

**FND-01 success criterion is therefore:**

> User performs Chrome → Settings → Privacy → "Clear browsing data" → Time range: All time → checkboxes: "Cookies and other site data" + "Cached images and files" → click Clear → reload AussieLedger → data is still present.

This is the realistic "I cleared my browser cache" scenario. The data SURVIVES because IndexedDB sits under a different storage bucket than cookies+cache.

**Test it:** This requires a real browser (manual UAT) — `fake-indexeddb` can't simulate Chrome's storage UI. **List as a manual UAT step in the verification report.**

**SQLite shape:** trivially durable — it's a file on disk. Cache-clear in the browser doesn't touch it. `data/ledger.db` persists until the user `rm`s it.

**Documentation:** README must state plainly:
> "AussieLedger stores your data in your browser's IndexedDB (no-server mode) or in `data/ledger.db` on the server's disk (server mode). In no-server mode, choosing 'Delete site data' in browser settings WILL delete your AussieLedger data. Use the Export feature regularly to keep a JSON backup."

**Confidence:** HIGH (verified: MDN IndexedDB docs + Chromium bug 443592 + Chrome storage architecture).

### 11. Server-side schema migration runner

**Minimal implementation (~30 lines) in `server/db/migrate.ts`:**

```typescript
import type { Database } from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export function runMigrations(db: Database): void {
  // Ensure the schema_migrations table exists. (This is itself idempotent SQL.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  // Discover all .sql files in migrations/, sorted lexicographically.
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort(); // 001-*.sql, 002-*.sql, ...

  // Determine which are already applied.
  const applied = new Set(
    db.prepare('SELECT name FROM schema_migrations').all().map((r: any) => r.name)
  );

  // Apply each unapplied migration inside its own transaction.
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    const apply = db.transaction(() => {
      db.exec(sql); // Each .sql file may contain multiple statements
      db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)')
        .run(file, new Date().toISOString());
    });
    apply();
    console.log(`Applied migration: ${file}`);
  }
}
```

**`001-initial.sql` content** (compiled from CONTEXT + types.ts):

```sql
-- AussieLedger _v: 2 initial schema
-- Author: Phase 3
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
  debit TEXT NOT NULL,         -- Decimal as TEXT
  credit TEXT NOT NULL,        -- Decimal as TEXT
  tax_amount TEXT NOT NULL,    -- Decimal as TEXT
  is_manual_tax INTEGER NOT NULL DEFAULT 0,
  _v INTEGER NOT NULL DEFAULT 2,
  PRIMARY KEY (entry_id, line_index),
  FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
);
-- NOTE: No FK on account_id → accounts.id. Account codes are mutable (Phase 4).

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

**Test for the runner:** Vitest test in `server/db/__tests__/migrate.test.ts` that:
1. Creates `:memory:` DB.
2. Runs `runMigrations()`.
3. Asserts all 6 tables exist with the expected columns (`SELECT name FROM sqlite_master WHERE type='table'`).
4. Asserts `schema_migrations` contains `001-initial.sql`.
5. Runs again — asserts no error, no duplicate apply.

**Confidence:** HIGH.

### 12. JSON import validation

**Recommendation:** **Use Zod.** Specifically `zod@^3.23` (current major; v4 is GA but introduces breaking API changes — stick with v3 for Phase 3 unless the planner wants to take that on). Zod is ~2 kB gzipped, zero deps, idiomatic with TypeScript, and parses + validates in one call.

**Why not hand-rolled:** A `PersistedRoot` validator needs to recurse through entities, accounts, journal entries (with their nested lines), and audit logs. Hand-rolled is ~80 lines of `typeof === 'object' && Array.isArray(...) && ...` that nobody wants to read or maintain.

**Why not "just trust `migrate()` to throw":** `migrate()` is structurally aware (does the `_v` ladder make sense) but NOT type-strict on the contents. If the imported JSON has `entities[0].name = null` instead of a string, `migrate()` happily passes it through, and downstream code crashes much later with a vague TypeError. Zod fails immediately with `entities.0.name: expected string, received null`.

**Schema definition in `server/lib/schema.ts` (shared between SPA and server):**

```typescript
import { z } from 'zod';

const EntitySchema = z.object({
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

const AccountSchema = z.object({
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

const JournalLineSchema = z.object({
  _v: z.number().optional(),
  accountId: z.string(),
  description: z.string(),
  debit: z.number(),
  credit: z.number(),
  taxAmount: z.number(),
  isManualTax: z.boolean().optional(),
});

const JournalEntrySchema = z.object({
  _v: z.number().optional(),
  id: z.string(),
  date: z.string(),
  reference: z.string(),
  description: z.string(),
  lines: z.array(JournalLineSchema),
  isPosted: z.boolean(),
});

const AuditLogSchema = z.object({
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

export type ValidatedPersistedRoot = z.infer<typeof PersistedRootSchema>;
```

**Validation flow at `POST /api/import`:**

```typescript
import { PersistedRootSchema } from '../lib/schema';
import { migrate } from '../../src/lib/migrations'; // or copy into server/lib

router.post('/api/import', express.json({ limit: '50mb' }), (req, res) => {
  try {
    // 1. Run migrate() FIRST (allows older _v to be imported)
    const migrated = migrate(req.body);
    // 2. Validate the migrated shape — this is where type-strictness lives
    const valid = PersistedRootSchema.parse(migrated);
    // 3. Atomic replace
    db.transaction(() => {
      replaceAllEntities(db, valid.entities);
      replaceAllAccounts(db, valid.accounts);
      replaceAllEntries(db, valid.allEntries);
      replaceAllAuditLogs(db, valid.auditLogs);
    })();
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'validation', details: err.issues });
    } else {
      res.status(400).json({ error: 'migration', message: String(err) });
    }
  }
});
```

**Same Zod schema is also used in the SPA's `LocalAdapter.importAll()` path** — validation happens both client-side (for the no-server case) and server-side (defence-in-depth for the server case).

**Bundle cost on SPA:** ~2 kB gzipped. Worth it.

**Confidence:** HIGH.

### 13. Validation Architecture for Nyquist

(see "Validation Architecture" section below)

### 14. Decimal.js round-trip

**Recommendation:** **Serialise to string at the adapter boundary, deserialise in hooks.**

The principle: hooks deal in `Decimal`; adapter and HTTP wire deal in strings. `serialize()` and `deserialize()` from `src/lib/money.ts` already exist for exactly this purpose.

**Current state (after Phase 2):**

Looking at `src/types.ts` line 56-59:
```typescript
export interface JournalLine {
  debit: number;     // currently typed as number
  credit: number;
  taxAmount: number;
}
```

Phase 2 ships these as `number`. The tax engine uses `Decimal` internally but converts at the `lines: JournalLine[]` → engine boundary.

**Phase 3 decision:** Do NOT change the wire type yet. Keep `debit/credit/taxAmount: number` in `JournalLine` types. The risk of changing them is a cross-cutting Phase 2 follow-up that's out of scope.

**However:** In SQLite, the columns are typed `TEXT NOT NULL` (per `001-initial.sql` above) — this guarantees no float-precision corruption *in the database*. The server converts JSON `number` → SQLite TEXT on PUT, and TEXT → JSON `number` on GET. The round-trip is `JSON.number → String(n) → SELECT → parseFloat(...)`. For values up to 2dp, this round-trip is lossless within JS's 2^53 safe integer range (which covers $90+ trillion at cent precision — fine for AU SMB).

**Where the conversion happens:**

| Boundary | Direction | Conversion |
|----------|-----------|------------|
| Hook → Adapter | save | None (passes `JournalLine` as-is) |
| LocalAdapter → IndexedDB | save | None (IDB stores JS values natively) |
| ServerAdapter → fetch body | save | JSON.stringify (number → JSON number) |
| Express → SQLite | save | `String(n)` (JSON number → TEXT column) |
| SQLite → Express | load | `parseFloat(row.debit)` (TEXT → JSON number) |
| fetch response → ServerAdapter | load | JSON.parse (JSON number → JS number) |
| Adapter → Hook | load | None |
| Hook → tax engine | compute | `new Decimal(line.debit)` (already done in Phase 2) |

**Why TEXT in SQLite, not REAL:** SQLite's REAL is IEEE 754 double — same precision issues as JS float. TEXT preserves whatever string you stuff in there. We're paying for safety; the storage cost difference is negligible.

**Future migration path** (post-Phase 3): If the Phase 5 tax-engine work needs true `Decimal` end-to-end, a v3 migration can rewrite `JournalLine.debit/credit/taxAmount: number` → `string`. That's a single migration step that's out of scope here.

**Confidence:** HIGH for the "keep number type, serialise as TEXT in SQLite" plan; MEDIUM on the longer-term Decimal-everywhere story (deferred).

### 15. Recommended deps to add (exact versions for 2026)

**Production dependencies:**

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `better-sqlite3` | `^11.7.0` | SQLite driver, sync API, transactions | Move to `optionalDependencies` so npm install survives without Windows build tools. SPA-only setup unaffected. |
| `idb` | `^8.0.0` | IndexedDB promise wrapper, TS types | SPA dep. ~1.2 kB. |
| `zod` | `^3.23.8` | Runtime validation for import body | Shared SPA + server. Stay on v3 (v4 has breaking API). |

**Dev dependencies:**

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `concurrently` | `^9.1.0` | Run vite + dev:server side-by-side | Cross-platform; correct kill-on-failure. |
| `fake-indexeddb` | `^6.0.0` | In-memory IDB for Vitest | Use manual global assignment in setup.ts. |
| `@types/better-sqlite3` | `^7.6.13` | TS types | Tracks `better-sqlite3` 11.x. |

**Already installed (no version change needed):**
- `express` `^4.21.2` ✓
- `@types/express` `^4.17.21` ✓
- `tsx` `^4.21.0` ✓ (for `dev:server`)
- `decimal.js` `^10.6.0` ✓

**NOT needed:**
- `node-fetch` — Node 22+ has global `fetch`.
- `cors` — same-origin via Vite proxy in dev; same-origin in production behind reverse proxy. Only needed if SPA ever hits server cross-origin, which Phase 3 doesn't.
- `helmet` — defer; no public exposure in Phase 3 (binds 127.0.0.1).
- `dotenv` — already installed but server reads `process.env` directly; if dev:server needs .env loading, `tsx --env-file=.env.local` flag does it without the lib.

---

## Code Skeletons

### StorageAdapter interface (`src/storage/adapter.ts`)

```typescript
/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import type { Entity, Account, JournalEntry, AuditLog } from '../types';
import type { PersistedRoot } from '../lib/migrations';

export interface StorageAdapter {
  ready(): Promise<void>;

  getEntities(): Promise<Entity[]>;
  getAccounts(): Promise<Account[]>;
  getEntries(): Promise<Record<string, JournalEntry[]>>;
  getAuditLogs(): Promise<AuditLog[]>;

  saveEntities(entities: Entity[]): Promise<void>;
  saveAccounts(accounts: Account[]): Promise<void>;
  saveEntries(entries: Record<string, JournalEntry[]>): Promise<void>;
  appendAuditLog(log: AuditLog): Promise<void>;

  exportAll(): Promise<PersistedRoot>;
  importAll(state: PersistedRoot): Promise<void>;
}

export type AdapterKind = 'local' | 'server';

export class AdapterUnreachableError extends Error {
  constructor(message: string) { super(message); this.name = 'AdapterUnreachableError'; }
}

export class AdapterValidationError extends Error {
  constructor(message: string, public issues?: unknown) {
    super(message); this.name = 'AdapterValidationError';
  }
}
```

### LocalAdapter `open()` + `saveEntries` (`src/storage/local.ts`)

```typescript
/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { StorageAdapter } from './adapter';
import type { Entity, Account, JournalEntry, AuditLog } from '../types';
import type { PersistedRoot } from '../lib/migrations';
import { migrate, CURRENT_VERSION } from '../lib/migrations';

const DB_NAME = 'aussieledger';
const DB_VERSION = 1; // bump when object stores change

interface AussieLedgerDB extends DBSchema {
  entities: { key: string; value: Entity[]; };       // single row keyed 'singleton'
  accounts: { key: string; value: Account[]; };      // single row keyed 'singleton'
  entries: { key: string; value: Record<string, JournalEntry[]>; }; // keyed 'singleton'
  auditLogs: { key: string; value: AuditLog[]; };    // keyed 'singleton'
  meta: { key: string; value: unknown; };            // last-export timestamp, schema version
}

const SINGLETON_KEY = '__singleton__';

export class LocalAdapter implements StorageAdapter {
  private db!: IDBPDatabase<AussieLedgerDB>;
  private readyPromise: Promise<void>;

  constructor() {
    this.readyPromise = this.init();
  }

  ready(): Promise<void> { return this.readyPromise; }

  private async init(): Promise<void> {
    this.db = await openDB<AussieLedgerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('entities')) db.createObjectStore('entities');
        if (!db.objectStoreNames.contains('accounts')) db.createObjectStore('accounts');
        if (!db.objectStoreNames.contains('entries')) db.createObjectStore('entries');
        if (!db.objectStoreNames.contains('auditLogs')) db.createObjectStore('auditLogs');
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      },
      blocked() { console.warn('IndexedDB upgrade blocked — close other tabs'); },
      blocking() { /* this tab is blocking another upgrade; can close db here */ },
    });

    // Multi-tab safety: listen for versionchange and close this connection
    this.db.onversionchange = () => this.db.close();

    // One-time legacy localStorage migration
    if ('locks' in navigator) {
      await navigator.locks.request('aussieledger-legacy-migration',
        () => this.migrateLegacyLocalStorage());
    } else {
      await this.migrateLegacyLocalStorage();
    }
  }

  private async migrateLegacyLocalStorage(): Promise<void> {
    const KEYS = ['ledger_entities_list', 'ledger_all_entries', 'ledger_audit_logs', 'ledger_chart_of_accounts'];
    const raw: Record<string, string | null> = Object.fromEntries(
      KEYS.map(k => [k, localStorage.getItem(k)])
    );
    if (Object.values(raw).every(v => v === null)) return;

    const existing = await this.db.get('entities', SINGLETON_KEY);
    if (existing && existing.length > 0) {
      KEYS.forEach(k => localStorage.removeItem(k));
      return;
    }

    let assembled: Record<string, unknown> = { _v: 0 };
    try {
      if (raw.ledger_entities_list) assembled.entities = JSON.parse(raw.ledger_entities_list);
      if (raw.ledger_all_entries) assembled.allEntries = JSON.parse(raw.ledger_all_entries);
      if (raw.ledger_chart_of_accounts) assembled.accounts = JSON.parse(raw.ledger_chart_of_accounts);
      if (raw.ledger_audit_logs) assembled.auditLogs = JSON.parse(raw.ledger_audit_logs);
    } catch (err) {
      throw new Error(`Legacy localStorage parse failed: ${err}`);
    }

    const migrated = migrate(assembled) as PersistedRoot;
    await this.importAll(migrated);
    KEYS.forEach(k => localStorage.removeItem(k));
  }

  async getEntities(): Promise<Entity[]> {
    return (await this.db.get('entities', SINGLETON_KEY)) ?? [];
  }

  async saveEntities(entities: Entity[]): Promise<void> {
    await this.db.put('entities', entities, SINGLETON_KEY);
  }

  async getEntries(): Promise<Record<string, JournalEntry[]>> {
    return (await this.db.get('entries', SINGLETON_KEY)) ?? {};
  }

  async saveEntries(entries: Record<string, JournalEntry[]>): Promise<void> {
    await this.db.put('entries', entries, SINGLETON_KEY);
  }

  // ... getAccounts, saveAccounts, getAuditLogs, appendAuditLog similar shape

  async appendAuditLog(log: AuditLog): Promise<void> {
    const tx = this.db.transaction('auditLogs', 'readwrite');
    const existing = (await tx.store.get(SINGLETON_KEY)) ?? [];
    await tx.store.put([log, ...existing], SINGLETON_KEY);
    await tx.done;
  }

  async exportAll(): Promise<PersistedRoot> {
    return {
      _v: CURRENT_VERSION,
      entities: await this.getEntities(),
      accounts: await this.getAccounts(),
      allEntries: await this.getEntries(),
      auditLogs: await this.getAuditLogs(),
    };
  }

  async importAll(state: PersistedRoot): Promise<void> {
    const tx = this.db.transaction(['entities', 'accounts', 'entries', 'auditLogs'], 'readwrite');
    await tx.objectStore('entities').put(state.entities ?? [], SINGLETON_KEY);
    await tx.objectStore('accounts').put(state.accounts ?? [], SINGLETON_KEY);
    await tx.objectStore('entries').put(state.allEntries ?? {}, SINGLETON_KEY);
    await tx.objectStore('auditLogs').put(state.auditLogs ?? [], SINGLETON_KEY);
    await tx.done;
  }
}
```

### ServerAdapter `saveEntities` + probe (`src/storage/server.ts`)

```typescript
/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import type { StorageAdapter } from './adapter';
import { AdapterUnreachableError, AdapterValidationError } from './adapter';
import type { Entity, Account, JournalEntry, AuditLog } from '../types';
import type { PersistedRoot } from '../lib/migrations';

export class ServerAdapter implements StorageAdapter {
  private readyPromise: Promise<void>;

  constructor(private baseUrl: string = '/api') {
    this.readyPromise = this.init();
  }

  ready(): Promise<void> { return this.readyPromise; }

  private async init(): Promise<void> {
    // First health check happened during selection; init is a no-op for ServerAdapter
  }

  private async jsonGet<T>(path: string): Promise<T> {
    const res = await fetch(this.baseUrl + path);
    if (!res.ok) throw new AdapterUnreachableError(`${path} returned ${res.status}`);
    return res.json() as Promise<T>;
  }

  private async jsonPut<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(this.baseUrl + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      if (res.status === 400) throw new AdapterValidationError(`${path} validation failed`);
      throw new AdapterUnreachableError(`${path} returned ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async getEntities(): Promise<Entity[]> { return this.jsonGet('/entities'); }
  async saveEntities(entities: Entity[]): Promise<void> {
    await this.jsonPut('/entities', entities);
  }
  // ... other methods follow the same pattern

  async exportAll(): Promise<PersistedRoot> { return this.jsonGet('/export'); }
  async importAll(state: PersistedRoot): Promise<void> {
    await fetch(this.baseUrl + '/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
  }

  async appendAuditLog(log: AuditLog): Promise<void> {
    await fetch(this.baseUrl + '/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
  }
}
```

### Adapter selection probe (`src/storage/index.ts`)

```typescript
/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import type { StorageAdapter, AdapterKind } from './adapter';
import { LocalAdapter } from './local';
import { ServerAdapter } from './server';

const PROBE_TIMEOUT_MS = 500;
const PROBE_RETRIES = 6;

let adapterPromise: Promise<StorageAdapter> | null = null;
let adapterKind: AdapterKind | null = null;

interface HealthResponse { ok: true; version: number; aiEnabled: boolean; }

async function probeServer(): Promise<HealthResponse | null> {
  for (let i = 0; i < PROBE_RETRIES; i++) {
    try {
      const res = await fetch('/api/health', {
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      if (res.ok) return res.json() as Promise<HealthResponse>;
    } catch { /* probe failed; retry */ }
  }
  return null;
}

export async function initAdapter(): Promise<StorageAdapter> {
  if (adapterPromise) return adapterPromise;
  adapterPromise = (async () => {
    // Override hatch (Claude's discretion in CONTEXT)
    const forced = localStorage.getItem('storageMode');
    if (forced === 'local') {
      adapterKind = 'local';
      const a = new LocalAdapter();
      await a.ready();
      return a;
    }
    if (forced === 'server') {
      adapterKind = 'server';
      const a = new ServerAdapter();
      await a.ready();
      return a;
    }

    const health = await probeServer();
    if (health?.ok) {
      adapterKind = 'server';
      // Stash AI flag for IS_AI_ENABLED check
      (window as any).__AUSSIELEDGER_AI_ENABLED__ = health.aiEnabled;
      const a = new ServerAdapter();
      await a.ready();
      return a;
    }
    adapterKind = 'local';
    const a = new LocalAdapter();
    await a.ready();
    return a;
  })();
  return adapterPromise;
}

export function getAdapter(): Promise<StorageAdapter> {
  if (!adapterPromise) throw new Error('Adapter not initialised; call initAdapter() first');
  return adapterPromise;
}

export function getAdapterKind(): AdapterKind | null { return adapterKind; }
```

### Hook refactor diff (Phase 2 → Phase 3)

```diff
 export function useEntities(addLog: AddLog): EntitiesHook {
   const [entities, setEntities] = useState<Entity[]>(DEFAULT_ENTITIES);
+  const [ready, setReady] = useState(false);

   useEffect(() => {
-    const raw = localStorage.getItem(STORAGE_KEY);
-    if (!raw) return;
-    try {
-      const parsed = JSON.parse(raw) as Entity[];
-      if (Array.isArray(parsed)) setEntities(parsed);
-    } catch (err) {
-      console.error('Failed to parse ledger_entities_list', err);
-    }
+    let cancelled = false;
+    (async () => {
+      const adapter = await getAdapter();
+      const loaded = await adapter.getEntities();
+      if (cancelled) return;
+      if (loaded.length > 0) setEntities(loaded);
+      setReady(true);
+    })().catch(err => {
+      console.error('useEntities load failed', err);
+      setReady(true);
+    });
+    return () => { cancelled = true; };
   }, []);

   useEffect(() => {
-    localStorage.setItem(STORAGE_KEY, JSON.stringify(entities));
-  }, [entities]);
+    if (!ready) return;
+    getAdapter()
+      .then(a => a.saveEntities(entities))
+      .catch(err => console.error('useEntities save failed', err));
+  }, [entities, ready]);
```

### Express route example (`server/routes/entities.ts`)

```typescript
/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import express from 'express';
import type { Database } from 'better-sqlite3';
import { z } from 'zod';

const EntitySchema = z.object({
  _v: z.number().optional(),
  id: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.enum(['Active', 'Archived', 'Deactivated']),
  registrationNumber: z.string().optional(),
  businessAddress: z.string().optional(),
  contactPerson: z.string().optional(),
  taxAgentName: z.string().optional(),
  taxAgentPhone: z.string().optional(),
  taxAgentEmail: z.string().optional(),
  notes: z.string().optional(),
});

export function entitiesRouter(db: Database): express.Router {
  const router = express.Router();

  router.get('/entities', (_req, res) => {
    const rows = db.prepare('SELECT * FROM entities').all();
    res.json(rows.map(rowToEntity));
  });

  router.put('/entities', express.json({ limit: '50mb' }), (req, res) => {
    const parse = z.array(EntitySchema).safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'validation', issues: parse.error.issues });
    }
    const txn = db.transaction((entities: typeof parse.data) => {
      db.prepare('DELETE FROM entities').run();
      const stmt = db.prepare(`
        INSERT INTO entities (id, name, type, registration_number, business_address,
                              contact_person, status, tax_agent_name, tax_agent_phone,
                              tax_agent_email, notes, _v)
        VALUES (@id, @name, @type, @registrationNumber, @businessAddress,
                @contactPerson, @status, @taxAgentName, @taxAgentPhone,
                @taxAgentEmail, @notes, @_v)
      `);
      for (const e of entities) {
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
    txn(parse.data);
    res.json({ ok: true });
  });

  return router;
}

function rowToEntity(row: any) {
  return {
    _v: row._v,
    id: row.id, name: row.name, type: row.type,
    registrationNumber: row.registration_number ?? undefined,
    businessAddress: row.business_address ?? undefined,
    contactPerson: row.contact_person ?? undefined,
    status: row.status,
    taxAgentName: row.tax_agent_name ?? undefined,
    taxAgentPhone: row.tax_agent_phone ?? undefined,
    taxAgentEmail: row.tax_agent_email ?? undefined,
    notes: row.notes ?? undefined,
  };
}
```

### Express entry (`server/index.ts`)

```typescript
/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import express from 'express';
import Database from 'better-sqlite3';
import { runMigrations } from './db/migrate';
import { entitiesRouter } from './routes/entities';
// ... other route imports

const PORT = parseInt(process.env.PORT ?? '4000', 10);
const HOST = process.env.HOST ?? '127.0.0.1';
const DB_PATH = process.env.DB_PATH ?? './data/ledger.db';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AI_ENABLED = Boolean(GEMINI_API_KEY && GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');

// Ensure data/ directory exists
import fs from 'node:fs';
import path from 'node:path';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

runMigrations(db);

const app = express();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: 2, aiEnabled: AI_ENABLED });
});

app.use(entitiesRouter(db));
// ... other routers

app.listen(PORT, HOST, () => {
  console.log(`AussieLedger server listening on http://${HOST}:${PORT}, DB at ${DB_PATH}, AI ${AI_ENABLED ? 'enabled' : 'disabled'}`);
});
```

### Concurrently script & Vite proxy (already shown in §3)

### Server migration runner (already shown in §11)

---

## Validation Architecture

> Phase 3 has `workflow.nyquist_validation: true` in config.json.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 (existing) + fake-indexeddb@^6 (new) + better-sqlite3@^11 in-memory (new) |
| Config file | `vitest.config.ts` (exists; no changes needed) + `src/test/setup.ts` (add IDB shim) |
| Quick run command | `npx vitest run src/storage src/lib/migrations` (≈ 4s, adapter + migration tests only) |
| Full suite command | `npm run test` (all SPA tests) + `npm run test:server` (server tests, new script) |
| Phase gate | Full SPA suite + server suite + manual UAT for FND-01 cache-clear |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| FND-01 | Data survives "Clear cookies and cached images" — IndexedDB write-then-reload | UNIT (fake-indexeddb persistence within test process) | `npx vitest run src/storage/__tests__/local.test.ts -t "data survives reopen"` | ❌ Wave 0 |
| FND-01 | Data survives same — actual Chrome "Clear browsing data" with cookies+cache (NOT IDB) | MANUAL UAT | n/a — checklist item in verification report | n/a |
| FND-01 | Data survives "Clear all site data" — must FAIL gracefully via Export reminder | DOC ONLY | n/a — README documents | n/a |
| FND-01 | SQLite path — data survives server restart (`node server/index.js` stop+start) | INTEGRATION | `npx vitest run server/__tests__/persistence.test.ts -t "survives restart"` | ❌ Wave 0 |
| FND-02 | Export produces valid JSON with `{_v:2, entities, accounts, allEntries, auditLogs}` shape | UNIT | `npx vitest run src/storage/__tests__/export.test.ts` | ❌ Wave 0 |
| FND-02 | CSV export deferred — verification report MUST note "FND-02 partially delivered" | DOC ONLY | n/a | n/a |
| FND-03 | Import accepts a previously-exported file and restores state | UNIT (both adapters) | `npx vitest run src/storage/__tests__/import.test.ts -t "round-trip"` | ❌ Wave 0 |
| FND-03 | Import on a fresh instance (no prior data) with confirmation flow | UNIT (component + adapter) | `npx vitest run src/components/__tests__/DataPage.test.tsx -t "import on empty"` | ❌ Wave 0 |
| FND-03 | Import with existing data requires `REPLACE` confirmation phrase | UNIT (component) | `npx vitest run src/components/__tests__/DataPage.test.tsx -t "REPLACE confirmation"` | ❌ Wave 0 |
| FND-03 | Refuse import of `_v` higher than CURRENT_VERSION via `MigrationError` | UNIT | `npx vitest run src/lib/migrations/__tests__/refuse-newer.test.ts` | ❌ Wave 0 |
| DEP-02 | `npm run dev` starts SPA-only with IndexedDB working | MANUAL UAT (browser check) | n/a — checklist | n/a |
| DEP-02 | `npm run dev:full` starts both processes with `/api/health` responding | INTEGRATION (script test) | `node scripts/test-dev-full.mjs` (5-line script that spawns + curls + kills) | ❌ Wave 0 |
| DEP-02 | Server's `001-initial.sql` creates expected schema | UNIT | `npx vitest run server/db/__tests__/migrate.test.ts -t "001-initial"` | ❌ Wave 0 |
| DEP-02 | better-sqlite3 transactional whole-collection replace is atomic (rollback on error) | UNIT | `npx vitest run server/__tests__/atomicity.test.ts` | ❌ Wave 0 |
| DEP-02 | Express server binds 127.0.0.1 by default (security default) | UNIT (script-level) | `npx vitest run server/__tests__/bind.test.ts` | ❌ Wave 0 |
| Success #5 | Round-trip: hand-built `_v:0` blob → migrate → importAll → exportAll → assert equal | UNIT | `npx vitest run src/lib/migrations/__tests__/round-trip.test.ts` | ❌ Wave 0 |
| Adapter selection | Probe succeeds → ServerAdapter | UNIT (mock fetch) | `npx vitest run src/storage/__tests__/index.test.ts -t "selects server on health 200"` | ❌ Wave 0 |
| Adapter selection | Probe exhausts → LocalAdapter | UNIT (mock fetch with timeout) | `npx vitest run src/storage/__tests__/index.test.ts -t "falls back to local"` | ❌ Wave 0 |
| Adapter selection | `storageMode=local` override bypasses probe | UNIT | `npx vitest run src/storage/__tests__/index.test.ts -t "honors storageMode override"` | ❌ Wave 0 |
| Legacy migration | localStorage → IndexedDB one-time upgrade | UNIT | `npx vitest run src/storage/__tests__/legacy-migration.test.ts` | ❌ Wave 0 |
| Legacy migration | Failure leaves localStorage untouched (no partial state) | UNIT (inject parse error) | `npx vitest run src/storage/__tests__/legacy-migration.test.ts -t "preserves on failure"` | ❌ Wave 0 |
| AI proxy | `IS_AI_ENABLED` derived from `/api/health.aiEnabled` in server mode | UNIT | `npx vitest run src/lib/__tests__/ai.test.ts -t "server-mode flag"` | ❌ Wave 0 |
| Zod validation | `POST /api/import` rejects malformed body with 400 | UNIT | `npx vitest run server/__tests__/import-validation.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/storage src/lib/migrations` (storage + migrations subset; ≈ 4s)
- **Per wave merge:** `npm run test` (full SPA suite) + `npm run test:server` (server suite, ≈ 10s combined)
- **Phase gate:** Full SPA + server suites green; manual UAT checklist completed for FND-01 cache-clear + DEP-02 both-shapes-boot.

### Wave 0 Gaps

All tests are new — no test files exist for `src/storage/` or `server/` (the directories themselves don't exist yet). Wave 0 must create:

- [ ] `src/storage/adapter.ts` — interface skeleton + tests
- [ ] `src/storage/__tests__/local.test.ts` — covers FND-01 (IDB persistence), legacy migration, import/export
- [ ] `src/storage/__tests__/server.test.ts` — covers ServerAdapter HTTP shim (mock fetch)
- [ ] `src/storage/__tests__/index.test.ts` — covers probe + selection + override
- [ ] `src/storage/__tests__/legacy-migration.test.ts` — covers four-key localStorage upgrade
- [ ] `src/storage/__tests__/export.test.ts` — covers FND-02 shape correctness
- [ ] `src/storage/__tests__/import.test.ts` — covers FND-03 round-trip
- [ ] `src/lib/migrations/__tests__/round-trip.test.ts` — covers success criterion #5 (v0 → v2 ladder + adapter round-trip)
- [ ] `src/lib/migrations/__tests__/refuse-newer.test.ts` — covers MigrationError on `_v > CURRENT_VERSION`
- [ ] `src/components/__tests__/DataPage.test.tsx` — covers Export button, Import file picker, REPLACE confirmation
- [ ] `src/lib/__tests__/ai.test.ts` — covers `IS_AI_ENABLED` widened logic
- [ ] `server/__tests__/persistence.test.ts` — covers SQLite-survives-restart (in-memory: open new connection on existing file)
- [ ] `server/__tests__/atomicity.test.ts` — covers transactional rollback on PUT failure
- [ ] `server/__tests__/import-validation.test.ts` — covers Zod 400 reject
- [ ] `server/__tests__/bind.test.ts` — covers 127.0.0.1 default
- [ ] `server/db/__tests__/migrate.test.ts` — covers migration runner idempotency
- [ ] `server/routes/__tests__/*.test.ts` — per-route smoke tests for each REST endpoint
- [ ] `server/vitest.config.ts` — separate config for server-side tests (node env, not jsdom)
- [ ] `package.json` script: `"test:server": "vitest run --config server/vitest.config.ts"`
- [ ] `src/test/setup.ts` — extend with `fake-indexeddb` global assignment
- [ ] `scripts/test-dev-full.mjs` — spawn concurrently script + curl + assert health response + kill

**Manual UAT checklist** (verification report):

- [ ] FND-01a: Chrome → Clear browsing data → "Cookies and other site data" + "Cached images and files" → All time → Clear → Reload AussieLedger → data still present (no-server shape).
- [ ] FND-01b: Stop `node server/index.js`, restart, reload SPA → data still present (server shape).
- [ ] DEP-02a: `npm install` succeeds on Windows with VS Build Tools installed.
- [ ] DEP-02b: `npm run dev` (no server) boots SPA, IndexedDB mode visible on Data page.
- [ ] DEP-02c: `npm run dev:full` boots both, Server mode visible on Data page.
- [ ] DEP-02d: Adapter selection banner appears when server is killed mid-session and SPA reloads.
- [ ] AI: Server mode with `GEMINI_API_KEY` set → ImportTB shows AI flow. Without key → AI flow hidden.

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Windows native build (`node-gyp` + VS Build Tools)** — repo author is on Windows; `better-sqlite3` ships no Windows prebuilts; install fails without 6 GB of VS Build Tools installed | HIGH | Move `better-sqlite3` to `optionalDependencies`. SPA-only path (`npm run dev`) works without it. Document Windows setup in README. If author wants the server shape locally, they install VS Build Tools once. |
| **Multi-tab race during legacy localStorage migration** — Tab A still writing to localStorage while Tab B migrates and clears | MEDIUM | Wrap migration in `navigator.locks.request('aussieledger-legacy-migration', ...)`. Document "close other tabs during upgrade" in changelog. |
| **IndexedDB quota eviction** — Chrome can evict IDB under disk pressure (rare but real, especially on mobile) | LOW–MEDIUM | (a) Document in README that browser data may be wiped; users should Export regularly. (b) The Data page shows last-export timestamp prominently as a recurring nudge. (c) Consider `navigator.storage.persist()` request — bumps the bucket to "persistent" so eviction requires explicit user action. Add as a one-line on first boot. |
| **Decimal precision lost at HTTP boundary** — JSON numbers are IEEE 754 doubles; large amounts (>$90T at cent precision) would lose precision | LOW | AU SMB ledgers don't approach this scale. SQLite stores as TEXT. If Phase 5 tax engine requires Decimal end-to-end, a v3 migration changes `JournalLine.debit/credit/taxAmount` types from `number` → `string`. Out of scope here. |
| **Probe latency on first boot** — 3 seconds worst case for the no-server install | LOW–MEDIUM | (a) 3s only happens if user has NEVER set up server (legitimately should fall back). Subsequent visits cache nothing — probe runs every time, accepting the 3s cost. (b) Alternative: cache the previous probe outcome in `localStorage.storageMode` and try that first; fall back to probe on failure. Speeds up subsequent boots to <50ms. Recommend implementing. |
| **WAL files in `data/`** — `ledger.db-wal` and `ledger.db-shm` companion files. Backup that copies only `ledger.db` while server is running can be inconsistent | MEDIUM | Document: backup procedure is `cp data/ledger.db*` (glob) OR stop server first. README notes. |
| **`storageMode` localStorage hatch persists indefinitely** — user forces `local` mode, then later runs the server, but their override sticks | LOW | The DevTools toggle is intentionally hidden; document the symptom in the troubleshooting section. Power-user feature. |
| **Zod v3 vs v4** — Zod v4 was GA early 2025 but has breaking changes (`z.string().email()` removed, etc.) | LOW | Pin to `zod@^3.23.8`. Document migration to v4 as a future tech debt item. |

---

## Dependencies

### Add to `dependencies`:
```json
"idb": "^8.0.0",
"zod": "^3.23.8"
```

### Add to `optionalDependencies` (NEW section in package.json):
```json
"optionalDependencies": {
  "better-sqlite3": "^11.7.0"
}
```

### Add to `devDependencies`:
```json
"concurrently": "^9.1.0",
"fake-indexeddb": "^6.0.0",
"@types/better-sqlite3": "^7.6.13"
```

### Add to `scripts`:
```json
"dev:server": "tsx watch server/index.ts",
"dev:full": "concurrently -k -n vite,api -c blue,magenta \"npm:dev\" \"npm:dev:server\"",
"build:server": "tsc -p server/tsconfig.json",
"start:server": "node server/dist/index.js",
"test:server": "vitest run --config server/vitest.config.ts",
"lint": "tsc --noEmit && tsc -p server/tsconfig.json --noEmit"
```

### Already present (no change):
- `express@^4.21.2`, `@types/express@^4.17.21`, `tsx@^4.21.0`, `decimal.js@^10.6.0`, `vitest@^2.1.9`

---

## Out of scope (defer)

| Item | Phase | Why |
|------|-------|-----|
| CSV export of any kind | 4/5 | FND-02 CSV half deferred per CONTEXT; per-report CSVs land in their respective Phase 4/5 screens. |
| Auth (PIN, OAuth, anything) | 6+ | CONTEXT locks "bind 127.0.0.1 + document reverse-proxy" for v1. |
| Multi-client / workspace_id | 6 | Decided in tax-agent mode work. |
| Soft-delete for entities/accounts/journals | 4 | Audit-trail depth decision. |
| Hard FK on `journal_lines.account_code` → `accounts.code` | 4 | Account-code immutability is Phase 4's call. |
| Per-record adapter API (CRUD) | Future | Adopt only if Phase 4 BOOK-12 search shows performance issues. |
| Native PDF export | 5 | TAX-02. |
| Live IDB ↔ SQLite sync | Never | Users pick one shape per install. |
| Bank statement reconciliation | v2 | Out of v1 scope per PROJECT.md. |
| Decimal end-to-end (string types on JournalLine.debit) | Future | Cross-cutting type change; out of Phase 3 scope. |
| Server-side request logging / metrics | Future | No real ops concern yet. |
| HTTPS / TLS in the server itself | Never | Reverse proxy concern. Server binds plaintext on 127.0.0.1. |
| Helmet / CORS / rate-limit middleware | Future | All concerns are downstream of the reverse proxy. |
| Server schema downgrade | Never | Explicitly refused; same as SPA `migrate()`. |
| Web Locks API beyond legacy migration | Future | One use site in Phase 3; revisit when multi-tab becomes a real concern. |
| `navigator.storage.persist()` request | Maybe Phase 3 | Recommended one-line addition but not strictly required for FND-01 — IDB without `persist()` already survives the "Clear cookies + cache" scenario. Planner's call. |

---

## Sources

### Primary (HIGH confidence)
- `.planning/phases/03-durable-persistence/03-CONTEXT.md` — locked architectural decisions (direct read)
- `.planning/research/ARCHITECTURE.md` § Option D recommendation — direct read, HIGH confidence
- `src/lib/migrations/index.ts`, `src/hooks/useEntities.ts`, `src/hooks/useJournals.ts`, `src/hooks/useAccounts.ts`, `src/hooks/useAuditLog.ts`, `src/types.ts`, `src/test/setup.ts`, `vite.config.ts`, `package.json` — direct codebase reads
- [Vite Server Options — `server.proxy` config](https://vite.dev/config/server-options) — official docs
- [better-sqlite3 npm](https://www.npmjs.com/package/better-sqlite3) + [better-sqlite3 API docs (GitHub)](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md) — official docs
- [idb npm](https://www.npmjs.com/package/idb) + [idb GitHub](https://github.com/jakearchibald/idb) — official source
- [zod npm](https://www.npmjs.com/package/zod) + [zod.dev](https://zod.dev/) — official docs
- [SQLite Foreign Keys docs](https://sqlite.org/foreignkeys.html) — authoritative
- [MDN: Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB) — authoritative
- [W3C IndexedDB 3.0 spec](https://www.w3.org/TR/IndexedDB/) — authoritative

### Secondary (MEDIUM confidence — WebSearch verified against official source)
- [concurrently npm](https://www.npmjs.com/package/concurrently) + [Concurrently NPM package explained — Dimitrios Filippou](https://www.jimfilippou.com/articles/2025/concurrently-npm-package-explained) — flag semantics
- [fake-indexeddb npm](https://www.npmjs.com/package/fake-indexeddb) + [Vitest setup files discussion #908](https://github.com/vitest-dev/vitest/discussions/908) — Vitest integration pattern
- [better-sqlite3 issue #355 — prebuild binaries for windows](https://github.com/WiseLibs/better-sqlite3/issues/355) — Windows prebuilt status verified

### Tertiary (LOW confidence — single source, training data)
- Multi-tab IndexedDB BroadcastChannel pattern — general pattern from training data + [Medium article](https://medium.com/@devanshagarwal2020/building-a-robust-data-sharing-system-in-angular-with-indexeddb-and-broadcastchannel-api-b0686a2c05bd) — not directly verified against W3C spec for Web Locks API alternative; recommend testing before relying

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are well-established with official sources
- Architecture: HIGH — locked in CONTEXT.md; research only confirms the "how to implement" details
- Pitfalls: HIGH — Windows native build, IDB durability semantics, decimal precision boundary all verified
- Validation Architecture: HIGH — clear mapping of req → test type → command
- Multi-tab race: MEDIUM — pattern is correct but the project hasn't surfaced this in real use yet

**Research date:** 2026-05-11
**Valid until:** 2026-08-11 (~3 months — stable libraries; better-sqlite3 native-build situation could change with Node 24+ adoption)

---

## RESEARCH COMPLETE
