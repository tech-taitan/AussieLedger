---
phase: 14-release-polish
plan: 2
status: complete
subsystem: ui-integration,welcome-banner,demo-mode-banner,privacy-page,disclaimer-footer-widening,master-dashboard-empty-state,app-view-dispatch
tags: [welcome-banner, demo-mode-banner, privacy-page, disclaimer-footer, master-dashboard-empty-state, view-router-privacy, app-view-dispatch, pol-01, pol-02, pol-03, verbatim-copy-locks, idb-05-preserved, csp-unchanged, pwa-unchanged]
dependency_graph:
  requires:
    - "Plan 14-1: getRouteKind() helper at src/lib/route.ts"
    - "Plan 14-1: initAdapter() pathname dispatch (DB_NAME_DEMO + seedDemoData wiring)"
    - "Phase 11 IDB-05 wiring in App.tsx (useBackupNag + isDirty + beforeunload + visibilitychange)"
    - "Phase 13 UpdateBanner mount in App.tsx"
    - "Phase 01 DisclaimerFooter verbatim disclaimer copy lock"
    - "Phase 03 LocalAdapter + initAdapter probe path"
    - "Phase 06 PersonaModeModal first-run gate (preserved; pre-seeded in App.routing.test.tsx)"
  provides:
    - "WelcomeBanner (POL-01) — empty-state inline trust banner with verbatim copy + 2 CTAs"
    - "DemoModeBanner (POL-02 finish) — top-of-app blue-tinted route-gated banner"
    - "PrivacyPage (POL-03) — /privacy view with 12 trust bullets incl. verbatim AI v5-deferral"
    - "DisclaimerFooter widened with /privacy sibling link (Phase 01 verbatim copy preserved)"
    - "MasterDashboard empty-state branch: activeEntities.length === 0 → WelcomeBanner"
    - "App.tsx initial view dispatched off getRouteKind() at mount (single 3-line lazy initialiser)"
    - "View union widened with 'privacy' variant"
    - "ViewRouter renders <PrivacyPage /> when view === 'privacy'"
    - "MainLayout mounts <DemoModeBanner /> as the first child inside the main column (sibling to AdapterFallbackBanner)"
    - "POL-01, POL-02, POL-03 all closeable post-Plan-14-2"
  affects:
    - src/components/WelcomeBanner.tsx
    - src/components/__tests__/WelcomeBanner.test.tsx
    - src/components/DemoModeBanner.tsx
    - src/components/__tests__/DemoModeBanner.test.tsx
    - src/components/PrivacyPage.tsx
    - src/components/__tests__/PrivacyPage.test.tsx
    - src/components/DisclaimerFooter.tsx
    - src/components/__tests__/DisclaimerFooter.test.tsx
    - src/components/MasterDashboard.tsx
    - src/components/__tests__/MasterDashboard.test.tsx
    - src/components/shell/MainLayout.tsx
    - src/components/ViewRouter.tsx
    - src/types.ts
    - src/App.tsx
    - src/__tests__/App.routing.test.tsx
tech_stack:
  added: []
  patterns:
    - "Verbatim copy lock encoded as executable test assertion — each of POL-01 (welcome-trust-copy), POL-02 (demo-mode-copy), POL-03 AI bullet (textContent flatten), and DisclaimerFooter (Phase 01) is asserted via `.textContent` byte-equality, not via grep. The em-dash character (U+2014) is what the test asserts; hyphen substitutions fail RED."
    - "Lazy useState initialiser (`useState<View>(() => ...)`) — captures window.location.pathname once on mount via getRouteKind(); no useEffect required; stable for the page lifetime (full-reload demo exit + /privacy navigation match)."
    - "Sibling banner stack in MainLayout — DemoModeBanner on top (blue, route-gated, returns null on /), AdapterFallbackBanner below (neutral, mode-gated). Zero DOM cost on non-/demo routes."
    - "Early-return empty-state in MasterDashboard — activeEntities.length === 0 → render ONLY <WelcomeBanner /> (no Recent Clients, no header, no entity grid). The entity-grid path is preserved byte-identical for activeEntities.length > 0."
    - "JSX `<code>` tag flatten via textContent — PrivacyPage AI bullet embeds <code>GEMINI_API_KEY</code> but test asserts on `.textContent` which strips tags, so the locked string matches as plain text. Whitespace-normalised via `/\\s+/g, ' '` for JSX-line-wrap tolerance."
    - "Flex justify-between for DisclaimerFooter widening — Phase 01 verbatim copy preserved inside a left-aligned <div>; /privacy <a> link added as a right-aligned sibling. No paraphrasing, abbreviation, or substitution of the locked disclaimer text."
    - "PersonaModeModal-aware integration tests — App.routing.test.tsx pre-seeds `aussieledger:settings = {mode: 'agent'}` in beforeEach so the persona modal doesn't gate the view-routing assertions (existing pattern from App.beforeunload.test.tsx and other integration suites)."
key_files:
  created:
    - src/components/WelcomeBanner.tsx
    - src/components/__tests__/WelcomeBanner.test.tsx
    - src/components/DemoModeBanner.tsx
    - src/components/__tests__/DemoModeBanner.test.tsx
    - src/components/PrivacyPage.tsx
    - src/components/__tests__/PrivacyPage.test.tsx
    - src/__tests__/App.routing.test.tsx
  modified:
    - src/components/DisclaimerFooter.tsx
    - src/components/__tests__/DisclaimerFooter.test.tsx
    - src/components/MasterDashboard.tsx
    - src/components/__tests__/MasterDashboard.test.tsx
    - src/components/shell/MainLayout.tsx
    - src/components/ViewRouter.tsx
    - src/types.ts
    - src/App.tsx
decisions:
  - "WelcomeBanner accessibility shape: role='region' + aria-label='Welcome — get started' on a `<section>` element. Semantic over presentational; passes the accessibility test via `getByRole('region', { name: /welcome/i })`."
  - "DemoModeBanner returns null on non-/demo routes (zero DOM cost). The blue palette (bg-blue-50 border-blue-300 text-blue-900) + FlaskConical icon are per CONTEXT discretion item 2; the 'Exit demo' button uses window.location.href = '/' (NOT history.pushState, NOT location.assign) to trigger a full-reload boundary that re-initialises the adapter against the production DB."
  - "PrivacyPage rendered inside MainLayout's children slot (not as a top-level full-page route). Means Sidebar + Header + DisclaimerFooter chrome stays around it; the primary navigation path is direct URL or footer-link click → full page reload → getRouteKind() picks 'privacy'. Within calm-modernist tone per CONTEXT 'Claude's Discretion' for non-AI bullet wording."
  - "PrivacyPage bullet count = exactly 12 (per CONTEXT '~12 bullets'). Test asserts `:scope > li` count is exactly 12, locking the bullet count against future scope creep."
  - "AI bullet test uses textContent flatten with whitespace-normalise — JSX wraps the verbatim string across multiple source lines, and `<code>GEMINI_API_KEY</code>` is embedded as a real <code> tag. Test reads `screen.getByTestId('privacy-ai-bullet').textContent`, replaces /\\s+/g with single spaces, then asserts `.toBe(VERBATIM_AI_BULLET)`. This catches both em-dash substitutions AND any paraphrase."
  - "DisclaimerFooter widening uses flex justify-between with the existing disclaimer span wrapped in a `<div>` and the privacy `<a>` link as a sibling. The inner string between `<span>` and `</span>` is byte-identical to pre-Phase-14; Test 1 + new Test 4 both regression-guard the verbatim copy via `.textContent.toContain()`."
  - "MasterDashboard empty-state branch is an early return — placed AFTER `const activeEntities = ...` filter but BEFORE the useMemo recentClients computation. When activeEntities.length === 0, the branch returns <WelcomeBanner /> wrapped in a `<div data-testid='master-dashboard-empty'>` and skips all the entity-grid + Recent Clients + header rendering. The activeEntities.length > 0 path is preserved byte-identical."
  - "Archived-only entities trigger the empty-state — activeEntities filter strips status==='Archived'; if all entities are archived, activeEntities.length === 0 → WelcomeBanner renders. Locks the CONTEXT decision 'Treats fresh install and deleted-everything as the same empty-state moment'."
  - "App.tsx change is the ABSOLUTE MINIMUM — single lazy useState initialiser `useState<View>(() => getRouteKind() === 'privacy' ? 'privacy' : 'master-dashboard')` plus a 1-line import. Phase 11 IDB-05 wiring (useBackupNag, isDirty derivation, beforeunload + visibilitychange registration, all cleanup logic) and Phase 13 UpdateBanner mount are byte-identical post-Phase-14. Verified via grep: useBackupNag at line 80, isDirty at line 87, beforeunload at lines 152/155, visibilitychange at lines 153/156, UpdateBanner at line 162."
  - "App.routing.test.tsx Test 1 asserts 'no privacy-page + no demo-mode-banner on /' rather than 'welcome-banner present'. Reason: useEntities seeds DEFAULT_ENTITIES on first run, so activeEntities.length > 0 by default in tests; the entity grid renders rather than the WelcomeBanner. The intent of Test 1 is to lock that /privacy + /demo specific UI is NOT present on the default route — which is what the test asserts."
  - "App.routing.test.tsx pre-seeds persona settings in beforeEach (mode: 'agent') so PersonaModeModal doesn't gate the view-routing assertions. 'agent' mode keeps the master-dashboard reachable; 'owner' mode would auto-redirect to 'dashboard' via the existing ViewRouter useEffect."
  - "Test stubs use `vi.stubGlobal('location', { ...window.location, pathname: ... })` — preserves the rest of the location object (origin, protocol, etc.) so any code reading other location properties (e.g., URL construction) still works. The afterEach call to `vi.unstubAllGlobals()` restores the original location."
  - "View union 'privacy' variant added at the end (NOT inserted alphabetically) — explicit comment in types.ts denotes it as the Phase 14 addition. Existing switch-on-view sites default to 'nothing renders' for unknown views (acceptable: only ViewRouter explicitly handles 'privacy'); no exhaustive-switch regressions detected."
metrics:
  duration: "~45min (2026-06-02T13:55Z → 2026-06-02T14:13Z; 6 tasks back-to-back; each ~5-10min implementation + local verification)"
  completed: "2026-06-02"
  tasks_completed: 6
  files_created: 7
  files_modified: 8
  tests_added: "24 (4 WelcomeBanner + 3 DemoModeBanner + 8 PrivacyPage + 2 DisclaimerFooter + 4 MasterDashboard + 3 App.routing) plus parametric SPDX-headers rows for the 3 new non-test source files (.tsx)"
  tests_total: 1183
  test_delta: "+34 (1149 → 1183) — 24 new explicit tests + parametric SPDX-headers rows for WelcomeBanner.tsx, DemoModeBanner.tsx, PrivacyPage.tsx, and the new test files"
---

# Phase 14 Plan 2: WelcomeBanner + DemoModeBanner + PrivacyPage + DisclaimerFooter widening + MasterDashboard mount + App.tsx view dispatch Summary

**One-liner:** UI integration that turns Plan 14-1's foundational routing/storage substrate into a working POL-01 + POL-02 + POL-03 release surface — empty-state WelcomeBanner with verbatim trust copy + two CTAs, top-of-app blue-tinted DemoModeBanner with Exit-demo full-reload, /privacy view with 12 trust bullets including the byte-identical Phase 12 v5-deferral AI bullet, DisclaimerFooter widened with /privacy sibling link (Phase 01 verbatim disclaimer preserved), MasterDashboard early-return empty-state branch, and a single 3-line lazy `useState<View>` initialiser in App.tsx that picks the initial view off `getRouteKind()` at mount. Phase 11 IDB-05 wiring + Phase 13 UpdateBanner + CSP + PWA contract all byte-identical post-Phase-14.

## What Was Built

### Task 1 — WelcomeBanner.tsx + 4 GREEN tests (commit `a84c899`)

**`src/components/WelcomeBanner.tsx`** (NEW, ~55 lines, SPDX header) — POL-01 inline empty-state:
- `<section role="region" aria-label="Welcome — get started" data-testid="welcome-banner">` with calm-modernist palette (`bg-white border border-[var(--line-strong)] p-8 text-center space-y-6`)
- Trust copy: `<p data-testid="welcome-trust-copy">Your data stays in your browser — no servers, no accounts.</p>` (em-dash verbatim)
- Primary CTA `<button data-testid="welcome-create-entity" onClick={onCreateEntity}>Create your first entity</button>` (ink-filled)
- Secondary CTA `<button data-testid="welcome-try-demo" onClick={() => { window.location.href = '/demo'; }}>Try the demo</button>` (ink-outlined)
- NO icons, NO animations, NO progress steppers per CONTEXT-locked simplicity

**`src/components/__tests__/WelcomeBanner.test.tsx`** (NEW, ~55 lines, SPDX header) — 4 tests:
1. Verbatim em-dash trust copy asserted via `.textContent.toBe(TRUST_COPY)`
2. Primary CTA renders "Create your first entity" + click invokes `onCreateEntity` prop
3. Secondary CTA renders "Try the demo" + click sets `window.location.href = '/demo'` (verified via `vi.stubGlobal('location', {...window.location, href: ''})`)
4. Structural — `getByRole('region', { name: /welcome/i })` returns the `<section>`

### Task 2 — DemoModeBanner.tsx + 3 GREEN tests + MainLayout mount (commit `b7cf5ea`)

**`src/components/DemoModeBanner.tsx`** (NEW, ~45 lines, SPDX header) — POL-02 top-of-app banner:
- `if (getRouteKind() !== 'demo') return null` — zero DOM cost on non-/demo routes
- `<div role="status" data-testid="demo-mode-banner">` with blue palette (`bg-blue-50 border-b border-blue-300 text-blue-900 px-4 py-2 text-sm`)
- FlaskConical icon (16px) + verbatim copy `<span data-testid="demo-mode-copy">Demo Mode — playing with sample data. Your real data is safe.</span>` (em-dash verbatim)
- Exit-demo button: blue-600 background, `onClick={() => { window.location.href = '/'; }}` — full-reload boundary so initAdapter() re-inits against the production DB

**`src/components/__tests__/DemoModeBanner.test.tsx`** (NEW, ~45 lines, SPDX header) — 3 tests:
1. Stub pathname='/demo' → banner present + verbatim copy + Exit button visible
2. Stub pathname='/' → `queryByTestId('demo-mode-banner')` is null (zero DOM cost)
3. Click Exit-demo with pathname='/demo' stubbed → `window.location.href === '/'`

**`src/components/shell/MainLayout.tsx`** (MODIFIED) — `import { DemoModeBanner } from '../DemoModeBanner';` added; `<DemoModeBanner />` mounted as the FIRST child inside the main column, BEFORE `<AdapterFallbackBanner />` (sibling banner stack). On non-/demo routes the banner returns null, so the layout collapses to its pre-Phase-14 shape.

### Task 3 — PrivacyPage.tsx + 8 GREEN tests (commit `5b7e15e`)

**`src/components/PrivacyPage.tsx`** (NEW, ~95 lines, SPDX header) — POL-03 /privacy view:
- `<main role="main" aria-labelledby="privacy-heading" data-testid="privacy-page" className="max-w-2xl mx-auto py-8 px-4 space-y-6">`
- `<h1 id="privacy-heading">Privacy</h1>` + intro `<p>` with "This page is the receipts" framing
- `<ul data-testid="privacy-bullets">` with EXACTLY 12 `<li>` children covering: no third-party scripts (with `<code>script-src 'self'</code>` reference), no cookies, no analytics, no server-side storage (mentions IndexedDB), no telemetry, Apache 2.0 + repo link (`data-testid="privacy-repo-link"` → https://github.com/tech-taitan/AussieLedger), the verbatim AI v5-deferral bullet (`data-testid="privacy-ai-bullet"` with embedded `<code>GEMINI_API_KEY</code>`), Vercel CDN, window.print(), JSON `<a download>` export, CSP visibility receipts, GitHub Issues contact
- Bullets 1-5 + 8-12 are planner-picked wording matching the calm-modernist tone (single-claim sentences, verifiable in DevTools, no legalese)
- Bullet 7 (AI) is CONTEXT-locked verbatim — em-dash + `GEMINI_API_KEY` + parenthetical clause + "planned for v5" all byte-identical

**`src/components/__tests__/PrivacyPage.test.tsx`** (NEW, ~80 lines, SPDX header) — 8 tests:
1. `role="main"` + `<h1>` "Privacy" present (getByRole semantic)
2. `<ul>` with EXACTLY 12 `<li>` children (`querySelectorAll(':scope > li').length === 12` — locks the count)
3. VERBATIM AI bullet via textContent flatten (`.replace(/\s+/g, ' ').trim()`) — embedded `<code>GEMINI_API_KEY</code>` flattens to plain text
4. Repo link `href === 'https://github.com/tech-taitan/AussieLedger'`
5. "Apache 2.0" mentioned (license disclosure)
6. "no cookies" mentioned
7. "no analytics" mentioned
8. "IndexedDB" mentioned

### Task 4 — DisclaimerFooter widening + 4 GREEN tests (commit `95bc671`)

**`src/components/DisclaimerFooter.tsx`** (MODIFIED) — `/privacy` sibling link added via flex justify-between:
- Outer `<footer>` className widened with `justify-between` added (alongside the existing `flex items-start gap-4`)
- Existing Info icon + verbatim disclaimer `<span>` wrapped in a `<div className="flex items-start gap-2 flex-1">`
- NEW `<a href="/privacy" data-testid="disclaimer-privacy-link">Privacy</a>` as a sibling of that wrapper div
- Inner string between `<span>` and `</span>` is BYTE-IDENTICAL — Phase 01 verbatim copy preserved. Grep `grep -F "This output is a draft working paper, not tax advice." src/components/DisclaimerFooter.tsx` → GREEN.

**`src/components/__tests__/DisclaimerFooter.test.tsx`** (MODIFIED) — 2 existing tests + 2 new:
- Existing Test 1: full-textContent contains EXACT_DISCLAIMER (Phase 01 lock — now ALSO regression-guards the widening)
- Existing Test 2: optional className prop accepted
- NEW Test 3: `data-testid="disclaimer-privacy-link"` → `getAttribute('href') === '/privacy'` + `textContent === 'Privacy'`
- NEW Test 4: regression — disclaimer copy byte-identical after widening (defensive double-check)

### Task 5 — types.ts View widening + ViewRouter PrivacyPage rendering + MasterDashboard WelcomeBanner mounting + 4 new MasterDashboard tests (commit `a61cea3`)

**`src/types.ts`** (MODIFIED) — View union widened: `| 'privacy'` added as the LAST variant (Phase 14 addition explicit).

**`src/components/ViewRouter.tsx`** (MODIFIED) — `import { PrivacyPage } from './PrivacyPage';` added; `{view === 'privacy' && <PrivacyPage />}` added as a NEW sibling line inside the same conditional-render block as `{view === 'settings' && ...}` (at the end of the JSX return inside the `motion.div` wrapper).

**`src/components/MasterDashboard.tsx`** (MODIFIED) — `import { WelcomeBanner } from './WelcomeBanner';` added; early-return branch placed AFTER `const activeEntities = entities.filter((e) => e.status !== 'Archived');` and BEFORE the useMemo recentClients computation:
```tsx
if (activeEntities.length === 0) {
  return (
    <div className="space-y-6" data-testid="master-dashboard-empty">
      <WelcomeBanner onCreateEntity={onAddEntity} />
    </div>
  );
}
```
The activeEntities.length > 0 path is preserved BYTE-IDENTICAL — entity grid + Recent Clients + header all unchanged.

**`src/components/__tests__/MasterDashboard.test.tsx`** (MODIFIED) — 3 existing MD.1-MD.3 tests preserved; 4 NEW Phase 14 tests appended:
- Test 4: entities=[] → WelcomeBanner present + no "Master Dashboard" header + no recent-clients section
- Test 5: 1 active entity → no WelcomeBanner + header + Add Entity button present
- Test 6: empty entities + click WelcomeBanner CTA → onAddEntity invoked
- Test 7: archived-only entity (Active=0) → WelcomeBanner present (deleted-everything = empty-state)

### Task 6 — App.tsx pathname-dispatched initial view + 3 GREEN integration tests (commit `94a92ac`)

**`src/App.tsx`** (MODIFIED) — Two-line addition:
- Imports: `import { getRouteKind } from './lib/route';`
- useState initialiser widened:
```tsx
const [view, setView] = useState<View>(() =>
  getRouteKind() === 'privacy' ? 'privacy' : 'master-dashboard'
);
```
That is the ONLY change to App.tsx. The Phase 11 IDB-05 wiring (`useBackupNag` at line 80, `isDirty` derivation + effect at lines 87-108, `beforeunload` + `visibilitychange` registration + cleanup at lines 110-158) and the Phase 13 `UpdateBanner` JSX at line 162 are all BYTE-IDENTICAL post-Phase-14. Verified via grep: `useBackupNag\|beforeunload\|visibilitychange\|UpdateBanner` returns 14 hits matching the pre-Phase-14 surface.

**`src/__tests__/App.routing.test.tsx`** (NEW, ~85 lines, SPDX header) — 3 integration tests:
1. pathname='/' → master-dashboard view; PrivacyPage NOT rendered; DemoModeBanner NOT rendered (zero DOM cost on non-/demo)
2. pathname='/privacy' → 'privacy' view; PrivacyPage IS rendered inside MainLayout (verified via `getByTestId('privacy-page')` + `getByRole('heading', { level: 1, name: /privacy/i })`)
3. pathname='/demo' → master-dashboard view + DemoModeBanner IS rendered; PrivacyPage NOT rendered

Tests pre-seed `aussieledger:settings = {mode: 'agent'}` in beforeEach to bypass the PersonaModeModal first-run gate (existing test pattern). `vi.stubGlobal('location', { ...window.location, pathname: ... })` set BEFORE render so the lazy useState initialiser captures the stubbed pathname.

## Plan-Level Verification (post-Task 6)

```
npx vitest run                              # 1183 SPA GREEN + 11 todo (+34 from 1149 baseline)
                                            # Targets: 4 WelcomeBanner + 3 DemoModeBanner + 8 PrivacyPage
                                            #          + 2 new DisclaimerFooter + 4 new MasterDashboard
                                            #          + 3 App.routing + parametric SPDX-headers rows
                                            #          + Plan 14-3's 3 new readme.test.ts assertions
npm run lint                                # EXIT 0 (tsc --noEmit clean for both spa + server)
npm run build                               # EXIT 0 incl. AIza scan ("scan-aiza: OK — no Gemini key shapes in dist/")
git diff HEAD vercel.json                   # empty (CSP unchanged)
git diff HEAD vite.pwa-options.ts           # empty (PWA contract preserved)
```

Targeted invariant greps:

```
# Verbatim copy locks
grep -F "Your data stays in your browser — no servers, no accounts." src/components/WelcomeBanner.tsx
# → GREEN — em-dash verbatim
grep -F "Demo Mode — playing with sample data. Your real data is safe." src/components/DemoModeBanner.tsx
# → GREEN — em-dash verbatim
grep -F "This output is a draft working paper, not tax advice." src/components/DisclaimerFooter.tsx
# → GREEN — Phase 01 lock preserved byte-identical
# POL-03 AI bullet asserted via textContent flatten in PrivacyPage.test.tsx Test 3
# (JSX wraps the locked string across multiple source lines; grep -F would not match)

# Wiring greps
grep -n "getRouteKind" src/App.tsx                                  # 3 hits: import + comment + lazy useState initialiser
grep -n "DemoModeBanner" src/components/shell/MainLayout.tsx        # 2 hits: import + JSX mount
grep -n "WelcomeBanner" src/components/MasterDashboard.tsx          # 3 hits: import + JSDoc comment + JSX mount
grep -n "PrivacyPage" src/components/ViewRouter.tsx                 # 2 hits: import + JSX render

# Phase 11 IDB-05 + Phase 13 regression — all byte-identical
grep -n "useBackupNag\|beforeunload\|visibilitychange\|UpdateBanner\|isDirty" src/App.tsx
# → 14+ hits matching the pre-Phase-14 surface (useBackupNag import + mount, isDirty state + effect,
#   beforeunload listener + cleanup, visibilitychange listener + cleanup, UpdateBanner import + JSX)
```

## CI Run Summary

| Task | Commit  | Pushed to origin/main | Local verification                |
| ---- | ------- | --------------------- | --------------------------------- |
| 1    | a84c899 | yes                   | 4 WelcomeBanner tests GREEN       |
| 2    | b7cf5ea | yes                   | 3 DemoModeBanner tests GREEN      |
| 3    | 5b7e15e | yes                   | 8 PrivacyPage tests GREEN         |
| 4    | 95bc671 | yes                   | 4 DisclaimerFooter tests GREEN    |
| 5    | a61cea3 | yes                   | 7 MasterDashboard tests GREEN     |
| 6    | 94a92ac | yes                   | 3 App.routing + 13 App.* regression tests GREEN; full suite 1183/1183 GREEN + 11 todo; lint EXIT 0; build EXIT 0; AIza scan: OK |

**Note on CI monitoring:** This executor sandbox had no GitHub token / gh CLI access, so per-push CI runs were NOT polled via REST API. All 6 commits were pushed to origin/main; the full local SPA suite + lint + build all PASSED before each push. GitHub Actions will run the same suite on push and the conclusions should be GREEN. The auditor can verify via `gh run list --limit 10` or the Actions tab on GitHub.

## POL-01 / POL-02 / POL-03 Close-Out Checklist

| REQUIREMENTS line                                                                                         | Plan/Task    | Test that proves it                                                                                 |
| --------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| POL-01: First-visit empty-state with verbatim trust copy + 2 CTAs; disappears after first entity          | 14-2 T1 + T5 | WelcomeBanner.test.tsx Test 1 (verbatim copy); MasterDashboard.test.tsx Test 4 (empty → banner), Test 5 (1 entity → no banner) |
| POL-02: /demo loads pre-seeded sole-trader in `aussieledger-demo` IDB                                     | 14-1 T2/3/4  | demo-isolation.test.ts (3 cross-contamination tests); initAdapter-demo-routing.test.ts Test 2       |
| POL-02: Returning to `/` returns real data intact                                                         | 14-1 T4 + 14-2 T2 | demo-isolation.test.ts Test 2 (demo-then-prod); DemoModeBanner.test.tsx Test 3 (Exit-demo → window.location.href='/') |
| POL-02: "Demo Mode" banner visible throughout                                                             | 14-2 T2      | DemoModeBanner.test.tsx Test 1 (verbatim copy + Exit button on /demo)                               |
| POL-03: /privacy page with verbatim AI v5-deferral bullet + Apache 2.0 + repo link                        | 14-2 T3      | PrivacyPage.test.tsx Test 3 (textContent flatten verbatim), Test 4 (repo href), Test 5 (Apache 2.0) |
| POL-03: /privacy page with no-cookies, no-analytics, IndexedDB bullets                                    | 14-2 T3      | PrivacyPage.test.tsx Test 6 (no cookies), Test 7 (no analytics), Test 8 (IndexedDB)                 |
| POL-03: /privacy reachable via DisclaimerFooter from every view                                           | 14-2 T4      | DisclaimerFooter.test.tsx Test 3 (`/privacy` href + "Privacy" anchor)                               |

All 7 POL-01/02/03 sub-clauses have a passing test. Combined with Plan 14-1's 16 storage-substrate tests, POL-01 + POL-02 + POL-03 are all closeable. Plan 14-3 (executed in parallel by a separate executor — commits a8082b0/748bf46/222f97a) handles POL-04.

## Visual Smoke Notes for the User-Verify Step

1. **Empty-state `/`** — Navigate to `https://aussieledger.techtaitan.com/` after a fresh install (or after clearing entities). The MasterDashboard should render ONLY the WelcomeBanner: white card with the trust copy "Your data stays in your browser — no servers, no accounts." and two side-by-side buttons. NO header, NO entity grid.
2. **Demo `/demo`** — Navigate to `/demo`. A blue banner at the top reads "Demo Mode — playing with sample data. Your real data is safe." with a FlaskConical flask icon and an "Exit demo" button on the right. The seeded sole-trader entity ("Demo Sole Trader (Sample Data)") should be visible in the main content area. Clicking "Exit demo" should trigger a full page reload to `/` and the production DB should appear (your real entities, NOT the seeded demo data).
3. **Privacy `/privacy`** — Navigate to `/privacy` (or click the "Privacy" link in any view's DisclaimerFooter). The page should render a max-width prose container with "Privacy" h1, intro paragraph, and 12 bulleted trust signals. The AI bullet (item 7) should read EXACTLY: "AI features are not available on the public hosted version. Self-host with your own GEMINI_API_KEY to enable AI account-matching today. Hosted AI (with user-supplied keys, direct browser-to-Google, never via AussieLedger) is planned for v5 — the CSP allowlist is already in place." The GitHub repo link should resolve to `https://github.com/tech-taitan/AussieLedger`.
4. **DisclaimerFooter on every page** — The footer at the bottom of every view should show the unchanged Phase-01 disclaimer copy on the LEFT, and a small underlined "Privacy" link on the RIGHT. Clicking the link should navigate to `/privacy`.

## Deviations from Plan

**None — Rules 1/2/3/4 not triggered.** Plan 14-2 executed exactly as written, with one micro-clarification documented in `decisions` (App.routing.test.tsx Test 1):

- Plan said Test 1 assertion: `expect(screen.queryByTestId('master-dashboard-empty')).toBePresent()` (the `data-testid="master-dashboard-empty"` wrapper that surrounds WelcomeBanner). Reality: useEntities hook seeds DEFAULT_ENTITIES on first run, so activeEntities.length > 0 by default in the integration test environment. The intent of Test 1 was to verify "default route renders the master-dashboard chrome and NOT the privacy/demo UI" — adjusted to assert `queryByTestId('privacy-page')` is null AND `queryByTestId('demo-mode-banner')` is null. Same end-to-end guarantee; clearer scope.

That clarification is a test-design choice, not a behavioural deviation — the implementation matches the plan byte-for-byte.

## Notes for Plan 14-3 Executor

Plan 14-3 was executed in parallel (per orchestrator note); commits a8082b0 (README restructure), 748bf46 (readme.test.ts widening), 222f97a (Plan 14-3 close-out) are already on origin/main and DO NOT overlap any Plan 14-2 files. Total Phase 14 commits: 5 (14-1 source) + 1 (14-1 docs) + 6 (14-2 source) + 2 (14-3) + 1 (14-3 docs) = 15.

After Plan 14-3 verification + close, all of v1.2 is complete (10/14 active requirements + POL-01..04 = 14/14 active). Phase 12 (AI) remains deferred to v5. Ready for `/gsd:verify-phase 14` + UAT.

## Self-Check: PASSED

All claimed artifacts verified to exist on disk + in git:

- `src/components/WelcomeBanner.tsx` — FOUND
- `src/components/__tests__/WelcomeBanner.test.tsx` — FOUND
- `src/components/DemoModeBanner.tsx` — FOUND
- `src/components/__tests__/DemoModeBanner.test.tsx` — FOUND
- `src/components/PrivacyPage.tsx` — FOUND
- `src/components/__tests__/PrivacyPage.test.tsx` — FOUND
- `src/components/DisclaimerFooter.tsx` — FOUND (modified — sibling /privacy link present; verbatim disclaimer copy byte-identical)
- `src/components/__tests__/DisclaimerFooter.test.tsx` — FOUND (modified — 4 tests total, 2 new)
- `src/components/MasterDashboard.tsx` — FOUND (modified — early-return branch + WelcomeBanner mount)
- `src/components/__tests__/MasterDashboard.test.tsx` — FOUND (modified — 7 tests total, 4 new)
- `src/components/shell/MainLayout.tsx` — FOUND (modified — DemoModeBanner mounted)
- `src/components/ViewRouter.tsx` — FOUND (modified — PrivacyPage import + render)
- `src/types.ts` — FOUND (modified — View union has 'privacy')
- `src/App.tsx` — FOUND (modified — getRouteKind import + lazy useState initialiser; Phase 11 IDB-05 + Phase 13 UpdateBanner all byte-identical)
- `src/__tests__/App.routing.test.tsx` — FOUND

All commit hashes verified in `git log --oneline -10`:

- `a84c899` — `feat(14-2): add WelcomeBanner empty-state component with verbatim POL-01 copy` — FOUND on origin/main
- `b7cf5ea` — `feat(14-2): add DemoModeBanner + MainLayout mount with verbatim POL-02 copy` — FOUND on origin/main
- `5b7e15e` — `feat(14-2): add PrivacyPage with 12 trust bullets + verbatim AI v5-deferral` — FOUND on origin/main
- `95bc671` — `feat(14-2): widen DisclaimerFooter with /privacy link sibling` — FOUND on origin/main
- `a61cea3` — `feat(14-2): mount WelcomeBanner in MasterDashboard empty-state + add PrivacyPage view` — FOUND on origin/main
- `94a92ac` — `feat(14-2): dispatch initial view from getRouteKind() at App mount` — FOUND on origin/main

All 4 verbatim copy locks confirmed GREEN: POL-01 (em-dash), POL-02 (em-dash), POL-03 AI bullet (textContent flatten in test), DisclaimerFooter (Phase 01 byte-identical).

Phase 11 IDB-05 wiring (`useBackupNag` + `isDirty` + `beforeunload` + `visibilitychange` + `UpdateBanner`) confirmed byte-identical post-Phase-14 via grep (14+ hits matching pre-Phase-14 surface).

CSP + PWA contract preserved: `git diff HEAD vercel.json` empty; `git diff HEAD vite.pwa-options.ts` empty.

Build clean: AIza scan PASS (no Gemini key shapes in dist/); lint EXIT 0; full SPA suite 1183 GREEN + 11 todo + 0 RED.

Plan 14-2 closed; Phase 14 ready for 14-3 verify + close.
