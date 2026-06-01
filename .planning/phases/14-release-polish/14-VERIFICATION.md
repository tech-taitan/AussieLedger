---
phase: 14-release-polish
type: verification
verifier: gsd-plan-checker
verified_at: 2026-06-02
verdict: PASS
plans_verified: [14-1-PLAN.md, 14-2-PLAN.md, 14-3-PLAN.md]
---

# Phase 14 Plan Verification

## Verdict: PASS

The three plans, taken together and executed as written, deliver all four ROADMAP Phase 14 active success criteria (HOST-04 already closed early in Phase 10) and every POL-01/02/03/04 acceptance clause. All nine architecture invariants preserved. PITFALLS §4 demo-data-leak HARD-BLOCK is addressed with an executable guard (`src/storage/__tests__/demo-isolation.test.ts`, 3 cross-contamination tests). All four verbatim copy locks are encoded as executable test assertions. All 13 Claude's-Discretion calls fall within CONTEXT-authorised scope. No scope creep. No deferred-idea contamination. Dependency graph acyclic; Plans 14-2 and 14-3 are parallel-safe within Wave 2.

No revision asks. Plans execution-ready.

---

## ROADMAP Phase 14 Success Criteria (5 — 1 already closed)

| # | Criterion | Plan/Task | Status |
|---|-----------|-----------|--------|
| 1 | HOST-04 custom domain | Already closed in Phase 10 (Vercel pivot, 2026-06-01) | GREEN (out of scope) |
| 2 | First-visit empty-state with trust banner + 2 CTAs; disappears after first entity | 14-2 Task 1 (WelcomeBanner verbatim copy + 2 CTAs); 14-2 Task 5 (MasterDashboard `activeEntities.length === 0` branch returns ONLY the WelcomeBanner) | GREEN |
| 3 | /demo loads pre-seeded sole-trader in `aussieledger-demo` IDB; `/` returns real data intact; "Demo Mode" banner visible | 14-1 Task 2 (DB_NAME_DEMO constant + widened ctor), Task 3 (seedDemoData), Task 4 (initAdapter pathname dispatch + isolation guard); 14-2 Task 2 (DemoModeBanner mounted via MainLayout) | GREEN |
| 4 | /privacy page reachable from every footer; lists trust signals incl. v5-deferral AI note + Apache 2.0 + repo link | 14-2 Task 3 (PrivacyPage with 12 bullets), Task 4 (DisclaimerFooter widened with /privacy sibling link), Task 5 (ViewRouter renders PrivacyPage on view==='privacy'), Task 6 (App.tsx initial view from getRouteKind) | GREEN |
| 5 | README rewritten with top-of-fold demo URL + screenshot placeholder + 2-option Quick Start + dev:full documented + privacy footer link | 14-3 Task 1 (README restructure to ~115 lines) + Task 2 (7 new readme.test.ts assertions) | GREEN |

---

## POL Acceptance Sub-Clauses

| Clause | Plan/Task Mapping | Status |
|--------|---------------------|--------|
| POL-01: First-visit empty state with verbatim trust copy + 2 CTAs; disappears after first entity | 14-2 Task 1 verbatim copy test; Task 5 conditional mount + Test 2 entity-present hides banner | GREEN |
| POL-02 separate `aussieledger-demo` IDB | 14-1 Task 2 (DB_NAME_DEMO export), Task 4 (initAdapter pathname dispatch + 3 isolation tests) | GREEN |
| POL-02 returning to `/` returns real data intact | 14-1 Task 4 Tests 1-3 (cross-adapter no contamination) + 14-2 Task 2 (Exit-demo via `window.location.href='/'` full reload) | GREEN |
| POL-02 "Demo Mode" banner visible throughout | 14-2 Task 2 (DemoModeBanner with verbatim copy + MainLayout mount as sibling to AdapterFallbackBanner) | GREEN |
| POL-03 /privacy with required signals (no third-party scripts, no cookies, no analytics, no server-side storage, AI v5-deferral, Apache 2.0, repo link) | 14-2 Task 3 — bullets 1, 2, 3, 4, 7 (AI), 6 (Apache 2.0 + repo) + Tests 3, 5, 6, 7, 8 | GREEN |
| POL-03 footer link from every page | 14-2 Task 4 — DisclaimerFooter widened with sibling `<a href="/privacy">`; DisclaimerFooter is mounted in MainLayout which wraps every view | GREEN |
| POL-04 README top-of-fold pitch + demo URL + screenshot placeholder | 14-3 Task 1 lines ~92-101 in drafted README structure | GREEN |
| POL-04 Quick Start covers (1) demo (2) clone/self-host | 14-3 Task 1 ### Option 1 + ### Option 2 sub-headings | GREEN |
| POL-04 `npm run dev:full` documented (small-firm VPS shape) | 14-3 Task 1 Small-firm VPS section retains `npm run build:server` + `npm run start:server`; literal `npm run dev:full` token in the Windows-dev note line | GREEN |
| POL-04 Privacy footer points at /privacy | 14-3 Task 1 Privacy section line ~180 + Task 2 NEW Test 3 | GREEN |
| POL-04 CONTRIBUTING + Apache 2.0 link | 14-3 Task 1 preserved; Task 2 existing Apache 2.0 assertion still passes | GREEN |


---

## Architecture Invariants (a-i)

| Invariant | Status | Evidence |
|-----------|--------|----------|
| (a) PITFALLS §4 HARD-BLOCK (`aussieledger-demo` namespace) | GREEN | Plan 14-1 Task 2 introduces `DB_NAME_DEMO='aussieledger-demo'`; Task 4 creates `demo-isolation.test.ts` with 3 cross-contamination assertions; must_haves.truths[6] explicitly locks "Writing demo data while the production DB also exists leaves the production 'aussieledger' DB byte-identical". |
| (b) DisclaimerFooter verbatim copy preserved | GREEN | Plan 14-2 Task 4 action step 5 explicitly: "the inner string between `<span>` and `</span>` must be byte-identical"; Task 4 Test 1 asserts the full disclaimer string via `textContent.toContain()`. |
| (c) Verbatim POL-01/02/03 copy locked | GREEN | Plan 14-2 Task 1 step 6 (POL-01 em-dash assertion), Task 2 step 8 (POL-02 em-dash assertion), Task 3 step 4 (POL-03 AI bullet flattened-textContent assertion). All three include CRITICAL annotations + executable test assertions. |
| (d) No `new Date()` outside `src/lib/period.ts` | GREEN | Plan 14-1 Task 3 step 4 ("literal ISO date strings... no `new Date()` calls"); step 8 ("structural-lint-period.test.ts compliant"); verify-command explicitly includes `structural-lint-period.test.ts` run. |
| (e) StorageAdapter FINAL — constructor change only, no interface methods | GREEN | Plan 14-1 Task 2 widens **LocalAdapter** constructor (not the StorageAdapter interface); step 10 reaffirms "no interface methods added/removed"; `files_modified` does NOT include `src/storage/adapter.ts`; verification grep checks adapter.ts shape unchanged. New `getDbName()` method (Task 4 step 6) is on LocalAdapter only — consistent with Phase 11 duck-typing pattern. |
| (f) Phase 11 IDB-05 wiring preserved in App.tsx | GREEN | Plan 14-2 Task 6 step 3 explicitly: "this is the ONLY change to App.tsx. The Phase 11 useBackupNag wiring, the Phase 11 isDirty derivation + beforeunload+visibilitychange listeners, the Phase 13 UpdateBanner mount — ALL byte-identical post-Phase-14". Verification grep step `grep -n "useBackupNag\|beforeunload\|UpdateBanner" src/App.tsx`. |
| (g) CSP unchanged (no vercel.json edits) | GREEN | No plan lists `vercel.json` in `files_modified`. Plan 14-2 verification grep includes `git diff vercel.json   # should be empty`. |
| (h) AIza scan still passes | GREEN | All 3 plans include `npm run build` in verification commands. Plan 14-1 Task 4 done-criterion: "demo-seed.ts is literal text + numbers; no AIza key shapes". Plan 14-2 success-criteria: "PrivacyPage text + WelcomeBanner copy + DemoModeBanner copy contain no AIza-shaped strings". Plan 14-3 success-criteria: "README contains no AIza key shapes". |
| (i) SPDX header on all new source files | GREEN | Each NEW source file task action step 1 specifies "with Apache 2.0 SPDX header". Auto-discovering `src/__tests__/spdx-headers.test.ts` will pick up all 5 new non-test `.ts/.tsx` files: route.ts + demo-seed.ts (14-1) + WelcomeBanner.tsx + DemoModeBanner.tsx + PrivacyPage.tsx (14-2). Plans 14-1 + 14-2 success criteria mention "SPDX-headers parametric +N rows". |

---

## PITFALLS §4 HARD-BLOCK Adjudication

GREEN. The executable guard is `src/storage/__tests__/demo-isolation.test.ts` (Plan 14-1 Task 4). Three tests directly model cross-adapter scenarios:

- Test 1: prod-then-demo write — prod retains only the prod sentinel
- Test 2: demo-then-prod read — fresh prod sees zero demo entities
- Test 3: same-session both-adapters — demo write invisible to prod adapter

This relies on `fake-indexeddb`'s origin+dbName tuple modelling — which is correct: fake-indexeddb scopes its in-memory store by dbName string, matching real-browser IDB origin+dbName scoping per W3C IndexedDB spec. The test design is sound.

---

## Planner-Flagged Item Adjudication (8)

| # | Item | Verdict | Notes |
|---|------|---------|-------|
| 1 | Plan 14-2 6 tasks vs GSD 2-3 guideline | ACCEPT | Tasks share a tight UI mount surface (MainLayout, App.tsx, MasterDashboard, ViewRouter). Each task bounded (Task 1: ~60 lines + 4 tests; Task 2: ~50 lines + 3 tests + 3-line MainLayout edit; Task 3: ~80 lines + 8 tests; Task 4: ~30-line edit + 2 tests; Task 5: 3 small edits + 4 tests; Task 6: 2-line useState edit + 3 tests). No single task exceeds 60min. Splitting further would create artificial seams. Planner justification concrete. |
| 2 | Verbatim copy lock across 4 strings | GREEN | Each lock encoded as test assertion: POL-01 em-dash in 14-2 Task 1 Test 1; POL-02 em-dash in 14-2 Task 2 Test 1; POL-03 AI bullet via `textContent` flatten in 14-2 Task 3 Test 3 (correctly handles embedded `<code>GEMINI_API_KEY</code>` since `textContent` strips tags); DisclaimerFooter verbatim in 14-2 Task 4 Test 1 via `textContent.toContain()`. All four locks executable. |
| 3 | PITFALLS §4 HARD-BLOCK testability via fake-indexeddb | GREEN | Reliance on dbName-tuple isolation is correct for both real IDB and fake-indexeddb. |
| 4 | Phase 11 IDB-05 regression risk in App.tsx | GREEN | Plan 14-2 Task 6 step 3 + verification grep step both lock the regression check. App.tsx existing content confirms `useBackupNag` + `beforeunload` + `visibilitychange` + `isDirty` + `UpdateBanner` are all present today. Plan's only change is the `useState<View>` initialiser — narrow lazy-init that does not affect any of the above. |
| 5 | StorageAdapter FINAL invariant | GREEN | `src/storage/adapter.ts` is NOT in any plan's `files_modified` list. The LocalAdapter constructor widening + new `getDbName()` getter are at the implementation class level, not on the interface. Duck-typed-getter pattern consistent with Phase 11's `getPersistGranted/getStorageEstimate/getLastWriteAt/setLastWriteAt`. |
| 6 | No `new Date()` outside period.ts | GREEN | Plan 14-1 Task 3 step 4: "NO import of `nowIso()` — seed data uses literal ISO strings"; step 8 confirms regex `\bnew\s+Date\s*\(\s*\)` won't match literal `'2025-07-15'`. structural-lint-period.test.ts IS included in Plan 14-1 Task 3's verify command. |
| 7 | README `wc -l` lower bound: 100 lines (Plan 14-3 Test 7) | GREEN | Lower bound of 100 against target ~115 leaves ~15 lines of slack. Current README is 82 lines, so floor at 100 detects any near-rollback while not being so strict it false-fires on minor edits. Reasonable safety margin. |
| 8 | SPDX-headers parametric +5 rows | GREEN | Auto-discovering `spdx-headers.test.ts` collector (`collect()` recursive over `src/`) will discover the 5 new non-test `.ts/.tsx` files automatically. Each NEW-source file task action specifies SPDX header as step 1. |


---

## Discretion-Call Audit (13 items)

CONTEXT lines 113-125 list 13 discretion areas; planner made 13 documented choices. All are AUTHORISED by CONTEXT Claude's Discretion block OR are justified idiomatic extensions of existing project patterns.

| # | Discretion Call | CONTEXT Authorisation | Verdict |
|---|-----------------|------------------------|---------|
| 1 | `getRouteKind()` extracted to `src/lib/route.ts` | CONTEXT "Pathname-dispatch implementation location" — explicitly authorises either inline OR `src/lib/route.ts` helper. Planner chose helper because of 2 call sites (App.tsx + storage/index.ts). | GREEN — within authorised scope; cleaner choice |
| 2 | `DemoModeBanner` blue palette (`bg-blue-50 border-blue-300 text-blue-900`) + FlaskConical icon | CONTEXT discretion item 2 — "blue tint to distinguish from neutral-stone AdapterFallbackBanner/UpdateBanner; planner picks blue value matching existing brand (probably `bg-blue-50 border-blue-300 text-blue-900` or similar)". | GREEN — verbatim per CONTEXT example |
| 3 | Demo entity name `"Demo Sole Trader (Sample Data)"` | CONTEXT discretion: "planner picks a realistic name... keep it obviously demo-ish". Sole-trader-correct (no "Pty Ltd" misuse) and obviously-demo via parenthetical. | GREEN |
| 4 | 15 journals across FY2025-26 | CONTEXT specifics: "~15 sample journal entries spanning one FY (FY2025-26)". | GREEN — exact match |
| 5 | Demo timestamps as literal ISO strings | CONTEXT specifics: "literal strings are fine since seed data is fixed not dynamic. Planner picks the cleanest pattern given the no-new-Date invariant." | GREEN — literal-string approach avoids structural-lint risk |
| 6 | DisclaimerFooter privacy link as `justify-between` sibling | CONTEXT discretion: "inline with the existing 'Not tax advice' disclaimer or below it; planner picks based on visual fit". | GREEN — sibling element is visually clean |
| 7 | App.tsx initial view via lazy `useState(() => ...)` | Consistent with CONTEXT "DIY pathname-based dispatch — read window.location.pathname once on mount". Lazy initialiser is idiomatic React for single-shot init logic. | GREEN |
| 8 | README screenshot placeholder as italic blockquote `> _Screenshot coming v1.3._` | CONTEXT discretion: "explicit `[Screenshot coming v1.3]` note vs simply omit. Planner picks; either is acceptable." | GREEN |
| 9 | PrivacyPage filename `src/components/PrivacyPage.tsx` | CONTEXT discretion: "planner picks based on existing patterns (no `src/views/` dir exists; `src/components/` is the convention)". | GREEN — matches existing convention |
| 10 | DemoModeBanner mount as first child inside main column (before AdapterFallbackBanner) | CONTEXT: "same top-of-app banner row as AdapterFallbackBanner + UpdateBanner (sibling in MainLayout)". Plan 14-2 Task 2 step 6 makes it a sibling INSIDE MainLayout above AdapterFallbackBanner. | GREEN |
| 11 | PrivacyPage non-AI bullet wording (11 bullets) | CONTEXT locks AI bullet verbatim + tone + count (~12); non-AI wording explicitly listed under "Claude's Discretion". Drafted wording matches calm-modernist tone (verifiable single-claim sentences). | GREEN |
| 12 | LocalAdapter `getDbName()` getter for testability | Not in CONTEXT discretion list but consistent with Phase 11's duck-typed accessor pattern. Test-only seam, documented in JSDoc. | JUSTIFIED IDIOMATIC EXTENSION |
| 13 | Tests for routing — unit (route.test.ts) + integration (App.routing.test.tsx) | CONTEXT discretion: "planner decides between (a) unit-test, (b) integration-test, or (c) both. Coverage target: every routing branch reachable." Planner chose (c). | GREEN |

**No silently incorrect choices. No risky choices.**

---

## Dependency Chain Verification

| Plan | Wave | depends_on | Validated |
|------|------|------------|-----------|
| 14-1 | 1 | [] | GREEN — Wave 1 foundation, no prerequisites within Phase 14 |
| 14-2 | 2 | ["14-1"] | GREEN — consumes `getRouteKind()` from `src/lib/route.ts` (14-1 Task 1) at App.tsx mount AND at DemoModeBanner render; LocalAdapter widening + initAdapter pathname dispatch (14-1 Tasks 2-4) are pre-conditions for /demo seeded-data experience |
| 14-3 | 2 | ["14-1"] | GREEN — README + readme.test.ts only. ZERO file overlap with 14-1 source files. `depends_on: ["14-1"]` is wave-ordering only, not strict file dependency (plan acknowledges this in its objective). 14-2 and 14-3 parallel-safe within Wave 2. |

Dependency graph acyclic. No forward references. Wave numbers consistent.

---

## Verification Commands — GREEN Demonstrability

| Plan | Verification | Demonstrates GREEN? | Notes |
|------|--------------|---------------------|-------|
| 14-1 | `npx vitest run` + `npm run lint` + `npm run build` + targeted greps for invariant preservation | YES | Includes structural-lint re-run, DB_NAME_DEMO presence, StorageAdapter FINAL grep |
| 14-2 | `npx vitest run` + lint + build + verbatim copy `grep -F` for all 4 locked strings + wiring greps + vercel.json/vite.pwa-options.ts no-diff check | YES | Excellent regression coverage of Phase 11 + Phase 13 surfaces |
| 14-3 | `npx vitest run src/__tests__/readme.test.ts` + full SPA run + lint + build + URL/length greps | YES | All locked URLs and tokens covered |

Test count projection: 1128 baseline + ~16-20 (14-1) + ~22-25 (14-2) + ~7 (14-3) = ~1173-1180 SPA GREEN. Plans projection of `~1158-1180 SPA GREEN` falls within this range. Plausible.

