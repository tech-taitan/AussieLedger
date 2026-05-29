---
phase: 07-importtb-ux-rework
plan: 4
type: uat-log
status: approved
created: "2026-05-30"
approved_date: "2026-05-30"
approver: user
---

# Phase 7 UAT Log — ImportTB UX Rework

**UAT Protocol:** 42 steps across 5 fixture scenarios  
**Result:** ALL PASSED  
**Signed off:** 2026-05-30

---

## Pre-UAT Automated Checks

| Check | Result | Detail |
|-------|--------|--------|
| `npx vitest run` (full SPA suite) | PASS | 848 passed, 11 todo, 0 failed |
| `npm run test:server` | PASS | 18 passed, 0 failed |
| `npm run lint` | PASS | EXIT 0 |
| `npm run build` | PASS | EXIT 0 (expected chunk-size warning, not an error) |
| All 4 fixture files present | PASS | xero-tb.csv, myob-tb.csv, quickbooks-tb.xlsx, excel-hand-edited.csv |

---

## Per-Fixture UAT Results

| Fixture | Steps | Result | Notes |
|---------|-------|--------|-------|
| Xero TB (xero-tb.csv) | 1–8 | PASS | Auto-pick at row 5 high-confidence; subtotal rows (Total Revenue, Total Op.Exp., bottom Total) correctly detected and surfaced in rejected-rows panel; "Include all subtotals" moves all 3 to accepted; Reject all returns to upload |
| MYOB TB (myob-tb.csv) | 9–15 | PASS | Header auto-picked at row 5; hyphenated codes (1-1100, etc.) appear unchanged in review pane; "Total Assets" in rejected as subtotal (sum-pattern match 25000+500+5000=30500); no false positives on 4-xxxx accounts; Reject all works |
| QuickBooks TB (quickbooks-tb.xlsx) | 16–25 | PASS | Single-sheet XLSX — XlsxSheetPicker did not show; header row 5 auto-picked or manually selected; missing-code-picker rendered with auto-assign + name-only buttons; "Import name-only" path advances to review pane correctly; Total ASSETS / Total REVENUE / TOTAL in rejected as subtotals |
| Hand-edited Excel TB (excel-hand-edited.csv) | 26–33 | PASS | Header at row 5 confirmed; "Debit ($)"/"Credit ($)" regex match confirmed; tolerant-parse banner shows N >= 4 for $25,000.00 cells; $(50,000.00) parsed as -50000; "Total Current Assets" and "Total Revenue" in rejected; edit-in-place + Re-parse-and-include moves row to accepted; Apply-to-similar diff preview renders, Cancel leaves rows unchanged, Apply confirm moves rows to accepted |
| Phase 4 regression (clean CSV) | 34–42 | PASS | HeaderRowPicker did NOT show on clean row-0 header; column mapping auto-filled; no tolerant-parse banner, no low-confidence badge, no rejected-rows banner; Accept import posted single JournalEntry with correct totals; re-upload triggered fingerprint-collision-dialog (IMP-05 preserved); Skip dismissed dialog without duplicate post |

---

## Per-Requirement Sign-Off

| Requirement | Description | Result | Evidence |
|-------------|-------------|--------|----------|
| IMP-07 | Auto-detect header row with confidence indicator; user can override by clicking any row; multi-row headers (e.g. Xero "Account / Code") merge correctly | PASS | Xero (steps 2–3) and MYOB (step 10) both showed auto-pick at row 5; manual click override exercised in MYOB and QBO flows; Xero "Account / Code" composite header merged correctly in column-mapping step |
| IMP-08 | Tolerant currency parser handles $1,234.56, (1,234.56), AUD 1,234.56, parentheses-negatives; decimal.js precision preserved | PASS | excel-hand-edited.csv: tolerant-parse banner fired for $25,000.00 cells (steps 29–30); $(50,000.00) parsed as -50000 (step 30); Xero plain-numeric produced zero false-positive parse events (step 6) |
| IMP-09 | Subtotal rows excluded by default; user-visible Rejected Rows panel; user can re-include any rejected row | PASS | All three fixtures (Xero 3 subtotals, MYOB Total Assets, QBO 3 subtotals, Excel 2 subtotals) landed in rejected-rows; "Include all subtotals" on Xero moved all 3 to accepted (step 7); panel visible and scrollable on all fixtures |
| IMP-10 | Split account-code/name columns detected and merged; missing-code column (>50% empty) triggers auto-assign vs name-only picker | PASS | QBO name-only XLSX triggered missing-code-picker with both buttons visible (step 20); "Import name-only" path completed without error (step 21–23); Xero name-before-code order detected and merged in column mapping |
| IMP-11 | Every dropped row shows a reason; inline edit + Re-parse-and-include; Apply-to-similar bulk action with diff preview; Cancel preserves state; Apply confirm accepts rows | PASS | excel-hand-edited.csv steps 31–32: single-row edit and re-parse confirmed; Apply-to-similar diff preview rendered; Cancel left rows unchanged; Apply confirm moved rows to accepted |

---

## UAT Sign-Off

All 42 UAT steps PASSED. Phase 7 IMP-07, IMP-08, IMP-09, IMP-10, IMP-11 requirements verified end-to-end across all four messy fixtures (Xero, MYOB, QBO, hand-edited Excel) and the Phase 4 clean-flow regression scenario (steps 34–42). The existing Phase 4 deterministic-import path is confirmed unchanged — no new UI elements appear on clean files, and the fingerprint-collision duplicate guard (IMP-05) remains intact.

Signed off: 2026-05-30 by user (`approved`).
