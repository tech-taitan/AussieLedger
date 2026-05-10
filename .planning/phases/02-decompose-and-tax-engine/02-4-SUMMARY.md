---
phase: 02-decompose-and-tax-engine
plan: 4
subsystem: app-shell-demolition + migration-register + structural-lints
tags: [app-tsx, shell-extraction, migration-v2, structural-lints, view-router]
dependency_graph:
  requires:
    - hooks-from-02-2
    - tax-engine-from-02-1
    - tax-component-migration-from-02-3
    - DisclaimerFooter-from-phase-1
    - MigrationError-from-phase-1
  provides:
    - thin-orchestrator-app
    - registered-v1-to-v2-migration
    - active-structural-lints
    - extracted-shell-architecture
  affects:
    - src/App.tsx
    - src/lib/migrations/index.ts
    - src/lib/migrations/__tests__/runner.test.ts
    - src/__tests__/structural.test.ts
    - src/__tests__/App.test.tsx
    - src/components/JournalForm.tsx
    - src/components/ImportTB.tsx
key_files:
  created:
    - src/components/shell/Sidebar.tsx
    - src/components/shell/Header.tsx
    - src/components/shell/BottomNav.tsx
    - src/components/shell/MainLayout.tsx
    - src/components/EntityCard.tsx
    - src/components/MasterDashboard.tsx
    - src/components/ViewRouter.tsx
  modified:
    - src/App.tsx (1116 → 151 non-blank lines)
    - src/lib/migrations/index.ts (CURRENT_VERSION 1 → 2; MIGRATIONS[1] = migrateV1ToV2)
    - src/lib/migrations/__tests__/runner.test.ts (assertion updated to toBe(2))
    - src/__tests__/structural.test.ts (.skip removed; lint refined to flag only "now" producers, not date parsing)
    - src/__tests__/App.test.tsx (em-dash assertion source-target moved to ViewRouter.tsx)
    - src/components/JournalForm.tsx (`new Date()` → `today()`)
    - src/components/ImportTB.tsx (`new Date()` → `today()`)
decisions:
  - "App.tsx final non-blank line count: 151 (target ≤ 250). Hooks + migration startup + MainLayout + ViewRouter + MigrationError gate. No inline JSX besides the layout/router prop threading."
  - "Structural lint refined to flag only parameterless `new Date()` and `Date.now()` (the 'now' producers), NOT `new Date(stringArg)` (date parsing). Date-string parsing in AuditTrail and FinancialTrendChart is legitimate and stays."
  - "Em-dash test target moved from App.tsx to ViewRouter.tsx since StatCards relocated there. Assertion: ViewRouter.tsx contains ≥ 3 occurrences of `trend=\"—\"`."
  - "Version-guard pattern: saveAll/setEntities only fire when `migrated._v > storedVersion`. The new `ledger_state_version` localStorage key persists the version so cold starts after the first don't re-fire saveAll/setEntities (which would flood the audit log)."
metrics:
  completed: "2026-05-10"
  tasks: 2 (the human-verify checkpoint is task 3, deferred to user)
  files_created: 7
  files_modified: 7
  commits: 2 (7d189ca for Task 1; aba4484 for Task 2 — committed by orchestrator after sandbox bash denials)
  app_tsx_before_lines: 1116
  app_tsx_after_lines: 151
  app_tsx_target: 250
  tests_green: 200
  tests_red: 0
  tests_red_by_design: 0
  tests_todo: 11 (Phase 5 placeholders)
---

# Phase 2 Plan 4: App.tsx Demolition + Migration Register + Structural Lints — Summary

**One-liner:** `src/App.tsx` reduced from 1,116 lines to 151 non-blank lines as a thin orchestrator composing 4 hooks, the migration runner, MainLayout, ViewRouter, and the MigrationError gate; migration `1 → 2` is registered and runs on app start with a version-guard so it never floods the audit log; the previously RED-by-design structural lints (App ≤ 250 lines + no raw `new Date()` outside `period.ts`) are now active and green.

## What Was Built

### Task 1: Component extractions (commit `7d189ca`)
- `src/components/shell/Sidebar.tsx` — verbatim from old App.tsx:437-525, plus the AnimatePresence overlay, plus the local NavButton helper
- `src/components/shell/Header.tsx` — verbatim from old App.tsx:529-576
- `src/components/shell/BottomNav.tsx` — verbatim from old App.tsx:1024-1062, plus MobileNavButton helper
- `src/components/shell/MainLayout.tsx` — composes the four shell components plus the children content slot plus DisclaimerFooter
- `src/components/EntityCard.tsx` — verbatim from old App.tsx:60-203 (130-line entity-card component with hover-expand, selection, profit/revenue/expense breakdown)
- `src/components/MasterDashboard.tsx` — verbatim from old App.tsx:601-700, consumes EntityCard
- `src/components/ViewRouter.tsx` — routes the 12 view values to their components; contains private `EntityDashboardView`, `JournalsView`, `TrialBalanceView` helper components carrying the bulk of the previously-inline view JSX, plus a private `StatCard` (with `trend="—"` em-dash em dashes)

### Task 2: App.tsx rewrite + migration register + lint enable (commit `aba4484`)
- `src/App.tsx` rewritten as a 151-non-blank-line orchestrator. Hook composition (`useAuditLog → useAccounts(addLog) → useEntities(addLog) → useJournals(addLog, activeEntityId)`); migration startup `useEffect` with version guard; `<MigrationError>` early return; `<MainLayout><ViewRouter /></MainLayout>` render.
- `src/lib/migrations/index.ts` — `import { migrateV1ToV2 } from './v1-to-v2'`; `CURRENT_VERSION = 2`; `MIGRATIONS[1] = migrateV1ToV2`.
- `src/lib/migrations/__tests__/runner.test.ts` — updated to `expect(CURRENT_VERSION).toBe(2)`.
- `src/__tests__/structural.test.ts` — `.skip` removed from both lints; the no-`new Date()` lint refined to detect only parameterless `new Date()` and `Date.now()` (date parsing remains legitimate).
- `src/components/JournalForm.tsx` — `new Date().toISOString().split('T')[0]` replaced with `today().toISOString().split('T')[0]`.
- `src/components/ImportTB.tsx` — same replacement for the import-row date generation.
- `src/__tests__/App.test.tsx` — em-dash trend assertion target file changed from `src/App.tsx` to `src/components/ViewRouter.tsx` (StatCards moved there).

### Version-guard pattern (paste verbatim from App.tsx:67-103)

```ts
const storedVersion = (() => {
  try {
    const stamp = localStorage.getItem('ledger_state_version');
    return stamp ? Number(JSON.parse(stamp)) : 0;
  } catch { return 0; }
})();
const migrated = migrate(syntheticRoot);
if (migrated._v > storedVersion) {
  if (migrated.accounts) {
    localStorage.setItem('ledger_chart_of_accounts', JSON.stringify(migrated.accounts));
    saveAll(migrated.accounts as Account[]);  // emits audit log — INTENDED on actual upgrade
  }
  if (migrated.entities) {
    localStorage.setItem('ledger_entities_list', JSON.stringify(migrated.entities));
    setEntities(migrated.entities as Entity[]);
  }
  localStorage.setItem('ledger_state_version', JSON.stringify(migrated._v));
}
localStorage.setItem('ledger_schema_version', String(CURRENT_VERSION));
```

## Test State (final, end of Phase 2)

- **200 GREEN, 0 RED, 0 RED-by-design, 11 TODO (Phase 5 placeholders)**
- All structural lints active and green:
  - `src/__tests__/structural.test.ts` "App.tsx ≤ 250 non-blank lines" → GREEN (151 lines)
  - `src/__tests__/structural.test.ts` "no parameterless `new Date()` outside `src/lib/period.ts`" → GREEN
  - `src/lib/tax/__tests__/structural-lint.test.ts` "no React imports in `src/lib/tax/**`" → GREEN
  - `src/lib/tax/__tests__/structural-lint.test.ts` "no float arithmetic in `src/lib/tax/**`" → GREEN
- All hook tests (from Plan 02-2): GREEN
- All tax-engine shape tests (from Plan 02-1, expanded by 02-3): GREEN
- All Phase 1 carry-overs: GREEN
- `npm run lint` (tsc --noEmit): PASS
- `npm run build`: PASS (1,128 kB bundle — pre-existing chunk-size warning, not Phase 2's concern)

## Phase 2 Cross-Plan File Inventory

| File | Origin Plan | Notes |
|---|---|---|
| `src/types.ts` | 02-1 | gstCode union widened; `partnershipTaxLabel?` + `_needsReview?` added |
| `src/constants.ts` | 02-1 | All 16 default accounts fully pre-mapped per entity type |
| `src/lib/period.ts` | 02-1 | `today()`, `currentFy()`, `fyBoundaries()`, `quarterOf()`, `quarterBoundaries()`, `isInPeriod()` |
| `src/lib/ai.ts` | 02-1 | `IS_AI_ENABLED` constant |
| `src/lib/import/match.ts` | 02-1 | `fuzzyMatch()` Levenshtein + exact-code algorithm; 0.85 threshold |
| `src/lib/migrations/v1-to-v2.ts` | 02-1 | Name-inference table; sets `_needsReview` for unmappable accounts |
| `src/lib/migrations/index.ts` | 02-4 | `CURRENT_VERSION = 2`; `MIGRATIONS[1] = migrateV1ToV2` |
| `src/lib/tax/types.ts` | 02-1 | `TaxInput`, `LabelResult`, `IndividualReturn`, etc. |
| `src/lib/tax/labels/fy2026.ts` | 02-1 | All 4 entity-type label sets + rates + thresholds |
| `src/lib/tax/individual.ts` | 02-1 | `computeIndividual()` with relocated math |
| `src/lib/tax/company.ts` | 02-1 | `computeCompany()` with relocated math |
| `src/lib/tax/trust.ts` | 02-1 | `computeTrust()` with relocated math |
| `src/lib/tax/partnership.ts` | 02-1 | `computePartnership()` (zeros — no existing component to relocate from) |
| `src/lib/tax/bas.ts` | 02-1 | `computeBas()` with relocated math |
| `src/hooks/useAuditLog.ts` | 02-2 | Returns `{ auditLogs, addLog }`; uses `today()` for timestamps |
| `src/hooks/useAccounts.ts` | 02-2 | Returns `{ accounts, updateAccount, saveAll }` |
| `src/hooks/useJournals.ts` | 02-2 | Returns hook with filter state + entry mutators |
| `src/hooks/useEntities.ts` | 02-2 | Returns hook with selection + mutators |
| `src/components/TaxReturnAssistant.tsx` | 02-3 | Migrated to consume `computeIndividual()` |
| `src/components/CompanyTaxReturn.tsx` | 02-3 | Migrated to consume `computeCompany()` |
| `src/components/TrustTaxReturn.tsx` | 02-3 | Migrated to consume `computeTrust()` |
| `src/components/BasIasAssistant.tsx` | 02-3 | Migrated to consume `computeBas()` |
| `src/components/ImportTB.tsx` | 02-3, 02-4 | AI gating (02-3); `today()` adoption (02-4) |
| `src/components/AccountManager.tsx` | 02-3 | Partnership column + Review-needed banner |
| `src/components/shell/Sidebar.tsx` | 02-4 | Extracted from App.tsx |
| `src/components/shell/Header.tsx` | 02-4 | Extracted from App.tsx |
| `src/components/shell/BottomNav.tsx` | 02-4 | Extracted from App.tsx |
| `src/components/shell/MainLayout.tsx` | 02-4 | New composition |
| `src/components/EntityCard.tsx` | 02-4 | Extracted from App.tsx |
| `src/components/MasterDashboard.tsx` | 02-4 | Extracted from App.tsx |
| `src/components/ViewRouter.tsx` | 02-4 | New routing component |
| `src/App.tsx` | 02-4 | Rewritten 1,116 → 151 lines |
| `src/components/JournalForm.tsx` | 02-4 | `today()` adoption |

Per-plan summaries: see `02-1-SUMMARY.md`, `02-2-SUMMARY.md`, `02-3-SUMMARY.md`.

## Requirement Coverage (all 7 IDs)

| ID | Plan(s) | Status |
|---|---|---|
| FND-04 (no API keys required) | 02-1, 02-3 | `IS_AI_ENABLED` gates ImportTB; deterministic fuzzyMatch is the primary path |
| TAX-01 (FY-versioned constants) | 02-1 | `src/lib/tax/labels/fy2026.ts` is the single source; no magic numbers in components |
| TAX-03 (CoA pre-mapping + override) | 02-1, 02-3, 02-4 | 16 default accounts pre-mapped (02-1); migration re-derives missing fields (02-1, registered 02-4); AccountManager exposes the override (02-3) |
| TAX-04 (CoA editor override) | 02-3 | Partnership column added to AccountManager |
| TAX-05 (shared tax engine) | 02-1, 02-2, 02-3, 02-4 | 5 `compute*` modules; tax components migrated; structural lint forbids React imports in `lib/tax/` |
| BOOK-08 (GST union widened) | 02-1, 02-4 | Type union widened to include INP and CAP; existing data not auto-upgraded |
| BOOK-10 (period model) | 02-1, 02-2, 02-4 | `period.ts` exports; structural lint forbids parameterless `new Date()` outside it |

## Hand-off to Phase 3

Phase 3 (Durable Persistence) replaces the per-hook `localStorage` `useEffect` blocks with a `StorageAdapter`. The migration startup currently in `App.tsx` will move into the `StorageAdapter` so reads always run through the migrator. AI server-side proxying lands when the optional Express server arrives in Phase 3.

Specific Phase 3 entry points:
- `src/hooks/useAuditLog.ts:N` — `useEffect` reading `localStorage.getItem('ledger_audit_logs')` → replace with `adapter.read('audit_logs')`
- `src/hooks/useAccounts.ts:N` — same pattern for `ledger_chart_of_accounts`
- `src/hooks/useJournals.ts:N` — same pattern for `ledger_all_entries` (and the legacy `ledger_entries` fallback can be deleted in Phase 3 since its data shape was upgraded by the migration runner long ago)
- `src/hooks/useEntities.ts:N` — same pattern for `ledger_entities_list`
- `src/App.tsx:36-114` — the migration startup `useEffect` becomes `adapter.initialise()` returning the migrated state; the version-guard pattern moves into the adapter

## Deviations

1. **Bash sandbox denials (recurring).** Both Task 1 and Task 2 hit denials on `git commit`. The orchestrator finished both commits and verified the structural / build / lint outputs.
2. **No-`new Date()` lint refinement.** The original lint pattern flagged both `new Date()` (now-producer) and `new Date(string)` (date parser). The latter is legitimate (used in `AuditTrail.tsx` and `FinancialTrendChart.tsx` to parse stored timestamp strings). The lint regex was tightened to `/\bnew Date\s*\(\s*\)/` (parameterless only) plus `/\bDate\.now\s*\(/`. Documented in the test file's prose.
3. **Em-dash trend test target.** The Phase 1 test asserted `trend="—"` count in `src/App.tsx`. Phase 2 moved StatCards to `src/components/ViewRouter.tsx`. The test target was updated to scan ViewRouter.tsx; behaviour preserved.

## Self-Check

- App.tsx ≤ 250 non-blank lines: 151 ✓
- Hooks composed in App.tsx (`useAuditLog → useAccounts(addLog) → useEntities(addLog) → useJournals(addLog, activeEntityId)`) ✓
- 7 component files extracted ✓
- Migration registered: `CURRENT_VERSION = 2`; `MIGRATIONS[1] = migrateV1ToV2` ✓
- Version-guard pattern present in App.tsx (grep: `migrated._v > storedVersion`) ✓
- `ledger_state_version` written inside the upgrade branch ✓
- Both structural lints active and GREEN ✓
- 200 tests pass; 0 RED; 0 RED-by-design; 11 TODO (Phase 5) ✓
- `npm run lint` passes ✓
- `npm run build` passes ✓
- All 7 phase requirement IDs accounted for ✓

## Human-Verify Checkpoint

The plan's third task is a `checkpoint:human-verify`. Awaiting user confirmation in the running dev server. Instructions in the orchestrator's checkpoint message.
