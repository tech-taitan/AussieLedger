# Roadmap: AussieLedger

**Last updated:** 2026-05-30

## Milestones

- ✅ **v1.0** — Phases 1–6 (shipped 2026-05-29) — see [.planning/milestones/v1.0-ROADMAP.md](./milestones/v1.0-ROADMAP.md)
- 🔄 **v1.1** — Phases 7–9 (in progress) — Polish, Closure, and TB Import Rework
- 📋 **v2.0** — Standalone desktop app + file-backed SQLite + hard network sandbox — research at [.planning/future-milestones/v2.0-standalone-app/](./future-milestones/v2.0-standalone-app/) (deferred; reactivate after v1.1 ships)

## Phases

<details>
<summary>✅ v1.0 (Phases 1–6) — SHIPPED 2026-05-29</summary>

- [x] Phase 1: Safety Net (3/3 plans) — completed 2026-05-10
- [x] Phase 2: Decompose and Tax Engine (4/4 plans) — completed 2026-05-10
- [x] Phase 3: Durable Persistence (4/4 plans) — completed 2026-05-12
- [x] Phase 4: Bookkeeping Core (4/4 plans) — completed 2026-05-13
- [x] Phase 5: Tax Outputs (4/4 plans) — completed 2026-05-28
- [x] Phase 6: Personas, Wizard, and Deployment (4/4 plans) — completed 2026-05-29

</details>

### v1.1 (In Progress)

- [x] **Phase 7: ImportTB UX Rework** — header-row detection + tolerant currency parser + subtotal exclusion + split-column merging + extended ImportReviewPane with rejected-rows panel
- [x] **Phase 8: Family Medicare Levy Engine** — v5→v6 additive schema (Entity gains `dependants` + `spouseIncome`) + real family threshold engine in `medicare.ts` + EntityForm extension + Form I family-variant rendering
- [ ] **Phase 9: Exports + Polish + Cleanup** — FND-02 closure (TB/BAS/Form-I CSV exports) + anomaly fix-it deep-links + cosmetic sweep (`App.tsx:114` + Nyquist frontmatter)

## Phase Details

### Phase 7: ImportTB UX Rework

**Goal:** A user can upload a real-world unformatted TB CSV/XLSX from Xero/MYOB/QuickBooks/Excel and ImportTB correctly identifies headers, parses currency tolerantly, excludes subtotals, merges split account-code/name columns, and surfaces every dropped row with a fix-it path — without breaking the existing deterministic-clean-import flow.

**Depends on:** Nothing (first v1.1 phase; v1.0 phases complete). Phases 8 + 9 are independent of this phase.

**Requirements:** IMP-07, IMP-08, IMP-09, IMP-10, IMP-11

**Success Criteria** (what must be TRUE):
1. A messy fixture TB (title rows above headers, `$1,234.56` cells, parenthesised negatives, subtotal rows, split code/name columns) imports cleanly — zero rows lost to silent parse failure
2. ImportTB auto-suggests the header row with a confidence indicator; user can override by clicking any row; multi-row headers (e.g. "Account" / "Code | Name") merge correctly
3. Currency parser test suite covers `$1,234.56`, `(1,234.56)`, `AUD 1234.56`, `1,234.56 AUD`, `1234.56`, `  1234.56  `, ` $ -1,234.56 ` — every form round-trips as a `Decimal` with full precision preserved
4. Subtotal detector excludes "Total Operating Expenses" / "Net Income" / "Grand Total" / sum-of-preceding-rows-pattern rows by default; user-visible "Rejected rows" panel lets the user re-include any of them
5. ImportReviewPane "Rejected rows" panel shows reason per row; inline edit works; "Apply this fix to similar rows" bulk action handles repeated patterns
6. The existing clean-import flow (Phase 4 fixture) still works unchanged — 763 SPA + 18 server tests stay GREEN

**Plans:** 4 plans

- [x] 07-1-PLAN.md — Wave 0 scaffold: 6 test stubs (it.todo) + 4 messy-TB fixtures + XLSX build script + stub modules; 64 new it.todo() stubs; 769 GREEN, 75 todo (commit 9193931)
- [x] 07-2-PLAN.md — Pure-function implementations: currencyParse + headerDetect + subtotalDetect + columnMerge + widen csv.ts/xlsx.ts with optional headerRowIndex; flip 4 lib test files RED → GREEN; 821 GREEN, 28 todo (commits b2142b2, cdd2951, 4b81fac)
- [x] 07-3-PLAN.md — Component wiring: HeaderRowPicker + RejectedRowsPanel + extend ImportTB state-machine + extend ImportReviewPane; Phase 4 clean-flow regression test added; 848 GREEN, 11 todo (commits f3fe67d, 39ad609, 9274ccd, f013749, 5ce4f99)
- [x] 07-4-PLAN.md — Manual UAT against all 4 messy fixtures + Phase 4 clean regression; sign off all 5 IMP-07..11 requirements (approved 2026-05-30)

### Phase 8: Family Medicare Levy Engine

**Goal:** An Individual entity with dependants or a spouse income calculates Medicare levy using the real family thresholds — not the flat-2%-with-warning fallback Phase 5 shipped. Form I prints the family-variant calculation with assumption disclosure.

**Depends on:** Nothing (v1.0 + Phase 7 don't touch Medicare; safe to start in parallel with Phase 7)

**Requirements:** MED-01, MED-02, MED-03, MED-04

**Success Criteria** (what must be TRUE):
1. v5→v6 additive migration writes `dependants?` and `spouseIncome?` on Individual entities only — round-trip test passes with existing v0→v5 fixture set
2. `computeIndividualReturn` for an Individual with `dependants: 2 + spouseIncome: "60000"` produces Medicare M1/M2 values matching the ATO family-threshold formula (specific gold values locked from current ATO Individual instructions NAT 2541 / NAT 2542)
3. Form I renders the family-threshold variant of M1/M2 with an "Assumption: family thresholds applied — N dependants, spouse income $X" row in the AssumptionsBlock — replacing the flat-2% warning
4. EntityForm shows `dependants` + `spouseIncome` only for Individual entities; both fields optional; defaults are `undefined` (no migration required for existing v1.0 entities to remain valid)
5. Existing v1.0 individual entities (no `dependants` / no `spouseIncome`) continue to use single-person Medicare exactly as Phase 5 shipped — zero regression in the 30+ existing IND/COY/TRT/PSP tests

**Plans:** 3 plans

- [x] 08-1-PLAN.md — Wave 1 foundations: v5→v6 migration + types/Zod widening + 5 new FY2025-26 family constants + 4 stale-constants corrections + medicareLevyFamily + medicareLevySurchargeFamily + isFamilyFiling pure functions + tests (884 GREEN, commits c9f4252 + 113d0d8 + 3b1654a)
- [x] 08-2-PLAN.md — Wave 2 integration: computeIndividualReturn family branch + family-medicare assumption row + bad-data anomaly + AssumptionsBlock dynamic prop + TaxReturnAssistant wiring + EntityForm 2 Individual-conditional fields (910 GREEN, commits a2886f1 + 6910396 + f3a746e)
- [x] 08-3-PLAN.md — Wave 3 UAT: 5 manual scenarios (single-parent, DINK, 2-kid family, legacy v1.0 entity, bad spouseIncome) signed off + MED-01..04 marked Complete

### Phase 9: Exports + Polish + Cleanup

**Goal:** Close v1.0's known gaps in one polish-and-ship phase. FND-02 (CSV exports) is the headline; anomaly deep-links polish UX-02; the cosmetic + Nyquist sweep removes audit-flagged hygiene debt.

**Depends on:** Nothing (independent of Phases 7 + 8 — could run in parallel, but recommended to run last so it can absorb any minor regressions caught during Phase 7/8 UAT)

**Requirements:** FND-10, FND-11, FND-12, UX-06, CLEAN-01, CLEAN-02

**Success Criteria** (what must be TRUE):
1. From any tax-return view, "Export labels as CSV" produces a correctly-shaped CSV — TB CSV opens cleanly in Excel/Sheets; BAS labels CSV matches the lodgement vs internal-only split shipped in Phase 5; Form I CSV includes the source-account list per label
2. Clicking a Sidebar count badge (e.g. "Journals 3") navigates to the Journals screen AND auto-scrolls to the first offending row — repeat clicks cycle through the remaining offenders
3. `git grep "US Big Law Firm" src/` returns zero matches; `App.tsx` line 114 no longer contains the dead string literal
4. `.planning/milestones/v1.0-phases/01-safety-net/01-VALIDATION.md`, `02-decompose-and-tax-engine/02-VALIDATION.md`, and `06-personas-wizard-and-deployment/06-VALIDATION.md` all have `nyquist_compliant: true` in frontmatter (one-shot doc commit; no test changes)
5. Full SPA test suite (existing 763 + ~25 new v1.1 tests across phases 7-9) GREEN; lint + build EXIT 0; UAT signs off all 6 v1.1 requirements end-to-end

**Plans:** TBD

## Progress

| Phase | Milestone | Plans Complete | Status      | Completed   |
|-------|-----------|----------------|-------------|-------------|
| 1. Safety Net | v1.0 | 3/3 | Complete | 2026-05-10 |
| 2. Decompose and Tax Engine | v1.0 | 4/4 | Complete | 2026-05-10 |
| 3. Durable Persistence | v1.0 | 4/4 | Complete | 2026-05-12 |
| 4. Bookkeeping Core | v1.0 | 4/4 | Complete | 2026-05-13 |
| 5. Tax Outputs | v1.0 | 4/4 | Complete | 2026-05-28 |
| 6. Personas, Wizard, and Deployment | v1.0 | 4/4 | Complete | 2026-05-29 |
| 7. ImportTB UX Rework | v1.1 | 4/4 | Complete | 2026-05-30 |
| 8. Family Medicare Levy Engine | v1.1 | 3/3 | Complete | 2026-05-30 |
| 9. Exports + Polish + Cleanup | v1.1 | 0/? | Not started | — |

## Research Flags

**Before Phase 7 begins:**
- Confirm current Xero / MYOB / QuickBooks / Excel TB-export shapes (recent exports from each tool, at least one each) — fixtures drive header-detection + subtotal-detection heuristics
- ATO definition of "trial balance" vs "general ledger" — some accounting tools export both interchangeably; ImportTB should reject GL-shape and only accept TB-shape (or detect and adapt)

**Before Phase 8 begins:**
- Confirm FY2026 family Medicare levy thresholds against current ATO Individual tax return instructions (NAT 2541 / NAT 2542) — lower threshold + upper threshold + per-dependant-child amount + MLS family thresholds
- Reconcile against existing `src/lib/tax/rates/fy2026/medicare.ts` which currently ships single-person thresholds only

**Before Phase 9 begins:**
- Confirm Excel/Sheets CSV import behaviour with the proposed `code, name, ...` column order — ensure leading zeros on codes aren't silently stripped (Excel pain point); UTF-8 BOM may be needed for non-ASCII account names
