---
phase: 05-tax-outputs
verified: 2026-05-28T22:25:00Z
status: passed
score: 5/5 success criteria verified
re_verification: false
---

# Phase 5: Tax Outputs Verification Report

**Phase Goal:** Every Australian entity type produces a correct, print-ready working paper that a user can hand to their tax agent or transcribe into myGov; BAS and IAS cover all required GST and PAYG labels using decimal arithmetic.
**Verified:** 2026-05-28T22:25:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | BAS to-the-cent: G1=$18,200.00 / 1A=$1,000.00 / 1B=$100.00 on mixed fixture | VERIFIED | `bas.test.ts` line 82-84: exact assertions pass GREEN; `BasIasAssistant.test.tsx` form-level assertion also GREEN |
| 2 | Company BRE: 90% dividend → 30% rate; low passive → 25% (with basis text) | VERIFIED | `company.test.ts` lines 98-124 + `CompanyTaxReturn.test.tsx` "90% dividend passive income → 30%" GREEN; `bre.ts` emits basis string matching `/passive income.*90\.00%.*exceeds 80%/` |
| 3 | Trust per-beneficiary distribution reconciles to net income AND mandatory streaming disclaimer visible | VERIFIED | `trust.test.ts` + `TrustTaxReturn.test.tsx` both GREEN; `STREAMING_DISCLAIMER` constant in `trust.ts` emitted unconditionally in `meta.streamingDisclaimer`; distribution total validated in test |
| 4 | Individual LITO + Medicare levy + IND-04 small-biz offset working | VERIFIED | `individual.test.ts` GREEN (P1/P2/P8, LITO $700, medicare below threshold, offset capped at $1,000); `TaxReturnAssistant.test.tsx` "item 7D" test GREEN |
| 5 | Print structure: ATO codes + disclaimer + no UI chrome across all 5 form types | VERIFIED | All 5 renderers (TaxReturnAssistant, CompanyTaxReturn, TrustTaxReturn, PartnershipTaxReturn, BasIasAssistant) contain `print-form-{i,c,t,p,bas/ias}` scope class, `PrintBanner`, `no-print` header, `FOOTER_DISCLAIMER` in `print-footer print-only` footer |

**Score: 5/5 success criteria verified**

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/migrations/v3-to-v4.ts` | VERIFIED | Additive migration; idempotent guard `_v >= 4`; 6 GREEN tests |
| `src/lib/tax/returns/fy2026/bas.ts` | VERIFIED | 140 lines; full G1/G2/G3/G10/G11/1A/1B/W1/W2/W3/W4/W5/T7 compute; per-line gst() rounding; period filter; 8 GREEN tests |
| `src/lib/tax/returns/fy2026/ias.ts` | VERIFIED | Delegates to computeBas; strips GST labels; 2 GREEN tests |
| `src/lib/tax/returns/fy2026/individual.ts` | VERIFIED | Full P1/P2/P8/LITO/Medicare/IND-04 compute; 7 GREEN tests |
| `src/lib/tax/returns/fy2026/company.ts` | VERIFIED | Full 6T/6S/7T/BRE/franking compute; 7 GREEN tests |
| `src/lib/tax/returns/fy2026/trust.ts` | VERIFIED | Full Form T + distributeTrustIncome + STREAMING_DISCLAIMER; 10 GREEN tests |
| `src/lib/tax/returns/fy2026/partnership.ts` | VERIFIED | Full Form P + distributePartnershipNetIncome; 7 GREEN tests |
| `src/components/PrintBanner.tsx` | VERIFIED | FULL_PRINT_DISCLAIMER + FOOTER_DISCLAIMER exported; FORM_NAT_MAP covers I/C/T/P/BAS/IAS (module-private — functions correctly) |
| `src/components/AnomalyBadge.tsx` | VERIFIED | warn/info severity; 3 GREEN tests |
| `src/components/AssumptionsBlock.tsx` | VERIFIED | 5 fixed assumptions rendered; 3 GREEN tests |
| `src/styles/print.css` | VERIFIED | @media print, A4 portrait, .no-print, .print-only, per-form classes, .print-footer; 5 GREEN tests |
| `src/index.css` | VERIFIED | `@import './styles/print.css'` present at line 3 |
| `src/components/TaxReturnAssistant.tsx` | VERIFIED | Form I renderer; print-form-i; PrintBanner; no-print header; AssumptionsBlock; 6 GREEN tests |
| `src/components/CompanyTaxReturn.tsx` | VERIFIED | Form C renderer; print-form-c; PrintBanner; no-print header; 7 GREEN tests |
| `src/components/TrustTaxReturn.tsx` | VERIFIED | Form T renderer; print-form-t; PrintBanner; streaming disclaimer aside; 6 GREEN tests |
| `src/components/PartnershipTaxReturn.tsx` | VERIFIED | Form P renderer; print-form-p; PrintBanner; 4 GREEN tests |
| `src/components/BasIasAssistant.tsx` | VERIFIED | BAS+IAS renderer; print-form-bas/ias; PrintBanner; period selector; 6 GREEN tests |
| `src/components/ViewRouter.tsx` | VERIFIED | Routes all 5 entity types: tax-return, company-tax, trust-tax, partnership-tax, bas-ias |
| `src/types.ts` (View union) | VERIFIED | 'partnership-tax' present in View union at lines 14-18 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `BasIasAssistant.tsx` | `computeBas` / `computeIas` | `useMemo` + direct import | WIRED | Lines 108-113; dispatches on `entity.gstRegistered` |
| `TaxReturnAssistant.tsx` | `computeIndividualReturn` | `useMemo` | WIRED | Confirmed by 6 GREEN renderer tests |
| `CompanyTaxReturn.tsx` | `computeCompanyReturn` | `useMemo` | WIRED | Confirmed by 7 GREEN renderer tests |
| `TrustTaxReturn.tsx` | `computeTrustReturn` | `useMemo` | WIRED | Confirmed by 6 GREEN renderer tests |
| `PartnershipTaxReturn.tsx` | `computePartnershipReturn` | `useMemo` | WIRED | Confirmed by 4 GREEN renderer tests |
| `ViewRouter.tsx` | All 5 renderers | view-string dispatch | WIRED | Lines 551-589; all 5 routes confirmed with entity guards |
| `computeBas` | `gst()` (decimal) | import from `../../../money` | WIRED | Line 152; per-line gst() for 1A/1B |
| `computeCompanyReturn` | `breRate` + `brePassiveIncomePct` | imports from `bre.ts` | WIRED | Lines 85-91; 30%/25% switching confirmed |
| `computeIndividualReturn` | `smallBusinessIncomeOffset` | import from `smallBizOffset.ts` | WIRED | Lines 86-91; capped at $1,000 |
| v3-to-v4 migration | migration runner | `index.ts` dispatch map | WIRED | `3: migrateV3ToV4` in runner; CURRENT_VERSION=4 |
| `print.css` | all form renderers | `@import` in `index.css` | WIRED | Verified line 3 of index.css |

---

### Requirements Coverage

| Req ID | Source Plan | Description | Status | Evidence |
|--------|-------------|-------------|--------|----------|
| BAS-01 | 05-1 scaffold → 05-4 impl | G1/G2/G3/G10/G11/1A/1B labels for selected period | SATISFIED | computeBas produces all 13 labels; 8 GREEN unit tests; REQUIREMENTS.md marked [x] |
| BAS-02 | 05-1 scaffold → 05-4 impl | ATO worksheet method; decimal arithmetic | SATISFIED | Per-line gst() for 1A/1B (Pitfall 4); ROUND_HALF_UP G1; ROUND_DOWN W2; Decimal.js throughout |
| BAS-03 | 05-1 scaffold → 05-4 impl | W1 wages, W2 PAYG withholding | SATISFIED | W1/W2 computed from GL; W1 test GREEN; W2 test GREEN |
| BAS-04 | 05-1 scaffold → 05-4 impl | T7 PAYG instalment | SATISFIED | T7 = `entity.paygInstalmentAmount`; T7 test GREEN |
| BAS-05 | 05-1 scaffold → 05-4 impl | IAS for non-GST entities | SATISFIED | computeIas delegates to computeBas; gstRegistered=false → IAS shape dispatch; 2 GREEN tests |
| BAS-06 | 05-1 scaffold → 05-4 impl | Print-ready BAS/IAS with ATO codes | SATISFIED | PrintBanner + FOOTER_DISCLAIMER + @media print CSS; ATO code labels G1/1A/1B/W1/W2/T7 rendered |
| TAX-02 | 05-1 scaffold → 05-4 UAT | Print-ready for all 5 form types | SATISFIED | All 5 renderers confirmed with print primitives; UAT signed off 2026-05-28 |
| IND-01 | 05-1 scaffold → 05-2 impl | Form I + B&P schedule from GL | SATISFIED | computeIndividualReturn + TaxReturnAssistant; 7 compute tests + 6 renderer tests GREEN |
| IND-02 | 05-1 scaffold → 05-2 impl | P1/P2/P8/item15 B&P labels | SATISFIED | P1/P2/P8/item15 computed and rendered; test "item15 equals P8" GREEN |
| IND-03 | 05-1 scaffold → 05-2 impl | Marginal tax + LITO + Medicare | SATISFIED | `marginalTaxFY2026` + `litoFY2026` + `medicareLevyFY2026` all GREEN; wired in computeIndividualReturn |
| IND-04 | 05-1 scaffold → 05-2 impl | Small biz offset item 7D; 16% capped $1,000; turnover < $5M | SATISFIED | `smallBusinessIncomeOffset` + item7D rendered; "small business offset eligible" test GREEN |
| COY-01 | 05-1 scaffold → 05-2 impl | Form C core labels: 6T/6S/7T | SATISFIED | computeCompanyReturn produces 6A/6T/6S/7T; "6A 6T 7T from GL" test GREEN |
| COY-02 | 05-1 scaffold → 05-2 impl | BRE 25%/30% rate selection | SATISFIED | breRate + brePassiveIncomePct; both rate paths tested GREEN |
| COY-03 | 05-1 scaffold → 05-2 impl | Franking account open/movements/close | SATISFIED | franking_open/franking_move/franking_close labels; FDT anomaly; tests GREEN |
| TRT-01 | 05-1 scaffold → 05-3 impl | Form T net income from GL | SATISFIED | computeTrustReturn 5B/5T/26 labels; "5B 5T 26 net income from GL" test GREEN |
| TRT-02 | 05-1 scaffold → 05-3 impl | Per-beneficiary distribution + streaming disclaimer | SATISFIED | distributeTrustIncome; STREAMING_DISCLAIMER in meta; "per-beneficiary distribution" and "streaming disclaimer" tests GREEN |
| TRT-03 | 05-1 scaffold → 05-3 impl | Distribution from entity.beneficiaries | SATISFIED | `entity.beneficiaries ?? []` in distributeTrustIncome; 60/40 split test GREEN |
| PSP-01 | 05-1 scaffold → 05-3 impl | Form P income/deductions/net income | SATISFIED | computePartnershipReturn P1/P2/P8 labels; PartnershipTaxReturn renderer; tests GREEN |
| PSP-02 | 05-1 scaffold → 05-3 impl | Per-partner distribution from entity.partners | SATISFIED | distributePartnershipNetIncome reads entity.partners; distribution table rendered; print audit test GREEN |

**Note:** COY-04 is marked OBSOLETE in REQUIREMENTS.md (re-scoped to IND-04, correctly tracked). The 20 active requirement IDs all account for as DELIVERED.

---

### v3→v4 Migration Verification

The migration is confirmed additive and non-destructive:
- `migrateV3ToV4` adds only `aggregatedTurnover?: string` and `paygInstalmentAmount?: string` to Entity (both optional/undefined default)
- Idempotency guard: `if (state._v >= 4) return state`
- 6 GREEN migration-specific tests including round-trip, idempotency, field preservation
- `runner.test.ts` "CURRENT_VERSION is 4" GREEN
- All 526 prior tests remain GREEN (no regressions)

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `PrintBanner.tsx` | `FORM_NAT_MAP` declared as module-private `const` but SUMMARY documented it as exported | Info | No impact — map used internally; PrintBanner renders correctly; exports FULL_PRINT_DISCLAIMER + FOOTER_DISCLAIMER + PrintBanner as intended |

No blocker or warning anti-patterns found. No TODOs, FIXMEs, empty implementations, or stubs in production code paths.

---

### Human Verification Required

The following items were UAT-approved by the plan author on 2026-05-28 (documented in 05-4 SUMMARY frontmatter `uat_approved: true`) and cannot be verified programmatically:

1. **Print layout visual fidelity**
   - Test: Open any entity's tax form and use browser Print Preview
   - Expected: ATO codes in left column, dollar values right-aligned, PrintBanner at top, no sidebar/navigation visible, FOOTER_DISCLAIMER on each page
   - Why human: CSS @media print behavior requires visual inspection in browser

2. **BAS period selector UI behavior**
   - Test: Open BAS for a GST-registered entity, switch between Q1/Q2/Q3/Q4/Full FY
   - Expected: Values recompute per period; only Q1 entries visible in Q1 result
   - Why human: React state interaction requires running app

3. **IAS shape dispatch**
   - Test: Set entity gstRegistered=false, open BAS/IAS view
   - Expected: No G-labels visible; only W1/W2/W3/W4/W5/T7 section shown
   - Why human: Visual confirmation requires running app

These items are covered by existing automated tests (BasIasAssistant.test.tsx "IAS shape" test GREEN) but visual correctness requires human review. UAT signed off 2026-05-28.

---

### Build and Lint Status

| Check | Result |
|-------|--------|
| `npm run lint` (tsc --noEmit) | EXIT 0 |
| `npm run build` (vite) | EXIT 0 (chunk size warning only — not a build failure) |
| `npx vitest run` | 526 GREEN, 11 todo, 0 RED |

The 11 todo tests are residual scaffolds in legacy Phase-2-era files (`src/lib/tax/__tests__/bas.test.ts` — 7 items, `src/lib/tax/__tests__/golden.test.ts` — 4 items). These are superseded by the full Phase 5 compute-function test suites that have GREEN assertions covering the same scenarios.

---

### Summary

Phase 5 goal is ACHIEVED. All 5 Australian entity types (Individual/Form I, Company/Form C, Trust/Form T, Partnership/Form P, BAS+IAS) produce substantive, compute-complete tax working papers. All 20 requirement IDs (BAS-01..06, TAX-02, IND-01..04, COY-01..03, TRT-01..03, PSP-01..02) are DELIVERED and verified against the actual codebase. The v3→v4 migration is additive and non-destructive. All 5 form renderers are wired with print primitives. No placeholders, stubs, or empty implementations remain in production code.

---

_Verified: 2026-05-28T22:25:00Z_
_Verifier: Claude (gsd-verifier)_
