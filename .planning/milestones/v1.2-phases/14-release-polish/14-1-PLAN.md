---
phase: 14-release-polish
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/route.ts                              # NEW — getRouteKind() helper
  - src/lib/__tests__/route.test.ts               # NEW — 4 branch tests
  - src/storage/local.ts                          # MODIFIED — constructor widened + DB_NAME_PROD/DB_NAME_DEMO exports
  - src/storage/__tests__/local-db-name.test.ts   # NEW — constructor DB-selection tests
  - src/storage/demo-seed.ts                      # NEW — seedDemoData(adapter) helper
  - src/storage/__tests__/demo-seed.test.ts       # NEW — seed shape + idempotence tests
  - src/storage/__tests__/demo-isolation.test.ts  # NEW — PITFALLS §4 HARD-BLOCK guard
  - src/storage/index.ts                          # MODIFIED — initAdapter reads getRouteKind() and picks DB on LocalAdapter branch
  - src/storage/__tests__/initAdapter-demo-routing.test.ts  # NEW — pathname-dispatched DB selection
autonomous: true
requirements:
  - POL-02
must_haves:
  truths:
    - "getRouteKind() returns 'demo' for /demo, 'privacy' for /privacy, 'default' for everything else"
    - "LocalAdapter constructed with no args opens the 'aussieledger' production DB"
    - "LocalAdapter constructed with DB_NAME_DEMO opens the 'aussieledger-demo' DB"
    - "initAdapter() on the /demo path constructs LocalAdapter against the demo DB (never the production DB)"
    - "seedDemoData() populates 1 sole-trader entity + Chart of Accounts + ~15 FY2025-26 journals on a fresh demo adapter"
    - "seedDemoData() is idempotent — calling it again when entities already exist is a no-op"
    - "Writing demo data while the production DB also exists in the same session leaves the production 'aussieledger' DB byte-identical"
  artifacts:
    - path: "src/lib/route.ts"
      provides: "getRouteKind() — single source of truth for pathname-based route classification"
      exports: ["getRouteKind"]
      min_lines: 30
    - path: "src/storage/local.ts"
      provides: "Widened LocalAdapter constructor + DB_NAME_PROD/DB_NAME_DEMO exports"
      contains: "constructor(dbName"
    - path: "src/storage/demo-seed.ts"
      provides: "seedDemoData(adapter) — hard-coded FY2025-26 sole-trader fixtures"
      exports: ["seedDemoData"]
      min_lines: 60
    - path: "src/storage/__tests__/demo-isolation.test.ts"
      provides: "PITFALLS §4 HARD-BLOCK guard — cross-adapter contamination impossible"
      contains: "aussieledger-demo"
  key_links:
    - from: "src/storage/index.ts"
      to: "src/lib/route.ts"
      via: "import { getRouteKind } from '../lib/route'"
      pattern: "getRouteKind\\(\\)"
    - from: "src/storage/index.ts"
      to: "src/storage/local.ts"
      via: "new LocalAdapter(DB_NAME_DEMO) on demo route; new LocalAdapter() otherwise"
      pattern: "new LocalAdapter\\("
    - from: "src/storage/index.ts"
      to: "src/storage/demo-seed.ts"
      via: "seedDemoData(adapter) called on demo branch after adapter.ready()"
      pattern: "seedDemoData\\("
---

<objective>
Land the routing-and-isolation foundation for Phase 14: a pure `getRouteKind()` pathname-dispatch helper (consumed by both `initAdapter()` here and `App.tsx` in Plan 14-2), a widened `LocalAdapter` constructor that accepts a `dbName` parameter (defaulting to the production constant), a hard-coded demo seed, and a `demo-isolation` test that locks PITFALLS §4 HARD-BLOCK: demo writes MUST NOT contaminate the production `'aussieledger'` IDB database. After this plan lands, navigating to `/demo` automatically opens the isolated `'aussieledger-demo'` IDB and seeds it on first visit; no UI yet (Plan 14-2 ships the banner + welcome state + privacy page). The production `'aussieledger'` DB stays byte-identical regardless of `/demo` activity.

Purpose: POL-02's HARD-BLOCK invariant lives at the storage layer. Locking the isolation contract first — with executable tests — means Plan 14-2 can mount `DemoModeBanner`, `WelcomeBanner`, and `PrivacyPage` knowing the data substrate is already safe. The `getRouteKind()` helper is intentionally tiny and pure so both the storage init path and the App-level view dispatch (Plan 14-2) consume the same source of truth — no two-callsite pathname-parsing drift.

Output: 9 files (4 modified/created source files, 5 test files; 4 new SPDX-headered .ts source files → 4 new SPDX-headers parametric rows). Expected test delta: ~16-20 new GREEN tests. 1128 → ~1146 SPA GREEN. Lint EXIT 0, build EXIT 0, AIza scan EXIT 0 all maintained.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/research/PITFALLS.md
@.planning/research/ARCHITECTURE.md
@.planning/phases/14-release-polish/14-CONTEXT.md

# Existing code this plan widens or consumes:
@src/storage/local.ts
@src/storage/index.ts
@src/lib/period.ts

# Phase 11's structural-lint that demo-seed.ts must satisfy:
@src/lib/__tests__/structural-lint-period.test.ts

<interfaces>
<!-- Key types and contracts this plan establishes or consumes. Executor should use these directly. -->

From src/storage/adapter.ts (FINAL — Phase 3 invariant; do NOT widen):
```typescript
export interface StorageAdapter {
  ready(): Promise<void>;
  getEntities(): Promise<Entity[]>;
  saveEntities(entities: Entity[]): Promise<void>;
  getAccounts(): Promise<Account[]>;
  saveAccounts(accounts: Account[]): Promise<void>;
  getEntries(): Promise<Record<string, JournalEntry[]>>;
  saveEntries(entries: Record<string, JournalEntry[]>): Promise<void>;
  getAuditLogs(): Promise<AuditLog[]>;
  saveAuditLogs(logs: AuditLog[]): Promise<void>;
  appendAuditLog(log: AuditLog): Promise<void>;
  exportAll(): Promise<PersistedRoot>;
  importAll(state: PersistedRoot, opts?: { silent?: boolean }): Promise<void>;
}
```

From src/storage/local.ts (CURRENT — Phase 11 shape):
```typescript
const DB_NAME = 'aussieledger';               // ← Phase 14 RENAMES to DB_NAME_PROD + ADDS DB_NAME_DEMO
export class LocalAdapter implements StorageAdapter {
  private db!: IDBPDatabase<AussieLedgerDB>;
  constructor() {                              // ← Phase 14 WIDENS to (dbName: string = DB_NAME_PROD)
    this.readyPromise = this.init();
  }
  private async init(): Promise<void> {
    this.db = await openDB<AussieLedgerDB>(DB_NAME, DB_VERSION, { ... });  // ← uses this.dbName
    // ... legacy migration ...
    await this.tryPersist();
  }
}
```

From src/lib/period.ts (CURRENT — invariant: no `new Date()` outside this module):
```typescript
export function today(): Date;
export function nowIso(): string;
export function addDaysIso(iso: string, days: number): string;
```

NEW contracts this plan establishes:
```typescript
// src/lib/route.ts
export type RouteKind = 'demo' | 'privacy' | 'default';
export function getRouteKind(pathname?: string): RouteKind;
// Optional pathname arg is for tests; default reads window.location.pathname.

// src/storage/local.ts (new exports alongside class)
export const DB_NAME_PROD = 'aussieledger';
export const DB_NAME_DEMO = 'aussieledger-demo';

// src/storage/demo-seed.ts
export async function seedDemoData(adapter: LocalAdapter): Promise<void>;
// Idempotent: if adapter.getEntities().length > 0, returns early without writing.
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: getRouteKind() helper + 4-branch tests</name>
  <files>
    src/lib/route.ts (NEW)
    src/lib/__tests__/route.test.ts (NEW)
  </files>
  <behavior>
    - Test 1: getRouteKind('/') returns 'default'
    - Test 2: getRouteKind('/demo') returns 'demo'
    - Test 3: getRouteKind('/demo/') returns 'demo' (trailing-slash tolerance)
    - Test 4: getRouteKind('/privacy') returns 'privacy'
    - Test 5: getRouteKind('/something-else') returns 'default'
    - Test 6: getRouteKind() with no arg reads window.location.pathname (vi.stubGlobal stubs location.pathname='/demo' → returns 'demo')
    - Test 7: getRouteKind() under jsdom default (pathname='/') returns 'default'
  </behavior>
  <action>
    1. Create `src/lib/route.ts` with Apache 2.0 SPDX header at top.
    2. Export type `RouteKind = 'demo' | 'privacy' | 'default'`.
    3. Export function `getRouteKind(pathname?: string): RouteKind`. Implementation:
       - If `pathname === undefined`, read `typeof window !== 'undefined' ? window.location.pathname : '/'`.
       - Normalise: strip trailing slash if length > 1 (so `/demo/` matches `/demo`).
       - If pathname starts with `/demo` (exact `/demo` OR `/demo/...` — the prefix match is intentional so future `/demo/sub-path` deep-links still pick the demo adapter), return `'demo'`.
       - If pathname starts with `/privacy`, return `'privacy'`.
       - Otherwise return `'default'`.
    4. Use `pathname.startsWith('/demo')` and `pathname.startsWith('/privacy')` — these are the two static paths CONTEXT-locks. NO regex.
    5. Write `src/lib/__tests__/route.test.ts` with Apache 2.0 SPDX header. Tests above. Test 6 uses `vi.stubGlobal('location', { ...window.location, pathname: '/demo' })` then restores via `vi.unstubAllGlobals()` in `afterEach`. Test 7 just calls `getRouteKind()` in the default jsdom env.
    6. Why this shape: pure function (deterministic given pathname arg) + windowed default. Tests stub the global; production reads it once on import boundary. CONTEXT decision: "DIY pathname-based dispatch — read window.location.pathname once on mount". `pathname.startsWith('/demo')` (not equality) lets us tolerate query-string and hash without parsing — `'/demo?foo=1'` and `'/demo#x'` would BOTH be on the same location.pathname='/demo' since pathname excludes query+hash. The trailing-slash normalisation is for `/demo/` (some servers redirect to it).
  </action>
  <verify>
    <automated>npx vitest run src/lib/__tests__/route.test.ts</automated>
  </verify>
  <done>
    - `src/lib/route.ts` exists with SPDX header, exports `RouteKind` type and `getRouteKind(pathname?)` function
    - 7 tests in route.test.ts all GREEN
    - No `new Date()` anywhere (structural-lint clean)
    - No external dependencies (pure module — only reads `window.location.pathname` optionally)
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: LocalAdapter constructor widening + DB_NAME_PROD/DB_NAME_DEMO exports</name>
  <files>
    src/storage/local.ts (MODIFIED — rename DB_NAME → DB_NAME_PROD; export both constants; widen constructor)
    src/storage/__tests__/local-db-name.test.ts (NEW — 3 tests)
  </files>
  <behavior>
    - Test 1: `new LocalAdapter()` (no args) opens the 'aussieledger' production DB (verifiable via `indexedDB.databases()` listing OR by writing an entity and reading it back from a separately-constructed `new LocalAdapter()` of the same default — they share the DB)
    - Test 2: `new LocalAdapter(DB_NAME_PROD)` (explicit) opens the same 'aussieledger' production DB as Test 1
    - Test 3: `new LocalAdapter(DB_NAME_DEMO)` opens a separately-named 'aussieledger-demo' DB — writes here do NOT appear in a fresh default-constructed adapter
  </behavior>
  <action>
    1. Open `src/storage/local.ts`.
    2. Rename `const DB_NAME = 'aussieledger'` to `export const DB_NAME_PROD = 'aussieledger'`.
    3. Add `export const DB_NAME_DEMO = 'aussieledger-demo'` immediately after.
    4. Add `private readonly dbName: string` field.
    5. Widen constructor signature: `constructor(dbName: string = DB_NAME_PROD)`. Body: `this.dbName = dbName; this.readyPromise = this.init();`. The default-arg makes every existing zero-arg call site keep working byte-identically.
    6. In `init()`: change `openDB<AussieLedgerDB>(DB_NAME, DB_VERSION, ...)` → `openDB<AussieLedgerDB>(this.dbName, DB_VERSION, ...)`. The Web Lock name (`'aussieledger-legacy-migration'`) stays HARD-CODED — legacy localStorage migration is a once-per-origin thing tied to the production DB; the demo DB doesn't have legacy data to migrate (the lock name being origin-scoped means demo + prod will share the lock harmlessly on first init, which is fine — the migration is idempotent and the lock just serialises the migration check).
    7. Update the file-header JSDoc to mention "Phase 14: constructor widened to accept optional dbName (default DB_NAME_PROD); demo route passes DB_NAME_DEMO to isolate from production data per PITFALLS §4 HARD-BLOCK."
    8. Write `src/storage/__tests__/local-db-name.test.ts` with Apache 2.0 SPDX header. Use `fake-indexeddb/auto` (already in dev dependencies — used by existing LocalAdapter tests). For Test 3: write a sentinel entity (`{ id: 'demo-test', name: 'Demo', type: 'SoleTrader' as any, ... minimum-valid-Entity ...}`) via the demo-DB adapter, then construct a fresh default adapter and call `await adapter.ready(); const entities = await adapter.getEntities()` — assert `entities` is empty (no demo-test sentinel leaked).
    9. Reference existing tests in `src/storage/__tests__/local.test.ts` for the fake-indexeddb setup pattern + the minimum-Entity shape.
    10. The widening preserves the StorageAdapter FINAL invariant — no interface methods added/removed; only constructor signature widened.
  </action>
  <verify>
    <automated>npx vitest run src/storage/__tests__/local-db-name.test.ts</automated>
  </verify>
  <done>
    - `DB_NAME_PROD` + `DB_NAME_DEMO` exported from `src/storage/local.ts`
    - Constructor accepts optional `dbName: string` parameter, defaulting to `DB_NAME_PROD`
    - Existing `new LocalAdapter()` call sites in `src/storage/index.ts` continue to work byte-identically (zero-arg call equivalent to passing `DB_NAME_PROD`)
    - 3 new tests GREEN
    - Full SPA test suite still GREEN (regression check — `npx vitest run` exits 0)
    - StorageAdapter FINAL invariant preserved (no interface changes)
    - structural-lint-period.test.ts still GREEN (no `new Date()` introduced)
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: seedDemoData() helper + shape + idempotence tests</name>
  <files>
    src/storage/demo-seed.ts (NEW — ~150 lines)
    src/storage/__tests__/demo-seed.test.ts (NEW — 3 tests)
  </files>
  <behavior>
    - Test 1: `seedDemoData(demoAdapter)` on a fresh demo adapter populates exactly 1 entity (a sole trader with an obviously-demo name), a non-empty Chart of Accounts (Asset + Liability + Equity + Revenue + Expense covering the small-biz minimum), and ~15 journal entries dated within FY2025-26 (each entry's `date` field between '2025-07-01' and '2026-06-30').
    - Test 2: All ~15 journal entries are balanced (sum of debits === sum of credits per entry, within decimal tolerance).
    - Test 3: Calling `seedDemoData(demoAdapter)` a second time when entities already exist is a no-op — entity count stays at 1, journal count stays at the original ~15 (no duplicates added).
  </behavior>
  <action>
    1. Create `src/storage/demo-seed.ts` with Apache 2.0 SPDX header.
    2. JSDoc explaining: "Hard-coded demo fixtures for the /demo route. Loaded once on first demo-adapter init (idempotent — does nothing if entities already exist). FY2025-26 sole-trader narrative: cash sales, equipment purchase, monthly rent expense, owner drawings, GST collected/paid. All timestamps are literal ISO date strings (no `new Date()` calls; structural-lint-period.test.ts compliant) since seed data is static."
    3. Imports: `import type { LocalAdapter } from './local';` (type-only — avoids circular) `import type { Entity, Account, JournalEntry } from '../types';`. NO import of `nowIso()` — seed data uses literal ISO strings.
    4. Define module-level constants:
       - `DEMO_ENTITY_ID = 'demo-entity-sole-trader-001'`
       - `DEMO_ENTITY: Entity` — sole-trader, `name: 'Demo Sole Trader (Sample Data)'` (the parenthetical signals "this is demo data" so users don't confuse with their own books), `type: 'SoleTrader'`, `status: 'Active'`, `_v: ` matching `CURRENT_VERSION` from migrations.ts. ABN: omit or use a clearly-fake placeholder like '00 000 000 000'.
       - `DEMO_ACCOUNTS: Account[]` — minimum ~15 accounts covering the AccountType union: 1000 Cash at Bank (Asset), 1100 Equipment (Asset), 2000 GST Payable (Liability), 2100 Loans (Liability), 3000 Owner's Capital (Equity), 3100 Owner's Drawings (Equity), 4000 Sales Revenue (Revenue), 5000 Rent Expense (Expense), 5100 Utilities Expense (Expense), 5200 Office Supplies (Expense), etc. Each account has a unique `id`, `code`, `name`, `type`. NO `taxLabel` mapping required for the seed (but include sensible ones if it makes the demo's Tax Return view non-trivial — planner's call).
       - `DEMO_JOURNALS: JournalEntry[]` — exactly 15 entries dated July 2025 through June 2026:
         - July 2025: opening capital ($10,000 from owner → DR Cash, CR Capital)
         - Aug 2025: equipment purchase ($3,000 DR Equipment, CR Cash)
         - Sep 2025: first cash sale ($1,100 = $1,000 + $100 GST DR Cash, CR Sales $1,000, CR GST Payable $100)
         - Oct 2025: monthly rent ($800 DR Rent, CR Cash)
         - Nov 2025: utilities ($150 DR Utilities, CR Cash)
         - Dec 2025: larger sale ($2,200 = $2,000 + $200 GST)
         - Jan 2026: office supplies ($300 DR Supplies, CR Cash)
         - Feb 2026: another sale ($1,650 = $1,500 + $150 GST)
         - Mar 2026: BAS payment ($450 DR GST Payable, CR Cash)
         - Apr 2026: owner drawings ($500 DR Drawings, CR Cash)
         - May 2026: utilities ($180 DR Utilities, CR Cash)
         - Jun 2026: closing sale ($2,750 = $2,500 + $250 GST)
         - Jun 2026: closing rent ($800 DR Rent, CR Cash)
         - Jun 2026: closing utilities ($175 DR Utilities, CR Cash)
         - Jun 2026: closing drawings ($400 DR Drawings, CR Cash)
       - Each `JournalEntry` has unique `id`, `entityId: DEMO_ENTITY_ID`, `date: '2025-MM-DD'` literal string, `description`, `reference: 'DEMO-001' .. 'DEMO-015'`, `lines: [...]` with `accountId` matching the accounts above, `debit`/`credit` as string-numeric values (matches existing Decimal-string pattern in v1.0+).
    5. Export `async function seedDemoData(adapter: LocalAdapter): Promise<void>`. Body:
       ```
       const existing = await adapter.getEntities();
       if (existing.length > 0) return;   // idempotent guard
       await adapter.saveEntities([DEMO_ENTITY]);
       await adapter.saveAccounts(DEMO_ACCOUNTS);
       await adapter.saveEntries({ [DEMO_ENTITY_ID]: DEMO_JOURNALS });
       ```
       Audit logs are NOT seeded — demo doesn't need a fake history.
    6. Write `src/storage/__tests__/demo-seed.test.ts` with Apache 2.0 SPDX header. Use `fake-indexeddb/auto`. Tests above. For Test 2 use a small decimal tolerance (0.005) to match the existing balanced-entries pattern in `JournalsView`. Use `LocalAdapter` directly (constructed with `DB_NAME_DEMO`); test fixture wraps with `_resetAdapter()` or per-test instance.
    7. The seed counts (15 journals, 1 entity) are CONTEXT-permitted ("~15 sample journal entries spanning one FY"). The entity name pattern matches the CONTEXT discretion item ("planner picks a realistic name like 'Demo Pty Ltd Trading' or 'Sample Sole Trader' — keep it obviously demo-ish").
    8. Validate against structural-lint-period.test.ts: literal ISO strings (e.g. `'2025-07-15'`) are NOT `new Date()` calls — the regex `\bnew\s+Date\s*\(\s*\)` doesn't match. PASS.
  </action>
  <verify>
    <automated>npx vitest run src/storage/__tests__/demo-seed.test.ts src/lib/__tests__/structural-lint-period.test.ts</automated>
  </verify>
  <done>
    - `src/storage/demo-seed.ts` exists with SPDX header, exports `seedDemoData(adapter)` function
    - 3 new tests GREEN (shape, balanced, idempotent)
    - structural-lint-period.test.ts still GREEN (no `new Date()` introduced; all timestamps are literal ISO strings)
    - SPDX-headers.test.ts still GREEN (new source file picked up by the parametric .each row — +1 row)
    - Full SPA test suite GREEN
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: demo-isolation HARD-BLOCK guard + initAdapter pathname dispatch + wiring</name>
  <files>
    src/storage/index.ts (MODIFIED — initAdapter reads getRouteKind() + picks DB on LocalAdapter branch + calls seedDemoData on demo branch)
    src/storage/__tests__/demo-isolation.test.ts (NEW — PITFALLS §4 HARD-BLOCK guard)
    src/storage/__tests__/initAdapter-demo-routing.test.ts (NEW — pathname-dispatched DB selection)
  </files>
  <behavior>
    Demo-isolation tests (PITFALLS §4 HARD-BLOCK):
    - Test 1: Construct prod adapter, write a sentinel entity, then construct demo adapter, call seedDemoData() — assert prod adapter still has only the sentinel entity (no demo entity leaked into prod).
    - Test 2: Construct demo adapter, call seedDemoData(), then construct prod adapter — assert prod adapter has zero entities (no contamination of fresh prod from demo writes).
    - Test 3: Both adapters live in the same session — write to demo (`saveEntities([newEntity])`), then read from prod — assert prod has NO `newEntity`.

    initAdapter-demo-routing tests:
    - Test 4: With `vi.stubGlobal('location', { pathname: '/' })`, initAdapter() returns a LocalAdapter constructed against DB_NAME_PROD (verifiable via reading dbName off the instance — add a getter `getDbName(): string` for testability OR assert indirectly via `await adapter.getEntities()` returning the prod-DB contents).
    - Test 5: With `vi.stubGlobal('location', { pathname: '/demo' })`, initAdapter() returns a LocalAdapter constructed against DB_NAME_DEMO AND seedDemoData has been called (entity count === 1 immediately after `await adapter.ready()`).
    - Test 6: With pathname='/privacy', initAdapter() returns a LocalAdapter against DB_NAME_PROD (privacy is a view-only route; it must NOT redirect storage).
  </behavior>
  <action>
    1. Open `src/storage/index.ts`.
    2. Add imports at top: `import { getRouteKind } from '../lib/route';` `import { DB_NAME_DEMO, DB_NAME_PROD } from './local';` `import { seedDemoData } from './demo-seed';`
    3. In `initAdapter()`'s LocalAdapter branches (the `forced === 'local'` branch AND the probe-exhausted fallback branch), insert pathname-based DB selection BEFORE the `new LocalAdapter()` call. Pseudo:
       ```
       const routeKind = getRouteKind();
       const dbName = routeKind === 'demo' ? DB_NAME_DEMO : DB_NAME_PROD;
       const a = new LocalAdapter(dbName);
       await a.ready();
       if (routeKind === 'demo') await seedDemoData(a);
       return a;
       ```
       This branch logic runs in BOTH the `forced === 'local'` path (user explicitly chose local mode via localStorage) AND the probe-exhausted fallback (default hosted-mode flow when /api/health 404s). It does NOT run in the `forced === 'server'` branch or the probe-200 ServerAdapter branch — demo mode is local-only by design; ServerAdapter remains 100% unchanged.
    4. The `routeKind === 'privacy'` case maps to DB_NAME_PROD (privacy is a read-only viewer route — the user is still in their production data context, just viewing the privacy page; storage stays prod).
    5. Update the file-header JSDoc to mention "Phase 14: pathname-based DB selection on LocalAdapter branches — /demo → DB_NAME_DEMO + seedDemoData(); else → DB_NAME_PROD. ServerAdapter branches unchanged."
    6. Add an optional `LocalAdapter#getDbName(): string` getter (returns `this.dbName`) in src/storage/local.ts — read-only, NOT on the StorageAdapter interface (consistent with Phase 11's duck-typed accessor pattern). This is the testability seam for Test 4-6 above. Add this in the same file as Task 2's widening; do NOT re-modify in Task 4 if Task 2 has already added it.
    7. Write `src/storage/__tests__/demo-isolation.test.ts` with Apache 2.0 SPDX header. Tests 1-3 above. Use `fake-indexeddb/auto`. CRITICAL: between tests, reset fake-indexeddb (the FDBFactory) so DB-name resolution is fresh each test — pattern: `import { indexedDB } from 'fake-indexeddb';` + `import 'fake-indexeddb/auto';` + `beforeEach(() => { /* reset FDBFactory */ })`. Reference Phase 11's existing local.test.ts for the exact reset pattern.
    8. Write `src/storage/__tests__/initAdapter-demo-routing.test.ts` with Apache 2.0 SPDX header. Tests 4-6 above. Use `vi.stubGlobal('location', { pathname: ... })` to mock the location AND `_resetAdapter()` (already exported from `src/storage/index.ts`) to reset the memoised adapterPromise between tests. Use `localStorage.setItem('storageMode', 'local')` to force the LocalAdapter branch (avoids needing to mock the probeServer fetch). Reset localStorage in `afterEach`.
    9. Why getDbName: alternative would be to inspect `indexedDB.databases()` at test-time, but fake-indexeddb's implementation of that API is not 100% reliable across versions; a direct read-only getter is more deterministic. The getter is JSDoc'd as "test-only introspection — do not rely on this in production code".
    10. Why seedDemoData runs INSIDE initAdapter (not at first user action): seeding-on-first-init means the very first /demo render shows non-empty data (matches CONTEXT spec: "Subsequent /demo visits within the same browser see the seeded data"). The idempotent guard inside seedDemoData makes this safe to call on every initAdapter() — user edits within demo persist across reloads of /demo because `getEntities().length > 0` after the first seed.
  </action>
  <verify>
    <automated>npx vitest run src/storage/__tests__/demo-isolation.test.ts src/storage/__tests__/initAdapter-demo-routing.test.ts</automated>
  </verify>
  <done>
    - PITFALLS §4 HARD-BLOCK locked: 3 demo-isolation tests GREEN proving demo writes cannot contaminate prod and vice-versa
    - 3 initAdapter-demo-routing tests GREEN proving pathname-based DB selection works for /, /demo, and /privacy
    - `getRouteKind()` is the single source of truth for routing dispatch (this plan's Task 1 + this task's consumer; Plan 14-2 adds the second consumer in App.tsx)
    - On a fresh /demo visit, after `await initAdapter()`, the demo adapter has exactly 1 entity (demo sole trader) + non-empty COA + 15 journals
    - Production `'aussieledger'` DB is byte-identical before and after a /demo session
    - ServerAdapter branches in initAdapter() are byte-identical to pre-Phase-14 (regression check: grep `src/storage/index.ts` for ServerAdapter mentions — none should be near the new dispatch logic)
    - Full SPA test suite GREEN (run `npx vitest run` to confirm no regression in the 1128 baseline)
    - lint EXIT 0 (`npm run lint`)
    - build EXIT 0 incl. AIza scan (`npm run build`) — demo-seed.ts is literal text + numbers; no AIza key shapes
  </done>
</task>

</tasks>

<verification>
After all 4 tasks land, run the full plan-level verification:

```
npx vitest run                              # ALL SPA tests GREEN (1128 baseline + ~16-20 new = ~1144-1148 GREEN)
npm run lint                                # EXIT 0
npm run build                               # EXIT 0 incl. AIza scan
```

Plus targeted greps for invariant preservation:

```
# StorageAdapter FINAL — no interface widening
grep -E "^\s*(get|save|append|export|import|ready)" src/storage/adapter.ts
# (output should match exactly the pre-Phase-14 method list; nothing added)

# Demo isolation HARD-BLOCK — assert the constant exists and is used
grep -n "DB_NAME_DEMO" src/storage/local.ts src/storage/index.ts src/storage/demo-seed.ts
# (output should show: constant defined in local.ts; consumed in index.ts; possibly demo-seed.ts comment)

# No new Date() introduced
npx vitest run src/lib/__tests__/structural-lint-period.test.ts

# Demo seed entity name is "obviously demo-ish" per CONTEXT
grep -i "demo" src/storage/demo-seed.ts | head -5
```
</verification>

<success_criteria>
Plan 14-1 is complete when:
- ALL 4 tasks have GREEN verification commands
- `getRouteKind()` returns the correct RouteKind for /, /demo, /demo/, /privacy, and arbitrary paths
- LocalAdapter constructor accepts an optional `dbName` parameter; zero-arg construction uses DB_NAME_PROD (regression-safe)
- DB_NAME_PROD and DB_NAME_DEMO are exported constants
- `seedDemoData(adapter)` populates 1 sole-trader entity + COA + 15 FY2025-26 balanced journals; second call is a no-op
- `initAdapter()` reads `getRouteKind()` and selects DB_NAME_DEMO when on /demo, DB_NAME_PROD otherwise; calls `seedDemoData()` once per demo session
- PITFALLS §4 HARD-BLOCK guard test demonstrates demo writes never reach the production 'aussieledger' DB
- Full SPA test suite GREEN (no regressions in the 1128 baseline)
- `npm run lint` EXIT 0
- `npm run build` EXIT 0 (incl. AIza scan against the post-seed bundle)
- Phase 11 structural-lint-period.test.ts still GREEN (no `new Date()` introduced)
- Phase 11 IDB hardening untouched (no changes to local.ts methods other than constructor + getDbName getter; bumpWriteAt / tryPersist / getLastWriteAt / getPersistGranted / getStorageEstimate all byte-identical)
- Phase 13 PWA contract tests still GREEN (vite.pwa-options.ts unchanged)
- Plan 14-2 can now mount UI components knowing the storage substrate is correct
</success_criteria>

<output>
After completion, create `.planning/phases/14-release-polish/14-1-SUMMARY.md` documenting:
- 5 commits (one per Task; Task 4 has 1 commit since it bundles tests + wiring)
- Final test count delta
- Confirmation that PITFALLS §4 HARD-BLOCK is now executable-testable
- Notes for Plan 14-2 executor: `getRouteKind()` is ready to import from `src/lib/route.ts`; UI tasks should call it at App.tsx mount to select the initial view.

Commit message format (Conventional Commits + Apache 2.0 co-author):

```
feat(14-1): add getRouteKind() helper for pathname-based dispatch
feat(14-1): widen LocalAdapter constructor with optional dbName param
feat(14-1): add seedDemoData() helper with FY2025-26 sole-trader fixtures
feat(14-1): wire pathname-based DB selection into initAdapter() with demo-isolation HARD-BLOCK guard

Co-Authored-By: Claude <noreply@anthropic.com>
```
</output>
