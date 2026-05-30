---
phase: 7
slug: importtb-ux-rework
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-30
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `07-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run src/lib/import/__tests__/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5s quick (lib only), ~35s full suite (after Phase 7 adds ~50 tests → ~813 expected) |

---

## Sampling Rate

- **After every task commit:** `npx vitest run src/lib/import/__tests__/` (lib pure-function tests, ~5s)
- **After every plan wave:** `npx vitest run` (full SPA suite)
- **Before `/gsd:verify-work 7`:** Full suite green
- **Max feedback latency:** 35 seconds

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Automated Command | File | Status |
|--------|----------|-----------|-------------------|------|--------|
| IMP-07 | `detectHeaderRow` scores row 0 as header correctly on clean fixture | unit (pure) | `npx vitest run src/lib/import/__tests__/headerDetect.test.ts` | ❌ W0 | ⬜ pending |
| IMP-07 | `detectHeaderRow` returns row 4 for Xero messy fixture (3-4 title rows above) | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-07 | `detectHeaderRow` merges 2-row header into composite ("Account/Code", "Account/Name") | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-07 | `detectHeaderRow` returns `autoPickRow: null` when top-candidate confidence < 0.60 | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-07 | `detectHeaderRow` returns top-3 candidates sorted by confidence desc | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-07 | `HeaderRowPicker` renders preview with auto-pick row highlighted | component | `npx vitest run src/components/__tests__/HeaderRowPicker.test.tsx` | ❌ W0 | ⬜ pending |
| IMP-07 | `HeaderRowPicker` clicking any row designates it as header (fires `onSelect`) | component | same | ❌ W0 | ⬜ pending |
| IMP-07 | `HeaderRowPicker` low-confidence path shows "Pick the header row" prompt + top-3 candidates | component | same | ❌ W0 | ⬜ pending |
| IMP-07 | `ImportTB` auto-advances past HeaderRowPicker when confidence ≥ 0.60 (no extra click) | integration | `npx vitest run src/components/__tests__/ImportTB.test.tsx` | extend | ⬜ pending |
| IMP-08 | `parseCurrency("$1,234.56")` → `Decimal("1234.56")`, high confidence | unit (pure) | `npx vitest run src/lib/import/__tests__/currencyParse.test.ts` | ❌ W0 | ⬜ pending |
| IMP-08 | `parseCurrency("(1,234.56)")` → `Decimal("-1234.56")`, high confidence | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-08 | `parseCurrency("AUD 1234.56")` → `Decimal("1234.56")`, high confidence | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-08 | `parseCurrency("1,234.56 AUD")` → `Decimal("1234.56")`, high confidence | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-08 | `parseCurrency("1234.56")` → `Decimal("1234.56")`, high confidence | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-08 | `parseCurrency("  1234.56  ")` → `Decimal("1234.56")`, high confidence | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-08 | `parseCurrency(" $ -1,234.56 ")` → `Decimal("-1234.56")`, high confidence | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-08 | `parseCurrency("1,234")` → `Decimal("1234")`, **low** confidence (ambiguous AU/EU) | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-08 | `parseCurrency("")` → `Decimal("0")`, high confidence | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-08 | `parseCurrency("N/A")` → `null`, low confidence, reason "currency unparseable" | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-08 | Decimal precision preserved for 16-digit amount (no float round-trip — string passes directly to Decimal ctor) | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-08 | Low-confidence parse surfaces `AnomalyBadge` in `ImportReviewPane` | component | `npx vitest run src/components/__tests__/ImportReviewPane.test.tsx` | extend | ⬜ pending |
| IMP-09 | `detectSubtotals` flags "Total Revenue" row by keyword (case-insensitive) | unit (pure) | `npx vitest run src/lib/import/__tests__/subtotalDetect.test.ts` | ❌ W0 | ⬜ pending |
| IMP-09 | `detectSubtotals` flags Xero "4999 Total Revenue" by sum-pattern (sum-wins-on-coded) | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-09 | `detectSubtotals` uses blank row as section boundary | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-09 | `detectSubtotals` uses account-code-prefix change as section boundary | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-09 | `detectSubtotals` tolerates ±0.01 rounding in sum-pattern detection | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-09 | Detected subtotals appear in `RejectedRowsPanel` with reason "Detected as subtotal" | component | `npx vitest run src/components/__tests__/RejectedRowsPanel.test.tsx` | ❌ W0 | ⬜ pending |
| IMP-09 | "Include all subtotals" bulk action moves the entire subtotal group back to accepted | component | same | ❌ W0 | ⬜ pending |
| IMP-10 | `detectSplitColumns` identifies split code/name by header names ("Code"/"Account Name") | unit (pure) | `npx vitest run src/lib/import/__tests__/columnMerge.test.ts` | ❌ W0 | ⬜ pending |
| IMP-10 | `detectSplitColumns` identifies split columns by value shape (short alphanumeric vs longer string) | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-10 | `detectSplitColumns` returns `missingCodeFraction > 0.5` when > 50% of code-column cells are empty | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-10 | `mergeColumns` produces combined `code — name` field with configurable separator | unit (pure) | same | ❌ W0 | ⬜ pending |
| IMP-10 | Missing-code path surfaces "auto-assign codes sequentially" + "import name-only" options | component | `npx vitest run src/components/__tests__/ImportTB.test.tsx` | extend | ⬜ pending |
| IMP-11 | `RejectedRowsPanel` renders grouped-by-reason sections with banner "N rows rejected — review" | component | `npx vitest run src/components/__tests__/RejectedRowsPanel.test.tsx` | ❌ W0 | ⬜ pending |
| IMP-11 | Within each reason group, rows sorted by original file row position | component | same | ❌ W0 | ⬜ pending |
| IMP-11 | Per-row edit-in-place fires `onRejectedRowUpdate(row)` on field change | component | same | ❌ W0 | ⬜ pending |
| IMP-11 | "Re-parse and include" button fires `onRejectedRowReparse(row)` and moves row to accepted on success | component | same | ❌ W0 | ⬜ pending |
| IMP-11 | "Apply to similar rows" identifies similar by reason + regex signature, shows diff preview before applying | component | same | ❌ W0 | ⬜ pending |
| IMP-11 | Diff preview includes a confirm/cancel choice; cancel leaves rows unchanged | component | same | ❌ W0 | ⬜ pending |
| REGRESSION | Phase 4 clean fixture (no `$`, row-0 header) imports cleanly via Phase 7 code path — all 12 existing JournalForm + ImportTB tests stay GREEN | integration | `npx vitest run src/components/__tests__/ImportTB.test.tsx src/components/__tests__/JournalForm.test.tsx` | extend | ⬜ pending |
| REGRESSION | Existing 763 SPA + 18 server tests stay GREEN end-of-phase | structural | `npx vitest run` | existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/import/__tests__/headerDetect.test.ts` — covers IMP-07 pure-function cases (`it.todo()` stubs initially)
- [ ] `src/lib/import/__tests__/currencyParse.test.ts` — covers IMP-08 all 7 ROADMAP currency-form fixtures + ambiguity + parse-failure cases
- [ ] `src/lib/import/__tests__/subtotalDetect.test.ts` — covers IMP-09 keyword + sum-pattern + section-boundary cases
- [ ] `src/lib/import/__tests__/columnMerge.test.ts` — covers IMP-10 split-detect + merge + missing-code cases
- [ ] `src/components/__tests__/HeaderRowPicker.test.tsx` — covers IMP-07 component cases
- [ ] `src/components/__tests__/RejectedRowsPanel.test.tsx` — covers IMP-09 + IMP-11 component cases
- [ ] `src/lib/import/__fixtures__/messy-tbs/xero-tb.csv` — structurally-faithful Xero fixture (3-4 title rows + reverse name/code order + synthetic-coded subtotals)
- [ ] `src/lib/import/__fixtures__/messy-tbs/myob-tb.csv` — structurally-faithful MYOB AccountRight fixture
- [ ] `src/lib/import/__fixtures__/messy-tbs/quickbooks-tb.xlsx` — structurally-faithful QuickBooks Online fixture
- [ ] `src/lib/import/__fixtures__/messy-tbs/excel-hand-edited.csv` — hand-edited Excel fixture with `$` amounts + parentheses negatives
- [ ] Framework install: none needed — Vitest already configured

**Wave 0 must add ZERO failing tests** — all stubs use `it.todo(...)`. Existing 763 GREEN tests must remain GREEN after Wave 0 commit.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real-world Xero TB import end-to-end (3-4 title rows, reverse name/code order, synthetic subtotals) | IMP-07, IMP-08, IMP-09, IMP-10 | Real export shapes vary; one-fixture-fits-all unit tests can't catch every variant | UAT step: drop a real Xero export into ImportTB; verify header auto-picked at correct row, currency cells parsed cleanly, subtotals excluded with reason, accounts imported intact |
| Real-world MYOB AccountRight TB import end-to-end | IMP-07, IMP-08, IMP-09 | Same | UAT step: same for MYOB export |
| Real-world QuickBooks Online TB import end-to-end | IMP-07, IMP-08, IMP-09, IMP-10 | Same; QBO often has name-only rows | UAT step: same for QBO export; verify "import name-only" path works for code-less rows |
| Hand-edited Excel TB with mixed shapes | IMP-07, IMP-08, IMP-09, IMP-10, IMP-11 | Excel exports vary wildly between users; mixed-shape rows are the test of bulk-apply | UAT step: hand-edited Excel with $ amounts + parens-negatives + subtotals + empty code cells; verify Rejected Rows panel surfaces every dropped row; verify "Apply to similar" works on currency-unparseable group |
| Visual confidence indicator on HeaderRowPicker | IMP-07 | Subjective UX — does the percentage badge / bar / text feel right? | UAT step: import a borderline fixture (confidence ~0.55) and verify the "Pick the header row" prompt fires correctly + top-3 candidates render legibly |
| Diff preview before applying "Apply to similar" | IMP-11 | Subjective UX — does the user understand what the bulk action will do? | UAT step: reject 5 currency-unparseable rows with same shape; edit one; click "Apply to similar"; verify diff preview shows all 5 with before/after; verify confirm/cancel both work |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (6 new test files + 4 fixtures identified above)
- [ ] No watch-mode flags
- [ ] Feedback latency < 35s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
