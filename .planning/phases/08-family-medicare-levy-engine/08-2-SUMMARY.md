---
phase: 08-family-medicare-levy-engine
plan: 2
subsystem: tax-engine, ui-components
tags: [medicare-levy, family-thresholds, assumptions-block, entity-form, tdd]
dependency_graph:
  requires:
    - 08-1 (isFamilyFiling, medicareLevyFY2026 family branch, MEDICARE_LEVY_FAMILY_LOWER, Entity v6 fields)
  provides:
    - computeIndividualReturn-family-branch
    - assumption-family-medicare-row
    - family-data-warn-anomaly
    - AssumptionsBlock-dynamic-prop
    - TaxReturnAssistant-family-assumption-wiring
    - EntityForm-Individual-fields
  affects:
    - src/lib/tax/returns/fy2026/individual.ts
    - src/components/AssumptionsBlock.tsx
    - src/components/TaxReturnAssistant.tsx
    - src/components/EntityForm.tsx
tech_stack:
  added: []
  patterns:
    - tdd-red-green
    - backward-compatible-prop-widening
    - conditional-render-individual-only
    - tolerant-parse-with-anomaly-emission
key_files:
  created: []
  modified:
    - src/lib/tax/returns/fy2026/individual.ts
    - src/lib/tax/returns/fy2026/__tests__/individual.test.ts
    - src/components/AssumptionsBlock.tsx
    - src/components/__tests__/AssumptionsBlock.test.tsx
    - src/components/TaxReturnAssistant.tsx
    - src/components/__tests__/TaxReturnAssistant.test.tsx
    - src/components/EntityForm.tsx
    - src/components/__tests__/EntityForm.test.tsx
decisions:
  - "computeIndividualReturn uses isFamilyFiling(entity) gate before passing dependants+spouseIncome to medicareLevyFY2026"
  - "Family assumption row uses entity.spouseIncome (raw value) for display — bad-data warn anomaly provides the '$0 applied' context separately"
  - "AssumptionsBlock widened additively via optional prop; default fallback to static ASSUMPTIONS preserves backward compat"
  - "TaxReturnAssistant derives assumptionRows via useMemo(filter+map) on result.meta.anomalies — no new local state"
  - "EntityForm: dependants clamped via Math.max(0, parseInt(v,10)||0) — note: parseInt('-2') returns -2, then max(0,-2)=0 as expected"
metrics:
  duration: ~12 min
  completed: 2026-05-30
  tasks: 3
  files: 8
---

# Phase 8 Plan 2: Wave 2 Application Wiring — Family Medicare Engine Integration

Wire the Wave-1 family engine into the application layer: computeIndividualReturn calls isFamilyFiling and passes family fields to medicareLevyFY2026; AssumptionsBlock gains optional dynamic prop; TaxReturnAssistant derives assumption rows from engine output; EntityForm adds 2 Individual-conditional fields.

## Test Results

| Metric | Value |
|--------|-------|
| SPA baseline (Plan 08-1 final) | 884 GREEN |
| New tests added (this plan) | 26 |
| Final GREEN count | 910 |
| RED | 0 |
| Todo (unchanged) | 11 |
| TypeScript errors | 0 |
| Lint exit | 0 |

## Files Modified

**Source files widened:**
- `src/lib/tax/returns/fy2026/individual.ts` — imports isFamilyFiling + family constants; family eligibility block; tolerant spouseIncome parse; family/single medicare call; assumption-row conditional (family REPLACES marital/exempt/dependants; single preserves 5 rows); bad-data anomaly emission
- `src/components/AssumptionsBlock.tsx` — complete rewrite with AssumptionsBlockProps interface, optional `assumptions?: string[]` prop, `rows = assumptions ?? ASSUMPTIONS` fallback, ASSUMPTIONS export preserved
- `src/components/TaxReturnAssistant.tsx` — `assumptionRows` useMemo derivation; `<AssumptionsBlock assumptions={assumptionRows} />`
- `src/components/EntityForm.tsx` — 2 new Individual-conditional fields inside Tax calculation settings grid: `entity-dependants` (number, min=0) + `entity-spouse-income` (text); blank → undefined semantics

**Tests updated (additions only, no modifications to existing tests):**
- `src/lib/tax/returns/fy2026/__tests__/individual.test.ts` — 9 new tests (IND-FAM-1 through IND-FAM-9)
- `src/components/__tests__/AssumptionsBlock.test.tsx` — 3 new tests (dynamic prop, empty array, caveat footer)
- `src/components/__tests__/TaxReturnAssistant.test.tsx` — 3 new tests (TRA-FAM-1 through TRA-FAM-3)
- `src/components/__tests__/EntityForm.test.tsx` — 11 new tests (EF-FAM-1 through EF-FAM-11)

## New Tests by File

| File | Count | Test IDs |
|------|-------|----------|
| individual.test.ts | 9 | IND-FAM-1..9 |
| AssumptionsBlock.test.tsx | 3 | ABLOCK-2..4 |
| TaxReturnAssistant.test.tsx | 3 | TRA-FAM-1..3 |
| EntityForm.test.tsx | 11 | EF-FAM-1..11 |
| **Total** | **26** | |

## Assumption Row Format Shipped

```
'Family Medicare levy applied — {N} dependants, spouse income ${X}. Family threshold $47238; per-dependant adjustment $4338.'
```

Where:
- `{N}` = `entity.dependants ?? 0`
- `{X}` = `entity.spouseIncome ?? '0'` (raw entity value; bad-data warn provides context for invalid inputs)

**IDs suppressed for family entities:** `assumption-marital`, `assumption-medicare-exempt`, `assumption-dependants`

**IDs preserved for family entities:** `assumption-age`, `assumption-phc` (independent concerns)

**ID added for family entities:** `assumption-family-medicare` (severity: info)

**Bad-data anomaly shape:**
```typescript
{ id: 'family-data-warn', severity: 'warn', label: 'M1', message: 'Spouse income data invalid; family thresholds applied with $0 — verify input' }
```

## AssumptionsBlock Prop Signature Shipped

```typescript
export interface AssumptionsBlockProps {
  assumptions?: string[];  // When provided, REPLACES static ASSUMPTIONS. Empty array renders zero rows.
}
export function AssumptionsBlock({ assumptions }: AssumptionsBlockProps = {}): React.JSX.Element
```

`ASSUMPTIONS` static export preserved for backward compat and existing test access.

## EntityForm Fields Shipped

| Field | ID | aria-label | Type | Blank handling |
|-------|----|------------|------|----------------|
| Dependant children | `entity-dependants` | `Dependant children count` | number, min=0 | → undefined |
| Spouse taxable income | `entity-spouse-income` | `Spouse taxable income ($)` | text | → undefined |

**Condition:** Both wrapped in `{formData.type === 'Individual' && (...)}`

**Help text:**
- Dependants: `'Number of children under 18 you supported (used for Medicare levy family thresholds).'`
- SpouseIncome: `"Your spouse's taxable income for the financial year. Required if you had a spouse for any part of the year."`

## Deviations from Plan

None — plan executed exactly as written. All 9 TDD RED/GREEN cycles completed; no deviations from specified test cases; no auto-fixes required.

## Open Concerns for Plan 08-3 (UAT)

UAT scenarios to verify end-to-end (EntityForm → save → TaxReturnAssistant render):

1. **Single-parent family:** `dependants: 2`, `spouseIncome: undefined` → M1 = $0 (combined $30k < effLower $55,914)
2. **DINK:** `dependants: 0`, `spouseIncome: "80000"` → M1 = $600 (combined $110k > effUpper $59,047)
3. **2-kid family:** `dependants: 2`, `spouseIncome: "60000"` → M1 = $600; assumption row shows "2 dependants, spouse income $60000"
4. **Legacy v1.0 entity:** both fields undefined → M1 = $198.90 (single shade-in zone at $30k); 5 Phase 5 assumption rows; no family row
5. **Bad spouseIncome:** `dependants: 1`, `spouseIncome: "garbage"` → family assumption row present; family-data-warn badge visible in Notices section
6. **Type-switch UX:** open Individual entity → set dependants + spouseIncome → switch to Company → verify fields hidden → switch back to Individual → verify values restored

## Commit SHAs

| Commit | Description |
|--------|-------------|
| `a2886f1` | feat(08-2): widen computeIndividualReturn — family branch + assumption row + bad-data anomaly (MED-02) |
| `6910396` | feat(08-2): AssumptionsBlock dynamic prop + TaxReturnAssistant family-aware assumption wiring (MED-03) |
| `f3a746e` | feat(08-2): EntityForm — Individual-conditional dependants + spouseIncome fields (MED-04) |

## Self-Check: PASSED
