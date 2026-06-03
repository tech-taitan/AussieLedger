---
phase: 15
type: plan-verification
verdict: PASS-WITH-NOTES
verified_at: 2026-06-02
plans_checked: [15-1, 15-2]
requirements_in_scope: [POL-CODE-01, POL-CODE-02, POL-CODE-03, POL-CODE-04, POL-CODE-05]
requirements_deferred: [POL-CODE-06]
---

# Phase 15 Plan Verification — Code Polish

**Verdict:** PASS-WITH-NOTES — both plans are GREEN-to-execute. No BLOCKERs. Two informational AMBER nits flagged below; neither prevents execution.

The plans correctly anticipate every issue the planner pre-flagged. The PrivacyPage CONTEXT-vs-shipped divergence is genuinely present in the source — plans handle it with an explicit, runnable decision tree, so POL-CODE-01 Task 1 will succeed regardless of which branch fires.

---

## 1. Requirement Coverage (Goal-Backward)

| Requirement | Plan | Task | Success criterion mapping | Status |
|-------------|------|------|---------------------------|--------|
| POL-CODE-01 — repo-visibility-fix + PrivacyPage AI bullet | 15-1 | Task 1 (checkpoint:human-action) | (a) anonymous GitHub API probe asserts private=false, visibility=public, description starts with "Free Australian", 7 topics, homepage; (b) PrivacyPage AI bullet honesty decision-tree with 8 tests GREEN either branch | GREEN |
| POL-CODE-02 — legacy-migration demo-DB guard | 15-1 | Task 2 (auto TDD) | (a) migrateLegacyLocalStorage(adapter) early-returns when adapter.getDbName() === DB_NAME_DEMO; (b) demo DB stays empty + 4 legacy keys preserved; (c) prod regression-guard test asserts entity migrated + 4 keys cleared | GREEN |
| POL-CODE-03 — button-in-button Sidebar refactor | 15-2 | Task 1 (auto TDD) | (a) badge becomes span role=button tabIndex=0; (b) onKeyDown fires onBadgeClick on Enter + Space with e.preventDefault(); (c) Tailwind classes byte-identical + cursor-pointer added; (d) S.8 + S.9 expectations updated BUTTON to SPAN in same RED commit | GREEN |
| POL-CODE-04 — entity-aware tax nav | 15-2 | Task 2 (auto TDD) | (a) Individual/SoleTrader to Tax Assistant only; Company to Company Tax only; Trust to Trust Tax only; Partnership to none; default to none; (b) BAS/IAS universal across all 4 types; (c) no-active-entity case preserved; (d) Entity Dashboard, Journals, TB, Accounts, Import TB stay universal inside activeEntity block | GREEN |
| POL-CODE-05 — Edit Entity Details in Settings | 15-2 | Task 3 (auto TDD) | (a) 4th h3 Active Entity section between Primary Entity and First-Run Prompt; (b) entity-present branch shows name + type chip + Edit Entity Details button; (c) empty-state shows "No active entity selected" + hint, NO button; (d) button click invokes onEditActiveEntity callback; (e) ViewRouter widens Settings invocation; (f) ViewRouter.tsx:179 header button UNCHANGED (duplicate not move) | GREEN |
| POL-CODE-06 — PWA install desktop CTA | n/a | DEFERRED at discuss-time | Correctly absent from both plans requirements field; never referenced in any task action | GREEN (correctly deferred) |

**Cross-check against PROJECT/ROADMAP.md:** Phase 15 ROADMAP entry (line 50) lists POL-CODE-01..06; v1.3 REQUIREMENTS.md table marks POL-CODE-06 as DEFERRED (line 69). Plans correctly carry only the 5 active requirements. No PROJECT.md requirement relevant to Phase 15 is silently dropped.

---

## 2. PrivacyPage Source Divergence Adjudication (Planner Flag #1, CRITICAL)

**Claim by planner:** The shipped src/components/PrivacyPage.tsx does NOT contain the phrase about CSP allowlist being already in place — Phase 14-2 executor wrote honest wording.

**Verification (read of src/components/PrivacyPage.tsx lines 63-68):**

```tsx
<li data-testid="privacy-ai-bullet">
  AI features are not available on the public hosted version. Self-host
  with your own <code>GEMINI_API_KEY</code> on a local Express server
  to enable AI account-matching today. The public hosted build does not
  send data to Google.
</li>
```

**Adjudication:** PLANNER FLAG #1 CONFIRMED. The shipped AI bullet does NOT contain the "CSP allowlist is already in place" phrase. It instead reads "The public hosted build does not send data to Google." This is more honest than the planned wording (no CSP claim at all). Same divergence in README.md:85: "The public hosted build does not send data to Google."

**Consequence:** POL-CODE-01 Task 1 decision tree will fire the **no-op branch**:
- Source byte-identical
- VERBATIM_AI_BULLET in PrivacyPage.test.tsx already matches shipped source
- No commit for the PrivacyPage step
- Documented in 15-1-SUMMARY

**Plan 15-1 Task 1 IS sound** — it explicitly anticipates this via the read-then-branch design at action step 3. The planner did not hand-wave the divergence: it embedded the read, the decision criterion (presence of the CSP-allowlist phrase), and the no-op fallback as the EXPECTED branch per repo_facts. Executor will hit no-op, document, move on.

CONTEXT.md line 24 and REQUIREMENTS.md line 33 both reference the planned wording fix that turned out unnecessary; this is harmless drift documented in the plan repo_facts.

---

## 3. Architecture Invariant Audit (a-j)

| # | Invariant | Status | Evidence |
|---|-----------|--------|----------|
| a | StorageAdapter FINAL (POL-CODE-02 guards INSIDE migrateLegacyLocalStorage; no interface change) | GREEN | 15-1 Task 2 action 2.a edits only the function body. getDbName() is the existing Phase-14 duck-typed accessor. src/storage/adapter.ts not in files_modified for either plan. |
| b | DisclaimerFooter Phase 01 verbatim copy preserved | GREEN | Neither plan touches src/components/shell/DisclaimerFooter.tsx. Not in either files_modified list. |
| c | PrivacyPage non-AI bullets byte-identical | GREEN | 15-1 Task 1 action 3 explicitly scopes any edit to lines 63-68 (AI bullet only). VERBATIM_AI_BULLET constant is a single-string lock. Shipped source already honest → expected branch is byte-identical no-op. |
| d | POL-CODE-03 Sidebar visual byte-identical | GREEN | 15-2 Task 1 behavior preserves ALL Tailwind classes verbatim and adds only cursor-pointer. data-testid + aria-label preserved. Element swap is button → span role=button — same box model. |
| e | POL-CODE-04 BAS/IAS always universal | GREEN | 15-2 Task 2 implementation block renders BAS/IAS UNCONDITIONALLY inside the activeEntity block. Test ET.7 asserts BAS present across [Individual, Company, Trust, Partnership] parametric. |
| f | POL-CODE-05 ViewRouter.tsx:179 button unchanged (duplicate not move) | GREEN | 15-2 Task 3 behavior explicit: DO NOT touch ViewRouter.tsx:179. Task-level verification command at line 451 greps for 2 matches of setView(edit-entity) in ViewRouter.tsx — locks the duplicate-not-move invariant. |
| g | No new-Date() outside src/lib/period.ts (Phase 2 structural-lint) | GREEN | None of the 6 modified files have new timestamp logic. New test file uses standard fake-indexeddb deletion pattern from existing legacy-migration.test.ts. |
| h | No new dependencies (no npm install) | GREEN | Neither plan mentions any package addition. 15-2 repo_facts line 244 explicitly states: "No new dependencies. No npm install should run." |
| i | CSP / vercel.json unchanged | GREEN | vercel.json not in either files_modified list. CONTEXT Deferred Ideas explicitly excludes re-adding connect-src Gemini allowlist. |
| j | AIza scan still passes (build EXIT 0) | GREEN | 15-1 Task 2 action 2.f and 15-2 Task 3 action 2.g both explicitly include npm run build EXIT 0 in the GREEN-step verification. No AIza substring introduced. |

**All 10 invariants: GREEN.**

---

## 4. Pitfall Coverage / HARD-BLOCK Audit

| HARD-BLOCK | Affected by Phase 15? | Status |
|------------|----------------------|--------|
| PITFALLS section 4 — Demo IDB isolation (/demo MUST use aussieledger-demo) | YES — POL-CODE-02 hardens this | GREEN — 15-1 Task 2 tests both halves (demo-skips-migration + prod-still-migrates) |
| PITFALLS section 3 — PWA stale-cache trap | NO | GREEN (untouched) |
| Pitfall #12 — registerType=prompt | NO | GREEN (untouched) |
| Pitfall #1 — no VITE_GEMINI in vite.config.ts | NO | GREEN (untouched) |
| Structural-lint — no bare new-Date() outside period.ts | NO new timestamp code | GREEN — verified per invariant (g) above |
| AIza scan in npm run build | YES — both plans run build | GREEN — no API-key-shaped substrings introduced |

**No NEW HARD-BLOCKs introduced by Phase 15.** Sanity-check: PASS.

---

## 5. Discretion-Call Adjudication (8 items from CONTEXT.md)

| # | Discretion area | Plan choice | Adjudication |
|---|-----------------|-------------|--------------|
| 1 | PrivacyPage AI bullet exact new wording | 15-1 Task 1 picks shipped-honest sentence as no-op fallback target | SOUND — matches shipped; zero risk |
| 2 | Sidebar refactor exact element structure | 15-2 Task 1 chooses span role=button tabIndex=0 with inline onKeyDown handler | SOUND — WAI-ARIA spec compliant; preventDefault correctly prevents Space-scroll |
| 3 | Settings Active Entity section visual | 15-2 Task 3 matches existing Settings section className pattern | SOUND — byte-matches existing 3 sections |
| 4 | src/types.ts Entity discriminator check | 15-2 Task 2 includes PRE-WORK step to read src/storage/demo-seed.ts | SOUND — defensive (see flag #3 below) |
| 5 | Tests file naming for legacy-migration guard | 15-1 creates NEW legacy-migration-demo-guard.test.ts | SOUND — separation-of-concerns |
| 6 | POL-CODE-01 checkpoint copy | 15-1 Task 1 writes 10-step user instructions with verbatim values | SOUND — copy-pasteable; matches CONTEXT specifics |
| 7 | Settings prop signature for onEditActiveEntity | 15-2 Task 3 picks onEditActiveEntity optional zero-arg sync callback | SOUND — minimal; matches existing onClearSettings shape |
| 8 (implicit) | App.tsx threading for POL-CODE-05 | 15-2 Task 3 chooses ViewRouter-internal wiring (NO App.tsx source changes) | SOUND — minimal-surface; smallest diff |

**All 8 discretion calls: SOUND.**

---

## 6. Planner-Flagged Item Adjudication (7 items)

| # | Planner flag | Adjudication |
|---|--------------|--------------|
| 1 | CRITICAL — PrivacyPage CONTEXT-vs-shipped divergence | CONFIRMED via file read (see section 2). Plan decision-tree handles correctly. Expected branch: NO-OP. |
| 2 | CONTEXT.md canonical_refs lists wrong Sidebar test path | CONFIRMED — verified src/components/__tests__/Sidebar.test.tsx exists (166 lines); src/components/shell/__tests__/ does not exist. Both plans cite CORRECT path. CONTEXT is wrong but non-blocking. **Recommend post-execution CONTEXT.md edit** (not a plan revision). |
| 3 | Demo seed discriminator pre-work step | CONFIRMED — 15-2 Task 2 action step 1 (PRE-WORK) IS embedded INSIDE the action block of the SAME task. Defensive switch (type Individual OR SoleTrader) covers both. **Independent verification:** read src/storage/demo-seed.ts line 38 confirms type=SoleTrader. SoleTrader branch IS needed; ET.5 will be the SoleTrader-equivalence test. SOUND. |
| 4 | App.tsx in 15-2 Task 3 files_modified declared defensively | ACCEPTABLE — listed for transparency. 15-2 Task 3 action 2.c explicitly states NO source-level changes required and verification grep at line 484 asserts git diff src/App.tsx is empty. **No revision required.** |
| 5 | POL-CODE-06 correctly absent from any plan requirements | CONFIRMED — 15-1 frontmatter requirements=[POL-CODE-01, POL-CODE-02]; 15-2 frontmatter requirements=[POL-CODE-03, POL-CODE-04, POL-CODE-05]. POL-CODE-06 nowhere referenced. |
| 6 | POL-CODE-01 user_setup schema (github + dashboard_config) | VALID — 15-1 frontmatter lines 13-24 conform to expected shape: service + why + dashboard_config array of {task, location} entries. 4 entries cover visibility flip + description + topics + website. Copy-pasteable text matches CONTEXT specifics verbatim (em-dash preserved). |
| 7 | Test count range 1195-1198 intentionally wider | REASONABLE — 15-2 plan documents "13 expected; or fewer if some collapse via it.each". 1195-1198 is a 4-test window covering 13 minus 0 collapse (= 1198) down through 13 minus 3 collapse (= 1195). ARITHMETIC: 1183 baseline + 2 from 15-1 = 1185; + 10-13 from 15-2 = 1195-1198. PLAUSIBLE. |

**All 7 planner flags: ADJUDICATED. None require plan revision.**

---

## 7. Dependency-Chain Verification

| Plan | depends_on | Wave | Rationale |
|------|-----------|------|-----------|
| 15-1 | [] | 1 | First wave — checkpoint:human-action gate resolves before Wave 2 UI work (UX preference; not a hard file dependency) |
| 15-2 | [15-1] | 2 | Depends on 15-1 SUMMARY for the post-15-1 baseline (1185 SPA GREEN) used in success criteria |

**Technical independence:** 15-1 modifies src/components/PrivacyPage.tsx + src/storage/legacy-migration.ts + creates src/storage/__tests__/legacy-migration-demo-guard.test.ts. 15-2 modifies src/components/shell/Sidebar.tsx + src/components/__tests__/Sidebar.test.tsx + src/components/Settings.tsx + src/components/__tests__/Settings.test.tsx + src/components/ViewRouter.tsx + src/App.tsx. **Zero file overlap.**

**Sequencing rationale:** Plan 15-1 includes a checkpoint:human-action (Task 1 GitHub Settings flip). Sequencing 15-1 first lets the human-action gate resolve before the larger autonomous UI work in 15-2 begins. Could technically parallelise; sequencing improves UX. SOUND.

**No cycles, no missing references, no forward references.**

---

## 8. Verification Commands — Demonstrate GREEN (No Hand-Waving)

| Plan | Verification artefact | GREEN check |
|------|----------------------|-------------|
| 15-1 Task 1 | Invoke-WebRequest api.github.com probe returns private=false, visibility=public, description, 7 topics, homepage | EXECUTABLE PowerShell; runs in current Win11 environment |
| 15-1 Task 1 | npm test src/components/__tests__/PrivacyPage.test.tsx returns 8 GREEN | EXECUTABLE in jsdom |
| 15-1 Task 2 | npm test src/storage/__tests__/legacy-migration-demo-guard.test.ts returns 2 GREEN | EXECUTABLE; fake-indexeddb installed; existing legacy-migration.test.ts proves pattern works |
| 15-1 Task 2 | npm test src/storage/__tests__/legacy-migration.test.ts returns 5 GREEN (regression) | EXECUTABLE |
| 15-2 Task 1 | grep role=button in src/components/shell/Sidebar.tsx returns exactly 1 match | EXECUTABLE — current file has 0; post-refactor 1 |
| 15-2 Task 1 | grep onKeyDown in src/components/shell/Sidebar.tsx returns exactly 1 match | EXECUTABLE |
| 15-2 Task 2 | grep activeEntity.type triple-equals one of (Individual, Company, Trust, SoleTrader) returns 3-4 matches | EXECUTABLE; defensive switch covers SoleTrader per demo-seed.ts confirmation |
| 15-2 Task 3 | grep setView(edit-entity) in src/components/ViewRouter.tsx returns 2 matches | EXECUTABLE — currently 1 match (line 179); post-impl 2 (179 + Settings wiring at ~821) |
| Both | npm test returns 1195-1198 SPA GREEN; npm run lint EXIT 0; npm run build EXIT 0 | EXECUTABLE; AIza scan integral to npm run build per Phase 10 |

**Test-count projection arithmetic:** 1183 (current baseline per STATE.md "Post Phase 14 Plan 14-2: 1183 SPA GREEN") + 2 (15-1 Task 2) = 1185. + 2 (15-2 Task 1) + 6-8 (15-2 Task 2; window allows it.each collapse) + 3 (15-2 Task 3) = 1196-1198. **Plan range 1195-1198 covers the arithmetic with 1 test of safety margin.** PLAUSIBLE.

---

## 9. Out-of-Scope Hygiene

| Out-of-scope item | Audit |
|-------------------|-------|
| POL-CODE-06 (PWA install desktop CTA) — DEFERRED | NOT referenced in any plan task action. Neither plan requirements field includes it. Frontmatter clean. |
| POL-DOCS-01 (real README screenshot) — Phase 16 | NO README modifications in either plan; README.md not in files_modified. |
| POL-DOCS-02 (persona-segmented README) — Phase 16 | NO README modifications. |
| CODE_OF_CONDUCT.md / SECURITY.md / branch protection (Deferred) | NOT referenced. POL-CODE-01 user_setup explicitly scoped to visibility + 3 metadata fields only. |
| Sidebar visual refresh (Deferred) | 15-2 Task 1 explicitly preserves all Tailwind classes verbatim. |
| GST-registered boolean (Deferred) | NOT added to Entity in either plan. |
| Partnership Form P view (Deferred) | NOT added. 15-2 Task 2 mapping explicitly: Partnership → none of the 3 tax entries (BAS only). |
| CSP connect-src Gemini allowlist (v5 deferral) | NOT added; vercel.json not in files_modified. |
| VALIDATION.md re-introduction (Deferred) | This verification file IS the audit artefact (per v1.2 convention carried into v1.3). |
| v2.0 / v5 work (sqlite-wasm / FSA / Tauri / AI flows) | NONE referenced. |

**Out-of-scope hygiene: CLEAN.**

---

## 10. Context Compliance (CONTEXT.md to Plans)

| CONTEXT.md locked decision | Implementing task | Status |
|----------------------------|-------------------|--------|
| Flip GitHub repo public (NOT strip URLs) | 15-1 Task 1 step 3 | HONORED |
| Flip during Phase 15 execution via checkpoint:human-action | 15-1 Task 1 type=checkpoint:human-action | HONORED |
| No additional repo hygiene (no CODE_OF_CONDUCT / SECURITY / branch protection) | 15-1 user_setup has 4 entries only | HONORED |
| Add GitHub repo metadata (description + 7 topics + website) | 15-1 Task 1 steps 5-8 | HONORED |
| PrivacyPage AI bullet wording fix folded into POL-CODE-01 | 15-1 Task 1 step 3 | HONORED (with no-op branch documented) |
| Badge becomes span role=button tabIndex=0 with Enter+Space keyboard handlers | 15-2 Task 1 implementation block | HONORED |
| Test depth: Enter + Space both fire onBadgeClick | 15-2 Task 1 tests K.1 + K.2 | HONORED |
| Visual byte-identical | 15-2 Task 1 behavior locks Tailwind classes | HONORED |
| Add cursor-pointer Tailwind class | 15-2 Task 1 className explicitly adds it | HONORED |
| Sole Trader = Individual mapping (verify at execution) | 15-2 Task 2 PRE-WORK reads demo-seed.ts | HONORED |
| Partnership to BAS/IAS only | 15-2 Task 2 ET.4 + implementation | HONORED |
| Demo mode mirrors production semantics (sole-trader → Tax Assistant) | 15-2 Task 2 PRE-WORK + defensive switch | HONORED |
| BAS/IAS always visible | 15-2 Task 2 unconditional render + ET.7 parametric test | HONORED |
| New Active Entity section between Primary Entity and First-Run Prompt | 15-2 Task 3 implementation positions BETWEEN sections | HONORED |
| Two states (entity / empty-state) | 15-2 Task 3 ternary in JSX + SET.5 + SET.6 tests | HONORED |
| Button wiring via onEditActiveEntity defaulting to setView(edit-entity) | 15-2 Task 3 ViewRouter widening | HONORED |
| ViewRouter.tsx:179 header button STAYS unchanged | 15-2 Task 3 behavior + verification grep | HONORED |
| Guard at top of migrateLegacyLocalStorage(adapter) reading adapter.getDbName() | 15-1 Task 2 implementation block | HONORED |
| Test file legacy-migration-demo-guard.test.ts with 2 tests | 15-1 Task 2 creates exact file with 2 tests | HONORED |
| No production behaviour change for prod path | 15-1 Task 2 Test 2 is the regression guard | HONORED |

**All 20 CONTEXT-locked decisions: HONORED.**
**Deferred ideas (10 items in CONTEXT.md deferred section): NONE leaked into plans.**

---

## 11. Scope-Sanity Audit

| Plan | Tasks | Files modified | Within budget? |
|------|-------|----------------|----------------|
| 15-1 | 2 (1 checkpoint + 1 auto TDD) | 3 files (1 modify-or-no-op + 1 modify + 1 create) | GREEN — well under 5-task / 15-file thresholds |
| 15-2 | 3 (all auto TDD) | 6 files (4 modify + 2 modify-test) | AMBER — 3 tasks borderline; 6 files moderate; mitigated by all 3 tasks being shell-component changes with clear scope. Plan-author chose conceptual coherence over splitting. |

**AMBER NOTE on 15-2:** 3 tasks in one plan is at the upper edge of "good" (2-3 target). Splitting POL-CODE-05 into its own Wave 3 plan would be defensible but introduces an additional orchestrator round-trip for marginal benefit. The 3 tasks share the Sidebar/Settings shell context and benefit from sequential execution in one session (planner explicitly noted shell-coherence rationale at objective line 84). **Not a blocker.**

---

## 12. Nyquist Compliance (Dimension 8)

**Status: SKIPPED.** Phase 15 directory has no 15-RESEARCH.md (verified via directory listing — only 15-1-PLAN.md, 15-2-PLAN.md, 15-CONTEXT.md, 15-VERIFICATION.md present). Per spec: "Skip if... phase has no RESEARCH.md". config.json has workflow.nyquist_validation=true, but the skip-criterion is satisfied independent of the config flag. v1.3 carries v1.2 "no VALIDATION.md re-introduction" convention (explicitly locked in CONTEXT.md deferred ideas line 199).

---

## 13. Specific Revision Asks

**NONE.** Both plans are GREEN-to-execute as-written.

### Informational notes (post-execution clean-up, NOT plan revisions)

1. **CONTEXT.md path correction (non-blocking):** canonical_refs section in 15-CONTEXT.md line 129-130 says Sidebar test is at src/components/shell/__tests__/Sidebar.test.tsx — the correct path is src/components/__tests__/Sidebar.test.tsx. Both plans cite the correct path so execution is unaffected. Suggest a 2-line CONTEXT.md fix after Phase 15 closes (or fold into Phase 16 docs polish). File: A:/Projects/AussieLedger/.planning/phases/15-code-polish/15-CONTEXT.md lines 129-130.

2. **REQUIREMENTS.md AI bullet drift note (non-blocking):** REQUIREMENTS.md line 33 still references the planned wording fix that turned out unnecessary. Plan 15-1 SUMMARY will document the no-op decision; suggest a follow-up REQUIREMENTS.md edit to mark this consideration as "RESOLVED — already shipped honest in Phase 14-2" once Phase 15 closes.

---

## 14. Final Summary

**Verdict: PASS-WITH-NOTES** — execute both plans as written.

- **5/5 active requirements covered** with clear plan-task mapping
- **10/10 architecture invariants preserved**
- **8/8 discretion calls sound**
- **7/7 planner flags adjudicated** (1 CRITICAL confirmed and correctly handled by plan decision tree; 6 minor confirmed)
- **20/20 CONTEXT-locked decisions honored**
- **10/10 deferred ideas excluded** from plans
- **0 HARD-BLOCKs introduced**
- **0 forward-references / cycles / missing-references** in dependency graph
- **Test-count projection arithmetically validated** (1183 → 1185 → 1195-1198)
- **PrivacyPage source divergence confirmed** via direct file-read; plan handles via no-op branch
- **PrivacyPage non-AI bullets, DisclaimerFooter, vercel.json, StorageAdapter interface, ViewRouter.tsx:179 header button, period.ts new-Date() boundary, BAS/IAS universality, package.json** — all preserved untouched

Plan 15-1 (Wave 1) handles the human-action gate + the smallest-surface migration guard. Plan 15-2 (Wave 2) handles the 3 shell-UI requirements with proper TDD-RED-GREEN sequencing across 6 commits. Zero file overlap between plans, but Wave 2 sequencing improves orchestrator UX by resolving the GitHub Settings round-trip before any UI work begins.

**Recommendation:** Proceed to /gsd:execute-phase 15.

---

*Verification performed: 2026-06-02*
*Verifier: gsd-plan-checker (Claude Opus 4.7)*
