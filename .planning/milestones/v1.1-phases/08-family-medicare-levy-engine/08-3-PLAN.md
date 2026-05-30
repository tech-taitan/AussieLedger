---
phase: 08-family-medicare-levy-engine
plan: 3
type: execute
wave: 3
depends_on: [08-1, 08-2]
files_modified:
  - .planning/phases/08-family-medicare-levy-engine/08-UAT.md
autonomous: false
tdd: false
requirements: [MED-01, MED-02, MED-03, MED-04]
must_haves:
  truths:
    - "User has manually verified all 4 family Medicare scenarios in the running app (single-parent, DINK, 2-kid family, legacy v1.0 entity round-trip)"
    - "User has confirmed Phase 5 single-Medicare regression is intact post-stale-constants fix (existing v1.0 single-Individual entity still computes correct M1/M2 at the corrected FY2025-26 boundaries)"
    - "User has confirmed Form I family-threshold assumption row visually replaces the Phase 5 flat-2% warning (not duplicated)"
    - "User has confirmed EntityForm conditional rendering: fields visible Individual only; type-switch preserves storage"
    - "All 4 MED-01..04 requirements are signed off in REQUIREMENTS.md traceability table"
    - "Final test counts logged: SPA GREEN ≥ 894, server GREEN unchanged at 18, 0 RED end-of-phase"
  artifacts:
    - path: ".planning/phases/08-family-medicare-levy-engine/08-UAT.md"
      provides: "Manual UAT sign-off record with per-scenario results, screenshots optional, user approval timestamp"
      contains: "status: approved"
  key_links:
    - from: ".planning/REQUIREMENTS.md"
      to: ".planning/phases/08-family-medicare-levy-engine/08-UAT.md"
      via: "MED-01..04 traceability rows flip from Pending → Complete (08-3 / UAT date)"
      pattern: "MED-01.*Phase 8.*Complete"
---

<objective>
Manual UAT for Phase 8. Plans 08-1 + 08-2 ship all the code and automated tests. This plan validates the user experience end-to-end against the 4 real-world scenarios documented in 08-VALIDATION.md "Manual-Only Verifications", confirms Phase 5 single-Medicare regression is intact post-stale-constants correction, and signs off all 4 MED-01..04 requirements.

Purpose: Ship Phase 8 with user confidence. Catch any integration issues automated tests missed (visual rendering, print preview, conditional UX, form state persistence).

Output: `.planning/phases/08-family-medicare-levy-engine/08-UAT.md` with per-scenario results table + approval status; REQUIREMENTS.md updated to mark MED-01..04 Complete; STATE.md updated to reflect Phase 8 done; ROADMAP.md updated; git commit captures all 3 doc updates.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/08-family-medicare-levy-engine/08-CONTEXT.md
@.planning/phases/08-family-medicare-levy-engine/08-RESEARCH.md
@.planning/phases/08-family-medicare-levy-engine/08-VALIDATION.md
@.planning/phases/08-family-medicare-levy-engine/08-1-PLAN.md
@.planning/phases/08-family-medicare-levy-engine/08-2-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Run full automated test suite + record final pre-UAT test counts</name>
  <files>
    .planning/phases/08-family-medicare-levy-engine/08-UAT.md
  </files>
  <read_first>
    - .planning/phases/08-family-medicare-levy-engine/08-1-PLAN.md (expected test counts + acceptance criteria)
    - .planning/phases/08-family-medicare-levy-engine/08-2-PLAN.md (expected test counts + acceptance criteria)
    - .planning/phases/08-family-medicare-levy-engine/08-VALIDATION.md § "Sampling Rate" + "Test Infrastructure"
    - .planning/STATE.md § "Performance Metrics" (Phase 7 final test counts as baseline reference)
  </read_first>
  <action>
    1. Run the full test suite with verbose reporter and capture output:
       ```bash
       npx vitest run --reporter=verbose 2>&1 | tail -80
       ```
       Note the totals: GREEN, RED, todo, file count.

    2. Run lint:
       ```bash
       npm run lint
       ```
       Confirm exit code 0.

    3. Run TypeScript check:
       ```bash
       npx tsc --noEmit
       ```
       Confirm exit code 0.

    4. Run build (smoke test for production bundle):
       ```bash
       npm run build
       ```
       Confirm exit code 0.

    5. **CREATE** `.planning/phases/08-family-medicare-levy-engine/08-UAT.md` with frontmatter + initial table structure. Use this template:

       ```markdown
       ---
       phase: 8
       slug: family-medicare-levy-engine
       type: uat
       status: in-progress
       created: <today's ISO date>
       ---

       # Phase 8 — Manual UAT Sign-Off

       **Purpose:** Validate the family Medicare levy engine end-to-end in the running app. Plans 08-1 + 08-2 ship the code + automated tests; this plan signs off the user experience.

       ## Pre-UAT Automated Verification

       | Check | Command | Result |
       |-------|---------|--------|
       | Full SPA test suite | `npx vitest run` | <FILL: ___ GREEN / ___ RED / ___ todo> |
       | Lint | `npm run lint` | <FILL: exit ___> |
       | TypeScript | `npx tsc --noEmit` | <FILL: exit ___> |
       | Production build | `npm run build` | <FILL: exit ___> |

       **Expected baseline:** ≥ 894 SPA GREEN, 0 RED, 18 server GREEN unchanged. Phase 7 final was 848 SPA GREEN + 11 todo; Phase 8 added ~46 net tests across Plans 08-1 (~20) + 08-2 (~26).

       ## UAT Scenarios

       (To be filled in by Task 2)

       ## Approval

       (To be filled in by Task 3)
       ```

    6. Fill in the actual test counts from step 1 in the table.

    7. Commit:
       ```bash
       git add .planning/phases/08-family-medicare-levy-engine/08-UAT.md
       git commit -m "docs(08-3): UAT pre-checks — full suite GREEN; ready for manual UAT"
       ```
  </action>
  <verify>
    <automated>npx vitest run --reporter=dot 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - `npx vitest run` exits 0; total SPA GREEN ≥ 894; 0 RED
    - `npm run lint` exits 0
    - `npx tsc --noEmit` exits 0
    - `npm run build` exits 0
    - `.planning/phases/08-family-medicare-levy-engine/08-UAT.md` exists with frontmatter `status: in-progress` and filled pre-check table
    - Latest commit on main has message starting with `docs(08-3): UAT pre-checks`
  </acceptance_criteria>
  <done>All automated checks pass; UAT file created with pre-UAT verification table populated; ready for the user to perform manual UAT in Task 2.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Manual UAT — 5 scenarios (4 family + 1 regression) signed off by user</name>
  <what-built>
    Phase 8 family Medicare levy engine is fully shipped: v5→v6 migration, real FY2025-26 family thresholds + corrected stale single thresholds, family pure functions in medicare.ts, isFamilyFiling predicate, computeIndividualReturn family branch + family assumption row + bad-data anomaly emission, AssumptionsBlock dynamic prop, TaxReturnAssistant family-aware wiring, EntityForm Individual-conditional dependants + spouseIncome fields. All automated tests GREEN (verified in Task 1). The user now needs to verify the running app behaves correctly across 5 real scenarios.
  </what-built>
  <how-to-verify>
    Start the dev server: `npm run dev` (typically opens http://localhost:5173).

    **For each scenario below, perform the steps and record PASS/FAIL + notes in the UAT.md scenarios table.**

    ---

    **Scenario 1: Single-parent (dependants > 0, spouseIncome undefined) — MED-02 + MED-03**
    1. Create a new Individual entity named "Single Parent Test". Set `dependants: 1`. Leave `Spouse taxable income` BLANK.
    2. Save the entity. Verify the EntityForm shows Save successful.
    3. Add a Revenue account tagged taxLabel='6S' + an Expense account tagged taxLabel='6N'; post a journal entry crediting Revenue $50,000 and debiting Expense $20,000 (P8 = 30000 expected).
    4. Navigate to Tax Return → Form I.
    5. **Verify M1 value:** 30000 ≤ effLower(47238+(1×4338)=51576) → M1 should be `$0.00` (family threshold avoids the levy entirely for low single-parent income).
    6. **Verify assumption row:** AssumptionsBlock contains exactly: `'Family Medicare levy applied — 1 dependants, spouse income $0. Family threshold $47238; per-dependant adjustment $4338.'`
    7. **Verify absence:** AssumptionsBlock does NOT contain `'Medicare exemption: none (full 2% levy applied unless shading applies)'`, NOT `'Marital status: single'`, NOT `'Dependants: zero'`.
    8. **Print preview:** Click "Print working paper". Verify the printed page shows the family assumption row, no flat-2% warning. Cancel the print dialog.
    9. PASS/FAIL + any observations.

    ---

    **Scenario 2: DINK (dependants undefined or 0, spouseIncome > 0) — MED-02**
    1. Create a new Individual entity named "DINK Test". Leave `Dependant children` BLANK. Set `Spouse taxable income` to `80000`.
    2. Save.
    3. Reuse Scenario 1's CoA + journal pattern OR add a fresh one with P8 = 90000 (e.g. credit Revenue $100,000, debit Expense $10,000).
    4. Navigate to Form I.
    5. **Verify M1 value:** combined = 90000 + 80000 = 170000 ≥ effUpper(59047, no dependant increment) → M1 = 90000 × 0.02 = `$1,800.00`. NOT 170000 × 0.02 = 3400 (Pitfall 1).
    6. **Verify M2 value:** combined 170000 < family MLS Tier 1 base 202000 → M2 = `$0.00`.
    7. **Verify assumption row:** `'Family Medicare levy applied — 0 dependants, spouse income $80000. Family threshold $47238; per-dependant adjustment $4338.'`
    8. PASS/FAIL + observations.

    ---

    **Scenario 3: 2-kid family with MLS-relevant income — MED-02 + MED-03**
    1. Create a new Individual entity named "2-Kid Family Test". Set `dependants: 2`, `Spouse taxable income: 100000`.
    2. Save.
    3. Journal pattern producing P8 = 130000 (e.g. credit Revenue $150,000, debit Expense $20,000).
    4. Navigate to Form I.
    5. **Verify M1 value:** combined = 130000 + 100000 = 230000 ≥ effUpper(59047 + 2×5422 = 69891) → M1 = 130000 × 0.02 = `$2,600.00`.
    6. **Verify M2 value:** combined 230000; MLS effT1 = 202000 + max(0,2-1)×1500 = 203500; effT2 = 236000 + 1500 = 237500. 230000 > 203500 but < 237500 → Tier 1 rate 1% → M2 = 130000 × 0.01 = `$1,300.00`.
    7. **Verify assumption row:** `'Family Medicare levy applied — 2 dependants, spouse income $100000. Family threshold $47238; per-dependant adjustment $4338.'`
    8. PASS/FAIL + observations.

    ---

    **Scenario 4: Legacy v1.0 Individual entity (regression — MED-04 default-undefined preservation)**
    1. Open an EXISTING Individual entity that was created BEFORE Phase 8 (or open the data view and confirm an entity exists with `dependants === undefined && spouseIncome === undefined` after v6 migration ran). If none exists, manually edit localStorage to construct a v6 entity with both fields undefined.
    2. Navigate to its Form I.
    3. **Verify M1 + M2 values:** identical to Phase 5 single-engine output (the same income that was producing the same M1/M2 pre-Phase-8 should still produce the same — modulo the Plan 08-1 corrected single-threshold boundary; the boundary correction is intentional, not a regression).
    4. **Verify assumption rows:** all 5 original Phase 5 strings present: `'Marital status: single (no spouse income captured)'`, `'Age: under 65 (no Seniors and Pensioners Tax Offset applied)'`, `'Medicare exemption: none (full 2% levy applied unless shading applies)'`, `'Private health cover: assumed (no Medicare Levy Surcharge applied)'`, `'Dependants: zero'`. Does NOT contain `'Family Medicare levy applied'`.
    5. **Open EntityForm for this entity:** verify the 2 new dependants + spouseIncome fields appear (because type is Individual) AND are BLANK (because both are undefined).
    6. **Switch type to Company in EntityForm:** verify both fields disappear immediately. Switch back to Individual: fields reappear, still blank.
    7. PASS/FAIL + observations.

    ---

    **Scenario 5: Bad spouseIncome data — MED-02 anomaly emission**
    1. Create an Individual entity OR edit a test one. Set `dependants: 2`. In `Spouse taxable income`, type `abc` (invalid decimal).
    2. Save.
    3. Navigate to Form I.
    4. **Verify M1:** computed with spouse=0 (tolerant parse fallback). E.g. income 30000, 2 deps, spouse=0 → combined 30000 ≤ effLower 55914 → M1 = `$0.00`.
    5. **Verify Notices & Anomalies section:** contains a yellow `warn`-severity AnomalyBadge for M1 with message `'Spouse income data invalid; family thresholds applied with $0 — verify input'`.
    6. **Verify assumption row:** family-medicare row still rendered (engine computed best-effort with spouse=$0). NOTE: the assumption row will say `spouse income $abc` (because the format string just interpolates `entity.spouseIncome ?? '0'`). This is acceptable per the bad-data philosophy (user sees both the bad input AND the warn anomaly), but the planner notes it as a minor follow-up if it's confusing in practice — defer to Phase 9 or beyond if user flags it.
    7. PASS/FAIL + observations.

    ---

    **After all 5 scenarios:** edit `.planning/phases/08-family-medicare-levy-engine/08-UAT.md` to fill the scenarios table with PASS/FAIL + notes for each. Save the file.
  </how-to-verify>
  <resume-signal>Type "approved" when all 5 scenarios pass (or list failures and remediation needed; if any FAIL, return to plan-phase --gaps to address before approval).</resume-signal>
</task>

<task type="auto">
  <name>Task 3: Sign-off — mark MED-01..04 Complete in REQUIREMENTS.md, update STATE.md + ROADMAP.md, commit</name>
  <files>
    .planning/REQUIREMENTS.md,
    .planning/STATE.md,
    .planning/ROADMAP.md,
    .planning/phases/08-family-medicare-levy-engine/08-UAT.md
  </files>
  <read_first>
    - .planning/REQUIREMENTS.md § Traceability table (lines 70–93 — find the MED-01 through MED-04 rows; currently "Pending")
    - .planning/STATE.md (full file — update current_phase, progress, position, performance metrics with Phase 8 final test counts)
    - .planning/ROADMAP.md (Phase 8 entry — mark `[x]`; Progress table — update Phase 8 row Complete + date)
    - .planning/phases/08-family-medicare-levy-engine/08-UAT.md (the in-progress doc from Task 1; finalize with approval block)
  </read_first>
  <action>
    1. **Edit `.planning/phases/08-family-medicare-levy-engine/08-UAT.md`** — fill the "Approval" section:
       ```markdown
       ## Approval

       **Approved by:** <user name>
       **Approval date:** <ISO date>
       **All 5 scenarios:** PASS (or note partial — see scenarios table for any FAILs)

       **Final test counts (post-UAT):**
       - SPA: <__> GREEN / 0 RED / <__> todo
       - Server: 18 GREEN
       - Lint: EXIT 0; Build: EXIT 0; TypeScript: EXIT 0

       **Requirements signed off:**
       - [x] MED-01 — Entity v5→v6 schema migration (dependants + spouseIncome)
       - [x] MED-02 — Real family Medicare levy threshold engine + family MLS
       - [x] MED-03 — Form I family-threshold assumption row replaces flat-2% warning
       - [x] MED-04 — EntityForm Individual-only conditional fields with default-undefined preservation

       **Bonus shipped:** 4 stale FY2024-25 constants corrected to FY2025-26 (MEDICARE_LEVY_SINGLE_LOWER 27222→28011, MEDICARE_LEVY_SINGLE_UPPER 34028→35014, MLS_SINGLE_TIER_3 144000→158000, MLS_FAMILY_TIER_3 288000→316000) — Phase 5 latent bug closed as part of Wave 0 constants pass.
       ```

       Update frontmatter: `status: in-progress` → `status: approved`.

    2. **Edit `.planning/REQUIREMENTS.md`** — update the traceability table rows for MED-01 through MED-04:
       - `| MED-01 | Phase 8 | Pending |` → `| MED-01 | Phase 8 | Complete (08-1 + UAT) |`
       - `| MED-02 | Phase 8 | Pending |` → `| MED-02 | Phase 8 | Complete (08-1 + 08-2 + UAT) |`
       - `| MED-03 | Phase 8 | Pending |` → `| MED-03 | Phase 8 | Complete (08-2 + UAT) |`
       - `| MED-04 | Phase 8 | Pending |` → `| MED-04 | Phase 8 | Complete (08-2 + UAT) |`

       Also flip the checkboxes in the Requirements list at the top of the file:
       - `- [ ] **MED-01**: ...` → `- [x] **MED-01**: ...`
       - `- [ ] **MED-02**: ...` → `- [x] **MED-02**: ...`
       - `- [ ] **MED-03**: ...` → `- [x] **MED-03**: ...`
       - `- [ ] **MED-04**: ...` → `- [x] **MED-04**: ...`

    3. **Edit `.planning/STATE.md`** — surgical updates:
       - `current_phase: Phase 8 — Family Medicare Levy Engine (NOT STARTED)` → `current_phase: Phase 9 — Exports + Polish + Cleanup (NOT STARTED)`
       - `current_plan: 08-1 (not yet planned)` → `current_plan: 09-1 (not yet planned)`
       - `last_updated` → today's ISO timestamp
       - `progress.completed_phases: 1` → `2`
       - `progress.total_plans: 4` → `7` (4 from Phase 7 + 3 from Phase 8)
       - `progress.completed_plans: 4` → `7`
       - In `## Current Position`, update the ASCII diagram to mark Phase 8 DONE:
         ```
         v1.1:  [Phase 7] [Phase 8] [Phase 9]
                [ DONE  ] [ DONE  ] [ NEXT  ]
         ```
       - In `## Phase Summary (v1.1)`, update Phase 8 row:
         ```
         | 8 | Family Medicare Levy Engine | v5→v6 additive schema + FY2025-26 family Medicare + MLS engine + EntityForm 2 conditional fields + Form I family assumption row + stale-constants correction | COMPLETE (<date>) |
         ```
       - In `## Performance Metrics`, add 3 rows for Plans 08-1, 08-2, 08-3 with their final test counts (extract from Task 1 + Task 2 results)
       - Add new "Key Decisions Made (Phase 8)" sub-section under Accumulated Context capturing 3–5 key decisions from this phase:
         - "Two separate per-dependant increments (lower $4338 vs upper $5422) for family Medicare levy" — Plan 08-1
         - "MLS per-dependant increment applies max(0, dependants - 1) (after-first rule) to all 3 tier thresholds equally" — Plan 08-1
         - "AssumptionsBlock widened additively with optional `assumptions?: string[]` prop; static ASSUMPTIONS kept for backward compat" — Plan 08-2
         - "Family assumption row absorbs marital/medicare-exempt/dependants rows (replaces, not duplicates)" — Plan 08-2
         - "4 STALE FY2024-25 constants corrected as bonus Wave 0 deliverable (Phase 5 latent bug closed)" — Plan 08-1
       - Move "v1.0 family Medicare levy threshold engine deferred → planned for v1.1 Phase 8 (MED-01..04)" from `## Resolved Blockers` to a new entry: "v1.0 family Medicare levy threshold engine — SHIPPED Phase 8 (MED-01..04 complete <date>)"

    4. **Edit `.planning/ROADMAP.md`**:
       - Line 28: `- [ ] **Phase 8: Family Medicare Levy Engine** ...` → `- [x] **Phase 8: Family Medicare Levy Engine** ...`
       - Progress table row for Phase 8: update `Plans Complete` to `3/3`, `Status` to `Complete`, `Completed` to today's date
       - Under "Phase 8: Family Medicare Levy Engine" → "Plans: TBD" → expand to:
         ```
         Plans: 3 plans
         - [x] 08-1-PLAN.md — Wave 1 foundations: v5→v6 migration + family constants + 2 pure functions + isFamilyFiling + stale-constants corrections
         - [x] 08-2-PLAN.md — Wave 2 integration: computeIndividualReturn family branch + AssumptionsBlock prop widening + TaxReturnAssistant wiring + EntityForm 2 conditional fields
         - [x] 08-3-PLAN.md — Wave 3 UAT: 5 manual scenarios signed off + MED-01..04 marked Complete
         ```

    5. **Commit all 4 doc updates in one commit:**
       ```bash
       git add .planning/phases/08-family-medicare-levy-engine/08-UAT.md .planning/REQUIREMENTS.md .planning/STATE.md .planning/ROADMAP.md
       git commit -m "docs(08): Phase 8 COMPLETE — MED-01..04 signed off; v1.1 2/3 phases done"
       ```

    6. (Optional) Run `/gsd:verify-work 8` if the project uses this workflow — confirms phase-level acceptance criteria are met against goal-backward must_haves.
  </action>
  <verify>
    <automated>grep -c "MED-01 | Phase 8 | Complete" .planning/REQUIREMENTS.md && grep -c "Phase 8 — Family Medicare Levy Engine (COMPLETE" .planning/STATE.md</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "MED-01 | Phase 8 | Complete" .planning/REQUIREMENTS.md` returns 1
    - `grep -c "MED-02 | Phase 8 | Complete" .planning/REQUIREMENTS.md` returns 1
    - `grep -c "MED-03 | Phase 8 | Complete" .planning/REQUIREMENTS.md` returns 1
    - `grep -c "MED-04 | Phase 8 | Complete" .planning/REQUIREMENTS.md` returns 1
    - `grep -c "\[x\] \*\*MED-0" .planning/REQUIREMENTS.md` returns 4 (all 4 checkboxes flipped)
    - `grep -c "status: approved" .planning/phases/08-family-medicare-levy-engine/08-UAT.md` returns 1
    - `grep -c "current_phase: Phase 9" .planning/STATE.md` returns 1
    - `grep -c "\[x\] \*\*Phase 8: Family Medicare Levy Engine" .planning/ROADMAP.md` returns 1
    - Latest commit on main has message starting with `docs(08): Phase 8 COMPLETE`
    - `git status` shows clean working tree post-commit
  </acceptance_criteria>
  <done>All 4 MED requirements marked Complete in traceability table + checkboxes; STATE.md reflects Phase 8 done + Phase 9 next; ROADMAP.md Phase 8 row checked + plans listed; UAT.md status approved. Single commit captures all 4 doc updates. Phase 8 fully shipped.</done>
</task>

</tasks>

<verification>
- All 5 UAT scenarios marked PASS in 08-UAT.md
- REQUIREMENTS.md MED-01..04 rows all show "Complete (...)" status
- STATE.md current_phase advanced to Phase 9
- ROADMAP.md Phase 8 marked `[x]` with 3 plans listed
- Single commit captures all 4 doc updates with message `docs(08): Phase 8 COMPLETE — MED-01..04 signed off`
- Full test suite still GREEN post-doc-only commit (no source changes in this plan)
</verification>

<success_criteria>
- User has manually verified all 5 UAT scenarios (4 family + 1 bad-data) end-to-end in the running app
- MED-01, MED-02, MED-03, MED-04 are all marked Complete in REQUIREMENTS.md
- 08-UAT.md exists with approved status, all 5 scenarios filled, final test counts, requirements signed off
- STATE.md advanced to Phase 9 NEXT
- ROADMAP.md Phase 8 marked complete with 3 plans listed
- All doc updates committed in one clean commit
- v1.1 milestone now 2/3 phases complete; Phase 9 ready to plan
</success_criteria>

<output>
After completion, create `.planning/phases/08-family-medicare-levy-engine/08-3-SUMMARY.md` capturing:
- UAT scenario results (5 scenarios × PASS/FAIL)
- Any deviations from the planned scenarios + remediation taken
- Final post-UAT test counts (SPA + server)
- All 4 MED-01..04 sign-off confirmations
- Phase 8 grand totals: net new SPA tests added, files modified count, commits count
- Cumulative milestone progress: v1.1 2/3 phases done; recommend next step `/gsd:plan-phase 9`
</output>
