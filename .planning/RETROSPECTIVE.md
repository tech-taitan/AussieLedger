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

## Cross-Milestone Trends

(One milestone in. Trends emerge from v1.1 onward.)

| Metric | v1.0 |
|--------|------|
| Phases | 6 |
| Plans | 23 |
| Plan-checker first-try pass rate | Last 2 of 6 phases (33%) — improving over time |
| Verifier first-try pass rate | 5 of 6 phases (83%) — Phase 6 caught the LOCK_FY gap |
| Stale-checkbox rate at milestone audit | 4/70 (5.7%) — target 0% by v1.1 |
| Critical-blocker gaps at milestone audit | 0 |
