---
phase: 07-importtb-ux-rework
plan: 3
subsystem: ui-components-state-machine
tags:
  - wave-3-ui
  - header-row-picker
  - rejected-rows-panel
  - importtb-state-machine
  - importreviewpane-extension
  - currency-parse-integration
  - subtotal-detect-integration
  - split-column-integration
  - imp-07
  - imp-08
  - imp-09
  - imp-10
  - imp-11
dependency_graph:
  requires:
    - headerDetect-implementation-from-plan-07-2
    - currencyParse-implementation-from-plan-07-2
    - subtotalDetect-implementation-from-plan-07-2
    - columnMerge-implementation-from-plan-07-2
    - csv-widened-parseCsvRaw-from-plan-07-2
    - xlsx-widened-getXlsxRawRows-from-plan-07-2
    - HeaderRowPicker-stub-from-plan-07-1
    - RejectedRowsPanel-stub-from-plan-07-1
    - ImportTB-phase-4-FINAL
    - ImportReviewPane-phase-4-FINAL
  provides:
    - HeaderRowPicker-component
    - RejectedRowsPanel-component
    - ImportTB-state-machine-with-headerRowChosen-step
    - ImportReviewPane-widened-backward-compatible
    - IMP-07-header-row-detection-UI
    - IMP-08-tolerant-currency-parse-UI
    - IMP-09-subtotal-detection-UI
    - IMP-10-missing-code-picker-UI
    - IMP-11-rejected-rows-panel-UI
    - 27-new-GREEN-tests
    - phase-4-regression-test
  affects:
    - src/components/HeaderRowPicker.tsx (implemented from stub)
    - src/components/RejectedRowsPanel.tsx (implemented from stub)
    - src/components/ImportTB.tsx (extended with new state machine step)
    - src/components/ImportReviewPane.tsx (widened with optional Phase 7 props)
    - src/components/__tests__/HeaderRowPicker.test.tsx (7 it.todo → GREEN)
    - src/components/__tests__/RejectedRowsPanel.test.tsx (10 it.todo → GREEN)
    - src/components/__tests__/ImportTB.test.tsx (+6 new tests)
    - src/components/__tests__/ImportReviewPane.test.tsx (+4 new tests)
tech_stack:
  added: []
  patterns:
    - "Phase 4 XlsxSheetPicker extraction pattern replicated for HeaderRowPicker and RejectedRowsPanel — separate component files with own test files"
    - "Additive state extension: 10 new state vars added to ImportTB; existing 10 Phase 4 state vars untouched"
    - "All new ImportReviewPane props optional — backward-compatible with Phase 4 callers (no-prop path renders exactly as before)"
    - "parseCsvRaw + detectHeaderRow → auto-pick or HeaderRowPicker before column-mapping step"
    - "parseCurrency on every debit/credit cell — null result → rejected row with reason currency-unparseable"
    - "detectSubtotals runs on accepted rows after currency parse — subtotal rows moved to rejectedRows"
    - "AnomalyBadge severity 'warn' for low-confidence parse count in tolerant-parse-banner"
    - "deriveRegexSignature used in RejectedRowsPanel for Apply-to-similar similarity detection"
key_files:
  created: []
  modified:
    - src/components/HeaderRowPicker.tsx
    - src/components/RejectedRowsPanel.tsx
    - src/components/ImportTB.tsx
    - src/components/ImportReviewPane.tsx
    - src/components/__tests__/HeaderRowPicker.test.tsx
    - src/components/__tests__/RejectedRowsPanel.test.tsx
    - src/components/__tests__/ImportTB.test.tsx
    - src/components/__tests__/ImportReviewPane.test.tsx
decisions:
  - "AnomalyBadge uses 'message' prop (required), not 'label' — the plan interface spec and actual implementation differed; actual component uses message for content and label as optional prefix. Auto-fixed."
  - "IMP-09 regression test fixture uses Xero-style synthetic code (4999) for Total Revenue — empty-code subtotal rows go to no-account-code group, not subtotal; test must have a code to exercise subtotal detection path"
  - "isPickingHeader guard in showUploadScreen ensures no upload-screen flash while header picker is visible"
  - "proceedAfterHeaderPick handles both CSV (parseCsvFile) and XLSX (pickSheetByName) paths with identical split-column detection post-processing"
  - "handleApplyToSimilar bulk-patches similar rows then calls handleRejectedRowReparse on each — uses deriveRegexSignature for similarity matching"
  - "resetState clears all 10 Phase 7 state vars; existing 10 Phase 4 state vars cleared as before — no state leakage"
metrics:
  duration: "~45 minutes"
  completed_date: "2026-05-30"
  tasks_completed: 4
  tasks_total: 4
  files_created: 0
  files_modified: 8
  tests_green: 848
  tests_todo: 11
  tests_failed: 0
  tests_delta: "+27 GREEN (from 821 baseline after Plan 07-2)"
---

# Phase 7 Plan 3: UI Components + State Machine Wiring

**One-liner:** HeaderRowPicker + RejectedRowsPanel components implemented; ImportTB state machine extended with headerRowChosen step + currency-parse + subtotal-detect + split-column integration; ImportReviewPane widened additively; all 4 IMP-07..11 requirements wired end-to-end; 27 new tests GREEN.

---

## Objective

Wire the Phase 7 pure-function heuristics from Plan 07-2 into the UI. Two new component files (`HeaderRowPicker`, `RejectedRowsPanel`) are extracted following the Phase 4 XlsxSheetPicker pattern (small component file with own test file). ImportTB.tsx's state machine extends with one new step (`isPickingHeader`); the existing flow (sheet picker → column mapping → review → fingerprint → post) is preserved bit-for-bit. ImportReviewPane.tsx gains optional rejected-rows props; existing Phase 4 callers continue to work without them.

---

## Tasks Completed

### Task 1: HeaderRowPicker component + 7 tests GREEN

**Commit:** f3fe67d

**What was done:**
- Replaced stub `HeaderRowPicker` with full implementation
- Scrollable table preview of first 15 rows; auto-pick row highlighted with `bg-blue-50`
- Auto-pick banner: "We think row N is the header — confidence X%" + "pick a different row" toggle
- Manual fallback prompt when `autoPickRow === null`
- Alternatives panel (collapsed in high-confidence mode, auto-open in manual mode)
- Multi-row header merge preview via `mergeHeaderRows` when consecutive rows both score > 0.40
- Cancel button fires `onCancel`; per-row click fires `onPick(rowIndex)`
- All 7 `it.todo()` stubs converted to real tests, all GREEN

**Verification:** `npx vitest run src/components/__tests__/HeaderRowPicker.test.tsx` → 7/7 GREEN

### Task 2: RejectedRowsPanel component + 10 tests GREEN

**Commit:** 39ad609

**What was done:**
- Replaced stub `RejectedRowsPanel` with full implementation
- Banner with chevron expander (collapsed by default) showing "N rows rejected — review"
- Grouped sections in order: subtotal/currency-unparseable/no-account-code/low-confidence-parse/other
- Rows sorted by `rowIndex` ascending within each group
- Per-row edit-in-place inputs with `aria-label="rejected-{idx}-{field}"`
- "Re-parse and include" button fires `onReparse(rowIndex)`
- "Apply to similar" button (appears when ≥ 2 similar rows): opens diff preview with confirm/cancel; uses `deriveRegexSignature` for similarity matching
- "Include all subtotals" bulk button in subtotal group
- Low-confidence-parse section collapsed by default behind `low-confidence-section-expander`
- All 10 `it.todo()` stubs converted to real tests, all GREEN

**Verification:** `npx vitest run src/components/__tests__/RejectedRowsPanel.test.tsx` → 10/10 GREEN

### Task 3: ImportTB state machine extension + 6 new tests GREEN

**Commit:** f013749

**What was done:**

**New state vars added:**
- `rawRows: string[][] | null` — all rows before header selection
- `headerDetectResult: HeaderDetectResult | null` — detection result with confidence
- `headerRowIndex: number | null` — selected header row
- `isPickingHeader: boolean` — show HeaderRowPicker UI
- `pickedFile: File | null` — file reference for async proceedAfterHeaderPick
- `pickedSheetName: string | null` — sheet name reference
- `missingCodeMode: 'pick' | null` — show missing-code picker
- `rejectedRows: RejectedRow[]` — rows rejected during column mapping
- `tolerantParseCount: number` — formatted cells parsed tolerantly
- `lowConfidenceParseCount: number` — ambiguous cells (AU or EU?)

**Flow changes:**
- `handleFileUpload`: CSV runs `parseCsvRaw` + `detectHeaderRow` → auto-pick or `setIsPickingHeader(true)`; XLSX single-sheet runs `getXlsxRawRows` + `detectHeaderRow` before column mapping
- `handleSheetPick`: now async; routes through header detection before column mapping
- `handleHeaderPick`: sets `headerRowIndex`, clears `isPickingHeader`, calls `proceedAfterHeaderPick`
- `proceedAfterHeaderPick`: calls `parseCsvFile/pickSheetByName` with `headerRowIndex`; runs `detectSplitColumns + mergeColumns`; advances to column-mapping or missing-code-picker
- `processColumnMapping`: uses `parseCurrency` on debit/credit cells; tracks tolerant/low-confidence counts; populates `rejectedRows` for null-parse and no-code rows; runs `detectSubtotals` on accepted rows before `fuzzyMatch`
- Rejected row handlers: `handleRejectedRowReparse`, `handleIncludeAllSubtotals`, `handleApplyToSimilar`
- `showUploadScreen` guard includes `!isPickingHeader && !missingCodeMode`
- New render blocks: `HeaderRowPicker`, `missing-code-picker`
- `ImportReviewPane` invocation passes all 6 new optional props

**New tests (all GREEN):**
1. IMP-07: high-confidence auto-advances past HeaderRowPicker
2. IMP-07: low-confidence shows HeaderRowPicker; click row advances
3. IMP-08: $ amounts parse correctly via parseCurrency
4. IMP-09: subtotal rows appear in rejected-group-subtotal
5. IMP-10: missing-code picker renders; auto-assign fills codes
6. REGRESSION: Phase 4 clean fixture → onImport called once, zero rejected rows

**Verification:** `npx vitest run src/components/__tests__/ImportTB.test.tsx` → 17/17 GREEN (11 existing + 6 new)

### Task 4: Extend ImportReviewPane + 4 new tests GREEN

**Commit:** 9274ccd

**What was done:**
- Added optional Phase 7 props to `ImportReviewPaneProps`: `rejectedRows?`, `tolerantParseCount?`, `lowConfidenceParseCount?`, `onRejectedRowUpdate?`, `onRejectedRowReparse?`, `onIncludeAllSubtotals?`, `onApplyToSimilar?`
- `tolerantParseCount > 0` renders `data-testid="tolerant-parse-banner"` at top of pane
- `lowConfidenceParseCount > 0` renders `AnomalyBadge severity="warn"` alongside banner
- All 6 new optional props present → renders `RejectedRowsPanel` below accepted table
- Phase 4 callers (no new props) render exactly as before — no banner, no panel

**New tests (all GREEN):**
1. IMP-08: tolerant-parse-banner renders when tolerantParseCount > 0
2. IMP-08: AnomalyBadge renders when lowConfidenceParseCount > 0
3. IMP-09/11: RejectedRowsPanel renders inline when rejectedRows non-empty
4. REGRESSION: omitting Phase 7 props renders no banner/badge/panel

**Verification:** `npx vitest run src/components/__tests__/ImportReviewPane.test.tsx` → 10/10 GREEN (6 existing + 4 new)

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AnomalyBadge prop name mismatch**

- **Found during:** Task 4 — `npm run lint` after implementing ImportReviewPane
- **Issue:** The plan's interface specification said `AnomalyBadgeProps { severity: 'info' | 'warn'; label: string; }`. The actual Phase 5 AnomalyBadge implementation uses `message: string` (required) and `label?: string` (optional prefix). The spec was incorrect; the actual component definition was the ground truth.
- **Fix:** Changed `label={\`${lowConfidenceParseCount} cells low confidence\`}` to `message={\`${lowConfidenceParseCount} cells low confidence\`}`
- **Files modified:** `src/components/ImportReviewPane.tsx`
- **Commit:** 5ce4f99

**2. [Rule 1 - Bug] IMP-09 test fixture — subtotal row needs code to reach subtotalDetect**

- **Found during:** Task 3 integration test development
- **Issue:** The test fixture used `',Total Revenue,0,55000\n'` (empty code). In `processColumnMapping`, rows with empty code AND non-empty name are rejected as `no-account-code` BEFORE reaching `detectSubtotals`. So the subtotal row never reached subtotal detection.
- **Fix:** Changed fixture to use Xero-style synthetic code `4999,Total Revenue,0,55000\n` — keyword "Total" triggers subtotal detection on a coded row, matching the documented Xero synthetic-code pattern.
- **Files modified:** `src/components/__tests__/ImportTB.test.tsx`
- **Commit:** f013749

---

## Self-Check: PASSED

Files verified to exist:
- `src/components/HeaderRowPicker.tsx` — EXISTS (contains `data-testid="header-row-picker"`)
- `src/components/RejectedRowsPanel.tsx` — EXISTS (contains `data-testid="rejected-rows-banner"`)
- `src/components/ImportTB.tsx` — EXISTS (contains `isPickingHeader`, `parseCurrency`, `detectSubtotals`)
- `src/components/ImportReviewPane.tsx` — EXISTS (contains `RejectedRowsPanel`, `tolerant-parse-banner`)

Commits verified (git log --oneline):
- f3fe67d — Task 1 (HeaderRowPicker)
- 39ad609 — Task 2 (RejectedRowsPanel)
- 9274ccd — Task 4 (ImportReviewPane)
- f013749 — Task 3 (ImportTB)
- 5ce4f99 — Rule 1 auto-fix (AnomalyBadge prop)

Acceptance criteria:
- `grep -c "it.todo" src/components/__tests__/HeaderRowPicker.test.tsx` → 0 (PASS)
- `grep -c "it.todo" src/components/__tests__/RejectedRowsPanel.test.tsx` → 0 (PASS)
- `grep -c "isPickingHeader" src/components/ImportTB.tsx` → 3+ (PASS — declaration, setters, guards, render)
- `grep -c "HeaderRowPicker" src/components/ImportTB.tsx` → 2+ (PASS — import + render)
- `grep -c "parseCurrency" src/components/ImportTB.tsx` → 7 (PASS)
- `grep -c "detectSubtotals" src/components/ImportTB.tsx` → 2 (PASS)
- `grep -c "RejectedRowsPanel" src/components/ImportReviewPane.tsx` → 4 (PASS)
- `grep -c "AnomalyBadge" src/components/ImportReviewPane.tsx` → 3 (PASS)
- Full suite: 848 passed, 11 todo, 0 failed (≥ 813 required — PASS)
- `npm run lint` → EXIT 0 (PASS)
- `npm run build` → EXIT 0 (PASS)
