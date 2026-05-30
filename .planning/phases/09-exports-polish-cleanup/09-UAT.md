---
phase: 09-exports-polish-cleanup
plan: 1
type: uat-log
status: approved
created: "2026-05-30"
approved: "2026-05-30"
requirements_covered: [FND-10, FND-11, FND-12, UX-06, CLEAN-01, CLEAN-02]
---

# Phase 9 Plan 1: UAT Log

## UAT Checklist (10 Steps)

| # | Area | Check | Result |
|---|------|-------|--------|
| 1 | FND-10 TB CSV | Open Trial Balance view; click "Export CSV". File downloads with name matching `trial-balance-FY2026-*.csv`. Open in Excel/Sheets — header row present: `code, name, type, debit, credit, balance, period_start, period_end`. | PASS |
| 2 | FND-10 Leading zeros | In the downloaded TB CSV, any account code starting with `0` (e.g. `01000`) appears with an apostrophe prefix in Excel (e.g. `'01000`) — not silently stripped to `1000`. | PASS |
| 3 | FND-10 Empty period | Select a period with no journal entries; click "Export CSV". File downloads with header row only (no data rows). Toast "No data in selected period for export" appears and auto-dismisses. | PASS |
| 4 | FND-11 BAS CSV | Open BAS/IAS Assistant view; click "Export CSV". File downloads with header: `label_code, plain_english, value, source`. Rows with `internalOnly: true` show `source = internal-only`; lodgement rows show `source = lodgement`. | PASS |
| 5 | FND-12 Form I CSV | Open Tax Return (Form I) view; click "Export CSV". File downloads with header: `label_code, plain_english, value, source_account_codes`. The `source_account_codes` column contains comma-joined account codes whose `taxLabel` matches that label code. | PASS |
| 6 | Audit log | After each export above, open the Audit Log. Verify an `EXPORT_DATA` entry appears with `type: 'csv'`, correct `report`, `period`, and `filename` fields. | PASS |
| 7 | UX-06 Journals badge | Ensure at least one unbalanced journal entry exists. Click the Journals count badge in the Sidebar. App navigates to Journals view; the first unbalanced row flashes yellow for ~300ms; toast reads "Showing anomaly 1 of N in Journal Entries". | PASS |
| 8 | UX-06 cycle + wrap | Click the Journals badge again. App scrolls to the 2nd unbalanced entry (badge cycles). After reaching the last anomaly, click again — wraps back to anomaly 1 with toast "Showing anomaly 1 of N". | PASS |
| 9 | UX-06 Accounts badge + banner | Ensure at least one account missing a taxLabel or gstCode. Click the Accounts count badge. App navigates to Accounts view filtered to anomaly rows; yellow flash on first row; filter banner "Filtered to anomalies" visible; clicking "Clear filter" restores full list. | PASS |
| 10 | CLEAN-01 / CLEAN-02 | (a) `git grep "US Big Law Firm" src/` returns zero matches. (b) All three VALIDATION.md files (`01-safety-net`, `02-decompose-and-tax-engine`, `06-personas-wizard-and-deployment`) have `nyquist_compliant: true` in frontmatter. | PASS |

All 10 checks: **10 PASSED / 0 FAILED**

---

## Per-Requirement Sign-off

| Requirement | Description | Result | Evidence |
|-------------|-------------|--------|----------|
| FND-10 | Trial Balance CSV export | PASS | TB CSV downloads with correct headers, leading-zero preservation, UTF-8 BOM, and header-only empty-period path — UAT steps 1-3 |
| FND-11 | BAS labels CSV export | PASS | BAS CSV downloads with `source` column correctly distinguishing `lodgement` vs `internal-only` — UAT step 4 |
| FND-12 | Form I labels CSV export | PASS | Form I CSV downloads with `source_account_codes` derived from account `taxLabel` matching — UAT step 5 |
| UX-06 | Anomaly badge deep-links + cycle navigation | PASS | Sidebar badges navigate and scroll to anomalies; cycle state wraps; filter banner clears; 300ms flash visible — UAT steps 7-9 |
| CLEAN-01 | Dead string removed from `App.tsx` | PASS | `git grep "US Big Law Firm" src/` returns zero — already fixed in Phase 1 commit `4e8eb3c`; negative assertion in `src/__tests__/App.test.tsx:28` GREEN confirms — UAT step 10a |
| CLEAN-02 | Nyquist frontmatter flips (3 VALIDATION.md files) | PASS | All 3 VALIDATION.md frontmatter lines read `nyquist_compliant: true` after `cea235d` doc commit — UAT step 10b |

---

## UAT Sign-off

All 10 UAT checks PASSED. Phase 9 FND-10/11/12 + UX-06 + CLEAN-01/02 verified end-to-end.

Signed off 2026-05-30.
