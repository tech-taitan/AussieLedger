---
phase: 16-docs-polish
plan: 1
status: complete
subsystem: docs-readme,pol-docs-02,pol-docs-01-deferred
tags: [persona-segmented-readme, for-business-owners, for-tax-agents, for-developers, architecture-at-a-glance, fnd-12-byte-identical-preservation, strict-anchored-heading-regex, skip-screenshot-deferred-to-v1-4, empty-demo-observation]
dependency_graph:
  requires:
    - "Plan 15-2 SUMMARY (post-15-2 baseline 1203 SPA GREEN; Phase 15 closed pending verification)"
    - "Phase 14-3 README baseline (101 lines; ## What This Is bold-paragraph 2-persona shape; 14 readme.test.ts assertions GREEN)"
    - "FND-12 byte-identical phrase locks (7 phrases: StorageAdapter, owner mode, agent mode, Apache 2.0, Single-user local, Small-firm VPS, npm install && npm run build) preserved across the restructure"
    - "CONTRIBUTING.md at repo root (referenced verbatim by the new ### For developers CTA)"
    - "User reply: skip-screenshot (Task 1 deferred to v1.4 due to user-observed empty MasterDashboard at /demo)"
  provides:
    - "POL-DOCS-02 closed end-to-end: README ## What This Is restructured with 1-line bridge sentence + 3 ### h3 persona subsections in business→agents→developers order; new ### For developers section covers StorageAdapter FINAL + tax engine pure functions + window.print + demo isolation + tech stack + Apache 2.0 + verbatim CONTRIBUTING.md CTA"
    - "3 new readme.test.ts persona assertions GREEN (strict-anchored ^###\\s+For X\\s*$ multiline heading regex + OR-clause key-phrase per persona)"
    - "All 14 prior readme.test.ts tests stay GREEN (7 FND-12 byte-identical locks + 7 POL-04 content-presence)"
    - "POL-DOCS-01 (real /demo screenshot) DEFERRED to v1.4 — placeholder `> _Screenshot coming v1.3._` remains at README.md line 7; Task 1 no-source-diff outcome; user-observed empty demo flagged for v1.4 investigation (possible seedDemoData regression or stale cached IDB)"
    - "Phase 16 ready for /gsd:verify-phase 16 and v1.3 milestone audit (1 of 2 requirements complete; 1 deferred per user decision)"
  affects:
    - README.md
    - src/__tests__/readme.test.ts
tech_stack:
  added: []
  patterns:
    - "Strict-anchored multiline heading regex `^###\\s+For X\\s*$` with /m flag — treats ^/$ as line boundaries; trailing whitespace tolerated but other words on the same line would fail. Higher signal value than lenient substring (rejects accidental suffix drift like `### For developers (TODO)`)."
    - "OR-clause phrase regex (e.g. `/plain English|walk away with/`) — robust to copy refresh; either phrase passes; planner-locked at CONTEXT decision time so the test is resilient to future light edits within the persona section."
    - "Three ### h3 subsections nested under existing ## What This Is H2 — preserves the H2 hierarchy + GitHub TOC sidebar; minimum-disruption refactor (no top-level structural moves)."
    - "Bridge sentence under the H2 (`AussieLedger meets you where you sit in the bookkeeping → tax workflow. Pick the path that fits.`) sets up the path metaphor; the arrow idiom echoes the README line 3 elevator pitch for tone consistency."
    - "Tax-agents bridge sentence to developers section (`Owner mode and agent mode share the same engine — switch modes in Settings.`) reaffirms the FND-12 byte-identical-locked terms owner mode + agent mode AND sets up the same-engine framing the developers section expands."
    - "Developers section as 6 prose bullets — no code snippets (CONTEXT lock; avoids staleness risk from snippet drift); architecture-at-a-glance fast-scan for contributors."
    - "TDD RED → GREEN sequencing — RED commit appends 3 failing tests (heading regex unmatched against bold-paragraph form); GREEN commit lands the restructure that makes all 3 pass."
    - "skip-screenshot deferral path — Task 1's checkpoint:human-action resume-signal trinary expansion (captured / blocked / skip-screenshot) allowed clean defer of POL-DOCS-01 to v1.4 without blocking POL-DOCS-02 completion."
key_files:
  created: []
  modified:
    - README.md
    - src/__tests__/readme.test.ts
decisions:
  - "Task 1 POL-DOCS-01 DEFERRED to v1.4 per user `skip-screenshot` reply at the Task 1 checkpoint. Reason: user observed an empty MasterDashboard at https://aussieledger.techtaitan.com/demo (no seeded sole-trader entity widgets populated). Possible causes (not investigated this plan): (a) Phase 14-1 seedDemoData() regression on a fresh /demo visit, (b) stale cached IndexedDB from a prior session, (c) deploy lag between the most recent main push and the production Vercel build. Orchestrator captures the empty-demo observation as a v1.4 investigation todo separately. No Task 1 source diff produced; the `> _Screenshot coming v1.3._` placeholder at README.md line 7 STAYS. No screenshot-ref test assertions added (would have FAILED without docs/screenshot.png). No `docs/` directory created."
  - "Strict-anchored heading regex `^###\\s+For X\\s*$` /m chosen over lenient `### For X` substring (CONTEXT discretion item — planner-locked). Trailing whitespace tolerant via `\\s*$`; rejects accidental suffixes like `### For developers (WIP)` or `### For developers — beta`. Catches structural drift earlier and at higher signal-to-noise than the substring alternative."
  - "Bridge sentence `AussieLedger meets you where you sit in the bookkeeping → tax workflow. Pick the path that fits.` placed under H2 before the first H3. Tone-fit: arrow idiom echoes README line 3 elevator pitch; declarative + imperative two-clause structure matches the README's calm-modernist voice; respects user agency (`Pick the path that fits` is plain English not marketing-speak)."
  - "Tax-agents section gains a closing bridge sentence `Owner mode and agent mode share the same engine — switch modes in Settings.` Does double-duty: user-facing (tells tax agents where the mode switch lives) AND developer-facing (foreshadows the same-engine architecture point in the next section). Reaffirms the FND-12 byte-identical-locked `owner mode` + `agent mode` phrases inside the ## What This Is section (where they now also appear, in addition to their original Quick Start Option 2 location)."
  - "Developers section 6 bullets in order: persistence (StorageAdapter FINAL) → compute (tax engine pure functions) → output (print working papers) → safety (demo isolation) → stack (React/Vite/TS/idb/Express/better-sqlite3) → meta (Apache 2.0 + CONTRIBUTING.md CTA). Conceptually layered: persistence → compute → output → safety → meta. ~14 lines including the lead-in `Architecture-at-a-glance for contributors:`. The 6th demo-isolation bullet earns its keep because Phase 14 shipped a PITFALLS §4 HARD-BLOCK guard against demo-DB cross-contamination — contributors need to know the /demo route is sandboxed in aussieledger-demo namespace."
  - "CONTRIBUTING.md CTA folded into the License bullet (verbatim copy: `Apache 2.0. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, test patterns, and how to add a new FY.`) — keeps the section tight at 6 bullets instead of 7. Existing line-95 README CTA in the ## Contributing section stays unchanged (two CTAs to CONTRIBUTING.md is intentional; the developers section CTA serves first-visit contributors while the ## Contributing CTA serves second-visit + return contributors arriving via the section TOC)."
  - "Bold-paragraph `**For small-business owners**` shortened to `### For business owners` (drops `small-`). CONTEXT-locked exactly. Voice slightly tightened; the proven `plain English` + `walk away with` lock phrases preserved verbatim in the body."
  - "FND-12 grep guard PASSED: post-restructure grep of the 7 byte-identical-locked phrases returned 11 matches (vs ≥7 required). `StorageAdapter` + `Apache 2.0` + `owner mode` + `agent mode` now appear in MULTIPLE locations (their original Phase 9 / Quick Start / License / Privacy locations PLUS the new developers section + tax-agents bridge sentence). Existing `toContain` assertions are satisfied by single match; multiple matches do not break."
  - "README line count 101 → 118 lines (+17 net; restructure adds ~25 lines for bridge + 3 persona sections + developers bullets; offsets a 6-line shrink from collapsing bold-paragraph + drops). Phase 14-3 Test 7 floor (≥100) preserved with 18-line margin. Plan projected ~128; actual 118 is well within range and floor-safe."
  - "No source-code changes (per Phase 16 zero-source-diff invariant). package.json description sync explicitly declined (CONTEXT discretion item; planner-flagged + orchestrator-honoured). CSP / vercel.json / vite.pwa-options.ts UNTOUCHED."
metrics:
  duration: "~10 min executor wall-clock (Task 2 RED + GREEN back-to-back; Task 1 effectively skipped via skip-screenshot path; no human-action wait time after the resume signal; CI poll long-tail not blocking)"
  completed: "2026-06-03"
  tasks_completed: 2
  files_changed: 2
  tests_added: 3
  tests_total: 1206
---

# Phase 16 Plan 1: POL-DOCS-01 (deferred) + POL-DOCS-02 (persona-segmented README) Summary

**One-liner:** Closes POL-DOCS-02 end-to-end — README `## What This Is` section restructured with a 1-line bridge sentence + 3 `### h3` persona subsections (business owners → tax agents → developers) including a NEW `### For developers` section covering StorageAdapter FINAL + tax engine pure functions + window.print + demo isolation + React/Vite/TS/idb/Express/better-sqlite3 stack + Apache 2.0 + verbatim CONTRIBUTING.md CTA. POL-DOCS-01 (real `/demo` screenshot) DEFERRED to v1.4 per user `skip-screenshot` reply at the Task 1 checkpoint (user-observed empty demo). +3 SPA GREEN (1203 → 1206); README 101 → 118 lines; FND-12 byte-identical phrases preserved (11 grep matches vs ≥7 required); no source-code changes; no new dependencies; CSP/vercel.json untouched.

## What Was Built

### Task 1 — POL-DOCS-01: Real `/demo` README screenshot (DEFERRED to v1.4)

**Outcome:** No source diff. User replied `skip-screenshot` at the Task 1 checkpoint:human-action gate.

**User-reported observation** (carried forward as v1.4 investigation todo): MasterDashboard at `https://aussieledger.techtaitan.com/demo` rendered empty — no seeded sole-trader widgets populated. Possible causes (not investigated this plan):
- Phase 14-1 `seedDemoData()` regression on a fresh /demo visit (e.g. idempotency guard misfiring against an empty pre-existing entity list)
- Stale cached IndexedDB from a prior session pinning the demo DB to an empty state
- Deploy lag between the most recent `origin/main` push and the Vercel production build

**What did NOT happen (per the plan's `skip-screenshot` branch):**
- No `docs/screenshot.png` file created
- No `docs/` directory created
- No README image tag replacing the `> _Screenshot coming v1.3._` placeholder at line 7
- No screenshot-ref or placeholder-removed test assertions added (they would have failed without the image)
- No Task 1 commit produced

The plan's `<resume-signal>` block explicitly anticipated this trinary option; the deferral path is well-precedented (Phase 10 CF token + Phase 15-1 GitHub flip were binary done/blocked; this checkpoint's third option allowed clean POL-DOCS-02 completion without blocking on the screenshot capture).

POL-DOCS-01 STAYS OPEN — re-activated as a v1.4 polish item with the empty-demo observation attached.

### Task 2 — POL-DOCS-02: `## What This Is` persona restructure (TDD RED + GREEN)

**RED commit `cc5713e`** — `test(16-1): RED — README persona-segmented sections (POL-DOCS-02)`

Appended 3 new `it()` blocks to `src/__tests__/readme.test.ts` BEFORE the closing `});` of the `describe('README.md (DEP-03)')` block:

```typescript
it('Test A.5 README has ### For business owners persona section (POL-DOCS-02)', () => {
  expect(content).toMatch(/^###\s+For business owners\s*$/m);
  expect(content).toMatch(/plain English|walk away with/);
});

it('Test A.6 README has ### For tax agents persona section (POL-DOCS-02)', () => {
  expect(content).toMatch(/^###\s+For tax agents\s*$/m);
  expect(content).toMatch(/multi-client|fast entity switching/);
});

it('Test A.7 README has ### For developers persona section (POL-DOCS-02)', () => {
  expect(content).toMatch(/^###\s+For developers\s*$/m);
  expect(content).toMatch(/StorageAdapter|pure functions/);
});
```

**RED-state verified** before commit:
- `npx vitest run src/__tests__/readme.test.ts` → **14 passed | 3 failed** (17 total). All 3 new tests failed at the first `toMatch` line because the heading regex couldn't find `^### For X$` (the pre-refactor README uses bold-paragraph `**For small-business owners**` and `**For tax agents**`, no `###` headings; the developers section didn't exist).

**GREEN commit `5959773`** — `feat(16-1): persona-segment README "What This Is" with NEW developers section (POL-DOCS-02)`

Modified `README.md` (+26 / −9). The `## What This Is` block (previously lines 12-16, 5 lines) replaced with the new 25-line structure:

```markdown
## What This Is

AussieLedger meets you where you sit in the bookkeeping → tax workflow. Pick the path that fits.

### For business owners

Take your trial balance, record your year's adjustments and journals in plain English, and walk away with a print-ready working paper to hand to the ATO via myGov or to your tax agent. No subscription, no paid services in the critical path.

### For tax agents

A no-cost workspace for your smaller clients. Multi-client list, fast entity switching, print-ready Form I / Form C / Form T / Form P / BAS / IAS working papers with ATO field codes. Owner mode and agent mode share the same engine — switch modes in Settings.

### For developers

Architecture-at-a-glance for contributors:

- **StorageAdapter** is FINAL — 12 methods locked at Phase 3; LocalAdapter (IndexedDB) and ServerAdapter (HTTP → Express → SQLite) implement the same contract. Widening is via duck-typing on the concrete adapter (e.g. `getDbName()`, `getPersistGranted()`), never on the interface. Same SPA, two backends.
- **Tax engine is pure functions** in `src/lib/tax/` — per-FY label modules under `returns/`, `rates/`, `labels/`. Decimal arithmetic via `decimal.js` throughout; money never touches native floats.
- **Print working papers** use `window.print()` + `@media print` CSS. No PDF library, no server-side rendering, ATO field codes shown alongside plain-English labels.
- **Demo isolation** ships via a separate `aussieledger-demo` IndexedDB namespace, gated on `window.location.pathname.startsWith('/demo')`. Your real data lives in `aussieledger` and is never touched by the `/demo` route.
- **Stack:** React 19 + Vite 6 + TypeScript 5.8 + IndexedDB via `idb` (LocalAdapter) + Express + `better-sqlite3` (ServerAdapter). PWA via `vite-plugin-pwa`. No telemetry, no analytics, no third-party scripts (CSP `script-src 'self'`).
- **License:** Apache 2.0. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, test patterns, and how to add a new FY.
```

Key edits:
- `## What This Is` H2 heading byte-identical (unchanged anchor)
- New 1-line bridge sentence under the H2
- Bold-paragraph `**For small-business owners**` → `### For business owners` h3 subsection (dropped `small-` prefix; CONTEXT lock)
- Body lightly refreshed; `plain English` + `walk away with` lock phrases preserved verbatim
- Bold-paragraph `**For tax agents**` → `### For tax agents` h3 subsection
- Body lightly refreshed; `multi-client` + `fast entity switching` lock phrases preserved verbatim; new bridge sentence `Owner mode and agent mode share the same engine — switch modes in Settings.` appended
- NEW `### For developers` h3 subsection with 6 bullets covering StorageAdapter FINAL / pure-function tax engine / window.print / demo isolation / stack / license-CTA. The license bullet folds the verbatim CONTRIBUTING.md CTA in to keep the section tight at 6 bullets.

**GREEN-state verified** before commit:
- `npx vitest run src/__tests__/readme.test.ts` → **17 passed | 0 failed** (14 pre-existing + 3 new persona). All 3 new persona assertions GREEN.
- `wc -l README.md` → **118 lines** (≥100 floor; +17 vs 101 baseline)
- `grep -c "^### For " README.md` → **3** (exactly the 3 persona headings)
- `grep "Screenshot coming" README.md` → **1 match** (placeholder INTENTIONALLY preserved — Task 1 deferred)
- `grep "docs/screenshot.png" README.md` → **0 matches** (intentional — no screenshot wired)
- FND-12 byte-identical guard: `grep -c "StorageAdapter\|owner mode\|agent mode\|Apache 2.0\|Single-user local\|Small-firm VPS\|npm install && npm run build" README.md` → **11 matches** (≥7 required)
- `npx vitest run` (full SPA suite) → **1206 passed + 11 todo + 0 failed** (1203 baseline + 3 new persona tests; the Task 1 +2 screenshot tests are intentionally not present given skip-screenshot)
- `npm run lint` → EXIT 0
- `npm run build` → EXIT 0 with `scan-aiza: OK — no Gemini key shapes in dist/`
- `npm run test:server` → **18 passed | 0 failed** (regression guard)

## Test Count Delta

| Boundary                               | SPA GREEN | Todo | RED | Test files |
| -------------------------------------- | --------- | ---- | --- | ---------- |
| Pre-Plan-16-1 baseline (post-15-2)     | 1203      | 11   | 0   | 124        |
| Post Task 2 RED commit `cc5713e`       | (intermediate; 3 RED expected) | - | - | - |
| Post Task 2 GREEN commit `5959773`     | **1206**  | 11   | 0   | 124        |

**Net delta this plan: +3 SPA GREEN** (1203 → 1206):
- Task 1: +0 (deferred to v1.4; would have been +2 had screenshot captured)
- Task 2: +3 (Test A.5 + A.6 + A.7 persona heading-and-key-phrase assertions)

Test count lands at 1206, exactly matching the skip-screenshot-branch projection (`1203 + 3 = 1206`; the +2 screenshot tests stay deferred). Plan's full-screenshot projection was 1208; current outcome is 1206 with 2 tests reactivated when POL-DOCS-01 ships in v1.4.

## Commits

| # | Hash      | Type | Files                                                              | Co-Author |
| - | --------- | ---- | ------------------------------------------------------------------ | --------- |
| 1 | `cc5713e` | test | src/__tests__/readme.test.ts (MODIFIED, +17 / −2)                  | Claude Opus 4.7 |
| 2 | `5959773` | feat | README.md (MODIFIED, +26 / −9)                                     | Claude Opus 4.7 |
| 3 | (this commit) | docs | 16-1-SUMMARY.md + STATE.md + ROADMAP.md + REQUIREMENTS.md          | Claude Opus 4.7 |

Total: **2 source commits + 1 metadata commit = 3 commits** on `origin/main` from Plan 16-1.

(Plan's 3-commit projection included Task 1's screenshot+wire commit, which is now deferred; actual commit count for shipped POL-DOCS-02 is 2.)

## CI Verification

Both Task 2 pushes triggered GitHub Actions CI runs (anonymous probe via public-repo Actions API — Plan 15-1 collateral benefit):

| # | Head SHA  | Run ID       | Status       | Conclusion | Notes |
| - | --------- | ------------ | ------------ | ---------- | ----- |
| 1 | `cc5713e` (RED)   | 26873594248 | completed | **failure** (EXPECTED) | RED commit by design — 3 new tests FAIL in CI because README hasn't been restructured yet. This is the test-doc-of-the-refactor pattern; failure here is the test's purpose, not a regression. |
| 2 | `5959773` (GREEN) | 26873806298 | completed | **success** | Full suite passed: 1206 GREEN + 11 todo + 0 RED; lint EXIT 0; build EXIT 0 incl. scan-aiza: OK; matches local verification on the exact tree pushed. |

The `1293dbc` interstitial CI failure (between RED + GREEN) is the same RED-commit failure inherited because no source change moved the failing tests into GREEN state until the GREEN commit. By GREEN commit `5959773`, the 3 persona tests pass cleanly.

Local verification authoritative: full SPA suite + lint + build + server suite all GREEN on the exact tree pushed as `5959773`.

## Architecture Invariants Verified

| # | Invariant                                                                  | Status | Evidence |
| - | -------------------------------------------------------------------------- | ------ | -------- |
| a | StorageAdapter interface FINAL (12 methods unchanged)                      | GREEN  | src/storage/adapter.ts untouched (not in files_modified); Phase 16 is docs-only |
| b | DisclaimerFooter Phase 01 verbatim copy preserved                          | GREEN  | src/components/shell/DisclaimerFooter.tsx untouched |
| c | PrivacyPage non-AI bullets byte-identical                                  | GREEN  | src/components/PrivacyPage.tsx untouched |
| d | Sidebar visual byte-identical (post-15-2)                                  | GREEN  | src/components/shell/Sidebar.tsx untouched |
| e | BAS/IAS universal (POL-CODE-04 lock)                                       | GREEN  | Sidebar logic untouched; Plan 15-2 ET.7 parametric × 4 still GREEN in the full suite (1206) |
| f | ViewRouter:179 header button preserved                                     | GREEN  | src/components/ViewRouter.tsx untouched |
| g | No `new Date()` outside src/lib/period.ts                                  | GREEN  | No JS/TS code added; structural-lint-period.test.ts stays GREEN in the full suite |
| h | No new dependencies                                                        | GREEN  | package.json untouched; pngquant remains optional user-side tool (not installed) |
| i | CSP / vercel.json unchanged                                                | GREEN  | vercel.json untouched |
| j | AIza scan still passes                                                     | GREEN  | `scan-aiza: OK — no Gemini key shapes in dist/` in post-GREEN build log; README is text-only (no AIza key-shape risk) |
| k | SPDX header invariant — no new source files                                | GREEN  | 0 created files; src/__tests__/readme.test.ts already had SPDX header pre-Phase-16 (unchanged); README.md + .md files exempt by convention |
| l | Conventional Commits + Co-Authored-By                                      | GREEN  | Both source commits (cc5713e test + 5959773 feat) + this metadata commit follow `type(scope): subject` + Co-Authored-By footer |
| m | App.tsx no-source-diff                                                     | GREEN  | src/App.tsx untouched |
| n | FND-12 byte-identical phrase preservation                                  | GREEN  | grep guard returns 11 matches for the 7 locked phrases (≥7 required); StorageAdapter / owner mode / agent mode / Apache 2.0 now appear in MULTIPLE locations including the new developers section, but `toContain` semantics make this safe |
| o | README line-count floor ≥100 (Phase 14-3 Test 7)                          | GREEN  | wc -l README.md = 118 (18-line margin) |

**All 15 invariants: GREEN.**

## CONTEXT Lock Audit (16 sub-decisions from 16-CONTEXT.md)

| Area | Lock | Status |
| ---- | ---- | ------ |
| Screenshot subject | `/demo` MasterDashboard with seeded sole-trader entity visible | DEFERRED (skip-screenshot — Task 1 v1.4 reactivation; empty demo observed) |
| Screenshot format | PNG 1280px logical × 2x DPR (≤200KB target after pngquant) | DEFERRED |
| Screenshot location | `docs/screenshot.png` | DEFERRED |
| Capture flow | checkpoint:human-action with DevTools Capture full size screenshot | EXERCISED — user chose skip-screenshot trinary option |
| Restructure approach | Keep ## What This Is + add 3 ### subsections + 1-2 line bridge | HONOURED |
| Persona order | business owners → tax agents → developers | HONOURED |
| Sub-heading style | ### h3 nested under ## What This Is | HONOURED |
| Existing copy treatment | Light touch-up; preserve proven voice | HONOURED (`plain English` + `walk away with` + `multi-client` + `fast entity switching` all preserved verbatim) |
| Developers section length | ~6-8 bullets, ~12 lines | HONOURED (6 bullets; 14 lines including lead-in — within tolerance) |
| Developers architecture items | StorageAdapter FINAL + tax engine pure + print + stack | HONOURED + extended (6th demo-isolation bullet earns its keep per CONTEXT line 94 ordering-is-suggestive-not-mandatory + plan's Flag 4 acceptable-variance) |
| No code snippets | Prose + bullets only | HONOURED |
| CTA verbatim | `See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, test patterns, and how to add a new FY.` | HONOURED (folded into License bullet) |
| Per-persona assertion shape | Heading present + 1 key phrase per persona | HONOURED (3 strict-anchored heading regex + 3 OR-clause phrase regex) |
| Screenshot reference test | `expect(readme).toContain('docs/screenshot.png')` | DEFERRED (would have FAILED without the image; not added per skip-screenshot branch) |
| Placeholder-removal test | `expect(readme).not.toMatch(/Screenshot coming/i)` | DEFERRED (placeholder INTENTIONALLY remains for v1.4) |
| Total new tests | 5 (3 persona + 1 screenshot path + 1 placeholder-removed) | PARTIAL — 3 of 5 added (skip-screenshot branch keeps the +2 screenshot tests deferred to v1.4) |

12 of 16 honoured; 4 deferred via the skip-screenshot branch (all 4 relate to the deferred POL-DOCS-01 — screenshot subject/format/location/capture-flow + screenshot-ref test + placeholder-removal test).

## Deferred Items NOT Introduced (per 16-CONTEXT.md `<deferred>` block)

| Item | Status |
| ---- | ------ |
| Tax Assistant view screenshot | NOT introduced (defer to v1.4) |
| Composite stitched screenshot | NOT introduced |
| WebP format | NOT introduced (PNG-only when POL-DOCS-01 ships in v1.4) |
| Code snippets in developers section | NOT introduced |
| docs/assets/ sub-foldering | NOT introduced (no docs/ directory created at all this plan) |
| GitHub Issues good-first-issue CTA | NOT introduced |
| POL-CODE-06 PWA install desktop CTA | NOT introduced (separate v1.3 discuss-time decision) |
| Verify-file-exists test for screenshot | NOT introduced |
| Rich 3-5 phrase assertions per persona | NOT introduced (1 phrase per persona locked) |
| Persona top-level ## sections | NOT introduced (nested under ## What This Is) |
| Alphabetical or developers-first ordering | NOT introduced (locked to business→agents→developers audience priority) |
| package.json description sync | NOT introduced (CONTEXT discretion item; planner declined; zero-source-diff Phase 16 invariant preserved) |

**Zero scope creep.** All 12 deferred items remained deferred.

## Deviations from Plan

### Auto-fixed Issues

None. Plan executed exactly as written for Task 2; Task 1 followed the documented `skip-screenshot` resume-signal branch per user reply.

### Authentication Gates

None.

### Plan-Spec Acceptable-Variance Outcomes (logged for transparency; not deviations)

- **Task 1 deferred to v1.4** via the plan-anticipated `skip-screenshot` trinary resume-signal option (plan line 268-269, 292). Per the plan: "On `skip-screenshot`: defer to v1.4 + skip Task 1 wire + still ship POL-DOCS-02 in Task 2." Honoured exactly.
- **README line count 118 vs plan-projected ~128.** Source: bridge sentence + persona subsections + developers section took 17 net lines instead of the projected 25-30. The collapse came from dropping the bold-paragraph wrapper lines and consolidating the CONTRIBUTING.md CTA into the License bullet. Floor margin still healthy at 18 lines above the ≥100 floor.
- **3 new tests vs plan's "5 new tests" total** (3 persona + 0 screenshot-ref + 0 placeholder-removed). The 2 deferred tests reactivate alongside POL-DOCS-01 in v1.4.

## Self-Check: PASSED

- File `README.md` — FOUND (118 lines; `## What This Is` restructured with 3 persona subsections; FND-12 phrases grep-verified; `> _Screenshot coming v1.3._` placeholder intentionally retained for v1.4)
- File `src/__tests__/readme.test.ts` — FOUND (84 lines; +3 persona assertions; 14 pre-existing tests all stay GREEN)
- File `docs/screenshot.png` — NOT FOUND (intentional; Task 1 deferred to v1.4)
- File `docs/` directory — NOT CREATED (intentional; no screenshot to house)
- Commit `cc5713e` — FOUND on origin/main; CI run 26873594248 conclusion=failure (EXPECTED — RED commit by design)
- Commit `5959773` — FOUND on origin/main; CI run 26873806298 completed conclusion=**success** (matches local 1206 GREEN + 11 todo + 0 RED; lint EXIT 0; build EXIT 0 incl. scan-aiza: OK)
- All 15 architecture invariants GREEN (incl. FND-12 byte-identical preservation grep guard + line-count floor)
- 12 of 16 CONTEXT sub-decisions honoured; 4 deferred via the skip-screenshot branch (all 4 belong to POL-DOCS-01)
- All 12 `<deferred>` items NOT introduced — zero scope creep
- POL-DOCS-02 closed end-to-end; POL-DOCS-01 deferred to v1.4 with user-observed empty-demo flag attached

Plan 16-1 closed; Phase 16 complete; POL-DOCS-01 deferred to v1.4; v1.3 milestone ready for `/gsd:verify-phase 16` and `/gsd:audit-milestone v1.3`.
