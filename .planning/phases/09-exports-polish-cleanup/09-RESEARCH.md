---
phase: 9
slug: exports-polish-cleanup
type: research
status: complete
created: 2026-05-30
---

# Phase 9: Exports + Polish + Cleanup — Research

**Researched:** 2026-05-30
**Domain:** CSV serialisation (papaparse), browser download, scroll/flash UX, React toast primitive
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**CSV format conventions (4 sub-decisions)**
- Header row included; money values as raw decimal strings (no `$`, no thousands separators). TB header: `code,name,type,debit,credit,balance,period_start,period_end`. BAS header: `label_code,plain_english,value,source`. Form I header: `label_code,plain_english,value,source_account_codes`.
- Quote all fields + CRLF line endings + UTF-8 BOM prefix. `Papa.unparse({ quotes: true, newline: '\r\n' })` with `﻿` (U+FEFF) prepended to the output string.
- Leading-zero account codes prefixed with `'` (Excel text-marker). When code starts with `'0'`, CSV cell becomes `'0410`. Detection rule: `code.startsWith('0')`.
- Filename convention: `{entity-slug}-{report}-{period}.csv`. Slug = lowercase, non-alphanumeric collapsed to `-`. Period segment: FY (`2026`), BAS quarter (`2026-Q2`), custom range (`2025-07-01_2026-06-30`).

**CSV button placement + interaction (4 sub-decisions)**
- New button next to existing "Print working paper" in each view header. Both inside the existing `no-print` header.
- Immediate download with auto-generated filename, no dialog.
- Period-aware: exports honour the currently-selected period.
- Empty-period: download header-only CSV + show inline toast "No data in selected period for export".

**Anomaly fix-it deep-link UX (UX-06) (4 sub-decisions)**
- Journals badge → JournalSearch (filtered to unbalanced); Accounts badge → CoaTreeView (filtered to missing GST or missing tax-label).
- Highlight style: 300ms yellow background flash + `scrollIntoView({ behavior: 'smooth', block: 'center' })`.
- Cycling: single click advances to next anomaly; wraps to first after last. Cycle position = component-local state on Sidebar.
- Position feedback: transient toast "Showing anomaly N of M in {Screen Name}" (3s auto-dismiss).

**Cleanup scope (4 sub-decisions)**
- Strict scope only: CLEAN-01 (REQUIREMENTS.md doc update, no code change) + CLEAN-02 (3 frontmatter flips).
- CLEAN-01 disposition: REQUIREMENTS.md update only — already fixed in Phase 1.
- Wave structure: single Plan 09-1 with 4 tasks.
- Lightweight UAT (~10 manual checks).

### Claude's Discretion

- Exact toast primitive shape — `<Toast message duration={3000} />` using `useState` + `setTimeout`. Probably `src/components/Toast.tsx`. Planner picks props (e.g. `tone: 'info' | 'warn'`).
- Exact slug-generation regex — `name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')`. Planner confirms or adjusts.
- Exact CSV serialiser function signature — `exportTrialBalanceCsv(accounts, entries, period, entity) → { filename, csv }`. Planner picks exact shape.
- Pre-filter prop API on JournalSearch and CoaTreeView — `filterUnbalanced?: boolean` + `filterMissingMappings?: boolean`.
- Toast position (top-center vs top-right vs bottom-center).
- `fmtPeriod` helper for filename period segment.
- CSV row schema details — exact field ordering and auxiliary columns.
- Whether empty-CSV toast also writes an `EXPORT_DATA` audit log entry.
- Whether the JournalSearch and CoaTreeView pre-filter shows a "Filtered to anomalies — clear filter" banner.

### Deferred Ideas (OUT OF SCOPE)

- Excel `.xlsx` export
- PDF export
- Email-CSV-direct, share-link, cloud-upload
- "Export everything to a zip of CSVs"
- Toast primitive widening to other use cases
- In-form anomaly badge fix-it deep-links (Form I M1/M2 → EntityForm)
- Per-FY archive of past CSV exports
- CSV import (round-trip)
- Re-export with period preset memory across sessions
- TODO/FIXME/XXX audit across src/
- Phase 5 deferred-items.md re-audit
- Cycle-state persistence across navigation
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FND-10 | User can export Trial Balance for the selected period as CSV — one row per account: `code, name, type, debit, credit, balance, period_start, period_end` | `Papa.unparse()` + Blob+anchor pattern verified; `tbData` is already computed in `TrialBalance.tsx` as `TrialBalanceRow[]`; leading-zero handling documented |
| FND-11 | User can export Simpler BAS labels for the selected quarter as CSV — one row per label: `label_code, plain_english, value, source` | `BasReturn.labels` is `Record<BasLabel, ReturnLabel>`; `internalOnly` flag exists on `ReturnLabel` for source column |
| FND-12 | User can export Form I labels for selected FY as CSV — one row per label: `label_code, plain_english, value, source_account_codes` | `IndividualReturnLabels` shape confirmed; `source_account_codes` requires new derivation from account mapping; implementation pattern documented |
| UX-06 | Clicking Sidebar anomaly count badge deep-links to relevant screen AND auto-scrolls to first offending row; subsequent clicks cycle through remaining offenders | `useAnomalyCounts` hook shape confirmed; `JournalSearch` `defaultFilters` prop pattern available; `CoaTreeView` flat list exposes `data-testid="coa-row-{code}"`; scroll + flash patterns documented |
| CLEAN-01 | REQUIREMENTS.md row update only — App.tsx dead string already removed in Phase 1 | Confirmed: `App.tsx` is 94 lines; CLEAN-01 is a doc-only update |
| CLEAN-02 | Flip `nyquist_compliant: false` → `true` in 3 v1.0 VALIDATION.md files | Doc-only frontmatter change; no test changes |
</phase_requirements>

---

## Summary

Phase 9 is a focused polish-and-ship phase. The bulk of implementation risk is concentrated in two areas: (1) `Papa.unparse()` edge cases for the CSV serialiser — specifically the empty-array behaviour, the `fields`/`data` object form needed for header-only CSVs, and the `null`/`undefined` cell handling; (2) the scroll-to-anomaly cycling in Sidebar where component-local cycle state must be threaded through `JournalSearch` and `CoaTreeView` via new optional props. Everything else is low-risk extension of established patterns.

All API surfaces have been verified against the live `papaparse@5.5.3` install in the repo via Node test invocations. There is no `slugify` function in `persona.ts` — it does not exist; the planner must inline the 1-line regex. The `period.ts` module has no `fmtPeriod` helper — the planner must create one for the filename segment, or inline it in the serialiser. The `ReturnLabel` type has no `sourceAccountCodes` field — Form I CSV serialiser will need to derive source account codes from the account mapping, not from the existing return types.

**Primary recommendation:** Use `Papa.unparse({fields, data}, {quotes: true, newline: '\r\n'})` (object form) for all three serialisers — this ensures the header row is always emitted even when `data` is empty, enabling the empty-CSV header-only pattern without post-unparse string manipulation.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| papaparse | 5.5.3 | CSV serialisation via `Papa.unparse()` | Already in repo from Phase 4; zero new dependency |
| React | 19.x | Toast primitive + prop additions | Project stack |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Blob + anchor download | Browser native | CSV file download trigger | Same pattern as DataPage.tsx JSON export (Phase 3) |
| URL.createObjectURL | Browser native | Object URL for Blob download | Already used in DataPage.tsx |
| scrollIntoView | Browser native | Scroll-to-anomaly row | Supported in all target browsers |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| papaparse unparse | Hand-rolled RFC 4180 | Hand-rolled misses edge cases (embedded quotes, CRLF in cells, escaping) — do not use |
| CSS @keyframes for flash | Tailwind JIT animation utility | No tailwind.config.js exists (Tailwind v4 CSS-first); add `@keyframes` to `index.css` directly |
| Component-local toast state | Global toast queue | Two callers only; component-local is simpler and matches CONTEXT decision |

**Installation:** No new packages required. `papaparse` is already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/lib/export/
├── csv.ts                    # Pure-function serialisers + filename generator
└── __tests__/
    └── csv.test.ts           # Unit tests for serialisers

src/components/
├── Toast.tsx                 # New lightweight toast primitive (~30 lines)
└── __tests__/
    └── Toast.test.tsx        # Unit tests for Toast
```

### Pattern 1: Papa.unparse Object Form (REQUIRED for header-only CSV)

**What:** When `data` is empty, `Papa.unparse([], opts)` returns `""` (empty string — no header). To get a header-only CSV, use the object form with explicit `fields`.

**When to use:** Always. The object form works for both non-empty and empty data sets.

```typescript
// Source: verified against papaparse@5.5.3 in repo via Node
import Papa from 'papaparse';

const BOM = '﻿';

function serialise(
  fields: string[],
  data: Record<string, string>[],
): string {
  const csv = Papa.unparse(
    { fields, data },
    { quotes: true, newline: '\r\n' },
  );
  return BOM + csv;
}
```

**Verified behaviour:**
- `Papa.unparse({fields: ['a','b'], data: []}, {quotes:true, newline:'\r\n'})` → `"\"a\",\"b\"\r\n"` (header-only, correct)
- `Papa.unparse([], {quotes:true, newline:'\r\n'})` → `""` (empty — WRONG for empty-period use case)
- `Papa.unparse(rows, opts)` where `null` cell → `""` in output; `undefined` cell → `""` in output (trailing comma omitted in practice — use `""` explicitly for nullable fields)
- Default `delimiter` is `,` — correct for AU locale expectation
- Double-quotes in values are escaped as `""` (standard RFC 4180)

### Pattern 2: UTF-8 BOM Prepend

**What:** Prepend `﻿` (U+FEFF) as a string character before passing to `new Blob()`.

```typescript
// Source: verified via TextEncoder in Node — bytes confirmed as EF BB BF
const BOM = '﻿';
const csv = Papa.unparse({ fields, data }, { quotes: true, newline: '\r\n' });
const withBom = BOM + csv;
const blob = new Blob([withBom], { type: 'text/csv;charset=utf-8' });
```

**Confirmed:** `new TextEncoder().encode('﻿')` produces bytes `[0xEF, 0xBB, 0xBF]` — the correct UTF-8 BOM sequence. Excel-on-Windows opens UTF-8 CSV files correctly when this BOM is present. Google Sheets and macOS Excel handle it without issue (they ignore the BOM).

### Pattern 3: Leading-Zero Account Code Quote-Prefix

**What:** When account code starts with `'0'`, prefix value with `'` before serialisation. papaparse's `quotes: true` then wraps it as `"'0410"`. Excel sees the apostrophe inside the double-quoted cell and treats the cell content as text, preserving the leading zero.

```typescript
// Source: verified against papaparse@5.5.3 in repo
function applyLeadingZeroPrefix(code: string): string {
  return code.startsWith('0') ? `'${code}` : code;
}

// Usage in row serialisation:
const row = {
  code: applyLeadingZeroPrefix(account.code),  // "'0410" → CSV: "'0410"
  name: account.name,
  // ...
};
```

**Verified:** `Papa.unparse([{code: "'0410", name: "Cash"}], {quotes:true})` produces `"code","name"\r\n"'0410","Cash"`. Excel interprets `"'0410"` as text cell containing `'0410` — the apostrophe acts as the Excel text-prefix marker, preserving the leading zero.

### Pattern 4: Blob + Anchor Download (reuse DataPage pattern)

```typescript
// Source: DataPage.tsx handleExport() — Phase 3 pattern, reuse exactly
function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
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

**Note:** `DataPage.tsx` uses `today()` from `period.ts` for the timestamp — the same pattern is required here (no `new Date()` outside `period.ts` per architecture invariant).

### Pattern 5: Audit Log Emission for CSV Export

```typescript
// Source: BasIasAssistant.tsx handlePrint() + TaxReturnAssistant.tsx handlePrint()
addLog?.(
  'EXPORT_DATA',
  JSON.stringify({
    entityId: entity.id,
    type: 'csv',
    report: 'TB' | 'BAS' | 'FormI',
    period: periodDescription,
    filename,
    timestamp: today().toISOString(),
  }),
  entity.id,
);
```

**Established pattern:** All 5 existing print handlers use `addLog?.('EXPORT_DATA', JSON.stringify({...}), entityId)`. CSV export joins this channel with `type: 'csv'` to distinguish from the existing `type` fields.

### Pattern 6: Filename Slug Generation

**What:** `persona.ts` does NOT contain a `slugify` function (confirmed by grep). The CONTEXT-specified regex must be inlined in `csv.ts`.

```typescript
// Source: confirmed no existing slugify in codebase — inline in csv.ts
function slugifyEntityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Verified against test cases:
// 'Acme Pty Ltd'         → 'acme-pty-ltd'
// 'Smith & Sons (AU)'    → 'smith-sons-au'
// 'O\'Brien Family Trust'→ 'o-brien-family-trust'
```

### Pattern 7: Period Filename Segment

**What:** `period.ts` does NOT have a `fmtPeriod` helper (confirmed by grep). Create it in `csv.ts` as a local pure function.

```typescript
// Source: derived from period.ts fyBoundaries() and quarterBoundaries() shapes
import type { Period } from '../period';

function fmtPeriodSlug(period: Period): string {
  if (period.type === 'fy') {
    // 'FY2026' → '2026'
    return period.fy.replace('FY', '');
  }
  if (period.type === 'quarter') {
    // { fy: 'FY2026', q: 2 } → '2026-Q2'
    return `${period.fy.replace('FY', '')}-Q${period.q}`;
  }
  // Custom: { from: Date, to: Date } → '2025-07-01_2026-06-30'
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `${fmt(period.from)}_${fmt(period.to)}`;
}
```

### Pattern 8: UX-06 Sidebar Cycle State

**What:** Sidebar holds component-local cycle state as a map. JournalSearch gains `defaultFilterUnbalanced?: boolean` + `scrollToEntryIndex?: number` props. CoaTreeView gains `filterMissingMappings?: boolean` + `scrollToAccountIndex?: number` props.

**JournalSearch current state shape (read from source):**
- Has `defaultFilters?: Partial<SearchFilters>` prop already
- Internal state: `reference`, `description`, `accountId`, `dateFrom`, `dateTo`, `amountFrom`, `amountTo`
- `SearchFilters` type — no `isUnbalanced` flag present; needs new internal filter state

**CoaTreeView current state shape (read from source):**
- Has `accounts`, `onSelect`, `selectedId`, `showArchived` props
- Renders via `flat` (flattened tree) with `data-testid="coa-row-{code}"`
- Rows are `<li>` elements with `data-testid` attributes

**Cycle state in Sidebar:**
```typescript
// Component-local — no URL state, no global state (CONTEXT decision)
const [journalCycleIdx, setJournalCycleIdx] = useState(0);
const [accountCycleIdx, setAccountCycleIdx] = useState(0);

// On Journals badge click:
// 1. setView('journals') — navigate
// 2. setJournalCycleIdx((i) => (i + 1) % Math.max(1, anomalyCounts.journals))
// Pass journalCycleIdx as prop to the journals view which passes to JournalSearch

// Reset on non-badge navigation (plain setView call without cycle increment)
```

**Prop threading:** Sidebar knows `setView` and `anomalyCounts`. The cycle index must reach `JournalSearch` and `CoaTreeView`. Since these are rendered in a view router, the App must lift the cycle state OR Sidebar passes it via a shared callback. Given the existing architecture where Sidebar only calls `setView()`, the cleanest approach is: add `scrollToUnbalancedIndex?: number` and `scrollToMissingMappingIndex?: number` props to the App's view routing props.

### Pattern 9: 300ms Yellow Background Flash

**What:** Tailwind v4 uses CSS-first config. There is no `tailwind.config.js`. Custom `@keyframes` go directly in `src/index.css` or a separate `.css` file.

```css
/* Add to src/index.css — after the existing @theme block */
@keyframes flash-yellow {
  from { background-color: var(--color-yellow-100, #fef9c3); }
  to   { background-color: transparent; }
}

.anomaly-flash {
  animation: flash-yellow 300ms ease-out forwards;
}
```

**Re-trigger on repeated clicks (same element):** CSS animations don't restart if the class is already present. Use the void-reflow trick:

```typescript
// React ref approach — no key-prop trickery needed
const rowRef = useRef<HTMLElement>(null);

function triggerFlash() {
  const el = rowRef.current;
  if (!el) return;
  el.classList.remove('anomaly-flash');
  // Force reflow to flush the animation state
  void el.offsetWidth;
  el.classList.add('anomaly-flash');
  // Optional: auto-remove class after animation (keeps DOM clean)
  setTimeout(() => el.classList.remove('anomaly-flash'), 300);
}
```

**Confidence:** HIGH — `void el.offsetWidth` is a well-established CSS animation re-trigger pattern supported in all browsers.

### Pattern 10: Lightweight Toast Primitive

**What:** Single-purpose `<Toast>` component. Two callers: empty-CSV export and UX-06 position feedback.

```typescript
// src/components/Toast.tsx (~30 lines)
import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  duration?: number;   // default 3000ms
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  duration = 3000,
  onDismiss,
}) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[var(--ink)] text-white px-4 py-2 text-sm font-medium shadow-lg"
      onClick={onDismiss}
      role="status"
      data-testid="toast"
    >
      {message}
    </div>
  );
};
```

**Callsite pattern (component-local state):**
```typescript
const [toast, setToast] = useState<string | null>(null);

// Trigger:
setToast('No data in selected period for export');

// Render:
{toast && (
  <Toast message={toast} onDismiss={() => setToast(null)} />
)}
```

**Why component-local, not global:** CONTEXT locks this to two callers only. Component-local state avoids prop-drilling and avoids global state complexity. Each calling component (TrialBalance/BasIasAssistant/TaxReturnAssistant for empty-CSV; Sidebar for UX-06 cycling) holds its own `[toast, setToast]` state.

### Pattern 11: "Filtered to anomalies — clear filter" Banner

**What:** When `filterUnbalanced` or `filterMissingMappings` is active, show a dismissible banner above the list. Reuse existing border/bg styling pattern (matches Phase 4 filter-clear UX).

```tsx
// In JournalSearch or CoaTreeView when pre-filter active:
{isFilteredToAnomalies && (
  <div className="flex items-center gap-2 text-xs bg-yellow-50 border border-yellow-200 px-3 py-1.5 mb-2">
    <span>Filtered to anomalies</span>
    <button
      onClick={clearAnomalyFilter}
      className="underline text-yellow-800 hover:text-yellow-900"
    >
      Clear filter
    </button>
  </div>
)}
```

### Anti-Patterns to Avoid

- **`Papa.unparse([], opts)` for empty data:** Returns `""` — no header row. Use `Papa.unparse({fields, data:[]}, opts)` instead.
- **`new Date()` for filename timestamp:** Violates Phase 2 structural lint invariant. Use `today()` from `period.ts` or derive dates from the `Period` object directly.
- **Mutating `decimal.js` values before CSV serialisation:** CSV money cells must be raw decimal strings — call `.toString()` on the `Decimal` value (not `.toFixed(2)` which may lose precision or add trailing zeros inappropriately). For cells already rounded to 2dp by the return compute, `.toFixed(2)` is acceptable.
- **Adding the `anomaly-flash` class without the void-reflow trick:** Re-clicking will not re-trigger the animation. Always `remove → void offsetWidth → add`.
- **Expanding Toast beyond two call sites in v1.1:** CONTEXT is explicit — do not add Toast to save confirmations, error messages, or AnomalyBadge interactions. Single-purpose only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV serialisation | Custom RFC 4180 quoting | `Papa.unparse()` | Handles embedded commas, quotes, newlines in cell values; already in repo |
| BOM bytes | Manual byte array | `'﻿'` prepended as a string | Browser Blob + TextEncoder handles the UTF-8 BOM encoding correctly |
| Blob download | XHR / fetch response | `URL.createObjectURL(blob)` + anchor click | Established in DataPage.tsx; works in all target environments |

---

## Common Pitfalls

### Pitfall 1: `Papa.unparse([])` Returns Empty String

**What goes wrong:** Calling `Papa.unparse([], opts)` when there are no data rows returns `""` — not a header-only CSV. The download produces an empty file instead of a CSV with the header row.

**Why it happens:** papaparse infers field names from the first object in the array. With an empty array, there are no fields to infer.

**How to avoid:** Always use the object form: `Papa.unparse({fields: FIELD_NAMES, data: rows}, opts)`. This always emits the header row regardless of whether `data` is empty.

**Detection:** Check `data.length === 0` BEFORE calling `unparse` — if zero rows, still call `unparse({fields, data:[]}, opts)` to get the header-only CSV, then show the toast.

### Pitfall 2: Null/Undefined Cells Produce Trailing Comma Gap

**What goes wrong:** If a data row object has `undefined` for a field (e.g. `source_account_codes` for a label with no mapped accounts), `Papa.unparse` will produce an empty cell (no value between commas) — which is correct CSV behaviour, but the resulting cell may look like a gap in Excel.

**Why it happens:** papaparse maps `undefined` → `""` (empty string in CSV). This is the desired behaviour for nullable fields.

**How to avoid:** For fields that may be absent, explicitly set `fieldValue ?? ''` in the row object before passing to `unparse`. This makes intent explicit.

### Pitfall 3: CSS Animation Re-trigger Failure

**What goes wrong:** User clicks a Sidebar badge, row flashes. User clicks again to cycle to the next anomaly (same row or different row with same element ref). The `anomaly-flash` class is already present, so the animation does not restart.

**Why it happens:** CSS animations only play when transitioning from "not present" to "present". Adding the same class twice does nothing.

**How to avoid:** Use the void-reflow trick: `el.classList.remove('anomaly-flash'); void el.offsetWidth; el.classList.add('anomaly-flash')`. The `void el.offsetWidth` forces a synchronous style recalculation, resetting the animation state.

### Pitfall 4: Period Selector State Drift Between Print and Export

**What goes wrong:** The "Export CSV" button exports data for a different period than what the user sees on screen.

**Why it happens:** If the CSV serialiser reads period state from a different source than the view renders from.

**How to avoid:** Each view component holds its own `period` state. Pass the same `period` variable to both the render logic and the export handler. The export button handler captures `period` from the same closure as the print button handler. In `TrialBalance.tsx`, the `period` variable is already in scope — use it directly.

### Pitfall 5: scrollIntoView on an Element That Hasn't Rendered

**What goes wrong:** Badge click triggers `setView('journals')` and immediately calls `scrollIntoView` on a DOM element. The element doesn't exist yet because React hasn't committed the new view.

**Why it happens:** `setView` is a state setter; the new view renders asynchronously after the next paint.

**How to avoid:** Pass the scroll-to-index as a prop. The target component (`JournalSearch` / `CoaTreeView`) handles the scroll in a `useEffect` that runs after the component mounts and after the prop changes. The effect reads the `scrollToEntryIndex` prop and fires `scrollIntoView` only after the DOM is committed.

```typescript
// In JournalSearch (after new props arrive):
useEffect(() => {
  if (scrollToEntryIndex === undefined) return;
  // find the nth unbalanced entry row and scroll to it
}, [scrollToEntryIndex, filteredEntries]);
```

### Pitfall 6: Form I Source Account Codes — Not on ReturnLabel

**What goes wrong:** Implementing `exportFormILabelsCsv` and trying to read `sourceAccountCodes` from a `ReturnLabel` object. The field does not exist on `ReturnLabel`.

**Why it happens:** `ReturnLabel` (defined in `src/lib/tax/returns/fy2026/types.ts`) only has `code`, `plainEnglish`, `value`, `internalOnly`, `natReference`. No account-source tracking.

**How to avoid:** The serialiser must derive `source_account_codes` by cross-referencing the account's `taxLabel` field against the label code. For TB-derived labels, iterate `accounts` filtered to those with `taxLabel === labelCode` and collect `account.code`. This is a join operation at the serialiser level, not available from the ComputedReturn object.

**Recommended approach:** Pass `accounts: Account[]` to `exportFormILabelsCsv`. Derive source codes as:
```typescript
const sourceCodesFor = (labelCode: string): string =>
  accounts
    .filter(a => a.taxLabel === labelCode)
    .map(a => a.code)
    .join(' | ');
```

---

## Code Examples

### Full CSV Serialiser Skeleton for Trial Balance

```typescript
// src/lib/export/csv.ts
import Papa from 'papaparse';
import type { Account, JournalEntry } from '../../types';
import type { Period } from '../period';
import { today } from '../period';

const BOM = '﻿';
const TB_FIELDS = ['code','name','type','debit','credit','balance','period_start','period_end'] as const;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function fmtPeriodSlug(period: Period): string {
  if (period.type === 'fy') return period.fy.replace('FY', '');
  if (period.type === 'quarter') return `${period.fy.replace('FY', '')}-Q${period.q}`;
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `${fmt(period.from)}_${fmt(period.to)}`;
}

function applyLeadingZeroPrefix(code: string): string {
  return code.startsWith('0') ? `'${code}` : code;
}

export interface CsvExportResult {
  filename: string;
  csv: string;        // BOM-prefixed; empty string impossible (always has header)
  isEmpty: boolean;   // true when data rows = 0 (caller shows toast)
}

export function exportTrialBalanceCsv(
  tbRows: Array<{account: Account; debit: number; credit: number; balance: number}>,
  period: Period,
  entityName: string,
  periodStart: string,
  periodEnd: string,
): CsvExportResult {
  const slug = slugify(entityName);
  const periodSlug = fmtPeriodSlug(period);
  const filename = `${slug}-tb-${periodSlug}.csv`;
  const isEmpty = tbRows.length === 0;

  const data = tbRows.map(r => ({
    code: applyLeadingZeroPrefix(r.account.code),
    name: r.account.name,
    type: r.account.type,
    debit: r.debit.toString(),
    credit: r.credit.toString(),
    balance: r.balance.toString(),
    period_start: periodStart,
    period_end: periodEnd,
  }));

  const csv = BOM + Papa.unparse(
    { fields: [...TB_FIELDS], data },
    { quotes: true, newline: '\r\n' },
  );

  return { filename, csv, isEmpty };
}
```

### Toast Wiring in TrialBalance

```typescript
// In TrialBalance.tsx — after adding state
const [toast, setToast] = useState<string | null>(null);

const handleExportCsv = () => {
  const { filename, csv, isEmpty } = exportTrialBalanceCsv(
    tbData, period, entity.name, periodStart, periodEnd,
  );
  if (isEmpty) {
    setToast('No data in selected period for export');
  }
  triggerDownload(csv, filename, 'text/csv;charset=utf-8');
  addLog?.('EXPORT_DATA', JSON.stringify({
    entityId: entity.id, type: 'csv', report: 'TB',
    period: fmtPeriodSlug(period), filename,
    timestamp: today().toISOString(),
  }), entity.id);
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tailwind.config.js for custom animations | `@keyframes` in CSS files directly (Tailwind v4 CSS-first) | Tailwind v4 (in use) | Custom flash animation goes in `index.css`, not a config file |
| `new Date()` for timestamps | `today()` from `period.ts` | Phase 2 invariant | All timestamp generation must use `today()` |
| `Papa.parse()` only (import path) | `Papa.unparse()` added (export path) | Phase 9 | `unparse` is in the same `papaparse` package — no new install |

---

## Open Questions

1. **source_account_codes for Form I — account.taxLabel mapping**
   - What we know: `ReturnLabel` has no `sourceAccountCodes` field; accounts have `taxLabel?: string`
   - What's unclear: Whether the `taxLabel` field on `Account` maps to exactly the Form I label code strings (e.g. `'B1'`, `'P1'`, etc.)
   - Recommendation: Planner should verify the `taxLabel` values in the default CoA against the `INDIVIDUAL_LABELS_FULL` keys from `src/lib/tax/labels/fy2026.ts`. If they match, the join is straightforward. If not, a mapping table may be needed.

2. **Scroll target for JournalSearch anomaly rows**
   - What we know: `JournalSearch` renders a filter panel; the actual journal entry rows are rendered in a parent component (not inside JournalSearch itself)
   - What's unclear: Where exactly the journal list is rendered — the `JournalSearch` component only contains the filter UI; the actual rows live in the parent (likely a Journals view component). Scroll-to may need to happen at the parent level, not inside JournalSearch.
   - Recommendation: Planner must read the parent component that renders both `JournalSearch` and the journal entry rows to determine the correct scroll target element. The scroll ref should be on the journal entry row, managed in the parent.

3. **CoaTreeView filter prop — `filterMissingMappings` scope**
   - What we know: `CoaTreeView` currently shows anomaly badges on rows where `!a.gstCode || !a.taxLabel`. The `filterMissingMappings` prop should filter the rendered list to only these rows.
   - What's unclear: Whether "missing mappings" means `!gstCode` OR `!taxLabel`, or just `!taxLabel` (CONTEXT says "missing-GST/missing-taxLabel")
   - Recommendation: Filter to accounts where `!a.gstCode || !a.taxLabel` — matching the existing anomaly badge condition in `CoaTreeView.tsx` line 100.

---

## Validation Architecture

> `workflow.nyquist_validation` is not explicitly set to `false` in `.planning/config.json` — section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest + @testing-library/react |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run --reporter=verbose src/lib/export/ src/components/__tests__/Toast.test.tsx` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| FND-10 | `exportTrialBalanceCsv` returns correctly-shaped CSV with header row, BOM, CRLF, leading-zero prefix | unit | `npx vitest run src/lib/export/__tests__/csv.test.ts` | No — Wave 0 |
| FND-10 | `exportTrialBalanceCsv` with empty tbRows returns isEmpty=true + header-only CSV | unit | `npx vitest run src/lib/export/__tests__/csv.test.ts` | No — Wave 0 |
| FND-11 | `exportBasLabelsCsv` returns rows with source column indicating lodgement vs internal-only | unit | `npx vitest run src/lib/export/__tests__/csv.test.ts` | No — Wave 0 |
| FND-12 | `exportFormILabelsCsv` returns rows with source_account_codes derived from account taxLabel join | unit | `npx vitest run src/lib/export/__tests__/csv.test.ts` | No — Wave 0 |
| FND-10/11/12 | Export CSV button present in TrialBalance/BasIasAssistant/TaxReturnAssistant | unit (component) | `npx vitest run src/components/__tests__/TrialBalance.test.tsx src/components/__tests__/BasIasAssistant.test.tsx src/components/__tests__/TaxReturnAssistant.test.tsx` | Yes — extend existing |
| FND-10/11/12 | Export CSV button click emits EXPORT_DATA audit log with type:'csv' | unit (component) | `npx vitest run src/components/__tests__/TrialBalance.test.tsx` | Yes — extend existing |
| UX-06 | Toast renders with message, auto-dismisses after duration | unit | `npx vitest run src/components/__tests__/Toast.test.tsx` | No — Wave 0 |
| UX-06 | JournalSearch renders "Filtered to anomalies — clear filter" banner when filterUnbalanced=true | unit (component) | `npx vitest run src/components/__tests__/JournalSearch.test.tsx` | Yes — extend existing |
| UX-06 | CoaTreeView filters to anomaly rows when filterMissingMappings=true | unit (component) | `npx vitest run src/components/__tests__/CoaTreeView.test.tsx` | Yes — extend existing |
| CLEAN-01 | `git grep "US Big Law Firm" src/` returns zero matches | smoke (structural) | `npx vitest run src/components/__tests__/smoke.test.tsx` | Yes — verify existing negative assertion passes |
| CLEAN-02 | Three VALIDATION.md files have nyquist_compliant: true | manual | UAT checklist item | N/A (doc-only) |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/export/__tests__/csv.test.ts` (Task 1); `npx vitest run src/components/__tests__/Toast.test.tsx` (Task 2); `npx vitest run src/components/__tests__/JournalSearch.test.tsx src/components/__tests__/CoaTreeView.test.tsx src/components/__tests__/Sidebar.test.tsx` (Task 3)
- **Per wave merge (end of Plan 09-1):** `npx vitest run`
- **Phase gate:** Full suite GREEN (target: 910 + ~25 new = ~935 GREEN) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/export/__tests__/csv.test.ts` — covers FND-10, FND-11, FND-12 pure function unit tests
- [ ] `src/components/__tests__/Toast.test.tsx` — covers UX-06 toast primitive
- [ ] `src/lib/export/csv.ts` — stub module (pure functions return empty CsvExportResult)

*(Existing test infrastructure: vitest + jsdom + @testing-library/react — no new framework install required)*

---

## Sources

### Primary (HIGH confidence)

- `papaparse@5.5.3` — verified via Node execution against `node_modules/papaparse` in repo. All `Papa.unparse()` behaviours verified directly: empty array → `""`, object form with fields → header-only, null/undefined cells → `""`, quotes + CRLF options, apostrophe prefix quoting, BOM byte sequence.
- `src/lib/import/csv.ts` — existing `papaparse` usage pattern (parse path); confirms import style and project integration
- `src/components/DataPage.tsx` — Blob + anchor download pattern (Phase 3); confirmed reusable for CSV export
- `src/hooks/useAnomalyCounts.ts` — confirmed `{ journals: number, accounts: number }` return shape
- `src/components/shell/Sidebar.tsx` — confirmed `anomalyCounts` prop threading + `NavButton` badge rendering; no `onClick` on badge currently
- `src/components/JournalSearch.tsx` — confirmed `defaultFilters?: Partial<SearchFilters>` prop exists; no `filterUnbalanced` prop yet
- `src/components/CoaTreeView.tsx` — confirmed `data-testid="coa-row-{code}"` pattern; no `filterMissingMappings` prop yet
- `src/components/TrialBalance.tsx` — confirmed `tbData` as `TrialBalanceRow[]`; period state in component
- `src/components/BasIasAssistant.tsx` — confirmed `EXPORT_DATA` emission pattern + `periodChoice` state
- `src/lib/period.ts` — confirmed no `fmtPeriod` helper exists; must be created
- `src/lib/persona.ts` — confirmed no `slugify` function exists; must be inlined
- `src/lib/tax/returns/fy2026/types.ts` — confirmed `ReturnLabel` has no `sourceAccountCodes`; Form I serialiser requires account-join derivation
- `src/index.css` — confirmed Tailwind v4 CSS-first config (`@import "tailwindcss"`, no `tailwind.config.js`); `@keyframes` go in this file

### Secondary (MEDIUM confidence)

- UTF-8 BOM (U+FEFF) for Excel CSV: verified via `TextEncoder` that `'﻿'` encodes to `[0xEF, 0xBB, 0xBF]` — the correct UTF-8 BOM. Excel-on-Windows opens UTF-8 CSV reliably with this BOM. This is a well-established convention documented across Microsoft's CSV format guidelines.
- `scrollIntoView({ behavior: 'smooth', block: 'center' })` — smooth scroll is supported in Chromium 61+, Firefox 36+, Safari 15.4+. Pre-15.4 Safari ignores `behavior: 'smooth'` and scrolls instantly; `block: 'center'` still works. The CONTEXT decision's `behavior: 'smooth'` is fine for the target audience (modern browser). No polyfill needed.
- CSS animation re-trigger via `void el.offsetWidth` — established pattern across MDN animation docs and browser developer documentation.

### Tertiary (LOW confidence)

- Excel behaviour for `"'0410"` quoted CSV cell treating apostrophe as text prefix: verified by Node test showing the raw CSV output is `"'0410"`. Excel apostrophe-as-text-prefix behaviour inside double-quoted cells is documented as Xero/MYOB convention but cannot be browser-verified without Excel. Confidence is MEDIUM-LOW — requires UAT confirmation in the 10-step manual checks.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — papaparse 5.5.3 verified in repo; all API behaviours tested via Node
- Architecture: HIGH — all source files read; patterns confirmed against actual code
- Pitfalls: HIGH — most pitfalls discovered via live testing (empty array, null cells, animation re-trigger)
- Form I source_account_codes: MEDIUM — derivation strategy clear but taxLabel-to-label-code join needs planner verification

**Research date:** 2026-05-30
**Valid until:** 2026-06-30 (stable libraries; Tailwind v4 CSS-first config is current)
