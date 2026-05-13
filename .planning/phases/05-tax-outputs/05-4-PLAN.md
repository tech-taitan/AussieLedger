---
phase: 05-tax-outputs
plan: 4
type: execute
wave: 3
depends_on: [1, 2, 3]
files_modified:
  - src/lib/tax/returns/fy2026/bas.ts
  - src/lib/tax/returns/fy2026/ias.ts
  - src/lib/tax/returns/fy2026/__tests__/bas.test.ts
  - src/lib/tax/returns/fy2026/__tests__/ias.test.ts
  - src/components/BasIasAssistant.tsx
  - src/components/__tests__/BasIasAssistant.test.tsx
  - src/components/ViewRouter.tsx
  - src/components/__tests__/ViewRouter.test.tsx
autonomous: false
requirements:
  - BAS-01
  - BAS-02
  - BAS-03
  - BAS-04
  - BAS-05
  - BAS-06
  - TAX-02
  - IND-01
  - IND-02
  - IND-03
  - IND-04
  - COY-01
  - COY-02
  - COY-03
  - TRT-01
  - TRT-02
  - TRT-03
  - PSP-01
  - PSP-02
must_haves:
  truths:
    - "computeBas rolls G1/G2/G3/G10/G11/1A/1B/W1/W2/T7 to-the-cent from the GL on a mixed GST+FRE+INP fixture (success criterion #1)"
    - "Simpler-BAS dispatch: G2/G3/G10/G11 still computed but flagged `internalOnly: true` in the labels output; renderer shows them in a separate 'internal only — not lodged' section"
    - "computeBas T7 reads `Entity.paygInstalmentAmount` (Method 1 only per BAS-04 CONTEXT decision)"
    - "computeBas filters entries by Period (BAS quarter or custom date range via period.ts isInPeriod); excludes superseded/voided/draft + replacedByEntryId entries"
    - "Decimal rounding modes per ATO worksheet method are explicit per label: G1 uses ROUND_HALF_UP, 1A/1B use gst() helper from money.ts (banker's rounding 2dp per-line BEFORE aggregation), W2 uses ROUND_DOWN; documented inline"
    - "computeIas returns PAYG-only labels when `entity.gstRegistered === false` — same compute function dispatches with `meta.shape: 'IAS'`; GST labels are suppressed in the renderer"
    - "BasIasAssistant refactor renders Simpler BAS lodgement labels prominently (G1, 1A, 1B, W1, W2, T7) AND a separate working-paper-only section for G2/G3/G10/G11 marked 'internal only — not lodged under Simpler BAS'"
    - "BasIasAssistant renders period selector (FY quarters Q1/Q2/Q3/Q4 + custom) via period.ts quarterBoundaries"
    - "BasIasAssistant Print button on top emits EXPORT_DATA audit with `{ form: 'BAS' | 'IAS', fy, quarter? }`"
    - "ViewRouter wires PartnershipTaxReturn route for Partnership entities (replacing any prior placeholder)"
    - "ViewRouter Print emissions across all 5 forms are audit-logged (the components already emit; ViewRouter just routes correctly)"
    - "Manual UAT covers all 5 Phase 5 success criteria + 20 requirements end-to-end; ≥25 manual steps; user approval required to close Phase 5"
    - "StorageAdapter interface untouched; Phase 3 FINAL preserved"
    - "All Phase 1-4 tests stay GREEN (no regressions)"
  artifacts:
    - path: "src/lib/tax/returns/fy2026/bas.ts"
      provides: "Full computeBas — Simpler BAS labels + lodgement-vs-internal split + period filter + per-label rounding modes"
      contains: "internalOnly"
    - path: "src/lib/tax/returns/fy2026/ias.ts"
      provides: "Full computeIas — PAYG-only labels (W1/W2/W3/W4/W5/T7); same data + meta.shape = 'IAS'"
      exports: ["computeIas"]
    - path: "src/components/BasIasAssistant.tsx"
      provides: "Refactored BAS/IAS renderer — Simpler BAS lodgement section + internal-only section + IAS shape dispatch + Print button + period selector + audit"
      contains: "computeBas"
    - path: "src/components/ViewRouter.tsx"
      provides: "Routes Partnership entity to PartnershipTaxReturn; preserves Trust → TrustTaxReturn, Company → CompanyTaxReturn, Individual → TaxReturnAssistant"
      contains: "PartnershipTaxReturn"
  key_links:
    - from: "src/lib/tax/returns/fy2026/bas.ts"
      to: "src/lib/money.ts"
      via: "gst() helper + Decimal.ROUND_HALF_UP / ROUND_DOWN per-label"
      pattern: "gst\\(|ROUND_HALF_UP|ROUND_DOWN"
    - from: "src/lib/tax/returns/fy2026/bas.ts"
      to: "src/lib/period.ts"
      via: "isInPeriod + quarterBoundaries"
      pattern: "quarterBoundaries|isInPeriod"
    - from: "src/lib/tax/returns/fy2026/ias.ts"
      to: "src/lib/tax/returns/fy2026/bas.ts"
      via: "computeIas delegates to computeBas internals with gstRegistered=false dispatch"
      pattern: "computeBas"
    - from: "src/components/BasIasAssistant.tsx"
      to: "src/lib/tax/returns/fy2026/bas.ts"
      via: "useMemo(() => computeBas(input))"
      pattern: "computeBas"
    - from: "src/components/ViewRouter.tsx"
      to: "src/components/PartnershipTaxReturn.tsx"
      via: "imports and routes when entity.type === 'Partnership'"
      pattern: "PartnershipTaxReturn"
---

<objective>
Wave 3 — fill in the BAS + IAS compute functions, refactor `BasIasAssistant` to consume them (with Simpler-BAS lodgement vs internal-only label split and period selector), wire `ViewRouter` so Partnership entities route to the fully-implemented `PartnershipTaxReturn`, and gate phase closure on a manual UAT human-verify checkpoint covering all 5 Phase 5 success criteria + 20 phase requirements end-to-end.

Purpose: Closes the BAS/IAS gap (the only remaining compute*Return + renderer pair after 05-2/05-3 land) and provides the cross-cutting verification gate that Phase 5 is end-to-end correct. Runs in Wave 3 sequentially after 05-2 + 05-3 because the UAT exercises every form built in this phase. The UAT checkpoint is the only `autonomous: false` task in Phase 5.

Output:
- `src/lib/tax/returns/fy2026/bas.ts` — full implementation (~200 lines)
- `src/lib/tax/returns/fy2026/ias.ts` — full implementation (~60 lines, delegates to computeBas with shape flag)
- `src/components/BasIasAssistant.tsx` — refactored (replaces Phase 2 placeholder)
- `src/components/ViewRouter.tsx` — minor extension (~15 lines) — Partnership route + Print-button audit verification
- All 10 BAS+IAS+component test scaffolds flip GREEN
- Phase 5 UAT (≥25 manual steps) executed and approved

After Plan 05-4, success criterion #1 (BAS labels to-the-cent on mixed fixture) is locked at the form level. Success criterion #5 (print structure with ATO codes + disclaimer + no UI chrome) is verified by the UAT for ALL 5 form types.
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
@.planning/phases/05-tax-outputs/05-2-PLAN.md
@.planning/phases/05-tax-outputs/05-3-PLAN.md
@src/types.ts
@src/lib/money.ts
@src/lib/period.ts
@src/lib/tax/labels/fy2026.ts
@src/lib/tax/returns/fy2026/types.ts
@src/lib/tax/returns/fy2026/_helpers.ts
@src/lib/tax/returns/fy2026/bas.ts
@src/lib/tax/returns/fy2026/ias.ts
@src/components/BasIasAssistant.tsx
@src/components/ViewRouter.tsx
@src/components/PrintBanner.tsx
@src/components/AnomalyBadge.tsx

<interfaces>
<!-- FINAL contracts from Plans 05-1 / 05-2 / 05-3. DO NOT MODIFY any of these files. -->

From src/lib/tax/returns/fy2026/types.ts (Plan 05-1):
```typescript
export interface BasReturnLabels {
  G1: ReturnLabel; G2: ReturnLabel; G3: ReturnLabel;
  G10: ReturnLabel; G11: ReturnLabel;
  '1A': ReturnLabel; '1B': ReturnLabel;
  W1: ReturnLabel; W2: ReturnLabel; W3: ReturnLabel; W4: ReturnLabel; W5: ReturnLabel;
  T7: ReturnLabel;
  netGst: ReturnLabel;   // 1A - 1B
}
export interface IasReturnLabels {
  W1: ReturnLabel; W2: ReturnLabel; W3: ReturnLabel; W4: ReturnLabel; W5: ReturnLabel;
  T7: ReturnLabel;
}
```

From src/lib/money.ts (Phase 1 — DO NOT MODIFY):
```typescript
export { Decimal };
export function gst(amountInclusiveGST: Decimal | string | number): Decimal;
// gst() = amount / 11, banker's rounding (ROUND_HALF_EVEN), 2dp
// For Phase 5, BAS 1A/1B labels use this directly per ATO worksheet method.
```

From src/lib/period.ts (Phase 2 — DO NOT MODIFY):
```typescript
export function quarterBoundaries(fy: FyLabel, q: 1 | 2 | 3 | 4): { from: Date; to: Date };
export function isInPeriod(date: Date, period: Period): boolean;
```

From src/types.ts (v4):
```typescript
export interface Entity {
  // …
  gstRegistered?: boolean;
  paygInstalmentAmount?: string;   // v4 — read by BAS T7
}
```

Plan 05-1 Wave-0 components (DO NOT MODIFY):
```typescript
export function PrintBanner({ form, entityName, fy, locked? }): JSX.Element;
export function AnomalyBadge({ severity, message, label? }): JSX.Element;
export const FOOTER_DISCLAIMER: string;
```

Wave 2 final renderers (DO NOT MODIFY — this plan only wires routing):
- TaxReturnAssistant (Plan 05-2)
- CompanyTaxReturn (Plan 05-2)
- TrustTaxReturn (Plan 05-3)
- PartnershipTaxReturn (Plan 05-3 — fully fleshed out)
</interfaces>

</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: computeBas + computeIas full implementation with Simpler-BAS lodgement/internal split + per-label rounding; flip 10 tests GREEN</name>
  <files>
    src/lib/tax/returns/fy2026/bas.ts,
    src/lib/tax/returns/fy2026/ias.ts,
    src/lib/tax/returns/fy2026/__tests__/bas.test.ts,
    src/lib/tax/returns/fy2026/__tests__/ias.test.ts
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/lib/tax/bas.ts (Phase 2 placeholder — for back-compat verification)
    - A:/Projects/AussieLedger/src/lib/tax/returns/fy2026/_helpers.ts (filterPostedEntries)
    - A:/Projects/AussieLedger/src/lib/money.ts (gst() helper)
    - A:/Projects/AussieLedger/.planning/phases/05-tax-outputs/05-RESEARCH.md "BAS G1 / 1A computation" code example + "BAS (NAT 4189 family) + IAS" ATO Field Codes table
    - A:/Projects/AussieLedger/.planning/phases/05-tax-outputs/05-CONTEXT.md "Simpler BAS only" decision + "Single Medicare … flat 2% for families" decision (latter doesn't affect BAS but contextual)
  </read_first>
  <behavior>
    - `computeBas(input: ComputeBasInput): BasReturn` (replace Wave 0 empty body):
        Input: `{ entity: Entity; accounts: Account[]; entries: JournalEntry[]; period: Period; }`
        Logic:
        1. Filter entries via `filterPostedEntries(entries)` (excludes superseded/voided/draft + replacedByEntryId).
        2. Filter by `isInPeriod(new Date(entry.date), period)`.
        3. Walk lines:
            - For Revenue lines (credit-positive):
                - G1 += line credit-minus-debit (any gstCode) — GST-inclusive total of all sales. Use `ROUND_HALF_UP` per ATO worksheet method.
                - G2 += if `gstCode='FRE'` AND account.taxLabel or account.code suggests export (use a heuristic: account.code in CoA-4100 range OR account.name matches /export/i) — internal-only.
                - G3 += if `gstCode='FRE'` AND NOT export — internal-only.
                - 1A += `gst(lineAmount)` per-line if `gstCode='GST'` — uses money.ts gst() helper (banker's rounding 2dp per-line BEFORE aggregation, per RESEARCH Pitfall 4).
            - For Expense lines (debit-positive):
                - Skip if `account.name` includes 'Wages' or `account.name` includes 'PAYG Withholding' (those flow to W1/W2 below).
                - G11 += line debit-minus-credit — internal-only.
                - 1B += `gst(lineAmount)` per-line if `gstCode='GST'`.
            - For Asset lines flagged as capital (gstCode='CAP' OR account.taxLabel='G10'-equivalent):
                - G10 += line debit-minus-credit — internal-only.
                - 1B += `gst(lineAmount)` per-line.
            - For account.name matches /Wages|Salary|Payroll/i (Expense):
                - W1 += debit-minus-credit
            - For account.name matches /PAYG Withholding/i (Liability):
                - W2 += credit-minus-debit (PAYG withheld is a credit-positive liability accrual). Use `ROUND_DOWN` per ATO worksheet method.
            - W3, W4 default to 0 unless user posts to labels '@W3' or '@W4' (out-of-scope for v1 baseline).
        4. W5 = W2 + W3 + W4 (derived).
        5. T7 = `new Decimal(entity.paygInstalmentAmount ?? '0')` (Method 1 only per BAS-04 decision).
        6. netGst = 1A − 1B.
        7. Mark `G2`, `G3`, `G10`, `G11` labels with `internalOnly: true` for Simpler BAS rendering split.
        8. Anomalies:
            - If `period.type === 'quarter'`, ensure the quarter boundaries match `quarterBoundaries(period.fy, period.q)` (sanity check).
            - If `entity.gstRegistered === false`, emit `{ severity: 'warn', id: 'not-gst-registered', message: 'Entity is not GST-registered — render as IAS instead of BAS.' }`.
            - If `entity.paygInstalmentAmount` unset AND W1 > 0, emit `{ severity: 'info', id: 'payg-i-unset', message: 'PAYG instalment amount not set on Entity — T7 will report $0. Enter the amount from your ATO portal in Entity settings.' }`.
            - Locked-FY info anomaly if applicable.
        9. Return `BasReturn` with `meta.shape: 'BAS'`, `meta.simplerBasMode: true` (always — Phase 5 ships Simpler BAS only).
    - `computeIas(input): IasReturn`:
        - Delegate to `computeBas` but force `meta.shape: 'IAS'` and zero out the G* + 1A/1B labels (or just return the IasReturnLabels subset).
        - Simpler: just compute W1/W2/W3/W4/W5/T7 directly without GST handling.
    - Tests for `bas.test.ts` — 8 cases per 05-VALIDATION.md:
        - G1/1A/1B to-the-cent on mixed GST/FRE/INP fixture (success criterion #1)
        - G2/G3/G10/G11 marked internalOnly under Simpler
        - W1 from wage accounts
        - W2 from PAYG Withholding
        - T7 from Entity.paygInstalmentAmount
        - Period quarter filter (entries in Q1 only, not Q2)
        - Excludes superseded/voided/draft entries
        - Explicit rounding modes per label (verify 1A is per-line gst() summed; W2 uses ROUND_DOWN)
    - Tests for `ias.test.ts` — 2 cases:
        - PAYG only when not GST registered
        - GST labels suppressed (no G1/1A/1B in IasReturnLabels output)
  </behavior>
  <action>
    Step 1 — Replace `src/lib/tax/returns/fy2026/bas.ts` body. Implementation sketch:
    ```typescript
    import { Decimal, gst } from '../../../money';
    import { filterPostedEntries } from './_helpers';
    import { isInPeriod, type Period } from '../../../period';
    import type { Account, Entity, JournalEntry } from '../../../../types';
    import type { ComputedReturn, BasReturnLabels, ReturnLabel, Anomaly } from './types';
    import { BAS_LABELS_FULL } from '../../labels/fy2026';

    export type BasReturn = ComputedReturn<BasReturnLabels> & {
      meta: ComputedReturn<BasReturnLabels>['meta'] & {
        shape: 'BAS' | 'IAS';
        simplerBasMode: boolean;
        period: Period;
      };
    };

    export interface ComputeBasInput {
      entity: Entity;
      accounts: Account[];
      entries: JournalEntry[];
      period: Period;
    }

    const isExportAccount = (acc: Account): boolean =>
      /export/i.test(acc.name) || (acc.code >= '4100' && acc.code < '4200');

    const isWageAccount = (acc: Account): boolean =>
      /wages|salary|payroll/i.test(acc.name);

    const isPaygWithholding = (acc: Account): boolean =>
      /PAYG Withholding/i.test(acc.name);

    export function computeBas(input: ComputeBasInput): BasReturn {
      const { entity, accounts, entries, period } = input;
      const posted = filterPostedEntries(entries);
      const inPeriod = posted.filter((e) => isInPeriod(new Date(e.date), period));

      let g1 = new Decimal(0), g2 = new Decimal(0), g3 = new Decimal(0);
      let g10 = new Decimal(0), g11 = new Decimal(0);
      let gst1A = new Decimal(0), gst1B = new Decimal(0);
      let w1 = new Decimal(0), w2 = new Decimal(0);
      const w3 = new Decimal(0), w4 = new Decimal(0);   // baseline 0; user posts to widen

      for (const entry of inPeriod) {
        for (const line of entry.lines) {
          const acc = accounts.find((a) => a.id === line.accountId);
          if (!acc) continue;
          const credit = new Decimal(line.credit || 0);
          const debit = new Decimal(line.debit || 0);

          if (acc.type === 'Revenue') {
            const amt = credit.minus(debit);
            if (amt.greaterThan(0)) {
              g1 = g1.plus(amt);  // banker's rounding for per-line accumulation; final ROUND_HALF_UP at field write
              if (acc.gstCode === 'FRE') {
                if (isExportAccount(acc)) g2 = g2.plus(amt);
                else g3 = g3.plus(amt);
              }
              if (acc.gstCode === 'GST') {
                gst1A = gst1A.plus(gst(amt));   // per-line round (Pitfall 4)
              }
            }
          }
          if (acc.type === 'Expense') {
            const amt = debit.minus(credit);
            if (isWageAccount(acc)) {
              w1 = w1.plus(amt);
            } else if (amt.greaterThan(0)) {
              g11 = g11.plus(amt);
              if (acc.gstCode === 'GST') gst1B = gst1B.plus(gst(amt));
            }
          }
          if (acc.type === 'Asset' && acc.gstCode === 'CAP') {
            const amt = debit.minus(credit);
            if (amt.greaterThan(0)) {
              g10 = g10.plus(amt);
              gst1B = gst1B.plus(gst(amt));
            }
          }
          if (acc.type === 'Liability' && isPaygWithholding(acc)) {
            const amt = credit.minus(debit);
            if (amt.greaterThan(0)) w2 = w2.plus(amt);
          }
        }
      }

      const t7 = new Decimal(entity.paygInstalmentAmount ?? '0');
      const w5 = w2.plus(w3).plus(w4);
      // Apply final rounding per label
      g1 = g1.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      gst1A = gst1A.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      gst1B = gst1B.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      w2 = w2.toDecimalPlaces(2, Decimal.ROUND_DOWN);

      const netGst = gst1A.minus(gst1B);

      const anomalies: Anomaly[] = [];
      if (entity.gstRegistered === false) {
        anomalies.push({ severity: 'warn', id: 'not-gst-registered', message: 'Entity is not GST-registered — render as IAS instead of BAS.' });
      }
      if ((!entity.paygInstalmentAmount || entity.paygInstalmentAmount === '') && w1.greaterThan(0)) {
        anomalies.push({ severity: 'info', id: 'payg-i-unset', message: 'PAYG instalment amount not set on Entity — T7 will report $0. Enter the amount from your ATO portal in Entity settings.' });
      }
      const fy = period.type === 'fy' ? period.fy : (period.type === 'quarter' ? period.fy : 'FY2026');
      const locked = (entity.lockedFys ?? []).includes(fy);
      if (locked) anomalies.push({ id: 'locked-fy', severity: 'info', message: 'Locked FY — read-only working paper.' });

      const makeLabel = (code: string, value: Decimal, internalOnly = false): ReturnLabel => {
        const meta = BAS_LABELS_FULL[code as keyof typeof BAS_LABELS_FULL];
        return {
          code, value, internalOnly,
          plainEnglish: meta?.plainEnglish ?? code,
          natReference: meta?.natReference,
        };
      };

      return {
        labels: {
          G1: makeLabel('G1', g1),
          G2: makeLabel('G2', g2.toDecimalPlaces(2), true),
          G3: makeLabel('G3', g3.toDecimalPlaces(2), true),
          G10: makeLabel('G10', g10.toDecimalPlaces(2), true),
          G11: makeLabel('G11', g11.toDecimalPlaces(2), true),
          '1A': makeLabel('1A', gst1A),
          '1B': makeLabel('1B', gst1B),
          W1: makeLabel('W1', w1.toDecimalPlaces(2)),
          W2: makeLabel('W2', w2),
          W3: makeLabel('W3', w3),
          W4: makeLabel('W4', w4),
          W5: makeLabel('W5', w5.toDecimalPlaces(2)),
          T7: makeLabel('T7', t7.toDecimalPlaces(2)),
          netGst: makeLabel('netGst', netGst),
        } as BasReturnLabels,
        meta: {
          fy, entityType: 'Company',  // BAS is entity-agnostic; default Company per label set
          natReference: 'NAT 4189 (Simpler BAS)', locked, anomalies,
          shape: 'BAS', simplerBasMode: true, period,
        },
      };
    }
    ```

    Step 2 — Replace `src/lib/tax/returns/fy2026/ias.ts` body:
    ```typescript
    import { computeBas, type ComputeBasInput, type BasReturn } from './bas';
    import type { ComputedReturn, IasReturnLabels } from './types';

    export type IasReturn = ComputedReturn<IasReturnLabels> & {
      meta: ComputedReturn<IasReturnLabels>['meta'] & { shape: 'IAS'; period: BasReturn['meta']['period'] };
    };

    export function computeIas(input: ComputeBasInput): IasReturn {
      const bas = computeBas(input);
      // Extract PAYG-only labels; drop the G* + 1A/1B labels
      const { W1, W2, W3, W4, W5, T7 } = bas.labels;
      return {
        labels: { W1, W2, W3, W4, W5, T7 } as IasReturnLabels,
        meta: { ...bas.meta, shape: 'IAS' },
      };
    }
    ```

    Step 3 — Flip `bas.test.ts` from `it.todo` to real tests. Key fixture for success criterion #1:
    ```typescript
    it('G1 1A 1B to the cent on mixed fixture', () => {
      const accounts: Account[] = [
        { _v: 4, id: 'a-gst', code: '4010', name: 'Sales (GST)', type: 'Revenue', gstCode: 'GST', taxLabel: '6S' },
        { _v: 4, id: 'a-fre', code: '4020', name: 'Sales (GST-free)', type: 'Revenue', gstCode: 'FRE', taxLabel: '6S' },
        { _v: 4, id: 'a-inp', code: '4030', name: 'Sales (input-taxed)', type: 'Revenue', gstCode: 'INP', taxLabel: '6S' },
        { _v: 4, id: 'a-exp', code: '6010', name: 'Supplies', type: 'Expense', gstCode: 'GST', taxLabel: '6N' },
      ];
      const entries: JournalEntry[] = [
        // 11000 GST-inclusive sale → gst() = 1000.00
        { _v: 4, id: 'j1', date: '2025-08-15', reference: 'INV-1', description: '', isPosted: true, status: 'posted',
          lines: [
            { accountId: 'a-gst', description: '', debit: 0, credit: 11000, taxAmount: 1000 },
            { accountId: 'a-cash', description: '', debit: 11000, credit: 0, taxAmount: 0 },
          ] },
        // 5000 GST-free sale → 1A unchanged
        { _v: 4, id: 'j2', date: '2025-08-16', reference: 'INV-2', description: '', isPosted: true, status: 'posted',
          lines: [
            { accountId: 'a-fre', description: '', debit: 0, credit: 5000, taxAmount: 0 },
            { accountId: 'a-cash', description: '', debit: 5000, credit: 0, taxAmount: 0 },
          ] },
        // 2200 input-taxed sale (gstCode='INP') → G1 includes; 1A unchanged
        { _v: 4, id: 'j3', date: '2025-08-17', reference: 'INV-3', description: '', isPosted: true, status: 'posted',
          lines: [
            { accountId: 'a-inp', description: '', debit: 0, credit: 2200, taxAmount: 0 },
            { accountId: 'a-cash', description: '', debit: 2200, credit: 0, taxAmount: 0 },
          ] },
        // 1100 GST-inclusive expense → 1B = 100.00
        { _v: 4, id: 'j4', date: '2025-08-18', reference: 'EXP-1', description: '', isPosted: true, status: 'posted',
          lines: [
            { accountId: 'a-exp', description: '', debit: 1100, credit: 0, taxAmount: 100 },
            { accountId: 'a-cash', description: '', debit: 0, credit: 1100, taxAmount: 0 },
          ] },
      ];
      const r = computeBas({
        entity: { _v: 4, id: 'c1', name: 'Pty', type: 'Company', status: 'Active', gstRegistered: true },
        accounts, entries,
        period: { type: 'quarter', fy: 'FY2026', q: 1 },
      });
      expect(r.labels.G1.value.toFixed(2)).toBe('18200.00');   // 11000 + 5000 + 2200
      expect(r.labels['1A'].value.toFixed(2)).toBe('1000.00'); // gst(11000)
      expect(r.labels['1B'].value.toFixed(2)).toBe('100.00');  // gst(1100)
      expect(r.labels.G2.internalOnly).toBe(true);
      expect(r.labels.G3.internalOnly).toBe(true);
    });
    ```

    Step 4 — Flip `ias.test.ts` from `it.todo` to real tests verifying PAYG-only output + GST label suppression.
  </action>
  <verify>
    <automated>npx vitest run src/lib/tax/returns/fy2026/__tests__/bas.test.ts src/lib/tax/returns/fy2026/__tests__/ias.test.ts --reporter=verbose 2>&1 | tail -50</automated>
  </verify>
  <done>
    - All 8 bas.test.ts cases GREEN (including success criterion #1)
    - All 2 ias.test.ts cases GREEN
    - `tsc --noEmit` exits 0
    - `npm run test` shows no regressions in Phase 1-4 tests
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Refactor BasIasAssistant + wire ViewRouter PartnershipTaxReturn route + Print-button audit verification; flip 5 tests GREEN</name>
  <files>
    src/components/BasIasAssistant.tsx,
    src/components/__tests__/BasIasAssistant.test.tsx,
    src/components/ViewRouter.tsx,
    src/components/__tests__/ViewRouter.test.tsx
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/components/BasIasAssistant.tsx (Phase 2 placeholder)
    - A:/Projects/AussieLedger/src/components/ViewRouter.tsx (current 626-line routing component — for Partnership-route additive insert)
    - A:/Projects/AussieLedger/src/lib/tax/returns/fy2026/bas.ts (Task 1 — full implementation)
    - A:/Projects/AussieLedger/src/lib/tax/returns/fy2026/ias.ts (Task 1)
    - A:/Projects/AussieLedger/src/lib/period.ts (quarterBoundaries + currentFy for period selector)
  </read_first>
  <behavior>
    - `BasIasAssistant.tsx` refactor:
        1. Same prop contract as Phase 2 placeholder (entity, accounts, entries, addLog).
        2. Add period selector UI (Tabs or radio buttons): Full Year / Q1 / Q2 / Q3 / Q4 / Custom. Default to Q1 of currentFy().
        3. Dispatch:
            - If `entity.gstRegistered === false` → call `computeIas(...)` and render IAS shape (PAYG only).
            - Else → call `computeBas(...)` and render BAS shape.
        4. Render top-level Print button (no-print) emitting EXPORT_DATA audit with `{ form: shape, fy, quarter?, timestamp }`.
        5. Wrap content in `<section className="print-form-bas">` (or `.print-form-ias` for IAS).
        6. Render `<PrintBanner form={shape} entityName={entity.name} fy={fy} locked={result.meta.locked} />`.
        7. Render Simpler BAS lodgement section (BAS only):
            - "BAS Lodgement labels (Simpler BAS)" header
            - G1 ($amount), 1A, 1B, W1, W2, T7 rows — each with ATO code + plain-English label + dollar amount
        8. Render "Internal-only — not lodged under Simpler BAS" section (BAS only):
            - G2, G3, G10, G11 rows — visually muted (gray) + asterisk label
        9. Render IAS section (IAS only): W1/W2/W3/W4/W5/T7
        10. Render Anomalies section (consolidated AnomalyBadges).
        11. Render `<footer className="print-footer print-only">{FOOTER_DISCLAIMER}</footer>`.
    - `ViewRouter.tsx` changes:
        - Find where Trust → TrustTaxReturn / Company → CompanyTaxReturn / Individual → TaxReturnAssistant routing happens.
        - Add a parallel case: `if (entity.type === 'Partnership') render <PartnershipTaxReturn ... />`.
        - Verify the `addLog` prop is threaded through to all 5 tax-return components so their Print-button EXPORT_DATA emissions actually persist.
    - Tests:
        - `BasIasAssistant.test.tsx`: 4 Phase-5 cases:
            - `renders Simpler BAS lodgement labels` — checks G1, 1A, 1B, W1, W2, T7 visible
            - `internal-only G2 G3 G10 G11 separately` — checks the "Internal-only" section exists + contains G2/G3/G10/G11
            - `IAS shape when not GST registered` — fixture with gstRegistered=false; assert IAS rendering (no GST labels)
            - `print button and period selector` — checks period radio buttons + Print button + audit emission
        - `ViewRouter.test.tsx`: 1 case:
            - `routes partnership to PartnershipTaxReturn` — fixture entity with type='Partnership'; assert rendered output contains the Form P heading
  </behavior>
  <action>
    Step 1 — Refactor `BasIasAssistant.tsx`. Sketch:
    ```typescript
    import { useState, useMemo } from 'react';
    import { computeBas } from '../lib/tax/returns/fy2026/bas';
    import { computeIas } from '../lib/tax/returns/fy2026/ias';
    import { currentFy, quarterBoundaries, today, type Period } from '../lib/period';
    import { PrintBanner, FOOTER_DISCLAIMER } from './PrintBanner';
    import { AnomalyBadge } from './AnomalyBadge';
    // …

    export function BasIasAssistant({ entity, accounts, entries, addLog }: BasIasAssistantProps): React.JSX.Element {
      const fy = currentFy();
      const [periodChoice, setPeriodChoice] = useState<'fy' | 1 | 2 | 3 | 4>(1);
      const period: Period = periodChoice === 'fy' ? { type: 'fy', fy } : { type: 'quarter', fy, q: periodChoice };
      const shape = entity.gstRegistered === false ? 'IAS' : 'BAS';
      const result = useMemo(
        () => shape === 'IAS'
          ? computeIas({ entity, accounts, entries, period })
          : computeBas({ entity, accounts, entries, period }),
        [entity, accounts, entries, period, shape],
      );
      const handlePrint = () => {
        addLog?.('EXPORT_DATA', JSON.stringify({
          entityId: entity.id, form: shape, fy,
          quarter: periodChoice !== 'fy' ? `Q${periodChoice}` : 'FY',
          timestamp: today().toISOString(),
        }), entity.id);
        window.print();
      };
      const scopeClass = shape === 'IAS' ? 'print-form-ias' : 'print-form-bas';
      return (
        <section className={`${scopeClass} p-4`}>
          <PrintBanner form={shape} entityName={entity.name} fy={fy} locked={result.meta.locked} />
          <header className="no-print flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{shape} — {entity.name} ({fy})</h2>
            <div className="flex gap-2 items-center">
              <label>Period:</label>
              <select value={periodChoice as any} onChange={(e) => setPeriodChoice(e.target.value === 'fy' ? 'fy' : Number(e.target.value) as 1|2|3|4)}>
                <option value="fy">Full FY</option>
                <option value={1}>Q1 (Jul–Sep)</option>
                <option value={2}>Q2 (Oct–Dec)</option>
                <option value={3}>Q3 (Jan–Mar)</option>
                <option value={4}>Q4 (Apr–Jun)</option>
              </select>
              <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded">
                Print working paper
              </button>
            </div>
          </header>
          {shape === 'BAS' ? (
            <>
              <section>
                <h3>BAS Lodgement labels (Simpler BAS)</h3>
                {/* G1, 1A, 1B, W1, W2, T7 — each LabelRow */}
                <LabelRow code="G1" plainEnglish="Total sales (GST-inclusive)" value={(result as BasReturn).labels.G1.value} />
                <LabelRow code="1A" plainEnglish="GST on sales" value={(result as BasReturn).labels['1A'].value} />
                <LabelRow code="1B" plainEnglish="GST on purchases" value={(result as BasReturn).labels['1B'].value} />
                <LabelRow code="W1" plainEnglish="Total salary, wages & other payments" value={(result as BasReturn).labels.W1.value} />
                <LabelRow code="W2" plainEnglish="Amounts withheld from W1" value={(result as BasReturn).labels.W2.value} />
                <LabelRow code="T7" plainEnglish="PAYG instalment amount" value={(result as BasReturn).labels.T7.value} />
              </section>
              <section className="mt-4 text-gray-600">
                <h3>Internal-only working-paper labels (NOT lodged under Simpler BAS)</h3>
                <LabelRow code="G2*" plainEnglish="Export sales" value={(result as BasReturn).labels.G2.value} />
                <LabelRow code="G3*" plainEnglish="Other GST-free sales" value={(result as BasReturn).labels.G3.value} />
                <LabelRow code="G10*" plainEnglish="Capital purchases" value={(result as BasReturn).labels.G10.value} />
                <LabelRow code="G11*" plainEnglish="Non-capital purchases" value={(result as BasReturn).labels.G11.value} />
                <p className="text-xs italic">* Internal-only — not lodged under Simpler BAS</p>
              </section>
            </>
          ) : (
            <section>
              <h3>IAS Labels (PAYG only)</h3>
              {/* W1/W2/W3/W4/W5/T7 */}
            </section>
          )}
          {/* Anomalies */}
          <section className="mt-4">
            <h3>Anomalies</h3>
            <ul>{result.meta.anomalies.map(a => (<li key={a.id}><AnomalyBadge severity={a.severity} message={a.message} label={a.label} /></li>))}</ul>
          </section>
          <footer className="print-footer print-only">{FOOTER_DISCLAIMER}</footer>
        </section>
      );
    }
    ```

    Step 2 — Edit `src/components/ViewRouter.tsx` to add the Partnership route. Locate the existing entity-type switch (likely a `case 'Trust':` arm) and add an analogous `case 'Partnership':` arm rendering `<PartnershipTaxReturn entity={entity} accounts={accounts} entries={entries} addLog={addLog} period={period} />`. Add the import at the top.

    Step 3 — Flip `BasIasAssistant.test.tsx` Phase-5 `it.todo` placeholders to real tests:
    - `renders Simpler BAS lodgement labels` — fixture: GST-registered entity + GST + FRE + INP entries; assert G1/1A/1B/W1/W2/T7 visible
    - `internal-only G2 G3 G10 G11 separately` — assert the "Internal-only working-paper labels (NOT lodged under Simpler BAS)" header is present + G2/G3/G10/G11 rendered under it (with asterisks)
    - `IAS shape when not GST registered` — fixture with gstRegistered=false; assert "IAS Labels (PAYG only)" header + NO "G1" visible
    - `print button and period selector` — vi.spyOn(window, 'print'); click Print; assert addLog called with `'EXPORT_DATA'` + form: 'BAS' + quarter; change period selector to Q2; assert state update

    Step 4 — Flip `ViewRouter.test.tsx` Phase-5 `it.todo` placeholder to real test:
    ```typescript
    it('routes partnership to PartnershipTaxReturn', () => {
      const partnershipEntity: Entity = { _v: 4, id: 'p1', name: 'Smith & Jones', type: 'Partnership', status: 'Active', partners: [{ id: 'p1', name: 'Smith', sharePercent: 50 }, { id: 'p2', name: 'Jones', sharePercent: 50 }] };
      // Render ViewRouter with view='tax-return' (or whatever the tax-return view name is) + partnershipEntity active
      // …
      expect(screen.getByText(/Form P — Partnership/)).toBeInTheDocument();
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/BasIasAssistant.test.tsx src/components/__tests__/ViewRouter.test.tsx --reporter=verbose 2>&1 | tail -40 && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
    - All 4 BasIasAssistant Phase-5 tests GREEN
    - ViewRouter `routes partnership to PartnershipTaxReturn` test GREEN
    - `npm run build` exits 0
    - `npm run lint` exits 0
    - `npm run test` overall: ≥449 SPA GREEN (cumulative from 05-1 + 05-2 + 05-3 + this task)
    - `npm run test:server` exits 0 (18 server tests unchanged)
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Manual UAT — Phase 5 end-to-end goal-backward verification</name>
  <what-built>
    Phase 5 is now fully implemented across plans 05-1, 05-2, 05-3, 05-4:
    - 5 rate helpers (marginal, LITO, Medicare, BRE, small-biz offset) — GREEN
    - 6 compute*Return modules (individual, company, trust, partnership, bas, ias) — GREEN
    - 5 form renderers (TaxReturnAssistant Form I, CompanyTaxReturn, TrustTaxReturn, PartnershipTaxReturn, BasIasAssistant) — GREEN
    - 3 shared print primitives (PrintBanner, AnomalyBadge, AssumptionsBlock) — GREEN
    - print.css with @media print rules — GREEN
    - v3→v4 additive migration — GREEN
    - 3 Wave-0 in-repo corrections (NAT comments, BRE cite, REQUIREMENTS.md verification) — landed
    - ViewRouter wires Partnership entity to PartnershipTaxReturn — GREEN
    - All 20 Phase 5 requirements (BAS-01..06, TAX-02, IND-01..04, COY-01..03, TRT-01..03, PSP-01..02) addressed
    - Expected test count: ~371 (Phase 4 baseline) + ~70-80 new GREEN = ~440-450 SPA tests GREEN
  </what-built>
  <how-to-verify>
    **STEP 0 — Boot the app**
    1. `npm run dev` (single-user IndexedDB mode) — confirm it starts without errors
    2. Open `http://localhost:5173` in a Chromium-based browser (best print-preview support)
    3. Confirm the AussieLedger UI loads, the working-paper disclaimer footer is visible

    **STEP 1 — Verify the 3 Wave-0 corrections**
    1. Open `A:/Projects/AussieLedger/src/lib/tax/labels/fy2026.ts` in your editor
    2. Confirm the Individual section comment now reads `// Source: NAT 2541 main return + NAT 2543 B&P schedule FY2025-26` (not "NAT 0660")
    3. Confirm the Trust section comment reads `// Source: NAT 0660 (Trust tax return instructions) FY2025-26` (not "NAT 0659")
    4. Confirm the Partnership section comment reads `// Source: NAT 0659 (Partnership tax return) FY2025-26` (not "NAT 0976")
    5. Confirm the `BRE_PASSIVE_THRESHOLD` JSDoc cites `Income Tax Rates Act 1986 s.23AA + s.23AB` (not "ITAA 1997")
    6. Open `A:/Projects/AussieLedger/.planning/REQUIREMENTS.md`; confirm COY-04 has `[~]` marker + "OBSOLETE / re-scoped to IND-04" + IND-04 exists with the small-business-offset description

    **STEP 2 — Individual entity end-to-end (Form I + B&P + IND-04)**
    7. Create a new Individual entity: name "Test Sole Trader", type Individual, FY end 30 June
    8. In Entity settings, set `aggregatedTurnover = "4000000"` (under $5M for IND-04 eligibility)
    9. Post journals:
       - $50,000 credit to a Sales account (taxLabel '6S')
       - $20,000 debit to an Operating-Expenses account (taxLabel '6N')
    10. Navigate to Tax Return view
    11. **Verify on screen:**
       - Item 15 (Net income/loss from business) = $30,000
       - P1 = $50,000, P2 = $20,000, P8 = $30,000
       - Marginal tax computed via FY2026 brackets ($1,888 for $30k)
       - LITO line shows $700 (income ≤ $37,500)
       - Medicare shows $0 (income below $27,222 threshold)
       - Item 7D — Small business income tax offset — shows a non-zero value (16% of tax on SB income, capped at $1,000)
       - Assumptions block visible with 5 lines
       - Print button visible (top-right)
    12. **Click "Print working paper":**
       - Browser print preview opens
       - **Verify in preview:** ATO codes (P1, P2, P8, item 15, M1, M2, T1, item 7D) visible alongside plain-English labels
       - Top banner shows full disclaimer + entity name + FY
       - Bottom footer shows the lodgement disclaimer
       - NO sidebar, NO bottom-nav, NO action buttons (hover states absent)
       - Cancel print
    13. **Verify audit log:** Navigate to Audit Trail; confirm an `EXPORT_DATA` row appeared with `{ form: 'I', fy: 'FY2026' }`

    **STEP 3 — Company entity end-to-end (Form C + BRE + franking)**
    14. Create a new Company entity: name "Test Pty Ltd", type Company
    15. In Entity settings, set `aggregatedTurnover = "1000000"` (under $50M for BRE)
    16. Post journals:
       - $100,000 credit to Sales account (companyTaxLabel '6A')
       - $900,000 credit to Dividend Income account (companyTaxLabel '6H')
    17. Navigate to Tax Return view
    18. **Verify on screen:**
       - Form C labels: 6A = $100k, 6F = $0, 6T (total income) = $1M, 6S (total expenses) = $0, 7T (taxable income) = $1M
       - Prominent box: **"30% applied"** with basis text "passive income 90.00% exceeds 80% BREPI threshold (s.23AB)"
       - Tax payable (CS_B) = $300,000
       - Franking Account section visible: opening / movements / closing
       - Print button visible
    19. **Re-test the BRE-pass case:**
       - Change a journal: reduce Dividend Income to $10,000 (passive becomes 10%); add $90,000 to Sales (gross sales becomes $190,000) — actually re-post fresh
       - Verify the Tax Return view now shows **"25% applied"** with basis "passive income X.XX% ≤ 80% BREPI threshold"
    20. **Click "Print working paper":** verify same print structure as Form I (top banner, ATO codes, no UI chrome, footer disclaimer)
    21. **Verify audit log entry** with `{ form: 'C', fy: 'FY2026' }`

    **STEP 4 — Trust entity end-to-end (Form T + per-beneficiary distribution + streaming disclaimer)**
    22. Create a new Trust entity: name "Test Family Trust", type Trust
    23. In Beneficiary Register, add: Alice (60%), Bob (40%)
    24. Post a journal: $200,000 credit to a Sales account (trustTaxLabel '5B')
    25. Navigate to Trust Tax Return view
    26. **Verify on screen:**
       - Form T labels: 5B = $200k, 5S = $0, 5T = $200k, 11J = $0, 26 = $200k
       - Item 57 Statement of Distribution: Alice row $120,000 + Bob row $80,000 + Total row $200,000
       - **Mandatory streaming disclaimer visible** (red-bordered aside) starting "Trust capital gains and franked distributions can only be streamed…"
       - Print button visible
    27. **Click "Print working paper":** verify print preview includes streaming disclaimer visibly (not hidden by `@media print` rules); ATO codes (5B, 5S, 5T, 26, item 57) visible alongside plain English
    28. **Edit a beneficiary to add `sharePerType: { dividend: 100 }`** (via the Beneficiary Register if exposed, OR by directly editing Entity in storage for this UAT step)
    29. Reload the Trust Tax Return; verify an Anomaly badge appears warning "Beneficiary 'Alice' has per-class shares defined that are not used by this version"

    **STEP 5 — Partnership entity end-to-end (Form P + per-partner distribution)**
    30. Create a new Partnership entity: name "Smith & Jones", type Partnership
    31. In Partner Register, add: Smith (50%), Jones (50%)
    32. Post a journal: $300,000 credit to a Sales account (partnershipTaxLabel 'P1' or '5B')
    33. Navigate to Partnership Tax Return view
    34. **Verify on screen:**
       - Form P labels: P1 = $300k, P2 = $0, P8 = $300k (or net via 5T computation if the labels differ)
       - Statement of Distribution: Smith row $150k + Jones row $150k + Total row $300k
       - Print button visible
    35. **Click "Print working paper":** verify print structure (banner + ATO codes + plain English + footer + no UI chrome)
    36. **Verify audit log entry** with `{ form: 'P', fy: 'FY2026' }`
    37. **Test negative-income path:**
       - Add a $400,000 debit to an Expense account (partnershipTaxLabel for P2)
       - Net P8 becomes -$100,000
       - Verify the Anomaly badge appears: "Partnership net loss detected — each partner claims their share of the loss on their individual return…"

    **STEP 6 — BAS end-to-end (success criterion #1 to-the-cent)**
    38. Switch to the Test Pty Ltd Company entity (GST-registered)
    39. Reset journals; post the mixed-fixture entries:
       - $11,000 GST-inclusive sale (gstCode='GST', taxAmount=$1,000)
       - $5,000 GST-free sale (gstCode='FRE', export account if available)
       - $2,200 input-taxed sale (gstCode='INP')
       - $1,100 GST-inclusive expense (gstCode='GST', taxAmount=$100)
       - $5,000 Wages expense (account name contains 'Wages')
       - $1,000 PAYG Withholding credit to a Liability account
       - Set `Entity.paygInstalmentAmount = "1500"` (T7)
    40. Navigate to BAS/IAS view
    41. **Verify on screen:**
       - "BAS Lodgement labels (Simpler BAS)" section header visible
       - G1 = $18,200.00 (sum of all three sales: 11000 + 5000 + 2200)
       - 1A = $1,000.00 (GST on $11k sale)
       - 1B = $100.00 (GST on $1.1k expense)
       - W1 = $5,000.00 (wages)
       - W2 = $1,000.00 (PAYG withheld)
       - T7 = $1,500.00 (from Entity.paygInstalmentAmount)
       - "Internal-only working-paper labels (NOT lodged under Simpler BAS)" section visible with G2/G3/G10/G11 in muted styling + asterisks
       - Period selector defaults to Q1 of currentFy()
    42. **Change period to Q2:** verify the labels recompute (should show 0 if no Q2 journals exist)
    43. **Click "Print working paper":** verify print preview shows Simpler BAS lodgement section prominently + Internal-only section labelled as such
    44. **Verify audit log entry** with `{ form: 'BAS', fy: 'FY2026', quarter: 'Q1' }`

    **STEP 7 — IAS end-to-end**
    45. Create a new entity: type Individual, name "Non-GST Sole Trader", set `gstRegistered = false`
    46. Post a $5,000 wages-payroll journal
    47. Navigate to BAS/IAS view
    48. **Verify on screen:**
       - Title says "IAS — Non-GST Sole Trader (FY2026)" (not "BAS")
       - Section header reads "IAS Labels (PAYG only)"
       - W1 visible; G1 / 1A / 1B NOT visible
       - Print button works (audit log entry with `{ form: 'IAS', ... }`)

    **STEP 8 — Locked-FY behaviour**
    49. Edit the Test Pty Ltd entity; set `lockedFys = ['FY2026']`
    50. Navigate to its Tax Return view
    51. **Verify on screen:**
       - "LOCKED FY" tag visible in the PrintBanner
       - Print button text changes to "Print finalised return"
       - Anomalies include the "Locked FY — read-only working paper" info badge

    **STEP 9 — Anomaly badges + assumptions**
    52. Navigate to any Individual return; verify Assumptions Block (5 lines) is visible
    53. Post a journal that makes P8 negative (e.g. $5k revenue, $50k expense)
    54. Verify the Anomaly badge "Business loss detected. Non-commercial losses (Div 35)…" appears inline AND in the bottom Anomalies section
    55. Navigate to a Company with passive income in the 70-90% band (e.g. 85% dividends); verify the BRE-borderline anomaly fires

    **STEP 10 — Migration integrity**
    56. Export data via the Data page (Phase 3 surface)
    57. Inspect the exported JSON; verify `_v: 4` is set on the root
    58. Verify entities now carry optional `aggregatedTurnover` + `paygInstalmentAmount` fields (where you set them)
    59. Stop the dev server; clear browser storage (chrome://settings/clearBrowserData or via DevTools → Application → Clear storage)
    60. Re-import the JSON; verify all data restored intact + no migration errors

    **STEP 11 — Regression sweep**
    61. Run `npm run test` — confirm **all** ≥440 SPA tests GREEN (or whatever the actual cumulative count is)
    62. Run `npm run test:server` — confirm 18 server tests GREEN
    63. Run `npm run lint` — confirm exit 0
    64. Run `npm run build` — confirm successful production build

    **STEP 12 — Goal-backward checklist (mapping to ROADMAP.md Phase 5 success criteria):**
    - [ ] **#1 BAS to-the-cent** — Step 41 verified G1=$18,200.00, 1A=$1,000.00, 1B=$100.00, W1=$5,000.00, W2=$1,000.00, T7=$1,500.00 against hand calc; G2/G3/G10/G11 computed AND flagged internal-only
    - [ ] **#2 Form C BRE-derived rate + 90%-dividend** — Step 18 verified "30% applied" + basis text on 90%-dividend fixture; Step 19 verified 25% on standard mix
    - [ ] **#3 Trust per-beneficiary + streaming disclaimer** — Step 26 verified Alice $120k / Bob $80k summing to $200k + mandatory disclaimer visible
    - [ ] **#4 Form I + B&P + marginal + LITO + Medicare** — Step 11 verified P1/P2/P8/item 15 from GL + marginal tax computed + LITO $700 + IND-04 offset applied
    - [ ] **#5 Print output shows ATO codes + disclaimer + no UI chrome** — Steps 12, 20, 27, 35, 43 verified across all 5 form types
  </how-to-verify>
  <resume-signal>
    Type `approved — Phase 5 closed` to mark Phase 5 verified complete + ROADMAP.md updated to `[x]`.
    OR
    Type a list of failed steps in the format `step N failed: <description>` so a follow-up plan can be planned via `/gsd:plan-phase 5 --gaps`.
  </resume-signal>
</task>

</tasks>

<verification>
1. `npm run lint` exits 0
2. `npm run build` exits 0
3. `npm run test` exits 0; expected: ~439 (after 05-3) + ~10 new GREEN (BAS/IAS) + ~5 new GREEN (BasIasAssistant + ViewRouter) = ~454 SPA GREEN
4. `npm run test:server` exits 0 (18 server tests unchanged)
5. Success criterion #1 GREEN at form level: `npx vitest run src/lib/tax/returns/fy2026/__tests__/bas.test.ts -t "G1 1A 1B to the cent"` GREEN
6. Manual UAT signed off — all 12 steps pass + 5 success-criterion checkboxes ticked
7. ROADMAP.md updated to mark Phase 5 `[x]` complete and STATE.md updated to reflect closure
</verification>

<success_criteria>
- [x] **Success criterion #1 GREEN end-to-end** — BAS labels match hand-calculated reference to-the-cent; G2/G3/G10/G11 computed and visually separated under "internal only"
- [x] **Requirement BAS-01..06 GREEN** — Simpler BAS + IAS + Print-ready
- [x] **Requirement TAX-02 GREEN end-to-end** — Print buttons work on all 5 form types; @media print scopes correctly; no UI chrome leaks; ATO codes visible
- [x] **All 20 Phase 5 requirements verified end-to-end via manual UAT**
- [x] **All 5 success criteria** verified across the UAT steps + automated tests
- [x] **StorageAdapter interface untouched** — Phase 3 FINAL preserved
- [x] **Zero new runtime dependencies** — `package.json` unchanged from Phase 4 baseline
</success_criteria>

<output>
After completion, create `.planning/phases/05-tax-outputs/05-4-SUMMARY.md` capturing:
- Final cumulative test count (Phase 4 baseline 371 + Phase 5 delta = expected ~450+ GREEN)
- BAS hand-calc reference table (G1/1A/1B/W1/W2/T7 expected values for the success-criterion-#1 fixture)
- Per-label rounding modes used (G1 ROUND_HALF_UP; 1A/1B per-line gst() banker's; W2 ROUND_DOWN)
- ViewRouter Partnership-route change (the exact diff lines added)
- UAT step-by-step results table — 12 steps + 5 success-criterion checkboxes
- Any UAT failures (should be zero — flag immediately if any surface)
- Any deviations from CONTEXT.md (none expected)
- Phase 5 closure marker: ROADMAP.md updated, STATE.md updated, RETROSPECTIVE.md entry added (if appropriate)
- Files modified count + lint/build/test exit codes

Then ALSO create `.planning/phases/05-tax-outputs/05-UAT.md` capturing the human-verify checkpoint results in the same goal-backward shape as Phase 4's `04-UAT.md`:
- For each of the 5 success criteria, list:
  - The truth being verified
  - The artifacts that must exist (file paths)
  - The key links (component → engine → CoA mappings)
  - PASS/FAIL with notes
- Sign-off line.
</output>
