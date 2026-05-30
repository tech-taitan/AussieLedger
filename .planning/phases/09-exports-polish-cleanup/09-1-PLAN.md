---
phase: 09-exports-polish-cleanup
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/export/csv.ts
  - src/lib/export/__tests__/csv.test.ts
  - src/components/Toast.tsx
  - src/components/__tests__/Toast.test.tsx
  - src/index.css
  - src/components/TrialBalance.tsx
  - src/components/__tests__/TrialBalance.test.tsx
  - src/components/BasIasAssistant.tsx
  - src/components/__tests__/BasIasAssistant.test.tsx
  - src/components/TaxReturnAssistant.tsx
  - src/components/__tests__/TaxReturnAssistant.test.tsx
  - src/components/shell/Sidebar.tsx
  - src/components/__tests__/Sidebar.test.tsx
  - src/components/ViewRouter.tsx
  - src/components/CoaTreeView.tsx
  - src/components/__tests__/CoaTreeView.test.tsx
  - src/App.tsx
  - .planning/REQUIREMENTS.md
  - .planning/milestones/v1.0-phases/01-safety-net/01-VALIDATION.md
  - .planning/milestones/v1.0-phases/02-decompose-and-tax-engine/02-VALIDATION.md
  - .planning/milestones/v1.0-phases/06-personas-wizard-and-deployment/06-VALIDATION.md
autonomous: false
requirements: [FND-10, FND-11, FND-12, UX-06, CLEAN-01, CLEAN-02]
tdd: true

must_haves:
  truths:
    - "User clicking 'Export CSV' on TB downloads a valid CSV opening cleanly in Excel with header row, raw decimal money cells, and leading-zero account codes preserved"
    - "User clicking 'Export CSV' on BAS view downloads a CSV with one row per BAS label including a 'source' column distinguishing lodgement vs internal-only"
    - "User clicking 'Export CSV' on Form I view downloads a CSV with one row per label including comma-joined source_account_codes derived from account.taxLabel"
    - "Empty-period export downloads a header-only CSV and displays a toast 'No data in selected period for export'"
    - "Every CSV export emits an EXPORT_DATA audit log entry with { type: 'csv', report, period, filename }"
    - "User clicking Sidebar 'Journals N' badge navigates to journals view, scrolls to the first unbalanced entry with a 300ms yellow flash, and shows a toast 'Showing anomaly 1 of N in Journal Entries'"
    - "Subsequent clicks on the same badge cycle through the remaining anomalies and wrap to 1 after N"
    - "User clicking Sidebar 'Accounts N' badge navigates to accounts view filtered to missing-GST or missing-taxLabel rows with same flash + toast behaviour"
    - "JournalSearch and CoaTreeView each show a 'Filtered to anomalies — clear filter' banner when the new prop is true; clicking 'clear filter' restores the full list"
    - "REQUIREMENTS.md marks CLEAN-01 complete with note 'already fixed in Phase 1 — stale audit entry from v1.0 review'"
    - "Phase 1, 2, and 6 VALIDATION.md frontmatter shows nyquist_compliant: true"
    - "Full SPA suite GREEN (target ~935: 910 baseline + ~25 new); no regressions"
  artifacts:
    - path: "src/lib/export/csv.ts"
      provides: "Three pure-function CSV serialisers + filename helper + inlined slugify + inlined fmtPeriodSlug + leading-zero prefix + UTF-8 BOM prepend"
      exports: ["exportTrialBalanceCsv", "exportBasLabelsCsv", "exportFormILabelsCsv", "CsvExportResult"]
      contains: "Papa.unparse"
    - path: "src/lib/export/__tests__/csv.test.ts"
      provides: "Unit tests covering FND-10/11/12 — header-only empty path, decimal precision preservation, leading-zero prefix, BOM byte sequence, comma-in-name quoting, Form I account-join derivation"
      min_lines: 200
    - path: "src/components/Toast.tsx"
      provides: "~30-line transient feedback primitive: { message, duration=3000, onDismiss, tone='info' } with auto-dismiss via setTimeout + click-to-dismiss"
      exports: ["Toast", "ToastProps"]
    - path: "src/components/__tests__/Toast.test.tsx"
      provides: "Unit tests for render, auto-dismiss after duration, click-to-dismiss"
      min_lines: 40
    - path: "src/index.css"
      provides: "@keyframes flash-yellow + .anomaly-flash class for UX-06 row highlight"
      contains: "@keyframes flash-yellow"
    - path: "src/components/TrialBalance.tsx"
      provides: "New 'Export CSV' button next to existing TB period controls + handleExportCsv + Toast state for empty-period feedback + addLog prop"
      contains: "Export CSV"
    - path: "src/components/BasIasAssistant.tsx"
      provides: "New 'Export CSV' button in existing header next to Print + handleExportCsv + Toast state"
      contains: "Export CSV"
    - path: "src/components/TaxReturnAssistant.tsx"
      provides: "New 'Export CSV' button in existing header next to Print + handleExportCsv + Toast state"
      contains: "Export CSV"
    - path: "src/components/shell/Sidebar.tsx"
      provides: "Journals + Accounts badges become clickable with cycle state + scroll-signal callbacks + Toast for position feedback"
      contains: "anomalyScrollSignal"
    - path: "src/components/ViewRouter.tsx"
      provides: "Thread scrollToJournalIdx + scrollToAccountIdx props from Sidebar through to JournalsView + AccountManager"
      contains: "scrollToJournalIdx"
    - path: "src/components/CoaTreeView.tsx"
      provides: "filterMissingMappings prop + clear-filter banner + scrollToAccountIdx prop + flash + scrollIntoView effect"
      contains: "filterMissingMappings"
  key_links:
    - from: "src/components/TrialBalance.tsx onClick handler"
      to: "src/lib/export/csv.ts exportTrialBalanceCsv"
      via: "direct import + Blob+anchor download (DataPage.tsx pattern)"
      pattern: "exportTrialBalanceCsv\\("
    - from: "src/components/BasIasAssistant.tsx onClick handler"
      to: "src/lib/export/csv.ts exportBasLabelsCsv"
      via: "direct import + Blob+anchor download"
      pattern: "exportBasLabelsCsv\\("
    - from: "src/components/TaxReturnAssistant.tsx onClick handler"
      to: "src/lib/export/csv.ts exportFormILabelsCsv"
      via: "direct import + Blob+anchor download; accounts prop passed in for join"
      pattern: "exportFormILabelsCsv\\("
    - from: "All three Export CSV buttons"
      to: "addLog?.('EXPORT_DATA', JSON.stringify(...), entityId)"
      via: "audit log emission with type:'csv'"
      pattern: "EXPORT_DATA.*type.*csv"
    - from: "src/components/shell/Sidebar.tsx Journals NavButton onClick"
      to: "src/components/ViewRouter.tsx JournalsView via scrollToJournalIdx prop"
      via: "setView('journals') + increment journalCycleIdx + setScrollSignal + show toast"
      pattern: "setJournalCycleIdx"
    - from: "src/components/shell/Sidebar.tsx Accounts NavButton onClick"
      to: "src/components/CoaTreeView.tsx via scrollToAccountIdx + filterMissingMappings"
      via: "setView('coa-manager') + cycle state + prop threading via AccountManager"
      pattern: "scrollToAccountIdx"
    - from: "Anomaly flash trigger"
      to: ".anomaly-flash CSS keyframe"
      via: "el.classList.remove + void el.offsetWidth + el.classList.add (reflow trick)"
      pattern: "void.*offsetWidth"
---

<objective>
Phase 9 ships v1.1 by closing v1.0's last gap (FND-02 per-report CSV exports as FND-10/11/12), polishing v1.0's UX-02 in-context anomaly UX with Sidebar-badge deep-links (UX-06), and sweeping the audit-flagged cosmetic + Nyquist debt (CLEAN-01 doc-only, CLEAN-02 frontmatter flips). Single plan per CONTEXT decision; lightweight UAT.

Purpose: Make AussieLedger's tax outputs exportable as machine-readable CSV (Excel/Sheets compatible) and make anomaly counts actionable via click-to-jump navigation — closing the last v1.1 deliverables before milestone close.

Output: New `src/lib/export/csv.ts` serialiser module + `Toast` primitive + 3 button wires + UX-06 cycle navigation + REQUIREMENTS.md + 3 VALIDATION.md doc updates. Target end-state: ~935 SPA GREEN (910 baseline + ~25 new), 18 server GREEN unchanged.
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
@.planning/phases/09-exports-polish-cleanup/09-CONTEXT.md
@.planning/phases/09-exports-polish-cleanup/09-RESEARCH.md
@.planning/phases/09-exports-polish-cleanup/09-VALIDATION.md
@.planning/milestones/v1.0-phases/03-durable-persistence/03-CONTEXT.md
@.planning/milestones/v1.0-phases/04-bookkeeping-core/04-CONTEXT.md
@.planning/milestones/v1.0-phases/05-tax-outputs/05-CONTEXT.md
@.planning/milestones/v1.0-phases/06-personas-wizard-and-deployment/06-CONTEXT.md

@src/lib/import/csv.ts
@src/components/DataPage.tsx
@src/components/shell/Sidebar.tsx
@src/components/JournalSearch.tsx
@src/components/CoaTreeView.tsx
@src/components/TrialBalance.tsx
@src/components/BasIasAssistant.tsx
@src/components/TaxReturnAssistant.tsx
@src/components/ViewRouter.tsx
@src/hooks/useAnomalyCounts.ts
@src/lib/period.ts
@src/lib/persona.ts
@src/lib/tax/returns/fy2026/types.ts
@src/lib/tax/returns/fy2026/bas.ts
@src/lib/tax/labels/fy2026.ts
@src/types.ts
@src/index.css

<interfaces>
<!-- Key contracts and types — executor MUST use these directly without re-exploring. -->

From src/lib/period.ts:
```typescript
export type FyLabel = `FY${number}`;
export type Period =
  | { type: 'fy'; fy: FyLabel }
  | { type: 'quarter'; fy: FyLabel; q: 1 | 2 | 3 | 4 }
  | { type: 'custom'; from: Date; to: Date };
export function today(): Date;                           // ONLY source of timestamps
export function currentFy(now?: Date): FyLabel;
export function fyBoundaries(fy: FyLabel): { from: Date; to: Date };
export function quarterBoundaries(fy: FyLabel, q: 1 | 2 | 3 | 4): { from: Date; to: Date };
// NO fmtPeriod helper exists — inline in src/lib/export/csv.ts.
```

From src/lib/persona.ts:
```typescript
// NO slugify export. Inline the regex in src/lib/export/csv.ts:
//   slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
```

From src/types.ts:
```typescript
export interface Account {
  id: string; code: string; name: string; type: AccountType;
  taxLabel?: string;          // FormI: used for source_account_codes derivation
  gstCode: 'GST'|'FRE'|'INP'|'N-T'|'CAP';
  parentCode?: string | null;
  isArchived?: boolean;
  // ... other fields
}
export interface TrialBalanceRow {
  account: Account; debit: number; credit: number; balance: number;
  isParent?: boolean; childTotals?: {...};
}
```

From src/lib/tax/returns/fy2026/types.ts:
```typescript
export interface ReturnLabel {
  code: string;
  plainEnglish: string;
  value: Decimal;             // pre-rounded; .toString() preserves precision
  internalOnly?: boolean;     // BAS: drives source='internal-only' vs 'lodgement'
  natReference?: string;
}
// NOTE: ReturnLabel has NO sourceAccountCodes field.
// Form I serialiser MUST derive source_account_codes from accounts.filter(a => a.taxLabel === labelCode).
```

From src/lib/tax/returns/fy2026/bas.ts:
```typescript
export type BasReturn = ComputedReturn<BasReturnLabels> & { meta: ... & { shape: 'BAS'|'IAS' } };
// .labels is Partial<Record<BasLabel, ReturnLabel>> — iterate Object.entries(result.labels)
// .labels[code].internalOnly === true → source: 'internal-only'; else 'lodgement'
```

From src/hooks/useAnomalyCounts.ts:
```typescript
export interface AnomalyCounts { journals: number; accounts: number; }
// "journals" = unbalanced posted entries (tolerance 0.005)
// "accounts" = posted-referenced accounts missing taxLabel
// For UX-06 Accounts filter: USE the broader "!a.gstCode || !a.taxLabel" condition
//   per CoaTreeView line 100 — matches the AnomalyBadge it already shows.
```

From src/components/shell/Sidebar.tsx (existing prop contract):
```typescript
interface SidebarProps {
  view: View;
  setView: (v: View) => void;
  activeEntity: Entity | undefined;
  entities: Entity[];
  isOpen: boolean; setIsOpen: (open: boolean) => void;
  setActiveEntityId: (id: string | null) => void;
  mode: 'owner' | 'agent' | null;
  anomalyCounts: AnomalyCounts;
  // Task 3 ADDS:
  onAnomalyScroll?: (target: 'journals' | 'accounts', cycleIdx: number) => void;
}
```

From src/components/JournalSearch.tsx (existing):
```typescript
interface JournalSearchProps {
  accounts: Account[];
  onSearch: (filters: SearchFilters) => void;
  defaultFilters?: Partial<SearchFilters>;
}
// NOTE: JournalSearch holds ONLY filter UI. Journal rows are rendered in
// ViewRouter.tsx > JournalsView (lines 346-444). UX-06 scroll target is the
// <tr key={entry.id}> at line 420 inside JournalsView's <tbody>.
// JournalSearch is NOT currently mounted in JournalsView — UX-06 work for the
// "Filtered to anomalies" banner goes in JournalsView itself, NOT JournalSearch.
```

From src/components/CoaTreeView.tsx:
```typescript
interface CoaTreeViewProps {
  accounts: Account[];
  onSelect?: (id: string) => void;
  selectedId?: string;
  showArchived?: boolean;
  // Task 3 ADDS:
  filterMissingMappings?: boolean;
  scrollToAccountIdx?: number;       // increments to re-trigger scroll
  onClearAnomalyFilter?: () => void;
}
// Rows have data-testid={`coa-row-${a.code}`} — use as scroll/flash target.
```

From src/components/DataPage.tsx (Blob+anchor pattern to mirror):
```typescript
// REUSE THIS EXACT PATTERN in each Export CSV button handler:
const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url; a.download = filename;
document.body.appendChild(a); a.click(); document.body.removeChild(a);
URL.revokeObjectURL(url);
```

From papaparse@5.5.3 (verified in research):
```typescript
import Papa from 'papaparse';
// CRITICAL: object form REQUIRED for empty-period header-only CSV
Papa.unparse({ fields: ['a','b'], data: [] }, { quotes: true, newline: '\r\n' })
  // → '"a","b"\r\n'   ✅ header emitted
Papa.unparse([], { quotes: true, newline: '\r\n' })
  // → ''   ❌ NEVER use array form for this phase
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Wave 0 stubs + pure-function CSV serialisers (FND-10, FND-11, FND-12)</name>
  <files>
    src/lib/export/csv.ts (new),
    src/lib/export/__tests__/csv.test.ts (new)
  </files>
  <read_first>
    - .planning/phases/09-exports-polish-cleanup/09-RESEARCH.md (§ Patterns 1-7 — Papa.unparse object form, BOM prepend, leading-zero prefix, Blob+anchor, slugify, fmtPeriodSlug; §Pitfalls 1, 2, 6)
    - .planning/phases/09-exports-polish-cleanup/09-CONTEXT.md (§ Decisions → CSV format conventions — 4 sub-decisions LOCKED)
    - .planning/phases/09-exports-polish-cleanup/09-VALIDATION.md (FND-10/11/12 rows — exact assertion behaviours)
    - src/lib/import/csv.ts (Phase 4 — `import Papa from 'papaparse'` style)
    - src/lib/period.ts (Period union type; today() function)
    - src/lib/tax/returns/fy2026/types.ts (ReturnLabel shape — no sourceAccountCodes)
    - src/lib/tax/returns/fy2026/bas.ts (BasReturn shape, internalOnly usage)
    - src/lib/tax/labels/fy2026.ts (BAS_LABELS_FULL — used for plainEnglish lookup)
    - src/types.ts (Account, TrialBalanceRow)
  </read_first>
  <behavior>
    RED→GREEN test list (write these as `it()` blocks in src/lib/export/__tests__/csv.test.ts, then implement to GREEN):

    **slugify (inlined private helper, also exported for test)**
    - Test 1.1: slugify('Acme Pty Ltd') === 'acme-pty-ltd'
    - Test 1.2: slugify('Smith & Sons (AU)') === 'smith-sons-au'
    - Test 1.3: slugify("O'Brien Family Trust") === 'o-brien-family-trust'
    - Test 1.4: slugify('   leading   ') === 'leading' (trim collapsed-dashes from ends)

    **fmtPeriodSlug (inlined private helper, also exported for test)**
    - Test 2.1: fmtPeriodSlug({type:'fy', fy:'FY2026'}) === '2026'
    - Test 2.2: fmtPeriodSlug({type:'quarter', fy:'FY2026', q:2}) === '2026-Q2'
    - Test 2.3: fmtPeriodSlug({type:'custom', from:new Date(Date.UTC(2025,6,1)), to:new Date(Date.UTC(2026,5,30))}) === '2025-07-01_2026-06-30'

    **applyLeadingZeroPrefix**
    - Test 3.1: applyLeadingZeroPrefix('0410') === "'0410"
    - Test 3.2: applyLeadingZeroPrefix('4100') === '4100' (no change)
    - Test 3.3: applyLeadingZeroPrefix('') === '' (no crash on empty)

    **exportTrialBalanceCsv (FND-10)**
    - Test 4.1: Returns object with { filename, csv, isEmpty }.
    - Test 4.2: filename === 'acme-pty-ltd-tb-2026.csv' for entityName='Acme Pty Ltd', period={type:'fy',fy:'FY2026'}.
    - Test 4.3: csv STARTS with U+FEFF (BOM) — assert csv.charCodeAt(0) === 0xFEFF.
    - Test 4.4: csv contains header line `"code","name","type","debit","credit","balance","period_start","period_end"\r\n` (after BOM).
    - Test 4.5: Empty rows array → isEmpty===true AND csv contains exactly 1 newline after header (header-only valid CSV).
    - Test 4.6: Row with account.code='0410' → CSV cell value is `"'0410"` (leading-zero apostrophe-prefix wrapped by papaparse quotes).
    - Test 4.7: Account name 'Sales, Domestic' → CSV cell `"Sales, Domestic"` (comma preserved inside quotes; no row split).
    - Test 4.8: Decimal precision — pass tbRows with debit=1234.567890123456 → CSV cell is exactly `"1234.567890123456"`. NEVER `parseFloat`/`Number` on money strings; values flow as raw strings via `.toString()`.
    - Test 4.9: period_start and period_end columns populated as ISO yyyy-MM-dd strings derived from period boundaries.

    **exportBasLabelsCsv (FND-11)**
    - Test 5.1: filename === 'acme-pty-ltd-bas-2026-Q2.csv' for quarter period.
    - Test 5.2: csv header `"label_code","plain_english","value","source"\r\n`.
    - Test 5.3: Row where label.internalOnly === true → source column === 'internal-only'.
    - Test 5.4: Row where label.internalOnly === false (or undefined) → source column === 'lodgement'.
    - Test 5.5: BAS labels = empty object → isEmpty===true; csv is header-only.
    - Test 5.6: Decimal value via `.toString()` preserved exactly (no `.toFixed(2)` coercion).

    **exportFormILabelsCsv (FND-12)**
    - Test 6.1: filename === 'acme-pty-ltd-form-i-2026.csv'.
    - Test 6.2: csv header `"label_code","plain_english","value","source_account_codes"\r\n`.
    - Test 6.3: For label 'P1' with accounts [{code:'4100',taxLabel:'P1'},{code:'4110',taxLabel:'P1'}], source_account_codes === '4100,4110'.
    - Test 6.4: Label with no matching accounts → source_account_codes === '' (empty string, no crash).
    - Test 6.5: Accounts deterministically sorted by code ascending in the joined string.
  </behavior>
  <action>
    Create `src/lib/export/csv.ts` with the following EXACT code skeleton (executor fills in serialiser bodies per behavior list):

    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * Phase 9 — per-report CSV exporters (FND-10/11/12).
     * Pure functions. UI orchestrates the Blob+anchor download.
     *
     * CSV conventions (locked per 09-CONTEXT.md):
     *   - Header row always emitted (Papa.unparse object form)
     *   - quotes: true + newline: '\r\n' + UTF-8 BOM prepend
     *   - Money cells = raw decimal strings (no $, no thousands)
     *   - Leading-zero codes apostrophe-prefixed for Excel text affinity
     *   - Filename: {entity-slug}-{report}-{period}.csv
     */
    import Papa from 'papaparse';
    import type { Account, JournalEntry, TrialBalanceRow } from '../../types';
    import type { Period, FyLabel } from '../period';
    import { fyBoundaries, quarterBoundaries } from '../period';
    import type { ReturnLabel } from '../tax/returns/fy2026/types';

    const BOM = '﻿';          // U+FEFF — encodes to bytes EF BB BF when written to a UTF-8 Blob

    // ── Public types ─────────────────────────────────────────────────────────

    export interface CsvExportResult {
      filename: string;
      csv: string;        // BOM-prefixed; always contains at least the header row
      isEmpty: boolean;   // true when zero data rows (caller shows toast)
    }

    // ── Inlined helpers (exported for unit tests; not for external consumers) ─

    /** Lowercase, non-alphanumeric runs → '-', strip leading/trailing dashes. */
    export function slugify(name: string): string {
      return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    /** Period → filename segment. FY:'2026', Quarter:'2026-Q2', Custom:'2025-07-01_2026-06-30'. */
    export function fmtPeriodSlug(period: Period): string {
      if (period.type === 'fy') return period.fy.replace('FY', '');
      if (period.type === 'quarter') return `${period.fy.replace('FY', '')}-Q${period.q}`;
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      return `${fmt(period.from)}_${fmt(period.to)}`;
    }

    /** Period → ISO date range as { periodStart, periodEnd } strings for CSV columns. */
    export function periodBoundaryStrings(period: Period): { periodStart: string; periodEnd: string } {
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      if (period.type === 'fy') {
        const { from, to } = fyBoundaries(period.fy);
        return { periodStart: fmt(from), periodEnd: fmt(to) };
      }
      if (period.type === 'quarter') {
        const { from, to } = quarterBoundaries(period.fy, period.q);
        return { periodStart: fmt(from), periodEnd: fmt(to) };
      }
      return { periodStart: fmt(period.from), periodEnd: fmt(period.to) };
    }

    /** Excel leading-zero preservation: prefix codes starting with '0' with an apostrophe. */
    export function applyLeadingZeroPrefix(code: string): string {
      return code.startsWith('0') ? `'${code}` : code;
    }

    // ── Shared serialiser (private) ─────────────────────────────────────────

    function serialise(fields: readonly string[], data: Record<string, string>[]): string {
      const csv = Papa.unparse(
        { fields: [...fields], data },
        { quotes: true, newline: '\r\n' },
      );
      return BOM + csv;
    }

    // ── FND-10: Trial Balance CSV ───────────────────────────────────────────

    const TB_FIELDS = [
      'code','name','type','debit','credit','balance','period_start','period_end',
    ] as const;

    export function exportTrialBalanceCsv(
      tbRows: TrialBalanceRow[],
      period: Period,
      entityName: string,
    ): CsvExportResult {
      const filename = `${slugify(entityName)}-tb-${fmtPeriodSlug(period)}.csv`;
      const { periodStart, periodEnd } = periodBoundaryStrings(period);
      // Exclude parent (subtotal) rows — CSV is account-level only; consumers can sum.
      const dataRows = tbRows.filter((r) => !r.isParent);
      const isEmpty = dataRows.length === 0;
      const data = dataRows.map((r) => ({
        code:         applyLeadingZeroPrefix(r.account.code),
        name:         r.account.name,
        type:         r.account.type,
        debit:        r.debit.toString(),   // raw decimal — NEVER parseFloat
        credit:       r.credit.toString(),
        balance:      r.balance.toString(),
        period_start: periodStart,
        period_end:   periodEnd,
      }));
      return { filename, csv: serialise(TB_FIELDS, data), isEmpty };
    }

    // ── FND-11: Simpler BAS labels CSV ──────────────────────────────────────

    const BAS_FIELDS = ['label_code','plain_english','value','source'] as const;

    export function exportBasLabelsCsv(
      labels: Partial<Record<string, ReturnLabel>>,
      period: Period,
      entityName: string,
    ): CsvExportResult {
      const filename = `${slugify(entityName)}-bas-${fmtPeriodSlug(period)}.csv`;
      const entries = Object.entries(labels).filter(([, v]) => v !== undefined) as Array<[string, ReturnLabel]>;
      const isEmpty = entries.length === 0;
      const data = entries.map(([code, label]) => ({
        label_code:    code,
        plain_english: label.plainEnglish,
        value:         label.value.toString(),     // Decimal.toString() — precision preserved
        source:        label.internalOnly ? 'internal-only' : 'lodgement',
      }));
      return { filename, csv: serialise(BAS_FIELDS, data), isEmpty };
    }

    // ── FND-12: Form I labels CSV ────────────────────────────────────────────

    const FORMI_FIELDS = ['label_code','plain_english','value','source_account_codes'] as const;

    /**
     * Derives source_account_codes for each label via accounts.filter(a => a.taxLabel === code).
     * Codes joined by ',' and sorted ascending for deterministic output.
     */
    export function exportFormILabelsCsv(
      labels: Partial<Record<string, ReturnLabel>>,
      accounts: Account[],
      period: Period,
      entityName: string,
    ): CsvExportResult {
      const filename = `${slugify(entityName)}-form-i-${fmtPeriodSlug(period)}.csv`;
      const entries = Object.entries(labels).filter(([, v]) => v !== undefined) as Array<[string, ReturnLabel]>;
      const isEmpty = entries.length === 0;
      const sourceCodesFor = (labelCode: string): string =>
        accounts
          .filter((a) => a.taxLabel === labelCode)
          .map((a) => a.code)
          .sort((x, y) => x.localeCompare(y))
          .join(',');
      const data = entries.map(([code, label]) => ({
        label_code:            code,
        plain_english:         label.plainEnglish,
        value:                 label.value.toString(),
        source_account_codes:  sourceCodesFor(code),
      }));
      return { filename, csv: serialise(FORMI_FIELDS, data), isEmpty };
    }
    ```

    Create `src/lib/export/__tests__/csv.test.ts` with all behaviour tests above. Use `D` import from `src/lib/money` for decimal construction in BAS/Form I tests:

    ```typescript
    import { D } from '../../money';
    import type { ReturnLabel } from '../../tax/returns/fy2026/types';

    const makeLabel = (code: string, plainEnglish: string, value: string, internalOnly?: boolean): ReturnLabel => ({
      code, plainEnglish, value: D(value), internalOnly,
    });
    ```

    Use `vi.mock` is NOT needed — these are pure functions.

    For BOM test, use `csv.charCodeAt(0) === 0xFEFF` (not byte-level). For the Period imports, construct test periods directly: `{ type: 'fy', fy: 'FY2026' as const }`.

    NEVER use `parseFloat`, `Number(...)`, or `+'1.23'` on any money string — flagged in self-review.

    Commit message (RED→GREEN single commit acceptable since the file is being CREATED):
    `feat(09-1): FND-10/11/12 pure-function CSV serialisers + unit tests`
  </action>
  <verify>
    <automated>npx vitest run src/lib/export/__tests__/csv.test.ts --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - File `src/lib/export/csv.ts` exists and exports `exportTrialBalanceCsv`, `exportBasLabelsCsv`, `exportFormILabelsCsv`, `slugify`, `fmtPeriodSlug`, `applyLeadingZeroPrefix`, `periodBoundaryStrings`, `CsvExportResult`
    - `grep -c "Papa.unparse" src/lib/export/csv.ts` returns exactly 1 (single shared `serialise` helper)
    - `grep -c "fields:" src/lib/export/csv.ts` returns ≥ 1 (object form used — not array form)
    - `grep -c "\\\\uFEFF" src/lib/export/csv.ts` returns ≥ 1 (BOM literal as escape sequence)
    - `grep -nE "parseFloat|Number\\(|\\+'" src/lib/export/csv.ts | grep -v "^\\s*//"` returns ZERO matches (no float coercion on money strings)
    - `grep -c "new Date()" src/lib/export/csv.ts` returns ZERO (must use period.ts boundary functions, not raw new Date)
    - `npx vitest run src/lib/export/__tests__/csv.test.ts` exit code 0 with ≥ 25 GREEN tests (all behaviour cases above)
    - `npx vitest run` total GREEN ≥ 935 SPA tests (910 baseline + ~25 new) — no regressions
    - `npx tsc --noEmit` exit code 0 (TypeScript clean)
    - `npx eslint src/lib/export/` exit code 0 (lint clean)
  </acceptance_criteria>
  <done>
    Pure-function serialisers ready for the button-wire task. All FND-10/11/12 unit behaviour assertions GREEN. decimal.js precision preserved end-to-end. Leading-zero apostrophe-prefix verified. BOM byte sequence verified. Form I account-join derivation verified. Filename slugify + period segment helpers verified across FY/Quarter/Custom periods.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Toast primitive + 3 "Export CSV" button wires + empty-CSV toast + audit-log emission</name>
  <files>
    src/components/Toast.tsx (new),
    src/components/__tests__/Toast.test.tsx (new),
    src/components/TrialBalance.tsx,
    src/components/__tests__/TrialBalance.test.tsx,
    src/components/BasIasAssistant.tsx,
    src/components/__tests__/BasIasAssistant.test.tsx,
    src/components/TaxReturnAssistant.tsx,
    src/components/__tests__/TaxReturnAssistant.test.tsx,
    src/components/ViewRouter.tsx
  </files>
  <read_first>
    - src/lib/export/csv.ts (just created — Task 1 output)
    - src/components/DataPage.tsx (lines 110-136 — EXACT Blob+anchor pattern to mirror)
    - src/components/TrialBalance.tsx (existing TB header structure lines 141-192; tbData closure line 55)
    - src/components/BasIasAssistant.tsx (existing handlePrint lines 123-137 — EXPORT_DATA pattern; period closure line 109)
    - src/components/TaxReturnAssistant.tsx (existing handlePrint lines 114-121; entity + accounts + result closure)
    - src/components/ViewRouter.tsx (line 489 TB call site; line 624 TaxReturn call site; line 655 BAS call site)
    - src/lib/period.ts (today() — the ONLY source of timestamps; structural lint forbids `new Date()` outside period.ts)
    - .planning/phases/09-exports-polish-cleanup/09-RESEARCH.md (§ Pattern 4 Blob+anchor; § Pattern 5 audit log; § Pattern 10 Toast primitive)
    - .planning/phases/09-exports-polish-cleanup/09-CONTEXT.md (§ Decisions → CSV button placement — 4 sub-decisions LOCKED)
  </read_first>
  <behavior>
    **Toast primitive (src/components/Toast.tsx)**
    - Test T.1: `render(<Toast message="hi" onDismiss={fn} />)` shows text "hi" with `data-testid="toast"`.
    - Test T.2: After `vi.advanceTimersByTime(3000)`, `onDismiss` called exactly once (default duration).
    - Test T.3: `<Toast message="x" duration={500} onDismiss={fn} />` → after `vi.advanceTimersByTime(500)`, `onDismiss` called once.
    - Test T.4: Clicking the toast (fireEvent.click) calls `onDismiss` immediately.
    - Test T.5: Toast has `role="status"` for accessibility.

    **TrialBalance Export CSV (FND-10)**
    - Test TB.1: TrialBalance renders a button with text "Export CSV" + `data-testid="export-csv-button-tb"` next to the existing period controls (inside `no-print`).
    - Test TB.2: Clicking the button with `accounts=[{code:'4100',...}]` + `entries=[posted entry]` calls `addLog` with action `'EXPORT_DATA'` and details JSON containing `"type":"csv"` and `"report":"tb"`.
    - Test TB.3: With zero TB rows for the selected period, clicking → Toast appears with text `"No data in selected period for export"` (assert via `screen.getByTestId('toast')`).
    - Test TB.4: addLog NOT called if `addLog` prop is undefined (uses optional chaining `addLog?.()`).

    **BasIasAssistant Export CSV (FND-11)**
    - Test BAS.1: Renders "Export CSV" button + `data-testid="export-csv-button-bas"` next to existing Print button.
    - Test BAS.2: Click → addLog called with `'EXPORT_DATA'` + JSON containing `"type":"csv"`, `"report":"bas"`, `"period":"2026-Q1"` (default Q1).
    - Test BAS.3: Empty-period → Toast renders.

    **TaxReturnAssistant Export CSV (FND-12)**
    - Test TR.1: Renders "Export CSV" button + `data-testid="export-csv-button-form-i"` next to existing Print button.
    - Test TR.2: Click → addLog called with `"type":"csv"`, `"report":"form-i"`, `"period":"2026"` (FY default).
    - Test TR.3: Empty labels → Toast renders.
  </behavior>
  <action>
    **Step 1: Create `src/components/Toast.tsx` (~35 lines):**

    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * Toast — lightweight transient-feedback primitive (Phase 9 UX-06 + FND-10/11/12).
     * Single-purpose: empty-CSV-export feedback + UX-06 anomaly cycle position.
     * Do NOT widen to other use cases in v1.1 — see 09-CONTEXT.md.
     */
    import React, { useEffect } from 'react';

    export interface ToastProps {
      message: string;
      duration?: number;     // default 3000ms
      onDismiss: () => void;
      tone?: 'info' | 'warn'; // default 'info'
    }

    export const Toast: React.FC<ToastProps> = ({ message, duration = 3000, onDismiss, tone = 'info' }) => {
      useEffect(() => {
        const t = setTimeout(onDismiss, duration);
        return () => clearTimeout(t);
      }, [duration, onDismiss]);

      const toneClass = tone === 'warn' ? 'bg-amber-600' : 'bg-[var(--ink)]';

      return (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ${toneClass} text-white px-4 py-2 text-sm font-medium shadow-lg cursor-pointer`}
          onClick={onDismiss}
          role="status"
          data-testid="toast"
        >
          {message}
        </div>
      );
    };
    ```

    Then `src/components/__tests__/Toast.test.tsx` covering T.1-T.5 with `vi.useFakeTimers()`.

    **Step 2: Shared download helper (private to each component; do NOT extract a separate file — single use site each, low duplication risk):**

    ```typescript
    // Repeat in each of the 3 components — keeps changes scoped, no new file.
    function triggerCsvDownload(csv: string, filename: string): void {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    ```

    **Step 3: Wire TrialBalance.tsx:**

    a) Add to imports:
    ```typescript
    import { exportTrialBalanceCsv, fmtPeriodSlug } from '../lib/export/csv';
    import { Toast } from './Toast';
    import { today } from '../lib/period';
    import type { AuditAction } from '../types';
    ```

    b) Add props (additive — existing signature preserved):
    ```typescript
    interface TrialBalanceProps {
      accounts: Account[];
      entries: JournalEntry[];
      period?: Period;
      onPeriodChange?: (period: Period) => void;
      // Phase 9 additions:
      entityName?: string;
      entityId?: string;
      addLog?: (action: AuditAction, details: string, entityId?: string) => void;
    }
    ```

    c) Inside the component body, add state and handler:
    ```typescript
    const [toast, setToast] = useState<string | null>(null);

    const handleExportCsv = () => {
      const { filename, csv, isEmpty } = exportTrialBalanceCsv(
        tbData,
        period,
        entityName ?? 'unknown-entity',
      );
      triggerCsvDownload(csv, filename);
      addLog?.(
        'EXPORT_DATA',
        JSON.stringify({
          entityId: entityId ?? 'unknown',
          type: 'csv',
          report: 'tb',
          period: fmtPeriodSlug(period),
          filename,
          timestamp: today().toISOString(),
        }),
        entityId,
      );
      if (isEmpty) {
        setToast('No data in selected period for export');
      }
    };
    ```

    d) Inside the existing `no-print` period controls div (line ~191), add the button as a sibling:
    ```tsx
    <button
      onClick={handleExportCsv}
      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
      data-testid="export-csv-button-tb"
    >
      Export CSV
    </button>
    ```

    e) At the end of the component JSX (before final `</div>`):
    ```tsx
    {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    ```

    **Step 4: Wire BasIasAssistant.tsx (mirror pattern):**

    Add imports for `exportBasLabelsCsv`, `Toast`, `useState` (already imported).
    Add `handleExportCsv` next to existing `handlePrint`:
    ```typescript
    const [toast, setToast] = useState<string | null>(null);

    const handleExportCsv = () => {
      const { filename, csv, isEmpty } = exportBasLabelsCsv(
        result.labels as Partial<Record<string, ReturnLabel>>,
        period,
        entity.name,
      );
      triggerCsvDownload(csv, filename);
      addLog?.('EXPORT_DATA', JSON.stringify({
        entityId: entity.id, type: 'csv', report: 'bas',
        period: fmtPeriodSlug(period), filename,
        timestamp: today().toISOString(),
      }), entity.id);
      if (isEmpty) setToast('No data in selected period for export');
    };
    ```
    Add button next to existing Print button inside the existing `no-print` header (line ~172):
    ```tsx
    <button
      onClick={handleExportCsv}
      className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
      data-testid="export-csv-button-bas"
    >
      Export CSV
    </button>
    ```
    Render Toast at end: `{toast && <Toast message={toast} onDismiss={() => setToast(null)} />}`.

    Import `ReturnLabel` type: `import type { ReturnLabel } from '../lib/tax/returns/fy2026/types';` and `import { fmtPeriodSlug } from '../lib/export/csv';`.

    **Step 5: Wire TaxReturnAssistant.tsx (mirror pattern):**

    Add `useState` to existing React import. Add `handleExportCsv`:
    ```typescript
    const [toast, setToast] = useState<string | null>(null);
    const period: Period = { type: 'fy', fy: effectiveFy };  // Form I is FY-scoped

    const handleExportCsv = () => {
      const { filename, csv, isEmpty } = exportFormILabelsCsv(
        result.labels as Partial<Record<string, ReturnLabel>>,
        accounts,
        period,
        entity.name,
      );
      triggerCsvDownload(csv, filename);
      addLog?.('EXPORT_DATA', JSON.stringify({
        entityId: entity.id, type: 'csv', report: 'form-i',
        period: fmtPeriodSlug(period), filename,
        timestamp: today().toISOString(),
      }), entity.id);
      if (isEmpty) setToast('No data in selected period for export');
    };
    ```
    Add Export CSV button next to existing Print button (line ~148):
    ```tsx
    <button
      onClick={handleExportCsv}
      className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
      data-testid="export-csv-button-form-i"
    >
      Export CSV
    </button>
    ```
    Render Toast at end.

    **Step 6: Update ViewRouter.tsx call sites to pass new props:**

    - TrialBalance call site (line 489):
      ```tsx
      <TrialBalance
        accounts={accounts}
        entries={filteredEntries}
        entityName={activeEntity?.name}
        entityId={activeEntity?.id}
        addLog={addLog}
      />
      ```
    - BasIasAssistant (line 655) — already receives entity; ADD `addLog={addLog}` prop (the prop already exists in the interface).
    - TaxReturnAssistant (line 624) — ADD `addLog={addLog}` and `entity={activeEntity}` (the interface already accepts both, but only some call sites pass them).

    **Step 7: Extend existing test files** with new assertions. Use `vi.useFakeTimers()` in Toast tests; do NOT use fake timers in component tests for click→Toast assertions (the Toast renders synchronously; auto-dismiss timing isn't being tested in component tests).

    For component tests, use `screen.getByTestId('export-csv-button-tb')` and `fireEvent.click(...)`. Mock `URL.createObjectURL` and `URL.revokeObjectURL` with `vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() })` in `beforeEach`. Also stub `HTMLAnchorElement.prototype.click` with `vi.fn()` so the test doesn't navigate.

    Commit messages:
    - `feat(09-1): Toast primitive + tests`
    - `feat(09-1): Export CSV buttons on TB/BAS/Form-I + audit log + empty-period toast`
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/Toast.test.tsx src/components/__tests__/TrialBalance.test.tsx src/components/__tests__/BasIasAssistant.test.tsx src/components/__tests__/TaxReturnAssistant.test.tsx --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - File `src/components/Toast.tsx` exists; line count ≤ 50 (lightweight per CONTEXT)
    - `grep -c "data-testid=\"toast\"" src/components/Toast.tsx` returns 1
    - `grep -c "data-testid=\"export-csv-button-tb\"" src/components/TrialBalance.tsx` returns 1
    - `grep -c "data-testid=\"export-csv-button-bas\"" src/components/BasIasAssistant.tsx` returns 1
    - `grep -c "data-testid=\"export-csv-button-form-i\"" src/components/TaxReturnAssistant.tsx` returns 1
    - `grep -c "exportTrialBalanceCsv" src/components/TrialBalance.tsx` returns 1
    - `grep -c "exportBasLabelsCsv" src/components/BasIasAssistant.tsx` returns 1
    - `grep -c "exportFormILabelsCsv" src/components/TaxReturnAssistant.tsx` returns 1
    - `grep -cE "type.*['\"]csv['\"]" src/components/TrialBalance.tsx src/components/BasIasAssistant.tsx src/components/TaxReturnAssistant.tsx` returns ≥ 3 (EXPORT_DATA payload contains type:'csv')
    - `grep -nE "new Date\\(" src/components/Toast.tsx src/components/TrialBalance.tsx src/components/BasIasAssistant.tsx src/components/TaxReturnAssistant.tsx | grep -v "// date PARSE" | grep -v "^\\s*\\*"` returns ZERO matches in NEW code added by this task (structural lint invariant)
    - `npx vitest run src/components/__tests__/Toast.test.tsx` exit 0 with ≥ 5 GREEN tests
    - `npx vitest run src/components/__tests__/TrialBalance.test.tsx src/components/__tests__/BasIasAssistant.test.tsx src/components/__tests__/TaxReturnAssistant.test.tsx` exit 0 with all new assertions GREEN
    - `npx vitest run` total GREEN ≥ 935 SPA tests, ZERO RED
    - `npx tsc --noEmit` exit 0
  </acceptance_criteria>
  <done>
    Toast primitive shipped (lightweight, single-purpose). All three Export CSV buttons clickable, downloading correctly-formed CSVs with audit-log emission and empty-period feedback. All Phase 5/6 existing tests still GREEN. Period selectors honoured (period closure shared between Print and Export handlers — single source of truth per Pitfall 4).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: UX-06 — Sidebar badge onClick + cycle state + scroll-to-anomaly + 300ms flash + position toast + JournalsView/CoaTreeView filter banners</name>
  <files>
    src/index.css,
    src/components/shell/Sidebar.tsx,
    src/components/__tests__/Sidebar.test.tsx,
    src/components/ViewRouter.tsx,
    src/components/CoaTreeView.tsx,
    src/components/__tests__/CoaTreeView.test.tsx,
    src/components/AccountManager.tsx
  </files>
  <read_first>
    - src/components/shell/Sidebar.tsx (full file — NavButton + anomalyCounts props)
    - src/hooks/useAnomalyCounts.ts (returns `{ journals, accounts }` — journals = unbalanced; accounts = missing tax label)
    - src/components/JournalSearch.tsx (NOT mounted in JournalsView — banner work goes in JournalsView)
    - src/components/ViewRouter.tsx (lines 346-444 JournalsView; lines 686-693 AccountManager call site)
    - src/components/CoaTreeView.tsx (full file — flatten() function produces row order; data-testid pattern `coa-row-{code}`; existing anomaly condition line 100: `!a.gstCode || !a.taxLabel`)
    - src/index.css (Tailwind v4 CSS-first; @import "tailwindcss"; @theme block; no tailwind.config.js)
    - src/components/Toast.tsx (just created Task 2)
    - .planning/phases/09-exports-polish-cleanup/09-RESEARCH.md (§ Pattern 8 cycle state; § Pattern 9 flash animation; § Pattern 11 banner; § Pitfall 3 reflow trick; § Pitfall 5 useEffect for scroll)
    - .planning/phases/09-exports-polish-cleanup/09-CONTEXT.md (§ Decisions → Anomaly fix-it deep-link UX — 4 sub-decisions LOCKED)
  </read_first>
  <behavior>
    **Sidebar cycle + scroll signal (UX-06)**
    - Test S.1: Journals NavButton has `data-testid="nav-journals"` and is clickable when `anomalyCounts.journals > 0`.
    - Test S.2: Clicking Journals badge calls `setView('journals')` then calls `onAnomalyScroll('journals', 0)` (first click → index 0).
    - Test S.3: Second click → `onAnomalyScroll('journals', 1)`; third click → 2; fourth click with `journals=3` → wraps to 0.
    - Test S.4: Same cycling for Accounts badge with `onAnomalyScroll('accounts', N)`.
    - Test S.5: After click, Toast renders top-center with text matching `/Showing anomaly \d+ of \d+ in Journal Entries/` (or `in Accounts`).
    - Test S.6: Navigating away (clicking a different non-badge nav button) resets the relevant cycle index to 0.

    **CoaTreeView filter + scroll + flash (UX-06)**
    - Test C.1: With `filterMissingMappings={true}` + 5 accounts (2 with gstCode+taxLabel, 3 missing one or the other), renders ONLY the 3 anomaly rows.
    - Test C.2: `filterMissingMappings={true}` renders a banner with text "Filtered to anomalies" + a "Clear filter" button.
    - Test C.3: Clicking "Clear filter" calls `onClearAnomalyFilter` prop.
    - Test C.4: With `scrollToAccountIdx={0}` + 3 anomaly accounts visible, the first anomaly row receives the `anomaly-flash` class within a `useEffect`.
    - Test C.5: Re-rendering with `scrollToAccountIdx={1}` (same instance) → second row receives `anomaly-flash` class.
    - Test C.6: Anomaly condition matches existing CoaTreeView badge: `!a.gstCode || !a.taxLabel` (NOT just `!a.taxLabel`).

    **JournalsView filter + scroll + flash (UX-06)** — implemented in ViewRouter.tsx (JournalsView function)
    - Test J.1: With `filterUnbalanced={true}` + 3 entries (1 balanced + 2 unbalanced), renders only 2 unbalanced rows.
    - Test J.2: Renders banner "Filtered to anomalies" + Clear filter button.
    - Test J.3: With `scrollToJournalIdx={0}` → first unbalanced row receives `anomaly-flash` class.
    - Test J.4: "Unbalanced" = `Math.abs(sum(debits) - sum(credits)) > 0.005` (matches useAnomalyCounts.ts line 47).

    **Animation re-trigger (Pitfall 3)**
    - Test A.1: When same `scrollToAccountIdx` value is passed twice in succession (e.g. user clicks badge but cycleIdx loops to same row), the animation re-triggers — verified by spying on `classList.remove` then `classList.add` being called in sequence.
  </behavior>
  <action>
    **Step 1: Add CSS keyframe to `src/index.css`:**

    Append the following EXACT CSS block to the end of `src/index.css`:

    ```css
    /* Phase 9 UX-06 — anomaly-row flash. CSS-first (Tailwind v4; no tailwind.config.js). */
    @keyframes flash-yellow {
      from { background-color: #fef9c3; }   /* Tailwind yellow-100 */
      to   { background-color: transparent; }
    }

    .anomaly-flash {
      animation: flash-yellow 300ms ease-out forwards;
    }
    ```

    **Step 2: Extend `src/components/shell/Sidebar.tsx` interface and add cycle state:**

    a) Add to interface:
    ```typescript
    interface SidebarProps {
      // ... existing props
      /** Phase 9 UX-06 — invoked when a clickable anomaly badge is clicked. */
      onAnomalyScroll?: (target: 'journals' | 'accounts', cycleIdx: number) => void;
    }
    ```

    b) Add to NavButton interface to accept badge onClick:
    ```typescript
    function NavButton({
      active, onClick, icon, label, badge,
      onBadgeClick,                  // Phase 9 — separate handler when badge clicked
    }: {
      active: boolean;
      onClick: () => void;
      icon: React.ReactNode;
      label: string;
      badge?: number;
      onBadgeClick?: () => void;     // when present, badge becomes a clickable <button>
    }) {
      // Render badge as <button> with stopPropagation when onBadgeClick provided;
      // else as the existing <span>.
      // ...
    }
    ```

    Badge rendering update:
    ```tsx
    {badge != null && badge > 0 && (
      onBadgeClick ? (
        <button
          onClick={(e) => { e.stopPropagation(); onBadgeClick(); }}
          className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold hover:bg-red-600"
          data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}-badge`}
        >
          {badge}
        </button>
      ) : (
        <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">
          {badge}
        </span>
      )
    )}
    ```

    c) In the Sidebar component body, add cycle state + toast state:
    ```typescript
    const [journalCycleIdx, setJournalCycleIdx] = useState(0);
    const [accountCycleIdx, setAccountCycleIdx] = useState(0);
    const [toast, setToast] = useState<string | null>(null);

    const handleJournalsBadgeClick = () => {
      const total = anomalyCounts.journals;
      if (total === 0) return;
      const next = journalCycleIdx % total;   // ensure in-range when count drops
      setView('journals');
      onAnomalyScroll?.('journals', next);
      setJournalCycleIdx((i) => (i + 1) % total);
      setToast(`Showing anomaly ${next + 1} of ${total} in Journal Entries`);
    };

    const handleAccountsBadgeClick = () => {
      const total = anomalyCounts.accounts;
      if (total === 0) return;
      const next = accountCycleIdx % total;
      setView('coa-manager');
      onAnomalyScroll?.('accounts', next);
      setAccountCycleIdx((i) => (i + 1) % total);
      setToast(`Showing anomaly ${next + 1} of ${total} in Accounts`);
    };

    // Reset cycle when user navigates via a non-badge route (S.6)
    useEffect(() => {
      // Only resets on view change NOT initiated by our badge handlers.
      // Implementation: keep a ref `lastBadgeNavRef` flipped true by the handlers
      // before setView; useEffect checks ref and clears it after reset.
      // Simpler approach acceptable: reset on view change to anything other
      // than 'journals'/'coa-manager'.
      if (view !== 'journals') setJournalCycleIdx(0);
      if (view !== 'coa-manager') setAccountCycleIdx(0);
    }, [view]);
    ```

    d) Apply onBadgeClick to the two NavButtons:
    ```tsx
    <NavButton
      active={view === 'journals'}
      onClick={() => setView('journals')}
      icon={<BookOpen size={18} />}
      label="Journal Entries"
      badge={anomalyCounts.journals}
      onBadgeClick={handleJournalsBadgeClick}
    />
    // ... and similarly for the Accounts NavButton
    ```

    e) Render Toast at end of Sidebar JSX (inside the aside, AFTER nav):
    ```tsx
    {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    ```

    Add imports: `useState, useEffect, useRef`; `import { Toast } from '../Toast';`.

    **Step 3: Extend `src/components/CoaTreeView.tsx`:**

    a) Add props:
    ```typescript
    interface CoaTreeViewProps {
      // ... existing
      filterMissingMappings?: boolean;
      scrollToAccountIdx?: number;
      onClearAnomalyFilter?: () => void;
    }
    ```

    b) Filter logic in `useMemo`:
    ```typescript
    const flat = useMemo(() => {
      const visible = accounts.filter((a) => showArchived || !a.isArchived);
      const all = flatten(buildTree(visible));
      if (!filterMissingMappings) return all;
      return all.filter((n) => !n.account.gstCode || !n.account.taxLabel);
    }, [accounts, showArchived, filterMissingMappings]);
    ```

    c) Banner above the `<ul>`:
    ```tsx
    {filterMissingMappings && (
      <div
        className="flex items-center gap-2 text-xs bg-yellow-50 border border-yellow-200 px-3 py-1.5 mb-2"
        data-testid="anomaly-filter-banner"
      >
        <span>Filtered to anomalies</span>
        <button
          onClick={onClearAnomalyFilter}
          className="underline text-yellow-800 hover:text-yellow-900"
          data-testid="anomaly-filter-clear"
        >
          Clear filter
        </button>
      </div>
    )}
    ```

    d) Scroll + flash effect — add refs to each `<li>` and a `useEffect`:
    ```typescript
    const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());

    useEffect(() => {
      if (scrollToAccountIdx === undefined) return;
      const target = flat[scrollToAccountIdx];
      if (!target) return;
      const el = rowRefs.current.get(target.account.id);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Re-trigger flash via void-reflow trick (Pitfall 3)
      el.classList.remove('anomaly-flash');
      void el.offsetWidth;            // synchronous reflow — restarts animation
      el.classList.add('anomaly-flash');
      const t = setTimeout(() => el.classList.remove('anomaly-flash'), 300);
      return () => clearTimeout(t);
    }, [scrollToAccountIdx, flat]);

    // In the <li> render:
    <li
      ref={(el) => { if (el) rowRefs.current.set(a.id, el); else rowRefs.current.delete(a.id); }}
      // ... existing props
    >
    ```

    Add `useRef, useEffect` to the React imports.

    **Step 4: Extend ViewRouter.tsx — thread props + replicate banner/flash in JournalsView:**

    a) At top of `ViewRouter` component body, add cycle-signal state:
    ```typescript
    const [scrollToJournalIdx, setScrollToJournalIdx] = useState<number | undefined>(undefined);
    const [scrollToAccountIdx, setScrollToAccountIdx] = useState<number | undefined>(undefined);

    const handleAnomalyScroll = (target: 'journals' | 'accounts', cycleIdx: number) => {
      if (target === 'journals') {
        // Force prop change even if same value — bump via mod-pattern or use a tuple ref.
        // Simpler: append a no-op state to force useEffect re-run.
        setScrollToJournalIdx(cycleIdx);
      } else {
        setScrollToAccountIdx(cycleIdx);
      }
    };
    ```

    b) Pass `onAnomalyScroll` from MainLayout to Sidebar. MainLayout currently receives Sidebar props through its own prop set — update App.tsx → MainLayout → Sidebar chain to thread `onAnomalyScroll`.

    Read `src/components/shell/MainLayout.tsx` first to identify the prop pass-through pattern. Add `onAnomalyScroll` to MainLayout's `SidebarProps` subset and forward it to Sidebar.

    c) JournalsView refactor — add `filterUnbalanced` prop + `scrollToJournalIdx` prop, filter entries, render banner, attach refs + flash effect:

    ```typescript
    interface JournalsViewProps {
      journals: JournalsHook;
      filterUnbalanced?: boolean;
      scrollToJournalIdx?: number;
      onClearAnomalyFilter?: () => void;
    }

    function JournalsView({ journals, filterUnbalanced, scrollToJournalIdx, onClearAnomalyFilter }: JournalsViewProps) {
      const { filteredEntries, /* ... existing */ } = journals;

      const unbalancedEntries = useMemo(() => {
        return filteredEntries.filter((e) => {
          const d = e.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
          const c = e.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
          return Math.abs(d - c) > 0.005;
        });
      }, [filteredEntries]);

      const visibleEntries = filterUnbalanced ? unbalancedEntries : filteredEntries;

      const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

      useEffect(() => {
        if (scrollToJournalIdx === undefined) return;
        const target = unbalancedEntries[scrollToJournalIdx];
        if (!target) return;
        const el = rowRefs.current.get(target.id);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.remove('anomaly-flash');
        void el.offsetWidth;
        el.classList.add('anomaly-flash');
        const t = setTimeout(() => el.classList.remove('anomaly-flash'), 300);
        return () => clearTimeout(t);
      }, [scrollToJournalIdx, unbalancedEntries]);

      // ... existing JSX, but ADD:
      // 1. Banner above the table when filterUnbalanced (data-testid="anomaly-filter-banner")
      // 2. ref={(el) => { if (el) rowRefs.current.set(entry.id, el); }} on each <tr>
      // 3. Use visibleEntries.map(...) instead of filteredEntries.map(...)
    }
    ```

    Pass through at the call site (line 617 of ViewRouter):
    ```tsx
    {view === 'journals' && (
      <JournalsView
        journals={journals}
        filterUnbalanced={scrollToJournalIdx !== undefined}
        scrollToJournalIdx={scrollToJournalIdx}
        onClearAnomalyFilter={() => setScrollToJournalIdx(undefined)}
      />
    )}
    ```

    d) AccountManager pass-through — AccountManager wraps CoaTreeView. Read AccountManager.tsx briefly and forward the new props:
    ```tsx
    {view === 'coa-manager' && (
      <AccountManager
        accounts={accounts}
        onSave={onSaveCOA}
        onCancel={() => setView('master-dashboard')}
        filterMissingMappings={scrollToAccountIdx !== undefined}
        scrollToAccountIdx={scrollToAccountIdx}
        onClearAnomalyFilter={() => setScrollToAccountIdx(undefined)}
      />
    )}
    ```

    Add the same 3 props to AccountManager's interface and pass them through to its internal `<CoaTreeView ... />` render.

    **Step 5: Add `useState, useEffect, useRef, useMemo` imports** to ViewRouter.tsx (currently imports `useEffect` only).

    **Step 6: Tests** — extend the existing test files with all S.1-S.6, C.1-C.6, J.1-J.4, A.1 assertions. Use `vi.useFakeTimers()` where needed to advance the 300ms timeout.

    For Sidebar tests, mock `setView` via the prop and assert call sequence. For flash tests, use `screen.getByTestId(...)` then check `classList.contains('anomaly-flash')` after the useEffect fires (wrap in `act(() => { ... })`).

    Commit message: `feat(09-1): UX-06 anomaly badge deep-links + cycle state + 300ms flash + filter banners`
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/Sidebar.test.tsx src/components/__tests__/CoaTreeView.test.tsx src/components/__tests__/ViewRouter.test.tsx --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "@keyframes flash-yellow" src/index.css` returns 1
    - `grep -c "\\.anomaly-flash" src/index.css` returns 1
    - `grep -c "onAnomalyScroll" src/components/shell/Sidebar.tsx` returns ≥ 2 (interface + usage)
    - `grep -c "void.*offsetWidth" src/components/CoaTreeView.tsx` returns 1 (reflow trick present)
    - `grep -c "void.*offsetWidth" src/components/ViewRouter.tsx` returns 1 (reflow trick in JournalsView)
    - `grep -c "filterMissingMappings" src/components/CoaTreeView.tsx` returns ≥ 2 (prop + filter logic)
    - `grep -c "Showing anomaly" src/components/shell/Sidebar.tsx` returns 1 (toast text)
    - `grep -c "anomaly-filter-banner" src/components/CoaTreeView.tsx` returns 1
    - `grep -c "anomaly-filter-banner" src/components/ViewRouter.tsx` returns 1
    - `grep -c "scrollIntoView" src/components/CoaTreeView.tsx` returns 1
    - `grep -c "scrollIntoView" src/components/ViewRouter.tsx` returns 1
    - `grep -nE "new Date\\(" src/components/shell/Sidebar.tsx src/components/CoaTreeView.tsx | grep -v "// date PARSE"` returns ZERO matches in new code (structural lint)
    - `npx vitest run src/components/__tests__/Sidebar.test.tsx` exit 0 with ≥ 6 GREEN tests (S.1-S.6)
    - `npx vitest run src/components/__tests__/CoaTreeView.test.tsx` exit 0 with ≥ 6 GREEN tests (C.1-C.6)
    - `npx vitest run` total GREEN ≥ 935; 0 RED
    - `npx tsc --noEmit` exit 0
  </acceptance_criteria>
  <done>
    UX-06 deep-links shipped. Clicking Journals or Accounts badge navigates, filters, scrolls to first anomaly, flashes 300ms yellow, shows position toast. Subsequent clicks cycle through and wrap. Clear-filter banner restores full list. Animation re-trigger works on repeated clicks via void-reflow trick. Cycle resets on navigation to a non-anomaly view.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: CLEAN-01 + CLEAN-02 doc/frontmatter sweep + lightweight UAT (~10 manual checks)</name>
  <files>
    .planning/REQUIREMENTS.md,
    .planning/milestones/v1.0-phases/01-safety-net/01-VALIDATION.md,
    .planning/milestones/v1.0-phases/02-decompose-and-tax-engine/02-VALIDATION.md,
    .planning/milestones/v1.0-phases/06-personas-wizard-and-deployment/06-VALIDATION.md
  </files>
  <read_first>
    - .planning/REQUIREMENTS.md (current v1.1 requirements table; rows for FND-10/11/12, UX-06, CLEAN-01, CLEAN-02)
    - .planning/milestones/v1.0-phases/01-safety-net/01-VALIDATION.md (frontmatter lines 1-8)
    - .planning/milestones/v1.0-phases/02-decompose-and-tax-engine/02-VALIDATION.md (frontmatter)
    - .planning/milestones/v1.0-phases/06-personas-wizard-and-deployment/06-VALIDATION.md (frontmatter)
    - src/__tests__/App.test.tsx (line 28 — `expect(text).not.toContain('US Big Law Firm')` already GREEN; confirms CLEAN-01 already done)
    - .planning/phases/09-exports-polish-cleanup/09-VALIDATION.md (§ Manual-Only Verifications — 10-check UAT list)
    - .planning/phases/09-exports-polish-cleanup/09-CONTEXT.md (§ Decisions → Cleanup scope — strict, doc-only)
  </read_first>
  <what-built>
    Auto steps Claude performs BEFORE checkpoint pauses:

    **Sub-step A — CLEAN-01 doc-only update (REQUIREMENTS.md):**

    Use the Edit tool to change the CLEAN-01 row in `.planning/REQUIREMENTS.md` line 46 from:
    ```
    - [ ] **CLEAN-01**: Remove the `'US Big Law Firm'` dead string literal at `src/App.tsx:114` — never renders, leftover from the brownfield prototype, surfaced in v1.0 audit
    ```
    to:
    ```
    - [x] **CLEAN-01**: Remove the `'US Big Law Firm'` dead string literal at `src/App.tsx:114` — **Complete — already fixed in Phase 1 (stale audit entry from v1.0 review); negative assertion in `src/__tests__/App.test.tsx:28` GREEN confirms the absence.**
    ```

    Also update the Traceability table at the bottom: change `| CLEAN-01 | Phase 9 | Pending |` to `| CLEAN-01 | Phase 9 | Complete (09-1) |`.

    **Sub-step B — CLEAN-02 frontmatter flips (3 VALIDATION.md files):**

    For each of:
    - `.planning/milestones/v1.0-phases/01-safety-net/01-VALIDATION.md`
    - `.planning/milestones/v1.0-phases/02-decompose-and-tax-engine/02-VALIDATION.md`
    - `.planning/milestones/v1.0-phases/06-personas-wizard-and-deployment/06-VALIDATION.md`

    Use the Edit tool to flip:
    ```
    nyquist_compliant: false
    ```
    to:
    ```
    nyquist_compliant: true
    ```
    in the YAML frontmatter (line 5 of each file).

    **Sub-step C — Mark all 6 v1.1 Phase 9 requirements complete in REQUIREMENTS.md:**

    For the FND-10, FND-11, FND-12, UX-06 rows (lines 34-40), change `- [ ]` to `- [x]`.
    For the CLEAN-02 row (line 47), change `- [ ]` to `- [x]`.
    In the Traceability table:
    - `| FND-10 | Phase 9 | Pending |` → `| FND-10 | Phase 9 | Complete (09-1) |`
    - `| FND-11 | Phase 9 | Pending |` → `| FND-11 | Phase 9 | Complete (09-1) |`
    - `| FND-12 | Phase 9 | Pending |` → `| FND-12 | Phase 9 | Complete (09-1) |`
    - `| UX-06 | Phase 9 | Pending |` → `| UX-06 | Phase 9 | Complete (09-1) |`
    - `| CLEAN-02 | Phase 9 | Pending |` → `| CLEAN-02 | Phase 9 | Complete (09-1) |`

    **Sub-step D — Full test suite:**

    Run `npx vitest run` and confirm ≥ 935 GREEN, 0 RED. Confirm `npm run build` exits 0 and `npm run lint` exits 0.

    **Sub-step E — Single doc commit:**

    Commit message: `docs(09-1): CLEAN-01 + CLEAN-02 — REQUIREMENTS row + 3 Nyquist frontmatter flips`. Stage ONLY the 4 doc files (REQUIREMENTS.md + 3 VALIDATION.md).
  </what-built>
  <how-to-verify>
    Manual UAT checklist (10 checks; expected ~15-20 min). Run the dev server (`npm run dev`) and use a real entity with at least 3 unbalanced posted journal entries + at least 1 account missing a tax label or GST code.

    **CSV exports (FND-10, FND-11, FND-12):**

    1. **TB CSV — happy path:** Navigate to Trial Balance → click "Export CSV" → confirm a file downloads named like `{entity-slug}-tb-2026.csv`. Open in Excel.
       - Verify: header row reads `code,name,type,debit,credit,balance,period_start,period_end`
       - Verify: money cells render right-aligned as numbers (Excel parsed them)
       - Verify: an account with code starting `0` (e.g. `'0410'` if any exists) displays as `0410` (leading zero preserved)
       - Verify: any account name containing a comma is in a single cell (not split)

    2. **BAS CSV — happy path:** Navigate to BAS & IAS → click Export CSV → file `{slug}-bas-2026-Q1.csv` downloads.
       - Verify: header `label_code,plain_english,value,source` present
       - Verify: G1/1A rows have source="lodgement"; G2/G3/G10/G11 have source="internal-only"

    3. **Form I CSV — happy path:** Navigate to Tax Assistant (Individual entity) → click Export CSV → file `{slug}-form-i-2026.csv` downloads.
       - Verify: header `label_code,plain_english,value,source_account_codes` present
       - Verify: at least one label row has comma-joined account codes in source_account_codes column

    4. **Empty-period → header-only + toast:** Switch to a period with no data (e.g. custom range with a far-future from/to) → click Export CSV. Verify file downloads with header row only AND a toast appears reading `"No data in selected period for export"` (dismisses after 3s).

    **UX-06 deep-links:**

    5. **Journals badge click → first anomaly:** With ≥3 unbalanced posted entries, Sidebar should show "Journal Entries 3" (red badge). Click the badge.
       - Verify: navigates to Journal Entries view
       - Verify: filter banner reads "Filtered to anomalies — Clear filter"
       - Verify: first unbalanced row centered with 300ms yellow flash
       - Verify: toast top-center reads "Showing anomaly 1 of 3 in Journal Entries"

    6. **Journals badge cycle:** Click the same badge again → toast "Showing anomaly 2 of 3" + scroll/flash on next row. Click again → "3 of 3". Click again → "1 of 3" (wraps).

    7. **Accounts badge:** Ensure an account is missing GST or tax label. Click "Accounts N" badge.
       - Verify: navigates to Accounts (CoA manager) view
       - Verify: filter banner present
       - Verify: first anomaly row flashed + toast "Showing anomaly 1 of N in Accounts"

    8. **Clear filter:** On filtered Accounts view, click "Clear filter" in banner → full account tree returns.

    **Doc commits:**

    9. **Nyquist frontmatter flipped:** Run `grep "^nyquist_compliant:" .planning/milestones/v1.0-phases/*/0*-VALIDATION.md`. Verify all 6 phases show `true` (Phases 1, 2, 6 just flipped; Phases 3, 4, 5 already true).

    10. **REQUIREMENTS.md sign-off:** Run `grep -E "^\\- \\[x\\] \\*\\*(FND-10|FND-11|FND-12|UX-06|CLEAN-01|CLEAN-02)" .planning/REQUIREMENTS.md`. Verify all 6 v1.1 requirements show `[x]`.

    Run `npx vitest run` one final time — confirm ≥ 935 SPA GREEN, 18 server GREEN, 0 RED. Run `npm run build` — confirm exit 0.
  </how-to-verify>
  <resume-signal>
    Type `approved` if all 10 UAT checks pass. If any fails, describe the failing check + observed behaviour; planner will queue a gap-closure plan.
  </resume-signal>
  <acceptance_criteria>
    - `grep "^nyquist_compliant: true" .planning/milestones/v1.0-phases/01-safety-net/01-VALIDATION.md` exit 0
    - `grep "^nyquist_compliant: true" .planning/milestones/v1.0-phases/02-decompose-and-tax-engine/02-VALIDATION.md` exit 0
    - `grep "^nyquist_compliant: true" .planning/milestones/v1.0-phases/06-personas-wizard-and-deployment/06-VALIDATION.md` exit 0
    - `grep -E "^\\- \\[x\\] \\*\\*FND-10" .planning/REQUIREMENTS.md` returns 1 match
    - `grep -E "^\\- \\[x\\] \\*\\*FND-11" .planning/REQUIREMENTS.md` returns 1 match
    - `grep -E "^\\- \\[x\\] \\*\\*FND-12" .planning/REQUIREMENTS.md` returns 1 match
    - `grep -E "^\\- \\[x\\] \\*\\*UX-06" .planning/REQUIREMENTS.md` returns 1 match
    - `grep -E "^\\- \\[x\\] \\*\\*CLEAN-01" .planning/REQUIREMENTS.md` returns 1 match
    - `grep -E "^\\- \\[x\\] \\*\\*CLEAN-02" .planning/REQUIREMENTS.md` returns 1 match
    - `grep -c "already fixed in Phase 1" .planning/REQUIREMENTS.md` returns ≥ 1 (CLEAN-01 traceability note present)
    - `npx vitest run` total GREEN ≥ 935 SPA + 18 server; 0 RED; 0 changed (Wave 0 doc-only)
    - `npm run build` exit 0
    - `npm run lint` exit 0
    - User confirms all 10 UAT checks pass
  </acceptance_criteria>
  <done>
    Phase 9 fully shipped. All 6 v1.1 Phase 9 requirements signed off. Phase 1/2/6 Nyquist frontmatter corrected (cosmetic debt closed). CLEAN-01 documented as already-fixed-in-Phase-1 (stale audit entry honoured by traceability note). v1.1 milestone ready for `/gsd:complete-milestone v1.1`.
  </done>
</task>

</tasks>

<verification>
**Per-task gates:**
- Task 1: `npx vitest run src/lib/export/__tests__/csv.test.ts` exit 0 with ≥ 25 GREEN tests
- Task 2: `npx vitest run src/components/__tests__/Toast.test.tsx src/components/__tests__/TrialBalance.test.tsx src/components/__tests__/BasIasAssistant.test.tsx src/components/__tests__/TaxReturnAssistant.test.tsx` exit 0
- Task 3: `npx vitest run src/components/__tests__/Sidebar.test.tsx src/components/__tests__/CoaTreeView.test.tsx` exit 0; structural lint (no `new Date()` outside period.ts) passes
- Task 4: 10-step UAT signed off by user

**Plan-close gate:**
- `npx vitest run` — total GREEN ≥ 935 SPA + 18 server; 0 RED
- `npx tsc --noEmit` exit 0
- `npm run lint` exit 0
- `npm run build` exit 0
- `git status` clean except for intended phase commits
- All 4 commits landed: serialiser + Toast + Export CSV wires + UX-06 + CLEAN doc commit

**Goal-backward verification (must_haves):**
- All 12 truths above hold (run `/gsd:verify-work 9` after Task 4 sign-off)
- All artifact paths exist with stated `provides` content
- All key_links grep-confirmable
</verification>

<success_criteria>
1. **FND-10 GREEN:** From Trial Balance, "Export CSV" button produces correctly-shaped CSV opening cleanly in Excel — header row + raw decimal money + leading-zero codes preserved + period boundaries populated. EXPORT_DATA audit log emitted with type:'csv'. Empty-period → header-only CSV + toast.
2. **FND-11 GREEN:** From BAS & IAS, "Export CSV" produces CSV with `label_code,plain_english,value,source` header; lodgement vs internal-only split matches Phase 5 shipped semantics; period-aware (per quarter selector); audit log emitted.
3. **FND-12 GREEN:** From Tax Assistant (Form I), "Export CSV" produces CSV with `label_code,plain_english,value,source_account_codes`; source_account_codes derived from `accounts.filter(a => a.taxLabel === labelCode)` join (deterministic sort by code); audit log emitted.
4. **UX-06 GREEN:** Sidebar Journals + Accounts badges clickable; cycle through anomalies on repeated clicks (wraps to first after last); 300ms yellow flash on focused row via void-reflow trick; position toast top-center for 3s; filter banner with clear-filter restores full list; component-local cycle state resets on non-badge navigation.
5. **CLEAN-01 GREEN:** REQUIREMENTS.md CLEAN-01 row marked `[x]` with note "already fixed in Phase 1 — stale audit entry"; no code change.
6. **CLEAN-02 GREEN:** `nyquist_compliant: true` set in Phases 1, 2, 6 VALIDATION.md frontmatter.
7. **Test gates:** ~935 SPA GREEN (+25 from 910 baseline) + 18 server GREEN unchanged; 0 RED; lint EXIT 0; build EXIT 0.
8. **UAT sign-off:** 10-step manual UAT approved; ready for `/gsd:complete-milestone v1.1`.
</success_criteria>

<output>
After completion, create `.planning/phases/09-exports-polish-cleanup/09-1-SUMMARY.md` covering:
- Files modified (all 17 listed in frontmatter)
- Test counts before/after (910 → ~935 SPA)
- Commits landed (4 expected: serialiser, Toast, Export CSV wires, UX-06, CLEAN docs)
- Decisions made during execution (especially: where the "Filtered to anomalies" banner ended up for journals — JournalsView vs JournalSearch)
- Any gotchas (Papa.unparse edge cases hit, animation re-trigger issues, etc.)
- Manual UAT outcome (which of the 10 checks passed; any reopened items)
- Sign-off for FND-10, FND-11, FND-12, UX-06, CLEAN-01, CLEAN-02
- Next step: `/gsd:verify-work 9` then `/gsd:complete-milestone v1.1`
</output>
</content>
</invoke>