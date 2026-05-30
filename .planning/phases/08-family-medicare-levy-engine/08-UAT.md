---
phase: 8
slug: family-medicare-levy-engine
type: uat
status: approved
created: 2026-05-30
---

# Phase 8 — Manual UAT Sign-Off

**Purpose:** Validate the family Medicare levy engine end-to-end in the running app. Plans 08-1 + 08-2 ship the code + automated tests; this plan signs off the user experience.

## Pre-UAT Automated Verification

| Check | Command | Result |
|-------|---------|--------|
| Full SPA test suite | `npx vitest run` | 910 GREEN / 0 RED / 11 todo |
| Lint | `npm run lint` | exit 0 |
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Production build | `npm run build` | exit 0 |

**Expected baseline:** ≥ 894 SPA GREEN, 0 RED, 18 server GREEN unchanged. Phase 7 final was 848 SPA GREEN + 11 todo; Phase 8 added ~62 net tests across Plans 08-1 (~36) + 08-2 (~26).

**Actual result:** 910 GREEN — 16 tests above the 894 minimum baseline. All checks EXIT 0. Pre-gate PASSED.

## UAT Scenarios

| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| 1 | Single-parent (dependants=1, spouseIncome=blank, P8=30000) | PASS | M1=$0.00 (family threshold avoids levy); family assumption row rendered; flat-2% warning absent |
| 2 | DINK (dependants=blank, spouseIncome=80000, P8=90000) | PASS | M1=$1,800.00 (own income only, not combined); M2=$0.00; family assumption row with spouse income $80000 |
| 3 | 2-kid family (dependants=2, spouseIncome=100000, P8=130000) | PASS | M1=$2,600.00; M2=$1,300.00 (Tier 1 rate); family assumption row with 2 dependants + spouse income $100000 |
| 4 | Legacy v1.0 entity (both fields undefined — regression) | PASS | M1/M2 match Phase 5 single-engine output; all 5 original assumption strings present; family row absent; EntityForm shows blank conditional fields; type-switch hides/shows fields correctly |
| 5 | Bad spouseIncome (dependants=2, spouseIncome="abc") | PASS | M1=$0.00 (tolerant parse, spouse=$0 fallback); warn AnomalyBadge "Spouse income data invalid; family thresholds applied with $0 — verify input" present; family assumption row still rendered |

## UAT Sign-off

All 5 UAT scenarios PASSED. Phase 8 MED-01..04 requirements verified end-to-end. Signed off 2026-05-30.

## Approval

**Approved by:** Tristan
**Approval date:** 2026-05-30
**All 5 scenarios:** PASS

**Final test counts (post-UAT):**
- SPA: 910 GREEN / 0 RED / 11 todo
- Server: 18 GREEN
- Lint: EXIT 0; Build: EXIT 0; TypeScript: EXIT 0

**Requirements signed off:**
- [x] MED-01 — Entity v5→v6 schema migration (dependants + spouseIncome)
- [x] MED-02 — Real family Medicare levy threshold engine + family MLS
- [x] MED-03 — Form I family-threshold assumption row replaces flat-2% warning
- [x] MED-04 — EntityForm Individual-only conditional fields with default-undefined preservation

**Bonus shipped:** 4 stale FY2024-25 constants corrected to FY2025-26 (MEDICARE_LEVY_SINGLE_LOWER 27222→28011, MEDICARE_LEVY_SINGLE_UPPER 34028→35014, MLS_SINGLE_TIER_3 144000→158000, MLS_FAMILY_TIER_3 288000→316000) — Phase 5 latent bug closed as part of Wave 0 constants pass.
