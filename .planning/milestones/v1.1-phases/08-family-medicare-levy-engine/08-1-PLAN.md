---
phase: 08-family-medicare-levy-engine
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/types.ts
  - src/lib/schemas.ts
  - src/lib/migrations/v5-to-v6.ts
  - src/lib/migrations/index.ts
  - src/lib/migrations/__tests__/v5-to-v6.test.ts
  - src/lib/migrations/__tests__/round-trip.test.ts
  - src/lib/migrations/__tests__/index.test.ts
  - src/lib/tax/labels/fy2026.ts
  - src/lib/tax/rates/fy2026/medicare.ts
  - src/lib/tax/rates/__tests__/medicare.test.ts
  - src/lib/tax/returns/fy2026/_helpers.ts
  - src/lib/tax/returns/fy2026/__tests__/helpers.test.ts
autonomous: true
tdd: true
requirements: [MED-01, MED-02]
must_haves:
  truths:
    - "v5→v6 migration bumps _v to 6 and leaves dependants/spouseIncome undefined on existing entities"
    - "Round-trip v0→v6 preserves every prior field and emits dependants/spouseIncome as undefined"
    - "FY2025-26 stale single Medicare lower/upper thresholds and MLS Tier 3 (single + family) are corrected to ATO values"
    - "5 new FY2025-26 family Medicare/MLS constants exist as string literals in fy2026.ts"
    - "medicareLevyFamily(taxableIncome, spouseIncome, dependants) returns $0 below effective lower, shaded amount in zone, full 2% of own income above effective upper"
    - "medicareLevySurchargeFamily(combined, own, hasPHC, dependants) returns $0 when hasPHC=true; otherwise tier-based on combined income with $1,500-per-dependant-after-first increment applied to all 3 tier thresholds; surcharge charged on own income"
    - "isFamilyFiling(entity) returns true iff dependants>=1 OR spouseIncome!==undefined; false when both undefined; spouseIncome='0' triggers family"
    - "All existing 848 SPA tests stay GREEN; ~20 new tests added; 0 RED tests at end of plan"
  artifacts:
    - path: "src/lib/migrations/v5-to-v6.ts"
      provides: "Additive v5→v6 migration adding dependants?/spouseIncome? to entities"
      contains: "export function migrateV5ToV6"
    - path: "src/lib/migrations/__tests__/v5-to-v6.test.ts"
      provides: "Migration unit tests (bump _v, idempotent, preserve fields, entities-undefined-as-empty)"
      contains: "describe('migrateV5ToV6'"
    - path: "src/lib/tax/rates/fy2026/medicare.ts"
      provides: "Family Medicare levy + MLS pure functions; widened MedicareLevyInput; rewritten family branch in medicareLevyFY2026 orchestrator"
      contains: "export function medicareLevyFamily"
    - path: "src/lib/tax/returns/fy2026/_helpers.ts"
      provides: "isFamilyFiling(entity) predicate"
      contains: "export function isFamilyFiling"
    - path: "src/lib/tax/returns/fy2026/__tests__/helpers.test.ts"
      provides: "isFamilyFiling unit tests (4 cases)"
      contains: "describe('isFamilyFiling'"
  key_links:
    - from: "src/lib/migrations/index.ts"
      to: "src/lib/migrations/v5-to-v6.ts"
      via: "MIGRATIONS[5] registration + CURRENT_VERSION = 6"
      pattern: "5:\\s*migrateV5ToV6"
    - from: "src/lib/tax/rates/fy2026/medicare.ts"
      to: "src/lib/tax/labels/fy2026.ts"
      via: "import of 5 new family constants"
      pattern: "MEDICARE_LEVY_FAMILY_LOWER|MEDICARE_LEVY_FAMILY_UPPER|MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER|MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER|MLS_FAMILY_DEPENDANT_INCREMENT"
    - from: "src/types.ts"
      to: "src/lib/schemas.ts"
      via: "EntitySchema mirrors Entity widening additively (dependants + spouseIncome)"
      pattern: "dependants:\\s*z\\.number\\(\\)\\.int\\(\\)\\.nonnegative\\(\\)\\.optional|spouseIncome:\\s*z\\.string\\(\\)\\.optional"
---

<objective>
Wave 0/1 foundations for Phase 8: ship the v5→v6 additive schema migration (Entity gains `dependants?` + `spouseIncome?`), correct 4 STALE FY2024-25 constants in `fy2026.ts` to the correct FY2025-26 ATO values, add 5 new FY2025-26 family Medicare + MLS constants, and implement 2 pure family-engine functions (`medicareLevyFamily`, `medicareLevySurchargeFamily`) + 1 eligibility predicate (`isFamilyFiling`) — all tested in isolation. No UI changes; no `computeIndividualReturn` widening (that's Plan 08-2). 848 SPA GREEN baseline preserved end-of-plan.

Purpose: De-risk the math, the constants, and the migration BEFORE any UI integration. Subsequent plan can wire these pieces with confidence and short Action sections.

Output: 5 new constants + 4 corrected constants in `fy2026.ts`; new `v5-to-v6.ts` migration with tests; widened `MedicareLevyInput` interface + 2 new pure family functions in `medicare.ts`; `isFamilyFiling` predicate in `_helpers.ts`; updated single-Medicare boundary tests reflecting corrected constants; new family-engine + predicate tests. Expected: ~868–873 SPA GREEN (+20 to +25 from baseline 848); 0 RED.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/08-family-medicare-levy-engine/08-CONTEXT.md
@.planning/phases/08-family-medicare-levy-engine/08-RESEARCH.md
@.planning/phases/08-family-medicare-levy-engine/08-VALIDATION.md
@src/lib/tax/labels/fy2026.ts
@src/lib/tax/rates/fy2026/medicare.ts
@src/lib/tax/rates/__tests__/medicare.test.ts
@src/lib/tax/returns/fy2026/_helpers.ts
@src/lib/migrations/v4-to-v5.ts
@src/lib/migrations/index.ts
@src/lib/migrations/__tests__/v4-to-v5.test.ts
@src/lib/migrations/__tests__/round-trip.test.ts
@src/lib/migrations/__tests__/index.test.ts
@src/types.ts
@src/lib/schemas.ts

<interfaces>
<!-- Critical existing types/exports the executor will consume. -->

From src/types.ts (Entity — additive widening target):
```typescript
export interface Entity {
  _v?: number;
  id: string;
  name: string;
  type: 'Company' | 'Trust' | 'Individual' | 'Partnership' | string;
  // ...existing _v:3, _v:4, _v:5 fields preserved...
  // _v:6 ADDITIONS (this plan):
  dependants?: number;        // dependant-child count for family Medicare threshold
  spouseIncome?: string;      // decimal string; spouse's taxable income for FY
}
```

From src/lib/migrations/index.ts:
```typescript
export interface PersistedRoot { _v: number; entities?: unknown; allEntries?: unknown; auditLogs?: unknown; accounts?: unknown; }
export const CURRENT_VERSION = 5;  // BUMP TO 6 in this plan
const MIGRATIONS: Record<number, MigrationFn> = { 0: ..., 1: migrateV1ToV2, 2: migrateV2ToV3, 3: migrateV3ToV4, 4: migrateV4ToV5 };
// ADD 5: migrateV5ToV6
```

From src/lib/migrations/v4-to-v5.ts (REFERENCE shape — Phase 8 v5→v6 mirrors this exactly):
```typescript
export function migrateV4ToV5(state: PersistedRoot): PersistedRoot {
  if (state._v >= 5) return state;
  const entities = ((state.entities as Entity[] | undefined) ?? []).map((e): Entity => ({
    ...e,
    returnStatusByFy: (e as Entity & { returnStatusByFy?: Record<string, 'draft' | 'finalised'> }).returnStatusByFy,
    wizardState: (e as Entity & { wizardState?: Record<string, WizardStateFy> }).wizardState,
  }));
  return { ...state, _v: 5, entities };
}
```

From src/lib/tax/rates/fy2026/medicare.ts (EXISTING — surgical widening target):
```typescript
export function medicareLevySingle(taxableIncome: Decimal): Decimal;
export function medicareLevySurcharge(taxableIncome: Decimal, hasPHC: boolean, filingStatus: 'single' | 'family' = 'single'): Decimal;
export interface MedicareLevyInput { taxableIncome: Decimal; hasPHC: boolean; filingStatus: 'single' | 'family'; }
export interface MedicareLevyResult { levy: Decimal; surcharge: Decimal; basis: string; familyWarning?: string; }
export function medicareLevyFY2026(input: MedicareLevyInput): MedicareLevyResult;
```

From src/lib/tax/labels/fy2026.ts (STALE values to CORRECT — lines 496, 498, 506, 514):
```typescript
// STALE FY2024-25 values currently in file:
export const MEDICARE_LEVY_SINGLE_LOWER = '27222' as const;   // CORRECT TO '28011'
export const MEDICARE_LEVY_SINGLE_UPPER = '34028' as const;   // CORRECT TO '35014'
export const MLS_SINGLE_TIER_3 = '144000' as const;            // CORRECT TO '158000'
export const MLS_FAMILY_TIER_3 = '288000' as const;            // CORRECT TO '316000'
```

From src/lib/tax/returns/fy2026/_helpers.ts (additive — append `isFamilyFiling`):
```typescript
// Existing exports:
export function filterPostedEntries(entries: JournalEntry[]): JournalEntry[];
export function rollupByLabel<LabelKey extends string>(...): Record<LabelKey, Decimal>;
// ADD:
export function isFamilyFiling(entity: Entity): boolean;
```

From src/lib/money.ts (used everywhere — Phase 1 invariant):
```typescript
export { Decimal } from 'decimal.js';  // money never touches native floats
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Widen Entity + EntitySchema (v6 additive) and write v5→v6 migration + tests</name>
  <files>
    src/types.ts,
    src/lib/schemas.ts,
    src/lib/migrations/v5-to-v6.ts,
    src/lib/migrations/index.ts,
    src/lib/migrations/__tests__/v5-to-v6.test.ts,
    src/lib/migrations/__tests__/round-trip.test.ts,
    src/lib/migrations/__tests__/index.test.ts
  </files>
  <read_first>
    - src/types.ts (Entity interface — line 27–62; add `_v:6` additions after line 61)
    - src/lib/schemas.ts (EntitySchema — line 35–66; add v6 additions after line 65)
    - src/lib/migrations/v4-to-v5.ts (REFERENCE for migration shape; copy structure exactly)
    - src/lib/migrations/index.ts (MIGRATIONS registry + CURRENT_VERSION; line 33–50)
    - src/lib/migrations/__tests__/v4-to-v5.test.ts (REFERENCE for test structure; 6 test cases)
    - src/lib/migrations/__tests__/round-trip.test.ts (extend v0→v5 round-trip to v0→v6; add dependants/spouseIncome undefined assertions after line 79)
    - src/lib/migrations/__tests__/index.test.ts (update `CURRENT_VERSION is 5` assertion to 6)
    - .planning/phases/08-family-medicare-levy-engine/08-RESEARCH.md § "Pattern 7: v5-to-v6 migration" (lines 433–470)
    - .planning/phases/08-family-medicare-levy-engine/08-CONTEXT.md § Domain — "v5→v6 additive schema migration" decision
  </read_first>
  <behavior>
    - Test V5V6-1: `migrateV5ToV6({_v:5, entities:[{...v5fields}]})` returns `{_v:6, entities:[{...v5fields, dependants: undefined, spouseIncome: undefined}]}`
    - Test V5V6-2: idempotent — `migrateV5ToV6({_v:6, ...})` returns the same object reference (no mutation)
    - Test V5V6-3: preserves ALL existing v3/v4/v5 fields verbatim (gstRegistered, accountingMethod, fyEndDate, lockedFys, beneficiaries, partners, aggregatedTurnover, paygInstalmentAmount, returnStatusByFy, wizardState)
    - Test V5V6-4: `{_v:5}` (entities undefined) → output has entities=[] and _v=6
    - Test V5V6-5: preserves preset dependants (e.g. `dependants: 2`) when present on input
    - Test V5V6-6: preserves preset spouseIncome (e.g. `spouseIncome: "60000"`) when present on input
    - Test ROUND-1 (extend): v0→v6 hand-built blob migrates cleanly; existing v0→v5 assertions still pass; NEW assertions: `entities[0].dependants === undefined`, `entities[0].spouseIncome === undefined`
    - Test ROUND-2: `migrate({_v: 7})` still throws "newer than" (already covered by Test 2.2 — verify it still passes with CURRENT_VERSION=6 → newerBlob._v=7)
    - Test INDEX-1: `CURRENT_VERSION === 6` (UPDATE existing assertion from 5 to 6)
  </behavior>
  <action>
    1. **src/types.ts** — add to `Entity` interface (after line 61, before closing brace):
       ```typescript
         // _v:6 additions (Phase 8 — Family Medicare Levy Engine)
         /** Dependant-child count for Medicare family threshold calculation (MED-01). Optional; undefined = single-person thresholds applied. */
         dependants?: number;
         /** Spouse's taxable income for the FY as decimal string (MED-01). Optional; undefined = no spouse data captured. Explicit "0" triggers family with $0 spouse income. */
         spouseIncome?: string;
       ```

    2. **src/lib/schemas.ts** — add to `EntitySchema` (after line 65, before closing `})`):
       ```typescript
         // v6 additions (Phase 8)
         dependants: z.number().int().nonnegative().optional(),
         spouseIncome: z.string().optional(),
       ```
       Note: NO custom `.refine()` for `spouseIncome` — match existing `aggregatedTurnover` pattern (plain `z.string().optional()`); engine-level tolerant parse handles bad data via Anomaly emission (per CONTEXT decision, deferred to Plan 08-2).

    3. **src/lib/migrations/v5-to-v6.ts** (NEW FILE) — exact content:
       ```typescript
       /**
        * @license
        * SPDX-License-Identifier: Apache-2.0
        *
        * Migration v5 → v6 (additive only — Phase 8).
        *
        * Adds two optional Entity fields (Individual-only semantics, but stored on all entity types):
        *   - dependants?: number       — dependant-child count for Medicare family threshold (MED-01)
        *   - spouseIncome?: string     — decimal string; spouse's taxable income for FY (MED-01)
        *
        * Both default to undefined. Non-destructive: every existing field preserved.
        */
       import type { Entity } from '../../types.js';
       import type { PersistedRoot } from './index.js';

       export function migrateV5ToV6(state: PersistedRoot): PersistedRoot {
         if (state._v >= 6) return state;

         const entities = ((state.entities as Entity[] | undefined) ?? []).map((e): Entity => ({
           ...e,
           dependants: (e as Entity & { dependants?: number }).dependants,
           spouseIncome: (e as Entity & { spouseIncome?: string }).spouseIncome,
         }));

         return { ...state, _v: 6, entities };
       }
       ```

    4. **src/lib/migrations/index.ts** — TWO surgical edits:
       - Add import at top (after line 9): `import { migrateV5ToV6 } from './v5-to-v6.js';`
       - Add to `MIGRATIONS` registry (after `4: migrateV4ToV5,` on line 47):
         ```typescript
         // 5 → 6: additive Phase 8 widening (Entity.dependants + spouseIncome for family Medicare levy engine).
         5: migrateV5ToV6,
         ```
       - Update `CURRENT_VERSION` (line 50): `export const CURRENT_VERSION = 6;`

    5. **src/lib/migrations/__tests__/v5-to-v6.test.ts** (NEW FILE) — mirror `v4-to-v5.test.ts` shape; minimum 6 tests covering Test V5V6-1 through V5V6-6 above. Use `minimalV5()` factory function returning an `_v:5` blob with one entity carrying all prior fields (id, name, type='Individual', status='Active', gstRegistered, accountingMethod, fyEndDate, lockedFys, beneficiaries, partners, aggregatedTurnover, paygInstalmentAmount, returnStatusByFy, wizardState). Reference v4-to-v5.test.ts lines 8–30 for factory pattern.

    6. **src/lib/migrations/__tests__/round-trip.test.ts** — extend the `'v0 to v5 round-trip (Test 2.1 — Phase 6 extension)'` test (line 46–80):
       - Rename describe text to `'v0 to v6 round-trip (Test 2.1 — Phase 8 extension)'`
       - The `out._v` assertion already uses `CURRENT_VERSION` so it auto-bumps to 6
       - Add at end (after line 79):
         ```typescript
         // v5→v6 new fields are undefined (not present)
         expect((out.entities as Array<{ dependants?: number }>)[0].dependants).toBeUndefined();
         expect((out.entities as Array<{ spouseIncome?: string }>)[0].spouseIncome).toBeUndefined();
         ```

    7. **src/lib/migrations/__tests__/index.test.ts** — update assertion (line 9–11):
       ```typescript
       it('CURRENT_VERSION is 6 (Phase 8 bump)', () => {
         expect(CURRENT_VERSION).toBe(6);
       });
       ```

    Run `npx vitest run src/lib/migrations/__tests__/` and confirm GREEN before committing.

    Commit: `feat(08-1): v5→v6 additive migration — Entity.dependants + spouseIncome (MED-01)`
  </action>
  <verify>
    <automated>npx vitest run src/lib/migrations/__tests__/v5-to-v6.test.ts src/lib/migrations/__tests__/round-trip.test.ts src/lib/migrations/__tests__/index.test.ts --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `npx vitest run src/lib/migrations/__tests__/v5-to-v6.test.ts` exits 0 with ≥ 6 GREEN tests
    - `npx vitest run src/lib/migrations/__tests__/round-trip.test.ts` exits 0 (all 3 cases GREEN, including v0→v6 with new undefined assertions)
    - `npx vitest run src/lib/migrations/__tests__/index.test.ts` exits 0 (CURRENT_VERSION === 6)
    - `grep -c "export const CURRENT_VERSION = 6" src/lib/migrations/index.ts` returns 1
    - `grep -c "5: migrateV5ToV6" src/lib/migrations/index.ts` returns 1
    - `grep -c "dependants?: number" src/types.ts` returns ≥ 1 (the new field in Entity)
    - `grep -c "spouseIncome?: string" src/types.ts` returns ≥ 1
    - `grep -c "dependants: z.number().int().nonnegative().optional()" src/lib/schemas.ts` returns 1
    - `grep -c "spouseIncome: z.string().optional()" src/lib/schemas.ts` returns 1
    - `grep -c "export function migrateV5ToV6" src/lib/migrations/v5-to-v6.ts` returns 1
    - `npx vitest run` shows total GREEN test count ≥ 854 (848 baseline + ≥ 6 new migration tests); 0 RED
    - No `new Date()` introduced anywhere outside `src/lib/period.ts` (`grep -rn "new Date()" src/lib/migrations/ src/types.ts src/lib/schemas.ts` returns 0)
  </acceptance_criteria>
  <done>v5→v6 migration is registered, CURRENT_VERSION=6, Entity + EntitySchema additively widened, all 6+ migration tests + extended round-trip + updated index test are GREEN. No regressions in any other migration tests. Total GREEN ≥ 854; 0 RED.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add 5 new family constants + correct 4 STALE FY2024-25 constants in fy2026.ts; update existing single-Medicare boundary tests</name>
  <files>
    src/lib/tax/labels/fy2026.ts,
    src/lib/tax/rates/__tests__/medicare.test.ts
  </files>
  <read_first>
    - src/lib/tax/labels/fy2026.ts § "Medicare levy + MLS constants" (lines 489–514) — locations of stale values + insertion point for new family constants
    - src/lib/tax/rates/__tests__/medicare.test.ts (existing 12 tests; boundary values 27222, 34028, 144000 will need updating)
    - .planning/phases/08-family-medicare-levy-engine/08-RESEARCH.md § "Critical Pre-Existing Bug" (lines 121–135) — table of 4 stale corrections + sources
    - .planning/phases/08-family-medicare-levy-engine/08-RESEARCH.md § "Family Medicare Levy Constants" + "Family MLS Constants" (lines 137–164) — table of 5 new constants
    - .planning/phases/08-family-medicare-levy-engine/08-RESEARCH.md § "Pitfall 7: Stale threshold corrections break existing Phase 5 tests" (lines 598–602)
    - .planning/phases/08-family-medicare-levy-engine/08-VALIDATION.md — rows for "Stale single Medicare lower threshold fixed" through "Stale MLS family Tier 3 fixed"
  </read_first>
  <behavior>
    - Test CONST-1: `MEDICARE_LEVY_FAMILY_LOWER === '47238'` (new)
    - Test CONST-2: `MEDICARE_LEVY_FAMILY_UPPER === '59047'` (new)
    - Test CONST-3: `MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER === '4338'` (new)
    - Test CONST-4: `MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER === '5422'` (new)
    - Test CONST-5: `MLS_FAMILY_DEPENDANT_INCREMENT === '1500'` (new)
    - Test CONST-6: `MEDICARE_LEVY_SINGLE_LOWER === '28011'` (corrected from '27222')
    - Test CONST-7: `MEDICARE_LEVY_SINGLE_UPPER === '35014'` (corrected from '34028')
    - Test CONST-8: `MLS_SINGLE_TIER_3 === '158000'` (corrected from '144000')
    - Test CONST-9: `MLS_FAMILY_TIER_3 === '316000'` (corrected from '288000')
    - Existing medicareLevySingle tests UPDATED: boundary changes from 27222→28011 and 34028→35014; shade-in arithmetic recalculated to match corrected lower; "tier 2 rate between 118000 and 144000" updated to "between 118000 and 158000"; "tier 3 rate above 144000" updated to "above 158000"
  </behavior>
  <action>
    1. **src/lib/tax/labels/fy2026.ts** — TWO sections of edits inside the `// ── Medicare levy + MLS constants ──` block (lines 489–514):

       **A. Corrections (4 stale values) — change the literal strings in-place:**
       - Line 496: `export const MEDICARE_LEVY_SINGLE_LOWER = '27222' as const;` → `export const MEDICARE_LEVY_SINGLE_LOWER = '28011' as const;`
       - Line 498: `export const MEDICARE_LEVY_SINGLE_UPPER = '34028' as const;` → `export const MEDICARE_LEVY_SINGLE_UPPER = '35014' as const;`
       - Line 506: `export const MLS_SINGLE_TIER_3 = '144000' as const;` → `export const MLS_SINGLE_TIER_3 = '158000' as const;`
       - Line 514: `export const MLS_FAMILY_TIER_3 = '288000' as const;` → `export const MLS_FAMILY_TIER_3 = '316000' as const;`

       Update the comment block on lines 489–492 to read:
       ```
       // ── Medicare levy + MLS constants ──────────────────────────────────────────
       // Source: ATO "Medicare levy" + "Medicare levy surcharge" FY2025-26
       // https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction-for-low-income-earners
       // FY2025-26 values reflect 2.9% retroactive indexation (Phase 8 correction — Phase 5 shipped FY2024-25 stale values).
       ```

       Update inline doc comments on `MEDICARE_LEVY_SINGLE_LOWER` and `MEDICARE_LEVY_SINGLE_UPPER` to read "FY2025-26 value (Phase 8 corrected from FY2024-25)."

       **B. Add 5 new family constants** — append a new sub-block after line 514 (after `MLS_FAMILY_TIER_3` correction):
       ```typescript
       /** Family Medicare levy lower threshold — no levy if combined family income ≤ this. FY2025-26 (Phase 8 — MED-02). */
       export const MEDICARE_LEVY_FAMILY_LOWER = '47238' as const;
       /** Family Medicare levy upper threshold — full 2% if combined ≥ this. FY2025-26. */
       export const MEDICARE_LEVY_FAMILY_UPPER = '59047' as const;
       /** Per-dependant-child increment applied to the LOWER family threshold (each dependant). FY2025-26. */
       export const MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER = '4338' as const;
       /** Per-dependant-child increment applied to the UPPER family threshold (each dependant). Note: differs from LOWER ($5,422 vs $4,338) — shading band widens slightly per dependant. */
       export const MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER = '5422' as const;
       /** Per-dependant-child MLS family threshold increment — applied to ALL 3 family tier thresholds for each dependant AFTER the first (max(0, dependants - 1) × 1500). FY2025-26. */
       export const MLS_FAMILY_DEPENDANT_INCREMENT = '1500' as const;
       ```

    2. **src/lib/tax/rates/__tests__/medicare.test.ts** — update boundary values to match corrected constants:
       - Line 10: `'zero below lower threshold (27222)'` → `'zero below lower threshold (28011)'`; assertion `'27222'` → `'28011'` (line 11)
       - Line 18: `'shade-in between lower and upper thresholds'` — recompute: at 30000, shade = (30000-28011) × 0.10 = 198.90; full = 30000 × 0.02 = 600 → min = 198.90 → update expectation: `expect(levy.toFixed(2)).toBe('198.90');`
       - Line 24: `'full 2% above upper threshold (34028)'` → `'full 2% above upper threshold (35014)'`; the test at 35000 — 35000 > 35014 is FALSE; pick a value > 35014. Change test income from `'35000'` to `'36000'` → 36000 × 0.02 = 720.00 → `expect(...).toFixed(2)).toBe('720.00');`
       - Line 49: `'tier 2 rate (1.25%) between 118000 and 144000'` → `'tier 2 rate (1.25%) between 118000 and 158000'`; the value 130000 × 0.0125 = 1625 still correct (130000 < 158000) — only the test name needs updating
       - Line 54: `'tier 3 rate (1.5%) above 144000'` → `'tier 3 rate (1.5%) above 158000'`; the value 160000 — 160000 > 158000 is TRUE so still tier 3 → 160000 × 0.015 = 2400 stays correct — only the test name needs updating
       - The `'family filing returns flat-2% levy with familyWarning'` test (lines 77–85) STAYS UNCHANGED in this task — Plan 08-2's `medicareLevyFY2026` rewrite will require updating it. Add a comment `// Will be updated by Plan 08-2 when family branch is rewritten`.

    Add NEW constant-existence tests at the bottom of the file in a new `describe('FY2025-26 family constants (MED-02)', ...)` block — minimum 5 tests covering CONST-1 through CONST-5 above. Each test imports the constant from `../../labels/fy2026` and asserts string equality. Example:
    ```typescript
    import {
      MEDICARE_LEVY_FAMILY_LOWER,
      MEDICARE_LEVY_FAMILY_UPPER,
      MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER,
      MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER,
      MLS_FAMILY_DEPENDANT_INCREMENT,
    } from '../../labels/fy2026';

    describe('FY2025-26 family Medicare/MLS constants (MED-02)', () => {
      it('MEDICARE_LEVY_FAMILY_LOWER is 47238', () => {
        expect(MEDICARE_LEVY_FAMILY_LOWER).toBe('47238');
      });
      // ...4 more analogous tests
    });
    ```

    Run `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts` and confirm GREEN before committing.

    Commit: `fix(08-1): correct FY2024-25 stale constants + add FY2025-26 family Medicare/MLS constants (MED-02)`
  </action>
  <verify>
    <automated>npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "MEDICARE_LEVY_FAMILY_LOWER = '47238'" src/lib/tax/labels/fy2026.ts` returns 1
    - `grep -c "MEDICARE_LEVY_FAMILY_UPPER = '59047'" src/lib/tax/labels/fy2026.ts` returns 1
    - `grep -c "MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER = '4338'" src/lib/tax/labels/fy2026.ts` returns 1
    - `grep -c "MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER = '5422'" src/lib/tax/labels/fy2026.ts` returns 1
    - `grep -c "MLS_FAMILY_DEPENDANT_INCREMENT = '1500'" src/lib/tax/labels/fy2026.ts` returns 1
    - `grep -c "MEDICARE_LEVY_SINGLE_LOWER = '28011'" src/lib/tax/labels/fy2026.ts` returns 1
    - `grep -c "MEDICARE_LEVY_SINGLE_UPPER = '35014'" src/lib/tax/labels/fy2026.ts` returns 1
    - `grep -c "MLS_SINGLE_TIER_3 = '158000'" src/lib/tax/labels/fy2026.ts` returns 1
    - `grep -c "MLS_FAMILY_TIER_3 = '316000'" src/lib/tax/labels/fy2026.ts` returns 1
    - `grep -c "= '27222'" src/lib/tax/labels/fy2026.ts` returns 0 (stale value fully removed)
    - `grep -c "= '34028'" src/lib/tax/labels/fy2026.ts` returns 0
    - `grep -c "= '144000'" src/lib/tax/labels/fy2026.ts` returns 0
    - `grep -c "= '288000'" src/lib/tax/labels/fy2026.ts` returns 0
    - `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts` exits 0 with all existing tests GREEN + ≥ 5 new constant-existence tests GREEN
    - `npx vitest run` shows total GREEN ≥ 859 (848 baseline + 6 from Task 1 + ≥ 5 from Task 2); 0 RED
  </acceptance_criteria>
  <done>5 new family constants exist with exact ATO FY2025-26 values; 4 stale FY2024-25 values are corrected; all 12 existing medicare.test.ts tests pass with updated boundary values; ≥ 5 new constant-existence tests pass; 0 RED. Phase 5 single-Medicare regression check is satisfied within this same file.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Implement medicareLevyFamily + medicareLevySurchargeFamily pure functions; widen MedicareLevyInput; rewrite family branch in medicareLevyFY2026 orchestrator; add isFamilyFiling predicate + helpers test</name>
  <files>
    src/lib/tax/rates/fy2026/medicare.ts,
    src/lib/tax/rates/__tests__/medicare.test.ts,
    src/lib/tax/returns/fy2026/_helpers.ts,
    src/lib/tax/returns/fy2026/__tests__/helpers.test.ts
  </files>
  <read_first>
    - src/lib/tax/rates/fy2026/medicare.ts (existing — full file; lines 1–124. Read carefully — Task 3 widens `MedicareLevyInput`, adds 2 functions, rewrites family branch of `medicareLevyFY2026`)
    - src/lib/tax/rates/__tests__/medicare.test.ts (updated by Task 2; Task 3 adds new family-engine tests AND updates the `'family filing returns flat-2% levy with familyWarning'` test from line 77)
    - src/lib/tax/returns/fy2026/_helpers.ts (existing 2 helpers; append `isFamilyFiling`)
    - src/types.ts (Entity — references the v6 `dependants?` and `spouseIncome?` fields added in Task 1)
    - .planning/phases/08-family-medicare-levy-engine/08-RESEARCH.md § "Pattern 1: `isFamilyFiling` predicate" (lines 198–214)
    - .planning/phases/08-family-medicare-levy-engine/08-RESEARCH.md § "Pattern 2: `medicareLevyFamily` pure function" (lines 217–271) — full algorithm + code
    - .planning/phases/08-family-medicare-levy-engine/08-RESEARCH.md § "Pattern 3: `medicareLevySurchargeFamily`" (lines 274–317)
    - .planning/phases/08-family-medicare-levy-engine/08-RESEARCH.md § "Pattern 4: `MedicareLevyInput` widening" (lines 320–333)
    - .planning/phases/08-family-medicare-levy-engine/08-RESEARCH.md § "Common Pitfalls" (lines 568–602) — Pitfalls 1–6 are CRITICAL for this task
    - .planning/phases/08-family-medicare-levy-engine/08-RESEARCH.md § "Code Examples" (lines 608–658) — verified gold values for single-parent + DINK + 2-dependant family scenarios
    - .planning/phases/08-family-medicare-levy-engine/08-CONTEXT.md § Decisions — Eligibility trigger (4 sub-decisions) + MLS family scope (4 sub-decisions)
  </read_first>
  <behavior>
    **isFamilyFiling tests (4 cases):**
    - Test HELP-1: `isFamilyFiling({...e, dependants: undefined, spouseIncome: undefined})` returns `false`
    - Test HELP-2: `isFamilyFiling({...e, dependants: 1, spouseIncome: undefined})` returns `true`
    - Test HELP-3: `isFamilyFiling({...e, dependants: undefined, spouseIncome: "60000"})` returns `true`
    - Test HELP-4: `isFamilyFiling({...e, dependants: undefined, spouseIncome: "0"})` returns `true` (CRITICAL — explicit "0" triggers family)
    - Test HELP-5: `isFamilyFiling({...e, dependants: 0, spouseIncome: undefined})` returns `false` (dependants:0 means no dependants — same as undefined per `?? 0 >= 1` check)
    - Test HELP-6: `isFamilyFiling({...e, dependants: 2, spouseIncome: "100000"})` returns `true` (both present)

    **medicareLevyFamily tests (≥ 7 cases):**
    - Test FLEVY-1: combined ≤ effective lower → $0. `medicareLevyFamily(Decimal('40000'), Decimal('0'), 0)` → `Decimal('0')` (combined 40000 ≤ 47238)
    - Test FLEVY-2: combined just below effective upper, shade-in. `medicareLevyFamily(Decimal('25000'), Decimal('25000'), 0)` → combined=50000; effUpper=59047; effLower=47238; shaded=(50000-47238)×0.10=276.20; full=25000×0.02=500; min=276.20 → `'276.20'`
    - Test FLEVY-3: combined ≥ effective upper → full 2% of OWN income (NOT combined). `medicareLevyFamily(Decimal('90000'), Decimal('80000'), 0)` → combined=170000≥59047; levy=90000×0.02=`'1800.00'`. Pitfall 1 explicitly: NOT 170000×0.02=3400.
    - Test FLEVY-4: per-dependant LOWER increment correct. With 2 dependants: effLower=47238+(2×4338)=55914. `medicareLevyFamily(Decimal('27000'), Decimal('27000'), 2)` → combined=54000 ≤ 55914 → `'0'`
    - Test FLEVY-5: per-dependant UPPER increment correct (differs from LOWER). With 2 dependants: effUpper=59047+(2×5422)=69891. `medicareLevyFamily(Decimal('35000'), Decimal('34900'), 2)` → combined=69900 ≥ 69891 → full 2% of own = 35000×0.02=`'700.00'`
    - Test FLEVY-6: single-parent scenario (matches Research Code Example line 612–622): `medicareLevyFamily(Decimal('45000'), Decimal('0'), 2)` → combined=45000 ≤ effLower=55914 → `'0'`
    - Test FLEVY-7: DINK scenario (matches Research Code Example line 626–639): `medicareLevyFamily(Decimal('90000'), Decimal('80000'), 0)` → combined=170000 ≥ effUpper=59047 → `'1800.00'`
    - Test FLEVY-8 (shade-in cap): When shade-in would exceed full 2% of own income, return the full 2%. Construct: own=10000, spouse=50000, dependants=0 → combined=60000>effUpper=59047 → full=200.00 (above-upper path, not shade). Use own=30000, spouse=20000 → combined=50000; effLower=47238; shaded=(50000-47238)×0.10=276.20; full=30000×0.02=600; min=276.20 → already covered. Construct a cap-binding case: own=2000, spouse=55000, dependants=0 → combined=57000<59047 (shade zone); shaded=(57000-47238)×0.10=976.20; full=2000×0.02=40; min=40.00 → `'40.00'` (constrained by Decimal.min to full)

    **medicareLevySurchargeFamily tests (≥ 6 cases):**
    - Test FMLS-1: hasPHC=true → $0 regardless of income/dependants. `medicareLevySurchargeFamily(Decimal('500000'), Decimal('300000'), true, 0)` → `'0'`
    - Test FMLS-2: combined below Tier 1 base (202000) → $0. `medicareLevySurchargeFamily(Decimal('200000'), Decimal('100000'), false, 0)` → `'0'`
    - Test FMLS-3: combined in Tier 1 zone (>202000 ≤236000), 0 dependants → 1% × own. `medicareLevySurchargeFamily(Decimal('220000'), Decimal('120000'), false, 0)` → 120000×0.01=`'1200.00'`
    - Test FMLS-4: combined in Tier 2 zone (>236000 ≤316000) → 1.25% × own. `medicareLevySurchargeFamily(Decimal('250000'), Decimal('150000'), false, 0)` → 150000×0.0125=`'1875.00'`
    - Test FMLS-5: combined in Tier 3 zone (>316000) → 1.5% × own. `medicareLevySurchargeFamily(Decimal('400000'), Decimal('200000'), false, 0)` → 200000×0.015=`'3000.00'`
    - Test FMLS-6: per-dependant-after-first increment shifts all 3 tier thresholds by 1500. With 2 dependants: effT1=202000+1500=203500. Combined=203000 < 203500 → $0. `medicareLevySurchargeFamily(Decimal('203000'), Decimal('120000'), false, 2)` → `'0'`. Critical: with 1 dependant, effT1=202000 (no shift, "after first"). `medicareLevySurchargeFamily(Decimal('203000'), Decimal('120000'), false, 1)` → 120000×0.01=`'1200.00'` (in Tier 1).
    - Test FMLS-7: surcharge on OWN income, not combined (Pitfall 1 analogue). `medicareLevySurchargeFamily(Decimal('300000'), Decimal('80000'), false, 0)` → 80000×0.0125=`'1000.00'` (NOT 300000×0.0125).

    **medicareLevyFY2026 family-branch rewrite test (UPDATE existing):**
    - Test ORCH-FAM-1 (replaces line 77–85 test): `medicareLevyFY2026({taxableIncome: Decimal('80000'), hasPHC: false, filingStatus: 'family', dependants: 0, spouseIncome: '60000'})` → levy=80000×0.02=`'1600.00'` (combined 140000 > effUpper 59047); surcharge=0 (combined 140000 < Tier 1 base 202000); `familyWarning === undefined` (no longer emits "not yet supported"); basis contains "Family" or similar
    - Test ORCH-FAM-2 (NEW): missing `spouseIncome` defaults to '0' when family branch hit. `medicareLevyFY2026({taxableIncome: Decimal('80000'), hasPHC: false, filingStatus: 'family', dependants: 2})` → spouseIncome undefined → treated as '0'; combined=80000 ≥ effUpper(59047+(2×5422)=69891) → levy=80000×0.02=`'1600.00'`
    - Test ORCH-FAM-3 (NEW): hasPHC=true zeros MLS even with family. `medicareLevyFY2026({taxableIncome: Decimal('150000'), hasPHC: true, filingStatus: 'family', dependants: 2, spouseIncome: '100000'})` → levy=150000×0.02=`'3000.00'`; surcharge=`'0'`
    - Test ORCH-SINGLE regression: existing `'returns levy + surcharge + basis for single no-PHC high income'` test (line 65) STILL GREEN with corrected Tier 3 threshold (150000 < 158000 → Tier 2 rate now! → 150000×0.0125=1875.00). UPDATE the expected value: `expect(result.surcharge.toFixed(2)).toBe('1875.00');` and update test name to `'returns levy + Tier 2 surcharge for single no-PHC at 150k'`.

    **medicareLevySurcharge (existing single function) — Task 3 must KEEP the family branch returning $0** (the orchestrator now handles family via the new function, but the standalone `medicareLevySurcharge(income, hasPHC, 'family')` signature is preserved for backward compat — its family branch can either keep the $0 stub or be removed if the orchestrator no longer routes through it. Decision: KEEP the existing function signature and the family-returns-zero stub; orchestrator now calls `medicareLevySurchargeFamily` directly. The existing test `'family filing returns zero with family status (deferred)'` (line 59–61) stays GREEN.

    **MedicareLevyResult.familyWarning:** field stays declared on interface (backward compat); now set to `undefined` whenever family thresholds are computed correctly. The `'family filing returns flat-2% levy with familyWarning'` test (line 77–85) IS UPDATED per ORCH-FAM-1 above.
  </behavior>
  <action>
    1. **src/lib/tax/returns/fy2026/_helpers.ts** — append after line 83 (after `rollupByLabel` closing brace):

       ```typescript

       /**
        * Phase 8 — Family filing eligibility predicate (MED-02).
        *
        * Family iff:
        *   - `dependants ?? 0 >= 1` (at least one dependant child), OR
        *   - `spouseIncome !== undefined` (any spouse income field present — including explicit "0")
        *
        * Both undefined → single filing (Phase 5 behaviour preserved; zero regression for v1.0 entities
        * per MED-04 default-undefined preservation).
        *
        * Critical: `spouseIncome: "0"` triggers family (spouse exists but earned $0).
        * Use explicit `!== undefined` check — do NOT use falsy/truthy on the string.
        */
       export function isFamilyFiling(entity: Entity): boolean {
         const hasDependants = (entity.dependants ?? 0) >= 1;
         const hasSpouseIncome = entity.spouseIncome !== undefined;
         return hasDependants || hasSpouseIncome;
       }
       ```
       (The existing `import type { Account, JournalEntry }` at line 11 must be extended to include `Entity`: `import type { Account, Entity, JournalEntry } from '../../../../types';`)

    2. **src/lib/tax/returns/fy2026/__tests__/helpers.test.ts** (NEW FILE) — create with this header + structure:

       ```typescript
       /**
        * @license
        * SPDX-License-Identifier: Apache-2.0
        */
       import { describe, it, expect } from 'vitest';
       import { isFamilyFiling } from '../_helpers';
       import type { Entity } from '../../../../../types';

       const baseEntity: Entity = {
         _v: 6,
         id: 'e1',
         name: 'Test',
         type: 'Individual',
         status: 'Active',
       };

       describe('isFamilyFiling (Phase 8 — MED-02)', () => {
         it('returns false when both dependants and spouseIncome are undefined', () => {
           expect(isFamilyFiling(baseEntity)).toBe(false);
         });

         it('returns true when dependants >= 1 (single parent)', () => {
           expect(isFamilyFiling({ ...baseEntity, dependants: 1 })).toBe(true);
           expect(isFamilyFiling({ ...baseEntity, dependants: 3 })).toBe(true);
         });

         it('returns true when spouseIncome is set (DINK or otherwise)', () => {
           expect(isFamilyFiling({ ...baseEntity, spouseIncome: '60000' })).toBe(true);
         });

         it('returns true when spouseIncome is explicit "0" (spouse exists, earned zero)', () => {
           expect(isFamilyFiling({ ...baseEntity, spouseIncome: '0' })).toBe(true);
         });

         it('returns false when dependants is 0 and spouseIncome is undefined', () => {
           expect(isFamilyFiling({ ...baseEntity, dependants: 0 })).toBe(false);
         });

         it('returns true when both dependants and spouseIncome present', () => {
           expect(isFamilyFiling({ ...baseEntity, dependants: 2, spouseIncome: '80000' })).toBe(true);
         });
       });
       ```

    3. **src/lib/tax/rates/fy2026/medicare.ts** — surgical edits:

       **A. Import widening** (lines 6–17) — add 5 new family constants:
       ```typescript
       import {
         MEDICARE_LEVY_RATE,
         MEDICARE_LEVY_SINGLE_LOWER,
         MEDICARE_LEVY_SINGLE_UPPER,
         MEDICARE_LEVY_SINGLE_SHADING_RATE,
         MEDICARE_LEVY_FAMILY_LOWER,
         MEDICARE_LEVY_FAMILY_UPPER,
         MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER,
         MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER,
         MLS_SINGLE_TIER_1,
         MLS_SINGLE_TIER_2,
         MLS_SINGLE_TIER_3,
         MLS_SINGLE_RATE_1,
         MLS_SINGLE_RATE_2,
         MLS_SINGLE_RATE_3,
         MLS_FAMILY_TIER_1,
         MLS_FAMILY_TIER_2,
         MLS_FAMILY_TIER_3,
         MLS_FAMILY_DEPENDANT_INCREMENT,
       } from '../../labels/fy2026';
       ```

       **B. Add `medicareLevyFamily` pure function** — insert after `medicareLevySingle` closing brace (after line 43):
       ```typescript

       /**
        * Compute family Medicare levy for FY2025-26 (Phase 8 — MED-02).
        *
        * Algorithm:
        *   1. effLower = FAMILY_LOWER + dependants × DEPENDANT_INCREMENT_LOWER
        *   2. effUpper = FAMILY_UPPER + dependants × DEPENDANT_INCREMENT_UPPER
        *   3. combined = taxableIncome + spouseIncome
        *   4. combined ≤ effLower → $0
        *   5. combined < effUpper → shade-in: min((combined - effLower) × 0.10, taxableIncome × 0.02)
        *   6. combined ≥ effUpper → full 2% of TAXPAYER'S OWN taxableIncome (NOT combined — Pitfall 1)
        *
        * Note the two distinct per-dependant increments ($4,338 lower vs $5,422 upper — Pitfall 2).
        */
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
           const shaded = combined.minus(effectiveLower).times(MEDICARE_LEVY_SINGLE_SHADING_RATE);
           const full = taxableIncome.times(MEDICARE_LEVY_RATE);
           return Decimal.min(shaded, full).toDecimalPlaces(2);
         }

         return taxableIncome.times(MEDICARE_LEVY_RATE).toDecimalPlaces(2);
       }
       ```

       **C. Add `medicareLevySurchargeFamily` pure function** — insert after `medicareLevySurcharge` closing brace (after line 78):
       ```typescript

       /**
        * Compute family Medicare Levy Surcharge for FY2025-26 (Phase 8 — MED-02).
        *
        * - PHC=true → $0 regardless (same as single behaviour).
        * - Combined income gates the tier; surcharge rate applies to TAXPAYER'S OWN income (Pitfall 1 analogue).
        * - Per-dependant-AFTER-FIRST increment: max(0, dependants - 1) × $1,500 shifts ALL 3 tier thresholds equally (Pitfall 3).
        */
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
           rate = new Decimal(MLS_SINGLE_RATE_3);
         } else if (combinedIncome.greaterThan(t2)) {
           rate = new Decimal(MLS_SINGLE_RATE_2);
         } else if (combinedIncome.greaterThan(t1)) {
           rate = new Decimal(MLS_SINGLE_RATE_1);
         }

         return ownTaxableIncome.times(rate).toDecimalPlaces(2);
       }
       ```

       **D. Widen `MedicareLevyInput` interface** (line 80):
       ```typescript
       export interface MedicareLevyInput {
         taxableIncome: Decimal;
         hasPHC: boolean;
         filingStatus: 'single' | 'family';
         /** Phase 8 — dependant-child count (family branch only). Defaults to 0 when omitted. */
         dependants?: number;
         /** Phase 8 — spouse's taxable income as decimal string (family branch only). Defaults to '0' when omitted. */
         spouseIncome?: string;
       }
       ```

       **E. Rewrite family branch of `medicareLevyFY2026` orchestrator** (lines 99–123) — replace the function body:
       ```typescript
       export function medicareLevyFY2026(input: MedicareLevyInput): MedicareLevyResult {
         const { taxableIncome, hasPHC, filingStatus, dependants, spouseIncome } = input;
         let levy: Decimal;
         let surcharge: Decimal;
         let basis: string;
         const familyWarning: string | undefined = undefined;

         if (filingStatus === 'family') {
           // Phase 8 — real family threshold engine (MED-02).
           // Tolerant parse: missing spouseIncome → '0'; INVALID parse handled by computeIndividualReturn
           // upstream (it constructs a clean Decimal before calling this orchestrator) — anomaly emission
           // happens at compute layer per CONTEXT decision.
           const deps = dependants ?? 0;
           const spouseDecimal = spouseIncome !== undefined ? new Decimal(spouseIncome) : new Decimal(0);
           const combined = taxableIncome.plus(spouseDecimal);

           levy = medicareLevyFamily(taxableIncome, spouseDecimal, deps);
           surcharge = medicareLevySurchargeFamily(combined, taxableIncome, hasPHC, deps);

           basis = `Family Medicare levy (${deps} dependants, spouse income $${spouseIncome ?? '0'})`;
           if (hasPHC) {
             basis = 'Family Medicare levy applied; MLS $0 (private hospital cover held)';
           } else if (surcharge.greaterThan(0)) {
             basis += ' + family MLS';
           }
         } else {
           levy = medicareLevySingle(taxableIncome);
           surcharge = medicareLevySurcharge(taxableIncome, hasPHC, filingStatus);

           basis = `Medicare levy ${(Number(MEDICARE_LEVY_RATE) * 100).toFixed(0)}% applied`;
           if (surcharge.greaterThan(0)) {
             basis += ` + MLS (no private hospital cover)`;
           }
           if (hasPHC) {
             basis = 'Medicare levy applied; MLS $0 (private hospital cover held)';
           }
         }

         return { levy, surcharge, basis, familyWarning };
       }
       ```

    4. **src/lib/tax/rates/__tests__/medicare.test.ts** — append a new `describe` block at the end:
       ```typescript
       describe('medicareLevyFamily (Phase 8 — MED-02)', () => {
         // FLEVY-1 through FLEVY-8 tests as per <behavior>
       });

       describe('medicareLevySurchargeFamily (Phase 8 — MED-02)', () => {
         // FMLS-1 through FMLS-7 tests as per <behavior>
       });
       ```
       Each test imports the new functions: `import { medicareLevyFamily, medicareLevySurchargeFamily } from '../fy2026/medicare';`

       **UPDATE existing test on lines 64–75** (`'returns levy + surcharge + basis for single no-PHC high income'`):
       - 150000 < 158000 (corrected MLS Tier 3 from Task 2) so income falls in Tier 2 zone (>118000, ≤158000)
       - Change expected surcharge: `expect(result.surcharge.toFixed(2)).toBe('1875.00');` (was '2250.00' — 150000×0.0125 not ×0.015)
       - Update test name to: `'returns levy + Tier 2 surcharge for single no-PHC at 150k (FY2025-26 corrected)'`

       **REPLACE the existing test on lines 77–85** (`'family filing returns flat-2% levy with familyWarning'`) with:
       ```typescript
       it('family filing: returns real-threshold levy + correct surcharge + no familyWarning (Phase 8)', () => {
         const result = medicareLevyFY2026({
           taxableIncome: new Decimal('80000'),
           hasPHC: false,
           filingStatus: 'family',
           dependants: 0,
           spouseIncome: '60000',
         });
         // Combined 140000 ≥ effUpper 59047 → levy = 80000 × 0.02
         expect(result.levy.toFixed(2)).toBe('1600.00');
         // Combined 140000 < family MLS Tier 1 base 202000 → surcharge = 0
         expect(result.surcharge.toFixed(2)).toBe('0.00');
         expect(result.familyWarning).toBeUndefined();
         expect(result.basis).toMatch(/Family/);
       });

       it('family filing with hasPHC=true zeros MLS regardless of family income (Phase 8)', () => {
         const result = medicareLevyFY2026({
           taxableIncome: new Decimal('150000'),
           hasPHC: true,
           filingStatus: 'family',
           dependants: 2,
           spouseIncome: '100000',
         });
         // Combined 250000 ≥ effUpper 69891 → levy = 150000 × 0.02
         expect(result.levy.toFixed(2)).toBe('3000.00');
         // PHC held → surcharge = 0
         expect(result.surcharge.toFixed(2)).toBe('0.00');
       });

       it('family filing with no spouseIncome treats it as $0 (Phase 8)', () => {
         const result = medicareLevyFY2026({
           taxableIncome: new Decimal('80000'),
           hasPHC: false,
           filingStatus: 'family',
           dependants: 2,
         });
         // spouseIncome undefined → treated as '0'; combined 80000 ≥ effUpper(59047+2×5422=69891)
         expect(result.levy.toFixed(2)).toBe('1600.00');
       });
       ```

    Run `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts src/lib/tax/returns/fy2026/__tests__/helpers.test.ts` and confirm GREEN.

    Then run the FULL suite `npx vitest run` to confirm no other Phase 5 tests broke (the `computeIndividualReturn` tests at `src/lib/tax/returns/fy2026/__tests__/individual.test.ts` are still calling `medicareLevyFY2026` with `filingStatus: 'single'` — they should remain GREEN). If any other test broke due to the corrected MLS Tier 3 threshold (158000), update it in this task.

    Commit: `feat(08-1): medicareLevyFamily + medicareLevySurchargeFamily + isFamilyFiling — pure functions + tests (MED-02)`
  </action>
  <verify>
    <automated>npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts src/lib/tax/returns/fy2026/__tests__/helpers.test.ts --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "export function medicareLevyFamily" src/lib/tax/rates/fy2026/medicare.ts` returns 1
    - `grep -c "export function medicareLevySurchargeFamily" src/lib/tax/rates/fy2026/medicare.ts` returns 1
    - `grep -c "export function isFamilyFiling" src/lib/tax/returns/fy2026/_helpers.ts` returns 1
    - `grep -c "dependants\?: number" src/lib/tax/rates/fy2026/medicare.ts` returns ≥ 1 (in MedicareLevyInput)
    - `grep -c "spouseIncome\?: string" src/lib/tax/rates/fy2026/medicare.ts` returns ≥ 1 (in MedicareLevyInput)
    - `grep -cE "Math\.max\(0, dependants - 1\)" src/lib/tax/rates/fy2026/medicare.ts` returns 1 (MLS after-first increment)
    - `grep -nE "parseFloat|Number\(" src/lib/tax/rates/fy2026/medicare.ts` returns matches ONLY for the existing `Number(MEDICARE_LEVY_RATE)` template-literal expression (NOT on any money string)
    - `grep -c "new Date()" src/lib/tax/rates/fy2026/medicare.ts src/lib/tax/returns/fy2026/_helpers.ts` returns 0
    - `npx vitest run src/lib/tax/returns/fy2026/__tests__/helpers.test.ts` exits 0 with ≥ 6 GREEN tests
    - `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts` exits 0 with all GREEN; total in this file ≥ 28 tests (12 single/orig + 5 const + ≥ 8 FLEVY + ≥ 7 FMLS + 3 orchestrator family rewrites = ≥ 35 GREEN total acceptable)
    - `npx vitest run` shows full suite GREEN; total count ≥ 868 (848 baseline + ≥ 20 new from Tasks 1-3); 0 RED
    - No regressions in `src/lib/tax/returns/fy2026/__tests__/individual.test.ts` (existing Phase 5 single-filing tests still GREEN because `computeIndividualReturn` still passes `filingStatus: 'single'`)
  </acceptance_criteria>
  <done>All 3 pure family functions exist with exact signatures from RESEARCH; `medicareLevyFY2026` family branch is rewritten to call them; `MedicareLevyInput` is additively widened; ≥ 20 new tests are GREEN; 1 existing single-Tier 3 test updated for corrected $158k threshold; 1 existing family-flat-2% test replaced with real-engine test; 0 RED; total SPA GREEN ≥ 868.</done>
</task>

</tasks>

<verification>
After all 3 tasks complete:

1. **Full test suite GREEN:** `npx vitest run` exits 0; total ≥ 868 SPA GREEN (848 baseline + ~20 new); 0 RED.
2. **No new TypeScript errors:** `npx tsc --noEmit` exits 0.
3. **Lint clean:** `npm run lint` (or equivalent) exits 0.
4. **No money-precision regression:** `grep -nE "parseFloat|Number\(" src/lib/tax/rates/fy2026/medicare.ts src/lib/tax/returns/fy2026/_helpers.ts` shows matches only for the documented `Number(MEDICARE_LEVY_RATE)` template-literal in `basis` string formatting — NO `parseFloat` or `Number()` on any money string (`taxableIncome`, `spouseIncome`, threshold constants).
5. **No new Date() outside period.ts:** `grep -rn "new Date()" src/lib/migrations/v5-to-v6.ts src/lib/tax/rates/fy2026/medicare.ts src/lib/tax/returns/fy2026/_helpers.ts` returns 0.
6. **Manual sanity check (optional):** Construct a brand-new Individual entity in dev → migrate from any v5 fixture → confirm `dependants === undefined, spouseIncome === undefined` after migration; existing assumption row in Form I unchanged (Plan 08-2 will wire the UI change).
</verification>

<success_criteria>
- v5→v6 migration ships, CURRENT_VERSION=6, round-trip v0→v6 GREEN with undefined-default assertions for `dependants`/`spouseIncome`
- Entity (types.ts) + EntitySchema (schemas.ts) carry additive `dependants?: number` + `spouseIncome?: string` fields
- 5 new FY2025-26 family constants exist with exact ATO-sourced values: `MEDICARE_LEVY_FAMILY_LOWER='47238'`, `MEDICARE_LEVY_FAMILY_UPPER='59047'`, `MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER='4338'`, `MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER='5422'`, `MLS_FAMILY_DEPENDANT_INCREMENT='1500'`
- 4 STALE FY2024-25 constants corrected to FY2025-26 values: SINGLE_LOWER `27222`→`28011`, SINGLE_UPPER `34028`→`35014`, MLS_SINGLE_TIER_3 `144000`→`158000`, MLS_FAMILY_TIER_3 `288000`→`316000`
- `medicareLevyFamily(taxableIncome, spouseIncome, dependants): Decimal` implements the ATO algorithm exactly (Pitfalls 1 + 2 explicitly avoided)
- `medicareLevySurchargeFamily(combined, own, hasPHC, dependants): Decimal` implements 3-tier surcharge with `max(0, dependants - 1) × 1500` per-dependant-after-first increment shifting all 3 tiers (Pitfall 3 avoided); surcharge applied to own income (Pitfall 1 analogue)
- `isFamilyFiling(entity): boolean` returns `true` iff `dependants>=1` OR `spouseIncome!==undefined`; explicit `spouseIncome:"0"` triggers family (Pitfall 4 avoided)
- `medicareLevyFY2026` family branch rewritten to call new pure functions; `familyWarning` is now `undefined` for family computations (no more "not yet supported" text)
- Pre-existing Phase 5 single-Medicare boundary tests UPDATED to corrected thresholds (no silent regressions; tests verify the correct values, not the stale ones)
- Existing 848 SPA GREEN baseline preserved; estimated end-of-plan ≥ 868 GREEN; 0 RED
- 0 new `new Date()` calls outside `src/lib/period.ts`; 0 `parseFloat`/`Number()` on money strings
- All 3 task commits land on main; Plan 08-2 can build directly on top
</success_criteria>

<output>
After completion, create `.planning/phases/08-family-medicare-levy-engine/08-1-SUMMARY.md` capturing:
- Final test counts (GREEN/RED/todo for SPA + server)
- Files modified + new files created (list of paths)
- The 9 constants table (5 new + 4 corrected) with before/after values
- Function signatures shipped: `migrateV5ToV6`, `medicareLevyFamily`, `medicareLevySurchargeFamily`, `isFamilyFiling`
- Any deviations from the plan + why
- Open issues for Plan 08-2 (UI integration: AssumptionsBlock prop widening, computeIndividualReturn family branch, EntityForm 2 conditional fields)
- Commit SHAs (3 commits)
</output>
