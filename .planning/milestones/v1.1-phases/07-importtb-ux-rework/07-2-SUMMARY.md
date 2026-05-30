---
phase: 07-importtb-ux-rework
plan: 2
subsystem: pure-function-heuristic-modules
tags:
  - wave-2-implementations
  - currency-parser
  - header-detect
  - subtotal-detect
  - column-merge
  - csv-widening
  - xlsx-widening
  - imp-07
  - imp-08
  - imp-09
  - imp-10
  - imp-11
dependency_graph:
  requires:
    - wave-0-stub-modules-from-plan-07-1
    - it.todo-contracts-from-plan-07-1
    - messy-tb-fixtures-from-plan-07-1
  provides:
    - currencyParse-implementation
    - headerDetect-implementation
    - subtotalDetect-implementation
    - columnMerge-implementation
    - csv-widened-with-headerRowIndex
    - xlsx-widened-with-headerRowIndex
    - parseCsvRaw-helper
    - getXlsxRawRows-helper
    - 52-new-GREEN-tests
  affects:
    - src/lib/import/currencyParse.ts (implemented)
    - src/lib/import/headerDetect.ts (implemented)
    - src/lib/import/subtotalDetect.ts (implemented)
    - src/lib/import/columnMerge.ts (implemented)
    - src/lib/import/csv.ts (widened)
    - src/lib/import/xlsx.ts (widened)
    - src/lib/import/__tests__/currencyParse.test.ts (15 it.todo → GREEN)
    - src/lib/import/__tests__/headerDetect.test.ts (8 it.todo → GREEN + 1 extra)
    - src/lib/import/__tests__/subtotalDetect.test.ts (13 it.todo → GREEN + 1 extra)
    - src/lib/import/__tests__/columnMerge.test.ts (11 it.todo → GREEN + 1 extra)
    - src/lib/import/__tests__/csv.test.ts (1 new test)
    - src/lib/import/__tests__/xlsx.test.ts (1 new test)
tech_stack:
  added: []
  patterns:
    - "Pure-function heuristics with named tunable constants (AUTO_PICK_THRESHOLD, SUM_TOLERANCE_AUD, MISSING_CODE_THRESHOLD)"
    - "String-only Decimal construction — never parseFloat/Number — for precision preservation"
    - "Negative-lookbehind in regex pipeline to avoid step-N output corrupting step-N+1"
    - "carry-forward merge for multi-row Xero headers (last non-empty rowA value prefixes empty-rowA cells)"
    - "new Uint8Array(nodeBuf).buffer for safe Node Buffer→ArrayBuffer conversion in tests"
key_files:
  created: []
  modified:
    - src/lib/import/currencyParse.ts
    - src/lib/import/headerDetect.ts
    - src/lib/import/subtotalDetect.ts
    - src/lib/import/columnMerge.ts
    - src/lib/import/csv.ts
    - src/lib/import/xlsx.ts
    - src/lib/import/__tests__/currencyParse.test.ts
    - src/lib/import/__tests__/headerDetect.test.ts
    - src/lib/import/__tests__/subtotalDetect.test.ts
    - src/lib/import/__tests__/columnMerge.test.ts
    - src/lib/import/__tests__/csv.test.ts
    - src/lib/import/__tests__/xlsx.test.ts
decisions:
  - "mergeHeaderRows uses carry-forward: when rowA[i] is empty but rowB[i] is non-empty, use last non-empty rowA value as prefix — required for Xero 'Account / Code' / 'Account / Name' composite headers where 'Account' appears once but spans two sub-columns"
  - "deriveRegexSignature uses (?<!\\\\) negative lookbehind in step 3 to avoid generalising the 'd' in '\\d+' that step 2 just inserted — the RESEARCH.md skeleton was silently wrong on this"
  - "detectSplitColumns both-unmatched path: when neither CODE_HEADER_RE nor NAME_HEADER_RE match any header, fall back to pure value-shape heuristic on all non-numeric columns — needed for test fixtures with opaque column names"
  - "new Uint8Array(nodeBuf).buffer used in xlsx test instead of buf.buffer.slice() — Node Buffer.buffer is a shared pool allocation; slice with byteOffset can return wrong data in certain Node versions / vitest jsdom environments"
  - "parseCsvRaw and parseCsvRawText added as separate exports — parseCsvRaw is async (File input) for browser use, parseCsvRawText is sync (string input) for test/subtotal detection use"
metrics:
  duration: "~16 minutes"
  completed_date: "2026-05-30"
  tasks_completed: 3
  tasks_total: 3
  files_created: 0
  files_modified: 12
  tests_green: 821
  tests_todo: 28
  tests_failed: 0
  tests_delta: "+52 GREEN (from 769 baseline)"
---

# Phase 7 Plan 2: Pure-Function Heuristic Modules + CSV/XLSX Widening

**One-liner:** Four pure-function import heuristics implemented (currencyParse/headerDetect/subtotalDetect/columnMerge) with string-only Decimal precision; csv.ts + xlsx.ts additively widened with optional headerRowIndex; all 47 it.todo() stubs flipped to GREEN plus 5 new fixture-driven tests.

---

## Objective

Replace the four Wave 0 stub modules with full implementations per the 07-RESEARCH.md algorithm specs, and widen the Phase 4 csv/xlsx parsers with an optional `headerRowIndex` parameter so the upcoming UI layer (Plan 07-3) can designate any row as the header without breaking existing clean-import callers.

---

## Tasks Completed

### Task 1: Implement currencyParse.ts + flip currencyParse.test.ts GREEN

**Commit:** b2142b2

**What was done:**
- Replaced stub `parseCurrency` with full implementation per RESEARCH §2 algorithm
- Step ordering: empty check → parens-negative → currency-marker strip → leading-minus → EU-format detect → AU-numeric validate → thousands-strip → Decimal construction
- EU format detection (`/^\d{1,3}(\.\d{3})+(,\d+)?$/`) applied BEFORE AU validation path
- Parens-negative detected BEFORE currency-marker stripping (avoids EU regex false-positives)
- Ambiguity flag: comma-but-no-period → `confidence: 'low'` + reason matching `/ambiguous/`
- Empty/whitespace → `new Decimal('0')`, high confidence
- Defensive `try/catch` around Decimal construction (never propagates — just returns unparseable)
- All 15 `it.todo()` stubs converted to real tests, all GREEN
- Zero `parseFloat` or `Number()` calls (verified via grep)
- 3 uses of `new Decimal()` (constructed from cleaned strings only)

**Verification:** 15/15 tests GREEN. 0 parseFloat/Number matches.

### Task 2: Implement headerDetect.ts + subtotalDetect.ts + columnMerge.ts; flip 3 test files GREEN

**Commit:** cdd2951

**What was done:**

**headerDetect.ts:**
- Score formula: `stringDensity × 0.4 + (keywordHits/TOTAL) × 0.6`
- `MIN_HEADER_COLS = 3` disqualifies section headings with < 3 non-empty cells (Pitfall 5)
- Confidence = relative score gap: `(topScore - secondScore) / topScore`
- `AUTO_PICK_THRESHOLD = 0.60` exported; `autoPickRow = null` when confidence below threshold
- `mergeHeaderRows` carry-forward: when `rowA[i]` is empty but `rowB[i]` has content, prefix with last non-empty `rowA` value — required for Xero `"Account / Code"` / `"Account / Name"` patterns
- `AU_TB_HEADER_KEYWORDS` includes 15 terms covering Xero/MYOB/QBO/generic AU TB headers

**subtotalDetect.ts:**
- `SUBTOTAL_KEYWORD_RE` matches `total`, `sum`, `net`, `grand total`, `subtotal`, `sub-total`, `gst collected`, `trial balance total`, `net assets`, `net profit`, `net loss`
- Section boundary via blank row OR code-prefix change; MYOB `"1-1100"` correctly extracts prefix `"1"` (splits on `-`, takes first char)
- Sum-pattern: debit or credit ≈ sum of preceding rows in same section, within `SUM_TOLERANCE_AUD = '0.01'`
- Sum-pattern wins on coded rows (no code-presence filter)
- `reason: 'keyword+sum-pattern'` when both signals hit the same row

**columnMerge.ts:**
- `CODE_HEADER_RE` + `NAME_HEADER_RE` for header-name detection
- Three fallback cases: name-matched-not-code, code-matched-not-name, neither-matched (uses pure value-shape heuristic on non-numeric columns)
- `isCodeLike`: > 70% of non-empty cells match `/^[\w-]{2,8}$/`
- `isNameLike`: average non-empty cell length > 8 characters
- `mergeColumns`: additive — adds `__merged_code_name`, preserves original columns
- `deriveRegexSignature`: uses `(?<!\\)` negative lookbehind in step 3 to avoid corrupting `\d+` output from step 2

**Tests flipped:** 8 headerDetect + 13 subtotalDetect + 11 columnMerge = 32 stubs, plus 3 extras added = 35 tests total, all GREEN.

**Verification:** 35/35 tests GREEN across 3 files. Full suite up from 769 to 819 GREEN.

### Task 3: Widen csv.ts + xlsx.ts with headerRowIndex param; add parseCsvRaw + getXlsxRawRows

**Commit:** 4b81fac

**What was done:**

**csv.ts:**
- Added `parseCsvRaw(file: File): Promise<string[][]>` — async, `header: false`, `skipEmptyLines: false` (preserves blank rows for section detection)
- Added `parseCsvRawText(text: string): string[][]` — synchronous variant for tests
- Widened `parseCsvFile` and `parseCsvText` with optional `CsvParseOptions { headerRowIndex? }`
- Default path (no options) identical to Phase 4 — `skipEmptyLines: 'greedy'`, `header: true`
- `headerRowIndex` path: calls `parseCsvRaw` then `buildParsedFromRaw` (skip pre-header rows, blank-row filter on data rows)

**xlsx.ts:**
- Added `getXlsxRawRows(buf, sheetName): string[][]` — SheetJS `header: 1, defval: '', raw: false`
- Widened `parseXlsxBuffer`, `pickSheetByName`, and `parseXlsxFile` with `XlsxParseOptions { headerRowIndex? }`
- Default path (no options) identical to Phase 4

**New tests:**
- `csv.test.ts`: `parseCsvText(csv, { headerRowIndex: 4 })` on Xero fixture — verifies `Account Code` header and `Sales` row credit value `'50000.00'`
- `xlsx.test.ts`: `parseXlsxBuffer(ab, { headerRowIndex: 4 })` on QBO fixture — verifies `Account`, `Debit`, `Credit` headers and `Bank Account` row presence

**Verification:** All 4 original csv/xlsx Phase 4 tests still GREEN. Both new tests GREEN. Full suite 821 GREEN.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] mergeHeaderRows carry-forward for Xero multi-row headers**

- **Found during:** Task 2 — first test run
- **Issue:** RESEARCH.md algorithm and PLAN skeleton both showed simple `a || b` fallback when `rowA[i]` is empty. This returns just `'Name'` for Xero's sub-column position where `rowA[1]=''` and `rowB[1]='Name'`. But the PLAN behavior spec and RESEARCH.md example both expect `'Account / Name'` — meaning when rowA is empty at position i, carry forward the last non-empty rowA value as a prefix.
- **Fix:** Added `lastRowAValue` tracking in `mergeHeaderRows` loop; when `a` is empty and `b` is non-empty, output `lastRowAValue ? "${lastRowAValue} / ${b}" : b`
- **Files modified:** `src/lib/import/headerDetect.ts`
- **Commit:** cdd2951

**2. [Rule 1 - Bug] deriveRegexSignature step-3 corrupted \d+ from step 2**

- **Found during:** Task 2 — first test run
- **Issue:** The RESEARCH.md skeleton's step 3 (`/[a-zA-Z]+/g`) matched the `d` in `\d+` that step 2 had just inserted. `'$1.50'` → `'\$1\.50'` → `'\$\d+\.\d+'` → `'\$\[A-Za-z]++\.\[A-Za-z]++'`. Result was garbled.
- **Fix:** Changed step 3 to `/(?<!\\)[a-zA-Z]+/g` (negative lookbehind: don't match letters preceded by a backslash)
- **Files modified:** `src/lib/import/columnMerge.ts`
- **Commit:** cdd2951

**3. [Rule 2 - Missing] detectSplitColumns both-unmatched fallback**

- **Found during:** Task 2 — first test run; the "value-shape heuristic when headers ambiguous" test used `['Col A', 'Col B', 'Debit', 'Credit']` as headers — neither CODE_HEADER_RE nor NAME_HEADER_RE matched.
- **Issue:** The PLAN skeleton only handled "one matched, one didn't" cases. When NEITHER header matched, the function returned `hasSplitColumns: false` without even trying the value-shape heuristic.
- **Fix:** Added a third branch for `!codeCol && !nameCol`: filter to non-numeric headers, then scan for isCodeLike, then for isNameLike.
- **Files modified:** `src/lib/import/columnMerge.ts`
- **Commit:** cdd2951

**4. [Rule 3 - Blocking] Safe Node Buffer→ArrayBuffer conversion in xlsx test**

- **Found during:** Task 3 — xlsx test returned XML content in headers instead of `['Account', 'Debit', 'Credit']`
- **Issue:** `buf.buffer.slice(buf.byteOffset, ...)` works when `byteOffset === 0`, but in some Node/vitest environments the Buffer's backing ArrayBuffer is a large shared pool allocation with a non-zero byteOffset. The slice returns the wrong data.
- **Fix:** Changed to `new Uint8Array(fileBuf).buffer` which creates a fresh ArrayBuffer copy regardless of the original buffer's offset.
- **Files modified:** `src/lib/import/__tests__/xlsx.test.ts`
- **Commit:** 4b81fac

---

## Self-Check

Files verified to exist:

- `src/lib/import/currencyParse.ts` — exists with `parseCurrency` + `ParseResult` exports
- `src/lib/import/headerDetect.ts` — exists with `detectHeaderRow`, `mergeHeaderRows`, `AUTO_PICK_THRESHOLD`, `AU_TB_HEADER_KEYWORDS`
- `src/lib/import/subtotalDetect.ts` — exists with `detectSubtotals`, `SUM_TOLERANCE_AUD`, `SUBTOTAL_KEYWORD_RE`
- `src/lib/import/columnMerge.ts` — exists with `detectSplitColumns`, `mergeColumns`, `deriveRegexSignature`, `MISSING_CODE_THRESHOLD`
- `src/lib/import/csv.ts` — widened with `CsvParseOptions`, `parseCsvRaw`, `parseCsvRawText`
- `src/lib/import/xlsx.ts` — widened with `XlsxParseOptions`, `getXlsxRawRows`

Commits verified:
- b2142b2 — Task 1 (currencyParse)
- cdd2951 — Task 2 (headerDetect + subtotalDetect + columnMerge)
- 4b81fac — Task 3 (csv + xlsx widening)

Acceptance criteria:
- `grep -nE "parseFloat|Number\\(" src/lib/import/currencyParse.ts` → zero code matches (only in comment)
- `grep -c "new Decimal" src/lib/import/currencyParse.ts` → 3 (≥ 2 required)
- `grep -c "AUTO_PICK_THRESHOLD = 0.60" src/lib/import/headerDetect.ts` → 1
- `grep -c "SUM_TOLERANCE_AUD = '0.01'" src/lib/import/subtotalDetect.ts` → 1
- `grep -c "MISSING_CODE_THRESHOLD = 0.5" src/lib/import/columnMerge.ts` → 1
- `grep -c "headerRowIndex" src/lib/import/csv.ts` → 13 (≥ 4 required)
- `grep -c "headerRowIndex" src/lib/import/xlsx.ts` → 13 (≥ 4 required)
- `grep -nE "skipEmptyLines:\\s*false" src/lib/import/csv.ts` → 2 matches
- Full suite: 821 passed, 28 todo, 0 failed (baseline was 769 passed, 75 todo)

## Self-Check: PASSED
