---
phase: 07-importtb-ux-rework
plan: 4
subsystem: uat-manual-verification
status: partial — awaiting UAT sign-off
tags:
  - wave-4-uat
  - manual-verification
  - pre-uat-gate
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
    - HeaderRowPicker-component-from-plan-07-3
    - RejectedRowsPanel-component-from-plan-07-3
    - ImportTB-state-machine-from-plan-07-3
    - ImportReviewPane-widened-from-plan-07-3
  provides:
    - UAT-sign-off-record
    - IMP-07-through-IMP-11-user-verified
  affects:
    - .planning/phases/07-importtb-ux-rework/07-UAT.md (to be created by user)
tech_stack:
  added: []
  patterns: []
key_files:
  created:
    - .planning/phases/07-importtb-ux-rework/07-UAT.md (to be created during UAT)
  modified: []
decisions:
  - "All pre-UAT automated gates passed at 848 GREEN + 18 server GREEN + lint EXIT 0 + build EXIT 0; UAT can proceed"
  - "All 4 fixtures confirmed as original Wave 0 synthetic fixtures (not replaced with real exports)"
metrics:
  duration: "~5 min (Task 1 automated gate)"
  completed_date: "2026-05-30"
  tasks_completed: 1
  tasks_total: 2
  files_created: 0
  files_modified: 0
  tests_green: 848
  tests_todo: 11
  tests_failed: 0
---

# Phase 7 Plan 4: Manual UAT — Messy Fixtures + Phase 4 Regression

**One-liner:** Pre-UAT automated gate (848 SPA + 18 server GREEN, lint + build EXIT 0, all 4 fixtures present); awaiting human UAT of 42 steps across 5 fixture scenarios to sign off IMP-07..11.

**Status: PARTIAL — Task 1 complete, Task 2 (human-verify checkpoint) in progress.**

---

## Objective

Manual UAT against all four messy fixtures (Xero, MYOB, QBO, hand-edited Excel) plus Phase 4 clean-flow regression check. Confirm end-to-end behavior of every Phase 7 requirement by running `npm run dev` and importing each fixture. Sign off all 5 IMP-07..11 requirements or file diagnosed gaps to drive a `/gsd:plan-phase 7 --gaps` cycle.

---

## Tasks Completed

### Task 1: Pre-UAT automated sanity gate

**Commit:** (verification-only task — no source files modified)

**All checks PASSED:**

| Check | Result | Detail |
|-------|--------|--------|
| `npx vitest run` (full SPA suite) | PASS | 848 passed, 11 todo, 0 failed (≥ 813 required) |
| `npm run test:server` | PASS | 18 passed, 0 failed |
| `npm run lint` | PASS | EXIT 0 |
| `npm run build` | PASS | EXIT 0 (expected chunk-size warning present, not an error) |
| `git diff -- src/storage/adapter.ts src/storage/local.ts src/storage/server.ts src/types.ts` | PASS | Empty (architecture invariants preserved) |
| `git diff -- src/lib/import/match.ts src/lib/import/fingerprint.ts` | PASS | Empty (Phase 4 reusables preserved) |
| All 4 fixture files present | PASS | xero-tb.csv, myob-tb.csv, quickbooks-tb.xlsx, excel-hand-edited.csv |

**Fixture status:** All 4 are the original Wave 0 SYNTHETIC-BUT-STRUCTURALLY-FAITHFUL fixtures. The user has not replaced them with real exports. UAT can use these synthetic fixtures OR the user may substitute real Xero/MYOB/QBO exports.

**Fixture content summary:**
- `xero-tb.csv` — 3 title rows + blank + header at row 5 (0-based 4); name-before-code column order; synthetic-coded subtotals (4999 Total Revenue=55000, 5999 Total Op.Exp.=15000); unlabeled bottom Total row
- `myob-tb.csv` — 3 title rows + blank + header at row 5; hyphenated codes (1-xxxx); Total Assets=30500 sum-pattern match; blank-row section boundary; Total Income also present
- `excel-hand-edited.csv` — 3 title rows + blank + header at row 5; "Debit ($)" / "Credit ($)" column names with suffix; $25,000.00 format + $(50,000.00) parentheses-negatives; blank-code subtotal rows
- `quickbooks-tb.xlsx` — XLSX binary; single sheet; name-only column (no code column); header at row 5; subtotal rows (Total ASSETS, Total REVENUE, TOTAL)

---

## Tasks Pending

### Task 2: Manual UAT — 42 steps across 5 fixture scenarios

**Status:** AWAITING USER ACTION (checkpoint:human-verify)

See checkpoint details in SUMMARY for the 42-step UAT protocol and the IMP-07..11 sign-off criteria.

**Output required:** `.planning/phases/07-importtb-ux-rework/07-UAT.md` with per-fixture table and IMP sign-off section.

---

## Deviations from Plan

None — Task 1 was verification-only. No source files were modified.

---

## Self-Check: PARTIAL

Task 1 verification:
- 848 SPA GREEN — PASS
- 18 server GREEN — PASS
- lint EXIT 0 — PASS
- build EXIT 0 — PASS
- All 4 fixture files present — PASS
- Architecture invariant diffs empty — PASS

Task 2 pending user UAT sign-off.
