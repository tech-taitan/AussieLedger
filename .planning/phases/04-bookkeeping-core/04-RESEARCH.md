---
phase: 4
slug: bookkeeping-core
type: research
mode: ecosystem
status: complete
created: 2026-05-12
researcher: claude (gsd-phase-researcher)
---

# Phase 4: Bookkeeping Core — Research

**Researched:** 2026-05-12
**Domain:** Double-entry GL + AU SME CoA + GST/tax-label pre-mapping + CSV/XLSX trial-balance import + entity registers
**Confidence:** HIGH on library choices and structural patterns; HIGH on AU CoA seed (verified against published Xero template); MEDIUM-HIGH on ATO label mapping (cross-referenced against FY2026 NAT instructions); MEDIUM on reversing-entry/audit-trail event semantics (general accounting pattern, not project-specific verification)

---

## Summary

Phase 4 is the largest content phase of the project (23 requirements). The work splits into four sub-areas and the research has four independent risk profiles:

1. **CoA scaffold** is the highest-risk surface — but the risk is content (the actual 80–150 accounts and their ATO label pre-mappings), not architecture. A canonical, publicly-published Xero AU default chart of accounts (300+ rows, see Sources) is the strongest single reference and is used as the spine of the recommended seed.
2. **Journal CRUD + audit** is mostly architecture: the data shapes for edit-vs-reversal vs void must be designed once, correctly. The current `JournalEntry` type is missing the linkage fields (`reversesEntryId`, `replacesEntryId`, `replacedByEntryId`, `status`) needed for a defensible audit trail; the `AuditLog.action` enum is missing `EDIT_JOURNAL`, `REVERSE_JOURNAL`, `VOID_JOURNAL`, `IMPORT_TB`. Both will be additive migrations (v2→v3 of the persisted root).
3. **Trial Balance** is the simplest sub-area — it's a fold over `journalLines` filtered by `isInPeriod()` from `src/lib/period.ts`, grouped by accountId, with parent-row roll-ups derived from a separate `parentCode` field on `Account`.
4. **Import + AU registers** is solved by two well-established libraries (PapaParse for CSV, SheetJS xlsx CE for XLSX) plus a deterministic column-mapping flow that re-uses the existing `src/lib/import/match.ts` Levenshtein-based matcher.

**Primary recommendation:** Build a new `src/lib/ledger.ts` posting engine (balance enforcement, reversal linkage, audit emission) and a new FY-versioned `src/lib/coa/fy2026.ts` data module (the 80–150-row seed). Do NOT hand-roll CSV or XLSX parsing. Do NOT widen the `StorageAdapter` interface — all new persistence rides on existing `saveAccounts`, `saveAllEntries`, `saveEntities`, `saveAuditLogs`. Add a v2→v3 migration that adds `parentCode` to Account and `status`/`reversesEntryId` to JournalEntry. The reversing-entry pattern is "second posted entry with mirrored debit/credit and a `reversesEntryId` foreign key" — the original is never mutated.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

**No CONTEXT.md exists for Phase 4 yet.** This research is being run before `/gsd:discuss-phase 4`. The planner will surface the decisions below to the user via `discuss-phase` — they are recommendations, not locked decisions.

### Recommended decisions to lock in /gsd:discuss-phase 4

- **CoA scope:** seed ~120 accounts derived from the Xero AU default template (Sources §1), trimmed of agricultural/specialist surfaces (PPS/RPS income, Wine Equalisation Tax, Luxury Car Tax — these are v2 deferrals already documented in REQUIREMENTS.md).
- **CoA module location:** `src/lib/coa/fy2026.ts` (mirrors `src/lib/tax/labels/fy2026.ts` cadence).
- **Reversing-entry pattern:** original never mutated; reversal is a second posted JournalEntry with `reversesEntryId` set; both appear in the audit log.
- **Edit semantics:** edit a POSTED entry creates a new entry version (`replacesEntryId` set) — the prior version is kept and marked `status: 'superseded'`.
- **Idempotent re-import key:** `sha256(sortedRows + period + entityId)` stored on the opening-balances JournalEntry as `importFingerprint`; re-importing same file is a no-op.
- **Beneficiary/partner registers:** added as `beneficiaries: TrustBeneficiary[]` and `partners: PartnershipPartner[]` arrays on the `Entity` type (Phase 5 Form T / Form P consumes them via `entity.beneficiaries`).

### Claude's Discretion (research recommends — confirm in discuss)

- Schema migration version bump: v2 → v3 (additive only).
- Library versions pinned: `papaparse@^5.5.3`, `xlsx@^0.20.3` (SheetJS CE, Apache 2.0).
- Use the existing `src/lib/import/match.ts` Levenshtein matcher unchanged (it already meets IMP-03; do NOT swap to Fuse.js — that's added complexity for no IMP-03 win).

### Deferred Ideas (OUT OF SCOPE for Phase 4 — explicit per ROADMAP.md)

- All Phase 5 tax outputs (Form C, Form T, Form I, Form P, BAS, IAS).
- Per-report CSV export (P&L CSV / BAS export CSV) — Phase 5.
- Trust streaming income-class breakdown on beneficiary records (data model placeholder only; not consumed in Phase 4).
- Bank-statement CSV import (v2 deferral, REC-01).
- AI-assisted matching IMP-04 — already wired in Phase 3 server proxy; Phase 4 ensures deterministic path works fully without AI (FND-04 invariant).
- Soft-delete for entities and accounts — Phase 4 uses status flags and `archived` only; hard-delete is gated by cascade-vs-block check (ENT-06).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BOOK-01 | Journal entry, 2+ lines, debits = credits, enforced at DATA LAYER | New `src/lib/ledger.ts` `assertBalanced()` called by both `useJournals.addEntry` and `useJournals.editEntry`; Decimal-based comparison via existing `src/lib/money.ts` |
| BOOK-02 | Edit posted entry; original preserved in audit log | `replacesEntryId` linkage on JournalEntry; `EDIT_JOURNAL` audit-log action with before/after snapshot serialised into `AuditLog.details` |
| BOOK-03 | Reverse posted entry; reversal references original | `reversesEntryId` linkage on JournalEntry; `REVERSE_JOURNAL` audit-log action; `ledger.makeReversal(original)` helper produces the mirrored entry |
| BOOK-04 | Void/delete a draft (unposted) entry | `JournalEntry.isPosted: false` path; `VOID_JOURNAL` audit-log action; posted entries cannot be voided (only reversed) |
| BOOK-05 | Browse default AU SME CoA, 80–150 accounts, grouped by type | New `src/lib/coa/fy2026.ts` module — see § Australian CoA & Tax-Label Pre-Mapping for the concrete table |
| BOOK-06 | CRUD CoA entries with code/name/type/GST/tax-label per entity type | Existing `AccountManager.tsx` extended; existing `Account` type has all the fields; only the seed module is new |
| BOOK-07 | Parent/child account hierarchy with parent rows on TB | Add `parentCode?: string` field on Account (v2→v3 migration); TB roll-up walks the tree |
| BOOK-09 | Trial Balance, period-filtered, D/C/net, balanced footer | Use existing `src/lib/period.ts`; new `src/lib/tb.ts` produces `TrialBalanceRow[]` with parent subtotals |
| BOOK-11 | Immutable audit trail with timestamp/actor/before-after/entity-id | Widen `AuditLog.action` enum; append-only via existing `appendAuditLog` adapter method; `before`/`after` JSON-serialised into `details` (no shape change) |
| BOOK-12 | Search by reference/description/account/date range/amount range | Extend existing `useJournals` filteredEntries memo — already has search/dateFrom/dateTo; add accountId and amount range |
| ENT-01 | Create entities of all 4 AU types | Existing EntityForm; widen `Entity.type` literal union to `'Company' \| 'Trust' \| 'Individual' \| 'Partnership'` (currently `string` — tighten) |
| ENT-03 | `gstRegistered: boolean` flag | New field on Entity (v2→v3 migration) |
| ENT-04 | `accountingMethod: 'cash' \| 'accruals'` per entity | New field on Entity |
| ENT-05 | `fyEndDate: string` per entity (defaults 30 June) | New field on Entity |
| ENT-06 | Edit/archive/deactivate/delete; cascade-or-block on delete | Existing hook surface covers archive/deactivate; delete needs new check: if `allEntries[entityId].length > 0`, prompt cascade-or-block |
| ENT-07 | Trust beneficiary register | New `beneficiaries: TrustBeneficiary[]` field on Entity |
| ENT-08 | Partnership partner register | New `partners: PartnershipPartner[]` field on Entity |
| IMP-01 | Upload CSV or XLSX TB file | PapaParse for CSV, SheetJS xlsx CE for XLSX |
| IMP-02 | Deterministic parser + column-mapping UI (code/name/debit/credit) | Two-step flow: detect headers → confirm/override mapping → preview rows |
| IMP-03 | Fuzzy-match imported account names; create-new per row | Re-use existing `src/lib/import/match.ts` Levenshtein matcher; threshold 0.85 already set |
| IMP-04 | AI-assist optional, not required | Phase 3 wired `POST /api/ai/match-accounts`; Phase 4 just gates the UI on `IS_AI_ENABLED` |
| IMP-05 | Idempotent re-import — no duplicate opening journals | `importFingerprint = sha256(sortedRowKey + entityId + asAtDate)` stored on the opening JournalEntry; re-import checks for existing fingerprint and shows "already imported on {date}" |
| IMP-06 | Single dated opening-balances JournalEntry, user posts/rejects | Build the entry in preview state (`isPosted: false`), present in JournalForm-style review, post on user confirm |
</phase_requirements>

## Standard Stack

### Core additions (Phase 4)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **papaparse** | `^5.5.3` | CSV parsing in the browser | Industry default — 7M+ weekly downloads, MIT, mature BOM/delimiter/skip-empty handling, worker support. Faster than csv-parse and more browser-friendly. |
| **@types/papaparse** | `^5.3.16` | TypeScript types | Required for type-safe `Papa.parse<RowShape>(...)`. |
| **xlsx** (SheetJS CE) | `^0.20.3` | XLSX (and XLS) parsing | The canonical .xlsx library on npm (7.8M weekly DLs). Apache 2.0 CE edition is fully open-source. Handles both .xlsx and legacy .xls in one call. |

### Already installed (no new install — Phase 4 consumes these)

| Library | Version | Purpose |
|---------|---------|---------|
| decimal.js | 10.6 | All money math; balance check (BOOK-01) uses `new Decimal(d).eq(new Decimal(c))` |
| zod | 3.23 | Validate column-mapping payloads at the import boundary; extend `src/lib/schemas.ts` with `ImportRowSchema`, `BeneficiarySchema`, `PartnerSchema` |
| idb | 8 | IndexedDB wrapper used by LocalAdapter — Phase 4 does NOT touch this |

### Alternatives Considered (reject)

| Instead of | Could Use | Why Reject |
|------------|-----------|------------|
| papaparse | csv-parse | Slower in browser, less BOM-friendly; csv-parse shines in Node stream pipelines (not a browser-import use case). |
| xlsx (SheetJS) | exceljs | MIT vs Apache 2.0 — both open-source and acceptable. But: SheetJS is the de-facto standard, smaller browser bundle for read-only use, simpler API for "read sheet to row array". exceljs is heavier and oriented at writing. We read; xlsx wins. |
| Levenshtein (existing `src/lib/import/match.ts`) | Fuse.js | Adds 18 KB and a configuration surface (threshold, weights, keys) for a job already solved deterministically. IMP-03 thresholds (0.85 auto, top-3 below) work today in Phase 2. Don't swap. |
| Hand-rolled hash for idempotency | crypto.subtle.digest('SHA-256') | Browser-native; no dep. Already widely used in Phase 3 export. |

**Installation:**
```bash
npm install papaparse@^5.5.3 xlsx@^0.20.3
npm install --save-dev @types/papaparse@^5.3.16
```

License audit: PapaParse MIT; SheetJS CE Apache 2.0. Both compatible with the project's Apache-2.0 SPDX headers.

---

## Architecture Patterns

### Recommended Project Structure (additions)

```
src/
├── lib/
│   ├── coa/
│   │   ├── fy2026.ts           # NEW — 80–150-row AU SME default CoA with GST + ATO labels
│   │   ├── types.ts            # NEW — DefaultAccount, AccountSeed (typed shape of fy2026.ts)
│   │   └── __tests__/
│   │       ├── balance.test.ts        # Asserts CoA is structurally sound (no orphan parents)
│   │       └── labels.test.ts         # Asserts every Revenue + Expense has all 4 entity labels
│   ├── ledger.ts               # NEW — assertBalanced, makeReversal, makeOpeningEntry helpers
│   ├── ledger.test.ts          # (placed alongside in __tests__/)
│   ├── tb.ts                   # NEW — buildTrialBalance(period, entries, accounts) → TrialBalanceRow[] with parent rows
│   ├── tb.test.ts
│   └── import/
│       ├── csv.ts              # NEW — PapaParse wrapper: file → string → row[]; BOM-safe
│       ├── xlsx.ts             # NEW — SheetJS wrapper: file → row[]; takes sheet name
│       ├── mapping.ts          # NEW — column-detection + mapping state machine
│       ├── fingerprint.ts      # NEW — sha256(sortedRows + entityId + asAt) → importFingerprint
│       ├── opening.ts          # NEW — rows + mappings → single JournalEntry (draft, isPosted: false)
│       └── match.ts            # EXISTING — keep; consume as-is
└── components/
    ├── ledger/                 # NEW directory; existing components move here in plan-phase
    │   ├── JournalForm.tsx     # EXISTING — extend to call ledger.assertBalanced via Decimal
    │   ├── JournalList.tsx     # NEW — list + search + edit/reverse/void actions
    │   ├── AccountManager.tsx  # EXISTING — extend with parentCode field
    │   └── TrialBalance.tsx    # EXISTING — extend with parent-row roll-ups
    └── import/
        ├── ImportTB.tsx        # EXISTING — refactor into the two-step flow
        ├── ColumnMappingStep.tsx  # NEW
        ├── MatchReviewStep.tsx    # NEW
        └── OpeningPreview.tsx     # NEW
```

### Pattern 1: The Posting Engine (`src/lib/ledger.ts`)

**What:** Three pure functions: `assertBalanced`, `makeReversal`, `makeOpeningEntry`. No React. No I/O. The hooks call into ledger; ledger does not call adapters.

**When to use:** Every code path that creates or mutates a JournalEntry goes through this module — including `useJournals.addEntry`, `useJournals.editEntry`, `useJournals.reverseEntry`, and the import preview step.

**Why this shape:** Centralises the balance-enforcement and reversal-mirroring logic; testable as a pure function with Vitest; consistent with Phase 2's `lib/tax/*` pure-function pattern.

```typescript
// src/lib/ledger.ts
import { Decimal } from 'decimal.js';
import type { JournalEntry, JournalLine } from '../types';
import { today } from './period';

/** Throws if debits != credits at decimal precision. Use BEFORE persisting. */
export function assertBalanced(lines: JournalLine[]): void {
  const debit = lines.reduce((s, l) => s.plus(l.debit), new Decimal(0));
  const credit = lines.reduce((s, l) => s.plus(l.credit), new Decimal(0));
  if (!debit.eq(credit)) {
    throw new Error(
      `Journal not balanced: debits ${debit.toFixed(2)} != credits ${credit.toFixed(2)}`,
    );
  }
}

/**
 * Build a reversal entry that mirrors debits/credits of the original.
 * The reversal is itself a posted entry; the original is NEVER mutated.
 */
export function makeReversal(original: JournalEntry, reversalDate?: string): JournalEntry {
  return {
    _v: 3,
    id: crypto.randomUUID(),
    date: reversalDate ?? today().toISOString().split('T')[0],
    reference: `REV-${original.reference}`,
    description: `Reversal of ${original.reference}: ${original.description}`,
    lines: original.lines.map((l) => ({
      _v: 3,
      accountId: l.accountId,
      description: l.description,
      debit: l.credit,   // swap
      credit: l.debit,   // swap
      taxAmount: -l.taxAmount,
      isManualTax: l.isManualTax,
    })),
    isPosted: true,
    status: 'posted',
    reversesEntryId: original.id,
  };
}
```

### Pattern 2: Reversing-Entry Data Model

**What:** New fields on `JournalEntry` (v3 migration). The original entry is never mutated. Edits create a new version; reversals create a new entry; voids only apply to drafts.

```typescript
// Additions to src/types.ts in Phase 4 (v2→v3 migration)
export type JournalEntryStatus = 'draft' | 'posted' | 'reversed' | 'superseded' | 'voided';

export interface JournalEntry {
  _v?: number;
  id: string;
  date: string;
  reference: string;
  description: string;
  lines: JournalLine[];
  isPosted: boolean;          // KEEP for backward compat; status is the authoritative field in v3
  status?: JournalEntryStatus; // NEW _v: 3
  reversesEntryId?: string;    // NEW _v: 3 — set on a REV entry pointing back to the original
  replacesEntryId?: string;    // NEW _v: 3 — set when this entry supersedes an older one via edit
  replacedByEntryId?: string;  // NEW _v: 3 — set on the superseded entry, points forward
  importFingerprint?: string;  // NEW _v: 3 — set on opening-balances entry produced by IMP-06
}
```

**State machine:**
```
draft ──post──> posted
draft ──void──> voided          (BOOK-04)
posted ──edit──> superseded     (BOOK-02 — new entry with replacesEntryId; old gets replacedByEntryId + status='superseded')
posted ──reverse──> reversed    (BOOK-03 — new entry with reversesEntryId)
reversed → terminal
voided → terminal
superseded → terminal
```

The TB rollup INCLUDES `posted` and `reversed` entries (reversal cancels out by mirrored lines — both contribute), and EXCLUDES `voided`, `superseded`, and `draft`.

### Pattern 3: Append-Only Audit-Log Protocol

**What:** The audit-log shape doesn't change. New action enum values widen the existing `AuditLog.action` type. Before/after snapshots are JSON-encoded into the existing `details` string field.

**Why this shape:** Phase 3 already exposed `appendAuditLog(log: AuditLog)` on the StorageAdapter — a per-record append that is cheaper than `saveAuditLogs(whole)`. Phase 4 uses `appendAuditLog` for every mutation; the existing `saveAuditLogs` whole-collection write remains the import/restore path. No adapter widening needed.

```typescript
// Widen AuditLog.action (v2→v3 migration)
export type AuditAction =
  | 'CREATE_ENTITY' | 'UPDATE_ENTITY' | 'DELETE_ENTITY'
  | 'POST_JOURNAL' | 'EDIT_JOURNAL' | 'REVERSE_JOURNAL' | 'VOID_JOURNAL'
  | 'CREATE_ACCOUNT' | 'UPDATE_ACCOUNT' | 'DELETE_ACCOUNT'
  | 'IMPORT_TB' | 'IMPORT_DATA';
```

**Append helper (in `src/lib/ledger.ts` or `src/hooks/useAuditLog.ts`):**

```typescript
export async function emitAudit(
  action: AuditAction,
  entityId: string | undefined,
  before: unknown,
  after: unknown,
  summary: string,
): Promise<void> {
  const log: AuditLog = {
    _v: 3,
    id: crypto.randomUUID(),
    timestamp: today().toISOString(),
    user: 'Local user',
    action,
    entityId,
    details: JSON.stringify({ summary, before, after }),
  };
  const adapter = await getAdapter();
  await adapter.appendAuditLog(log);  // Phase-3 method, no widening
}
```

### Pattern 4: Two-Step Import Flow (CSV/XLSX → preview → post)

**What:** A state machine with five named states. No new state in the import flow leaks into hook state until the user clicks "Post Opening Balances" at the end.

```
1. UPLOAD       → user picks file (.csv | .xlsx | .xls)
2. PARSE        → file → raw row[]  (PapaParse or SheetJS)
3. MAP_COLUMNS  → auto-detect header → present column dropdowns → user confirms {code, name, debit, credit}
4. MATCH        → for each row, fuzzyMatch(row, accounts) → display top-3 candidates or "create new"
5. PREVIEW      → assemble single JournalEntry (isPosted: false) → assertBalanced → show review
6. POST or REJECT
```

**Idempotency:** before step 5 assembles the entry, compute `importFingerprint = sha256(sortedRowKey + entityId + asAtDate)`. Check existing entries in the active entity; if any has the same fingerprint, short-circuit and show "this trial balance was already imported on {date}". Source: same pattern used by NetSuite TB Importer, Caseware Cloud TB Import, AccountsIQ Data Importer.

### Pattern 5: Trial Balance with Parent Subtotals

**What:** TB is a pure fold. Accounts gain `parentCode?: string` (v3 migration); parents are accounts whose `code` is referenced by another account's `parentCode`. Roll-up walks the tree once.

```typescript
// src/lib/tb.ts
export interface TrialBalanceRow {
  account: Account;
  debit: Decimal;
  credit: Decimal;
  balance: Decimal;        // debit - credit, signed
  depth: number;           // 0 = root, 1 = child, 2 = grandchild
  isParent: boolean;       // true if any other account.parentCode === this.code
  childTotals?: { debit: Decimal; credit: Decimal; balance: Decimal };
}

export function buildTrialBalance(
  entries: JournalEntry[],
  accounts: Account[],
  period: Period,
): { rows: TrialBalanceRow[]; totalDebit: Decimal; totalCredit: Decimal; balanced: boolean }
```

Rows EXCLUDE entries where `status` is `voided`, `superseded`, or `draft`. The footer's `balanced` flag is `totalDebit.eq(totalCredit)`.

### Anti-Patterns to Avoid

- **Mutating the original on edit:** never. Always produce a new entry with `replacesEntryId` and flip the old to `superseded`. (Pitfall: the audit log can't show before/after if the before is gone.)
- **Hand-coding CSV parsing:** never. PapaParse handles BOM, quoted commas, escaped quotes, CRLF/LF/CR newlines, and trailing newlines correctly; a hand-rolled parser will fail on Excel's UTF-8-BOM CSV export within a week.
- **Storing the matching threshold in the matcher module's only export:** the constant `HIGH_CONFIDENCE_THRESHOLD = 0.85` is already exported from `src/lib/import/match.ts`. Don't redefine.
- **Adding new methods to StorageAdapter:** the interface is FINAL from Phase 3. All Phase 4 persistence rides on `saveAccounts`, `saveEntries`, `saveEntities`, `saveAuditLogs`, `appendAuditLog`. The migration runner upgrades `_v` in place; no new collection.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | DIY split-by-comma | **papaparse** | BOM (Excel exports UTF-8-BOM CSV that breaks first-column headers); quoted fields with commas; delimiter auto-detect (`,` vs `;` vs `\t`); skipEmptyLines: 'greedy'; worker thread for large files. PapaParse Issue #840 documents the BOM trap most hand-rolls fall into. |
| XLSX parsing | DIY zip-extract + XML parse | **xlsx (SheetJS CE)** | XLSX is a zip-of-XML format; spec is dense; cell type coercion (date, number, formula result vs literal) is non-trivial. SheetJS read-only is one function call: `XLSX.read(buf, { type: 'array' })`. Also reads legacy .xls — free bonus. |
| Fuzzy string match | DIY trigram / new Levenshtein | **`src/lib/import/match.ts` (existing)** | Already implemented in Phase 2; deterministic; threshold-tuned to AU account naming. Swapping to Fuse.js adds 18 KB and config surface for no IMP-03 win. |
| Money math | DIY float arithmetic | **decimal.js (already installed)** | Phase 1 invariant. `assertBalanced` MUST use `Decimal.eq`, not `Math.abs(a - b) < 0.001` (the JournalForm.tsx UI check is a pre-flight; the data-layer check is authoritative — BOOK-01 says "enforced at data layer, not only UI"). |
| Date / period math | DIY new Date(year, 0, 1) | **`src/lib/period.ts` (existing)** | Phase 2 invariant. Structural lint forbids `new Date()` outside period.ts. Use `today()` for "now"; use `isInPeriod(date, period)` for filtering. |
| Cryptographic hash for idempotency | DIY murmur/checksum | **`crypto.subtle.digest('SHA-256')`** | Browser-native; available in jsdom test env via Node 20 polyfill; collision resistance > checksum. |
| UUIDs | DIY counter | **`crypto.randomUUID()`** | Native, already used everywhere in the codebase. |

**Key insight:** Phase 4's value-add is the AU CoA seed and the posting/reversal engine. Every other surface (parsing, matching, hashing, dates, decimals) has a single canonical library or browser API. The team is wrong to build it.

---

## Common Pitfalls

### Pitfall 1: Edit-vs-Reversal Confusion (BOOK-02 vs BOOK-03)
**What goes wrong:** Treating edit as "mutate fields and append an audit log". The audit log can show "old description → new description" but the underlying journal *lines* are gone, and the TB at any historical date now shows the new numbers, not what was on the books then.
**Mitigation:** Edit produces a new entry with `replacesEntryId`. Original gets `status: 'superseded'`. TB rollup excludes superseded. The audit log carries both shapes. Tests: import a trial balance for FY2025; edit one journal in FY2026; assert FY2025 TB unchanged.

### Pitfall 2: Idempotent Re-import Key Choice (IMP-05)
**What goes wrong:** Dedupe by filename or upload-timestamp — both can change while content is identical (rename, re-download). User imports twice; opening balances double.
**Mitigation:** Compute `importFingerprint = sha256(canonical(rows) + entityId + asAtDate)` where `canonical` sorts rows by `code` and stringifies numerically. Store on the opening JournalEntry. Re-import checks if fingerprint already exists.
**Caveat:** A user editing the source XLSX to fix one cent will produce a different fingerprint — that's correct behaviour (it's a different TB). Surface "this looks similar to an import on {date}" via fuzzy match on the rounded totals as a soft warning, but the dedupe key is exact.

### Pitfall 3: GST-Code Default vs Override Hierarchy (IMP-03, BOOK-06)
**What goes wrong:** Imported TB rows carry no GST code. If we default every imported account's GST to `GST`, then GST-free interest income and N-T owner contributions become wrong. Once posted, fixing requires manual edit of every account.
**Mitigation:** When fuzzy-match finds an existing account at confidence ≥ 0.85, INHERIT the matched account's GST code. When user clicks "create new", default GST by account type:
- Asset / Liability / Equity → `N-T`
- Revenue → `GST` (overrideable; user can switch to FRE for interest, INP for residential rent)
- Expense → `GST` (overrideable; switch to N-T for wages/super)
- Asset with type 'Fixed' (motor vehicle, plant) → `CAP`

### Pitfall 4: Trust-Streaming Placeholder for Phase 5 (ENT-07)
**What goes wrong:** Building the beneficiary register as `{name, percentage}` only. Phase 5 Form T (per `.planning/research/PITFALLS.md` § 5) needs income-class breakdown so future v2 streaming support is non-breaking.
**Mitigation:** Beneficiary shape: `{ id, name, sharePercent, fixedAmount?, incomeClassOverrides?: Partial<Record<IncomeClass, number>> }`. Phase 4 only consumes `sharePercent` and `fixedAmount`. The `incomeClassOverrides` field is a placeholder; Phase 5 leaves it untouched, v2 streaming will populate it.

### Pitfall 5: CSV BOM / Delimiter / Trailing Newline Quirks (IMP-01, IMP-02)
**What goes wrong:** Excel's CSV-from-XLSX export emits UTF-8-BOM. Naive `csv.split('\n')` makes the first column header become `﻿code`, which never matches the user's mapping dropdown. Trailing blank line produces a `{code:"", debit:0, credit:0}` row that fails balance check.
**Mitigation:** PapaParse handles BOM by default (verified — Issue #840 documents the exact case). Pass `{ skipEmptyLines: 'greedy', header: true, dynamicTyping: false }`. Strip surrounding whitespace per cell. Reject rows where both debit AND credit are zero.

### Pitfall 6: XLSX vs Legacy XLS Format (IMP-01)
**What goes wrong:** Users have files exported from MYOB / older accountant systems still as `.xls` (binary BIFF8), not `.xlsx`. A library that only handles XLSX fails on real-world client TBs.
**Mitigation:** SheetJS xlsx CE reads both `.xlsx` and legacy `.xls` with the same `XLSX.read(buf)` call. Accept both extensions in the file picker. Test fixture should include a small `.xls` sample.

### Pitfall 7: CoA Key Stability (IMP-03, BOOK-07)
**What goes wrong:** Using the account's display name (which may be edited) or its UUID `id` (which is a random string the user never sees) as the matching key. After a CoA rename, matching breaks; after an import, the in-app account `id` no longer corresponds to anything in the source TB.
**Mitigation:** The `Account.code` field is the stable cross-system key. Match on code FIRST (exact); fall back to name fuzzy-match (existing `src/lib/import/match.ts` does this — line 73). The default CoA seed uses 4-digit codes matching the Xero / MYOB convention (1000s asset, 2000s liability, 3000s equity, 4000s revenue, 5000s COGS, 6000s expense).

### Pitfall 8: Period-Locking After Close (BOOK-11)
**What goes wrong:** v1 has no formal "lock period" feature, but BOOK-11's "immutable audit trail" expectation extends naturally to "you can't edit a journal from FY2024 once FY2025 starts". If we don't gate this, a user can silently change last year's books and the audit log captures the change but the lodged return is now out of sync with the books.
**Mitigation (v1):** SOFT WARNING ONLY. When edit/reverse is initiated on an entry whose date is in a closed FY (any FY where the user has produced a Phase-5 tax return via the persistence flag `entity.lockedFys: FyLabel[]`), show a confirmation: "This entry is in FY{N}, which has been finalised. Editing creates an audit trail but may invalidate a lodged return. Continue?". Hard-lock is v2 (`OPS-01`-ish).
**Phase scope:** add the `lockedFys` field on Entity but don't write to it in Phase 4 — Phase 5 finalisation sets it.

### Pitfall 9: AccountManager's Existing GST-Code Typo (`'ITS'`)
**What goes wrong:** `src/components/AccountManager.tsx` line 25 has `const GST_CODES = ['GST', 'FRE', 'N-T', 'ITS', 'CAP'];` — but the type literal in `src/types.ts` line 49 is `'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP'`. The string `'ITS'` is not a valid GST code; it's a typo for `'INP'`. The Phase 2 widening introduced `INP` and `CAP` but the UI dropdown was never updated.
**Mitigation:** Fix the typo in Phase 4 Plan task that touches AccountManager. Tests: validate `GST_CODES` against the Account schema's enum via a one-line check.

---

## Code Examples

### Example 1: PapaParse with BOM-safe configuration (IMP-01, IMP-02)
```typescript
// src/lib/import/csv.ts
// Source: https://www.papaparse.com/docs (BOM handling default-on)
import Papa from 'papaparse';

export interface RawRow {
  [columnName: string]: string;  // dynamicTyping: false → all strings
}

export async function parseCsvFile(file: File): Promise<{ rows: RawRow[]; headers: string[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,      // keep strings; Decimal-parse later
      transformHeader: (h) => h.trim(),          // strip surrounding whitespace
      complete: (result) => {
        if (result.errors.length > 0) {
          // Papa.parse reports BOM, delimiter-detection, and quoted-field errors here
          reject(new Error(result.errors.map((e) => e.message).join('; ')));
          return;
        }
        resolve({ rows: result.data, headers: result.meta.fields ?? [] });
      },
      error: reject,
    });
  });
}
```

### Example 2: SheetJS read (IMP-01)
```typescript
// src/lib/import/xlsx.ts
// Source: https://docs.sheetjs.com/docs/getting-started/installation/standalone
import * as XLSX from 'xlsx';
import type { RawRow } from './csv';

export async function parseXlsxFile(file: File): Promise<{ rows: RawRow[]; headers: string[]; sheetNames: string[] }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  // Phase 4 v1: pick the first sheet. (Phase 4 v2: present a sheet picker in MAP_COLUMNS step.)
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: '', raw: false });
  const headers = Object.keys(rows[0] ?? {});
  return { rows, headers, sheetNames: wb.SheetNames };
}
```

### Example 3: Balanced-Entry Posting Helper (BOOK-01)
```typescript
// src/lib/ledger.ts
import { Decimal } from 'decimal.js';
import type { JournalLine } from '../types';

export class JournalNotBalancedError extends Error {
  constructor(public debit: string, public credit: string) {
    super(`Journal not balanced: D=${debit} C=${credit}`);
    this.name = 'JournalNotBalancedError';
  }
}

/**
 * Decimal-exact balance check. Throws on imbalance.
 * Use BEFORE persisting (BOOK-01: data-layer enforcement, not just UI).
 */
export function assertBalanced(lines: JournalLine[]): void {
  if (lines.length < 2) throw new Error('Journal must have at least 2 lines');
  const d = lines.reduce((s, l) => s.plus(new Decimal(l.debit || 0)), new Decimal(0));
  const c = lines.reduce((s, l) => s.plus(new Decimal(l.credit || 0)), new Decimal(0));
  if (!d.eq(c)) throw new JournalNotBalancedError(d.toFixed(2), c.toFixed(2));
}
```

### Example 4: Immutable Audit-Log Append (BOOK-11)
```typescript
// In useJournals.editEntry (new method in Phase 4)
const editEntry = useCallback(async (original: JournalEntry, edits: Partial<JournalEntry>) => {
  const replacement: JournalEntry = {
    ...original,
    ...edits,
    _v: 3,
    id: crypto.randomUUID(),
    status: 'posted',
    replacesEntryId: original.id,
  };
  assertBalanced(replacement.lines);

  // Update the entry list: mark old as superseded, append new
  setAllEntries((prev) => {
    const entries = prev[activeEntityId!] ?? [];
    const updated = entries.map((e) =>
      e.id === original.id
        ? { ...e, status: 'superseded' as const, replacedByEntryId: replacement.id, _v: 3 }
        : e
    );
    return { ...prev, [activeEntityId!]: [replacement, ...updated] };
  });

  // Append-only audit log — uses Phase-3 method, no widening
  const adapter = await getAdapter();
  await adapter.appendAuditLog({
    _v: 3,
    id: crypto.randomUUID(),
    timestamp: today().toISOString(),
    user: 'Local user',
    action: 'EDIT_JOURNAL',
    entityId: activeEntityId!,
    details: JSON.stringify({
      summary: `Edited journal ${original.reference}`,
      before: { ref: original.reference, desc: original.description, lines: original.lines },
      after:  { ref: replacement.reference, desc: replacement.description, lines: replacement.lines },
    }),
  });
}, [activeEntityId]);
```

### Example 5: Re-use existing fuzzy match (IMP-03)
```typescript
// In the MATCH step of the import flow
import { fuzzyMatch, HIGH_CONFIDENCE_THRESHOLD } from '../../lib/import/match';

const matchResults = rawRows.map((row) => {
  const imported = {
    externalCode: row[mapping.code] ?? '',
    externalName: row[mapping.name] ?? '',
  };
  const result = fuzzyMatch(imported, accounts);
  return {
    row,
    ...result,
    autoMatched: result.confidence >= HIGH_CONFIDENCE_THRESHOLD,
  };
});
```

### Example 6: Idempotent re-import fingerprint (IMP-05)
```typescript
// src/lib/import/fingerprint.ts
import type { RawRow } from './csv';

export async function computeImportFingerprint(
  rows: RawRow[],
  mapping: { code: string; name: string; debit: string; credit: string },
  entityId: string,
  asAtDate: string,
): Promise<string> {
  // Canonicalise: sort by code, join fields with delimiter, hash.
  const canonical = rows
    .map((r) => [
      r[mapping.code]?.trim() ?? '',
      r[mapping.name]?.trim() ?? '',
      (Number(r[mapping.debit] ?? 0)).toFixed(2),
      (Number(r[mapping.credit] ?? 0)).toFixed(2),
    ].join('|'))
    .sort()
    .join('\n');
  const payload = `${entityId}|${asAtDate}|${canonical}`;
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// In the PREVIEW step:
const fp = await computeImportFingerprint(rows, mapping, entityId, asAtDate);
const existing = allEntries[entityId]?.find((e) => e.importFingerprint === fp);
if (existing) {
  // Show "Already imported on {existing.date}" and abort
  return { duplicateOfId: existing.id };
}
```

---

## Australian CoA & Tax-Label Pre-Mapping

**This is the highest-risk section of Phase 4.** The recommendation below is a concrete seed (~120 accounts) the planner uses directly to build `src/lib/coa/fy2026.ts`. Sources are explicit so the FY2027 refresh process knows what to revisit.

### Source Hierarchy

1. **Xero default AU CoA** (300+ rows; published exports — see Sources §1). This is the spine. It's industry-broad (agriculture, livestock, M/V split into Car / Commercial / Other) so we'll trim to ~120 SME-relevant accounts.
2. **MYOB Standard Chart of Accounts AU** (Sources §2). Used to cross-check naming conventions for the small-business-services flavour. Notably MYOB uses "Detail Account" / "Header Account" terminology that maps directly to our `parentCode` field.
3. **ATO FY2026 NAT instructions** for label-mapping verification:
   - Individual NAT 2541 (note: replaces NAT 0660 in the Business and professional items schedule context; the schedule is **NAT 2543** for FY2025). The label IDs in `src/lib/tax/labels/fy2026.ts` (`6S`, `6K`, `6L`, `6N`, `6Q`) match the Business schedule items P1, P8, etc. (Sources §3, §4)
   - Company NAT 0656 (Item 6 Income, Item 7 Reconciliation) (Sources §5)
   - Trust NAT 0660 — but note that NAT 0660 is the *Trust* return ID in current ATO numbering. **The user-provided objective uses NAT 0660 for Individual; that is incorrect for FY2025/2026 — Individual is NAT 2541, Trust is NAT 0660.** (Sources §6, §3) — flag this for `/gsd:discuss-phase 4`.
   - Partnership NAT 0659 (P1, P2, P8) (Sources §7)
   - BAS NAT 7392 (G1, G2, G3, G10, G11, 1A, 1B, W1, W2) (Sources §8)

### IMPORTANT — NAT Number Correction (raise in discuss-phase 4)

The task description supplied to this researcher referenced:
- Individual NAT 2541, Company NAT 0656, Trust NAT 0660, Partnership NAT 0659, BAS NAT 4189.

ATO's current FY2025/2026 publication numbering (verified against ato.gov.au):
- **Individual main return:** NAT 2541 ✓
- **Individual Business and Professional Items schedule:** NAT 2543 (not 0660)
- **Company tax return:** NAT 0656 ✓
- **Trust tax return:** NAT 0660 ✓ (the user-supplied "Trust NAT 0660" is correct; "Individual NAT 0660" in `.planning/research/SUMMARY.md` is the older numbering and should be retitled in Phase 5 docs)
- **Partnership tax return:** NAT 0659 ✓
- **BAS instructions:** NAT 7392 (the user-supplied "BAS NAT 4189" — NAT 4189 is the *BAS form* product code; NAT 7392 is the *GST guide*; both used by ATO)

Phase 4 doesn't ship tax outputs (that's Phase 5), so this only affects documentation. Flag in CONTEXT.md.

### GST Code Defaults (Phase 2 widened to 5 codes)

Source: ATO Simpler BAS GST bookkeeping guide + MYOB AU GST codes documentation (Sources §9, §10).

| Code | Definition | Default-on Account Types | Example Accounts |
|------|------------|---------------------------|------------------|
| **GST** | Taxable supply / acquisition at 10%. Goes to G1 (sales) or G11 (non-capital purchases); 1A or 1B accrues 1/11. | Revenue (most sales); Expense (most operating costs); Asset (inventory). | Sales, Rent, Advertising, Stationery |
| **FRE** | GST-free supply or acquisition. Goes to G1+G3 (sales) or G11 (purchases) but no 1A/1B GST. | Revenue (export sales, fresh food, education, health); Expense (bank fees, council rates, payroll tax, ASIC fees). | Bank Fees, Council Rates, Interest Income, Export Sales |
| **INP** | Input-taxed supply. The supplier cannot claim GST credits on related purchases. Reported in G1 but NOT in G3; 1B input credits clawed back proportionally. | Revenue (financial services, residential rent). | Residential Rental Income, Interest charged to customers, Bank Interest Margin Income |
| **N-T** | Not reported / out of scope. Excluded from BAS entirely. | Equity (owner's capital); Liability (loans, GST control accounts, PAYG payable, wages); some Asset (bank, AR control). | Wages & Salaries, Superannuation Expense, Owner Contribution, GST Collected/Paid control accounts, Income Tax Expense |
| **CAP** | Capital acquisition at 10% GST. Goes to G10 (capital purchases) instead of G11; 1B credits as normal. | Asset (fixed assets purchased GST-inclusive). | Motor Vehicles, Plant & Equipment, Office Equipment, Buildings |

### Default Australian SME Chart of Accounts (~120 rows, FY2026)

Codes follow Xero/MYOB convention: **1xxx Assets, 2xxx Liabilities, 3xxx Equity, 4xxx Revenue, 5xxx COGS, 6xxx Expenses**. Where parent is set, that account is a header row and appears as a subtotal on TB. Tax-label columns are FY2026 label IDs from `src/lib/tax/labels/fy2026.ts`.

Legend: `Type` = Account type (A/L/E/R/X = Asset/Liability/Equity/Revenue/Expense). `GST` = default GST code. `Ind`/`Coy`/`Trust`/`P'ship` = pre-mapping into NAT 2541 / NAT 0656 / NAT 0660 / NAT 0659 schedules respectively (blank = not reportable on that form; the account contributes via roll-up only).

#### Assets (1xxx) — 22 rows

| Code | Name | Type | Parent | GST | Ind | Coy | Trust | P'ship | Notes |
|------|------|------|--------|-----|-----|-----|-------|--------|-------|
| 1000 | Current Assets | A | — | N-T | — | — | — | — | Header |
| 1010 | Cash on Hand | A | 1000 | N-T | | | | | |
| 1020 | Business Bank Account | A | 1000 | N-T | | | | | |
| 1030 | Business Savings Account | A | 1000 | N-T | | | | | |
| 1040 | Petty Cash | A | 1000 | N-T | | | | | |
| 1100 | Accounts Receivable | A | 1000 | N-T | | | | | Trade Debtors control |
| 1110 | Provision for Doubtful Debts | A | 1000 | N-T | | | | | Contra |
| 1200 | Inventory | A | 1000 | N-T | | | | | Stock on hand at cost |
| 1300 | Prepayments | A | 1000 | N-T | | | | | |
| 1310 | GST Receivable | A | 1000 | N-T | | | | | Control — flows to 1B |
| 1500 | Non-Current Assets | A | — | N-T | — | — | — | — | Header |
| 1510 | Plant & Equipment (at cost) | A | 1500 | CAP | | | | | G10 on acquisition |
| 1515 | Accum. Depreciation — Plant | A | 1500 | N-T | | | | | Contra |
| 1520 | Motor Vehicles (at cost) | A | 1500 | CAP | | | | | G10 on acquisition |
| 1525 | Accum. Depreciation — MV | A | 1500 | N-T | | | | | Contra |
| 1530 | Office Equipment (at cost) | A | 1500 | CAP | | | | | |
| 1535 | Accum. Depreciation — Office | A | 1500 | N-T | | | | | Contra |
| 1540 | Buildings (at cost) | A | 1500 | CAP | | | | | |
| 1545 | Accum. Depreciation — Buildings | A | 1500 | N-T | | | | | Contra |
| 1550 | Land (at cost) | A | 1500 | N-T | | | | | GST-free supply if vacant residential |
| 1600 | Intangible Assets | A | 1500 | N-T | | | | | Goodwill, IP |
| 1700 | Loans to Directors / Owners | A | — | N-T | | | | | Div 7A relevance for Coy |

#### Liabilities (2xxx) — 18 rows

| Code | Name | Type | Parent | GST | Ind | Coy | Trust | P'ship | Notes |
|------|------|------|--------|-----|-----|-----|-------|--------|-------|
| 2000 | Current Liabilities | L | — | N-T | — | — | — | — | Header |
| 2010 | Accounts Payable | L | 2000 | N-T | | | | | Trade Creditors control |
| 2020 | Credit Card | L | 2000 | N-T | | | | | Business credit card |
| 2100 | GST Collected (Output Tax) | L | 2000 | N-T | | | | | Control — flows to 1A |
| 2110 | GST Paid (Input Tax Credits) | L | 2000 | N-T | | | | | Control — flows to 1B (negative) |
| 2120 | PAYG Withholding Payable | L | 2000 | N-T | | | | | Flows to W2 |
| 2130 | PAYG Income Tax Instalment Payable | L | 2000 | N-T | | | | | T7 |
| 2140 | Superannuation Payable | L | 2000 | N-T | | | | | Quarterly SG |
| 2150 | Wages Payable | L | 2000 | N-T | | | | | Accrued |
| 2160 | Income Tax Payable | L | 2000 | N-T | | | | | Coy 30%/25% |
| 2170 | Dividends Payable | L | 2000 | N-T | | | | | Coy only |
| 2200 | Customer Deposits | L | 2000 | N-T | | | | | Unearned revenue |
| 2300 | Provision for Annual Leave | L | 2000 | N-T | | | | | |
| 2310 | Provision for Long Service Leave | L | 2000 | N-T | | | | | |
| 2500 | Non-Current Liabilities | L | — | N-T | — | — | — | — | Header |
| 2510 | Bank Loan (Long-Term) | L | 2500 | N-T | | | | | |
| 2520 | Hire Purchase Liability | L | 2500 | N-T | | | | | |
| 2530 | Lease Liability | L | 2500 | N-T | | | | | AASB 16 |

#### Equity (3xxx) — 10 rows

| Code | Name | Type | Parent | GST | Ind | Coy | Trust | P'ship | Notes |
|------|------|------|--------|-----|-----|-----|-------|--------|-------|
| 3000 | Equity | E | — | N-T | — | — | — | — | Header |
| 3010 | Owner's Capital Contribution | E | 3000 | N-T | | | | | Sole trader / Coy paid-up |
| 3020 | Owner's Drawings | E | 3000 | N-T | | | | | Sole trader / Trust dist |
| 3030 | Issued and Paid-Up Capital | E | 3000 | N-T | | | | | Coy only |
| 3040 | Retained Earnings | E | 3000 | N-T | | | | | All entities |
| 3050 | Current-Year Profit / Loss | E | 3000 | N-T | | | | | Auto-rollup |
| 3060 | Dividends Paid | E | 3000 | N-T | | | | | Coy only — franking account driver |
| 3070 | Trust Distribution to Beneficiaries | E | 3000 | N-T | | | | | Trust only — ENT-07 |
| 3080 | Partner Distribution | E | 3000 | N-T | | | | | Partnership only — ENT-08 |
| 3090 | Franking Account Balance | E | 3000 | N-T | | | | | Coy only — COY-03 placeholder |

#### Revenue (4xxx) — 15 rows

| Code | Name | Type | Parent | GST | Ind | Coy | Trust | P'ship |
|------|------|------|--------|-----|-----|-----|-------|--------|
| 4000 | Income | R | — | N-T | — | — | — | — |
| 4010 | Sales of Goods | R | 4000 | GST | 6S | 6A | 5B | P1 |
| 4020 | Sales of Services | R | 4000 | GST | 6S | 6A | 5B | P1 |
| 4030 | Consulting Income | R | 4000 | GST | 6S | 6A | 5B | P1 |
| 4040 | Commission Income | R | 4000 | GST | 6S | 6A | 5B | P1 |
| 4100 | Export Sales (GST-Free) | R | 4000 | FRE | 6S | 6A | 5B | P1 |
| 4110 | Other GST-Free Sales | R | 4000 | FRE | 6S | 6A | 5B | P1 |
| 4200 | Interest Income | R | 4000 | FRE | 6K | 6F | 11J | P1 |
| 4210 | Dividend Income (Franked) | R | 4000 | FRE | 6S | 6F | 11J | P1 |
| 4220 | Dividend Income (Unfranked) | R | 4000 | FRE | 6S | 6F | 11J | P1 |
| 4300 | Residential Rental Income | R | 4000 | INP | 6S | 6F | 11J | P1 |
| 4310 | Commercial Rental Income | R | 4000 | GST | 6S | 6F | 11J | P1 |
| 4400 | Royalties Received | R | 4000 | FRE | 6S | 6F | 11J | P1 |
| 4500 | Other Income | R | 4000 | GST | 6S | 6A | 5B | P1 |
| 4600 | Insurance Recoveries | R | 4000 | GST | 6S | 6A | 5B | P1 |

#### COGS (5xxx) — 6 rows

| Code | Name | Type | Parent | GST | Ind | Coy | Trust | P'ship |
|------|------|------|--------|-----|-----|-----|-------|--------|
| 5000 | Cost of Sales | X | — | N-T | — | — | — | — |
| 5010 | Opening Stock | X | 5000 | N-T | 6Q | 6X | 5E | P2 |
| 5020 | Purchases | X | 5000 | GST | 6Q | 6X | 5E | P2 |
| 5030 | Direct Labour | X | 5000 | N-T | 6Q | 6X | 5E | P2 |
| 5040 | Subcontractor Costs | X | 5000 | GST | 6Q | 6X | 5E | P2 |
| 5050 | Closing Stock | X | 5000 | N-T | 6Q | 6X | 5E | P2 |

#### Operating Expenses (6xxx) — 50 rows

| Code | Name | Type | Parent | GST | Ind | Coy | Trust | P'ship |
|------|------|------|--------|-----|-----|-----|-------|--------|
| 6000 | Operating Expenses | X | — | N-T | — | — | — | — |
| 6010 | Wages & Salaries | X | 6000 | N-T | 6L | 6X | 5M | P2 |
| 6020 | Directors' Fees | X | 6000 | N-T | — | 6X | 5M | P2 |
| 6030 | Superannuation | X | 6000 | N-T | 6L | 6C | 5L | P2 |
| 6040 | Workers Compensation Insurance | X | 6000 | FRE | 6N | 6X | 5N | P2 |
| 6050 | Payroll Tax | X | 6000 | FRE | 6N | 6X | 5N | P2 |
| 6060 | Annual Leave Expense | X | 6000 | N-T | 6L | 6X | 5M | P2 |
| 6070 | Long Service Leave Expense | X | 6000 | N-T | 6L | 6X | 5M | P2 |
| 6080 | Staff Training | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6090 | Staff Amenities | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6100 | Accounting Fees | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6110 | Legal Fees | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6120 | Consulting Fees | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6130 | Audit Fees | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6140 | Bookkeeping Fees | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6200 | Rent — Business Premises | X | 6000 | GST | 6N | 6G | 5F | P2 |
| 6210 | Council Rates | X | 6000 | FRE | 6N | 6G | 5F | P2 |
| 6220 | Land Tax | X | 6000 | FRE | 6N | 6G | 5F | P2 |
| 6230 | Utilities — Electricity | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6240 | Utilities — Gas | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6250 | Utilities — Water | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6260 | Telephone & Internet | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6270 | Cleaning | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6280 | Repairs & Maintenance | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6290 | Security | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6300 | Motor Vehicle — Fuel | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6310 | Motor Vehicle — Registration & Insurance | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6320 | Motor Vehicle — Repairs | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6330 | Motor Vehicle — Lease | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6340 | Motor Vehicle — Other | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6400 | Advertising & Promotion | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6410 | Marketing & Sponsorship | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6420 | Website Hosting & Domain | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6500 | Travel — Domestic | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6510 | Travel — Overseas | X | 6000 | FRE | 6N | 6X | 5N | P2 |
| 6520 | Accommodation | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6530 | Meals & Entertainment | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6600 | Printing & Stationery | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6610 | Postage & Courier | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6620 | Subscriptions & Memberships | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6630 | Software Subscriptions | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6700 | Bank Fees & Charges | X | 6000 | FRE | 6N | 6X | 5N | P2 |
| 6710 | Interest Expense — Loans | X | 6000 | FRE | 6N | 6X | 5N | P2 |
| 6720 | Interest Expense — Hire Purchase | X | 6000 | FRE | 6N | 6X | 5N | P2 |
| 6730 | Merchant Fees | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6740 | Foreign Exchange Loss | X | 6000 | N-T | 6N | 6X | 5N | P2 |
| 6800 | Insurance — General Business | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6810 | Insurance — Professional Indemnity | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6820 | Insurance — Public Liability | X | 6000 | GST | 6N | 6X | 5N | P2 |
| 6900 | Depreciation Expense | X | 6000 | N-T | 6N | 6X | 5N | P2 |
| 6910 | Amortisation Expense | X | 6000 | N-T | 6N | 6X | 5N | P2 |
| 6920 | Bad Debts Written Off | X | 6000 | N-T | 6N | 6X | 5N | P2 |
| 6930 | Donations (Deductible Gift Recipient) | X | 6000 | FRE | 6N | 6X | 5N | P2 |
| 6940 | Fines & Penalties (Non-deductible) | X | 6000 | N-T | — | — | — | — |
| 6950 | Income Tax Expense | X | 6000 | N-T | — | — | — | — |
| 6990 | Sundry Expenses | X | 6000 | GST | 6N | 6X | 5N | P2 |

**Total seed rows: ~121 accounts** (22 + 18 + 10 + 15 + 6 + 50). Comfortably within the BOOK-05 range of 80–150.

### Pre-Mapping Verification Methodology

For each ATO entity-form label, the planner verifies (by writing a test in `src/lib/coa/__tests__/labels.test.ts`) that the CoA produces a non-empty roll-up set:

| Label | Form | Roll-up source (accounts where this label appears) |
|-------|------|-----------------------------------------------------|
| `6S` (Ind) | NAT 2541 / 2543 | All Revenue accounts (4010–4500), plus dividend income |
| `6K` (Ind) | NAT 2541 | 4200 only |
| `6L` (Ind) | NAT 2541 | 6010, 6020 (sole-trader only when wages are to oneself — see below), 6030, 6060, 6070 |
| `6N` (Ind) | NAT 2541 | All other 6xxx Expense rows |
| `6Q` (Ind) | NAT 2541 | All 5xxx (COGS) rows |
| `6A` (Coy) | NAT 0656 Item 6 | 4010, 4020, 4030, 4040, 4100, 4110, 4500, 4600 |
| `6F` (Coy) | NAT 0656 Item 6 | 4200, 4210, 4220, 4300, 4310, 4400 |
| `6C` (Coy) | NAT 0656 Item 7 | 6030 (superannuation only) |
| `6G` (Coy) | NAT 0656 Item 7 | 6200, 6210, 6220 |
| `6X` (Coy) | NAT 0656 Item 7 | All other expense rows (the largest bucket) |
| `5B` (Trust) | NAT 0660 | All sales / income rows (4010–4040, 4100, 4110, 4500, 4600) |
| `11J` (Trust) | NAT 0660 | 4200, 4210, 4220, 4300, 4310, 4400 |
| `5E` (Trust) | NAT 0660 | All 5xxx (COGS) |
| `5F` (Trust) | NAT 0660 | 6200, 6210, 6220 |
| `5L` (Trust) | NAT 0660 | 6030 |
| `5M` (Trust) | NAT 0660 | 6010, 6020, 6060, 6070 |
| `5N` (Trust) | NAT 0660 | All other expenses |
| `P1` (Partner) | NAT 0659 | All Revenue rows (4010–4600) |
| `P2` (Partner) | NAT 0659 | All COGS + all Expense rows |

### Validation tests Phase 4 must ship

```typescript
// src/lib/coa/__tests__/labels.test.ts
describe('FY2026 CoA tax-label coverage', () => {
  it('every Revenue account has all 4 entity-type labels', () => {
    const revenue = COA_FY2026.filter((a) => a.type === 'Revenue');
    for (const a of revenue) {
      expect(a.taxLabel, `${a.code} ${a.name} missing Individual label`).toBeTruthy();
      expect(a.companyTaxLabel, `${a.code} missing Company label`).toBeTruthy();
      expect(a.trustTaxLabel, `${a.code} missing Trust label`).toBeTruthy();
      expect(a.partnershipTaxLabel, `${a.code} missing Partnership label`).toBeTruthy();
    }
  });
  it('every Expense account except non-deductible has all 4 labels', () => {
    const NON_DEDUCT_CODES = ['6940', '6950']; // Fines, Income Tax Expense
    const expenses = COA_FY2026.filter(
      (a) => a.type === 'Expense' && !NON_DEDUCT_CODES.includes(a.code),
    );
    // …same shape as above
  });
  it('no orphan parentCode', () => {
    const codes = new Set(COA_FY2026.map((a) => a.code));
    for (const a of COA_FY2026) {
      if (a.parentCode) expect(codes.has(a.parentCode)).toBe(true);
    }
  });
  it('every account has exactly one valid GST code', () => {
    const valid = ['GST', 'FRE', 'INP', 'N-T', 'CAP'];
    for (const a of COA_FY2026) {
      expect(valid).toContain(a.gstCode);
    }
  });
});
```

### Trust-Streaming v1 Placeholder

Per Phase 5 pitfall (PITFALLS.md §5), the beneficiary register needs an income-class field for v2 streaming without a breaking migration. Phase 4 ships:

```typescript
export type IncomeClass = 'ordinary' | 'franked' | 'capital_gain' | 'foreign';

export interface TrustBeneficiary {
  _v?: number;
  id: string;
  name: string;
  sharePercent: number;      // 0-100, all beneficiaries must sum to 100
  fixedAmount?: number;      // overrides percentage if set
  isPrimaryResident?: boolean;
  incomeClassOverrides?: Partial<Record<IncomeClass, number>>;  // v2 streaming; v1 leaves undefined
}

export interface PartnershipPartner {
  _v?: number;
  id: string;
  name: string;
  sharePercent: number;
  capitalContribution?: number;
}
```

These attach to `Entity`:
```typescript
export interface Entity {
  // …existing fields…
  gstRegistered?: boolean;           // NEW v3 — ENT-03
  accountingMethod?: 'cash' | 'accruals';  // NEW v3 — ENT-04
  fyEndDate?: string;                // NEW v3 — ENT-05; ISO date, defaults '06-30'
  beneficiaries?: TrustBeneficiary[];      // NEW v3 — ENT-07 (Trust only)
  partners?: PartnershipPartner[];         // NEW v3 — ENT-08 (Partnership only)
  lockedFys?: FyLabel[];             // NEW v3 — placeholder for Phase 5 finalisation
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AccountManager hard-codes 16-row CoA in `src/constants.ts` | Externalise to FY-versioned `src/lib/coa/fy2026.ts`; constants.ts re-exports for backward compat | Phase 4 | Mirrors Phase 2's tax-label-file pattern; v2 refresh changes one file |
| `JournalEntry.isPosted: boolean` only | Add `status: JournalEntryStatus` (draft/posted/superseded/reversed/voided) | Phase 4 | Enables BOOK-02 (edit) and BOOK-03 (reverse) without ambiguity |
| `AuditLog.action` enum has 5 values | Widen to 11 values (add EDIT/REVERSE/VOID journal + IMPORT_TB + CREATE/UPDATE/DELETE account/entity) | Phase 4 v3 | Required by BOOK-11 |
| Float comparison in JournalForm (`Math.abs(d - c) < 0.001`) | Decimal.eq() in `src/lib/ledger.ts` `assertBalanced` | Phase 4 | BOOK-01 says "enforced at data layer, not only UI" — the UI check stays as fast pre-flight; data-layer check is the gate |
| `ImportTB.tsx` is monolithic | Split into ColumnMappingStep / MatchReviewStep / OpeningPreview | Phase 4 | Two-step flow IMP-02; preserves the JournalForm-style review UX from Phase 2 |
| `AccountManager` GST_CODES has typo `'ITS'` (line 25) | Fix to `'INP'` | Phase 4 | Type-vs-UI alignment |

**Deprecated/outdated:**

- The `src/constants.ts` 16-row CHART_OF_ACCOUNTS should be deprecated (`@deprecated — use coa/fy2026.ts`) but kept as a re-export so the migration v2→v3 has a safe source to merge from on first run.
- The `src/constants.ts` ad-hoc `TAX_LABELS` / `COMPANY_TAX_LABELS` / `TRUST_TAX_LABELS` objects are SHADOWED by Phase 2's `src/lib/tax/labels/fy2026.ts`. AccountManager.tsx still imports from constants.ts (line 10) — Phase 4 plan should switch to the FY2026 module.

---

## Open Questions

1. **NAT number for Individual Business and Professional Items schedule**
   - What we know: the user-supplied objective says NAT 0660 for Individual, but ATO publishes NAT 2541 for the main return and NAT 2543 for the B&P schedule.
   - What's unclear: whether the project doc convention is NAT 2541 / 2543 (current) or NAT 0660 (older numbering).
   - Recommendation: surface in /gsd:discuss-phase 4 for the user to confirm. Phase 4 doesn't ship tax outputs so this is documentation-only; Phase 5 will need the answer locked.

2. **Should hard-delete of an account with journal lines be allowed?** (BOOK-06)
   - What we know: ENT-06 says entity deletion is cascade-or-block based on journal references. BOOK-06 says "create, edit, and delete CoA entries" without specifying cascade behaviour.
   - What's unclear: should account deletion be blocked when journal lines reference it, or should it cascade-archive?
   - Recommendation: same as entity — block hard-delete if any non-voided journal line references the account. Offer "archive instead" path. Decide in discuss-phase.

3. **Editing a posted entry's date — period-locking implications**
   - What we know: BOOK-02 lets users edit any field on a posted entry. PITFALL §8 above raises soft period-lock.
   - What's unclear: in Phase 4 (no finalised Phase-5 returns yet), should we still warn on prior-FY edits, or wait for Phase 5?
   - Recommendation: ship the soft-warn machinery in Phase 4 (`entity.lockedFys`); Phase 5 populates `lockedFys` on finalisation. Phase 4 itself can leave `lockedFys` as `[]` for all entities — the warning UI just never triggers.

4. **XLSX sheet picker — first-sheet auto or always present picker?**
   - What we know: 99% of TB-export use cases produce a single-sheet workbook.
   - What's unclear: whether to silently pick `SheetNames[0]` or always present a dropdown.
   - Recommendation: present the dropdown but pre-select `SheetNames[0]`; skip the step when there's only one sheet. Single-sheet case is silent.

5. **CoA seed: 121 rows or trim further?**
   - What we know: BOOK-05 specifies 80–150 accounts. The Xero default is 300+. The recommended seed is 121.
   - What's unclear: whether to ship all 121 or hide ~30 (e.g. the per-MV split into Fuel / Rego / Repairs / Lease) behind a "show specialist accounts" toggle.
   - Recommendation: ship all 121 — the per-MV granularity is genuinely useful for sole traders claiming the cents-per-km vs logbook method. UI groups them under the 1500/6300 parents so the SME-bookkeeper UX is not overwhelmed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 + jsdom + RTL 16.3 (already in `package.json`) |
| Config file | `vitest.config.ts` (existing) + `server/vitest.config.ts` for server-side |
| Quick run command | `npm run test -- src/lib/ledger.test.ts` (or any single path) |
| Full suite command | `npm run test` (SPA) + `npm run test:server` (server) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BOOK-01 | `assertBalanced` throws on unbalanced lines; passes Decimal-exact | unit | `npm test -- src/lib/__tests__/ledger.test.ts` | ❌ Wave 0 |
| BOOK-02 | `useJournals.editEntry` creates new entry, sets `replacesEntryId`, sets old to `superseded`, emits EDIT_JOURNAL audit | integration | `npm test -- src/hooks/__tests__/useJournals.edit.test.ts` | ❌ Wave 0 |
| BOOK-03 | `makeReversal` produces mirrored entry with `reversesEntryId`; TB shows zero net for original+reversal | unit | `npm test -- src/lib/__tests__/ledger.test.ts` | ❌ Wave 0 |
| BOOK-04 | Void on draft sets `status: 'voided'`; void on posted throws | unit | `npm test -- src/lib/__tests__/ledger.test.ts` | ❌ Wave 0 |
| BOOK-05 | CoA seed has 80 ≤ N ≤ 150 accounts; types are all valid | unit | `npm test -- src/lib/coa/__tests__/structure.test.ts` | ❌ Wave 0 |
| BOOK-06 | AccountManager edit + delete-with-block flow | RTL | `npm test -- src/components/__tests__/AccountManager.test.tsx` | ✅ extend existing |
| BOOK-07 | TB groups by parentCode; parent row shows subtotals; orphan-parent test in CoA fixture | unit | `npm test -- src/lib/__tests__/tb.test.ts` | ❌ Wave 0 |
| BOOK-09 | `buildTrialBalance` filters by Period; balanced footer reflects D-C; excludes voided/superseded/draft | unit | `npm test -- src/lib/__tests__/tb.test.ts` | ❌ Wave 0 |
| BOOK-11 | `appendAuditLog` writes new entries; before/after JSON in details; entityId scoping | unit | `npm test -- src/hooks/__tests__/useAuditLog.test.ts` | ✅ extend existing |
| BOOK-12 | filteredEntries respects accountId + amount range | unit | `npm test -- src/hooks/__tests__/useJournals.search.test.ts` | ❌ Wave 0 |
| ENT-01..08 | Entity CRUD with new fields; gstRegistered/accountingMethod/fyEndDate/registers | RTL + unit | `npm test -- src/components/__tests__/EntityForm.test.tsx` | ✅ extend existing |
| IMP-01 | parseCsvFile reads BOM-prefixed CSV; parseXlsxFile reads .xlsx and .xls | unit | `npm test -- src/lib/import/__tests__/csv.test.ts`, `xlsx.test.ts` | ❌ Wave 0 |
| IMP-02 | column-mapping detection: tolerates "Account Code"/"Code"/"AcctCode" variants | unit | `npm test -- src/lib/import/__tests__/mapping.test.ts` | ❌ Wave 0 |
| IMP-03 | fuzzyMatch returns auto-match ≥ 0.85 (existing test passes) | unit | `npm test -- src/lib/import/__tests__/match.test.ts` | ✅ extend existing |
| IMP-04 | `IS_AI_ENABLED=false` → ImportTB hides "AI match" button; deterministic path completes flow | RTL | `npm test -- src/components/__tests__/ImportTB.test.tsx` | ✅ extend existing |
| IMP-05 | Re-import with same fingerprint short-circuits with duplicateOfId | unit | `npm test -- src/lib/import/__tests__/fingerprint.test.ts` | ❌ Wave 0 |
| IMP-06 | Opening journal is a single balanced entry with importFingerprint; isPosted: false until user confirms | unit + RTL | `npm test -- src/lib/import/__tests__/opening.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- {path-of-affected-file}` (target: < 5s for unit tests, < 30s for RTL).
- **Per wave merge:** `npm run test` (full SPA suite — currently 249 tests, target stay < 60s) + `npm run test:server` (18 tests, < 10s).
- **Phase gate:** Full suite green before `/gsd:verify-work` and human-verify UAT.

### Wave 0 Gaps

- [ ] `src/lib/ledger.ts` — assertBalanced, makeReversal, makeOpeningEntry (NEW)
- [ ] `src/lib/__tests__/ledger.test.ts` — covers BOOK-01, BOOK-03, BOOK-04
- [ ] `src/lib/tb.ts` — buildTrialBalance with parent rollups (NEW)
- [ ] `src/lib/__tests__/tb.test.ts` — covers BOOK-07, BOOK-09
- [ ] `src/lib/coa/fy2026.ts` — the 121-row AU SME default seed (NEW)
- [ ] `src/lib/coa/types.ts` — DefaultAccount type definition
- [ ] `src/lib/coa/__tests__/structure.test.ts` — covers BOOK-05, BOOK-07 (orphan-parent check), GST-code-valid invariant
- [ ] `src/lib/coa/__tests__/labels.test.ts` — verifies every Revenue/Expense has all 4 entity labels
- [ ] `src/lib/import/csv.ts` — PapaParse wrapper (NEW)
- [ ] `src/lib/import/__tests__/csv.test.ts` — BOM, delimiter, skip-empty cases
- [ ] `src/lib/import/xlsx.ts` — SheetJS wrapper (NEW)
- [ ] `src/lib/import/__tests__/xlsx.test.ts` — .xlsx + .xls fixtures
- [ ] `src/lib/import/mapping.ts` — column-detection state machine (NEW)
- [ ] `src/lib/import/__tests__/mapping.test.ts` — header-variant tolerance
- [ ] `src/lib/import/fingerprint.ts` — sha256 idempotency key (NEW)
- [ ] `src/lib/import/__tests__/fingerprint.test.ts` — same input → same hash; whitespace/sort-stability
- [ ] `src/lib/import/opening.ts` — rows + mapping → balanced JournalEntry (NEW)
- [ ] `src/lib/import/__tests__/opening.test.ts` — covers IMP-06
- [ ] `src/lib/migrations/v2-to-v3.ts` — additive migration (NEW): adds parentCode, status, reverses/replaces fields, AuditAction widening, Entity fields
- [ ] `src/lib/migrations/__tests__/v2-to-v3.test.ts` — round-trip from v2 fixture
- [ ] Test fixtures: `src/test/fixtures/coa.ts`, `tb.ts`, `import-csv-sample.csv`, `import-xlsx-sample.xlsx` (small files in `src/test/fixtures/`)
- [ ] Extend `src/lib/schemas.ts` — TrustBeneficiarySchema, PartnershipPartnerSchema, widened EntitySchema and AuditLogSchema (action enum)
- [ ] Framework install: **`npm install papaparse@^5.5.3 xlsx@^0.20.3`** + **`npm install --save-dev @types/papaparse@^5.3.16`**

---

## Sources

### Primary (HIGH confidence)

- `.planning/REQUIREMENTS.md` (lines 24–55, 193+) — direct project reference
- `.planning/ROADMAP.md` (lines 92–108) — Phase 4 goal & success criteria
- `.planning/STATE.md` (Key Decisions, Open Questions) — accumulated context including the explicit "CoA highest-risk in Phase 4" flag
- `src/types.ts`, `src/storage/adapter.ts`, `src/hooks/use*.ts`, `src/lib/import/match.ts`, `src/lib/period.ts`, `src/lib/tax/labels/fy2026.ts`, `src/lib/schemas.ts`, `src/constants.ts`, `src/components/AccountManager.tsx`, `src/components/JournalForm.tsx`, `package.json` — direct codebase inspection
- **Xero AU Default Chart of Accounts CSV export** — published 2022 by accountantmaster.com; full 300-row table verified via WebFetch on 2026-05-12 — Source §1 below
- ATO Simpler BAS GST bookkeeping guide; ATO BAS Step 3 (Purchases) — Sources §8, §10
- ATO Company Tax Return 2025 instructions index page (HTTP 200; specific Item 6/7 page returns 403 to WebFetch — fall back to mirrored references) — Source §5
- Decimal arithmetic invariant from `.planning/research/PITFALLS.md` §3
- PapaParse documentation (BOM, delimiter auto-detect, skipEmptyLines) — Source §11
- SheetJS xlsx CE documentation (.xlsx + .xls read, Apache 2.0 licence) — Sources §12, §13

### Secondary (MEDIUM confidence)

- MYOB Standard Chart of Accounts (AU) page (search-result excerpt; covers naming conventions and GST-code list including ITS, NTR, GNR not used by AussieLedger) — Source §2
- MYOB GST codes documentation (FRE, INP, CAP definitions) — Source §10
- Reckon Australia chart of accounts guide (general structure, no concrete row list available without authenticated access) — Source §14
- TaxTalks GST codes guide (corroborates FRE/INP/N-T/CAP definitions and BAS field destinations) — Source §15

### Tertiary (LOW confidence — flagged for /gsd:discuss-phase verification)

- Form C Item 6 specific label IDs (`6A`, `6F`, etc.) — sourced from existing `src/lib/tax/labels/fy2026.ts` which Phase 2 verified; ATO direct verification blocked by 403 to WebFetch from ato.gov.au and not in this researcher's prior knowledge depth. Phase 5 will need fresh ATO PDFs.
- The NAT number for the Individual B&P schedule (NAT 2543 vs NAT 0660 — see Open Question #1).

### URLs

1. Xero default AU CoA (published export): https://www.accountantmaster.com/wp-content/uploads/2022/12/Xero-Chart-of-Accounts.csv
2. MYOB Standard Chart of Accounts (AU): https://help.myob.com/wiki/pages/viewpage.action?pageId=31928049 ; https://practice-support.myob.com/cah/summary-of-myob-standard-chart-of-accounts-au
3. ATO Individual tax return instructions 2025 / 2026 family page: https://www.ato.gov.au/forms-and-instructions/individual-tax-return-instructions
4. ATO Business and professional items schedule (NAT 2543-06.2025): https://www.ato.gov.au/api/public/content/5861f7f47efa45d5b76332ef12919ace?v=a0a2f777
5. ATO Company tax return 2025 instructions: https://www.ato.gov.au/forms-and-instructions/company-tax-return-2025-instructions
6. ATO Trust tax return instructions 2025: https://www.ato.gov.au/forms-and-instructions/trust-tax-return-2025-instructions
7. ATO Partnership tax return instructions 2025: https://www.ato.gov.au/forms-and-instructions/partnership-tax-return-2025-instructions
8. ATO Simpler BAS GST bookkeeping guide: https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas/goods-and-services-tax-gst/simpler-bas-gst-bookkeeping-guide
9. ATO BAS Step 3 Purchases: https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/in-detail/managing-gst-in-your-business/reporting-paying-and-activity-statements/completing-your-bas-for-gst/complete-your-bas/step-3-purchases
10. MYOB GST codes Australia: https://help.myob.com/wiki/pages/viewpage.action?pageId=5669139 ; https://www.myob.com/au/support/myob-business/accounting/financial-control/accounts-list/gst-codes
11. PapaParse documentation: https://www.papaparse.com/docs ; GitHub Issue #840 (BOM): https://github.com/mholt/PapaParse/issues/840
12. SheetJS Community Edition documentation: https://docs.sheetjs.com/
13. SheetJS GitHub: https://github.com/SheetJS/sheetjs ; npm: https://www.npmjs.com/package/xlsx
14. Reckon AU chart of accounts: https://www.reckon.com/au/small-business-resources/bookkeeping/chart-of-accounts/
15. TaxTalks GST codes (independent AU reference): https://www.taxtalks.com.au/articles/gst-codes/
16. Green Taylor GST Code Guide: https://www.greentaylor.com.au/2024/11/13/demystifying-gst-codes-a-guide-for-small-business-owners
17. SheetJS vs ExcelJS license comparison: https://www.pkgpulse.com/guides/sheetjs-vs-exceljs-vs-node-xlsx-excel-files-node-2026
18. Fuse.js (rejected) — for reference: https://www.fusejs.io/
19. PapaParse npm: https://www.npmjs.com/package/papaparse
20. NetSuite TB upload best-practice (idempotency precedent): https://blog.prolecto.com/2015/06/14/how-to-upload-a-netsuite-trial-balance/
21. Caseware Engagement TB import (deterministic column-mapping flow precedent): https://docs.caseware.com/2020/webapps/31/en/Engagements/File-Preparation/Import-the-trial-balance-from-a-CSV-or-Excel-file.htm

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — PapaParse and SheetJS xlsx CE are the de-facto choices; verified via multiple package comparison sources and npm trends.
- Architecture patterns: HIGH — based on direct codebase inspection of finalised Phase-2/3 invariants and the StorageAdapter contract.
- CoA seed (121 rows): MEDIUM-HIGH — the Xero spine is verified-published; the trim and the GST/tax-label pre-mapping rely on AU domain knowledge cross-checked against MYOB/ATO references. The planner should treat the table as a strong starting point, not a frozen artefact — expect 5–15 rows to change during /gsd:discuss-phase 4.
- Pitfalls: HIGH on the documented Phase-3 invariants (StorageAdapter FINAL, decimal.js, period.ts); MEDIUM on the edit-vs-reversal state machine (general accounting pattern, not project-specific).
- Tax-label correctness for Phase 5: deferred to Phase 5 research; Phase 4 only ships pre-mappings as data, doesn't compute returns from them.

**Research date:** 2026-05-12
**Valid until:** ~30 days for stack/architecture (stable); ~365 days for CoA pre-mappings (annual ATO label refresh — Phase 5's annual cadence applies)

---

## Confidence & Open Questions (handoff to /gsd:discuss-phase 4)

The planner should target these in `/gsd:discuss-phase 4`. Each is a decision point that survived this research with weak signal:

1. **NAT number clarification for Individual return** (Open Q #1) — NAT 2541 (main) + NAT 2543 (B&P schedule) vs the user-supplied "NAT 0660". Phase 4 ships data only; Phase 5 needs the answer locked.
2. **Account deletion semantics** (Open Q #2) — block hard-delete if journal lines reference, mirroring ENT-06; or always cascade. Recommended: block, with archive escape hatch.
3. **Period-lock soft-warn machinery** (Open Q #3) — ship the `lockedFys` field in Phase 4 (lockedFys=[] on all entities) so Phase 5's finalisation has a place to write; or defer entirely. Recommended: ship the field, no UI yet.
4. **XLSX sheet-picker behaviour** (Open Q #4) — silent first-sheet vs picker for multi-sheet workbooks. Recommended: present picker only when SheetNames.length > 1.
5. **CoA size — ship 121 or trim** (Open Q #5) — full SME granularity (e.g. per-MV split) vs leaner ~95-row v1. Recommended: ship 121; UI groups them.
6. **Library version pins** — `papaparse@^5.5.3` + `xlsx@^0.20.3`. Run `npm show <pkg> version` before install to confirm latest patch.
7. **Idempotency dedupe-key includes asAtDate** — meaning two different opening-balance imports for two different start dates are both accepted, but the same TB re-imported for the same start date is a no-op. Confirm this is the intended semantic.
8. **Trust-streaming placeholder field shape** — `incomeClassOverrides?: Partial<Record<IncomeClass, number>>` ships unused in Phase 4. Confirm Phase 5 Form T research will respect this shape (or Phase 4 should choose a different shape now).

Items where a single recommendation was made despite weak signal:

- **`status` enum values** — chose `draft | posted | reversed | superseded | voided`. Alternative: separate `isVoided`/`isReversed`/`replacedBy` booleans. Picked enum for discriminated-union pattern alignment with Phase 2's `Period` type.
- **`xlsx` over `exceljs`** — both MIT/Apache-equivalent. Chose xlsx for read-only bundle size and legacy .xls support; if Phase 5 needs PDF export through Excel templates (very unlikely), exceljs could resurface.
- **Levenshtein over Fuse.js** — verified existing matcher meets IMP-03 threshold semantics; chose not to swap. Re-evaluate if /gsd:discuss-phase surfaces a "common chart variants don't match" UX complaint.

Research complete. Planner can proceed to `/gsd:plan-phase 4` with this document as the prescriptive reference.
