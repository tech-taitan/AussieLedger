---
phase: 02-decompose-and-tax-engine
plan: 1
subsystem: foundations
tags: [period-model, tax-engine, fuzzy-match, schema-migration, ai-gate, hook-stubs, structural-lint, decimal]
dependency_graph:
  requires: [vitest-config, money-lib, schema-versioning]
  provides: [period-lib, ai-gate, fuzzy-match-lib, tax-engine-compute, fy2026-labels, v1-to-v2-migration, hook-type-stubs, test-scaffolds]
  affects: [src/types.ts, src/constants.ts]
tech_stack:
  added: []
  patterns: [UTC-boundary-dates, nowProvider-seam, levenshtein-fuzzy-match, decimal-only-arithmetic, red-by-design-scaffolds, name-inference-table]
key_files:
  created:
    - src/lib/period.ts
    - src/lib/ai.ts
    - src/lib/import/match.ts
    - src/lib/migrations/v1-to-v2.ts
    - src/lib/tax/types.ts
    - src/lib/tax/labels/fy2026.ts
    - src/lib/tax/individual.ts
    - src/lib/tax/company.ts
    - src/lib/tax/trust.ts
    - src/lib/tax/partnership.ts
    - src/lib/tax/bas.ts
    - src/hooks/useAuditLog.ts
    - src/hooks/useAccounts.ts
    - src/hooks/useJournals.ts
    - src/hooks/useEntities.ts
    - src/lib/__tests__/period.test.ts
    - src/lib/__tests__/ai.test.ts
    - src/lib/import/__tests__/match.test.ts
    - src/lib/migrations/__tests__/v1-to-v2.test.ts
    - src/hooks/__tests__/useAuditLog.test.ts
    - src/hooks/__tests__/useAccounts.test.ts
    - src/hooks/__tests__/useJournals.test.ts
    - src/hooks/__tests__/useEntities.test.ts
    - src/components/__tests__/AccountManager.test.tsx
    - src/components/__tests__/ImportTB.test.tsx
  modified:
    - src/types.ts
    - src/constants.ts
    - src/lib/tax/__tests__/structural-lint.test.ts
    - src/lib/tax/__tests__/golden.test.ts
    - src/lib/tax/__tests__/bas.test.ts
    - src/__tests__/structural.test.ts
decisions:
  - "Used Date.UTC() for all period boundary construction to ensure timezone-independent ISO dates (fixes local-midnight-off-by-one in positive UTC offsets)"
  - "currentFy() calls _nowProvider() directly (not today()) so vi.spyOn on the export intercepts external calls while _setNowProvider intercepts internal calls"
  - "normaliseName() in v1-to-v2 collapses multi-spaces (.replace(/\\s+/g, ' ')) to handle '&'-stripped names like 'wages  salaries'"
  - "Structural lint regex /[\\d)]\\s*[*/]\\s*\\d/ matched JSDoc comment '1/11'; fixed by rewriting comment to 'divided by eleven'"
  - "Hook stubs (useAuditLog/useAccounts/useJournals/useEntities) throw at runtime but compile cleanly — unblocks Plan 02-1 TypeScript checks without implementing Plan 02-2 work"
  - "Tax compute* functions RELOCATE existing demo rollup math verbatim (converted to Decimal) — they do NOT return zeros; visual output preserved for Phase 5 rewrite"
metrics:
  duration: "~3 hours"
  completed: "2026-05-10"
  tasks: 3
  files_created: 25
  files_modified: 6
  commits: 3
  tests_green: 166
  tests_skipped: 7
  tests_red_by_design: 23
---

# Phase 02 Plan 1: Wave-0 Foundations Summary

Wave-0 scaffold for Phase 2: all new pure-function modules (period, ai, fuzzy-match, tax engine, fy2026 labels, v1-to-v2 migration), type widening, seed CoA, hook type stubs, and RED-by-design test scaffolds so all parallel implementation plans (02-2, 02-3, 02-4) can land without scaffolding gaps.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wave-0 foundations | `8ef3c72` | src/lib/period.ts, src/lib/ai.ts, src/lib/import/match.ts, src/lib/migrations/v1-to-v2.ts, src/types.ts, src/constants.ts + 4 test files + structural-lint extension |
| 1.5 | (Checkpoint commit — auto in Wave 0) | `8ef3c72` | (same as Task 1) |
| 2 | Tax engine modules | `471d630` | src/lib/tax/{types,individual,company,trust,partnership,bas}.ts, src/lib/tax/labels/fy2026.ts + golden/bas test rewrites |
| 3 | Hook + component test scaffolds | `670610d` | 4 hook stubs, 4 hook test files, AccountManager.test.tsx, ImportTB.test.tsx, structural.test.ts extension |

## What Was Built

### src/lib/period.ts
AU FY period model. `today()` wraps `_nowProvider` closure (injectable test seam). `currentFy()` calls `_nowProvider()` directly (not `today()`) so both `vi.spyOn` and `_setNowProvider` seams work. All boundary dates use `Date.UTC()` for timezone-independent ISO output. Exports: `today`, `currentFy`, `fyBoundaries`, `quarterOf`, `quarterBoundaries`, `isInPeriod`, `FyLabel`, `Period`, `_setNowProvider`.

### src/lib/ai.ts
Build-time `IS_AI_ENABLED` constant: `Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')`. Uses `process.env` (Vite define block), NOT `import.meta.env`.

### src/lib/import/match.ts
Levenshtein DP fuzzy match with exact-code short-circuit (confidence 1.0). `HIGH_CONFIDENCE_THRESHOLD = 0.85`, `TOP_N_CANDIDATES = 3`. `normalise()` lowercases and strips punctuation. Returns `{ mappedAccountId, confidence, candidates }`.

### src/lib/migrations/v1-to-v2.ts
22-entry INFERENCE_TABLE mapping normalised account names to per-entity-type labels. `normaliseName()` lowercases, strips non-alphanumeric (except spaces), collapses multi-spaces. `migrateV1ToV2()` is idempotent (`if (state._v >= 2) return state`). Sets `_needsReview: true` for unmapped Revenue/Expense accounts.

### src/lib/tax/* (7 files)
`types.ts`: full type definitions (TaxInput, LabelResult, IndividualReturn, CompanyReturn, TrustReturn, PartnershipReturn, BasReturn). `labels/fy2026.ts`: all label arrays + rate constants as string literals. `individual.ts`, `company.ts`, `trust.ts`, `bas.ts`: RELOCATED demo rollup math from the 4 existing tax components, converted to Decimal arithmetic. `partnership.ts`: correct-polarity stub (no existing component). All modules pass structural lint (no React imports, no raw arithmetic operators).

### src/types.ts + src/constants.ts
`Account.gstCode` widened to `'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP'`. `partnershipTaxLabel` and `_needsReview` added to Account. All 7 Revenue/Expense rows in seed CoA now have `partnershipTaxLabel`.

### Hook stubs (4 files)
Throw "not yet implemented — landing in Plan 02-2" at runtime. Compile cleanly with correct exported interfaces so the RED-by-design test files can import without TypeScript errors.

### Test scaffolds
Hook tests (useAuditLog/useAccounts/useJournals/useEntities): RED-by-design, fail with "not yet implemented" until 02-2. AccountManager.test.tsx: basic render GREEN, `partnershipTaxLabel` column tests `.skip`. ImportTB.test.tsx: all gating tests `.skip` until 02-3. structural.test.ts: "App.tsx ≤ 250 lines" and "no raw new Date()" both `.skip` until 02-4.

## Test Results

- 166 tests GREEN (period, ai, match, v1-to-v2, tax shape/fixture, smoke, component render)
- 7 skipped (`.skip` by design — future plan targets)
- 23 RED-by-design (4 hook test files — throw "not yet implemented")
- `npm run lint` (tsc --noEmit): PASS

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] UTC date boundaries for timezone-correct ISO output**
- **Found during:** Task 1 (period.test.ts fixture failures)
- **Issue:** `new Date(year, month, day)` creates local-time midnight; `.toISOString()` shows previous day in positive-UTC-offset environments
- **Fix:** Changed all boundary constructors in period.ts to `new Date(Date.UTC(year, month, day))`. Updated `isInPeriod` to use UTC getters for fy/quarter boundary comparisons.
- **Files modified:** src/lib/period.ts
- **Commit:** `8ef3c72`

**2. [Rule 1 - Bug] currentFy() test seam via _nowProvider instead of today()**
- **Found during:** Task 1 (period test seam not intercepting currentFy)
- **Issue:** `vi.spyOn(period, 'today')` only intercepts the exported binding. `currentFy()` calling `today()` internally goes through the module-local identifier, bypassing the spy.
- **Fix:** Changed `currentFy()` to call `_nowProvider()` directly. Tests use `_setNowProvider()` for the seam.
- **Files modified:** src/lib/period.ts, src/lib/__tests__/period.test.ts
- **Commit:** `8ef3c72`

**3. [Rule 1 - Bug] Multi-space collapse in normaliseName()**
- **Found during:** Task 1 (v1-to-v2 migration test — "Wages & Salaries" not matching)
- **Issue:** `'&'.replace(/[^a-z0-9 ]/g, '')` leaves adjacent spaces; "wages & salaries" → "wages  salaries" (double space) doesn't match table entry "wages and salaries"
- **Fix:** Added `.replace(/\s+/g, ' ')` to collapse multi-spaces in `normaliseName()`
- **Files modified:** src/lib/migrations/v1-to-v2.ts
- **Commit:** `8ef3c72`

**4. [Rule 1 - Bug] Structural lint regex falsely matched JSDoc comment**
- **Found during:** Task 2 (structural-lint test run)
- **Issue:** `/[\d)]\s*[*/]\s*\d/` matched `1/11` in fy2026.ts JSDoc: "GST is 1/11 of the GST-inclusive price"
- **Fix:** Rewrote comment to "GST component = inclusive amount divided by eleven"
- **Files modified:** src/lib/tax/labels/fy2026.ts
- **Commit:** `471d630`

**5. [Rule 1 - Bug] TypeScript errors in structural.test.ts Dirent cast**
- **Found during:** Task 3 (npm run lint failure)
- **Issue:** `readdirSync(..., {recursive: true})` return type incompatible with path-property cast
- **Fix:** Explicitly import `Dirent` from 'fs', cast to `Dirent[]`, use `String(f.name)` and `(f as unknown as { path: string }).path`
- **Files modified:** src/__tests__/structural.test.ts
- **Commit:** `670610d`

## Self-Check: PASSED

All 15 created source files exist on disk. All 3 task commits (8ef3c72, 471d630, 670610d) present in git log.
