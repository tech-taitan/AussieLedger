---
phase: 07-importtb-ux-rework
plan: 1
subsystem: wave-0-test-scaffold-and-fixtures
tags:
  - wave-0-scaffold
  - test-stubs
  - fixtures
  - headerDetect-stub
  - currencyParse-stub
  - subtotalDetect-stub
  - columnMerge-stub
  - imp-07
  - imp-08
  - imp-09
  - imp-10
  - imp-11
dependency_graph:
  requires:
    - vitest-2.1.9-already-configured
    - xlsx-sheetjs-already-in-package-json
    - decimal.js-already-in-package-json
  provides:
    - headerDetect-stub-module
    - currencyParse-stub-module
    - subtotalDetect-stub-module
    - columnMerge-stub-module
    - HeaderRowPicker-stub-component
    - RejectedRowsPanel-stub-component
    - xero-tb-csv-fixture
    - myob-tb-csv-fixture
    - quickbooks-tb-xlsx-fixture
    - excel-hand-edited-csv-fixture
    - build-qbo-fixture-script
    - 64-it.todo-stubs-covering-IMP-07-through-IMP-11
  affects:
    - src/lib/import/headerDetect.ts (created as stub)
    - src/lib/import/currencyParse.ts (created as stub)
    - src/lib/import/subtotalDetect.ts (created as stub)
    - src/lib/import/columnMerge.ts (created as stub)
    - src/components/HeaderRowPicker.tsx (created as stub)
    - src/components/RejectedRowsPanel.tsx (created as stub)
    - src/lib/import/__tests__/headerDetect.test.ts (created)
    - src/lib/import/__tests__/currencyParse.test.ts (created)
    - src/lib/import/__tests__/subtotalDetect.test.ts (created)
    - src/lib/import/__tests__/columnMerge.test.ts (created)
    - src/components/__tests__/HeaderRowPicker.test.tsx (created)
    - src/components/__tests__/RejectedRowsPanel.test.tsx (created)
    - src/lib/import/__fixtures__/messy-tbs/ (created directory + 4 files)
    - scripts/build-qbo-fixture.cjs (created)
tech_stack:
  added: []
  patterns:
    - "Wave 0 scaffold-first: stub production modules created alongside it.todo() test stubs so Vite resolves imports without error — Plan 07-2/07-3 replace stub bodies with real implementations"
    - "Fixture-driven contract: messy-TB CSV/XLSX fixtures with known-sum amounts (e.g. xero 4999=55000, myob Total Assets=30500) give subtotal sum-pattern tests concrete numeric expectations"
    - "SheetJS XLSX fixture generated via idempotent Node script (scripts/build-qbo-fixture.cjs) — binary committed alongside generator for reproducibility"
key_files:
  created:
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
    - src/lib/import/headerDetect.ts
    - src/lib/import/currencyParse.ts
    - src/lib/import/subtotalDetect.ts
    - src/lib/import/columnMerge.ts
    - src/components/HeaderRowPicker.tsx
    - src/components/RejectedRowsPanel.tsx
    - scripts/build-qbo-fixture.cjs
  modified: []
decisions:
  - "Created real stub modules (not @ts-expect-error pattern): Vite module-resolution fails at bundle time for missing imports regardless of TypeScript @ts-expect-error directives. Solution: stub modules with proper type signatures + throw-not-implemented bodies. Tests remain all it.todo() so stubs are never called."
  - "xero-tb.csv uses 'Account,Account Code' column order (name first, then code) matching the research-documented Xero reversed-column shape — critical for column-merge tests to have the right fixture"
  - "MYOB fixture has blank row at index 9 as the section boundary between Assets (1-prefix) and Income (4-prefix) — concrete input for subtotal section-boundary tests"
  - "Excel fixture uses $(N,NNN.NN) parentheses-negative pattern in Credit column for Sales Revenue row — only plausible occurrence in a TB (revenue is a credit)"
metrics:
  duration: "~20 minutes"
  completed_date: "2026-05-30"
  tasks_completed: 1
  tasks_total: 1
  files_created: 17
  files_modified: 0
  tests_green: 769
  tests_todo: 75
  tests_failed: 0
---

# Phase 7 Plan 1: Wave 0 Scaffold — Test Stubs + Fixtures + Stub Modules

**One-liner:** Wave 0 scaffold with 64 it.todo() stubs covering IMP-07/08/09/10/11, four structurally-faithful messy-TB fixtures (Xero/MYOB/QBO/Excel), and stub production modules so Vite resolves imports without error.

---

## Objective

Create the Wave 0 test contract for Phase 7 ImportTB UX Rework. Six new test files with `it.todo()` stubs name every behavior from 07-VALIDATION.md, committing the API contract before any implementation. Four messy-TB fixture files (CSV + XLSX) provide concrete structurally-faithful data with known-sum amounts for future sum-pattern detection tests.

---

## Tasks Completed

### Task 1: Four pure-function test stubs + 4 messy-TB fixtures + stub modules

**Commit:** 9193931

**What was done:**
- Created `src/lib/import/__fixtures__/messy-tbs/` directory
- Created 4 fixture files:
  - `xero-tb.csv` — 3 title rows + blank + header at row 5 (0-based 4); name-before-code Xero column order; synthetic-coded subtotals (4999/5999); known sums: 50000+5000=55000 (Total Revenue), 12000+3000=15000 (Total Op. Expenses)
  - `myob-tb.csv` — hyphenated codes (1-1100 format); blank-row section boundary at row 9; Total Assets=30500 sum (25000+500+5000)
  - `excel-hand-edited.csv` — $ prefix + thousands separators + parentheses-negatives ($(50,000.00)); blank code on subtotal rows
  - `quickbooks-tb.xlsx` — name-only column (no code); leading-whitespace sub-accounts; generated via scripts/build-qbo-fixture.cjs
- Created `scripts/build-qbo-fixture.cjs` — idempotent SheetJS script to regenerate the XLSX
- Created 4 lib test stubs (47 it.todo() cases total):
  - `headerDetect.test.ts` — 8 stubs (IMP-07 pure-function cases)
  - `currencyParse.test.ts` — 15 stubs (IMP-08 all 7 currency forms + ambiguity + precision)
  - `subtotalDetect.test.ts` — 13 stubs (IMP-09 keyword + sum-pattern + section-boundary)
  - `columnMerge.test.ts` — 11 stubs (IMP-10/11 split-detect + merge + regex-signature)
- Created 2 component test stubs (17 it.todo() cases total):
  - `HeaderRowPicker.test.tsx` — 7 stubs (IMP-07 UI cases)
  - `RejectedRowsPanel.test.tsx` — 10 stubs (IMP-09 + IMP-11 UI cases)
- Created 4 stub production modules + 2 stub components so Vite resolves imports:
  - `src/lib/import/headerDetect.ts` — typed stub with AUTO_PICK_THRESHOLD = 0.60
  - `src/lib/import/currencyParse.ts` — typed stub with ParseResult interface
  - `src/lib/import/subtotalDetect.ts` — typed stub with SUM_TOLERANCE_AUD = "0.01"
  - `src/lib/import/columnMerge.ts` — typed stub with MISSING_CODE_THRESHOLD = 0.5
  - `src/components/HeaderRowPicker.tsx` — typed stub component
  - `src/components/RejectedRowsPanel.tsx` — typed stub component with RejectedRow types

**Verification:**
- `npx vitest run src/lib/import/__tests__/` → 47 todo, 0 fail
- `npx vitest run src/components/__tests__/HeaderRowPicker.test.tsx src/components/__tests__/RejectedRowsPanel.test.tsx` → 17 todo, 0 fail
- `npx vitest run` → 769 passed, 75 todo, 0 failed

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Used stub modules instead of @ts-expect-error pattern**

- **Found during:** Task 1 — running `npx vitest run` after writing test stubs with `@ts-expect-error` on the import lines
- **Issue:** Vite resolves module imports at bundle/transform time, not at TypeScript type-check time. `@ts-expect-error` suppresses TypeScript compiler errors only; it does nothing for Vite's runtime module resolution. When the imported modules don't exist, Vite throws `Failed to resolve import "../headerDetect"` and the entire test suite errors — no tests run at all.
- **Fix:** Created minimal stub production modules (`headerDetect.ts`, `currencyParse.ts`, `subtotalDetect.ts`, `columnMerge.ts`) and stub components (`HeaderRowPicker.tsx`, `RejectedRowsPanel.tsx`) that export the correct TypeScript types + throw-not-implemented errors in function bodies. Since all test cases are `it.todo()`, the stubs are never actually called.
- **Files created:** 4 lib stubs + 2 component stubs (see task details above)
- **Impact:** The stub modules will be replaced by real implementations in Plans 07-2 and 07-3. They add zero production behavior.
- **Commit:** 9193931

---

## Self-Check: PASSED

Files verified to exist:
- src/lib/import/__fixtures__/messy-tbs/xero-tb.csv — FOUND
- src/lib/import/__fixtures__/messy-tbs/myob-tb.csv — FOUND
- src/lib/import/__fixtures__/messy-tbs/quickbooks-tb.xlsx — FOUND
- src/lib/import/__fixtures__/messy-tbs/excel-hand-edited.csv — FOUND
- src/lib/import/__tests__/headerDetect.test.ts — FOUND
- src/lib/import/__tests__/currencyParse.test.ts — FOUND
- src/lib/import/__tests__/subtotalDetect.test.ts — FOUND
- src/lib/import/__tests__/columnMerge.test.ts — FOUND
- src/components/__tests__/HeaderRowPicker.test.tsx — FOUND
- src/components/__tests__/RejectedRowsPanel.test.tsx — FOUND
- scripts/build-qbo-fixture.cjs — FOUND

Commit 9193931 verified in git log.

it.todo counts:
- currencyParse: 15 (≥ 15 required — PASS)
- headerDetect: 8 (≥ 7 required — PASS)
- subtotalDetect: 13 (≥ 13 required — PASS)
- columnMerge: 11 (≥ 11 required — PASS)
- HeaderRowPicker: 7 (≥ 7 required — PASS)
- RejectedRowsPanel: 10 (≥ 10 required — PASS)

Full suite: 769 passed, 75 todo, 0 failed.
