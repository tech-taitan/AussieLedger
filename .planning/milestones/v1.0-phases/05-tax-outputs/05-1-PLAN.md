---
phase: 05-tax-outputs
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/types.ts
  - src/lib/schemas.ts
  - src/lib/migrations/index.ts
  - src/lib/migrations/v3-to-v4.ts
  - src/lib/migrations/__tests__/v3-to-v4.test.ts
  - src/lib/migrations/__tests__/round-trip.test.ts
  - src/lib/migrations/__tests__/index.test.ts
  - src/lib/tax/labels/fy2026.ts
  - src/lib/tax/returns/fy2026/types.ts
  - src/lib/tax/returns/fy2026/_helpers.ts
  - src/lib/tax/returns/fy2026/individual.ts
  - src/lib/tax/returns/fy2026/company.ts
  - src/lib/tax/returns/fy2026/trust.ts
  - src/lib/tax/returns/fy2026/partnership.ts
  - src/lib/tax/returns/fy2026/bas.ts
  - src/lib/tax/returns/fy2026/ias.ts
  - src/lib/tax/returns/fy2026/__tests__/individual.test.ts
  - src/lib/tax/returns/fy2026/__tests__/company.test.ts
  - src/lib/tax/returns/fy2026/__tests__/trust.test.ts
  - src/lib/tax/returns/fy2026/__tests__/partnership.test.ts
  - src/lib/tax/returns/fy2026/__tests__/bas.test.ts
  - src/lib/tax/returns/fy2026/__tests__/ias.test.ts
  - src/lib/tax/rates/fy2026/marginal.ts
  - src/lib/tax/rates/fy2026/lito.ts
  - src/lib/tax/rates/fy2026/medicare.ts
  - src/lib/tax/rates/fy2026/bre.ts
  - src/lib/tax/rates/fy2026/smallBizOffset.ts
  - src/lib/tax/rates/__tests__/marginal.test.ts
  - src/lib/tax/rates/__tests__/lito.test.ts
  - src/lib/tax/rates/__tests__/medicare.test.ts
  - src/lib/tax/rates/__tests__/bre.test.ts
  - src/lib/tax/rates/__tests__/smallBizOffset.test.ts
  - src/lib/tax/aggregatedTurnover.ts
  - src/lib/tax/__tests__/aggregatedTurnover.test.ts
  - src/components/PrintBanner.tsx
  - src/components/AnomalyBadge.tsx
  - src/components/AssumptionsBlock.tsx
  - src/components/__tests__/PrintBanner.test.tsx
  - src/components/__tests__/AnomalyBadge.test.tsx
  - src/components/__tests__/AssumptionsBlock.test.tsx
  - src/components/PartnershipTaxReturn.tsx
  - src/components/__tests__/PartnershipTaxReturn.test.tsx
  - src/components/__tests__/TaxReturnAssistant.test.tsx
  - src/components/__tests__/CompanyTaxReturn.test.tsx
  - src/components/__tests__/TrustTaxReturn.test.tsx
  - src/components/__tests__/BasIasAssistant.test.tsx
  - src/components/__tests__/EntityForm.test.tsx
  - src/components/__tests__/ViewRouter.test.tsx
  - src/styles/print.css
  - src/styles/__tests__/print-css.test.ts
  - src/index.css
autonomous: true
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
    - "v3→v4 additive migration widens Entity with optional aggregatedTurnover + paygInstalmentAmount; existing 371 SPA tests stay GREEN; round-trip from v0→v4 preserves every field"
    - "FY2026 rate helpers (marginal, LITO, Medicare/MLS, BRE, small-biz offset) ship as pure functions with all boundary tests GREEN — these are the SINGLE SOURCE OF TRUTH for 05-2/05-3/05-4"
    - "`marginalTaxFY2026($45,000) === $4,288`, `marginalTaxFY2026($190,000) === $51,638` to-the-cent"
    - "`litoFY2026($37,500) === $700`, `litoFY2026($45,000) === $325`, `litoFY2026($66,667) === $0`"
    - "`breRate({ passive: 90%, turnover < $50M }) → 0.30` — locks success criterion #2 at the helper layer"
    - "`smallBusinessIncomeOffset` caps at $1,000 and returns 0 above $5M turnover"
    - "Shared types `ReturnLabel`, `Anomaly`, `ComputedReturn<T>` in `src/lib/tax/returns/fy2026/types.ts` — FINAL contract for 05-2/05-3/05-4 compute functions"
    - "All 5 compute*Return signatures land (individual/company/trust/partnership/bas/ias) with empty-body skeletons so consumers compile but tests RED until 05-2/05-3/05-4 implement"
    - "Three Wave-0 in-repo corrections land: NAT comment fix in labels file (Individual 2541/2543, Trust 0660, Partnership 0659), BRE legislative cite fix (Income Tax Rates Act 1986 s.23AA + s.23AB), REQUIREMENTS.md COY-04→IND-04 swap verified in place"
    - "Shared print primitives (`PrintBanner`, `AnomalyBadge`, `AssumptionsBlock`) ship GREEN with component tests — no external dependencies"
    - "`src/styles/print.css` ships with `@media print` rules (`.no-print` hides app shell; `.print-only` shows; per-form CSS classes `.print-form-i/c/t/p/bas`) and is imported into `src/index.css`"
    - "All Phase 5 RED test scaffolds enumerate every test 05-2/05-3/05-4 needs to flip GREEN — counted in 05-VALIDATION.md per-task verification map"
    - "StorageAdapter interface untouched (Phase 3 FINAL preserved)"
    - "Zero new runtime dependencies installed"
    - "Structural lint stays GREEN — no parameterless `new Date()` outside `src/lib/period.ts`"
  artifacts:
    - path: "src/types.ts"
      provides: "v4-widened Entity with optional aggregatedTurnover + paygInstalmentAmount fields"
      contains: "aggregatedTurnover"
    - path: "src/lib/migrations/v3-to-v4.ts"
      provides: "migrateV3ToV4(state) — additive only, preserves every existing field"
      exports: ["migrateV3ToV4"]
    - path: "src/lib/migrations/index.ts"
      provides: "CURRENT_VERSION = 4; registers 3 → migrateV3ToV4"
      contains: "CURRENT_VERSION = 4"
    - path: "src/lib/tax/labels/fy2026.ts"
      provides: "Full FY2026 label catalogue: Individual NAT 2541/2543 (full P8), Company NAT 0656, Trust NAT 0660, Partnership NAT 0659; FY2026 marginal brackets, LITO formula constants, Medicare thresholds, MLS bands; 3 NAT typo fixes + BRE legislative cite fix"
      contains: "NAT 2541"
    - path: "src/lib/tax/returns/fy2026/types.ts"
      provides: "Shared types: ReturnLabel, Anomaly, ComputedReturn<T>, IndividualReturnLabels, CompanyReturnLabels, TrustReturnLabels, PartnershipReturnLabels, BasReturnLabels, IasReturnLabels"
      exports: ["ReturnLabel", "Anomaly", "ComputedReturn"]
    - path: "src/lib/tax/returns/fy2026/_helpers.ts"
      provides: "rollupByLabel<L>(entries, accounts, labelField) shared pure helper; excludes superseded/voided/draft + replacedByEntryId entries"
      exports: ["rollupByLabel", "filterPostedEntries"]
    - path: "src/lib/tax/rates/fy2026/marginal.ts"
      provides: "marginalTaxFY2026(taxableIncome: Decimal): Decimal — FY2026 post-Stage-3 brackets (0/16/30/37/45 at $18,200/$45,000/$135,000/$190,000)"
      exports: ["marginalTaxFY2026", "FY2026_MARGINAL_BRACKETS"]
    - path: "src/lib/tax/rates/fy2026/lito.ts"
      provides: "litoFY2026(taxableIncome: Decimal): Decimal — two-stage taper $700 max, 5c/$1 from $37,500, 1.5c/$1 from $45,000, out at $66,667"
      exports: ["litoFY2026"]
    - path: "src/lib/tax/rates/fy2026/medicare.ts"
      provides: "medicareLevySingle(taxableIncome); medicareLevySurcharge(taxableIncome, hasPHC); medicareLevy({...}) family fallback"
      exports: ["medicareLevySingle", "medicareLevySurcharge", "medicareLevyFY2026"]
    - path: "src/lib/tax/rates/fy2026/bre.ts"
      provides: "brePassiveIncomePct(entity, accounts, entries, fy); breRate(passivePct, turnover) → 25 | 30; 70-90% anomaly trigger"
      exports: ["brePassiveIncomePct", "breRate", "breTestFY2026"]
    - path: "src/lib/tax/rates/fy2026/smallBizOffset.ts"
      provides: "smallBusinessIncomeOffset(netSbIncome, aggTurnover, taxPayable) — 16% × tax payable on SB income, capped $1,000, turnover < $5M"
      exports: ["smallBusinessIncomeOffset"]
    - path: "src/lib/tax/aggregatedTurnover.ts"
      provides: "computeAggregatedTurnover(entity, accounts, entries, fy) — sum of Revenue accounts in FY period; consumed by BRE + small-biz offset"
      exports: ["computeAggregatedTurnover"]
    - path: "src/lib/tax/returns/fy2026/individual.ts"
      provides: "computeIndividualReturn signature + empty body — 05-2 implements full Form I + B&P logic"
      exports: ["computeIndividualReturn", "IndividualReturn"]
    - path: "src/lib/tax/returns/fy2026/company.ts"
      provides: "computeCompanyReturn signature + empty body — 05-2 implements full Form C + BRE logic"
      exports: ["computeCompanyReturn", "CompanyReturn"]
    - path: "src/lib/tax/returns/fy2026/trust.ts"
      provides: "computeTrustReturn signature + empty body — 05-3 implements full Form T logic"
      exports: ["computeTrustReturn", "TrustReturn", "distributeTrustIncome"]
    - path: "src/lib/tax/returns/fy2026/partnership.ts"
      provides: "computePartnershipReturn signature + empty body — 05-3 implements full Form P logic"
      exports: ["computePartnershipReturn", "PartnershipReturn"]
    - path: "src/lib/tax/returns/fy2026/bas.ts"
      provides: "computeBas signature + empty body — 05-4 implements full BAS logic"
      exports: ["computeBas", "BasReturn"]
    - path: "src/lib/tax/returns/fy2026/ias.ts"
      provides: "computeIas signature + empty body — 05-4 implements full IAS logic"
      exports: ["computeIas", "IasReturn"]
    - path: "src/components/PrintBanner.tsx"
      provides: "Top-of-page print banner; per-form variants; renders entity name + form code + FY + LOCKED-FY tag + full disclaimer text"
      exports: ["PrintBanner"]
    - path: "src/components/AnomalyBadge.tsx"
      provides: "Inline yellow badge for severity='info'|'warn' with message; reused across all 5 form renderers"
      exports: ["AnomalyBadge"]
    - path: "src/components/AssumptionsBlock.tsx"
      provides: "Form I 'Assumptions used' boxed section listing assumed marital status, age, Medicare exemption, PHC, dependants"
      exports: ["AssumptionsBlock"]
    - path: "src/components/PartnershipTaxReturn.tsx"
      provides: "Form P renderer skeleton — heading + 'Pending Plan 05-3' placeholder so ViewRouter compiles; 05-3 fleshes out"
      exports: ["PartnershipTaxReturn"]
    - path: "src/styles/print.css"
      provides: "@media print rules: hide app shell (.no-print), show .print-only, page-break helpers, per-form classes (.print-form-i/c/t/p/bas), banner/footer positioning"
      contains: "@media print"
  key_links:
    - from: "src/lib/migrations/index.ts"
      to: "src/lib/migrations/v3-to-v4.ts"
      via: "migrations[3] = migrateV3ToV4"
      pattern: "migrateV3ToV4"
    - from: "src/lib/tax/rates/fy2026/bre.ts"
      to: "src/lib/tax/labels/fy2026.ts"
      via: "BRE_PASSIVE_THRESHOLD + BRE_TURNOVER_THRESHOLD constants"
      pattern: "BRE_PASSIVE_THRESHOLD"
    - from: "src/lib/tax/rates/fy2026/smallBizOffset.ts"
      to: "src/lib/money.ts"
      via: "Decimal arithmetic only"
      pattern: "Decimal"
    - from: "src/lib/tax/aggregatedTurnover.ts"
      to: "src/lib/period.ts"
      via: "isInPeriod + fyBoundaries to filter Revenue lines"
      pattern: "isInPeriod"
    - from: "src/lib/tax/returns/fy2026/_helpers.ts"
      to: "src/types.ts"
      via: "JournalEntry.status filtering + replacedByEntryId"
      pattern: "status\\s*===\\s*'superseded'"
    - from: "src/components/PrintBanner.tsx"
      to: "src/components/DisclaimerFooter.tsx"
      via: "imports WORKING_PAPER_DISCLAIMER text constant from DisclaimerFooter or constants module"
      pattern: "WORKING_PAPER_DISCLAIMER"
    - from: "src/styles/print.css"
      to: "src/index.css"
      via: "imported via @import"
      pattern: "@import.*print.css"
---

<objective>
Wave 0 — scaffold every Phase-5 type widening (Entity additive v3→v4 with aggregatedTurnover + paygInstalmentAmount), the additive v3→v4 migration, the FY2026 rate helpers (marginal tax, LITO, Medicare levy + MLS, BRE, small-business offset), the shared compute-function types, the shared rollup helper, all 6 compute*Return module signatures (empty bodies for 05-2/05-3/05-4 to flesh out), the aggregated-turnover helper, the shared print components (PrintBanner, AnomalyBadge, AssumptionsBlock), the print.css module, and every Phase-5 test file (GREEN immediately where Wave 0 ships pure data/logic + pure UI primitives; RED-by-design where downstream implementation is needed). Three Wave-0 in-repo corrections (NAT comments in labels file, BRE legislative cite, REQUIREMENTS.md COY-04→IND-04 verification) land here as documentation hygiene.

Purpose: Without Wave 0, plans 05-2 (Individual + Company), 05-3 (Trust + Partnership) and 05-4 (BAS/IAS + UAT) would each spend context budget re-discovering the rate-helper signatures, the shared types, the print primitives, the print.css class names, and the migration shape. By landing every pure helper, primitive, type, scaffold, and label correction up front, 05-2/05-3 can run in parallel against the same artifacts and 05-4 can run sequentially after them with zero ambiguity.

Output:
- `src/types.ts` widened to v4 (additive only; existing 371 SPA + 18 server tests stay green)
- `src/lib/schemas.ts` Zod entity schema widened to v4
- `src/lib/migrations/v3-to-v4.ts` additive migration body + `CURRENT_VERSION` bumped to 4
- `src/lib/tax/rates/fy2026/{marginal,lito,medicare,bre,smallBizOffset}.ts` — 5 pure-function rate helpers (GREEN)
- `src/lib/tax/aggregatedTurnover.ts` — pure helper (GREEN)
- `src/lib/tax/returns/fy2026/{types,_helpers}.ts` — shared types + rollup helper (GREEN)
- `src/lib/tax/returns/fy2026/{individual,company,trust,partnership,bas,ias}.ts` — 6 compute*Return module signatures with empty bodies (compile-only; RED tests)
- `src/lib/tax/labels/fy2026.ts` widened with full label catalogues for all 5 forms + rate constants + 3 typo fixes + BRE cite fix
- `src/components/{PrintBanner,AnomalyBadge,AssumptionsBlock}.tsx` — 3 shared UI primitives (GREEN)
- `src/components/PartnershipTaxReturn.tsx` skeleton (compile-only; 05-3 fleshes out)
- `src/styles/print.css` + `src/index.css` import wiring (GREEN; sanity-checked)
- 21 new/extended test files (mix of GREEN immediately + RED scaffolds; per the Wave 0 list in 05-VALIDATION.md)

After Plan 05-1, success criteria #2 (BRE 90%-dividend → 30%), #3 (per-beneficiary distribution helper signature ready), and #4 (LITO + Medicare helpers ship correctly) are met **at the helper layer**. The form-level golden tests (#1 BAS to-the-cent, #4 Individual form-level, #5 print structure) flip GREEN in waves 2/3 once compute*Return functions and renderers are filled in.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/05-tax-outputs/05-CONTEXT.md
@.planning/phases/05-tax-outputs/05-RESEARCH.md
@.planning/phases/05-tax-outputs/05-VALIDATION.md
@.planning/phases/04-bookkeeping-core/04-4-SUMMARY.md
@src/types.ts
@src/lib/schemas.ts
@src/lib/migrations/index.ts
@src/lib/migrations/v2-to-v3.ts
@src/lib/money.ts
@src/lib/period.ts
@src/lib/tax/labels/fy2026.ts
@src/lib/tax/individual.ts
@src/lib/tax/company.ts
@src/lib/tax/trust.ts
@src/lib/tax/partnership.ts
@src/lib/tax/bas.ts
@src/lib/tax/types.ts
@src/lib/coa/fy2026/base.ts
@src/components/DisclaimerFooter.tsx
@src/storage/adapter.ts
@package.json

<interfaces>
<!-- FINAL contracts the executor inherits and MUST NOT widen -->

From src/storage/adapter.ts (Phase 3 FINAL — DO NOT MODIFY):
```typescript
export interface StorageAdapter {
  ready(): Promise<void>;
  getEntities(): Promise<Entity[]>;
  getAccounts(): Promise<Account[]>;
  getEntries(): Promise<Record<string, JournalEntry[]>>;
  getAuditLogs(): Promise<AuditLog[]>;
  saveEntities(entities: Entity[]): Promise<void>;
  saveAccounts(accounts: Account[]): Promise<void>;
  saveEntries(entries: Record<string, JournalEntry[]>): Promise<void>;
  saveAuditLogs(logs: AuditLog[]): Promise<void>;
  appendAuditLog(log: AuditLog): Promise<void>;
  exportAll(): Promise<PersistedRoot>;
  importAll(state: PersistedRoot): Promise<void>;
}
```

From src/lib/migrations/index.ts (current — Wave 0 bumps to 4):
```typescript
export const CURRENT_VERSION = 3;          // → 4 after this plan
export function migrate(raw: Record<string, unknown>): PersistedRoot;
const MIGRATIONS: Record<number, MigrationFn> = {
  0: identity,
  1: migrateV1ToV2,
  2: migrateV2ToV3,
  // 3: migrateV3ToV4  ← added in Wave 0
};
```

From src/lib/money.ts (Phase 1 boundary — DO NOT MODIFY):
```typescript
import Decimal from 'decimal.js';
// Global config: ROUND_HALF_EVEN (banker's rounding)
export { Decimal };
export function gst(amountInclusiveGST: Decimal | string | number): Decimal;
export function toMoneyString(d: Decimal): string;   // 2dp string
export function fromMoneyString(s: string): Decimal;
```

From src/lib/period.ts (Phase 2 — DO NOT MODIFY):
```typescript
export type FyLabel = `FY${number}`;
export type Period =
  | { type: 'fy'; fy: FyLabel }
  | { type: 'quarter'; fy: FyLabel; q: 1 | 2 | 3 | 4 }
  | { type: 'custom'; from: Date; to: Date };
export function today(): Date;
export function currentFy(now?: Date): FyLabel;
export function fyBoundaries(fy: FyLabel): { from: Date; to: Date };
export function quarterBoundaries(fy: FyLabel, q: 1|2|3|4): { from: Date; to: Date };
export function isInPeriod(date: Date, period: Period): boolean;
export function _setNowProvider(fn: () => Date): void;
export function _resetNowProvider(): void;
```

From src/types.ts (v3 — Wave 0 widens to v4, additive only):
```typescript
export interface Entity {
  // …v3 fields preserved verbatim…
  gstRegistered?: boolean;
  accountingMethod?: 'cash' | 'accruals';
  fyEndDate?: string;
  lockedFys?: string[];
  beneficiaries?: BeneficiaryRow[];
  partners?: PartnerRow[];
  // _v:4 additions (this plan)
  aggregatedTurnover?: string;      // optional decimal string; auto-default from Revenue accounts
  paygInstalmentAmount?: string;    // optional decimal string; Method-1 PAYG-I amount from ATO portal
}

export interface BeneficiaryRow {
  id: string;
  name: string;
  sharePercent: number;
  sharePerType?: Partial<Record<'interest' | 'dividend' | 'capitalGain' | 'foreign' | 'other', number>>;
}

export interface JournalEntry {
  // …
  status?: 'draft' | 'posted' | 'superseded' | 'reversed' | 'voided';
  replacedByEntryId?: string;
}
```

From src/components/DisclaimerFooter.tsx (Phase 1 — DO NOT MODIFY):
```typescript
// Working-paper disclaimer text constant — import or re-create the exact same string for PrintBanner.
// Phase 1 set the canonical copy: "AussieLedger produces a working paper only. It is not tax advice..."
```

Shared Phase 5 return types (NEW — this plan creates them):
```typescript
// src/lib/tax/returns/fy2026/types.ts
import type { Decimal } from '../../../money';

export interface ReturnLabel {
  code: string;                    // e.g. 'P1', '6A', 'G1', '1A'
  plainEnglish: string;            // e.g. 'Gross business income'
  value: Decimal;                  // pre-rounded per per-label rounding rule
  internalOnly?: boolean;          // true for Simpler BAS internal G2/G3/G10/G11
  natReference?: string;           // e.g. 'NAT 2541 item 15'
}

export interface Anomaly {
  id: string;
  severity: 'info' | 'warn';
  label?: string;                  // optional ATO label this anomaly attaches to
  message: string;
}

export interface ComputedReturn<TLabels extends Record<string, ReturnLabel>> {
  labels: TLabels;
  meta: {
    fy: string;
    entityType: 'Individual' | 'Company' | 'Trust' | 'Partnership';
    natReference: string;
    locked: boolean;
    anomalies: Anomaly[];
    [extra: string]: unknown;
  };
}

// Per-form label-set types (used by compute*Return generics)
export interface IndividualReturnLabels { /* see types.ts file body */ }
export interface CompanyReturnLabels { /* … */ }
export interface TrustReturnLabels { /* … */ }
export interface PartnershipReturnLabels { /* … */ }
export interface BasReturnLabels { /* … */ }
export interface IasReturnLabels { /* … */ }
```
</interfaces>

</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Wave-0 corrections + v3→v4 additive migration + widened types/schemas/labels</name>
  <files>
    src/types.ts,
    src/lib/schemas.ts,
    src/lib/migrations/index.ts,
    src/lib/migrations/v3-to-v4.ts,
    src/lib/migrations/__tests__/v3-to-v4.test.ts,
    src/lib/migrations/__tests__/round-trip.test.ts,
    src/lib/migrations/__tests__/index.test.ts,
    src/lib/tax/labels/fy2026.ts
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/types.ts (current v3 shape)
    - A:/Projects/AussieLedger/src/lib/migrations/v2-to-v3.ts (additive-migration reference pattern)
    - A:/Projects/AussieLedger/src/lib/migrations/index.ts (CURRENT_VERSION + MIGRATIONS map)
    - A:/Projects/AussieLedger/src/lib/schemas.ts (Zod widening pattern)
    - A:/Projects/AussieLedger/src/lib/tax/labels/fy2026.ts (current 5-label-only file)
    - A:/Projects/AussieLedger/.planning/phases/05-tax-outputs/05-RESEARCH.md (ATO Field Codes + Rate Tables sections — has full P8 label list + FY2026 brackets + LITO formula + Medicare thresholds + MLS bands)
    - A:/Projects/AussieLedger/.planning/REQUIREMENTS.md (verify COY-04 marked obsolete + IND-04 present)
  </read_first>
  <behavior>
    - `src/types.ts` widens `Entity` interface with two optional fields: `aggregatedTurnover?: string`, `paygInstalmentAmount?: string`. Both are decimal-encoded strings (per Phase 1 money.ts boundary). All existing v3 fields preserved verbatim.
    - `src/lib/schemas.ts` Zod entity schema widens to accept the two new optional string fields; nothing else changes.
    - `src/lib/migrations/v3-to-v4.ts` exports `migrateV3ToV4(v3: PersistedRoot_v3): PersistedRoot_v4` — spreads every existing field, maps over entities adding the two new fields as `undefined`, bumps `_v` to 4. ADDITIVE ONLY — no field removed, no field renamed, no field defaulted to a non-undefined value (entities that never get aggregatedTurnover set continue to behave the same as before).
    - `src/lib/migrations/index.ts` bumps `CURRENT_VERSION` from 3 to 4 and registers `MIGRATIONS[3] = migrateV3ToV4`.
    - `src/lib/migrations/__tests__/v3-to-v4.test.ts` — 3 tests: (1) aggregatedTurnover default undefined preserved; (2) paygInstalmentAmount default undefined preserved; (3) round-trip v3→v4 preserves every other field. Plus a test verifying `_v: 4` is set on the output root.
    - `src/lib/migrations/__tests__/round-trip.test.ts` — extend existing file with a new `v0 to v4 round-trip` test that runs through every migration step.
    - `src/lib/migrations/__tests__/index.test.ts` — NEW file with a single test: `CURRENT_VERSION === 4`.
    - `src/lib/tax/labels/fy2026.ts` is **rewritten / widened** with:
        1. Fix `NAT 0660` comment on Individual labels → `NAT 2541 main return + NAT 2543 B&P schedule`. Phase 4 CONTEXT got it right; Phase 2 labels file did not.
        2. Fix `NAT 0659` comment on Trust labels → `NAT 0660`.
        3. Fix `NAT 0976` comment on Partnership labels → `NAT 0659`.
        4. Fix the `BRE_PASSIVE_THRESHOLD` comment: `Income Tax Rates Act 1986 s.23AA + s.23AB` (NOT ITAA 1997).
        5. Widen `IndividualLabel` to include the full P8 schedule label set: `'P1' | 'P2' | 'P8' | 'item15' | '6S' | '6K' | '6L' | '6N' | '6Q' | 'B' | 'C' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'N' | 'M1' | 'M2' | 'T1' | 'item7D'` (item 7D = small-business offset line).
        6. Widen `CompanyLabel` to include `'6A' | '6B' | '6C' | '6D' | '6E' | '6F' | '6G' | '6H' | '6R' | '6S' | '6T' | '6U' | '6V' | '6W' | '6X' | '6Q' | '7T' | 'CS_A' | 'CS_B' | 'CS_J' | 'CS_S' | 'franking_open' | 'franking_move' | 'franking_close'`.
        7. Widen `TrustLabel` to include the full distribution-statement columns: `'5B' | '5E' | '5F' | '5L' | '5M' | '5N' | '5S' | '5T' | '11J' | '26' | '56' | '57_A' | '57_B' | '57_C' | '57_D' | '57_E' | '57_F'`.
        8. Widen `PartnershipLabel`: `'5B' | '5E' | '5N' | '5T' | '54_A' | '54_B' | 'P1' | 'P2' | 'P8'` (the P1/P2/P8 aliases preserved for back-compat with the Phase 2 stub).
        9. Widen `BasLabel`: `'G1' | 'G2' | 'G3' | 'G10' | 'G11' | '1A' | '1B' | 'W1' | 'W2' | 'W3' | 'W4' | 'W5' | 'T7'` (adds W3/W4/W5/T7).
        10. Add FY2026 marginal brackets as `FY2026_MARGINAL_BRACKETS` constant — array of `{ upTo: string; rate: string; baseAt: string }` in decimal-string form (consumed by `marginal.ts`).
        11. Add `LITO_MAX = '700'`, `LITO_TAPER_1_FROM = '37500'`, `LITO_TAPER_1_RATE = '0.05'`, `LITO_TAPER_2_FROM = '45000'`, `LITO_TAPER_2_RATE = '0.015'`, `LITO_CUTOUT = '66667'`.
        12. Add `MEDICARE_LEVY_RATE = '0.02'`, `MEDICARE_LEVY_SINGLE_LOWER = '27222'`, `MEDICARE_LEVY_SINGLE_UPPER = '34028'`, `MEDICARE_LEVY_SINGLE_SHADING_RATE = '0.10'` (10c per $1 above lower).
        13. Add `MLS_SINGLE_TIER_1 = '101000'`, `MLS_SINGLE_TIER_2 = '118000'`, `MLS_SINGLE_TIER_3 = '144000'`, `MLS_SINGLE_RATE_1 = '0.01'`, `MLS_SINGLE_RATE_2 = '0.0125'`, `MLS_SINGLE_RATE_3 = '0.015'`, and family-tier mirrors.
        14. Add `SBI_OFFSET_RATE = '0.16'`, `SBI_OFFSET_CAP = '1000'`, `SBI_OFFSET_TURNOVER_THRESHOLD = '5000000'`.
        15. Add `INDIVIDUAL_LABELS_FULL`, `COMPANY_LABELS_FULL`, `TRUST_LABELS_FULL`, `PARTNERSHIP_LABELS_FULL`, `BAS_LABELS_FULL` record constants mapping each label code to `{ title, description, natReference, plainEnglish, internalOnly? }`. Preserve the existing 5-key Individual / 8-key Company / 10-key Trust / 3-key Partnership records under DEPRECATED-named aliases (or extend them — the goal is non-destructive widening so existing Phase-2 imports still compile).
    - REQUIREMENTS.md must be unchanged in this task (it was already corrected in commit `6970b91` — verify visually but don't write to it).
  </behavior>
  <action>
    Step 1 — Read REQUIREMENTS.md and verify the two text-level corrections are present:
    - COY-04 has `[~]` marker and "**OBSOLETE / re-scoped to IND-04**" text.
    - IND-04 entry exists with "16% × tax payable on net small business income, capped at $1,000".
    If either is missing, STOP and surface to the user — do NOT silently edit REQUIREMENTS.md. (Commit `6970b91` should have landed both.)

    Step 2 — Widen `src/types.ts` Entity interface. Append after `partners?: PartnerRow[];`:
    ```typescript
      // _v:4 additions
      /** Aggregated turnover for s.328-115 BRE / small-biz-offset tests. Optional decimal string; auto-default from Revenue accounts via computeAggregatedTurnover. */
      aggregatedTurnover?: string;
      /** PAYG instalment Method-1 amount from ATO portal. Optional decimal string. */
      paygInstalmentAmount?: string;
    ```

    Step 3 — Widen `src/lib/schemas.ts` Zod entity schema. Locate `EntitySchema` and add (alongside existing optional fields):
    ```typescript
      aggregatedTurnover: z.string().optional(),
      paygInstalmentAmount: z.string().optional(),
    ```

    Step 4 — Create `src/lib/migrations/v3-to-v4.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import type { PersistedRoot } from '../../types';

    /**
     * v3 → v4 additive migration (Phase 5 Wave 0).
     *
     * Adds two optional Entity fields:
     *   - aggregatedTurnover?: string  (decimal string for BRE + small-biz offset)
     *   - paygInstalmentAmount?: string (decimal string for BAS T7)
     *
     * Both default to undefined (i.e. absent). Migration is non-destructive:
     * every existing field is preserved verbatim.
     */
    export function migrateV3ToV4(v3: PersistedRoot): PersistedRoot {
      return {
        ...v3,
        _v: 4,
        entities: v3.entities.map((e) => ({
          ...e,
          // Both new fields default to undefined — explicit for round-trip clarity
          aggregatedTurnover: (e as { aggregatedTurnover?: string }).aggregatedTurnover,
          paygInstalmentAmount: (e as { paygInstalmentAmount?: string }).paygInstalmentAmount,
        })),
      };
    }
    ```

    Step 5 — Edit `src/lib/migrations/index.ts`:
    - Change `export const CURRENT_VERSION = 3;` to `export const CURRENT_VERSION = 4;`
    - Add `import { migrateV3ToV4 } from './v3-to-v4';` near the existing imports
    - Add `3: migrateV3ToV4,` to the MIGRATIONS object

    Step 6 — Create `src/lib/migrations/__tests__/v3-to-v4.test.ts`:
    ```typescript
    import { describe, it, expect } from 'vitest';
    import { migrateV3ToV4 } from '../v3-to-v4';

    const minimalV3 = (): { _v: 3; entities: unknown[]; accounts: unknown[]; entries: Record<string, unknown[]>; auditLogs: unknown[] } => ({
      _v: 3,
      entities: [
        { _v: 3, id: 'e1', name: 'Acme Pty', type: 'Company', status: 'Active',
          gstRegistered: true, accountingMethod: 'accruals', fyEndDate: '06-30',
          lockedFys: [], beneficiaries: [], partners: [] },
      ],
      accounts: [],
      entries: { e1: [] },
      auditLogs: [],
    });

    describe('migrateV3ToV4', () => {
      it('bumps _v to 4', () => {
        const out = migrateV3ToV4(minimalV3() as any);
        expect(out._v).toBe(4);
      });

      it('aggregatedTurnover undefined default preserved', () => {
        const out = migrateV3ToV4(minimalV3() as any);
        expect((out.entities[0] as any).aggregatedTurnover).toBeUndefined();
      });

      it('paygInstalmentAmount undefined default preserved', () => {
        const out = migrateV3ToV4(minimalV3() as any);
        expect((out.entities[0] as any).paygInstalmentAmount).toBeUndefined();
      });

      it('v3 to v4 round-trip non-destructive — preserves every existing field', () => {
        const input = minimalV3();
        const out = migrateV3ToV4(input as any);
        const e = out.entities[0] as any;
        expect(e.id).toBe('e1');
        expect(e.name).toBe('Acme Pty');
        expect(e.type).toBe('Company');
        expect(e.status).toBe('Active');
        expect(e.gstRegistered).toBe(true);
        expect(e.accountingMethod).toBe('accruals');
        expect(e.fyEndDate).toBe('06-30');
        expect(e.lockedFys).toEqual([]);
        expect(e.beneficiaries).toEqual([]);
        expect(e.partners).toEqual([]);
      });

      it('preserves preset aggregatedTurnover when present', () => {
        const input = minimalV3() as any;
        input.entities[0].aggregatedTurnover = '4250000.00';
        const out = migrateV3ToV4(input);
        expect((out.entities[0] as any).aggregatedTurnover).toBe('4250000.00');
      });
    });
    ```

    Step 7 — Extend `src/lib/migrations/__tests__/round-trip.test.ts` with a `v0 to v4 round-trip` test that constructs a minimal v0 blob and runs `migrate()` end-to-end; assert `_v === 4` and that all original v0 data fields are preserved through every migration step.

    Step 8 — Create `src/lib/migrations/__tests__/index.test.ts`:
    ```typescript
    import { describe, it, expect } from 'vitest';
    import { CURRENT_VERSION } from '../index';

    describe('migrations index', () => {
      it('CURRENT_VERSION is 4', () => {
        expect(CURRENT_VERSION).toBe(4);
      });
    });
    ```

    Step 9 — Rewrite `src/lib/tax/labels/fy2026.ts`. PRESERVE every existing `export` symbol so Phase-2 imports continue to compile. Then add the widened catalogues and rate constants per the behaviour list above. The 3 NAT comment fixes go at the section-header doc comments; the BRE cite fix goes on the `BRE_PASSIVE_THRESHOLD` JSDoc; and existing constants (`COMPANY_TAX_RATE_BASE`, `COMPANY_TAX_RATE_FULL`, `BRE_TURNOVER_THRESHOLD`) stay unchanged. Pattern:
    ```typescript
    // ── Individual return label set ────────────────────────────────────────────
    // Source: NAT 2541 (Individual tax return) + NAT 2543 (B&P schedule) FY2025-26
    // https://www.ato.gov.au/forms-and-instructions/individual-tax-return-2025-instructions
    // https://www.ato.gov.au/api/public/content/5861f7f47efa45d5b76332ef12919ace

    export type IndividualLabel =
      | '6S' | '6K' | '6L' | '6N' | '6Q'             // Phase 2 — preserved
      | 'P1' | 'P2' | 'P8' | 'item15'                // Phase 5 — main flow-through
      | 'B' | 'C' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'N'  // P8 sub-labels
      | 'M1' | 'M2' | 'T1'                            // Medicare + LITO disclosure
      | 'item7D';                                     // Small-business income tax offset (IND-04)

    export const INDIVIDUAL_LABELS_FULL: Record<IndividualLabel, { title: string; description: string; natReference: string; plainEnglish: string }> = {
      // …populate per RESEARCH.md ATO Field Codes § Individual
      '6S': { title: 'Total Business Income', description: '…', natReference: 'NAT 2541 item 6', plainEnglish: 'Total business income' },
      // …
      'P1': { title: 'Main business description', description: '…', natReference: 'NAT 2543 item P1', plainEnglish: 'Main business activity' },
      'P2': { title: 'Business deductions', description: '…', natReference: 'NAT 2543 item P2', plainEnglish: 'Business deductions' },
      'P8': { title: 'Business income & expenses', description: '…', natReference: 'NAT 2543 item P8', plainEnglish: 'Net business income (P8)' },
      'item15': { title: 'Net business income flow-through', description: 'Item 15 on main return; equals P8.', natReference: 'NAT 2541 item 15', plainEnglish: 'Net income/loss from business' },
      'item7D': { title: 'Small business income tax offset', description: '16% × tax payable on net small business income, capped at $1,000.', natReference: 'NAT 2541 item 7D', plainEnglish: 'Small business income tax offset' },
      // …populate remaining P8 sub-labels (B, C, E, F, G, H, I, J, K, L, N) from RESEARCH.md table
      // M1, M2, T1 — Medicare + LITO disclosure lines
    };

    // PRESERVED for Phase 2 back-compat:
    export const INDIVIDUAL_LABELS: Record<'6S' | '6K' | '6L' | '6N' | '6Q', { title: string; description: string }> = {
      '6S': { title: 'Total Business Income', description: '…' },
      '6K': { title: 'Gross Interest',        description: '…' },
      '6L': { title: 'Salary and Wage Expenses', description: '…' },
      '6N': { title: 'All Other Expenses',    description: '…' },
      '6Q': { title: 'Cost of Sales',         description: '…' },
    };

    // …same widening pattern for COMPANY, TRUST, PARTNERSHIP, BAS…

    // ── BRE constants (Wave-0 legislative cite FIX) ────────────────────────────
    /**
     * BRE passive income threshold: 80%.
     * Source: Income Tax Rates Act 1986 s.23AA (BRE definition) + s.23AB (BREPI definition).
     * (Phase-2 comment said "ITAA 1997 s 23AA" — that's incorrect; ITRA 1986 is the right Act.)
     */
    export const BRE_PASSIVE_THRESHOLD = '0.80' as const;

    /**
     * BRE aggregated turnover threshold: $50,000,000 AUD.
     * Source: Income Tax Rates Act 1986 s.23AB (paragraph defining BRE aggregated turnover).
     */
    export const BRE_TURNOVER_THRESHOLD = '50000000' as const;

    // ── FY2026 marginal-rate brackets ──────────────────────────────────────────
    // Source: ATO "Tax rates – Australian resident" 2025-26 (post-Stage-3, in force from 1 Jul 2024).
    // https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
    export const FY2026_MARGINAL_BRACKETS = [
      { upTo: '18200',    rate: '0.00', baseAt: '0' },
      { upTo: '45000',    rate: '0.16', baseAt: '0' },
      { upTo: '135000',   rate: '0.30', baseAt: '4288' },
      { upTo: '190000',   rate: '0.37', baseAt: '31288' },
      { upTo: 'Infinity', rate: '0.45', baseAt: '51638' },
    ] as const;

    // ── LITO constants ─────────────────────────────────────────────────────────
    export const LITO_MAX = '700' as const;
    export const LITO_TAPER_1_FROM = '37500' as const;
    export const LITO_TAPER_1_RATE = '0.05' as const;
    export const LITO_TAPER_2_FROM = '45000' as const;
    export const LITO_TAPER_2_RATE = '0.015' as const;
    export const LITO_CUTOUT = '66667' as const;

    // ── Medicare levy + MLS constants (single — family flat 2% + warning) ──────
    export const MEDICARE_LEVY_RATE = '0.02' as const;
    export const MEDICARE_LEVY_SINGLE_LOWER = '27222' as const;
    export const MEDICARE_LEVY_SINGLE_UPPER = '34028' as const;
    export const MEDICARE_LEVY_SINGLE_SHADING_RATE = '0.10' as const;
    export const MLS_SINGLE_TIER_1 = '101000' as const;
    export const MLS_SINGLE_TIER_2 = '118000' as const;
    export const MLS_SINGLE_TIER_3 = '144000' as const;
    export const MLS_SINGLE_RATE_1 = '0.01' as const;
    export const MLS_SINGLE_RATE_2 = '0.0125' as const;
    export const MLS_SINGLE_RATE_3 = '0.015' as const;

    // ── Small Business Income Tax Offset (IND-04) ─────────────────────────────
    export const SBI_OFFSET_RATE = '0.16' as const;
    export const SBI_OFFSET_CAP = '1000' as const;
    export const SBI_OFFSET_TURNOVER_THRESHOLD = '5000000' as const;
    ```
  </action>
  <verify>
    <automated>npx vitest run src/lib/migrations src/types.ts --reporter=verbose 2>&1 | head -100 && npx tsc --noEmit 2>&1 | head -50 && npm run lint 2>&1 | tail -20</automated>
  </verify>
  <done>
    - `CURRENT_VERSION === 4` test GREEN
    - All 3 `v3-to-v4` migration tests GREEN
    - `v0 to v4 round-trip` test GREEN
    - `tsc --noEmit` exits 0
    - `npm run lint` exits 0
    - All existing 371 SPA + 18 server tests stay GREEN (re-run `npm run test`)
    - `src/lib/tax/labels/fy2026.ts` exports all new constants + label catalogues; existing exports preserved
    - REQUIREMENTS.md shows COY-04 obsolete + IND-04 active (verified visually; not written by this task)
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: FY2026 rate helpers (marginal, LITO, Medicare, BRE, small-biz offset) + aggregatedTurnover helper — all GREEN immediately</name>
  <files>
    src/lib/tax/rates/fy2026/marginal.ts,
    src/lib/tax/rates/fy2026/lito.ts,
    src/lib/tax/rates/fy2026/medicare.ts,
    src/lib/tax/rates/fy2026/bre.ts,
    src/lib/tax/rates/fy2026/smallBizOffset.ts,
    src/lib/tax/rates/__tests__/marginal.test.ts,
    src/lib/tax/rates/__tests__/lito.test.ts,
    src/lib/tax/rates/__tests__/medicare.test.ts,
    src/lib/tax/rates/__tests__/bre.test.ts,
    src/lib/tax/rates/__tests__/smallBizOffset.test.ts,
    src/lib/tax/aggregatedTurnover.ts,
    src/lib/tax/__tests__/aggregatedTurnover.test.ts
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/lib/money.ts (Decimal global config — banker's rounding)
    - A:/Projects/AussieLedger/src/lib/tax/labels/fy2026.ts (Task 1 added FY2026_MARGINAL_BRACKETS, LITO_*, MEDICARE_*, MLS_*, BRE_*, SBI_OFFSET_* constants)
    - A:/Projects/AussieLedger/src/lib/period.ts (isInPeriod + fyBoundaries)
    - A:/Projects/AussieLedger/.planning/phases/05-tax-outputs/05-RESEARCH.md "Code Examples" section (verified rate-helper bodies + boundary tests)
    - A:/Projects/AussieLedger/.planning/phases/05-tax-outputs/05-CONTEXT.md "BRE" decision (conservative all-dividends-as-BREPI + 70-90% anomaly)
  </read_first>
  <behavior>
    - `marginal.ts` exports `marginalTaxFY2026(taxableIncome: Decimal): Decimal`. Reads `FY2026_MARGINAL_BRACKETS` from labels module. Returns to-the-cent tax using formula `tax = baseAt + rate × (income - bracketLower)`. Returns $0 for income ≤ $18,200.
    - `lito.ts` exports `litoFY2026(taxableIncome: Decimal): Decimal`. Two-stage taper:
        - ≤ $37,500 → $700
        - $37,501–$45,000 → $700 − (income − 37,500) × 0.05
        - $45,001–$66,667 → max(0, $325 − (income − 45,000) × 0.015)
        - > $66,667 → $0
    - `medicare.ts` exports three functions:
        - `medicareLevySingle(taxableIncome: Decimal): Decimal` — exact single-thresholds calc (lower $27,222 → no levy; shading 10c/$1 to $34,028; full 2% above)
        - `medicareLevySurcharge(taxableIncome: Decimal, hasPHC: boolean, filingStatus: 'single' | 'family'): Decimal` — 0% if PHC, else tier-based MLS
        - `medicareLevyFY2026(input: { taxableIncome: Decimal; hasPHC: boolean; filingStatus: 'single' | 'family' }): { levy: Decimal; surcharge: Decimal; basis: string; familyWarning?: string }` — orchestrator that returns flat 2% + family warning when filingStatus='family'
    - `bre.ts` exports:
        - `brePassiveIncomePct(accounts: Account[], entries: JournalEntry[], fy: FyLabel): { passivePct: Decimal; brepiTotal: Decimal; totalAssessable: Decimal; basis: string }` — sums Revenue accounts whose `companyTaxLabel` indicates passive income (`'6D'` interest, `'6E'` rent, `'6F'` interest-alias, `'6H'` dividends, plus any future passive labels). Divides by total assessable income.
        - `breRate(input: { passivePct: Decimal; aggregatedTurnover: Decimal; totalAssessable: Decimal }): { rate: Decimal; isBre: boolean; basis: string; anomaly?: Anomaly }` — returns 0.25 or 0.30 per BRE test; emits `{ severity: 'warn', message: 'BRE check: passive income X% borderline — if non-portfolio dividends (≥10% voting) present, result may shift per s.23AB' }` when passivePct in [0.70, 0.90].
        - `breTestFY2026(input)` — orchestrator alias for back-compat with research code pattern.
    - `smallBizOffset.ts` exports `smallBusinessIncomeOffset({ netSbIncome, aggregatedTurnover, totalTaxableIncome, taxBeforeOffsets }): { offset: Decimal; basis: string; anomaly?: Anomaly }`. Formula:
        - If `aggregatedTurnover ≥ $5,000,000` → return `{ offset: 0, basis: 'Not eligible: aggregated turnover ≥ $5M' }`
        - If `netSbIncome ≤ 0` → return `{ offset: 0, basis: 'Not eligible: no net small-business income' }`
        - Else: `taxOnSbPortion = taxBeforeOffsets × (netSbIncome / totalTaxableIncome)`. `offset = min(taxOnSbPortion × 0.16, $1,000)`. Return with basis text "16% × tax payable on SB income (\$X), capped at $1,000".
    - `aggregatedTurnover.ts` exports `computeAggregatedTurnover(entity: Entity, accounts: Account[], entries: JournalEntry[], fy: FyLabel): Decimal`. Filters entries to FY period via `isInPeriod(date, { type: 'fy', fy })`, sums credit-minus-debit on Revenue accounts. If `entity.aggregatedTurnover` is set (override), return that decimal; otherwise return the GL-derived sum.
    - All tests verify boundary cases per 05-VALIDATION.md per-task verification map.
  </behavior>
  <action>
    Step 1 — Create `src/lib/tax/rates/fy2026/marginal.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { Decimal } from '../../../money';
    import { FY2026_MARGINAL_BRACKETS } from '../../labels/fy2026';

    /**
     * Compute Australian-resident marginal tax for FY2025-26.
     * Source: ATO "Tax rates – Australian resident" 2025-26 (post-Stage-3, in force from 1 Jul 2024).
     * https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
     *
     * Formula: tax = baseAt + rate × (income - bracketLower)
     */
    export function marginalTaxFY2026(taxableIncome: Decimal): Decimal {
      if (taxableIncome.lessThanOrEqualTo(18200)) return new Decimal(0);
      const lowerBounds = [new Decimal(0), new Decimal('18200'), new Decimal('45000'), new Decimal('135000'), new Decimal('190000')];
      for (let i = 1; i < FY2026_MARGINAL_BRACKETS.length; i++) {
        const upTo = FY2026_MARGINAL_BRACKETS[i].upTo;
        const upToDec = upTo === 'Infinity' ? null : new Decimal(upTo);
        if (upToDec === null || taxableIncome.lessThanOrEqualTo(upToDec)) {
          const bracket = FY2026_MARGINAL_BRACKETS[i];
          return new Decimal(bracket.baseAt).plus(new Decimal(bracket.rate).times(taxableIncome.minus(lowerBounds[i]))).toDecimalPlaces(2);
        }
      }
      // Unreachable — top bracket has upTo='Infinity'
      throw new Error('marginalTaxFY2026: bracket lookup fell through');
    }
    ```

    Step 2 — Create `src/lib/tax/rates/__tests__/marginal.test.ts` with 5 boundary tests:
    ```typescript
    import { describe, it, expect } from 'vitest';
    import { Decimal } from '../../../money';
    import { marginalTaxFY2026 } from '../fy2026/marginal';

    describe('marginalTaxFY2026', () => {
      it('zero at 18200', () => {
        expect(marginalTaxFY2026(new Decimal('18200')).toString()).toBe('0');
      });
      it('4288 at 45000', () => {
        // (45000 - 18200) * 0.16 = 26800 * 0.16 = 4288
        expect(marginalTaxFY2026(new Decimal('45000')).toFixed(2)).toBe('4288.00');
      });
      it('31288 at 135000', () => {
        // 4288 + (135000 - 45000) * 0.30 = 4288 + 90000 * 0.30 = 4288 + 27000 = 31288
        expect(marginalTaxFY2026(new Decimal('135000')).toFixed(2)).toBe('31288.00');
      });
      it('51638 at 190000', () => {
        // 31288 + (190000 - 135000) * 0.37 = 31288 + 20350 = 51638
        expect(marginalTaxFY2026(new Decimal('190000')).toFixed(2)).toBe('51638.00');
      });
      it('45 percent above 190000 — $300,000 case', () => {
        // 51638 + (300000 - 190000) * 0.45 = 51638 + 49500 = 101138
        expect(marginalTaxFY2026(new Decimal('300000')).toFixed(2)).toBe('101138.00');
      });
    });
    ```

    Step 3 — Create `src/lib/tax/rates/fy2026/lito.ts`:
    ```typescript
    import { Decimal } from '../../../money';
    import {
      LITO_MAX, LITO_TAPER_1_FROM, LITO_TAPER_1_RATE,
      LITO_TAPER_2_FROM, LITO_TAPER_2_RATE, LITO_CUTOUT,
    } from '../../labels/fy2026';

    /**
     * Compute Low Income Tax Offset for FY2025-26.
     * Source: ATO "Low income tax offset"
     * https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset
     *
     * Two-stage taper:
     *   - income ≤ $37,500       → $700
     *   - $37,501 – $45,000      → $700 − (income − 37,500) × 0.05
     *   - $45,001 – $66,667      → max(0, $325 − (income − 45,000) × 0.015)
     *   - > $66,667              → $0
     */
    export function litoFY2026(taxableIncome: Decimal): Decimal {
      const max = new Decimal(LITO_MAX);
      const taper1From = new Decimal(LITO_TAPER_1_FROM);
      const taper2From = new Decimal(LITO_TAPER_2_FROM);
      const cutout = new Decimal(LITO_CUTOUT);

      if (taxableIncome.lessThanOrEqualTo(taper1From)) return max;
      if (taxableIncome.lessThanOrEqualTo(taper2From)) {
        return max.minus(taxableIncome.minus(taper1From).times(LITO_TAPER_1_RATE)).toDecimalPlaces(2);
      }
      if (taxableIncome.lessThanOrEqualTo(cutout)) {
        // At taper2From, residual = max - (taper2From - taper1From) × taper1Rate = 700 - 7500*0.05 = 325
        const residual = max.minus(taper2From.minus(taper1From).times(LITO_TAPER_1_RATE));
        return Decimal.max(0, residual.minus(taxableIncome.minus(taper2From).times(LITO_TAPER_2_RATE))).toDecimalPlaces(2);
      }
      return new Decimal(0);
    }
    ```

    Step 4 — Create `src/lib/tax/rates/__tests__/lito.test.ts` with 4 boundary tests:
    ```typescript
    import { describe, it, expect } from 'vitest';
    import { Decimal } from '../../../money';
    import { litoFY2026 } from '../fy2026/lito';

    describe('litoFY2026', () => {
      it('700 at 37500', () => {
        expect(litoFY2026(new Decimal('37500')).toFixed(2)).toBe('700.00');
      });
      it('325 at 45000 — stage 1 to stage 2 transition', () => {
        // 700 - (45000-37500)*0.05 = 700 - 375 = 325
        expect(litoFY2026(new Decimal('45000')).toFixed(2)).toBe('325.00');
      });
      it('zero at 66667 — cutout', () => {
        // 325 - (66667-45000)*0.015 = 325 - 325 = 0 (within rounding)
        const v = litoFY2026(new Decimal('66667'));
        expect(Number(v.toFixed(2))).toBeCloseTo(0, 2);
      });
      it('stage 2 mid range 50000', () => {
        // 325 - (50000-45000)*0.015 = 325 - 75 = 250
        expect(litoFY2026(new Decimal('50000')).toFixed(2)).toBe('250.00');
      });
      it('zero above 66667', () => {
        expect(litoFY2026(new Decimal('100000')).toString()).toBe('0');
      });
    });
    ```

    Step 5 — Create `src/lib/tax/rates/fy2026/medicare.ts`:
    ```typescript
    import { Decimal } from '../../../money';
    import {
      MEDICARE_LEVY_RATE, MEDICARE_LEVY_SINGLE_LOWER, MEDICARE_LEVY_SINGLE_UPPER,
      MEDICARE_LEVY_SINGLE_SHADING_RATE,
      MLS_SINGLE_TIER_1, MLS_SINGLE_TIER_2, MLS_SINGLE_TIER_3,
      MLS_SINGLE_RATE_1, MLS_SINGLE_RATE_2, MLS_SINGLE_RATE_3,
    } from '../../labels/fy2026';

    export function medicareLevySingle(taxableIncome: Decimal): Decimal {
      const lower = new Decimal(MEDICARE_LEVY_SINGLE_LOWER);
      const upper = new Decimal(MEDICARE_LEVY_SINGLE_UPPER);
      if (taxableIncome.lessThanOrEqualTo(lower)) return new Decimal(0);
      if (taxableIncome.lessThan(upper)) {
        // Shade in 10c per $1 above lower, capped at 2% of income
        return Decimal.min(
          taxableIncome.minus(lower).times(MEDICARE_LEVY_SINGLE_SHADING_RATE),
          taxableIncome.times(MEDICARE_LEVY_RATE),
        ).toDecimalPlaces(2);
      }
      return taxableIncome.times(MEDICARE_LEVY_RATE).toDecimalPlaces(2);
    }

    export function medicareLevySurcharge(
      taxableIncome: Decimal,
      hasPHC: boolean,
      filingStatus: 'single' | 'family' = 'single',
    ): Decimal {
      if (hasPHC) return new Decimal(0);
      if (filingStatus !== 'single') {
        // Family thresholds deferred; Phase 5 returns 0 for family + warning emitted by orchestrator
        return new Decimal(0);
      }
      const t1 = new Decimal(MLS_SINGLE_TIER_1);
      const t2 = new Decimal(MLS_SINGLE_TIER_2);
      const t3 = new Decimal(MLS_SINGLE_TIER_3);
      let rate = new Decimal(0);
      if (taxableIncome.greaterThan(t3)) rate = new Decimal(MLS_SINGLE_RATE_3);
      else if (taxableIncome.greaterThan(t2)) rate = new Decimal(MLS_SINGLE_RATE_2);
      else if (taxableIncome.greaterThan(t1)) rate = new Decimal(MLS_SINGLE_RATE_1);
      return taxableIncome.times(rate).toDecimalPlaces(2);
    }

    export interface MedicareLevyInput {
      taxableIncome: Decimal;
      hasPHC: boolean;
      filingStatus: 'single' | 'family';
    }

    export function medicareLevyFY2026(input: MedicareLevyInput): {
      levy: Decimal; surcharge: Decimal; basis: string; familyWarning?: string;
    } {
      const { taxableIncome, hasPHC, filingStatus } = input;
      let levy: Decimal;
      let familyWarning: string | undefined;
      if (filingStatus === 'family') {
        // Phase 5 baseline: flat 2% for families + visible warning (CONTEXT decision)
        levy = taxableIncome.times(MEDICARE_LEVY_RATE).toDecimalPlaces(2);
        familyWarning = 'Medicare levy family thresholds not yet supported — flat 2% applied; manual review required.';
      } else {
        levy = medicareLevySingle(taxableIncome);
      }
      const surcharge = medicareLevySurcharge(taxableIncome, hasPHC, filingStatus);
      let basis = `Levy ${(Number(MEDICARE_LEVY_RATE) * 100).toFixed(2)}% applied`;
      if (surcharge.greaterThan(0)) {
        basis += ` + MLS (no private hospital cover)`;
      }
      return { levy, surcharge, basis, familyWarning };
    }
    ```

    Step 6 — Create `src/lib/tax/rates/__tests__/medicare.test.ts` (8 tests covering single zero-below, full-2%-above, shading, MLS tier boundaries, PHC=true zero, family fallback flat-2%).

    Step 7 — Create `src/lib/tax/rates/fy2026/bre.ts`:
    ```typescript
    import { Decimal } from '../../../money';
    import { BRE_PASSIVE_THRESHOLD, BRE_TURNOVER_THRESHOLD, COMPANY_TAX_RATE_BASE, COMPANY_TAX_RATE_FULL } from '../../labels/fy2026';
    import { isInPeriod, fyBoundaries, type FyLabel } from '../../../period';
    import type { Account, JournalEntry } from '../../../../types';
    import type { Anomaly } from '../../returns/fy2026/types';

    /** Company tax labels that classify as passive (BREPI). Conservative — includes all dividends. */
    const PASSIVE_COMPANY_LABELS = new Set(['6D', '6E', '6F', '6H']);
    //   '6D' Gross interest
    //   '6E' Gross rent & other leasing
    //   '6F' Gross interest (alias from Phase 2)
    //   '6H' Dividends — conservative all-dividends-as-BREPI per CONTEXT (s.23AB exception NOT modelled)

    export function brePassiveIncomePct(
      accounts: Account[],
      entries: JournalEntry[],
      fy: FyLabel,
    ): { passivePct: Decimal; brepiTotal: Decimal; totalAssessable: Decimal; basis: string } {
      const period = { type: 'fy', fy } as const;
      let brepiTotal = new Decimal(0);
      let totalAssessable = new Decimal(0);
      for (const entry of entries) {
        if (entry.status === 'superseded' || entry.status === 'voided' || entry.status === 'draft') continue;
        if (entry.replacedByEntryId) continue;
        if (!isInPeriod(new Date(entry.date), period)) continue;
        for (const line of entry.lines) {
          const acc = accounts.find((a) => a.id === line.accountId);
          if (!acc || acc.type !== 'Revenue') continue;
          const amount = new Decimal(line.credit || 0).minus(line.debit || 0);
          if (amount.lessThanOrEqualTo(0)) continue;
          totalAssessable = totalAssessable.plus(amount);
          if (acc.companyTaxLabel && PASSIVE_COMPANY_LABELS.has(acc.companyTaxLabel)) {
            brepiTotal = brepiTotal.plus(amount);
          }
        }
      }
      const passivePct = totalAssessable.greaterThan(0)
        ? brepiTotal.dividedBy(totalAssessable).toDecimalPlaces(4)
        : new Decimal(0);
      const basis = `Passive income ${passivePct.times(100).toFixed(2)}% of total assessable income (${totalAssessable.toFixed(2)})`;
      return { passivePct, brepiTotal, totalAssessable, basis };
    }

    export interface BreRateInput {
      passivePct: Decimal;
      aggregatedTurnover: Decimal;
      totalAssessable: Decimal;
    }

    export function breRate(input: BreRateInput): { rate: Decimal; isBre: boolean; basis: string; anomaly?: Anomaly } {
      const passiveThreshold = new Decimal(BRE_PASSIVE_THRESHOLD);
      const turnoverThreshold = new Decimal(BRE_TURNOVER_THRESHOLD);
      const rateBre = new Decimal(COMPANY_TAX_RATE_BASE);
      const rateFull = new Decimal(COMPANY_TAX_RATE_FULL);

      let anomaly: Anomaly | undefined;
      // 70-90% borderline anomaly (Wave 0 lands the band per CONTEXT decision)
      if (input.passivePct.greaterThanOrEqualTo('0.70') && input.passivePct.lessThanOrEqualTo('0.90')) {
        anomaly = {
          id: 'bre-borderline',
          severity: 'warn',
          message: `BRE check: passive income ${input.passivePct.times(100).toFixed(2)}% borderline. If non-portfolio dividends (≥10% voting) present, the s.23AB exception may apply — review with your tax agent.`,
        };
      }

      if (input.totalAssessable.lessThanOrEqualTo(0)) {
        return { rate: rateBre, isBre: true, basis: `25% applied — no assessable income (BRE default)`, anomaly };
      }
      if (input.aggregatedTurnover.greaterThanOrEqualTo(turnoverThreshold)) {
        return { rate: rateFull, isBre: false, basis: `30% applied — aggregated turnover ≥ $50M`, anomaly };
      }
      if (input.passivePct.greaterThan(passiveThreshold)) {
        return {
          rate: rateFull,
          isBre: false,
          basis: `30% applied — passive income ${input.passivePct.times(100).toFixed(2)}% exceeds 80% BREPI threshold (s.23AB)`,
          anomaly,
        };
      }
      return {
        rate: rateBre,
        isBre: true,
        basis: `25% applied — passive income ${input.passivePct.times(100).toFixed(2)}% ≤ 80% BREPI threshold; aggregated turnover < $50M`,
        anomaly,
      };
    }

    export const breTestFY2026 = breRate;  // back-compat alias for RESEARCH.md naming
    ```

    Step 8 — Create `src/lib/tax/rates/__tests__/bre.test.ts` with:
    - `90 percent dividend triggers 30 percent` (success criterion #2)
    - `10 percent dividend stays at 25 percent`
    - `50M turnover forces 30 percent`
    - `passive 70 to 90 band emits anomaly`
    - `BREPI sums all passive labels` (interest + dividend + rent line aggregation)

    Step 9 — Create `src/lib/tax/rates/fy2026/smallBizOffset.ts`:
    ```typescript
    import { Decimal } from '../../../money';
    import { SBI_OFFSET_RATE, SBI_OFFSET_CAP, SBI_OFFSET_TURNOVER_THRESHOLD } from '../../labels/fy2026';
    import type { Anomaly } from '../../returns/fy2026/types';

    export interface SmallBizOffsetInput {
      netSbIncome: Decimal;
      aggregatedTurnover: Decimal;
      totalTaxableIncome: Decimal;   // for the apportionment
      taxBeforeOffsets: Decimal;     // marginal tax before LITO + this offset
    }

    /**
     * Small Business Income Tax Offset (item 7D on Form I — IND-04).
     * Source: ITAA 1997 Subdiv 328-F.
     * 16% × (tax payable × SB-share of total taxable income), capped at $1,000.
     * Eligible if entity (sole trader) has aggregated turnover < $5M.
     */
    export function smallBusinessIncomeOffset(input: SmallBizOffsetInput): {
      offset: Decimal; basis: string; anomaly?: Anomaly;
    } {
      const cap = new Decimal(SBI_OFFSET_CAP);
      const rate = new Decimal(SBI_OFFSET_RATE);
      const turnoverThreshold = new Decimal(SBI_OFFSET_TURNOVER_THRESHOLD);

      if (input.aggregatedTurnover.greaterThanOrEqualTo(turnoverThreshold)) {
        return { offset: new Decimal(0), basis: `Not eligible: aggregated turnover ≥ $5M` };
      }
      if (input.netSbIncome.lessThanOrEqualTo(0)) {
        return { offset: new Decimal(0), basis: `Not eligible: no net small-business income` };
      }
      if (input.totalTaxableIncome.lessThanOrEqualTo(0)) {
        return { offset: new Decimal(0), basis: `Not eligible: no taxable income` };
      }
      // Apportion tax payable to SB share of income
      const sbShare = input.netSbIncome.dividedBy(input.totalTaxableIncome);
      const taxOnSb = input.taxBeforeOffsets.times(sbShare);
      const raw = taxOnSb.times(rate);
      const offset = Decimal.min(raw, cap).toDecimalPlaces(2);
      const basis = `16% × tax payable on SB income ($${taxOnSb.toFixed(2)}) = $${raw.toFixed(2)}${raw.greaterThan(cap) ? ` (capped at $1,000)` : ''}`;
      return { offset, basis };
    }
    ```

    Step 10 — Create `src/lib/tax/rates/__tests__/smallBizOffset.test.ts` with:
    - `caps at 1000`
    - `16 percent of tax on SB income`
    - `zero when turnover at or above 5M`
    - `zero when SB income non-positive`

    Step 11 — Create `src/lib/tax/aggregatedTurnover.ts`:
    ```typescript
    import { Decimal } from '../money';
    import { isInPeriod, type FyLabel } from '../period';
    import type { Account, Entity, JournalEntry } from '../../types';

    /**
     * Compute aggregated turnover from journal entries in the FY period.
     * If entity.aggregatedTurnover is set (override), return that value.
     * Otherwise sum credit-minus-debit on Revenue accounts.
     */
    export function computeAggregatedTurnover(
      entity: Entity,
      accounts: Account[],
      entries: JournalEntry[],
      fy: FyLabel,
    ): Decimal {
      if (entity.aggregatedTurnover !== undefined && entity.aggregatedTurnover !== '') {
        return new Decimal(entity.aggregatedTurnover);
      }
      let total = new Decimal(0);
      const period = { type: 'fy', fy } as const;
      for (const entry of entries) {
        if (entry.status === 'superseded' || entry.status === 'voided' || entry.status === 'draft') continue;
        if (entry.replacedByEntryId) continue;
        if (!isInPeriod(new Date(entry.date), period)) continue;
        for (const line of entry.lines) {
          const acc = accounts.find((a) => a.id === line.accountId);
          if (!acc || acc.type !== 'Revenue') continue;
          const amount = new Decimal(line.credit || 0).minus(line.debit || 0);
          total = total.plus(amount);
        }
      }
      return total.toDecimalPlaces(2);
    }
    ```

    Step 12 — Create `src/lib/tax/__tests__/aggregatedTurnover.test.ts` verifying:
    - Sums Revenue credits in FY period
    - Excludes superseded/voided/draft entries
    - Filters out non-Revenue accounts
    - Returns override when entity.aggregatedTurnover is set
    - Returns 0 for entity with no Revenue entries
  </action>
  <verify>
    <automated>npx vitest run src/lib/tax/rates src/lib/tax/__tests__/aggregatedTurnover.test.ts --reporter=verbose 2>&1 | tail -80</automated>
  </verify>
  <done>
    - All marginal/lito/medicare/bre/smallBizOffset/aggregatedTurnover tests GREEN (≥ 22 new GREEN tests)
    - `breRate({ passivePct: 0.90, aggregatedTurnover: 1000000, totalAssessable: 500000 }).rate.toString() === '0.3'` — locks success criterion #2 at helper layer
    - `marginalTaxFY2026(190000) === 51638.00` to-the-cent
    - `litoFY2026(45000) === 325.00` to-the-cent
    - `tsc --noEmit` exits 0
    - `npm run lint` exits 0
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Shared types + rollup helper + 6 compute*Return module skeletons + golden-test fixtures (RED for 05-2/05-3/05-4)</name>
  <files>
    src/lib/tax/returns/fy2026/types.ts,
    src/lib/tax/returns/fy2026/_helpers.ts,
    src/lib/tax/returns/fy2026/individual.ts,
    src/lib/tax/returns/fy2026/company.ts,
    src/lib/tax/returns/fy2026/trust.ts,
    src/lib/tax/returns/fy2026/partnership.ts,
    src/lib/tax/returns/fy2026/bas.ts,
    src/lib/tax/returns/fy2026/ias.ts,
    src/lib/tax/returns/fy2026/__tests__/individual.test.ts,
    src/lib/tax/returns/fy2026/__tests__/company.test.ts,
    src/lib/tax/returns/fy2026/__tests__/trust.test.ts,
    src/lib/tax/returns/fy2026/__tests__/partnership.test.ts,
    src/lib/tax/returns/fy2026/__tests__/bas.test.ts,
    src/lib/tax/returns/fy2026/__tests__/ias.test.ts
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/lib/tax/types.ts (Phase 2 types — IndividualReturn / CompanyReturn etc; preserved for back-compat)
    - A:/Projects/AussieLedger/src/lib/tax/individual.ts (Phase 2 computeIndividual stub — for back-compat preservation)
    - A:/Projects/AussieLedger/src/lib/tax/bas.ts (Phase 2 computeBas stub — same)
    - A:/Projects/AussieLedger/.planning/phases/05-tax-outputs/05-RESEARCH.md "ATO Field Codes" section (full label sets for each form)
    - A:/Projects/AussieLedger/.planning/phases/05-tax-outputs/05-CONTEXT.md "Golden tests" notes in validation_targets
  </read_first>
  <behavior>
    - `types.ts` exports the shared types listed in interfaces above plus the per-form label-set interfaces:
        - `IndividualReturnLabels` — mapping each `IndividualLabel` code to `ReturnLabel`
        - `CompanyReturnLabels`, `TrustReturnLabels`, `PartnershipReturnLabels`, `BasReturnLabels`, `IasReturnLabels`
    - `_helpers.ts` exports:
        - `filterPostedEntries(entries: JournalEntry[]): JournalEntry[]` — excludes status in {superseded, voided, draft} OR replacedByEntryId set
        - `rollupByLabel<LabelKey extends string>(entries, accounts, labelField)` — pure helper that walks lines, maps to labels, aggregates with polarity (Revenue: credit-debit, Expense: debit-credit, Asset/Liability/Equity: balance-direction-aware)
    - All 6 compute*Return modules export the function signature with an empty body that returns a typed-empty `ComputedReturn<…>` (so consumers compile but golden tests RED). Each module's body has a `// TODO Phase 5 Plan 05-X` comment naming which downstream plan implements it.
    - Each `__tests__/X.test.ts` enumerates the RED tests per 05-VALIDATION.md per-task verification map. Tests use Decimal-aware assertions (`.toFixed(2) === '…'`) and call the compute*Return function expecting it to currently return zeros/empty maps; the assertions describe what the function MUST return after implementation. Tests are flagged `.todo` for now where the function body is empty, or `.skip` if you prefer (decision per Plan 04-1 precedent: `.todo` placeholders so Plans 05-2/05-3/05-4 see them in the runner).
  </behavior>
  <action>
    Step 1 — Create `src/lib/tax/returns/fy2026/types.ts` with the shared types. Use the interfaces block content above; expand per-form label maps to mirror the `IndividualLabel`, `CompanyLabel`, `TrustLabel`, `PartnershipLabel`, `BasLabel` types from labels/fy2026.ts.

    Step 2 — Create `src/lib/tax/returns/fy2026/_helpers.ts`:
    ```typescript
    import { Decimal } from '../../../money';
    import type { Account, JournalEntry } from '../../../../types';

    export function filterPostedEntries(entries: JournalEntry[]): JournalEntry[] {
      return entries.filter((e) => {
        if (e.status === 'superseded' || e.status === 'voided' || e.status === 'draft') return false;
        if (e.replacedByEntryId) return false;
        return true;
      });
    }

    /**
     * Roll up posted entries by tax label, applying account-type polarity.
     *   Revenue:   credit - debit (credit-positive)
     *   Expense:   debit - credit (debit-positive)
     *   Asset:     debit - credit (debit-positive)
     *   Liability: credit - debit (credit-positive)
     *   Equity:    credit - debit
     */
    export function rollupByLabel<LabelKey extends string>(
      entries: JournalEntry[],
      accounts: Account[],
      labelField: 'taxLabel' | 'companyTaxLabel' | 'trustTaxLabel' | 'partnershipTaxLabel',
    ): Record<LabelKey, Decimal> {
      const totals: Record<string, Decimal> = {};
      const posted = filterPostedEntries(entries);
      for (const entry of posted) {
        for (const line of entry.lines) {
          const account = accounts.find((a) => a.id === line.accountId);
          if (!account) continue;
          const label = (account as unknown as Record<string, string | undefined>)[labelField];
          if (!label) continue;
          const credit = new Decimal(line.credit || 0);
          const debit = new Decimal(line.debit || 0);
          const amount =
            account.type === 'Revenue' || account.type === 'Liability' || account.type === 'Equity'
              ? credit.minus(debit)
              : debit.minus(credit);
          totals[label] = (totals[label] ?? new Decimal(0)).plus(amount);
        }
      }
      return totals as Record<LabelKey, Decimal>;
    }
    ```

    Step 3 — Create `src/lib/tax/returns/fy2026/individual.ts`:
    ```typescript
    import { Decimal } from '../../../money';
    import type { Account, Entity, JournalEntry } from '../../../../types';
    import type { FyLabel } from '../../../period';
    import type { ComputedReturn, IndividualReturnLabels } from './types';

    export type IndividualReturn = ComputedReturn<IndividualReturnLabels>;

    export interface ComputeIndividualInput {
      entity: Entity;
      accounts: Account[];
      entries: JournalEntry[];
      fy: FyLabel;
    }

    /**
     * Compute Individual tax return (NAT 2541 + NAT 2543 B&P schedule).
     *
     * Phase 5 Wave 0: signature only — empty body. Plan 05-2 implements
     * full Form I + B&P rollup + LITO + Medicare + IND-04 small-biz offset.
     *
     * Behaviour (post-05-2):
     *  - Roll up Revenue + Expense accounts by taxLabel into P1/P2/P8 + B&P sub-labels
     *  - item15 = P8 (flow-through)
     *  - Compute marginalTaxFY2026(item15) → CS_A
     *  - Apply litoFY2026 → T1
     *  - Apply medicareLevyFY2026 → M1 + M2
     *  - Apply smallBusinessIncomeOffset if eligible → item7D
     *  - Emit "Assumptions used" anomaly (info severity) listing 5 assumed values
     *  - Emit "LOCKED FY" anomaly (info) if entity.lockedFys includes fy
     */
    export function computeIndividualReturn(_input: ComputeIndividualInput): IndividualReturn {
      // TODO Phase 5 Plan 05-2: implement full Form I + B&P logic
      return {
        labels: {} as IndividualReturnLabels,
        meta: {
          fy: _input.fy,
          entityType: 'Individual',
          natReference: 'NAT 2541 + NAT 2543',
          locked: (_input.entity.lockedFys ?? []).includes(_input.fy),
          anomalies: [],
        },
      };
    }
    ```

    Step 4 — Create the analogous skeletons for `company.ts`, `trust.ts`, `partnership.ts`, `bas.ts`, `ias.ts` with the same shape — signature only + empty body + TODO comment naming the implementing plan. For `trust.ts` ALSO export a `distributeTrustIncome` skeleton function signature (Plan 05-3 implements; 05-1 ships the signature so types compile).

    Step 5 — Create `src/lib/tax/returns/fy2026/__tests__/individual.test.ts` with 5 RED tests (using `it.todo` for now so they don't crash; Plan 05-2 will replace `it.todo` with `it` body):
    ```typescript
    import { describe, it, expect } from 'vitest';
    import { Decimal } from '../../../../money';
    import { computeIndividualReturn } from '../individual';
    import type { Account, Entity, JournalEntry } from '../../../../../types';

    describe('computeIndividualReturn', () => {
      it.todo('P1 P2 P8 from GL — sole trader $50k revenue + $20k expenses → P1=50000, P2=20000, P8=30000');
      it.todo('item 15 equals P8 — flow-through');
      it.todo('LITO and Medicare applied — $30k taxable income → marginal $1888 + LITO $700 cap + Medicare 0');
      it.todo('small business offset eligible — $4M turnover + $30k SB income → offset > 0 capped at $1,000');
      it.todo('assumptions in meta — 5 assumed values present');
    });
    ```

    Step 6 — Same pattern for `company.test.ts` (5 RED + COY-03 franking test), `trust.test.ts` (6 RED), `partnership.test.ts` (3 RED), `bas.test.ts` (8 RED), `ias.test.ts` (2 RED). Each test file uses `it.todo` placeholders so they appear in the runner's `.todo` summary but don't fail — Plans 05-2/05-3/05-4 flip them to real `it` bodies.

    Step 7 — Add a Wave-0-GREEN sanity test in `_helpers.ts` test (NOT in the per-form RED files): create `src/lib/tax/returns/fy2026/__tests__/helpers.test.ts` with 4 tests — `filterPostedEntries excludes superseded`, `filterPostedEntries excludes voided`, `filterPostedEntries excludes draft`, `rollupByLabel applies Revenue polarity correctly`. These ship GREEN.
  </action>
  <verify>
    <automated>npx vitest run src/lib/tax/returns --reporter=verbose 2>&1 | tail -40 && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>
    - All 4 `_helpers.test.ts` cases GREEN
    - All 6 form-level test files RED-by-design (it.todo entries in runner output)
    - `tsc --noEmit` exits 0 — every compute*Return signature compiles + every test imports without type error
    - `npm run lint` exits 0
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Shared print primitives — PrintBanner + AnomalyBadge + AssumptionsBlock + print.css — all GREEN immediately</name>
  <files>
    src/components/PrintBanner.tsx,
    src/components/AnomalyBadge.tsx,
    src/components/AssumptionsBlock.tsx,
    src/components/__tests__/PrintBanner.test.tsx,
    src/components/__tests__/AnomalyBadge.test.tsx,
    src/components/__tests__/AssumptionsBlock.test.tsx,
    src/styles/print.css,
    src/styles/__tests__/print-css.test.ts,
    src/index.css
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/components/DisclaimerFooter.tsx (canonical disclaimer text)
    - A:/Projects/AussieLedger/src/index.css (top-level Tailwind imports — where print.css will be @import-ed)
    - A:/Projects/AussieLedger/.planning/phases/05-tax-outputs/05-CONTEXT.md "Print-mode UX" section (banner copy + footer text locked)
    - A:/Projects/AussieLedger/.planning/phases/05-tax-outputs/05-RESEARCH.md "Pattern 3: Print-CSS persistent disclaimer" (canonical @media print rules)
  </read_first>
  <behavior>
    - `PrintBanner.tsx`:
        - Props: `{ form: 'I' | 'C' | 'T' | 'P' | 'BAS' | 'IAS'; entityName: string; fy: string; locked?: boolean }`
        - Renders a `.print-only` block (display:none on screen, block on print) containing:
            - Page-1 banner with the full disclaimer text: "AUSSIELEDGER WORKING PAPER. Not tax advice. Produced by self-hosted open-source software. Verify all figures against ATO instructions and your trust deed / company constitution before lodging. The lodging entity retains all responsibility."
            - Entity name + form code (e.g. "Form I — Individual Tax Return (NAT 2541)") + FY label
            - "LOCKED FY" red tag inline when `locked === true`
        - The footer disclaimer ("AussieLedger working paper — not tax advice — verify before lodgement.") is provided by CSS `position: running()` rules in print.css, NOT by this component (CSS-only because running() applies on every page).
    - `AnomalyBadge.tsx`:
        - Props: `{ severity: 'info' | 'warn'; message: string; label?: string }`
        - Renders an inline yellow-background (warn) or blue-background (info) badge with the message; if `label` provided, prefixes with `[Label X] `.
        - Uses Tailwind classes that work in both screen and print modes.
    - `AssumptionsBlock.tsx`:
        - Props: `{}`  (no inputs — Phase 5 v1 ships fixed 5-line block per CONTEXT decision)
        - Renders a boxed section with 5 fixed lines:
            - "Marital status: single (no spouse income captured)"
            - "Age: under 65 (no Seniors and Pensioners Tax Offset applied)"
            - "Medicare exemption: none (full 2% levy applied unless shading applies)"
            - "Private health cover: assumed (no Medicare Levy Surcharge applied)"
            - "Dependants: zero"
        - Header: "Assumptions used by this working paper"
        - Footer caveat: "Phase 6 wizard will capture real values."
    - `print.css`:
        - Imported in `src/index.css` via `@import './styles/print.css';`
        - Defines:
            - `@media print { @page { size: A4 portrait; margin: 15mm 12mm 25mm 12mm; } }`
            - `@media print { .no-print { display: none !important; } }`
            - `@media print { .print-only { display: block !important; } }`
            - `@media screen { .print-only { display: none; } }`
            - `.print-form-i, .print-form-c, .print-form-t, .print-form-p, .print-form-bas { page-break-inside: avoid; }`
            - Footer running rule: `.print-footer { position: fixed; bottom: 0; left: 0; right: 0; font-size: 8pt; border-top: 1pt solid #999; padding: 4pt 8pt; color: #555; }` (rendered by each form's print container)
            - `body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }` inside `@media print`
    - `print-css.test.ts`:
        - Reads the file contents via `fs.readFileSync` (Vitest jsdom mode supports this via node:fs in test environment)
        - Asserts: contains `@media print`, contains `.no-print`, contains `.print-only`, contains `page-break-inside`, contains `.print-form-i`
  </behavior>
  <action>
    Step 1 — Create `src/components/PrintBanner.tsx`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import React from 'react';

    export const FULL_PRINT_DISCLAIMER = 'AUSSIELEDGER WORKING PAPER. Not tax advice. Produced by self-hosted open-source software. Verify all figures against ATO instructions and your trust deed / company constitution before lodging. The lodging entity retains all responsibility.';

    export const FOOTER_DISCLAIMER = 'AussieLedger working paper — not tax advice — verify before lodgement.';

    const FORM_NAT_MAP: Record<string, string> = {
      'I':   'Form I — Individual Tax Return (NAT 2541)',
      'C':   'Form C — Company Tax Return (NAT 0656)',
      'T':   'Form T — Trust Tax Return (NAT 0660)',
      'P':   'Form P — Partnership Tax Return (NAT 0659)',
      'BAS': 'Business Activity Statement (Simpler BAS)',
      'IAS': 'Instalment Activity Statement',
    };

    interface PrintBannerProps {
      form: 'I' | 'C' | 'T' | 'P' | 'BAS' | 'IAS';
      entityName: string;
      fy: string;
      locked?: boolean;
    }

    export function PrintBanner({ form, entityName, fy, locked = false }: PrintBannerProps): React.JSX.Element {
      return (
        <div className="print-only print-banner" data-testid="print-banner">
          <div className="print-banner-title">
            <strong>{FORM_NAT_MAP[form]}</strong>
            {locked && <span className="print-banner-locked-tag"> [LOCKED FY]</span>}
          </div>
          <div className="print-banner-meta">
            <span>{entityName}</span>
            <span> · {fy}</span>
          </div>
          <p className="print-banner-disclaimer">{FULL_PRINT_DISCLAIMER}</p>
        </div>
      );
    }
    ```

    Step 2 — Create `src/components/__tests__/PrintBanner.test.tsx`:
    ```typescript
    import { describe, it, expect } from 'vitest';
    import { render, screen } from '@testing-library/react';
    import { PrintBanner, FULL_PRINT_DISCLAIMER } from '../PrintBanner';

    describe('PrintBanner', () => {
      it('renders banner title and disclaimer', () => {
        render(<PrintBanner form="I" entityName="Acme Sole Trader" fy="FY2026" />);
        expect(screen.getByText(/Form I — Individual Tax Return \(NAT 2541\)/)).toBeInTheDocument();
        expect(screen.getByText('Acme Sole Trader')).toBeInTheDocument();
        expect(screen.getByText(FULL_PRINT_DISCLAIMER)).toBeInTheDocument();
      });
      it('shows LOCKED FY tag when locked prop true', () => {
        render(<PrintBanner form="C" entityName="Pty Ltd" fy="FY2026" locked />);
        expect(screen.getByText(/\[LOCKED FY\]/)).toBeInTheDocument();
      });
      it('does not show LOCKED FY tag when locked is false', () => {
        render(<PrintBanner form="C" entityName="Pty Ltd" fy="FY2026" locked={false} />);
        expect(screen.queryByText(/\[LOCKED FY\]/)).toBeNull();
      });
      it('uses correct NAT label per form code', () => {
        const { rerender } = render(<PrintBanner form="T" entityName="The Trust" fy="FY2026" />);
        expect(screen.getByText(/NAT 0660/)).toBeInTheDocument();
        rerender(<PrintBanner form="P" entityName="The Partnership" fy="FY2026" />);
        expect(screen.getByText(/NAT 0659/)).toBeInTheDocument();
        rerender(<PrintBanner form="BAS" entityName="X" fy="FY2026" />);
        expect(screen.getByText(/Business Activity Statement/)).toBeInTheDocument();
      });
    });
    ```

    Step 3 — Create `src/components/AnomalyBadge.tsx`:
    ```typescript
    import React from 'react';
    import type { Anomaly } from '../lib/tax/returns/fy2026/types';

    interface AnomalyBadgeProps {
      severity: Anomaly['severity'];
      message: string;
      label?: string;
    }

    export function AnomalyBadge({ severity, message, label }: AnomalyBadgeProps): React.JSX.Element {
      const baseClass = severity === 'warn'
        ? 'inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300'
        : 'inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300';
      return (
        <span className={baseClass} data-testid="anomaly-badge" data-severity={severity}>
          {label ? <span className="font-bold mr-1">[{label}]</span> : null}
          {message}
        </span>
      );
    }
    ```

    Step 4 — Create `src/components/__tests__/AnomalyBadge.test.tsx`:
    ```typescript
    import { describe, it, expect } from 'vitest';
    import { render, screen } from '@testing-library/react';
    import { AnomalyBadge } from '../AnomalyBadge';

    describe('AnomalyBadge', () => {
      it('renders info and warn variants', () => {
        const { rerender } = render(<AnomalyBadge severity="info" message="Info msg" />);
        expect(screen.getByTestId('anomaly-badge')).toHaveAttribute('data-severity', 'info');
        rerender(<AnomalyBadge severity="warn" message="Warn msg" />);
        expect(screen.getByTestId('anomaly-badge')).toHaveAttribute('data-severity', 'warn');
      });
      it('prefixes label when provided', () => {
        render(<AnomalyBadge severity="warn" message="passive 90%" label="6F" />);
        expect(screen.getByText('[6F]')).toBeInTheDocument();
        expect(screen.getByText(/passive 90%/)).toBeInTheDocument();
      });
    });
    ```

    Step 5 — Create `src/components/AssumptionsBlock.tsx`:
    ```typescript
    import React from 'react';

    export const ASSUMPTIONS: readonly string[] = [
      'Marital status: single (no spouse income captured)',
      'Age: under 65 (no Seniors and Pensioners Tax Offset applied)',
      'Medicare exemption: none (full 2% levy applied unless shading applies)',
      'Private health cover: assumed (no Medicare Levy Surcharge applied)',
      'Dependants: zero',
    ];

    export function AssumptionsBlock(): React.JSX.Element {
      return (
        <section className="border border-gray-400 rounded p-4 my-4" data-testid="assumptions-block">
          <h3 className="text-sm font-bold mb-2">Assumptions used by this working paper</h3>
          <ul className="text-xs text-gray-700 space-y-1">
            {ASSUMPTIONS.map((a, i) => <li key={i}>· {a}</li>)}
          </ul>
          <p className="text-xs text-gray-500 mt-2 italic">Phase 6 wizard will capture real values.</p>
        </section>
      );
    }
    ```

    Step 6 — Create `src/components/__tests__/AssumptionsBlock.test.tsx`:
    ```typescript
    import { describe, it, expect } from 'vitest';
    import { render, screen } from '@testing-library/react';
    import { AssumptionsBlock, ASSUMPTIONS } from '../AssumptionsBlock';

    describe('AssumptionsBlock', () => {
      it('renders five assumption lines', () => {
        render(<AssumptionsBlock />);
        ASSUMPTIONS.forEach((line) => {
          expect(screen.getByText(`· ${line}`)).toBeInTheDocument();
        });
      });
      it('renders the header', () => {
        render(<AssumptionsBlock />);
        expect(screen.getByText(/Assumptions used by this working paper/)).toBeInTheDocument();
      });
    });
    ```

    Step 7 — Create `src/styles/print.css`:
    ```css
    /* AussieLedger print stylesheet — Phase 5 Plan 05-1
     * Imported via src/index.css. Defines @media print rules + per-form classes.
     */

    @media print {
      @page {
        size: A4 portrait;
        margin: 15mm 12mm 25mm 12mm;
      }

      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      /* Hide all app chrome */
      .no-print { display: none !important; }

      /* Show print-only elements */
      .print-only { display: block !important; }

      /* Per-form scoping classes */
      .print-form-i,
      .print-form-c,
      .print-form-t,
      .print-form-p,
      .print-form-bas,
      .print-form-ias {
        page-break-inside: avoid;
      }

      h1, h2, h3 { page-break-after: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }

      /* Footer running on every page */
      .print-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        font-size: 8pt;
        border-top: 1pt solid #999;
        padding: 4pt 8pt;
        color: #555;
        background: white;
      }
    }

    @media screen {
      .print-only { display: none; }
    }
    ```

    Step 8 — Edit `src/index.css` to add `@import './styles/print.css';` near the existing Tailwind imports (top of file or after the Tailwind layer block — verify location works with existing build).

    Step 9 — Create `src/styles/__tests__/print-css.test.ts`:
    ```typescript
    import { describe, it, expect } from 'vitest';
    import { readFileSync } from 'node:fs';
    import { join } from 'node:path';

    describe('print.css', () => {
      const css = readFileSync(join(__dirname, '..', 'print.css'), 'utf-8');
      it('no-print rules present', () => {
        expect(css).toMatch(/@media print/);
        expect(css).toMatch(/\.no-print\s*{\s*display:\s*none\s*!important/);
      });
      it('print-only rules present', () => {
        expect(css).toMatch(/\.print-only\s*{\s*display:\s*block\s*!important/);
      });
      it('per-form classes defined', () => {
        expect(css).toMatch(/\.print-form-i/);
        expect(css).toMatch(/\.print-form-c/);
        expect(css).toMatch(/\.print-form-t/);
        expect(css).toMatch(/\.print-form-p/);
        expect(css).toMatch(/\.print-form-bas/);
      });
      it('A4 page rule defined', () => {
        expect(css).toMatch(/@page\s*{[^}]*size:\s*A4/);
      });
      it('print footer running rule defined', () => {
        expect(css).toMatch(/\.print-footer/);
      });
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/PrintBanner.test.tsx src/components/__tests__/AnomalyBadge.test.tsx src/components/__tests__/AssumptionsBlock.test.tsx src/styles/__tests__/print-css.test.ts --reporter=verbose 2>&1 | tail -40 && npm run build 2>&1 | tail -10</automated>
  </verify>
  <done>
    - PrintBanner: 4 GREEN tests
    - AnomalyBadge: 2 GREEN tests
    - AssumptionsBlock: 2 GREEN tests
    - print-css: 5 GREEN tests
    - Vite build (`npm run build`) exits 0 — confirms `src/index.css @import` resolves
    - `npm run lint` exits 0
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 5: PartnershipTaxReturn skeleton + Phase 5 component test scaffolds (RED for 05-2/05-3/05-4)</name>
  <files>
    src/components/PartnershipTaxReturn.tsx,
    src/components/__tests__/PartnershipTaxReturn.test.tsx,
    src/components/__tests__/TaxReturnAssistant.test.tsx,
    src/components/__tests__/CompanyTaxReturn.test.tsx,
    src/components/__tests__/TrustTaxReturn.test.tsx,
    src/components/__tests__/BasIasAssistant.test.tsx,
    src/components/__tests__/EntityForm.test.tsx,
    src/components/__tests__/ViewRouter.test.tsx,
    src/__tests__/structural-lint.test.ts
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/components/TrustTaxReturn.tsx (Phase 2 placeholder — same shape pattern PartnershipTaxReturn will follow)
    - A:/Projects/AussieLedger/src/components/TaxReturnAssistant.tsx (Phase 2 placeholder)
    - A:/Projects/AussieLedger/src/components/EntityForm.tsx (Phase 4 — for the v4 widening scaffold)
    - A:/Projects/AussieLedger/src/components/ViewRouter.tsx (current routing — for verifying PartnershipTaxReturn slot landing)
    - A:/Projects/AussieLedger/src/__tests__/structural-lint.test.ts (existing structural lint rule — extend it to cover Phase 5 files)
  </read_first>
  <behavior>
    - `PartnershipTaxReturn.tsx` skeleton:
        - Props: `{ entity: Entity; accounts: Account[]; entries: JournalEntry[]; period: Period; addLog?: AddLog }` (mirrors TrustTaxReturn)
        - Renders a heading "Form P — Partnership Tax Return — Pending Phase 5 Plan 05-3"
        - Returns a `<section className="print-form-p">` wrapping minimal content
        - Calls `computePartnershipReturn` (Wave 0 empty body) once to verify type compile
        - Plan 05-3 fleshes this out fully (Form P labels + per-partner distribution + Print button)
    - `__tests__/PartnershipTaxReturn.test.tsx` — 2 RED tests using `it.todo` (`renders Form P with distribution`, `print button emits audit`) so Plan 05-3 sees them as scaffolds
    - `__tests__/TaxReturnAssistant.test.tsx` — extend with 6 `it.todo` placeholders matching 05-VALIDATION.md
    - `__tests__/CompanyTaxReturn.test.tsx` — extend with 3 `it.todo` placeholders
    - `__tests__/TrustTaxReturn.test.tsx` — extend with 3 `it.todo` placeholders
    - `__tests__/BasIasAssistant.test.tsx` — extend with 4 `it.todo` placeholders
    - `__tests__/EntityForm.test.tsx` — extend with 2 `it.todo` placeholders for aggregatedTurnover field + paygInstalmentAmount field
    - `__tests__/ViewRouter.test.tsx` — extend (or create if absent) with `it.todo('routes partnership to PartnershipTaxReturn')`
    - `__tests__/structural-lint.test.ts` — extend the no-parameterless-new-Date rule to ALSO cover `src/lib/tax/returns/fy2026/**/*.ts`, `src/lib/tax/rates/fy2026/**/*.ts`, `src/lib/tax/aggregatedTurnover.ts`, and all 3 new Phase-5 components
  </behavior>
  <action>
    Step 1 — Create `src/components/PartnershipTaxReturn.tsx`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import React from 'react';
    import type { Account, Entity, JournalEntry, AuditAction } from '../types';
    import type { Period, FyLabel } from '../lib/period';
    import { currentFy } from '../lib/period';
    import { computePartnershipReturn } from '../lib/tax/returns/fy2026/partnership';

    type AddLog = (action: AuditAction, details: string, entityId?: string) => void;

    interface PartnershipTaxReturnProps {
      entity: Entity;
      accounts: Account[];
      entries: JournalEntry[];
      period?: Period;
      addLog?: AddLog;
    }

    /**
     * Form P (Partnership) tax return renderer.
     *
     * Phase 5 Wave 0: skeleton — Plan 05-3 implements the full Form P layout
     * (P1/P2/P8 labels + per-partner distribution table + Print button + audit emission).
     *
     * This skeleton is shipped so ViewRouter can import + route to it without compile errors;
     * Plan 05-4 will wire ViewRouter's PartnershipTaxReturn slot. The "Pending Phase 5 Plan 05-3"
     * heading is intentional — it makes the placeholder visible to anyone running the app
     * between Plan 05-1 and Plan 05-3.
     */
    export function PartnershipTaxReturn({ entity, accounts, entries, period }: PartnershipTaxReturnProps): React.JSX.Element {
      // Touch the compute function so types compile + import path is validated.
      const fy: FyLabel = period?.type === 'fy' ? period.fy : currentFy();
      const _result = computePartnershipReturn({ entity, accounts, entries, fy });
      void _result;
      return (
        <section className="print-form-p p-4">
          <h2 className="text-xl font-bold">Form P — Partnership Tax Return</h2>
          <p className="text-sm italic text-gray-500">
            Pending Phase 5 Plan 05-3 implementation. Entity: {entity.name} (FY: {fy}).
          </p>
        </section>
      );
    }
    ```

    Step 2 — Create `src/components/__tests__/PartnershipTaxReturn.test.tsx`:
    ```typescript
    import { describe, it, expect } from 'vitest';
    import { render, screen } from '@testing-library/react';
    import { PartnershipTaxReturn } from '../PartnershipTaxReturn';
    import type { Entity } from '../../types';

    const fixtureEntity: Entity = {
      _v: 4, id: 'p1', name: 'Smith & Jones Partnership',
      type: 'Partnership', status: 'Active',
      partners: [
        { id: 'p1', name: 'Smith', sharePercent: 50 },
        { id: 'p2', name: 'Jones', sharePercent: 50 },
      ],
    };

    describe('PartnershipTaxReturn', () => {
      it('renders the Form P heading (Wave 0 skeleton)', () => {
        render(<PartnershipTaxReturn entity={fixtureEntity} accounts={[]} entries={[]} />);
        expect(screen.getByText(/Form P — Partnership Tax Return/)).toBeInTheDocument();
      });
      it.todo('renders Form P with distribution — P1 P2 P8 + per-partner rows reconciling to net income');
      it.todo('print button emits audit — EXPORT_DATA log with { form: P, fy: FY2026 }');
    });
    ```

    Step 3 — Read existing `src/components/__tests__/TaxReturnAssistant.test.tsx` (or create if missing) and append 6 `it.todo` entries matching 05-VALIDATION.md verification map:
    ```typescript
    describe('TaxReturnAssistant — Phase 5 wiring', () => {
      it.todo('renders Form I with ATO codes and labels — P1/P2/P8/item15 visible with plain-English titles');
      it.todo('print button emits audit — EXPORT_DATA log with { form: I, fy: FY2026 }');
      it.todo('renders assumptions block — 5 assumed values present');
      it.todo('renders B and P schedule — P1/P2/P8/item15 + sub-labels');
      it.todo('shows item 7D when eligible — small-business offset line with $1,000-cap basis text');
      it.todo('anomalies inline and bottom section — AnomalyBadge component rendered per anomaly + consolidated list');
    });
    ```

    Step 4 — Append matching `it.todo` blocks to `CompanyTaxReturn.test.tsx`, `TrustTaxReturn.test.tsx`, `BasIasAssistant.test.tsx`, `EntityForm.test.tsx` per 05-VALIDATION.md. Make sure each new describe is namespaced (e.g. `describe('CompanyTaxReturn — Phase 5 wiring', …)`) to avoid colliding with Phase 4 scaffolds.

    Step 5 — Create or extend `src/components/__tests__/ViewRouter.test.tsx`:
    ```typescript
    describe('ViewRouter — Phase 5 wiring', () => {
      it.todo('routes partnership to PartnershipTaxReturn — Plan 05-4 wires the slot');
    });
    ```

    Step 6 — Extend `src/__tests__/structural-lint.test.ts`. Find the existing test that checks for parameterless `new Date()`. Add the Phase 5 paths to its scan glob:
    ```typescript
    const PHASE_5_PATHS = [
      'src/lib/tax/returns/fy2026',
      'src/lib/tax/rates/fy2026',
      'src/lib/tax/aggregatedTurnover.ts',
      'src/components/PrintBanner.tsx',
      'src/components/AnomalyBadge.tsx',
      'src/components/AssumptionsBlock.tsx',
      'src/components/PartnershipTaxReturn.tsx',
    ];
    // Add an iteration that runs the same regex check over these paths
    ```

    Step 7 — Run `npm run build` to confirm `ViewRouter.tsx` does not break despite PartnershipTaxReturn skeleton being incomplete (ViewRouter wiring lands in Plan 05-4; the skeleton just needs to be importable).
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/PartnershipTaxReturn.test.tsx src/__tests__/structural-lint.test.ts --reporter=verbose 2>&1 | tail -30 && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
    - `PartnershipTaxReturn.test.tsx` has 1 GREEN test (heading rendering) + 2 `it.todo` (Plan 05-3 flips)
    - Structural lint test still GREEN over Phase 5 files (no parameterless `new Date()`)
    - `npm run build` exits 0 — Vite resolves `computePartnershipReturn` import from skeleton
    - All 6 component test files have their Phase 5 `it.todo` scaffolds in place
    - `npm run lint` exits 0
  </done>
</task>

</tasks>

<verification>
1. `npm run lint` exits 0 (project ESLint rules pass over all 50 files modified)
2. `npm run build` exits 0 (Vite production build succeeds; print.css resolves; tsc emit succeeds)
3. `npm run test` exits 0; expected: 371 (Phase 4 baseline) + ~38 new Wave-0 GREEN tests = ~409 GREEN; ~26 new `it.todo` placeholders visible in runner output (Plans 05-2/05-3/05-4 flip these)
4. `npm run test:server` exits 0 (18 server tests unchanged — no server-side changes in Phase 5)
5. `npx tsc --noEmit` exits 0 (every compute*Return signature compiles; every test file imports cleanly)
6. Specific assertions:
   - `node -e "const m = require('./dist/lib/tax/rates/fy2026/marginal.js'); console.log(m.marginalTaxFY2026(new Decimal('45000')).toString())"` prints `4288`
   - `breRate({ passivePct: new Decimal('0.90'), aggregatedTurnover: new Decimal('1000000'), totalAssessable: new Decimal('500000') }).rate.toString() === '0.3'`
   - `smallBusinessIncomeOffset({ netSbIncome: new Decimal('30000'), aggregatedTurnover: new Decimal('4000000'), totalTaxableIncome: new Decimal('30000'), taxBeforeOffsets: new Decimal('1888') }).offset.toString() === '302.08'` (or whatever the exact value is — verify against the formula)
   - `CURRENT_VERSION === 4`
7. Migration round-trip: v0 → v4 preserves every field; aggregatedTurnover + paygInstalmentAmount default to undefined
8. `src/lib/tax/labels/fy2026.ts` shows the 3 NAT corrections + the BRE legislative cite fix
9. REQUIREMENTS.md unchanged (visual verification in step 1 of Task 1 — commit `6970b91` already landed the COY-04→IND-04 swap)
10. Structural lint passes over all Phase 5 paths
</verification>

<success_criteria>
- [x] **Success criterion #2 locked at the helper layer** — `breRate({ passivePct: 0.90, ... }) → 0.30` is GREEN via `bre.test.ts`. The form-level Form C 90%-dividend → 30% test is RED-by-design and flips in Plan 05-2.
- [x] **Success criterion #4 partial** — `marginalTaxFY2026`, `litoFY2026`, `medicareLevyFY2026` rate helpers all GREEN. The form-level IND-01..03 + IND-04 tests are RED-by-design and flip in Plan 05-2.
- [x] **Schema migration GREEN** — v3 → v4 additive migration + round-trip GREEN; existing Phase 4 tests unaffected.
- [x] **Print-CSS infrastructure GREEN** — `print.css` ships with all `@media print` rules; PrintBanner / AnomalyBadge / AssumptionsBlock render correctly in screen mode (jsdom doesn't run `@media print` but the components are import-ready for 05-2/05-3/05-4).
- [x] **Wave 0 corrections landed** — 3 NAT typos fixed, BRE cite fixed; REQUIREMENTS.md COY-04→IND-04 verified in place.
- [x] **Compute*Return scaffolds in place** — 6 empty-body modules + 6 test files with `it.todo` placeholders enumerating every test 05-2/05-3/05-4 must flip GREEN.
- [x] **StorageAdapter untouched** — Phase 3 FINAL preserved.
- [x] **Zero new runtime dependencies** — `package.json` unchanged.
- [x] **Requirements coverage:** BAS-01, BAS-02, BAS-04, BAS-06, TAX-02, IND-01, IND-02, IND-03, IND-04, COY-01, COY-02, COY-03, TRT-01, TRT-02, TRT-03, PSP-01, PSP-02 — all addressed at the helper / type / scaffold layer in this plan (form-level GREEN flips in 05-2/05-3/05-4).
</success_criteria>

<output>
After completion, create `.planning/phases/05-tax-outputs/05-1-SUMMARY.md` using the template from `./.claude/get-shit-done/templates/summary.md`. Capture:
- Exact GREEN test count delta (expected: ~371 → ~409 SPA)
- The 3 Wave-0 corrections (with before-after diffs for the labels file)
- v3→v4 migration shape (the exact PersistedRoot field list it touches)
- The complete contract of every helper function (signatures + return shapes) for Plans 05-2/05-3/05-4 to reference
- Any deviations from CONTEXT.md (none expected — flag immediately if any surface)
- Open questions (should be empty — CONTEXT resolved everything)
- Files created / modified (count each)
- Lint / build / test exit codes
- The exact `it.todo` test names so 05-2/05-3/05-4 can grep them and flip atomically
</output>
