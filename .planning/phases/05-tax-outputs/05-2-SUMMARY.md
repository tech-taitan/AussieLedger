---
phase: 05-tax-outputs
plan: 2
subsystem: tax-outputs
tags: [individual, company, form-i, form-c, bre, franking, lito, medicare, ind-04, entity-form]
dependency_graph:
  requires: [05-1]
  provides: [individual-return, company-return, form-i-renderer, form-c-renderer, entity-form-v4]
  affects: [05-4]
tech_stack:
  added: []
  patterns: [rollupByLabel via taxLabel/companyTaxLabel, computeIndividualReturn, computeCompanyReturn, BRE passive income test, React useMemo for tax compute, LabelRow helper component]
key_files:
  created: []
  modified:
    - src/lib/tax/returns/fy2026/individual.ts
    - src/lib/tax/returns/fy2026/company.ts
    - src/lib/tax/returns/fy2026/__tests__/individual.test.ts
    - src/lib/tax/returns/fy2026/__tests__/company.test.ts
    - src/components/TaxReturnAssistant.tsx
    - src/components/__tests__/TaxReturnAssistant.test.tsx
    - src/components/CompanyTaxReturn.tsx
    - src/components/__tests__/CompanyTaxReturn.test.tsx
    - src/components/EntityForm.tsx
    - src/components/__tests__/EntityForm.test.tsx
decisions:
  - "React 19 requires key on wrapper element in .map() — <span key={a.id}><AnomalyBadge .../></span> not <AnomalyBadge key={a.id} .../>"
  - "computeIndividualReturn and computeCompanyReturn accept entity? (optional) for backward compat with Phase 2 smoke tests that omit entity"
  - "P1 = 6S+B+C+6K+J; P2 = 6L+6N+6Q+K+L+F+E+G+H+I — computed from rollupByLabel<IndividualLabel> with taxLabel field"
  - "Franking account detection: accounts with companyTaxLabel='franking_open'; FY boundary = Date.UTC(fyYear-1, 6, 1); entries before = opening, entries in FY = movements"
  - "BRE 30% basis text format: '30% applied — passive income (BREPI) 90.00% exceeds 80% threshold (s.23AA + s.23AB, Income Tax Rates Act 1986)'"
  - "structural.test.ts no-new-Date rule flags PartnershipTaxReturn.tsx + TrustTaxReturn.tsx (05-3 files); deferred to deferred-items.md — out of scope for 05-2"
metrics:
  duration_minutes: 180
  completed_date: "2026-05-28"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 10
  tests_added: 27
  tests_green: 27
---

# Phase 5 Plan 2: Individual + Company Tax Outputs Summary

**One-liner:** computeIndividualReturn (Form I + B&P + LITO + Medicare + IND-04 offset) + computeCompanyReturn (Form C + BRE 25%/30% + franking account + FDT anomaly) + Form I/C renderers + EntityForm v4 fields — 27 new GREEN tests, success criteria #2 and #4 locked end-to-end.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | computeIndividualReturn + computeCompanyReturn | 0c6765d | individual.ts, company.ts, individual.test.ts, company.test.ts |
| 2 | TaxReturnAssistant refactor (Form I) | dddc566 | TaxReturnAssistant.tsx, TaxReturnAssistant.test.tsx |
| 3 | CompanyTaxReturn + EntityForm | d5cb6f5 | CompanyTaxReturn.tsx, CompanyTaxReturn.test.tsx, EntityForm.tsx, EntityForm.test.tsx |

---

## What Was Built

### Task 1: computeIndividualReturn + computeCompanyReturn

**computeIndividualReturn** (`src/lib/tax/returns/fy2026/individual.ts`):
- Rolls GL via `rollupByLabel<IndividualLabel>(entries, accounts, 'taxLabel')`
- P1 = raw['6S'] + raw['B'] + raw['C'] + raw['6K'] + raw['J'] (gross business income)
- P2 = raw['6L'] + raw['6N'] + raw['6Q'] + raw['K'] + raw['L'] + raw['F'] + raw['E'] + raw['G'] + raw['H'] + raw['I'] (deductions)
- P8 = P1 - P2; item15 = P8 (flow-through)
- LITO via `litoFY2026(item15)` → label T1
- Medicare via `medicareLevyFY2026({ taxableIncome: item15, hasPHC: true, filingStatus: 'single' })` → M1 (levy) + M2 (surcharge)
- IND-04 via `smallBusinessIncomeOffset({ netSbIncome: p8, aggregatedTurnover, totalTaxableIncome: item15, taxBeforeOffsets })` → label item7D
- 5 fixed assumption anomalies (info severity): marital-single, age-under-65, medicare-no-exempt, phc-assumed, dependants-zero
- Locked-FY anomaly, negative-P8 non-commercial-loss anomaly
- meta: taxBeforeOffsets, taxAfterOffsets, sbOffsetBasis, medicareBasis, aggregatedTurnover

**computeCompanyReturn** (`src/lib/tax/returns/fy2026/company.ts`):
- Rolls GL via `rollupByLabel<CompanyLabel>(entries, accounts, 'companyTaxLabel')`
- total6T = 6A + 6D + 6E + 6F + 6H + 6R (total income)
- total6S = 6C + 6G + 6Q + 6U + 6X (total expenses)
- taxable7T = total6T - total6S
- BRE: `brePassiveIncomePct(accounts, entries, fy)` + `breRate({ passivePct, aggregatedTurnover, totalAssessable })`
- Tax payable CS_B = max(0, taxable7T × rate)
- Franking account: accounts where `companyTaxLabel === 'franking_open'`; FY start = `Date.UTC(fyYear-1, 6, 1)`; entries before FY start = opening, entries in FY = movements; closing = opening + movements
- FDT anomaly when closing < 0
- BRE borderline anomaly (70-90% passive) and locked-FY anomaly

**Tests (14 GREEN):**
- individual.test.ts: 7 tests — P1/P2/P8 rollup, item15 flow-through, LITO+Medicare at $30k, IND-04 offset eligible, 5 assumption anomalies, locked-FY, empty entries
- company.test.ts: 7 tests — 6A/6T/7T rollup, BRE 25% (10% passive), BRE 30% (90% dividend — success criterion #2), franking CS equality, FDT warn, borderline 75% warn, locked-FY

### Task 2: TaxReturnAssistant (Form I renderer)

- Wraps output in `<section className="print-form-i">` (CSS print scoping)
- `PrintBanner` (print-only header) + screen header with entity name + FY
- Print button: "Print working paper" / "Print finalised return" (locked FY), calls `addLog?.('EXPORT_DATA', JSON.stringify({...}), entity.id)` then `window.print()`
- Main Return section: item15 + tax calculation rows (marginal, T1 LITO, M1 Medicare, M2 MLS, item7D IND-04, tax after offsets)
- B&P schedule section: P1/P2/P8 + sub-labels (B, C, E, F, G, H, I, J, K, L, N) only shown when value > 0
- `<AssumptionsBlock />` always rendered (5 fixed assumptions per CONTEXT decision)
- Consolidated anomaly section at bottom with `<AnomalyBadge>` per anomaly
- `<footer className="print-footer print-only">` with FOOTER_DISCLAIMER
- entity? optional (DEFAULT_ENTITY fallback for Phase 2 smoke test backward compat)
- onUpdateAccount? legacy prop kept for smoke test compat, not used

**Tests (6 GREEN):**
- Renders Form I heading with entity name + FY
- Renders P1/P2/P8 labels
- Print button emits EXPORT_DATA audit with '"form":"I"'
- Renders AssumptionsBlock
- Renders B&P schedule section heading
- AnomalyBadges render when anomalies present

### Task 3: CompanyTaxReturn (Form C renderer) + EntityForm v4

**CompanyTaxReturn:**
- Wraps output in `<section className="print-form-c">` (CSS print scoping)
- Print button → EXPORT_DATA with `{ form: 'C', fy }`
- Prominent "Applied Tax Rate" box: `{taxRatePct}% applied` + basis text (explicit for success criterion #2 visual requirement)
- Income section: 6A / 6F / 6H / 6T (total income highlighted)
- Expenses section: 6C / 6G / 6X / 6S (total expenses highlighted)
- Taxable Income section: 7T / CS_B (tax payable highlighted)
- Franking Account section: franking_open / franking_move / franking_close
- Consolidated anomaly section

**EntityForm v4 additions:**
- `aggregatedTurnover` text field, aria-label "Aggregated turnover ($)", id "entity-aggregated-turnover"
- Helper text: "Includes connected entities + affiliates per s.328-115..."
- `paygInstalmentAmount` text field, aria-label "PAYG instalment amount (T7, Method 1)", id "entity-payg-instalment"
- Helper text: "Method 1: enter the pre-calculated instalment amount from your ATO portal."
- Both fields write back to formData on change; persisted on save

**Tests (9 GREEN):**
- CompanyTaxReturn: 7 tests — Form C labels present, 25% BRE rate, franking section visible, print EXPORT_DATA audit, borderline 75% badge, locked FY "Print finalised return", 30% success criterion #2 with basis text regex
- EntityForm Phase 5: 2 tests — aggregatedTurnover field present + saved, paygInstalmentAmount field present + saved

---

## Success Criteria Verification

| Criterion | Status | Evidence |
|-----------|--------|---------|
| #2 Company 30% BRE — 90% dividend fixture | GREEN | company.test.ts + CompanyTaxReturn.test.tsx both pass; basis text matches `/passive income.*90\.00%.*exceeds 80%/` |
| #4 Individual P1/P2/P8 + LITO + Medicare + IND-04 | GREEN | individual.test.ts GREEN + TaxReturnAssistant renders all labels |
| #5 Print scoping | PARTIAL | `print-form-i` + `print-form-c` CSS classes present; full visual UAT deferred to Plan 05-4 |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] React 19 TypeScript key prop type error**
- **Found during:** Task 2 + Task 3
- **Issue:** React 19 changed key prop semantics — `<AnomalyBadge key={a.id} .../>` in `.map()` triggers "Type '{ key: string; ... }' is not assignable to type 'AnomalyBadgeProps'" because key is no longer implicitly typed on custom component props
- **Fix:** Wrapped custom components in `<span key={a.id}><AnomalyBadge .../></span>` and `<div key={code}><LabelRow .../></div>` in all `.map()` calls
- **Files modified:** TaxReturnAssistant.tsx, CompanyTaxReturn.tsx
- **Commit:** dddc566, d5cb6f5

**2. [Rule 3 - Blocking] Missing gstCode on Account fixture**
- **Found during:** Task 1
- **Issue:** Account interface requires `gstCode` field (added Phase 4); all test fixtures were missing it; TypeScript error blocked compilation
- **Fix:** Added `gstCode: 'GST'` or `gstCode: 'N-T'` to all Account objects in individual.test.ts and company.test.ts
- **Files modified:** individual.test.ts, company.test.ts
- **Commit:** 0c6765d

**3. [Rule 1 - Bug] Decimal import path in test file**
- **Found during:** Task 1
- **Issue:** `import { Decimal } from '../../../../lib/money'` was incorrect path from `src/lib/tax/returns/fy2026/__tests__/` to `src/lib/money.ts` — needs `'../../../../money'` (4 levels up, then `money`)
- **Fix:** Corrected to `import { Decimal } from '../../../../money'`
- **Files modified:** individual.test.ts, company.test.ts
- **Commit:** 0c6765d

**4. [Rule 1 - Bug] BRE basis text regex mismatch**
- **Found during:** Task 1
- **Issue:** Test expected `/passive income 90\.00% exceeds 80%/` but actual bre.ts output is `"...passive income (BREPI) 90.00% exceeds 80%..."` (includes "(BREPI)" between "passive income" and the percentage)
- **Fix:** Changed regex to `/passive income.*90\.00%.*exceeds 80%/` (uses `.*` to skip the "(BREPI)" substring)
- **Files modified:** company.test.ts
- **Commit:** 0c6765d

**5. [Rule 3 - Blocking] Smoke test backward compat — entity prop required**
- **Found during:** Task 2
- **Issue:** Phase 2 smoke test passes `onUpdateAccount` but not `entity` to TaxReturnAssistant; original Phase 5 prop contract made `entity` required
- **Fix:** Made `entity?` optional with `DEFAULT_ENTITY` fallback; kept `onUpdateAccount?` as legacy no-op prop
- **Files modified:** TaxReturnAssistant.tsx (same fix applied to CompanyTaxReturn.tsx proactively)
- **Commit:** dddc566, d5cb6f5

### Out-of-Scope Items (Deferred)

The structural.test.ts `no-new-Date()` rule fails due to `PartnershipTaxReturn.tsx` and `TrustTaxReturn.tsx` (committed in plan 05-3) using `new Date().toISOString()`. These files are owned by plan 05-3, not 05-2. The failure was introduced by the parallel agent. Logged to deferred-items.md.

---

## Test Count Delta

| File | Tests Before (todo) | Tests After (GREEN) |
|------|--------------------|--------------------|
| individual.test.ts | 7 it.todo | 7 GREEN |
| company.test.ts | 7 it.todo | 7 GREEN |
| TaxReturnAssistant.test.tsx | 6 it.todo | 6 GREEN |
| CompanyTaxReturn.test.tsx | 7 it.todo | 7 GREEN |
| EntityForm.test.tsx (Phase 5 block) | 2 it.todo | 2 GREEN |
| **Total** | **29 todo → 0** | **+29 GREEN** |

Total after 05-2: 508 SPA GREEN + 28 todo (1 structural test failing due to 05-3 new Date() — pre-existing from parallel plan)

---

## Build / Lint / Test Results

- `npm run build` EXIT 0 (dist/assets/index-uPkth5o1.js 1,373.66 kB — chunk size warning is pre-existing)
- `npm run lint` EXIT 0
- `npx vitest run` — 508 passed | 28 todo | 1 failed (structural.test.ts — out-of-scope 05-3 issue)
- All 05-2 owned test files: GREEN

---

## Self-Check: PASSED

All key files confirmed present. All 3 per-task commits confirmed in git log.

- FOUND: src/lib/tax/returns/fy2026/individual.ts
- FOUND: src/lib/tax/returns/fy2026/company.ts
- FOUND: src/components/TaxReturnAssistant.tsx
- FOUND: src/components/CompanyTaxReturn.tsx
- FOUND: src/components/EntityForm.tsx
- FOUND: commit 0c6765d (Task 1)
- FOUND: commit dddc566 (Task 2)
- FOUND: commit d5cb6f5 (Task 3)
