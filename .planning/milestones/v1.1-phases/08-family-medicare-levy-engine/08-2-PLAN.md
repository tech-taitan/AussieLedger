---
phase: 08-family-medicare-levy-engine
plan: 2
type: execute
wave: 2
depends_on: [08-1]
files_modified:
  - src/lib/tax/returns/fy2026/individual.ts
  - src/lib/tax/returns/fy2026/__tests__/individual.test.ts
  - src/components/AssumptionsBlock.tsx
  - src/components/__tests__/AssumptionsBlock.test.tsx
  - src/components/TaxReturnAssistant.tsx
  - src/components/__tests__/TaxReturnAssistant.test.tsx
  - src/components/EntityForm.tsx
  - src/components/__tests__/EntityForm.test.tsx
autonomous: true
tdd: true
requirements: [MED-02, MED-03, MED-04]
must_haves:
  truths:
    - "computeIndividualReturn derives filingStatus via isFamilyFiling(entity); family-eligible entities use the new family engine (medicareLevyFY2026 with dependants + spouseIncome passed through)"
    - "Family-eligible entities get a family-threshold assumption row in result.meta.anomalies (id='assumption-family-medicare'); the flat-2% Phase 5 medicare-exempt row is SUPPRESSED (replaced, not duplicated) for family entities; non-family entities keep the existing 5 assumption rows unchanged"
    - "Bad spouseIncome (e.g. 'abc') → engine treats spouse as $0 + emits Anomaly {id: 'family-data-warn', severity: 'warn', label: 'M1'}"
    - "AssumptionsBlock accepts optional `assumptions?: string[]` prop; falls back to existing ASSUMPTIONS constant when omitted (backward-compatible — existing test stays GREEN)"
    - "TaxReturnAssistant derives assumption strings from result.meta.anomalies filtered by id.startsWith('assumption-') and passes them to AssumptionsBlock"
    - "EntityForm renders dependants + spouseIncome input fields ONLY when entity.type === 'Individual'; both default to blank (undefined); switching type to Company hides them but preserves stored values in formData"
    - "Existing 848+ baseline GREEN tests preserved; ~25 new component + integration tests added; 0 RED"
  artifacts:
    - path: "src/lib/tax/returns/fy2026/individual.ts"
      provides: "Family-eligible computeIndividualReturn with tolerant spouseIncome parse + family-medicare assumption row + anomaly emission for bad data"
      contains: "isFamilyFiling"
    - path: "src/components/AssumptionsBlock.tsx"
      provides: "Widened component accepting optional assumptions?: string[] prop"
      contains: "assumptions?: string[]"
    - path: "src/components/TaxReturnAssistant.tsx"
      provides: "Form I wiring that passes engine-derived assumption rows to AssumptionsBlock"
      contains: "result.meta.anomalies"
    - path: "src/components/EntityForm.tsx"
      provides: "2 new Individual-conditional form fields (dependants integer + spouseIncome decimal-string)"
      contains: "entity-dependants"
  key_links:
    - from: "src/lib/tax/returns/fy2026/individual.ts"
      to: "src/lib/tax/rates/fy2026/medicare.ts"
      via: "medicareLevyFY2026 call now passes dependants + spouseIncome from entity (via isFamilyFiling gate)"
      pattern: "isFamily\\s*\\?\\s*'family'\\s*:\\s*'single'"
    - from: "src/components/TaxReturnAssistant.tsx"
      to: "src/components/AssumptionsBlock.tsx"
      via: "<AssumptionsBlock assumptions={assumptionRows} /> derived from result.meta.anomalies"
      pattern: "<AssumptionsBlock\\s+assumptions="
    - from: "src/components/EntityForm.tsx"
      to: "src/types.ts"
      via: "formData.dependants + formData.spouseIncome bind to Entity v6 additions"
      pattern: "formData\\.dependants|formData\\.spouseIncome"
---

<objective>
Wire the Wave-1 family engine into the application: (1) `computeIndividualReturn` calls `isFamilyFiling`, passes `dependants` + `spouseIncome` through to `medicareLevyFY2026`, emits a `'assumption-family-medicare'` row when family applies (SUPPRESSING the static `'assumption-medicare-exempt'` row), and emits a `family-data-warn` anomaly for bad `spouseIncome` data; (2) `AssumptionsBlock` is widened with optional `assumptions?: string[]` prop (backward-compatible); (3) `TaxReturnAssistant` derives the assumption list from `result.meta.anomalies` and passes it to the widened block; (4) `EntityForm` gains 2 Individual-conditional fields (`dependants` integer, `spouseIncome` decimal-string) inside the existing 'Tax calculation settings' section.

Purpose: Close MED-02 + MED-03 + MED-04 end-to-end. User can now open an Individual entity, set `dependants: 2` and `spouseIncome: "60000"`, save it, and see the correct family-threshold Medicare levy in Form I with a plain-English assumption row disclosing the inputs and thresholds used.

Output: All 4 application-layer files widened; ~25 new tests covering compute (family branch, bad data anomaly, regression), AssumptionsBlock (dynamic prop, backward-compat fallback), TaxReturnAssistant (family entity shows family row, non-family unchanged), EntityForm (fields visible Individual only, blank → undefined). Estimated end-of-plan: ~893 SPA GREEN (~868 from Plan 08-1 + ~25 new); 0 RED.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/08-family-medicare-levy-engine/08-CONTEXT.md
@.planning/phases/08-family-medicare-levy-engine/08-RESEARCH.md
@.planning/phases/08-family-medicare-levy-engine/08-VALIDATION.md
@.planning/phases/08-family-medicare-levy-engine/08-1-PLAN.md
@src/lib/tax/returns/fy2026/individual.ts
@src/lib/tax/returns/fy2026/_helpers.ts
@src/lib/tax/returns/fy2026/__tests__/individual.test.ts
@src/lib/tax/rates/fy2026/medicare.ts
@src/components/AssumptionsBlock.tsx
@src/components/__tests__/AssumptionsBlock.test.tsx
@src/components/TaxReturnAssistant.tsx
@src/components/__tests__/TaxReturnAssistant.test.tsx
@src/components/EntityForm.tsx
@src/components/__tests__/EntityForm.test.tsx
@src/types.ts

<interfaces>
<!-- Interfaces SHIPPED by Plan 08-1 that Plan 08-2 consumes directly -->

From src/lib/tax/returns/fy2026/_helpers.ts (NEW from Plan 08-1):
```typescript
export function isFamilyFiling(entity: Entity): boolean;
// true iff (entity.dependants ?? 0) >= 1 OR entity.spouseIncome !== undefined
```

From src/lib/tax/rates/fy2026/medicare.ts (WIDENED by Plan 08-1):
```typescript
export interface MedicareLevyInput {
  taxableIncome: Decimal;
  hasPHC: boolean;
  filingStatus: 'single' | 'family';
  dependants?: number;        // Phase 8 — passed through for family
  spouseIncome?: string;      // Phase 8 — decimal string
}
export function medicareLevyFY2026(input: MedicareLevyInput): MedicareLevyResult;
// Family branch now real (Plan 08-1); familyWarning is always undefined for family
```

From src/lib/tax/labels/fy2026.ts (NEW constants from Plan 08-1; needed for assumption-row text formatting):
```typescript
export const MEDICARE_LEVY_FAMILY_LOWER = '47238' as const;
export const MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER = '4338' as const;
```

From src/types.ts (Entity — _v:6 additions shipped Plan 08-1):
```typescript
export interface Entity {
  // ...existing fields...
  dependants?: number;
  spouseIncome?: string;
}
```

From src/lib/tax/returns/fy2026/types.ts (EXISTING — Anomaly shape Plan 08-2 emits new instances of):
```typescript
export interface Anomaly {
  id: string;
  severity: 'info' | 'warn';
  message: string;
  label?: string;  // ATO label code (e.g. 'M1') for inline rendering next to the row
}
```

From src/components/AssumptionsBlock.tsx (EXISTING — to be widened additively in this plan):
```typescript
export const ASSUMPTIONS: readonly string[];
export function AssumptionsBlock(): React.JSX.Element;
// WILL BECOME:
export function AssumptionsBlock(props?: { assumptions?: string[] }): React.JSX.Element;
```

From src/components/EntityForm.tsx (existing 'Tax calculation settings' grid — lines 438–490):
```typescript
// Grid: 2 columns md+, contains aggregatedTurnover (id=entity-aggregated-turnover) and paygInstalmentAmount (id=entity-payg-instalment)
// Phase 8 fields slot INSIDE this grid, wrapped in {formData.type === 'Individual' && (...)}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Widen computeIndividualReturn — family branch via isFamilyFiling + family-medicare assumption row + bad-spouseIncome anomaly</name>
  <files>
    src/lib/tax/returns/fy2026/individual.ts,
    src/lib/tax/returns/fy2026/__tests__/individual.test.ts
  </files>
  <read_first>
    - src/lib/tax/returns/fy2026/individual.ts (existing — full 183 lines; Task 1 surgically widens the medicare call site + assumption-row block)
    - src/lib/tax/returns/fy2026/_helpers.ts (Plan 08-1 added `isFamilyFiling` — import it here)
    - src/lib/tax/returns/fy2026/types.ts (Anomaly interface — for the new family-data-warn emission)
    - src/lib/tax/returns/fy2026/__tests__/individual.test.ts (existing Phase 5 tests — Task 1 adds family-branch tests at the end without breaking any of the existing single-branch tests)
    - src/lib/tax/rates/fy2026/medicare.ts (MedicareLevyInput widened by Plan 08-1; pass `dependants` + `spouseIncome` from entity when family)
    - src/lib/tax/labels/fy2026.ts (MEDICARE_LEVY_FAMILY_LOWER + MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER for assumption-row text)
    - .planning/phases/08-family-medicare-levy-engine/08-RESEARCH.md § "Pattern 5: `computeIndividualReturn` widening" (lines 336–395)
    - .planning/phases/08-family-medicare-levy-engine/08-CONTEXT.md § "Form I display + assumption disclosure" (4 sub-decisions) — exact assumption row text format
    - .planning/phases/08-family-medicare-levy-engine/08-CONTEXT.md § "Bad data" decision — Anomaly {severity: 'warn', label: 'M1', message: 'Spouse income data invalid; family thresholds applied with $0 — verify input'}
  </read_first>
  <behavior>
    **Family-branch positive tests (≥ 4):**
    - Test IND-FAM-1: Individual entity with `dependants: 2, spouseIncome: "60000"` + fixture income 30000 → `result.labels.M1.value` matches family-threshold engine output (not single-engine output). Specifically: combined = 30000+60000 = 90000 ≥ effUpper(59047+(2×5422)=69891) → M1 = 30000 × 0.02 = `'600.00'`. (Note: P8 from fixture is 30000 per existing Test "P1 P2 P8 from GL" at line 58.)
    - Test IND-FAM-2: Single-parent fixture — `dependants: 2, spouseIncome: undefined` + income 30000 → spouse treated as $0; combined=30000 ≤ effLower(47238+(2×4338)=55914) → M1 = `'0.00'`
    - Test IND-FAM-3: DINK fixture — `dependants: 0, spouseIncome: "80000"` + income 30000 → effLower=47238 (no per-dependant); combined=30000+80000=110000 ≥ effUpper(59047) → M1 = 30000×0.02=`'600.00'`
    - Test IND-FAM-4: Assumption row PRESENT and FORMATTED CORRECTLY: family entity → exactly one anomaly with `id === 'assumption-family-medicare'`, `severity === 'info'`, and `message` matching exact format: `'Family Medicare levy applied — 2 dependants, spouse income $60000. Family threshold $47238; per-dependant adjustment $4338.'` (use MEDICARE_LEVY_FAMILY_LOWER + MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER constants in the format string interpolation)

    **Assumption-row REPLACEMENT tests (≥ 2):**
    - Test IND-FAM-5: Family entity → `result.meta.anomalies` does NOT include the static `'assumption-medicare-exempt'` row (replaced — not duplicated). The other 4 static assumption rows (marital, age, phc, dependants) ALSO follow the replacement rule per CONTEXT decision 4 "Replace the existing Phase 5 flat-2% warning entirely". Specifically: when family, suppress `'assumption-medicare-exempt'`, `'assumption-marital'`, `'assumption-dependants'` — these are absorbed into the family-medicare row. Keep `'assumption-age'` and `'assumption-phc'` (independent concerns).
    - Test IND-FAM-6: Non-family entity (Phase 5 regression) → all 5 original static assumption rows still present, including `'assumption-medicare-exempt'`; NO `'assumption-family-medicare'` row.

    **Bad-spouseIncome anomaly tests (≥ 2):**
    - Test IND-FAM-7: `dependants: 2, spouseIncome: "abc"` → engine treats spouse as $0 (best-effort); `result.meta.anomalies` contains exactly one row with `id === 'family-data-warn'`, `severity === 'warn'`, `label === 'M1'`, `message === 'Spouse income data invalid; family thresholds applied with $0 — verify input'`. M1 value = computed with spouse=0.
    - Test IND-FAM-8: `dependants: 2, spouseIncome: "-1000"` (negative) → same anomaly emission; spouse treated as $0.

    **Phase 5 regression tests (≥ 1):**
    - Test IND-FAM-9: Existing v1.0 Individual entity with NO family fields (both undefined) → all M1/M2 values match exact Phase 5 outputs; no `assumption-family-medicare` row; existing 5 assumption rows intact.
  </behavior>
  <action>
    1. **src/lib/tax/returns/fy2026/individual.ts** — surgical edits at 4 spots:

       **A. Imports (add 2)** — after line 20 (`import { medicareLevyFY2026 } from ...`) add:
       ```typescript
       import { isFamilyFiling } from './_helpers';
       import { Decimal as DecimalType } from '../../../money';  // already imported as `Decimal` line 12 — no change needed; this is just to confirm import is in place
       ```
       Also extend the existing `import { rollupByLabel } from './_helpers';` (line 16) to: `import { rollupByLabel, isFamilyFiling } from './_helpers';`. Plus add this import (after line 22):
       ```typescript
       import { MEDICARE_LEVY_FAMILY_LOWER, MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER } from '../../labels/fy2026';
       ```

       **B. Add family-eligibility + tolerant-parse block** — INSERT after line 77 (after `const item15 = p8;`):
       ```typescript

       // Phase 8 — family Medicare eligibility + tolerant spouseIncome parse (MED-02)
       const isFamily = isFamilyFiling(entity);
       const familyDependants = entity.dependants ?? 0;
       let familyBadDataAnomaly: Anomaly | undefined;
       let familySpouseIncomeForCall: string | undefined;
       if (isFamily) {
         if (entity.spouseIncome === undefined) {
           familySpouseIncomeForCall = '0';
         } else {
           // Tolerant parse: invalid → treat as '0' + emit warn anomaly
           try {
             const parsed = new Decimal(entity.spouseIncome);
             if (parsed.isNaN() || !parsed.isFinite() || parsed.isNegative()) {
               throw new Error('invalid');
             }
             familySpouseIncomeForCall = entity.spouseIncome;
           } catch {
             familySpouseIncomeForCall = '0';
             familyBadDataAnomaly = {
               id: 'family-data-warn',
               severity: 'warn',
               label: 'M1',
               message: 'Spouse income data invalid; family thresholds applied with $0 — verify input',
             };
           }
         }
       }
       ```

       **C. Replace the existing `medicareLevyFY2026` call** (lines 81–85) with:
       ```typescript
       const medicare = medicareLevyFY2026({
         taxableIncome: item15,
         hasPHC: true,
         filingStatus: isFamily ? 'family' : 'single',
         dependants: isFamily ? familyDependants : undefined,
         spouseIncome: isFamily ? familySpouseIncomeForCall : undefined,
       });
       ```

       **D. Rewrite the static `assumptionTexts` block** (lines 102–111) — replace with:
       ```typescript
       // Phase 8 — assumption rows; family entity REPLACES marital/medicare-exempt/dependants with one family row
       if (isFamily) {
         const familySpouseDisplay = entity.spouseIncome ?? '0';
         const familyMessage =
           `Family Medicare levy applied — ${familyDependants} dependants, spouse income $${familySpouseDisplay}. ` +
           `Family threshold $${MEDICARE_LEVY_FAMILY_LOWER}; per-dependant adjustment $${MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER}.`;
         anomalies.push({ id: 'assumption-family-medicare', severity: 'info', message: familyMessage });
         // age + phc still apply (independent concerns)
         anomalies.push({ id: 'assumption-age', severity: 'info', message: 'Age: under 65 (no Seniors and Pensioners Tax Offset applied)' });
         anomalies.push({ id: 'assumption-phc', severity: 'info', message: 'Private health cover: assumed (no Medicare Levy Surcharge applied)' });
       } else {
         // Phase 5 baseline: 5 static rows preserved (regression-safe for v1.0 entities)
         const assumptionTexts: [string, string][] = [
           ['assumption-marital',        'Marital status: single (no spouse income captured)'],
           ['assumption-age',            'Age: under 65 (no Seniors and Pensioners Tax Offset applied)'],
           ['assumption-medicare-exempt','Medicare exemption: none (full 2% levy applied unless shading applies)'],
           ['assumption-phc',            'Private health cover: assumed (no Medicare Levy Surcharge applied)'],
           ['assumption-dependants',     'Dependants: zero'],
         ];
         for (const [id, message] of assumptionTexts) {
           anomalies.push({ id, severity: 'info', message });
         }
       }

       // Phase 8 — emit bad-data anomaly if spouseIncome failed parse
       if (familyBadDataAnomaly) {
         anomalies.push(familyBadDataAnomaly);
       }
       ```

    2. **src/lib/tax/returns/fy2026/__tests__/individual.test.ts** — APPEND a new `describe` block at the end (do NOT modify the existing Phase 5 tests):

       ```typescript
       describe('computeIndividualReturn — family Medicare engine (Phase 8 — MED-02)', () => {
         const familyEntity: Entity = {
           ...fixtureEntity,
           dependants: 2,
           spouseIncome: '60000',
         };

         it('IND-FAM-1: family entity with dependants=2 + spouseIncome=60000 → M1 uses family engine (income 30000 combined 90000 above effUpper → 600.00)', () => {
           const r = computeIndividualReturn({
             entity: familyEntity,
             accounts: fixtureAccounts,
             entries: fixtureEntries,
             fy: 'FY2026',
           });
           expect(r.labels.M1.value.toFixed(2)).toBe('600.00');
         });

         it('IND-FAM-2: single-parent (dependants=2, spouseIncome=undefined) → spouse treated as 0 → M1 = 0 (combined 30000 ≤ effLower 55914)', () => {
           const r = computeIndividualReturn({
             entity: { ...fixtureEntity, dependants: 2 },
             accounts: fixtureAccounts,
             entries: fixtureEntries,
             fy: 'FY2026',
           });
           expect(r.labels.M1.value.toFixed(2)).toBe('0.00');
         });

         it('IND-FAM-3: DINK (dependants=undefined, spouseIncome=80000) → effLower=47238; combined 110000 ≥ effUpper 59047 → M1 = 600.00', () => {
           const r = computeIndividualReturn({
             entity: { ...fixtureEntity, spouseIncome: '80000' },
             accounts: fixtureAccounts,
             entries: fixtureEntries,
             fy: 'FY2026',
           });
           expect(r.labels.M1.value.toFixed(2)).toBe('600.00');
         });

         it('IND-FAM-4: family-medicare assumption row present with exact text', () => {
           const r = computeIndividualReturn({
             entity: familyEntity,
             accounts: fixtureAccounts,
             entries: fixtureEntries,
             fy: 'FY2026',
           });
           const familyRow = r.meta.anomalies.find((a) => a.id === 'assumption-family-medicare');
           expect(familyRow).toBeDefined();
           expect(familyRow?.severity).toBe('info');
           expect(familyRow?.message).toBe(
             'Family Medicare levy applied — 2 dependants, spouse income $60000. Family threshold $47238; per-dependant adjustment $4338.',
           );
         });

         it('IND-FAM-5: family entity DOES NOT include assumption-marital, assumption-medicare-exempt, or assumption-dependants rows', () => {
           const r = computeIndividualReturn({
             entity: familyEntity,
             accounts: fixtureAccounts,
             entries: fixtureEntries,
             fy: 'FY2026',
           });
           const ids = r.meta.anomalies.map((a) => a.id);
           expect(ids).not.toContain('assumption-marital');
           expect(ids).not.toContain('assumption-medicare-exempt');
           expect(ids).not.toContain('assumption-dependants');
           expect(ids).toContain('assumption-age');
           expect(ids).toContain('assumption-phc');
         });

         it('IND-FAM-6: non-family entity (Phase 5 regression) → all 5 original static assumption rows present', () => {
           const r = computeIndividualReturn({
             entity: fixtureEntity, // both family fields undefined
             accounts: fixtureAccounts,
             entries: fixtureEntries,
             fy: 'FY2026',
           });
           const ids = r.meta.anomalies.map((a) => a.id);
           expect(ids).toContain('assumption-marital');
           expect(ids).toContain('assumption-medicare-exempt');
           expect(ids).toContain('assumption-dependants');
           expect(ids).not.toContain('assumption-family-medicare');
         });

         it('IND-FAM-7: bad spouseIncome "abc" → family-data-warn anomaly emitted with severity warn + label M1', () => {
           const r = computeIndividualReturn({
             entity: { ...fixtureEntity, dependants: 2, spouseIncome: 'abc' },
             accounts: fixtureAccounts,
             entries: fixtureEntries,
             fy: 'FY2026',
           });
           const warn = r.meta.anomalies.find((a) => a.id === 'family-data-warn');
           expect(warn).toBeDefined();
           expect(warn?.severity).toBe('warn');
           expect(warn?.label).toBe('M1');
           expect(warn?.message).toBe('Spouse income data invalid; family thresholds applied with $0 — verify input');
           // M1 computed with spouse=0; combined 30000 ≤ effLower(55914 for 2 deps) → 0
           expect(r.labels.M1.value.toFixed(2)).toBe('0.00');
         });

         it('IND-FAM-8: negative spouseIncome "-1000" → same anomaly + spouse treated as 0', () => {
           const r = computeIndividualReturn({
             entity: { ...fixtureEntity, dependants: 2, spouseIncome: '-1000' },
             accounts: fixtureAccounts,
             entries: fixtureEntries,
             fy: 'FY2026',
           });
           const warn = r.meta.anomalies.find((a) => a.id === 'family-data-warn');
           expect(warn).toBeDefined();
         });

         it('IND-FAM-9: Phase 5 regression — entity with no family fields produces identical M1/M2 to Phase 5', () => {
           const r = computeIndividualReturn({
             entity: fixtureEntity,
             accounts: fixtureAccounts,
             entries: fixtureEntries,
             fy: 'FY2026',
           });
           // P8 = 30000 → single threshold path → above upper 35014 is FALSE; in shade-in zone
           // shaded = (30000 - 28011) × 0.10 = 198.90; full = 30000 × 0.02 = 600 → min = 198.90
           expect(r.labels.M1.value.toFixed(2)).toBe('198.90');
           expect(r.labels.M2.value.toFixed(2)).toBe('0.00'); // no MLS, income < tier 1
         });
       });
       ```

       NOTE on IND-FAM-9: the M1 value at 30000 income reflects the Plan-08-1-corrected MEDICARE_LEVY_SINGLE_LOWER=28011. If existing Phase 5 individual.test.ts had any test asserting M1 at $30k single, it will need updating (likely none — existing tests focus on P1/P2/P8 rollup, not M1 boundary). Verify by reading the full file before committing.

    Run `npx vitest run src/lib/tax/returns/fy2026/__tests__/individual.test.ts` and confirm GREEN.

    Commit: `feat(08-2): widen computeIndividualReturn — family branch + assumption row + bad-data anomaly (MED-02)`
  </action>
  <verify>
    <automated>npx vitest run src/lib/tax/returns/fy2026/__tests__/individual.test.ts --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "isFamilyFiling" src/lib/tax/returns/fy2026/individual.ts` returns ≥ 1
    - `grep -c "'assumption-family-medicare'" src/lib/tax/returns/fy2026/individual.ts` returns 1
    - `grep -c "'family-data-warn'" src/lib/tax/returns/fy2026/individual.ts` returns 1
    - `grep -c "filingStatus: isFamily \? 'family' : 'single'" src/lib/tax/returns/fy2026/individual.ts` returns 1
    - `grep -c "MEDICARE_LEVY_FAMILY_LOWER" src/lib/tax/returns/fy2026/individual.ts` returns ≥ 1
    - `grep -nE "parseFloat|Number\(" src/lib/tax/returns/fy2026/individual.ts` returns 0 matches on money-string usage (only on optional comment usage)
    - `npx vitest run src/lib/tax/returns/fy2026/__tests__/individual.test.ts` exits 0 with ≥ 9 new family tests GREEN + all existing Phase 5 tests still GREEN
    - `npx vitest run` total GREEN ≥ 877 (~868 from Plan 08-1 + 9 new); 0 RED
    - No `new Date()` introduced
  </acceptance_criteria>
  <done>computeIndividualReturn correctly derives family filing status from entity, passes through dependants + spouseIncome to widened medicare orchestrator, emits the assumption-family-medicare row with exact format, suppresses the 3 absorbed Phase 5 rows for family entities only, emits family-data-warn for bad spouseIncome, and preserves Phase 5 behaviour exactly for non-family entities. All 9 new tests GREEN; 0 RED.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Widen AssumptionsBlock with optional `assumptions?: string[]` prop (backward-compatible) + wire TaxReturnAssistant to derive and pass family-aware assumption rows</name>
  <files>
    src/components/AssumptionsBlock.tsx,
    src/components/__tests__/AssumptionsBlock.test.tsx,
    src/components/TaxReturnAssistant.tsx,
    src/components/__tests__/TaxReturnAssistant.test.tsx
  </files>
  <read_first>
    - src/components/AssumptionsBlock.tsx (existing 40 lines — hardcoded ASSUMPTIONS constant, no props)
    - src/components/__tests__/AssumptionsBlock.test.tsx (existing 3 tests — verify they still pass with widened component signature)
    - src/components/TaxReturnAssistant.tsx (line 248 — current `<AssumptionsBlock />` call site; line 124–129 has `inlineAnomaliesByLabel` reduce pattern — reference for the new `assumptionRows` derivation)
    - src/components/__tests__/TaxReturnAssistant.test.tsx (existing Phase 5 tests — Task 2 adds family-entity tests at the end)
    - .planning/phases/08-family-medicare-levy-engine/08-RESEARCH.md § "Pattern 6: `AssumptionsBlock` prop widening" (lines 398–432)
    - .planning/phases/08-family-medicare-levy-engine/08-CONTEXT.md § "Form I display + assumption disclosure" — exact format + replacement semantics
  </read_first>
  <behavior>
    **AssumptionsBlock tests (≥ 4):**
    - Test ABLOCK-1: existing 3 tests (lines 9–28 of current test file) STILL GREEN — backward compatibility (no prop = static ASSUMPTIONS rendered)
    - Test ABLOCK-2: NEW — `<AssumptionsBlock assumptions={['Custom row 1', 'Custom row 2']} />` renders exactly 2 `<li>` elements with the custom rows; does NOT render any of the static ASSUMPTIONS rows
    - Test ABLOCK-3: NEW — `<AssumptionsBlock assumptions={[]} />` renders the section header but an empty `<ul>` (zero `<li>` children) — empty array is RESPECTED, not falsy-coerced to default
    - Test ABLOCK-4: NEW — `<AssumptionsBlock />` (no prop) still renders the Phase 6 caveat footer "Phase 6 wizard will capture real values"; `<AssumptionsBlock assumptions={['x']} />` ALSO renders the caveat (caveat is independent of which assumptions are shown — keep as-is per CONTEXT decision "same AssumptionsBlock component pattern as Phase 5")

    **TaxReturnAssistant integration tests (≥ 3):**
    - Test TRA-FAM-1: Family entity (dependants:2, spouseIncome:"60000") with fixture income → rendered `[data-testid="assumptions-block"]` contains the text `'Family Medicare levy applied — 2 dependants, spouse income $60000.'` (substring match); does NOT contain `'Medicare exemption: none'` or `'Marital status: single'` or `'Dependants: zero'`
    - Test TRA-FAM-2: Non-family entity (Phase 5 regression) → rendered AssumptionsBlock contains all 5 original strings: `'Marital status: single (no spouse income captured)'`, `'Age: under 65 (no Seniors and Pensioners Tax Offset applied)'`, `'Medicare exemption: none (full 2% levy applied unless shading applies)'`, `'Private health cover: assumed (no Medicare Levy Surcharge applied)'`, `'Dependants: zero'`; does NOT contain `'Family Medicare levy applied'`
    - Test TRA-FAM-3: Family entity with bad spouseIncome → renders BOTH the family-medicare assumption row AND a warn-severity AnomalyBadge for `'family-data-warn'` (i.e. the family row is in AssumptionsBlock, the warn is in the consolidated Notices & Anomalies section)
  </behavior>
  <action>
    1. **src/components/AssumptionsBlock.tsx** — REWRITE with prop widening (preserve `ASSUMPTIONS` export for backward compat + existing test access):
       ```typescript
       /**
        * @license
        * SPDX-License-Identifier: Apache-2.0
        */
       import React from 'react';

       /**
        * The 5 fixed assumptions used in Phase 5 v1 Individual tax return computations
        * (single-filing default). Phase 8 — when the engine emits dynamic assumptions
        * (e.g. family Medicare row), TaxReturnAssistant passes them via the `assumptions` prop.
        */
       export const ASSUMPTIONS: readonly string[] = [
         'Marital status: single (no spouse income captured)',
         'Age: under 65 (no Seniors and Pensioners Tax Offset applied)',
         'Medicare exemption: none (full 2% levy applied unless shading applies)',
         'Private health cover: assumed (no Medicare Levy Surcharge applied)',
         'Dependants: zero',
       ] as const;

       export interface AssumptionsBlockProps {
         /**
          * Phase 8 — optional dynamic assumptions list. When provided, REPLACES the static ASSUMPTIONS
          * constant (empty array means render no rows). When omitted (legacy callers), falls back to
          * the static ASSUMPTIONS list for backward compat.
          */
         assumptions?: string[];
       }

       /**
        * Form I "Assumptions used" boxed section.
        * Phase 8: accepts optional `assumptions` prop; defaults to Phase 5 static ASSUMPTIONS.
        */
       export function AssumptionsBlock({ assumptions }: AssumptionsBlockProps = {}): React.JSX.Element {
         const rows = assumptions ?? ASSUMPTIONS;
         return (
           <section
             className="border border-gray-400 rounded p-4 my-4"
             data-testid="assumptions-block"
           >
             <h3 className="text-sm font-bold mb-2">Assumptions used by this working paper</h3>
             <ul className="text-xs text-gray-700 space-y-1">
               {rows.map((a, i) => (
                 <li key={i}>· {a}</li>
               ))}
             </ul>
             <p className="text-xs text-gray-500 mt-2 italic">Phase 6 wizard will capture real values.</p>
           </section>
         );
       }
       ```

    2. **src/components/__tests__/AssumptionsBlock.test.tsx** — APPEND 3 new tests after the existing describe block (keep existing 3 tests intact for backward-compat verification):
       ```typescript
       describe('AssumptionsBlock — Phase 8 dynamic assumptions prop', () => {
         it('renders the custom assumptions list when prop is provided', () => {
           render(<AssumptionsBlock assumptions={['Custom row 1', 'Custom row 2']} />);
           expect(screen.getByText('· Custom row 1')).toBeInTheDocument();
           expect(screen.getByText('· Custom row 2')).toBeInTheDocument();
           // Static rows NOT present
           expect(screen.queryByText(`· ${ASSUMPTIONS[0]}`)).not.toBeInTheDocument();
         });

         it('renders an empty list when assumptions=[] is provided (respects empty array)', () => {
           const { container } = render(<AssumptionsBlock assumptions={[]} />);
           const li = container.querySelectorAll('[data-testid="assumptions-block"] li');
           expect(li.length).toBe(0);
           expect(screen.getByText(/Assumptions used by this working paper/)).toBeInTheDocument();
         });

         it('keeps the Phase 6 caveat footer regardless of assumptions prop', () => {
           render(<AssumptionsBlock assumptions={['x']} />);
           expect(screen.getByText(/Phase 6 wizard will capture real values/)).toBeInTheDocument();
         });
       });
       ```

    3. **src/components/TaxReturnAssistant.tsx** — derive assumption rows + pass to AssumptionsBlock:

       **A. Insert just before the AssumptionsBlock call site** (replace line 248 region):
       ```tsx
             {/* Assumptions block — Phase 8: derived from engine anomalies, family-aware */}
             {(() => {
               const assumptionRows = result.meta.anomalies
                 .filter((a) => a.id.startsWith('assumption-'))
                 .map((a) => a.message);
               return <AssumptionsBlock assumptions={assumptionRows} />;
             })()}
       ```
       (The IIFE pattern keeps the derivation local to the JSX without adding a separate useMemo; the existing component is already memoized at the `result` level.)

       Alternative cleaner pattern — extract to a `useMemo` near the top (around line 124, next to `inlineAnomaliesByLabel`):
       ```typescript
       const assumptionRows = useMemo(
         () => result.meta.anomalies.filter((a) => a.id.startsWith('assumption-')).map((a) => a.message),
         [result.meta.anomalies],
       );
       ```
       And then `<AssumptionsBlock assumptions={assumptionRows} />` at line 248. Use this pattern.

    4. **src/components/__tests__/TaxReturnAssistant.test.tsx** — APPEND a new describe block at the end:
       ```typescript
       describe('TaxReturnAssistant — Phase 8 family Medicare integration (MED-03)', () => {
         it('TRA-FAM-1: family entity renders the family-medicare assumption row (not the flat-2% warning)', () => {
           const familyEntity: Entity = {
             ...fixtureEntity,
             dependants: 2,
             spouseIncome: '60000',
           };
           render(
             <TaxReturnAssistant
               entity={familyEntity}
               accounts={fixtureAccounts}
               entries={fixtureEntries}
               fy="FY2026"
             />,
           );
           const block = screen.getByTestId('assumptions-block');
           expect(block.textContent).toContain('Family Medicare levy applied — 2 dependants, spouse income $60000.');
           expect(block.textContent).not.toContain('Medicare exemption: none');
           expect(block.textContent).not.toContain('Marital status: single');
           expect(block.textContent).not.toContain('Dependants: zero');
         });

         it('TRA-FAM-2: non-family entity (Phase 5 regression) renders all 5 original static assumption rows', () => {
           render(
             <TaxReturnAssistant
               entity={fixtureEntity}
               accounts={fixtureAccounts}
               entries={fixtureEntries}
               fy="FY2026"
             />,
           );
           const block = screen.getByTestId('assumptions-block');
           expect(block.textContent).toContain('Marital status: single (no spouse income captured)');
           expect(block.textContent).toContain('Age: under 65');
           expect(block.textContent).toContain('Medicare exemption: none');
           expect(block.textContent).toContain('Private health cover: assumed');
           expect(block.textContent).toContain('Dependants: zero');
           expect(block.textContent).not.toContain('Family Medicare levy applied');
         });

         it('TRA-FAM-3: family entity with bad spouseIncome shows family assumption row AND family-data-warn in Notices section', () => {
           render(
             <TaxReturnAssistant
               entity={{ ...fixtureEntity, dependants: 2, spouseIncome: 'abc' }}
               accounts={fixtureAccounts}
               entries={fixtureEntries}
               fy="FY2026"
             />,
           );
           const block = screen.getByTestId('assumptions-block');
           expect(block.textContent).toContain('Family Medicare levy applied');
           // Bad-data warn appears in consolidated Notices & Anomalies section (rendered via AnomalyBadge)
           expect(screen.getByText(/Spouse income data invalid/i)).toBeInTheDocument();
         });
       });
       ```

    Run `npx vitest run src/components/__tests__/AssumptionsBlock.test.tsx src/components/__tests__/TaxReturnAssistant.test.tsx` and confirm GREEN.

    Commit: `feat(08-2): AssumptionsBlock dynamic prop + TaxReturnAssistant family-aware assumption wiring (MED-03)`
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/AssumptionsBlock.test.tsx src/components/__tests__/TaxReturnAssistant.test.tsx --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "assumptions?: string\[\]" src/components/AssumptionsBlock.tsx` returns 1
    - `grep -c "assumptions ?? ASSUMPTIONS" src/components/AssumptionsBlock.tsx` returns 1
    - `grep -c "export const ASSUMPTIONS" src/components/AssumptionsBlock.tsx` returns 1 (preserved for backward compat + existing test imports)
    - `grep -cE "<AssumptionsBlock\s+assumptions=" src/components/TaxReturnAssistant.tsx` returns 1
    - `grep -c "id.startsWith('assumption-')" src/components/TaxReturnAssistant.tsx` returns 1
    - `npx vitest run src/components/__tests__/AssumptionsBlock.test.tsx` exits 0 with 6 GREEN tests (3 existing + 3 new); 0 RED
    - `npx vitest run src/components/__tests__/TaxReturnAssistant.test.tsx` exits 0 with all existing tests + 3 new GREEN; 0 RED
    - `npx vitest run` total GREEN ≥ 883 (~877 from Task 1 + ~6 new); 0 RED
  </acceptance_criteria>
  <done>AssumptionsBlock is additively widened with optional `assumptions?: string[]` prop; existing 3 tests still GREEN; TaxReturnAssistant derives assumption rows from result.meta.anomalies and passes them to the widened block; family entities show the family row in Form I and suppress the absorbed Phase 5 rows; non-family entities are visually identical to Phase 5; bad-data warn renders in the Notices section; ≥ 6 new tests GREEN; 0 RED.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: EntityForm — add 2 Individual-conditional fields (`dependants` integer + `spouseIncome` decimal-string) inside Tax calculation settings; blank → undefined; hidden when type ≠ Individual</name>
  <files>
    src/components/EntityForm.tsx,
    src/components/__tests__/EntityForm.test.tsx
  </files>
  <read_first>
    - src/components/EntityForm.tsx (full file ~500 lines; focus on lines 438–490 'Tax calculation settings' section + line 26–53 formData init)
    - src/components/__tests__/EntityForm.test.tsx (existing Phase 4/5/6 tests — Task 3 appends Phase 8 tests at the end)
    - src/types.ts (Entity._v:6 fields — `dependants?: number` + `spouseIncome?: string`)
    - .planning/phases/08-family-medicare-levy-engine/08-RESEARCH.md § "Pattern 8: EntityForm field insertion" (lines 472–541) — exact JSX skeleton + insertion point + grid consideration
    - .planning/phases/08-family-medicare-levy-engine/08-CONTEXT.md § "EntityForm UX" (4 sub-decisions) — placement, help text wording, validation rules, conditional rendering
  </read_first>
  <behavior>
    **Visibility tests (≥ 3):**
    - Test EF-FAM-1: Individual entity → BOTH `[id="entity-dependants"]` and `[id="entity-spouse-income"]` are present in DOM
    - Test EF-FAM-2: Company entity (default new entity) → NEITHER field is present in DOM
    - Test EF-FAM-3: Switching type from Individual → Company hides both fields; switching back to Individual reveals them again with prior values preserved (formData state untouched)

    **Validation/binding tests (≥ 4):**
    - Test EF-FAM-4: Typing `'3'` in dependants → `formData.dependants === 3` (integer parsed); save calls `onSave` with `dependants: 3`
    - Test EF-FAM-5: Clearing dependants (blank input) → `formData.dependants === undefined` (NOT 0); save calls `onSave` with `dependants: undefined`
    - Test EF-FAM-6: Typing `'60000.50'` in spouseIncome → `formData.spouseIncome === '60000.50'` (string preserved verbatim); save calls `onSave` with `spouseIncome: '60000.50'`
    - Test EF-FAM-7: Clearing spouseIncome (blank input) → `formData.spouseIncome === undefined` (NOT empty string); save calls `onSave` with `spouseIncome: undefined`
    - Test EF-FAM-8: Negative dependants input `'-2'` → clamped to 0 (via `Math.max(0, ...)`) per Research Pattern 8 line 500–502

    **Help text tests (≥ 1):**
    - Test EF-FAM-9: Both fields render their inline help text exactly: dependants `'Number of children under 18 you supported (used for Medicare levy family thresholds).'` and spouseIncome `'Your spouse\'s taxable income for the financial year. Required if you had a spouse for any part of the year.'`
    - Test EF-FAM-10: Neither help text contains the word `'deductible'` or `'deduction'` (Phase 6 content-lint invariant from STATE.md architecture invariants)

    **Round-trip preservation test (≥ 1):**
    - Test EF-FAM-11: Open EntityForm with an existing Individual entity carrying `dependants: 2, spouseIncome: '60000'` → form prefills both fields; switching type to Company hides them; switching back to Individual restores `dependants: 2, spouseIncome: '60000'` in the visible inputs (preserved in formData throughout)
  </behavior>
  <action>
    1. **src/components/EntityForm.tsx** — INSERT a new field block inside the 'Tax calculation settings' grid at line 488–489 region (after the paygInstalmentAmount block's closing `</div>` on line 488; BEFORE the grid's closing `</div>` on line 489). Wrap the new block in the Individual-conditional gate:

       ```tsx
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
                     Your spouse&apos;s taxable income for the financial year. Required if you had a spouse for any part of the year.
                   </p>
                 </div>
               </>
             )}
       ```

       The grid is already `grid grid-cols-1 md:grid-cols-2 gap-6` (line 443). Adding 2 more children inside the same grid produces a 2×2 layout on md+ screens. No grid changes needed.

       **CRITICAL — type-switch preservation:** The existing `<select>` for entity type (search for `entity-type-select` aria-label or `formData.type` change handler) uses `setFormData({ ...formData, type: newType })`. This already preserves `dependants` and `spouseIncome` in formData even when the fields are hidden, because the spread operator copies all existing fields. No additional change needed — the conditional render only hides the inputs visually; the underlying state survives.

    2. **src/components/__tests__/EntityForm.test.tsx** — APPEND a new describe block at the end of the file:
       ```typescript
       describe('EntityForm — Phase 8 family Medicare fields (MED-04)', () => {
         it('EF-FAM-1: Individual entity renders dependants + spouseIncome fields', () => {
           const individual: Entity = {
             _v: 6,
             id: 'i1',
             name: 'Jane Doe',
             type: 'Individual',
             status: 'Active',
           };
           render(<EntityForm entity={individual} onSave={vi.fn()} onCancel={vi.fn()} />);
           expect(screen.getByLabelText('Dependant children count')).toBeInTheDocument();
           expect(screen.getByLabelText('Spouse taxable income ($)')).toBeInTheDocument();
         });

         it('EF-FAM-2: Company entity (default new) does NOT render the 2 Individual-only family fields', () => {
           render(<EntityForm onSave={vi.fn()} onCancel={vi.fn()} />);
           // Default new entity is Company
           expect(screen.queryByLabelText('Dependant children count')).not.toBeInTheDocument();
           expect(screen.queryByLabelText('Spouse taxable income ($)')).not.toBeInTheDocument();
         });

         it('EF-FAM-3: Switching type Individual → Company hides both fields; switching back reveals them', () => {
           const individual: Entity = {
             _v: 6, id: 'i1', name: 'Jane', type: 'Individual', status: 'Active',
             dependants: 2, spouseIncome: '60000',
           };
           render(<EntityForm entity={individual} onSave={vi.fn()} onCancel={vi.fn()} />);
           expect(screen.getByLabelText('Dependant children count')).toBeInTheDocument();
           const typeSelect = screen.getByLabelText('entity-type-select');
           fireEvent.change(typeSelect, { target: { value: 'Company' } });
           expect(screen.queryByLabelText('Dependant children count')).not.toBeInTheDocument();
           fireEvent.change(typeSelect, { target: { value: 'Individual' } });
           // Restored from formData (was preserved through the hide)
           const dependantsInput = screen.getByLabelText('Dependant children count') as HTMLInputElement;
           expect(dependantsInput.value).toBe('2');
           const spouseInput = screen.getByLabelText('Spouse taxable income ($)') as HTMLInputElement;
           expect(spouseInput.value).toBe('60000');
         });

         it('EF-FAM-4: typing "3" in dependants → onSave called with dependants: 3', () => {
           const onSave = vi.fn();
           const individual: Entity = { _v: 6, id: 'i1', name: 'Jane', type: 'Individual', status: 'Active' };
           render(<EntityForm entity={individual} onSave={onSave} onCancel={vi.fn()} />);
           fireEvent.change(screen.getByLabelText('Dependant children count'), { target: { value: '3' } });
           fireEvent.click(screen.getByRole('button', { name: /save|update entity/i }));
           expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ dependants: 3 }));
         });

         it('EF-FAM-5: clearing dependants input → onSave called with dependants: undefined (NOT 0)', () => {
           const onSave = vi.fn();
           const individual: Entity = { _v: 6, id: 'i1', name: 'Jane', type: 'Individual', status: 'Active', dependants: 2 };
           render(<EntityForm entity={individual} onSave={onSave} onCancel={vi.fn()} />);
           fireEvent.change(screen.getByLabelText('Dependant children count'), { target: { value: '' } });
           fireEvent.click(screen.getByRole('button', { name: /save|update entity/i }));
           expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ dependants: undefined }));
         });

         it('EF-FAM-6: typing "60000.50" in spouseIncome → onSave called with spouseIncome: "60000.50"', () => {
           const onSave = vi.fn();
           const individual: Entity = { _v: 6, id: 'i1', name: 'Jane', type: 'Individual', status: 'Active' };
           render(<EntityForm entity={individual} onSave={onSave} onCancel={vi.fn()} />);
           fireEvent.change(screen.getByLabelText('Spouse taxable income ($)'), { target: { value: '60000.50' } });
           fireEvent.click(screen.getByRole('button', { name: /save|update entity/i }));
           expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ spouseIncome: '60000.50' }));
         });

         it('EF-FAM-7: clearing spouseIncome → onSave called with spouseIncome: undefined (NOT empty string)', () => {
           const onSave = vi.fn();
           const individual: Entity = { _v: 6, id: 'i1', name: 'Jane', type: 'Individual', status: 'Active', spouseIncome: '60000' };
           render(<EntityForm entity={individual} onSave={onSave} onCancel={vi.fn()} />);
           fireEvent.change(screen.getByLabelText('Spouse taxable income ($)'), { target: { value: '' } });
           fireEvent.click(screen.getByRole('button', { name: /save|update entity/i }));
           expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ spouseIncome: undefined }));
         });

         it('EF-FAM-8: negative dependants input "-2" clamped to 0', () => {
           const onSave = vi.fn();
           const individual: Entity = { _v: 6, id: 'i1', name: 'Jane', type: 'Individual', status: 'Active' };
           render(<EntityForm entity={individual} onSave={onSave} onCancel={vi.fn()} />);
           fireEvent.change(screen.getByLabelText('Dependant children count'), { target: { value: '-2' } });
           fireEvent.click(screen.getByRole('button', { name: /save|update entity/i }));
           // Math.max(0, parseInt('-2',10)||0) = max(0,-2) = 0; but the parseInt('-2') returns -2, NOT 0
           // Actually: Math.max(0, -2) = 0 → stored as 0
           expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ dependants: 0 }));
         });

         it('EF-FAM-9: dependants + spouseIncome help text rendered exactly', () => {
           const individual: Entity = { _v: 6, id: 'i1', name: 'Jane', type: 'Individual', status: 'Active' };
           render(<EntityForm entity={individual} onSave={vi.fn()} onCancel={vi.fn()} />);
           expect(screen.getByText('Number of children under 18 you supported (used for Medicare levy family thresholds).')).toBeInTheDocument();
           expect(screen.getByText(/Your spouse('|’)s taxable income for the financial year\. Required if you had a spouse for any part of the year\./)).toBeInTheDocument();
         });

         it('EF-FAM-10: help text does NOT mention "deductible" or "deduction" (Phase 6 content lint)', () => {
           const individual: Entity = { _v: 6, id: 'i1', name: 'Jane', type: 'Individual', status: 'Active' };
           render(<EntityForm entity={individual} onSave={vi.fn()} onCancel={vi.fn()} />);
           const dependantsHelp = screen.getByText(/Number of children under 18/).textContent ?? '';
           const spouseHelp = screen.getByText(/Your spouse/).textContent ?? '';
           expect(dependantsHelp.toLowerCase()).not.toMatch(/deductib|deduction/);
           expect(spouseHelp.toLowerCase()).not.toMatch(/deductib|deduction/);
         });

         it('EF-FAM-11: prefilled Individual entity round-trip — values survive type-switch hide/show', () => {
           const individual: Entity = {
             _v: 6, id: 'i1', name: 'Jane', type: 'Individual', status: 'Active',
             dependants: 4, spouseIncome: '99999.99',
           };
           render(<EntityForm entity={individual} onSave={vi.fn()} onCancel={vi.fn()} />);
           const deps = screen.getByLabelText('Dependant children count') as HTMLInputElement;
           const spouse = screen.getByLabelText('Spouse taxable income ($)') as HTMLInputElement;
           expect(deps.value).toBe('4');
           expect(spouse.value).toBe('99999.99');
         });
       });
       ```

       NOTE on EF-FAM-8: `parseInt('-2', 10) = -2`. The expression `Math.max(0, parseInt(v, 10) || 0)` evaluates to `Math.max(0, -2) = 0` because `-2 || 0` is `-2` (truthy), then `max(0, -2) = 0`. Confirmed: clamped to 0.

       NOTE: the test `vi.fn()` import and other React Testing Library imports are already at the top of EntityForm.test.tsx (lines 1–3). The `Entity` type import needs to be added at the top: `import type { Entity } from '../../types';` if not already imported by the existing test file.

    Run `npx vitest run src/components/__tests__/EntityForm.test.tsx` and confirm GREEN.

    Commit: `feat(08-2): EntityForm — Individual-conditional dependants + spouseIncome fields (MED-04)`
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/EntityForm.test.tsx --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "id=\"entity-dependants\"" src/components/EntityForm.tsx` returns 1
    - `grep -c "id=\"entity-spouse-income\"" src/components/EntityForm.tsx` returns 1
    - `grep -c "formData\.type === 'Individual'" src/components/EntityForm.tsx` returns ≥ 1 (the Phase 8 conditional gate)
    - `grep -c "Number of children under 18 you supported" src/components/EntityForm.tsx` returns 1
    - `grep -c "Math.max(0, parseInt(v, 10) || 0)" src/components/EntityForm.tsx` returns 1
    - `grep -ciE "deductible|deduction" src/components/EntityForm.tsx` should be 0 inside Phase 8 help text (read-only check: the existing PAYG/aggregatedTurnover blocks may have unrelated mentions; verify no new occurrences in the Phase 8 conditional)
    - `npx vitest run src/components/__tests__/EntityForm.test.tsx` exits 0 with ≥ 11 new tests GREEN + all existing tests still GREEN
    - `npx vitest run` total GREEN ≥ 894 (~883 from Task 2 + ≥ 11 new); 0 RED
    - `npx tsc --noEmit` exits 0 (formData typed as Entity; new fields type-check)
  </acceptance_criteria>
  <done>EntityForm renders the 2 new fields ONLY when entity.type === 'Individual'; both fields default blank → undefined (preserving the spouseIncome="0" vs undefined semantic distinction documented in CONTEXT); switching entity type hides the fields without losing state; help text is plain-English and does not mention deductibility; all 11+ new tests GREEN; 0 RED.</done>
</task>

</tasks>

<verification>
After all 3 tasks complete:

1. **Full test suite GREEN:** `npx vitest run` exits 0; total ≥ 894 SPA GREEN (~868 from Plan 08-1 + ~26 from this plan); 0 RED.
2. **TypeScript clean:** `npx tsc --noEmit` exits 0.
3. **Lint clean:** `npm run lint` (or equivalent) exits 0.
4. **End-to-end family flow integration check (sanity, optional automated):** Construct an Individual entity with `dependants: 2, spouseIncome: "60000"`, run `computeIndividualReturn`, inspect `result.meta.anomalies` — must contain exactly one `'assumption-family-medicare'` row with the exact text format from RESEARCH; must NOT contain `'assumption-marital'`, `'assumption-medicare-exempt'`, `'assumption-dependants'`; M1 must equal family-engine output, not single-engine output.
5. **No accidental new `new Date()`:** `grep -rn "new Date()" src/lib/tax/returns/fy2026/individual.ts src/components/AssumptionsBlock.tsx src/components/TaxReturnAssistant.tsx src/components/EntityForm.tsx` returns 0.
6. **Phase 5 single-Medicare regression check:** any pre-existing test that asserted single-Medicare M1 values at the boundaries 27222/34028 should already be updated by Plan 08-1 Task 2. Verify by running `npx vitest run src/lib/tax/__tests__/` — all GREEN.
7. **No decimal precision loss:** `grep -nE "parseFloat|Number\(" src/lib/tax/returns/fy2026/individual.ts` returns 0 matches on money strings (only existing template-literal usages on rate constants, if any).
</verification>

<success_criteria>
- `computeIndividualReturn` derives `filingStatus` via `isFamilyFiling(entity)` and passes `dependants` + `spouseIncome` through to `medicareLevyFY2026` when family
- Bad `spouseIncome` (parse failure, NaN, infinite, or negative) → engine treats as `'0'` and emits a `family-data-warn` `Anomaly` with `{severity: 'warn', label: 'M1', message: 'Spouse income data invalid; family thresholds applied with $0 — verify input'}`
- For family entities, `result.meta.anomalies` contains exactly one `'assumption-family-medicare'` row with the exact format `'Family Medicare levy applied — {N} dependants, spouse income ${X}. Family threshold $47238; per-dependant adjustment $4338.'` AND does NOT contain `'assumption-marital'`, `'assumption-medicare-exempt'`, `'assumption-dependants'` (absorbed/replaced per CONTEXT decision)
- For non-family entities, the existing 5 Phase 5 assumption rows are preserved IDENTICALLY (zero regression)
- `AssumptionsBlock` accepts optional `assumptions?: string[]` prop; existing 3 tests STILL GREEN (default fallback works); ≥ 3 new tests verify dynamic prop, empty-array respect, caveat-footer presence
- `TaxReturnAssistant` derives `assumptionRows` from `result.meta.anomalies` (filter `id.startsWith('assumption-')`, map to `.message`) and passes to widened `AssumptionsBlock`
- `EntityForm` renders 2 new fields (`entity-dependants` + `entity-spouse-income`) ONLY when `formData.type === 'Individual'`; blank input → `undefined` (NOT `0` for dependants, NOT `''` for spouseIncome); type-switch hides fields but preserves formData; help text is plain-English without mentioning deductibility
- Total SPA GREEN ≥ 894; 0 RED; total new tests in Plan 08-2 ≥ 26 (9 individual + 6 AssumptionsBlock + 3 TaxReturnAssistant + 11 EntityForm)
- No `new Date()` outside `src/lib/period.ts`; no `parseFloat`/`Number()` on money strings
- All 3 task commits land on main; Plan 08-3 (UAT) can proceed
</success_criteria>

<output>
After completion, create `.planning/phases/08-family-medicare-levy-engine/08-2-SUMMARY.md` capturing:
- Final test counts (GREEN/RED/todo for SPA + server)
- Files modified (4 source files + 4 test files)
- Number of new tests per file
- Exact assumption-row format string shipped + the IDs suppressed for family entities
- AssumptionsBlock prop signature shipped
- EntityForm field IDs + help text wording shipped
- Open concerns for Plan 08-3 (UAT scenarios: single-parent, DINK, 2-kid family, legacy v1.0 entity, bad spouseIncome) + Phase 5 single-Medicare regression check
- Commit SHAs (3 commits)
</output>
