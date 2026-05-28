---
phase: 04-bookkeeping-core
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - src/types.ts
  - src/lib/schemas.ts
  - src/lib/migrations/index.ts
  - src/lib/migrations/v2-to-v3.ts
  - src/lib/migrations/__tests__/v2-to-v3.test.ts
  - src/lib/migrations/__tests__/round-trip.test.ts
  - src/lib/coa/types.ts
  - src/lib/coa/fy2026/base.ts
  - src/lib/coa/fy2026/individual.ts
  - src/lib/coa/fy2026/company.ts
  - src/lib/coa/fy2026/trust.ts
  - src/lib/coa/fy2026/partnership.ts
  - src/lib/coa/index.ts
  - src/lib/coa/__tests__/seed.test.ts
  - src/lib/ledger.ts
  - src/lib/__tests__/ledger.test.ts
  - src/lib/import/csv.ts
  - src/lib/import/xlsx.ts
  - src/lib/import/fingerprint.ts
  - src/lib/import/__tests__/csv.test.ts
  - src/lib/import/__tests__/xlsx.test.ts
  - src/lib/import/__tests__/fingerprint.test.ts
  - src/hooks/__tests__/useJournals.test.ts
  - src/hooks/__tests__/useEntities.test.ts
  - src/components/__tests__/AccountManager.test.tsx
  - src/components/__tests__/EntityForm.test.tsx
  - src/components/__tests__/ImportTB.test.tsx
  - src/components/__tests__/JournalForm.test.tsx
  - src/components/__tests__/JournalSearch.test.tsx
  - src/components/__tests__/TrialBalance.test.tsx
  - src/components/__tests__/BeneficiaryRegister.test.tsx
  - src/components/__tests__/PartnerRegister.test.tsx
  - src/components/__tests__/XlsxSheetPicker.test.tsx
  - src/components/__tests__/ImportReviewPane.test.tsx
autonomous: true
requirements:
  - BOOK-01
  - BOOK-05
  - BOOK-07
  - BOOK-11
  - BOOK-12
  - IMP-05
must_haves:
  truths:
    - "Phase 4 type widenings (Account.parentCode/isDefault, JournalEntry.status/reversesEntryId/replacesEntryId/replacedByEntryId/importFingerprint, Entity.gstRegistered/accountingMethod/fyEndDate/lockedFys/beneficiaries/partners, AuditLog.action enum) compile and are the SINGLE SOURCE OF TRUTH for plans 04-2/03-3/04-4"
    - "Schema migration v2→v3 is additive only — round-trip from a v0 blob to v3 preserves every field"
    - "`validateBalanced(lines)` correctly accepts {33.33, 33.33, 33.34 = 100.00} and rejects 100.00 ≠ 100.01"
    - "Per-type default CoAs (Individual / Company / Trust / Partnership) each ship 80–150 rows with no duplicate codes, every parent_code resolves, every Revenue+Expense has at least one tax label, every GST code is in the AU set"
    - "PapaParse and SheetJS wrappers parse a 5-row fixture CSV/XLSX deterministically"
    - "Import fingerprint is stable across row reorder + whitespace; differs across entityId / asAtDate"
    - "Every Phase 4 test scaffold compiles via tsc --noEmit and is wired into the per-task verification map in 04-VALIDATION.md"
    - "All existing 249 SPA tests + 18 server tests stay GREEN after Wave 0 (the type widenings are additive and migration is non-destructive)"
  artifacts:
    - path: "src/types.ts"
      provides: "v3 widened Account / JournalEntry / Entity / AuditLog with all new fields"
      contains: "parentCode"
    - path: "src/lib/migrations/v2-to-v3.ts"
      provides: "migrateV2ToV3(state) - additive defaults applied per CONTEXT decisions"
      exports: ["migrateV2ToV3"]
    - path: "src/lib/migrations/index.ts"
      provides: "CURRENT_VERSION = 3; registers 2 → migrateV2ToV3"
      contains: "CURRENT_VERSION = 3"
    - path: "src/lib/coa/fy2026/base.ts"
      provides: "Shared 121-row spine seed (1xxx Assets / 2xxx Liabilities / 3xxx Equity / 4xxx Revenue / 5xxx COGS / 6xxx Expenses)"
      exports: ["FY2026_BASE_SPINE"]
    - path: "src/lib/coa/fy2026/individual.ts"
      provides: "Sole-trader overlay (Owner's Drawings, NAT 2541/2543 labels)"
      exports: ["FY2026_INDIVIDUAL_OVERLAY"]
    - path: "src/lib/coa/fy2026/company.ts"
      provides: "Company overlay (Shareholder Loans, Director Loans, Franking Account, NAT 0656)"
      exports: ["FY2026_COMPANY_OVERLAY"]
    - path: "src/lib/coa/fy2026/trust.ts"
      provides: "Trust overlay (Beneficiary Distribution clearing, NAT 0660)"
      exports: ["FY2026_TRUST_OVERLAY"]
    - path: "src/lib/coa/fy2026/partnership.ts"
      provides: "Partnership overlay (Partner Capital subaccounts, NAT 0659)"
      exports: ["FY2026_PARTNERSHIP_OVERLAY"]
    - path: "src/lib/coa/index.ts"
      provides: "getDefaultCoaFor(entityType, fy) resolver"
      exports: ["getDefaultCoaFor", "EntityCoaType"]
    - path: "src/lib/ledger.ts"
      provides: "Pure functions: validateBalanced, makeReversal, makeSupersedingEdit, searchJournals; no React, no I/O"
      exports: ["validateBalanced", "makeReversal", "makeSupersedingEdit", "searchJournals", "JournalNotBalancedError"]
    - path: "src/lib/import/fingerprint.ts"
      provides: "computeImportFingerprint via crypto.subtle.digest('SHA-256')"
      exports: ["computeImportFingerprint"]
    - path: "src/lib/import/csv.ts"
      provides: "PapaParse wrapper - parseCsvFile(File) → { rows, headers }"
      exports: ["parseCsvFile"]
    - path: "src/lib/import/xlsx.ts"
      provides: "SheetJS wrapper - parseXlsxFile(File) → { rows, headers, sheetNames }; pickSheetByName(wb, name)"
      exports: ["parseXlsxFile", "pickSheetByName"]
    - path: "package.json"
      provides: "Adds papaparse@^5.5.3, xlsx@^0.20.3 to deps; @types/papaparse@^5.3.16 to devDeps"
      contains: "papaparse"
  key_links:
    - from: "src/lib/coa/index.ts"
      to: "src/lib/coa/fy2026/{base,individual,company,trust,partnership}.ts"
      via: "imports overlays and merges with base"
      pattern: "FY2026_BASE_SPINE"
    - from: "src/lib/ledger.ts"
      to: "src/lib/money.ts"
      via: "Decimal arithmetic — never raw float comparison"
      pattern: "Decimal"
    - from: "src/lib/migrations/index.ts"
      to: "src/lib/migrations/v2-to-v3.ts"
      via: "migrations[2] = migrateV2ToV3"
      pattern: "migrateV2ToV3"
    - from: "src/lib/import/fingerprint.ts"
      to: "crypto.subtle"
      via: "digest('SHA-256', encoded payload)"
      pattern: "crypto.subtle.digest"
    - from: "src/lib/schemas.ts"
      to: "v3 widened type shape"
      via: "Zod schemas adopt the new optional fields"
      pattern: "parentCode"
---

<objective>
Wave 0 — scaffold every Phase-4 type widening, schema migration v2→v3, per-type default CoA modules, the pure-function `ledger.ts` posting engine, the import-fingerprint helper, the PapaParse + SheetJS thin wrappers, and every Phase-4 test file (RED-by-design where downstream implementation is needed; GREEN immediately where Wave 0 ships pure data/logic). Install `papaparse` + `xlsx` runtime deps. After this plan lands, every Wave-2/Wave-3 executor has FINAL contracts to implement against — neither widens types, neither re-derives the CoA, neither re-invents balance arithmetic.

Purpose: Without Wave 0, plans 04-2 (Journal CRUD + TB) and 04-3 (CoA UI + entity registers) would each spend context budget re-discovering the type shapes and the 121-row seed. By landing every type widening, the additive migration, all per-type CoA modules, and all pure helpers up front, 04-2 and 04-3 can run in parallel against the same artifacts. 04-4 (Import refactor) similarly leans on Wave 0's csv/xlsx/fingerprint helpers.

Output:
- `src/types.ts` widened to v3 (additive only; existing 249 SPA + 18 server tests stay green)
- `src/lib/schemas.ts` Zod schemas widened to match v3
- `src/lib/migrations/v2-to-v3.ts` additive migration body + `CURRENT_VERSION` bumped to 3
- `src/lib/coa/fy2026/{base,individual,company,trust,partnership}.ts` + `src/lib/coa/index.ts` resolver — full 121-row spine + 4 overlays
- `src/lib/ledger.ts` pure functions (`validateBalanced`, `makeReversal`, `makeSupersedingEdit`, `searchJournals`) — no React, no adapter calls
- `src/lib/import/{csv,xlsx,fingerprint}.ts` thin library wrappers
- 19 new/extended test files (some GREEN immediately — pure data/logic tests; others `.todo` until 04-2/04-3/04-4 wire the UI)
- `package.json` adds `papaparse@^5.5.3`, `xlsx@^0.20.3` to deps, `@types/papaparse@^5.3.16` to devDeps

After Plan 04-1, success criterion #1 (CoA browsable, 80–150 accounts) is met at the data layer because the seed exists and is structurally validated. Success criteria #2/#3/#4/#5 are met at the data layer because the ledger engine + fingerprint helper + widened types support them — UI wiring comes in 04-2/04-3/04-4.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/04-bookkeeping-core/04-CONTEXT.md
@.planning/phases/04-bookkeeping-core/04-RESEARCH.md
@.planning/phases/04-bookkeeping-core/04-VALIDATION.md
@.planning/phases/03-durable-persistence/03-4-SUMMARY.md
@src/types.ts
@src/lib/schemas.ts
@src/lib/migrations/index.ts
@src/lib/migrations/v1-to-v2.ts
@src/lib/money.ts
@src/lib/period.ts
@src/lib/import/match.ts
@src/storage/adapter.ts
@src/constants.ts
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

From src/lib/migrations/index.ts (current — Wave 0 bumps to 3):
```typescript
export const CURRENT_VERSION = 2;          // → 3 after this plan
export function migrate(raw: Record<string, unknown>): PersistedRoot;
const MIGRATIONS: Record<number, MigrationFn> = {
  0: identity,
  1: migrateV1ToV2,
  // 2: migrateV2ToV3  ← added in Wave 0
};
```

From src/lib/money.ts (Phase 1 boundary — consumed by ledger.ts):
```typescript
export { Decimal };
export function add/sub/mul/div(a: Decimal.Value, b: Decimal.Value): Decimal;
// Banker's rounding configured; toExpNeg -9; precision 20
```

From src/lib/period.ts (Phase 2 structural invariant — consumed by ledger searchJournals):
```typescript
export function today(): Date;
export function isInPeriod(date: Date, period: Period): boolean;
export type Period = { type: 'fy'; fy: FyLabel } | { type: 'quarter'; fy: FyLabel; q: 1|2|3|4 } | { type: 'custom'; from: Date; to: Date };
```

From src/lib/import/match.ts (Phase 2 fuzzy matcher — retained as-is per CONTEXT):
```typescript
export const HIGH_CONFIDENCE_THRESHOLD = 0.85;
export const TOP_N_CANDIDATES = 3;
export function fuzzyMatch(imported: Pick<ImportedAccount, 'externalCode' | 'externalName'>, accounts: Account[]): MatchResult;
```

v2 → v3 type widening targets (this plan WRITES these):

```typescript
// src/types.ts (post-Wave-0)

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
  parentCode?: string | null;     // NEW _v:3 — parent/child hierarchy (BOOK-07)
  isDefault?: boolean;             // NEW _v:3 — archive-only when true (CONTEXT decision)
  isArchived?: boolean;            // NEW _v:3 — soft-delete flag
}

export type JournalEntryStatus = 'draft' | 'posted' | 'superseded' | 'reversed' | 'voided';

export interface JournalEntry {
  _v?: number;
  id: string;
  date: string;
  reference: string;
  description: string;
  lines: JournalLine[];
  isPosted: boolean;                       // KEPT for backward compat with existing reads
  status?: JournalEntryStatus;             // NEW _v:3 — authoritative
  reversesEntryId?: string;                // NEW _v:3 — BOOK-03
  replacesEntryId?: string;                // NEW _v:3 — BOOK-02
  replacedByEntryId?: string;              // NEW _v:3
  importFingerprint?: string;              // NEW _v:3 — IMP-05
}

export interface BeneficiaryRow {
  id: string;
  name: string;
  sharePercent: number;
  sharePerType?: Partial<Record<'interest' | 'dividend' | 'capitalGain' | 'foreign' | 'other', number>>;
}
export interface PartnerRow {
  id: string;
  name: string;
  sharePercent: number;
  sharePerType?: Partial<Record<'interest' | 'dividend' | 'capitalGain' | 'foreign' | 'other', number>>;
}

export interface Entity {
  _v?: number;
  id: string;
  name: string;
  type: 'Company' | 'Trust' | 'Individual' | 'Partnership' | string;  // string retained for legacy seeds
  registrationNumber?: string;
  businessAddress?: string;
  contactPerson?: string;
  status: 'Active' | 'Archived' | 'Deactivated';
  taxAgentName?: string;
  taxAgentPhone?: string;
  taxAgentEmail?: string;
  notes?: string;
  gstRegistered?: boolean;             // NEW _v:3 — ENT-03
  accountingMethod?: 'cash' | 'accruals';  // NEW _v:3 — ENT-04
  fyEndDate?: string;                  // NEW _v:3 — ENT-05 (defaults '06-30')
  lockedFys?: string[];                // NEW _v:3 — Phase 5/6 use; ships empty
  beneficiaries?: BeneficiaryRow[];    // NEW _v:3 — ENT-07
  partners?: PartnerRow[];             // NEW _v:3 — ENT-08
}

export type AuditAction =
  | 'CREATE_ENTITY' | 'UPDATE_ENTITY' | 'DELETE_ENTITY'
  | 'POST_JOURNAL' | 'EDIT_JOURNAL' | 'REVERSE_JOURNAL' | 'VOID_JOURNAL' | 'DELETE_JOURNAL'
  | 'CREATE_ACCOUNT' | 'UPDATE_ACCOUNT' | 'ARCHIVE_ACCOUNT' | 'DELETE_ACCOUNT'
  | 'IMPORT_TB' | 'IMPORT_DATA' | 'EXPORT_DATA'
  | 'LOCK_FY' | 'UNLOCK_FY';

export interface AuditLog {
  _v?: number;
  id: string;
  timestamp: string;
  user: string;
  action: AuditAction;
  entityId?: string;
  details: string;
}
```

CoA seed shape (this plan WRITES):

```typescript
// src/lib/coa/types.ts
export interface DefaultAccountSeed {
  code: string;                       // 4-digit (1xxx..6xxx)
  name: string;
  type: AccountType;                  // A/L/E/R/X
  parentCode: string | null;          // null for root headers
  gstCode: 'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP';
  taxLabel?: string;                  // Individual NAT 2541/2543
  companyTaxLabel?: string;           // Company NAT 0656
  trustTaxLabel?: string;             // Trust NAT 0660
  partnershipTaxLabel?: string;       // Partnership NAT 0659
  isDefault: true;                    // every seed row is default
  notes?: string;
}

export type EntityCoaType = 'Individual' | 'Company' | 'Trust' | 'Partnership';

// src/lib/coa/index.ts
export function getDefaultCoaFor(entityType: EntityCoaType, fy: string): Account[];
//   - Merges FY2026_BASE_SPINE + the per-type overlay
//   - Each returned Account gets a fresh id via `coa-{fy}-{code}` (deterministic)
//   - isDefault: true on every seed account
//   - fy parameter currently accepts only 'FY2026'; other values throw
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Install papaparse + xlsx; widen src/types.ts to v3; widen src/lib/schemas.ts to v3; bump migration runner to v3 and ship the additive v2→v3 migration body; extend round-trip migration test for v0→v3</name>
  <files>
    package.json,
    src/types.ts,
    src/lib/schemas.ts,
    src/lib/migrations/index.ts,
    src/lib/migrations/v2-to-v3.ts,
    src/lib/migrations/__tests__/v2-to-v3.test.ts,
    src/lib/migrations/__tests__/round-trip.test.ts
  </files>
  <read_first>
    - A:/Projects/AussieLedger/package.json (current dep set)
    - A:/Projects/AussieLedger/src/types.ts (current v2 shape)
    - A:/Projects/AussieLedger/src/lib/schemas.ts (current v2 Zod schemas)
    - A:/Projects/AussieLedger/src/lib/migrations/index.ts (migrate ladder + CURRENT_VERSION)
    - A:/Projects/AussieLedger/src/lib/migrations/v1-to-v2.ts (pattern for additive migration)
    - A:/Projects/AussieLedger/src/lib/migrations/__tests__/round-trip.test.ts (extend, not replace)
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-CONTEXT.md `<decisions>` (verbatim defaults: lockedFys=[], status from isPosted, isDefault=false on existing user accounts, parentCode=null on existing)
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-RESEARCH.md "Reversing-Entry Data Model" (state machine)
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-RESEARCH.md "Append-Only Audit-Log Protocol" (widened action enum)
  </read_first>
  <behavior>
    - `npm install papaparse@^5.5.3 xlsx@^0.20.3` and `npm install --save-dev @types/papaparse@^5.3.16` succeed; node_modules/papaparse, node_modules/xlsx, node_modules/@types/papaparse exist
    - `src/types.ts` exports widened `Account`, `JournalEntry`, `JournalEntryStatus`, `Entity`, `BeneficiaryRow`, `PartnerRow`, `AuditAction`, `AuditLog` per the interfaces block above; every existing field is preserved (additive only); every new field is optional (no required-field breakage at compile time)
    - `src/lib/schemas.ts` Zod schemas: every new optional field is `.optional()`; `AuditLog.action` enum is widened to the 17 actions; no existing field is removed
    - `src/lib/migrations/index.ts` bumps `CURRENT_VERSION` to `3` and registers `2: migrateV2ToV3`
    - `src/lib/migrations/v2-to-v3.ts` exports `migrateV2ToV3(state: PersistedRoot): PersistedRoot` and:
        - Sets `_v: 3` on the returned state
        - For each `Account`: leaves all existing fields intact; sets `parentCode: account.parentCode ?? null`, `isDefault: account.isDefault ?? false`, `isArchived: account.isArchived ?? false`
        - For each `JournalEntry`: leaves all existing fields intact; sets `status: entry.status ?? (entry.isPosted ? 'posted' : 'draft')`; never touches `lines`
        - For each `Entity`: leaves all existing fields intact; sets `gstRegistered: entity.gstRegistered ?? false`, `accountingMethod: entity.accountingMethod ?? 'accruals'`, `fyEndDate: entity.fyEndDate ?? '06-30'`, `lockedFys: entity.lockedFys ?? []`; does NOT touch `beneficiaries` / `partners` (they remain undefined unless caller set them — Plan 04-3 adds the UI to set them)
        - Idempotency guard: if `state._v >= 3` return unchanged
    - `src/lib/migrations/__tests__/v2-to-v3.test.ts` covers all 8 default-assignment cases listed in 04-VALIDATION.md per-task verification map (Account parentCode default null, Account isDefault default false, JournalEntry status from isPosted, Entity lockedFys default empty, Entity gstRegistered default false, Entity accountingMethod default accruals, Entity fyEndDate default 06-30, AuditLog action enum widened — see ENUM check below)
    - `src/lib/migrations/__tests__/round-trip.test.ts` extends with a new `it("v0 to v3 round-trip", …)` that walks a v0 blob (no _v, no parentCode, no status) through migrate() and asserts every original field is preserved AND every v3 default is applied
    - `npm run lint && npm run test` exits 0; 249 existing SPA tests stay GREEN; new v2-to-v3 tests GREEN (this migration is pure data transformation — Wave 0 implements it directly)
  </behavior>
  <action>
    Step 1 — Install runtime deps with exact version pins from CONTEXT/RESEARCH:
    ```bash
    npm install papaparse@^5.5.3 xlsx@^0.20.3
    npm install --save-dev @types/papaparse@^5.3.16
    ```
    Confirm `package.json` `dependencies` contains `"papaparse": "^5.5.3"` and `"xlsx": "^0.20.3"` (alphabetical with existing entries). Confirm `devDependencies` contains `"@types/papaparse": "^5.3.16"`.

    Step 2 — Widen `src/types.ts`. The FINAL file content (replacing the existing one verbatim, keeping the SPDX header):
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */

    export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

    export type View =
      | 'master-dashboard'
      | 'dashboard'
      | 'journals'
      | 'trial-balance'
      | 'tax-return'
      | 'company-tax'
      | 'trust-tax'
      | 'bas-ias'
      | 'import'
      | 'edit-entity'
      | 'audit-trail'
      | 'coa-manager'
      | 'data';

    export interface Entity {
      _v?: number;
      id: string;
      name: string;
      /** Constrained to AU four for new entities; legacy seeds may carry other strings until v3 migration normalises. */
      type: 'Company' | 'Trust' | 'Individual' | 'Partnership' | string;
      registrationNumber?: string;
      businessAddress?: string;
      contactPerson?: string;
      status: 'Active' | 'Archived' | 'Deactivated';
      taxAgentName?: string;
      taxAgentPhone?: string;
      taxAgentEmail?: string;
      notes?: string;
      // _v:3 additions
      gstRegistered?: boolean;
      accountingMethod?: 'cash' | 'accruals';
      /** ISO MM-DD; defaults '06-30' for AU FY-end. */
      fyEndDate?: string;
      /** Phase 5/6 will populate; Phase 4 ships empty default. */
      lockedFys?: string[];
      /** Trust beneficiary register (ENT-07). */
      beneficiaries?: BeneficiaryRow[];
      /** Partnership partner register (ENT-08). */
      partners?: PartnerRow[];
    }

    export interface BeneficiaryRow {
      id: string;
      name: string;
      sharePercent: number;
      /** Phase 5 streaming overrides; Phase 4 ships shape only, UI exposes sharePercent. */
      sharePerType?: Partial<Record<'interest' | 'dividend' | 'capitalGain' | 'foreign' | 'other', number>>;
    }

    export interface PartnerRow {
      id: string;
      name: string;
      sharePercent: number;
      sharePerType?: Partial<Record<'interest' | 'dividend' | 'capitalGain' | 'foreign' | 'other', number>>;
    }

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
      // _v:3 additions
      /** parent_code reference for hierarchy (BOOK-07). null for root headers. */
      parentCode?: string | null;
      /** Default seed account — UI blocks hard delete; archive only. */
      isDefault?: boolean;
      /** Soft-delete flag — hides from journal pickers and AccountManager default view. */
      isArchived?: boolean;
    }

    export interface JournalLine {
      _v?: number;
      accountId: string;
      description: string;
      debit: number;
      credit: number;
      taxAmount: number;
      isManualTax?: boolean;
    }

    /** Journal entry lifecycle states. `draft` is pre-post; `posted` is authoritative;
     *  `superseded` means a later entry replaces this one via `replacedByEntryId`;
     *  `reversed` means a balancing entry references this one via `reversesEntryId`;
     *  `voided` is a soft-deleted draft. */
    export type JournalEntryStatus = 'draft' | 'posted' | 'superseded' | 'reversed' | 'voided';

    export interface JournalEntry {
      _v?: number;
      id: string;
      date: string;
      reference: string;
      description: string;
      lines: JournalLine[];
      /** Authoritative posting flag from Phase 1/2; v3 makes `status` the new source of truth but keeps this for compat. */
      isPosted: boolean;
      // _v:3 additions
      status?: JournalEntryStatus;
      /** Set on a reversal entry pointing back to the original (BOOK-03). */
      reversesEntryId?: string;
      /** Set on a supersedes (edit) entry pointing back to the prior version (BOOK-02). */
      replacesEntryId?: string;
      /** Set on the prior version pointing forward to its replacement. */
      replacedByEntryId?: string;
      /** sha256(canonical rows + entityId + asAtDate) — set on opening-balances journal from IMP-05. */
      importFingerprint?: string;
    }

    export interface TrialBalanceRow {
      account: Account;
      debit: number;
      credit: number;
      balance: number;
      /** _v:3 — depth in CoA tree (0=root, 1=child, ...). */
      depth?: number;
      /** _v:3 — true if any other Account has parentCode === this.account.code. */
      isParent?: boolean;
      /** _v:3 — pre-aggregated child sums for parent rows. */
      childTotals?: { debit: number; credit: number; balance: number };
    }

    export interface ImportedAccount {
      externalCode: string;
      externalName: string;
      debit: number;
      credit: number;
      mappedAccountId?: string;
      confidence?: number;
      reasoning?: string;
    }

    /** Phase 4 widens the action enum to cover Phase 4 + 5 + 6 actions, avoiding a future v3→v4 migration. */
    export type AuditAction =
      | 'CREATE_ENTITY' | 'UPDATE_ENTITY' | 'DELETE_ENTITY'
      | 'POST_JOURNAL' | 'EDIT_JOURNAL' | 'REVERSE_JOURNAL' | 'VOID_JOURNAL' | 'DELETE_JOURNAL'
      | 'CREATE_ACCOUNT' | 'UPDATE_ACCOUNT' | 'ARCHIVE_ACCOUNT' | 'DELETE_ACCOUNT'
      | 'IMPORT_TB' | 'IMPORT_DATA' | 'EXPORT_DATA'
      | 'LOCK_FY' | 'UNLOCK_FY';

    export interface AuditLog {
      _v?: number;
      id: string;
      timestamp: string;
      user: string;
      action: AuditAction;
      entityId?: string;
      details: string;
    }
    ```

    NOTE: `DELETE_JOURNAL`, `IMPORT_DATA`, `UPDATE_ACCOUNT` are retained even though CONTEXT lists slightly different names — Phase 1-3 code already writes `DELETE_JOURNAL` and `IMPORT_DATA`, and removing them would break existing audit-log persistence. The Phase 5/6 names from CONTEXT (`EXPORT_DATA`, `LOCK_FY`, `UNLOCK_FY`) are added forward-compatibly.

    Step 3 — Widen `src/lib/schemas.ts`. Replace each schema with the v3 version. Final file:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { z } from 'zod';

    const ShareTypeRecord = z.object({
      interest: z.number().optional(),
      dividend: z.number().optional(),
      capitalGain: z.number().optional(),
      foreign: z.number().optional(),
      other: z.number().optional(),
    }).partial();

    export const BeneficiaryRowSchema = z.object({
      id: z.string(),
      name: z.string(),
      sharePercent: z.number(),
      sharePerType: ShareTypeRecord.optional(),
    });

    export const PartnerRowSchema = z.object({
      id: z.string(),
      name: z.string(),
      sharePercent: z.number(),
      sharePerType: ShareTypeRecord.optional(),
    });

    export const EntitySchema = z.object({
      _v: z.number().optional(),
      id: z.string(),
      name: z.string(),
      type: z.string(),
      registrationNumber: z.string().optional(),
      businessAddress: z.string().optional(),
      contactPerson: z.string().optional(),
      status: z.enum(['Active', 'Archived', 'Deactivated']),
      taxAgentName: z.string().optional(),
      taxAgentPhone: z.string().optional(),
      taxAgentEmail: z.string().optional(),
      notes: z.string().optional(),
      // v3 additions
      gstRegistered: z.boolean().optional(),
      accountingMethod: z.enum(['cash', 'accruals']).optional(),
      fyEndDate: z.string().optional(),
      lockedFys: z.array(z.string()).optional(),
      beneficiaries: z.array(BeneficiaryRowSchema).optional(),
      partners: z.array(PartnerRowSchema).optional(),
    });

    export const AccountSchema = z.object({
      _v: z.number().optional(),
      id: z.string(),
      code: z.string(),
      name: z.string(),
      type: z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']),
      taxLabel: z.string().optional(),
      companyTaxLabel: z.string().optional(),
      trustTaxLabel: z.string().optional(),
      partnershipTaxLabel: z.string().optional(),
      gstCode: z.enum(['GST', 'FRE', 'INP', 'N-T', 'CAP']),
      _needsReview: z.boolean().optional(),
      // v3 additions
      parentCode: z.string().nullable().optional(),
      isDefault: z.boolean().optional(),
      isArchived: z.boolean().optional(),
    });

    export const JournalLineSchema = z.object({
      _v: z.number().optional(),
      accountId: z.string(),
      description: z.string(),
      debit: z.number(),
      credit: z.number(),
      taxAmount: z.number(),
      isManualTax: z.boolean().optional(),
    });

    export const JournalEntryStatusEnum = z.enum(['draft', 'posted', 'superseded', 'reversed', 'voided']);

    export const JournalEntrySchema = z.object({
      _v: z.number().optional(),
      id: z.string(),
      date: z.string(),
      reference: z.string(),
      description: z.string(),
      lines: z.array(JournalLineSchema),
      isPosted: z.boolean(),
      // v3 additions
      status: JournalEntryStatusEnum.optional(),
      reversesEntryId: z.string().optional(),
      replacesEntryId: z.string().optional(),
      replacedByEntryId: z.string().optional(),
      importFingerprint: z.string().optional(),
    });

    export const AuditActionEnum = z.enum([
      'CREATE_ENTITY', 'UPDATE_ENTITY', 'DELETE_ENTITY',
      'POST_JOURNAL', 'EDIT_JOURNAL', 'REVERSE_JOURNAL', 'VOID_JOURNAL', 'DELETE_JOURNAL',
      'CREATE_ACCOUNT', 'UPDATE_ACCOUNT', 'ARCHIVE_ACCOUNT', 'DELETE_ACCOUNT',
      'IMPORT_TB', 'IMPORT_DATA', 'EXPORT_DATA',
      'LOCK_FY', 'UNLOCK_FY',
    ]);

    export const AuditLogSchema = z.object({
      _v: z.number().optional(),
      id: z.string(),
      timestamp: z.string(),
      user: z.string(),
      action: AuditActionEnum,
      entityId: z.string().optional(),
      details: z.string(),
    });

    export const PersistedRootSchema = z.object({
      _v: z.number(),
      entities: z.array(EntitySchema),
      accounts: z.array(AccountSchema),
      allEntries: z.record(z.string(), z.array(JournalEntrySchema)),
      auditLogs: z.array(AuditLogSchema),
    });

    export type ValidatedEntity = z.infer<typeof EntitySchema>;
    export type ValidatedAccount = z.infer<typeof AccountSchema>;
    export type ValidatedJournalEntry = z.infer<typeof JournalEntrySchema>;
    export type ValidatedAuditLog = z.infer<typeof AuditLogSchema>;
    export type ValidatedPersistedRoot = z.infer<typeof PersistedRootSchema>;
    ```

    Step 4 — Create `src/lib/migrations/v2-to-v3.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * Migration v2 → v3 (additive only — see Phase 4 CONTEXT.md decisions).
     *
     * Changes in _v:3:
     *   Account:        parentCode (default null), isDefault (default false), isArchived (default false)
     *   JournalEntry:   status (default from isPosted), reversesEntryId, replacesEntryId,
     *                    replacedByEntryId, importFingerprint
     *   Entity:         gstRegistered (default false), accountingMethod (default 'accruals'),
     *                    fyEndDate (default '06-30'), lockedFys (default []),
     *                    beneficiaries / partners stay undefined (Plan 04-3 fills them via UI)
     *   AuditLog.action: widened enum (see src/types.ts AuditAction) — older actions remain valid
     *
     * Idempotent: returns state unchanged if _v >= 3.
     */

    import type { Account, JournalEntry, Entity } from '../../types.js';
    import type { PersistedRoot } from './index.js';

    export function migrateV2ToV3(state: PersistedRoot): PersistedRoot {
      if (state._v >= 3) return state;

      const accounts = ((state.accounts as Account[] | undefined) ?? []).map((a): Account => ({
        ...a,
        parentCode: a.parentCode ?? null,
        isDefault: a.isDefault ?? false,
        isArchived: a.isArchived ?? false,
      }));

      const allEntriesRaw = (state.allEntries as Record<string, JournalEntry[]> | undefined) ?? {};
      const allEntries: Record<string, JournalEntry[]> = {};
      for (const [entityId, entries] of Object.entries(allEntriesRaw)) {
        allEntries[entityId] = entries.map((e): JournalEntry => ({
          ...e,
          status: e.status ?? (e.isPosted ? 'posted' : 'draft'),
        }));
      }

      const entities = ((state.entities as Entity[] | undefined) ?? []).map((e): Entity => ({
        ...e,
        gstRegistered: e.gstRegistered ?? false,
        accountingMethod: e.accountingMethod ?? 'accruals',
        fyEndDate: e.fyEndDate ?? '06-30',
        lockedFys: e.lockedFys ?? [],
      }));

      return {
        ...state,
        _v: 3,
        accounts,
        allEntries,
        entities,
      };
    }
    ```

    Step 5 — Update `src/lib/migrations/index.ts`. Diff:
    - Add `import { migrateV2ToV3 } from './v2-to-v3.js';`
    - Bump `export const CURRENT_VERSION = 2;` → `export const CURRENT_VERSION = 3;`
    - Add `2: migrateV2ToV3,` to the `MIGRATIONS` object
    Final file (entire content):
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */

    import { migrateV1ToV2 } from './v1-to-v2.js';
    import { migrateV2ToV3 } from './v2-to-v3.js';

    export interface PersistedRoot {
      _v: number;
      entities?: unknown;
      allEntries?: unknown;
      auditLogs?: unknown;
      accounts?: unknown;
    }

    type MigrationFn = (state: PersistedRoot) => PersistedRoot;

    const MIGRATIONS: Record<number, MigrationFn> = {
      0: (state) => ({ ...state, _v: 1 }),
      1: migrateV1ToV2,
      2: migrateV2ToV3,
    };

    export const CURRENT_VERSION = 3;

    export function migrate(raw: Record<string, unknown>): PersistedRoot {
      let state = { ...raw, _v: (raw._v as number) ?? 0 } as PersistedRoot;
      while (state._v < CURRENT_VERSION) {
        const migrationFn = MIGRATIONS[state._v];
        if (!migrationFn) {
          throw new Error(
            `No migration registered for version ${state._v}. Cannot upgrade to version ${CURRENT_VERSION}.`,
          );
        }
        state = migrationFn(state);
      }
      if (state._v > CURRENT_VERSION) {
        throw new Error(
          `Persisted data version ${state._v} is newer than the application version ${CURRENT_VERSION}. Refusing to downgrade.`,
        );
      }
      return state;
    }
    ```

    Step 6 — Create `src/lib/migrations/__tests__/v2-to-v3.test.ts` with the 8 default-assignment cases bound to 04-VALIDATION.md test names verbatim:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect } from 'vitest';
    import { migrateV2ToV3 } from '../v2-to-v3';
    import type { PersistedRoot } from '../index';

    function buildV2Root(overrides: Partial<PersistedRoot> = {}): PersistedRoot {
      return {
        _v: 2,
        entities: [{ id: 'e1', name: 'Co', type: 'Company', status: 'Active' }],
        accounts: [
          { id: 'a1', code: '1000', name: 'Cash', type: 'Asset', gstCode: 'N-T' },
          { id: 'a2', code: '4000', name: 'Sales', type: 'Revenue', gstCode: 'GST',
            taxLabel: '6S', companyTaxLabel: '6A' },
        ],
        allEntries: { e1: [
          { id: 'j1', date: '2026-01-15', reference: 'JE-001', description: 'Test', lines: [], isPosted: true },
          { id: 'j2', date: '2026-01-16', reference: 'JE-002', description: 'Draft', lines: [], isPosted: false },
        ] },
        auditLogs: [],
        ...overrides,
      };
    }

    describe('migrateV2ToV3', () => {
      it('Account parentCode default null', () => {
        const out = migrateV2ToV3(buildV2Root());
        const accs = (out.accounts as any[]);
        expect(accs[0].parentCode).toBeNull();
        expect(accs[1].parentCode).toBeNull();
      });

      it('Account isDefault default false', () => {
        const out = migrateV2ToV3(buildV2Root());
        const accs = (out.accounts as any[]);
        expect(accs[0].isDefault).toBe(false);
        expect(accs[1].isDefault).toBe(false);
      });

      it('JournalEntry status from isPosted', () => {
        const out = migrateV2ToV3(buildV2Root());
        const entries = (out.allEntries as any).e1;
        expect(entries[0].status).toBe('posted');
        expect(entries[1].status).toBe('draft');
      });

      it('Entity lockedFys default empty', () => {
        const out = migrateV2ToV3(buildV2Root());
        const ents = (out.entities as any[]);
        expect(ents[0].lockedFys).toEqual([]);
      });

      it('Entity gstRegistered default false', () => {
        const out = migrateV2ToV3(buildV2Root());
        const ents = (out.entities as any[]);
        expect(ents[0].gstRegistered).toBe(false);
      });

      it('Entity accountingMethod default accruals', () => {
        const out = migrateV2ToV3(buildV2Root());
        const ents = (out.entities as any[]);
        expect(ents[0].accountingMethod).toBe('accruals');
      });

      it('Entity fyEndDate default 06-30', () => {
        const out = migrateV2ToV3(buildV2Root());
        const ents = (out.entities as any[]);
        expect(ents[0].fyEndDate).toBe('06-30');
      });

      it('AuditLog action enum widened', () => {
        // Verify the migration ladder accepts new actions on round-trip
        const root = buildV2Root({
          auditLogs: [
            { id: 'al1', timestamp: '2026-01-15T00:00:00Z', user: 'u', action: 'EDIT_JOURNAL', details: '{}' },
            { id: 'al2', timestamp: '2026-01-15T00:00:00Z', user: 'u', action: 'REVERSE_JOURNAL', details: '{}' },
            { id: 'al3', timestamp: '2026-01-15T00:00:00Z', user: 'u', action: 'IMPORT_TB', details: '{}' },
          ] as any,
        });
        const out = migrateV2ToV3(root);
        expect(out._v).toBe(3);
        expect((out.auditLogs as any[]).length).toBe(3);
      });

      it('idempotent: applies once', () => {
        const out1 = migrateV2ToV3(buildV2Root());
        const out2 = migrateV2ToV3(out1);
        expect(out2).toEqual(out1);
      });

      it('preserves existing field values (non-destructive)', () => {
        const root = buildV2Root({
          entities: [{ id: 'e1', name: 'Pre-set', type: 'Trust', status: 'Active',
            gstRegistered: true, accountingMethod: 'cash', fyEndDate: '03-31',
            lockedFys: ['FY2024'] }] as any,
        });
        const out = migrateV2ToV3(root);
        const ent = (out.entities as any[])[0];
        expect(ent.gstRegistered).toBe(true);
        expect(ent.accountingMethod).toBe('cash');
        expect(ent.fyEndDate).toBe('03-31');
        expect(ent.lockedFys).toEqual(['FY2024']);
      });
    });
    ```

    Step 7 — Extend `src/lib/migrations/__tests__/round-trip.test.ts`. Read existing file first; add a new `it("v0 to v3 round-trip", …)` case alongside whatever's there:
    ```typescript
    it('v0 to v3 round-trip', () => {
      // Hand-built _v:0 blob (no _v field at all — pre-versioning prototype shape)
      const v0blob = {
        entities: [{ id: 'e1', name: 'Old Co', type: 'Company', status: 'Active' }],
        accounts: [
          { id: 'a1', code: '1000', name: 'Cash', type: 'Asset', gstCode: 'N-T' },
          { id: 'a2', code: '4000', name: 'Sales', type: 'Revenue', gstCode: 'GST' },
        ],
        allEntries: { e1: [
          { id: 'j1', date: '2026-01-15', reference: 'OLD-001', description: 'Old', lines: [
            { accountId: 'a1', description: '', debit: 100, credit: 0, taxAmount: 0 },
            { accountId: 'a2', description: '', debit: 0, credit: 100, taxAmount: 0 },
          ], isPosted: true },
        ] },
        auditLogs: [],
      };
      const out = migrate(v0blob);
      expect(out._v).toBe(3);
      // All original fields preserved
      expect((out.entities as any[])[0].name).toBe('Old Co');
      expect((out.accounts as any[]).length).toBe(2);
      expect(((out.allEntries as any).e1)[0].reference).toBe('OLD-001');
      // v2→v3 defaults applied
      expect((out.accounts as any[])[0].parentCode).toBeNull();
      expect((out.accounts as any[])[0].isDefault).toBe(false);
      expect(((out.allEntries as any).e1)[0].status).toBe('posted');
      expect((out.entities as any[])[0].lockedFys).toEqual([]);
      expect((out.entities as any[])[0].fyEndDate).toBe('06-30');
    });
    ```

    Step 8 — Verify:
    - `npm run lint` exits 0
    - `npm run test` exits 0 with 249 prior + 11 new (10 v2-to-v3 cases + 1 round-trip case) = 260+ GREEN
    - `npx vitest run src/lib/migrations` exits 0 with all migration tests GREEN
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npx vitest run src/lib/migrations</automated>
  </verify>
  <acceptance_criteria>
    - `package.json` `dependencies` contains literal `"papaparse": "^5.5.3"` and `"xlsx": "^0.20.3"`
    - `package.json` `devDependencies` contains literal `"@types/papaparse": "^5.3.16"`
    - `node_modules/papaparse/package.json` exists
    - `node_modules/xlsx/package.json` exists
    - `src/types.ts` contains literal `parentCode?: string | null;` AND `isDefault?: boolean;` AND `gstRegistered?: boolean;` AND `accountingMethod?: 'cash' | 'accruals';` AND `lockedFys?: string[];` AND `beneficiaries?: BeneficiaryRow[];` AND `reversesEntryId?: string;` AND `replacesEntryId?: string;` AND `importFingerprint?: string;` AND `export type JournalEntryStatus` AND `export type AuditAction` AND `'EDIT_JOURNAL' | 'REVERSE_JOURNAL' | 'VOID_JOURNAL'` AND `'EXPORT_DATA' | 'LOCK_FY' | 'UNLOCK_FY'`
    - `src/lib/schemas.ts` contains literal `export const BeneficiaryRowSchema` AND `parentCode: z.string().nullable().optional()` AND `gstRegistered: z.boolean().optional()` AND `JournalEntryStatusEnum` AND `'EDIT_JOURNAL'` (in AuditActionEnum)
    - `src/lib/migrations/index.ts` contains literal `export const CURRENT_VERSION = 3;` AND `2: migrateV2ToV3`
    - `src/lib/migrations/v2-to-v3.ts` exists and exports `migrateV2ToV3`
    - `src/lib/migrations/__tests__/v2-to-v3.test.ts` exists and contains literal `'Account parentCode default null'` AND `'JournalEntry status from isPosted'` AND `'Entity lockedFys default empty'` AND `'AuditLog action enum widened'`
    - `src/lib/migrations/__tests__/round-trip.test.ts` contains literal `'v0 to v3 round-trip'`
    - `npm run lint` exits 0
    - `npx vitest run src/lib/migrations` exits 0 — all migration tests GREEN
  </acceptance_criteria>
  <done>
    Phase-4 v3 types compile; schemas widened; migration v2→v3 lands as additive only; round-trip v0→v3 GREEN; deps installed. Plans 04-2 / 04-3 / 04-4 import directly from the widened type module — no further type design needed downstream.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Ship full Phase-4 CoA data layer — base 121-row spine + 4 per-type overlays + resolver + structural-integrity tests (all GREEN)</name>
  <files>
    src/lib/coa/types.ts,
    src/lib/coa/fy2026/base.ts,
    src/lib/coa/fy2026/individual.ts,
    src/lib/coa/fy2026/company.ts,
    src/lib/coa/fy2026/trust.ts,
    src/lib/coa/fy2026/partnership.ts,
    src/lib/coa/index.ts,
    src/lib/coa/__tests__/seed.test.ts
  </files>
  <read_first>
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-RESEARCH.md "Australian CoA & Tax-Label Pre-Mapping" — the full 121-row spine table (~lines 580–1000); use the rows VERBATIM
    - A:/Projects/AussieLedger/src/lib/tax/labels/fy2026.ts (existing tax-label constants for reference)
    - A:/Projects/AussieLedger/src/constants.ts (existing 16-row legacy CoA; the new modules SUPERSEDE this at the data layer; legacy file stays for compatibility but seeded entities use the new modules)
    - A:/Projects/AussieLedger/src/types.ts (Account shape post-Task-1)
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-CONTEXT.md "CoA shape (4 sub-decisions)"
  </read_first>
  <behavior>
    - `src/lib/coa/fy2026/base.ts` exports `FY2026_BASE_SPINE: DefaultAccountSeed[]` containing the 121 rows from RESEARCH.md "Default Australian SME Chart of Accounts" — 22 Assets + 18 Liabilities + 10 Equity + 15 Revenue + 6 COGS + 50 Expenses = 121 rows. Every row has the exact code/name/type/parentCode/gstCode/tax-label values from the RESEARCH table.
    - Per-type overlay files (`individual.ts`, `company.ts`, `trust.ts`, `partnership.ts`) export `FY2026_<TYPE>_OVERLAY: DefaultAccountSeed[]` — type-specific additional rows (10–20 each):
        - Individual overlay: Owner's Drawings sub-rows, Sole Trader expense categorisation refinements; NAT 2541 + 2543 specific labels
        - Company overlay: Shareholder Loans (Asset 1710), Director Loans (Asset 1720), Franking Account movements (Equity 3091/3092), Income Tax Expense (Expense 6900); NAT 0656 labels
        - Trust overlay: Beneficiary Distribution Clearing accounts (Equity 3071/3072); NAT 0660 labels
        - Partnership overlay: Partner Capital sub-rows (Equity 3081/3082); NAT 0659 labels
    - `src/lib/coa/index.ts` exports `getDefaultCoaFor(entityType: EntityCoaType, fy: string): Account[]`:
        - Throws if `fy !== 'FY2026'` (Phase 4 only ships FY2026)
        - Merges `FY2026_BASE_SPINE` with the per-type overlay (overlay rows MAY add new accounts OR override the tax labels on a base row — overlay wins per-field)
        - Produces `Account[]` with deterministic id `coa-FY2026-{code}` (so re-seeding for the same entity-type is idempotent)
        - Every returned Account has `isDefault: true`, `isArchived: false`
    - `src/lib/coa/__tests__/seed.test.ts` runs structural-integrity tests against every per-type CoA — all GREEN at end of Task 2 (this is pure data — Wave 0 owns it end-to-end):
        - 80 ≤ count ≤ 150 for every per-type CoA
        - No duplicate codes within any per-type CoA
        - Every `parentCode` resolves to an existing code in the same CoA (or is null)
        - Every Revenue + Expense account has at least one of `taxLabel`/`companyTaxLabel`/`trustTaxLabel`/`partnershipTaxLabel` set
        - Every GST code is in {GST, FRE, INP, N-T, CAP}
        - Every code is 4-digit and starts with the right prefix per type (1xxx Asset, 2xxx Liability, 3xxx Equity, 4xxx Revenue, 5xxx Expense (COGS), 6xxx Expense (Operating))
  </behavior>
  <action>
    Step 1 — Create `src/lib/coa/types.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import type { AccountType } from '../../types';

    /** Pure data shape — the seed table row. Hooks convert these to runtime Account[]. */
    export interface DefaultAccountSeed {
      code: string;                       // 4-digit (1xxx..6xxx)
      name: string;
      type: AccountType;
      parentCode: string | null;          // null for root headers
      gstCode: 'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP';
      taxLabel?: string;                  // Individual NAT 2541/2543 schedule labels (6S, 6K, 6L, 6N, 6Q)
      companyTaxLabel?: string;           // Company NAT 0656 (6A, 6F, 6X, 6C, 6G)
      trustTaxLabel?: string;             // Trust NAT 0660 (5B, 5E, 5F, 5L, 5M, 5N, 11J)
      partnershipTaxLabel?: string;       // Partnership NAT 0659 (P1, P2, P8)
      notes?: string;
    }

    /** Entity types that map to a per-type CoA overlay. */
    export type EntityCoaType = 'Individual' | 'Company' | 'Trust' | 'Partnership';
    ```

    Step 2 — Create `src/lib/coa/fy2026/base.ts`. Copy the 121 rows from RESEARCH.md "Default Australian SME Chart of Accounts (~120 rows, FY2026)" VERBATIM into a single `FY2026_BASE_SPINE` array. The full row set is (taking the 6 sections from RESEARCH ~lines 580–1000):

    - **Assets (22 rows)** — codes 1000 (header), 1010 Cash on Hand, 1020 Business Bank Account, 1030 Business Savings Account, 1040 Petty Cash, 1100 Accounts Receivable, 1110 Provision for Doubtful Debts, 1200 Inventory, 1300 Prepayments, 1310 GST Receivable, 1500 (header), 1510 Plant & Equipment, 1515 Accum Depreciation Plant, 1520 Motor Vehicles, 1525 Accum Depreciation MV, 1530 Office Equipment, 1535 Accum Depreciation Office, 1540 Buildings, 1545 Accum Depreciation Buildings, 1550 Land, 1600 Intangible Assets, 1700 Loans to Directors / Owners
    - **Liabilities (18 rows)** — 2000 (header), 2010 Accounts Payable, 2020 Credit Card, 2100 GST Collected, 2110 GST Paid, 2120 PAYG Withholding Payable, 2130 PAYG Income Tax Instalment Payable, 2140 Superannuation Payable, 2150 Wages Payable, 2160 Income Tax Payable, 2170 Dividends Payable, 2200 Customer Deposits, 2300 Provision for Annual Leave, 2310 Provision for Long Service Leave, 2500 (header), 2510 Bank Loan, 2520 Hire Purchase Liability, 2530 Lease Liability
    - **Equity (10 rows)** — 3000 (header), 3010 Owner's Capital Contribution, 3020 Owner's Drawings, 3030 Issued and Paid-Up Capital, 3040 Retained Earnings, 3050 Current-Year Profit/Loss, 3060 Dividends Paid, 3070 Trust Distribution to Beneficiaries, 3080 Partner Distribution, 3090 Franking Account Balance
    - **Revenue (15 rows)** — 4000 (header), 4010 Sales of Goods, 4020 Sales of Services, 4030 Consulting Income, 4040 Commission Income, 4100 Export Sales (GST-Free), 4110 Other GST-Free Sales, 4200 Interest Income, 4210 Dividend Income Franked, 4220 Dividend Income Unfranked, 4300 Residential Rental Income, 4310 Commercial Rental Income, 4400 Royalties Received, 4500 Other Income, 4600 Insurance Recoveries
    - **COGS (6 rows)** — 5000 (header), 5010 Opening Stock, 5020 Purchases, 5030 Direct Labour, 5040 Subcontractor Costs, 5050 Closing Stock
    - **Operating Expenses (50 rows)** — 6000 (header) plus codes 6010, 6020, 6030, 6040, 6050, 6060, 6070, 6080, 6090, 6100, 6110, 6120, 6130, 6140, 6200, 6210, 6220, 6230, 6240, 6250, 6300, 6310, 6320, 6330, 6340, 6400, 6410, 6420, 6430, 6440, 6500, 6510, 6520, 6530, 6540, 6600, 6610, 6620, 6630, 6700, 6710, 6720, 6730, 6740, 6800, 6810, 6820, 6830, 6900 — names + GST + label columns per RESEARCH (Wages, Directors' Fees, Superannuation, ... through to Income Tax Expense at 6900)

    Format (one row example — replicate for all 121):
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import type { DefaultAccountSeed } from '../types';

    /**
     * Australian SME default Chart of Accounts spine — FY2026.
     * 121 rows; codes per Xero AU / MYOB AU convention (1xxx Asset, 2xxx Liability,
     * 3xxx Equity, 4xxx Revenue, 5xxx COGS, 6xxx Expense).
     *
     * Source: src/.planning/phases/04-bookkeeping-core/04-RESEARCH.md
     * "Default Australian SME Chart of Accounts (~120 rows, FY2026)" — verbatim.
     */
    export const FY2026_BASE_SPINE: DefaultAccountSeed[] = [
      // Assets (22 rows)
      { code: '1000', name: 'Current Assets',        type: 'Asset', parentCode: null,  gstCode: 'N-T' },
      { code: '1010', name: 'Cash on Hand',          type: 'Asset', parentCode: '1000', gstCode: 'N-T' },
      { code: '1020', name: 'Business Bank Account', type: 'Asset', parentCode: '1000', gstCode: 'N-T' },
      // ... continue for all 22 Asset rows ...

      // Liabilities (18 rows)
      { code: '2000', name: 'Current Liabilities',   type: 'Liability', parentCode: null,  gstCode: 'N-T' },
      // ...

      // Equity (10 rows)
      { code: '3000', name: 'Equity',                type: 'Equity', parentCode: null,  gstCode: 'N-T' },
      // ...

      // Revenue (15 rows) — every Revenue row has at least one tax label
      { code: '4000', name: 'Income',                type: 'Revenue', parentCode: null,  gstCode: 'N-T' },
      { code: '4010', name: 'Sales of Goods',        type: 'Revenue', parentCode: '4000', gstCode: 'GST',
        taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B', partnershipTaxLabel: 'P1' },
      // ...

      // COGS (6 rows)
      { code: '5000', name: 'Cost of Sales',         type: 'Expense', parentCode: null,  gstCode: 'N-T' },
      // ...

      // Operating Expenses (50 rows)
      { code: '6000', name: 'Operating Expenses',    type: 'Expense', parentCode: null,  gstCode: 'N-T' },
      // ...
    ];
    ```

    **CRITICAL:** the executor MUST transcribe all 121 rows from RESEARCH lines ~580–1000 verbatim — codes, names, parent codes, GST codes, and the four tax-label columns. The structural-integrity tests in Step 7 enforce that:
    - Total row count is between 110 and 130 (allows minor off-by-one when filling the table; target 121)
    - No duplicate codes
    - Every non-null `parentCode` resolves
    - Every Revenue and every Expense row that is NOT a header (parentCode === null is header) has at least one tax-label field set
    - Every GST code is in the AU 5-set

    Step 3 — Create `src/lib/coa/fy2026/individual.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import type { DefaultAccountSeed } from '../types';

    /**
     * Sole Trader / Individual overlay — extends the FY2026 base spine with sole-trader-
     * specific accounts and refines tax-label pre-mappings to NAT 2541 (Individual return)
     * + NAT 2543 (Business and Professional Items schedule) labels.
     *
     * Overlay rows MAY add new codes OR override fields on existing base rows
     * (overlay wins per-field at merge time in src/lib/coa/index.ts).
     */
    export const FY2026_INDIVIDUAL_OVERLAY: DefaultAccountSeed[] = [
      // Sole-trader-specific Owner's Drawings sub-rows (under 3020 Owner's Drawings)
      { code: '3021', name: "Owner's Drawings — Cash",         type: 'Equity',  parentCode: '3020', gstCode: 'N-T' },
      { code: '3022', name: "Owner's Personal Expenses Paid",  type: 'Equity',  parentCode: '3020', gstCode: 'N-T' },
      // P8 net small business income tracker
      { code: '4150', name: 'Personal Services Income',         type: 'Revenue', parentCode: '4000', gstCode: 'GST',
        taxLabel: 'P1', partnershipTaxLabel: 'P1' },
    ];
    ```

    Step 4 — Create `src/lib/coa/fy2026/company.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import type { DefaultAccountSeed } from '../types';

    /** Company overlay — Pty Ltd specific. NAT 0656 labels. */
    export const FY2026_COMPANY_OVERLAY: DefaultAccountSeed[] = [
      { code: '1710', name: 'Loan to Shareholder',              type: 'Asset',     parentCode: '1700', gstCode: 'N-T',
        notes: 'Div 7A tracking' },
      { code: '1720', name: 'Loan to Director',                 type: 'Asset',     parentCode: '1700', gstCode: 'N-T',
        notes: 'Div 7A tracking' },
      { code: '3091', name: 'Franking Account Credits',         type: 'Equity',    parentCode: '3090', gstCode: 'N-T',
        notes: 'COY-03 placeholder' },
      { code: '3092', name: 'Franking Account Debits',          type: 'Equity',    parentCode: '3090', gstCode: 'N-T',
        notes: 'COY-03 placeholder' },
      { code: '6910', name: 'Income Tax Expense — Company',     type: 'Expense',   parentCode: '6900', gstCode: 'N-T',
        companyTaxLabel: '7T' },
    ];
    ```

    Step 5 — Create `src/lib/coa/fy2026/trust.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import type { DefaultAccountSeed } from '../types';

    /** Trust overlay — Beneficiary distribution clearing accounts. NAT 0660 labels. */
    export const FY2026_TRUST_OVERLAY: DefaultAccountSeed[] = [
      { code: '3071', name: 'Beneficiary Distribution Clearing',    type: 'Equity', parentCode: '3070', gstCode: 'N-T',
        notes: 'Holds per-beneficiary distributions before year-end transfer to 3070' },
      { code: '3072', name: 'Trust Income to Distribute',           type: 'Equity', parentCode: '3070', gstCode: 'N-T',
        trustTaxLabel: '26' },
    ];
    ```

    Step 6 — Create `src/lib/coa/fy2026/partnership.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import type { DefaultAccountSeed } from '../types';

    /** Partnership overlay — Partner Capital sub-rows. NAT 0659 labels. */
    export const FY2026_PARTNERSHIP_OVERLAY: DefaultAccountSeed[] = [
      { code: '3081', name: 'Partner Capital — Partner A',          type: 'Equity', parentCode: '3080', gstCode: 'N-T' },
      { code: '3082', name: 'Partner Capital — Partner B',          type: 'Equity', parentCode: '3080', gstCode: 'N-T' },
      { code: '3083', name: 'Partner Drawings — Partner A',         type: 'Equity', parentCode: '3080', gstCode: 'N-T' },
      { code: '3084', name: 'Partner Drawings — Partner B',         type: 'Equity', parentCode: '3080', gstCode: 'N-T' },
    ];
    ```

    Step 7 — Create `src/lib/coa/index.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import type { Account } from '../../types';
    import type { DefaultAccountSeed, EntityCoaType } from './types';
    import { FY2026_BASE_SPINE } from './fy2026/base';
    import { FY2026_INDIVIDUAL_OVERLAY } from './fy2026/individual';
    import { FY2026_COMPANY_OVERLAY } from './fy2026/company';
    import { FY2026_TRUST_OVERLAY } from './fy2026/trust';
    import { FY2026_PARTNERSHIP_OVERLAY } from './fy2026/partnership';

    export type { DefaultAccountSeed, EntityCoaType };

    function pickOverlay(type: EntityCoaType): DefaultAccountSeed[] {
      switch (type) {
        case 'Individual':   return FY2026_INDIVIDUAL_OVERLAY;
        case 'Company':      return FY2026_COMPANY_OVERLAY;
        case 'Trust':        return FY2026_TRUST_OVERLAY;
        case 'Partnership':  return FY2026_PARTNERSHIP_OVERLAY;
      }
    }

    /**
     * Resolve the default CoA for a given entity type and FY label.
     *
     * Phase 4 ships only FY2026. Other FY labels throw.
     *
     * Merge rules: overlay rows that match a base row by `code` override base fields
     * per-field (only fields that are set on the overlay take effect). Overlay rows
     * with new codes are appended.
     */
    export function getDefaultCoaFor(entityType: EntityCoaType, fy: string): Account[] {
      if (fy !== 'FY2026') {
        throw new Error(`No default CoA available for ${fy} — only FY2026 is shipped in Phase 4.`);
      }

      const overlay = pickOverlay(entityType);
      const merged: Record<string, DefaultAccountSeed> = Object.fromEntries(
        FY2026_BASE_SPINE.map((row) => [row.code, row]),
      );

      for (const o of overlay) {
        const existing = merged[o.code];
        merged[o.code] = existing
          ? {
              ...existing,
              ...Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)),
            }
          : o;
      }

      return Object.values(merged).map((seed): Account => ({
        _v: 3,
        id: `coa-${fy}-${seed.code}`,
        code: seed.code,
        name: seed.name,
        type: seed.type,
        parentCode: seed.parentCode,
        gstCode: seed.gstCode,
        taxLabel: seed.taxLabel,
        companyTaxLabel: seed.companyTaxLabel,
        trustTaxLabel: seed.trustTaxLabel,
        partnershipTaxLabel: seed.partnershipTaxLabel,
        isDefault: true,
        isArchived: false,
      }));
    }
    ```

    Step 8 — Create `src/lib/coa/__tests__/seed.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect } from 'vitest';
    import { getDefaultCoaFor, type EntityCoaType } from '../index';
    import type { Account } from '../../../types';

    const ENTITY_TYPES: EntityCoaType[] = ['Individual', 'Company', 'Trust', 'Partnership'];
    const AU_GST = ['GST', 'FRE', 'INP', 'N-T', 'CAP'];

    function isHeader(a: Account): boolean {
      return a.parentCode === null || a.parentCode === undefined;
    }

    describe('Default CoA structural integrity (per entity type)', () => {
      it('Company default CoA size', () => {
        const coa = getDefaultCoaFor('Company', 'FY2026');
        expect(coa.length).toBeGreaterThanOrEqual(80);
        expect(coa.length).toBeLessThanOrEqual(150);
      });

      it('per-type CoA sizes', () => {
        for (const t of ENTITY_TYPES) {
          const coa = getDefaultCoaFor(t, 'FY2026');
          expect(coa.length, `${t} CoA size`).toBeGreaterThanOrEqual(80);
          expect(coa.length, `${t} CoA size`).toBeLessThanOrEqual(150);
        }
      });

      it('no duplicate codes', () => {
        for (const t of ENTITY_TYPES) {
          const coa = getDefaultCoaFor(t, 'FY2026');
          const codes = coa.map((a) => a.code);
          expect(new Set(codes).size).toBe(codes.length);
        }
      });

      it('parent codes resolve', () => {
        for (const t of ENTITY_TYPES) {
          const coa = getDefaultCoaFor(t, 'FY2026');
          const codeSet = new Set(coa.map((a) => a.code));
          for (const a of coa) {
            if (a.parentCode !== null && a.parentCode !== undefined) {
              expect(codeSet.has(a.parentCode), `${t} ${a.code} parent ${a.parentCode} resolves`).toBe(true);
            }
          }
        }
      });

      it('tax label coverage', () => {
        for (const t of ENTITY_TYPES) {
          const coa = getDefaultCoaFor(t, 'FY2026');
          for (const a of coa) {
            if (isHeader(a)) continue;
            if (a.type === 'Revenue' || a.type === 'Expense') {
              const hasAny =
                Boolean(a.taxLabel) ||
                Boolean(a.companyTaxLabel) ||
                Boolean(a.trustTaxLabel) ||
                Boolean(a.partnershipTaxLabel);
              expect(hasAny, `${t} account ${a.code} ${a.name} has at least one tax label`).toBe(true);
            }
          }
        }
      });

      it('GST codes in AU set', () => {
        for (const t of ENTITY_TYPES) {
          const coa = getDefaultCoaFor(t, 'FY2026');
          for (const a of coa) {
            expect(AU_GST).toContain(a.gstCode);
          }
        }
      });

      it('codes are 4-digit and follow type prefix convention', () => {
        for (const t of ENTITY_TYPES) {
          const coa = getDefaultCoaFor(t, 'FY2026');
          for (const a of coa) {
            expect(a.code, `${a.code} is 4 digits`).toMatch(/^\d{4}$/);
            const prefix = a.code[0];
            const expected = {
              Asset:     '1',
              Liability: '2',
              Equity:    '3',
              Revenue:   '4',
              Expense:   ['5', '6'],
            }[a.type];
            const ok = Array.isArray(expected) ? expected.includes(prefix) : prefix === expected;
            expect(ok, `${t} ${a.code} type ${a.type} has prefix ${prefix} matching ${JSON.stringify(expected)}`).toBe(true);
          }
        }
      });

      it('throws on unsupported FY', () => {
        expect(() => getDefaultCoaFor('Company', 'FY2025')).toThrow(/only FY2026/);
        expect(() => getDefaultCoaFor('Company', 'FY2027')).toThrow(/only FY2026/);
      });

      it('every default account isDefault=true and isArchived=false', () => {
        const coa = getDefaultCoaFor('Company', 'FY2026');
        for (const a of coa) {
          expect(a.isDefault).toBe(true);
          expect(a.isArchived).toBe(false);
        }
      });

      it('deterministic ids — re-call returns same id per code', () => {
        const a = getDefaultCoaFor('Company', 'FY2026');
        const b = getDefaultCoaFor('Company', 'FY2026');
        const aById = Object.fromEntries(a.map((x) => [x.code, x.id]));
        const bById = Object.fromEntries(b.map((x) => [x.code, x.id]));
        expect(aById).toEqual(bById);
      });
    });
    ```

    Step 9 — Verify:
    - `npm run lint` exits 0
    - `npx vitest run src/lib/coa` exits 0 — all seed tests GREEN
    - `npm run test` exits 0 with all prior tests preserved
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npx vitest run src/lib/coa</automated>
  </verify>
  <acceptance_criteria>
    - `src/lib/coa/types.ts` contains literal `export interface DefaultAccountSeed` AND `export type EntityCoaType`
    - `src/lib/coa/fy2026/base.ts` contains literal `export const FY2026_BASE_SPINE` AND between 110 and 130 row entries (Assets+Liabilities+Equity+Revenue+COGS+Expenses)
    - `src/lib/coa/fy2026/individual.ts` exports `FY2026_INDIVIDUAL_OVERLAY`
    - `src/lib/coa/fy2026/company.ts` exports `FY2026_COMPANY_OVERLAY`
    - `src/lib/coa/fy2026/trust.ts` exports `FY2026_TRUST_OVERLAY`
    - `src/lib/coa/fy2026/partnership.ts` exports `FY2026_PARTNERSHIP_OVERLAY`
    - `src/lib/coa/index.ts` exports `getDefaultCoaFor`
    - `src/lib/coa/__tests__/seed.test.ts` contains literal `'Company default CoA size'` AND `'per-type CoA sizes'` AND `'no duplicate codes'` AND `'parent codes resolve'` AND `'tax label coverage'` AND `'GST codes in AU set'`
    - `npx vitest run src/lib/coa` exits 0 — all tests GREEN
    - `npm run lint` exits 0
  </acceptance_criteria>
  <done>
    Four per-type default CoAs ship as pure data; structural integrity holds; resolver merges base + overlay deterministically; downstream plans (04-3 for UI, 04-2 for TB subtotals) consume `getDefaultCoaFor` directly.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Ship pure-function ledger.ts (validateBalanced + makeReversal + makeSupersedingEdit + searchJournals) + fingerprint helper + CSV/XLSX thin library wrappers + all related GREEN unit tests</name>
  <files>
    src/lib/ledger.ts,
    src/lib/__tests__/ledger.test.ts,
    src/lib/import/fingerprint.ts,
    src/lib/import/__tests__/fingerprint.test.ts,
    src/lib/import/csv.ts,
    src/lib/import/xlsx.ts,
    src/lib/import/__tests__/csv.test.ts,
    src/lib/import/__tests__/xlsx.test.ts
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/lib/money.ts (Decimal export + arithmetic helpers)
    - A:/Projects/AussieLedger/src/lib/period.ts (today + isInPeriod + Period type)
    - A:/Projects/AussieLedger/src/lib/import/match.ts (HIGH_CONFIDENCE_THRESHOLD; consumed by 04-4 not Wave 0)
    - A:/Projects/AussieLedger/src/types.ts (v3 widened types from Task 1)
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-RESEARCH.md "Pattern 1: The Posting Engine" + Example 3 + Example 4 + Example 6 — copy the algorithms verbatim
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-RESEARCH.md Example 1 (PapaParse config) + Example 2 (SheetJS)
  </read_first>
  <behavior>
    - `src/lib/ledger.ts` exports four pure functions and one error class. No React. No adapter calls. No `new Date()`.
        - `validateBalanced(lines: JournalLine[]): void` — uses `Decimal` from `../money`; throws `JournalNotBalancedError` on imbalance; throws plain Error on `lines.length < 2`; allows imbalance up to 0.005 (banker's-rounding cents tolerance)
        - `makeReversal(original: JournalEntry, reversalDate?: string): JournalEntry` — produces a new entry with mirrored D/C, new UUID, `reversesEntryId: original.id`, `status: 'posted'`, `isPosted: true`, reference prefixed `REV-`; if `reversalDate` undefined, uses `today().toISOString().split('T')[0]`
        - `makeSupersedingEdit(original: JournalEntry, edits: Partial<JournalEntry>): JournalEntry` — produces a new entry with `replacesEntryId: original.id`, `status: 'posted'`, fresh UUID; runs `validateBalanced(replacement.lines)` internally and throws if unbalanced
        - `searchJournals(entries, filters): JournalEntry[]` — filters by reference (substring, case-insensitive), description (substring), accountId (any line matches), dateFrom/dateTo (inclusive ISO strings), amountFrom/amountTo (any line's debit or credit in range); returns a new array
    - `src/lib/__tests__/ledger.test.ts` covers (every test name bound to 04-VALIDATION.md verbatim):
        - `validates balance to 2dp` — {33.33, 33.33, 33.34} = 100.00 balances
        - `throws JournalNotBalancedError` — {100.00 D, 99.99 C} throws
        - `rejects fewer than 2 lines`
        - `makeReversal mirrors lines` — D/C swapped; reversesEntryId set; new id
        - `makeSupersedingEdit replacesEntryId` — set on new entry
        - `makeSupersedingEdit throws on unbalanced edit`
        - `searchJournals reference and description`
        - `searchJournals by account`
        - `searchJournals by amount range`
        - `searchJournals by date range`
        - `searchJournals perf 1000 entries` — runs `searchJournals` over a generated 1000-entry list in <50 ms (Vitest `expect(duration).toBeLessThan(50)`)
    - `src/lib/import/fingerprint.ts` exports `computeImportFingerprint(rows, mapping, entityId, asAtDate): Promise<string>`:
        - Uses `crypto.subtle.digest('SHA-256', encoded)` — Node 20+ exposes this; jsdom carries it through Node
        - Canonicalises by trimming each column, parsing debit/credit as `Number(x).toFixed(2)`, joining with `|`, sorting rows
        - Returns hex string (64 chars)
    - `src/lib/import/__tests__/fingerprint.test.ts` covers `stable across row reorder`, `differs by entityId`, `differs by asAtDate`, `stable across whitespace differences`
    - `src/lib/import/csv.ts` exports `parseCsvFile(file: File): Promise<{ rows: RawRow[]; headers: string[] }>` — thin PapaParse wrapper per RESEARCH Example 1 (header: true, skipEmptyLines: 'greedy', dynamicTyping: false, transformHeader trim)
    - `src/lib/import/xlsx.ts` exports `parseXlsxFile(file: File): Promise<{ rows, headers, sheetNames }>` and `pickSheetByName(wb, name): RawRow[]` — thin SheetJS wrapper per RESEARCH Example 2; uses `XLSX.read(buf, { type: 'array' })` + `XLSX.utils.sheet_to_json` with `{ defval: '', raw: false }`
    - `src/lib/import/__tests__/csv.test.ts` has at least: `handles UTF-8 BOM`, `parses CSV with quoted commas`, `skips empty rows greedy`
    - `src/lib/import/__tests__/xlsx.test.ts` has at least: `parses xlsx first sheet`, `returns sheetNames array`
  </behavior>
  <action>
    Step 1 — Create `src/lib/ledger.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * Posting engine — pure functions only. No React. No adapter I/O. No `new Date()`.
     * Decimal arithmetic via src/lib/money.ts (Phase 1 boundary).
     */
    import { Decimal } from './money';
    import type { JournalEntry, JournalLine } from '../types';
    import { today } from './period';

    export class JournalNotBalancedError extends Error {
      constructor(public debit: string, public credit: string) {
        super(`Journal not balanced: D=${debit} C=${credit}`);
        this.name = 'JournalNotBalancedError';
      }
    }

    /** Tolerance for banker's-rounding cent drift across many lines. */
    const BALANCE_TOLERANCE = '0.005';

    /**
     * Decimal-exact balance check; throws on imbalance or insufficient lines.
     * Use BEFORE persisting (BOOK-01 data-layer enforcement).
     */
    export function validateBalanced(lines: JournalLine[]): void {
      if (lines.length < 2) {
        throw new Error('Journal must have at least 2 lines');
      }
      const d = lines.reduce((s, l) => s.plus(new Decimal(l.debit || 0)), new Decimal(0));
      const c = lines.reduce((s, l) => s.plus(new Decimal(l.credit || 0)), new Decimal(0));
      const diff = d.minus(c).abs();
      if (diff.greaterThan(BALANCE_TOLERANCE)) {
        throw new JournalNotBalancedError(d.toFixed(2), c.toFixed(2));
      }
    }

    /**
     * Build a reversal entry that mirrors debits/credits of the original.
     * Original is NOT mutated. The reversal is itself a posted entry with
     * reversesEntryId pointing back. (BOOK-03)
     */
    export function makeReversal(original: JournalEntry, reversalDate?: string): JournalEntry {
      const date = reversalDate ?? today().toISOString().split('T')[0];
      return {
        _v: 3,
        id: crypto.randomUUID(),
        date,
        reference: `REV-${original.reference}`,
        description: `Reversal of ${original.reference}: ${original.description}`,
        lines: original.lines.map((l): JournalLine => ({
          _v: 3,
          accountId: l.accountId,
          description: l.description,
          debit: l.credit,     // swap
          credit: l.debit,     // swap
          taxAmount: -l.taxAmount,
          isManualTax: l.isManualTax,
        })),
        isPosted: true,
        status: 'posted',
        reversesEntryId: original.id,
      };
    }

    /**
     * Produce a superseding edit — a new entry with replacesEntryId pointing back
     * to the original. Caller is responsible for marking the original as
     * `status: 'superseded'` + `replacedByEntryId: <new id>` in their hook state.
     * Throws JournalNotBalancedError if `edits.lines` is provided and unbalanced.
     */
    export function makeSupersedingEdit(
      original: JournalEntry,
      edits: Partial<Pick<JournalEntry, 'date' | 'reference' | 'description' | 'lines'>>,
    ): JournalEntry {
      const lines = edits.lines ?? original.lines;
      validateBalanced(lines);
      return {
        ...original,
        ...edits,
        _v: 3,
        id: crypto.randomUUID(),
        lines,
        isPosted: true,
        status: 'posted',
        replacesEntryId: original.id,
        // Strip any old supersession pointer so chains stay clean
        replacedByEntryId: undefined,
        reversesEntryId: undefined,
      };
    }

    export interface SearchFilters {
      reference?: string;
      description?: string;
      accountId?: string;
      dateFrom?: string;     // ISO YYYY-MM-DD inclusive
      dateTo?: string;       // ISO YYYY-MM-DD inclusive
      amountFrom?: number;   // matches any line whose debit or credit >= amountFrom
      amountTo?: number;     // matches any line whose debit or credit <= amountTo
    }

    /**
     * Filter journal entries by BOOK-12 criteria. Pure function — no I/O.
     */
    export function searchJournals(
      entries: JournalEntry[],
      filters: SearchFilters,
    ): JournalEntry[] {
      const refQ = filters.reference?.toLowerCase().trim() ?? '';
      const descQ = filters.description?.toLowerCase().trim() ?? '';
      const accId = filters.accountId?.trim() ?? '';
      const amtFrom = typeof filters.amountFrom === 'number' ? filters.amountFrom : -Infinity;
      const amtTo = typeof filters.amountTo === 'number' ? filters.amountTo : Infinity;
      const dateFrom = filters.dateFrom ?? '';
      const dateTo = filters.dateTo ?? '';

      return entries.filter((e) => {
        if (refQ && !e.reference.toLowerCase().includes(refQ)) return false;
        if (descQ && !e.description.toLowerCase().includes(descQ)) return false;
        if (dateFrom && e.date < dateFrom) return false;
        if (dateTo && e.date > dateTo) return false;

        if (accId) {
          if (!e.lines.some((l) => l.accountId === accId)) return false;
        }

        if (filters.amountFrom !== undefined || filters.amountTo !== undefined) {
          const hit = e.lines.some((l) => {
            const debitInRange = l.debit > 0 && l.debit >= amtFrom && l.debit <= amtTo;
            const creditInRange = l.credit > 0 && l.credit >= amtFrom && l.credit <= amtTo;
            return debitInRange || creditInRange;
          });
          if (!hit) return false;
        }

        return true;
      });
    }
    ```

    Step 2 — Create `src/lib/__tests__/ledger.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect, beforeEach, afterEach } from 'vitest';
    import {
      validateBalanced,
      makeReversal,
      makeSupersedingEdit,
      searchJournals,
      JournalNotBalancedError,
    } from '../ledger';
    import { _setNowProvider, _resetNowProvider } from '../period';
    import type { JournalEntry, JournalLine } from '../../types';

    function mkLine(d: number, c: number, accountId = 'a1'): JournalLine {
      return { accountId, description: '', debit: d, credit: c, taxAmount: 0 };
    }

    function mkEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
      return {
        id: overrides.id ?? crypto.randomUUID(),
        date: '2026-01-15',
        reference: 'JE-001',
        description: 'Test',
        lines: [mkLine(100, 0, 'a1'), mkLine(0, 100, 'a2')],
        isPosted: true,
        status: 'posted',
        ...overrides,
      };
    }

    describe('validateBalanced (BOOK-01)', () => {
      it('validates balance to 2dp', () => {
        // 33.33 + 33.33 + 33.34 = 100.00
        expect(() =>
          validateBalanced([
            mkLine(33.33, 0),
            mkLine(33.33, 0),
            mkLine(33.34, 0),
            mkLine(0, 100),
          ]),
        ).not.toThrow();
      });

      it('throws JournalNotBalancedError', () => {
        expect(() => validateBalanced([mkLine(100, 0), mkLine(0, 99.99)])).toThrow(JournalNotBalancedError);
      });

      it('rejects fewer than 2 lines', () => {
        expect(() => validateBalanced([mkLine(100, 0)])).toThrow(/at least 2/);
        expect(() => validateBalanced([])).toThrow(/at least 2/);
      });
    });

    describe('makeReversal (BOOK-03)', () => {
      beforeEach(() => _setNowProvider(() => new Date('2026-02-01T00:00:00Z')));
      afterEach(() => _resetNowProvider());

      it('mirrors lines', () => {
        const original = mkEntry();
        const rev = makeReversal(original);
        expect(rev.lines[0].debit).toBe(original.lines[0].credit);
        expect(rev.lines[0].credit).toBe(original.lines[0].debit);
      });

      it('reversesEntryId link', () => {
        const original = mkEntry({ id: 'orig-1' });
        const rev = makeReversal(original);
        expect(rev.reversesEntryId).toBe('orig-1');
        expect(rev.id).not.toBe('orig-1');
        expect(rev.status).toBe('posted');
        expect(rev.reference.startsWith('REV-')).toBe(true);
      });

      it('defaults reversal date to today()', () => {
        const rev = makeReversal(mkEntry());
        expect(rev.date).toBe('2026-02-01');
      });
    });

    describe('makeSupersedingEdit (BOOK-02)', () => {
      it('sets replacesEntryId on new entry', () => {
        const orig = mkEntry({ id: 'orig-1' });
        const sup = makeSupersedingEdit(orig, { description: 'Edited' });
        expect(sup.replacesEntryId).toBe('orig-1');
        expect(sup.id).not.toBe('orig-1');
        expect(sup.description).toBe('Edited');
      });

      it('throws on unbalanced edit', () => {
        const orig = mkEntry();
        expect(() =>
          makeSupersedingEdit(orig, { lines: [mkLine(100, 0), mkLine(0, 50)] }),
        ).toThrow(JournalNotBalancedError);
      });
    });

    describe('searchJournals (BOOK-12)', () => {
      const ENTRIES: JournalEntry[] = [
        mkEntry({ id: '1', reference: 'INV-001', description: 'Sale to ABC', date: '2026-01-10',
          lines: [mkLine(500, 0, 'a-cash'), mkLine(0, 500, 'a-sales')] }),
        mkEntry({ id: '2', reference: 'INV-002', description: 'Sale to XYZ', date: '2026-02-15',
          lines: [mkLine(120, 0, 'a-cash'), mkLine(0, 120, 'a-sales')] }),
        mkEntry({ id: '3', reference: 'BILL-100', description: 'Rent', date: '2026-03-01',
          lines: [mkLine(2000, 0, 'a-rent'), mkLine(0, 2000, 'a-cash')] }),
      ];

      it('searchJournals reference and description', () => {
        expect(searchJournals(ENTRIES, { reference: 'inv' }).map((e) => e.id)).toEqual(['1', '2']);
        expect(searchJournals(ENTRIES, { description: 'rent' }).map((e) => e.id)).toEqual(['3']);
      });

      it('searchJournals by account', () => {
        expect(searchJournals(ENTRIES, { accountId: 'a-rent' }).map((e) => e.id)).toEqual(['3']);
        expect(searchJournals(ENTRIES, { accountId: 'a-cash' }).map((e) => e.id)).toEqual(['1', '2', '3']);
      });

      it('searchJournals by amount range', () => {
        // Match any line whose debit OR credit falls in [400, 600]
        expect(searchJournals(ENTRIES, { amountFrom: 400, amountTo: 600 }).map((e) => e.id)).toEqual(['1']);
      });

      it('searchJournals by date range', () => {
        expect(searchJournals(ENTRIES, { dateFrom: '2026-02-01', dateTo: '2026-02-28' }).map((e) => e.id))
          .toEqual(['2']);
      });

      it('searchJournals perf 1000 entries', () => {
        const big: JournalEntry[] = Array.from({ length: 1000 }, (_, i) =>
          mkEntry({
            id: `e-${i}`,
            reference: `R-${i}`,
            description: `D-${i}`,
            lines: [mkLine(i, 0, `a-${i % 50}`), mkLine(0, i, 'a-bank')],
          }),
        );
        const t0 = performance.now();
        const out = searchJournals(big, { accountId: 'a-bank', amountFrom: 500, amountTo: 600 });
        const t1 = performance.now();
        expect(out.length).toBeGreaterThan(0);
        expect(t1 - t0).toBeLessThan(50);
      });
    });
    ```

    Step 3 — Create `src/lib/import/fingerprint.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */

    /** Column-mapping shape used by the import flow. */
    export interface ColumnMappingByName {
      code: string;
      name: string;
      debit: string;
      credit: string;
    }

    export type RawRow = Record<string, string>;

    /**
     * Compute sha256 fingerprint that is:
     *   - stable across row reorder (rows are sorted by code before hashing)
     *   - stable across whitespace differences (trim each cell)
     *   - stable across debit/credit number formatting (Number(x).toFixed(2))
     *   - distinct per entityId
     *   - distinct per asAtDate
     */
    export async function computeImportFingerprint(
      rows: RawRow[],
      mapping: ColumnMappingByName,
      entityId: string,
      asAtDate: string,
    ): Promise<string> {
      const canonical = rows
        .map((r) => {
          const code = (r[mapping.code] ?? '').trim();
          const name = (r[mapping.name] ?? '').trim();
          const debit = Number(r[mapping.debit] ?? 0).toFixed(2);
          const credit = Number(r[mapping.credit] ?? 0).toFixed(2);
          return `${code}|${name}|${debit}|${credit}`;
        })
        .sort()
        .join('\n');
      const payload = `${entityId}|${asAtDate}|${canonical}`;
      const bytes = new TextEncoder().encode(payload);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    ```

    Step 4 — Create `src/lib/import/__tests__/fingerprint.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect } from 'vitest';
    import { computeImportFingerprint, type RawRow } from '../fingerprint';

    const MAPPING = { code: 'Code', name: 'Name', debit: 'Debit', credit: 'Credit' };

    function rows(): RawRow[] {
      return [
        { Code: '1000', Name: 'Cash',  Debit: '500.00', Credit: '0.00' },
        { Code: '4000', Name: 'Sales', Debit: '0.00',   Credit: '500.00' },
      ];
    }

    describe('computeImportFingerprint (IMP-05)', () => {
      it('stable across row reorder', async () => {
        const a = await computeImportFingerprint(rows(), MAPPING, 'e1', '2026-06-30');
        const reordered: RawRow[] = [...rows()].reverse();
        const b = await computeImportFingerprint(reordered, MAPPING, 'e1', '2026-06-30');
        expect(a).toBe(b);
      });

      it('stable across whitespace differences', async () => {
        const a = await computeImportFingerprint(rows(), MAPPING, 'e1', '2026-06-30');
        const padded: RawRow[] = rows().map((r) => ({
          Code: ' ' + r.Code + ' ',
          Name: r.Name + '  ',
          Debit: r.Debit,
          Credit: r.Credit,
        }));
        const b = await computeImportFingerprint(padded, MAPPING, 'e1', '2026-06-30');
        expect(a).toBe(b);
      });

      it('differs by entityId', async () => {
        const a = await computeImportFingerprint(rows(), MAPPING, 'e1', '2026-06-30');
        const b = await computeImportFingerprint(rows(), MAPPING, 'e2', '2026-06-30');
        expect(a).not.toBe(b);
      });

      it('differs by asAtDate', async () => {
        const a = await computeImportFingerprint(rows(), MAPPING, 'e1', '2026-06-30');
        const b = await computeImportFingerprint(rows(), MAPPING, 'e1', '2025-06-30');
        expect(a).not.toBe(b);
      });

      it('returns 64-char hex string', async () => {
        const a = await computeImportFingerprint(rows(), MAPPING, 'e1', '2026-06-30');
        expect(a).toMatch(/^[0-9a-f]{64}$/);
      });
    });
    ```

    Step 5 — Create `src/lib/import/csv.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import Papa from 'papaparse';
    import type { RawRow } from './fingerprint';

    export interface ParsedCsv {
      rows: RawRow[];
      headers: string[];
    }

    export async function parseCsvFile(file: File): Promise<ParsedCsv> {
      return new Promise((resolve, reject) => {
        Papa.parse<RawRow>(file, {
          header: true,
          skipEmptyLines: 'greedy',
          dynamicTyping: false,
          transformHeader: (h) => h.trim(),
          complete: (result) => {
            if (result.errors.length > 0) {
              reject(new Error(result.errors.map((e) => e.message).join('; ')));
              return;
            }
            resolve({ rows: result.data, headers: result.meta.fields ?? [] });
          },
          error: (err) => reject(err),
        });
      });
    }

    /** Parse raw CSV TEXT (no File wrapper) — used by tests. */
    export function parseCsvText(text: string): ParsedCsv {
      const result = Papa.parse<RawRow>(text, {
        header: true,
        skipEmptyLines: 'greedy',
        dynamicTyping: false,
        transformHeader: (h) => h.trim(),
      });
      return { rows: result.data, headers: result.meta.fields ?? [] };
    }
    ```

    Step 6 — Create `src/lib/import/xlsx.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import * as XLSX from 'xlsx';
    import type { RawRow } from './fingerprint';

    export interface ParsedXlsx {
      rows: RawRow[];          // rows from the first sheet (or sheetNames[0])
      headers: string[];
      sheetNames: string[];    // all sheets in the workbook
    }

    export async function parseXlsxFile(file: File): Promise<ParsedXlsx> {
      const buf = await file.arrayBuffer();
      return parseXlsxBuffer(buf);
    }

    export function parseXlsxBuffer(buf: ArrayBuffer): ParsedXlsx {
      const wb = XLSX.read(buf, { type: 'array' });
      const sheetNames = wb.SheetNames;
      const firstSheet = wb.Sheets[sheetNames[0]];
      const rows = firstSheet
        ? XLSX.utils.sheet_to_json<RawRow>(firstSheet, { defval: '', raw: false })
        : [];
      const headers = Object.keys(rows[0] ?? {});
      return { rows, headers, sheetNames };
    }

    /** Read a specific sheet by name from a parsed workbook buffer. */
    export function pickSheetByName(buf: ArrayBuffer, sheetName: string): { rows: RawRow[]; headers: string[] } {
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[sheetName];
      if (!sheet) throw new Error(`Sheet "${sheetName}" not found. Available: ${wb.SheetNames.join(', ')}`);
      const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '', raw: false });
      const headers = Object.keys(rows[0] ?? {});
      return { rows, headers };
    }
    ```

    Step 7 — Create `src/lib/import/__tests__/csv.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect } from 'vitest';
    import { parseCsvText } from '../csv';

    describe('parseCsvText (IMP-01)', () => {
      it('handles UTF-8 BOM', () => {
        const csv = '﻿Code,Name,Debit,Credit\n1000,Cash,500.00,0.00\n4000,Sales,0.00,500.00\n';
        const { rows, headers } = parseCsvText(csv);
        expect(headers).toEqual(['Code', 'Name', 'Debit', 'Credit']);
        expect(rows[0].Code).toBe('1000');
      });

      it('parses CSV with quoted commas', () => {
        const csv = 'Code,Name,Debit,Credit\n1000,"Cash, on hand",500.00,0.00\n';
        const { rows } = parseCsvText(csv);
        expect(rows[0].Name).toBe('Cash, on hand');
      });

      it('skips empty rows greedy', () => {
        const csv = 'Code,Name,Debit,Credit\n1000,Cash,500.00,0.00\n\n\n4000,Sales,0.00,500.00\n';
        const { rows } = parseCsvText(csv);
        expect(rows.length).toBe(2);
      });

      it('trims surrounding whitespace from headers', () => {
        const csv = ' Code ,  Name ,Debit, Credit \n1000,Cash,500.00,0.00\n';
        const { headers } = parseCsvText(csv);
        expect(headers).toEqual(['Code', 'Name', 'Debit', 'Credit']);
      });
    });
    ```

    Step 8 — Create `src/lib/import/__tests__/xlsx.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect } from 'vitest';
    import * as XLSX from 'xlsx';
    import { parseXlsxBuffer, pickSheetByName } from '../xlsx';

    function buildWorkbook(): ArrayBuffer {
      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.aoa_to_sheet([
        ['Code', 'Name', 'Debit', 'Credit'],
        ['1000', 'Cash',  '500.00', '0.00'],
        ['4000', 'Sales', '0.00',   '500.00'],
      ]);
      const ws2 = XLSX.utils.aoa_to_sheet([
        ['Code', 'Name', 'Debit', 'Credit'],
        ['6100', 'Rent', '2000.00', '0.00'],
      ]);
      XLSX.utils.book_append_sheet(wb, ws1, 'Trial Balance');
      XLSX.utils.book_append_sheet(wb, ws2, 'Other');
      return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    }

    describe('parseXlsxBuffer (IMP-01)', () => {
      it('parses xlsx first sheet', () => {
        const buf = buildWorkbook();
        const { rows, headers, sheetNames } = parseXlsxBuffer(buf);
        expect(rows.length).toBe(2);
        expect(headers).toEqual(['Code', 'Name', 'Debit', 'Credit']);
        expect(sheetNames).toEqual(['Trial Balance', 'Other']);
      });

      it('returns sheetNames array', () => {
        const buf = buildWorkbook();
        const { sheetNames } = parseXlsxBuffer(buf);
        expect(sheetNames).toContain('Trial Balance');
        expect(sheetNames).toContain('Other');
      });

      it('pickSheetByName reads named sheet', () => {
        const buf = buildWorkbook();
        const { rows } = pickSheetByName(buf, 'Other');
        expect(rows[0].Code).toBe('6100');
      });

      it('pickSheetByName throws on unknown sheet', () => {
        const buf = buildWorkbook();
        expect(() => pickSheetByName(buf, 'NotThere')).toThrow(/not found/);
      });
    });
    ```

    Step 9 — Verify:
    - `npx vitest run src/lib/__tests__/ledger.test.ts src/lib/import` exits 0 — all GREEN
    - `npm run lint` exits 0
    - `npm run test` continues GREEN with new tests added
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npx vitest run src/lib/__tests__/ledger.test.ts src/lib/import</automated>
  </verify>
  <acceptance_criteria>
    - `src/lib/ledger.ts` exports `validateBalanced`, `makeReversal`, `makeSupersedingEdit`, `searchJournals`, `JournalNotBalancedError`
    - `src/lib/__tests__/ledger.test.ts` contains literals `'validates balance to 2dp'` AND `'throws JournalNotBalancedError'` AND `'rejects fewer than 2 lines'` AND `'reversesEntryId link'` AND `'replacesEntryId'` AND `'searchJournals reference and description'` AND `'searchJournals by account'` AND `'searchJournals by amount range'` AND `'searchJournals perf 1000 entries'`
    - `src/lib/import/fingerprint.ts` exports `computeImportFingerprint`
    - `src/lib/import/__tests__/fingerprint.test.ts` contains literals `'stable across row reorder'` AND `'differs by entityId'` AND `'differs by asAtDate'`
    - `src/lib/import/csv.ts` exports `parseCsvFile` AND `parseCsvText`
    - `src/lib/import/xlsx.ts` exports `parseXlsxFile` AND `parseXlsxBuffer` AND `pickSheetByName`
    - `src/lib/import/__tests__/csv.test.ts` contains literal `'handles UTF-8 BOM'`
    - `src/lib/import/__tests__/xlsx.test.ts` contains literal `'parses xlsx first sheet'`
    - `npx vitest run src/lib/__tests__/ledger.test.ts src/lib/import` exits 0 with all tests GREEN
    - `npm run lint` exits 0
  </acceptance_criteria>
  <done>
    Pure-function ledger engine + fingerprint helper + CSV/XLSX wrappers ship with full unit-test coverage. 04-2 wires `useJournals.editPosted/reversePosted/voidDraft` through `makeReversal` + `makeSupersedingEdit`. 04-4 wires `ImportTB.tsx` through `parseCsvFile` + `parseXlsxFile` + `computeImportFingerprint`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Scaffold all remaining hook + component test files (RED by design — will GREEN in 04-2 / 04-3 / 04-4)</name>
  <files>
    src/hooks/__tests__/useJournals.test.ts,
    src/hooks/__tests__/useEntities.test.ts,
    src/components/__tests__/AccountManager.test.tsx,
    src/components/__tests__/EntityForm.test.tsx,
    src/components/__tests__/ImportTB.test.tsx,
    src/components/__tests__/JournalForm.test.tsx,
    src/components/__tests__/JournalSearch.test.tsx,
    src/components/__tests__/TrialBalance.test.tsx,
    src/components/__tests__/BeneficiaryRegister.test.tsx,
    src/components/__tests__/PartnerRegister.test.tsx,
    src/components/__tests__/XlsxSheetPicker.test.tsx,
    src/components/__tests__/ImportReviewPane.test.tsx
  </files>
  <read_first>
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-VALIDATION.md (per-task verification map — every test name below is bound to that map)
    - A:/Projects/AussieLedger/src/hooks/__tests__/useJournals.test.ts (existing — extend, don't replace)
    - A:/Projects/AussieLedger/src/hooks/__tests__/useEntities.test.ts (existing — extend)
    - A:/Projects/AussieLedger/src/components/__tests__/AccountManager.test.tsx (existing — extend)
    - A:/Projects/AussieLedger/src/components/__tests__/EntityForm.test.tsx (existing — extend)
    - A:/Projects/AussieLedger/src/components/__tests__/ImportTB.test.tsx (existing — extend)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-1-PLAN.md `Task 2` (pattern: `it.todo()` skeletons with VALIDATION-bound test names)
  </read_first>
  <behavior>
    - Every test scaffold compiles (imports satisfy `tsc --noEmit`)
    - Test names match 04-VALIDATION.md verbatim so plans 04-2/04-3/04-4 know exactly which `-t` strings to flip GREEN
    - Where the production source file doesn't yet exist (e.g. `JournalSearch.tsx`, `BeneficiaryRegister.tsx`), the test file uses `it.todo()` placeholders and DOES NOT import the not-yet-existing module — this keeps `tsc --noEmit` green
    - Where the production source file already exists (e.g. `JournalForm.tsx`, `EntityForm.tsx`, `AccountManager.tsx`, `ImportTB.tsx`), the new tests can render the current component but assert on Phase-4 behaviour that doesn't yet exist — those assertions are `it.todo()` or `it.skip()` until 04-2/04-3/04-4 land the behaviour
    - `npm run lint` exits 0; `npm run test` exits 0 with all existing tests preserved and new TODOs counted
  </behavior>
  <action>
    Step 1 — Extend `src/hooks/__tests__/useJournals.test.ts` (read the file first; preserve all existing tests; append a new `describe('Phase 4 — supersession + reversal + void + audit (BOOK-02..04, BOOK-11)')` block with these `.todo`s):
    ```typescript
    describe('Phase 4 — supersession + reversal + void + audit (BOOK-02..04, BOOK-11)', () => {
      it.todo('postDraft enforces balance at data layer');
      it.todo('editPosted supersedes original');
      it.todo('editPosted writes EDIT_JOURNAL audit with before snapshot');
      it.todo('EDIT_JOURNAL audit has before snapshot');
      it.todo('reversePosted mirrors lines');
      it.todo('reversePosted writes REVERSE_JOURNAL audit');
      it.todo('reversesEntryId link');
      it.todo('voidDraft only on drafts');
      it.todo('voidDraft refuses posted');
      it.todo('searchJournals reference and description');
      it.todo('searchJournals by account');
      it.todo('searchJournals by amount range');
    });
    ```

    Step 2 — Extend `src/hooks/__tests__/useEntities.test.ts` (append):
    ```typescript
    describe('Phase 4 — default-CoA seeding on entity creation (BOOK-05)', () => {
      it.todo('creates default CoA per type');
      it.todo('Trust entity gets BeneficiaryRow placeholder ready');
      it.todo('Partnership entity gets PartnerRow placeholder ready');
      it.todo('archiveEntity sets status Archived');
      it.todo('deleteEntity refuses if journals reference entity, suggests Archive');
    });
    ```

    Step 3 — Extend `src/components/__tests__/AccountManager.test.tsx` (append):
    ```typescript
    describe('Phase 4 — AccountManager refactor (BOOK-06, BOOK-07)', () => {
      it.todo('tree view parents first');
      it.todo('archive only for default');
      it.todo('GST dropdown is AU set');
      it.todo('archive vs delete dialog appears for default account');
      it.todo('shows per-entity-type template badge');
      it.todo('archived accounts hidden from default view');
      it.todo('archived accounts surface via filter toggle');
    });
    ```

    Step 4 — Extend `src/components/__tests__/EntityForm.test.tsx` (append):
    ```typescript
    describe('Phase 4 — EntityForm v3 widening (ENT-01/03/04/05/06)', () => {
      it.todo('AU four entity types only');
      it.todo('gstRegistered toggle');
      it.todo('accountingMethod radio');
      it.todo('fyEndDate default 06-30');
      it.todo('delete blocked with journals offers Archive');
      it.todo('Trust entity shows BeneficiaryRegister tab');
      it.todo('Partnership entity shows PartnerRegister tab');
    });
    ```

    Step 5 — Extend `src/components/__tests__/ImportTB.test.tsx` (append):
    ```typescript
    describe('Phase 4 — ImportTB refactor (IMP-01..06)', () => {
      it.todo('column mapping UI confirmation');
      it.todo('deterministic path works without AI');
      it.todo('fingerprint Skip Replace dialog');
      it.todo('single opening journal posted');
      it.todo('XLSX flow opens sheet picker when multi-sheet');
      it.todo('XLSX flow auto-selects single matching sheet');
    });
    ```

    Step 6 — Create `src/components/__tests__/JournalForm.test.tsx`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';
    // Phase 4 Plan 04-2 will widen JournalForm with edit + reverse buttons + diff preview.

    describe('JournalForm (BOOK-02 banner + diff)', () => {
      it.todo('edit banner and diff preview');
      it.todo('renders Edit button on posted entries');
      it.todo('renders Reverse button on posted entries');
      it.todo('diff preview highlights changed lines');
      it.todo('confirm-supersede dialog appears before save');
    });
    ```

    Step 7 — Create `src/components/__tests__/JournalSearch.test.tsx`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';
    // Phase 4 Plan 04-2 will create JournalSearch.tsx (filter panel for BOOK-12).

    describe('JournalSearch (BOOK-12)', () => {
      it.todo('renders all five filters');
      it.todo('reference filter calls searchJournals');
      it.todo('account filter populates from accounts prop');
      it.todo('amount range numeric inputs');
      it.todo('date range pickers default to FY current');
    });
    ```

    Step 8 — Create `src/components/__tests__/TrialBalance.test.tsx`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';
    // Phase 4 Plan 04-2 will refactor TrialBalance to add period filter + parent subtotals.

    describe('TrialBalance Phase 4 refactor (BOOK-07, BOOK-09)', () => {
      it.todo('period filter');
      it.todo('parent subtotals');
      it.todo('excludes voided superseded draft');
      it.todo('balanced footer');
      it.todo('reversal entries net to zero in TB');
    });
    ```

    Step 9 — Create `src/components/__tests__/BeneficiaryRegister.test.tsx`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';
    // Phase 4 Plan 04-3 will create BeneficiaryRegister.tsx (Trust tab on EntityForm).

    describe('BeneficiaryRegister (ENT-07)', () => {
      it.todo('renders for Trust entity');
      it.todo('stores sharePercent only in UI');
      it.todo('add row appends new BeneficiaryRow');
      it.todo('remove row removes existing');
      it.todo('total sharePercent warning when not 100');
    });
    ```

    Step 10 — Create `src/components/__tests__/PartnerRegister.test.tsx`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';
    // Phase 4 Plan 04-3 will create PartnerRegister.tsx (Partnership tab on EntityForm).

    describe('PartnerRegister (ENT-08)', () => {
      it.todo('renders for Partnership entity');
      it.todo('add row appends new PartnerRow');
      it.todo('total sharePercent warning when not 100');
    });
    ```

    Step 11 — Create `src/components/__tests__/XlsxSheetPicker.test.tsx`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';
    // Phase 4 Plan 04-4 will create XlsxSheetPicker.tsx (modal for multi-sheet XLSX).

    describe('XlsxSheetPicker (IMP-01)', () => {
      it.todo('auto-selects single matching sheet');
      it.todo('modal shown when multiple sheets');
      it.todo('regex matches trial / TB / balance case-insensitive');
      it.todo('user pick fires onSelect with sheet name');
    });
    ```

    Step 12 — Create `src/components/__tests__/ImportReviewPane.test.tsx`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it } from 'vitest';
    // Phase 4 Plan 04-4 will create ImportReviewPane.tsx (row-level review UI).

    describe('ImportReviewPane (IMP-03)', () => {
      it.todo('auto-applies high confidence');
      it.todo('create new account option');
      it.todo('per-row include/exclude toggle');
      it.todo('per-row edit-inline');
      it.todo('reject whole import button');
    });
    ```

    Step 13 — Verify:
    - `npm run lint` exits 0 (all scaffolds compile)
    - `npm run test` exits 0 with all existing tests preserved + 50+ new `.todo` entries
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npm run test</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/__tests__/JournalForm.test.tsx` exists and contains literal `'edit banner and diff preview'`
    - `src/components/__tests__/JournalSearch.test.tsx` exists and contains literal `'renders all five filters'`
    - `src/components/__tests__/TrialBalance.test.tsx` exists and contains literals `'period filter'` AND `'parent subtotals'` AND `'excludes voided superseded draft'`
    - `src/components/__tests__/BeneficiaryRegister.test.tsx` exists and contains literal `'renders for Trust entity'`
    - `src/components/__tests__/PartnerRegister.test.tsx` exists and contains literal `'renders for Partnership entity'`
    - `src/components/__tests__/XlsxSheetPicker.test.tsx` exists and contains literal `'auto-selects single matching sheet'`
    - `src/components/__tests__/ImportReviewPane.test.tsx` exists and contains literal `'auto-applies high confidence'`
    - `src/hooks/__tests__/useJournals.test.ts` contains literal `'editPosted supersedes original'` (appended)
    - `src/hooks/__tests__/useEntities.test.ts` contains literal `'creates default CoA per type'` (appended)
    - `src/components/__tests__/AccountManager.test.tsx` contains literal `'tree view parents first'` (appended)
    - `src/components/__tests__/EntityForm.test.tsx` contains literal `'gstRegistered toggle'` (appended)
    - `src/components/__tests__/ImportTB.test.tsx` contains literal `'column mapping UI confirmation'` (appended)
    - `npm run lint` exits 0
    - `npm run test` exits 0 — no existing tests regress
  </acceptance_criteria>
  <done>
    All 12 hook/component test files exist with VALIDATION-bound test names. Plans 04-2 / 04-3 / 04-4 flip these scaffolds GREEN as they ship implementation.
  </done>
</task>

</tasks>

<verification>
After all four tasks complete:

1. `npm run lint` exits 0
2. `npx vitest run src/lib/migrations src/lib/coa src/lib/__tests__/ledger.test.ts src/lib/import` exits 0 — all Wave 0 GREEN tests pass (~50+ new GREEN cases)
3. `npm run test` exits 0 — 249 prior SPA tests preserved + Wave 0 GREEN tests + ~50 new TODOs
4. `npm run test:server` exits 0 — Phase 3 server tests untouched
5. `node_modules/papaparse/package.json` AND `node_modules/xlsx/package.json` exist
6. `src/types.ts` is the canonical v3 widened type module (no other file defines `JournalEntryStatus` / `AuditAction` / `BeneficiaryRow` / `PartnerRow`)
7. `src/lib/migrations/index.ts` has `CURRENT_VERSION = 3` AND registers v2-to-v3
8. `src/lib/coa/index.ts` `getDefaultCoaFor('Company', 'FY2026')` returns 80-150 accounts
9. `src/lib/ledger.ts` exports four pure functions; tests cover decimal-edge, supersession, reversal, search filters, and perf budget
10. `src/lib/import/fingerprint.ts` `computeImportFingerprint` returns 64-char hex; idempotent across row order/whitespace; distinct per entityId/asAtDate
11. All 12 hook/component test files have Phase-4 scaffolds with `it.todo` placeholders
12. The StorageAdapter interface in `src/storage/adapter.ts` is untouched (verify with: `git diff src/storage/adapter.ts` → empty)
</verification>

<success_criteria>
- Success criterion #1 (CoA browsable, 80–150 AU SME accounts grouped under parents) — DATA layer met by `src/lib/coa/fy2026/*` + `getDefaultCoaFor`; UI wiring deferred to 04-3
- Success criterion #2 (journal CRUD with edit + reverse; both in audit trail) — engine layer met by `src/lib/ledger.ts` (`makeReversal` + `makeSupersedingEdit`); hook/UI wiring deferred to 04-2
- Success criterion #3 (CSV/XLSX import + column mapping + fuzzy match + AI-optional) — parsing layer met by `src/lib/import/{csv,xlsx}.ts`; UI flow deferred to 04-4
- Success criterion #4 (idempotent re-import) — engine layer met by `src/lib/import/fingerprint.ts`; UI dialog deferred to 04-4
- Success criterion #5 (Trust beneficiary + Partnership partner registers) — type layer met by `Entity.beneficiaries` + `Entity.partners` + `BeneficiaryRow` + `PartnerRow`; UI tabs deferred to 04-3
- StorageAdapter interface untouched (Phase 3 FINAL preserved)
- v2 → v3 migration is additive only — `round-trip.test.ts -t "v0 to v3 round-trip"` passes
- 6 of 23 phase requirements have their pure-data/pure-logic layers met (BOOK-01, BOOK-05, BOOK-07, BOOK-11, BOOK-12, IMP-05); the other 17 are bound to test scaffolds with VALIDATION-tied names ready for 04-2/04-3/04-4 to flip GREEN
- New test counts (rough): +10 v2-to-v3 cases, +1 round-trip case, +9 CoA seed cases, +11 ledger cases, +5 fingerprint cases, +4 csv cases, +4 xlsx cases ≈ 44 new GREEN cases
- Approximately 50 new `.todo` cases across 12 hook/component test files (Wave 2/3 owners)
</success_criteria>

<output>
After completion, create `.planning/phases/04-bookkeeping-core/04-1-SUMMARY.md` summarising:
- Files created (count + key paths — including the new `src/lib/coa/`, `src/lib/ledger.ts`, `src/lib/import/{csv,xlsx,fingerprint}.ts`, `src/lib/migrations/v2-to-v3.ts`)
- Files modified (count: `package.json`, `src/types.ts`, `src/lib/schemas.ts`, `src/lib/migrations/index.ts`, plus extended test files)
- Tests: count GREEN / RED / TODO (expected: 249 prior + ~44 new GREEN + ~50 new TODO; 0 RED)
- Dependency installation (papaparse + xlsx + @types/papaparse) status
- Confirmation that StorageAdapter interface is untouched (`git diff src/storage/adapter.ts` empty)
- v3 migration round-trip verification (v0 → v3 round-trip GREEN)
- Hand-off to 04-2 / 04-3 / 04-4: all three can begin once 04-1 is committed; they share the FINAL v3 type module + the FINAL CoA modules + the FINAL pure-function engine + the FINAL fingerprint helper
- Per-task verification map cross-reference: every test scaffold name from 04-VALIDATION.md exists in a real test file
</output>
