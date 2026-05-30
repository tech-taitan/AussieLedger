---
phase: 09-exports-polish-cleanup
verified: 2026-05-30T18:35:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
---

# Phase 9: Exports + Polish + Cleanup — Verification Report

**Phase Goal:** Close v1.0's known gaps in one polish-and-ship phase. FND-02 (CSV exports) is the headline; anomaly deep-links polish UX-02; the cosmetic + Nyquist sweep removes audit-flagged hygiene debt.
**Verified:** 2026-05-30T18:35:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `src/lib/export/csv.ts` exports 3 serialiser functions + UTF-8 BOM + Papa.unparse object form | VERIFIED | File confirmed at 155 lines; `exportTrialBalanceCsv`, `exportBasLabelsCsv`, `exportFormILabelsCsv` all present; `const BOM = '﻿'` (U+FEFF codepoint 0xFEFF confirmed via Node); `Papa.unparse({ fields: [...fields], data }, opts)` object form used |
| 2 | No `parseFloat`/`Number(` on money strings in csv.ts | VERIFIED | grep found only a comment `// raw decimal — NEVER parseFloat` — no actual calls; all money values use `.toString()` on Decimal objects |
| 3 | TB/BAS/Form-I views have "Export CSV" buttons emitting `EXPORT_DATA` audit log with `type: 'csv'` | VERIFIED | `data-testid="export-csv-button-tb"`, `"export-csv-button-bas"`, `"export-csv-button-form-i"` confirmed in source; all three handlers call `addLog?.('EXPORT_DATA', JSON.stringify({...type:'csv'...}), entityId)` |
| 4 | Sidebar badge onClick cycles through anomalies + shows position toast | VERIFIED | Sidebar.tsx: `journalCycleIdx` + `accountCycleIdx` state; `handleJournalsBadgeClick` / `handleAccountsBadgeClick` call `onAnomalyScroll?.(target, next)` then show `Toast` with "Showing anomaly N of M in Journal Entries" |
| 5 | `@keyframes flash-yellow` in `src/index.css` + `void el.offsetWidth` reflow trick in both consumers | VERIFIED | `@keyframes flash-yellow` + `.anomaly-flash` confirmed in index.css; `void el.offsetWidth` on line 101 of CoaTreeView.tsx and line 382 of ViewRouter.tsx |
| 6 | `git grep "US Big Law Firm" src/` returns zero matches | VERIFIED | Only match is in `src/__tests__/App.test.tsx` as a **negative assertion** (`expect(text).not.toContain('US Big Law Firm')`); no live string in production code |
| 7 | CLEAN-01 row in REQUIREMENTS.md is `[x]` with traceability note | VERIFIED | Line 46 reads `- [x] **CLEAN-01**: ... already fixed in Phase 1 (stale audit entry from v1.0 review); negative assertion in App.test.tsx:28 GREEN confirms the absence.` |
| 8 | Phases 1, 2, 6 VALIDATION.md files all have `nyquist_compliant: true` in frontmatter | VERIFIED | All three files confirmed: `01-VALIDATION.md` line 5, `02-VALIDATION.md` line 5, `06-VALIDATION.md` line 5 — all read `nyquist_compliant: true` |
| 9 | 983 SPA tests GREEN + 0 RED; 18 server GREEN; lint EXIT 0; build EXIT 0 | VERIFIED | `npx vitest run`: 101 test files, 983 passed, 11 todo, 0 failed; `npm run lint` (tsc --noEmit): EXIT 0; `npm run build` (Vite): EXIT 0 with pre-existing chunk-size warning only |
| 10 | FND-10/11/12, UX-06, CLEAN-01, CLEAN-02 all marked Complete (09-1) in REQUIREMENTS.md | VERIFIED | Traceability table lines 85-90 confirmed all six requirements marked `Complete (09-1)` |
| 11 | StorageAdapter interface untouched (Phase 3 FINAL invariant) | VERIFIED | `src/storage/adapter.ts` unchanged from Phase 3 contract; no new methods; no Phase 9 commits touched package.json or adapter.ts |
| 12 | UAT-approved with all 10 steps PASSED; `09-UAT.md` exists | VERIFIED | File exists at `.planning/phases/09-exports-polish-cleanup/09-UAT.md`; status: approved; 10/10 PASS; signed off 2026-05-30 |

**Score:** 12/12 truths verified

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/export/csv.ts` | VERIFIED | 155 lines; 3 exports (`exportTrialBalanceCsv`, `exportBasLabelsCsv`, `exportFormILabelsCsv`); `CsvExportResult` interface; `Papa.unparse` object form; UTF-8 BOM literal U+FEFF; no parseFloat/Number() on money strings |
| `src/lib/export/__tests__/csv.test.ts` | VERIFIED | 37 tests GREEN; covers slugify, fmtPeriodSlug, period boundaries, all 3 serialisers including empty-period, decimal precision, BOM byte, leading-zero prefix, comma-in-name quoting |
| `src/components/Toast.tsx` | VERIFIED | 36 lines; `{ message, duration=3000, onDismiss, tone='info' }`; auto-dismiss via `setTimeout`; click-to-dismiss; `role="status"` |
| `src/components/__tests__/Toast.test.tsx` | VERIFIED | 7 tests GREEN |
| `src/index.css` | VERIFIED | `@keyframes flash-yellow` + `.anomaly-flash` class; CSS-first (no tailwind.config.js) |
| `src/components/TrialBalance.tsx` | VERIFIED | "Export CSV" button at `data-testid="export-csv-button-tb"`; calls `exportTrialBalanceCsv`; emits `EXPORT_DATA` audit; Toast on empty |
| `src/components/BasIasAssistant.tsx` | VERIFIED | "Export CSV" button at `data-testid="export-csv-button-bas"`; calls `exportBasLabelsCsv`; emits `EXPORT_DATA` audit; Toast on empty |
| `src/components/TaxReturnAssistant.tsx` | VERIFIED | "Export CSV" button at `data-testid="export-csv-button-form-i"`; calls `exportFormILabelsCsv`; emits `EXPORT_DATA` audit; Toast on empty |
| `src/components/shell/Sidebar.tsx` | VERIFIED | `journalCycleIdx` + `accountCycleIdx` cycle state; badges rendered as `<button>` with `data-testid`; `handleJournalsBadgeClick` / `handleAccountsBadgeClick`; `onAnomalyScroll` prop (named differently from plan's `anomalyScrollSignal` — equivalent semantics, wired correctly) |
| `src/components/ViewRouter.tsx` | VERIFIED | `scrollToJournalIdx` + `filterUnbalanced` props received and threaded to `JournalsView`; `scrollToAccountIdx` + `filterMissingMappings` threaded to `AccountManager` → `CoaTreeView` |
| `src/components/CoaTreeView.tsx` | VERIFIED | `filterMissingMappings` prop; filter useMemo; anomaly-filter banner; `rowRefs`; `void el.offsetWidth` reflow trick on line 101; `.anomaly-flash` class |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `TrialBalance.tsx handleExportCsv` | `csv.ts exportTrialBalanceCsv` | Direct import + Blob+anchor | WIRED | `exportTrialBalanceCsv(tbData, ...)` call confirmed line 78 |
| `BasIasAssistant.tsx handleExportCsv` | `csv.ts exportBasLabelsCsv` | Direct import + Blob+anchor | WIRED | `exportBasLabelsCsv(result.labels, ...)` call confirmed line 129 |
| `TaxReturnAssistant.tsx handleExportCsv` | `csv.ts exportFormILabelsCsv` | Direct import + Blob+anchor | WIRED | `exportFormILabelsCsv(result.labels, accounts, ...)` call confirmed line 121 |
| All 3 Export CSV buttons | `addLog?.('EXPORT_DATA', ...)` | type:'csv' in JSON payload | WIRED | All three confirmed via grep showing `EXPORT_DATA` + `type.*csv` in each component |
| `Sidebar.tsx Journals badge` | `ViewRouter.tsx JournalsView` | `setView` + `onAnomalyScroll` → App → ViewRouter `scrollToJournalIdx` | WIRED | `handleJournalsBadgeClick` → `setView('journals')` + `onAnomalyScroll?.('journals', next)` → `App.handleAnomalyScroll` → `setScrollToJournalIdx(cycleIdx)` |
| `Sidebar.tsx Accounts badge` | `CoaTreeView.tsx` | `setView` + `onAnomalyScroll` → App → ViewRouter → AccountManager → `CoaTreeView scrollToAccountIdx` | WIRED | `handleAccountsBadgeClick` → `setView('coa-manager')` + `onAnomalyScroll?.('accounts', next)` → threaded to `CoaTreeView` |
| `anomaly-flash CSS class` | `@keyframes flash-yellow` | `void el.offsetWidth` reflow trick | WIRED | `void el.offsetWidth` confirmed in both consumers; `@keyframes flash-yellow` confirmed in index.css |

---

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| FND-10 | Trial Balance CSV export — one row per account, header-only on empty period, Excel-compatible | SATISFIED | `exportTrialBalanceCsv` in csv.ts; TB "Export CSV" button wired; 37 unit tests GREEN |
| FND-11 | BAS labels CSV export — `source` column distinguishes lodgement vs internal-only | SATISFIED | `exportBasLabelsCsv` in csv.ts; BAS "Export CSV" button wired; unit tests GREEN |
| FND-12 | Form I labels CSV export — `source_account_codes` derived from `account.taxLabel` join | SATISFIED | `exportFormILabelsCsv` in csv.ts; Form I "Export CSV" button wired; unit tests GREEN |
| UX-06 | Sidebar anomaly badge deep-link + scroll + cycle + position toast | SATISFIED | Sidebar cycle state + `onAnomalyScroll` wiring + JournalsView + CoaTreeView scroll/flash; 29 new tests GREEN |
| CLEAN-01 | Dead `'US Big Law Firm'` string removed | SATISFIED | `git grep "US Big Law Firm" src/` returns zero live matches; negative assertion in App.test.tsx GREEN; REQUIREMENTS.md `[x]` with traceability note |
| CLEAN-02 | `nyquist_compliant: true` flipped on v1.0 Phases 1, 2, 6 VALIDATION.md frontmatter | SATISFIED | All 3 VALIDATION.md files confirmed with `nyquist_compliant: true` on line 5 |

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/components/shell/Sidebar.tsx` | `<button>` nested inside `<button>` (NavButton outer + badge inner) | INFO | React warns in test output: "In HTML, \<button\> cannot be a descendant of \<button\>." This is a pre-existing structural issue in the NavButton pattern — the badge click button sits inside the NavButton button. All 13 Sidebar tests pass GREEN; no functional regression. Pre-existing before Phase 9 (S.1 test was already flagging this before this phase). No blocker. |

No blocker anti-patterns. No TODO/FIXME/PLACEHOLDER comments added. No stub implementations detected.

---

## Invariant Verification

| Invariant | Result |
|-----------|--------|
| StorageAdapter interface untouched (Phase 3 FINAL) | PASS — no Phase 9 commits touched adapter.ts or package.json |
| No `new Date()` added outside `src/lib/period.ts` | PASS — structural test in src/__tests__/structural.test.ts GREEN; grep found only comments referencing `new Date()` in non-period non-test files |
| No `parseFloat`/`Number(` on money strings in csv.ts | PASS — only occurrence is a comment `// raw decimal — NEVER parseFloat`; all money cells use `Decimal.toString()` |
| AnomalyBadge severity remains `'info' | 'warn'` | PASS — `severity: 'info' | 'warn'` confirmed in types.ts Anomaly interface; AnomalyBadge.tsx reads `Anomaly['severity']` |
| No new dependencies added (papaparse already from Phase 4) | PASS — `papaparse: ^5.5.3` already in dependencies; no Phase 9 commits touched package.json |
| Toast primitive ~35 lines, single-purpose | PASS — 36 lines; used only by empty-CSV-toast path and UX-06 position toast in Sidebar |
| UTF-8 BOM `'﻿'` literal present in csv.ts | PASS — `const BOM = '﻿'` at line 21; Node confirms codepoint 0xFEFF |
| `Papa.unparse({fields, data}, opts)` object form used | PASS — line 68-70: `Papa.unparse({ fields: [...fields], data }, { quotes: true, newline: '\r\n' })` |

---

## Human Verification Required

All automated checks passed. The following items were covered by UAT sign-off (09-UAT.md, 2026-05-30):

### 1. Excel compatibility of CSV output

**Test:** Open downloaded TB/BAS/Form-I CSV files in Excel
**Expected:** Header row visible, money cells right-aligned as numbers, leading-zero codes like `0410` display as `'0410` (apostrophe-prefixed) not stripped to `410`
**Why human:** Browser download + Excel format behaviour not assertable via Vitest — covered in UAT steps 1-5

### 2. Anomaly flash visual (300ms yellow highlight)

**Test:** Click Sidebar anomaly badge, observe row in view
**Expected:** Target row highlights yellow for ~300ms then fades
**Why human:** CSS animation timing not assertable via Vitest — covered in UAT steps 7-9

### 3. Scroll-into-view centering

**Test:** Click Sidebar badge when anomaly row is off-screen
**Expected:** Smooth scroll brings target row to center of viewport
**Why human:** Scroll behaviour not observable in jsdom — covered in UAT

**UAT outcome:** All 10 steps PASSED. Signed off 2026-05-30.

---

## Deviations: Plan vs Implementation

One naming deviation noted — no functional impact:

**Sidebar prop name:** Plan artifact check specifies `contains: "anomalyScrollSignal"` but implementation uses `onAnomalyScroll` throughout (Sidebar, MainLayout, App). The semantics are identical; the rename happened during implementation to align with React prop naming conventions. All wiring is correct and tested.

---

## Commits Verified

| Commit | Description | Verified |
|--------|-------------|---------|
| 7883f52 | feat(09-1): FND-10/11/12 pure-function CSV serialisers + unit tests | EXISTS |
| f7e24fe | feat(09-1): Toast primitive + tests | EXISTS |
| d9665c2 | feat(09-1): Export CSV buttons on TB/BAS/Form-I + audit log + empty-period toast | EXISTS |
| 8197ff3 | feat(09-1): UX-06 anomaly badge deep-links + cycle state + 300ms flash + filter banners | EXISTS |
| cea235d | docs(09-1): CLEAN-01 + CLEAN-02 — REQUIREMENTS row + 3 Nyquist frontmatter flips | EXISTS |

---

## Summary

Phase 9 goal is fully achieved. All 6 v1.1 requirements (FND-10, FND-11, FND-12, UX-06, CLEAN-01, CLEAN-02) are implemented, tested, and marked Complete in REQUIREMENTS.md. The test suite grew from 910 to 983 GREEN (73 new tests, vs ~25 estimated — significantly more comprehensive than planned). Build and lint are clean. UAT signed off all 10 checks. No regressions. No blocker anti-patterns.

---

_Verified: 2026-05-30T18:35:00Z_
_Verifier: Claude (gsd-verifier)_
