---
phase: 8
slug: family-medicare-levy-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-30
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling. Derived from `08-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 |
| **Config file** | `vite.config.ts` (Vitest config embedded) |
| **Quick run command** | `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts src/lib/migrations/__tests__/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5s quick, ~90s full (after Phase 8 adds ~25 tests → ~873 expected) |

---

## Sampling Rate

- **After every task commit:** `npx vitest run src/lib/tax/rates/__tests__/ src/lib/migrations/__tests__/`
- **After every plan wave:** `npx vitest run`
- **Before `/gsd:verify-work 8`:** Full suite green (848+ SPA GREEN, 0 RED)

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Automated Command | File | Status |
|--------|----------|-----------|-------------------|------|--------|
| MED-01 | v5→v6 migration adds `dependants`/`spouseIncome` as undefined; bumps `_v` to 6 | unit | `npx vitest run src/lib/migrations/__tests__/v5-to-v6.test.ts` | ❌ W0 | ⬜ pending |
| MED-01 | Round-trip v0→v6 preserves all existing fields; new fields default undefined | unit | `npx vitest run src/lib/migrations/__tests__/round-trip.test.ts` | extend | ⬜ pending |
| MED-01 | `CURRENT_VERSION = 6` registered in migrations/index.ts | unit | `npx vitest run src/lib/migrations/__tests__/index.test.ts` | extend | ⬜ pending |
| MED-01 | EntitySchema validates `dependants` (int ≥ 0) and `spouseIncome` (decimal string, optional) | unit | `npx vitest run src/lib/__tests__/schemas.test.ts` (if exists) | extend or W0 | ⬜ pending |
| MED-02 | `isFamilyFiling`: both undefined → false; `spouseIncome` set → true; `dependants ≥ 1` → true; both set → true | unit | `npx vitest run src/lib/tax/returns/fy2026/__tests__/helpers.test.ts` | ❌ W0 | ⬜ pending |
| MED-02 | `medicareLevyFamily`: combined below effective lower → $0 | unit | `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts` | extend | ⬜ pending |
| MED-02 | `medicareLevyFamily`: combined in shade-in zone → shaded amount; constrained ≤ taxpayerIncome × 2% | unit | same | extend | ⬜ pending |
| MED-02 | `medicareLevyFamily`: combined above effective upper → full 2% of TAXPAYER income (not combined) | unit | same | extend | ⬜ pending |
| MED-02 | `medicareLevyFamily`: per-dependant lower increment $4,338, upper increment $5,422 (FY2026) | unit | same | extend | ⬜ pending |
| MED-02 | `medicareLevyFamily`: single-parent (spouseIncome `"0"`, dependants 2) at $50k income → correct value | unit (gold) | same | extend | ⬜ pending |
| MED-02 | `medicareLevyFamily`: DINK (dependants 0, spouseIncome `"100000"`) at $80k taxpayer → correct value | unit (gold) | same | extend | ⬜ pending |
| MED-02 | `medicareLevySurchargeFamily`: PHC=true → $0 regardless of income | unit | same | extend | ⬜ pending |
| MED-02 | `medicareLevySurchargeFamily`: Tier 1/2/3 thresholds applied to COMBINED income; surcharge applied to TAXPAYER income | unit | same | extend | ⬜ pending |
| MED-02 | `medicareLevySurchargeFamily`: per-dependant $1,500 increment shifts all 3 tier thresholds equally | unit | same | extend | ⬜ pending |
| MED-02 | `computeIndividualReturn`: entity with `dependants: 2 + spouseIncome: "60000"` → M1 + M2 match gold values | unit (gold) | `npx vitest run src/lib/tax/__tests__/individual.test.ts` | extend | ⬜ pending |
| MED-02 | `computeIndividualReturn`: entity with NO family fields → unchanged Phase 5 M1/M2 (regression) | unit (regression) | same | extend | ⬜ pending |
| MED-02 | `computeIndividualReturn`: bad `spouseIncome: "abc"` → family thresholds with $0 + Anomaly emitted (severity warn, label M1) | unit | same | extend | ⬜ pending |
| MED-02 | **Stale single Medicare lower threshold fixed** `$27,222 → $28,011` in constants.ts | unit (regression) | `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts` | extend | ⬜ pending |
| MED-02 | **Stale single Medicare upper threshold fixed** `$34,028 → $35,014` | unit (regression) | same | extend | ⬜ pending |
| MED-02 | **Stale MLS single Tier 3 fixed** `$144,000 → $158,000` | unit (regression) | same | extend | ⬜ pending |
| MED-02 | **Stale MLS family Tier 3 fixed** `$288,000 → $316,000` | unit (regression) | same | extend | ⬜ pending |
| MED-03 | `AssumptionsBlock` accepts optional `assumptions?: string[]` prop and renders dynamic rows | unit (component) | `npx vitest run src/components/__tests__/AssumptionsBlock.test.tsx` | extend | ⬜ pending |
| MED-03 | `AssumptionsBlock` falls back to default static assumptions when `assumptions` prop omitted | unit (component, regression) | same | extend | ⬜ pending |
| MED-03 | Form I family-eligible entity: assumption row `'Family Medicare levy applied — N dependants, spouse income $X. Family threshold $Y; per-dependant adjustment $Z.'` REPLACES the flat-2% warning | integration | `npx vitest run src/components/__tests__/TaxReturnAssistant.test.tsx` | extend | ⬜ pending |
| MED-03 | Form I non-family entity: existing flat-2% assumption row unchanged | integration (regression) | same | extend | ⬜ pending |
| MED-04 | EntityForm shows `dependants` + `spouseIncome` fields ONLY when type = Individual | component | `npx vitest run src/components/__tests__/EntityForm.test.tsx` | extend | ⬜ pending |
| MED-04 | EntityForm `dependants` field: blank input → `undefined` (not `"0"`); integer parsing preserved | component | same | extend | ⬜ pending |
| MED-04 | EntityForm `spouseIncome` field: blank input → `undefined`; decimal-string preserved on save | component | same | extend | ⬜ pending |
| MED-04 | Both fields hidden when entity type switches Individual → Company (existing values preserved in storage) | component | same | extend | ⬜ pending |
| MED-04 | Both fields render inline help text (one short sentence per field) | component | same | extend | ⬜ pending |
| REGRESSION | All 848 existing SPA tests stay GREEN end-of-phase | structural | `npx vitest run` | existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/migrations/__tests__/v5-to-v6.test.ts` — covers MED-01 (migration + idempotency + field preservation)
- [ ] `src/lib/tax/returns/fy2026/__tests__/helpers.test.ts` — covers `isFamilyFiling` predicate (3 base cases + edge cases for explicit `"0"` spouseIncome)
- [ ] Extend `src/lib/tax/rates/__tests__/medicare.test.ts` — add family-threshold cases AND update stale single-threshold boundary values to FY2025-26 figures
- [ ] Extend `src/lib/migrations/__tests__/round-trip.test.ts` — v0→v6 assertions; new fields default `undefined`
- [ ] Extend `src/lib/migrations/__tests__/index.test.ts` — `CURRENT_VERSION === 6`
- [ ] Framework install: none — Vitest already configured

**Wave 0 must add ZERO failing tests.** All new test cases either pass against the implementation Wave 0 ships (pure functions) or are `it.todo()` stubs until Wave 2.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Family-threshold assumption row visually replaces flat-2% warning on Form I print preview | MED-03 | Visual verification of print output | UAT: open an Individual entity with `dependants: 2 + spouseIncome: "60000"`, navigate to Tax Return → Form I, click "Print working paper" → verify family-threshold row visible, flat-2% warning absent |
| EntityForm dependants/spouseIncome fields render only for Individual type | MED-04 | Visual verification of conditional rendering | UAT: open EntityForm for an Individual entity → verify both fields visible in Tax & GST section; switch type to Company → verify both fields hidden |
| Single-parent case end-to-end | MED-02 | Real-data integration | UAT: Individual entity with `dependants: 1 + spouseIncome: undefined` → verify Form I shows family assumption row + M1 value matches single-parent gold calculation |
| DINK case end-to-end | MED-02 | Real-data integration | UAT: Individual entity with `dependants: 0 + spouseIncome: "80000"` → verify Form I shows family assumption row with 0 dependants + correct M1 |
| Legacy v1.0 entity (both fields undefined) end-to-end | MED-02 (regression) | Real-data integration; zero-regression assertion | UAT: existing Individual entity (no family fields set) → verify Form I unchanged from Phase 5 (single threshold + flat-2% warning intact) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (2 new test files + 3 extends)
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
