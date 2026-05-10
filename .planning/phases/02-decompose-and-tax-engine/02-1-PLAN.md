---
phase: 02-decompose-and-tax-engine
plan: 1
type: execute
wave: 0
depends_on: []
files_modified:
  - src/types.ts
  - src/constants.ts
  - src/lib/period.ts
  - src/lib/ai.ts
  - src/lib/import/match.ts
  - src/lib/tax/types.ts
  - src/lib/tax/individual.ts
  - src/lib/tax/company.ts
  - src/lib/tax/trust.ts
  - src/lib/tax/partnership.ts
  - src/lib/tax/bas.ts
  - src/lib/tax/labels/fy2026.ts
  - src/lib/migrations/v1-to-v2.ts
  - src/lib/__tests__/ai.test.ts
  - src/lib/__tests__/period.test.ts
  - src/lib/import/__tests__/match.test.ts
  - src/lib/migrations/__tests__/v1-to-v2.test.ts
  - src/hooks/__tests__/useAuditLog.test.ts
  - src/hooks/__tests__/useAccounts.test.ts
  - src/hooks/__tests__/useJournals.test.ts
  - src/hooks/__tests__/useEntities.test.ts
  - src/components/__tests__/AccountManager.test.tsx
  - src/components/__tests__/ImportTB.test.tsx
  - src/lib/tax/__tests__/structural-lint.test.ts
  - src/lib/tax/__tests__/golden.test.ts
  - src/lib/tax/__tests__/bas.test.ts
  - src/__tests__/structural.test.ts
autonomous: true
requirements: [FND-04, TAX-01, TAX-03, TAX-05, BOOK-08, BOOK-10]
gap_closure: false

must_haves:
  truths:
    - "src/lib/period.ts exports today, currentFy, fyBoundaries, quarterOf, quarterBoundaries, isInPeriod, FyLabel, Period"
    - "src/lib/ai.ts exports IS_AI_ENABLED computed from process.env.GEMINI_API_KEY at module load"
    - "src/lib/import/match.ts exports fuzzyMatch with HIGH_CONFIDENCE_THRESHOLD = 0.85"
    - "src/lib/tax/{individual,company,trust,partnership,bas}.ts each export their compute* function with relocated demo math (NOT zeros) using Decimal"
    - "src/lib/tax/labels/fy2026.ts exports INDIVIDUAL_LABELS, COMPANY_LABELS, TRUST_LABELS, PARTNERSHIP_LABELS, BAS_LABELS, GST_RATE, GST_DIVISOR, COMPANY_TAX_RATE_BASE, COMPANY_TAX_RATE_FULL, BRE_PASSIVE_THRESHOLD, BRE_TURNOVER_THRESHOLD"
    - "src/lib/migrations/v1-to-v2.ts exports migrateV1ToV2 with name-inference table"
    - "src/types.ts: Account.gstCode union widened to 'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP'; partnershipTaxLabel and _needsReview added"
    - "src/constants.ts: all 16 default accounts have full per-entity-type labels populated for Revenue/Expense rows (taxLabel + companyTaxLabel + trustTaxLabel + partnershipTaxLabel)"
    - "All 14 wave-0 test files exist and run; tax-engine shape tests pass; period/match/migration/ai/hook tests pass against the new modules"
    - "All 12 existing component smoke tests in src/components/__tests__/smoke.test.tsx remain green"
  artifacts:
    - path: "src/lib/period.ts"
      provides: "AU FY/BAS quarter/custom period model with today() seam"
      contains: "export function today"
    - path: "src/lib/ai.ts"
      provides: "IS_AI_ENABLED constant"
      contains: "export const IS_AI_ENABLED"
    - path: "src/lib/import/match.ts"
      provides: "Levenshtein + exact-code fuzzyMatch"
      contains: "export function fuzzyMatch"
    - path: "src/lib/tax/types.ts"
      provides: "TaxInput, LabelResult, IndividualReturn, CompanyReturn, TrustReturn, PartnershipReturn, BasReturn, TrustInput, PartnershipInput"
      contains: "export interface LabelResult"
    - path: "src/lib/tax/individual.ts"
      provides: "computeIndividual with relocated demo rollup math"
      contains: "export function computeIndividual"
    - path: "src/lib/tax/company.ts"
      provides: "computeCompany with relocated demo rollup math"
      contains: "export function computeCompany"
    - path: "src/lib/tax/trust.ts"
      provides: "computeTrust with relocated demo rollup math"
      contains: "export function computeTrust"
    - path: "src/lib/tax/partnership.ts"
      provides: "computePartnership stub returning shape (no existing component yet)"
      contains: "export function computePartnership"
    - path: "src/lib/tax/bas.ts"
      provides: "computeBas with relocated demo rollup math"
      contains: "export function computeBas"
    - path: "src/lib/tax/labels/fy2026.ts"
      provides: "FY-versioned constants for all entity types"
      contains: "export const INDIVIDUAL_LABELS"
    - path: "src/lib/migrations/v1-to-v2.ts"
      provides: "Migration body + name-inference table"
      contains: "export function migrateV1ToV2"
    - path: "src/types.ts"
      provides: "Widened gstCode union; partnershipTaxLabel + _needsReview on Account"
      contains: "'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP'"
    - path: "src/constants.ts"
      provides: "Seed CoA fully mapped per entity type"
      contains: "partnershipTaxLabel"
  key_links:
    - from: "src/lib/tax/individual.ts"
      to: "src/lib/money.ts"
      via: "Decimal arithmetic via add/sub from money.ts"
      pattern: "from '\\.\\./money'"
    - from: "src/lib/tax/company.ts"
      to: "src/lib/tax/types.ts"
      via: "imports CompanyInput, CompanyReturn, LabelResult"
      pattern: "from '\\./types'"
    - from: "src/lib/migrations/v1-to-v2.ts"
      to: "src/types.ts"
      via: "imports Account type with widened union"
      pattern: "from '\\.\\./\\.\\./types'"
    - from: "src/lib/__tests__/period.test.ts"
      to: "src/lib/period.ts"
      via: "vi.spyOn(period, 'today')"
      pattern: "vi\\.spyOn\\(.*?period.*?,\\s*'today'\\)"
---

<objective>
Wave 0 foundations for Phase 2. Create every new source file, type, and test scaffold so that the parallel implementation plans (02-2, 02-3) and the App.tsx demolition (02-4) can land without scaffolding gaps. NO existing component is modified by this plan; NO hook is wired into App.tsx; NO migration is registered in the runner index. Those happen in Wave 1 and Wave 2.

Purpose:
- Make every test command in 02-VALIDATION.md "Per-Task Verification Map" runnable (red or green) before any executor needs to run it.
- Land all new pure-function modules (period, ai, import/match, tax engine, fy2026 labels) and the v1→v2 migration body — fully tested in isolation — so subsequent plans only need to wire them into existing components.
- Widen src/types.ts and seed src/constants.ts so the migration and label-set tests can reference real shapes.
- The tax-engine compute* stubs MUST relocate the existing demo rollup math from the 4 tax components (verbatim, converted to Decimal) — they MUST NOT return zeros. Phase 5 rewrites internals; Phase 2 preserves visual output.

Output:
- 14 source files (new) + 14 test files (10 new + 4 extensions)
- src/types.ts and src/constants.ts updated for v_2 shape
- All 12 existing component smoke tests still green
- New shape tests + period/match/migration/ai/hook tests green
- Structural lints (no React in lib/tax/**, fy2026 exports, seed CoA fully mapped) pass
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/02-decompose-and-tax-engine/02-CONTEXT.md
@.planning/phases/02-decompose-and-tax-engine/02-RESEARCH.md
@.planning/phases/02-decompose-and-tax-engine/02-VALIDATION.md
@.planning/phases/01-safety-net/01-1-SUMMARY.md
@.planning/codebase/CONVENTIONS.md
@.planning/codebase/STRUCTURE.md
@src/types.ts
@src/constants.ts
@src/lib/money.ts
@src/lib/migrations/index.ts
@src/lib/tax/__tests__/structural-lint.test.ts
@src/components/TaxReturnAssistant.tsx
@src/components/CompanyTaxReturn.tsx
@src/components/TrustTaxReturn.tsx
@src/components/BasIasAssistant.tsx

<interfaces>
<!-- Contracts the executor MUST implement verbatim. Do NOT explore the codebase to find these. -->

From src/types.ts (after widening — paste verbatim into the file):
```typescript
export interface Account {
  _v?: number;
  id: string;
  code: string;
  name: string;
  type: AccountType;
  taxLabel?: string;            // Individual ATO label (NAT 0660)
  companyTaxLabel?: string;     // Company ATO label (NAT 0656)
  trustTaxLabel?: string;       // Trust ATO label (NAT 0659)
  partnershipTaxLabel?: string; // NEW _v: 2 — Partnership ATO label (NAT 0976)
  gstCode: 'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP'; // WIDENED _v: 2 — added INP and CAP
  _needsReview?: boolean;       // NEW _v: 2 — set by migration when label inference fails for Revenue/Expense
}
```

From src/lib/period.ts:
```typescript
export type FyLabel = `FY${number}`;
export type Period =
  | { type: 'fy'; fy: FyLabel }
  | { type: 'quarter'; fy: FyLabel; q: 1 | 2 | 3 | 4 }
  | { type: 'custom'; from: Date; to: Date };
export function today(): Date;
export function _setNowProvider(fn: () => Date): void;
export function _resetNowProvider(): void;
export function currentFy(now?: Date): FyLabel;
export function fyBoundaries(fy: FyLabel): { from: Date; to: Date };
export function quarterOf(date: Date): { fy: FyLabel; q: 1 | 2 | 3 | 4 };
export function quarterBoundaries(fy: FyLabel, q: 1 | 2 | 3 | 4): { from: Date; to: Date };
export function isInPeriod(date: Date, period: Period): boolean;
```

From src/lib/ai.ts:
```typescript
// Build-time const. process.env.GEMINI_API_KEY is replaced by Vite's define block at build.
export const IS_AI_ENABLED: boolean = Boolean(
  process.env.GEMINI_API_KEY &&
  process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
);
```

From src/lib/import/match.ts:
```typescript
import { ImportedAccount, Account } from '../../types';
export const HIGH_CONFIDENCE_THRESHOLD = 0.85;
export const TOP_N_CANDIDATES = 3;
export interface MatchResult {
  mappedAccountId?: string;
  confidence: number;
  candidates: Array<{ accountId: string; confidence: number; name: string }>;
}
export function fuzzyMatch(
  imported: Pick<ImportedAccount, 'externalCode' | 'externalName'>,
  accounts: Account[]
): MatchResult;
```

From src/lib/tax/types.ts:
```typescript
import { Decimal } from '../money';
import { JournalEntry, JournalLine, Account } from '../../types';
import { FyLabel, Period } from '../period';

export interface LabelResult {
  value: Decimal;
  source: JournalLine[];
  basis?: string;
}
export interface TaxInput {
  fy: FyLabel;
  entries: JournalEntry[];
  accounts: Account[];
  period: Period;
}
export type IndividualInput = TaxInput;
export type CompanyInput = TaxInput;
export interface TrustInput extends TaxInput {
  beneficiaries?: Array<{ name: string; share: number }>;
}
export interface PartnershipInput extends TaxInput {
  partners?: Array<{ name: string; share: number }>;
}
export type BasInput = TaxInput;

// Per-entity return shapes — see fy2026.ts label unions; each label is a LabelResult
export interface IndividualReturn { '6S': LabelResult; '6K': LabelResult; '6L': LabelResult; '6N': LabelResult; '6Q': LabelResult; '7T': LabelResult; }
export interface CompanyReturn   { '6A': LabelResult; '6F': LabelResult; '6T': LabelResult; '6C': LabelResult; '6G': LabelResult; '6X': LabelResult; '6S': LabelResult; '7T': LabelResult; }
export interface TrustReturn     { '5B': LabelResult; '11J': LabelResult; '5T': LabelResult; '5E': LabelResult; '5F': LabelResult; '5L': LabelResult; '5M': LabelResult; '5N': LabelResult; '5S': LabelResult; '26': LabelResult; }
export interface PartnershipReturn { 'P1': LabelResult; 'P2': LabelResult; 'P8': LabelResult; }
export interface BasReturn       { G1: LabelResult; G2: LabelResult; G3: LabelResult; G10: LabelResult; G11: LabelResult; '1A': LabelResult; '1B': LabelResult; W1: LabelResult; W2: LabelResult; netGst: LabelResult; }
```

From src/lib/migrations/v1-to-v2.ts:
```typescript
import { Account } from '../../types';
import { PersistedRoot } from './index';
export function migrateV1ToV2(state: PersistedRoot): PersistedRoot;
```

Existing money.ts wrappers (from src/lib/money.ts — already in place, USE THESE):
```typescript
export { Decimal };
export function add(a: Decimal.Value, b: Decimal.Value): Decimal;  // returns Decimal sum
export function sub(a: Decimal.Value, b: Decimal.Value): Decimal;
export function mul(a: Decimal.Value, b: Decimal.Value): Decimal;
export function div(a: Decimal.Value, b: Decimal.Value): Decimal;
export function gst(amountInclGST: Decimal.Value): Decimal;        // amount / 11, 2dp banker's
export function round(value: Decimal.Value, dp?: number): Decimal;
```

Existing migration runner contract (DO NOT modify index.ts in this plan — only the migration body file):
```typescript
// src/lib/migrations/index.ts (current shape; plan 02-4 will register 1→2 here)
export interface PersistedRoot { _v: number; entities?: unknown; allEntries?: unknown; auditLogs?: unknown; accounts?: unknown; }
export const CURRENT_VERSION = 1;  // 02-4 bumps to 2 and registers 1: migrateV1ToV2
export function migrate(raw: Record<string, unknown>): PersistedRoot;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Type widening, seed CoA mapping, and label/period/ai/match foundation modules with their unit tests</name>
  <read_first>
    - src/types.ts (current shape — must widen Account.gstCode union and add 2 fields)
    - src/constants.ts (current 16-account CoA — must add partnershipTaxLabel + fill missing labels for Revenue/Expense)
    - src/lib/money.ts (Decimal wrapper API — use add/sub/mul/div, never raw operators)
    - src/lib/migrations/index.ts (PersistedRoot interface — referenced by v1-to-v2 body)
    - .planning/phases/02-decompose-and-tax-engine/02-CONTEXT.md § "AI-optional UX (FND-04)", § "Period model surface (BOOK-10)", § "Schema migration v1→v2"
    - .planning/phases/02-decompose-and-tax-engine/02-RESEARCH.md § 4 "fy2026.ts Shape", § 5 "Period Model Implementation Details", § 7 "AI Gating Mechanics"
    - .planning/phases/02-decompose-and-tax-engine/02-VALIDATION.md (per-task verification commands for FND-04, BOOK-10, TAX-01, BOOK-08)
  </read_first>
  <behavior>
    Period (src/lib/__tests__/period.test.ts):
    - currentFy returns 'FY2026' for 1-Jul-2025, 30-Jun-2026, 1-Jan-2026; returns 'FY2027' for 1-Jul-2026
    - fyBoundaries('FY2026') returns { from: 2025-07-01, to: 2026-06-30 } (assert via .toISOString().slice(0,10))
    - quarterOf: 1-Jul-2025 → {fy:'FY2026', q:1}; 1-Oct-2025 → q:2; 1-Jan-2026 → q:3; 1-Apr-2026 → q:4; 29-Feb-2028 (leap) → {fy:'FY2028', q:3}
    - quarterBoundaries('FY2026', 1..4) returns ATO-correct ranges (Jul-Sep, Oct-Dec, Jan-Mar, Apr-Jun)
    - isInPeriod with inclusive boundaries: from-date and to-date both return true
    - today() is mockable: vi.spyOn(period, 'today').mockReturnValue(new Date('2026-02-15')) is observed by currentFy()

    AI (src/lib/__tests__/ai.test.ts):
    - When process.env.GEMINI_API_KEY is undefined → IS_AI_ENABLED is false
    - When process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY' → IS_AI_ENABLED is false
    - When process.env.GEMINI_API_KEY === 'real-key-xyz' → IS_AI_ENABLED is true
    - (Use vi.stubEnv('GEMINI_API_KEY', value) plus vi.resetModules() + dynamic import to re-evaluate the module-level const)

    Match (src/lib/import/__tests__/match.test.ts):
    - exact code match returns confidence 1.0 and mappedAccountId set
    - Levenshtein on normalised name produces correct ranking; confidence = 1 - distance/maxLen
    - normalisation: 'Wages & Salaries!' and 'wages and salaries' compare via toLowerCase().replace(/[^a-z0-9 ]/g,'').trim()
    - confidence ≥ 0.85 → mappedAccountId is set
    - confidence < 0.85 → mappedAccountId is undefined; candidates contains top 3
    - empty accounts array returns confidence 0, no candidates

    Migration body (src/lib/migrations/__tests__/v1-to-v2.test.ts):
    - migrateV1ToV2 bumps _v from 1 to 2 (use input fixture with _v: 1, accounts including 'Sales', 'Wages & Salaries', 'General Check Account', 'Obscure Account XYZ')
    - 'Sales' (Revenue) → partnershipTaxLabel === 'P1'
    - 'Wages & Salaries' (Expense) → partnershipTaxLabel === 'P2'
    - existing taxLabel '6S' is preserved verbatim, not overwritten
    - 'Obscure Account XYZ' (Expense, no inference match) → _needsReview === true
    - 'General Check Account' (Asset) → _needsReview is falsy (assets don't appear on tax returns)
    - idempotent: migrateV1ToV2 applied twice produces identical accounts
    - gstCode preserved: account with gstCode 'GST' still has 'GST' after migration; account with 'INP' (passed in) round-trips without throw

    Structural lint extension (src/lib/tax/__tests__/structural-lint.test.ts):
    - "fy2026 exports": fy2026.ts contains exports for INDIVIDUAL_LABELS, COMPANY_LABELS, TRUST_LABELS, PARTNERSHIP_LABELS, BAS_LABELS, GST_RATE, COMPANY_TAX_RATE_BASE, COMPANY_TAX_RATE_FULL, BRE_PASSIVE_THRESHOLD
    - "seed CoA fully mapped": every account in src/constants.ts where type is 'Revenue' or 'Expense' has all four labels (taxLabel + companyTaxLabel + trustTaxLabel + partnershipTaxLabel) populated as non-empty strings
    - "no react import": no file matching src/lib/tax/**/*.ts (excluding test files) contains /import.*from\s+['"]react['"]/ or /import.*from\s+['"]react-dom['"]/
  </behavior>
  <action>
    Step A — Verify @testing-library/jest-dom is installed (BEFORE any test authoring):
    1. Run `npm ls @testing-library/jest-dom` in the project root. RESEARCH.md flagged a possible inconsistency where this package is listed as installed in Phase 1 SUMMARY but may be absent from package.json devDependencies. Component tests using `.toBeInTheDocument()` matchers will fail with cryptic errors if it's missing.
    2. If `npm ls` shows the package: skip to Step 4.
    3. If `npm ls` shows it as missing (or returns "(empty)"): run `npm install --save-dev @testing-library/jest-dom@^6.9.1`. Confirm package.json devDependencies now lists it.
    4. Confirm `src/test/setup.ts` imports it via `import '@testing-library/jest-dom';` (Phase 1 should already have set this up; verify with `grep "@testing-library/jest-dom" src/test/setup.ts`). If the import is missing, ADD it as the first non-comment line of src/test/setup.ts.
    5. Sanity-check by running an existing component smoke test that uses `.toBeInTheDocument()`: `npx vitest run src/components/__tests__/smoke.test.tsx`. All 12 tests must pass before proceeding to Step B. If any fail with "toBeInTheDocument is not a function" or similar, stop and fix the setup before any further work.

    Step B — Widen src/types.ts (modify existing file):
    Replace the existing Account interface verbatim with:
    ```typescript
    export interface Account {
      _v?: number;
      id: string;
      code: string;
      name: string;
      type: AccountType;
      taxLabel?: string;
      companyTaxLabel?: string;
      trustTaxLabel?: string;
      partnershipTaxLabel?: string;
      gstCode: 'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP';
      _needsReview?: boolean;
    }
    ```
    Leave other interfaces untouched.

    Step C — Update src/constants.ts: ensure every Revenue/Expense account in CHART_OF_ACCOUNTS has all four label fields. Use these exact mappings (based on RESEARCH.md inference table):
    - 4-4100 Sales (Revenue): taxLabel '6S', companyTaxLabel '6A', trustTaxLabel '5B', partnershipTaxLabel 'P1', gstCode 'GST'
    - 4-4200 Interest Income (Revenue): taxLabel '6K', companyTaxLabel '6F', trustTaxLabel '11J', partnershipTaxLabel 'P1', gstCode 'FRE'
    - 6-6100 Advertising (Expense): taxLabel '6N', companyTaxLabel '6X', trustTaxLabel '5N', partnershipTaxLabel 'P2', gstCode 'GST'
    - 6-6200 Bank Charges (Expense): taxLabel '6N', companyTaxLabel '6X', trustTaxLabel '5N', partnershipTaxLabel 'P2', gstCode 'N-T'
    - 6-6300 Rent (Expense): taxLabel '6N', companyTaxLabel '6G', trustTaxLabel '5F', partnershipTaxLabel 'P2', gstCode 'GST'
    - 6-6400 Wages & Salaries (Expense): taxLabel '6L', companyTaxLabel '6X', trustTaxLabel '5M', partnershipTaxLabel 'P2', gstCode 'N-T'
    - 6-6500 Superannuation (Expense): taxLabel '6L', companyTaxLabel '6C', trustTaxLabel '5L', partnershipTaxLabel 'P2', gstCode 'N-T'
    Asset/Liability/Equity accounts keep current shape (no label fields). Do NOT modify the existing TAX_LABELS / COMPANY_TAX_LABELS / TRUST_TAX_LABELS exports — they stay for now (component migrations in 02-3 swap them out).

    Step D — Create src/lib/period.ts verbatim per the implementation in 02-RESEARCH.md § 5 "Complete src/lib/period.ts implementation". Includes today(), _setNowProvider(), _resetNowProvider(), currentFy(), fyBoundaries(), quarterOf(), quarterBoundaries(), isInPeriod(). Add the Apache-2.0 SPDX header comment block at the top. The internal _nowProvider closure is the test seam.

    Step E — Create src/lib/ai.ts:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    /**
     * IS_AI_ENABLED is a BUILD-TIME constant computed once at module load.
     * vite.config.ts injects process.env.GEMINI_API_KEY via the define block, so
     * this read is replaced with the literal value at build time.
     * 'MY_GEMINI_API_KEY' (the .env.example placeholder) is treated as "not configured".
     * SECURITY: the key is bundled into the client. Acceptable only for fully-private
     * self-hosted instances. Phase 3 introduces a server-side proxy for shared deployments.
     */
    export const IS_AI_ENABLED: boolean = Boolean(
      process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    ```

    Step F — Create src/lib/import/match.ts verbatim per 02-RESEARCH.md § 7 fuzzyMatch implementation. Include levenshtein() (~20-line DP), normalise() helper, exports HIGH_CONFIDENCE_THRESHOLD = 0.85, TOP_N_CANDIDATES = 3, MatchResult interface, fuzzyMatch(imported, accounts) function. The structural-lint regex /[\d)]\s*[*\/]\s*\d/ scans only src/lib/tax/** so the Levenshtein DP arithmetic in src/lib/import/match.ts is allowed.

    Step G — Create src/lib/migrations/v1-to-v2.ts verbatim per 02-RESEARCH.md § 6 implementation. Include the full INFERENCE_TABLE (revenue accounts: 'sales', 'gross sales', 'service income', 'consulting income', 'interest income', 'bank interest'; expense accounts: 'advertising', 'marketing', 'bank charges', 'bank fees', 'rent', 'rent expense', 'wages', 'salaries', 'wages salaries', 'wages and salaries', 'director fees', 'superannuation', 'super', 'cost of sales', 'cost of goods sold', 'cogs') with their per-entity-type labels. normaliseName: `name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()`. The function MUST NOT throw on any Account; on Revenue/Expense accounts that fail inference, set _needsReview: true. Idempotent guard: `if (state._v >= 2) return state;`. Apache-2.0 SPDX header.

    Step H — Create test files (4 new + 1 extension):
    - src/lib/__tests__/period.test.ts: implement all behaviour described in <behavior> using vi.spyOn pattern from 02-RESEARCH.md § 5
    - src/lib/__tests__/ai.test.ts: import vi, beforeEach (vi.resetModules), use vi.stubEnv('GEMINI_API_KEY', val) + dynamic `await import('../ai')` to re-evaluate const; add vi.unstubAllEnvs in afterEach
    - src/lib/import/__tests__/match.test.ts: cover exact-code match, Levenshtein ranking, normalisation cases, threshold behaviour, empty-accounts case
    - src/lib/migrations/__tests__/v1-to-v2.test.ts: import migrateV1ToV2 directly from '../v1-to-v2' (the runner registration is added in plan 02-4); use the v1State fixture from 02-RESEARCH.md § 6 plus a fixture with gstCode 'INP' to confirm it round-trips
    - Extend src/lib/tax/__tests__/structural-lint.test.ts: add three new describe blocks. (1) "fy2026 exports" reads src/lib/tax/labels/fy2026.ts and asserts it contains the exact tokens 'INDIVIDUAL_LABELS', 'COMPANY_LABELS', 'TRUST_LABELS', 'PARTNERSHIP_LABELS', 'BAS_LABELS', 'GST_RATE', 'COMPANY_TAX_RATE_BASE', 'COMPANY_TAX_RATE_FULL', 'BRE_PASSIVE_THRESHOLD'. (2) "seed CoA fully mapped" imports CHART_OF_ACCOUNTS from '../../../constants' and asserts every entry where type === 'Revenue' || type === 'Expense' has all 4 label fields as non-empty strings. (3) "no react import" reuses findTsFiles to scan src/lib/tax/** and assert no line matches /import\s+.*\s+from\s+['"]react['"]/ or /import\s+.*\s+from\s+['"]react-dom['"]/.

    Step I — Verify everything compiles and the new tests run (note: fy2026.ts and the tax-engine modules don't exist yet but the structural-lint test for fy2026 exports will FAIL by design until Task 2; that's fine — Task 2 lands them in the same plan, all green by end of plan).
    Run: `npx vitest run src/lib/__tests__/period.test.ts src/lib/__tests__/ai.test.ts src/lib/import/__tests__/match.test.ts src/lib/migrations/__tests__/v1-to-v2.test.ts`. Expect ALL GREEN.
    Run smoke: `npx vitest run src/components/__tests__/smoke.test.tsx`. Expect ALL GREEN (12 tests).
  </action>
  <verify>
    <automated>npx vitest run src/lib/__tests__/period.test.ts src/lib/__tests__/ai.test.ts src/lib/import/__tests__/match.test.ts src/lib/migrations/__tests__/v1-to-v2.test.ts src/components/__tests__/smoke.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - src/types.ts contains the literal string `'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP'` (grep)
    - src/types.ts contains `partnershipTaxLabel?: string` and `_needsReview?: boolean` on Account
    - src/constants.ts: every entry in CHART_OF_ACCOUNTS where type is 'Revenue' or 'Expense' has partnershipTaxLabel set (grep `partnershipTaxLabel:` count ≥ 7)
    - src/lib/period.ts exists; exports today, currentFy, fyBoundaries, quarterOf, quarterBoundaries, isInPeriod, _setNowProvider, _resetNowProvider, FyLabel, Period
    - src/lib/ai.ts exists; exports IS_AI_ENABLED as `export const`
    - src/lib/import/match.ts exists; exports fuzzyMatch, HIGH_CONFIDENCE_THRESHOLD = 0.85, TOP_N_CANDIDATES = 3, MatchResult
    - src/lib/migrations/v1-to-v2.ts exists; exports migrateV1ToV2; contains the INFERENCE_TABLE with at least 20 entries
    - src/lib/__tests__/period.test.ts passes; covers currentFy boundary behaviour, quarterOf for all 4 quarters incl. leap year, quarterBoundaries returning ATO-prescribed ranges, isInPeriod inclusive boundaries, today() mockable
    - src/lib/__tests__/ai.test.ts passes; covers undefined / placeholder / real key (3 cases)
    - src/lib/import/__tests__/match.test.ts passes; exact-code wins, Levenshtein ranks, threshold respected
    - src/lib/migrations/__tests__/v1-to-v2.test.ts passes; bumps _v, infers partnershipTaxLabel for Sales and Wages, preserves existing taxLabel, marks unmapped expense as _needsReview, doesn't mark asset, idempotent, gstCode preserved
    - src/lib/tax/__tests__/structural-lint.test.ts has 4 describes total (original + 3 new); the "no react import" describe passes vacuously now (no .ts files in lib/tax yet); fy2026 + seed CoA assertions will fail until Task 2 lands them, which Task 2 does in this same plan
    - All 12 component smoke tests in src/components/__tests__/smoke.test.tsx remain green
    - `npm run lint` (tsc --noEmit) passes — types.ts widening must not break any existing component
  </acceptance_criteria>
  <done>
    Foundation modules + tests exist and pass standalone; types.ts and constants.ts updated for v_2 shape; existing component smoke tests still green; plan ready for Task 2 to add the tax engine on top.
  </done>
</task>

<task type="auto">
  <name>Task 1.5: Commit foundations before tax-engine work (context boundary)</name>
  <files>(no new files — git commit only)</files>
  <action>
    Plan 02-1 modifies 34 files across 3 tasks (high scope). Commit the Task 1 + Task 3 foundations BEFORE starting Task 2's tax engine to reduce context-degradation risk and create a clean rollback point.

    Step A — Verify Task 1 + Task 3 outputs are landed and tests pass:
    `npx vitest run src/lib/__tests__/period.test.ts src/lib/__tests__/ai.test.ts src/lib/import/__tests__/match.test.ts src/lib/migrations/__tests__/v1-to-v2.test.ts src/components/__tests__/smoke.test.tsx`
    All must be GREEN. (Note: tax-engine structural-lint assertions for fy2026 + seed CoA are still RED — that's expected; Task 2 lands them.)

    Step B — Stage and commit the foundation slice:
    `git add src/types.ts src/constants.ts src/lib/period.ts src/lib/ai.ts src/lib/import/match.ts src/lib/migrations/v1-to-v2.ts src/lib/__tests__/ai.test.ts src/lib/__tests__/period.test.ts src/lib/import/__tests__/match.test.ts src/lib/migrations/__tests__/v1-to-v2.test.ts src/hooks/__tests__/ src/components/__tests__/AccountManager.test.tsx src/components/__tests__/ImportTB.test.tsx src/__tests__/structural.test.ts`
    Commit message: `feat(02-1): wave-0 foundations — types/constants/period/ai/match/migration body + test scaffolds`

    Step C — Confirm clean working tree (only the tax-engine files for Task 2 should remain unstaged/untracked, which they are not yet — they don't exist yet).
    Run `git status`; expect "nothing to commit, working tree clean" or only files Task 2 will create.
  </action>
  <verify>
    <automated>git log -1 --oneline</automated>
  </verify>
  <done>
    Foundation commit landed; Task 2 starts on a clean tree. Halves the blast radius if the tax-engine work needs a rollback.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Tax engine modules with relocated demo math + fy2026 labels + tax-engine shape tests</name>
  <read_first>
    - src/lib/money.ts (Decimal wrapper API — ALL stub arithmetic must use this)
    - src/lib/tax/__tests__/structural-lint.test.ts (the no-react-import + seed-CoA + fy2026-exports lint added in Task 1 — your tax modules must satisfy these)
    - src/lib/tax/__tests__/golden.test.ts (Phase 1 .todo placeholders — append shape tests for IndividualReturn, CompanyReturn, TrustReturn, PartnershipReturn)
    - src/lib/tax/__tests__/bas.test.ts
  - src/__tests__/structural.test.ts (Phase 1 .todo placeholders — append shape tests for BasReturn)
    - src/components/TaxReturnAssistant.tsx lines 29-58 (inline rollup math to relocate VERBATIM, converted to Decimal)
    - src/components/CompanyTaxReturn.tsx lines 29-60 (inline rollup math to relocate)
    - src/components/TrustTaxReturn.tsx lines 29-60 (inline rollup math to relocate)
    - src/components/BasIasAssistant.tsx lines 11-86 (inline rollup math to relocate)
    - .planning/phases/02-decompose-and-tax-engine/02-CONTEXT.md § "Tax engine API shape (TAX-05)" (LOCKED contract)
    - .planning/phases/02-decompose-and-tax-engine/02-RESEARCH.md § 3 "Tax Engine Module Skeleton", § 4 "fy2026.ts Shape", "Risk 2: Tax component migration produces zero output if stubs return new Decimal(0)"
    - .planning/phases/02-decompose-and-tax-engine/02-VALIDATION.md (per-task verification commands for TAX-01, TAX-05)
  </read_first>
  <behavior>
    Tax engine shape (src/lib/tax/__tests__/golden.test.ts):
    Tests use TaxInput baseInput = { fy: 'FY2026', entries: [], accounts: [], period: { type: 'fy', fy: 'FY2026' } }.
    - "individual shape": computeIndividual(baseInput) returns {'6S','6K','6L','6N','6Q','7T'} each with .value instanceof Decimal and .source isArray
    - "company shape": computeCompany(baseInput) returns {'6A','6F','6T','6C','6G','6X','6S','7T'} each Decimal+source
    - "trust shape": computeTrust(baseInput) returns {'5B','11J','5T','5E','5F','5L','5M','5N','5S','26'} each Decimal+source
    - "partnership shape": computePartnership(baseInput) returns {'P1','P2','P8'} each Decimal+source
    Tax engine relocated math (one fixture-based test per engine):
    - Build a fixture with one Sales account (taxLabel '6S', companyTaxLabel '6A', trustTaxLabel '5B', partnershipTaxLabel 'P1') and a JournalEntry with one line crediting $1000, debiting $0. Assert computeIndividual(input)['6S'].value.eq(new Decimal(1000)). Same for computeCompany('6A'), computeTrust('5B').
    - Build a fixture with one Wages account (taxLabel '6L', type 'Expense') and a JournalEntry with one line debiting $500, crediting $0. Assert computeIndividual(input)['6L'].value.eq(new Decimal(500)) (positive expense).
    - Build a fixture with one Sales-style Revenue account (partnershipTaxLabel 'P1') and a JournalEntry crediting $800. Assert computePartnership(input).labels['P1'].value.eq(new Decimal(800)). (Partnership has no existing component to relocate from but the polarity logic in the stub MUST roll this up correctly so Phase 4's partnership form works without changes.) NOTE: if the Phase 2 PartnershipReturn shape exposes labels via the top-level keys ('P1','P2','P8') rather than a `labels` namespace, assert `computePartnership(input)['P1'].value.eq(new Decimal(800))` instead — match the actual TypeScript shape produced by Task 2.

    BAS shape (src/lib/tax/__tests__/bas.test.ts):
    - "bas shape": computeBas(baseInput) returns {G1,G2,G3,G10,G11,'1A','1B',W1,W2,netGst} each Decimal+source
    - Fixture: one Sales account with gstCode 'GST', credit $1100 → G1.value.eq(1100); fixture with FRE gstCode → G3.value.eq(amount)
  </behavior>
  <action>
    Step A — Create src/lib/tax/types.ts using the verbatim shape in <interfaces> above. Apache-2.0 SPDX header. Imports Decimal from '../money'; JournalEntry, JournalLine, Account from '../../types'; FyLabel, Period from '../period'.

    Step B — Create src/lib/tax/labels/fy2026.ts verbatim per 02-RESEARCH.md § 4 "fy2026.ts Shape" — full file from `export const FY = 'FY2026' as const;` through GST_RATE/COMPANY_TAX_RATE_BASE/COMPANY_TAX_RATE_FULL/BRE_PASSIVE_THRESHOLD/BRE_TURNOVER_THRESHOLD constants. Includes IndividualLabel, CompanyLabel, TrustLabel, PartnershipLabel, BasLabel string-literal unions and the matching Record<*Label, {title, description}> exports. NAT-reference comments per RESEARCH. Apache-2.0 SPDX header. NO React imports (lint enforces). NO raw arithmetic on monetary values (lint enforces — but this file has no math, only string constants).

    Step C — Create src/lib/tax/individual.ts. RELOCATE the math from TaxReturnAssistant.tsx lines 29-58 verbatim, converted to Decimal:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    // Source: relocated from src/components/TaxReturnAssistant.tsx lines 29-58
    // TODO Phase 5: replace with ATO-correct rollup against NAT 0660 FY-year
    import { Decimal, add, sub } from '../money';
    import type { IndividualInput, IndividualReturn, LabelResult } from './types';

    export function computeIndividual(input: IndividualInput): IndividualReturn {
      const { entries, accounts } = input;
      const labelBalances: Record<string, Decimal> = {};
      let totalIncome = new Decimal(0);
      let totalExpenses = new Decimal(0);

      for (const entry of entries) {
        for (const line of entry.lines) {
          const account = accounts.find(a => a.id === line.accountId);
          if (!account?.taxLabel) continue;
          const credit = new Decimal(line.credit || 0);
          const debit = new Decimal(line.debit || 0);
          const amount = sub(credit, debit);
          const isExpense = ['6L', '6N', '6Q'].includes(account.taxLabel);
          const adjusted = isExpense ? amount.negated() : amount;
          labelBalances[account.taxLabel] = (labelBalances[account.taxLabel] ?? new Decimal(0)).plus(adjusted);
          if (isExpense) totalExpenses = totalExpenses.plus(adjusted);
          else totalIncome = totalIncome.plus(adjusted);
        }
      }

      const make = (label: string): LabelResult => ({ value: labelBalances[label] ?? new Decimal(0), source: [] });

      return {
        '6S': make('6S'),
        '6K': make('6K'),
        '6L': make('6L'),
        '6N': make('6N'),
        '6Q': make('6Q'),
        '7T': { value: sub(totalIncome, totalExpenses), source: [] },
      };
    }
    ```

    Step D — Create src/lib/tax/company.ts: relocate CompanyTaxReturn.tsx lines 29-60 math verbatim, converted to Decimal. Use the pattern in 02-RESEARCH.md "Code Examples → Pattern: Tax engine module (no React)". Returns labels '6A','6F','6T' (derived = 6A+6F),'6C','6G','6X','6S' (derived = 6C+6G+6X),'7T' (derived = 6T-6S). Expense-vs-income polarity matches the source: `account.type === 'Expense' ? debit.minus(credit) : credit.minus(debit)`.

    Step E — Create src/lib/tax/trust.ts: relocate TrustTaxReturn.tsx lines 29-60 math, converted to Decimal. Returns '5B','11J','5T' (5B+11J),'5E','5F','5L','5M','5N','5S' (sum of 5E+5F+5L+5M+5N),'26' (5T - 5S). Polarity: `account.type === 'Expense' ? debit.minus(credit) : credit.minus(debit)` then `labelBalances[trustTaxLabel] = (labelBalances[trustTaxLabel] ?? new Decimal(0)).plus(adjusted)` where adjusted = expense ? amount : amount (i.e. expense bucket positive). Mirror the existing component's `Object.entries(TRUST_TAX_LABELS.INCOME).filter(...).reduce(...)` totalisation but use the literal label arrays ['5B','11J'] and ['5E','5F','5L','5M','5N']. Read TrustInput, return TrustReturn.

    Step F — Create src/lib/tax/partnership.ts: NO existing component to relocate from (Phase 4 builds the form). Stub returns shape with new Decimal(0) for P1, P2, P8 and the relocated polarity logic so future entries with partnershipTaxLabel = 'P1' / 'P2' will roll up correctly:
    ```typescript
    export function computePartnership(input: PartnershipInput): PartnershipReturn {
      const { entries, accounts } = input;
      const totals: Record<string, Decimal> = {};
      for (const entry of entries) {
        for (const line of entry.lines) {
          const account = accounts.find(a => a.id === line.accountId);
          if (!account?.partnershipTaxLabel) continue;
          const credit = new Decimal(line.credit || 0);
          const debit = new Decimal(line.debit || 0);
          const amount = account.type === 'Expense' ? debit.minus(credit) : credit.minus(debit);
          totals[account.partnershipTaxLabel] = (totals[account.partnershipTaxLabel] ?? new Decimal(0)).plus(amount);
        }
      }
      const make = (l: string): LabelResult => ({ value: totals[l] ?? new Decimal(0), source: [] });
      const p1 = totals['P1'] ?? new Decimal(0);
      const p2 = totals['P2'] ?? new Decimal(0);
      return { 'P1': make('P1'), 'P2': make('P2'), 'P8': { value: p1.minus(p2), source: [] } };
    }
    ```

    Step G — Create src/lib/tax/bas.ts: relocate BasIasAssistant.tsx lines 11-86 math verbatim, converted to Decimal. Preserves the existing `Math.max(0, x)` clamping (use `Decimal.max(new Decimal(0), x)`). The W1 detection uses `account.name.includes('Wages')`; the PAYG detection uses `account.name.includes('PAYG Withholding')`. Capital purchases gate: `account.type === 'Asset' && account.gstCode === 'GST'`. Return all 10 fields including `netGst: { value: gstOnSales1A.minus(gstOnPurchases1B), source: [] }`. The structural-lint regex /[\d)]\s*[*\/]\s*\d/ — DO NOT use raw `*` or `/` on numeric expressions; use Decimal.min/max/plus/minus throughout.

    Step H — Append shape + relocated-math tests to src/lib/tax/__tests__/golden.test.ts and src/lib/tax/__tests__/bas.test.ts per <behavior>. Tests import compute* from their modules; remove the existing .todo placeholders by REPLACING them with real shape tests (Phase 5 will replace these with golden-output tests). Keep at least 4 .todo entries per file as Phase 5 placeholders so the documented Phase 1 contract isn't lost — e.g. `it.todo('computeIndividual returns ATO-correct 6S for fixture with known sales — Phase 5')`.

    Step I — Run ALL Phase 2 tests:
    `npx vitest run src/lib/tax/__tests__/ src/lib/__tests__/period.test.ts src/lib/__tests__/ai.test.ts src/lib/import/__tests__/match.test.ts src/lib/migrations/__tests__/v1-to-v2.test.ts src/components/__tests__/smoke.test.tsx`
    All must be GREEN. The structural-lint test for "fy2026 exports", "seed CoA fully mapped", and "no react import" must now pass (the fy2026.ts file is in place; constants.ts was updated in Task 1; lib/tax/*.ts are React-free).
    `npm run lint` (tsc --noEmit) must pass.
  </action>
  <verify>
    <automated>npx vitest run src/lib/tax/ src/lib/__tests__/ src/lib/import/__tests__/match.test.ts src/lib/migrations/__tests__/v1-to-v2.test.ts src/components/__tests__/smoke.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - src/lib/tax/types.ts exists; exports LabelResult, TaxInput, IndividualInput, CompanyInput, TrustInput, PartnershipInput, BasInput, IndividualReturn, CompanyReturn, TrustReturn, PartnershipReturn, BasReturn
    - src/lib/tax/labels/fy2026.ts exists; exports INDIVIDUAL_LABELS, COMPANY_LABELS, TRUST_LABELS, PARTNERSHIP_LABELS, BAS_LABELS, GST_RATE, GST_DIVISOR, COMPANY_TAX_RATE_BASE, COMPANY_TAX_RATE_FULL, BRE_PASSIVE_THRESHOLD, BRE_TURNOVER_THRESHOLD, FY, IndividualLabel, CompanyLabel, TrustLabel, PartnershipLabel, BasLabel
    - src/lib/tax/individual.ts, company.ts, trust.ts, partnership.ts, bas.ts each exist; each has a single export of its compute* function; each returns the documented shape
    - NO file in src/lib/tax/**/*.ts contains `import.*react` (the structural-lint test confirms this)
    - NO file in src/lib/tax/**/*.ts contains raw `*` or `/` on numeric expressions outside comments/strings (existing structural-lint /[\d)]\s*[*\/]\s*\d/ confirms)
    - Tax engine shape tests pass: src/lib/tax/__tests__/golden.test.ts asserts each return type has the documented label keys with .value instanceof Decimal
    - Relocated-math tests pass: $1000 credit on a Revenue account with taxLabel '6S' produces computeIndividual(...)['6S'].value.eq(new Decimal(1000))
    - BAS shape test passes: all 10 fields present in BasReturn
    - All structural lints pass: "no raw float arithmetic in src/lib/tax/", "fy2026 exports", "seed CoA fully mapped", "no react import"
    - All 12 existing component smoke tests still green
    - `npm run lint` (tsc --noEmit) passes
  </acceptance_criteria>
  <done>
    Tax engine modules exist with relocated demo math (NOT zeros — real numbers); fy2026.ts holds all label sets and rate constants; types.ts widening + constants.ts seed mapping consumed by tax engine; all structural lints pass; component smoke tests still green. Plans 02-2 (hooks) and 02-3 (component migrations + AI gating + AccountManager column) can now run in parallel against this foundation.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Hook + component test scaffolds (test files only — implementations land in plans 02-2 and 02-3)</name>
  <read_first>
    - .planning/phases/02-decompose-and-tax-engine/02-RESEARCH.md § 1 "Hook Extraction Recipe" (interfaces + test patterns), § 8 "Tests for Phase 2" (renderHook examples)
    - .planning/phases/02-decompose-and-tax-engine/02-VALIDATION.md "Wave 0 Requirements → New test files (10)"
    - src/test/setup.ts (already mocks @google/genai and polyfills ResizeObserver/matchMedia — your tests inherit this)
    - src/components/AccountManager.tsx (current shape — your test must reflect actual render output)
    - src/components/ImportTB.tsx (current shape — your test must mock the deterministic and AI flows)
  </read_first>
  <behavior>
    Tests are RED-by-design at end of this task. Plan 02-2 turns the 4 hook tests green. Plan 02-3 turns the 2 component tests green.

    src/hooks/__tests__/useAuditLog.test.ts:
    - "starts with empty audit log" — renderHook(() => useAuditLog()).result.current.auditLogs has length 0
    - "addLog prepends a new entry" — after act calling addLog('CREATE_ENTITY', 'msg', 'ent-1'), auditLogs has length 1, .action === 'CREATE_ENTITY'
    - "persists to localStorage on change" — after addLog, JSON.parse(localStorage.getItem('ledger_audit_logs')) is the array
    - "loads from localStorage on mount" — pre-set localStorage; renderHook; expect length 1 with the seeded id

    src/hooks/__tests__/useAccounts.test.ts:
    - "starts with CHART_OF_ACCOUNTS default" — accounts.length === 16
    - "loads from localStorage on mount when present" — pre-set custom accounts in 'ledger_chart_of_accounts'; expect renderHook to load them
    - "persists on change" — call updateAccount({...}); expect localStorage updated
    - "calls addLog on updateAccount" — pass mock addLog (vi.fn()); call updateAccount(...); expect mock called with 'IMPORT_DATA' and message containing the account name
    - "saveAll replaces accounts and logs" — pass mock addLog; call saveAll([...]); accounts updated; addLog called once

    src/hooks/__tests__/useJournals.test.ts:
    - "starts with empty allEntries" — Object.keys(allEntries).length === 0
    - "entries selector returns [] when activeEntityId is null" — entries == []
    - "entries selector returns the entity's slice" — set allEntries via addEntry; entries reflects activeEntityId's slice
    - "addEntry appends and calls addLog with POST_JOURNAL" — mock addLog; expect 'POST_JOURNAL'
    - "filteredEntries respects searchQuery" — set searchQuery to a substring; filteredEntries shrinks
    - "persists to ledger_all_entries on change"

    src/hooks/__tests__/useEntities.test.ts:
    - "starts with DEFAULT_ENTITIES" — length 2 (Sample Pty Ltd, Sample Family Trust)
    - "createEntity appends and calls addLog with CREATE_ENTITY" — mock addLog
    - "updateEntity replaces existing and calls addLog with UPDATE_ENTITY"
    - "archiveEntity flips status to 'Archived' for given ids and calls addLog"
    - "deactivateEntity flips status to 'Deactivated'"
    - "deleteEntity removes given ids"
    - "toggleSelection adds/removes id from selectedEntityIds"
    - "persists to ledger_entities_list on change"

    src/components/__tests__/AccountManager.test.tsx:
    - "renders all accounts with their codes and names"
    - "renders a partnershipTaxLabel column / input for Revenue and Expense rows" (this asserts the column ADDED in plan 02-3 will render — RED until 02-3 lands)
    - "calls onSave with the updated account when partnershipTaxLabel is changed"

    src/components/__tests__/ImportTB.test.tsx:
    - "renders manual mapping flow when IS_AI_ENABLED is false" — vi.mock('../../lib/ai', () => ({ IS_AI_ENABLED: false })); render; expect "Auto-match Accounts" button visible; "Enhance with AI" button NOT visible
    - "renders both buttons when IS_AI_ENABLED is true" — vi.mock the same path returning IS_AI_ENABLED: true; expect both buttons visible
    - "deterministic mapping uses fuzzyMatch results" — mock fuzzyMatch via vi.mock('../../lib/import/match'); upload a file (use stub File); after column-map, click Auto-match; expect fuzzyMatch was called once per imported row
  </behavior>
  <action>
    Step A — Create src/hooks/__tests__/useAuditLog.test.ts. Skeleton imports `import { useAuditLog } from '../useAuditLog'`. The import will fail at Wave 1 task time when 02-2 lands the implementation; until then, the test file is RED-by-design (or skipped via test.todo if you prefer to avoid CI noise — recommendation: use real `it()` calls so 02-2 sees them and turns them green; CI shows them as failing in plan 02-1 commit boundary BUT this is acceptable per Phase 1 precedent in 01-1-SUMMARY.md "RED-by-design" handoff pattern).

    Step B — Create src/hooks/__tests__/useAccounts.test.ts, useJournals.test.ts, useEntities.test.ts in the same RED-by-design shape. Each follows the renderHook + act pattern from 02-RESEARCH.md § 8. Each pre-clears localStorage in beforeEach. Each test the addLog wiring with `const addLog = vi.fn()` and asserts call counts and args. The hook function signatures used by the tests are:
      - `useAuditLog(): { auditLogs, addLog }`
      - `useAccounts(addLog): { accounts, updateAccount, saveAll }`
      - `useJournals(addLog, activeEntityId): { allEntries, entries, filteredEntries, addEntry, importEntries, searchQuery, setSearchQuery, dateFrom, setDateFrom, dateTo, setDateTo }`
      - `useEntities(addLog): { entities, selectedEntityIds, activeEntityId, setActiveEntityId, createEntity, updateEntity, archiveEntity, deactivateEntity, deleteEntity, toggleSelection, clearSelection }`

    Step C — Create src/components/__tests__/AccountManager.test.tsx. Use render + screen from @testing-library/react. The "partnershipTaxLabel column" assertion is RED-by-design — plan 02-3 lands the column. Use a fixture of 3 accounts: one Revenue (with all 4 labels), one Expense (with 3 labels — partnershipTaxLabel undefined), one Asset (no labels). Mock onSave + onCancel as vi.fn().

    Step D — Create src/components/__tests__/ImportTB.test.tsx. The IS_AI_ENABLED gating + fuzzyMatch wiring assertions are RED-by-design — plan 02-3 lands the component changes. Use vi.mock with absolute factory: `vi.mock('../../lib/ai', () => ({ IS_AI_ENABLED: false }))` reset per-test via vi.resetModules. The smoke test (existing `src/components/__tests__/smoke.test.tsx`) renders ImportTB without crashing — that must still pass.

    Step E — Update src/__tests__/structural.test.ts: add a new describe block "App.tsx ≤ 250 lines" that reads src/App.tsx, splits on '\n', filters out lines that match /^\s*$/, asserts the remaining count is ≤ 250. Add a describe block "no raw new Date() outside src/lib/period.ts" that scans src/ for *.ts and *.tsx (exclude *.test.ts, *.test.tsx, src/lib/period.ts) using stripCommentsAndStrings (copy pattern from src/lib/tax/__tests__/structural-lint.test.ts) and asserts no remaining line matches /\bnew Date\s*\(/ or /\bDate\.now\s*\(/. Both assertions are RED-by-design — plan 02-4 demolishes App.tsx and removes the remaining `new Date()` at App.tsx:355.

    Step F — Run the full test suite to verify ONLY the expected red tests are red:
    `npx vitest run`
    Expected RED-by-design at end of plan 02-1: 4 hook tests (3-5 each, ~16 total), AccountManager partnershipTaxLabel column tests (~2), ImportTB AI gating + fuzzyMatch tests (~3), App.tsx ≤ 250 lines (1), no raw new Date (1). Total ~22-24 red. Plan 02-1 SUMMARY must enumerate them under "RED-by-design handoff" mirroring 01-1-SUMMARY.md.

    All other tests (period, ai, match, v1-to-v2 migration, tax engine shapes, all 12 component smoke tests, all Phase 1 tests) MUST remain GREEN. The total green count after plan 02-1 should be ≥ 64 (Phase 1 baseline) + new green tests from Tasks 1 + 2 (~30) = ~94 green.
  </action>
  <verify>
    <automated>npx vitest run --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - 6 new test files exist: src/hooks/__tests__/{useAuditLog,useAccounts,useJournals,useEntities}.test.ts, src/components/__tests__/{AccountManager,ImportTB}.test.tsx
    - src/__tests__/structural.test.ts has 4 describe blocks total: original 2 + "App.tsx ≤ 250 lines" + "no raw new Date outside period.ts"
    - The hook test files import from '../useAuditLog', '../useAccounts', '../useJournals', '../useEntities' (RED until plan 02-2)
    - AccountManager test asserts partnershipTaxLabel column (RED until plan 02-3)
    - ImportTB test asserts IS_AI_ENABLED gating (RED until plan 02-3)
    - structural App.tsx ≤ 250 lines (RED until plan 02-4)
    - structural no-raw-new-Date (RED until plan 02-4 strips App.tsx:355 `new Date().toISOString()`)
    - All Phase 1 tests + period + ai + match + v1-to-v2 + tax engine shape + 12 smoke tests are GREEN
    - Total green tests ≥ 90; total RED-by-design tests ≤ 30; total red tests that are NOT documented as red-by-design = 0
  </acceptance_criteria>
  <done>
    All Wave 0 test scaffolds and source modules exist. RED-by-design test handoff is documented in the plan SUMMARY. Plans 02-2, 02-3 can run in parallel and turn their respective tests green. Plan 02-4 turns the structural App.tsx and new-Date tests green.
  </done>
</task>

</tasks>

<verification>
- All 3 tasks complete; commits land with `docs(02): wave-0 ...` per task
- `npx vitest run` executes; total tests > 90 green; RED-by-design count documented
- `npm run lint` (tsc --noEmit) passes
- `npm run build` (vite build) succeeds (sanity check that production-bundle path is unbroken)
- 12 component smoke tests still green
- Plan SUMMARY enumerates RED-by-design tests handed to plans 02-2, 02-3, 02-4
</verification>

<success_criteria>
1. **All Wave 0 source files exist:** period.ts, ai.ts, lib/import/match.ts, lib/tax/types.ts + individual.ts + company.ts + trust.ts + partnership.ts + bas.ts + labels/fy2026.ts, lib/migrations/v1-to-v2.ts
2. **All Wave 0 test files exist:** 10 new test files + 4 extensions to existing test files
3. **types.ts and constants.ts** updated for v_2 shape (widened gstCode union, partnershipTaxLabel and _needsReview on Account, all 7 Revenue/Expense seed accounts have all 4 entity-type labels)
4. **Tax engine stubs preserve demo math** — fixture-based tests prove computeIndividual('6S') for $1000 credit equals new Decimal(1000), NOT zero
5. **No file in src/lib/tax/** imports React (structural lint passes)
6. **All 12 existing component smoke tests remain green** at every commit boundary
7. **`npm run lint` passes** — types.ts widening doesn't break any existing component
8. **RED-by-design tests handed to downstream plans** — 4 hook tests (→ 02-2), 2 component tests (→ 02-3), 2 structural tests (→ 02-4) — documented in SUMMARY
</success_criteria>

<output>
After completion, create `.planning/phases/02-decompose-and-tax-engine/02-1-SUMMARY.md` documenting:
- Files created/modified per task with line counts
- Total green / red-by-design / red counts at end of plan
- Explicit RED-by-design handoff table (test file → expected-green-by plan)
- Any deviations (e.g. INFERENCE_TABLE entries beyond the documented set)
- Mirror the structure of 01-1-SUMMARY.md
</output>
