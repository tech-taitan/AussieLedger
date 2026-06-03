---
phase: 16
slug: docs-polish
type: plan-verification
status: PASS
verified_at: 2026-06-03
plans_verified:
  - 16-1-PLAN.md
verdict: PASS
---

# Phase 16 Plan Verification: Docs Polish

**Phase:** 16 - Docs Polish (POL-DOCS-01 + POL-DOCS-02)
**Plan verified:** `.planning/phases/16-docs-polish/16-1-PLAN.md` (561 lines, 2 tasks)
**Source-of-truth:** `16-CONTEXT.md` (199 lines, 16 sub-decisions), `REQUIREMENTS.md` Docs Polish section, `ROADMAP.md` Phase 16, `README.md` (101 lines), `src/__tests__/readme.test.ts` (14 tests)

---

## Final Verdict: **PASS**

The plan is goal-aligned, requirement-complete, invariant-safe, and ready for `/gsd:execute-phase 16`. All 8 planner-flagged items adjudicated; all 8 invariants GREEN; all 8 Claude-discretion calls sound. Zero blockers; zero warnings escalating to revision. Two minor info-level observations noted below but neither requires plan revision.

---

## Requirement Coverage

### POL-DOCS-01 (real-readme-screenshot) - **GREEN**

| Mapping | Detail |
|---------|--------|
| Plan | 16-1-PLAN.md |
| Task | Task 1 (checkpoint:human-action) |
| Closes acceptance text | Replaces `> _Screenshot coming v1.3._` blockquote with image tag; PNG checked into git; optional pngquant pre-commit pass |
| Wired tests | 2 new `it()` blocks: `docs/screenshot.png` path present + `Screenshot coming` absent |
| Verify | `npx vitest run src/__tests__/readme.test.ts` -> 16 GREEN (14 existing + 2 new) |
| Done criteria | File exists, valid PNG, size in [10KB, 1MB], image tag in README line 7, placeholder removed, 16/16 GREEN, `scan-aiza: OK`, commit pushed |

**Verdict:** Closes POL-DOCS-01 end-to-end. Acceptance text from REQUIREMENTS.md line 26 satisfied verbatim (markdown image tag matches the spec shape; pngquant suggested optionally per spec).

### POL-DOCS-02 (persona-segmented-readme) - **GREEN**

| Mapping | Detail |
|---------|--------|
| Plan | 16-1-PLAN.md |
| Task | Task 2 (auto, tdd=true) |
| Closes acceptance text | 3 `### h3` subsections under existing `## What This Is` in business->agents->developers order; `### For developers` covers StorageAdapter FINAL + pure-function tax engine + no PDF library + Apache 2.0 + CONTRIBUTING.md pointer |
| Wired tests | 3 new `it()` blocks (Tests A/B/C): per-persona strict-anchored heading + OR-clause key-phrase regex |
| Verify | `npx vitest run src/__tests__/readme.test.ts` -> 19 GREEN (14 + 2 + 3); full SPA -> ~1208 GREEN; lint EXIT 0; build EXIT 0; `scan-aiza: OK` |
| Done criteria | Restructure complete with bridge sentence + 3 persona subsections + ~14-line developers section + CTA verbatim; line count >= 100 (target ~128); all prior 16 tests stay GREEN |

**Verdict:** Closes POL-DOCS-02 end-to-end. REQUIREMENTS.md line 27 spec ("~25 line README expansion") matches plan-stated "101 -> ~128 lines" target. Architecture bullet coverage matches CONTEXT decisions lines 68-77 exactly.

---

## Invariant Audit (a-h)

### (a) FND-12 byte-identical phrases stay intact - **GREEN**

The 7 FND-12 byte-identical-locked phrases (`npm install && npm run build`, `Single-user local`, `Small-firm VPS`, `StorageAdapter`, `owner mode`, `agent mode`, `Apache 2.0`) all live OUTSIDE `## What This Is` in the current README:

- `npm install && npm run build` -> line 29 (Quick Start Option 2)
- `Single-user local` -> line 39 (Deployment Shapes)
- `Small-firm VPS` -> line 47 (Deployment Shapes)
- `StorageAdapter` -> line 75 (How It Works)
- `owner mode` -> line 33 (Quick Start Option 2)
- `agent mode` -> line 33 (Quick Start Option 2)
- `Apache 2.0` -> lines 10, 91, 99 (preamble + Privacy + License)

The restructure touches ONLY lines 12-16 (the `## What This Is` block) - none of the 7 locked phrases are within scope. Plan further reinforces with explicit grep guard at step 5 (expect >= 7 matched lines).

**Note:** The new developers section reintroduces `StorageAdapter`, `Apache 2.0`, and (via the tax-agents bridge) `owner mode` + `agent mode`. Plan correctly observes existing assertions use `toContain` (not regex-once), so multiple matches still satisfy. No regression risk.

### (b) `wc -l README.md` stays >= 100 - **GREEN**

Current README: 101 lines (split-newline; Phase 14-3 just cleared the floor by margin of 1). Plan adds ~25-30 lines for the developers section + bridge sentence + 3 persona headings -> target ~128 lines. Plan explicitly runs `wc -l README.md` at step 6 with expect >= 100. Task 2 done-criteria asserts line count >= 100.

### (c) No source-code changes - **GREEN**

`files_modified` frontmatter restricts plan scope to:
- `README.md` (markdown - not TS-linted)
- `src/__tests__/readme.test.ts` (test file; linted but no source diff)
- `docs/screenshot.png` (binary asset)

Plan verification section 3 explicitly states: "Phase 16 touches only README.md, src/__tests__/readme.test.ts, and docs/screenshot.png". Task 2 out-of-scope (plan line 456) explicitly declines `package.json` description sync. App.tsx, ViewRouter.tsx, components/, lib/, storage/, server/ all untouched.

### (d) No new dependencies - **GREEN**

`package.json` is NOT in `files_modified`. Plan explicitly declines `package.json` description sync. pngquant is OPTIONAL and user-side (not a project dep). No npm install in either task action.

### (e) CSP / vercel.json unchanged - **GREEN**

Neither file in `files_modified`. Plan verification section 6 explicitly asserts "CSP / vercel.json unchanged - preserved". No CSP-relevant content added (the binary screenshot is loaded by GitHub markdown rendering, not by the SPA itself, so no `img-src` widening needed).

### (f) AIza scan passes - **GREEN**

Plan runs `npm run build` in both Task 1 (Step 3 D) and Task 2 (Step 8), expecting `scan-aiza: OK`. README is text-only - no AIza key-shape risk. The screenshot is binary and lives in `docs/` not `dist/assets/` - outside scan scope. Plan line 499 correctly notes the README will not match the regex.

### (g) Existing 14 readme.test.ts tests stay GREEN - **GREEN**

All 14 existing tests assert content presence OR strict patterns:
- 7 FND-12 byte-identical `toContain` (verified GREEN by invariant (a))
- 5 POL-04 `toContain` - all live in sections OUTSIDE `## What This Is`
- 1 POL-04 Privacy heading regex - line 87 (untouched)
- 1 POL-04 length floor - preserved by invariant (b)

Plan asserts all 14 stay GREEN at Task 1 Step 3 C and Task 2 Step 7. RED-then-GREEN cycle in Task 2 proves the 3 new tests FAIL before the README restructure and PASS after - methodologically sound.

### (h) Bold-paragraph personas become `### h3` subsections - **GREEN**

Current README lines 14, 16 use bold-paragraph form. Plan Task 2 Step 4 explicitly restructures these to `### For business owners` and `### For tax agents` h3 subsections, plus the new `### For developers`. The strict-anchored heading regex enforces the heading-style change (would fail on the current bold-paragraph form). CONTEXT decision line 64 (Sub-heading style `### (h3)`) locks this. Bridge sentence sits BETWEEN the H2 and the first H3, preserving the H2 hierarchy.

**Minor note:** Plan changes `**For small-business owners**` to `### For business owners` (drops "small-"). This matches the CONTEXT lock exactly and the regex. Voice slightly tightened; proven copy preserved (per CONTEXT decision line 65 Light touch-up). Acceptable.

---

## Claude-Discretion-Call Audit (8 items per CONTEXT lines 89-97)

| # | Discretion Item | Planner Decision | Verdict |
|---|----------------|------------------|---------|
| 1 | Exact heading-detection regex | strict-anchored multiline pattern | **SOUND** - Trailing-whitespace tolerant; rejects suffixes; higher signal value. CONTEXT recommends lenient but planner explains strict choice in plan line 326. Defensible. |
| 2 | Exact pngquant invocation | matches CONTEXT line 59 exactly | **SOUND** - Optionality preserved; user judgment respected. |
| 3 | Touched-up copy for existing personas | Phrase locks pin the proven voice; tax-agents gets a new bridge sentence | **SOUND** - Slight verbosity acceptable; cohesion improved. |
| 4 | Order of bullets within developers section | Persistence -> compute -> output -> safety -> meta | **SOUND** - Conceptually layered. CONTEXT line 94 says ordering is suggestive not mandatory. |
| 5 | Specific phrase choices for developers section | Plan lines 380-386 | **SOUND** - Matches all locked items; no code snippets per CONTEXT line 76; tone consistent with calm-modernist voice. |
| 6 | Update `package.json` description field | Explicit decline (plan line 456) | **SOUND** - Preserves Phase 16 zero-source-diff invariant. |
| 7 | Markdown image alt-text | Rich descriptive 7-word form | **SOUND** - Matches CONTEXT line 97 recommendation; locks for a11y. |
| 8 | (Implicit) Bridge sentence under H2 | See planner-flagged item 7 below | **SOUND** - Voice consistent with README; sets up persona path metaphor. |

**Verdict on discretion calls:** All 8 sound. No revision required.

---

## Planner-Flagged Item Adjudications (8 items)

### Flag 1 - Checkpoint copy with 3-option resume signal - **ACCEPTABLE**

Phase 15-2 used binary done/blocked for code-path checkpoints. Phase 10 CF token and Phase 15-1 GitHub flip used binary too. Adding `skip-screenshot` is a new third option specific to this checkpoint.

**Adjudication:** Acceptable. The `skip-screenshot` option is a v1.4-defer escape hatch that is semantically distinct from `blocked`: `blocked` means "tried and cannot"; `skip-screenshot` means "choosing to defer". Both surface to the orchestrator, which decides phase-pause vs partial-completion. This expands optionality without breaking the precedent. Plan line 268-269 correctly notes the orchestrator decides whether to pause Phase 16 or fall back.

**Recommendation:** None. The third option is well-scoped.

### Flag 2 - File-size sanity bounds (10KB / 1MB) - **ACCEPTABLE**

CONTEXT line 57 specifies <= 200KB after pngquant as a TARGET, not a hard limit. Plan tightens to 10KB hard floor (catches truncation / placeholder) and 1MB hard ceiling (sanity bound). 200KB-1MB range is WARN only (not blocking).

**Adjudication:** Acceptable. The 10KB floor is well-justified. The 1MB ceiling is generous (a high-quality PNG of a full-page dashboard at 2x DPR can legitimately exceed 200KB without pngquant). PowerShell probe at plan lines 182-184 is correct. PNG magic-byte check is the right additional sanity test.

**Recommendation:** None. Bounds are well-engineered.

### Flag 3 - TDD on Task 2 (RED-then-GREEN 2-commit cycle) - **CONFIRMED**

Matches Phase 15-2 pattern (commits 7394346/0330e18, f67a0c3/3beb530, 4312158/b9f6005 - all RED-then-GREEN pairs per STATE.md). Plan Task 2 type is `auto` with `tdd="true"`.

**Adjudication:** Confirmed correct. RED commit at step 3 (3 new tests fail because the bold-paragraph form does not match the strict-anchored heading regex), GREEN commit at step 9 (restructure makes them pass). Aligns with established v1.3 cadence.

### Flag 4 - Developers section ~14 lines vs CONTEXT ~12 - **ACCEPTABLE**

CONTEXT line 70 specifies tight bullet list (~6-8 bullets, ~12 lines total). Plan adds a sixth demo-isolation bullet. Net ~14 lines.

**Adjudication:** Acceptable. The demo-isolation bullet has high signal-value because (a) Phase 14 shipped the HARD-BLOCK guard against demo-DB cross-contamination, (b) contributors need to know `/demo` is sandboxed in `aussieledger-demo` namespace, (c) it is one of the most architecturally-distinctive features of the codebase. Plan line 395 explicitly justifies the addition. The 2-line overshoot does NOT count as scope creep - it is a single architectural fact, well-aligned with the section purpose.

**Recommendation:** None. The bullet earns its keep.

### Flag 5 - FND-12 byte-identical phrase preservation - **CONFIRMED**

Cross-verified against README line-by-line. All 7 FND-12 phrases live in sections outside the restructure target (see invariant (a) above). Restructure scope is lines 12-16. Zero overlap. Plan has a grep guard at step 5 to verify post-edit. Confirmed safe.

**Note:** Developers section reintroduces 4 of the locked phrases. Existing tests use `toContain` (single-match satisfies); multiple matches do not break. Confirmed.

### Flag 6 - No git commit at planner level - **CONFIRMED**

Plan correctly delegates commits to the executor via the task action blocks. Conventional Commits + co-author trailer specified per commit. No planner-level commit attempted. Compliant.

### Flag 7 - Bridge sentence "AussieLedger meets you where you sit in the bookkeeping -> tax workflow. Pick the path that fits." - **TONE FITS**

README current voice analyzed:
- Line 3: "Free Australian bookkeeping -> tax return tool. Your data stays in your browser." (declarative, concise, arrow idiom)
- Line 10: "Open source under Apache 2.0. No accounts, no hosted data server, no telemetry." (declarative, repeated triplet)
- Line 14: active voice, plain English

Bridge sentence is two short clauses: declarative + imperative. The arrow echoes line 3 exactly. "Pick the path that fits" is plain English and respects user agency.

**Adjudication:** Tone fits. Consistent with line 3 pivot phrase and line 14 active voice. No marketing-speak; no jargon.

**Minor info-level observation:** "where you sit" is mildly metaphorical (location-based rather than role-based). Defensible (matches the path metaphor in the next sentence) but very mildly less concrete than "Pick the persona that matches your role". Not a blocker.

### Flag 8 - Tax-agents bridge sentence "Owner mode and agent mode share the same engine - switch modes in Settings." - **COHESION FITS**

This sentence sits at the end of the `### For tax agents` paragraph. It bridges from the tax-agents persona to the developers section by acknowledging the mode-symmetry architecture decision.

**Adjudication:** Cohesion fits. The sentence:
- Reaffirms the FND-12 byte-identical-locked terms `owner mode` and `agent mode`
- Sets up the same-engine framing that the developers section then expands on
- Surfaces the practical switch-modes-in-Settings instruction
- Uses em-dash for rhythm match with README lines 14, 16

The sentence does double-duty: user-facing AND developer-facing. High signal-to-noise.

**Minor info-level observation:** "switch modes in Settings" is functionally accurate per Phase 15-2 Plan 15-2 Task 3 (Settings Active Entity section + Mode section both present). Defensible.

---

## Dimension-by-Dimension Summary

| Dimension | Status | Notes |
|-----------|--------|-------|
| 1. Requirement Coverage | GREEN | POL-DOCS-01 -> Task 1; POL-DOCS-02 -> Task 2. Both `requirements:` frontmatter entries present. |
| 2. Task Completeness | GREEN | Task 1 (checkpoint:human-action) has files + action + verify + done + resume-signal; Task 2 (auto, tdd) has behavior + action + verify + done. |
| 3. Dependency Correctness | GREEN | `depends_on: []` (Wave 1; phase has only 1 plan; trivially valid). |
| 4. Key Links Planned | GREEN | All 4 must_haves.key_links wired via specific task actions: image tag (Task 1 STEP 3 A), 3 persona subsections (Task 2 step 4), CONTRIBUTING.md CTA (Task 2 step 4 license bullet), regex assertions (Task 1 STEP 3 B + Task 2 step 1). |
| 5. Scope Sanity | GREEN | 2 tasks (within 2-3 target). 3 files modified (well under 5-8 limit). Single-plan phase. Low risk. |
| 6. must_haves Derivation | GREEN | Truths are user-observable (screenshot visible, persona segmentation in audience order, 5 new GREEN tests). Artifacts map to truths. Key links wire artifacts to assertions. |
| 7. Context Compliance | GREEN | All 16 CONTEXT sub-decisions honored. All 11 Deferred Ideas excluded per plan lines 446-456. |
| 8. Nyquist Compliance | SKIPPED - phase has no RESEARCH.md / VALIDATION.md (docs-only polish phase; precedent: Phase 14-3 was docs-only and also skipped Nyquist). Task 1 verify has automated command; Task 2 verify has full suite + lint + build. Feedback latency low (<5s for focused test). |

---

## Verification Command Plausibility

| Command | Plausibility |
|---------|--------------|
| `npx vitest run src/__tests__/readme.test.ts` | GREEN - focused on 1 test file; <5s execution. |
| `npx vitest run` (full SPA) | GREEN - current 1203 baseline + 5 new = 1208. STATE.md confirms 1203 post-Phase-15. Linear math: 1203 + 2 (Task 1) + 3 (Task 2) = 1208. Plausible. |
| `npm run lint` EXIT 0 | GREEN - no TS source diff; readme.test.ts uses existing patterns. |
| `npm run build` EXIT 0 + `scan-aiza: OK` | GREEN - README binary screenshot in `docs/` not `dist/assets/`; AIza regex will not match markdown. |
| `wc -l README.md` >= 100 | GREEN - current 101 + ~27 additions ~= 128. Margin of safety: 28 lines. |
| `grep -c "^### For " README.md` -> 3 | GREEN - exactly the 3 persona headings; no false positives (existing `### Option 1/2`, `### Single-user`, `### Small-firm`, `### Public hosting` do not match the For-prefix pattern). |
| `grep "Screenshot coming" README.md` -> no match | GREEN - Task 1 STEP 3 A removes it; Task 1 STEP 3 B asserts via test. |
| `grep "docs/screenshot.png" README.md` -> 1 match | GREEN - Task 1 STEP 3 A adds it once. |

All verification commands are runnable and outcome-predictable. Test count 1203 -> ~1208 is exactly correct (+5 readme.test.ts assertions).

---

## Out-of-Scope Hygiene

Cross-checked against CONTEXT deferred section (lines 179-193) and REQUIREMENTS.md Future Requirements:

- POL-CODE-06 (PWA install desktop CTA) - explicitly NOT introduced; plan line 451 confirms
- Tax Assistant view screenshot (v1.4) - NOT introduced; plan line 446
- Composite stitched screenshot - NOT introduced
- WebP format - NOT introduced; PNG only per plan + CONTEXT
- Code snippets in developers section - NOT introduced; plan line 395
- `docs/assets/` sub-foldering - NOT introduced
- GitHub Issues good-first-issue CTA - NOT introduced
- Verify-file-exists test for screenshot - NOT introduced; text assertion only per plan line 452
- Rich 3-5 phrase assertions per persona - NOT introduced
- Persona top-level `##` sections - NOT introduced; nested under `## What This Is`
- Alphabetical or developers-first ordering - NOT introduced
- `package.json` description sync - NOT introduced
- v1.4 / v2.0 work - NOT introduced
- New entity-type or tax-form additions - NOT introduced
- Test-coverage drive - NOT introduced (5 new tests are POL-DOCS scope, not coverage drive)

**Verdict:** Zero accidental scope creep. Phase 16 stays surgically focused on POL-DOCS-01 + POL-DOCS-02.

---

## Checkpoint Pattern Consistency Audit

Comparing Task 1 (checkpoint:human-action) against Phase 10 CF-token precedent and Phase 15-1 GitHub-visibility-flip precedent:

| Aspect | Phase 10 CF token | Phase 15-1 GitHub flip | Phase 16-1 Task 1 |
|--------|-------------------|------------------------|-------------------|
| Task type | checkpoint:human-action | checkpoint:human-action | checkpoint:human-action |
| User does manual step | Cloudflare dashboard token gen | GitHub Settings -> Danger Zone | Chrome DevTools screenshot capture |
| Resume signal | binary (done/blocked) | binary (done/blocked) | trinary (captured/blocked/skip-screenshot) |
| Post-resume verify | secret presence check | anonymous repo probe | PowerShell file probe (Test-Path + size + PNG magic bytes) |
| Wire step in same task | Yes (env var wiring) | Yes (no-op wiring confirmation) | Yes (README edit + test add + commit) |
| Explicit step-by-step copy | Yes | Yes | Yes (plan lines 152-171) |

**Verdict:** Pattern consistency preserved with one documented enhancement (third resume option). Plan correctly identifies the precedent. The trinary resume signal is a documented, justified extension.

---

## Issues Found

**Blockers:** None.

**Warnings:** None.

**Info-level observations:**

1. **Bridge sentence metaphor (Flag 7):** "where you sit" is mildly metaphorical. Defensible per Flag 7 adjudication. No revision required.
2. **Developers section 14 vs 12 lines (Flag 4):** 2-line overshoot earns its keep with the demo-isolation bullet. Defensible per Flag 4 adjudication. No revision required.

---

## Final Recommendation

**PROCEED to `/gsd:execute-phase 16`.**

The plan is goal-aligned, requirement-complete, invariant-safe, scope-bounded, context-compliant, and pattern-consistent. All 16 CONTEXT sub-decisions honored. All 11 deferred ideas excluded. All 8 invariants GREEN. All 8 Claude-discretion calls sound. All 8 planner-flagged items adjudicated as acceptable/confirmed.

After Phase 16 execution lands, v1.3 is releaseable: 7/7 active requirements complete (POL-CODE-01..05 from Phase 15 + POL-DOCS-01..02 from Phase 16); POL-CODE-06 stays deferred per discuss-time decision. Milestone is ready for `/gsd:verify-phase 16` and `/gsd:audit-milestone v1.3`.

---

*Plan-check verified 2026-06-03 against `.planning/phases/16-docs-polish/16-1-PLAN.md` rev. as committed at plan-author time.*
