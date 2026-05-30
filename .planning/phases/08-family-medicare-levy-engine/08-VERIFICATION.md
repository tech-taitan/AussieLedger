---
phase: 08-family-medicare-levy-engine
verified: 2026-05-30T16:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Form I print preview — family assumption row replaces flat-2% warning visually"
    expected: "Family threshold row renders in printed working paper; flat-2% warning absent for family entities"
    why_human: "Print output visual inspection cannot be verified programmatically. UAT scenarios 1–3 confirmed this passed."
---

# Phase 8: Family Medicare Levy Engine — Verification Report

**Phase Goal:** An Individual entity with dependants or a spouse income calculates Medicare levy using the real family thresholds — not the flat-2%-with-warning fallback Phase 5 shipped. Form I prints the family-variant calculation with assumption disclosure.

**Verified:** 2026-05-30T16:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | v5→v6 additive migration writes `dependants?` and `spouseIncome?` on entities; `CURRENT_VERSION = 6` | VERIFIED | `migrateV5ToV6` in `v5-to-v6.ts` sets both fields from existing data (default undefined); `index.ts` line 53: `export const CURRENT_VERSION = 6`; round-trip test (Test 2.1) covers v0→v6 chain asserting both new fields are undefined |
| 2 | `computeIndividualReturn` with `dependants: 2 + spouseIncome: "60000"` calls `isFamilyFiling` + family engine; levy computed on TAXPAYER income only | VERIFIED | `individual.ts` calls `isFamilyFiling(entity)`; when true, calls `medicareLevyFY2026` with `filingStatus: 'family'`; `medicareLevyFamily` applies full 2% to `taxableIncome` only (line 90); IND-FAM-1 gold test: combined 90000 ≥ effUpper → M1 = 30000 × 0.02 = 600.00 |
| 3 | Form I renders family-threshold assumption row with exact prescribed text, replacing flat-2% warning | VERIFIED | `individual.ts` emits `assumption-family-medicare` anomaly with text matching required format (IND-FAM-4 test); `TaxReturnAssistant.tsx` derives `assumptionRows` from anomalies filtered by `id.startsWith('assumption-')`; passes to `AssumptionsBlock assumptions={assumptionRows}` |
| 4 | EntityForm shows `dependants` + `spouseIncome` fields only for Individual entities; blank → undefined | VERIFIED | `EntityForm.tsx` line 491: `{formData.type === 'Individual' && ...}` wraps both fields; `dependants` onChange: `v === '' ? undefined : ...`; `spouseIncome` onChange: `v === '' ? undefined : v`; both fields have `<p className="text-xs text-gray-500">` inline help text |
| 5 | Legacy v1.0 entities (no family fields) use single-person Medicare unchanged; stale constants corrected | VERIFIED | IND-FAM-9 regression test: entity with no family fields → M1 = 198.90 (FY2026 corrected shade-in); `fy2026.ts`: `MEDICARE_LEVY_SINGLE_LOWER = '28011'`, `MEDICARE_LEVY_SINGLE_UPPER = '35014'`, `MLS_SINGLE_TIER_3 = '158000'`, `MLS_FAMILY_TIER_3 = '316000'` |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/migrations/v5-to-v6.ts` | v5→v6 additive migration | VERIFIED | 28 lines; maps entity fields `dependants` + `spouseIncome` from existing data (undefined by default); idempotent guard on line 18 |
| `src/lib/migrations/index.ts` | `CURRENT_VERSION = 6`; v5→v6 registered | VERIFIED | Line 53: `export const CURRENT_VERSION = 6`; line 50: migration 5 registered to `migrateV5ToV6` |
| `src/lib/tax/rates/fy2026/medicare.ts` | `medicareLevyFamily` + `medicareLevySurchargeFamily` + updated orchestrator | VERIFIED | 226 lines; both family functions are substantive (real threshold logic, not stubs); orchestrator `medicareLevyFY2026` branches on `filingStatus === 'family'` |
| `src/lib/tax/labels/fy2026.ts` | Corrected FY2026 constants for single/family Medicare | VERIFIED | `MEDICARE_LEVY_SINGLE_LOWER = '28011'`, `MEDICARE_LEVY_SINGLE_UPPER = '35014'`, `MLS_SINGLE_TIER_3 = '158000'`, `MLS_FAMILY_TIER_3 = '316000'`; family constants `MEDICARE_LEVY_FAMILY_LOWER = '47238'`, `MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER = '4338'`, `MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER = '5422'` |
| `src/lib/tax/returns/fy2026/_helpers.ts` | `isFamilyFiling` predicate | VERIFIED | Lines 98–102; `hasDependants = (entity.dependants ?? 0) >= 1`; `hasSpouseIncome = entity.spouseIncome !== undefined`; explicit `!== undefined` check preserves `"0"` triggering family |
| `src/lib/tax/returns/fy2026/individual.ts` | Family branch wired into compute function | VERIFIED | Lines 79–115; calls `isFamilyFiling`; tolerant parse of `spouseIncome`; passes `filingStatus: 'family'` + `dependants` + `spouseIncome` to `medicareLevyFY2026`; emits assumption anomaly |
| `src/components/AssumptionsBlock.tsx` | Additive `assumptions?: string[]` prop; backward-compat default | VERIFIED | Line 27: `assumptions?: string[]`; line 34: `const rows = assumptions ?? ASSUMPTIONS` — when omitted, falls back to static list |
| `src/components/TaxReturnAssistant.tsx` | Derives assumption rows from result.meta; passes to AssumptionsBlock | VERIFIED | Lines 132–134: `assumptionRows` derived from `result.meta.anomalies.filter(a => a.id.startsWith('assumption-')).map(a => a.message)`; line 254: `<AssumptionsBlock assumptions={assumptionRows} />` |
| `src/components/EntityForm.tsx` | Individual-only conditional fields with help text and blank→undefined | VERIFIED | Line 491: conditional `{formData.type === 'Individual' && ...}`; both handlers map `'' => undefined`; both have `<p className="text-xs text-gray-500">` help paragraph |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `individual.ts` | `_helpers.ts::isFamilyFiling` | import + call at line 79 | WIRED | `import { rollupByLabel, isFamilyFiling }` line 17; called at line 79 |
| `individual.ts` | `medicare.ts::medicareLevyFY2026` | import + call at line 109 | WIRED | `import { medicareLevyFY2026 }` line 20; called with `filingStatus: isFamily ? 'family' : 'single'` |
| `medicareLevyFY2026` | `medicareLevyFamily` | called in family branch | WIRED | Line 200: `levy = medicareLevyFamily(taxableIncome, spouseDecimal, deps)` |
| `medicareLevyFY2026` | `medicareLevySurchargeFamily` | called in family branch | WIRED | Line 201: `surcharge = medicareLevySurchargeFamily(combined, taxableIncome, hasPHC, deps)` |
| `TaxReturnAssistant.tsx` | `AssumptionsBlock` | import + `assumptions={assumptionRows}` | WIRED | Line 23: `import { AssumptionsBlock }`; line 254: `<AssumptionsBlock assumptions={assumptionRows} />` |
| `migrate()` | `migrateV5ToV6` | MIGRATIONS registry key 5 | WIRED | `index.ts` line 50: `5: migrateV5ToV6` |

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| MED-01 | Entity v5→v6 schema migration; `dependants?` + `spouseIncome?` fields; round-trip test | SATISFIED | `v5-to-v6.ts` ships the migration; `CURRENT_VERSION = 6`; `v5-to-v6.test.ts` has 6 tests; `round-trip.test.ts` extends to v0→v6 with assertions on both new fields being undefined; REQUIREMENTS.md line 25: `[x] MED-01` |
| MED-02 | Family Medicare levy threshold engine in `computeIndividualReturn`; real thresholds replace flat-2% fallback | SATISFIED | `medicareLevyFamily` + `medicareLevySurchargeFamily` implemented; both pure functions use per-dependant increments ($4338 lower, $5422 upper — not conflated); levy applied to own income only; 37+ tests across medicare.test.ts + individual.test.ts; REQUIREMENTS.md line 26: `[x] MED-02` |
| MED-03 | Form I displays family-threshold assumption row replacing flat-2% warning | SATISFIED | `AssumptionsBlock` has additive `assumptions?` prop; `TaxReturnAssistant` derives rows from anomalies; family row text matches prescribed format; IND-FAM-4 test validates exact text; REQUIREMENTS.md line 27: `[x] MED-03` |
| MED-04 | EntityForm exposes fields only for Individual type; defaults undefined; inline help text | SATISFIED | Fields conditionally rendered with `formData.type === 'Individual'`; both handlers map blank → undefined; both have paragraph help text; REQUIREMENTS.md line 28: `[x] MED-04` |

---

### Anti-Patterns Scanned

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `medicare.ts` | 214 | `Number(MEDICARE_LEVY_RATE)` | INFO | Acceptable — applied to a rate constant string for display formatting only, not money arithmetic |

No blockers or warnings found. No TODO/FIXME/placeholder comments in Phase 8 files. No empty implementations. No `return null` stubs.

---

### Test Suite Results

| Check | Command | Result |
|-------|---------|--------|
| Full SPA test suite | `npx vitest run --reporter=dot` | **910 GREEN / 0 RED / 11 todo** |
| Lint + TypeScript | `npm run lint` | **exit 0** |
| Production build | `npm run build` | **exit 0** |

---

### Invariant Checks

| Invariant | Status | Evidence |
|-----------|--------|---------|
| StorageAdapter interface untouched (Phase 3 FINAL) | VERIFIED | `src/storage/adapter.ts` — interface unchanged; 8 methods identical to Phase 3 contract |
| No `new Date()` outside `src/lib/period.ts` | VERIFIED | No occurrences found in any Phase 8 modified files |
| No `parseFloat`/`Number(` on money strings | VERIFIED | Only `Number(MEDICARE_LEVY_RATE)` (rate constant, not money); `parseInt(v, 10)` in EntityForm is for integer count, not money |
| AnomalyBadge severity remains `'info' \| 'warn'` | VERIFIED | `types.ts` line 45: `severity: 'info' \| 'warn'`; Phase 8 added no new variants |
| AssumptionsBlock backward compat: prop omitted → static list | VERIFIED | `const rows = assumptions ?? ASSUMPTIONS` — `undefined` falls back to 5-item ASSUMPTIONS constant |
| Two distinct per-dependant increments ($4338 lower, $5422 upper) | VERIFIED | `MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER = '4338'`; `MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER = '5422'`; used separately in `medicareLevyFamily` lines 72–74; FLEVY-4 and FLEVY-5 tests verify each independently |

---

### Human Verification Required

#### 1. Form I print preview — family assumption row

**Test:** Open an Individual entity with `dependants: 2` + `spouseIncome: 60000`. Navigate to Tax Return → Form I. Click "Print working paper". Inspect the printed output.
**Expected:** Family threshold assumption row visible with text containing "Family Medicare levy applied — 2 dependants, spouse income $60000"; flat-2% warning row absent.
**Why human:** Print output visual inspection and absence-of-element verification cannot be automated in the test suite.

*Note: UAT scenario 3 (2-kid family) was approved by user on 2026-05-30, confirming this behavior in the running app.*

---

### Gaps Summary

No gaps. All 5 success criteria verified against actual code. All 4 requirements (MED-01..04) marked Complete in REQUIREMENTS.md. Test suite confirms 910 GREEN / 0 RED. Lint and build exit 0. All invariants satisfied.

---

_Verified: 2026-05-30T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
