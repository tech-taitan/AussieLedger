---
phase: 07-importtb-ux-rework
verified: 2026-05-30T09:50:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
gaps: []
human_verification: []
---

# Phase 7: ImportTB UX Rework — Verification Report

**Phase Goal:** A user can upload a real-world unformatted TB CSV/XLSX from Xero/MYOB/QuickBooks/Excel and ImportTB correctly identifies headers, parses currency tolerantly, excludes subtotals, merges split account-code/name columns, and surfaces every dropped row with a fix-it path — without breaking the existing deterministic-clean-import flow.

**Verified:** 2026-05-30T09:50:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Messy fixture files exist and integration tests cover them | VERIFIED | 4 fixture files present in `src/lib/import/__fixtures__/messy-tbs/` (xero-tb.csv, myob-tb.csv, quickbooks-tb.xlsx, excel-hand-edited.csv); `ImportTB.test.tsx` has Phase 7 integration suite (IMP-07..11) + integration test reads xero-tb.csv directly |
| 2 | Header detection auto-suggests + user can override + multi-row merge | VERIFIED | `headerDetect.ts` exports `detectHeaderRow` (confidence scoring, AUTO_PICK_THRESHOLD=0.60, alternatives list) and `mergeHeaderRows`; `HeaderRowPicker.tsx` renders preview table with click-to-override (`onPick(i)`), low-confidence `header-manual-prompt`, and `header-multi-row-preview`; tests in `headerDetect.test.ts` + `HeaderRowPicker.test.tsx` |
| 3 | Currency parser covers all 7 ROADMAP forms with no parseFloat/Number() | VERIFIED | `currencyParse.ts` handles all 7 forms; `grep parseFloat\|Number(` returns only the docstring comment on line 8; `currencyParse.test.ts` has explicit test for each form including precision round-trip |
| 4 | Subtotal detector flags keyword AND sum-pattern rows; RejectedRowsPanel renders grouped with bulk action | VERIFIED | `subtotalDetect.ts` exports `detectSubtotals` with keyword (`SUBTOTAL_KEYWORD_RE`) + sum-pattern (±SUM_TOLERANCE_AUD=0.01) detection; section boundary = blank row OR code-prefix change; sum-pattern wins on coded rows (Xero 4999 pattern); `RejectedRowsPanel.tsx` renders grouped-by-reason with `include-all-subtotals` bulk action |
| 5 | Apply-to-similar with diff preview, cancel, and confirm | VERIFIED | `RejectedRowsPanel.tsx` has edit-in-place inputs per row; `Re-parse and include` button fires `onReparse`; `Apply to similar` uses `deriveRegexSignature` for same-reason + regex-signature matching; diff-preview renders with Cancel + Apply-confirm; `RejectedRowsPanel.test.tsx` covers all flows |
| 6 | Phase 4 clean-flow regression — no new UI noise, fingerprint guard intact | VERIFIED | `ImportTB.test.tsx` line 621: "REGRESSION: Phase 4 clean fixture imports cleanly through Phase 7 code path" confirms no `header-row-picker` on clean CSV, no `rejected-rows-banner`, onImport called once; fingerprint-collision test still present and passing |

**Score:** 6/6 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/import/__fixtures__/messy-tbs/xero-tb.csv` | Xero synthetic fixture | VERIFIED | Present, non-empty (title rows + header row 4 + subtotal rows) |
| `src/lib/import/__fixtures__/messy-tbs/myob-tb.csv` | MYOB synthetic fixture | VERIFIED | Present, non-empty (hyphenated codes, Total Assets sum-pattern) |
| `src/lib/import/__fixtures__/messy-tbs/quickbooks-tb.xlsx` | QBO XLSX fixture | VERIFIED | Present (binary XLSX; single sheet, name-only columns) |
| `src/lib/import/__fixtures__/messy-tbs/excel-hand-edited.csv` | Hand-edited Excel fixture | VERIFIED | Present ($ prefix, parentheses-negatives, "Debit ($)" column headers) |
| `src/lib/import/headerDetect.ts` | detectHeaderRow + mergeHeaderRows exports | VERIFIED | Exports `detectHeaderRow`, `mergeHeaderRows`, `AUTO_PICK_THRESHOLD`, `AU_TB_HEADER_KEYWORDS`; 157 lines, substantive implementation |
| `src/lib/import/currencyParse.ts` | parseCurrency — all 7 forms, no parseFloat | VERIFIED | 97 lines; handles all 7 ROADMAP currency forms; docstring-only mention of parseFloat/Number (no functional usage) |
| `src/lib/import/subtotalDetect.ts` | detectSubtotals — keyword + sum-pattern | VERIFIED | 167 lines; keyword RE + sum-pattern ±0.01; blank-row and code-prefix section boundaries |
| `src/lib/import/columnMerge.ts` | detectSplitColumns + mergeColumns + deriveRegexSignature | VERIFIED | 144 lines; all three exports present and substantive |
| `src/components/HeaderRowPicker.tsx` | Preview table + click-override + multi-row merge | VERIFIED | 124 lines; `data-testid="header-row-picker"` present; click-to-pick wired; multi-row preview renders when conditions met |
| `src/components/RejectedRowsPanel.tsx` | Grouped-by-reason + edit-in-place + apply-to-similar | VERIFIED | 257 lines; groups by reason with REASON_ORDER; edit-in-place inputs; apply-to-similar diff preview with cancel/confirm |
| `src/lib/import/__tests__/headerDetect.test.ts` | Unit tests for header detection | VERIFIED | 134 lines; 8 test cases covering Xero fixture, auto-pick, merge, threshold, disqualification |
| `src/lib/import/__tests__/currencyParse.test.ts` | Unit tests for all 7 forms | VERIFIED | 107 lines; 14 test cases covering all 7 ROADMAP forms + precision + EU rejection |
| `src/lib/import/__tests__/subtotalDetect.test.ts` | Unit tests for subtotal detection | VERIFIED | 216 lines; 12 test cases covering keyword, sum-pattern, section boundaries, MYOB hyphenated codes, tolerance |
| `src/components/__tests__/HeaderRowPicker.test.tsx` | Component tests for HeaderRowPicker | VERIFIED | 166 lines; 7 test cases including multi-row merge preview |
| `src/components/__tests__/RejectedRowsPanel.test.tsx` | Component tests for RejectedRowsPanel | VERIFIED | 217 lines; 9 test cases including apply-to-similar diff preview, cancel, low-confidence collapse |
| `src/components/__tests__/ImportTB.test.tsx` | Phase 7 + Phase 4 regression integration tests | VERIFIED | Phase 7 describe block (IMP-07..11, line 456); Phase 4 regression test at line 621 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ImportTB.tsx` | `headerDetect.ts` | `import { detectHeaderRow }` line 28 + called at lines 123, 141, 180 | WIRED | detectHeaderRow called on every CSV/XLSX parse path |
| `ImportTB.tsx` | `currencyParse.ts` | `import { parseCurrency }` line 29 + called at lines 271, 272, 392, 393, 417, 418 | WIRED | parseCurrency called on debit/credit columns and on re-parse |
| `ImportTB.tsx` | `subtotalDetect.ts` | `import { detectSubtotals }` line 30 + called at line 345 | WIRED | detectSubtotals called after column mapping confirmed |
| `ImportTB.tsx` | `columnMerge.ts` | `import { detectSplitColumns, mergeColumns, deriveRegexSignature }` line 31 + called at line 223 | WIRED | detectSplitColumns called in column-mapping step |
| `ImportTB.tsx` | `HeaderRowPicker` | `import { HeaderRowPicker }` line 35 + rendered at line 704 | WIRED | Rendered when `isPickingHeader` state is true |
| `ImportTB.tsx` → `ImportReviewPane.tsx` | `RejectedRowsPanel` | `ImportReviewPane` imports and renders `RejectedRowsPanel` at lines 9-10 and 259; `ImportTB` passes `rejectedRows` prop to `ImportReviewPane` | WIRED | Panel rendered inside ImportReviewPane when rejectedRows non-empty |
| `RejectedRowsPanel.tsx` | `columnMerge.ts` (deriveRegexSignature) | `import { deriveRegexSignature }` line 8 + used at line 96 | WIRED | Signature derived for apply-to-similar matching |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| IMP-07 | 07-2-PLAN, 07-3-PLAN | Header row auto-detection with confidence; user override; multi-row merge | SATISFIED | `detectHeaderRow` + `mergeHeaderRows` in `headerDetect.ts`; `HeaderRowPicker.tsx`; integration test in `ImportTB.test.tsx` line 457, 477; marked Complete in REQUIREMENTS.md |
| IMP-08 | 07-2-PLAN | Tolerant currency parser — $, AUD, parens-negative, thousands, whitespace, decimal.js precision | SATISFIED | `parseCurrency` in `currencyParse.ts`; 14-test suite; no parseFloat/Number in implementation; marked Complete |
| IMP-09 | 07-2-PLAN, 07-3-PLAN | Subtotal detection + exclusion by default + Rejected Rows panel | SATISFIED | `detectSubtotals` in `subtotalDetect.ts`; `RejectedRowsPanel.tsx`; integration test line 547; marked Complete |
| IMP-10 | 07-2-PLAN, 07-3-PLAN | Split column detection + merge + missing-code picker | SATISFIED | `detectSplitColumns` + `mergeColumns` in `columnMerge.ts`; integration test line 585; marked Complete |
| IMP-11 | 07-3-PLAN | Rejected rows panel — reason display, inline edit, re-parse, apply-to-similar with diff preview | SATISFIED | `RejectedRowsPanel.tsx` — all features implemented; 9-test suite; marked Complete |

**REQUIREMENTS.md tracker:** All 5 requirements (IMP-07..IMP-11) marked `[x] Complete (07-3)` at Phase 7 row in requirements table.

---

## Anti-Patterns Found

None detected in the Phase 7 new files. Scanned:
- `src/lib/import/headerDetect.ts` — no TODO/FIXME, no empty returns, no console.log
- `src/lib/import/currencyParse.ts` — no TODO/FIXME, no empty returns, no parseFloat/Number functional usage
- `src/lib/import/subtotalDetect.ts` — no TODO/FIXME, no empty returns
- `src/lib/import/columnMerge.ts` — no TODO/FIXME, no empty returns
- `src/components/HeaderRowPicker.tsx` — no TODO/FIXME; renders real preview table with real data
- `src/components/RejectedRowsPanel.tsx` — no TODO/FIXME; edit-in-place, apply-to-similar, diff-preview all implemented

---

## Automated Gate Results

| Check | Result | Detail |
|-------|--------|--------|
| `npx vitest run --reporter=dot` | PASS | 848 passed, 11 todo, 0 failed (98 test files) |
| `npm run lint` (tsc --noEmit) | PASS | EXIT 0 — no type errors |
| `npm run build` | PASS | EXIT 0 — expected chunk-size warning, not an error |
| `git diff -- src/storage/adapter.ts src/storage/local.ts src/storage/server.ts src/types.ts` | PASS | Empty diff — StorageAdapter interface unchanged (Phase 3 FINAL invariant) |
| `git diff -- src/lib/import/match.ts src/lib/import/fingerprint.ts` | PASS | Empty diff — Phase 4 reusables unchanged |
| `grep parseFloat\|Number( src/lib/import/currencyParse.ts` | PASS | Only docstring line 8 — no functional parseFloat/Number usage |
| `grep new Date() src/lib/import/ + HeaderRowPicker + RejectedRowsPanel` | PASS | No matches — no `new Date()` outside `src/lib/period.ts` |
| `grep IS_AI_ENABLED in Phase 7 new files` | PASS | No matches — AI gating uses `isAiEnabled()` function only |

---

## Human Verification Required

None required. All success criteria were verifiable programmatically:
- Fixture files: existence confirmed by glob
- Library functions: exports confirmed by read + grep
- Test coverage: confirmed by running vitest (848 GREEN, 0 RED)
- Critical constraint (no parseFloat): confirmed by grep returning only docstring
- Regression: confirmed by test at line 621 of ImportTB.test.tsx
- Build integrity: confirmed by lint EXIT 0 + build EXIT 0
- Architecture invariants: confirmed by empty git diffs

Manual UAT (42 steps across all 4 fixtures) was conducted 2026-05-30 and documented in `07-UAT.md` with status `approved`.

---

## Summary

Phase 7 goal fully achieved. All 6 observable truths verified. All 16 required artifacts exist, are substantive (non-stub), and are wired. All 5 requirements (IMP-07..11) are marked Complete in REQUIREMENTS.md and have implementation evidence. The Phase 4 deterministic-import regression test is present and passing. Automated gates: 848 GREEN, lint EXIT 0, build EXIT 0, all architecture invariants preserved.

---

_Verified: 2026-05-30T09:50:00Z_
_Verifier: Claude (gsd-verifier)_
