---
phase: 05-tax-outputs
plan: 3
type: execute
wave: 2
depends_on: [1]
files_modified:
  - src/lib/tax/returns/fy2026/trust.ts
  - src/lib/tax/returns/fy2026/partnership.ts
  - src/lib/tax/returns/fy2026/__tests__/trust.test.ts
  - src/lib/tax/returns/fy2026/__tests__/partnership.test.ts
  - src/components/TrustTaxReturn.tsx
  - src/components/__tests__/TrustTaxReturn.test.tsx
  - src/components/PartnershipTaxReturn.tsx
  - src/components/__tests__/PartnershipTaxReturn.test.tsx
autonomous: true
requirements:
  - TRT-01
  - TRT-02
  - TRT-03
  - PSP-01
  - PSP-02
  - TAX-02
must_haves:
  truths:
    - "computeTrustReturn rolls Form T labels (5B/5E/5F/5L/5M/5N/5S/5T/11J/26) from GL via Wave-0 rollupByLabel; emits item56 = distributable trust income; item57 per-beneficiary rows reconcile to net income to-the-cent"
    - "distributeTrustIncome (helper in trust.ts) returns array of beneficiary shares per Entity.beneficiaries + computes per-class components when sharePerType present (warns if present per CONTEXT v2-deferral)"
    - "computeTrustReturn always emits the mandatory streaming-disclaimer text in meta.streamingDisclaimer (TRT-02)"
    - "computePartnershipReturn rolls Form P labels (P1/P2/P8) from GL; emits item54 per-partner rows reconciling to P8"
    - "computePartnershipReturn handles negative P8 (partnership loss) and emits a 'loss share to each partner' warning"
    - "Success criterion #3 GREEN — Trust with 2 beneficiaries (60%/40%) on $200k net income produces $120k/$80k distribution that sums to $200k AND mandatory streaming disclaimer visible"
    - "TrustTaxReturn refactor renders Form T labels + per-beneficiary distribution table + mandatory streaming disclaimer + Print button + EXPORT_DATA audit"
    - "PartnershipTaxReturn (replacing Wave 0 skeleton) renders Form P labels + per-partner distribution table + Print button + EXPORT_DATA audit"
    - "Both renderers wrap content in .print-form-t / .print-form-p scoped containers so print.css class-targeting works"
    - "All trust.test.ts (6 cases) + partnership.test.ts (3 cases) + TrustTaxReturn (3) + PartnershipTaxReturn (2) `it.todo` placeholders flip GREEN"
    - "StorageAdapter interface untouched (Phase 3 FINAL preserved)"
    - "All Phase 1-4 tests stay GREEN (no regressions)"
    - "File-modified list is DISJOINT from 05-2 — confirmed by character comparison in the success_criteria section"
  artifacts:
    - path: "src/lib/tax/returns/fy2026/trust.ts"
      provides: "Full computeTrustReturn — Form T labels + distributeTrustIncome helper + mandatory streaming disclaimer + sharePerType anomaly"
      contains: "streamingDisclaimer"
    - path: "src/lib/tax/returns/fy2026/partnership.ts"
      provides: "Full computePartnershipReturn — Form P labels + per-partner distribution + loss-share warning"
      contains: "distributePartnershipNetIncome"
    - path: "src/components/TrustTaxReturn.tsx"
      provides: "Refactored Form T renderer — Print button + per-beneficiary distribution table + mandatory streaming disclaimer + AnomalyBadges"
      contains: "computeTrustReturn"
    - path: "src/components/PartnershipTaxReturn.tsx"
      provides: "Full Form P renderer — Print button + per-partner distribution table + AnomalyBadges (replaces Wave 0 skeleton)"
      contains: "computePartnershipReturn"
  key_links:
    - from: "src/lib/tax/returns/fy2026/trust.ts"
      to: "src/lib/tax/returns/fy2026/_helpers.ts"
      via: "rollupByLabel + filterPostedEntries"
      pattern: "rollupByLabel"
    - from: "src/lib/tax/returns/fy2026/trust.ts"
      to: "src/types.ts"
      via: "reads Entity.beneficiaries (ENT-07)"
      pattern: "BeneficiaryRow"
    - from: "src/lib/tax/returns/fy2026/partnership.ts"
      to: "src/types.ts"
      via: "reads Entity.partners (ENT-08)"
      pattern: "PartnerRow"
    - from: "src/components/TrustTaxReturn.tsx"
      to: "src/lib/tax/returns/fy2026/trust.ts"
      via: "useMemo(() => computeTrustReturn(...))"
      pattern: "computeTrustReturn"
    - from: "src/components/PartnershipTaxReturn.tsx"
      to: "src/lib/tax/returns/fy2026/partnership.ts"
      via: "useMemo(() => computePartnershipReturn(...))"
      pattern: "computePartnershipReturn"
    - from: "src/components/TrustTaxReturn.tsx"
      to: "src/components/{PrintBanner,AnomalyBadge}.tsx"
      via: "imports Wave-0 print primitives"
      pattern: "PrintBanner|AnomalyBadge"
---

<objective>
Implement the Trust + Partnership tax-output features against the Wave-0 contracts from 05-1. This plan flips every TRT-01..03 + PSP-01..02 test scaffold from `.todo` to GREEN, AND surfaces the new behaviour through the refactored `TrustTaxReturn` (Form T + per-beneficiary distribution + mandatory streaming disclaimer + print) and the new `PartnershipTaxReturn` (Form P + per-partner distribution + print). Phase-5 success criterion #3 (Trust per-beneficiary distribution reconciles to net income AND streaming disclaimer visible) is end-to-end after this plan.

Purpose: Closes the Trust + Partnership gap. Wave 0 (05-1) shipped the rate helpers + types + scaffolds + the `PartnershipTaxReturn` skeleton (for ViewRouter compile-correctness); this plan fills the compute*Return bodies, fleshes out the skeleton, and refactors `TrustTaxReturn`. Runs **in parallel with 05-2** because file-modified lists are DISJOINT (verified in success_criteria section).

Output:
- `src/lib/tax/returns/fy2026/trust.ts` — full implementation (~200 lines including `distributeTrustIncome` helper)
- `src/lib/tax/returns/fy2026/partnership.ts` — full implementation (~120 lines including `distributePartnershipNetIncome`)
- `src/components/TrustTaxReturn.tsx` — refactored (replaces Phase 2 placeholder, ~240 lines)
- `src/components/PartnershipTaxReturn.tsx` — fleshed out (replaces Wave 0 skeleton, ~200 lines)
- All 14 trust+partnership+component test scaffolds flip GREEN

After Plan 05-3, success criterion #3 is locked at the form level: a Trust with 2 beneficiaries Alice 60% / Bob 40% on $200k net income produces a $120k/$80k distribution that sums to $200k, AND the mandatory streaming disclaimer is visible inline on the page (and in print).
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
@src/lib/tax/returns/fy2026/types.ts
@src/lib/tax/returns/fy2026/_helpers.ts
@src/lib/tax/returns/fy2026/trust.ts
@src/lib/tax/returns/fy2026/partnership.ts
@src/components/TrustTaxReturn.tsx
@src/components/PartnershipTaxReturn.tsx
@src/components/PrintBanner.tsx
@src/components/AnomalyBadge.tsx

<interfaces>
<!-- FINAL contracts from Plan 05-1. DO NOT MODIFY any of these files. -->

From src/lib/tax/returns/fy2026/types.ts (Plan 05-1):
```typescript
export interface TrustReturnLabels {
  '5B': ReturnLabel; '5E': ReturnLabel; '5F': ReturnLabel; '5L': ReturnLabel;
  '5M': ReturnLabel; '5N': ReturnLabel; '5S': ReturnLabel; '5T': ReturnLabel;
  '11J': ReturnLabel; '26': ReturnLabel; '56': ReturnLabel;
  // Distribution column rollups (item 57)
  '57_total': ReturnLabel;
}
export interface PartnershipReturnLabels {
  'P1': ReturnLabel; 'P2': ReturnLabel; 'P8': ReturnLabel;
  '5B': ReturnLabel; '5E': ReturnLabel; '5N': ReturnLabel; '5T': ReturnLabel;
}

export interface DistributedShare {
  beneficiaryId: string;
  name: string;
  totalShare: Decimal;
  components: {
    ordinary: Decimal; interest: Decimal; dividend: Decimal;
    capitalGain: Decimal; foreign: Decimal; other: Decimal;
  };
}
```

From src/lib/tax/returns/fy2026/trust.ts (Plan 05-1 skeleton):
```typescript
export function computeTrustReturn(input): TrustReturn;
export function distributeTrustIncome(input): { rows: DistributedShare[]; anomalies: Anomaly[] };
```

From src/lib/tax/returns/fy2026/partnership.ts (Plan 05-1 skeleton):
```typescript
export function computePartnershipReturn(input): PartnershipReturn;
```

From src/types.ts (v4):
```typescript
export interface BeneficiaryRow {
  id: string; name: string; sharePercent: number;
  sharePerType?: Partial<Record<'interest'|'dividend'|'capitalGain'|'foreign'|'other', number>>;
}
export interface PartnerRow {
  id: string; name: string; sharePercent: number;
  sharePerType?: Partial<Record<'interest'|'dividend'|'capitalGain'|'foreign'|'other', number>>;
}
```

From Plan 05-1 Wave-0 components (DO NOT MODIFY):
```typescript
export function PrintBanner({ form, entityName, fy, locked? }): JSX.Element;
export function AnomalyBadge({ severity, message, label? }): JSX.Element;
export const FOOTER_DISCLAIMER: string;
```

Mandatory streaming disclaimer text (lock verbatim — sourced from RESEARCH.md Pitfall 2):
```
Trust capital gains and franked distributions can only be streamed to specific beneficiaries if the trust deed expressly permits streaming AND the trustee has made beneficiaries 'specifically entitled' to those amounts by the relevant ATO recording deadline (60 days for capital gains; end of income year for franked distributions). This working paper applies the per-income-class shares you have entered on the beneficiary register without verifying your trust deed. Consult your tax agent if you stream income.
```
</interfaces>

</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: computeTrustReturn + computePartnershipReturn full implementation with distributeTrustIncome / distributePartnershipNetIncome helpers; flip 9 tests GREEN</name>
  <files>
    src/lib/tax/returns/fy2026/trust.ts,
    src/lib/tax/returns/fy2026/partnership.ts,
    src/lib/tax/returns/fy2026/__tests__/trust.test.ts,
    src/lib/tax/returns/fy2026/__tests__/partnership.test.ts
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/lib/tax/returns/fy2026/types.ts (TrustReturnLabels, PartnershipReturnLabels, DistributedShare)
    - A:/Projects/AussieLedger/src/lib/tax/returns/fy2026/_helpers.ts (rollupByLabel pattern)
    - A:/Projects/AussieLedger/src/lib/tax/labels/fy2026.ts (TRUST_LABELS_FULL, PARTNERSHIP_LABELS_FULL)
    - A:/Projects/AussieLedger/.planning/phases/05-tax-outputs/05-RESEARCH.md "Per-beneficiary distribution (Trust, with optional streaming)" code example + Pitfall 2 (streaming disclaimer)
    - A:/Projects/AussieLedger/.planning/phases/05-tax-outputs/05-CONTEXT.md "Trust streaming: keep sharePercent-only UI + print 'streaming not supported' disclaimer" decision
  </read_first>
  <behavior>
    - `distributeTrustIncome` helper (in `trust.ts`):
        - Input: `{ netIncome: Decimal; beneficiaries: BeneficiaryRow[]; breakdown?: { interest, dividend, capitalGain, foreign, other: Decimal } }`
        - Output: `{ rows: DistributedShare[]; anomalies: Anomaly[] }`
        - Logic (lifted from RESEARCH "Per-beneficiary distribution" code example with adaptations):
            1. Sum `sharePercent` across beneficiaries. If `|sum - 100| > 0.005`, emit anomaly `{ severity: 'warn', id: 'shares-not-100', message: 'Beneficiary shares sum to X%, not 100% — distribution will not reconcile' }`.
            2. If `breakdown` not provided, default to all-zero (ordinary-only distribution = netIncome × sharePercent / 100).
            3. For each beneficiary, compute `totalShare = netIncome × sharePercent / 100` for the no-streaming case.
            4. If ANY beneficiary has `sharePerType` set, emit anomaly `{ severity: 'warn', id: 'sharePerType-unsupported', message: 'Beneficiary "{name}" has per-class shares defined that are not used by this version. Manual adjustment required.' }` and PROCEED with sharePercent-only distribution (per CONTEXT decision).
            5. Defence-in-depth: sum of `totalShare` over all beneficiaries; if `|sum - netIncome| > 0.01`, emit anomaly.
    - `computeTrustReturn(input): TrustReturn` (replace Wave 0 empty body):
        1. Compute `raw = rollupByLabel<TrustLabel>(entries, accounts, 'trustTaxLabel')`.
        2. Map:
            - 5B = sum (label '5B') gross payments
            - 5E = COGS (label '5E')
            - 5F = Rent (label '5F')
            - 5L = Super (label '5L')
            - 5M = Wages (label '5M')
            - 5N = Other expenses (label '5N')
            - 5S = total expenses (5E + 5F + 5L + 5M + 5N) derived
            - 5T = net business income (5B − 5S) derived
            - 11J = gross interest (label '11J')
            - 26 = total net income or loss (derived: 5T + 11J)
            - 56 = distributable trust income (s.97 base — same as label 26 in v1; equals trust net income before distributions)
        3. Call `distributeTrustIncome({ netIncome: item26, beneficiaries: entity.beneficiaries ?? [], breakdown: { interest: raw['11J'] ?? 0, ... } })`.
        4. Total of `rows[].totalShare` is `57_total`.
        5. Anomalies:
            - All anomalies from `distributeTrustIncome`
            - The mandatory streaming disclaimer is emitted as `meta.streamingDisclaimer: string` (NOT as an anomaly — it's mandatory metadata).
            - Locked-FY info anomaly if applicable.
        6. Return `ComputedReturn<TrustReturnLabels>` with `meta` containing `streamingDisclaimer` (the locked verbatim text), `distribution: rows[]`, `entityType: 'Trust'`, `natReference: 'NAT 0660'`.
    - `distributePartnershipNetIncome` helper (in `partnership.ts`):
        - Input: `{ netIncome: Decimal; partners: PartnerRow[] }`
        - Output: `{ rows: DistributedShare[]; anomalies: Anomaly[] }`
        - Same shape as trust but without per-class streaming (Phase 5 partnership stays sharePercent-only per CONTEXT).
        - Negative netIncome: each partner's `totalShare` is negative; emit `{ severity: 'warn', id: 'partnership-loss', message: 'Partnership net loss detected — each partner claims their share of the loss on their individual return. AussieLedger does not propagate the loss across entities.' }`.
    - `computePartnershipReturn(input): PartnershipReturn` (replace Wave 0 empty body):
        1. Roll up by `partnershipTaxLabel` (preserving Phase 2 P1/P2/P8 + Phase 5 widened 5B/5E/5N labels).
        2. P1 = total income (5B + interest if recorded; otherwise just label P1 + 5B aggregate)
        3. P2 = total deductions
        4. P8 = P1 − P2
        5. Call `distributePartnershipNetIncome({ netIncome: P8, partners: entity.partners ?? [] })`.
        6. Total = sum of partner shares (stored as `54_total` or similar custom meta field).
        7. Anomalies from distribution + locked-FY.
    - Tests:
        - `trust.test.ts`: flip 6 `it.todo` placeholders. Fixture: Trust entity with 2 beneficiaries (60%/40%), 2 Revenue $200k aggregate, 0 expenses. Verify net income $200k; distribution rows are $120k/$80k; meta.streamingDisclaimer present and matches the locked text; sharePerType anomaly fires when one beneficiary has `sharePerType: { dividend: 100 }` set.
        - `partnership.test.ts`: flip 3 `it.todo` placeholders. Fixture: Partnership with 2 partners (50%/50%), $300k net income → $150k/$150k. Negative-loss fixture → loss-share anomaly fires.
  </behavior>
  <action>
    Step 1 — Replace empty body of `src/lib/tax/returns/fy2026/trust.ts` with the full implementation:
    ```typescript
    import { Decimal } from '../../../money';
    import { rollupByLabel } from './_helpers';
    import type { Account, Entity, JournalEntry, BeneficiaryRow } from '../../../../types';
    import type { FyLabel } from '../../../period';
    import { TRUST_LABELS_FULL } from '../../labels/fy2026';
    import type { ComputedReturn, TrustReturnLabels, Anomaly, ReturnLabel, DistributedShare } from './types';

    const STREAMING_DISCLAIMER = `Trust capital gains and franked distributions can only be streamed to specific beneficiaries if the trust deed expressly permits streaming AND the trustee has made beneficiaries 'specifically entitled' to those amounts by the relevant ATO recording deadline (60 days for capital gains; end of income year for franked distributions). This working paper applies the per-income-class shares you have entered on the beneficiary register without verifying your trust deed. Consult your tax agent if you stream income.`;

    export type TrustReturn = ComputedReturn<TrustReturnLabels> & {
      meta: ComputedReturn<TrustReturnLabels>['meta'] & {
        streamingDisclaimer: string;
        distribution: DistributedShare[];
      };
    };

    export interface ComputeTrustInput {
      entity: Entity;
      accounts: Account[];
      entries: JournalEntry[];
      fy: FyLabel;
    }

    export function distributeTrustIncome(input: {
      netIncome: Decimal;
      beneficiaries: BeneficiaryRow[];
      breakdown?: { interest: Decimal; dividend: Decimal; capitalGain: Decimal; foreign: Decimal; other: Decimal };
    }): { rows: DistributedShare[]; anomalies: Anomaly[] } {
      const { netIncome, beneficiaries } = input;
      const anomalies: Anomaly[] = [];

      const sharesSum = beneficiaries.reduce((s, b) => s.plus(b.sharePercent), new Decimal(0));
      if (beneficiaries.length > 0 && sharesSum.minus(100).abs().greaterThan('0.005')) {
        anomalies.push({
          id: 'shares-not-100',
          severity: 'warn',
          message: `Beneficiary shares sum to ${sharesSum.toFixed(2)}%, not 100% — distribution will not reconcile`,
        });
      }
      for (const b of beneficiaries) {
        if (b.sharePerType && Object.keys(b.sharePerType).length > 0) {
          anomalies.push({
            id: `sharePerType-unsupported-${b.id}`,
            severity: 'warn',
            message: `Beneficiary "${b.name}" has per-class shares defined that are not used by this version. Manual adjustment required.`,
          });
        }
      }

      const zero = new Decimal(0);
      const rows: DistributedShare[] = beneficiaries.map((b) => {
        const share = new Decimal(b.sharePercent).dividedBy(100);
        const total = netIncome.times(share).toDecimalPlaces(2);
        return {
          beneficiaryId: b.id, name: b.name, totalShare: total,
          components: {
            ordinary: total, interest: zero, dividend: zero,
            capitalGain: zero, foreign: zero, other: zero,
          },
        };
      });

      // Defence-in-depth reconciliation
      const distributed = rows.reduce((s, r) => s.plus(r.totalShare), new Decimal(0));
      if (beneficiaries.length > 0 && distributed.minus(netIncome).abs().greaterThan('0.01')) {
        anomalies.push({
          id: 'distribution-not-reconciled',
          severity: 'warn',
          message: `Distribution total ${distributed.toFixed(2)} does not reconcile to net income ${netIncome.toFixed(2)}`,
        });
      }

      return { rows, anomalies };
    }

    export function computeTrustReturn(input: ComputeTrustInput): TrustReturn {
      const { entity, accounts, entries, fy } = input;
      const raw = rollupByLabel<keyof TrustReturnLabels>(entries, accounts, 'trustTaxLabel');

      const inc5B = raw['5B'] ?? new Decimal(0);
      const exp5E = raw['5E'] ?? new Decimal(0);
      const exp5F = raw['5F'] ?? new Decimal(0);
      const exp5L = raw['5L'] ?? new Decimal(0);
      const exp5M = raw['5M'] ?? new Decimal(0);
      const exp5N = raw['5N'] ?? new Decimal(0);
      const total5S = exp5E.plus(exp5F).plus(exp5L).plus(exp5M).plus(exp5N);
      const net5T = inc5B.minus(total5S);
      const interest11J = raw['11J'] ?? new Decimal(0);
      const item26 = net5T.plus(interest11J);
      const item56 = item26;

      const { rows, anomalies: distAnomalies } = distributeTrustIncome({
        netIncome: item26,
        beneficiaries: entity.beneficiaries ?? [],
      });
      const item57Total = rows.reduce((s, r) => s.plus(r.totalShare), new Decimal(0));

      const anomalies = [...distAnomalies];
      const locked = (entity.lockedFys ?? []).includes(fy);
      if (locked) anomalies.push({ id: 'locked-fy', severity: 'info', message: 'Locked FY — read-only working paper.' });

      const makeLabel = (code: string, value: Decimal): ReturnLabel => {
        const meta = TRUST_LABELS_FULL[code as keyof typeof TRUST_LABELS_FULL];
        return { code, value, plainEnglish: meta?.plainEnglish ?? code, natReference: meta?.natReference };
      };

      return {
        labels: {
          '5B': makeLabel('5B', inc5B),
          '5E': makeLabel('5E', exp5E),
          '5F': makeLabel('5F', exp5F),
          '5L': makeLabel('5L', exp5L),
          '5M': makeLabel('5M', exp5M),
          '5N': makeLabel('5N', exp5N),
          '5S': makeLabel('5S', total5S),
          '5T': makeLabel('5T', net5T),
          '11J': makeLabel('11J', interest11J),
          '26': makeLabel('26', item26),
          '56': makeLabel('56', item56),
          '57_total': makeLabel('57_total', item57Total),
        } as TrustReturnLabels,
        meta: {
          fy, entityType: 'Trust',
          natReference: 'NAT 0660', locked, anomalies,
          streamingDisclaimer: STREAMING_DISCLAIMER,
          distribution: rows,
        },
      };
    }
    ```

    Step 2 — Replace empty body of `src/lib/tax/returns/fy2026/partnership.ts` analogously. `distributePartnershipNetIncome` mirrors `distributeTrustIncome` but without sharePerType handling. Add the negative-P8 anomaly.

    Step 3 — Flip `trust.test.ts` from `it.todo` to real tests:
    ```typescript
    describe('computeTrustReturn', () => {
      const fixtureEntity: Entity = {
        _v: 4, id: 't1', name: 'Smith Family Trust', type: 'Trust', status: 'Active',
        beneficiaries: [
          { id: 'b1', name: 'Alice', sharePercent: 60 },
          { id: 'b2', name: 'Bob', sharePercent: 40 },
        ],
      };
      const fixtureAccounts: Account[] = [
        { _v: 4, id: 'a-sales', code: '4010', name: 'Sales', type: 'Revenue', gstCode: 'GST', trustTaxLabel: '5B' },
      ];
      const fixtureEntries: JournalEntry[] = [
        { _v: 4, id: 'j1', date: '2025-08-15', reference: 'INV-001', description: '', isPosted: true, status: 'posted',
          lines: [
            { accountId: 'a-sales', description: '', debit: 0, credit: 200000, taxAmount: 0 },
            { accountId: 'a-cash', description: '', debit: 200000, credit: 0, taxAmount: 0 },
          ] },
      ];

      it('Form T labels from GL', () => {
        const r = computeTrustReturn({ entity: fixtureEntity, accounts: fixtureAccounts, entries: fixtureEntries, fy: 'FY2026' });
        expect(r.labels['5B'].value.toFixed(2)).toBe('200000.00');
        expect(r.labels['26'].value.toFixed(2)).toBe('200000.00');
      });
      it('distribution reconciles to net income', () => {
        const r = computeTrustReturn({ entity: fixtureEntity, accounts: fixtureAccounts, entries: fixtureEntries, fy: 'FY2026' });
        expect(r.meta.distribution[0].totalShare.toFixed(2)).toBe('120000.00');
        expect(r.meta.distribution[1].totalShare.toFixed(2)).toBe('80000.00');
        const sum = r.meta.distribution.reduce((s, d) => s.plus(d.totalShare), new Decimal(0));
        expect(sum.toFixed(2)).toBe('200000.00');
      });
      it('distribution sources from entity beneficiaries', () => {
        const r = computeTrustReturn({ entity: fixtureEntity, accounts: fixtureAccounts, entries: fixtureEntries, fy: 'FY2026' });
        expect(r.meta.distribution.map(d => d.name)).toEqual(['Alice', 'Bob']);
      });
      it('share total not 100 percent emits anomaly', () => {
        const bad = { ...fixtureEntity, beneficiaries: [{ id: 'b1', name: 'A', sharePercent: 50 }] };
        const r = computeTrustReturn({ entity: bad, accounts: fixtureAccounts, entries: fixtureEntries, fy: 'FY2026' });
        expect(r.meta.anomalies.some(a => a.id === 'shares-not-100')).toBe(true);
      });
      it('streaming disclaimer in meta', () => {
        const r = computeTrustReturn({ entity: fixtureEntity, accounts: [], entries: [], fy: 'FY2026' });
        expect(r.meta.streamingDisclaimer).toMatch(/Trust capital gains and franked distributions can only be streamed/);
        expect(r.meta.streamingDisclaimer).toMatch(/Consult your tax agent if you stream income/);
      });
      it('sharePerType present emits anomaly', () => {
        const withStream = { ...fixtureEntity, beneficiaries: [
          { id: 'b1', name: 'Alice', sharePercent: 60, sharePerType: { dividend: 100 } },
          { id: 'b2', name: 'Bob', sharePercent: 40 },
        ] };
        const r = computeTrustReturn({ entity: withStream, accounts: fixtureAccounts, entries: fixtureEntries, fy: 'FY2026' });
        expect(r.meta.anomalies.some(a => a.id.startsWith('sharePerType-unsupported'))).toBe(true);
      });
    });
    ```

    Step 4 — Flip `partnership.test.ts` to real tests with the $300k/2-partners fixture + the loss fixture.
  </action>
  <verify>
    <automated>npx vitest run src/lib/tax/returns/fy2026/__tests__/trust.test.ts src/lib/tax/returns/fy2026/__tests__/partnership.test.ts --reporter=verbose 2>&1 | tail -50</automated>
  </verify>
  <done>
    - All 6 trust.test.ts cases GREEN (success criterion #3 locked at compute layer)
    - All 3 partnership.test.ts cases GREEN
    - `tsc --noEmit` exits 0
    - No regressions in Phase 1-4 tests
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Refactor TrustTaxReturn (Form T + per-beneficiary distribution table + mandatory streaming disclaimer + Print); flip 3 component tests GREEN</name>
  <files>
    src/components/TrustTaxReturn.tsx,
    src/components/__tests__/TrustTaxReturn.test.tsx
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/components/TrustTaxReturn.tsx (Phase 2 placeholder — 207 lines)
    - A:/Projects/AussieLedger/src/lib/tax/returns/fy2026/trust.ts (Task 1 — full implementation)
    - A:/Projects/AussieLedger/src/components/PrintBanner.tsx, AnomalyBadge.tsx (Wave 0)
  </read_first>
  <behavior>
    - Refactor `TrustTaxReturn.tsx` to:
        1. Wrap content in `<section className="print-form-t">`.
        2. Render `<PrintBanner form="T" entityName={entity.name} fy={fy} locked={result.meta.locked} />`.
        3. Compute via `useMemo(() => computeTrustReturn({ entity, accounts, entries, fy }), [...])`.
        4. Render Print button (no-print) emitting EXPORT_DATA audit.
        5. Render Form T labels: 5B / 5E / 5F / 5L / 5M / 5N / 5S (total expenses) / 5T (net business income) / 11J (interest) / 26 (total net income).
        6. Render Item 57 — Statement of Distribution table:
            ```jsx
            <table>
              <thead><tr><th>Beneficiary</th><th>Share %</th><th>Total share</th><th>Ordinary</th><th>Interest</th><th>Dividend</th><th>Capital gain</th><th>Foreign</th><th>Other</th></tr></thead>
              <tbody>
                {result.meta.distribution.map((d) => (
                  <tr key={d.beneficiaryId}>
                    <td>{d.name}</td>
                    <td>—</td>{/* sharePercent rendered from entity.beneficiaries */}
                    <td>${d.totalShare.toFixed(2)}</td>
                    {/* …components.* */}
                  </tr>
                ))}
                <tr><td colSpan={2}><strong>Total</strong></td><td><strong>${total57.toFixed(2)}</strong></td>…</tr>
              </tbody>
            </table>
            ```
        7. Render `<aside className="streaming-disclaimer border-2 border-red-400 p-4 my-4">{result.meta.streamingDisclaimer}</aside>` — MANDATORY visible in both screen and print modes.
        8. Render Anomalies section (consolidated AnomalyBadges).
        9. Render `<footer className="print-footer print-only">{FOOTER_DISCLAIMER}</footer>`.
    - Tests: flip 3 `it.todo` placeholders:
        - `renders Form T with print button` — checks labels + Print button + audit on click
        - `renders per-beneficiary distribution table` — checks Alice/Bob/Total rows present
        - `renders mandatory streaming disclaimer` — checks the streaming-disclaimer text always visible
  </behavior>
  <action>
    Step 1 — Read existing TrustTaxReturn.tsx (Phase 2 placeholder) for prop contract; preserve.

    Step 2 — Rewrite using the same pattern as TaxReturnAssistant in Plan 05-2, substituting `computeTrustReturn` + Form T labels + distribution table + the mandatory streaming-disclaimer aside.

    Step 3 — Flip `TrustTaxReturn.test.tsx` Phase-5 `it.todo` placeholders to real tests. Fixture:
    ```typescript
    const fixtureEntity: Entity = {
      _v: 4, id: 't1', name: 'Family Trust', type: 'Trust', status: 'Active',
      beneficiaries: [
        { id: 'b1', name: 'Alice', sharePercent: 60 },
        { id: 'b2', name: 'Bob', sharePercent: 40 },
      ],
    };
    // …fixture accounts + entries with $200k net trust income
    ```

    Assertions:
    - "Form T", "5B", "26" labels rendered
    - "Alice" and "Bob" rows in distribution table
    - "120000.00" and "80000.00" cells visible
    - Streaming disclaimer text rendered (use `screen.getByText(/Trust capital gains and franked distributions/)`)
    - Print button click invokes `window.print` + `addLog('EXPORT_DATA', ..., 't1')`
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/TrustTaxReturn.test.tsx --reporter=verbose 2>&1 | tail -30</automated>
  </verify>
  <done>
    - All 3 TrustTaxReturn Phase-5 tests GREEN
    - `npm run build` exits 0
    - `npm run lint` exits 0
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Flesh out PartnershipTaxReturn (Form P + per-partner distribution + Print); flip 2 component tests GREEN</name>
  <files>
    src/components/PartnershipTaxReturn.tsx,
    src/components/__tests__/PartnershipTaxReturn.test.tsx
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/components/PartnershipTaxReturn.tsx (Plan 05-1 skeleton — minimal heading)
    - A:/Projects/AussieLedger/src/lib/tax/returns/fy2026/partnership.ts (Task 1 — full implementation)
    - A:/Projects/AussieLedger/src/components/TrustTaxReturn.tsx (Plan 05-3 Task 2 — pattern to mirror)
  </read_first>
  <behavior>
    - Replace the Wave 0 skeleton body of `PartnershipTaxReturn.tsx` with the full implementation:
        - Same render pattern as TrustTaxReturn (without the streaming disclaimer — partnership distribution is unconditional sharePercent-only).
        - Render labels: P1 (gross income) / P2 (total deductions) / P8 (net income or loss).
        - Render Item 54 — Statement of Distribution per Partner:
            - 1 row per partner with name + share% + total share
            - Total row reconciling to P8
        - Print button → EXPORT_DATA audit with `{ form: 'P', fy }`.
        - AnomalyBadges (consolidated + inline for the loss-share warning when P8 < 0).
        - Wrap in `<section className="print-form-p">`.
    - Tests: flip 2 `it.todo` placeholders:
        - `renders Form P with distribution` — checks P1/P2/P8 + Smith/Jones rows reconciling
        - `print button emits audit` — checks EXPORT_DATA emission
  </behavior>
  <action>
    Step 1 — Rewrite PartnershipTaxReturn.tsx. Pattern (abbreviated):
    ```typescript
    export function PartnershipTaxReturn({ entity, accounts, entries, period, addLog, fy: fyProp }: PartnershipTaxReturnProps): React.JSX.Element {
      const fy: FyLabel = fyProp ?? (period?.type === 'fy' ? period.fy : currentFy());
      const result = useMemo(() => computePartnershipReturn({ entity, accounts, entries, fy }), [entity, accounts, entries, fy]);
      const handlePrint = () => {
        addLog?.('EXPORT_DATA', JSON.stringify({ entityId: entity.id, form: 'P', fy, timestamp: today().toISOString() }), entity.id);
        window.print();
      };
      return (
        <section className="print-form-p p-4">
          <PrintBanner form="P" entityName={entity.name} fy={fy} locked={result.meta.locked} />
          <header className="no-print flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Form P — {entity.name} ({fy})</h2>
            <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded">
              {result.meta.locked ? 'Print finalised return' : 'Print working paper'}
            </button>
          </header>
          {/* Form P labels */}
          <section>
            <h3>Business income & expenses</h3>
            <LabelRow code="P1" plainEnglish="Gross income" value={result.labels.P1.value} />
            <LabelRow code="P2" plainEnglish="Total deductions" value={result.labels.P2.value} />
            <LabelRow code="P8" plainEnglish="Net income or loss" value={result.labels.P8.value} />
          </section>
          {/* Distribution table */}
          <section className="mt-4">
            <h3>Statement of Distribution per Partner (Item 54)</h3>
            <table className="w-full">
              <thead><tr><th>Partner</th><th>Share %</th><th>Total share</th></tr></thead>
              <tbody>
                {(result.meta.distribution as DistributedShare[]).map((d, i) => {
                  const partner = entity.partners?.find(p => p.id === d.beneficiaryId);
                  return <tr key={d.beneficiaryId}><td>{d.name}</td><td>{partner?.sharePercent ?? '—'}%</td><td>${d.totalShare.toFixed(2)}</td></tr>;
                })}
                <tr><td colSpan={2}><strong>Total</strong></td><td><strong>${result.labels.P8.value.toFixed(2)}</strong></td></tr>
              </tbody>
            </table>
          </section>
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

    Step 2 — Flip `PartnershipTaxReturn.test.tsx` Phase-5 `it.todo` placeholders to real tests with the $300k/2-partners fixture.
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/PartnershipTaxReturn.test.tsx --reporter=verbose 2>&1 | tail -30 && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
    - All 3 PartnershipTaxReturn tests GREEN (1 from Wave 0 + 2 flipped from `it.todo`)
    - `npm run build` exits 0
    - `npm run lint` exits 0
  </done>
</task>

</tasks>

<verification>
1. `npm run lint` exits 0
2. `npm run build` exits 0
3. `npm run test` exits 0; expected: ~425 (after 05-2) + ~14 new GREEN = ~439 SPA GREEN, IF 05-2 ran first (parallel orchestration may interleave the count)
4. `npm run test:server` exits 0 (18 server tests unchanged)
5. Success criterion #3 GREEN end-to-end: `npx vitest run src/lib/tax/returns/fy2026/__tests__/trust.test.ts -t "distribution reconciles to net income"` AND `npx vitest run src/components/__tests__/TrustTaxReturn.test.tsx -t "renders mandatory streaming disclaimer"` BOTH GREEN
6. Form T renders the mandatory streaming disclaimer in BOTH screen mode AND print mode (test asserts visibility; UAT in Plan 05-4 verifies print)
7. Partnership net-loss path emits the loss-share warning (verified by partnership.test.ts negative-P8 case)
</verification>

<success_criteria>
- [x] **Success criterion #3 GREEN end-to-end** — Trust with 2 beneficiaries (60%/40%) on $200k net income produces distribution rows of $120k/$80k that sum to $200k; the mandatory streaming disclaimer is visible inline on TrustTaxReturn.
- [x] **Requirement TRT-01 GREEN** — Form T labels 5B/5E/5F/5L/5M/5N/5S/5T/11J/26 from GL
- [x] **Requirement TRT-02 GREEN** — per-beneficiary distribution reconciles + mandatory streaming disclaimer visible
- [x] **Requirement TRT-03 GREEN** — distribution sourced from Entity.beneficiaries
- [x] **Requirement PSP-01 GREEN** — Form P labels P1/P2/P8 from GL
- [x] **Requirement PSP-02 GREEN** — per-partner distribution from Entity.partners
- [x] **Requirement TAX-02 partial** — Print buttons on Form T + Form P; .print-form-t / .print-form-p scoping; full UAT in Plan 05-4
- [x] **StorageAdapter interface untouched** — Phase 3 FINAL preserved
- [x] **File-modified list is DISJOINT from 05-2** — confirmed character-by-character:
  - 05-2 modifies: `individual.ts`, `company.ts`, `TaxReturnAssistant.tsx`, `CompanyTaxReturn.tsx`, `EntityForm.tsx` (+ their test files)
  - 05-3 modifies: `trust.ts`, `partnership.ts`, `TrustTaxReturn.tsx`, `PartnershipTaxReturn.tsx` (+ their test files)
  - Zero overlap. Both READ Wave-0 helpers (`types.ts`, `_helpers.ts`, rate helpers, labels, PrintBanner, AnomalyBadge) without modification.
</success_criteria>

<output>
After completion, create `.planning/phases/05-tax-outputs/05-3-SUMMARY.md` using the template. Capture:
- Test count delta (expected: ~14 new GREEN: 6 trust + 3 partnership + 3 TrustTaxReturn + 2 PartnershipTaxReturn)
- Form T label rollup details (which CoA accounts contribute to 5B/11J)
- Form P label rollup details
- The exact streaming disclaimer copy used (must match the locked verbatim text)
- distributeTrustIncome behaviour when sharePerType present (anomaly emitted; sharePercent-only flow proceeds)
- Partnership loss-handling notes
- Any deviations from Wave 0 interfaces (none expected)
- Files modified count + lint/build/test exit codes
</output>
