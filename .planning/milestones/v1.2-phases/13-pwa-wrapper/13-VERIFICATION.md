---
phase: 13-pwa-wrapper
type: verification
verifier: gsd-plan-checker
verified_at: 2026-06-01
verdict: PASS (B-1 + R-2 both resolved in round 2; minor stale baseline-callouts noted, non-blocking)
plans_verified: [13-1-PLAN.md, 13-2-PLAN.md]
---

# Phase 13 Plan Verification

## Verdict: PASS (round 2 — both blockers resolved)

Planner returned both deltas correctly:

1. B-1 RESOLVED — Smoke C step 14 in 13-2-PLAN.md line 667 now states banner STAYS HIDDEN after same-tab reload, references Hook Test #6, documents the correct re-fire path (close tab / private window), and explains the Phase 11 beforeunload-guard interaction for the direct Update path. Old contradictory wording is GONE.
2. R-2 RESOLVED — 11 surgical edits applied to 13-1-PLAN.md across frontmatter (+ files_modified[13], + 2 truths, + artifact, + key_link), Task 2 action (pwaOptions named export refactor), Task 3 (renamed to three contract tests + new step 3 with ~15 structural assertions + verify-step targets pwa-config first), verification block (checks 5/6/7 collapsed into a single pwa-config.test.ts invocation), and success_criteria (~28 new GREEN). Task count unchanged at 3.

All prior PASS findings stand. No re-audit needed on the items that already passed.

---

## ROADMAP Phase 13 Success Criteria (4)

| # | Criterion | Plan/Task | Status |
|---|-----------|-----------|--------|
| 1 | npm run build + npm run preview produces installable PWA; Lighthouse Installable passes; manifest has name/short_name/start_url/display:standalone/192+512 icons | 13-1 Task 1 (5 PNGs) + Task 2 (VitePWA config) + Task 3 (pwa-manifest.test.ts asserts shape) + 13-2 Task 3 Smoke A (manual Lighthouse audit) | GREEN |
| 2 | skipWaiting + clientsClaim + cleanupOutdatedCaches configured; non-intrusive update banner; never force-reload mid-form | 13-1 Task 2 workbox block (all 3 flags) + 13-2 Task 2 UpdateBanner (verbatim CONTEXT copy, Update + Later, no auto-trigger) + registerType-prompt lock | GREEN |
| 3 | npm run dev behaviour unchanged - no SW registered in dev; HMR works | 13-1 Task 2 devOptions.enabled=false + 13-2 Task 3 Smoke B (manual verification of empty SW list at localhost:3000) | GREEN |
| 4 | iOS Safari user sees Add-to-Home-Screen prompt when navigator.standalone is false; installing launches in standalone mode | Plan 13 consumes Phase 11 IosItpBanner (untouched). Plan 13-1 manifest enables PWA install path; Plan 13-2 must_haves truth #19 documents the free auto-hide side-effect (IosItpBanner already has the isStandalone return-null gate) | GREEN (delegated to Phase 11 deliverable; Plan 13-1 manifest is the unlock) |

---

## PWA-01 Acceptance Sub-Clauses (4)

| Sub-clause | Plan/Task | Status |
|-----------|-----------|--------|
| Lighthouse Installable PASS | 13-1 Task 2 VitePWA config + 13-2 Task 3 Smoke A | GREEN |
| skipWaiting + clientsClaim + cleanupOutdatedCaches all three present | 13-1 Task 2 action block lines 374-378 (verbatim) + verify-step grep #5 (with caveats) | GREEN (with grep-fragility note - see R-2) |
| Non-intrusive update banner + no force-reload mid-form | registerType-prompt in 13-1 Task 2; UpdateBanner in 13-2 Task 2 (CONTEXT-locked copy + Update/Later buttons); must_haves truth #5 documents updateSW(true) as user-explicit trigger | GREEN |
| npm run dev unchanged | 13-1 Task 2 devOptions.enabled=false; 13-2 Task 3 Smoke B manual verification | AMBER - verified via manual smoke; the grep at 13-1 verify-step #7 IS an automated regression guard (planner under-credited). Combined sufficient. |
| iOS standalone-mode launch | Manifest display=standalone + apple-touch-icon link; Phase 11 IosItpBanner auto-hides on install | GREEN |

---

## Architecture Invariants (a-i)

| Invariant | Plan reference | Status |
|-----------|---------------|--------|
| (a) PWA stale-cache HARDBLOCK - all three Workbox flags | 13-1 Task 2 action lines 374-378 + verify-step grep #5 | GREEN (grep fragile - see R-2) |
| (b) registerType-prompt (NOT autoUpdate) | 13-1 Task 2 action line 368 + verify-step grep #6 + must_haves truth #10 | GREEN |
| (c) devOptions.enabled=false | 13-1 Task 2 action line 371 + verify-step grep #7 | AMBER - see planner-flagged #4 below; grep DOES exist; sufficient |
| (d) No new Date() outside src/lib/period.ts | Both PLAN files contain ZERO new-Date() references; no plan task introduces a timestamp (sessionStorage snooze is value-based). Phase 11 structural-lint-period.test.ts will catch any drift | GREEN |
| (e) Apache 2.0 SPDX header on new source files | 13-1: build-pwa-icons.mjs + pwa-manifest.test.ts + pwa-index-html.test.ts. 13-2: useUpdateBanner.ts + useUpdateBanner.test.ts + UpdateBanner.tsx + UpdateBanner.test.tsx. vite-env.d.ts intentionally omits SPDX (triple-slash directive file, not a source file - established convention) | GREEN |
| (f) Phase 11 IosItpBanner UNCHANGED | 13-2 must_haves truth #19 + verification check #10 (git diff src/components/IosItpBanner.tsx expects empty) | GREEN |
| (g) StorageAdapter FINAL - no adapter changes | Neither plan touches src/storage/*. Plan 13-1 files_modified does NOT list any storage file. Plan 13-2 files_modified does NOT list any storage file. App.tsx Phase 11 IDB-05 wiring stays VERBATIM per Plan 13-2 truth #14 | GREEN |
| (h) CSP unchanged (vercel.json headers) | 13-1 must_haves truth #13; 13-2 verification check #9 explicit (git diff vercel.json expects empty) | GREEN |
| (i) AIza scan passes against SW-bundled dist/ | 13-1 must_haves truth #14 - explicitly addresses Workbox revision hashes vs AIza regex shape (Workbox emits plain-hex revisions; no 35-char AIza-prefixed segments); verification check #10 runs npm run scan:aiza | GREEN |

---

## PITFALLS Section 3 PWA Stale-Cache HARDBLOCK

| Requirement | Plan ref | Status |
|------------|----------|--------|
| skipWaiting=true | 13-1 Task 2 line 375 | GREEN |
| clientsClaim=true | 13-1 Task 2 line 376 | GREEN |
| cleanupOutdatedCaches=true | 13-1 Task 2 line 377 | GREEN |
| registerType=prompt (Pitfall #12 - no force-reload mid-form) | 13-1 Task 2 line 368 | GREEN |
| Test or grep guard for the three-flag state | 13-1 verification grep #5 | AMBER - see R-2 |

**Overall PITFALLS Section 3: GREEN with one revision-recommendation on the grep shape.**

---

## Issues — Resolution Status (round 2)

### Blocker B-1 — Smoke C step 14 wording — RESOLVED

- File: 13-2-PLAN.md line 667 (Smoke C step 14)
- Original problem: instructed verifier banner would return after same-tab reload, contradicting sessionStorage-persists-within-tab semantics + Hook Test #6.
- Resolution verified: new wording explicitly states "the banner STAYS HIDDEN" after same-tab reload, cites "see Hook Test #6, which asserts the snooze survives unmount+remount", documents the correct re-fire path ("close the entire tab/window and open a new session (or open a private/incognito window with a fresh sessionStorage scope)"), AND adds a direct-Update-path note ("the Phase 11 beforeunload guard fires the native are-you-sure prompt FIRST if you have unsaved IDB writes"). The old contradictory "banner returns" wording is GONE.
- Status: GREEN

---

### Revision-Recommended R-2 — Plan 13-1 grep #5 fragility — RESOLVED

- File: 13-1-PLAN.md (11 surgical edits)
- Original problem: grep -c with alternation counts matching LINES not patterns; duplicate-flag + commented-out-flag drift was invisible to the HARDBLOCK guard.
- Resolution verified across all 11 sub-asks (a-m):
  - (a) Frontmatter files_modified now lists src/__tests__/pwa-config.test.ts (line 20) — 13 entries.
  - (b) must_haves.truths gained 2 new truths (lines 45, 46) covering pwaOptions named-export refactor + pwa-config.test.ts shape + R-2 rationale. Original ask said 3 truths; planner compressed the refactor-rationale into truth 45 alongside the refactor description rather than splitting it into a standalone third truth. All three required concepts (refactor + test shape + R-2 rationale) are present and explicit — stylistic compression, not a content gap. ACCEPTABLE.
  - (c) must_haves.artifacts has the 4th test-file artifact (lines 92-95): min_lines: 50, contains: pwaOptions. PASS.
  - (d) must_haves.key_links has the new test-to-pwaOptions entry (lines 121-124). PASS.
  - (e) Task 2 action (lines 373-421) declares export const pwaOptions: Partial<VitePWAOptions> ABOVE defineConfig, then VitePWA(pwaOptions) in the plugins array. Cites the Phase 11 addDaysIso / nowIso single-source-of-truth precedent verbatim. PASS.
  - (f) Task 3 name renamed to "Write the three contract tests (pwa-manifest + pwa-index-html + pwa-config)" (line 472). PASS.
  - (g) Task 3 files attribute includes the third test path (line 473). PASS.
  - (h) Task 3 step 3 (lines 600-694) contains the new pwa-config test body. Counted 15 assertions: 3 HARDBLOCK flags + 1 registerType + 1 devOptions.enabled + 3 strategy/injectRegister/denylist + 7 manifest values = 15. Plan claims "~16"; 15 vs 16 is within tolerance for the "~" qualifier and covers every required dimension. PASS.
  - (i) Task 3 verify (line 714) runs the targeted pwa-config test first, then full suite + lint. PASS.
  - (j) Task 3 done (lines 716-717) enumerates all three tests + R-2 rationale explicit. PASS.
  - (k) Verification block: original checks #5/#6/#7 collapsed into single check #5 (lines 750-754) that invokes npm test on pwa-config.test.ts, expecting ~16 GREEN assertions. PASS.
  - (l) success_criteria (line 791) bumped to "1084 baseline + ~28 new GREEN (8 pwa-manifest + 4 pwa-index-html + ~16 pwa-config)". PASS.
  - (m) Task count UNCHANGED at 3 (R-2 folded into Task 3, not split into Task 4). PASS.
- Status: GREEN

---

### Minor stale-residue (non-blocking, optional cleanup)

Two callouts in 13-1-PLAN.md still reference the pre-R-2 baseline (~12 new GREEN, two test files):

- Truth #47 (line 47): "The two new test files add ~10-12 new green assertions" — should say "three new test files add ~28 new green assertions".
- Verification check #11 (line 778): "Expect: 1084 + ~12 GREEN" — should say "~28".

Additionally, the verification block numbering jumps from 5 to 8 (lines 754 → 756) because old checks #6 and #7 were removed and the remaining checks weren't renumbered. Cosmetic.

These do NOT break any HARDBLOCK, contract, or test logic — the source-of-truth statements in success_criteria (line 791) and Task 3 action step 4 (line 700) and Task 3 done (line 717) all consistently say ~28. The executor will rely on the success_criteria + Task 3 done, not the stale truth #47 / check #11. Non-blocking; flagged for optional polish if the planner wants to do a pass-clean before merging.

---

## Planner-Flagged Item Adjudication (8)

| # | Item | Adjudication |
|---|------|--------------|
| 1 | files_modified accuracy | PASS. Cross-checked all 12 entries in 13-1 + all 6 entries in 13-2 against each task files-element and action steps. No W3 frontmatter-completeness issue. |
| 2 | PWA stale-cache HARDBLOCK grep | AMBER -- see R-2. Grep is fragile under future edits but acceptable as a first-write check. Strongly recommend dedicated config-shape Vitest test. Not blocking. |
| 3 | registerType-prompt lock via grep + behaviour test | PASS. 13-1 verify grep #6 catches autoUpdate drift directly. 13-2 hook tests #1 + #2 are secondary check. Sufficient. |
| 4 | devOptions.enabled=false manual smoke only | ACCEPTABLE. Adjudication: grep at 13-1 verify-step #7 IS an automated regression guard -- the planner under-credited their own check. Smoke B is belt-and-suspenders against runtime behaviour. Combined coverage sufficient. |
| 5 | App.tsx minimal-touch grep >=8 hits | PASS. Counted in current App.tsx: useBackupNag (3) + isDirty (5) + beforeHandler (3) + visHandler (3) + getLastWriteAt (4) = >=18, well over threshold. Conservative; catches sloppy refactors. |
| 6 | UpdateBanner fixed-positioning vs MainLayout integration | JUSTIFIED. Verified: AdapterFallbackBanner is mounted INSIDE MainLayout (src/components/shell/MainLayout.tsx:77, between Header and content). CONTEXT line 81 naturally suggests INSIDE MainLayout. Planner explicitly identified and reasoned about this in 13-2 must_haves truth #11 + #12 -- chose fixed top-0 z-50 to avoid touching MainLayout interface. Defensible: (a) MainLayout has shape-locked tests, (b) alternative requires interface widening, (c) decision is reversible. Note: banner WILL overlap Header (~40px) when visible -- planner acknowledges in truth #13. Acceptable for a rare user-actionable banner. |
| 7 | @resvg/resvg-js choice + hardcoded Calculator SVG paths | PASS. Pure-WASM, zero native deps -- right choice for cross-platform CI (avoiding better-sqlite3 style Windows pain). Hardcoded paths decouple build script from lucide-react runtime shape. PNGs committed (deterministic). 10-element node array small enough to inline cleanly. |
| 8 | injectRegister=false flag | PASS. This IS the standard vite-plugin-pwa pattern from the README Prompt-for-Update section -- with registerType-prompt + custom registration hook, injectRegister-false prevents the plugin from auto-injecting a script tag that would race with useUpdateBanner registerSW call. Plan 13-1 interfaces block (lines 218-238) correctly types injectRegister as auto/inline/script/null/false. Correct config flag name. Plan 13-1 truth #10 cross-references this with Plan 13-2 Task 1. |

---

## Discretion-Call Audit (12 items)

CONTEXT lines 94-104 list 10 discretion areas; planner made 12 documented choices (some areas had sub-choices). All 12 are AUTHORIZED by CONTEXT Claude Discretion block OR are justified architectural deviations.

| # | Discretion choice | CONTEXT mandate | Adjudication |
|---|------------------|----------------|--------------|
| 1 | vite-plugin-pwa@^1.3.0 (caret-minor pin, latest 1.3.x) | CONTEXT 95: planner picks latest 1.3.x stable | PASS -- matches verbatim. STACK.md confirms Vite 6 compat. |
| 2 | @resvg/resvg-js over sharp / node-canvas / playwright | CONTEXT 96: planner picks cleanest cross-platform | PASS -- see flagged #7. |
| 3 | Commit PNGs to git | CONTEXT 97: RECOMMEND committing | PASS -- matches recommendation. |
| 4 | globPatterns includes .ico | CONTEXT 98: planner adjusts if Vite emits other extensions | PASS -- sensible addition for favicon. Avoid-block correctly excludes .json/.wasm. |
| 5 | UpdateBanner neutral-stone palette | CONTEXT 99: neutral-stone matching AdapterFallbackBanner is natural | PASS -- matches recommendation. |
| 6 | Dedicated useUpdateBanner hook | CONTEXT 100: hook is cleaner if tests need isolation | PASS -- 6 hook tests demonstrate isolation. |
| 7 | Dynamic import + __setRegisterSWForTests seam | CONTEXT 101: planner verifies import path against installed version | PASS -- documented pattern for jsdom test environments. Planner documented WHY in truth #6. |
| 8 | Manual DevTools Lighthouse smoke | CONTEXT 102: planner picks manual or CLI | PASS -- detailed instructions (Smoke A steps 1-6). |
| 9 | Single 180x180 apple-touch-icon | CONTEXT 103: planner may add 152/167 if needed; 180 covers iPhone + most iPads | PASS -- matches recommended default. |
| 10 | meta theme-color in index.html | CONTEXT 104: belt-and-suspenders for older browsers | PASS -- matches recommendation. |
| 11 | injectRegister=false | NOT in discretion list -- derivative of #6 + #7 | JUSTIFIED DEVIATION -- see planner-flagged #8. Correct config flag for the architectural pattern chosen. |
| 12 | UpdateBanner fixed-position | NOT in discretion list -- deviation from CONTEXT 81 sibling-to-AdapterFallbackBanner | JUSTIFIED DEVIATION -- see planner-flagged #6. Lower-risk path; transparent trade-off; reversible. |

**No silently incorrect choices. No risky choices.**

---

## Dependency Chain Verification

Plan 13-2 depends_on: [13-1]. Plan 13-1 depends_on: []. Wave 1 -> Wave 2.

| 13-1 Output | 13-2 Consumer | Validated |
|-------------|---------------|-----------|
| vite-plugin-pwa@^1.3.0 devDep | 13-2 Task 1 virtual:pwa-register dynamic import + vite-plugin-pwa/client TS reference | GREEN -- 13-2 facts line 194 confirms |
| dist/sw.js + dist/manifest.webmanifest | 13-2 Task 3 Smoke A Lighthouse audit | GREEN -- Smoke A step 3 checks DevTools |
| 5 PNG icons in public/ | 13-2 Task 3 Smoke A manifest.icons resolution | GREEN -- Smoke A fallback (line 681) checks dist/icon-*.png |
| vite.config.ts has registerType-prompt + injectRegister-false | 13-2 Task 1 useUpdateBanner manual registerSW + onNeedRefresh callback | GREEN -- 13-2 facts lines 195-196 |
| vite.config.ts has devOptions.enabled=false | 13-2 Task 3 Smoke B verifies absence | GREEN |
| vite-plugin-pwa/client TS types | 13-2 Task 1 vite-env.d.ts triple-slash reference | GREEN -- types ship with package install |

**No broken dependencies. No forward references. Wave assignment correct.**

---

## Verification Commands -- GREEN Demonstrability

Plan 13-1: All 11 commands are concrete, runnable shell pipelines that exit with verifiable output (file existence, regex matches, JSON parsing). No tests-pass hand-waving. Test count projection 1084 baseline -- ~1096 SPA GREEN is plausible: pwa-manifest.test.ts has 9 it() blocks, pwa-index-html.test.ts has 4 it() blocks -- 13 new (planner says ~12; close enough).

Plan 13-2: All 10 phase-level checks are concrete shell pipelines. Test count projection 1084 + 12 + 12 = ~1108 SPA GREEN -- plausible: 6 hook tests + 6 component tests = 12 new. Lines up with planner claim.

One observation: 13-1 verification check #5 -- see R-2 for grep fragility. Not blocking but recommended hardening.

---

## Out-of-Scope Hygiene

Scanned both plans for Phase 14 (POL-01..04) and deferred Phase 12 (AI-01/02) leakage:

| Out-of-scope item | Found? |
|-------------------|--------|
| /demo route (POL-02) | NO -- no /demo or aussieledger-demo IDB references |
| /privacy page (POL-03) | NO |
| README rewrite (POL-04) | NO -- no README touches in files_modified |
| First-visit UX (POL-01) | NO -- no entity-creation banner work |
| Gemini key UI (AI-01) | NO -- no Settings touches; no localStorage Gemini key |
| Direct-browser Gemini fetch (AI-02) | NO -- no connect-src widening; no @google/genai calls |
| Phase 11 IosItpBanner modifications | NO -- 13-2 verify #10 asserts git diff empty |
| StorageAdapter changes | NO -- no src/storage/* touches |
| Schema migration (v6->v7) | NO -- no src/lib/migrations/* touches |
| New Date() introduction | NO -- grep confirms 0 occurrences in both PLAN files |

**Clean scope. No leakage detected.**

---

## CONTEXT Discretion Compliance

All 12 planner discretion choices map to scope authorised by CONTEXT Claude Discretion block (lines 93-105) OR are justified architectural deviations (items 11 + 12). No silent scope creep. No locked decisions contradicted (every CONTEXT-locked value -- name, short_name, description, theme_color, background_color, display, start_url, categories, sessionStorage key, banner copy, registerType, three Workbox flags, devOptions.enabled -- appears verbatim in plans must_haves + action + verification).

**No deferred ideas (CONTEXT lines 201-216) included.** Specifically NOT present: @vite-pwa/assets-generator, custom brand mark, Lighthouse CI in GitHub Actions, runtime caching for /api/*, read-only mode, beforeinstallprompt desktop button, push notifications, background sync, PWA shortcuts.

---

## Final Summary

**Verdict (round 2): PASS.**

Both B-1 (Smoke C wording) and R-2 (workbox-flags grep hardening) returned exactly as asked. The R-2 refactor lands as a clean Phase-11-style named-export pattern, and the new pwa-config.test.ts contract test replaces three brittle grep guards with one structural assertion that catches the duplicate-flag and commented-out-flag drift the old greps missed.

Round-2 delta findings:

- Delta 1 (B-1): GREEN — see Issues block above.
- Delta 2 (R-2): GREEN across all 11 sub-asks (a-m) — see Issues block above.
- Minor stale-residue: truth #47 + verification check #11 still cite the pre-R-2 baseline (~12 / two test files); cosmetic, non-blocking. Source-of-truth statements (success_criteria + Task 3 done) all consistently say ~28.

All prior PASS findings stand. The plan pair is execution-ready.

- Every ROADMAP success criterion (4/4) — GREEN
- Every PWA-01 sub-clause (4/4) — GREEN; the AMBER on dev-mode SW absence is now upgraded to GREEN by the new pwa-config.test.ts assertion on devOptions.enabled === false
- Every locked CONTEXT decision (16/16) — GREEN
- Every architecture invariant (a-i) — GREEN; the previous AMBER on (a) PWA stale-cache HARDBLOCK and (c) devOptions.enabled is now upgraded to GREEN by the new structural test
- PITFALLS Section 3 HARDBLOCK — hardened end-to-end (structural test + diff-review at first-write)
- No scope leak to Phase 14 / deferred Phase 12
- ~1112 SPA GREEN projection from 1084 baseline (+28 new — 8 pwa-manifest + 4 pwa-index-html + ~16 pwa-config + 12 from Plan 13-2 = 1124 end-of-phase target)
- All 12 discretion calls justified
