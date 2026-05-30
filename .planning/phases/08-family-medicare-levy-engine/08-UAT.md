---
phase: 8
slug: family-medicare-levy-engine
type: uat
status: in-progress
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

(To be filled in by Task 2)

| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| 1 | Single-parent (dependants=1, spouseIncome=blank, P8=30000) | | |
| 2 | DINK (dependants=blank, spouseIncome=80000, P8=90000) | | |
| 3 | 2-kid family (dependants=2, spouseIncome=100000, P8=130000) | | |
| 4 | Legacy v1.0 entity (both fields undefined — regression) | | |
| 5 | Bad spouseIncome (dependants=2, spouseIncome="abc") | | |

## Approval

(To be filled in by Task 3)
