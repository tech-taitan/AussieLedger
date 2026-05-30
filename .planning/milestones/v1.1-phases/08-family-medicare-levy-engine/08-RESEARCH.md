---
phase: 8
slug: family-medicare-levy-engine
type: research
mode: ecosystem
status: complete
created: 2026-05-30
researcher: claude (gsd-phase-researcher)
---

# Phase 8: Family Medicare Levy Engine — Research

**Researched:** 2026-05-30
**Domain:** ATO FY2025-26 family Medicare levy threshold engine — constants, algorithms, schema migration, EntityForm widening, Form I assumption-row replacement
**Confidence:** HIGH for threshold values and algorithms (multiple cross-verified sources). MEDIUM for the exact family-levy-on-individual-vs-combined-income formula (ATO official page 403'd; secondary sources consistent but not direct-ATO). HIGH for all code patterns (direct codebase inspection).

---

## Summary

Phase 8 replaces Phase 5's flat-2%-with-warning family Medicare levy fallback with the real ATO FY2025-26 family threshold engine. Research covers: exact FY2025-26 constants (family lower/upper/per-dependant for Medicare levy; family tier thresholds for MLS); the threshold algorithm (combined income test, individual levy charged on own taxable income); a pre-existing stale-constant bug in `fy2026.ts` that Phase 8 must fix; the v5-to-v6 migration shape; EntityForm insertion point; and the AssumptionsBlock refactor required to support dynamic rows.

**Critical finding:** The existing `fy2026.ts` file carries FY2024-25 stale values for BOTH the single Medicare levy thresholds AND the MLS Tier 3 thresholds. Phase 8 must correct these during the constants-widening pass. The existing single-threshold constants currently in the file are `$27,222` / `$34,028` (FY2024-25 values) but FY2025-26 uplifted values are `$28,011` / `$35,014`. Similarly `MLS_SINGLE_TIER_3 = '144000'` should be `'158000'` and `MLS_FAMILY_TIER_3 = '288000'` should be `'316000'`. These bugs already shipped in Phase 5 and are pre-existing; Phase 8 is the natural correction point since it is the medicare constants file widening wave. Corrections are additive in spirit — no function signatures change.

**Primary recommendation:** Add all family constants to `src/lib/tax/labels/fy2026.ts` (the existing location for all FY2026 rate constants), correct the stale single/MLS tier-3 values at the same time, implement `medicareLevyFamily` and `medicareLevySurchargeFamily` as pure functions in the existing `medicare.ts`, wire via `isFamilyFiling` predicate in `_helpers.ts`, update `computeIndividualReturn` with 3–4 lines, and make `AssumptionsBlock` accept a dynamic `assumptions` prop while keeping a `ASSUMPTIONS` constant as the default for backward compat.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Eligibility trigger (4 sub-decisions)**
- Family iff `dependants >= 1` OR `spouseIncome !== undefined`. Both fields trigger family status.
- Single parent (dependants > 0, spouseIncome undefined) → family with spouseIncome treated as "0" for combined-income calculation.
- DINK case (dependants undefined-or-0, spouseIncome > 0) → family with per-dependant increment of 0.
- Both undefined → single thresholds (Phase 5 behaviour preserved). Zero regression for v1.0 entities.

**MLS family scope (4 sub-decisions)**
- Ship BOTH family Medicare levy AND family MLS in Phase 8.
- Per-dependant-child increment applies to BOTH Medicare levy AND MLS family thresholds.
- PHC + family: MLS family threshold check runs; if PHC = true → surcharge = $0 regardless.
- Bad data → best-effort family computation + Anomaly emission (severity: 'warn', label: 'M1').

**EntityForm UX (4 sub-decisions)**
- Place new fields inside existing 'Tax & GST' section (next to `aggregatedTurnover`).
- One short sentence of inline help per field; NO mention of deductibility.
- Validation: dependants integer >= 0 (no max cap); spouseIncome decimal-string >= 0; both optional.
- Fields entirely hidden when entity type != Individual.

**Form I display + assumption disclosure (4 sub-decisions)**
- Replace the existing Phase 5 flat-2% warning entirely with a family-threshold assumption row.
- Assumption row text: 'Family Medicare levy applied — {N} dependants, spouse income ${X}. Family threshold ${Y}; per-dependant adjustment ${Z}.'
- Zero-zero case renders with explicit zeros.
- Same `AssumptionsBlock` component pattern; family row is just another assumption entry.

### Claude's Discretion

- Exact FY2026 family threshold values — researched and documented below.
- Function signatures for `medicareLevyFamily` and `medicareLevySurchargeFamily`.
- Decimal-string validation for `spouseIncome` (same pattern as `aggregatedTurnover`).
- Exact wording of EntityForm validation error messages.
- Whether `medicareLevyFamily` returns `MedicareLevyResult` shape (yes — confirmed below).
- Form I label display formatting for ${Y} and ${Z}.
- Anomaly label code for bad-spouse-income case.
- Whether legacy v1.0 entities get a visual indicator that family fields are available — out of scope per MED-04.

### Deferred Ideas (OUT OF SCOPE)

- Explicit `filingStatus` enum on Entity as a user-toggle.
- Spouse marriage/de-facto status field.
- Children-aged-18+-in-tertiary-study dependant rules.
- Single Parent Family Tax Benefit / FTB Part B integration.
- Defined-benefit-income separate handling for MLS.
- Senior and Pensioner Tax Offset (SAPTO) family thresholds.
- Family MLS reportable fringe benefits addition.
- EntityForm dependant-list with names/DOBs.
- Soft warning when dependants > 5.
- Strict hard caps on dependants (0–10).
- Dedicated 'Family Medicare' print section.
- Multi-year family-threshold support.
- Explicit `filingStatus` re-export from individual.ts.
- Visual indicator on Form I that family fields are unset.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MED-01 | Entity (Individual type only) gains `dependants?: number` and `spouseIncome?: string` — additive v5→v6 schema migration with round-trip test | v4-to-v5.ts reference implementation documented below; Zod widening pattern confirmed in schemas.ts; round-trip test must extend existing round-trip.test.ts |
| MED-02 | `computeIndividualReturn` switches from flat-2% fallback to real family threshold engine when family-eligible; ATO FY2026 family lower/upper/per-dependant-child applied | Family threshold constants researched and documented below; algorithm (combined income test, individual levy charged on own taxable income) confirmed via multiple sources; `medicareLevyFY2026` orchestrator already has 'family' branch wired — just needs real implementation |
| MED-03 | Form I renders family-threshold variant of M1/M2 with "Assumption: family thresholds applied — N dependants, spouse income $X" row, replacing flat-2% warning | `AssumptionsBlock` inspection shows hardcoded ASSUMPTIONS array — needs dynamic prop; exact replacement row text confirmed; no component structure change otherwise |
| MED-04 | EntityForm exposes two new fields (Individual-only); defaults undefined; existing v1.0 entities continue using single-person thresholds | EntityForm 'Tax & GST' section insertion point confirmed at line ~490; Individual-conditional pattern already used for aggregatedTurnover/paygInstalmentAmount |

</phase_requirements>

---

## Standard Stack

### Core (no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| decimal.js | already pinned | All money math for threshold comparisons and levy calculations | Phase 1 invariant — money never touches native floats |
| Zod | already pinned | Schema validation widening for `dependants` + `spouseIncome` | Existing pattern in `src/lib/schemas.ts` |
| React 19 | already pinned | EntityForm conditional field rendering | Existing brownfield |
| Vitest | already pinned | Unit tests for family threshold functions + migration | Existing test infrastructure |

**Installation:** No new dependencies required.

---

## FY2025-26 ATO Threshold Values

### Critical Pre-Existing Bug

The existing `src/lib/tax/labels/fy2026.ts` carries **FY2024-25 values** for several constants. Phase 8 corrects these as part of the additive-widening pass:

| Constant | Current (stale FY2024-25) | Correct FY2025-26 | Source |
|----------|--------------------------|-------------------|--------|
| `MEDICARE_LEVY_SINGLE_LOWER` | `'27222'` | `'28011'` | AusTax.tools uplift article (2.9% indexation, retroactive 1 Jul 2025) |
| `MEDICARE_LEVY_SINGLE_UPPER` | `'34028'` | `'35014'` | AusTax.tools uplift article |
| `MLS_SINGLE_TIER_3` | `'144000'` | `'158000'` | Multiple sources: mlscalculator.com.au, boxas.com.au, search summaries |
| `MLS_FAMILY_TIER_3` | `'288000'` | `'316000'` | Multiple sources: mlscalculator.com.au, ACT Tax Group, search summaries |

**Confidence:** HIGH — the FY2024-25→FY2025-26 uplift is confirmed by multiple independent sources and a dedicated AusTax.tools article on the 2.9% retroactive indexation.

**Impact on existing Phase 5 tests:** The single-threshold tests in `src/lib/tax/rates/__tests__/medicare.test.ts` will need boundary values updated as part of Wave 0. These are not new tests — they are corrections to existing golden values. MLS Tier 3 tests similarly need boundary corrections. This is the correct Phase 8 scope (constants widening wave).

### Family Medicare Levy Constants (NEW — to add to fy2026.ts)

| Constant | Value | Notes |
|----------|-------|-------|
| `MEDICARE_LEVY_FAMILY_LOWER` | `'47238'` | Family lower threshold FY2025-26 (no levy if combined income ≤ this) |
| `MEDICARE_LEVY_FAMILY_UPPER` | `'59047'` | Family upper threshold FY2025-26 (full 2% levy if combined income ≥ this) |
| `MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER` | `'4338'` | Per-dependant increment on the lower threshold (each dependant child) |
| `MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER` | `'5422'` | Per-dependant increment on the upper threshold (each dependant child) |

**Confidence:** HIGH — consistent across William Buck FY2025-26 rate summary and AusTax.tools Medicare levy uplift article.

**Notes on the two dependant increments:** The lower and upper thresholds use DIFFERENT per-dependant increment amounts ($4,338 lower vs $5,422 upper). This is intentional ATO design — the shading band widens slightly per dependant. Both constants must be tracked separately.

### Family MLS Constants (NEW — to add to fy2026.ts)

| Constant | Value | Notes |
|----------|-------|-------|
| `MLS_FAMILY_TIER_1` | `'202000'` | Already in fy2026.ts — CORRECT |
| `MLS_FAMILY_TIER_2` | `'236000'` | Already in fy2026.ts — CORRECT |
| `MLS_FAMILY_TIER_3` | `'316000'` | Needs correction from '288000' |
| `MLS_FAMILY_DEPENDANT_INCREMENT` | `'1500'` | Per-dependant-child increment (applied to base Tier 0/all tiers). NEW constant |

**Confidence:** HIGH — Tier 1/2/3 values confirmed across ACT Tax Group, boxas.com.au, mlscalculator.com.au. Per-dependant $1,500 increment confirmed across all sources.

**MLS per-dependant semantics:** The $1,500 increment applies per dependent child after the first child. A family with no children uses the base threshold. A family with 1 child: no extra increment (the first child is implicit in the family threshold). A family with 2 children: threshold raised by $1,500. A family with 3 children: raised by $3,000. This is the standard ATO "after first child" pattern.

For implementation simplicity per the CONTEXT.md decisions, treat `dependants` as the count of children regardless of "after first" — and apply `(max(0, dependants - 1)) × $1,500` for MLS increment. Alternatively, apply `dependants × $1,500` from 0 and note that a family with 0 or 1 dependant uses the same base threshold. Verify this is consistent with the ATO formula. The safest interpretation: `effectiveThreshold = baseThreshold + max(0, dependants - 1) × 1500` matches the "first child is already in the $202,000 base" model.

**Alternate interpretation:** Some sources state the increment applies per child "after the first" meaning the $202,000 already assumes 1 child. However, the CONTEXT.md uses `dependants >= 1` as the family trigger. Research recommendation: treat `effectiveThreshold = baseThreshold + max(0, dependants - 1) × MLS_FAMILY_DEPENDANT_INCREMENT` for the MLS case. For 0 dependants (DINK), use `baseThreshold + 0`. For 1 dependant, use `baseThreshold + 0`. For 2 dependants, use `baseThreshold + 1500`. This matches the ATO "each after the first" language. Add a unit test for the 2-dependant case to lock the value.

---

## Architecture Patterns

### Recommended Project Structure (Phase 8 additions)

```
src/
├── lib/
│   ├── tax/
│   │   ├── labels/
│   │   │   └── fy2026.ts                    # WIDEN: add 5 new family constants; correct 4 stale ones
│   │   ├── rates/
│   │   │   └── fy2026/
│   │   │       └── medicare.ts              # WIDEN: add medicareLevyFamily + medicareLevySurchargeFamily + widen MedicareLevyInput; fix family branch
│   │   └── returns/
│   │       └── fy2026/
│   │           ├── _helpers.ts              # WIDEN: add isFamilyFiling(entity): boolean predicate
│   │           └── individual.ts            # WIDEN: call isFamilyFiling; pass dependants/spouseIncome; replace assumption row
│   ├── migrations/
│   │   ├── v5-to-v6.ts                      # NEW: additive dependants + spouseIncome on Entity
│   │   ├── index.ts                         # WIDEN: register v5→v6; bump CURRENT_VERSION to 6
│   │   └── __tests__/
│   │       ├── v5-to-v6.test.ts             # NEW: additive migration + idempotency + field-preservation
│   │       └── round-trip.test.ts           # WIDEN: extend v0→v6 round-trip test
│   └── schemas.ts                           # WIDEN: add dependants + spouseIncome to EntitySchema
├── types.ts                                 # WIDEN: add dependants? + spouseIncome? to Entity (_v:6 additions comment)
└── components/
    ├── AssumptionsBlock.tsx                 # WIDEN: accept dynamic `assumptions?: string[]` prop; default to existing ASSUMPTIONS constant
    └── EntityForm.tsx                       # WIDEN: 2 new fields in 'Tax calculation settings' section (Individual-only)
```

### Pattern 1: `isFamilyFiling` predicate in `_helpers.ts`

**Location:** `src/lib/tax/returns/fy2026/_helpers.ts` (existing file — append to it)

**Signature:**
```typescript
// Source: Phase 8 CONTEXT.md eligibility trigger decisions
import type { Entity } from '../../../../types';

export function isFamilyFiling(entity: Entity): boolean {
  const hasDependants = (entity.dependants ?? 0) >= 1;
  const hasSpouseIncome = entity.spouseIncome !== undefined;
  return hasDependants || hasSpouseIncome;
}
```

**Rationale:** Pure function, no I/O. Lives in `_helpers.ts` next to `filterPostedEntries` and `rollupByLabel`. The existing helper pattern is exactly this shape (stateless utilities consumed by compute functions). Adding it here avoids a new file and keeps tax-return helpers in one place.

### Pattern 2: `medicareLevyFamily` pure function

**Location:** `src/lib/tax/rates/fy2026/medicare.ts` (add after `medicareLevySingle`)

**Algorithm (ATO formula):**
1. Combined family income = `taxableIncome + spouseIncome`
2. Effective lower = `MEDICARE_LEVY_FAMILY_LOWER + (dependants × MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER)`
3. Effective upper = `MEDICARE_LEVY_FAMILY_UPPER + (dependants × MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER)`
4. If combined ≤ effective lower → return `$0`
5. If combined < effective upper → shade-in: `(combined - effectiveLower) × 0.10` (same shading rate as single)
6. If combined ≥ effective upper → full 2% of **taxpayer's own taxable income** (NOT combined)

**Critical nuance — levy charged on individual income, not combined:**
The ATO uses combined family income to TEST whether a reduction applies, but the actual levy amount in the full-rate zone is charged on each taxpayer's own taxable income. This is the same model as single: full 2% × taxable income. The combined income test only gates the shade-in reduction. Once combined income exceeds the upper threshold, both spouses pay full 2% on their own incomes separately.

**For the shade-in zone:** The shade-in amount `(combined - effectiveLower) × 0.10` is constrained to not exceed `taxableIncome × 0.02`. This mirrors the single logic in `medicareLevySingle`: `Decimal.min(shaded, full)`.

```typescript
// Source: ATO family Medicare levy reduction rules + Phase 5 single implementation pattern
import {
  MEDICARE_LEVY_RATE,
  MEDICARE_LEVY_FAMILY_LOWER,
  MEDICARE_LEVY_FAMILY_UPPER,
  MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER,
  MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER,
} from '../../labels/fy2026';

export function medicareLevyFamily(
  taxableIncome: Decimal,
  spouseIncome: Decimal,
  dependants: number,
): Decimal {
  const effectiveLower = new Decimal(MEDICARE_LEVY_FAMILY_LOWER)
    .plus(new Decimal(MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER).times(dependants));
  const effectiveUpper = new Decimal(MEDICARE_LEVY_FAMILY_UPPER)
    .plus(new Decimal(MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER).times(dependants));

  const combined = taxableIncome.plus(spouseIncome);

  if (combined.lessThanOrEqualTo(effectiveLower)) {
    return new Decimal(0);
  }

  if (combined.lessThan(effectiveUpper)) {
    // Shade-in: 10c per $1 of combined income above lower, capped at full 2% of own income
    const shaded = combined.minus(effectiveLower).times('0.10');
    const full = taxableIncome.times(MEDICARE_LEVY_RATE);
    return Decimal.min(shaded, full).toDecimalPlaces(2);
  }

  // Above upper threshold: full 2% on taxpayer's own taxable income
  return taxableIncome.times(MEDICARE_LEVY_RATE).toDecimalPlaces(2);
}
```

**Confidence:** MEDIUM-HIGH. The combined-income-test / individual-levy-charged pattern is consistent across all secondary sources and follows the ATO's stated family-threshold logic. No direct ATO formula page was accessible (403). The implementation mirrors exactly how the single function works but with combined income for the gate test.

### Pattern 3: `medicareLevySurchargeFamily` pure function

**Location:** `src/lib/tax/rates/fy2026/medicare.ts` (add after `medicareLevySurcharge`)

**Algorithm:**
1. If `hasPHC` → return `$0` (same as single)
2. Effective Tier 1 threshold = `MLS_FAMILY_TIER_1 + max(0, (dependants - 1)) × MLS_FAMILY_DEPENDANT_INCREMENT`
3. Effective Tier 2 threshold = `MLS_FAMILY_TIER_2 + max(0, (dependants - 1)) × MLS_FAMILY_DEPENDANT_INCREMENT`
4. Effective Tier 3 threshold = `MLS_FAMILY_TIER_3 + max(0, (dependants - 1)) × MLS_FAMILY_DEPENDANT_INCREMENT`
5. Compare `combinedIncome` against effective thresholds to determine tier
6. **Surcharge applied to taxpayer's own taxable income** (not combined) — verify

**Important: MLS surcharge is charged on taxpayer's own income, not combined.** The combined family income is used to DETERMINE which tier applies, but the surcharge rate is applied to the individual taxpayer's taxable income. This is confirmed by ATO's individual-assessment model — each person pays their own surcharge.

**Note on dependants-after-first:** Use `max(0, dependants - 1)` for the MLS increment. A family with 1 or 0 dependants uses the base threshold. 2 dependants → +$1,500. 3 dependants → +$3,000.

```typescript
export function medicareLevySurchargeFamily(
  combinedIncome: Decimal,
  ownTaxableIncome: Decimal,
  hasPHC: boolean,
  dependants: number,
): Decimal {
  if (hasPHC) return new Decimal(0);

  const increment = new Decimal(MLS_FAMILY_DEPENDANT_INCREMENT)
    .times(Math.max(0, dependants - 1));
  const t1 = new Decimal(MLS_FAMILY_TIER_1).plus(increment);
  const t2 = new Decimal(MLS_FAMILY_TIER_2).plus(increment);
  const t3 = new Decimal(MLS_FAMILY_TIER_3).plus(increment);

  let rate = new Decimal(0);
  if (combinedIncome.greaterThan(t3)) {
    rate = new Decimal(MLS_SINGLE_RATE_3); // 1.5% — same rate constants
  } else if (combinedIncome.greaterThan(t2)) {
    rate = new Decimal(MLS_SINGLE_RATE_2); // 1.25%
  } else if (combinedIncome.greaterThan(t1)) {
    rate = new Decimal(MLS_SINGLE_RATE_1); // 1.0%
  }

  return ownTaxableIncome.times(rate).toDecimalPlaces(2);
}
```

**Note on signature:** The function takes `combinedIncome` (for tier determination) AND `ownTaxableIncome` (for surcharge application) as separate parameters. This makes the distinction explicit and testable.

### Pattern 4: `MedicareLevyInput` widening

**What:** `MedicareLevyInput` (in `medicare.ts`) gains two optional fields:

```typescript
export interface MedicareLevyInput {
  taxableIncome: Decimal;
  hasPHC: boolean;
  filingStatus: 'single' | 'family';
  dependants?: number;        // NEW — Phase 8
  spouseIncome?: string;      // NEW — Phase 8 (decimal string, tolerant parse)
}
```

`MedicareLevyResult` shape is UNCHANGED (levy, surcharge, basis, familyWarning?). The `familyWarning` field transitions from "not yet supported" text to `undefined` when real family thresholds are applied. The existing `basis` field updates to describe family thresholds. No external callers are broken.

### Pattern 5: `computeIndividualReturn` widening

**Location:** `src/lib/tax/returns/fy2026/individual.ts`

**What changes (3–4 lines added):**

```typescript
// Step 1.5 (insert after aggregatedTurnover, before rollup):
import { isFamilyFiling } from './_helpers';

const isFamily = isFamilyFiling(entity);
const dependants = entity.dependants ?? 0;
// Tolerant parse: invalid spouseIncome → '0' + Anomaly
let spouseIncomeParsed = new Decimal(0);
let spouseIncomeAnomaly: Anomaly | undefined;
if (entity.spouseIncome !== undefined) {
  try {
    const parsed = new Decimal(entity.spouseIncome);
    if (parsed.isNegative()) throw new Error('negative');
    spouseIncomeParsed = parsed;
  } catch {
    spouseIncomeAnomaly = {
      id: 'family-data-warn',
      severity: 'warn',
      label: 'M1',
      message: 'Spouse income data invalid; family thresholds applied with $0 — verify input',
    };
  }
}

// Existing Step 4 — update medicareLevyFY2026 call:
const medicare = medicareLevyFY2026({
  taxableIncome: item15,
  hasPHC: true,
  filingStatus: isFamily ? 'family' : 'single',
  dependants: isFamily ? dependants : undefined,
  spouseIncome: isFamily ? entity.spouseIncome : undefined,
});

// Step 5 — replace the assumption-marital and assumption-dependants rows conditionally:
```

**Assumption row replacement logic:**

```typescript
// Replace static assumptionTexts tuple array with dynamic construction:
const medicareAssumptionText = isFamily
  ? `Family Medicare levy applied — ${dependants} dependants, spouse income $${entity.spouseIncome ?? '0'}. ` +
    `Family threshold $${MEDICARE_LEVY_FAMILY_LOWER}; per-dependant adjustment $${MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER}.`
  : 'Medicare exemption: none (full 2% levy applied unless shading applies)';

const dependantsAssumptionText = isFamily
  ? undefined   // absorbed into the family medicare row
  : 'Dependants: zero';

const maritalAssumptionText = isFamily
  ? undefined   // absorbed into the family medicare row
  : 'Marital status: single (no spouse income captured)';
```

The assumptions array must preserve the existing format used by `AssumptionsBlock`. Research finding: `AssumptionsBlock` currently renders the `ASSUMPTIONS` constant directly (hardcoded) and does NOT read from `result.meta.anomalies`. This means the component needs a prop-based widening to accept dynamic assumptions. See AssumptionsBlock Pattern below.

### Pattern 6: `AssumptionsBlock` prop widening

**Location:** `src/components/AssumptionsBlock.tsx`

**Current state:** Hardcoded `ASSUMPTIONS` constant, no props. The component does not read from engine output — it renders the same 5 strings always.

**Required change:** Add optional `assumptions` prop; default to `ASSUMPTIONS` for backward compat. Zero callers other than `TaxReturnAssistant.tsx` (grep confirms one usage).

```typescript
interface AssumptionsBlockProps {
  /** Override assumptions list. Defaults to the Phase 5 static ASSUMPTIONS constant. */
  assumptions?: string[];
}

export function AssumptionsBlock({ assumptions }: AssumptionsBlockProps = {}): React.JSX.Element {
  const rows = assumptions ?? ASSUMPTIONS;
  // ... rest of render unchanged
}
```

**`TaxReturnAssistant.tsx` change:** Extract the computed assumptions list from `result.meta` and pass it:

```typescript
// In TaxReturnAssistant.tsx — derive from anomalies array (info-severity assumption rows):
const assumptionRows = result.meta.anomalies
  .filter(a => a.id.startsWith('assumption-'))
  .map(a => a.message);

// Then:
<AssumptionsBlock assumptions={assumptionRows.length > 0 ? assumptionRows : undefined} />
```

This approach means the engine drives the assumptions list via the existing anomalies channel (already used for assumption rows in `individual.ts`). The `TaxReturnAssistant` component change is minimal — one derived variable and one prop pass.

**Alternative approach:** Add a dedicated `meta.assumptions: string[]` field on `IndividualReturn.meta`. This is cleaner but requires a meta-shape widening. Either works; the anomaly-filter approach reuses existing infrastructure with zero new types.

### Pattern 7: v5-to-v6 migration

**Location:** `src/lib/migrations/v5-to-v6.ts` (NEW FILE)

**Shape (mirrors v4-to-v5.ts exactly):**

```typescript
/**
 * Migration v5 → v6 (additive only — Phase 8).
 *
 * Adds two optional Entity fields (Individual-only semantics, but stored on all entity types):
 *   - dependants?: number       — dependant-child count for Medicare family threshold
 *   - spouseIncome?: string     — decimal string; spouse's taxable income for FY
 *
 * Both default to undefined. Non-destructive: every existing field preserved.
 */
import type { PersistedRoot } from './index.js';

export function migrateV5ToV6(state: PersistedRoot): PersistedRoot {
  if (state._v >= 6) return state;

  const entities = ((state.entities as Array<Record<string, unknown>> | undefined) ?? [])
    .map((e) => ({
      ...e,
      dependants: (e as Record<string, unknown>).dependants as number | undefined,
      spouseIncome: (e as Record<string, unknown>).spouseIncome as string | undefined,
    }));

  return { ...state, _v: 6, entities };
}
```

**`migrations/index.ts` changes:**
1. Import `migrateV5ToV6`
2. Add `5: migrateV5ToV6` to `MIGRATIONS` registry
3. Bump `CURRENT_VERSION` to `6`

**Type safety note:** The `PersistedRoot` interface uses `entities?: unknown` — the same pattern as v4-to-v5. The entity cast approach is correct.

### Pattern 8: EntityForm field insertion

**Insertion point:** Inside the `<div className="... Tax calculation settings ...">` section (currently at lines ~438–490 of EntityForm.tsx). The new fields go AFTER the existing `paygInstalmentAmount` block, INSIDE the `{/* Phase 5 — v4 AU tax fields */}` section div, wrapped in `{formData.type === 'Individual' && (...)}`.

**Field shape (two new blocks):**

```tsx
{/* Phase 8 — v6 Medicare family fields (Individual only) */}
{formData.type === 'Individual' && (
  <>
    <div className="space-y-2">
      <label
        htmlFor="entity-dependants"
        className="text-xs font-bold uppercase text-gray-500 tracking-wider block"
      >
        Dependant children
      </label>
      <input
        id="entity-dependants"
        type="number"
        min={0}
        step={1}
        aria-label="Dependant children count"
        value={formData.dependants ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          setFormData({
            ...formData,
            dependants: v === '' ? undefined : Math.max(0, parseInt(v, 10) || 0),
          });
        }}
        placeholder="0"
        className="w-full p-2 border border-[var(--line)] focus:ring-1 focus:ring-[var(--ink)] outline-none font-mono transition-colors"
      />
      <p className="text-xs text-gray-500">
        Number of children under 18 you supported (used for Medicare levy family thresholds).
      </p>
    </div>

    <div className="space-y-2">
      <label
        htmlFor="entity-spouse-income"
        className="text-xs font-bold uppercase text-gray-500 tracking-wider block"
      >
        Spouse taxable income ($)
      </label>
      <input
        id="entity-spouse-income"
        type="text"
        aria-label="Spouse taxable income ($)"
        value={formData.spouseIncome ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          setFormData({
            ...formData,
            spouseIncome: v === '' ? undefined : v,
          });
        }}
        placeholder="0.00"
        className="w-full p-2 border border-[var(--line)] focus:ring-1 focus:ring-[var(--ink)] outline-none font-mono transition-colors"
      />
      <p className="text-xs text-gray-500">
        Your spouse's taxable income for the financial year. Required if you had a spouse for any part of the year.
      </p>
    </div>
  </>
)}
```

**Grid consideration:** The existing 'Tax calculation settings' section uses `grid-cols-2`. The two new fields can be added inside the same grid, making it a 4-column-equivalent layout on md screens. Or they can be placed in a new sub-grid block after the existing 2 fields. Either works — planner picks based on visual density.

### Anti-Patterns to Avoid

- **Charging family levy on combined income in the above-upper-threshold zone.** The combined income TEST gates the shade-in reduction, but the 2% rate is always on the individual's own taxable income.
- **Using a single `DEPENDANT_INCREMENT` constant for both lower and upper family Medicare levy thresholds.** They are different values ($4,338 vs $5,422) — two constants required.
- **Applying MLS per-dependant increment starting from dependant #1.** The ATO "each after the first" rule means a family with 1 child has no increment; increment starts at dependant #2. Use `max(0, dependants - 1) × $1,500`.
- **Hardcoding assumption text in AssumptionsBlock.** The component must accept a dynamic prop; family assumption rows are engine-driven, not component-driven.
- **Breaking the `MedicareLevyResult` shape.** The `familyWarning` field may be dropped or reused; the `levy`, `surcharge`, `basis` fields are unchanged. Downstream callers in `individual.ts` must not break.
- **Writing the migration with `_v >= 6` guard but forgetting to update `CURRENT_VERSION` in index.ts.** Always bump both together.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Decimal string parse with negative-guard | Custom regex | `new Decimal(str)` + `.isNegative()` check | decimal.js already handles parse errors + provides `.isNaN()` / `.isFinite()` for robust validation |
| Per-dependant threshold calculation | Inline arithmetic in orchestrator | Named constants `FAMILY_LOWER` + `DEPENDANT_INCREMENT_LOWER` + pure function | Inline arithmetic in orchestrator is untestable; named constants make golden tests self-documenting |
| Combined income calculation | Repeat `taxableIncome.plus(spouseIncome)` in multiple places | Single `combined` variable inside `medicareLevyFamily` | Avoids potential for the wrong income being used in different code paths |
| AssumptionsBlock rendering | A new component for family assumptions | Prop-widen existing `AssumptionsBlock` | Zero new components; family row is just another assumption string |

**Key insight:** The complexity is in the two-increment system (lower vs upper) and in the combined-for-test / individual-for-levy nuance. Get these two details right with golden tests and the rest is straightforward arithmetic.

---

## Common Pitfalls

### Pitfall 1: Wrong base for the levy in the full-rate zone
**What goes wrong:** Combined income exceeds family upper threshold → levy computed as `combinedIncome × 0.02` → both spouses share one levy pool → wrong.
**Correct approach:** `taxableIncome × 0.02` (each taxpayer's own income). Combined income is only used for the threshold test.
**Warning signs:** A test with `taxableIncome = $40k, spouseIncome = $80k` should return `$800` (2% × $40k), not `$2,400` (2% × $120k).

### Pitfall 2: Single per-dependant increment applied to both lower and upper thresholds
**What goes wrong:** Using one constant for both thresholds → upper threshold shifts by wrong amount → shade-in band wrong width.
**Correct approach:** Two constants: `DEPENDANT_INCREMENT_LOWER = 4338`, `DEPENDANT_INCREMENT_UPPER = 5422`.
**Warning signs:** A test with 2 dependants should have lower = $47,238 + $8,676 = $55,914 and upper = $59,047 + $10,844 = $69,891. If they use the same increment, either the lower or upper is wrong.

### Pitfall 3: MLS increment applied from dependant #1
**What goes wrong:** `effectiveTier = BASE + dependants × $1,500` (not "after first") → a family with 1 child gets $1,500 extra threshold they shouldn't have.
**Correct approach:** `max(0, dependants - 1) × $1,500`. The base $202,000 already accounts for the first child in the ATO's threshold structure.
**Warning signs:** A test with 1 dependant should give Tier 1 threshold = $202,000. A test with 2 dependants should give $203,500.

### Pitfall 4: `spouseIncome: "0"` treated as absent (triggers single instead of family)
**What goes wrong:** `entity.spouseIncome === "0"` → code checks `if (!entity.spouseIncome)` which is falsy in JS → treated as single → wrong.
**Correct approach:** `entity.spouseIncome !== undefined` (explicit undefined check). `"0"` is a valid present value (spouse exists but earns $0).
**Warning signs:** A test with `spouseIncome: "0"` should use family thresholds. If it falls back to single, the check is wrong.

### Pitfall 5: `AssumptionsBlock` still shows the static 5-row list for family entities
**What goes wrong:** `TaxReturnAssistant.tsx` calls `<AssumptionsBlock />` without props → always shows "Marital status: single" even for family entities.
**Correct approach:** Derive assumption rows from `result.meta.anomalies` filtered by `id.startsWith('assumption-')`, pass to `<AssumptionsBlock assumptions={...} />`.
**Warning signs:** Form I for a family entity shows "Dependants: zero" and "Marital status: single" — obvious contradiction with the family assumption row.

### Pitfall 6: Round-trip test `CURRENT_VERSION` mismatch
**What goes wrong:** `CURRENT_VERSION` updated to 6 but the round-trip test still asserts `toBe(5)`.
**Correct approach:** Update the round-trip test assertion (line 63 in current `round-trip.test.ts`) AND add a `// v5→v6 new fields are undefined` block mirroring the v4→v5 pattern.
**Warning signs:** Test output shows "Expected 5, received 6" on the `_v` assertion.

### Pitfall 7: Stale threshold corrections break existing Phase 5 tests
**What goes wrong:** Correcting `MEDICARE_LEVY_SINGLE_LOWER` from `27222` to `28011` causes existing golden tests in `src/lib/tax/rates/__tests__/medicare.test.ts` to fail.
**Correct approach:** Update the boundary test values to match corrected FY2025-26 constants. These are not regressions — they are correct-the-constants corrections. Update both the constants AND the tests in Wave 0.
**Warning signs:** `medicare.test.ts` failures at boundaries `$27,222`/`$34,028` after Wave 0 constants change.

---

## Code Examples

### Family Medicare levy — single-parent scenario (verified logic)

```typescript
// Single parent: dependants=2, spouseIncome=undefined → treat as $0
const taxableIncome = new Decimal('45000');
const spouseIncome = new Decimal('0');      // spouseIncome undefined → $0
const dependants = 2;

// effectiveLower = 47238 + (2 × 4338) = 47238 + 8676 = 55914
// effectiveUpper = 59047 + (2 × 5422) = 59047 + 10844 = 69891
// combined = 45000 + 0 = 45000
// 45000 ≤ 55914 → no levy → $0.00
const result = medicareLevyFamily(taxableIncome, spouseIncome, dependants);
// Expected: new Decimal('0')
```

### Family Medicare levy — DINK scenario (verified logic)

```typescript
// DINK: dependants=0, spouseIncome="80000"
const taxableIncome = new Decimal('90000');
const spouseIncome = new Decimal('80000');
const dependants = 0;

// effectiveLower = 47238 + 0 = 47238
// effectiveUpper = 59047 + 0 = 59047
// combined = 90000 + 80000 = 170000
// 170000 ≥ 59047 → full 2% on own income
// levy = 90000 × 0.02 = 1800.00
const result = medicareLevyFamily(taxableIncome, spouseIncome, dependants);
// Expected: new Decimal('1800.00')
```

### Family MLS — 2-dependant family above Tier 1

```typescript
// Family with 2 kids, spouseIncome=100000, own=120000
const combinedIncome = new Decimal('220000'); // 120000 + 100000
const ownIncome = new Decimal('120000');
const hasPHC = false;
const dependants = 2;

// increment = max(0, 2-1) × 1500 = 1500
// effectiveTier1 = 202000 + 1500 = 203500
// effectiveTier2 = 236000 + 1500 = 237500
// effectiveTier3 = 316000 + 1500 = 317500
// combined=220000 > 203500 but < 237500 → Tier 1 rate 1%
// surcharge = 120000 × 0.01 = 1200.00
const result = medicareLevySurchargeFamily(combinedIncome, ownIncome, hasPHC, dependants);
// Expected: new Decimal('1200.00')
```

### Anomaly for bad spouseIncome data

```typescript
// entity.spouseIncome = 'abc' → parse fails
const anomaly: Anomaly = {
  id: 'family-data-warn',
  severity: 'warn',
  label: 'M1',
  message: 'Spouse income data invalid; family thresholds applied with $0 — verify input',
};
```

### Zod schema widening (confirmed pattern from existing schemas.ts)

```typescript
// src/lib/schemas.ts — add after wizardState block, inside EntitySchema:
// v6 additions (Phase 8)
dependants: z.number().int().nonnegative().optional(),
spouseIncome: z.string().optional(),  // decimal string; engine validates on use
```

Note: The existing schema uses `z.string().optional()` for `aggregatedTurnover` without a custom refine (no `decimalStringNonNegative` refinement exists in the schema). The CONTEXT.md references a `decimalStringNonNegative` refinement but the existing code does not have one — plain `z.string().optional()` is the established pattern for decimal-string fields. For Phase 8, match the existing pattern: `spouseIncome: z.string().optional()`. Engine-level validation (tolerant parse + Anomaly) is the established approach for bad decimal strings.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Family → flat 2% + familyWarning | Family → real threshold engine | Phase 8 | Accurate Medicare levy for low/medium family incomes; families below $47,238 combined now pay $0 (not 2%) |
| Single thresholds $27,222/$34,028 (stale) | Corrected $28,011/$35,014 | Phase 8 (fixing Phase 5 stale constants) | Single low-income individuals near the threshold get corrected levy amounts |
| MLS Tier 3 $144,000 single / $288,000 family (stale) | Corrected $158,000 / $316,000 | Phase 8 (fixing Phase 5 stale constants) | High-income earners without PHC get correct MLS rates |
| Static ASSUMPTIONS 5-row constant | Dynamic `assumptions` prop | Phase 8 | AssumptionsBlock reflects actual engine state for family entities |

**Deprecated/outdated in Phase 8:**
- `familyWarning` field on `MedicareLevyResult` — was always "not yet supported" text; now either `undefined` (family thresholds applied correctly) or omitted. Field stays in the interface for backward compat but is no longer populated with warning text.
- Phase 5 caveat text in `AssumptionsBlock` ("Phase 6 wizard will capture real values") — becomes inaccurate once family fields exist on EntityForm. Planner should remove or update this caveat text as part of Wave 2.

---

## Open Questions

1. **Shade-in formula: combined income or individual income in the shading zone?**
   - What we know: ATO uses combined income for the threshold test; levy at full-rate is on individual income.
   - What's unclear: In the shade-in zone (`effectiveLower < combined < effectiveUpper`), is the shaded amount `(combined - lower) × 0.10` or `(taxpayerOwnIncome - lower) × 0.10`?
   - Recommendation: Use `(combined - lower) × 0.10` constrained to not exceed `taxpayerIncome × 0.02`. This matches the ATO's stated "10c per $1 of income above the threshold" where "income" is the family combined income that exceeded the threshold. The `Decimal.min(shaded, full)` pattern from `medicareLevySingle` applies here too.
   - Confidence: MEDIUM — no worked ATO example was accessible. The combined-for-shading interpretation is the most logical given that the threshold test is on combined income.

2. **Whether `MLS_FAMILY_DEPENDANT_INCREMENT` applies to ALL tiers or only Tier 0**
   - What we know: ATO says "threshold increases by $1,500 per dependant after the first" — the "threshold" is the Tier 0 base threshold.
   - What's unclear: Do Tier 1 and Tier 2 boundaries shift identically by $1,500?
   - Research finding: mlscalculator.com.au says "the family Tier 0 threshold increases by $1,500... This effectively shifts all tier cutoffs upward." This implies ALL tier boundaries shift by the same $1,500 increment — apply it to Tier 1, 2, and 3 equally.
   - Recommendation: Apply `max(0, dependants-1) × 1500` to ALL three tier thresholds equally.

3. **Whether Phase 8 should bundle the stale-constant corrections with Wave 0**
   - What we know: Four constants are stale from FY2024-25 values; they need correction.
   - What's unclear: Should corrections be a separate commit, or bundled into the Wave 0 constants widening?
   - Recommendation: Bundle with Wave 0. The constants file is touched exactly once (additive widening + corrections). Separate commits add noise. The corrected single-threshold tests in `medicare.test.ts` flip from "golden with wrong values" to "golden with right values" in the same Wave 0 pass.

---

## Validation Architecture

Nyquist validation is enabled (`nyquist_validation: true` in `.planning/config.json`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (already installed and configured) |
| Config file | `vite.config.ts` (Vitest config embedded) |
| Quick run command | `npx vitest run --reporter=verbose src/lib/tax/rates/__tests__/medicare.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| MED-01 | v5→v6 migration adds dependants/spouseIncome as undefined; bumps _v to 6 | unit | `npx vitest run src/lib/migrations/__tests__/v5-to-v6.test.ts` | Wave 0 |
| MED-01 | Round-trip v0→v6 preserves all fields; new fields default undefined | unit | `npx vitest run src/lib/migrations/__tests__/round-trip.test.ts` | Extend existing |
| MED-01 | EntitySchema validates dependants (int ≥ 0) and spouseIncome (string, optional) | unit | `npx vitest run src/lib/schemas.test.ts` (if exists) | Wave 0 |
| MED-02 | medicareLevyFamily: single-parent (0 spouse income, 2 dependants) → $0 when below threshold | unit | `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts` | Extend existing |
| MED-02 | medicareLevyFamily: DINK case full 2% on own income when combined above upper | unit | `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts` | Extend existing |
| MED-02 | medicareLevyFamily: shade-in zone returns correct shaded amount | unit | `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts` | Extend existing |
| MED-02 | medicareLevySurchargeFamily: PHC=true → $0 regardless | unit | `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts` | Extend existing |
| MED-02 | medicareLevySurchargeFamily: 2-dependant family → Tier 1 applied correctly | unit | `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts` | Extend existing |
| MED-02 | isFamilyFiling: both-undefined→false; spouseIncome-only→true; dependants-1→true | unit | `npx vitest run src/lib/tax/returns/fy2026/__tests__/helpers.test.ts` | Wave 0 |
| MED-02 | computeIndividualReturn: entity with dependants:2 + spouseIncome:"60000" → M1 matches gold value | unit | `npx vitest run src/lib/tax/__tests__/individual.test.ts` | Extend existing |
| MED-02 | computeIndividualReturn: entity with no family fields → unchanged Phase 5 M1/M2 behaviour | unit (regression) | `npx vitest run src/lib/tax/__tests__/individual.test.ts` | Extend existing |
| MED-02 | computeIndividualReturn: bad spouseIncome "abc" → M1 uses $0 spouse + anomaly emitted | unit | `npx vitest run src/lib/tax/__tests__/individual.test.ts` | Extend existing |
| MED-03 | Form I for family entity shows family assumption row (not flat-2% warning) | component | `npx vitest run src/components/__tests__/TaxReturnAssistant.test.tsx` (if exists) | Wave 2 |
| MED-03 | AssumptionsBlock renders dynamic prop when provided | unit | `npx vitest run src/components/__tests__/AssumptionsBlock.test.tsx` (if exists) | Wave 2 |
| MED-04 | EntityForm shows dependants + spouseIncome fields ONLY when type=Individual | component | `npx vitest run src/components/__tests__/EntityForm.test.tsx` (if exists) | Wave 2 |
| MED-04 | EntityForm dependants field: blank → undefined (not "0"); integer parsing correct | component | `npx vitest run src/components/__tests__/EntityForm.test.tsx` | Wave 2 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts src/lib/migrations/__tests__/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green (848+ SPA GREEN, 0 RED) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/migrations/__tests__/v5-to-v6.test.ts` — covers MED-01 migration + idempotency + field preservation
- [ ] `src/lib/tax/returns/fy2026/__tests__/helpers.test.ts` — covers `isFamilyFiling` predicate (3 cases)
- [ ] Extend `src/lib/tax/rates/__tests__/medicare.test.ts` — add family-threshold test cases + update stale single-threshold boundary values
- [ ] Extend `src/lib/migrations/__tests__/round-trip.test.ts` — v0→v6 assertions (add `dependants`/`spouseIncome` undefined block)

---

## Sources

### Primary (HIGH confidence)

- AusTax.tools Medicare Levy Low-Income Thresholds 2025-26 uplift article — FY2025-26 uplifted single and family thresholds ($28,011/$35,014 single; $47,238/$59,047 family; $4,338/$5,422 per-dependant)
- mlscalculator.com.au FY2025-26 MLS thresholds — confirmed Tier 1/2/3 for singles ($101k/$118k/$158k) and families ($202k/$236k/$316k); per-dependant $1,500 applies to all tier boundaries
- William Buck Australia "Tax Rates and Thresholds 2025-26" — family Medicare levy lower $45,907→$47,238 (FY24-25 vs FY25-26), upper $57,383→$59,047; per-dependant lower $4,216→$4,338, upper $5,270→$5,422
- ACT Tax Group MLS Thresholds page — confirmed family Tier 1 $202,001–$236,000; Tier 2 $236,001–$316,000; Tier 3 $316,001+; $1,500 per dependant after first
- Direct codebase inspection: `medicare.ts`, `fy2026.ts`, `individual.ts`, `_helpers.ts`, `AssumptionsBlock.tsx`, `EntityForm.tsx`, `schemas.ts`, `types.ts`, `v4-to-v5.ts`, `migrations/index.ts`, `round-trip.test.ts`

### Secondary (MEDIUM confidence)

- boxas.com.au MLS thresholds FY2025-26 — corroborates $158k single Tier 3 and $316k family Tier 3
- austax.tools Medicare levy + MLS calculator — corroborates single MLS Tier 3 $158k
- ATO web search summaries (ATO pages returned 403) — consistent with secondary sources on Tier 1 $202,000 base threshold

### Tertiary (LOW confidence)

- thekalculators.com.au Medicare levy guide — provided FY2025-26 lower threshold $43,846 and per-dependant $4,027 (these appear to be FY2024-25 values; disregard in favour of William Buck and AusTax.tools which show the 2.9% uplift applied)
- fairworkmate.com.au — showed inconsistent MLS values not matching FY2025-26; disregarded

---

## Metadata

**Confidence breakdown:**
- FY2025-26 threshold constants: HIGH — multiple concordant sources; confirmed 2.9% uplift
- Algorithm (combined-for-test, individual-for-levy): MEDIUM — no direct ATO formula page accessed (403); consistent across secondary sources; mirrors the well-established single-threshold pattern
- Migration shape: HIGH — direct codebase inspection of v4-to-v5.ts reference
- EntityForm insertion point: HIGH — direct codebase inspection (line ~490, existing Individual-conditional pattern)
- AssumptionsBlock hardcoding: HIGH — direct codebase inspection confirms no dynamic prop exists today
- Stale constant identification: HIGH — cross-checked existing code values against multiple sources

**Research date:** 2026-05-30
**Valid until:** 2026-06-30 (stable ATO constants for FY2025-26 are locked; thresholds won't change until FY2026-27 indexation)
