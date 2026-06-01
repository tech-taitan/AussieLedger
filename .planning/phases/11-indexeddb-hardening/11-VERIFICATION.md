# Phase 11 Plan Verification — IndexedDB Hardening

**Verifier:** gsd-plan-checker
**Date:** 2026-06-01
**Plans verified:** `11-1-PLAN.md` (Wave 1, 3 tasks), `11-2-PLAN.md` (Wave 2, 6 tasks)
**Source-of-truth files loaded:** 11-CONTEXT.md (197 lines), REQUIREMENTS.md §IndexedDB Hardening (IDB-01..05), ROADMAP.md Phase 11 entry (5 SC), STATE.md invariants, PITFALLS.md §2/§3, STACK.md/ARCHITECTURE.md, plus 8 source files (local.ts, period.ts, App.tsx, Toast.tsx, DataPage.tsx, env.ts, legacy-migration.ts, migrations/index.ts) and package.json, structural-lint.test.ts.

---

## Verdict: **REVISION-REQUIRED**

Two blocker-class issues and three warnings prevent a clean PASS. The architecture is sound and the plans cover every requirement; the issues are localised and fixable without re-planning. Required revisions are concrete and below.

**Blocker count:** 2
**Warning count:** 3
**Info count:** 2

Strongest evidence the plans WILL deliver the goal once revised: the must_haves blocks across both plans enumerate user-observable outcomes that map 1:1 to every ROADMAP success criterion; the duck-typing pattern matches the existing getLastExportAt precedent at src/storage/local.ts:151; the iOS UA regex + threshold constants + snooze keys are pinned verbatim from CONTEXT.

---

## Section 1 — ROADMAP Success Criteria Coverage

| # | Success Criterion | Status | Plan/Task Mapping |
|---|-------------------|--------|-------------------|
| SC-1 | persist() called after first meaningful write; result displayed in DataPage as "Storage protected" / "Storage not protected — back up regularly"; degrades silently | **AMBER** | 11-1 Task 2 (tryPersist in init) + 11-2 Task 3 (DataPage persist-status render). **Deviation:** the SC text says "after a users first meaningful write (entity created or journal posted)"; the CONTEXT and plans put the call in LocalAdapter.init() instead. CONTEXT explicitly justifies this ("by init time the engagement score has already accumulated for returning users"). This is a documented, deliberate CONTEXT deviation from the ROADMAP literal — acceptable. |
| SC-2 | Plain-English quota disclosure via navigator.storage.estimate() | **GREEN** | 11-1 Task 2 (getStorageEstimate accessor, tests 7-10) + 11-2 Task 3 (formatQuotaLine, render at data-testid="storage-quota", tests 1-3 cover null/partial fallback). Format string "~2.4 GB allocated · 47 MB used" matches CONTEXT decision verbatim. |
| SC-3 | Warn-tone Toast on app load, 7d desktop / 5d iOS Safari threshold, Export-now + Snooze-7-days buttons, snooze persisted in aussieledger:backup-nag-snoozed-until | **GREEN** | 11-2 Task 1 (useBackupNag with 12 tests covering all branches) + Task 4 (Toast actions slot) + Task 5 (App-level mount + Toast render with both buttons). Snooze key string is verbatim. iOS regex /iPad-iPhone-iPod/ AND /Safari/ AND NOT /CriOS-FxiOS-EdgiOS/ matches CONTEXT specifics line 164. |
| SC-4 | iOS-Safari + non-standalone banner in DataPage; ITP wipe explanation; Add-to-Home-Screen instructions; dismissible | **GREEN** | 11-2 Task 2 (IosItpBanner, 12 tests including all 4 gates + 3 UA rejections + verbatim copy assertion) + Task 3 (DataPage mounts <IosItpBanner /> once). Verbatim copy string locked at must_haves and tested. |
| SC-5 | beforeunload + visibilitychange fires when lastWriteAt > lastExportAt; listener registered conditionally to preserve Firefox bfcache | **AMBER** | 11-2 Task 5 (App-level conditional useEffect with [isDirty] dep, 7 tests). **Concern flagged by planner item 4:** visibilitychange handler body is empty (no-op), tests only confirm REGISTRATION not behaviour. SC-5 literal text says "fires a complementary state-flush" — the plan ships the listener pair (per CONTEXT decision) but the flush body is deferred. See blocker B2 below. |

**Summary:** SC-2/3/4 GREEN. SC-1 AMBER (CONTEXT-justified deviation — acceptable). SC-5 AMBER (visibilitychange handler is structurally a no-op — see B2).

---

## Section 2 — IDB Requirement Clauses

| Req | Clause | Status | Mapping |
|-----|--------|--------|---------|
| **IDB-01** | navigator.storage.persist() called on first meaningful action | AMBER (init-time per CONTEXT deviation, documented) | 11-1 Task 2 step 4 |
| **IDB-01** | Result cached via navigator.storage.persisted() semantics | GREEN | 11-1 Task 2 — _persistGranted cached, tests 2-3 verify exactly-once |
| **IDB-01** | New getPersistGranted() accessor (duck-typed; not on StorageAdapter interface) | GREEN | 11-1 Task 2 — added inside LocalAdapter; StorageAdapter interface untouched per plan verification check 6 |
| **IDB-01** | Never re-prompted across sessions | GREEN | 11-1 Task 2 test 4 (Firefox deny → no retry); cached false respected |
| **IDB-02** | Quota disclosure via navigator.storage.estimate() on DataPage | GREEN | 11-1 Task 2 (getStorageEstimate) + 11-2 Task 3 (render + format) |
| **IDB-02** | Plain English: "Your browser has allocated approximately X GB; currently using Y MB" | **AMBER** | ROADMAP literal is "Your browser has allocated approximately 2.4 GB for this site. Currently using 47 MB." Plan ships "~2.4 GB allocated · 47 MB used" per CONTEXT decision ("Text-only one-liner"). CONTEXT-locked format is more terse than ROADMAP example. Acceptable — ROADMAP example was illustrative, CONTEXT locked exact format. Not a blocker. |
| **IDB-02** | Friendly disclosure, not a warning | GREEN | No warn/alert styling; plain text on Status card |
| **IDB-03** | Backup-nag toast fires on app load when today - lastExportAt > threshold | GREEN | 11-2 Task 1 tests 4, 6, 8 (different threshold-crossing scenarios) |
| **IDB-03** | Threshold 7d desktop / 5d iOS Safari | GREEN | 11-2 Task 1 — BACKUP_NAG_DAYS_DESKTOP=7, BACKUP_NAG_DAYS_IOS=5; tests 5-9 verify both |
| **IDB-03** | "Export now" + "Snooze 7 days" buttons | GREEN | 11-2 Task 5 step 3 — both buttons rendered via Toast actions slot; tests 6-7 verify presence |
| **IDB-03** | Snooze in localStorage aussieledger:backup-nag-snoozed-until | GREEN | 11-2 Task 1 step 2 — constant declared; test 10 verifies write |
| **IDB-04** | iOS Safari UA + not-standalone gates banner in DataPage | GREEN | 11-2 Task 2 tests 2, 3 (non-iOS), 6 (standalone) — gate matrix exhaustive |
| **IDB-04** | Per-session dismissible | GREEN | 11-2 Task 2 — sessionStorage key + tests 11-12 verify persistence across mount within session |
| **IDB-04** | Banner explains 7-day ITP wipe and recommends Add-to-Home-Screen | GREEN | 11-2 Task 2 step 3 — verbatim copy + <details> How? expand with Share-menu steps |
| **IDB-05** | beforeunload + visibilitychange guard fires when lastWriteAt > lastExportAt | AMBER (visibilitychange handler is no-op — see B2) | 11-2 Task 5 |
| **IDB-05** | Listener registered/unregistered conditionally (Firefox bfcache) | GREEN | 11-2 Task 5 step 2 — useEffect with [isDirty] dep + if (!isDirty) return BEFORE addEventListener; test 1 verifies non-registration when clean; test 5 verifies cleanup |
| **IDB-05** | New getLastWriteAt()/setLastWriteAt() accessors (duck-typed) | GREEN | 11-1 Task 2 step 6 |
| **IDB-05** | lastWriteAt bumped on every data-changing put (entities/accounts/entries/auditLogs) | GREEN | 11-1 Task 2 step 7 — 6 call sites wrapped; tests 11-16 |
| **IDB-05** | Bulk imports bump; schema migrations do NOT | **RED — see Blocker B1** | CONTEXT decision says migrations must NOT bump lastWriteAt. Plan handles this as a CONDITIONAL check in 11-1 Task 2 step 9. In reality, migrate() is a pure function that returns a PersistedRoot, and the persistence call after it is adapter.importAll() (see src/storage/legacy-migration.ts:67-68). Since importAll now bumps lastWriteAt (per Plan 11-1 Task 2 step 7 / Test 16), **every legacy-migration run from init() will bump lastWriteAt** — contradicts the CONTEXT decision verbatim. The conditional fix language in step 9 ("If the runner goes through saveX, add a runner-only bypass") does not catch this because the migration path goes through importAll, not saveX. |

**Requirement coverage in plan frontmatter:** Both plans declare correct requirements: arrays. 11-1 = [IDB-01, IDB-02, IDB-05]; 11-2 = [IDB-01, IDB-02, IDB-03, IDB-04, IDB-05]. Every IDB-0N appears in at least one plan. ROADMAP cross-check: all five IDB requirements are mapped.

**PROJECT.md/REQUIREMENTS.md exhaustive cross-check:** No requirement relevant to Phase 11 is silently dropped. Phases 12/13/14 requirements (AI-01/02, PWA-01, POL-01..04) are correctly NOT addressed in these plans.

---

## Section 3 — Invariant Audit

| ID | Invariant | Status | Evidence |
|----|-----------|--------|----------|
| (a) | StorageAdapter FINAL — all new methods via duck-typing on LocalAdapter only | GREEN | 11-1 Task 2 step 6 adds 4 accessors INSIDE LocalAdapter class, NOT in StorageAdapter interface. Plan-level verification check 6 explicitly asserts git diff src/storage/adapter.ts shows zero lines changed. Plan 11-2 Task 3 step 4 + Task 5 step 2 access via as unknown as { ... } pattern, matching existing getLastExportAt precedent. |
| (b) | No new Date() outside src/lib/period.ts | AMBER — see W1 | The plans route nowIso() / today() through period.ts as intended. **However, there is currently NO automated test enforcing this invariant.** STATE.md line 102 claims it is a "Phase 2 structural lint" but the actual src/lib/tax/__tests__/structural-lint.test.ts only enforces (a) raw float arithmetic in src/lib/tax/, (b) no React in src/lib/tax/, (c) fy2026 exports, (d) seed CoA. npm run lint is tsc --noEmit; npm run build is vite build + scan-aiza.mjs (AIza-only). Neither catches a stray new Date(). Plan 11-1 Task 3 step 5 mitigates by manual grep -n "new Date" src/storage/local.ts (line 547-549), which is correct discipline but the planner repeatedly justifies design choices as "the Phase 2 structural lint will fail the build" (e.g. 11-2 Task 1 step 4) — this is a false premise about an enforcement that does not exist. The discipline is correct; the rationale is wrong. See W1 below for fix. |
| (c) | SPDX header on new source files (useBackupNag.ts, IosItpBanner.tsx, new test files) | GREEN | 11-1 Task 2 PART B step 1 (local-hardening.test.ts); 11-2 Task 1 step 1, Task 2 step 1, Task 5 step 4 — all explicitly add /** @license SPDX-License-Identifier: Apache-2.0 */. |
| (d) | setLastExportAt does NOT bump lastWriteAt | GREEN | 11-1 Task 2 step 8 — explicitly preserves the existing setLastExportAt body with an inline comment forbidding the bump; Test 17 reads lastWriteAt before/after and asserts unchanged. |
| (e) | Schema migrations do NOT bump lastWriteAt | **RED — Blocker B1** | The CONTEXT decision is unambiguous; the plan mitigation (11-1 Task 2 step 9) is CONDITIONAL on whether migrations route through saveX. They do not — they route through importAll, which DOES bump per Plan 11-1 design. Result: every app launch with a legacy-localStorage record triggers a write bump on the very first init, before any user action. |
| (f) | Bulk imports DO bump lastWriteAt | GREEN | 11-1 Task 2 step 7 (importAll wrap) + 11-2 Task 3 step 9 (DataPage handleImport defence-in-depth setLastWriteAt(nowIso())). Test 16 in 11-1 verifies. |
| (g) | persist() never re-prompted | GREEN | 11-1 Task 2 step 5 — tryPersist called only from init(); cached forever; tests 2 (count=1 after init), 3 (count=1 after 5 reads), 4 (count=1 after deny) verify. |
| (h) | iOS ITP banner gated on isHostedMode() === true | GREEN | 11-2 Task 2 step 3 — if (!isHostedMode()) return null is the first gate; Test 1 verifies. |
| (i) | beforeunload registered CONDITIONALLY (Firefox bfcache exclusion) | GREEN | 11-2 Task 5 step 2 — useEffect with [isDirty] dep + if (!isDirty) return; BEFORE addEventListener. Tests 1 (no listener when clean), 5 (cleanup on dirty going false) verify. The plan explicitly forbids the wrong pattern: "Do NOT register beforeunload always-on with internal if (!isDirty) return". |

---

## Section 4 — Pitfall Coverage

| # | Pitfall | Status | Mapping |
|---|---------|--------|---------|
| §2 | iOS Safari ITP 7-day wipe (HARD-BLOCK) | GREEN | Banner copy mentions the 7-day risk; Add-to-Home-Screen instructions inline; 5-day backup-nag threshold for iOS Safari (gives user 2-day margin before wipe). 11-2 Task 2 + Task 1 cover all four PITFALLS.md §2 preventions: (1) persistent disclosure, (2) shorter nag threshold, (3) honest persist() display, (4) iOS warning. The plans omit PITFALLS §2 prevention #5 ("Document in README under iOS users") — that is POL-04 / Phase 14 territory, correctly out of scope. |
| §3 | beforeunload + Firefox bfcache exclusion (HARD-BLOCK) | GREEN | Conditional registration is the explicit fix per PITFALLS.md §3; Plan 11-2 Task 5 ships this pattern verbatim. Test 1 (no listener when clean) and test 5 (cleanup) lock the behaviour. |

Both Phase-11-scoped HARD-BLOCK pitfalls are addressed.

---

## Section 5 — Blocker Issues

### Blocker B1 — Migrations path through importAll will silently bump lastWriteAt

```yaml
issue:
  plan: "11-1"
  dimension: context_compliance
  severity: blocker
  description: |
    CONTEXT decision: "Migration writes bumping lastWriteAt — only user-content writes
    bump it; migrations are app-version changes; bumping would fire backup-nag on
    every release." Plan 11-1 wraps importAll with bumpWriteAt (Task 2 step 7,
    Test 16). But the legacy-migration path in src/storage/legacy-migration.ts:67-68
    calls migrate(assembled) then adapter.importAll(migrated) — which now bumps
    lastWriteAt. Every app launch with a legacy record triggers a stale-state bump
    BEFORE any user action.
  task: 2
  step: 9
  fix_hint: |
    Plan 11-1 Task 2 step 9 currently says "CHECK src/lib/migrations/runner.ts ... If
    the runner goes through saveX, add a runner-only bypass." It does not — but it
    routes through importAll, which has the same problem. Two options:
    (1) Add an internal _rawImportAll method that skips bumpWriteAt, called by
        legacy-migration.ts and the runner (a true rename — public importAll stays
        bumping for the user-import path).
    (2) Take an explicit bump: boolean = true parameter on importAll; legacy-
        migration passes false; DataPage handleImport passes true (or the existing
        defence-in-depth setLastWriteAt remains in DataPage).
    Option 1 is cleaner because it does not widen the StorageAdapter interface or
    require a public-API parameter that v1.0/v1.1 callers do not know about.
    Either way: add a Task 2 step that EXPLICITLY runs git grep -n "importAll" in
    Wave 0 (before tests are written) so the call sites are enumerated and the bump
    behaviour is deterministic, not conditional on planner inspection.
  invariant_violated: (e)
  request_severity: Must fix before execution
```

### Blocker B2 — visibilitychange handler is a no-op; tests only verify registration

```yaml
issue:
  plan: "11-2"
  dimension: verification_derivation
  severity: blocker
  description: |
    11-2 Task 5 step 2 ships visHandler with an empty body (the inner block contains
    only an if (document.visibilityState === hidden) { /* intentionally empty */ }
    comment). Test 3 only verifies addEventListener was called; no test exercises the
    handler runtime effect.

    ROADMAP SC-5 says "visibilitychange fires a COMPLEMENTARY STATE-FLUSH for iOS Safari
    where beforeunload is unreliable" (caps mine). IDB-05 acceptance text says
    "visibilitychange COMPLEMENT IS REQUIRED because iOS Safari fires beforeunload
    unreliably". Shipping a no-op handler does not satisfy "state-flush" or "complement".

    The plan author justifies this in Task 5 step 2 comment: "no dialog API on
    visibilitychange — this is a hook for future work". That is true about the dialog,
    but state-flush is achievable: confirm any pending IDB writes have completed (e.g.
    await getAdapter() then await a no-op transaction to flush the queue) or set a
    cookie/localStorage breadcrumb that the next session can detect for "you left with
    unsaved data" messaging.
  task: 5
  fix_hint: |
    Either:
    (1) Implement a real flush — e.g. on visibilityState === hidden AND isDirty,
        await adapter.getEntities() (a no-op read forces the IDB event queue to drain;
        confirms in-flight writes have settled). Add a test that mocks adapter and
        verifies the read fires under dirty+hidden. Lightweight, satisfies "complement".
    (2) Update CONTEXT.md decision to explicitly defer the state-flush body to v1.3
        and tighten the ROADMAP SC-5 wording to "registered alongside as a future
        hook" — but this is a CONTEXT amendment, not a plan-level fix.
    Recommended: option (1). The plan current shape is "register the listener but
    do nothing" which exposes the user to bfcache behaviour with no offsetting safety
    benefit. The cost of option 1 is ~10 lines + 1 test.
  invariant_violated: derivation (must_haves.truths "no-op handler" is not user-observable)
  request_severity: Must fix before execution
```

---

## Section 6 — Warning Issues

### Warning W1 — Plans invoke a non-existent "Phase 2 structural lint" enforcement

```yaml
issue:
  plans: ["11-1", "11-2"]
  dimension: verification_derivation
  severity: warning
  description: |
    STATE.md line 102 lists "No new Date() outside src/lib/period.ts — Phase 2
    structural lint" as a Phase 2 invariant. The actual test file
    src/lib/tax/__tests__/structural-lint.test.ts only enforces 4 rules and NONE
    of them is the new-Date ban. npm run lint is tsc --noEmit; npm run build is
    vite build + node scripts/scan-aiza.mjs (AIza-only).

    Plan 11-1 Task 2 step 1 says "Phase 2 structural lint passes" as the rationale
    for routing through nowIso. Plan 11-2 Task 1 step 4 says the same. The discipline
    is correct (route through period.ts) but the rationale is a fabricated enforcement
    that will not actually fail anyones build. A new contributor reading the plan will
    look for the lint and find nothing — risking confusion or accidental regression.
  task: multiple
  fix_hint: |
    EITHER (preferred): in this phase or a follow-up Wave 0 step, ADD the missing
    structural-lint enforcement — a new test in src/__tests__/structural-lint-no-
    wallclock.test.ts that greps all src/**/*.ts (excluding period.ts and *.test.ts)
    for new Date( with no arguments (new Date() exactly) and fails on any match.
    This is ~30 lines, makes the invariant real, and closes a long-standing
    documentation-vs-enforcement gap.
    OR: change all 5 mentions of "Phase 2 structural lint will fail" in the plans
    to "Phase 2 documentation convention; manually verified in Task 3 step 5".
    Recommended: the former — it locks the invariant for v1.2+ at minimal cost.
  invariant_violated: (b) — documented but not enforced
  request_severity: Should fix before execution; not blocking
```

### Warning W2 — Plan 11-2 has 6 tasks (upper bound of guidance)

```yaml
issue:
  plan: "11-2"
  dimension: scope_sanity
  severity: warning
  description: |
    11-2 has 6 tasks (Task 6 is verification-only — non-source). The planner-flagged
    item 5 asks whether this should split into 3 plans. Splitting into 3:
    - 11-2: useBackupNag + Toast widening (Tasks 1, 4) — pure-logic surface
    - 11-3: IosItpBanner + DataPage extension (Tasks 2, 3) — DataPage-mounted UI
    - 11-4: App.tsx wiring (Task 5) + final verification (Task 6) — App-level integration
    Pros of splitting: each plan stays at 2-3 tasks, easier context budgeting,
    parallel-friendly (11-2/11-3 could run together after 11-1).
    Cons: more file-shuffling overhead; the current 11-2 task dependency chain is
    mostly linear (useBackupNag → Toast → DataPage → App) so parallelism gain is small;
    additional plan-frontmatter overhead.
    CONTEXT does not mandate a split. Planner own guidance is "2-3 tasks/plan target,
    4 warning, 5+ blocker". 6 source-touching tasks (excluding Task 6 verification)
    is over the warning threshold but the work is genuinely interconnected and the
    must_haves block is comprehensive enough to keep coherent context.
  fix_hint: |
    Acceptable as-is for v1.2 IF the executor maintains rigorous task-boundary
    discipline — finish Task 1 (incl. addDaysIso + its tests + 12 hook tests)
    completely before starting Task 2. If the executor is showing context strain
    after Task 3 (i.e. starting to hand-wave Task 4-5 details), STOP and split into
    11-3 covering Tasks 5-6. Not a blocker — execution can handle this — but flag
    for orchestrator awareness.
  request_severity: Acceptable; monitor at execution time
```

### Warning W3 — addDaysIso straddle creates an out-of-phase API addition

```yaml
issue:
  plans: ["11-1", "11-2"]
  dimension: dependency_correctness
  severity: warning
  description: |
    11-1 adds nowIso() to period.ts. 11-2 Task 1 step 4 adds addDaysIso(days)
    to period.ts. This means period.ts is mutated by two separate plans in two
    separate waves. There is no ordering bug — 11-2 depends on 11-1 (Wave 2 → Wave 1)
    and 11-1 will have completed before 11-2 starts — but there is a contract
    inconsistency: 11-1 plan frontmatter files_modified lists period.ts; 11-1
    success_criteria say period.ts "exports nowIso(): string" (singular). 11-2
    plan frontmatter does NOT list period.ts in files_modified. So if you read
    only 11-2 frontmatter, you would miss that this plan changes period.ts.

    Planner item 1 asks if this creates a circular/timing issue. Timing: no
    (Wave 1 → Wave 2 is correct). Circular: no (11-2 only consumes 11-1 nowIso,
    11-2 only adds the addDaysIso name; no dependency reverses). The issue is
    purely declarative — frontmatter inaccuracy.
  fix_hint: |
    Add src/lib/period.ts and src/lib/__tests__/period.test.ts to 11-2
    files_modified: frontmatter list. Then the gsd-tools plan-structure check
    will reflect reality. No code changes; pure metadata fix.
  request_severity: Should fix; not blocking execution
```

---

## Section 7 — Info Issues

### Info I1 — Toast widening comment update is correct interpretation

Planner item 2 asks for confirmation: yes. Toast.tsx line 6-7 says "Do NOT widen to other use cases in v1.1 — see 09-CONTEXT.md". The v1.1 milestone has closed (recent commit 1ed4831: chore: archive v1.1 milestone). v1.2 is the next milestone and ARCHITECTURE.md §5 explicitly authorises the widening. CONTEXT decision "Claude Discretion" allows the planner to choose how to plumb the buttons; planner picked Option C (extend Toast). 11-2 Task 4 step 1 updates the comment to reflect v1.2 widening with a forward-restriction ("Do not widen further without a CONTEXT.md decision"). Comment update is appropriate. No action.

### Info I2 — npm run lint is type-check only

A new contributor reading "lint EXIT 0" might expect ESLint. The project lint script is tsc --noEmit + tsc -p server/tsconfig.json --noEmit. The plans correctly say "lint EXIT 0" because that is what the package.json script does, but this is a project-naming convention that deserves a one-line clarification somewhere (CLAUDE.md or README). Not a plan issue. No action required at plan level.

---

## Section 8 — Discretion Call Adjudication

CONTEXT ### Claude Discretion block lists 9 areas the planner is free to choose. The plans exercise these:

| # | Discretion Area | Planner Choice | Adjudication |
|---|-----------------|----------------|--------------|
| 1 | iOS Safari UA regex | /iPad-iPhone-iPod/ AND /Safari/ AND NOT /CriOS-FxiOS-EdgiOS/ | ACCEPTED — matches CONTEXT own suggested pattern verbatim; common-case correct; tests 3-5 of 11-2 Task 2 verify all 3 rejection variants. |
| 2 | Threshold day-math | MS_PER_DAY * BACKUP_NAG_DAYS_* constants inline in useBackupNag.ts | ACCEPTED — CONTEXT allowed extraction to a constants module if cleaner. Inline is fine for 4 constants. |
| 3 | useBackupNag signature | useBackupNag(navigateToData?: () => void): BackupNagState (returns state object incl. visible/message/onExport/onSnooze/onDismiss) | ACCEPTED — match for the Toast actions slot wiring; navigateToData is the cleanest decoupling (App passes () => setView(data)). |
| 4 | Backup-nag button labels | "Export now" / "Snooze 7 days" verbatim | ACCEPTED — matches CONTEXT specifics. |
| 5 | ITP banner visual | bg-amber-50 border border-amber-200 Tailwind classes | ACCEPTED — matches the project existing inline-banner aesthetic (compare DataPage Status section). |
| 6 | getPersistGranted() return type | Promise<boolean | null> | ACCEPTED — matches CONTEXT specifics line 81. |
| 7 | estimate() undefined handling | Hide line when quota OR usage is undefined | ACCEPTED — matches CONTEXT decision "silent fallback". |
| 8 | bumpWriteAt as helper vs inline | Private helper called from 6 sites | ACCEPTED — CONTEXT says "helper is cleaner if >3 call sites"; there are 6. |
| 9 | How? expand inline vs sub-component | Inline <details> | ACCEPTED — ~10 lines of content; below CONTEXT "if more than ~10 lines extract" threshold. |

**Non-discretionary deviations** (planner went beyond discretion boundaries):
- addDaysIso added to period.ts — this is a NEW helper not mentioned in CONTEXT discretion. Justified by the structural-lint-discipline framing (even though the lint does not exist — see W1). The addition itself is correct architecture (single-source ISO arithmetic, test-injectable via _nowProvider). Acceptable.
- Toast actions?: ReactNode widening — CONTEXT does not explicitly authorise this in ### Claude Discretion. The planner cites ARCHITECTURE.md §5 as justification. This is a contract change touching a v1.1-locked primitive. **Question for the orchestrator:** is ARCHITECTURE.md §5 authority enough, or should this be re-bounced to /gsd:discuss-phase as a CONTEXT amendment? **My read:** CONTEXT note in <decisions> Backup-nag section line 48 says the Toast must surface with "Export now" + "Snooze 7 days" buttons via the existing Toast primitive. The existing Toast does not support buttons. So one of {extend Toast, render buttons outside Toast, change CONTEXT} must happen. The planner picked the cleanest of the three. **Acceptable** as a justified deviation, with the cited authority (ARCHITECTURE.md §5).

All 5 explicitly-asked discretion calls plus 2 deviations are sound.

---

## Section 9 — Planner-Flagged Item Adjudication

| # | Planner Item | Adjudication |
|---|--------------|--------------|
| 1 | addDaysIso extension to period.ts straddles 11-1 + 11-2 | **OK with metadata fix.** No timing/circularity issue. See W3 — pure frontmatter declarative gap; fix 11-2 files_modified list. |
| 2 | Toast widening with actions?: ReactNode slot — comment update for v1.2 | **Correct interpretation.** See I1 — v1.1 milestone is closed; v1.2 widening is authorised by ARCHITECTURE.md §5; comment update is appropriate. |
| 3 | Migrations-runner non-bumping is a conditional task in 11-1 | **NOT OK — must be hard Wave 0 verification.** See B1 — the conditional check misses the actual call path (legacy-migration → importAll). Must be promoted to a hard step BEFORE Test 16 in 11-1 Task 2, with the bypass mechanism designed. |
| 4 | visibilitychange handler is a no-op; tests verify registration only | **NOT OK — match CONTEXT intent.** See B2 — CONTEXT decision was to register the pair, but ROADMAP SC-5 + IDB-05 acceptance text say "fires a complementary state-flush". Empty body fails both. Must implement a real flush (recommended: no-op read to drain queue) OR amend CONTEXT to defer the flush body. |
| 5 | Plan 11-2 has 6 tasks — split into 3 plans? | **OK with execution-time monitoring.** See W2 — 6 tasks is at the warning threshold; work is interconnected; CONTEXT does not mandate split. Acceptable if executor maintains task-boundary discipline. Orchestrator should be ready to split mid-execution if context strain appears after Task 3. |

---

## Section 10 — Verification Commands Audit

Are the plans verification commands runnable and demonstrate GREEN?

| Plan/Task | Command | Will Show GREEN? |
|-----------|---------|------------------|
| 11-1 Task 1 | npx vitest run src/lib/__tests__/period.test.ts | Yes — extends existing test file with 4 nowIso tests; existing tests still pass. |
| 11-1 Task 2 | npx vitest run src/storage/__tests__/local-hardening.test.ts src/storage/__tests__/local.test.ts | Yes for hardening tests if mocks set up correctly; existing local.test.ts has no put-count assertions (verified via grep), so bumpWriteAt will not regress. **Caveat:** if B1 fix routes legacy-migration through a _rawImportAll, the existing local.test.ts legacy-migration suite (if any) needs to be checked for assertions about which method was called. Quick grep needed at execution time. |
| 11-1 Task 3 | npm run lint AND npm run build AND npx vitest run | Yes — these are the project actual scripts. Note: "lint" is tsc, not eslint. |
| 11-2 Task 1 | npx vitest run src/hooks/__tests__/useBackupNag.test.ts src/lib/__tests__/period.test.ts | Yes — fresh hook tests + addDaysIso extension. |
| 11-2 Task 2 | npx vitest run src/components/__tests__/IosItpBanner.test.tsx | Yes — fresh component tests. |
| 11-2 Task 3 | npx vitest run src/components/__tests__/DataPage.test.tsx src/components/__tests__/IosItpBanner.test.tsx | Yes — extends existing DataPage tests. Risk: DataPage test fixture must be updated to mock the 4 new duck-typed methods. Plan calls this out. |
| 11-2 Task 4 | npx vitest run src/components/__tests__/Toast.test.tsx | Yes. |
| 11-2 Task 5 | npx vitest run src/__tests__/App.beforeunload.test.tsx ... | Yes — App-level integration test is fresh; spies on addEventListener; verifies all 7 behaviours. |
| 11-2 Task 6 | npm run lint AND npm run build AND npx vitest run | Yes. |

**Test count projection:**
- 11-1: ~4 (period extension) + ~19 (local-hardening) = ~23 new tests. Plan says "~30 new" — slight inflation; ~23 is the actual count. Existing 999 → ~1022 SPA GREEN. Plan says ~1029. Discrepancy of ~6 tests. Plausibility: OK (small).
- 11-2: 12 (useBackupNag) + 12 (IosItpBanner) + 10 (DataPage extension) + 4 (Toast) + 7 (App) + 2 (addDaysIso) = 47 new tests. Plan says ~50. Plausibility: OK.
- Total Phase 11: ~70 new SPA tests on baseline 999 → ~1069 SPA GREEN. Plan claims ~1076. Off by ~7. Within margin.

Server tests unchanged at 18 (Phase 11 does not touch server/). Confirmed by file_paths in files_modified of both plans.

---

## Section 11 — Out-of-Scope Hygiene

Confirmed: NO task implements work belonging to Phase 12/13/14:
- No AI key UI (Phase 12 / AI-01 / AI-02) — confirmed by grep of plan files_modified (no Settings.tsx, no ai.ts changes).
- No PWA manifest, no vite-plugin-pwa (Phase 13 / PWA-01) — confirmed by grep (no vite.config.ts changes, no manifest.json).
- No /demo route, no first-visit UX, no /privacy page, no README rewrite (Phase 14 / POL-01..04) — confirmed.
- No custom domain work (HOST-04 — already complete in Phase 10).

All scope discipline GREEN.

---

## Section 12 — Required Revisions Summary

**Must fix before execution (blockers):**

1. **B1 — Migrations path must bypass lastWriteAt bump.** Plan: 11-1, Task 2. Add a Wave-0-style verification step that enumerates all importAll call sites (git grep -n "importAll" returns: src/storage/legacy-migration.ts:68, src/components/DataPage.tsx:183, and any test files). Design a bypass: recommended introduces _rawImportAll (internal, no bump) called by legacy-migration.ts; the public importAll (which DOES bump) stays the user-import path called by DataPage. Update Test 16 of 11-1 to verify BOTH paths separately. Update legacy-migration.ts to call _rawImportAll so v1.0-data-on-first-launch users do not see a spurious lastWriteAt bump that triggers backup-nag.

2. **B2 — Implement real visibilitychange flush OR amend CONTEXT.** Plan: 11-2, Task 5. Either implement option-1 from B2 fix_hint (no-op read to drain queue + a test that verifies it fires under hidden+dirty), OR re-open /gsd:discuss-phase for an amendment that defers the flush body explicitly to v1.3 and updates SC-5 + IDB-05 wording. Recommended: option 1, ~10 lines + 1 test.

**Should fix before execution (warnings):**

3. **W1 — Add the missing new Date() structural-lint test** OR remove false references to it in plan rationale. Recommended: add the test. Location: src/__tests__/structural-lint-no-wallclock.test.ts. Greps all src/**/*.ts (excluding src/lib/period.ts, *.test.ts, *.test.tsx) for new Date() with zero arguments. Locks the invariant for v1.2+.

4. **W3 — Update 11-2 frontmatter files_modified** to include src/lib/period.ts and src/lib/__tests__/period.test.ts.

**Acceptable but monitor (info):**

5. **W2 — 11-2 has 6 tasks** at the warning threshold. Orchestrator should monitor executor context strain after Task 3; be ready to split into 11-3 if needed.

---

## Section 13 — Final Summary

**Verdict: REVISION-REQUIRED**

The plans are architecturally sound, exhaustively cross-referenced to CONTEXT/REQUIREMENTS/ROADMAP/PITFALLS, and exercise project conventions correctly (SPDX headers, duck-typing, period.ts routing, conditional listener registration). Coverage of all 5 IDB-0N requirements and all 5 ROADMAP success criteria is comprehensive on the surface.

Two blocking issues hide in the implementation details:

1. **The legacy-migration path will bump lastWriteAt** on every v1.0-data-bearing user first launch under Phase 11, contradicting a locked CONTEXT decision. The plan conditional check (11-1 Task 2 step 9) does not catch this because it inspected the wrong call path. Fix: introduce a no-bump internal method for migration paths.

2. **The visibilitychange handler ships as a no-op**, with tests verifying registration only. ROADMAP SC-5 and IDB-05 acceptance text require "complementary state-flush", which an empty body does not deliver. Fix: implement a lightweight queue-drain or re-open CONTEXT for an explicit deferral.

Three warnings (W1 structural-lint-enforcement gap; W2 6-task scope at upper bound; W3 frontmatter declarative gap) are non-blocking but recommended fixes before execution.

The 5 planner-flagged items are adjudicated:
- 1 (addDaysIso straddle) — OK with metadata fix (W3)
- 2 (Toast widening comment) — correct interpretation (I1)
- 3 (migrations conditional) — NOT OK, must be hard step (B1)
- 4 (visibilitychange no-op) — NOT OK, must be real flush (B2)
- 5 (6 tasks in 11-2) — OK with monitoring (W2)

The 5 explicit discretion calls plus 2 justified deviations are sound.

**Recommended path forward:** return to gsd-planner with B1 + B2 + W1 + W3 as concrete asks. Estimate: B1 = ~30 lines + 2 tests + 1 line in legacy-migration.ts; B2 = ~10 lines + 1 test; W1 = ~30 lines new test file; W3 = 2-line frontmatter edit. Total revision scope: small. After revision, re-verify and proceed to execution.

Once revised, the plans WILL deliver every Phase 11 success criterion within the project invariants.



---

## REVISION REVIEW — 2026-06-01 (Round 2)

Planner returned with revisions targeting B1, B2, W1, W3. Each delta verified against the revised plan files.

### Delta 1 — Blocker B1 (legacy-migration silent-import fix) — RESOLVED

| Check | Status | Evidence |
|-------|--------|----------|
| (a) Frontmatter files_modified includes src/storage/legacy-migration.ts AND src/lib/__tests__/structural-lint-period.test.ts | GREEN | 11-1-PLAN.md lines 11, 13 |
| (b) must_haves.truths lists widened importAll signature | GREEN | 11-1-PLAN.md line 26: importAll signature widened to (state: PersistedRoot, opts?: { silent?: boolean })... |
| (c) must_haves.artifacts has legacy-migration.ts entry | GREEN | 11-1-PLAN.md lines 51-53 (path + contains: silent: true) |
| (d) Task 2 interfaces shows before/after diff for legacy-migration.ts line 68 | GREEN | 11-1-PLAN.md lines 250-262 (explicit BEFORE/AFTER comment block) |
| (e) Task 2 step 9 is HARD verification (not soft CHECK runner.ts conditional) | GREEN | 11-1-PLAN.md lines 545-565: Blocker 1 fix — HARD verification + edit, with sub-steps (a) confirm line 68, (b) change to silent:true, (c) audit runner.ts, (d) require unit tests, (e) explicit rejection of _rawImportAll alternative |
| (f) Task 2 behavior includes Tests 20, 21, 22 | GREEN | 11-1-PLAN.md lines 397-401: Test 20 (silent:true does NOT bump), Test 21 (silent:false AND default both bump), Test 22 (legacy-migration end-to-end leaves lastWriteAt null) |
| (g) local-hardening test min_lines bumped 120 to 160 | GREEN | 11-1-PLAN.md line 50: min_lines: 160 |

**B1 verdict: RESOLVED.** The opts.silent approach is cleanly designed (option (b) from my prior fix_hint), call-site edit is explicit with rationale comment, audit of runner.ts is included, and three new tests cover both the unit behaviour AND the end-to-end legacy-migration scenario. Plan-level verification check #8 grep-asserts the legacy-migration string is the new form with zero matches of the bare form.

### Delta 2 — Blocker B2 (visibilitychange settle-point body) — RESOLVED

| Check | Status | Evidence |
|-------|--------|----------|
| (a) must_haves.truths has settle-point-flush truth (NOT no-op) | GREEN | 11-2-PLAN.md line 46: real settle-point flush via fire-and-forget await getLastWriteAt() (forces pending IDB write transactions to land before iOS Safari may suspend the tab); HONESTLY documented that no dialog API exists on visibilitychange... |
| (b) Frontmatter files_modified includes .planning/REQUIREMENTS.md | GREEN | 11-2-PLAN.md line 20 |
| (c) interfaces block shows real settle-point implementation (fire-and-forget IIFE, try/catch, getLastWriteAt await) | GREEN | 11-2-PLAN.md lines 283-303: visHandler with `if (document.visibilityState !== hidden) return; if (!isDirty) return; void (async () => { try { ... await maybe.getLastWriteAt(); ... } catch { /* visibilitychange must never throw */ } })()` |
| (d) Task 5 step 5 (NEW) appends IDB-05 trailing italicised note to REQUIREMENTS.md | GREEN | 11-2-PLAN.md lines 950-955: Blocker 2 fix companion — add the REQUIREMENTS.md trailing note for IDB-05 with verbatim grep verification command |
| (e) Task 5 behavior has Tests 8 and 9 | GREEN | 11-2-PLAN.md lines 828-829: Test 8 (settle-point flush invokes getLastWriteAt on hidden+dirty, NOT on clean), Test 9 (handler swallows rejections) |
| (f) Plan-level verification adds grep checks #12 and #13 | GREEN | 11-2-PLAN.md lines 1022-1023: #12 grep -nF await maybe.getLastWriteAt() src/App.tsx; #13 grep -nF visibilitychange handler performs a settle-point .planning/REQUIREMENTS.md |

**B2 verdict: RESOLVED.** Real fire-and-forget settle-point flush is the recommended option (1) from my prior B2 fix_hint. Implementation is correctly fire-and-forget (visibilitychange handlers cannot block synchronously), error-swallowing (handlers must never throw), and gated on both visibilityState===hidden AND isDirty. The REQUIREMENTS.md trailing note honestly documents the handler-capability division (beforeunload owns the dialog; visibilitychange owns the settle-point) — closes the SC-5 complementary state-flush gap.

### Delta 3 — Warning W1 (structural-lint enforcement) — RESOLVED

| Check | Status | Evidence |
|-------|--------|----------|
| (a) Task 3 exists with ~80-line test skeleton in action block | GREEN | 11-1-PLAN.md lines 617-754: Task 3 Create structural-lint-period.test.ts — lock the no-bare-new-Date invariant (W1 fix); full test code embedded at lines 636-732 (~95 lines including imports, helpers, 3 describe blocks) |
| (b) Tests cover no bare new Date(), no Date.now(), comment-stripper sanity | GREEN | 11-1-PLAN.md lines 624-626 (Test 1: NEW_DATE_NO_ARG regex; Test 2: Date.now regex; Test 3: stripCommentsAndStrings sanity proving strings/comments ignored and bare match still fires) |
| (c) Task 4 bumped test count to ~1030-1032 | GREEN | 11-1-PLAN.md line 765: 999 + ~33 new ... → ~1030-1032 GREEN; line 787 done clause: ~1030-1032 SPA GREEN |
| (d) Task 4 explicitly verifies structural-lint-test-GREEN + legacy-migration-end-to-end-test-GREEN | GREEN | 11-1-PLAN.md lines 772-782: step 5 explicitly runs structural-lint test; step 6 runs npx vitest run src/storage/__tests__/local-hardening.test.ts -t legacy |

**W1 verdict: RESOLVED.** Task 3 implementation uses native readdirSync + readFileSync (no glob dependency), mirrors the proven pattern from src/lib/tax/__tests__/structural-lint.test.ts, includes an explicit allowlist escape-hatch documented in step 5(b), and the comment-stripper sanity test (Test 3) guards against false negatives. Locks the period.ts single-source invariant for v1.2+.

### Delta 4 — Warning W3 (frontmatter files_modified completeness) — RESOLVED

| Check | Status | Evidence |
|-------|--------|----------|
| Frontmatter lists src/lib/period.ts, src/lib/__tests__/period.test.ts, src/components/Toast.tsx, src/components/__tests__/Toast.test.tsx, .planning/REQUIREMENTS.md | GREEN | 11-2-PLAN.md lines 12-20: all 5 entries present in files_modified array |

**W3 verdict: RESOLVED.** Planner caught the additional Toast.tsx / Toast.test.tsx omissions I had not flagged in my prior verification — those WERE technically missing from frontmatter (Task 4 modifies Toast.tsx + adds 4 Toast tests). Better hygiene than what I initially asked for.

---

## Final Verdict: **PASS**

All 4 deltas land correctly:
- **B1 resolved** via opts.silent on importAll + explicit legacy-migration.ts edit + 3 new tests (Tests 20, 21, 22) + plan-level grep checks #7 and #8 + runner.ts audit step.
- **B2 resolved** via real fire-and-forget settle-point flush (await getLastWriteAt on hidden+dirty) + REQUIREMENTS.md trailing-note disclosure + 2 new tests (Tests 8, 9) + plan-level grep checks #12 and #13.
- **W1 resolved** via new Task 3 (~95-line test using native fs helpers, mirroring the proven tax-module pattern) + Task 4 explicit verification + 3 test cases including comment-stripper sanity.
- **W3 resolved** via frontmatter additions (including Toast.tsx pair the planner caught beyond my original ask).

No new issues introduced. Prior PASS-graded dimensions (Sections 3-11 of the original report) stand unchanged. Plans are now safe to execute.

**Test count outlook:** baseline 999 → ~1030-1032 (after 11-1) → ~1078-1082 (after 11-2), with 18 server unchanged. Plan-level grep verifications cover every Blocker fix with deterministic file:line assertions.

**Recommended next step:** proceed to /gsd:execute-phase 11.

