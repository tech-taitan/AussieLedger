---
phase: 05-tax-outputs
deferred_by: 05-2
---

# Deferred Items — Phase 05-2

## Out-of-Scope Issues Discovered During Execution

### structural.test.ts no-new-Date rule failure

**Found during:** Task 3 full test run
**Rule:** Structural test `src/__tests__/structural.test.ts` — "no file outside src/lib/period.ts uses parameterless new Date() or Date.now()"
**Affected files:**
- `src/components/PartnershipTaxReturn.tsx:87` — `new Date().toISOString()` in print audit handler
- `src/components/TrustTaxReturn.tsx:87` — `new Date().toISOString()` in print audit handler

**Scope:** Both files owned by plan 05-3. The violations were introduced by the parallel agent in commit `16f9a71` (PartnershipTaxReturn) and `82d24a9` (TrustTaxReturn).

**Fix required:** Replace `new Date().toISOString()` with `today().toISOString()` in both files' `handlePrint` functions. Import `today` from `'../lib/period'` (already imported in those files).

**Assigned to:** Plan 05-4 or the 05-3 agent on next run. This is a pre-existing issue from 05-3, not introduced by 05-2.

**Impact:** 1 structural test fails. All 05-2 owned tests pass.

**Resolution:** Fixed by orchestrator before Wave 3 spawn — commit `afdfcb4` "fix(05-3): use today() not new Date() in print audit handler". Imported `today` from `'../lib/period'` and replaced both `new Date().toISOString()` call sites. Structural test now GREEN.
