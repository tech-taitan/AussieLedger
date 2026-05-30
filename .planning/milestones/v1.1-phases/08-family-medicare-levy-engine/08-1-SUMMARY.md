---
phase: 08-family-medicare-levy-engine
plan: 1
subsystem: tax-engine
tags: [medicare-levy, family-thresholds, schema-migration, pure-functions, constants-correction]
dependency_graph:
  requires: []
  provides:
    - v5-to-v6-migration
    - Entity.dependants
    - Entity.spouseIncome
    - medicareLevyFamily
    - medicareLevySurchargeFamily
    - isFamilyFiling
    - fy2026-family-constants
  affects:
    - src/lib/migrations/index.ts
    - src/lib/tax/rates/fy2026/medicare.ts
    - src/lib/tax/returns/fy2026/_helpers.ts
tech_stack:
  added: []
  patterns:
    - additive-schema-migration
    - pure-function-tax-engine
    - tdd-red-green
key_files:
  created:
    - src/lib/migrations/v5-to-v6.ts
    - src/lib/migrations/__tests__/v5-to-v6.test.ts
  modified:
    - src/types.ts
    - src/lib/schemas.ts
    - src/lib/migrations/index.ts
    - src/lib/migrations/__tests__/round-trip.test.ts
    - src/lib/migrations/__tests__/index.test.ts
    - src/lib/migrations/__tests__/runner.test.ts
    - src/lib/tax/labels/fy2026.ts
    - src/lib/tax/rates/fy2026/medicare.ts
    - src/lib/tax/rates/__tests__/medicare.test.ts
    - src/lib/tax/returns/fy2026/_helpers.ts
    - src/lib/tax/returns/fy2026/__tests__/helpers.test.ts
decisions:
  - "MedicareLevyInput widened additively (dependants? + spouseIncome?) — orchestrator passes through cleanly"
  - "medicareLevySurchargeFamily uses max(0, dependants-1) × 1500 for MLS after-first-child semantics"
  - "medicareLevyFY2026 family branch fully rewritten; familyWarning field kept on interface for backward compat but now always undefined"
  - "isFamilyFiling appended to existing _helpers.ts (not a new file) — fits the stateless utilities pattern"
  - "helpers.test.ts extended (not replaced) with isFamilyFiling describe block — preserves existing helper tests"
metrics:
  duration: ~40 min
  completed: 2026-05-30
  tasks: 3
  files: 11
---

# Phase 8 Plan 1: Wave 0/1 Foundations — Schema Migration + Family Constants + Pure Functions

Wave 0/1 foundations for the Phase 8 family Medicare levy engine. Ships v5→v6 schema migration, corrects 4 stale FY2024-25 constants, adds 5 new FY2025-26 family constants, and implements the 3 pure functions required for the family threshold engine.

## Test Results

| Metric | Value |
|--------|-------|
| SPA baseline (Phase 7 final) | 848 GREEN |
| New tests added (this plan) | 36 |
| Final GREEN count | 884 |
| RED | 0 |
| Todo (unchanged) | 11 |
| TypeScript errors | 0 |
| Lint exit | 0 |

## Files Modified

**New files created:**
- `src/lib/migrations/v5-to-v6.ts` — additive migration: Entity gains `dependants?` + `spouseIncome?`
- `src/lib/migrations/__tests__/v5-to-v6.test.ts` — 6 migration unit tests (bump, idempotent, field-preserve, entities-undefined, preset-dependants, preset-spouseIncome)

**Widened (additive only):**
- `src/types.ts` — Entity gains `dependants?: number` + `spouseIncome?: string` (_v:6 additions)
- `src/lib/schemas.ts` — EntitySchema gains `dependants: z.number().int().nonnegative().optional()` + `spouseIncome: z.string().optional()`
- `src/lib/migrations/index.ts` — registered `5: migrateV5ToV6`; `CURRENT_VERSION` bumped to 6
- `src/lib/tax/labels/fy2026.ts` — 4 stale constants corrected; 5 new family constants added
- `src/lib/tax/rates/fy2026/medicare.ts` — `medicareLevyFamily` + `medicareLevySurchargeFamily` added; `MedicareLevyInput` widened; orchestrator family branch rewritten
- `src/lib/tax/returns/fy2026/_helpers.ts` — `isFamilyFiling(entity)` predicate added

**Tests updated:**
- `src/lib/migrations/__tests__/round-trip.test.ts` — extended v0→v6 round-trip with `dependants`/`spouseIncome` undefined assertions
- `src/lib/migrations/__tests__/index.test.ts` — CURRENT_VERSION assertion updated to 6
- `src/lib/migrations/__tests__/runner.test.ts` — CURRENT_VERSION assertion updated to 6 (auto-fix Rule 1)
- `src/lib/tax/rates/__tests__/medicare.test.ts` — stale boundary tests corrected; 3 family orchestrator tests + 8 FLEVY + 7 FMLS + 5 constant-existence tests added
- `src/lib/tax/returns/fy2026/__tests__/helpers.test.ts` — 6 isFamilyFiling tests appended

## Constants Table (9 constants — 5 new + 4 corrected)

| Constant | Before (stale FY2024-25) | After (FY2025-26) | Status |
|----------|--------------------------|-------------------|--------|
| `MEDICARE_LEVY_SINGLE_LOWER` | `'27222'` | `'28011'` | Corrected |
| `MEDICARE_LEVY_SINGLE_UPPER` | `'34028'` | `'35014'` | Corrected |
| `MLS_SINGLE_TIER_3` | `'144000'` | `'158000'` | Corrected |
| `MLS_FAMILY_TIER_3` | `'288000'` | `'316000'` | Corrected |
| `MEDICARE_LEVY_FAMILY_LOWER` | (absent) | `'47238'` | New |
| `MEDICARE_LEVY_FAMILY_UPPER` | (absent) | `'59047'` | New |
| `MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER` | (absent) | `'4338'` | New |
| `MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER` | (absent) | `'5422'` | New |
| `MLS_FAMILY_DEPENDANT_INCREMENT` | (absent) | `'1500'` | New |

## Function Signatures Shipped

```typescript
// v5-to-v6.ts
export function migrateV5ToV6(state: PersistedRoot): PersistedRoot

// medicare.ts
export function medicareLevyFamily(
  taxableIncome: Decimal,
  spouseIncome: Decimal,
  dependants: number,
): Decimal

export function medicareLevySurchargeFamily(
  combinedIncome: Decimal,
  ownTaxableIncome: Decimal,
  hasPHC: boolean,
  dependants: number,
): Decimal

// _helpers.ts
export function isFamilyFiling(entity: Entity): boolean
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] runner.test.ts CURRENT_VERSION assertion stale**
- **Found during:** Task 2 full suite run
- **Issue:** `src/lib/migrations/__tests__/runner.test.ts` had a separate `CURRENT_VERSION is 5` assertion that failed when CURRENT_VERSION was bumped to 6. The plan mentioned `index.test.ts` but not `runner.test.ts`.
- **Fix:** Updated `runner.test.ts` assertion from 5 to 6 in the same commit as Task 2.
- **Files modified:** `src/lib/migrations/__tests__/runner.test.ts`
- **Commit:** `113d0d8`

**2. [Plan deviation] helpers.test.ts already existed**
- **Found during:** Task 3
- **Issue:** The plan specified creating a new `helpers.test.ts` file, but it already existed with filterPostedEntries + rollupByLabel tests. Creating a new file would overwrite the existing tests.
- **Fix:** Appended isFamilyFiling describe block to the existing file; added `isFamilyFiling` to the existing import line.
- **Files modified:** `src/lib/tax/returns/fy2026/__tests__/helpers.test.ts`
- **Commit:** `3b1654a`

## Open Issues for Plan 08-2 (UI Integration)

1. **`computeIndividualReturn` widening** — needs to call `isFamilyFiling(entity)`, pass `dependants` + `spouseIncome` to `medicareLevyFY2026`, and build the family assumption row replacing the flat-2% warning
2. **`AssumptionsBlock` prop widening** — needs optional `assumptions?: string[]` prop; defaults to static ASSUMPTIONS for backward compat
3. **`EntityForm.tsx` two new conditional fields** — `dependants` (integer) + `spouseIncome` (decimal string), both `type=Individual` only, inside existing 'Tax & GST' section
4. **`TaxReturnAssistant.tsx`** — derive assumption rows from engine output; pass to `<AssumptionsBlock assumptions={...} />`
5. **Bad-data anomaly emission** — `computeIndividualReturn` tolerant parse for invalid `spouseIncome` + Anomaly `{ id: 'family-data-warn', severity: 'warn', label: 'M1', message: '...' }`

## Commit SHAs

| Commit | Description |
|--------|-------------|
| `c9f4252` | feat(08-1): v5→v6 additive migration — Entity.dependants + spouseIncome (MED-01) |
| `113d0d8` | fix(08-1): correct FY2024-25 stale constants + add FY2025-26 family Medicare/MLS constants (MED-02) |
| `3b1654a` | feat(08-1): medicareLevyFamily + medicareLevySurchargeFamily + isFamilyFiling — pure functions + tests (MED-02) |

## Self-Check: PASSED

All 9 key files confirmed present on disk. All 3 task commits (`c9f4252`, `113d0d8`, `3b1654a`) confirmed in git history. Final test count: 884 GREEN, 0 RED, 11 todo. TypeScript: 0 errors. Lint: EXIT 0.
