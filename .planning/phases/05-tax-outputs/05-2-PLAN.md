---
phase: 05-tax-outputs
plan: 2
type: execute
wave: 2
depends_on: [1]
files_modified:
  - src/lib/tax/returns/fy2026/individual.ts
  - src/lib/tax/returns/fy2026/company.ts
  - src/lib/tax/returns/fy2026/__tests__/individual.test.ts
  - src/lib/tax/returns/fy2026/__tests__/company.test.ts
  - src/components/TaxReturnAssistant.tsx
  - src/components/__tests__/TaxReturnAssistant.test.tsx
  - src/components/CompanyTaxReturn.tsx
  - src/components/__tests__/CompanyTaxReturn.test.tsx
  - src/components/EntityForm.tsx
  - src/components/__tests__/EntityForm.test.tsx
autonomous: true
requirements:
  - IND-01
  - IND-02
  - IND-03
  - IND-04
  - COY-01
  - COY-02
  - COY-03
  - TAX-02
must_haves:
  truths:
    - "computeIndividualReturn rolls Form I + B&P labels (P1, P2, P8, item 15) from the GL via Wave-0 rollupByLabel; signature unchanged from 05-1"
    - "computeIndividualReturn applies marginalTaxFY2026 + litoFY2026 + medicareLevyFY2026 + smallBusinessIncomeOffset and emits the 5 Assumptions in meta.anomalies as info severity"
    - "computeCompanyReturn rolls Form C labels (6A/6F/6T/6S/7T) from the GL; calls brePassiveIncomePct + breRate; emits explicit basis text in meta"
    - "Success criterion #2 GREEN — 90%-dividend company → 30% rate + basis text 'passive income 90.00% exceeds 80% BREPI threshold (s.23AB)'"
    - "Standard $1M / 10% passive company → 25% + basis text 'passive income 10.00% ≤ 80% BREPI threshold'"
    - "computeCompanyReturn computes franking-account opening/movements/closing from CoA 3090 + dividend-received accounts; emits FDT anomaly when closing < 0"
    - "TaxReturnAssistant refactor renders Form I labels with ATO codes + plain-English titles; Print button on top; emits EXPORT_DATA audit; renders AssumptionsBlock; renders inline AnomalyBadges + bottom anomalies section"
    - "TaxReturnAssistant shows IND-04 small-business offset line when eligible (turnover < $5M + netSbIncome > 0) with the cap-at-$1,000 basis text"
    - "CompanyTaxReturn refactor renders Form C with explicit BRE basis text + franking-account section + Print button + EXPORT_DATA audit emission"
    - "EntityForm exposes `aggregatedTurnover` text field with computed default (from computeAggregatedTurnover) + helper text per CONTEXT decision"
    - "EntityForm exposes `paygInstalmentAmount` text field for Method-1 PAYG-I (BAS-04)"
    - "All 11 individual.test.ts + 5 company.test.ts + 6 TaxReturnAssistant + 3 CompanyTaxReturn + 2 EntityForm `it.todo` placeholders flip GREEN"
    - "TaxReturnAssistant + CompanyTaxReturn each render a `.print-form-i` / `.print-form-c` scoped container so print.css class-targeting works"
    - "StorageAdapter interface untouched; Phase 3 FINAL preserved"
    - "All Phase 1-4 tests stay GREEN (no regressions)"
  artifacts:
    - path: "src/lib/tax/returns/fy2026/individual.ts"
      provides: "Full computeIndividualReturn — Form I + B&P + LITO + Medicare + IND-04 offset + assumptions metadata"
      contains: "smallBusinessIncomeOffset"
    - path: "src/lib/tax/returns/fy2026/company.ts"
      provides: "Full computeCompanyReturn — Form C + BRE rate selection + franking account + FDT anomaly + explicit basis text"
      contains: "breRate"
    - path: "src/components/TaxReturnAssistant.tsx"
      provides: "Refactored Form I renderer — Print button + B&P schedule + Assumptions block + AnomalyBadges + IND-04 offset line"
      contains: "computeIndividualReturn"
    - path: "src/components/CompanyTaxReturn.tsx"
      provides: "Refactored Form C renderer — Print button + BRE basis text + franking account section + AnomalyBadges"
      contains: "computeCompanyReturn"
    - path: "src/components/EntityForm.tsx"
      provides: "Widened EntityForm — aggregatedTurnover field with auto-default + paygInstalmentAmount field"
      contains: "aggregatedTurnover"
  key_links:
    - from: "src/lib/tax/returns/fy2026/individual.ts"
      to: "src/lib/tax/rates/fy2026/{marginal,lito,medicare,smallBizOffset}.ts"
      via: "imports rate helpers"
      pattern: "marginalTaxFY2026|litoFY2026|medicareLevyFY2026|smallBusinessIncomeOffset"
    - from: "src/lib/tax/returns/fy2026/company.ts"
      to: "src/lib/tax/rates/fy2026/bre.ts"
      via: "imports brePassiveIncomePct + breRate"
      pattern: "brePassiveIncomePct|breRate"
    - from: "src/lib/tax/returns/fy2026/individual.ts"
      to: "src/lib/tax/aggregatedTurnover.ts"
      via: "computeAggregatedTurnover for IND-04 offset eligibility check"
      pattern: "computeAggregatedTurnover"
    - from: "src/components/TaxReturnAssistant.tsx"
      to: "src/lib/tax/returns/fy2026/individual.ts"
      via: "useMemo(() => computeIndividualReturn({ entity, accounts, entries, fy }), [...])"
      pattern: "computeIndividualReturn"
    - from: "src/components/CompanyTaxReturn.tsx"
      to: "src/lib/tax/returns/fy2026/company.ts"
      via: "useMemo(() => computeCompanyReturn(...))"
      pattern: "computeCompanyReturn"
    - from: "src/components/TaxReturnAssistant.tsx"
      to: "src/components/{PrintBanner,AnomalyBadge,AssumptionsBlock}.tsx"
      via: "imports + renders Wave-0 print primitives"
      pattern: "PrintBanner|AnomalyBadge|AssumptionsBlock"
    - from: "src/components/EntityForm.tsx"
      to: "src/lib/tax/aggregatedTurnover.ts"
      via: "auto-default computation"
      pattern: "computeAggregatedTurnover"
---

<objective>
Implement the Individual + Company tax-output features against the Wave-0 contracts from 05-1. This plan flips every IND-01..04 + COY-01..03 test scaffold from `.todo` to GREEN, AND surfaces the new behaviour through the refactored `TaxReturnAssistant` (Form I + B&P + LITO + Medicare + small-biz offset + assumptions + print) and `CompanyTaxReturn` (Form C + BRE rate selection + franking + print), plus extends `EntityForm` with the two new v4 fields (aggregatedTurnover + paygInstalmentAmount). Phase-5 success criteria #2 (BRE rate + 90%-dividend test) and #4 (Individual marginal + LITO + Medicare) are end-to-end after this plan; success criterion #5 (print structure) is met at the Form I / Form C surface.

Purpose: Closes the Individual + Company gap. Wave 0 (05-1) shipped the rate helpers + types + scaffolds; this plan fills the compute*Return bodies and wires them into UI. Runs in parallel with 05-3 (Trust + Partnership) because file-modified lists are DISJOINT (verified in checklist below). Runs sequentially after 05-1 because all rate helpers, shared types, print primitives, and Entity v4 widening must exist before this plan can consume them.

Output:
- `src/lib/tax/returns/fy2026/individual.ts` — full implementation (~180 line body replacing Wave 0 skeleton)
- `src/lib/tax/returns/fy2026/company.ts` — full implementation (~150 lines)
- `src/components/TaxReturnAssistant.tsx` — refactored (replaces existing Phase 2 placeholder, ~280 lines)
- `src/components/CompanyTaxReturn.tsx` — refactored (~240 lines)
- `src/components/EntityForm.tsx` — extended with 2 new fields (~30 line additive change)
- All 27 individual+company+component test scaffolds flip GREEN

After Plan 05-2, success criterion #2 is locked at the form level (a Company with $1M revenue × 90% dividend income triggers 30% applied with explicit basis text). Success criterion #4 is locked at the form level (Individual with $30k net SB income shows P1/P2/P8 + marginal tax + LITO + Medicare + the IND-04 offset).
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/05-tax-outputs/05-CONTEXT.md
@.planning/phases/05-tax-outputs/05-RESEARCH.md
@.planning/phases/05-tax-outputs/05-VALIDATION.md
@.planning/phases/05-tax-outputs/05-1-PLAN.md
@src/types.ts
@src/lib/money.ts
@src/lib/period.ts
@src/lib/tax/labels/fy2026.ts
@src/lib/tax/rates/fy2026/marginal.ts
@src/lib/tax/rates/fy2026/lito.ts
@src/lib/tax/rates/fy2026/medicare.ts
@src/lib/tax/rates/fy2026/bre.ts
@src/lib/tax/rates/fy2026/smallBizOffset.ts
@src/lib/tax/aggregatedTurnover.ts
@src/lib/tax/returns/fy2026/types.ts
@src/lib/tax/returns/fy2026/_helpers.ts
@src/components/TaxReturnAssistant.tsx
@src/components/CompanyTaxReturn.tsx
@src/components/EntityForm.tsx
@src/components/PrintBanner.tsx
@src/components/AnomalyBadge.tsx
@src/components/AssumptionsBlock.tsx

<interfaces>
<!-- FINAL contracts from Plan 05-1. DO NOT MODIFY any of these files. -->

From src/lib/tax/returns/fy2026/types.ts (Plan 05-1):
```typescript
export interface ReturnLabel { code: string; plainEnglish: string; value: Decimal; internalOnly?: boolean; natReference?: string; }
export interface Anomaly { id: string; severity: 'info' | 'warn'; label?: string; message: string; }
export interface ComputedReturn<T extends Record<string, ReturnLabel>> { labels: T; meta: { fy: string; entityType: 'Individual'|'Company'|'Trust'|'Partnership'; natReference: string; locked: boolean; anomalies: Anomaly[]; [extra: string]: unknown }; }

export interface IndividualReturnLabels {
  // Phase 2 preserved
  '6S': ReturnLabel; '6K': ReturnLabel; '6L': ReturnLabel; '6N': ReturnLabel; '6Q': ReturnLabel;
  // P8 schedule
  'P1': ReturnLabel; 'P2': ReturnLabel; 'P8': ReturnLabel; 'item15': ReturnLabel;
  'B': ReturnLabel; 'C': ReturnLabel; 'E': ReturnLabel; 'F': ReturnLabel; 'G': ReturnLabel; 'H': ReturnLabel; 'I': ReturnLabel; 'J': ReturnLabel; 'K': ReturnLabel; 'L': ReturnLabel; 'N': ReturnLabel;
  // Medicare + LITO + small-biz offset
  'M1': ReturnLabel; 'M2': ReturnLabel; 'T1': ReturnLabel; 'item7D': ReturnLabel;
}
export interface CompanyReturnLabels {
  '6A': ReturnLabel; '6F': ReturnLabel; '6T': ReturnLabel; '6S': ReturnLabel; '7T': ReturnLabel;
  'CS_A': ReturnLabel; 'CS_B': ReturnLabel; 'CS_J': ReturnLabel; 'CS_S': ReturnLabel;
  'franking_open': ReturnLabel; 'franking_move': ReturnLabel; 'franking_close': ReturnLabel;
  // …other labels per widened CompanyLabel
}
```

From src/lib/tax/returns/fy2026/_helpers.ts (Plan 05-1):
```typescript
export function filterPostedEntries(entries: JournalEntry[]): JournalEntry[];
export function rollupByLabel<L extends string>(entries, accounts, labelField): Record<L, Decimal>;
```

From src/lib/tax/rates/fy2026/* (Plan 05-1 — all GREEN pure functions):
```typescript
export function marginalTaxFY2026(taxableIncome: Decimal): Decimal;
export function litoFY2026(taxableIncome: Decimal): Decimal;
export function medicareLevyFY2026(input): { levy: Decimal; surcharge: Decimal; basis: string; familyWarning?: string };
export function brePassiveIncomePct(accounts, entries, fy): { passivePct: Decimal; brepiTotal: Decimal; totalAssessable: Decimal; basis: string };
export function breRate(input): { rate: Decimal; isBre: boolean; basis: string; anomaly?: Anomaly };
export function smallBusinessIncomeOffset(input): { offset: Decimal; basis: string; anomaly?: Anomaly };
```

From src/lib/tax/aggregatedTurnover.ts (Plan 05-1):
```typescript
export function computeAggregatedTurnover(entity, accounts, entries, fy): Decimal;
```

From src/components/PrintBanner.tsx / AnomalyBadge.tsx / AssumptionsBlock.tsx (Plan 05-1):
```typescript
export function PrintBanner({ form, entityName, fy, locked? }): JSX.Element;
export function AnomalyBadge({ severity, message, label? }): JSX.Element;
export function AssumptionsBlock(): JSX.Element;
export const FULL_PRINT_DISCLAIMER: string;
export const FOOTER_DISCLAIMER: string;
```

From src/types.ts (Plan 05-1, v4):
```typescript
export interface Entity {
  // …
  aggregatedTurnover?: string;       // v4
  paygInstalmentAmount?: string;     // v4
}
```

Existing TaxReturnAssistant prop contract (preserve):
```typescript
interface TaxReturnAssistantProps {
  entity: Entity;
  accounts: Account[];
  entries: JournalEntry[];
  period?: Period;
  addLog?: (action: AuditAction, details: string, entityId?: string) => void;
  // Phase 5 additions (additive)
  fy?: FyLabel;
}
```
</interfaces>

</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: computeIndividualReturn + computeCompanyReturn full implementation; flip 11+ rates-consumer tests GREEN</name>
  <files>
    src/lib/tax/returns/fy2026/individual.ts,
    src/lib/tax/returns/fy2026/company.ts,
    src/lib/tax/returns/fy2026/__tests__/individual.test.ts,
    src/lib/tax/returns/fy2026/__tests__/company.test.ts
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/lib/tax/returns/fy2026/types.ts (Plan 05-1 — full label-set interfaces)
    - A:/Projects/AussieLedger/src/lib/tax/returns/fy2026/_helpers.ts (rollupByLabel pattern)
    - A:/Projects/AussieLedger/src/lib/tax/labels/fy2026.ts (full label catalogues + rate constants)
    - A:/Projects/AussieLedger/.planning/phases/05-tax-outputs/05-RESEARCH.md "ATO Field Codes" Individual + Company sections
    - A:/Projects/AussieLedger/.planning/phases/05-tax-outputs/05-CONTEXT.md "BRE conservative-passive calculation" + "Form I assumptions block" decisions
  </read_first>
  <behavior>
    - `computeIndividualReturn(input: ComputeIndividualInput): IndividualReturn` (replace Wave 0 empty body):
        1. Compute `aggregatedTurnover = computeAggregatedTurnover(entity, accounts, entries, fy)` (uses override if set).
        2. Run `rollupByLabel<IndividualLabel>(entries, accounts, 'taxLabel')` → raw label totals.
        3. Map raw totals into the 24+ label slots:
            - P1 = sum of all Revenue (gross business income) — taxLabels in {'6S','P1','B','C'}
            - P2 = sum of all Expense (business deductions) — taxLabels in {'6L','6N','6Q','P2','K','L','F'}
            - P8 = P1 − P2 (net small business income)
            - item15 = P8 (flow-through to main return)
            - B = "Gross payments where ABN not quoted" — label='B'
            - C = "Other business income" — label='C' / '6S'
            - J = "Gross interest" — label='6K' / 'J'
            - K = "Salary & wage expenses" — label='6L' / 'K'
            - L = "All other expenses" — label='6N' / 'L'
            - N = "Net income or loss from business" — derived = P8
            - (Other sub-labels default to 0; populated when user posts to those tax-label slots)
        4. Compute marginal tax = `marginalTaxFY2026(item15)`. Store in `CS_A`-equivalent for now, or use a `meta.taxBeforeOffsets` field. Recommendation: add `meta.taxBeforeOffsets: Decimal` and `meta.taxAfterOffsets: Decimal` for transparency in renderer.
        5. Compute LITO = `litoFY2026(item15)`. Store in label `T1`.
        6. Compute Medicare = `medicareLevyFY2026({ taxableIncome: item15, hasPHC: true, filingStatus: 'single' })` (defaults per CONTEXT assumptions). Store levy in `M1` and surcharge in `M2`.
        7. Compute IND-04 small-biz offset = `smallBusinessIncomeOffset({ netSbIncome: P8, aggregatedTurnover, totalTaxableIncome: item15, taxBeforeOffsets: marginalTax })`. Store offset in label `item7D`.
        8. Emit anomalies:
            - 5 Assumptions as info-severity anomalies with id prefix `assumption-`:
              `{ id: 'assumption-marital', severity: 'info', message: 'Marital status: single (no spouse income captured)' }` … etc. for age, medicare, PHC, dependants
            - Any anomaly from `breRate` is N/A here (Individual)
            - Anomaly from `smallBusinessIncomeOffset` if returned
            - Family-warning anomaly if `meta.familyWarning` set (not in Phase 5; Phase 6 wizard adds filingStatus='family' path)
            - Locked-FY anomaly: if `entity.lockedFys?.includes(fy)`, emit `{ id: 'locked-fy', severity: 'info', message: 'Locked FY — read-only working paper' }`
            - Negative-P8 anomaly per RESEARCH Pitfall 13: if P8 < 0, emit `{ id: 'nc-loss-rule', severity: 'warn', message: 'Business loss detected. Non-commercial losses (Div 35) may restrict offset against other income.' }`
        9. Build `labels: IndividualReturnLabels` populating each slot with `{ code, plainEnglish, value, natReference }` using the `INDIVIDUAL_LABELS_FULL` map from labels/fy2026.ts.
        10. Build `meta` with fy + entityType='Individual' + natReference='NAT 2541 + NAT 2543' + locked + anomalies + taxBeforeOffsets + taxAfterOffsets + ido + assumptionsList (echoed in renderer's AssumptionsBlock).
    - `computeCompanyReturn(input: ComputeCompanyInput): CompanyReturn` (replace Wave 0 empty body):
        1. Compute `aggregatedTurnover` same way as individual.
        2. Run `rollupByLabel<CompanyLabel>(entries, accounts, 'companyTaxLabel')`.
        3. Map raw totals into Form C labels:
            - 6A = gross sales (label '6A')
            - 6F = gross interest (label '6F')
            - 6T = total income (derived: 6A + 6D + 6E + 6F + 6H + 6R)
            - 6S = total expenses (derived: 6T-section costs)
            - 7T = taxable income (derived: 6T − 6S)
        4. Compute BRE:
            - `passive = brePassiveIncomePct(accounts, entries, fy)`
            - `bre = breRate({ passivePct: passive.passivePct, aggregatedTurnover, totalAssessable: passive.totalAssessable })`
            - Store rate in `meta.taxRate` + basis in `meta.taxRateBasis`
        5. Compute tax payable = `7T × bre.rate`. Store in label `CS_B`.
        6. Compute franking-account:
            - Opening = balance of CoA 3090 "Franking Account Balance" at FY start (use period query)
            - Movements = sum of franking-credit-related transactions in FY (look for accounts whose name includes 'Franking' or whose `companyTaxLabel === '6H'` to derive franking credits received)
            - Closing = opening + movements
            - Store in labels `franking_open`, `franking_move`, `franking_close`
            - If closing < 0, emit FDT anomaly `{ id: 'fdt-warning', severity: 'warn', message: 'Franking account closing balance is negative — Franking Deficit Tax (FDT) may apply.' }`
        7. Emit anomalies:
            - Any from `breRate` (the 70-90% borderline)
            - The FDT anomaly above
            - Locked-FY anomaly if applicable
    - Tests:
        - `individual.test.ts`: replace `it.todo` with real `it(...)` bodies per 05-VALIDATION.md. Use fixture journals (one Revenue $50k, one Expense $20k, no PAYG accounts). Verify P1=50000, P2=20000, P8=30000, item15=30000. Verify LITO + Medicare + offset values.
        - `company.test.ts`: 5 tests including the 90%-dividend success criterion #2 test + the standard 25%-pass + 50M-turnover-forces-30% + franking-account opening/movements/closing + FDT-anomaly cases.
  </behavior>
  <action>
    Step 1 — Replace empty body of `src/lib/tax/returns/fy2026/individual.ts` with the full implementation. Reuse helper signatures from Wave 0. The flow:
    ```typescript
    export function computeIndividualReturn(input: ComputeIndividualInput): IndividualReturn {
      const { entity, accounts, entries, fy } = input;
      const aggregatedTurnover = computeAggregatedTurnover(entity, accounts, entries, fy);
      const raw = rollupByLabel<IndividualLabel>(entries, accounts, 'taxLabel');

      // Compose P1/P2/P8 from sub-labels
      const p1 = (raw['6S'] ?? new Decimal(0)).plus(raw['6K'] ?? 0).plus(raw['B'] ?? 0).plus(raw['C'] ?? 0).plus(raw['J'] ?? 0);
      const p2 = (raw['6L'] ?? new Decimal(0)).plus(raw['6N'] ?? 0).plus(raw['6Q'] ?? 0).plus(raw['K'] ?? 0).plus(raw['L'] ?? 0).plus(raw['F'] ?? 0);
      const p8 = p1.minus(p2);
      const item15 = p8;

      const taxBeforeOffsets = marginalTaxFY2026(item15);
      const lito = litoFY2026(item15);
      const medicare = medicareLevyFY2026({ taxableIncome: item15, hasPHC: true, filingStatus: 'single' });
      const sbOffset = smallBusinessIncomeOffset({
        netSbIncome: p8,
        aggregatedTurnover,
        totalTaxableIncome: item15,
        taxBeforeOffsets,
      });
      const taxAfterOffsets = Decimal.max(0, taxBeforeOffsets.minus(lito).minus(sbOffset.offset)).plus(medicare.levy).plus(medicare.surcharge);

      const anomalies: Anomaly[] = [];
      // 5 assumptions
      [
        ['marital', 'Marital status: single (no spouse income captured)'],
        ['age', 'Age: under 65 (no Seniors and Pensioners Tax Offset applied)'],
        ['medicare-exempt', 'Medicare exemption: none (full 2% levy applied unless shading applies)'],
        ['phc', 'Private health cover: assumed (no Medicare Levy Surcharge applied)'],
        ['dependants', 'Dependants: zero'],
      ].forEach(([id, message]) => anomalies.push({ id: `assumption-${id}`, severity: 'info', message }));

      if (sbOffset.anomaly) anomalies.push(sbOffset.anomaly);
      if (p8.lessThan(0)) anomalies.push({
        id: 'nc-loss-rule',
        severity: 'warn',
        message: 'Business loss detected. Non-commercial losses (Div 35) may restrict offset against other income — review with your tax agent.',
      });
      const locked = (entity.lockedFys ?? []).includes(fy);
      if (locked) anomalies.push({ id: 'locked-fy', severity: 'info', message: 'Locked FY — read-only working paper.' });

      const makeLabel = (code: string, value: Decimal): ReturnLabel => {
        const meta = INDIVIDUAL_LABELS_FULL[code as IndividualLabel];
        return {
          code, value,
          plainEnglish: meta?.plainEnglish ?? code,
          natReference: meta?.natReference,
        };
      };

      return {
        labels: {
          P1: makeLabel('P1', p1),
          P2: makeLabel('P2', p2),
          P8: makeLabel('P8', p8),
          item15: makeLabel('item15', item15),
          // …populate all 24 slots, defaulting to Decimal(0) when not in raw
          M1: makeLabel('M1', medicare.levy),
          M2: makeLabel('M2', medicare.surcharge),
          T1: makeLabel('T1', lito),
          item7D: makeLabel('item7D', sbOffset.offset),
          // 6S/6K/6L/6N/6Q preserved
          '6S': makeLabel('6S', raw['6S'] ?? new Decimal(0)),
          '6K': makeLabel('6K', raw['6K'] ?? new Decimal(0)),
          '6L': makeLabel('6L', raw['6L'] ?? new Decimal(0)),
          '6N': makeLabel('6N', raw['6N'] ?? new Decimal(0)),
          '6Q': makeLabel('6Q', raw['6Q'] ?? new Decimal(0)),
          B: makeLabel('B', raw['B'] ?? new Decimal(0)),
          C: makeLabel('C', raw['C'] ?? new Decimal(0)),
          E: makeLabel('E', raw['E'] ?? new Decimal(0)),
          F: makeLabel('F', raw['F'] ?? new Decimal(0)),
          G: makeLabel('G', raw['G'] ?? new Decimal(0)),
          H: makeLabel('H', raw['H'] ?? new Decimal(0)),
          I: makeLabel('I', raw['I'] ?? new Decimal(0)),
          J: makeLabel('J', raw['J'] ?? new Decimal(0)),
          K: makeLabel('K', raw['K'] ?? new Decimal(0)),
          L: makeLabel('L', raw['L'] ?? new Decimal(0)),
          N: makeLabel('N', p8),
        } as IndividualReturnLabels,
        meta: {
          fy,
          entityType: 'Individual',
          natReference: 'NAT 2541 + NAT 2543',
          locked,
          anomalies,
          taxBeforeOffsets,
          taxAfterOffsets,
          sbOffsetBasis: sbOffset.basis,
          medicareBasis: medicare.basis,
          aggregatedTurnover: aggregatedTurnover.toFixed(2),
        },
      };
    }
    ```

    Step 2 — Replace empty body of `src/lib/tax/returns/fy2026/company.ts` with the analogous full implementation. Pattern:
    ```typescript
    export function computeCompanyReturn(input: ComputeCompanyInput): CompanyReturn {
      const { entity, accounts, entries, fy } = input;
      const aggregatedTurnover = computeAggregatedTurnover(entity, accounts, entries, fy);
      const raw = rollupByLabel<CompanyLabel>(entries, accounts, 'companyTaxLabel');

      const income6A = raw['6A'] ?? new Decimal(0);
      const income6D = raw['6D'] ?? new Decimal(0);
      const income6E = raw['6E'] ?? new Decimal(0);
      const income6F = raw['6F'] ?? new Decimal(0);
      const income6H = raw['6H'] ?? new Decimal(0);
      const income6R = raw['6R'] ?? new Decimal(0);
      const total6T = income6A.plus(income6D).plus(income6E).plus(income6F).plus(income6H).plus(income6R);

      const exp6C = raw['6C'] ?? new Decimal(0);
      const exp6G = raw['6G'] ?? new Decimal(0);
      const exp6Q = raw['6Q'] ?? new Decimal(0);
      const exp6U = raw['6U'] ?? new Decimal(0);
      const exp6X = raw['6X'] ?? new Decimal(0);
      const total6S = exp6C.plus(exp6G).plus(exp6Q).plus(exp6U).plus(exp6X);

      const taxable7T = total6T.minus(total6S);

      const passive = brePassiveIncomePct(accounts, entries, fy);
      const bre = breRate({ passivePct: passive.passivePct, aggregatedTurnover, totalAssessable: passive.totalAssessable });
      const taxPayable = Decimal.max(0, taxable7T.times(bre.rate)).toDecimalPlaces(2);

      // Franking account — find the account flagged as franking (by name match on 'Franking')
      const frankingAccount = accounts.find((a) => /Franking Account/i.test(a.name));
      let frankingOpen = new Decimal(0), frankingMove = new Decimal(0), frankingClose = new Decimal(0);
      if (frankingAccount) {
        // Opening — sum entries before FY start
        // Movements — sum entries in FY
        // Closing — sum of all
        // (Use isInPeriod with custom range from epoch to FY-1; movements with current FY)
        // …implementation per RESEARCH Pitfall 7
      }

      const anomalies: Anomaly[] = [];
      if (bre.anomaly) anomalies.push(bre.anomaly);
      if (frankingClose.lessThan(0)) {
        anomalies.push({ id: 'fdt-warning', severity: 'warn', message: 'Franking account closing balance is negative — Franking Deficit Tax (FDT) may apply.' });
      }
      const locked = (entity.lockedFys ?? []).includes(fy);
      if (locked) anomalies.push({ id: 'locked-fy', severity: 'info', message: 'Locked FY — read-only working paper.' });

      const makeLabel = (code: string, value: Decimal): ReturnLabel => {
        const meta = COMPANY_LABELS_FULL[code as CompanyLabel];
        return { code, value, plainEnglish: meta?.plainEnglish ?? code, natReference: meta?.natReference };
      };

      return {
        labels: {
          '6A': makeLabel('6A', income6A),
          '6F': makeLabel('6F', income6F),
          '6T': makeLabel('6T', total6T),
          '6S': makeLabel('6S', total6S),
          '7T': makeLabel('7T', taxable7T),
          'CS_A': makeLabel('CS_A', taxable7T),
          'CS_B': makeLabel('CS_B', taxPayable),
          'CS_J': makeLabel('CS_J', taxPayable),    // After offsets — none in v1
          'CS_S': makeLabel('CS_S', taxPayable),    // Same; PAYG instalments deducted at user step
          'franking_open': makeLabel('franking_open', frankingOpen),
          'franking_move': makeLabel('franking_move', frankingMove),
          'franking_close': makeLabel('franking_close', frankingClose),
          // …all other CompanyLabel slots zero by default
        } as CompanyReturnLabels,
        meta: {
          fy, entityType: 'Company',
          natReference: 'NAT 0656', locked, anomalies,
          taxRate: bre.rate.toString(),
          taxRateBasis: bre.basis,
          breIsBre: bre.isBre,
          passivePct: passive.passivePct.toFixed(4),
          totalAssessable: passive.totalAssessable.toFixed(2),
          brepiTotal: passive.brepiTotal.toFixed(2),
          aggregatedTurnover: aggregatedTurnover.toFixed(2),
        },
      };
    }
    ```

    Step 3 — Flip `individual.test.ts` from `it.todo` to real tests. For each `it.todo` placeholder, write a real `it(...)` block with fixture data and assertions:
    ```typescript
    describe('computeIndividualReturn', () => {
      const fixtureEntity: Entity = { _v: 4, id: 'st1', name: 'Acme Sole Trader', type: 'Individual', status: 'Active', aggregatedTurnover: '4000000' };
      const fixtureAccounts: Account[] = [
        { _v: 4, id: 'a-rev', code: '4010', name: 'Sales', type: 'Revenue', gstCode: 'GST', taxLabel: '6S' },
        { _v: 4, id: 'a-exp', code: '6010', name: 'Operating', type: 'Expense', gstCode: 'GST', taxLabel: '6N' },
      ];
      const fixtureEntries: JournalEntry[] = [
        { _v: 4, id: 'j1', date: '2025-08-15', reference: 'INV-001', description: 'Sale', isPosted: true, status: 'posted',
          lines: [
            { accountId: 'a-rev', description: '', debit: 0, credit: 50000, taxAmount: 0 },
            { accountId: 'a-cash', description: '', debit: 50000, credit: 0, taxAmount: 0 },
          ] },
        { _v: 4, id: 'j2', date: '2025-09-15', reference: 'EXP-001', description: 'Expense', isPosted: true, status: 'posted',
          lines: [
            { accountId: 'a-exp', description: '', debit: 20000, credit: 0, taxAmount: 0 },
            { accountId: 'a-cash', description: '', debit: 0, credit: 20000, taxAmount: 0 },
          ] },
      ];

      it('P1 P2 P8 from GL', () => {
        const r = computeIndividualReturn({ entity: fixtureEntity, accounts: fixtureAccounts, entries: fixtureEntries, fy: 'FY2026' });
        expect(r.labels.P1.value.toFixed(2)).toBe('50000.00');
        expect(r.labels.P2.value.toFixed(2)).toBe('20000.00');
        expect(r.labels.P8.value.toFixed(2)).toBe('30000.00');
      });
      // …etc.
    });
    ```

    Step 4 — Flip `company.test.ts` from `it.todo` to real tests. The 90%-dividend case (success criterion #2):
    ```typescript
    it('90 percent dividend triggers 30 percent with basis', () => {
      // $1M total income, $900k of which is dividends (label 6H)
      const accounts: Account[] = [
        { _v: 4, id: 'a-sales', code: '4010', name: 'Sales', type: 'Revenue', gstCode: 'GST', companyTaxLabel: '6A' },
        { _v: 4, id: 'a-div', code: '4210', name: 'Dividend Income', type: 'Revenue', gstCode: 'N-T', companyTaxLabel: '6H' },
      ];
      const entries: JournalEntry[] = [
        { _v: 4, id: 'j-s', date: '2025-08-15', reference: 'SALE', description: '', isPosted: true, status: 'posted',
          lines: [
            { accountId: 'a-sales', description: '', debit: 0, credit: 100000, taxAmount: 0 },
            { accountId: 'a-cash', description: '', debit: 100000, credit: 0, taxAmount: 0 },
          ] },
        { _v: 4, id: 'j-d', date: '2025-09-15', reference: 'DIV', description: '', isPosted: true, status: 'posted',
          lines: [
            { accountId: 'a-div', description: '', debit: 0, credit: 900000, taxAmount: 0 },
            { accountId: 'a-cash', description: '', debit: 900000, credit: 0, taxAmount: 0 },
          ] },
      ];
      const r = computeCompanyReturn({ entity: { _v: 4, id: 'c1', name: 'Pty', type: 'Company', status: 'Active' }, accounts, entries, fy: 'FY2026' });
      expect(r.meta.taxRate).toBe('0.3');
      expect(r.meta.taxRateBasis).toMatch(/passive income 90\.00% exceeds 80% BREPI threshold/);
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run src/lib/tax/returns/fy2026/__tests__/individual.test.ts src/lib/tax/returns/fy2026/__tests__/company.test.ts --reporter=verbose 2>&1 | tail -60</automated>
  </verify>
  <done>
    - All 5+ individual.test.ts cases GREEN (including IND-04 offset case)
    - All 5 company.test.ts cases GREEN (including the 90%-dividend success criterion #2 case)
    - `tsc --noEmit` exits 0
    - `npm run test` shows no regressions in existing Phase 1-4 tests
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Refactor TaxReturnAssistant (Form I + Print + Assumptions + AnomalyBadges + IND-04 offset row); flip 6 component tests GREEN</name>
  <files>
    src/components/TaxReturnAssistant.tsx,
    src/components/__tests__/TaxReturnAssistant.test.tsx
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/components/TaxReturnAssistant.tsx (current Phase 2 placeholder)
    - A:/Projects/AussieLedger/src/components/PrintBanner.tsx (Wave 0 — Form-I variant)
    - A:/Projects/AussieLedger/src/components/AnomalyBadge.tsx
    - A:/Projects/AussieLedger/src/components/AssumptionsBlock.tsx
    - A:/Projects/AussieLedger/src/lib/tax/returns/fy2026/individual.ts (now full implementation from Task 1)
    - A:/Projects/AussieLedger/src/lib/tax/labels/fy2026.ts (INDIVIDUAL_LABELS_FULL)
  </read_first>
  <behavior>
    - Refactor `TaxReturnAssistant.tsx` to:
        1. Import `computeIndividualReturn` + `PrintBanner` + `AnomalyBadge` + `AssumptionsBlock` + `FOOTER_DISCLAIMER` from Wave 0.
        2. Wrap entire return in `<section className="print-form-i">`.
        3. Render `<PrintBanner form="I" entityName={entity.name} fy={fy} locked={result.meta.locked} />` at the top.
        4. Compute result via `useMemo(() => computeIndividualReturn({ entity, accounts, entries, fy }), [entity, accounts, entries, fy])`.
        5. Render "Print working paper" button (top-right, `className="no-print"`) that calls `window.print()` then `addLog?.('EXPORT_DATA', JSON.stringify({ entityId: entity.id, form: 'I', fy, timestamp: today().toISOString() }), entity.id)`.
        6. Render main-return section: item 15 with ATO code label + plain English title:
            `<div>Net income/loss from business (Item 15): ${result.labels.item15.value.toFixed(2)}</div>`
        7. Render B&P schedule section: P1, P2, P8 + the sub-labels (B, C, J, K, L) each shown with ATO code + plain-English title.
        8. Render tax-calc section: marginal tax (`meta.taxBeforeOffsets`), LITO (`T1`), Medicare (`M1`), MLS (`M2`), small-biz offset (`item7D`), final tax payable (`meta.taxAfterOffsets`).
        9. Render `<AssumptionsBlock />` (always, per CONTEXT).
        10. Render Anomalies section at bottom: map `result.meta.anomalies` to `<AnomalyBadge />` per anomaly. Show inline (next to affected label) when `anomaly.label` is set, AND in a consolidated section.
        11. Render `<footer className="print-footer print-only">{FOOTER_DISCLAIMER}</footer>` (per-form footer).
        12. If `entity.lockedFys?.includes(fy)`, change the Print button label from "Print working paper" to "Print finalised return".
        13. Preserve any existing UI chrome from Phase 2 (entity-name header, period selector if present) but wrap them in `.no-print`.
    - Tests: flip all 6 `it.todo` placeholders to real `it(...)` bodies; verify renderings, audit emission, AnomalyBadge presence.
  </behavior>
  <action>
    Step 1 — Read current `TaxReturnAssistant.tsx` to identify the props contract and the existing UI structure (200 lines).

    Step 2 — Rewrite the component preserving the prop contract (`entity`, `accounts`, `entries`, `period`, `addLog`, with new optional `fy?: FyLabel`). Add:
    ```typescript
    import { useMemo } from 'react';
    import { computeIndividualReturn } from '../lib/tax/returns/fy2026/individual';
    import { PrintBanner, FOOTER_DISCLAIMER } from './PrintBanner';
    import { AnomalyBadge } from './AnomalyBadge';
    import { AssumptionsBlock } from './AssumptionsBlock';
    import { currentFy, today } from '../lib/period';
    import { INDIVIDUAL_LABELS_FULL } from '../lib/tax/labels/fy2026';
    ```
    Then the body:
    ```typescript
    const effectiveFy = fy ?? (period?.type === 'fy' ? period.fy : currentFy());
    const result = useMemo(
      () => computeIndividualReturn({ entity, accounts, entries, fy: effectiveFy }),
      [entity, accounts, entries, effectiveFy],
    );

    const handlePrint = () => {
      addLog?.('EXPORT_DATA', JSON.stringify({ entityId: entity.id, form: 'I', fy: effectiveFy, timestamp: today().toISOString() }), entity.id);
      window.print();
    };
    const isLocked = result.meta.locked;
    const inlineAnomaliesByLabel: Record<string, Anomaly[]> = {};
    for (const a of result.meta.anomalies) {
      if (a.label) (inlineAnomaliesByLabel[a.label] ??= []).push(a);
    }

    return (
      <section className="print-form-i p-4">
        <PrintBanner form="I" entityName={entity.name} fy={effectiveFy} locked={isLocked} />
        <header className="no-print flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Form I — {entity.name} ({effectiveFy})</h2>
          <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded">
            {isLocked ? 'Print finalised return' : 'Print working paper'}
          </button>
        </header>
        {/* Main return — Item 15 flow-through */}
        <section>
          <h3>Main Return</h3>
          <LabelRow code="Item 15" plainEnglish={INDIVIDUAL_LABELS_FULL.item15.plainEnglish} value={result.labels.item15.value} anomalies={inlineAnomaliesByLabel.item15} />
          {/* …M1 / M2 / T1 / item 7D */}
        </section>
        {/* B&P schedule */}
        <section className="mt-4">
          <h3>Business &amp; Professional Items Schedule (NAT 2543)</h3>
          <LabelRow code="P1" plainEnglish="Description of main business activity" value={result.labels.P1.value} />
          <LabelRow code="P2" plainEnglish="Total deductions" value={result.labels.P2.value} />
          <LabelRow code="P8" plainEnglish="Net small business income" value={result.labels.P8.value} />
          {/* sub-labels */}
        </section>
        <AssumptionsBlock />
        {/* Anomalies consolidated section */}
        <section className="mt-4">
          <h3>Anomalies</h3>
          <ul>
            {result.meta.anomalies.map((a) => (
              <li key={a.id}><AnomalyBadge severity={a.severity} message={a.message} label={a.label} /></li>
            ))}
          </ul>
        </section>
        <footer className="print-footer print-only">{FOOTER_DISCLAIMER}</footer>
      </section>
    );
    ```
    (`LabelRow` is a small helper component inlined in this file that renders `<div className="grid grid-cols-3 gap-2"><span>{code}</span><span>{plainEnglish}</span><span>${value.toFixed(2)}</span></div>` plus inline AnomalyBadges if any.)

    Step 3 — Update `__tests__/TaxReturnAssistant.test.tsx`: flip the 6 `it.todo` placeholders to real tests:
    ```typescript
    it('renders Form I with ATO codes and labels', () => {
      render(<TaxReturnAssistant entity={fixtureEntity} accounts={fixtureAccounts} entries={fixtureEntries} />);
      expect(screen.getByText(/Item 15/)).toBeInTheDocument();
      expect(screen.getByText(/Net income\/loss from business/)).toBeInTheDocument();
      expect(screen.getByText(/P1/)).toBeInTheDocument();
      expect(screen.getByText(/P8/)).toBeInTheDocument();
    });
    it('print button emits audit', () => {
      const addLog = vi.fn();
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      render(<TaxReturnAssistant entity={fixtureEntity} accounts={fixtureAccounts} entries={fixtureEntries} addLog={addLog} />);
      fireEvent.click(screen.getByText(/Print working paper/));
      expect(addLog).toHaveBeenCalledWith('EXPORT_DATA', expect.stringContaining('"form":"I"'), 'st1');
      expect(printSpy).toHaveBeenCalled();
    });
    it('renders assumptions block', () => {
      render(<TaxReturnAssistant entity={fixtureEntity} accounts={[]} entries={[]} />);
      expect(screen.getByTestId('assumptions-block')).toBeInTheDocument();
    });
    it('renders B and P schedule', () => {
      render(<TaxReturnAssistant entity={fixtureEntity} accounts={fixtureAccounts} entries={fixtureEntries} />);
      expect(screen.getByText(/Business & Professional Items Schedule/)).toBeInTheDocument();
    });
    it('shows item 7D when eligible', () => {
      const eligibleEntity = { ...fixtureEntity, aggregatedTurnover: '4000000' };
      render(<TaxReturnAssistant entity={eligibleEntity} accounts={fixtureAccounts} entries={fixtureEntries} />);
      expect(screen.getByText(/item7D|Small business income tax offset/i)).toBeInTheDocument();
    });
    it('anomalies inline and bottom section', () => {
      const lossEntity = fixtureEntity;
      const lossEntries: JournalEntry[] = [/* fixture causing P8 < 0 */];
      render(<TaxReturnAssistant entity={lossEntity} accounts={fixtureAccounts} entries={lossEntries} />);
      // Expect AnomalyBadge for non-commercial-losses
      expect(screen.getAllByTestId('anomaly-badge').length).toBeGreaterThan(0);
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/TaxReturnAssistant.test.tsx --reporter=verbose 2>&1 | tail -40</automated>
  </verify>
  <done>
    - All 6 TaxReturnAssistant Phase-5 tests GREEN
    - `npm run lint` exits 0
    - `npm run build` exits 0
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Refactor CompanyTaxReturn (Form C + BRE basis + franking + Print); extend EntityForm with aggregatedTurnover + paygInstalmentAmount; flip 3+2 tests GREEN</name>
  <files>
    src/components/CompanyTaxReturn.tsx,
    src/components/__tests__/CompanyTaxReturn.test.tsx,
    src/components/EntityForm.tsx,
    src/components/__tests__/EntityForm.test.tsx
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/components/CompanyTaxReturn.tsx (current Phase 2 placeholder)
    - A:/Projects/AussieLedger/src/components/EntityForm.tsx (current Phase 4 — 484 lines)
    - A:/Projects/AussieLedger/src/lib/tax/aggregatedTurnover.ts (Wave 0 helper)
    - A:/Projects/AussieLedger/src/lib/tax/returns/fy2026/company.ts (full implementation from Task 1)
  </read_first>
  <behavior>
    - `CompanyTaxReturn.tsx` refactor:
        - Pattern mirrors TaxReturnAssistant — `<section className="print-form-c">` with PrintBanner / Print button / FOOTER_DISCLAIMER / inline + consolidated AnomalyBadges.
        - Renders Form C labels: 6A (gross sales), 6F (interest), 6T (total income), 6S (total expenses), 7T (taxable income), CS_A (taxable income for CS), CS_B (tax payable).
        - Renders an "Applied Tax Rate" box prominently: `<div className="border p-2"><strong>{result.meta.taxRate * 100}% applied</strong><br /><em>{result.meta.taxRateBasis}</em></div>` — this satisfies success criterion #2 visual requirement.
        - Renders a Franking Account section: opening, movements, closing.
        - Print button emits EXPORT_DATA with `{ form: 'C', fy }`.
        - NO AssumptionsBlock (that's Individual-only).
    - `EntityForm.tsx` extension:
        - Add `aggregatedTurnover` field (text input accepting decimal-encoded string). Above the field, show the auto-computed default via `computeAggregatedTurnover(formState, accounts, entries, currentFy())` (if accounts + entries are reachable via props — verify the existing form gets them; if not, accept a callback prop `onComputeTurnover?: () => string`).
        - Helper text: "Includes connected entities + affiliates per s.328-115. Default shown is this entity's own GL revenue only — override if you have connected entities outside AussieLedger."
        - Add `paygInstalmentAmount` field (text input accepting decimal-encoded string) with helper text: "Method 1: enter the pre-calculated instalment amount from your ATO portal."
        - Both fields write back into the Entity record on save (the existing form-state mechanism extends additively).
    - Tests:
        - `CompanyTaxReturn.test.tsx`: 3 new Phase-5 tests:
            - `renders Form C with print button` — checks Form C labels visible + Print button present
            - `displays explicit BRE basis text` — render with 90%-dividend fixture, assert "30% applied" + "passive income 90.00% exceeds 80% BREPI threshold" text
            - `renders franking account section` — fixture with Franking Account entries; assert opening + movements + closing rendered
        - `EntityForm.test.tsx`: 2 new Phase-5 tests:
            - `aggregatedTurnover field with computed default` — render with fixture; assert input field present + computed default helper visible
            - `paygInstalmentAmount field` — render; assert input field present
  </behavior>
  <action>
    Step 1 — Refactor `CompanyTaxReturn.tsx` to:
    ```typescript
    import { useMemo } from 'react';
    import { computeCompanyReturn } from '../lib/tax/returns/fy2026/company';
    import { PrintBanner, FOOTER_DISCLAIMER } from './PrintBanner';
    import { AnomalyBadge } from './AnomalyBadge';
    import { currentFy, today } from '../lib/period';
    // …same prop contract as TaxReturnAssistant
    ```
    Body follows the same pattern as TaxReturnAssistant.tsx but with Form C labels and the prominent BRE-rate basis box. Make sure the basis text uses the exact substring expected by the success-criterion test: `${rate*100}% applied — passive income X.XX% (above/below) 80% BREPI threshold`.

    Step 2 — Edit `src/components/EntityForm.tsx`. Locate where existing v3 fields (gstRegistered, accountingMethod, fyEndDate) are rendered. Add after them:
    ```typescript
    {/* Phase 5 additions */}
    <div className="mb-4">
      <label className="block text-sm font-medium">Aggregated turnover ($)</label>
      <input
        type="text"
        value={formState.aggregatedTurnover ?? ''}
        onChange={(e) => setFormState({ ...formState, aggregatedTurnover: e.target.value })}
        placeholder={computedTurnoverDefault ?? '0.00'}
        className="border rounded p-2 w-full"
      />
      <p className="text-xs text-gray-500 mt-1">
        Includes connected entities + affiliates per s.328-115. Default shown is this entity's own GL revenue only — override if you have connected entities outside AussieLedger.
        {computedTurnoverDefault && <> Computed default: <strong>${computedTurnoverDefault}</strong></>}
      </p>
    </div>
    <div className="mb-4">
      <label className="block text-sm font-medium">PAYG instalment amount (T7, Method 1)</label>
      <input
        type="text"
        value={formState.paygInstalmentAmount ?? ''}
        onChange={(e) => setFormState({ ...formState, paygInstalmentAmount: e.target.value })}
        placeholder="0.00"
        className="border rounded p-2 w-full"
      />
      <p className="text-xs text-gray-500 mt-1">
        Method 1: enter the pre-calculated instalment amount from your ATO portal. The BAS T7 label reads this value.
      </p>
    </div>
    ```
    where `computedTurnoverDefault` is derived via `useMemo(() => accounts && entries ? computeAggregatedTurnover(formState as Entity, accounts, entries, currentFy()).toFixed(2) : null, [formState, accounts, entries])`. If accounts/entries aren't currently EntityForm props, accept them as optional props and gracefully default to null.

    Step 3 — Update `__tests__/CompanyTaxReturn.test.tsx` — flip the 3 Phase-5 `it.todo` placeholders to real tests with the 90%-dividend fixture matching the success criterion #2.

    Step 4 — Update `__tests__/EntityForm.test.tsx` — flip the 2 Phase-5 `it.todo` placeholders to real tests asserting the new fields render + the helper text is present.
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/CompanyTaxReturn.test.tsx src/components/__tests__/EntityForm.test.tsx --reporter=verbose 2>&1 | tail -40 && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
    - All 3 CompanyTaxReturn Phase-5 tests GREEN (including the success-criterion-#2 BRE basis text)
    - All 2 EntityForm Phase-5 tests GREEN
    - All existing Phase 4 EntityForm tests still GREEN
    - `npm run lint` exits 0
    - `npm run build` exits 0
    - `npm run test` overall — 0 regressions; 11+ new GREEN
  </done>
</task>

</tasks>

<verification>
1. `npm run lint` exits 0
2. `npm run build` exits 0 (Vite + tsc emit succeed)
3. `npm run test` exits 0; expected: ~409 (after 05-1) + ~16 new GREEN = ~425 SPA GREEN
4. `npm run test:server` exits 0 (18 server tests unchanged)
5. Success criterion #2 GREEN at form level: `npx vitest run src/lib/tax/returns/fy2026/__tests__/company.test.ts -t "90 percent dividend"` GREEN AND `npx vitest run src/components/__tests__/CompanyTaxReturn.test.tsx -t "displays explicit BRE basis text"` GREEN
6. Success criterion #4 GREEN at form level: `npx vitest run src/lib/tax/returns/fy2026/__tests__/individual.test.ts -t "P1 P2 P8"` GREEN AND TaxReturnAssistant renders all P8 labels
7. Success criterion #5 partial: Form I + Form C wrap in `.print-form-i` / `.print-form-c` and render PrintBanner; visual print verification deferred to Plan 05-4 UAT
8. Visual sanity: `npm run dev` then open the app, switch to an Individual entity, navigate to "Tax Return" view, confirm the Print button + Assumptions block + all labels visible
</verification>

<success_criteria>
- [x] **Success criterion #2 GREEN end-to-end** — Company tax return shows "30% applied" with "passive income 90.00% exceeds 80% BREPI threshold (s.23AB)" basis text on a 90%-dividend fixture; the unit test in `company.test.ts` is GREEN.
- [x] **Success criterion #4 GREEN end-to-end** — Individual return populates P1/P2/P8 + item 15 from GL; LITO + Medicare applied via marginalTaxFY2026 + litoFY2026 + medicareLevyFY2026; IND-04 small-biz offset visible when eligible.
- [x] **Requirement IND-01 GREEN** — Form I + B&P schedule populated from GL
- [x] **Requirement IND-02 GREEN** — P1/P2/P8/item 15 visible
- [x] **Requirement IND-03 GREEN** — marginal + LITO + Medicare applied
- [x] **Requirement IND-04 GREEN** — small-biz offset 16% × tax-on-SB-income, capped $1,000, turnover < $5M (item 7D)
- [x] **Requirement COY-01 GREEN** — Form C labels 6A/6F/6T/6S/7T from GL
- [x] **Requirement COY-02 GREEN** — BRE rate 25%/30% + explicit basis text
- [x] **Requirement COY-03 GREEN** — Franking account opening + movements + closing
- [x] **Requirement TAX-02 partial** — Print button + print-form-i/c CSS class scoping; full UAT in Plan 05-4
- [x] **StorageAdapter interface untouched** — Phase 3 FINAL preserved
- [x] **File-modified list is DISJOINT from 05-3** — verified:
  - 05-2: individual.ts, company.ts, TaxReturnAssistant.tsx, CompanyTaxReturn.tsx, EntityForm.tsx (+ their test files)
  - 05-3: trust.ts, partnership.ts, TrustTaxReturn.tsx, PartnershipTaxReturn.tsx (+ their test files)
  - Zero overlap; both READ Wave-0 helpers + types
</success_criteria>

<output>
After completion, create `.planning/phases/05-tax-outputs/05-2-SUMMARY.md` using the template. Capture:
- Test count delta (expected: ~16 new GREEN: 5 individual + 5 company + 6 TaxReturnAssistant + 3 CompanyTaxReturn + 2 EntityForm — minus any merged duplicates)
- Form I + Form C label rollup details (exactly which CoA accounts contribute to each label)
- BRE basis-text format used (exact regex pattern asserted by tests)
- IND-04 offset formula application notes (apportionment of tax-payable across SB vs total taxable income)
- Franking account opening/movements/closing approach (how the FY-period boundary is queried)
- EntityForm new field rendering details
- Any deviations from Wave 0 interfaces (none expected — flag immediately if so)
- Files modified count + lint/build/test exit codes
</output>
