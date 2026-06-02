---
phase: 11-indexeddb-hardening
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/period.ts
  - src/lib/__tests__/period.test.ts
  - src/storage/local.ts
  - src/storage/legacy-migration.ts
  - src/storage/__tests__/local-hardening.test.ts
  - src/lib/__tests__/structural-lint-period.test.ts
autonomous: true
requirements: [IDB-01, IDB-02, IDB-05]
tdd: true

must_haves:
  truths:
    - "src/lib/period.ts exports nowIso(): string returning _nowProvider().toISOString() — single source of ISO timestamps for the whole codebase, routed through the same test seam as today()"
    - "LocalAdapter.init() awaits a private tryPersist() AFTER the legacy migration block completes — engagement score has had time to accumulate for returning users by then"
    - "LocalAdapter caches the persist() outcome in a private _persistGranted: boolean | null field; init() populates it once; getPersistGranted() returns the cached value synchronously-via-Promise; persist() is NEVER re-called within the session or across sessions even when the cached value is false"
    - "LocalAdapter exposes four new duck-typed accessors NOT added to StorageAdapter interface: getPersistGranted(): Promise<boolean | null>, getStorageEstimate(): Promise<StorageEstimate | null>, getLastWriteAt(): Promise<string | null>, setLastWriteAt(iso: string): Promise<void>"
    - "META_LAST_WRITE = 'lastWriteAt' constant lives at the top of src/storage/local.ts alongside the existing META_LAST_EXPORT = 'lastExportAt' — same mirror-pattern"
    - "Every data-changing put() in LocalAdapter is followed by an await this.bumpWriteAt() call: saveEntities (line 84), saveAccounts (line 90), saveEntries (line 96), saveAuditLogs (line 103), appendAuditLog (line 107 transaction), and the importAll bulk transaction (lines 128-148) — 6 call sites total (importAll bumps UNLESS opts.silent === true)"
    - "importAll signature widened to (state: PersistedRoot, opts?: { silent?: boolean }): Promise<void> — when opts.silent === true the post-tx bumpWriteAt is SKIPPED. Default behaviour (opts undefined OR opts.silent === false) bumps lastWriteAt exactly once after tx.done. The {silent: true} option exists for the legacy-migration call site ONLY; user-facing DataPage.handleImport calls importAll WITHOUT silent so the bump fires."
    - "src/storage/legacy-migration.ts line 68 changed from await adapter.importAll(migrated) to await adapter.importAll(migrated, { silent: true }) — legacy migration runs on EVERY existing user first launch under Phase 11 and MUST NOT bump lastWriteAt (would fire backup-nag on every release for every existing user, contradicting locked CONTEXT decision "schema migrations do NOT bump lastWriteAt")"
    - "bumpWriteAt() is a private helper that calls this.db.put('meta', nowIso(), META_LAST_WRITE) — routed through src/lib/period.ts (NO new Date() in local.ts) so the Phase 2 structural lint passes"
    - "setLastExportAt does NOT bump lastWriteAt — exports clear dirty state; bumping would recurse the dirty state forever"
    - "src/lib/migrations/runner.ts (or wherever migrate() runs against the adapter) does NOT bump lastWriteAt — migrations are app-version changes; bumping would fire backup-nag on every release. Verified TWO ways: (a) audit src/lib/migrations/runner.ts confirms it does NOT call adapter.saveX or adapter.importAll (it operates on the raw PersistedRoot object pre-write); (b) src/storage/legacy-migration.ts passes { silent: true } to importAll (see truths above) so the only adapter-touching migration path is suppressed"
    - "New test src/lib/__tests__/structural-lint-period.test.ts greps the entire src/ tree (excluding src/lib/period.ts itself and *.test.ts files) for /new Dates*(s*)/ (no-arg constructor) and /Date.nows*(/ — fails the test suite on any match. LOCKS the period.ts single-source invariant the Plan 11-1 + 11-2 code depends on. Existing parsed-from-string usages like new Date(isoString) are NOT flagged (they parse an external value, not capture the wall clock)."
    - "getStorageEstimate() wraps navigator.storage?.estimate() with optional-chain + .catch(() => null) so unsupported Safari versions silently return null instead of throwing"
    - "tryPersist() uses optional-chain navigator.storage?.persist + .catch(() => false) for unsupported browsers; null cached value reserved for the 'API not present at all' case (typeof navigator.storage?.persist !== 'function')"
    - "All 5 LocalAdapter unit-test suites pass: persist() called exactly once in init() (verified via mock counter); cached value returned on subsequent getPersistGranted() calls; bumpWriteAt fires on every data-changing put and the bulk transaction; setLastExportAt does NOT bump lastWriteAt; getStorageEstimate returns null on a stub that throws"
    - "Existing 999 SPA GREEN + 11 todo + 18 server GREEN baseline preserved; no v1.0/v1.1 test regresses; npm run lint EXIT 0; npm run build EXIT 0 (incl. AIza scan)"
  artifacts:
    - path: "src/lib/period.ts"
      provides: "Adds nowIso(): string export alongside existing today() — single source of ISO timestamp generation, routed through the same _nowProvider test seam"
      exports: ["nowIso", "today", "currentFy", "fyBoundaries", "quarterOf", "quarterBoundaries", "isInPeriod", "_setNowProvider", "_resetNowProvider"]
      contains: "export function nowIso"
    - path: "src/lib/__tests__/period.test.ts"
      provides: "Extends existing period tests with nowIso() coverage — confirms nowIso() returns _nowProvider().toISOString(); honours _setNowProvider injection; matches the same Date instance today() returns at the same moment"
      min_lines: 20
    - path: "src/storage/local.ts"
      provides: "Hardened LocalAdapter — adds META_LAST_WRITE constant; _persistGranted cache field; private tryPersist() called from init(); private bumpWriteAt() helper wrapped around every data-changing put; four new duck-typed public accessors (getPersistGranted, getStorageEstimate, getLastWriteAt, setLastWriteAt)"
      exports: ["LocalAdapter"]
      contains: "bumpWriteAt"
    - path: "src/storage/__tests__/local-hardening.test.ts"
      provides: "New test suite covering: persist() called exactly once in init() (mock counter); _persistGranted cache returned on subsequent calls (no re-invocation); getPersistGranted returns null when navigator.storage.persist is undefined; getStorageEstimate returns null when estimate() throws or returns undefined; bumpWriteAt fires on saveEntities/saveAccounts/saveEntries/saveAuditLogs/appendAuditLog/importAll-default (6 cases — 5 data sites + default-mode bulk transaction); importAll(state, { silent: true }) does NOT bump lastWriteAt (NEW — Blocker 1 fix); setLastExportAt does NOT bump lastWriteAt (read META_LAST_WRITE before and after; assert unchanged); legacy-migration end-to-end (NEW — Blocker 1 fix): pre-seed localStorage with v0 legacy keys, construct a fresh LocalAdapter, await init, assert getLastWriteAt() === null — legacy migration via silent:true left lastWriteAt untouched"
      min_lines: 160
    - path: "src/storage/legacy-migration.ts"
      provides: "Updated call site at line 68 — await adapter.importAll(migrated, { silent: true }) replaces the bare await adapter.importAll(migrated). JSDoc comment added explaining WHY (Phase 11 IDB-05 — schema migrations must not bump lastWriteAt). No other changes to this file."
      contains: "silent: true"
    - path: "src/lib/__tests__/structural-lint-period.test.ts"
      provides: "NEW — Locks the Phase 2 single-source-of-Date invariant the Plan 11-1 + 11-2 code depends on. Greps the src/ tree (excluding period.ts itself + .test.ts files) for /new Date\\s*\\(\\s*\\)/ and /Date\\.now\\s*\\(/. Fails on any match with a list of offending file:line locations. Uses Node built-ins (readdirSync recursive + readFileSync) — zero new dependencies. Mirrors the comment-stripping helper from src/lib/tax/__tests__/structural-lint.test.ts so string literals + comments do not false-match."
      min_lines: 50
  key_links:
    - from: "src/storage/local.ts bumpWriteAt"
      to: "src/lib/period.ts nowIso()"
      via: "named import: import { nowIso } from '../lib/period'"
      pattern: "from ['\"]\\.\\.\\/lib\\/period['\"]"
    - from: "src/storage/local.ts saveEntities/saveAccounts/saveEntries/saveAuditLogs/appendAuditLog/importAll"
      to: "private bumpWriteAt()"
      via: "await this.bumpWriteAt() after every data-changing this.db.put or transaction"
      pattern: "await this\\.bumpWriteAt"
    - from: "src/storage/local.ts init()"
      to: "private tryPersist()"
      via: "await this.tryPersist() after the legacy-migration block — single call, never retried"
      pattern: "await this\\.tryPersist"
    - from: "Future Plan 11-2 (DataPage / useBackupNag / App.tsx)"
      to: "LocalAdapter duck-typed accessors"
      via: "(adapter as unknown as { getPersistGranted?: () => Promise<boolean | null>; getStorageEstimate?: () => Promise<StorageEstimate | null>; getLastWriteAt?: () => Promise<string | null>; setLastWriteAt?: (iso: string) => Promise<void> })"
      pattern: "as unknown as \\{ get(PersistGranted|StorageEstimate|LastWriteAt)"
    - from: "src/storage/legacy-migration.ts line 68"
      to: "LocalAdapter.importAll(state, { silent: true })"
      via: "Blocker 1 fix — schema/legacy migrations bypass the lastWriteAt bump via the new opts.silent option. Verified by a unit test that pre-seeds legacy localStorage keys, runs LocalAdapter.init(), then asserts getLastWriteAt() === null."
      pattern: "importAll\\(migrated, \\{ silent: true \\}\\)"
    - from: "src/lib/__tests__/structural-lint-period.test.ts"
      to: "src/ tree (excluding period.ts + .test.ts)"
      via: "Greps for no-arg new Date() and Date.now() — fails on any match. Locks the invariant ALL Plan 11 timestamp generation routes through period.ts (nowIso / today / addDaysIso)."
      pattern: "new Date\\\\s\\*\\\\(\\\\s\\*\\\\)"
---

<objective>
Land the LocalAdapter hardening foundation Phase 11's UI layer (Plan 11-2) consumes. Add `nowIso()` to `src/lib/period.ts` so every Phase 11 ISO timestamp routes through the single `new Date()` arbiter. Then extend `LocalAdapter` (Phase 3 — FINAL interface preserved) with four new duck-typed accessors (`getPersistGranted`, `getStorageEstimate`, `getLastWriteAt`, `setLastWriteAt`), a private `tryPersist()` called once from `init()` (engagement-aware, never re-prompted), a private `bumpWriteAt()` helper wrapping every data-changing `put` call site (5 single-store + 1 bulk transaction), and the `META_LAST_WRITE` meta-store key mirroring `META_LAST_EXPORT`. Closes the helper-only half of IDB-01, IDB-02, and IDB-05 (the rendering and event-listener half lives in Plan 11-2).

Purpose: Self-contained adapter-layer plan that lands all the duck-typed primitives Plan 11-2's hooks/components need to read. Runs in Wave 1 with no dependencies. Preserves the v1.2 baseline of 999 SPA GREEN + 11 todo + 18 server GREEN + lint EXIT 0 + build EXIT 0 (incl. AIza scan). Plan 11-2 can begin as soon as this plan's tests are GREEN.

Output: 2 files extended (`src/lib/period.ts`, `src/storage/local.ts`), 1 file edited (`src/storage/legacy-migration.ts` line 68 — Blocker 1 fix), 1 test file extended (`src/lib/__tests__/period.test.ts`), 2 new test files (`src/storage/__tests__/local-hardening.test.ts` + `src/lib/__tests__/structural-lint-period.test.ts` — W1 fix). 4 tasks. No existing source removed; no v1.0/v1.1 tests regress.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/REQUIREMENTS.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/11-indexeddb-hardening/11-CONTEXT.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md

@src/storage/local.ts
@src/storage/adapter.ts
@src/storage/index.ts
@src/lib/period.ts
@src/lib/__tests__/period.test.ts
@src/storage/__tests__/local.test.ts
@src/lib/migrations/runner.ts

<interfaces>
<!-- Key contracts the executor uses directly — extracted from the codebase so no exploration is needed. -->

From src/lib/period.ts (existing — extend by adding nowIso; keep the rest identical):
```typescript
// Existing test seam — DO NOT modify:
let _nowProvider: () => Date = () => new Date();

export function today(): Date {
  return _nowProvider();
}

export function _setNowProvider(fn: () => Date): void {
  _nowProvider = fn;
}

export function _resetNowProvider(): void {
  _nowProvider = () => new Date();
}

// Add this export — verbatim shape:
export function nowIso(): string {
  return _nowProvider().toISOString();
}
```

From src/storage/local.ts current state (annotated with insertion points):
```typescript
// Top constants (line 24-27 area) — ADD META_LAST_WRITE alongside:
const DB_NAME = 'aussieledger';
const DB_VERSION = 1;
const SINGLETON_KEY = '__singleton__';
const META_LAST_EXPORT = 'lastExportAt';
const META_LAST_WRITE = 'lastWriteAt';   // NEW — mirrors the export pattern

// Inside LocalAdapter class — ADD private field:
private _persistGranted: boolean | null = null;

// init() — after the legacy-migration block (currently ends around line 77),
// ADD a single call:
await this.tryPersist();

// Private helpers — ADD inside the class:
private async tryPersist(): Promise<void> {
  try {
    if (typeof navigator === 'undefined') {
      this._persistGranted = null;
      return;
    }
    const sm = navigator.storage;
    if (!sm || typeof sm.persist !== 'function') {
      this._persistGranted = null;   // API not supported
      return;
    }
    this._persistGranted = await sm.persist().catch(() => false);
  } catch {
    this._persistGranted = null;
  }
}

private async bumpWriteAt(): Promise<void> {
  await this.db.put('meta', nowIso(), META_LAST_WRITE);
}

// Public accessors — ADD (NOT in StorageAdapter interface; duck-typed):
async getPersistGranted(): Promise<boolean | null> {
  return this._persistGranted;
}

async getStorageEstimate(): Promise<StorageEstimate | null> {
  try {
    if (typeof navigator === 'undefined') return null;
    const sm = navigator.storage;
    if (!sm || typeof sm.estimate !== 'function') return null;
    const est = await sm.estimate().catch(() => null);
    return est ?? null;
  } catch {
    return null;
  }
}

async getLastWriteAt(): Promise<string | null> {
  const v = await this.db.get('meta', META_LAST_WRITE);
  return typeof v === 'string' ? v : null;
}

async setLastWriteAt(iso: string): Promise<void> {
  await this.db.put('meta', iso, META_LAST_WRITE);
}

// Existing methods — WRAP each data-write with await this.bumpWriteAt():
async saveEntities(entities: Entity[]): Promise<void> {
  await this.db.put('entities', entities, SINGLETON_KEY);
  await this.bumpWriteAt();   // NEW
}
async saveAccounts(accounts: Account[]): Promise<void> {
  await this.db.put('accounts', accounts, SINGLETON_KEY);
  await this.bumpWriteAt();   // NEW
}
async saveEntries(entries: Record<string, JournalEntry[]>): Promise<void> {
  await this.db.put('entries', entries, SINGLETON_KEY);
  await this.bumpWriteAt();   // NEW
}
async saveAuditLogs(logs: AuditLog[]): Promise<void> {
  await this.db.put('auditLogs', logs, SINGLETON_KEY);
  await this.bumpWriteAt();   // NEW
}
async appendAuditLog(log: AuditLog): Promise<void> {
  const tx = this.db.transaction('auditLogs', 'readwrite');
  const existing = (await tx.store.get(SINGLETON_KEY)) ?? [];
  await tx.store.put([log, ...existing], SINGLETON_KEY);
  await tx.done;
  await this.bumpWriteAt();   // NEW — AFTER tx.done so the bump is its own micro-tx
}
// importAll — signature WIDENED with opts.silent for the legacy-migration call site:
async importAll(state: PersistedRoot, opts?: { silent?: boolean }): Promise<void> {
  // ...existing bulk transaction with 4 puts at lines 132/136/140/144...
  await tx.done;
  // NEW (Phase 11 IDB-05 / Blocker 1 fix) — bump UNLESS the caller opted out.
  // Legacy-migration + future schema-migration paths pass { silent: true } so they
  // do NOT trigger backup-nag on every existing user's first launch under Phase 11.
  // User-facing DataPage.handleImport calls importAll WITHOUT opts so the bump fires
  // (bulk imports ARE user-affecting content changes per CONTEXT locked decision).
  if (!opts?.silent) {
    await this.bumpWriteAt();
  }
}

// setLastExportAt — DO NOT modify; MUST NOT bump lastWriteAt:
async setLastExportAt(iso: string): Promise<void> {
  await this.db.put('meta', iso, META_LAST_EXPORT);
  // Intentionally no bumpWriteAt — exports clear dirty state, never create it.
}
```

From src/storage/legacy-migration.ts current state (line 68 — the call site Blocker 1 fixes):
```typescript
// BEFORE (current line 68):
await adapter.importAll(migrated);

// AFTER (Plan 11-1 Blocker 1 fix):
// Schema/legacy migrations must NOT bump lastWriteAt — they are app-version upgrades,
// not user-content changes. Without { silent: true } here, every existing v1.0 user's
// first launch under Phase 11 would fire backup-nag (the migration's importAll bump
// would make lastWriteAt > lastExportAt). The opts.silent option exists for this
// exact call site; verified by unit test in src/storage/__tests__/local-hardening.test.ts.
await adapter.importAll(migrated, { silent: true });
```

From src/storage/adapter.ts (FINAL — DO NOT MODIFY):
```typescript
// The StorageAdapter interface is FINAL per Phase 3 invariant.
// New methods added to LocalAdapter MUST NOT be added to this interface.
// Consumers access via duck-typing — see Plan 11-2.
export interface StorageAdapter {
  ready(): Promise<void>;
  getEntities(): Promise<Entity[]>;
  saveEntities(entities: Entity[]): Promise<void>;
  // ... (12 methods total — all FINAL)
}
```

SPDX header pattern (copy verbatim onto the new test file — local.ts already has one):
```typescript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
```

Test injection pattern for nowIso (existing in period.test.ts via _setNowProvider):
```typescript
import { nowIso, _setNowProvider, _resetNowProvider } from '../period';

afterEach(() => { _resetNowProvider(); });

test('nowIso() returns ISO string from _nowProvider', () => {
  _setNowProvider(() => new Date('2026-06-15T10:30:00.000Z'));
  expect(nowIso()).toBe('2026-06-15T10:30:00.000Z');
});
```

LocalAdapter test pattern (mirror the existing src/storage/__tests__/local.test.ts setUp pattern with fake-indexeddb):
```typescript
import 'fake-indexeddb/auto';
import { LocalAdapter } from '../local';
import { _resetNowProvider, _setNowProvider } from '../../lib/period';

// Pattern for mocking navigator.storage:
const originalStorage = (globalThis as any).navigator?.storage;
let persistCallCount = 0;
beforeEach(() => {
  persistCallCount = 0;
  Object.defineProperty(globalThis.navigator, 'storage', {
    configurable: true,
    value: {
      persist: vi.fn(async () => { persistCallCount++; return true; }),
      estimate: vi.fn(async () => ({ quota: 2_400_000_000, usage: 47_000_000 })),
    },
  });
});
afterEach(() => {
  if (originalStorage) {
    Object.defineProperty(globalThis.navigator, 'storage', { configurable: true, value: originalStorage });
  }
  _resetNowProvider();
});
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add nowIso() to src/lib/period.ts + tests</name>
  <files>src/lib/period.ts, src/lib/__tests__/period.test.ts</files>
  <behavior>
    - Test 1: `nowIso()` returns a string matching the ISO-8601 shape `YYYY-MM-DDTHH:mm:ss.sssZ`
    - Test 2: With `_setNowProvider(() => new Date('2026-06-15T10:30:00.000Z'))`, `nowIso()` returns exactly `'2026-06-15T10:30:00.000Z'`
    - Test 3: `nowIso()` and `today().toISOString()` return identical strings when called at the same provider tick (deterministic via `_setNowProvider`)
    - Test 4: After `_resetNowProvider()`, two consecutive `nowIso()` calls produce strings within 1 second of each other (sanity check that the real-clock path works)
  </behavior>
  <action>
    1. Open `src/lib/period.ts`. After the existing `_resetNowProvider` export (currently line 41), add a new exported function:
       ```typescript
       /** ISO-8601 UTC timestamp from the same provider as today(). Use for meta-store writes. */
       export function nowIso(): string {
         return _nowProvider().toISOString();
       }
       ```
       DO NOT modify any existing export. DO NOT add a new test seam — `nowIso` uses the existing `_nowProvider`.

    2. Open `src/lib/__tests__/period.test.ts`. Add a new `describe('nowIso')` block at the end of the file (before the closing brace if the file uses a top-level describe; otherwise as a sibling describe).

    3. Import nowIso alongside existing imports: `import { nowIso, _setNowProvider, _resetNowProvider, today } from '../period';`. If `vi` is not yet imported in this file, add `import { describe, test, expect, afterEach } from 'vitest';` (match what the file currently does — likely a global `vi` setup).

    4. Add the 4 tests listed under `<behavior>` above. Use `_resetNowProvider()` in `afterEach` so the real clock is restored.

    5. DO NOT modify any existing test or existing helper. DO NOT route other Phase 11 ISO calls through this in Task 1 — that's Task 2's job.

    Why: `nowIso()` is the SINGLE-SOURCE helper for ISO timestamp generation. The Phase 2 structural lint (`no new Date()` outside `src/lib/period.ts`) requires every call site that needs `new Date().toISOString()` to route through here. Task 2 will use this from `src/storage/local.ts`.
  </action>
  <verify>
    <automated>npx vitest run src/lib/__tests__/period.test.ts</automated>
  </verify>
  <done>4 new tests for `nowIso()` GREEN; all existing period tests still GREEN; `period.ts` exports `nowIso` as named export.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Extend LocalAdapter with persist/estimate/lastWriteAt accessors + bumpWriteAt wrapper</name>
  <files>src/storage/local.ts, src/storage/__tests__/local-hardening.test.ts</files>
  <behavior>
    Behaviour cases for the new test file `src/storage/__tests__/local-hardening.test.ts`:

    **tryPersist + getPersistGranted:**
    - Test 1: After `new LocalAdapter().ready()` with a mocked `navigator.storage.persist` that resolves to `true`, `getPersistGranted()` resolves to `true`
    - Test 2: After init, `persistCallCount` equals exactly 1 — never re-prompted
    - Test 3: Calling `getPersistGranted()` 5 more times leaves `persistCallCount` at 1 — cached, never re-invoked
    - Test 4: With `navigator.storage.persist` resolving to `false` (Firefox deny), `getPersistGranted()` resolves to `false` AND `persistCallCount` stays at 1 (no retry)
    - Test 5: With `navigator.storage.persist` undefined (`Object.defineProperty(navigator, 'storage', { value: {} })`), `getPersistGranted()` resolves to `null`
    - Test 6: With `navigator.storage.persist()` throwing (`vi.fn(async () => { throw new Error('blocked'); })`), `getPersistGranted()` resolves to `false` (caught, not propagated)

    **getStorageEstimate:**
    - Test 7: With `navigator.storage.estimate` returning `{ quota: 2_400_000_000, usage: 47_000_000 }`, `getStorageEstimate()` resolves to that object
    - Test 8: With `navigator.storage.estimate` undefined, `getStorageEstimate()` resolves to `null`
    - Test 9: With `navigator.storage.estimate()` throwing, `getStorageEstimate()` resolves to `null`
    - Test 10: With `navigator.storage.estimate()` returning `undefined` (some Safari), `getStorageEstimate()` resolves to `null`

    **bumpWriteAt coverage (read META_LAST_WRITE via getLastWriteAt before/after each operation; assert it changes):**
    - Test 11: `saveEntities([...])` bumps `lastWriteAt` (was null → is ISO string)
    - Test 12: `saveAccounts([...])` bumps `lastWriteAt` (advances to a later ISO)
    - Test 13: `saveEntries({...})` bumps `lastWriteAt`
    - Test 14: `saveAuditLogs([...])` bumps `lastWriteAt`
    - Test 15: `appendAuditLog({...})` bumps `lastWriteAt`
    - Test 16: `importAll({...})` bumps `lastWriteAt` exactly ONCE (one bump for the whole bulk transaction, not 4)
    - Test 17: `setLastExportAt(iso)` does NOT bump `lastWriteAt` — read `lastWriteAt` before, call `setLastExportAt`, read again, assert unchanged
    - Test 18: For Test 11–15, use `_setNowProvider` to inject deterministic timestamps so the assertion can compare exact ISO strings (e.g. `_setNowProvider(() => new Date('2026-06-15T10:30:00.000Z'))` then assert `await adapter.getLastWriteAt() === '2026-06-15T10:30:00.000Z'`)

    **setLastWriteAt direct accessor:**
    - Test 19: `setLastWriteAt('2026-06-15T10:30:00.000Z')` then `getLastWriteAt()` returns `'2026-06-15T10:30:00.000Z'` — round-trip verified

    **opts.silent suppression (NEW — Blocker 1 fix):**
    - Test 20: `importAll(state, { silent: true })` does NOT bump `lastWriteAt` — pre-bump lastWriteAt to '2026-06-10T00:00:00.000Z' via setLastWriteAt; call importAll with non-empty state AND { silent: true }; assert getLastWriteAt() === '2026-06-10T00:00:00.000Z' (unchanged)
    - Test 21: `importAll(state, { silent: false })` AND `importAll(state)` (no opts) BOTH bump lastWriteAt — covers the default path AND the explicit-non-silent path; assert getLastWriteAt() advances to the injected provider clock

    **legacy-migration end-to-end (NEW — Blocker 1 fix):**
    - Test 22: Pre-seed localStorage with the 4 ledger_* legacy keys (`ledger_entities_list`, `ledger_all_entries`, `ledger_chart_of_accounts`, `ledger_audit_logs`) containing JSON for a minimal v0 dataset (1 entity, 0 accounts, 0 entries, 0 audit logs); construct a fresh LocalAdapter; await ready(); assert (a) getEntities().length === 1 (migration ran), (b) getLastWriteAt() === null (silent migration left lastWriteAt untouched), (c) localStorage.getItem('ledger_entities_list') === null (legacy keys cleared)
  </behavior>
  <action>
    **PART A — Extend `src/storage/local.ts`:**

    1. Top of file: add the import `import { nowIso } from '../lib/period';` alongside existing imports. DO NOT use `new Date()` anywhere in this file — every timestamp goes through `nowIso()`.

    2. Below `const META_LAST_EXPORT = 'lastExportAt';` (line 27), add:
       ```typescript
       const META_LAST_WRITE = 'lastWriteAt';
       ```

    3. Inside the `LocalAdapter` class (after the `db!` and `readyPromise` field declarations, before the constructor), add:
       ```typescript
       private _persistGranted: boolean | null = null;
       ```

    4. At the END of the `init()` method (currently line 78, after the legacy-migration block), add a single line:
       ```typescript
       await this.tryPersist();
       ```
       Place it AFTER the legacy migration. This is the only call site for `tryPersist()` — it runs once per LocalAdapter instance, never again.

    5. Inside the class (anywhere — convention: just below `init`, above public methods), add the two private helpers:
       ```typescript
       /**
        * Request persistent storage from the browser ONCE, cache the outcome.
        *
        * Engagement-aware: by the time init() runs, returning users have prior
        * engagement recorded so Chrome/Edge auto-grant; Firefox shows the prompt
        * (or auto-denies based on engagement); Safari heuristically grants if
        * installed as a PWA. We do NOT re-prompt under any circumstance — false
        * is a respected user decision (see CONTEXT.md decision: "Never re-prompt
        * after user deny").
        *
        * Cached as:
        *   true  → granted
        *   false → denied (or persist() threw)
        *   null  → API not supported (degrade silently)
        */
       private async tryPersist(): Promise<void> {
         try {
           if (typeof navigator === 'undefined') {
             this._persistGranted = null;
             return;
           }
           const sm = navigator.storage;
           if (!sm || typeof sm.persist !== 'function') {
             this._persistGranted = null;
             return;
           }
           this._persistGranted = await sm.persist().catch(() => false);
         } catch {
           this._persistGranted = null;
         }
       }

       /**
        * Stamp meta-store `lastWriteAt` to the current instant. Called from every
        * data-changing put. NOT called from setLastExportAt (exports clear dirty
        * state, not create it). NOT called from schema migrations (those are
        * app-version upgrades, not user content changes).
        */
       private async bumpWriteAt(): Promise<void> {
         await this.db.put('meta', nowIso(), META_LAST_WRITE);
       }
       ```

    6. Add four NEW public methods (duck-typed; NOT added to `StorageAdapter` interface). Place them near `getLastExportAt`/`setLastExportAt` for grouping:
       ```typescript
       /** Cached result of navigator.storage.persist() called once in init().
        *  true = granted; false = denied; null = API unsupported. Never re-prompts. */
       async getPersistGranted(): Promise<boolean | null> {
         return this._persistGranted;
       }

       /** Snapshot of navigator.storage.estimate() — { quota, usage } or null on
        *  unsupported / thrown / undefined-return. NOT cached; called per-invocation
        *  (DataPage only calls it once on mount, so caching is unnecessary). */
       async getStorageEstimate(): Promise<StorageEstimate | null> {
         try {
           if (typeof navigator === 'undefined') return null;
           const sm = navigator.storage;
           if (!sm || typeof sm.estimate !== 'function') return null;
           const est = await sm.estimate().catch(() => null);
           return est ?? null;
         } catch {
           return null;
         }
       }

       /** Read meta-store lastWriteAt — null if never written. */
       async getLastWriteAt(): Promise<string | null> {
         const v = await this.db.get('meta', META_LAST_WRITE);
         return typeof v === 'string' ? v : null;
       }

       /** Direct setter — used by Plan 11-2's bulk-import wiring in DataPage.handleImport
        *  to bump lastWriteAt explicitly post-import. Standard data-changing puts go
        *  through bumpWriteAt() internally. */
       async setLastWriteAt(iso: string): Promise<void> {
         await this.db.put('meta', iso, META_LAST_WRITE);
       }
       ```

    7. Wrap the 5 single-store data-changing call sites with `await this.bumpWriteAt()` AND widen the `importAll` signature with the `{ silent?: boolean }` option (Blocker 1 fix):
       - `saveEntities` (line 84): add `await this.bumpWriteAt();` AFTER `await this.db.put(...)`
       - `saveAccounts` (line 90): same pattern
       - `saveEntries` (line 96): same pattern
       - `saveAuditLogs` (line 103): same pattern
       - `appendAuditLog` (line 107 area): add `await this.bumpWriteAt();` AFTER `await tx.done;` (NOT inside the transaction — bump is its own write)
       - `importAll` (line 127 signature + line 128 bulk transaction): change the signature from `async importAll(state: PersistedRoot): Promise<void>` to `async importAll(state: PersistedRoot, opts?: { silent?: boolean }): Promise<void>`. AFTER `await tx.done;`, add a CONDITIONAL bump:
         ```typescript
         if (!opts?.silent) {
           await this.bumpWriteAt();
         }
         ```
         Add a JSDoc comment above the method body explaining the option:
         ```typescript
         /**
          * Bulk-import the full PersistedRoot. Default behaviour bumps lastWriteAt
          * (bulk imports ARE user-affecting content changes per CONTEXT decision).
          *
          * opts.silent === true: skip the lastWriteAt bump — RESERVED for the
          * legacy-migration call site (src/storage/legacy-migration.ts) and any
          * future schema-migration runner. Migrations are app-version upgrades,
          * not user content changes; bumping would fire backup-nag on every
          * Phase X release for every existing user. The opts.silent flag is the
          * single supported escape hatch — adding more migration call sites in
          * the future requires explicit opt-in.
          */
         ```

    8. DO NOT modify `setLastExportAt` — it MUST NOT bump `lastWriteAt`. Add an inline comment confirming this:
       ```typescript
       async setLastExportAt(iso: string): Promise<void> {
         // Intentionally NO bumpWriteAt() — exports CLEAR dirty state (they reset
         // the lastWriteAt > lastExportAt condition the beforeunload guard reads),
         // they don't create new dirtiness. Bumping here would recurse the dirty
         // state forever and the guard would always fire.
         await this.db.put('meta', iso, META_LAST_EXPORT);
       }
       ```

    9. **Blocker 1 fix — HARD verification + edit of `src/storage/legacy-migration.ts`:**

       (a) Open `src/storage/legacy-migration.ts` and confirm line 68 reads `await adapter.importAll(migrated);`. (Verified in checker report — this is the call site that would bump lastWriteAt on every existing user's first launch under Phase 11 without this fix.)

       (b) Change line 68 to:
       ```typescript
       // Phase 11 IDB-05 — { silent: true } prevents the migration's importAll from bumping
       // lastWriteAt. Without this, every v1.0/v1.1 user's first launch under Phase 11 would
       // fire backup-nag (the migration's importAll would make lastWriteAt > lastExportAt).
       // See LocalAdapter.importAll for the opts.silent contract.
       await adapter.importAll(migrated, { silent: true });
       ```

       (c) Audit `src/lib/migrations/runner.ts` (the schema-version migration ladder) — confirm it operates on the raw `PersistedRoot` object BEFORE the adapter writes it (i.e. `migrate()` returns a transformed object; the actual IDB write happens via `adapter.importAll(...)` in the CALLER, e.g. legacy-migration.ts or DataPage.confirmImport). If the audit confirms this (it should — it's the established Phase 3 pattern), runner.ts requires zero changes. If runner.ts unexpectedly DOES call `adapter.saveX(...)` or `adapter.importAll(...)` directly, propagate the `{ silent: true }` option through every such call site and add a unit test per site.

       (d) The new test `src/storage/__tests__/local-hardening.test.ts` (PART B below) MUST include two coverage cases for this fix:
       - Test: `importAll(state, { silent: true })` does NOT bump lastWriteAt (pre-bump lastWriteAt to a known ISO; call importAll with silent; assert lastWriteAt unchanged)
       - Test: end-to-end legacy migration leaves lastWriteAt null (pre-seed localStorage with the 4 `ledger_*` legacy keys; construct fresh `LocalAdapter`; await `ready()`; assert `getLastWriteAt() === null` AND `getEntities().length > 0` — proves the migration ran AND did not bump)

       (e) Do NOT introduce a separate `_rawImportAll` method. The `opts.silent` option keeps the public surface minimal (one method, one option) while satisfying the invariant.

    **PART B — Create `src/storage/__tests__/local-hardening.test.ts`:**

    1. Start the file with the SPDX header (verbatim):
       ```typescript
       /**
        * @license
        * SPDX-License-Identifier: Apache-2.0
        */
       ```

    2. Import block:
       ```typescript
       import 'fake-indexeddb/auto';
       import { beforeEach, afterEach, describe, test, expect, vi } from 'vitest';
       import { LocalAdapter } from '../local';
       import { _setNowProvider, _resetNowProvider } from '../../lib/period';
       ```

    3. Implement the navigator.storage mocking pattern shown in the `<interfaces>` block above. Use `vi.fn()` so call counts are inspectable. Stash and restore the original `navigator.storage` in beforeEach/afterEach so tests don't leak mocks.

    4. **CRITICAL — IDB isolation between tests:** `fake-indexeddb/auto` shares one DB across tests by default. Either (a) call `indexedDB.deleteDatabase('aussieledger')` in beforeEach BEFORE constructing the adapter; OR (b) call the test-only `_resetAdapter()` from `src/storage/index.ts` if applicable; OR (c) follow the pattern used in existing `src/storage/__tests__/local.test.ts` — read that file first and match its isolation approach.

    5. Implement all 19 tests listed under `<behavior>` above. Group into `describe` blocks: "tryPersist + getPersistGranted", "getStorageEstimate", "bumpWriteAt coverage", "setLastWriteAt round-trip".

    6. For the bumpWriteAt timestamp-comparison tests (11–16), use `_setNowProvider(() => new Date('YYYY-MM-DDTHH:mm:ss.sssZ'))` to inject a deterministic clock so `getLastWriteAt()` returns a predictable string. Advance the provider between calls (e.g. call `_setNowProvider` again with a later date) to verify the bump actually advances the stored value, not just stamps it once.

    7. For Test 17 (setLastExportAt does NOT bump lastWriteAt), the test shape is:
       ```typescript
       test('setLastExportAt does NOT bump lastWriteAt', async () => {
         const adapter = new LocalAdapter();
         await adapter.ready();
         _setNowProvider(() => new Date('2026-06-15T10:00:00.000Z'));
         await adapter.saveEntities([]);  // bumps lastWriteAt
         const before = await adapter.getLastWriteAt();
         _setNowProvider(() => new Date('2026-06-15T11:00:00.000Z'));  // advance clock
         await adapter.setLastExportAt('2026-06-15T11:00:00.000Z');
         const after = await adapter.getLastWriteAt();
         expect(after).toBe(before);  // unchanged
       });
       ```

    Why this matters: Plan 11-2's `useBackupNag` hook reads `getLastExportAt` vs `getLastWriteAt` to decide whether to fire. If exports bumped lastWriteAt, the dirty condition (`lastWriteAt > lastExportAt`) would never resolve and the backup-nag would fire forever. Plan 11-2's `beforeunload` guard has the same dependency — both rely on this Plan 11-1 invariant being correct.

    Pitfall to avoid: Do NOT use `new Date().toISOString()` directly in `local.ts` — Phase 2 structural lint will fail the build. Route through `nowIso()` from `period.ts` (Task 1's deliverable).
  </action>
  <verify>
    <automated>npx vitest run src/storage/__tests__/local-hardening.test.ts src/storage/__tests__/local.test.ts</automated>
  </verify>
  <done>All 19 hardening tests GREEN; existing local.test.ts tests still GREEN (no regression); `LocalAdapter` exposes the 4 new accessors; `persist()` called exactly once in `init()`; `bumpWriteAt` fires on every data-changing put and the bulk transaction; `setLastExportAt` does NOT bump.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Create structural-lint-period.test.ts — lock the no-bare-new-Date invariant (W1 fix)</name>
  <files>src/lib/__tests__/structural-lint-period.test.ts</files>
  <behavior>
    The plans cite a "Phase 2 structural lint" that build-fails on stray `new Date()`. Plan-checker proved no such enforcement exists yet — the existing `src/lib/tax/__tests__/structural-lint.test.ts` only enforces tax-module rules. This task creates the missing enforcement so Plans 11-1 + 11-2 can rely on the invariant.

    Test cases:
    - Test 1: No file under `src/` (excluding `src/lib/period.ts` itself and any `*.test.ts` / `*.test.tsx`) contains a no-arg `new Date()` call. Pattern: `/new\s+Date\s*\(\s*\)/`. Parsed-from-value uses like `new Date(isoString)` MUST NOT match (they take an argument).
    - Test 2: No file under `src/` (same exclusions) contains a `Date.now()` call. Pattern: `/Date\.now\s*\(/`.
    - Test 3 (negative — sanity): the lint helper's comment-stripping correctly ignores matches inside string literals and `//` line comments. Synthetic input `const s = 'new Date()'` does NOT count as a violation; `const x = new Date();` DOES.

    Acceptance: after Plan 11-1 Task 2 lands, this test passes (because `local.ts` routes through `nowIso()`). After Plan 11-2 Tasks 1+5 land, this test still passes (because `useBackupNag.ts`, `App.tsx`, `IosItpBanner.tsx` route through `today()` / `nowIso()` / `addDaysIso()`). If a future commit introduces a bare `new Date()` anywhere outside `period.ts`, the test fails with a list of `file:line` violations.
  </behavior>
  <action>
    1. Create `src/lib/__tests__/structural-lint-period.test.ts` with the verbatim SPDX header.

    2. Implementation pattern — mirror `src/lib/tax/__tests__/structural-lint.test.ts` (READ that file first; reuse its `stripCommentsAndStrings` helper shape AND its `findTsFiles` recursive readdirSync helper — zero new dependencies). Adapt the directory scope from `src/lib/tax` to `src/` and add an exclude list:

    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * Structural lint — Phase 2 invariant: NO no-arg `new Date()` or `Date.now()`
     * outside src/lib/period.ts. All wall-clock reads MUST route through today() /
     * nowIso() / addDaysIso() so tests can inject deterministic timestamps via
     * _setNowProvider().
     *
     * Parsed-from-value uses like new Date(isoString) are NOT flagged — they take
     * an argument and do not capture the wall clock.
     *
     * Locked by: Plan 11-1 (LocalAdapter bumpWriteAt routes through nowIso) +
     * Plan 11-2 (useBackupNag addDaysIso, App.tsx isDirty derivation).
     */
    import { describe, it, expect } from 'vitest';
    import { readdirSync, readFileSync, existsSync } from 'fs';
    import { join, relative, sep } from 'path';

    const SRC_DIR = join(process.cwd(), 'src');
    const PERIOD_FILE = join('src', 'lib', 'period.ts').split(sep).join('/');

    function stripCommentsAndStrings(line: string): string {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('*') || trimmed.startsWith('/*')) return '';
      return line
        .replace(/\/\/.*$/, '')
        .replace(/\/\*.*?\*\//g, '')
        .replace(/'[^']*'/g, "''")
        .replace(/"[^"]*"/g, '""')
        .replace(/`[^`]*`/g, '\`\`');
    }

    function findSourceFiles(dir: string): string[] {
      if (!existsSync(dir)) return [];
      const entries = readdirSync(dir, { withFileTypes: true, recursive: true });
      return entries
        .filter((f) => f.isFile())
        .filter((f) => /\.(ts|tsx)$/.test(f.name))
        .filter((f) => !/\.test\.(ts|tsx)$/.test(f.name))
        .map((f) => join((f as unknown as { path: string }).path, f.name))
        .filter((p) => {
          const rel = relative(process.cwd(), p).split(sep).join('/');
          return rel !== PERIOD_FILE;
        });
    }

    describe('Structural lint: no bare new Date() outside src/lib/period.ts', () => {
      it('no source file under src/ (excluding period.ts + tests) calls new Date() with no args', () => {
        const files = findSourceFiles(SRC_DIR);
        const violations: string[] = [];
        const NEW_DATE_NO_ARG = /new\s+Date\s*\(\s*\)/;
        for (const file of files) {
          const lines = readFileSync(file, 'utf-8').split('\n');
          lines.forEach((raw, i) => {
            const line = stripCommentsAndStrings(raw);
            if (NEW_DATE_NO_ARG.test(line)) {
              violations.push(`${relative(process.cwd(), file)}:${i + 1}: ${raw.trim()}`);
            }
          });
        }
        if (violations.length > 0) {
          throw new Error(
            'Found bare new Date() outside src/lib/period.ts — route through today() / nowIso() / addDaysIso():\n' +
              violations.join('\n'),
          );
        }
      });

      it('no source file under src/ (excluding period.ts + tests) calls Date.now()', () => {
        const files = findSourceFiles(SRC_DIR);
        const violations: string[] = [];
        const DATE_NOW = /Date\.now\s*\(/;
        for (const file of files) {
          const lines = readFileSync(file, 'utf-8').split('\n');
          lines.forEach((raw, i) => {
            const line = stripCommentsAndStrings(raw);
            if (DATE_NOW.test(line)) {
              violations.push(`${relative(process.cwd(), file)}:${i + 1}: ${raw.trim()}`);
            }
          });
        }
        if (violations.length > 0) {
          throw new Error(
            'Found Date.now() outside src/lib/period.ts — route through today().getTime():\n' +
              violations.join('\n'),
          );
        }
      });

      it('stripCommentsAndStrings correctly ignores matches inside strings and comments (sanity)', () => {
        expect(stripCommentsAndStrings(`const s = 'new Date()';`)).not.toMatch(/new\s+Date\s*\(\s*\)/);
        expect(stripCommentsAndStrings(`// new Date()`)).not.toMatch(/new\s+Date\s*\(\s*\)/);
        expect(stripCommentsAndStrings(`const x = new Date();`)).toMatch(/new\s+Date\s*\(\s*\)/);
      });
    });
    ```

    3. Run the test against the current tree (BEFORE Tasks 1 + 2 of this plan land): expect failures — `src/components/DataPage.tsx:51` uses `new Date(iso)` which is PARSED-FROM-VALUE (takes an arg) and MUST NOT match. Audit the failures: every reported violation must either be (a) a genuine wall-clock use that needs routing through period.ts, OR (b) a false-positive from the comment-stripper that needs the regex tightened.

    4. As of pre-Plan-11 state, candidate violations to verify against the test:
       - `src/components/DataPage.tsx` line 37 area uses `d ?? today()` (already routed — OK)
       - `src/components/DataPage.tsx` line ~51 `new Date(iso)` (parsed-from-value — should NOT match; regex requires literal `()`)
       - Any tests using `new Date('2026-...')` (excluded by `.test.` filter)
       - Hooks / components that may have stray `new Date()` from v1.0/v1.1 — if found, audit + fix or add to a SHORT exclude list with justification

    5. If the test fails on a pre-existing v1.0/v1.1 wall-clock use that is NOT a Phase 11 concern (e.g. a Settings component captured `new Date()` for a UI-only "loaded at" badge), there are two options:
       (a) **Preferred:** route through `today()` from `period.ts` (small refactor; preserves invariant)
       (b) **Compromise:** add the specific file:line to an explicit allowlist constant at the top of the test with a JSDoc explaining why (e.g. `const ALLOWED = ['src/foo.ts:42']; // <reason>`). Surfacing the allowlist makes future violations visible.

    6. Document any allowlist entries (if needed) in the SUMMARY.md.

    Why this matters: Plan 11-1's `nowIso()` design AND Plan 11-2's `addDaysIso()` design both assume "no wall-clock reads outside period.ts" is enforced. Without this test, a future contributor could re-introduce `new Date()` and silently break the deterministic-test-clock invariant.
  </action>
  <verify>
    <automated>npx vitest run src/lib/__tests__/structural-lint-period.test.ts</automated>
  </verify>
  <done>3 structural-lint tests GREEN against the post-Task-2 tree; any pre-Phase-11 v1.0/v1.1 violations either fixed by routing through period.ts OR documented in an explicit allowlist with justification (allowlist entries documented in SUMMARY.md).</done>
</task>

<task type="auto">
  <name>Task 4: Full baseline verification — lint + build + full SPA suite GREEN</name>
  <files>(no source changes — verification only)</files>
  <action>
    1. Run `npm run lint` — must EXIT 0. If ESLint flags any issue in `src/lib/period.ts` or `src/storage/local.ts` (e.g. unused imports, type warnings on `StorageEstimate`), fix in-place. `StorageEstimate` is a TS DOM lib type — should not need an import.

    2. Run `npm run build` — must EXIT 0 (includes `scripts/scan-aiza.mjs` from Phase 10).

    3. Run the FULL test suite: `npx vitest run`. Confirm:
       - SPA tests: 999 + ~33 new (4 nowIso + 22 local-hardening + 3 structural-lint + 2 legacy-migration end-to-end = 31, plus the existing 999) → ~1030-1032 GREEN; 11 todo; 0 RED
       - Server tests: 18 GREEN (unchanged — Phase 11 does not touch `server/`)
       - No flakes; no skipped tests beyond the existing 11 todos
       - NEW: `src/lib/__tests__/structural-lint-period.test.ts` 3 cases GREEN

    4. If any v1.0/v1.1 test regresses, diagnose. The most likely regression vector: `saveEntities`/`saveAccounts`/etc tests that count IDB puts — they may now see 2 puts (the data put + the meta lastWriteAt bump). If such a test exists, update its assertion to reflect the new behaviour with a comment: `// Phase 11 IDB-05 — saveX now bumps lastWriteAt as a follow-up put`. Document any such update in the SUMMARY.md.

    5. Verify NO `new Date()` was introduced in `src/storage/local.ts` AND the structural-lint test is GREEN system-wide:
       ```
       npx grep -n "new Date" src/storage/local.ts
       npx vitest run src/lib/__tests__/structural-lint-period.test.ts
       ```
       (First should return zero matches — the only timestamp source is `nowIso()` from `period.ts`. Second must pass.)

    6. Verify legacy-migration end-to-end test (Test 22 from Task 2) passes — proves the Blocker 1 fix is wired:
       ```
       npx vitest run src/storage/__tests__/local-hardening.test.ts -t "legacy"
       ```
  </action>
  <verify>
    <automated>npm run lint && npm run build && npx vitest run</automated>
  </verify>
  <done>Lint EXIT 0; build EXIT 0 (incl. AIza scan); ~1030-1032 SPA GREEN + 11 todo + 18 server GREEN; zero `new Date()` matches in `src/storage/local.ts`; structural-lint test 3/3 GREEN; legacy-migration end-to-end test GREEN.</done>
</task>

</tasks>

<verification>
**Plan-level verification (after all 4 tasks complete):**

1. `src/lib/period.ts` exports `nowIso` — verify with `npx grep -n "export function nowIso" src/lib/period.ts`
2. `src/storage/local.ts` exposes 4 new methods — verify with `npx grep -nE "async (getPersistGranted|getStorageEstimate|getLastWriteAt|setLastWriteAt)" src/storage/local.ts` (4 matches)
3. `bumpWriteAt` is called from 6 sites — verify with `npx grep -nc "this.bumpWriteAt" src/storage/local.ts` (6: saveEntities, saveAccounts, saveEntries, saveAuditLogs, appendAuditLog, importAll-default-path)
4. `setLastExportAt` does NOT call `bumpWriteAt` — verify by inspection of the function body (lines around 155).
5. `META_LAST_WRITE = 'lastWriteAt'` constant exists at module top — verify with `npx grep -n "META_LAST_WRITE" src/storage/local.ts`
6. StorageAdapter interface untouched — verify `git diff src/storage/adapter.ts` shows zero lines changed.
7. `importAll` signature widened — verify with `npx grep -n "importAll(state: PersistedRoot, opts" src/storage/local.ts` (1 match)
8. Legacy-migration uses `{ silent: true }` — verify with `npx grep -nF "importAll(migrated, { silent: true })" src/storage/legacy-migration.ts` (1 match) AND `npx grep -cF "importAll(migrated);" src/storage/legacy-migration.ts` (0 matches — the bare call is gone)
9. Structural-lint test exists and is GREEN — verify with `npx vitest run src/lib/__tests__/structural-lint-period.test.ts` (3 tests GREEN)
10. Plan 11-2 can begin: it depends on these 4 duck-typed accessors being callable. A quick TypeScript probe from a future test file:
    ```typescript
    const adapter = await getAdapter();
    const maybe = adapter as unknown as {
      getPersistGranted?: () => Promise<boolean | null>;
      getStorageEstimate?: () => Promise<StorageEstimate | null>;
      getLastWriteAt?: () => Promise<string | null>;
      setLastWriteAt?: (iso: string) => Promise<void>;
    };
    ```
    should compile without error.
</verification>

<success_criteria>
- [ ] `src/lib/period.ts` exports `nowIso(): string` routed through existing `_nowProvider` test seam
- [ ] `src/storage/local.ts` adds 4 duck-typed accessors: `getPersistGranted`, `getStorageEstimate`, `getLastWriteAt`, `setLastWriteAt`
- [ ] `LocalAdapter.init()` calls `tryPersist()` exactly once, caches outcome, NEVER re-invokes
- [ ] `bumpWriteAt()` private helper wraps all 6 data-changing call sites (4 saveX + appendAuditLog + importAll-default-path); `importAll(state, { silent: true })` SKIPS the bump (Blocker 1 fix)
- [ ] `importAll` signature widened to `(state, opts?: { silent?: boolean })` with JSDoc explaining the migration-only opt-out
- [ ] `src/storage/legacy-migration.ts` line 68 updated to `await adapter.importAll(migrated, { silent: true })` so existing-user first launch under Phase 11 does NOT fire backup-nag (Blocker 1 fix)
- [ ] `setLastExportAt` does NOT bump `lastWriteAt` (verified by Test 17)
- [ ] `META_LAST_WRITE = 'lastWriteAt'` constant alongside `META_LAST_EXPORT`
- [ ] `src/lib/migrations/runner.ts` audited — confirmed operates on raw PersistedRoot pre-write (no adapter.saveX or adapter.importAll calls); no changes required
- [ ] Zero `new Date()` calls introduced in `src/storage/local.ts` — all timestamps go through `nowIso()` from `period.ts`
- [ ] StorageAdapter interface (`src/storage/adapter.ts`) UNCHANGED — Phase 3 FINAL invariant preserved
- [ ] New test suite `src/storage/__tests__/local-hardening.test.ts` adds 22 GREEN tests (19 original + 2 silent-option + 1 legacy-migration end-to-end)
- [ ] New test `src/lib/__tests__/structural-lint-period.test.ts` (W1 fix) adds 3 GREEN tests that lock the no-bare-new-Date invariant for all future commits
- [ ] Extended `src/lib/__tests__/period.test.ts` adds 4 GREEN tests for `nowIso()`
- [ ] Existing 999 SPA + 18 server tests still GREEN (no regression)
- [ ] `npm run lint` EXIT 0; `npm run build` EXIT 0 (incl. AIza scan)
- [ ] SPDX header on all new source/test files
- [ ] Closes helper-only half of IDB-01 (persist + getPersistGranted), IDB-02 (getStorageEstimate), IDB-05 (lastWriteAt machinery) — rendering and event-listener wiring is Plan 11-2's scope

**Out of scope (deferred to Plan 11-2):**
- DataPage rendering of quota / persist-status / iOS ITP banner
- `useBackupNag` hook
- `useBeforeUnloadGuard` / conditional `beforeunload` + `visibilitychange` listener
- `<IosItpBanner />` component
- App-level wiring of the above
- Snooze-key localStorage handling (`aussieledger:backup-nag-snoozed-until`)
- Per-session ITP banner dismiss (`sessionStorage` key)
- DataPage's `handleImport` adding the `setLastWriteAt(nowIso())` post-import bump (Plan 11-2 owns this call site since `handleImport` lives in DataPage)
- DataPage's `handleExport` clearing the backup-nag snooze key

(All deferred items reference `.planning/phases/11-indexeddb-hardening/11-CONTEXT.md` `<decisions>` and `<deferred>` blocks.)
</success_criteria>

<output>
After completion, create `.planning/phases/11-indexeddb-hardening/11-1-SUMMARY.md` covering:
- Tasks completed (3 tasks)
- Files created/modified (4 files: period.ts extended, local.ts extended, period.test.ts extended, local-hardening.test.ts new)
- Test counts (baseline 999 → ~1029 SPA GREEN; 18 server unchanged)
- Any baseline regressions found + their fix (especially around saveX put-count assertions)
- Any deviations from the plan (with justification)
- Handoff notes for Plan 11-2: which accessors are now duck-type-callable, exact import path for `nowIso`, the test-injection pattern for `_setNowProvider` if 11-2's hook tests need deterministic timestamps
</output>
