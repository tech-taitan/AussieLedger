---
phase: 07-importtb-ux-rework
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/import/__tests__/headerDetect.test.ts
  - src/lib/import/__tests__/currencyParse.test.ts
  - src/lib/import/__tests__/subtotalDetect.test.ts
  - src/lib/import/__tests__/columnMerge.test.ts
  - src/components/__tests__/HeaderRowPicker.test.tsx
  - src/components/__tests__/RejectedRowsPanel.test.tsx
  - src/lib/import/__fixtures__/messy-tbs/xero-tb.csv
  - src/lib/import/__fixtures__/messy-tbs/myob-tb.csv
  - src/lib/import/__fixtures__/messy-tbs/quickbooks-tb.xlsx
  - src/lib/import/__fixtures__/messy-tbs/excel-hand-edited.csv
autonomous: true
tdd: true
requirements:
  - IMP-07
  - IMP-08
  - IMP-09
  - IMP-10
  - IMP-11
must_haves:
  truths:
    - "Six new test files exist with it.todo() stubs naming every behaviour from 07-VALIDATION.md per-requirement map"
    - "Four messy-TB fixture files exist under src/lib/import/__fixtures__/messy-tbs/ — Xero, MYOB, QBO, hand-edited Excel"
    - "Wave 0 adds ZERO failing tests — the existing 763 SPA GREEN tests stay GREEN after this plan's commit"
    - "Test stubs are runnable (no TypeScript or import errors); todo cases are skipped, not failing"
  artifacts:
    - path: "src/lib/import/__tests__/headerDetect.test.ts"
      provides: "RED-by-design test stubs for detectHeaderRow (IMP-07 unit cases)"
      contains: "it.todo"
    - path: "src/lib/import/__tests__/currencyParse.test.ts"
      provides: "RED-by-design test stubs for parseCurrency (IMP-08 unit cases — all 7 ROADMAP fixtures + ambiguity + 16-digit precision)"
      contains: "it.todo"
    - path: "src/lib/import/__tests__/subtotalDetect.test.ts"
      provides: "RED-by-design test stubs for detectSubtotals (IMP-09 keyword + sum-pattern + section-boundary cases)"
      contains: "it.todo"
    - path: "src/lib/import/__tests__/columnMerge.test.ts"
      provides: "RED-by-design test stubs for detectSplitColumns + mergeColumns + deriveRegexSignature (IMP-10/11)"
      contains: "it.todo"
    - path: "src/components/__tests__/HeaderRowPicker.test.tsx"
      provides: "RED-by-design test stubs for HeaderRowPicker component (IMP-07 UI cases)"
      contains: "it.todo"
    - path: "src/components/__tests__/RejectedRowsPanel.test.tsx"
      provides: "RED-by-design test stubs for RejectedRowsPanel component (IMP-09 + IMP-11 UI cases)"
      contains: "it.todo"
    - path: "src/lib/import/__fixtures__/messy-tbs/xero-tb.csv"
      provides: "Synthetic Xero TB export — 3-4 title rows, reverse name/code order, synthetic-coded subtotals (4999 Total Revenue)"
    - path: "src/lib/import/__fixtures__/messy-tbs/myob-tb.csv"
      provides: "Synthetic MYOB AccountRight TB export — hyphenated codes (1-1100 format), keyword-only subtotals, blank-row section boundaries"
    - path: "src/lib/import/__fixtures__/messy-tbs/quickbooks-tb.xlsx"
      provides: "Synthetic QuickBooks Online TB export — name-only (no code column), leading-whitespace indented sub-accounts, Total ASSETS subtotals"
    - path: "src/lib/import/__fixtures__/messy-tbs/excel-hand-edited.csv"
      provides: "Hand-edited Excel TB — $ prefix amounts, thousands separators, parentheses negatives, blank code on subtotal rows"
  key_links:
    - from: "src/lib/import/__tests__/currencyParse.test.ts"
      to: "src/lib/import/currencyParse.ts (Plan 07-2 will create)"
      via: "import { parseCurrency } from '../currencyParse'"
      pattern: "import.*from.*currencyParse"
    - from: "src/lib/import/__tests__/headerDetect.test.ts"
      to: "src/lib/import/headerDetect.ts (Plan 07-2 will create)"
      via: "import { detectHeaderRow } from '../headerDetect'"
      pattern: "import.*from.*headerDetect"
    - from: "src/lib/import/__tests__/subtotalDetect.test.ts"
      to: "src/lib/import/subtotalDetect.ts (Plan 07-2 will create)"
      via: "import { detectSubtotals } from '../subtotalDetect'"
      pattern: "import.*from.*subtotalDetect"
    - from: "src/lib/import/__tests__/columnMerge.test.ts"
      to: "src/lib/import/columnMerge.ts (Plan 07-2 will create)"
      via: "import { detectSplitColumns, mergeColumns, deriveRegexSignature } from '../columnMerge'"
      pattern: "import.*from.*columnMerge"
---

<objective>
Wave 0 scaffold for Phase 7 ImportTB UX Rework. Six new test files committed with `it.todo()` stubs covering every per-requirement test case enumerated in 07-VALIDATION.md, plus four synthetic-but-structurally-faithful fixture files committed under `src/lib/import/__fixtures__/messy-tbs/`. Zero production code is written in this plan. The intent: RED-by-design — the next plans (07-2, 07-3) flip these `.todo` stubs to `it()` calls as they implement.

Purpose: Phase 4's success came from a Wave 0 scaffold-first pattern (per 04-4-SUMMARY: "11 .todo cases preserved as future-of-test markers"). Phase 7 mirrors that — committing the test names and the fixture data BEFORE any implementation forces the executor to write to a contract rather than discovering the API ad-hoc.

Output:
- 6 test files (4 lib + 2 component) with `it.todo()` stubs, runnable, zero failing tests added
- 4 fixture files (3 CSV + 1 XLSX), each ≥ 12 rows of structurally-faithful data
- Wave 0 commit with all 10 files
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/07-importtb-ux-rework/07-CONTEXT.md
@.planning/phases/07-importtb-ux-rework/07-RESEARCH.md
@.planning/phases/07-importtb-ux-rework/07-VALIDATION.md
@src/lib/import/__tests__/csv.test.ts
@src/lib/import/__tests__/fingerprint.test.ts

<interfaces>
<!-- Contracts that the test stubs MUST import. These modules do NOT exist yet — -->
<!-- the imports are intentional RED markers; tests stay `.todo` so they don't blow up. -->

Module signatures to import (Plan 07-2 will create these):

From src/lib/import/headerDetect.ts (Plan 07-2 creates):
```typescript
export interface HeaderCandidate {
  rowIndex: number;            // 0-based
  score: number;               // 0..1
  confidence: number;          // relative gap to next-best (0..1)
  matchedKeywords: string[];
  stringDensity: number;
}
export interface HeaderDetectResult {
  topCandidate: HeaderCandidate | null;
  alternatives: HeaderCandidate[];   // top 3 excluding topCandidate
  autoPickRow: number | null;        // null when confidence < 0.60
  searchedRows: number;
}
export const AUTO_PICK_THRESHOLD = 0.60;
export function detectHeaderRow(
  rawRows: string[][],
  options?: { maxScanRows?: number }
): HeaderDetectResult;
export function mergeHeaderRows(rowA: string[], rowB: string[]): string[];
```

From src/lib/import/currencyParse.ts (Plan 07-2 creates):
```typescript
import Decimal from 'decimal.js';
export interface ParseResult {
  decimal: Decimal | null;
  confidence: 'high' | 'low';
  reason?: string;
}
export function parseCurrency(raw: string, locale?: 'AU'): ParseResult;
```

From src/lib/import/subtotalDetect.ts (Plan 07-2 creates):
```typescript
import Decimal from 'decimal.js';
export interface ImportRow {
  rowIndex: number;
  code: string;
  name: string;
  debit: Decimal | null;
  credit: Decimal | null;
  rawDebit: string;
  rawCredit: string;
}
export interface SubtotalFlag {
  rowIndex: number;
  reason: 'keyword' | 'sum-pattern' | 'keyword+sum-pattern';
  keyword?: string;
  sumOf?: number[];
}
export const SUM_TOLERANCE_AUD = '0.01';   // tunable named constant
export function detectSubtotals(rows: ImportRow[]): SubtotalFlag[];
```

From src/lib/import/columnMerge.ts (Plan 07-2 creates):
```typescript
export interface ColumnDetectResult {
  hasSplitColumns: boolean;
  codeColHeader: string | null;
  nameColHeader: string | null;
  missingCodeFraction: number;       // 0..1
}
export const MISSING_CODE_THRESHOLD = 0.5;
export function detectSplitColumns(
  headers: string[],
  rows: Record<string, string>[]
): ColumnDetectResult;
export function mergeColumns(
  rows: Record<string, string>[],
  codeCol: string,
  nameCol: string,
  separator?: string
): Record<string, string>[];
export function deriveRegexSignature(failingCellValue: string): string;
```

From src/components/HeaderRowPicker.tsx (Plan 07-3 creates):
```typescript
import type { HeaderDetectResult } from '../lib/import/headerDetect';
interface HeaderRowPickerProps {
  rows: string[][];
  detectResult: HeaderDetectResult | null;
  onPick: (rowIndex: number) => void;
  onCancel: () => void;
}
export const HeaderRowPicker: React.FC<HeaderRowPickerProps>;
```

From src/components/RejectedRowsPanel.tsx (Plan 07-3 creates):
```typescript
export type RejectedRowReason =
  | 'subtotal'
  | 'currency-unparseable'
  | 'no-account-code'
  | 'low-confidence-parse'
  | 'other';
export interface RejectedRow {
  rowIndex: number;
  reason: RejectedRowReason;
  rawCode: string;
  rawName: string;
  rawDebit: string;
  rawCredit: string;
  editedCode?: string;
  editedName?: string;
  editedDebit?: string;
  editedCredit?: string;
  failingCellValue?: string;
  failingColumn?: 'debit' | 'credit' | 'code' | 'name';
}
interface RejectedRowsPanelProps {
  rejectedRows: RejectedRow[];
  onUpdate: (rowIndex: number, patch: Partial<RejectedRow>) => void;
  onReparse: (rowIndex: number) => void;
  onApplyToSimilar: (sourceRowIndex: number) => void;
  onIncludeAllSubtotals: () => void;
}
export const RejectedRowsPanel: React.FC<RejectedRowsPanelProps>;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create four pure-function test stubs + 4 messy-TB fixtures</name>
  <read_first>
    - .planning/phases/07-importtb-ux-rework/07-VALIDATION.md (lines 39-83: Per-Requirement Verification Map — every behavior listed there MUST become an `it.todo` stub in the matching test file)
    - .planning/phases/07-importtb-ux-rework/07-RESEARCH.md (lines 220-335: Real-World TB Export Shapes — copy the structural detail from each shape into the matching fixture)
    - .planning/phases/07-importtb-ux-rework/07-RESEARCH.md (lines 528-550: currency parser test cases table — every row becomes an it.todo)
    - src/lib/import/__tests__/csv.test.ts (existing test pattern — describe block grouping, vitest imports)
    - src/lib/import/__tests__/fingerprint.test.ts (existing pure-function test pattern)
  </read_first>
  <behavior>
    After this task:
    - `src/lib/import/__tests__/headerDetect.test.ts` exists; contains at least these it.todo cases (exact strings):
      - `it.todo('scores row 0 as header correctly on clean fixture (no title rows above)')`
      - `it.todo('returns row 4 for Xero messy fixture (3-4 title rows above)')`
      - `it.todo('merges 2-row header into composite labels ("Account/Code", "Account/Name")')`
      - `it.todo('returns autoPickRow: null when top-candidate confidence < 0.60')`
      - `it.todo('returns top-3 candidates sorted by confidence descending')`
      - `it.todo('disqualifies rows with fewer than 3 non-empty cells from being a header')`
      - `it.todo('exports AUTO_PICK_THRESHOLD = 0.60 as a tunable constant')`
    - `src/lib/import/__tests__/currencyParse.test.ts` exists; contains at least these it.todo cases (exact strings):
      - `it.todo('parses "$1,234.56" to Decimal("1234.56") with high confidence')`
      - `it.todo('parses "(1,234.56)" to Decimal("-1234.56") with high confidence')`
      - `it.todo('parses "AUD 1234.56" to Decimal("1234.56") with high confidence')`
      - `it.todo('parses "1,234.56 AUD" to Decimal("1234.56") with high confidence')`
      - `it.todo('parses "1234.56" to Decimal("1234.56") with high confidence')`
      - `it.todo('parses "  1234.56  " (whitespace) to Decimal("1234.56") with high confidence')`
      - `it.todo('parses " $ -1,234.56 " to Decimal("-1234.56") with high confidence')`
      - `it.todo('parses "1,234" (ambiguous AU/EU) to Decimal("1234") with LOW confidence')`
      - `it.todo('parses "" (empty) to Decimal("0") with high confidence')`
      - `it.todo('parses "  " (whitespace-only) to Decimal("0") with high confidence')`
      - `it.todo('rejects "N/A" with decimal: null and reason "currency unparseable: N/A"')`
      - `it.todo('rejects "pending" with decimal: null')`
      - `it.todo('preserves 16-digit precision (round-trip "1234567890123456.78" identical, never via parseFloat/Number)')`
      - `it.todo('rejects "1.234,56" (EU format) with low confidence + reason "EU format detected"')`
      - `it.todo('handles " (1234.56) " (leading-space paren — Excel Accounting format) correctly')`
    - `src/lib/import/__tests__/subtotalDetect.test.ts` exists; contains at least:
      - `it.todo('flags row with name "Total Revenue" by keyword (case-insensitive)')`
      - `it.todo('flags row with name "TOTAL ASSETS" by keyword')`
      - `it.todo('flags row with name "Subtotal" / "Sub-Total" by keyword')`
      - `it.todo('flags row with name "Grand Total" by keyword')`
      - `it.todo('flags row with name "Net Profit" by keyword')`
      - `it.todo('flags Xero "4999 Total Revenue" by sum-pattern (sum-wins-on-coded — keeps flag even though code present)')`
      - `it.todo('uses blank row as section boundary for sum-pattern')`
      - `it.todo('uses account-code-prefix change as section boundary (1xxx -> 2xxx)')`
      - `it.todo('tolerates ±0.01 AUD rounding in sum-pattern detection')`
      - `it.todo('does NOT flag sums larger than tolerance (±0.02 difference)')`
      - `it.todo('handles MYOB hyphenated codes (1-1100 -> first char "1")')`
      - `it.todo('reports reason: "keyword+sum-pattern" when both signals hit the same row')`
      - `it.todo('exports SUM_TOLERANCE_AUD = "0.01" as a tunable named constant')`
    - `src/lib/import/__tests__/columnMerge.test.ts` exists; contains at least:
      - `it.todo('detectSplitColumns identifies split code/name by header names ("Code"/"Account Name")')`
      - `it.todo('detectSplitColumns identifies split by header regex /account\\s*code/i')`
      - `it.todo('detectSplitColumns identifies split by value shape (short alphanumeric vs longer string) when headers ambiguous')`
      - `it.todo('detectSplitColumns returns hasSplitColumns: false when only one identifier column exists (QBO name-only)')`
      - `it.todo('detectSplitColumns returns missingCodeFraction > 0.5 when >50% of code-column cells are empty')`
      - `it.todo('mergeColumns produces combined "code — name" field with default em-dash separator')`
      - `it.todo('mergeColumns accepts custom separator override')`
      - `it.todo('mergeColumns preserves all original columns (additive, returns new __merged_code_name key)')`
      - `it.todo('deriveRegexSignature converts "$1,234.56 X" to "\\\\$\\\\d+,\\\\d+\\\\.\\\\d+ [A-Za-z]+"')`
      - `it.todo('deriveRegexSignature converts "AUD 1234" to "[A-Za-z]+ \\\\d+"')`
      - `it.todo('deriveRegexSignature escapes regex special chars BEFORE generalising')`
    - Fixture files exist:
      - `src/lib/import/__fixtures__/messy-tbs/xero-tb.csv` — at least 12 data rows; columns: Account Name, Account Code, Debit, Credit, YTD Debit, YTD Credit; 3 title rows + blank row 4 + header row 5; includes "Revenue" section heading, two account rows, "Total Revenue" row with synthetic code "4999" where debit+credit equal the sum of preceding rows; "Operating Expenses" section heading; two expense rows; "Total Operating Expenses" subtotal; final "Total" grand-total row at the bottom
      - `src/lib/import/__fixtures__/messy-tbs/myob-tb.csv` — at least 12 data rows; columns: Account Number, Account Name, Debit, Credit; 3 title rows + blank row 4 + header row 5; uses MYOB hyphenated codes (e.g. "1-1100" Cheque Account); blank-row section boundary between Assets and Revenue; "Total Assets" subtotal row (keyword only, no code)
      - `src/lib/import/__fixtures__/messy-tbs/excel-hand-edited.csv` — at least 12 data rows; columns: Code, Account Name, Debit ($), Credit ($); 3 title rows + blank row 4 + header row 5; amounts use $ prefix + thousands separator (e.g. "$25,000.00"); at least one parentheses-negative cell (e.g. "$(50,000.00)" in Credit column); at least one subtotal row with blank Code + "Total Current Assets" name + sum of preceding amounts
      - `src/lib/import/__fixtures__/messy-tbs/quickbooks-tb.xlsx` — XLSX binary, single sheet "Sheet1", at least 10 data rows; columns: Account, Debit, Credit (NO code column); 3 title rows + blank row 4 + header row 5; sub-accounts have leading whitespace "  Bank Account"; "Total ASSETS" subtotal; final "TOTAL" row. Generate via a one-off Node script `scripts/build-qbo-fixture.cjs` using SheetJS (`require('xlsx')`) that writes to the fixture path, then commit the XLSX binary AND the script. The script MUST be idempotent (regenerates identical bytes for identical input).
    - All test files use ONLY `it.todo(...)` for Phase 7 cases — no `it(...)` (would force RED). They use `import { describe, it } from 'vitest'`. They import the not-yet-existing modules at the top using the static `import { detectHeaderRow } from '../headerDetect'` etc. — TypeScript strict mode tolerates this at compile time because vitest dynamic import; however, to keep the suite GREEN, wrap the import in `// @ts-expect-error — module created in Plan 07-2` if the type-check would block. Verify with `npx vitest run src/lib/import/__tests__/` returns 0 fail.
  </behavior>
  <action>
    1. Create `src/lib/import/__fixtures__/messy-tbs/` directory.

    2. Write `src/lib/import/__fixtures__/messy-tbs/xero-tb.csv` with the exact structure documented in 07-RESEARCH.md lines 226-245 (Xero shape). Use these explicit amounts so sum-pattern tests have known sums:
       ```
       Acme Pty Ltd,,,,,
       Trial Balance,,,,,
       For the year ended 30 June 2026,,,,,
       ,,,,,
       Account,Account Code,Debit,Credit,YTD Debit,YTD Credit
       Revenue,,,,,
       Sales,4100,0.00,50000.00,0.00,50000.00
       Other Revenue,4200,0.00,5000.00,0.00,5000.00
       Total Revenue,4999,0.00,55000.00,0.00,55000.00
       Operating Expenses,,,,,
       Rent,5100,12000.00,0.00,12000.00,0.00
       Utilities,5200,3000.00,0.00,3000.00,0.00
       Total Operating Expenses,5999,15000.00,0.00,15000.00,0.00
       ,,,,,
       Total,,55000.00,55000.00,55000.00,55000.00
       ```
       Note: Row 5 is the header (0-based row index = 4). Row 9 "Total Revenue" sum = 50000 + 5000 = 55000 ✓. Row 13 "Total Operating Expenses" sum = 12000 + 3000 = 15000 ✓.

    3. Write `src/lib/import/__fixtures__/messy-tbs/myob-tb.csv` with structure per 07-RESEARCH.md lines 258-272:
       ```
       Acme Pty Ltd,,,
       Trial Balance,,,
       1 July 2025 to 30 June 2026,,,
       ,,,
       Account Number,Account Name,Debit,Credit
       1-1100,Cheque Account,25000.00,0.00
       1-1200,Cash on Hand,500.00,0.00
       1-1300,Trade Debtors,5000.00,0.00
       Total Assets,,30500.00,0.00
       ,,,
       4-1000,Sales,0.00,30500.00
       4-2000,Service Revenue,0.00,0.00
       Total Income,,0.00,30500.00
       ```
       Header row = row 5 (0-based index 4). Blank row 10 (0-based 9) is the section boundary between Assets (1-) and Income (4-). Row 9 "Total Assets" sum = 25000 + 500 + 5000 = 30500 ✓.

    4. Write `src/lib/import/__fixtures__/messy-tbs/excel-hand-edited.csv` with $ amounts + parentheses negatives:
       ```
       Trial Balance - FY2026,,,
       Prepared by: Jane Smith,,,
       Date: 30/06/2026,,,
       ,,,
       Code,Account Name,Debit ($),Credit ($)
       1100,Cash at Bank,"$25,000.00",$0.00
       1200,Accounts Receivable,"$5,000.00",$0.00
       ,Total Current Assets,"$30,000.00",$0.00
       ,,,
       4100,Sales Revenue,$0.00,"$(50,000.00)"
       4200,Service Income,$0.00,"$(10,000.00)"
       ,Total Revenue,$0.00,"$(60,000.00)"
       ```
       Note: parenthesised negatives use the `$(N,NNN.NN)` shape; subtotal rows have empty Code column. Header row = row 5 (0-based 4).

    5. Create `scripts/build-qbo-fixture.cjs` that writes `src/lib/import/__fixtures__/messy-tbs/quickbooks-tb.xlsx`:
       ```js
       /* @license SPDX-License-Identifier: Apache-2.0 */
       const XLSX = require('xlsx');
       const path = require('path');
       const data = [
         ['Acme Pty Ltd', '', ''],
         ['Trial Balance', '', ''],
         ['As of June 30, 2026', '', ''],
         ['', '', ''],
         ['Account', 'Debit', 'Credit'],
         ['ASSETS', '', ''],
         ['  Bank Account', '25000.00', '0.00'],
         ['  Accounts Receivable', '5000.00', '0.00'],
         ['Total ASSETS', '30000.00', '0.00'],
         ['', '', ''],
         ['REVENUE', '', ''],
         ['  Sales', '0.00', '30000.00'],
         ['Total REVENUE', '0.00', '30000.00'],
         ['TOTAL', '30000.00', '30000.00'],
       ];
       const ws = XLSX.utils.aoa_to_sheet(data);
       const wb = XLSX.utils.book_new();
       XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
       const out = path.resolve(__dirname, '../src/lib/import/__fixtures__/messy-tbs/quickbooks-tb.xlsx');
       XLSX.writeFile(wb, out);
       console.log('Wrote', out);
       ```
       Then run `node scripts/build-qbo-fixture.cjs` once to materialise the binary. Commit BOTH the script and the .xlsx output. Header row = row 5 (0-based 4); leading whitespace on sub-accounts is intentional (QBO indentation pattern).

    6. Write `src/lib/import/__tests__/headerDetect.test.ts`:
       ```typescript
       /* @license SPDX-License-Identifier: Apache-2.0 */
       import { describe, it } from 'vitest';
       // @ts-expect-error — Plan 07-2 creates this module
       import { detectHeaderRow, AUTO_PICK_THRESHOLD, mergeHeaderRows } from '../headerDetect';

       // Reference the imports so eslint/tsc don't complain about unused.
       void detectHeaderRow; void AUTO_PICK_THRESHOLD; void mergeHeaderRows;

       describe('detectHeaderRow (IMP-07)', () => {
         it.todo('scores row 0 as header correctly on clean fixture (no title rows above)');
         it.todo('returns row 4 for Xero messy fixture (3-4 title rows above)');
         it.todo('merges 2-row header into composite labels ("Account/Code", "Account/Name")');
         it.todo('returns autoPickRow: null when top-candidate confidence < 0.60');
         it.todo('returns top-3 candidates sorted by confidence descending');
         it.todo('disqualifies rows with fewer than 3 non-empty cells from being a header');
         it.todo('exports AUTO_PICK_THRESHOLD = 0.60 as a tunable constant');
       });

       describe('mergeHeaderRows (IMP-07)', () => {
         it.todo('joins two header rows with " / " preserving empty cells correctly');
       });
       ```

    7. Write `src/lib/import/__tests__/currencyParse.test.ts` mirroring the same pattern — `@ts-expect-error` import, void-reference the symbols, then enumerate every `it.todo` from the Behavior block. Exact case strings listed in <behavior>.

    8. Write `src/lib/import/__tests__/subtotalDetect.test.ts` — same pattern; every `it.todo` from <behavior>.

    9. Write `src/lib/import/__tests__/columnMerge.test.ts` — same pattern; every `it.todo` from <behavior>.

    10. Write `src/components/__tests__/HeaderRowPicker.test.tsx`:
        ```typescript
        /* @license SPDX-License-Identifier: Apache-2.0 */
        import { describe, it } from 'vitest';
        // @ts-expect-error — Plan 07-3 creates this component
        import { HeaderRowPicker } from '../HeaderRowPicker';
        void HeaderRowPicker;

        describe('HeaderRowPicker (IMP-07 UI)', () => {
          it.todo('renders preview with auto-pick row highlighted (bg-blue-50)');
          it.todo('clicking any row in preview fires onPick(rowIndex)');
          it.todo('low-confidence path (autoPickRow: null) shows "Pick the header row" prompt + top-3 candidates with scores');
          it.todo('high-confidence path shows "We think row N is the header" with confidence percentage badge');
          it.todo('"pick a different row" link reveals top-3 alternatives');
          it.todo('Cancel link fires onCancel');
          it.todo('shows merged-header preview when two consecutive rows both qualify as header-like');
        });
        ```

    11. Write `src/components/__tests__/RejectedRowsPanel.test.tsx`:
        ```typescript
        /* @license SPDX-License-Identifier: Apache-2.0 */
        import { describe, it } from 'vitest';
        // @ts-expect-error — Plan 07-3 creates this component
        import { RejectedRowsPanel } from '../RejectedRowsPanel';
        void RejectedRowsPanel;

        describe('RejectedRowsPanel (IMP-09 + IMP-11)', () => {
          it.todo('renders banner "N rows rejected — review" with chevron expander');
          it.todo('groups rejected rows by reason — subtotal / currency-unparseable / no-account-code / low-confidence-parse / other');
          it.todo('within each reason group, rows sorted by original file rowIndex ascending');
          it.todo('per-row edit-in-place fires onUpdate(rowIndex, patch) on field change');
          it.todo('"Re-parse and include" button fires onReparse(rowIndex)');
          it.todo('"Apply this fix to similar rows" identifies similar by reason + regex signature, shows diff preview');
          it.todo('diff preview includes confirm + cancel; cancel leaves rows unchanged');
          it.todo('"Include all subtotals" bulk button fires onIncludeAllSubtotals (only renders when subtotal group non-empty)');
          it.todo('low-confidence-parse section starts COLLAPSED by default; clicking expander reveals rows');
          it.todo('renders test-id "rejected-rows-banner" so ImportReviewPane integration tests can query it');
        });
        ```

    12. Run `npx vitest run` to confirm: 0 fail, todo count rose by the new stubs, GREEN count unchanged from 763. Commit all 10 files in one commit.
  </action>
  <verify>
    <automated>npx vitest run --reporter=default 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - `ls src/lib/import/__fixtures__/messy-tbs/` shows exactly 4 files: xero-tb.csv, myob-tb.csv, quickbooks-tb.xlsx, excel-hand-edited.csv
    - `ls src/lib/import/__tests__/` includes the 4 new files: headerDetect.test.ts, currencyParse.test.ts, subtotalDetect.test.ts, columnMerge.test.ts
    - `ls src/components/__tests__/` includes the 2 new files: HeaderRowPicker.test.tsx, RejectedRowsPanel.test.tsx
    - `ls scripts/build-qbo-fixture.cjs` exists
    - `grep -c "it.todo" src/lib/import/__tests__/currencyParse.test.ts` returns ≥ 15
    - `grep -c "it.todo" src/lib/import/__tests__/headerDetect.test.ts` returns ≥ 7
    - `grep -c "it.todo" src/lib/import/__tests__/subtotalDetect.test.ts` returns ≥ 13
    - `grep -c "it.todo" src/lib/import/__tests__/columnMerge.test.ts` returns ≥ 11
    - `grep -c "it.todo" src/components/__tests__/HeaderRowPicker.test.tsx` returns ≥ 7
    - `grep -c "it.todo" src/components/__tests__/RejectedRowsPanel.test.tsx` returns ≥ 10
    - `grep -E "^it\\(|^  it\\('" src/lib/import/__tests__/{headerDetect,currencyParse,subtotalDetect,columnMerge}.test.ts` returns ZERO matches (no `it()` calls — only `it.todo()`)
    - `npx vitest run --reporter=default 2>&1 | grep -E "Tests +[0-9]+ failed"` returns no match (zero failing)
    - `npx vitest run --reporter=default 2>&1 | grep -E "Tests +[0-9]+ passed"` shows GREEN count ≥ 763
    - `git log -1 --name-only` lists at least these 11 files (10 source + 1 script): 4 fixtures + 6 tests + scripts/build-qbo-fixture.cjs
  </acceptance_criteria>
  <done>
    All 6 test stubs + 4 fixtures + 1 build script committed. Existing 763 GREEN tests still GREEN. Todo count rose by ≥ 63. Zero failing tests. The contract that Plan 07-2 and 07-3 must satisfy is now expressed in code.
  </done>
</task>

</tasks>

<verification>
- `npx vitest run` exits 0
- `npx vitest run 2>&1 | grep "fail"` returns no failure count
- `npx vitest run 2>&1 | grep -E "passed.*763"` shows the original 763 GREEN preserved
- All 10 files exist on disk and are tracked in git
</verification>

<success_criteria>
1. Wave 0 scaffold present: 4 lib test files + 2 component test files + 4 fixtures + 1 build script
2. Zero new failing tests; todo count increased by ≥ 63
3. Test stubs name every behavior listed in 07-VALIDATION.md per-requirement map
4. Fixtures have explicit known-sum amounts so subtotal sum-pattern tests have concrete expectations
5. The build script for the XLSX fixture is committed so the binary can be regenerated reproducibly
</success_criteria>

<output>
After completion, create `.planning/phases/07-importtb-ux-rework/07-1-SUMMARY.md` per the standard summary template.
</output>
