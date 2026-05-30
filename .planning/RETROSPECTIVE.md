# AussieLedger — Retrospective

A living document. Each milestone appends a section; cross-milestone trends grow over time.

---

## Milestone: v1.0 — Initial Release

**Shipped:** 2026-05-29
**Phases:** 6 | **Plans:** 23 | **Tasks:** 23 (each plan task atomic-committed)

### What Was Built

Compressed from per-phase SUMMARY one-liners:

- **Phase 1 (Safety Net):** ATO theatre removed; Vitest + golden tests installed; decimal.js + schema-version field; EntityForm ABN modulus-89 validation.
- **Phase 2 (Tax Engine + decompose):** App.tsx shrunk to ≤250 lines; pure tax-math in `src/lib/tax/`; Gemini API key off client bundle; canonical AU period module.
- **Phase 3 (Durable Persistence):** StorageAdapter FINAL interface; IndexedDB (LocalAdapter) + SQLite (ServerAdapter via Express); JSON export/import round-trip; both deployment shapes work.
- **Phase 4 (Bookkeeping Core):** 127-row default CoA with per-type tax-label mappings; journal lifecycle (post/edit-supersedes/reverse/void); CSV/XLSX import with fingerprint dedup; trial balance with period filter + parent subtotals.
- **Phase 5 (Tax Outputs):** Print-ready Form I/C/T/P + Simpler BAS + IAS; FY2026 rate helpers (marginal/LITO/Medicare+MLS/BRE/small-biz offset); BAS to-the-cent (G1=$18,200/1A=$1,000/1B=$100); `@media print` scoping per form.
- **Phase 6 (Personas, Wizard, Deployment):** Year-end wizard (7 steps, typed-entity-name attestation, finalise lock); owner/agent persona modes; inline AnomalyBadge across non-tax screens + Sidebar count badges; Radix tooltips on all 5 forms; Apache 2.0 LICENSE + CONTRIBUTING.md + audience-first README.

### What Worked

- **TDD discipline on Phase 5/6 plans (`tdd: true` in frontmatter).** Tests written first, committed RED, then implementation. Caught the JournalForm AnomalyBadge consistency gap and the YearEndWizard `onAddLog` integration gap *because* the unit tests already specified the contract — the verifier just had to check whether the wiring matched the contract.
- **Wave 0 foundations pattern.** Every multi-plan phase (3, 4, 5, 6) started with a Wave 0 plan that landed all primitives, types, scaffolds, and test files *first*. Downstream waves could run in parallel against the same artifacts without re-discovering shapes. The single biggest determinant of "did this phase finish on time".
- **Atomic per-task commits + structured commit messages.** `feat(05-2): computeIndividualReturn + computeCompanyReturn full implementation — 14 tests GREEN` style messages mean `git log --oneline --grep="05-2"` is a complete plan history. No archaeology needed.
- **gsd-verifier catching real integration gaps after UAT signoff.** Phase 6 case: user reported PASS on Step 7 including "LOCK_FY in audit", verifier subsequently caught that ViewRouter mounted YearEndWizard without forwarding `onAddLog`, so LOCK_FY events were never written in production. The unit tests passed because they injected the prop directly. **The 2-step verify (human UAT → automated verifier) catches gaps neither alone would.**
- **StorageAdapter FINAL invariant (Phase 3 lock).** Phase 6 needed to add `Settings.mode` and `Settings.primaryEntityId` — instead of widening the adapter (which Phase 3 deliberately forbade), Phase 6 added a `useSettings` hook backed by `localStorage` under a separate key. Zero changes to `adapter.ts`/`local.ts`/`server.ts`/SQL schema/server routes. The invariant pays off exactly when something tries to violate it.
- **Per-FY label module pattern (Phase 5 → Phase 6 helpText widening).** Phase 5 shipped `src/lib/tax/labels/fy2026.ts` with structured catalogues; Phase 6 widened them additively with `helpText` and the 6 compute modules required zero changes (they use key lookups, not metadata iteration). Worth codifying.
- **Plan-checker on first try.** Phase 6's `gsd-plan-checker` returned VERIFICATION PASSED on the first iteration — no revision loop. Suggests the planner is producing high-quality plans when CONTEXT.md is detailed (Phase 6 CONTEXT was 189 lines / 20 decisions).

### What Was Inefficient

- **Stale REQUIREMENTS.md checkboxes.** 4 requirements (FND-01, FND-03, TAX-04, DEP-02) shipped but the master traceability checkboxes stayed `[ ]`. Phase 5/6 SUMMARYs updated the file proactively; earlier phases didn't. The milestone audit caught and fixed these but it cost extra audit time. **Action: make the planner agent's plan template include "update REQUIREMENTS.md row" as an explicit task on every plan that closes a requirement.**
- **Nyquist `nyquist_compliant: false` frontmatter on 3 phases despite tests being GREEN.** Frontmatter never got flipped after wave 0 test scaffolds completed. No runtime impact but causes audit-time noise. **Action: add a `nyquist_compliant` flip as part of the phase-close commit.**
- **JournalForm AnomalyBadge consistency gap caught only at Wave 3.** Phase 6's CONTEXT explicitly said "reuse AnomalyBadge across non-tax screens", but the 06-3 agent kept the existing red `<div>` because tests passed against the text content. The plan-checker reviewed the plan, not the implementation, so it didn't catch the deviation. Verifier caught it. **Action: add an explicit "import AnomalyBadge" grep check to the JournalForm acceptance criteria, not just a text-content assertion.**
- **UAT human-verify pass on Step 7 was inaccurate.** User reported "LOCK_FY in audit log visible" but the code path didn't write it. Verifier caught the gap post-hoc. This is the hardest class of error to catch — the human is the verifier and the human is also the gap. **Action: when a UAT step asserts a specific log entry, the UAT script should have a copy-pasteable "grep audit log for LOCK_FY" assertion that the user can run, not just an eyeball check.**
- **Phase 5's 05-1 went over multi-session.** Wave 0 plan with 5 tasks, 21 test files, complex migration shape — exhausted context. Multi-session handoff worked but added orchestration overhead. **Action: when Wave 0 task_count ≥ 5, split into 0a/0b at planning time.**

### Patterns Established (codify these for future milestones)

- **TDD on every code-producing task** — `tdd: true` frontmatter + RED commit + implementation commit. Phase 5/6 pattern.
- **Wave 0 foundations** — pure-data + pure-logic + types + skeletons + tests scaffolded first; downstream waves run in parallel against the same contracts.
- **Plan checker before execute, verifier after execute.** Two-gate quality.
- **Atomic per-task commits with `feat({phase}-{plan}):` prefix.** Allows `git log --grep` plan history.
- **CONTEXT.md captures decisions, not implementation.** Phase 5 CONTEXT (265 lines / 12 decisions) and Phase 6 CONTEXT (189 lines / 20 decisions) were the cause of clean plan-checker passes.
- **VERIFICATION.md update via gap-fix-then-re-verify, not regenerate.** Phase 6 verifier returned `gaps_found`, orchestrator fixed the 2-line gap, re-spawned verifier, verifier updated `gaps_found → passed` in place. Cleaner audit trail than discarding-and-regenerating.
- **Per-FY label module pattern** (Phase 5 → forward) — `src/lib/tax/{returns,rates,labels}/fy{NNNN}/*`. Codified in CONTRIBUTING.md "Adding a New Financial Year".
- **Settings (non-entity-data) via localStorage, NOT StorageAdapter.** Phase 6 pattern; StorageAdapter is FINAL.
- **Schema migration as additive + reversible round-trip** with required migration test. Codified in CONTRIBUTING.md.
- **`AnomalyBadge` is the single visual language for anomaly surfaces.** Severity stays `'info' | 'warn'` — blocking is enforced at the gate (wizard finalise), not via badge color.

### Key Lessons

- **TDD plus structured plan checking is the difference between phase 5 and phase 2.** Phase 2 had multi-session debugging; Phase 5 + 6 were largely first-pass.
- **The integration check (gsd-integration-checker) is the milestone-level analogue of the plan-level verifier.** Catches cross-phase wiring that single-phase verifiers can't see. Should run *before* milestone close, every time.
- **Sometimes the gap is in the UAT script, not the code.** The Phase 6 "LOCK_FY visible in audit" assertion was unverifiable as written — should have included the grep command. **Make UAT assertions self-verifying where possible.**
- **`tech_debt` is not a failure mode.** v1.0's audit verdict was `tech_debt` because of FND-02 CSV deferral — but that was a conscious decision documented across 3 phases. Capturing the deferral in MILESTONES.md § Known Gaps is the correct outcome, not "must close before ship".

### Cost Observations

- **Model mix:** This milestone ran primarily on Sonnet (executor/verifier/checker) with Opus inheritance on the planner. Multi-agent orchestration (Wave 2 parallel executors) is roughly free if files are disjoint; the orchestrator stays at ~10-15% context budget per the workflow design.
- **Sessions:** v1.0 ran across ~22 days. Multi-session continuity worked via STATE.md + per-phase summaries; resumption was reliable.
- **Notable:** Phase 5/6 plan-checker passing first-try suggests CONTEXT.md investment (interactive discussion → structured decisions) pays off downstream. Earlier phases that skipped or shortened context had longer revision loops.

---

## Milestone: v1.1 — Polish, Closure, and TB Import Rework

**Shipped:** 2026-05-30
**Phases:** 3 | **Plans:** 8 | **Tasks:** 17
**Duration:** ~2 days (intense, sequential phases) — vs v1.0's 22 days

### What Was Built

- **Phase 7 — ImportTB UX Rework** — Real-world unformatted TB handling (Xero/MYOB/QuickBooks/Excel). Header-row auto-detection with low-confidence fallback. Tolerant currency parser preserving decimal.js precision. Subtotal detection (keyword + sum-pattern). Split-column merge. RejectedRowsPanel with apply-to-similar diff preview.
- **Phase 8 — Family Medicare Levy Engine** — Real Australian family Medicare levy + family MLS threshold engines replacing Phase 5's flat-2%-with-warning fallback. v5→v6 additive migration. Bonus: 4 stale Phase-5 single-Medicare/MLS constants corrected to FY2025-26.
- **Phase 9 — Exports + Polish + Cleanup** — FND-02 CSV exports (TB/BAS/Form-I). UX-06 Sidebar anomaly fix-it deep-links with cycle state + 300ms flash + position toast. Nyquist hygiene sweep (v1.0 phases 1/2/6 + v1.1 phases 7/8/9 at milestone-close).

### What Worked

- **CONTEXT-driven planning paid off again.** All 3 v1.1 phase plan-checkers PASSED first-try (no revision loops) — vs v1.0's improving-over-time pattern. Interactive discuss-phase + locked CONTEXT decisions consistently translated to plans the checker had nothing to add to.
- **Discovery during pre-flight saved cycle time.** Phase 9 discuss-phase pre-flight discovered CLEAN-01 (`App.tsx:114` dead string) was already fixed in Phase 1 — the v1.0 audit was wrong. Caught BEFORE planning a code-change task; resolved as REQUIREMENTS doc-only update. Spending 2 minutes grepping the codebase before discussion saved ~30 minutes of unnecessary planning + execution.
- **Bonus scope expansions when surfaced by research.** Phase 8 research discovered 4 stale Phase-5 single-Medicare/MLS constants. Folded into Wave 0 of Phase 8 instead of punting to a separate phase. Trivial fix (~15 min) avoided shipping v1.1 with internal inconsistency (correct family thresholds + wrong single thresholds). User approval for the scope expansion took one round of questions.
- **Pre-existing-issue acknowledgement.** Phase 9 verifier surfaced a `<button>`-in-`<button>` warning in Sidebar NavButton from Phase 6. Honestly logged as pre-existing (not Phase 9's fault), all tests pass, carried as v1.2 polish candidate. Cleaner audit trail than silently fixing it OR ignoring it.
- **Audit-recommended cleanup folded into milestone-close.** Phase 9 explicitly fixed v1.0's Nyquist drift via CLEAN-02. v1.1 audit caught the same drift on Phases 7/8/9 — orchestrator folded the 3 frontmatter flips into the milestone-close commit so v1.1 doesn't carry the drift forward. Net-zero drift after milestone close.
- **Research-time pitfall catches.** Phase 9 research caught that `JournalSearch` is NOT mounted in `JournalsView` (the scroll target lives in the parent component) — saving the planner from putting the deep-link logic in the wrong file. Also caught `Papa.unparse([])` returns `""` not header-only — saving the implementer from a runtime gotcha.

### What Was Inefficient

- **v1.1 had its OWN Nyquist drift** despite v1.0's experience. The "flip frontmatter at end of phase" muscle didn't carry through to v1.1's authors. Action: bake into the phase-close template (or executor's STATE-update task list) that `nyquist_compliant: true` is part of phase close, not a separate sweep.
- **Phase 7 plan check borderline** — 4 tasks per plan triggered a soft warning. Acceptable in context (splitting would've created partially-typed inter-wave props) but worth a planner heuristic: when a plan justifies > 3 tasks, document the rationale in the plan-checker call so the soft warning is contextualised, not just flagged.
- **Stale audit entries** like CLEAN-01 (App.tsx already-fixed string) waste planning time when discovered late. v1.0 milestone-audit could've caught it. Action: when generating audit reports, include a `git grep` verification step for any "remove/delete X" requirement before listing it as pending.
- **Phase 9's "lightweight UAT" still required 10 manual checks** including ones that could've been automated (e.g. CSV-in-Excel verification could be replaced by an automated test that parses the CSV bytes and asserts shape). Reasonable trade-off for v1.1; v2.0 should consider a Tauri-end-to-end harness that runs the export-then-parse flow as a unit test.

### Patterns Established (codify these)

- **Pre-flight discovery before discuss-phase** — Run quick `git grep` / `ls` / `wc -l` checks on REQUIREMENTS items before asking gray-area questions. Catches stale audit entries and confirms the scope is real. Phase 9 used this; it should be standard.
- **Audit-recommended fixes folded into milestone-close** — When the milestone audit identifies trivial hygiene items (like Nyquist drift), fold them into the milestone-close commit rather than carrying to the next milestone. v1.1 milestone-close did this for v1.1's own drift; pattern worth keeping.
- **Bonus scope expansion only when research surfaces it** — Research-time discoveries (e.g. stale constants) can be folded into the in-flight phase with user approval; "let me audit the whole codebase for more wins" should not. Phase 8's scope expansion (4 stale constants) was the right shape; an open-ended "fix everything" sweep would not be.
- **Per-phase Nyquist frontmatter flip at phase close** — should be a standard step in the phase-completion procedure, not a per-milestone sweep.
- **Honesty over silent fixes** — Phase 9 verifier surfaced the pre-existing button-in-button warning; instead of silently fixing it (out of scope) or ignoring it (incomplete record), the audit explicitly carries it as v1.2 polish candidate.

### Key Lessons

- **CONTEXT investment compounds.** v1.0 took 22 days for 6 phases. v1.1 took 2 days for 3 phases. The difference isn't just smaller scope; it's that v1.1's discuss-phase output (locked CONTEXT decisions) translated directly to plans the planner could write in one pass and the checker could pass first-try. The v1.0 phases that struggled (Phase 2/3 multi-session) were the ones with shorter or skipped CONTEXTs.
- **The integration-checker agent caught the cross-phase wiring that single-phase verifiers can't see.** v1.1 audit's integration check confirmed the Phase 7 import → Phase 8 family-Medicare → Phase 9 CSV-export chain end-to-end. Cross-phase wiring is invisible to plan-checker (which sees one phase) and visible to integration-checker (which sees all). Should run integration-checker BEFORE every milestone close, every time.
- **Tech debt is fine if documented.** v1.0 shipped `tech_debt` (FND-02 partial). v1.1 closed FND-02. Both verdicts were honest. v1.1 ships `passed` with 3 documented tech-debt items — none blocking. Carrying named, sized, scoped debt is healthy; carrying unnamed debt is the failure mode.

### Cost Observations

- **Model mix:** Sonnet for executor/verifier/checker; Opus inheritance on planner. Same as v1.0.
- **Sessions:** v1.1 ran across ~2 days with one continuation session per phase (for human-verify UAT). Continuity via STATE.md + per-phase SUMMARYs worked cleanly.
- **Notable:** Single-plan Phase 9 (CONTEXT decision #13: "single Plan 09-1") shipped 6 small-to-medium requirements in one cohesive plan with 4 tasks. Confirms small phases don't need multi-plan structure. The plan-checker accepted it without issue. For polish phases, single-plan is the right granularity.

---

## Cross-Milestone Trends

| Metric | v1.0 | v1.1 | Trend |
|--------|------|------|-------|
| Phases | 6 | 3 | smaller follow-on |
| Plans | 23 | 8 | smaller follow-on |
| Duration | 22 days | 2 days | 11× faster (cleaner foundations) |
| Plan-checker first-try pass rate | 2/6 (33%) | 3/3 (100%) | improved |
| Verifier first-try pass rate | 5/6 (83%) | 3/3 (100%) | improved |
| Stale-checkbox rate at milestone audit | 4/70 (5.7%) | 0/15 (0%) | target hit |
| Critical-blocker gaps at milestone audit | 0 | 0 | maintained |
| Audit verdict | tech_debt | passed | improved |
| Tests GREEN (cumulative) | 763 | 983 (+220) | growing |
| Nyquist-compliant phases at milestone close | 3/6 (50%) | 6/6 v1.0 fixed via CLEAN-02 + 3/3 v1.1 fixed in milestone-close | 100% after v1.1 |
