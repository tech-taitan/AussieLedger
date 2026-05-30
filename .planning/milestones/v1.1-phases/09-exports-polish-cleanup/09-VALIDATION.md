---
phase: 9
slug: exports-polish-cleanup
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-30
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `09-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 + @testing-library/react |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run src/lib/export/__tests__/ src/components/__tests__/Toast.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~3s quick, ~95s full (after Phase 9 adds ~25 tests → ~935 expected) |

---

## Sampling Rate

- **After every task commit:** scoped run for the files touched (e.g. `src/lib/export/__tests__/csv.test.ts` for Task 1)
- **After Plan 09-1 close:** `npx vitest run` (full SPA suite)
- **Before `/gsd:verify-work 9`:** Full suite GREEN (910 baseline + ~25 new = ~935 expected)
- **Max feedback latency:** 95 seconds

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Automated Command | File | Status |
|--------|----------|-----------|-------------------|------|--------|
| FND-10 | `exportTrialBalanceCsv` returns header row + raw decimal money cells + CRLF + UTF-8 BOM prefix | unit | `npx vitest run src/lib/export/__tests__/csv.test.ts` | ❌ W0 | ⬜ pending |
| FND-10 | `exportTrialBalanceCsv` with empty tbRows returns `isEmpty: true` + header-only CSV (not empty string) | unit | same | ❌ W0 | ⬜ pending |
| FND-10 | Leading-zero account code (e.g. `'0410'`) emitted as `'0410` (apostrophe-prefixed) | unit | same | ❌ W0 | ⬜ pending |
| FND-10 | Account name containing comma (e.g. `"Sales, Domestic"`) round-trips correctly (quotes: true) | unit | same | ❌ W0 | ⬜ pending |
| FND-10 | Decimal precision preserved end-to-end — 16-digit money string not coerced to float | unit | same | ❌ W0 | ⬜ pending |
| FND-10 | Filename slug `{entity-slug}-tb-{period}.csv` generated correctly across FY / quarter / custom-range periods | unit | same | ❌ W0 | ⬜ pending |
| FND-10 | `TrialBalance` view header has "Export CSV" button next to existing Print button (`no-print` class) | component | `npx vitest run src/components/__tests__/TrialBalance.test.tsx` | extend | ⬜ pending |
| FND-10 | Clicking "Export CSV" emits `EXPORT_DATA` audit log with `{ type: 'csv', report: 'tb', period: ... }` | component | same | extend | ⬜ pending |
| FND-10 | Empty-period click → header-only CSV downloads + Toast "No data in selected period for export" appears | component | same | extend | ⬜ pending |
| FND-11 | `exportBasLabelsCsv` returns rows with `source` column = `'lodgement'` or `'internal-only'` per Phase 5 split | unit | `npx vitest run src/lib/export/__tests__/csv.test.ts` | ❌ W0 | ⬜ pending |
| FND-11 | `BasIasAssistant` view header has "Export CSV" button + click emits audit + empty-period toast | component | `npx vitest run src/components/__tests__/BasIasAssistant.test.tsx` | extend | ⬜ pending |
| FND-12 | `exportFormILabelsCsv` returns rows with `source_account_codes` derived from `accounts.taxLabel` join | unit | `npx vitest run src/lib/export/__tests__/csv.test.ts` | ❌ W0 | ⬜ pending |
| FND-12 | Form I CSV: label with no matching accounts → `source_account_codes` empty string (not crash) | unit | same | ❌ W0 | ⬜ pending |
| FND-12 | `TaxReturnAssistant` (Form I) view header has "Export CSV" button + click emits audit + empty-period toast | component | `npx vitest run src/components/__tests__/TaxReturnAssistant.test.tsx` | extend | ⬜ pending |
| UX-06 | `Toast` renders message + auto-dismisses after `duration` (default 3000ms) | unit | `npx vitest run src/components/__tests__/Toast.test.tsx` | ❌ W0 | ⬜ pending |
| UX-06 | `Toast` clicking dismisses early | unit | same | ❌ W0 | ⬜ pending |
| UX-06 | Sidebar "Journals N" badge clickable when N > 0; click navigates + emits scroll signal | component | `npx vitest run src/components/__tests__/Sidebar.test.tsx` | extend | ⬜ pending |
| UX-06 | Sidebar "Accounts N" badge clickable when N > 0; click navigates + emits scroll signal | component | same | extend | ⬜ pending |
| UX-06 | Sidebar cycle state: first click → index 0; second → 1; third → 2; fourth → wraps to 0 (for 3 anomalies) | component | same | extend | ⬜ pending |
| UX-06 | `JournalSearch` (or parent) renders "Filtered to anomalies — clear filter" banner when `filterUnbalanced=true` | component | `npx vitest run src/components/__tests__/JournalSearch.test.tsx` | extend | ⬜ pending |
| UX-06 | `CoaTreeView` filters to anomaly rows when `filterMissingMappings=true` + renders clear-filter banner | component | `npx vitest run src/components/__tests__/CoaTreeView.test.tsx` | extend | ⬜ pending |
| UX-06 | Focused row gets `anomaly-flash` class for 300ms then auto-removes (animation re-trigger works on repeated clicks via reflow trick) | component | `npx vitest run src/components/__tests__/JournalSearch.test.tsx` | extend | ⬜ pending |
| UX-06 | Position toast appears top-center with text matching `Showing anomaly N of M in {Screen}` (3s auto-dismiss) | component | `npx vitest run src/components/__tests__/Sidebar.test.tsx` | extend | ⬜ pending |
| CLEAN-01 | `git grep "US Big Law Firm" src/` returns ZERO matches (existing structural test) | structural (regression) | `npx vitest run src/__tests__/App.test.tsx` | existing GREEN | ⬜ verify |
| CLEAN-01 | REQUIREMENTS.md CLEAN-01 row marked `[x]` with traceability note "already fixed in Phase 1 — stale audit entry" | structural (doc) | manual grep | N/A doc | ⬜ pending |
| CLEAN-02 | `.planning/milestones/v1.0-phases/01-safety-net/01-VALIDATION.md` frontmatter has `nyquist_compliant: true` | structural (doc) | `grep "^nyquist_compliant: true" .planning/milestones/v1.0-phases/01-safety-net/01-VALIDATION.md` exits 0 | N/A doc | ⬜ pending |
| CLEAN-02 | `02-VALIDATION.md` has `nyquist_compliant: true` | structural (doc) | same for 02 | N/A doc | ⬜ pending |
| CLEAN-02 | `06-VALIDATION.md` has `nyquist_compliant: true` | structural (doc) | same for 06 | N/A doc | ⬜ pending |
| REGRESSION | All 910 existing SPA tests stay GREEN end-of-phase | structural | `npx vitest run` | existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/export/csv.ts` — stub module (3 export functions returning empty `CsvExportResult` to keep TypeScript happy + Task 2's component wiring testable)
- [ ] `src/lib/export/__tests__/csv.test.ts` — covers FND-10/11/12 pure-function cases (initial `it.todo()` stubs; flip to `it()` GREEN as serialiser lands in same task)
- [ ] `src/components/__tests__/Toast.test.tsx` — covers UX-06 Toast primitive
- [ ] Framework install: none — Vitest + @testing-library/react already configured

**Wave 0 must add ZERO failing tests.** Stubs use `it.todo()` initially; flipped to GREEN within Task 1.

---

## Manual-Only Verifications (Lightweight UAT — ~10 checks)

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Open TB CSV in Excel — header visible, money cells as numbers, leading-zero codes preserved | FND-10 | Excel auto-format behaviour not assertable via Vitest | UAT: download TB CSV → open in Excel → verify (a) header row, (b) money cells render as right-aligned numbers, (c) account code "0410" displays as "0410" not "410" |
| Open BAS labels CSV in Excel | FND-11 | Same | UAT: same flow for BAS export |
| Open Form I labels CSV in Excel | FND-12 | Same | UAT: same flow for Form I export |
| Empty period → header-only CSV + Toast | FND-10/11/12 | Browser-download + Toast UX | UAT: pick a period with no data → click Export CSV → verify file downloads with header-row-only AND toast appears reading "No data in selected period for export" |
| Sidebar Journals badge click → JournalSearch with anomaly scroll + flash | UX-06 | Visual + scroll behaviour | UAT: post 3 unbalanced journal entries → verify Sidebar shows "Journals 3" → click → verify navigate to JournalSearch, filter banner visible, first unbalanced row centered with 300ms yellow flash + toast "Showing anomaly 1 of 3 in Journal Entries" |
| Sidebar Journals badge cycle | UX-06 | Multi-click behaviour | UAT: click "Journals 3" again → verify scroll to 2nd entry + flash + toast "Showing anomaly 2 of 3"; click again → 3rd entry; click again → wraps to 1st |
| Sidebar Accounts badge click → CoaTreeView with anomaly scroll + flash | UX-06 | Same as Journals | UAT: ensure ≥1 account missing GST or taxLabel → verify Sidebar "Accounts N" badge → click → verify navigate + filter banner + scroll + flash + toast |
| Clear-filter banner action restores full list | UX-06 | Filter-UI behaviour | UAT: on filtered JournalSearch → click "clear filter" in banner → verify full journal list returns |
| Nyquist frontmatter flipped on v1.0 phases 1/2/6 | CLEAN-02 | Doc-only commit | UAT: `grep "^nyquist_compliant:" .planning/milestones/v1.0-phases/*/0*-VALIDATION.md` returns `true` for phases 1, 2, 6 (and `true` for 3, 4, 5 which were already correct) |
| REQUIREMENTS.md shows all 6 v1.1 requirements `[x]` | All | Doc verification | UAT: `grep "^- \[x\]" .planning/REQUIREMENTS.md` includes FND-10..12, UX-06, CLEAN-01..02 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (3 new files identified above)
- [ ] No watch-mode flags
- [ ] Feedback latency < 95s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
