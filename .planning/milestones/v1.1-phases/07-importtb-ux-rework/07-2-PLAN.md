---
phase: 07-importtb-ux-rework
plan: 2
type: execute
wave: 2
depends_on: [1]
files_modified:
  - src/lib/import/headerDetect.ts
  - src/lib/import/currencyParse.ts
  - src/lib/import/subtotalDetect.ts
  - src/lib/import/columnMerge.ts
  - src/lib/import/csv.ts
  - src/lib/import/xlsx.ts
  - src/lib/import/__tests__/headerDetect.test.ts
  - src/lib/import/__tests__/currencyParse.test.ts
  - src/lib/import/__tests__/subtotalDetect.test.ts
  - src/lib/import/__tests__/columnMerge.test.ts
autonomous: true
tdd: true
requirements:
  - IMP-07
  - IMP-08
  - IMP-09
  - IMP-10
must_haves:
  truths:
    - "parseCurrency(raw) returns a Decimal preserving full precision via string-to-Decimal construction — never via parseFloat/Number"
    - "decimal.js NEVER throws on raw currency input (`$1,234.56`, `(1,234.56)`, etc.) — parser cleans before constructing Decimal"
    - "detectHeaderRow scores rows by string-density + AU TB header keyword hits; auto-picks at confidence ≥ 0.60; returns null otherwise"
    - "detectSubtotals flags rows by keyword OR sum-pattern; sum-pattern wins on coded rows; section boundary = blank row OR code-prefix change"
    - "detectSplitColumns + mergeColumns handle Xero's reverse name/code order and QBO's name-only export"
    - "parseCsvFile + parseXlsxBuffer accept optional `headerRowIndex` parameter; default behavior unchanged (Phase 4 clean fixture still parses identically)"
    - "All 4 pure-function test files flip from RED (it.todo) to GREEN (it()) — every behavior named in 07-VALIDATION.md is now executable and passing"
    - "Existing 763 GREEN tests still GREEN; no regressions"
  artifacts:
    - path: "src/lib/import/headerDetect.ts"
      provides: "Pure-function header-row detector — string-density + keyword scoring, top-3 candidates, AUTO_PICK_THRESHOLD constant, multi-row merge"
      exports: ["detectHeaderRow", "mergeHeaderRows", "AUTO_PICK_THRESHOLD", "AU_TB_HEADER_KEYWORDS"]
      contains: "AUTO_PICK_THRESHOLD = 0.60"
    - path: "src/lib/import/currencyParse.ts"
      provides: "Pure-function tolerant currency parser — handles $, AUD, A$, parens-negatives, thousands sep, whitespace; AU-locale-first with ambiguity flag; preserves decimal.js precision via string-only construction"
      exports: ["parseCurrency", "ParseResult"]
    - path: "src/lib/import/subtotalDetect.ts"
      provides: "Pure-function subtotal detector — keyword + sum-pattern; section boundary via blank row or code-prefix change; SUM_TOLERANCE_AUD tunable constant"
      exports: ["detectSubtotals", "SUM_TOLERANCE_AUD", "SUBTOTAL_KEYWORD_RE"]
    - path: "src/lib/import/columnMerge.ts"
      provides: "Pure-function split-column detector + merger + regex signature generator for 'Apply to similar' feature"
      exports: ["detectSplitColumns", "mergeColumns", "deriveRegexSignature", "MISSING_CODE_THRESHOLD"]
    - path: "src/lib/import/csv.ts"
      provides: "PapaParse-backed CSV reader widened with optional headerRowIndex param + new parseCsvRaw helper (no skipEmptyLines, preserves blank rows for section detection)"
      exports: ["parseCsvFile", "parseCsvText", "parseCsvRaw"]
    - path: "src/lib/import/xlsx.ts"
      provides: "SheetJS-backed XLSX reader widened with optional headerRowIndex param + getXlsxRawRows helper"
      exports: ["parseXlsxFile", "parseXlsxBuffer", "pickSheetByName", "getXlsxRawRows"]
  key_links:
    - from: "src/lib/import/currencyParse.ts"
      to: "decimal.js Decimal constructor (string-only)"
      via: "new Decimal(cleanedString)"
      pattern: "new Decimal\\("
    - from: "src/lib/import/headerDetect.ts"
      to: "AU TB header keyword dictionary"
      via: "AU_TB_HEADER_KEYWORDS constant array"
      pattern: "AU_TB_HEADER_KEYWORDS"
    - from: "src/lib/import/subtotalDetect.ts"
      to: "decimal.js for sum-pattern arithmetic"
      via: "Decimal.plus / minus / abs / lte for tolerance check"
      pattern: "Decimal"
    - from: "src/lib/import/csv.ts"
      to: "PapaParse with header:false + skipEmptyLines:false"
      via: "parseCsvRaw helper"
      pattern: "skipEmptyLines:\\s*false"
---

<objective>
Implement the four pure-function heuristic modules whose test contracts were committed in Plan 07-1. Widen `parseCsvFile` + `parseXlsxBuffer` with optional `headerRowIndex` so the existing Phase 4 clean-import flow is bit-for-bit unchanged but a new "skip pre-header rows and use specified row as header" path becomes available. All 4 test files flip from `it.todo` → `it()` and turn GREEN.

Purpose: Phase 7's UI layer (Plan 07-3) is a thin orchestrator on top of these pure functions. Getting the heuristics right in isolation — with full test coverage from RED contracts written in 07-1 — means the UI plan can focus on state-machine wiring without re-deriving the algorithms. This is the same separation that made Phase 4 ship cleanly: Wave 0 contracts → Wave 1 pure-function implementations → Wave 2 UI consumption.

Output:
- 4 new pure-function modules under `src/lib/import/`
- 2 widened existing modules (`csv.ts`, `xlsx.ts`) with backward-compatible signatures
- 4 test files flipped from RED to GREEN
- Existing 763 GREEN preserved; ~50 new GREEN tests added (one per `it.todo` in 07-1)
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
@.planning/phases/07-importtb-ux-rework/07-1-PLAN.md
@src/lib/import/csv.ts
@src/lib/import/xlsx.ts
@src/lib/import/fingerprint.ts
@src/lib/import/match.ts
@src/lib/money.ts

<interfaces>
<!-- Phase 4 FINAL contracts (must not change, only widen). -->

From src/lib/import/fingerprint.ts (Phase 4 FINAL):
```typescript
export type RawRow = Record<string, string>;
export interface ColumnMappingByName { code: string; name: string; debit: string; credit: string; }
export async function computeImportFingerprint(rows: RawRow[], mapping: ColumnMappingByName, entityId: string, asAtDate: string): Promise<string>;
```

From src/lib/import/csv.ts (Phase 4 FINAL — to be ADDITIVELY widened, not rewritten):
```typescript
export interface ParsedCsv { rows: RawRow[]; headers: string[]; }
export async function parseCsvFile(file: File): Promise<ParsedCsv>;          // ← signature widens
export function parseCsvText(text: string): ParsedCsv;                       // ← signature widens
```

From src/lib/import/xlsx.ts (Phase 4 FINAL — to be ADDITIVELY widened):
```typescript
export interface ParsedXlsx { rows: RawRow[]; headers: string[]; sheetNames: string[]; }
export async function parseXlsxFile(file: File): Promise<ParsedXlsx>;
export function parseXlsxBuffer(buf: ArrayBuffer): ParsedXlsx;
export function pickSheetByName(buf: ArrayBuffer, sheetName: string): { rows: RawRow[]; headers: string[] };
```

From decimal.js (project dependency, do NOT bump):
```typescript
import Decimal from 'decimal.js';
// new Decimal(cleanedString) — string-only acceptance, throws on "$" "AUD" "," etc.
// .negated() returns a new Decimal with sign flipped
// .plus(other), .minus(other), .abs(), .lte(other) for arithmetic
// .isZero(), .toString() for query
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Implement currencyParse.ts + flip currencyParse.test.ts GREEN</name>
  <read_first>
    - src/lib/import/__tests__/currencyParse.test.ts (the contract from Plan 07-1 — every it.todo case)
    - .planning/phases/07-importtb-ux-rework/07-RESEARCH.md (lines 429-549: full algorithm + 14-case test table)
    - .planning/phases/07-importtb-ux-rework/07-RESEARCH.md (lines 947-970: Pitfall 2 + 3 — Decimal constructor throws on raw currency; EU format detection)
    - .planning/phases/07-importtb-ux-rework/07-RESEARCH.md (lines 1075-1090: decimal.js string-passing pattern)
    - src/lib/money.ts (existing Decimal usage in project — confirm import path matches)
  </read_first>
  <behavior>
    - `parseCurrency('$1,234.56')` returns `{ decimal: Decimal('1234.56'), confidence: 'high' }`
    - `parseCurrency('(1,234.56)')` returns `{ decimal: Decimal('-1234.56'), confidence: 'high' }`
    - `parseCurrency('AUD 1234.56')` returns `{ decimal: Decimal('1234.56'), confidence: 'high' }`
    - `parseCurrency('1,234.56 AUD')` returns `{ decimal: Decimal('1234.56'), confidence: 'high' }`
    - `parseCurrency('1234.56')` returns `{ decimal: Decimal('1234.56'), confidence: 'high' }`
    - `parseCurrency('  1234.56  ')` returns `{ decimal: Decimal('1234.56'), confidence: 'high' }`
    - `parseCurrency(' $ -1,234.56 ')` returns `{ decimal: Decimal('-1234.56'), confidence: 'high' }`
    - `parseCurrency('1,234')` returns `{ decimal: Decimal('1234'), confidence: 'low', reason: matches /ambiguous/ }`
    - `parseCurrency('')` returns `{ decimal: Decimal('0'), confidence: 'high' }`
    - `parseCurrency('  ')` returns `{ decimal: Decimal('0'), confidence: 'high' }`
    - `parseCurrency('N/A')` returns `{ decimal: null, confidence: 'low', reason: matches /unparseable/ }`
    - `parseCurrency('pending')` returns `{ decimal: null, confidence: 'low' }`
    - `parseCurrency('1.234,56')` returns `{ decimal: null, confidence: 'low', reason: matches /EU format/ }`
    - `parseCurrency(' (1234.56) ')` returns `{ decimal: Decimal('-1234.56'), confidence: 'high' }` (leading-space paren — Excel Accounting format)
    - 16-digit precision: `parseCurrency('1234567890123456.78').decimal.toString() === '1234567890123456.78'` exactly
    - parseCurrency never throws — even on invalid input, returns `{ decimal: null }` with a reason string. Verified by `grep -nE "throw" src/lib/import/currencyParse.ts` returning ZERO matches.
  </behavior>
  <action>
    1. Create `src/lib/import/currencyParse.ts` with the exact algorithm from 07-RESEARCH.md §2 (lines 429-549). Use this skeleton (fill in the bodies):

       ```typescript
       /* @license SPDX-License-Identifier: Apache-2.0 */
       import Decimal from 'decimal.js';

       export interface ParseResult {
         decimal: Decimal | null;
         confidence: 'high' | 'low';
         reason?: string;
       }

       // EU format like "1.234,56" — period as thousands, comma as decimal.
       const EU_FORMAT_RE = /^\d{1,3}(\.\d{3})+(,\d+)?$/;

       // Parens notation supporting optional leading $ and surrounding whitespace.
       const PARENS_RE = /^\(\s*\$?\s*([\d,]+(?:\.\d+)?)\s*\)$/;

       // AU numeric shape — digits, optional commas, optional period.
       const AU_NUMERIC_RE = /^[\d,]*\.?\d*$/;

       export function parseCurrency(raw: string, _locale: 'AU' = 'AU'): ParseResult {
         const trimmed = (raw ?? '').trim();
         if (trimmed === '') return { decimal: new Decimal('0'), confidence: 'high' };

         // Parens-negative BEFORE stripping (EU regex would false-positive on "(...)").
         const parens = PARENS_RE.exec(trimmed);
         if (parens) {
           const cleaned = parens[1].replace(/,/g, '');
           if (!/^\d+(\.\d+)?$/.test(cleaned)) {
             return { decimal: null, confidence: 'low', reason: `currency unparseable: ${raw}` };
           }
           return { decimal: new Decimal(cleaned).negated(), confidence: 'high' };
         }

         // Strip currency markers — order matters: A$ before AUD before $.
         const stripped = trimmed
           .replace(/^A\$\s*/i, '')
           .replace(/\s*A\$$/i, '')
           .replace(/^AUD\s*/i, '')
           .replace(/\s*AUD$/i, '')
           .replace(/^\$\s*/, '')
           .replace(/\s*\$$/, '')
           .trim();

         const negative = stripped.startsWith('-');
         const absStr = (negative ? stripped.slice(1) : stripped).trim();

         // Detect EU before AU validation — would otherwise misclassify "1.234,56".
         if (EU_FORMAT_RE.test(absStr)) {
           return { decimal: null, confidence: 'low', reason: `EU format detected: ${raw}` };
         }

         if (!AU_NUMERIC_RE.test(absStr) || absStr === '') {
           return { decimal: null, confidence: 'low', reason: `currency unparseable: ${raw}` };
         }

         const cleaned = absStr.replace(/,/g, '');
         if (!/^\d+\.?\d*$/.test(cleaned) && !/^\d*\.\d+$/.test(cleaned)) {
           return { decimal: null, confidence: 'low', reason: `currency unparseable: ${raw}` };
         }

         const isAmbiguous = absStr.includes(',') && !absStr.includes('.');
         try {
           const dec = negative ? new Decimal(cleaned).negated() : new Decimal(cleaned);
           return {
             decimal: dec,
             confidence: isAmbiguous ? 'low' : 'high',
             reason: isAmbiguous
               ? `ambiguous: "${raw}" parsed as AU ${cleaned}; could be EU`
               : undefined,
           };
         } catch {
           // Defensive — Decimal should never throw on the cleaned string, but if it
           // does, never propagate; degrade to "unparseable".
           return { decimal: null, confidence: 'low', reason: `currency unparseable: ${raw}` };
         }
       }
       ```

       Notes:
       - The try/catch is defensive only; with the regex pre-validation it should never trigger. Do NOT use it to mask bugs — every test case from <behavior> must round-trip exactly.
       - Never call `parseFloat` or `Number()` — verify via `grep -nE "parseFloat|Number\\(" src/lib/import/currencyParse.ts` returning ZERO matches.

    2. Open `src/lib/import/__tests__/currencyParse.test.ts` (created in Plan 07-1). Remove the `@ts-expect-error` line and the `void ...;` references. Flip every `it.todo(...)` to `it(...)` with an actual test body. Each test must assert against the exact expected output documented in 07-RESEARCH.md test table and the <behavior> block above. Example structure:

       ```typescript
       import { describe, it, expect } from 'vitest';
       import Decimal from 'decimal.js';
       import { parseCurrency } from '../currencyParse';

       describe('parseCurrency (IMP-08)', () => {
         it('parses "$1,234.56" to Decimal("1234.56") with high confidence', () => {
           const result = parseCurrency('$1,234.56');
           expect(result.decimal?.toString()).toBe('1234.56');
           expect(result.confidence).toBe('high');
         });

         it('parses "(1,234.56)" to Decimal("-1234.56") with high confidence', () => {
           const result = parseCurrency('(1,234.56)');
           expect(result.decimal?.toString()).toBe('-1234.56');
           expect(result.confidence).toBe('high');
         });

         // ... continue for every it.todo from Plan 07-1 ...

         it('preserves 16-digit precision (round-trip "1234567890123456.78" identical, never via parseFloat/Number)', () => {
           const raw = '1234567890123456.78';
           const result = parseCurrency(raw);
           expect(result.decimal).not.toBeNull();
           // Critical: native parseFloat loses precision on 17+ sig figs. String round-trip must match exactly.
           expect(result.decimal!.toString()).toBe(raw);
           // Also: result must be a Decimal instance, not a number.
           expect(result.decimal).toBeInstanceOf(Decimal);
         });

         it('rejects "N/A" with decimal: null and reason "currency unparseable: N/A"', () => {
           const result = parseCurrency('N/A');
           expect(result.decimal).toBeNull();
           expect(result.confidence).toBe('low');
           expect(result.reason).toMatch(/currency unparseable: N\/A/);
         });
       });
       ```

    3. Run `npx vitest run src/lib/import/__tests__/currencyParse.test.ts`. Expect all tests GREEN. If any fail, fix the implementation (do NOT relax the test assertions).

    4. Run `npx vitest run` (full suite). Verify 0 fail. GREEN count should rise by 15+.
  </action>
  <verify>
    <automated>npx vitest run src/lib/import/__tests__/currencyParse.test.ts --reporter=default 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - `src/lib/import/currencyParse.ts` exists and exports `parseCurrency` + `ParseResult`
    - `grep -nE "throw " src/lib/import/currencyParse.ts` returns no match outside the catch fallback (parser never propagates exceptions)
    - `grep -nE "parseFloat|Number\\(" src/lib/import/currencyParse.ts` returns ZERO matches (decimal.js precision preservation)
    - `grep -c "new Decimal" src/lib/import/currencyParse.ts` returns ≥ 2 (Decimal constructed from cleaned strings)
    - `grep -c "it.todo" src/lib/import/__tests__/currencyParse.test.ts` returns 0 (all flipped to GREEN)
    - `grep -c "@ts-expect-error" src/lib/import/__tests__/currencyParse.test.ts` returns 0 (module now exists)
    - `npx vitest run src/lib/import/__tests__/currencyParse.test.ts` exit 0 with ≥ 15 GREEN tests
    - `npx vitest run --reporter=default 2>&1 | grep -E "failed"` shows no failures
  </acceptance_criteria>
  <done>
    parseCurrency implemented per RESEARCH algorithm; never throws; preserves Decimal precision; all 15+ test cases GREEN. Existing 763 GREEN preserved.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement headerDetect.ts + subtotalDetect.ts + columnMerge.ts; flip 3 test files GREEN</name>
  <read_first>
    - src/lib/import/__tests__/headerDetect.test.ts (contract from Plan 07-1)
    - src/lib/import/__tests__/subtotalDetect.test.ts (contract from Plan 07-1)
    - src/lib/import/__tests__/columnMerge.test.ts (contract from Plan 07-1)
    - .planning/phases/07-importtb-ux-rework/07-RESEARCH.md (lines 339-427: headerDetect algorithm + scoring formula)
    - .planning/phases/07-importtb-ux-rework/07-RESEARCH.md (lines 550-666: subtotalDetect keyword regex + section boundary + sum-pattern)
    - .planning/phases/07-importtb-ux-rework/07-RESEARCH.md (lines 668-723: columnMerge detect + merge + missing-code threshold)
    - .planning/phases/07-importtb-ux-rework/07-RESEARCH.md (lines 794-835: deriveRegexSignature algorithm — escape THEN generalise)
    - .planning/phases/07-importtb-ux-rework/07-RESEARCH.md (lines 978-989: Pitfall 5 — minimum-columns filter for header detection)
    - src/lib/import/__fixtures__/messy-tbs/xero-tb.csv (test data for sum-pattern + header-detect)
    - src/lib/import/__fixtures__/messy-tbs/myob-tb.csv (test data for code-prefix section boundary)
  </read_first>
  <behavior>
    **headerDetect.ts:**
    - `detectHeaderRow(rows, options?)` returns `{ topCandidate, alternatives, autoPickRow, searchedRows }`
    - `topCandidate.rowIndex` for the Xero fixture (3 title rows + blank + header at index 4) is `4`
    - `topCandidate.score >= 0.6` for any row with 3+ keyword matches in a 6-col header
    - `autoPickRow === null` when `confidence < 0.60`
    - `alternatives.length === 3` (or fewer if fewer than 4 candidates)
    - Rows with `< 3` non-empty cells return score `0` (disqualified — Pitfall 5)
    - `AUTO_PICK_THRESHOLD === 0.60` exported
    - `mergeHeaderRows(['Account','','Debit','Credit'], ['Code','Name','',''])` returns `['Account / Code', 'Account / Name', 'Debit', 'Credit']`
    - `AU_TB_HEADER_KEYWORDS` exported and includes at minimum: account, code, name, description, debit, credit, balance, amount, dr, cr, account number, account name, account code, ytd debit, ytd credit

    **subtotalDetect.ts:**
    - `detectSubtotals(rows)` returns `SubtotalFlag[]` where each flag has `rowIndex`, `reason`, and (for sum-pattern) `sumOf: number[]`
    - Keyword regex matches case-insensitive: `total`, `sum`, `net`, `grand total`, `subtotal`, `sub-total`, `gst collected`, `trial balance total`
    - Sum-pattern: row's debit OR credit ≈ sum of preceding rows in the same section, within `SUM_TOLERANCE_AUD = '0.01'`
    - Section boundary: blank row (all 4 of code/name/debit/credit empty or zero) OR first character of `code` changes from previous row's first character (MYOB-aware: `'1-1100'.split('-')[0][0] === '1'`)
    - Sum-pattern wins on coded rows — Xero "4999 Total Revenue" is flagged even with synthetic code
    - When both signals match same row: `reason: 'keyword+sum-pattern'`
    - `SUM_TOLERANCE_AUD` exported as the string `'0.01'` (used to construct a Decimal at use site)
    - `SUBTOTAL_KEYWORD_RE` exported

    **columnMerge.ts:**
    - `detectSplitColumns(headers, rows)` returns `{ hasSplitColumns, codeColHeader, nameColHeader, missingCodeFraction }`
    - Matches headers via `CODE_HEADER_RE = /^(code|account\s*code|acct|acc\.?\s*no\.?|account\s*no\.?|account\s*number)/i` and `NAME_HEADER_RE = /^(name|account\s*name|description|account$)/i`
    - Falls back to value-shape heuristic when headers ambiguous: code-like = 70%+ of cells are short alphanumeric (length 2-8, `/^[\w-]{2,8}$/`); name-like = average length > 8
    - Returns `hasSplitColumns: false` for QBO single-column "Account" (name-only)
    - `missingCodeFraction` = fraction of code-column cells that are empty/whitespace
    - `MISSING_CODE_THRESHOLD === 0.5` exported
    - `mergeColumns(rows, codeCol, nameCol, separator?)` returns a NEW array of rows with an additional `__merged_code_name` key; default separator is `' — '` (em-dash with spaces)
    - Original columns preserved (additive merge)
    - `deriveRegexSignature(failingCellValue)` returns a string where: regex special chars are escaped FIRST, then digit-sequences become `\d+`, then letter-sequences become `[A-Za-z]+`
    - `deriveRegexSignature('$1,234.56 X')` returns `'\\$\\d+,\\d+\\.\\d+ [A-Za-z]+'`
    - `deriveRegexSignature('AUD 1234')` returns `'[A-Za-z]+ \\d+'`
  </behavior>
  <action>
    1. Create `src/lib/import/headerDetect.ts`:

       ```typescript
       /* @license SPDX-License-Identifier: Apache-2.0 */

       export const AUTO_PICK_THRESHOLD = 0.60;
       export const MIN_HEADER_COLS = 3;
       const DENSITY_WEIGHT = 0.4;
       const KEYWORD_WEIGHT = 0.6;
       const DEFAULT_MAX_SCAN_ROWS = 15;

       export const AU_TB_HEADER_KEYWORDS = [
         'account', 'code', 'name', 'description', 'acc', 'acct',
         'debit', 'credit', 'balance', 'amount', 'dr', 'cr',
         'account number', 'account name', 'account code',
         'ytd debit', 'ytd credit',
       ] as const;

       export interface HeaderCandidate {
         rowIndex: number;
         score: number;
         confidence: number;
         matchedKeywords: string[];
         stringDensity: number;
       }
       export interface HeaderDetectResult {
         topCandidate: HeaderCandidate | null;
         alternatives: HeaderCandidate[];
         autoPickRow: number | null;
         searchedRows: number;
       }

       function stringDensity(row: string[]): number {
         const nonEmpty = row.filter((c) => c.trim() !== '');
         if (nonEmpty.length === 0) return 0;
         const strings = nonEmpty.filter((c) => isNaN(Number(c.replace(/[$,]/g, ''))));
         return strings.length / nonEmpty.length;
       }

       function matchKeywords(row: string[]): string[] {
         const matches: string[] = [];
         for (const cell of row) {
           const lc = cell.toLowerCase();
           for (const kw of AU_TB_HEADER_KEYWORDS) {
             if (lc.includes(kw) && !matches.includes(kw)) matches.push(kw);
           }
         }
         return matches;
       }

       function scoreRow(row: string[]): { score: number; matchedKeywords: string[]; stringDensity: number } {
         const nonEmpty = row.filter((c) => c.trim() !== '').length;
         if (nonEmpty < MIN_HEADER_COLS) {
           // Pitfall 5: disqualify single-text section headings.
           return { score: 0, matchedKeywords: [], stringDensity: 0 };
         }
         const density = stringDensity(row);
         const matched = matchKeywords(row);
         const keywordFrac = Math.min(1, matched.length / AU_TB_HEADER_KEYWORDS.length);
         const score = density * DENSITY_WEIGHT + keywordFrac * KEYWORD_WEIGHT;
         return { score, matchedKeywords: matched, stringDensity: density };
       }

       export function detectHeaderRow(
         rawRows: string[][],
         options?: { maxScanRows?: number },
       ): HeaderDetectResult {
         const maxScan = Math.min(rawRows.length, options?.maxScanRows ?? DEFAULT_MAX_SCAN_ROWS);
         const scored: HeaderCandidate[] = [];
         for (let i = 0; i < maxScan; i++) {
           const { score, matchedKeywords, stringDensity: dens } = scoreRow(rawRows[i] ?? []);
           scored.push({ rowIndex: i, score, confidence: 0, matchedKeywords, stringDensity: dens });
         }
         // Sort by score desc
         const sorted = [...scored].sort((a, b) => b.score - a.score);
         const top = sorted[0] ?? null;
         const second = sorted[1] ?? null;
         if (top && top.score > 0) {
           top.confidence = second && second.score > 0 ? (top.score - second.score) / top.score : 1;
         }
         const autoPickRow = top && top.score > 0 && top.confidence >= AUTO_PICK_THRESHOLD ? top.rowIndex : null;
         return {
           topCandidate: top && top.score > 0 ? top : null,
           alternatives: sorted.slice(1, 4).filter((c) => c.score > 0),
           autoPickRow,
           searchedRows: maxScan,
         };
       }

       export function mergeHeaderRows(rowA: string[], rowB: string[]): string[] {
         const maxLen = Math.max(rowA.length, rowB.length);
         const merged: string[] = [];
         for (let i = 0; i < maxLen; i++) {
           const a = (rowA[i] ?? '').trim();
           const b = (rowB[i] ?? '').trim();
           if (a && b) merged.push(`${a} / ${b}`);
           else merged.push(a || b);
         }
         return merged;
       }
       ```

    2. Create `src/lib/import/subtotalDetect.ts`:

       ```typescript
       /* @license SPDX-License-Identifier: Apache-2.0 */
       import Decimal from 'decimal.js';

       export const SUM_TOLERANCE_AUD = '0.01';
       export const SUBTOTAL_KEYWORD_RE =
         /\b(total|sum|net|grand\s+total|subtotal|sub[-\s]?total|gst\s+collected|trial\s+balance\s+total)\b/i;

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

       function isBlankRow(row: ImportRow): boolean {
         const codeBlank = !row.code || row.code.trim() === '';
         const nameBlank = !row.name || row.name.trim() === '';
         const debitZero = !row.debit || row.debit.isZero();
         const creditZero = !row.credit || row.credit.isZero();
         return codeBlank && nameBlank && debitZero && creditZero;
       }

       // MYOB-aware: "1-1100" -> first char = "1". Standard "4100" -> "4".
       function codePrefix(code: string): string {
         if (!code) return '';
         const beforeHyphen = code.split('-')[0] ?? '';
         return beforeHyphen[0] ?? '';
       }

       function splitIntoSections(rows: ImportRow[]): ImportRow[][] {
         const sections: ImportRow[][] = [];
         let current: ImportRow[] = [];
         for (const row of rows) {
           if (isBlankRow(row)) {
             if (current.length > 0) sections.push(current);
             current = [];
             continue;
           }
           if (current.length > 0 && row.code && current[current.length - 1].code) {
             const prev = codePrefix(current[current.length - 1].code);
             const curr = codePrefix(row.code);
             if (prev && curr && prev !== curr) {
               sections.push(current);
               current = [];
             }
           }
           current.push(row);
         }
         if (current.length > 0) sections.push(current);
         return sections;
       }

       function isSumPattern(
         candidate: ImportRow,
         precedingRows: ImportRow[],
       ): number[] | null {
         if (precedingRows.length === 0) return null;
         const tol = new Decimal(SUM_TOLERANCE_AUD);
         const cDebit = candidate.debit ?? new Decimal('0');
         const cCredit = candidate.credit ?? new Decimal('0');

         // Try matching debit sum
         const debitRows = precedingRows.filter((r) => r.debit && !r.debit.isZero());
         if (debitRows.length > 0 && !cDebit.isZero()) {
           const debitSum = debitRows.reduce(
             (a, r) => a.plus(r.debit!),
             new Decimal('0'),
           );
           if (debitSum.minus(cDebit).abs().lte(tol)) {
             return debitRows.map((r) => r.rowIndex);
           }
         }

         // Try matching credit sum
         const creditRows = precedingRows.filter((r) => r.credit && !r.credit.isZero());
         if (creditRows.length > 0 && !cCredit.isZero()) {
           const creditSum = creditRows.reduce(
             (a, r) => a.plus(r.credit!),
             new Decimal('0'),
           );
           if (creditSum.minus(cCredit).abs().lte(tol)) {
             return creditRows.map((r) => r.rowIndex);
           }
         }
         return null;
       }

       export function detectSubtotals(rows: ImportRow[]): SubtotalFlag[] {
         const flags: SubtotalFlag[] = [];
         const sections = splitIntoSections(rows);
         for (const section of sections) {
           for (let i = 0; i < section.length; i++) {
             const row = section[i];
             const kw = SUBTOTAL_KEYWORD_RE.exec(row.name);
             const preceding = section.slice(0, i);
             const sumIxs = isSumPattern(row, preceding);
             if (kw && sumIxs) {
               flags.push({
                 rowIndex: row.rowIndex,
                 reason: 'keyword+sum-pattern',
                 keyword: kw[0],
                 sumOf: sumIxs,
               });
             } else if (kw) {
               flags.push({ rowIndex: row.rowIndex, reason: 'keyword', keyword: kw[0] });
             } else if (sumIxs) {
               flags.push({ rowIndex: row.rowIndex, reason: 'sum-pattern', sumOf: sumIxs });
             }
           }
         }
         return flags;
       }
       ```

    3. Create `src/lib/import/columnMerge.ts`:

       ```typescript
       /* @license SPDX-License-Identifier: Apache-2.0 */

       export const MISSING_CODE_THRESHOLD = 0.5;
       const CODE_HEADER_RE =
         /^(code|account\s*code|acct|acc\.?\s*no\.?|account\s*no\.?|account\s*number)/i;
       const NAME_HEADER_RE = /^(name|account\s*name|description|account$)/i;

       export interface ColumnDetectResult {
         hasSplitColumns: boolean;
         codeColHeader: string | null;
         nameColHeader: string | null;
         missingCodeFraction: number;
       }

       function columnValues(rows: Record<string, string>[], header: string): string[] {
         return rows.map((r) => (r[header] ?? '').toString());
       }

       function isCodeLike(values: string[]): boolean {
         const nonEmpty = values.filter((v) => v.trim() !== '');
         if (nonEmpty.length === 0) return false;
         const shortAlphanumeric = nonEmpty.filter((v) => /^[\w-]{2,8}$/.test(v.trim()));
         return shortAlphanumeric.length / nonEmpty.length > 0.7;
       }

       function isNameLike(values: string[]): boolean {
         const nonEmpty = values.filter((v) => v.trim() !== '');
         if (nonEmpty.length === 0) return false;
         const avgLen =
           nonEmpty.reduce((a, v) => a + v.trim().length, 0) / nonEmpty.length;
         return avgLen > 8;
       }

       export function detectSplitColumns(
         headers: string[],
         rows: Record<string, string>[],
       ): ColumnDetectResult {
         let codeCol = headers.find((h) => CODE_HEADER_RE.test(h.trim())) ?? null;
         let nameCol = headers.find((h) => NAME_HEADER_RE.test(h.trim())) ?? null;

         // Fallback to value-shape heuristic when only one matched.
         if (!codeCol && nameCol) {
           const others = headers.filter((h) => h !== nameCol);
           codeCol = others.find((h) => isCodeLike(columnValues(rows, h))) ?? null;
         }
         if (!nameCol && codeCol) {
           const others = headers.filter((h) => h !== codeCol);
           nameCol = others.find((h) => isNameLike(columnValues(rows, h))) ?? null;
         }

         const hasSplitColumns = !!codeCol && !!nameCol;
         let missingCodeFraction = 0;
         if (codeCol) {
           const vals = columnValues(rows, codeCol);
           const empty = vals.filter((v) => v.trim() === '').length;
           missingCodeFraction = vals.length === 0 ? 0 : empty / vals.length;
         }
         return {
           hasSplitColumns,
           codeColHeader: codeCol,
           nameColHeader: nameCol,
           missingCodeFraction,
         };
       }

       export function mergeColumns(
         rows: Record<string, string>[],
         codeCol: string,
         nameCol: string,
         separator = ' — ',
       ): Record<string, string>[] {
         return rows.map((r) => {
           const code = (r[codeCol] ?? '').toString().trim();
           const name = (r[nameCol] ?? '').toString().trim();
           const merged = code && name ? `${code}${separator}${name}` : (code || name);
           return { ...r, __merged_code_name: merged };
         });
       }

       export function deriveRegexSignature(failingCellValue: string): string {
         return failingCellValue
           .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')   // 1. escape special chars
           .replace(/\d+/g, '\\d+')                   // 2. generalise digit sequences
           .replace(/[a-zA-Z]+/g, '[A-Za-z]+');       // 3. generalise letter sequences
       }
       ```

    4. Open the 3 test files (headerDetect.test.ts, subtotalDetect.test.ts, columnMerge.test.ts). Remove `@ts-expect-error` and `void`-reference lines. Flip every `it.todo` to a real `it()` test with concrete assertions. Use the fixtures from `__fixtures__/messy-tbs/` to drive realistic test data — e.g.:

       ```typescript
       import fs from 'node:fs';
       import path from 'node:path';
       import { parseCsvText, parseCsvRaw } from '../csv';  // parseCsvRaw lands in Task 3
       // ...
       it('returns row 4 for Xero messy fixture (3-4 title rows above)', () => {
         const csv = fs.readFileSync(
           path.resolve(__dirname, '../__fixtures__/messy-tbs/xero-tb.csv'),
           'utf8',
         );
         // For this Task 2 we read raw rows manually via PapaParse since parseCsvRaw lands in Task 3;
         // alternatively split('\n').map(line => line.split(',')) suffices for the fixture's simple cells.
         const rawRows = csv.split('\n').map((l) => l.split(','));
         const result = detectHeaderRow(rawRows);
         expect(result.topCandidate?.rowIndex).toBe(4);  // 0-based; "Account,Account Code,Debit,..."
         expect(result.autoPickRow).toBe(4);  // confidence ≥ 0.60
       });
       ```

       For subtotalDetect tests, construct `ImportRow[]` arrays directly in the test with `new Decimal(...)` for debit/credit — no need to round-trip through CSV. Example:

       ```typescript
       import Decimal from 'decimal.js';
       it('flags Xero "4999 Total Revenue" by sum-pattern (sum-wins-on-coded — keeps flag even though code present)', () => {
         const rows: ImportRow[] = [
           { rowIndex: 0, code: '4100', name: 'Sales', debit: new Decimal('0'), credit: new Decimal('50000'), rawDebit: '0.00', rawCredit: '50000.00' },
           { rowIndex: 1, code: '4200', name: 'Other Revenue', debit: new Decimal('0'), credit: new Decimal('5000'), rawDebit: '0.00', rawCredit: '5000.00' },
           { rowIndex: 2, code: '4999', name: 'Total Revenue', debit: new Decimal('0'), credit: new Decimal('55000'), rawDebit: '0.00', rawCredit: '55000.00' },
         ];
         const flags = detectSubtotals(rows);
         const flag = flags.find((f) => f.rowIndex === 2);
         expect(flag).toBeDefined();
         expect(flag!.reason).toBe('keyword+sum-pattern');
         expect(flag!.sumOf).toEqual([0, 1]);
       });

       it('uses account-code-prefix change as section boundary (1xxx -> 2xxx)', () => {
         const rows: ImportRow[] = [
           { rowIndex: 0, code: '1100', name: 'Cash', debit: new Decimal('25000'), credit: new Decimal('0'), rawDebit: '25000', rawCredit: '0' },
           { rowIndex: 1, code: '2100', name: 'Accounts Payable', debit: new Decimal('0'), credit: new Decimal('25000'), rawDebit: '0', rawCredit: '25000' },
           // The 2100 row's credit equals the 1100 row's debit — but they're in DIFFERENT sections,
           // so sum-pattern must NOT trigger across the section boundary.
         ];
         const flags = detectSubtotals(rows);
         expect(flags).toEqual([]);  // no false-positive across section
       });
       ```

       Cover every `it.todo` from Plan 07-1 with a real test.

    5. Run `npx vitest run src/lib/import/__tests__/`. Expect 0 fail, all new tests GREEN.

    6. Run `npx vitest run` (full suite). Expect 0 fail. GREEN count up by ≥ 31 (header 7+ + subtotal 13+ + columnMerge 11+).
  </action>
  <verify>
    <automated>npx vitest run src/lib/import/__tests__/ --reporter=default 2>&1 | tail -15</automated>
  </verify>
  <acceptance_criteria>
    - `src/lib/import/headerDetect.ts` exists; exports `detectHeaderRow`, `mergeHeaderRows`, `AUTO_PICK_THRESHOLD`, `AU_TB_HEADER_KEYWORDS`
    - `src/lib/import/subtotalDetect.ts` exists; exports `detectSubtotals`, `SUM_TOLERANCE_AUD`, `SUBTOTAL_KEYWORD_RE`
    - `src/lib/import/columnMerge.ts` exists; exports `detectSplitColumns`, `mergeColumns`, `deriveRegexSignature`, `MISSING_CODE_THRESHOLD`
    - `grep -c "AUTO_PICK_THRESHOLD = 0.60" src/lib/import/headerDetect.ts` returns 1
    - `grep -c "SUM_TOLERANCE_AUD = '0.01'" src/lib/import/subtotalDetect.ts` returns 1
    - `grep -c "MISSING_CODE_THRESHOLD = 0.5" src/lib/import/columnMerge.ts` returns 1
    - `grep -c "it.todo" src/lib/import/__tests__/{headerDetect,subtotalDetect,columnMerge}.test.ts` returns 0 across all 3 files
    - `npx vitest run src/lib/import/__tests__/headerDetect.test.ts` exit 0 with ≥ 7 GREEN
    - `npx vitest run src/lib/import/__tests__/subtotalDetect.test.ts` exit 0 with ≥ 13 GREEN
    - `npx vitest run src/lib/import/__tests__/columnMerge.test.ts` exit 0 with ≥ 11 GREEN
    - `npx vitest run --reporter=default 2>&1 | grep -E "failed"` shows no failures
  </acceptance_criteria>
  <done>
    Three pure-function modules implemented per RESEARCH algorithms; 3 test files flipped RED → GREEN; existing tests still GREEN.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Widen csv.ts + xlsx.ts with headerRowIndex param; add parseCsvRaw + getXlsxRawRows</name>
  <read_first>
    - src/lib/import/csv.ts (Phase 4 current implementation — DO NOT remove existing behavior)
    - src/lib/import/xlsx.ts (Phase 4 current implementation — DO NOT remove existing behavior)
    - src/lib/import/__tests__/csv.test.ts (existing Phase 4 tests MUST stay GREEN)
    - src/lib/import/__tests__/xlsx.test.ts (existing Phase 4 tests MUST stay GREEN)
    - .planning/phases/07-importtb-ux-rework/07-RESEARCH.md (lines 1007-1069: parseCsvRaw + getXlsxRawRows + widened parseCsvFile code skeletons)
    - .planning/phases/07-importtb-ux-rework/07-RESEARCH.md (lines 940-946: Pitfall 1 — skipEmptyLines must be FALSE for raw row reading)
  </read_first>
  <behavior>
    - `parseCsvFile(file)` (1-arg call) returns IDENTICAL `ParsedCsv` as Phase 4 — existing tests in `csv.test.ts` GREEN
    - `parseCsvFile(file, { headerRowIndex: 4 })` skips first 4 rows and uses row 4 as the header; data rows = rows 5+
    - `parseCsvFile(file, { headerRowIndex: 0 })` matches default behavior (row 0 = header)
    - `parseCsvText(text, { headerRowIndex? })` mirrors the same widening
    - `parseCsvRaw(file)` returns `string[][]` — ALL rows including blanks; uses PapaParse with `header: false, skipEmptyLines: false`
    - `parseXlsxBuffer(buf)` (1-arg call) returns IDENTICAL `ParsedXlsx` as Phase 4 — existing xlsx.test.ts GREEN
    - `parseXlsxBuffer(buf, { headerRowIndex: 4 })` skips first 4 rows and uses row 4 as headers (uses the first sheet); data rows = rows 5+
    - `pickSheetByName(buf, name, { headerRowIndex? })` mirrors the widening
    - `getXlsxRawRows(buf, sheetName)` returns `string[][]` via SheetJS `header: 1, defval: '', raw: false`
    - 1 new test case in csv.test.ts: `'parseCsvFile with headerRowIndex: 4 returns Xero fixture data rows starting at row 5'`
    - 1 new test case in xlsx.test.ts: `'parseXlsxBuffer with headerRowIndex: 4 returns QBO fixture data rows starting at row 5'`
    - Existing Phase 4 csv + xlsx tests stay GREEN — backward compatibility is the headline.
  </behavior>
  <action>
    1. Modify `src/lib/import/csv.ts`. Keep `parseCsvFile(file)` and `parseCsvText(text)` 1-arg call sites unchanged (default behavior). Add `parseCsvRaw` and widen the two existing functions:

       ```typescript
       /* @license SPDX-License-Identifier: Apache-2.0 */
       import Papa from 'papaparse';
       import type { RawRow } from './fingerprint';

       export interface ParsedCsv {
         rows: RawRow[];
         headers: string[];
       }

       export interface CsvParseOptions {
         headerRowIndex?: number;
       }

       /** Read raw rows (no header inference, no empty-line skipping). Used by detectHeaderRow + detectSubtotals. */
       export function parseCsvRaw(file: File): Promise<string[][]> {
         return new Promise((resolve, reject) => {
           Papa.parse<string[]>(file, {
             header: false,
             skipEmptyLines: false,
             dynamicTyping: false,
             complete: (result) => resolve(result.data),
             error: (err: Error) => reject(err),
           });
         });
       }

       export function parseCsvRawText(text: string): string[][] {
         const result = Papa.parse<string[]>(text, {
           header: false,
           skipEmptyLines: false,
           dynamicTyping: false,
         });
         return result.data;
       }

       function buildParsedFromRaw(rawRows: string[][], headerRowIndex: number): ParsedCsv {
         const headerRow = rawRows[headerRowIndex] ?? [];
         const dataRows = rawRows.slice(headerRowIndex + 1);
         const headers = headerRow.map((h) => h.trim());
         const rows: RawRow[] = dataRows
           .filter((row) => row.some((c) => c.trim() !== ''))   // drop blank rows after header
           .map((row) => {
             const record: RawRow = {};
             headers.forEach((h, i) => { record[h] = row[i] ?? ''; });
             return record;
           });
         return { rows, headers };
       }

       export async function parseCsvFile(file: File, options?: CsvParseOptions): Promise<ParsedCsv> {
         if (options?.headerRowIndex === undefined) {
           // Phase 4 behavior — backward compatible.
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
               error: (err: Error) => reject(err),
             });
           });
         }
         const rawRows = await parseCsvRaw(file);
         return buildParsedFromRaw(rawRows, options.headerRowIndex);
       }

       export function parseCsvText(text: string, options?: CsvParseOptions): ParsedCsv {
         if (options?.headerRowIndex === undefined) {
           const result = Papa.parse<RawRow>(text, {
             header: true,
             skipEmptyLines: 'greedy',
             dynamicTyping: false,
             transformHeader: (h) => h.trim(),
           });
           return { rows: result.data, headers: result.meta.fields ?? [] };
         }
         const rawRows = parseCsvRawText(text);
         return buildParsedFromRaw(rawRows, options.headerRowIndex);
       }
       ```

    2. Modify `src/lib/import/xlsx.ts` similarly:

       ```typescript
       /* @license SPDX-License-Identifier: Apache-2.0 */
       import * as XLSX from 'xlsx';
       import type { RawRow } from './fingerprint';

       export interface ParsedXlsx {
         rows: RawRow[];
         headers: string[];
         sheetNames: string[];
       }
       export interface XlsxParseOptions {
         headerRowIndex?: number;
       }

       export async function parseXlsxFile(file: File, options?: XlsxParseOptions): Promise<ParsedXlsx> {
         const buf = await file.arrayBuffer();
         return parseXlsxBuffer(buf, options);
       }

       export function parseXlsxBuffer(buf: ArrayBuffer, options?: XlsxParseOptions): ParsedXlsx {
         const wb = XLSX.read(buf, { type: 'array' });
         const sheetNames = wb.SheetNames;
         const firstSheet = wb.Sheets[sheetNames[0]];
         if (!firstSheet) return { rows: [], headers: [], sheetNames };
         if (options?.headerRowIndex === undefined) {
           const rows = XLSX.utils.sheet_to_json<RawRow>(firstSheet, { defval: '', raw: false });
           const headers = Object.keys(rows[0] ?? {});
           return { rows, headers, sheetNames };
         }
         const raw = XLSX.utils.sheet_to_json<string[]>(firstSheet, {
           header: 1, defval: '', raw: false,
         });
         const { rows, headers } = buildFromRaw(raw, options.headerRowIndex);
         return { rows, headers, sheetNames };
       }

       export function pickSheetByName(
         buf: ArrayBuffer,
         sheetName: string,
         options?: XlsxParseOptions,
       ): { rows: RawRow[]; headers: string[] } {
         const wb = XLSX.read(buf, { type: 'array' });
         const sheet = wb.Sheets[sheetName];
         if (!sheet) throw new Error(`Sheet "${sheetName}" not found. Available: ${wb.SheetNames.join(', ')}`);
         if (options?.headerRowIndex === undefined) {
           const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '', raw: false });
           const headers = Object.keys(rows[0] ?? {});
           return { rows, headers };
         }
         const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '', raw: false });
         return buildFromRaw(raw, options.headerRowIndex);
       }

       export function getXlsxRawRows(buf: ArrayBuffer, sheetName: string): string[][] {
         const wb = XLSX.read(buf, { type: 'array' });
         const sheet = wb.Sheets[sheetName];
         if (!sheet) return [];
         return XLSX.utils.sheet_to_json<string[]>(sheet, {
           header: 1, defval: '', raw: false,
         });
       }

       function buildFromRaw(rawRows: string[][], headerRowIndex: number): { rows: RawRow[]; headers: string[] } {
         const headerRow = rawRows[headerRowIndex] ?? [];
         const dataRows = rawRows.slice(headerRowIndex + 1);
         const headers = headerRow.map((h) => String(h).trim());
         const rows: RawRow[] = dataRows
           .filter((row) => row.some((c) => String(c).trim() !== ''))
           .map((row) => {
             const record: RawRow = {};
             headers.forEach((h, i) => { record[h] = String(row[i] ?? ''); });
             return record;
           });
         return { rows, headers };
       }
       ```

    3. Append ONE new test to `src/lib/import/__tests__/csv.test.ts`:

       ```typescript
       it('parseCsvText with headerRowIndex: 4 parses Xero fixture data rows starting at row 5', () => {
         const fs = require('node:fs');
         const path = require('node:path');
         const csv = fs.readFileSync(
           path.resolve(__dirname, '../__fixtures__/messy-tbs/xero-tb.csv'),
           'utf8',
         );
         const { rows, headers } = parseCsvText(csv, { headerRowIndex: 4 });
         expect(headers).toContain('Account Code');
         expect(headers).toContain('Debit');
         expect(headers).toContain('Credit');
         // The Sales row (data row 0, file row 6) should map correctly:
         const sales = rows.find((r) => r['Account Code'] === '4100');
         expect(sales).toBeDefined();
         expect(sales?.['Credit']).toBe('50000.00');
       });
       ```

    4. Append ONE new test to `src/lib/import/__tests__/xlsx.test.ts`:

       ```typescript
       it('parseXlsxBuffer with headerRowIndex: 4 parses QBO fixture data rows starting at row 5', () => {
         const fs = require('node:fs');
         const path = require('node:path');
         const buf = fs.readFileSync(
           path.resolve(__dirname, '../__fixtures__/messy-tbs/quickbooks-tb.xlsx'),
         );
         // Node Buffer -> ArrayBuffer
         const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
         const { rows, headers } = parseXlsxBuffer(ab, { headerRowIndex: 4 });
         expect(headers).toContain('Account');
         expect(headers).toContain('Debit');
         expect(headers).toContain('Credit');
         // Sub-account row "  Bank Account" should be present
         const bank = rows.find((r) => (r['Account'] ?? '').includes('Bank Account'));
         expect(bank).toBeDefined();
       });
       ```

    5. Run `npx vitest run src/lib/import/__tests__/csv.test.ts src/lib/import/__tests__/xlsx.test.ts`. Verify all existing tests GREEN + 2 new GREEN.

    6. Run `npx vitest run`. Verify 0 fail, no regressions in any other suite.
  </action>
  <verify>
    <automated>npx vitest run src/lib/import/__tests__/csv.test.ts src/lib/import/__tests__/xlsx.test.ts --reporter=default 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "headerRowIndex" src/lib/import/csv.ts` returns ≥ 4 (param in signatures + default-behavior guard)
    - `grep -c "headerRowIndex" src/lib/import/xlsx.ts` returns ≥ 4
    - `grep -c "parseCsvRaw" src/lib/import/csv.ts` returns ≥ 2 (function defined and called)
    - `grep -c "getXlsxRawRows" src/lib/import/xlsx.ts` returns ≥ 1
    - `grep -nE "skipEmptyLines:\\s*false" src/lib/import/csv.ts` returns ≥ 1 match (raw reader preserves blank rows for section detection)
    - All existing tests in csv.test.ts + xlsx.test.ts stay GREEN — verified by `npx vitest run src/lib/import/__tests__/csv.test.ts src/lib/import/__tests__/xlsx.test.ts` exit 0
    - Two new tests GREEN (headerRowIndex on Xero CSV + QBO XLSX)
    - `npx vitest run --reporter=default 2>&1 | grep -E "failed"` shows no failures
    - Test count delta is positive (new tests added, none removed)
  </acceptance_criteria>
  <done>
    csv.ts + xlsx.ts widened additively with `headerRowIndex` option; `parseCsvRaw` + `getXlsxRawRows` shipped; Phase 4 backward-compat preserved (all original tests still GREEN); 2 new fixture-driven tests confirm the new path works against Xero CSV and QBO XLSX.
  </done>
</task>

</tasks>

<verification>
- `npx vitest run` exit 0
- `npx vitest run 2>&1 | grep -E "Tests +.+passed"` shows GREEN count ≥ original + ~50
- `grep -L "it.todo" src/lib/import/__tests__/{headerDetect,currencyParse,subtotalDetect,columnMerge}.test.ts` returns all 4 files (none contain todo anymore)
- `grep -nE "throw|TypeError" src/lib/import/currencyParse.ts` returns ZERO matches (parser never throws)
- `grep -nE "parseFloat|Number\\(.*[\"']" src/lib/import/currencyParse.ts` returns ZERO matches (decimal.js precision preservation)
- Phase 4 existing csv.test.ts + xlsx.test.ts tests all still GREEN
</verification>

<success_criteria>
1. Four pure-function modules implemented per RESEARCH algorithms with named tunable constants
2. parseCurrency never throws + preserves 16-digit decimal precision via string-only Decimal construction
3. detectHeaderRow auto-pick threshold = 0.60; below threshold returns null + top-3 candidates
4. detectSubtotals catches keyword AND sum-pattern; sum-pattern wins on coded rows; section boundary via blank or code-prefix change
5. detectSplitColumns handles QBO name-only export + Xero reversed column order; mergeColumns is additive
6. csv.ts + xlsx.ts widened with backward-compatible `headerRowIndex` option; existing Phase 4 tests GREEN
7. All 4 Plan 07-1 test files flipped RED → GREEN; ~50 new GREEN tests; existing 763 preserved
</success_criteria>

<output>
After completion, create `.planning/phases/07-importtb-ux-rework/07-2-SUMMARY.md` per the standard summary template.
</output>
