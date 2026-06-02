---
phase: 14-release-polish
plan: 1
status: complete
subsystem: routing,storage,demo-isolation,local-adapter,pitfalls-section-4-hard-block
tags: [get-route-kind, route-helper, local-adapter-widening, db-name-prod, db-name-demo, demo-seed, seed-demo-data, init-adapter-pathname-dispatch, demo-isolation-guard, pitfalls-section-4-hard-block, get-db-name-duck-typed, pol-02]
dependency_graph:
  requires:
    - "Phase 3 LocalAdapter (constructor + 12 StorageAdapter methods) at src/storage/local.ts"
    - "Phase 3 initAdapter() probe + memoisation + _resetAdapter in src/storage/index.ts"
    - "Phase 11 nowIso() invariant in src/lib/period.ts (consumed for understanding the no-bare-new-Date constraint)"
    - "Phase 11 structural-lint-period.test.ts enforcer (defines what demo-seed.ts must satisfy)"
    - "fake-indexeddb (already in devDependencies; setup.ts provisions fresh IDBFactory per test)"
    - "src/test/setup.ts default storageMode='local' override (initAdapter-demo-routing tests rely on this branch path)"
  provides:
    - "getRouteKind(pathname?) — single source of truth for pathname-based route classification (src/lib/route.ts)"
    - "RouteKind type ('demo' | 'privacy' | 'default') exported alongside the function"
    - "Widened LocalAdapter constructor: constructor(dbName: string = DB_NAME_PROD)"
    - "DB_NAME_PROD = 'aussieledger' + DB_NAME_DEMO = 'aussieledger-demo' exported constants"
    - "LocalAdapter#getDbName() duck-typed accessor (test seam, not on StorageAdapter interface)"
    - "seedDemoData(adapter) — idempotent FY2025-26 sole-trader fixture loader (src/storage/demo-seed.ts)"
    - "initAdapter() pathname-based DB dispatch on BOTH LocalAdapter branches (forced='local' + probe-exhausted fallback); ServerAdapter branches byte-identical pre-Phase-14"
    - "PITFALLS §4 HARD-BLOCK locked: demo data leak prevention enforced by executable tests"
    - "16 new tests GREEN: 7 route + 3 local-db-name + 3 demo-seed + 3 demo-isolation + 3 init-routing (+5 SPDX-headers parametric rows for new source files)"
  affects:
    - src/lib/route.ts
    - src/lib/__tests__/route.test.ts
    - src/storage/local.ts
    - src/storage/__tests__/local-db-name.test.ts
    - src/storage/demo-seed.ts
    - src/storage/__tests__/demo-seed.test.ts
    - src/storage/__tests__/demo-isolation.test.ts
    - src/storage/__tests__/initAdapter-demo-routing.test.ts
    - src/storage/index.ts
tech_stack:
  added: []
  patterns:
    - "Pure pathname-dispatch helper (getRouteKind) — module-level function with optional pathname arg; default reads window.location.pathname; pure function under test stub (vi.stubGlobal('location', { ...window.location, pathname: '/demo' })). Single source of truth consumed by both src/storage/index.ts initAdapter() (Plan 14-1 Task 4) AND src/App.tsx (Plan 14-2 Task 6) — avoids two-callsite pathname-parsing drift."
    - "Constructor widening with backwards-compatible default param — constructor(dbName: string = DB_NAME_PROD). All four existing zero-arg call sites in src/storage/index.ts (forced='local', forced='server' fallthrough's local fallback path, probe-success fallthrough's local fallback path, probe-exhausted fallback) continue to type-check + work byte-identically. The default-param syntax is the documented JS pattern for additive constructor signature changes."
    - "PITFALLS §4 HARD-BLOCK via IDB namespace isolation — IDB databases are scoped by the (origin, dbName) tuple per W3C IndexedDB spec. Two LocalAdapter instances with different dbName strings open distinct stores. fake-indexeddb implements the same scoping in-memory so demo-isolation.test.ts's three cross-contamination assertions hold under the test environment AND in production."
    - "Idempotent seed-on-first-init — seedDemoData(adapter) checks `(await adapter.getEntities()).length > 0` and returns early. Subsequent /demo visits within the same browser see the user's mid-exploration state preserved (CONTEXT decision: 'Subsequent /demo visits within the same browser see the seeded data; user can edit/delete within demo without affecting production. Re-seed never overwrites — if demo DB already has data, leave it alone')."
    - "Literal ISO date strings for static seed data — no new Date() / nowIso() / period.ts import in demo-seed.ts. Structural-lint-period.test.ts regex `\\bnew\\s+Date\\s*\\(\\s*\\)` does not match literal strings like '2025-07-15'. The seed is static fixture data, not dynamic timestamps, so the period.ts route would be unnecessary indirection."
    - "Duck-typed test seam (Phase 11 pattern continuation) — LocalAdapter#getDbName(): string getter is NOT on the StorageAdapter interface. Consistent with Phase 11's getPersistGranted/getStorageEstimate/getLastWriteAt/setLastWriteAt pattern. JSDoc'd as 'test-only introspection — do not rely on this in production code'. Used by initAdapter-demo-routing.test.ts to assert which DB the constructed adapter opened against, avoiding reliance on fake-indexeddb's databases() API (which is not 100% reliable across versions)."
key_files:
  created:
    - src/lib/route.ts
    - src/lib/__tests__/route.test.ts
    - src/storage/__tests__/local-db-name.test.ts
    - src/storage/demo-seed.ts
    - src/storage/__tests__/demo-seed.test.ts
    - src/storage/__tests__/demo-isolation.test.ts
    - src/storage/__tests__/initAdapter-demo-routing.test.ts
  modified:
    - src/storage/local.ts
    - src/storage/index.ts
decisions:
  - "getRouteKind() extracted to src/lib/route.ts (not inlined in App.tsx + storage/index.ts) — chosen per CONTEXT discretion item 7 because there are exactly 2 call sites (Plan 14-1 Task 4 here + Plan 14-2 Task 6 in App.tsx). One central pure module avoids drift; tests stub the global via vi.stubGlobal once."
  - "startsWith('/demo') / startsWith('/privacy') (not strict equality) — prefix match is intentional per plan + CONTEXT so future /demo/sub-path deep-links still pick the demo adapter without code changes. Tradeoff: would also match `/demonstration` (false positive) but no such path exists in the app. Trailing-slash normalisation applied first so /demo/ → /demo."
  - "Constructor signature widened with default param: constructor(dbName: string = DB_NAME_PROD). Plan's 'StorageAdapter FINAL' invariant preserved — only the implementation class signature changed; the StorageAdapter interface at src/storage/adapter.ts is byte-identical to pre-Phase-14 (12 methods unchanged). Verified via grep on src/storage/adapter.ts post-Task-4."
  - "Web Lock name 'aussieledger-legacy-migration' stays HARD-CODED (not parameterised on dbName). The lock is origin-scoped and serialises a one-time idempotent legacy-localStorage migration check. Sharing the lock across prod + demo first-init is harmless because the migration body itself is idempotent."
  - "DB_NAME_PROD + DB_NAME_DEMO exported as named module constants rather than embedded inline — gives Plan 14-2's DemoModeBanner + WelcomeBanner reachable identifiers if they ever need to assert on the active DB shape, and gives demo-isolation.test.ts a single import for both names."
  - "LocalAdapter#getDbName() added in Task 2 (not Task 4) — Plan Task 4 step 6 said 'do NOT re-modify in Task 4 if Task 2 has already added it', so I included it in the Task 2 commit. The accessor is documented as test-only introspection in JSDoc."
  - "Demo entity name: 'Demo Sole Trader (Sample Data)' — sole-trader-correct (no 'Pty Ltd' misuse on a SoleTrader entity), obviously demo via the parenthetical signal. Within CONTEXT discretion: 'planner picks a realistic name like \"Demo Pty Ltd Trading\" or \"Sample Sole Trader\" — keep it obviously demo-ish'."
  - "Demo seed: 10 accounts (covers all 5 AccountType values) + 15 balanced FY2025-26 journals (Jul 2025 – Jun 2026). Narrative: opening capital → equipment purchase → monthly cash sales with GST collected → rent + utilities + office supplies expenses → quarterly BAS payment → owner drawings. Populates a meaningful TB + Tax Return + BAS for the tax-engine demos without overwhelming visitors."
  - "JournalLine.debit/credit/taxAmount typed as `number` per src/types.ts:106 — used numeric literal values (not Decimal-string strings) to satisfy the type signature. Plan text mentioned 'Decimal-string pattern' but the actual TypeScript type is `number`; followed the type."
  - "Audit logs intentionally NOT seeded — demo doesn't need a fake history. Subsequent user actions in demo (creating journals, editing entities) WILL be audit-logged via the existing useAuditLog wiring, which is correct: the audit trail shows the user's exploration journey, not a fabricated past."
  - "Both LocalAdapter branches in initAdapter() got the pathname dispatch — the forced='local' branch AND the probe-exhausted fallback branch. The ServerAdapter branches (forced='server' + probe-success) are byte-identical pre-Phase-14: demo mode is local-only by design; the demo route is a hosted-mode affordance that should not affect any server-backed deployment."
  - "/privacy maps to DB_NAME_PROD (not isolated) — privacy is a view-only route. Users visiting /privacy are still in their production data context, just viewing the privacy page; storage stays prod."
  - "seedDemoData runs INSIDE initAdapter (not lazily at first user action) — CONTEXT spec: 'Subsequent /demo visits within the same browser see the seeded data'. Means the very first /demo render shows non-empty data immediately. The idempotent guard inside seedDemoData makes this safe to call on every initAdapter() invocation: user edits within demo persist across reloads of /demo because getEntities().length > 0 after the first seed."
metrics:
  duration: "~75min (2026-06-01T22:16Z → 2026-06-02T03:38Z; 4 tasks back-to-back; each ~10-15min implementation, push-and-CI-wait was the long-tail)"
  completed: "2026-06-02"
  tasks_completed: 4
  files_changed: 9
  tests_added: 16
  tests_total: 1149
---

# Phase 14 Plan 1: Routing helper + LocalAdapter widening + demo seed + PITFALLS §4 HARD-BLOCK guard Summary

**One-liner:** Routing-and-isolation foundation for Phase 14 — pure `getRouteKind()` pathname-dispatch helper (consumed by both `initAdapter()` here and `App.tsx` in Plan 14-2), `LocalAdapter` constructor widened to accept optional `dbName: string = DB_NAME_PROD`, hard-coded FY2025-26 sole-trader demo seed loaded once on demo-adapter init, and a `demo-isolation` test trio that locks PITFALLS §4 HARD-BLOCK: demo writes can never contaminate the production `'aussieledger'` IDB database. After this plan lands, navigating to `/demo` automatically opens the isolated `'aussieledger-demo'` IDB and seeds it on first visit; production stays byte-identical. Plan 14-2 can now mount UI components knowing the storage substrate is safe.

## What Was Built

### Task 1 — getRouteKind() helper + 7 branch tests (commit `50b51ac`)

**`src/lib/route.ts`** (NEW, 53 lines, SPDX header) — Pure pathname classifier:
- `export type RouteKind = 'demo' | 'privacy' | 'default'`
- `export function getRouteKind(pathname?: string): RouteKind` — reads `window.location.pathname` when arg omitted (typeof-window guard returns 'default' under SSR/non-browser envs); normalises trailing slash for paths longer than `/`; matches via `startsWith('/demo')` and `startsWith('/privacy')` (prefix match per CONTEXT: future `/demo/sub-path` deep-links still classify as 'demo').
- JSDoc explicitly documents: single source of truth consumed by storage init (Task 4) AND App.tsx view dispatch (Plan 14-2).

**`src/lib/__tests__/route.test.ts`** (NEW, 65 lines, SPDX header) — 7 tests:
1. `getRouteKind('/')` → `'default'`
2. `getRouteKind('/demo')` → `'demo'`
3. `getRouteKind('/demo/')` → `'demo'` (trailing-slash tolerance)
4. `getRouteKind('/privacy')` → `'privacy'`
5. `getRouteKind('/something-else')` → `'default'`
6. `getRouteKind()` with `vi.stubGlobal('location', { ...window.location, pathname: '/demo' })` → `'demo'`
7. `getRouteKind()` under default jsdom (pathname='/') → `'default'`

Tests use `vi.unstubAllGlobals()` in a try/finally to restore the stub. 7/7 GREEN.

### Task 2 — LocalAdapter constructor widening + DB_NAME constants + getDbName() (commit `6745423`)

**`src/storage/local.ts`** (MODIFIED) — Three discrete changes:
1. Rename `const DB_NAME = 'aussieledger'` → `export const DB_NAME_PROD = 'aussieledger'` + add `export const DB_NAME_DEMO = 'aussieledger-demo'`. Two named exports for downstream visibility + test imports.
2. Constructor widened: `constructor(dbName: string = DB_NAME_PROD)` with `private readonly dbName: string` field. Existing zero-arg call sites in `src/storage/index.ts` (4 sites) and `src/storage/__tests__/local.test.ts` (~12 sites) continue to type-check and work byte-identically.
3. `init()` `openDB<AussieLedgerDB>(this.dbName, DB_VERSION, ...)` — uses the instance field instead of the module const.
4. New `getDbName(): string` getter (test-only introspection, NOT on the StorageAdapter interface — duck-typed per Phase 11 pattern). Required by Plan 14-1 Task 4's initAdapter-demo-routing tests; added here in Task 2 per Plan Task 4 step 6's defensive 'do NOT re-modify in Task 4 if Task 2 has already added it' guidance.
5. JSDoc header updated to document the Phase 14 widening + PITFALLS §4 HARD-BLOCK rationale + the deliberately-shared legacy-migration Web Lock name.

**`src/storage/__tests__/local-db-name.test.ts`** (NEW, 67 lines, SPDX header) — 3 tests:
1. `DB_NAME_PROD === 'aussieledger'` AND `DB_NAME_DEMO === 'aussieledger-demo'`
2. `new LocalAdapter()` (no args) and `new LocalAdapter(DB_NAME_PROD)` (explicit) share the same DB (write via one, read via the other — sentinel survives)
3. `new LocalAdapter(DB_NAME_DEMO)` opens an isolated DB — writes here are invisible to a fresh default-constructed adapter; sanity check confirms the demo DB still has the sentinel

setup.ts provisions a fresh IDBFactory per test so each test starts clean. 3/3 GREEN.

### Task 3 — seedDemoData() + 3 shape + idempotence tests (commit `871154e`)

**`src/storage/demo-seed.ts`** (NEW, 240 lines, SPDX header) — Hard-coded FY2025-26 fixtures:
- `DEMO_ENTITY_ID = 'demo-entity-sole-trader-001'`
- `DEMO_ENTITY: Entity` — `name: 'Demo Sole Trader (Sample Data)'`, `type: 'SoleTrader'`, `status: 'Active'`, `gstRegistered: true`, `accountingMethod: 'cash'`, `fyEndDate: '06-30'`, `_v: CURRENT_VERSION` (= 6). ABN placeholder `'00 000 000 000'`.
- `DEMO_ACCOUNTS: Account[]` — 10 accounts covering all 5 AccountType values: 1000 Cash at Bank, 1100 Equipment, 2000 GST Payable, 2100 Loans Payable, 3000 Owner's Capital, 3100 Owner's Drawings, 4000 Sales Revenue, 5000 Rent Expense, 5100 Utilities Expense, 5200 Office Supplies. gstCode mix per type: 'N-T' on capital/equity moves; 'GST' on taxable supplies; 'CAP' on equipment.
- `DEMO_JOURNALS: JournalEntry[]` — 15 balanced entries dated 15 Jul 2025 through 30 Jun 2026:
  - 15-Jul-2025: opening capital ($10,000 DR Cash, CR Capital)
  - 20-Aug-2025: equipment purchase ($3,000 DR Equipment, CR Cash)
  - 10-Sep-2025: first cash sale ($1,100 = $1,000 + $100 GST DR Cash, CR Sales + CR GST Payable)
  - 01-Oct-2025: monthly rent ($800 DR Rent, CR Cash)
  - 15-Nov-2025: utilities ($150 DR Utilities, CR Cash)
  - 12-Dec-2025: larger cash sale ($2,200 = $2,000 + $200 GST)
  - 08-Jan-2026: office supplies ($300 DR Supplies, CR Cash)
  - 22-Feb-2026: cash sale ($1,650 = $1,500 + $150 GST)
  - 05-Mar-2026: BAS payment ($450 DR GST Payable, CR Cash)
  - 12-Apr-2026: owner drawings ($500 DR Drawings, CR Cash)
  - 18-May-2026: utilities ($180 DR Utilities, CR Cash)
  - 10-Jun-2026: closing cash sale ($2,750 = $2,500 + $250 GST)
  - 20-Jun-2026: closing rent ($800 DR Rent, CR Cash)
  - 25-Jun-2026: closing utilities ($175 DR Utilities, CR Cash)
  - 30-Jun-2026: owner drawings closing ($400 DR Drawings, CR Cash)
- All `date` fields are LITERAL ISO strings — `\bnew\s+Date\s*\(\s*\)` regex doesn't match → structural-lint-period.test.ts stays GREEN. No `nowIso()` import (seed data is static, not dynamic).
- `seedDemoData(adapter: LocalAdapter): Promise<void>` body: `const existing = await adapter.getEntities(); if (existing.length > 0) return; await adapter.saveEntities([DEMO_ENTITY]); await adapter.saveAccounts(DEMO_ACCOUNTS); await adapter.saveEntries({ [DEMO_ENTITY_ID]: DEMO_JOURNALS });`. Idempotent guard makes the call safe in every initAdapter() invocation. Audit logs NOT seeded — demo doesn't need a fake history.

**`src/storage/__tests__/demo-seed.test.ts`** (NEW, 84 lines, SPDX header) — 3 tests:
1. Shape — 1 entity (name matches /demo/i, type SoleTrader), accounts cover all 5 AccountType values, 15 journals all dated within FY2025-26 boundaries `'2025-07-01' <= date <= '2026-06-30'`
2. Balanced — every entry has `|sum DR − sum CR| < 0.005` (matches existing JournalsView decimal tolerance)
3. Idempotent — second call leaves entity count, account count, and journal count unchanged (no duplicates added)

3/3 GREEN. structural-lint-period.test.ts still 3/3 GREEN.

### Task 4 — initAdapter pathname dispatch + demo-isolation HARD-BLOCK guard + routing tests (commit `8565267`)

**`src/storage/index.ts`** (MODIFIED) — Pathname dispatch wired into both LocalAdapter branches:
- 3 new imports: `getRouteKind` from `../lib/route`, `DB_NAME_DEMO + DB_NAME_PROD` from `./local`, `seedDemoData` from `./demo-seed`.
- Forced='local' branch: `const routeKind = getRouteKind(); const dbName = routeKind === 'demo' ? DB_NAME_DEMO : DB_NAME_PROD; const a = new LocalAdapter(dbName); await a.ready(); if (routeKind === 'demo') await seedDemoData(a); return a;`
- Probe-exhausted fallback branch: identical pattern.
- ServerAdapter branches (forced='server' AND probe-success): BYTE-IDENTICAL pre-Phase-14. Demo mode is local-only by design.
- JSDoc header updated to document the Phase 14 dispatch on LocalAdapter branches.

**`src/storage/__tests__/demo-isolation.test.ts`** (NEW, 87 lines, SPDX header) — PITFALLS §4 HARD-BLOCK guard, 3 tests:
1. **prod-then-demo**: Write a sentinel entity to prod, then construct demo adapter and call seedDemoData. Re-open prod — must still have ONLY the sentinel (no demo entity leaked).
2. **demo-then-prod**: Seed demo data, then open a fresh prod adapter — entities must be `[]` (no contamination from demo writes).
3. **same-session both-adapters**: Both adapters constructed in the same session. Write a new entity ONLY to demo. Read from prod — must NOT contain the new demo entity (and prod must be `[]`). Sanity: demo really did get the write.

Relies on `(origin, dbName)` IDB scoping. fake-indexeddb implements the same in-memory scoping; setup.ts provisions a fresh IDBFactory per test so cross-test residue is impossible. 3/3 GREEN.

**`src/storage/__tests__/initAdapter-demo-routing.test.ts`** (NEW, 80 lines, SPDX header) — Pathname-dispatched DB selection, 3 tests:
4. **pathname='/'**: `initAdapter()` returns a LocalAdapter with `getDbName() === DB_NAME_PROD`; entities empty (production starts blank).
5. **pathname='/demo'**: `getDbName() === DB_NAME_DEMO`; entities has length 1 IMMEDIATELY after `await initAdapter()` (proves seedDemoData ran inside initAdapter, not lazily); type 'SoleTrader', name matches /demo/i.
6. **pathname='/privacy'**: `getDbName() === DB_NAME_PROD` (privacy is view-only; storage stays prod); entities empty (privacy must NOT seed demo data).

Test pattern: `beforeEach` calls `_resetAdapter()` + `localStorage.clear()` + `localStorage.setItem('storageMode', 'local')` to force the LocalAdapter branch and bypass the probe; `afterEach` calls `vi.unstubAllGlobals()` + `_resetAdapter()` + `localStorage.clear()`. The location stub is `vi.stubGlobal('location', { ...window.location, pathname: ... })`. 3/3 GREEN.

## Plan-Level Verification (post-Task 4)

```
npx vitest run                              # 1149 SPA GREEN (+21 from baseline 1128)
                                            # delta: 7 route + 3 local-db-name + 3 demo-seed
                                            # + 3 demo-isolation + 3 init-routing + 2 SPDX rows
npm run lint                                # EXIT 0
npm run build                               # EXIT 0 incl. AIza scan ("scan-aiza: OK")
npx vitest run src/lib/__tests__/structural-lint-period.test.ts  # 3/3 GREEN (no new Date drift)
```

Plus the targeted invariant greps from the plan's verification section:

- `grep -E "^\s*(get|save|append|export|import|ready)" src/storage/adapter.ts` — output matches pre-Phase-14 method list exactly (12 methods); StorageAdapter interface byte-identical.
- `grep -n "DB_NAME_DEMO" src/storage/local.ts src/storage/index.ts src/storage/demo-seed.ts` — defined in local.ts:65 + consumed in index.ts:27 + index.ts:78 + index.ts:106 (both LocalAdapter branches) + referenced in JSDoc of both source files.
- `grep -i "demo" src/storage/demo-seed.ts | head -5` — demo entity name visible ("Demo Sole Trader (Sample Data)"); obviously demo-ish per CONTEXT.

## CI Run Summary

| Task | Commit | CI Run | Conclusion |
|------|--------|--------|------------|
| 1 — getRouteKind() helper | `50b51ac` | 26785538253 | GREEN (success) |
| 2 — LocalAdapter widening | `6745423` | 26796331801 | GREEN (success) |
| 3 — seedDemoData() | `871154e` | 26796467241 | GREEN (success) |
| 4 — initAdapter dispatch + isolation guard | `8565267` | 26796605724 | GREEN (success) |

All 4 commits pushed to `origin/main`. Each ran the full CI suite (lint + SPA vitest + server vitest + build + AIza scan); all 4 conclusions success.

## Deviations from Plan

**None — Rules 1/2/3 not triggered.** Plan 14-1 executed exactly as written:

- Plan said constructor signature widening, default-param backwards-compat, dbName field, init() reads this.dbName — executed verbatim
- Plan said exported constants DB_NAME_PROD + DB_NAME_DEMO — executed verbatim
- Plan said seedDemoData idempotent guard via `getEntities().length > 0` early-return — executed verbatim
- Plan said literal ISO strings (no nowIso import) — executed verbatim
- Plan said both LocalAdapter branches (forced='local' AND probe-exhausted fallback) get the dispatch; ServerAdapter branches byte-identical — executed verbatim
- Plan said `getDbName()` added in Task 2 not re-added in Task 4 — followed the defensive guidance
- Plan said /privacy → DB_NAME_PROD — executed verbatim

One micro-clarification (not a deviation): plan text for JournalLine debit/credit mentioned "string-numeric values (matches existing Decimal-string pattern in v1.0+)" but the actual `JournalLine` TypeScript interface in `src/types.ts:106` types them as `number`. Followed the type signature (numeric literals); tests assert via `Number(l.debit ?? 0)` which handles both numeric and string-numeric values defensively.

## Notes for Plan 14-2 Executor

- **`getRouteKind()` ready to import** from `src/lib/route.ts`. App.tsx mount-time should call it inside a `useState<View>(() => ...)` lazy initialiser to pick the initial view; the result is stable for the lifetime of the page (full reload required to change route, matching the `window.location.href = '/'` Exit-demo pattern).
- **`DemoModeBanner` mount conditioning** — `getRouteKind() === 'demo'` is the single check. Don't read pathname directly; defer to the helper.
- **`PrivacyPage` view dispatch** — App.tsx's view state should map `getRouteKind() === 'privacy'` → `setView('privacy')` on mount. The View type already includes routing identifiers; check whether 'privacy' needs to be added to `src/types.ts` View union (it's not there in the current state — Plan 14-2 will need to add it).
- **Demo isolation already locked** — UI tasks don't need to re-verify the storage substrate. The 3 demo-isolation tests are the executable proof; Plan 14-2 can trust that any /demo writes stay in 'aussieledger-demo' and never touch 'aussieledger'.
- **WelcomeBanner empty-state trigger** — Phase 14's POL-01 banner appears when `(await adapter.getEntities()).length === 0` AND `getRouteKind() !== 'demo'` (don't show the WelcomeBanner on the demo route — demo always has its seeded sole trader, so the empty-state never fires on /demo, but adding the route guard is defensive against future changes).

## Self-Check: PASSED

All claimed artifacts verified to exist on disk + in git:

- `src/lib/route.ts` — FOUND
- `src/lib/__tests__/route.test.ts` — FOUND
- `src/storage/local.ts` — FOUND (modified — contains `export const DB_NAME_PROD`, `export const DB_NAME_DEMO`, `constructor(dbName: string = DB_NAME_PROD)`, `getDbName()`)
- `src/storage/__tests__/local-db-name.test.ts` — FOUND
- `src/storage/demo-seed.ts` — FOUND (contains `export async function seedDemoData`, literal ISO date strings, 15 DEMO_JOURNALS, 10 DEMO_ACCOUNTS)
- `src/storage/__tests__/demo-seed.test.ts` — FOUND
- `src/storage/__tests__/demo-isolation.test.ts` — FOUND
- `src/storage/__tests__/initAdapter-demo-routing.test.ts` — FOUND
- `src/storage/index.ts` — FOUND (modified — contains `import { getRouteKind }`, `import { DB_NAME_DEMO, DB_NAME_PROD }`, `import { seedDemoData }`, two `routeKind === 'demo' ? DB_NAME_DEMO : DB_NAME_PROD` dispatches)

All commit hashes verified in `git log`:

- `50b51ac` — `feat(14-1): add getRouteKind() helper for pathname-based dispatch` — FOUND on origin/main
- `6745423` — `feat(14-1): widen LocalAdapter constructor with optional dbName param` — FOUND on origin/main
- `871154e` — `feat(14-1): add seedDemoData() helper with FY2025-26 sole-trader fixtures` — FOUND on origin/main
- `8565267` — `feat(14-1): wire pathname-based DB selection into initAdapter() with demo-isolation HARD-BLOCK guard` — FOUND on origin/main

All 4 CI runs verified GREEN (conclusion=success) via GitHub Actions REST API.

Plan 14-1 closed; ready for Wave 2.
