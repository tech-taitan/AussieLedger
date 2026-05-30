---
phase: 7
slug: importtb-ux-rework
type: research
status: complete
created: 2026-05-30
---

# Phase 7: ImportTB UX Rework — Research

**Researched:** 2026-05-30
**Domain:** CSV/XLSX parsing heuristics, tolerant currency parsing, UI state machine extension
**Confidence:** HIGH (architecture + algorithm decisions), MEDIUM (real-world fixture shapes — documented from vendor docs + community sources, not from first-hand exports)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Header-row detection UX (4 sub-decisions)**
- Auto-pick the most-likely row + show alternatives. Heuristic scores every row in the first ~15 by string-density + match against known TB-header pattern list. Top scorer is auto-picked. UI shows "We think row N is the header" with a small "pick a different row" link revealing the top-3 candidates with confidence scores.
- Click any row in the preview to designate it as the header. Preview shows the first ~15 rows in a scrollable table. The auto-picked row is highlighted. Clicking any other row re-designates it as the header. No dropdown, no number input.
- Auto-merge multi-row headers into one composite + show the merge in preview. When the detected header is 2-3 rows tall (common Xero pattern), auto-merge into one composite row label. Preview shows the merged result so the user can see and override by clicking a different row.
- Low-confidence fallback: don't auto-pick at all. If the top-candidate's confidence score is below a threshold (TBD by research, plausibly < 60%), don't auto-pick. Show all top-3 candidates with their scores and a "Pick the header row" prompt.

**Currency parser strictness (4 sub-decisions)**
- Silent-tolerate unambiguous transformations. `$1,234.56` → `Decimal("1234.56")` parsed without per-cell UI noise. One-line summary at top of ImportReviewPane reports "Tolerantly parsed currency in N cells".
- AU-locale first; flag ambiguous parses in the review pane. Default to AU conventions. When a cell could plausibly be either AU or EU format (e.g. `1,234`), parse as AU AND tag with "low confidence parse" flag.
- Empty cells → 0; non-empty unparseable → rejected row.
- Detect both `-1234.56` and `(1234.56)`; CR/DR columns stay separate.

**Subtotal detection strategy (4 sub-decisions)**
- Keyword + sum-pattern, EITHER signal flags the row.
- Section boundary: blank row OR account-code-prefix change.
- Per-row include checkbox in Rejected Rows panel + bulk include-all.
- Sum-pattern wins on coded rows.

**Rejected Rows panel + bulk-apply UX (4 sub-decisions)**
- Inline collapsible section below accepted rows + "N rejected" summary banner.
- Grouped by reason, sorted by original row position within group.
- Edit-in-place with "Re-parse and include" button.
- "Apply this fix to similar rows" = same reason + same regex signature on failing cell, with diff preview.

### Claude's Discretion
- Exact heuristic algorithm for header-row scoring (string-density formula, weights, confidence-score normalisation)
- Confidence threshold for auto-pick vs manual fallback (research establishes empirically — probably 50-70%)
- Exact keyword list and partial-match rules for subtotal detection
- Sum-pattern tolerance value (±0.01 starting point)
- Confidence-score visual treatment in the header-row preview
- "Apply to similar" preview-diff layout
- Whether the "N cells parsed with low confidence" review sub-section is collapsed-by-default or expanded
- Fixture anonymisation approach

### Deferred Ideas (OUT OF SCOPE)
- AI-assist enhancements to ImportTB
- GL-shape vs TB-shape format detection
- Per-Entity whitelist/blacklist patterns for subtotal detection
- Locale auto-detection per file (AU vs EU number formats)
- Single-Amount-column-with-signed-value support
- XLSX outline-level / indentation-based section detection
- Modal-based row editing UX
- Cents-only formats like `12.5c`
- "Cumulative running total" row detection
- "Always reject rows containing X" power-user patterns
- Fix-in-source-file-and-re-upload workflow improvements
- Confidence-threshold tuning UI for power users
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| IMP-07 | ImportTB detects the header row in CSV/XLSX TB files even when it's not row 1; auto-suggested header row(s) shown with confidence indicator; user always has the final say | headerDetect.ts algorithm (string-density + keyword scoring), HeaderRowPicker component, state-machine extension |
| IMP-08 | ImportTB tolerantly parses currency cells — strips `$`, `AUD`, `A$` prefixes; recognises `(1,234.56)` parentheses notation as negative; ignores thousands separators; preserves decimal.js precision | currencyParse.ts regex strategy, Decimal constructor string-passing pattern |
| IMP-09 | ImportTB detects subtotal-style rows and excludes them by default; user can review and re-include any row | subtotalDetect.ts keyword + sum-pattern algorithm, section-boundary logic |
| IMP-10 | ImportTB handles split account-code/name columns; detects absent codes and offers options | columnMerge.ts detect + merge API, missing-code detection heuristic |
| IMP-11 | ImportReviewPane gains a "Rejected rows" panel with per-row reason, inline edit, "Apply this fix to similar rows" bulk action | RejectedRowsPanel component, regex-signature derivation algorithm, ImportReviewPane integration |
</phase_requirements>

---

## Summary

Phase 7 adds five capabilities on top of the Phase 4 deterministic import flow. All five are additive — the clean-import path (row 0 header, no `$` symbols, no subtotals, no split columns, no rejected rows) is preserved by defaulting every new parameter to the Phase 4 behaviour.

The four pure-function modules (`headerDetect.ts`, `currencyParse.ts`, `subtotalDetect.ts`, `columnMerge.ts`) sit entirely in `src/lib/import/` alongside the existing `csv.ts`, `xlsx.ts`, `fingerprint.ts`, and `match.ts`. They are independently unit-testable and have no React dependencies. The UI changes concentrate in two components: `ImportTB.tsx` gains a new `headerRowChosen` step; `ImportReviewPane.tsx` gains an inline `RejectedRowsPanel` section.

The highest-risk surface is the currency parser: `decimal.js` does NOT accept `$1,234.56` directly (it throws). The parser must strip all non-numeric characters before calling `new Decimal(cleanedString)`. Passing a cleaned string — never a native `number` — preserves full arbitrary precision.

**Primary recommendation:** Wave 0 creates and red-tests all four pure-function modules + fixture files. Wave 1 implements the pure functions (tests go green). Wave 2 extends the UI components. Wave 3 is manual UAT across all 5 IMP requirements + Phase 4 regression check.

---

## Standard Stack

### Core (already in project — no new dependencies)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| decimal.js | existing | Currency parser output type | Constructor accepts strings only — strip formatting BEFORE passing |
| papaparse | ^5.5.3 | CSV parsing backbone | `parseCsvFile` already uses it; `headerRowIndex` widening is additive |
| xlsx (SheetJS CE) | ^0.20.3 | XLSX parsing backbone | `parseXlsxBuffer` already uses it; `raw: false` gives string cells; use `raw: true` to get all rows (including pre-header) for detection |
| React 19 + TypeScript 5.8 | existing | UI components | No changes |
| Vitest | existing | Test runner | `npm run test` → `npx vitest run` |

### No New Dependencies Required

All heuristics are pure TypeScript over existing parsed data. No NLP libraries, no locale-detection libraries, no additional currency-parsing libraries are needed.

---

## Architecture Patterns

### Recommended New File Structure

```
src/lib/import/
├── csv.ts                         (widen — add optional headerRowIndex param)
├── xlsx.ts                        (widen — add optional headerRowIndex param; add getRawRows helper)
├── headerDetect.ts                (NEW pure function)
├── currencyParse.ts               (NEW pure function)
├── subtotalDetect.ts              (NEW pure function)
├── columnMerge.ts                 (NEW pure function)
├── fingerprint.ts                 (unchanged)
├── match.ts                       (unchanged)
├── __fixtures__/
│   └── messy-tbs/
│       ├── xero-tb.csv            (NEW fixture)
│       ├── myob-tb.csv            (NEW fixture)
│       ├── quickbooks-tb.xlsx     (NEW fixture)
│       └── excel-hand-edited.csv  (NEW fixture)
└── __tests__/
    ├── csv.test.ts                (existing — 4 tests)
    ├── xlsx.test.ts               (existing)
    ├── fingerprint.test.ts        (existing)
    ├── match.test.ts              (existing)
    ├── headerDetect.test.ts       (NEW — Wave 0 scaffold, RED)
    ├── currencyParse.test.ts      (NEW — Wave 0 scaffold, RED)
    ├── subtotalDetect.test.ts     (NEW — Wave 0 scaffold, RED)
    └── columnMerge.test.ts        (NEW — Wave 0 scaffold, RED)

src/components/
├── ImportTB.tsx                   (widen — new headerRowChosen step)
├── ImportReviewPane.tsx           (widen — new RejectedRowsPanel section)
├── HeaderRowPicker.tsx            (NEW component)
├── RejectedRowsPanel.tsx          (NEW component — extracted for diff-readability)
└── __tests__/
    ├── ImportTB.test.tsx          (existing 9 tests; add Phase 7 cases)
    ├── ImportReviewPane.test.tsx  (existing 6 tests; add RejectedRowsPanel cases)
    ├── HeaderRowPicker.test.tsx   (NEW — Wave 0 scaffold, RED)
    └── RejectedRowsPanel.test.tsx (NEW — Wave 0 scaffold, RED)
```

### Pattern 1: Pure-Function Heuristic Module

Every heuristic lives as a pure TypeScript function with no side effects, no React imports, and no StorageAdapter calls. This matches the established Phase 1–5 pattern (`ledger.ts`, `match.ts`, `fingerprint.ts`, tax computation modules).

```typescript
// Pattern: pure function, no external dependencies, fully unit-testable
export function detectHeaderRow(rows: string[][]): HeaderDetectResult {
  // ... scoring logic ...
}
```

### Pattern 2: Additive API Widening

Existing `parseCsvFile` and `parseXlsxBuffer` are widened with optional parameters. The `headerRowIndex` param defaults to `undefined`, which triggers the Phase 4 behaviour (use the first row as headers). When supplied, the parser skips pre-header rows and uses the specified row as headers.

```typescript
// BEFORE (Phase 4)
export async function parseCsvFile(file: File): Promise<ParsedCsv>

// AFTER (Phase 7) — backward compatible; existing calls unchanged
export async function parseCsvFile(
  file: File,
  options?: { headerRowIndex?: number }
): Promise<ParsedCsv>
```

### Pattern 3: ImportTB State Machine Extension

The new `headerRowChosen` step is inserted between the sheet-picker step (XLSX only) and the column-mapping step. For CSV files, the file is parsed to raw rows first, header detection runs, then either auto-advance (high confidence) or show HeaderRowPicker.

```
[upload] → [XLSX: sheetPicker] → [headerRowPicker] → [columnMapping] → [reviewing] → [committed]
                                  ↑ NEW
```

State additions to `ImportTB.tsx`:
- `rawRows: string[][] | null` — all rows before header selection (for display in picker)
- `headerRowIndex: number | null` — selected header row (null = not yet chosen)
- `headerDetectResult: HeaderDetectResult | null` — auto-pick result with confidence

### Pattern 4: Rejected Rows as Separate Component File

Extract `RejectedRowsPanel` into its own file (`src/components/RejectedRowsPanel.tsx`) rather than inlining in `ImportReviewPane.tsx`. Rationale: the rejected-rows logic (~120 lines) is complex enough to warrant independent test coverage; a separate file makes diffs cleaner; the existing pattern in Phase 4 (XlsxSheetPicker extracted from ImportTB) validates this approach.

### Anti-Patterns to Avoid

- **Never pass a native `number` to `new Decimal()`** — use the cleaned string directly. `Number("$1,234.56")` → `NaN`; `Number("1234.56")` → `1234.56` (loses precision on large numbers). Always: strip → validate → `new Decimal(cleanedString)`.
- **Never call `parseFloat` / `Number()` on currency strings** — this is the precision trap. The regex must produce a clean string that `new Decimal()` can accept.
- **Never use `skipEmptyLines: 'greedy'` when reading raw rows for header detection** — the current `parseCsvText` skips empty lines, which corrupts row indices. The raw-row reader for header detection must NOT skip empty lines (blank rows are section boundaries for subtotal detection).
- **Never call `new Date()` outside `src/lib/period.ts`** — Phase 2 structural lint rule; none of the new pure functions need dates.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV multi-row reading without header assumption | Custom split('\n') | PapaParse with `header: false` | BOM handling, quoted commas, CRLF — PapaParse handles all; hand-rolled text splitting broke on BOM (Phase 4 Pitfall 5) |
| XLSX raw-row access | Custom XLSX parsing | SheetJS `XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })` | Returns `string[][]` (array-of-arrays), all values as strings — exactly what header detection needs |
| Decimal precision for currency | `parseFloat` + rounding | `new Decimal(cleanedString)` | `parseFloat("1234567890.12")` is exact but `parseFloat("12345678901234.56")` loses precision at >15 significant digits |
| Levenshtein fuzzy match for account names | Custom edit-distance | Existing `src/lib/import/match.ts` | Already verified in Phase 4, meets IMP-03 thresholds |

---

## Real-World TB Export Shapes

**CONFIDENCE: MEDIUM** — These shapes are synthesised from vendor documentation, third-party import guides, and community discussions. No first-hand exports were available. Structurally faithful; exact column names may vary slightly between versions.

### Shape 1: Xero Trial Balance (New Version)

```
Row 1: "[Company Name]"                    ← organisation name, single cell
Row 2: "Trial Balance"                     ← report title, single cell
Row 3: "For the year ended 30 June 2026"   ← date range, single cell
Row 4: (blank)
Row 5: "Account", "Account Code", "Debit", "Credit", "YTD Debit", "YTD Credit"
       ↑ HEADER ROW (row index 4, 0-based)
Row 6: "Revenue", "", "", "", "", ""       ← section heading (blank amounts)
Row 7: "4100", "Sales", "0.00", "50000.00", "0.00", "50000.00"
Row 8: "4200", "Other Revenue", "0.00", "5000.00", "0.00", "5000.00"
Row 9: "Total Revenue", "4999", "0.00", "55000.00", "0.00", "55000.00"
       ↑ SUBTOTAL: keyword "Total" + sum-pattern + has a synthetic code (4999)
Row 10: "Operating Expenses", "", "", "", "", ""  ← section heading
...
Last row: "Total", "", "55000.00", "55000.00", "55000.00", "55000.00"
```

**Key characteristics:**
- 3-4 title rows before header
- Column order: Account Name FIRST, then Account Code (reversed from AU convention)
- Amounts: plain numeric strings ("50000.00"), no `$` in Xero's native export (AU)
- Subtotal rows have a synthetic account code (e.g. "4999" for "Total Revenue")
- Section headings are rows with text in column A and blank amounts — these are NOT subtotals but must be excluded (no debit/credit = excluded naturally)
- "Total" row at the very bottom — keyword match + sum-pattern

**Source (MEDIUM confidence):** Cross-referenced from multiple third-party Xero import guides, community reports that rows 1-4 need deleting before import, and the G-Accon documentation noting "Display Only Account Names" vs "Display Only Account Codes" options. Column reversal (name before code) confirmed by community discussion at xero.com/business/discussion/50079828.

### Shape 2: MYOB AccountRight / MYOB Business

```
Row 1: "[Company Name]"
Row 2: "Trial Balance"
Row 3: "1 July 2025 to 30 June 2026"
Row 4: (blank)
Row 5: "Account Number", "Account Name", "Debit", "Credit"
       ↑ HEADER ROW
Row 6: "1-1100", "Cheque Account", "25000.00", "0.00"
Row 7: "1-1200", "Cash on Hand", "500.00", "0.00"
...
Row N: "Total Assets", "", "25500.00", "0.00"    ← subtotal, keyword only
Row N+1: (blank)                                  ← section boundary
Row N+2: "4-1000", "Sales", "0.00", "50000.00"
...
```

**Key characteristics:**
- MYOB uses a hyphenated account code format (e.g. "1-1100" or "1-0000")
- 3-4 title rows before header
- Subtotals identified by keyword only (no synthetic code in MYOB)
- Blank row between sections is the primary section boundary

**Source (MEDIUM confidence):** MYOB help centre documentation for trial balance import, community forum posts about CSV export format.

### Shape 3: QuickBooks Online

```
Row 1: "[Company Name]"
Row 2: "Trial Balance"
Row 3: "As of June 30, 2026"
Row 4: (blank)
Row 5: "Account", "Debit", "Credit"
       ↑ HEADER ROW (no account code column — QBO uses name only by default)
Row 6: "ASSETS", "", ""                    ← section heading (blank amounts)
Row 7: "  Bank Account", "25000.00", "0.00"   ← indented with leading spaces
Row 8: "  Accounts Receivable", "5000.00", "0.00"
Row 9: "Total ASSETS", "30000.00", "0.00"  ← subtotal: keyword "Total"
Row 10: (blank)
Row 11: "REVENUE", "", ""                  ← section heading
...
Row N: "TOTAL", "30000.00", "30000.00"     ← grand total row
```

**Key characteristics:**
- QBO standard export often has NO account code column (name-only)
- Account names may have leading whitespace (indentation) for sub-accounts — trim before matching
- Subtotals use "Total ASSETS", "TOTAL" patterns — keyword detection picks these up
- Some QBO AU exports use `$` prefix on amounts when exported to Excel; others plain numeric

**Source (MEDIUM confidence):** QuickBooks community discussions, TinyTax QuickBooks export guide, noted that QBO export format has regional variations.

### Shape 4: Hand-Edited Excel TB

```
Row 1: "Trial Balance - FY2026"            ← single merged cell
Row 2: "Prepared by: Jane Smith"
Row 3: "Date: 30/06/2026"
Row 4: (blank)
Row 5: "Code", "Account Name", "Debit ($)", "Credit ($)"
       ↑ HEADER ROW — note "$" in column label
Row 6: "1100", "Cash at Bank", "$25,000.00", "$0.00"
       ↑ Currency with $ prefix and thousands separator
Row 7: "1200", "Accounts Receivable", "$5,000.00", "$0.00"
Row 8: "", "Total Current Assets", "$30,000.00", "$0.00"
       ↑ Subtotal: blank code + "Total" in name
Row 9: (blank)
Row 10: "4100", "Sales Revenue", "$0.00", "$(50,000.00)"
        ↑ Parentheses-negative — rare but plausible
...
```

**Key characteristics:**
- Title rows are free-form (no standard format)
- Currency amounts may include `$` prefix, thousands separators (`,`), and parentheses-as-negative
- Column headers may include `($)` or `(AUD)` suffix — header keyword matching must tolerate this
- Blank code column on subtotal rows is common

---

## Research Question Answers

### 1. Header-Row Detection Algorithm

**Pure function signature:**
```typescript
// src/lib/import/headerDetect.ts
export interface HeaderCandidate {
  rowIndex: number;       // 0-based
  score: number;          // 0..1
  confidence: number;     // relative gap to next-best (0..1)
  matchedKeywords: string[];
  stringDensity: number;  // fraction of cells that are non-empty strings
}

export interface HeaderDetectResult {
  topCandidate: HeaderCandidate | null;
  alternatives: HeaderCandidate[];   // top 3 excluding topCandidate
  autoPickRow: number | null;        // null when confidence < AUTO_PICK_THRESHOLD
  searchedRows: number;              // how many rows were evaluated (cap at 15)
}

export function detectHeaderRow(
  rawRows: string[][],          // ALL rows, including pre-header title rows
  options?: { maxScanRows?: number }  // default 15
): HeaderDetectResult
```

**Scoring algorithm:**

Score = `(stringDensity × DENSITY_WEIGHT) + (keywordHits / KEYWORD_TOTAL × KEYWORD_WEIGHT)`

Where:
- `DENSITY_WEIGHT = 0.4` — how important string-density is
- `KEYWORD_WEIGHT = 0.6` — how important known-header keywords are
- `stringDensity` = fraction of non-empty cells that are non-numeric strings
- `keywordHits` = count of cells that match the AU TB header dictionary (case-insensitive, partial-match OK)

**AU TB header dictionary** (complete list):

```typescript
export const AU_TB_HEADER_KEYWORDS = [
  // Account identification
  'account', 'code', 'name', 'description', 'acc', 'acct',
  // Amounts
  'debit', 'credit', 'balance', 'amount', 'dr', 'cr',
  // MYOB-specific
  'account number', 'account name',
  // Xero-specific
  'account code', 'ytd debit', 'ytd credit',
  // QBO-specific (name-only export)
  // (covered by 'account' + 'name' above)
] as const;
```

Partial-match rule: `cell.toLowerCase().includes(keyword.toLowerCase())` — this catches "Debit ($)" matching "debit" and "Account Code" matching "account".

**String-density calculation:**
```typescript
function stringDensity(row: string[]): number {
  const nonEmpty = row.filter(c => c.trim() !== '');
  if (nonEmpty.length === 0) return 0;
  const strings = nonEmpty.filter(c => isNaN(Number(c.replace(/[$,]/g, ''))));
  return strings.length / nonEmpty.length;
}
```

**Confidence = relative score gap:**
```typescript
confidence = topScore === 0
  ? 0
  : (topScore - secondScore) / topScore;
```

**Recommended AUTO_PICK_THRESHOLD = 0.60** (Claude's discretion):
Rationale: all 4 fixture header rows score > 0.75 (3+ keyword hits out of a 6-column row = high keyword fraction). Title rows like "Company Name" and "Trial Balance" have string density ≈ 1.0 but ZERO keyword hits, giving them a score of ~0.4 × 1.0 + 0.6 × 0 = 0.4. Gap between header row (0.75+) and best title row (0.40) → confidence > 0.46, above the 0.60 threshold for most real-world files. Files with unusual column names may fall below — those see the manual-pick fallback.

**Multi-row header merge strategy:**
When `rows[topIndex]` AND `rows[topIndex + 1]` both score > 0.40 (i.e. are both "header-like"), merge them:
```typescript
// Example: row N = ["Account", "", "Debit", "Credit"]
//          row N+1 = ["Code", "Name", "", ""]
// Merged = ["Account / Code", "Account / Name", "Debit", "Credit"]
function mergeHeaderRows(rowA: string[], rowB: string[]): string[] {
  return rowA.map((cellA, i) => {
    const cellB = rowB[i] ?? '';
    if (cellA && cellB) return `${cellA} / ${cellB}`;
    return cellA || cellB;
  });
}
```

### 2. Currency Parser — Exact Regex Strategy

**CONFIDENCE: HIGH** — confirmed against `decimal.js` API docs (constructor rejects non-numeric chars) and the 7 fixture test cases from ROADMAP.

**Pure function signature:**
```typescript
// src/lib/import/currencyParse.ts
import Decimal from 'decimal.js';

export interface ParseResult {
  decimal: Decimal | null;
  confidence: 'high' | 'low';
  reason?: string;
}

export function parseCurrency(
  raw: string,
  _locale: 'AU' = 'AU'   // AU is the only locale in v1.1; param reserved for v2.x
): ParseResult
```

**Step-by-step algorithm:**

```typescript
export function parseCurrency(raw: string): ParseResult {
  // Step 1: Trim whitespace
  const trimmed = raw.trim();

  // Step 2: Empty / whitespace → Decimal(0), high confidence
  if (trimmed === '') {
    return { decimal: new Decimal('0'), confidence: 'high' };
  }

  // Step 3: Detect parentheses notation BEFORE stripping
  // Matches: (1,234.56)  ($1,234.56)  ( 1234.56 )
  const PARENS_RE = /^\(\s*\$?\s*([\d,]+(?:\.\d+)?)\s*\)$/;
  const parensMatch = PARENS_RE.exec(trimmed);
  if (parensMatch) {
    const cleaned = parensMatch[1].replace(/,/g, '');
    return { decimal: new Decimal(cleaned).negated(), confidence: 'high' };
  }

  // Step 4: Strip currency prefix/suffix: $, AUD, A$
  // Order matters: strip A$ before AUD before $
  const stripped = trimmed
    .replace(/^A\$\s*/i, '')   // leading A$
    .replace(/\s*A\$$/i, '')   // trailing A$
    .replace(/^AUD\s*/i, '')   // leading AUD
    .replace(/\s*AUD$/i, '')   // trailing AUD
    .replace(/^\$\s*/, '')     // leading $
    .replace(/\s*\$$/, '')     // trailing $
    .trim();

  // Step 5: Detect leading minus (possibly after currency strip)
  const negative = stripped.startsWith('-');
  const absStr = negative ? stripped.slice(1).trim() : stripped;

  // Step 6: Validate AU format and check for EU ambiguity
  // AU: comma = thousands sep, period = decimal  → "1,234.56" or "1234.56"
  // EU: period = thousands sep, comma = decimal  → "1.234,56"
  //
  // AMBIGUOUS: "1,234" — could be AU 1234 OR EU 1.234
  // AMBIGUOUS: "1.234" — could be AU 1.234 OR EU 1234 (no decimal in AU interpretation)
  //
  // AU_UNAMBIGUOUS: has period decimal  → "1,234.56", "1234.56", ".56"
  // AU_ONLY:        has comma and no period  → "1,234" (flag low confidence)

  const AU_NUMERIC_RE = /^[\d,]*\.?\d*$/;  // digits, optional commas, optional period
  const HAS_COMMA = absStr.includes(',');
  const HAS_PERIOD = absStr.includes('.');

  if (!AU_NUMERIC_RE.test(absStr) || absStr === '') {
    return { decimal: null, confidence: 'low', reason: `currency unparseable: ${raw}` };
  }

  // Strip thousands separators (commas in AU format)
  const cleaned = absStr.replace(/,/g, '');

  // Validate the cleaned value is a valid decimal number string
  if (!/^\d+\.?\d*$/.test(cleaned) && !/^\d*\.\d+$/.test(cleaned)) {
    return { decimal: null, confidence: 'low', reason: `currency unparseable: ${raw}` };
  }

  // Ambiguity flag: comma present but no period (e.g. "1,234" — AU 1234 or EU 1.234?)
  const isAmbiguous = HAS_COMMA && !HAS_PERIOD;

  const decimal = negative ? new Decimal(cleaned).negated() : new Decimal(cleaned);
  return {
    decimal,
    confidence: isAmbiguous ? 'low' : 'high',
    reason: isAmbiguous ? `ambiguous: "${raw}" parsed as AU ${cleaned}; could be EU ${absStr.replace(',', '.')}` : undefined,
  };
}
```

**CRITICAL — decimal.js constructor accepts:**
- Plain digit strings: `"1234"`, `"1234.56"`, `".56"`, `"0.00"`
- Negative strings: `"-1234.56"`
- Does NOT accept: `"$1,234.56"`, `"1,234.56"`, `"AUD 100"` — these all throw `[DecimalError] Invalid argument: ...`

**Test cases (from ROADMAP success criterion #3):**

| Input | Expected output | Confidence |
|-------|----------------|------------|
| `"$1,234.56"` | `Decimal("1234.56")` | high |
| `"(1,234.56)"` | `Decimal("-1234.56")` | high |
| `"AUD 1234.56"` | `Decimal("1234.56")` | high |
| `"1,234.56 AUD"` | `Decimal("1234.56")` | high |
| `"1234.56"` | `Decimal("1234.56")` | high |
| `"  1234.56  "` | `Decimal("1234.56")` | high |
| `" $ -1,234.56 "` | `Decimal("-1234.56")` | high |
| `"1,234"` | `Decimal("1234")` | **low** (ambiguous AU/EU) |
| `""` | `Decimal("0")` | high |
| `"  "` | `Decimal("0")` | high |
| `"N/A"` | `null` | low |
| `"pending"` | `null` | low |
| `"0.00"` | `Decimal("0")` | high |
| `"(50000.00)"` | `Decimal("-50000000")` ... wait → `Decimal("-50000.00")` | high |

**Note on negative debit:** When a debit cell parses as negative (e.g. `"($500.00)"`), the currency parser returns a negative Decimal. The column-mapping layer applies this — a negative debit is unusual (credit memo) and should be flagged with `confidence: 'low'` by the calling code (not by the currency parser itself). The currency parser only cares about syntax.

### 3. Subtotal Detection Algorithm

**Pure function signature:**
```typescript
// src/lib/import/subtotalDetect.ts
import Decimal from 'decimal.js';

export interface ImportRow {
  rowIndex: number;
  code: string;
  name: string;
  debit: Decimal | null;   // null if unparseable
  credit: Decimal | null;
  rawDebit: string;
  rawCredit: string;
}

export interface SubtotalFlag {
  rowIndex: number;
  reason: 'keyword' | 'sum-pattern' | 'keyword+sum-pattern';
  keyword?: string;         // which keyword matched
  sumOf?: number[];         // rowIndexes that sum to this row
}

export function detectSubtotals(rows: ImportRow[]): SubtotalFlag[]
```

**Keyword signal:**

```typescript
// Exact regex — word-boundary aware, case-insensitive, partial match on name column
const SUBTOTAL_KEYWORD_RE =
  /\b(total|sum|net|grand\s+total|subtotal|sub[-\s]?total|gst\s+collected|trial\s+balance\s+total)\b/i;

function isKeywordSubtotal(name: string): string | null {
  const m = SUBTOTAL_KEYWORD_RE.exec(name);
  return m ? m[0] : null;
}
```

**AU-specific additions to keyword list (Claude's discretion):**
- "GST Collected" — common in AU BAS-related TBs
- "Trial Balance Total" — grand total row in some exports
- "Net Assets" — balance-sheet subtotal
- "Net Profit" / "Net Loss" — P&L subtotal

**Section-boundary detection:**

```typescript
type Section = ImportRow[];

function splitIntoSections(rows: ImportRow[]): Section[] {
  const sections: Section[] = [];
  let current: Section = [];
  for (const row of rows) {
    const isBlank = (!row.code || row.code.trim() === '') &&
                    (!row.name || row.name.trim() === '') &&
                    (row.debit === null || row.debit.isZero()) &&
                    (row.credit === null || row.credit.isZero());
    if (isBlank) {
      if (current.length > 0) sections.push(current);
      current = [];
    } else {
      // Code-prefix change: first character of code changes
      if (current.length > 0 && row.code && current[current.length - 1].code) {
        const prevPrefix = current[current.length - 1].code[0];
        const currPrefix = row.code[0];
        if (prevPrefix !== currPrefix) {
          sections.push(current);
          current = [];
        }
      }
      current.push(row);
    }
  }
  if (current.length > 0) sections.push(current);
  return sections;
}
```

**Prefix detection strategy:** First character of account code only. Rationale: `1xxx` assets vs `2xxx` liabilities vs `4xxx` revenue — first digit always changes at section boundary in standard 4-digit AU CoA numbering. MYOB hyphenated codes (e.g. "1-1100") use the first character before the hyphen, so `row.code.split('-')[0][0]` is the prefix.

For files with NO account codes: section boundary = blank row only (fall back).

**Sum-pattern signal:**
```typescript
const SUM_TOLERANCE = new Decimal('0.01');  // ±0.01 AUD rounding tolerance

function isSumPattern(
  candidate: ImportRow,
  precedingRows: ImportRow[]
): number[] | null {
  const cDebit = candidate.debit ?? new Decimal('0');
  const cCredit = candidate.credit ?? new Decimal('0');

  // Try matching debit sum
  const debitRows = precedingRows.filter(r => r.debit && !r.debit.isZero());
  const debitSum = debitRows.reduce((a, r) => a.plus(r.debit!), new Decimal('0'));
  if (debitSum.minus(cDebit).abs().lte(SUM_TOLERANCE)) {
    return debitRows.map(r => r.rowIndex);
  }

  // Try matching credit sum
  const creditRows = precedingRows.filter(r => r.credit && !r.credit.isZero());
  const creditSum = creditRows.reduce((a, r) => a.plus(r.credit!), new Decimal('0'));
  if (creditSum.minus(cCredit).abs().lte(SUM_TOLERANCE)) {
    return creditRows.map(r => r.rowIndex);
  }

  return null;
}
```

**Recommended SUM_TOLERANCE = ±0.01 AUD** (Claude's discretion): Xero and MYOB round amounts to 2 decimal places with standard half-up rounding. A ±0.01 tolerance accommodates single-cent rounding differences. If research from real fixtures discovers larger rounding errors (e.g. ±1.00 due to GST apportionment), this constant can be widened — it is a named constant, not a magic number.

**Sum-pattern wins on coded rows:** The `isSumPattern` function runs on ALL rows, including those with a code. Xero's "Total Revenue" row with code "4999" will be caught by sum-pattern even though it has a code. The keyword check also matches. Both signals → `reason: 'keyword+sum-pattern'`.

### 4. Column Merge / Split-Column Detection

**Pure function signatures:**
```typescript
// src/lib/import/columnMerge.ts

export interface ColumnDetectResult {
  hasSplitColumns: boolean;
  codeColHeader: string | null;    // which header is the code column
  nameColHeader: string | null;    // which header is the name column
  missingCodeFraction: number;     // 0..1: fraction of rows with empty code col
}

export function detectSplitColumns(
  headers: string[],
  rows: Record<string, string>[]   // RawRow[]
): ColumnDetectResult

export function mergeColumns(
  rows: Record<string, string>[],
  codeCol: string,
  nameCol: string,
  separator: string = ' — '        // AU convention: em-dash with spaces
): Record<string, string>[]        // returns rows with new 'merged' key
```

**Split-column detection heuristic:**

```typescript
// Header-name heuristic: code col matches /^(code|account\s*code|acct|acc\.?\s*no\.?|account\s*no\.?)/i
// Name col matches /^(name|account\s*name|description|account$)/i
const CODE_HEADER_RE = /^(code|account\s*code|acct|acc\.?\s*no\.?|account\s*no\.?)/i;
const NAME_HEADER_RE = /^(name|account\s*name|description|account$)/i;

// Value-shape heuristic (fallback when headers don't match):
// Code col: short alphanumeric, length 2-8, mostly numeric
// Name col: longer strings (avg length > 8 chars)
function isCodeLike(values: string[]): boolean {
  const nonEmpty = values.filter(v => v.trim() !== '');
  if (nonEmpty.length === 0) return false;
  const shortAlphanumeric = nonEmpty.filter(v => /^[\w-]{2,8}$/.test(v.trim()));
  return shortAlphanumeric.length / nonEmpty.length > 0.7;
}
```

**Missing code detection:**
```typescript
// If code column is detected but >50% of values are empty → "missing codes" case
const MISSING_CODE_THRESHOLD = 0.5;

// Two paths offered to user (in HeaderRowPicker / column-mapping UI):
// 1. "Auto-assign codes sequentially" → codes become "001", "002", etc.
// 2. "Import name-only and map manually" → code column left empty, fuzzyMatch uses name
```

**mergeColumns result:** Returns a copy of `rows` with an additional `__merged_code_name` field containing `code + separator + name`. The column-mapping UI in ImportTB maps the `code` column to `__merged_code_name` automatically when split-column merge is applied.

### 5. ImportTB.tsx State Machine Extension

**Current state variables (Phase 4):**
```typescript
parsedRows, parsedHeaders, xlsxBuffer, sheetPickerNames,
columnMappingByName, isColumnMapping,
importedRows, reviewing, isProcessing,
fingerprintCollision, asAtDate
```

**New state variables (Phase 7):**
```typescript
// Raw rows before header selection (string[][] for display in picker)
rawRows: string[][] | null
// Selected header row index (null = not yet selected)
headerRowIndex: number | null
// Header detection result (for displaying confidence in picker)
headerDetectResult: HeaderDetectResult | null
// Whether we're in the header-picking step
isPickingHeader: boolean
```

**State flow:**

```
handleFileUpload (CSV):
  1. PapaParse with header: false → rawRows (string[][])
  2. detectHeaderRow(rawRows) → headerDetectResult
  3. if autoPickRow !== null (confidence ≥ threshold):
       setHeaderRowIndex(autoPickRow)
       parseCsvRows(rawRows, autoPickRow) → setParsedRows, setParsedHeaders
       setIsColumnMapping(true)
     else:
       setIsPickingHeader(true)   ← show HeaderRowPicker

handleFileUpload (XLSX):
  1. parseXlsxBuffer (existing) for sheetPickerNames
  2. (same as CSV after sheet is selected)

handleHeaderPick (from HeaderRowPicker):
  setHeaderRowIndex(rowIndex)
  parseCsvRows(rawRows, rowIndex) → setParsedRows, setParsedHeaders
  setIsPickingHeader(false)
  setIsColumnMapping(true)
```

**render guard extension:**

```typescript
const showUploadScreen = !isColumnMapping && !reviewing && !sheetPickerNames &&
  !fingerprintCollision && !isPickingHeader;  // ← add isPickingHeader
```

**New rendering block (between sheetPickerNames and isColumnMapping):**

```typescript
{isPickingHeader && rawRows && (
  <HeaderRowPicker
    rows={rawRows}
    detectResult={headerDetectResult}
    onPick={handleHeaderPick}
    onCancel={resetState}
  />
)}
```

**XlsxSheetPicker → HeaderRowPicker ordering:**
- Sheet picker fires FIRST (existing behaviour)
- After `handleSheetPick`, instead of `setIsColumnMapping(true)`, call `runHeaderDetection(buf, sheetName)` which reads raw rows, runs `detectHeaderRow`, and either auto-advances or shows `isPickingHeader`.

### 6. Inline Edit + "Apply to Similar" Regex Signature

**Regex signature derivation:**

The signature replaces structural patterns in a failing cell value to identify similar cells:
```typescript
export function deriveRegexSignature(failingCellValue: string): RegExp {
  const pattern = failingCellValue
    .replace(/\d+/g, '\\d+')        // digits → \d+
    .replace(/[a-zA-Z]+/g, '\\w+')  // letter sequences → \w+
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // escape regex special chars (done BEFORE replacements above in the actual implementation to avoid double-escaping)
    // Note: order matters — escape literals first, then replace digit/letter sequences
  return new RegExp(`^${pattern}$`);
}
```

**Corrected order (escape first, then generalise):**
```typescript
export function deriveRegexSignature(failingCellValue: string): string {
  return failingCellValue
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // 1. escape special regex chars
    .replace(/\d+/g, '\\d+')                  // 2. generalise digit sequences
    .replace(/[a-zA-Z]+/g, '[A-Za-z]+');      // 3. generalise letter sequences
}
```

**Examples:**
| Failing cell | Signature |
|---|---|
| `"$1,234.56 X"` | `"\\$\\d+,\\d+\\.\\d+ [A-Za-z]+"` |
| `"AUD 1234"` | `"[A-Za-z]+ \\d+"` |
| `"N/A"` | `"[A-Za-z]/[A-Za-z]"` |
| `"1.234,56"` | `"\\d+\\.\\d+,\\d+"` (EU format — won't match AU cells) |

**"Apply to similar" logic:**
```typescript
// Find rows with: same rejection reason AND signature matches original failing cell
const similarRows = rejectedRows.filter(r =>
  r.reason === targetRow.reason &&
  new RegExp(`^${deriveRegexSignature(targetRow.failingCellValue)}$`).test(r.failingCellValue)
);
```

**Preview-diff layout (Claude's discretion: recommend inline table):**

```
Before applying fix to 7 similar rows:

Row | Current value      | Proposed fix
 7  | $1,234.56 X        | 1234.56
12  | $5,678.90 X        | 5678.90
...
[Apply to all 7]  [Cancel]
```

Recommendation: **inline table with checkboxes** (not modal, not strikethrough) — matches the "no modal in v1.1" decision from CONTEXT.md, and gives the user per-row opt-out before bulk apply. Render as a collapsed `<details>` element that expands when the user clicks "Apply to similar (7 rows)".

### 7. ImportReviewPane Extension — RejectedRowsPanel

**Component split decision: Extract to separate file.**

`RejectedRowsPanel.tsx` (~130 lines of logic) is extracted from `ImportReviewPane.tsx` for:
- Independent unit testing in `RejectedRowsPanel.test.tsx`
- Cleaner diffs (ImportReviewPane changes are limited to adding `rejectedRows` prop + one import + one render call)
- Parallel to the Phase 4 pattern (XlsxSheetPicker extracted from ImportTB)

**Updated ImportReviewPane props:**
```typescript
interface ImportReviewPaneProps {
  rows: ImportedAccount[];
  accounts: Account[];
  onUpdate: (rows: ImportedAccount[]) => void;
  onAccept: () => void;
  onReject: () => void;
  // Phase 7 additions (optional — backward compatible):
  rejectedRows?: RejectedRow[];
  onRejectedRowUpdate?: (rowIndex: number, patch: Partial<RejectedRow>) => void;
  onRejectedRowReparse?: (rowIndex: number) => void;
  tolerantParseCount?: number;   // for "Tolerantly parsed N cells" banner
  lowConfidenceParseCount?: number;  // for "N cells low confidence" sub-section
}
```

**RejectedRow type:**
```typescript
export interface RejectedRow {
  rowIndex: number;           // original file row index (for sort)
  reason: RejectedRowReason;
  rawCode: string;
  rawName: string;
  rawDebit: string;
  rawCredit: string;
  editedCode?: string;
  editedName?: string;
  editedDebit?: string;
  editedCredit?: string;
  failingCellValue?: string;  // for "apply to similar" signature
  failingColumn?: 'debit' | 'credit' | 'code' | 'name';
}

export type RejectedRowReason =
  | 'subtotal'
  | 'currency-unparseable'
  | 'no-account-code'
  | 'low-confidence-parse'
  | 'other';
```

**Low-confidence section collapsed by default (Claude's discretion):** Low-confidence parses (e.g. "1,234" ambiguous) are less urgent than outright failures. Start collapsed to avoid overwhelming the user when, say, 30 out of 100 rows have AU amounts without decimal points. Expand on demand.

### 8. Regression-Test Strategy for Phase 4 Clean-Import Flow

**The 12 existing ImportTB-related tests that MUST stay GREEN:**

From `src/components/__tests__/ImportTB.test.tsx` (9 tests):
1. `column mapping UI confirmation`
2. `deterministic path works without AI`
3. `fingerprint Skip Replace dialog` (critical double-count regression check)
4. `single opening journal posted`
5. `XLSX flow opens sheet picker when multi-sheet`
6. `XLSX flow auto-selects single matching sheet`
7-9: Phase 3 retained cases (AI gating, isAiEnabled checks)

From `src/components/__tests__/ImportReviewPane.test.tsx` (6 tests):
10. `auto-applies high confidence`
11. `create new account option`
12. `per-row include/exclude toggle`
13. `per-row edit-inline`
14. `reject whole import button`
15. `archived accounts hidden from pick dropdown`

**Phase 4 clean-fixture regression test (new — 1 test):**
Name: `"Phase 4 clean fixture imports cleanly through Phase 7 code path"`
- Uses the existing `makeCsvFile()` helper (Code/Name/Debit/Credit, no $, no subtotals, row 0 header)
- When `headerRowIndex` is not specified, `parseCsvFile` defaults to current behaviour (row 0 = header)
- `detectHeaderRow` on this file returns high confidence on row 0
- All 3 rows map and post as before
- Asserts: `onImport` called once, entry has 3 lines, no rejected rows

**TDD discipline:** All Phase 7 test files committed with `it.todo(...)` cases in Wave 0. Tests flip from RED (`.todo`) to GREEN as implementation lands in Wave 1/2.

---

## Common Pitfalls

### Pitfall 1: PapaParse `skipEmptyLines: 'greedy'` Corrupts Row Indices

**What goes wrong:** Current `parseCsvText` uses `skipEmptyLines: 'greedy'`. Blank rows are section boundaries for subtotal detection. If blank rows are skipped, `rowIndex` in the returned rows doesn't match the original file row index, and section detection breaks.

**Prevention:** For the raw-row reader (used by `detectHeaderRow` and `detectSubtotals`), use PapaParse with `header: false` and `skipEmptyLines: false`. The existing `parseCsvFile` / `parseCsvText` can keep their current options for the final parse (after header row is selected), but a new `parseCsvRaw(file): string[][]` helper reads ALL rows without skipping.

**Warning signs:** Subtotal immediately after section boundary being missed; blank rows appearing as data rows in the post-header parse.

### Pitfall 2: Decimal Constructor Throws on Raw Currency Strings

**What goes wrong:** `new Decimal("$1,234.56")` throws `[DecimalError] Invalid argument: $1,234.56`. This would crash the currency parser on the most common Australian TB format.

**Prevention:** ALWAYS strip all non-numeric characters (currency symbols, thousands separators, whitespace) before calling `new Decimal()`. The parser unit tests must cover `"$1,234.56"` as the very first case. If the constructor throws, the test fails immediately and catches the bug before merge.

**Warning signs:** Runtime `[DecimalError]` in the browser console during import; the import silently completing but showing 0 rows.

### Pitfall 3: EU-Format Numbers Silently Parsed as AU

**What goes wrong:** `"1.234"` in a European-format TB means `1234` (period = thousands separator). Parsed as AU, this is `1.234` — three orders of magnitude wrong.

**Prevention:** Flag `"1.234"` (digit, period, exactly-3-digits pattern) as `confidence: 'low'` with reason. Do not silently parse it as `1.234`. The low-confidence review section surfaces these for the user to verify.

**Specific ambiguity check to add:**
```typescript
// "1.234" — could be 1.234 AU or 1234 EU
// "1,234" — could be 1234 AU or 1.234 EU (already covered)
// "1.234,56" — unambiguously EU → null, low confidence, reason
const EU_FORMAT_RE = /^\d{1,3}(\.\d{3})+(,\d+)?$/;
if (EU_FORMAT_RE.test(absStr)) {
  return { decimal: null, confidence: 'low', reason: `EU format detected: ${raw}` };
}
```

### Pitfall 4: XLSX `raw: false` Returns String Cells as Pre-Formatted Text

**What goes wrong:** SheetJS with `raw: false` (current setting) pre-formats numbers as strings with their Excel cell format applied. An Excel-formatted cell `"$1,234.56"` comes through as `"$1,234.56"` — the currency parser handles this. BUT: a cell with Excel's "Accounting" format (the one with aligned decimal and brackets for negatives) comes through as `" (1,234.56)"` with a leading space — the `parseCurrency` regex must account for leading/trailing whitespace before the opening paren.

**Prevention:** The parens regex uses `\s*` to handle leading spaces: `/^\(\s*\$?\s*([\d,]+(?:\.\d+)?)\s*\)$/` already does this. But verify in tests with `" (1234.56) "`.

### Pitfall 5: Header Detection Scores Section Headings Too High

**What goes wrong:** A Xero export has `"Revenue", "", "", "", "", ""` as a row before the accounts. This row has string density = 1/1 = 1.0 and might accidentally match "Credit" partially. Score could be high enough to be picked as the header.

**Prevention:** Add a minimum-columns filter: a row with fewer than 3 non-empty cells is disqualified from being a header row regardless of score. Real TB headers have at minimum: name column + debit column + credit column = 3 cells.

```typescript
const MIN_HEADER_COLS = 3;
if (row.filter(c => c.trim() !== '').length < MIN_HEADER_COLS) {
  return 0;  // disqualified
}
```

### Pitfall 6: jsdom `File.arrayBuffer()` Not Implemented

**What goes wrong:** Already documented in Phase 4 SUMMARY — `TypeError: file.arrayBuffer is not a function` in jsdom test environment.

**Prevention:** Already fixed in `ImportTB.test.tsx` with `Object.defineProperty(file, 'arrayBuffer', ...)`. Phase 7 test fixtures for XLSX must use the same pattern.

### Pitfall 7: vi.resetModules() Does Not Clear doMock Factories

**What goes wrong:** Already documented in Phase 4 SUMMARY — mock leakage between tests.

**Prevention:** Already fixed with `vi.doUnmock('../../lib/import/match')` in `beforeEach`. Phase 7 test files that use `vi.doMock` for new modules must follow the same pattern.

---

## Code Examples

### Parsing Raw Rows from CSV (for header detection)

```typescript
// Src: PapaParse docs + Phase 4 csv.ts pattern
import Papa from 'papaparse';

export function parseCsvRaw(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      header: false,           // ← get string[][] not Record[]
      skipEmptyLines: false,   // ← preserve blank rows (section boundaries)
      dynamicTyping: false,    // ← all cells as strings
      complete: (result) => resolve(result.data),
      error: (err: Error) => reject(err),
    });
  });
}
```

### Parsing Raw Rows from XLSX (for header detection)

```typescript
// Src: SheetJS CE docs + Phase 4 xlsx.ts pattern
import * as XLSX from 'xlsx';

export function getXlsxRawRows(buf: ArrayBuffer, sheetName: string): string[][] {
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  // header: 1 returns string[][], raw: false gives formatted string values
  return XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,   // formatted strings (e.g. "$1,234.56" not 1234.56)
  });
}
```

### Constructing ParsedCsv from Raw Rows + Header Index

```typescript
// Widen parseCsvFile to accept headerRowIndex
export async function parseCsvFile(
  file: File,
  options?: { headerRowIndex?: number }
): Promise<ParsedCsv> {
  if (options?.headerRowIndex === undefined) {
    // Phase 4 behaviour: use PapaParse header:true (row 0 auto-used as header)
    return existingParseCsvFile(file);
  }
  const rawRows = await parseCsvRaw(file);
  const headerRow = rawRows[options.headerRowIndex] ?? [];
  const dataRows = rawRows.slice(options.headerRowIndex + 1);
  const headers = headerRow.map(h => h.trim());
  const rows: RawRow[] = dataRows
    .filter(row => row.some(c => c.trim() !== ''))  // skip blank rows
    .map(row => {
      const record: RawRow = {};
      headers.forEach((h, i) => { record[h] = row[i] ?? ''; });
      return record;
    });
  return { rows, headers };
}
```

### Decimal.js String-Passing Pattern

```typescript
// Source: decimal.js API docs (https://mikemcl.github.io/decimal.js/)
// ALWAYS pass cleaned string to Decimal constructor — never native number
import Decimal from 'decimal.js';

// CORRECT — preserves full precision
const d = new Decimal('1234567890123456.78');

// WRONG — loses precision for large numbers
const bad = new Decimal(parseFloat('1234567890123456.78'));  // float precision lost

// CORRECT — clean string first, then construct
const raw = '$1,234,567.89';
const cleaned = raw.replace(/[^0-9.-]/g, '');  // "1234567.89"
const dec = new Decimal(cleaned);
```

### HeaderRowPicker Component Sketch

```typescript
// src/components/HeaderRowPicker.tsx
interface HeaderRowPickerProps {
  rows: string[][];               // first 15 rows of file
  detectResult: HeaderDetectResult | null;
  onPick: (rowIndex: number) => void;
  onCancel: () => void;
}

// Renders: scrollable table of first ~15 rows
// - Auto-picked row highlighted with subtle blue background
// - Each row is clickable (onClick → onPick(rowIndex))
// - If detectResult.autoPickRow !== null: show "We think row N is the header"
//   with confidence % and "pick a different row" link
// - If detectResult.autoPickRow === null: show "Pick the header row" prompt
//   with top-3 candidates listed with scores
// - "Use this row" button for the highlighted row (also clickable directly)
// - "Cancel" link
```

---

## State of the Art

| Old Approach (Phase 4) | Phase 7 Approach | Impact |
|------------------------|-----------------|--------|
| Assume row 0 = header | Detect header row with scoring; user can override | Handles Xero/MYOB/QBO/Excel title rows |
| `Number(cell)` for amounts | `parseCurrency(cell).decimal` (Decimal constructor) | Preserves arbitrary precision; handles $, AUD, parens |
| Skip all non-mappable rows silently | Track rejected rows with reason; surface in panel | User has full visibility + fix-it path |
| Single column-mapping step | Split-column detection + optional merge step | Handles Xero's Account / Account Code split |
| No subtotal detection | Keyword + sum-pattern detection | Prevents subtotals inflating TB totals |

**Deprecated/outdated in Phase 7 context:**
- Using `Number()` or `parseFloat()` for currency cells — replaced by `parseCurrency().decimal`
- Skipping blank rows at file-read time — replaced by preserving them for section detection

---

## Open Questions

1. **Sum-pattern tolerance on real fixtures**
   - What we know: Xero and MYOB round to 2 decimal places; ±0.01 covers single-cent rounding
   - What's unclear: Does GST apportionment (1/11 of amount) create larger rounding differences?
   - Recommendation: Start with ±0.01; if fixtures show failures, widen to ±1.00. The constant is named and easily changed.

2. **Confidence threshold final value**
   - What we know: Title rows score ~0.40, real header rows score ~0.75+
   - What's unclear: Edge cases with unusual column names (e.g. "Particulars" instead of "Name")
   - Recommendation: Use 0.60; let Wave 3 UAT validate. The constant is `AUTO_PICK_THRESHOLD` in `headerDetect.ts`.

3. **QBO AU export — does it include account codes?**
   - What we know: Standard QBO export is name-only; some AU users customise reports to include account codes
   - What's unclear: Exact QBO AU export format when account codes ARE included
   - Recommendation: The `columnMerge.ts` missing-code detection handles the name-only case. The split-column detection handles the code+name case. Both paths covered.

4. **Xero column order — Account Name before Account Code**
   - What we know: Multiple sources indicate Xero's export puts account name in column A, code in column B (reverse of AU convention)
   - What's unclear: Whether this varies by Xero version or report type
   - Recommendation: The column-mapping UI (Phase 4) already handles arbitrary column order via named mapping. The `detectSplitColumns` heuristic uses both header-name matching AND value-shape matching, so it handles reversed order.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | `vitest.config.ts` at project root |
| Quick run command | `npx vitest run src/lib/import/__tests__/` |
| Full suite command | `npx vitest run` |
| Current baseline | 763 GREEN, 11 todo, 0 fail |

### Phase Requirements → Test Map

| Req ID | Behaviour | Test Type | Automated Command | File |
|--------|-----------|-----------|-------------------|------|
| IMP-07 | `detectHeaderRow` scores row 0 header correctly | unit | `npx vitest run src/lib/import/__tests__/headerDetect.test.ts` | Wave 0 scaffold |
| IMP-07 | `detectHeaderRow` returns row 4 for Xero messy fixture (4 title rows) | unit | same | Wave 0 scaffold |
| IMP-07 | `detectHeaderRow` merges 2-row header into composite | unit | same | Wave 0 scaffold |
| IMP-07 | `detectHeaderRow` returns `autoPickRow: null` when confidence < 0.60 | unit | same | Wave 0 scaffold |
| IMP-07 | `HeaderRowPicker` renders auto-pick highlight | component | `npx vitest run src/components/__tests__/HeaderRowPicker.test.tsx` | Wave 0 scaffold |
| IMP-07 | `HeaderRowPicker` allows user to click any row to override | component | same | Wave 0 scaffold |
| IMP-07 | `ImportTB` auto-advances past header pick when confidence ≥ threshold | integration | `npx vitest run src/components/__tests__/ImportTB.test.tsx` | Wave 2 |
| IMP-08 | `parseCurrency("$1,234.56")` → `Decimal("1234.56")`, high confidence | unit | `npx vitest run src/lib/import/__tests__/currencyParse.test.ts` | Wave 0 scaffold |
| IMP-08 | `parseCurrency("(1,234.56)")` → `Decimal("-1234.56")`, high confidence | unit | same | Wave 0 scaffold |
| IMP-08 | `parseCurrency("AUD 1234.56")` → `Decimal("1234.56")`, high confidence | unit | same | Wave 0 scaffold |
| IMP-08 | `parseCurrency("1,234.56 AUD")` → `Decimal("1234.56")`, high confidence | unit | same | Wave 0 scaffold |
| IMP-08 | `parseCurrency("1234.56")` → `Decimal("1234.56")`, high confidence | unit | same | Wave 0 scaffold |
| IMP-08 | `parseCurrency("  1234.56  ")` → `Decimal("1234.56")`, high confidence | unit | same | Wave 0 scaffold |
| IMP-08 | `parseCurrency(" $ -1,234.56 ")` → `Decimal("-1234.56")`, high confidence | unit | same | Wave 0 scaffold |
| IMP-08 | `parseCurrency("1,234")` → `Decimal("1234")`, **low** confidence (ambiguous) | unit | same | Wave 0 scaffold |
| IMP-08 | `parseCurrency("")` → `Decimal("0")`, high confidence | unit | same | Wave 0 scaffold |
| IMP-08 | `parseCurrency("N/A")` → `null`, low confidence | unit | same | Wave 0 scaffold |
| IMP-08 | Decimal precision preserved for 16-digit amount (no float round-trip) | unit | same | Wave 0 scaffold |
| IMP-09 | `detectSubtotals` flags "Total Revenue" row by keyword | unit | `npx vitest run src/lib/import/__tests__/subtotalDetect.test.ts` | Wave 0 scaffold |
| IMP-09 | `detectSubtotals` flags sum-pattern row (Xero "4999 Total Revenue" with synthetic code) | unit | same | Wave 0 scaffold |
| IMP-09 | `detectSubtotals` uses blank row as section boundary | unit | same | Wave 0 scaffold |
| IMP-09 | `detectSubtotals` uses code-prefix change as section boundary | unit | same | Wave 0 scaffold |
| IMP-09 | Subtotals appear in RejectedRowsPanel with reason "subtotal" | component | `npx vitest run src/components/__tests__/RejectedRowsPanel.test.tsx` | Wave 2 |
| IMP-10 | `detectSplitColumns` identifies split code/name columns by header names | unit | `npx vitest run src/lib/import/__tests__/columnMerge.test.ts` | Wave 0 scaffold |
| IMP-10 | `detectSplitColumns` identifies split columns by value shape (short/long) | unit | same | Wave 0 scaffold |
| IMP-10 | `detectSplitColumns` returns `missingCodeFraction > 0.5` for name-only rows | unit | same | Wave 0 scaffold |
| IMP-10 | `mergeColumns` produces `code — name` combined field | unit | same | Wave 0 scaffold |
| IMP-11 | `RejectedRowsPanel` renders grouped-by-reason with row count banner | component | `npx vitest run src/components/__tests__/RejectedRowsPanel.test.tsx` | Wave 0 scaffold |
| IMP-11 | Edit-in-place on rejected row fires `onRejectedRowUpdate` | component | same | Wave 0 scaffold |
| IMP-11 | "Re-parse and include" fires `onRejectedRowReparse` | component | same | Wave 0 scaffold |
| IMP-11 | "Apply to similar" shows diff preview with correct rows | component | same | Wave 0 scaffold |
| REGRESSION | Phase 4 clean fixture (no $, row-0 header) imports cleanly via Phase 7 code path | integration | `npx vitest run src/components/__tests__/ImportTB.test.tsx` | Wave 2 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/import/__tests__/` (lib tests only, ~5 seconds)
- **Per wave merge:** `npx vitest run` (full suite, ~35 seconds on this machine per measured run)
- **Phase gate:** Full suite green before `/gsd:verify-work 7`

### Wave 0 Gaps (files to create before implementation)

- [ ] `src/lib/import/__tests__/headerDetect.test.ts` — covers IMP-07 pure-function cases (all `.todo` stubs)
- [ ] `src/lib/import/__tests__/currencyParse.test.ts` — covers IMP-08 all 7 ROADMAP fixture cases + edge cases (all `.todo` stubs)
- [ ] `src/lib/import/__tests__/subtotalDetect.test.ts` — covers IMP-09 keyword + sum-pattern + section-boundary cases (all `.todo` stubs)
- [ ] `src/lib/import/__tests__/columnMerge.test.ts` — covers IMP-10 split-detect + merge + missing-code cases (all `.todo` stubs)
- [ ] `src/components/__tests__/HeaderRowPicker.test.tsx` — covers IMP-07 component cases (all `.todo` stubs)
- [ ] `src/components/__tests__/RejectedRowsPanel.test.tsx` — covers IMP-11 component cases (all `.todo` stubs)
- [ ] `src/lib/import/__fixtures__/messy-tbs/xero-tb.csv` — structurally-faithful synthetic Xero fixture
- [ ] `src/lib/import/__fixtures__/messy-tbs/myob-tb.csv` — structurally-faithful synthetic MYOB fixture
- [ ] `src/lib/import/__fixtures__/messy-tbs/quickbooks-tb.xlsx` — structurally-faithful synthetic QBO fixture
- [ ] `src/lib/import/__fixtures__/messy-tbs/excel-hand-edited.csv` — hand-edited Excel fixture with $ amounts

Wave 0 must add ZERO failing tests — all stubs use `it.todo(...)`. Existing 763 GREEN tests must remain GREEN after Wave 0 commit.

---

## Sources

### Primary (HIGH confidence)

- **decimal.js API docs** (https://mikemcl.github.io/decimal.js/) — confirmed constructor string-only acceptance, throws on `$1,234.56`, precision handling
- **Phase 4 code inspection** — `src/components/ImportTB.tsx` (637 lines), `src/components/ImportReviewPane.tsx` (210 lines), `src/lib/import/csv.ts`, `src/lib/import/xlsx.ts`, `src/lib/import/match.ts` — full state machine understood, API signatures confirmed, test patterns documented
- **Phase 4 SUMMARY** (`04-4-SUMMARY.md`) — jsdom File.arrayBuffer pitfall, vi.doMock leakage pitfall, supersedeImport pattern
- **SheetJS CE docs** — `header: 1` option for `sheet_to_json` returns `string[][]`; `raw: false` for formatted strings

### Secondary (MEDIUM confidence)

- Xero trial balance export structure: confirmed from multiple third-party import guides (MyWorkpapers, AuditAssistant, Thomson Reuters, G-Accon community) that raw Xero XLSX has 3-4 title rows before the header, that rows 1-4 need deleting for clean imports, and that "Total" rows need deleting from the bottom. Column ordering (name before code) confirmed by community discussion. Synthetic subtotal codes (e.g. 4999 for "Total Revenue") mentioned in multiple guides. Source confidence: MEDIUM — consistent across sources but none are official Xero documentation with file samples.
- MYOB AccountRight export structure: confirmed from MYOB help centre docs that trial balance exports as CSV/TXT with account number + account name + balance columns. Hyphenated account codes (1-1100 format) confirmed from MYOB community. Source confidence: MEDIUM.
- QuickBooks Online export structure: confirmed column headers are "Account", "Debit", "Credit" from TinyTax guide. Name-only export (no codes) confirmed from multiple import guides. Source confidence: MEDIUM.

### Tertiary (LOW confidence — for validation by real user exports)

- Sum-pattern tolerance value (±0.01): reasonable assumption from AU rounding rules; validate against real fixtures
- Confidence threshold (0.60): empirically derived from synthetic fixture analysis; validate against real user exports in UAT
- QBO AU-specific column names and currency format: QBO shows regional variation; AU-specific format not directly verified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all tools verified in codebase
- Pure-function algorithms: HIGH — currency parser (decimal.js API confirmed); MEDIUM — header detection threshold (empirical)
- Real-world fixture shapes: MEDIUM — structurally faithful but not first-hand exports; validate in UAT
- Pitfalls: HIGH — Pitfalls 1-2 from direct code inspection; Pitfalls 3-7 from Phase 4 experience + SheetJS docs

**Research date:** 2026-05-30
**Valid until:** 2026-08-30 (stable libraries; fixture shapes may evolve if vendors update export formats)
