---
phase: 08-family-medicare-levy-engine
plan: 3
subsystem: uat
tags: [uat, medicare-levy, family-thresholds, sign-off, MED-01, MED-02, MED-03, MED-04]
dependency_graph:
  requires:
    - 08-1 (v5-to-v6-migration, medicareLevyFamily, medicareLevySurchargeFamily, isFamilyFiling)
    - 08-2 (computeIndividualReturn-family-branch, AssumptionsBlock-dynamic-prop, EntityForm-Individual-fields)
  provides:
    - phase-8-uat-sign-off
    - MED-01-04-complete
  affects:
    - .planning/phases/08-family-medicare-levy-engine/08-UAT.md
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/ROADMAP.md
tech_stack:
  added: []
  patterns:
    - manual-uat
    - requirements-sign-off
key_files:
  created:
    - .planning/phases/08-family-medicare-levy-engine/08-UAT.md
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/ROADMAP.md
decisions: []
metrics:
  duration: IN PROGRESS (Task 1 complete; awaiting Task 2 UAT)
  completed: ~
  tasks: 1/3
  files: 1
---

# Phase 8 Plan 3: Wave 3 UAT — Manual Sign-Off

**Status: IN PROGRESS — Paused at Task 2 (human-verify checkpoint)**

Wave 3 UAT for the Phase 8 family Medicare levy engine. Task 1 (automated pre-gate) PASSED. Task 2 is a manual UAT checkpoint requiring the user to verify 5 end-to-end scenarios in the running app.

## Task 1: Pre-UAT Automated Verification — PASSED

| Check | Command | Result |
|-------|---------|--------|
| Full SPA test suite | `npx vitest run` | 910 GREEN / 0 RED / 11 todo |
| Lint | `npm run lint` | exit 0 |
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Production build | `npm run build` | exit 0 |

All 4 checks passed. 910 SPA GREEN — 16 above the 894 minimum baseline. Pre-gate PASSED.

**Task 1 commit:** `dec567a` — `docs(08-3): UAT pre-checks — full suite GREEN; ready for manual UAT`

## Task 2: Manual UAT Scenarios — PENDING USER SIGN-OFF

| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| 1 | Single-parent (dependants=1, spouseIncome=blank, P8=30000) | PENDING | |
| 2 | DINK (dependants=blank, spouseIncome=80000, P8=90000) | PENDING | |
| 3 | 2-kid family (dependants=2, spouseIncome=100000, P8=130000) | PENDING | |
| 4 | Legacy v1.0 entity (both fields undefined — regression) | PENDING | |
| 5 | Bad spouseIncome (dependants=2, spouseIncome="abc") | PENDING | |

## Task 3: Sign-Off — PENDING UAT COMPLETION

MED-01..04 REQUIREMENTS.md update, STATE.md + ROADMAP.md advancement, and UAT.md approval block to be completed after user signs off all 5 scenarios.

## Deviations from Plan

None — Task 1 executed exactly as written.

## Self-Check: PARTIAL (Task 1 only)

- [x] `dec567a` commit exists in git history
- [x] `.planning/phases/08-family-medicare-levy-engine/08-UAT.md` exists with `status: in-progress` and filled pre-check table
- [ ] Task 2 UAT pending user verification
- [ ] Task 3 sign-off pending
