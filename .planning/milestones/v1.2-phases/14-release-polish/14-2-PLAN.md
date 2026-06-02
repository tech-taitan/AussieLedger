---
phase: 14-release-polish
plan: 2
type: execute
wave: 2
depends_on: ["14-1"]
files_modified:
  - src/types.ts                                        # MODIFIED — add 'privacy' to View union
  - src/components/WelcomeBanner.tsx                    # NEW — POL-01 inline empty-state trust banner + 2 CTAs
  - src/components/__tests__/WelcomeBanner.test.tsx     # NEW — 4 render tests
  - src/components/DemoModeBanner.tsx                   # NEW — top-of-app blue-tint banner shown on /demo
  - src/components/__tests__/DemoModeBanner.test.tsx    # NEW — 3 render + exit-demo tests
  - src/components/PrivacyPage.tsx                      # NEW — ~12-bullet trust-signal page
  - src/components/__tests__/PrivacyPage.test.tsx       # NEW — 8 content + structure tests
  - src/components/DisclaimerFooter.tsx                 # MODIFIED — add /privacy link sibling (preserve verbatim disclaimer copy)
  - src/components/__tests__/DisclaimerFooter.test.tsx  # NEW — 2 link-presence tests (file may already exist; verify)
  - src/components/MasterDashboard.tsx                  # MODIFIED — mount <WelcomeBanner> when entities.length === 0
  - src/components/__tests__/MasterDashboard.test.tsx   # MODIFIED — add empty-state mounting tests (file may already exist; verify)
  - src/components/shell/MainLayout.tsx                 # MODIFIED — mount <DemoModeBanner /> in banner row
  - src/components/ViewRouter.tsx                       # MODIFIED — render <PrivacyPage /> when view === 'privacy'
  - src/App.tsx                                         # MODIFIED — initial view from getRouteKind() at mount
autonomous: true
requirements:
  - POL-01
  - POL-02
  - POL-03
must_haves:
  truths:
    - "On a fresh install with zero entities, MasterDashboard renders WelcomeBanner with verbatim POL-01 copy and two CTAs"
    - "Clicking 'Create your first entity' opens the existing EntityForm (sets view to 'edit-entity')"
    - "Clicking 'Try the demo' navigates to /demo via window.location.href"
    - "Once any entity exists, WelcomeBanner is hidden (entity-list rendering is unchanged)"
    - "On /demo, DemoModeBanner renders at the top of the layout with blue tint + Exit-demo button"
    - "Clicking Exit-demo navigates to / via window.location.href (full page reload — adapter re-init picks up production DB)"
    - "On /privacy, the app renders PrivacyPage with ~12 bullets including the verbatim AI v5-deferral bullet"
    - "PrivacyPage is reachable from every view via the DisclaimerFooter /privacy link"
    - "DisclaimerFooter still renders the existing verbatim 'Not tax advice' copy (Phase 01 invariant preserved)"
  artifacts:
    - path: "src/components/WelcomeBanner.tsx"
      provides: "POL-01 inline empty-state trust banner + 2 CTAs"
      exports: ["WelcomeBanner"]
      contains: "Your data stays in your browser"
    - path: "src/components/DemoModeBanner.tsx"
      provides: "Top-of-app demo-mode banner + Exit-demo button"
      exports: ["DemoModeBanner"]
      contains: "Demo Mode"
    - path: "src/components/PrivacyPage.tsx"
      provides: "~12-bullet trust-signal page including verbatim AI v5-deferral bullet"
      exports: ["PrivacyPage"]
      contains: "Hosted AI (with user-supplied keys, direct browser-to-Google, never via AussieLedger) is planned for v5"
    - path: "src/components/DisclaimerFooter.tsx"
      provides: "Existing verbatim disclaimer + new /privacy link"
      contains: "/privacy"
    - path: "src/App.tsx"
      provides: "Initial-view selection from getRouteKind() at mount"
      contains: "getRouteKind"
  key_links:
    - from: "src/App.tsx"
      to: "src/lib/route.ts (Plan 14-1)"
      via: "import { getRouteKind } from './lib/route'; useState<View>(getRouteKind() === 'privacy' ? 'privacy' : 'master-dashboard')"
      pattern: "getRouteKind\\(\\)"
    - from: "src/components/shell/MainLayout.tsx"
      to: "src/components/DemoModeBanner.tsx"
      via: "<DemoModeBanner /> rendered as sibling to <AdapterFallbackBanner />"
      pattern: "<DemoModeBanner"
    - from: "src/components/MasterDashboard.tsx"
      to: "src/components/WelcomeBanner.tsx"
      via: "<WelcomeBanner onCreateEntity={onAddEntity} /> rendered conditionally when activeEntities.length === 0"
      pattern: "<WelcomeBanner"
    - from: "src/components/ViewRouter.tsx"
      to: "src/components/PrivacyPage.tsx"
      via: "{view === 'privacy' && <PrivacyPage />}"
      pattern: "<PrivacyPage"
    - from: "src/components/DisclaimerFooter.tsx"
      to: "/privacy (a link, not a JSX component import)"
      via: "<a href='/privacy'>Privacy</a> sibling to the existing disclaimer span"
      pattern: "href=\"/privacy\""
---

<objective>
Land the UI integration that turns Plan 14-1's foundational routing/storage substrate into a working POL-01 + POL-02 + POL-03 release surface. Adds the empty-state WelcomeBanner (POL-01), the top-of-app DemoModeBanner (POL-02 finish), the /privacy view (POL-03), widens DisclaimerFooter with a /privacy link (sibling element — preserves the Phase-01-locked disclaimer copy verbatim), and wires `getRouteKind()` into App.tsx so /privacy renders the PrivacyPage view directly. After this plan lands, all three of POL-01, POL-02, POL-03 are closeable; only POL-04 (README restructure) remains for Plan 14-3.

Purpose: Plan 14-1 made the data-layer correct in isolation; this plan makes it visible to users. The UI components themselves are tiny (each is a single self-contained .tsx file ~60-120 lines) and follow the established calm-modernist palette + the Phase 11 `role="status"` banner shape (with DemoModeBanner re-tinted blue to distinguish from the neutral-stone AdapterFallbackBanner + UpdateBanner). All locked copy strings (POL-01 trust banner, POL-03 verbatim AI bullet) are pasted in verbatim — the plan-checker will scrutinise these and the executor MUST NOT word-smith.

Output: 14 files (5 new source files, 5 new test files, 4 modified source files). 5 new SPDX-headered .tsx source files → +5 SPDX-headers parametric rows. Expected test delta: ~22-25 new GREEN tests. ~1146 → ~1170 SPA GREEN. Lint EXIT 0, build EXIT 0, AIza scan EXIT 0 all maintained.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/research/PITFALLS.md
@.planning/phases/14-release-polish/14-CONTEXT.md
@.planning/phases/14-release-polish/14-1-PLAN.md

# Existing components this plan extends or wires:
@src/App.tsx
@src/components/DisclaimerFooter.tsx
@src/components/MasterDashboard.tsx
@src/components/shell/MainLayout.tsx
@src/components/ViewRouter.tsx
@src/components/UpdateBanner.tsx
@src/components/AdapterFallbackBanner.tsx
@src/types.ts

# Plan 14-1's lib/route.ts must already exist (depends_on enforces this):
@src/lib/route.ts

<interfaces>
<!-- Key types and contracts this plan consumes (from Plan 14-1) or establishes. -->

From src/lib/route.ts (Plan 14-1 delivered):
```typescript
export type RouteKind = 'demo' | 'privacy' | 'default';
export function getRouteKind(pathname?: string): RouteKind;
```

From src/types.ts (CURRENT — this plan WIDENS the View union):
```typescript
// CURRENT
export type View =
  | 'master-dashboard' | 'dashboard' | 'journals' | 'trial-balance'
  | 'tax-return' | 'company-tax' | 'trust-tax' | 'partnership-tax'
  | 'bas-ias' | 'import' | 'edit-entity' | 'audit-trail'
  | 'coa-manager' | 'data' | 'year-end' | 'settings';
// WIDENED (this plan)
export type View =
  | 'master-dashboard' | 'dashboard' | 'journals' | 'trial-balance'
  | 'tax-return' | 'company-tax' | 'trust-tax' | 'partnership-tax'
  | 'bas-ias' | 'import' | 'edit-entity' | 'audit-trail'
  | 'coa-manager' | 'data' | 'year-end' | 'settings'
  | 'privacy';   // ← NEW
```

From src/components/MasterDashboard.tsx (CURRENT — this plan mounts WelcomeBanner conditionally):
```typescript
// activeEntities = entities.filter((e) => e.status !== 'Archived');
// The dashboard renders a Recent Clients block (only when activeEntities.length > 0),
// a header with "Master Dashboard" + "Add Entity" + "Configure Accounts" buttons, and an entity grid.
// Phase 14: when activeEntities.length === 0, render <WelcomeBanner onCreateEntity={onAddEntity} />
// ABOVE the header (or replacing the entity grid — planner's call). The "Add Entity" button stays where it is;
// WelcomeBanner is the discoverable empty-state primary CTA.
```

From src/components/shell/MainLayout.tsx (CURRENT — this plan mounts DemoModeBanner):
```typescript
// Existing banner row in MainLayout:
//   <Header ... />
//   <AdapterFallbackBanner />     ← Phase 3
//   <div ... >{children}</div>
//   <DisclaimerFooter />          ← Phase 1
// And UpdateBanner is mounted at App.tsx top-level (fixed top-0):
//   <UpdateBanner />              ← Phase 13
// Phase 14 mounts <DemoModeBanner /> as a SIBLING to <AdapterFallbackBanner /> inside MainLayout.
```

NEW interfaces this plan establishes:
```typescript
// src/components/WelcomeBanner.tsx
export interface WelcomeBannerProps {
  onCreateEntity: () => void;
}
export function WelcomeBanner(props: WelcomeBannerProps): JSX.Element;

// src/components/DemoModeBanner.tsx
// No props — reads route from getRouteKind() internally; returns null on non-demo routes.
export function DemoModeBanner(): JSX.Element | null;

// src/components/PrivacyPage.tsx
// No props.
export function PrivacyPage(): JSX.Element;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: WelcomeBanner component + 4 render tests</name>
  <files>
    src/components/WelcomeBanner.tsx (NEW)
    src/components/__tests__/WelcomeBanner.test.tsx (NEW)
  </files>
  <behavior>
    - Test 1: renders the verbatim trust-banner copy `"Your data stays in your browser — no servers, no accounts."`
    - Test 2: renders a primary CTA button with text "Create your first entity"; clicking it invokes the `onCreateEntity` prop callback
    - Test 3: renders a secondary CTA button with text "Try the demo"; clicking it sets `window.location.href` to `'/demo'` (mock via `vi.stubGlobal('location', { href: '' })` and assert post-click)
    - Test 4: structural — the banner uses semantic HTML (`role="region"` or a heading element so screen-readers can locate it; no `<div soup>`)
  </behavior>
  <action>
    1. Create `src/components/WelcomeBanner.tsx` with Apache 2.0 SPDX header.
    2. JSDoc: "POL-01 — first-visit empty-state inline trust banner. Mounted by MasterDashboard when entities.length === 0. Copy is CONTEXT-locked verbatim — do NOT word-smith."
    3. Component:
       ```tsx
       interface WelcomeBannerProps {
         onCreateEntity: () => void;
       }
       export function WelcomeBanner({ onCreateEntity }: WelcomeBannerProps) {
         return (
           <section
             role="region"
             aria-label="Welcome — get started"
             data-testid="welcome-banner"
             className="bg-white border border-[var(--line-strong)] p-8 text-center space-y-6"
           >
             <p className="text-base text-[var(--ink)]" data-testid="welcome-trust-copy">
               Your data stays in your browser — no servers, no accounts.
             </p>
             <div className="flex flex-col sm:flex-row justify-center gap-3">
               <button
                 onClick={onCreateEntity}
                 className="bg-[var(--ink)] text-white px-6 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                 data-testid="welcome-create-entity"
               >
                 Create your first entity
               </button>
               <button
                 onClick={() => { window.location.href = '/demo'; }}
                 className="border border-[var(--line-strong)] bg-white text-[var(--ink)] px-6 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                 data-testid="welcome-try-demo"
               >
                 Try the demo
               </button>
             </div>
           </section>
         );
       }
       ```
    4. NO motion animations (CONTEXT: "No modal, no product tour, no progress-stepper. Canvas-native minimal style matching the existing calm-modernist palette"). NO icons (CONTEXT specifics: "NO progress steppers, NO icons, NO illustrations").
    5. Write `src/components/__tests__/WelcomeBanner.test.tsx` with Apache 2.0 SPDX header. Use `@testing-library/react`. For Test 3, stub `window.location`:
       ```ts
       const original = window.location;
       beforeEach(() => {
         vi.stubGlobal('location', { ...original, href: '' });
       });
       afterEach(() => { vi.unstubAllGlobals(); });
       ```
       Then click the "Try the demo" button and `expect(window.location.href).toBe('/demo')`.
    6. CRITICAL — the trust banner copy MUST be byte-identical to: `Your data stays in your browser — no servers, no accounts.` (note the EM-DASH `—`, NOT a hyphen `-`). The em-dash is what the CONTEXT-locked copy uses; the test asserts on the full string so any swap to a hyphen will fail RED.
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/WelcomeBanner.test.tsx</automated>
  </verify>
  <done>
    - WelcomeBanner.tsx exists with SPDX header
    - 4 tests GREEN
    - Verbatim CONTEXT-locked copy (em-dash, no rewording)
    - No icons, no animations (CONTEXT-locked simplicity)
    - SPDX-headers parametric +1 row
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: DemoModeBanner component + Exit-demo tests + MainLayout mount</name>
  <files>
    src/components/DemoModeBanner.tsx (NEW)
    src/components/__tests__/DemoModeBanner.test.tsx (NEW)
    src/components/shell/MainLayout.tsx (MODIFIED — mount &lt;DemoModeBanner /&gt;)
  </files>
  <behavior>
    - Test 1: with `vi.stubGlobal('location', { pathname: '/demo' })`, DemoModeBanner renders the verbatim copy `"Demo Mode — playing with sample data. Your real data is safe."` and an Exit-demo button
    - Test 2: with pathname='/', DemoModeBanner returns null (renders nothing)
    - Test 3: clicking Exit-demo sets `window.location.href = '/'` (verifiable via the same stubGlobal pattern)
  </behavior>
  <action>
    1. Create `src/components/DemoModeBanner.tsx` with Apache 2.0 SPDX header.
    2. JSDoc: "POL-02 — top-of-app banner shown on /demo. Reads getRouteKind() at render time. Blue tint distinguishes from the neutral-stone AdapterFallbackBanner + UpdateBanner. Exit-demo triggers a full page reload to / which causes initAdapter() to re-init against the production DB."
    3. Imports: `import { getRouteKind } from '../lib/route';` `import { FlaskConical } from 'lucide-react';` (lucide is already in dependencies; FlaskConical signals "demo/experiment")
    4. Component:
       ```tsx
       export function DemoModeBanner() {
         if (getRouteKind() !== 'demo') return null;
         return (
           <div
             role="status"
             data-testid="demo-mode-banner"
             className="flex items-center justify-between gap-3 bg-blue-50 border-b border-blue-300 text-blue-900 px-4 py-2 text-sm"
           >
             <div className="flex items-center gap-2">
               <FlaskConical size={16} className="flex-shrink-0" />
               <span data-testid="demo-mode-copy">
                 Demo Mode — playing with sample data. Your real data is safe.
               </span>
             </div>
             <button
               onClick={() => { window.location.href = '/'; }}
               className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
               data-testid="demo-mode-exit"
             >
               Exit demo
             </button>
           </div>
         );
       }
       ```
    5. The em-dash in the banner copy is verbatim from CONTEXT (`"Demo Mode — playing with sample data. Your real data is safe."`). Test asserts byte-identical match.
    6. Open `src/components/shell/MainLayout.tsx`. Add `import { DemoModeBanner } from '../DemoModeBanner';` to the imports. Mount `<DemoModeBanner />` as the FIRST child inside the main column (line ~77, BEFORE `<AdapterFallbackBanner />`). The two banners stack: DemoModeBanner on top (blue, route-gated), AdapterFallbackBanner below (neutral, mode-gated). On non-/demo routes DemoModeBanner returns null, so the layout collapses to exactly its pre-Phase-14 shape — no DOM cost.
    7. Write `src/components/__tests__/DemoModeBanner.test.tsx`. Tests 1-3 above. Test 1: stub pathname='/demo' first, then render `<DemoModeBanner />`, then assert testid present + copy match. Test 2: stub pathname='/' (or use jsdom default which is '/'), render, assert `screen.queryByTestId('demo-mode-banner')` is null. Test 3: stub pathname='/demo' + stub location.href='', click `[data-testid="demo-mode-exit"]`, assert `window.location.href === '/'`.
    8. CRITICAL — banner copy verbatim per CONTEXT: `Demo Mode — playing with sample data. Your real data is safe.` Em-dash, not hyphen.
    9. Exit-demo uses `window.location.href = '/'` (NOT `window.location.assign('/')`, NOT `history.pushState(...)`). The full-page reload is CONTEXT-locked ("Exit demo via full page reload" — clean reload boundary; adapter re-initialises against prod DB).
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/DemoModeBanner.test.tsx</automated>
  </verify>
  <done>
    - DemoModeBanner.tsx exists with SPDX header
    - 3 tests GREEN
    - Verbatim CONTEXT-locked copy
    - MainLayout mounts &lt;DemoModeBanner /&gt; as a sibling to &lt;AdapterFallbackBanner /&gt;
    - On non-/demo routes the banner returns null (zero DOM cost — regression check: existing layout tests still pass)
    - SPDX-headers parametric +1 row
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: PrivacyPage component with all ~12 bullets + verbatim AI bullet + 8 tests</name>
  <files>
    src/components/PrivacyPage.tsx (NEW)
    src/components/__tests__/PrivacyPage.test.tsx (NEW)
  </files>
  <behavior>
    - Test 1: renders with a `role="main"` content wrapper and an `<h1>` heading "Privacy"
    - Test 2: renders a `<ul>` with at least 12 `<li>` children (the trust-signal bullets)
    - Test 3: contains the VERBATIM AI v5-deferral bullet text (this is the hard assertion; planner-checker will scrutinise byte-by-byte)
    - Test 4: contains a link to the GitHub repo at `https://github.com/tech-taitan/AussieLedger`
    - Test 5: contains the phrase "Apache 2.0" (license disclosure bullet)
    - Test 6: mentions "no cookies" (cookies bullet)
    - Test 7: mentions "no analytics" (analytics bullet)
    - Test 8: mentions "IndexedDB" (server-side storage bullet)
  </behavior>
  <action>
    1. Create `src/components/PrivacyPage.tsx` with Apache 2.0 SPDX header.
    2. JSDoc: "POL-03 — /privacy page with friendly bullet-list trust signals (~12 bullets). The AI bullet is CONTEXT-locked verbatim per the Phase 12 v5-deferral decision. Other bullets are planner-picked wording matching the calm-modernist tone."
    3. Component structure:
       ```tsx
       export function PrivacyPage() {
         return (
           <main
             role="main"
             aria-labelledby="privacy-heading"
             data-testid="privacy-page"
             className="max-w-2xl mx-auto py-8 px-4 space-y-6"
           >
             <h1 id="privacy-heading" className="text-3xl font-bold">Privacy</h1>
             <p className="text-sm text-gray-600">
               AussieLedger is built so your data never leaves your browser.
               This page is the receipts — every claim below is verifiable in DevTools.
             </p>
             <ul className="space-y-3 text-sm leading-relaxed" data-testid="privacy-bullets">
               <li>No third-party scripts are loaded. The browser&apos;s Content Security Policy is set to <code>script-src &apos;self&apos;</code> — verifiable in DevTools → Network.</li>
               <li>No cookies are set. Verifiable in DevTools → Application → Cookies (the list is empty).</li>
               <li>No analytics. No Google Analytics, no Plausible, no PostHog, nothing.</li>
               <li>No server-side storage of your data. The LocalAdapter writes only to your browser&apos;s IndexedDB.</li>
               <li>No telemetry of any kind — not even opt-in.</li>
               <li>
                 Open source under Apache 2.0 — full source at{' '}
                 <a href="https://github.com/tech-taitan/AussieLedger" className="text-blue-600 underline hover:text-blue-800" data-testid="privacy-repo-link">
                   github.com/tech-taitan/AussieLedger
                 </a>
                 .
               </li>
               <li data-testid="privacy-ai-bullet">
                 AI features are not available on the public hosted version. Self-host with your own <code>GEMINI_API_KEY</code> to enable AI account-matching today. Hosted AI (with user-supplied keys, direct browser-to-Google, never via AussieLedger) is planned for v5 — the CSP allowlist is already in place.
               </li>
               <li>Custom domain and TLS provided by Vercel; static assets served from Vercel&apos;s CDN. There is no AussieLedger server in the data path.</li>
               <li>Print working papers use <code>window.print()</code> directly — no PDF library and no server-side rendering.</li>
               <li>Data export is a JSON file download via <code>&lt;a download&gt;</code> — your data is never POSTed anywhere.</li>
               <li>All security headers and the full CSP are visible in your browser&apos;s DevTools → Network tab. This page is the receipts.</li>
               <li>
                 Contact, contribute, or report a security issue via{' '}
                 <a href="https://github.com/tech-taitan/AussieLedger/issues" className="text-blue-600 underline hover:text-blue-800">
                   GitHub Issues
                 </a>.
               </li>
             </ul>
           </main>
         );
       }
       ```
    4. CRITICAL — the AI bullet is VERBATIM per CONTEXT (locked given Phase 12 v5 deferral). The exact string is:
       `AI features are not available on the public hosted version. Self-host with your own GEMINI_API_KEY to enable AI account-matching today. Hosted AI (with user-supplied keys, direct browser-to-Google, never via AussieLedger) is planned for v5 — the CSP allowlist is already in place.`
       The `<code>GEMINI_API_KEY</code>` wrapping breaks this string into a JSX expression — the test must assert that the FLATTENED textContent (no `<code>` tags) matches the verbatim string. Use `screen.getByTestId('privacy-ai-bullet').textContent` to compare (textContent strips tags). The em-dash `—` is verbatim.
    5. Write `src/components/__tests__/PrivacyPage.test.tsx`. Tests 1-8 above. Test 3 must compare `textContent` to the verbatim string above (em-dash + GEMINI_API_KEY + parenthetical clause + "planned for v5" — every word verbatim).
    6. Visual design: max-width prose container (~640px ≈ `max-w-2xl`), `<main role="main">` for accessibility, semantic `<h1>` + `<ul>` + `<li>`. NO sidebar, NO nav-bar — it's a viewer route, not an app-shell route. The component renders inside the existing MainLayout `<div className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</div>` slot, so the Sidebar and Header are still around it (that's fine — the user can navigate back via the sidebar; deep-linking to /privacy from elsewhere is the primary path).
    7. NOTE on the bullet list: CONTEXT spec says "~12 bullets" — the list above has 12, balancing the locked AI bullet + repo link + Apache 2.0 + the standard trust signals (scripts/cookies/analytics/storage/telemetry/CSP/domain/print/export) + contact. Don't trim below 12; don't pad above 13.
    8. Non-AI bullet wording is "Claude's Discretion" per CONTEXT — the wording above is the executor's draft; the plan-checker will sanity-check that it matches the calm-modernist tone (single-claim sentences, verifiable, no legalese).
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/PrivacyPage.test.tsx</automated>
  </verify>
  <done>
    - PrivacyPage.tsx exists with SPDX header
    - 8 tests GREEN, including the VERBATIM AI v5-deferral bullet textContent match
    - role="main" + h1 + ul/li semantic structure
    - Repo link present at github.com/tech-taitan/AussieLedger
    - Exactly 12 bullets (no more, no fewer)
    - SPDX-headers parametric +1 row
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: DisclaimerFooter widening — add /privacy link sibling (preserve verbatim disclaimer copy)</name>
  <files>
    src/components/DisclaimerFooter.tsx (MODIFIED — add /privacy link as a sibling element)
    src/components/__tests__/DisclaimerFooter.test.tsx (NEW — 2 tests; verify file doesn't already exist before creating)
  </files>
  <behavior>
    - Test 1: existing verbatim disclaimer copy is still present byte-identically (`This output is a draft working paper, not tax advice. Verify all figures against your source records before lodging. AussieLedger is not a tax agent and does not lodge returns with the ATO.`)
    - Test 2: a link to `/privacy` exists in the footer with anchor text "Privacy" (or similar — the href is the contract, the visible text is the user-facing affordance)
  </behavior>
  <action>
    1. Before creating the test file, run `ls src/components/__tests__/DisclaimerFooter.test.tsx` — if it already exists, MODIFY it instead of creating; if it doesn't, create new.
    2. Open `src/components/DisclaimerFooter.tsx`.
    3. PRESERVE the existing disclaimer `<span>` byte-identically. The Phase 01 CONTEXT-locked copy MUST NOT be paraphrased, abbreviated, or substituted. The structural-lint that protects this is in `src/__tests__/contributing.test.ts` or similar — verify the test still passes after the change.
    4. Add a sibling `<a>` element AFTER the existing disclaimer span. Layout: flex container puts disclaimer on the left, privacy link on the right (justify-between). The current footer has `flex items-start gap-2`; widen this with `justify-between` and wrap the existing Info-icon + span in a div, then add the privacy link as a second flex child.
       ```tsx
       <footer
         className={cn(
           'border-t border-[var(--line)] bg-gray-50/80 px-4 py-2',
           'flex items-start justify-between gap-4 text-[11px] text-gray-500 leading-snug',
           className,
         )}
         role="contentinfo"
         aria-label="Compliance disclaimer"
       >
         <div className="flex items-start gap-2 flex-1">
           <Info size={13} className="mt-0.5 flex-shrink-0 text-gray-400" />
           <span>
             This output is a draft working paper, not tax advice. Verify all figures against your
             source records before lodging. AussieLedger is not a tax agent and does not lodge returns
             with the ATO.
           </span>
         </div>
         <a
           href="/privacy"
           className="text-gray-500 underline hover:text-gray-700 flex-shrink-0 mt-0.5"
           data-testid="disclaimer-privacy-link"
         >
           Privacy
         </a>
       </footer>
       ```
    5. The disclaimer text inside the `<span>` is UNCHANGED — verify by reading the file before/after; the inner string between `<span>` and `</span>` must be byte-identical (modulo whitespace/JSX-newlines which are whitespace-collapsed by React anyway).
    6. Write `src/components/__tests__/DisclaimerFooter.test.tsx` (or modify existing). Tests:
       - Test 1: render `<DisclaimerFooter />`, then `expect(screen.getByRole('contentinfo').textContent).toContain('This output is a draft working paper, not tax advice. Verify all figures against your source records before lodging. AussieLedger is not a tax agent and does not lodge returns with the ATO.')` — the contains-check is robust to layout reflows (the textContent flattens nested divs/spans).
       - Test 2: `expect(screen.getByTestId('disclaimer-privacy-link').getAttribute('href')).toBe('/privacy')` AND `expect(screen.getByTestId('disclaimer-privacy-link').textContent).toBe('Privacy')`.
    7. Check that the existing layout-tests (if any reference DisclaimerFooter — search via grep) still pass. The flex-justify-between change is a layout-shift but shouldn't break any visual-snapshot test.
    8. The /privacy link is a native `<a href>` — clicking it triggers a full page navigation (same-origin), which calls initAdapter() afresh, which sees pathname='/privacy' via getRouteKind() → keeps prod DB (per Plan 14-1 Task 4) → App.tsx (this plan's Task 6) sets initial view to 'privacy' → ViewRouter renders PrivacyPage. Full-reload navigation is consistent with the DemoModeBanner's Exit-demo behaviour (CONTEXT-locked pattern: full reload boundaries).
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/DisclaimerFooter.test.tsx</automated>
  </verify>
  <done>
    - DisclaimerFooter.tsx widened with /privacy link sibling
    - Existing verbatim disclaimer copy byte-identical (regression-guarded by Test 1)
    - 2 tests GREEN
    - Phase 01 invariant preserved
    - No new SPDX header rows (the file already has one)
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 5: types.ts View widening + ViewRouter PrivacyPage rendering + MasterDashboard WelcomeBanner mounting</name>
  <files>
    src/types.ts (MODIFIED — add 'privacy' to View union)
    src/components/ViewRouter.tsx (MODIFIED — render PrivacyPage when view === 'privacy')
    src/components/MasterDashboard.tsx (MODIFIED — mount WelcomeBanner when activeEntities.length === 0)
    src/components/__tests__/MasterDashboard.test.tsx (NEW — 4 tests; verify file doesn't already exist before creating)
  </files>
  <behavior>
    - Test 1 (MasterDashboard): with `entities={[]}`, renders WelcomeBanner (testid 'welcome-banner') AND does NOT render the Master Dashboard entity-grid header
    - Test 2 (MasterDashboard): with `entities=[oneActiveEntity]`, does NOT render WelcomeBanner and DOES render the existing header + Add Entity button
    - Test 3 (MasterDashboard): clicking the WelcomeBanner primary CTA invokes the `onAddEntity` callback (delegated through the existing prop)
    - Test 4 (MasterDashboard): with `entities=[archivedEntityOnly]` (one entity, all archived → activeEntities is empty), renders WelcomeBanner (treats deleted-everything as the same empty-state moment per CONTEXT)
  </behavior>
  <action>
    1. Open `src/types.ts`. In the `View` union (line 9), add `| 'privacy'` as the last variant. Verify nothing else uses an exhaustive switch on View that would now miss the new variant — search via `grep -rn "view === 'master-dashboard'" src/` to enumerate switch sites; each one defaults to "nothing renders" for an unknown view, which is acceptable for the privacy case (only ViewRouter explicitly handles it).
    2. Open `src/components/ViewRouter.tsx`. Add `import { PrivacyPage } from './PrivacyPage';` to the imports (around line 31 alongside the other Privacy-adjacent components).
    3. Add `{view === 'privacy' && <PrivacyPage />}` as a NEW sibling line inside the same conditional-render block where the existing view===... lines live (after `{view === 'settings' && ...}`, near the end of the JSX return). The PrivacyPage renders inside the existing MainLayout's children slot — keeps the Sidebar + Header + DisclaimerFooter chrome around it.
    4. Open `src/components/MasterDashboard.tsx`. Add `import { WelcomeBanner } from './WelcomeBanner';` to the imports.
    5. After the `const activeEntities = entities.filter((e) => e.status !== 'Archived');` line (~line 80), add a branch:
       ```tsx
       if (activeEntities.length === 0) {
         return (
           <div className="space-y-6" data-testid="master-dashboard-empty">
             <WelcomeBanner onCreateEntity={onAddEntity} />
           </div>
         );
       }
       ```
       This branch renders BEFORE the existing return statement. When zero active entities, the entire dashboard UI is replaced with just the WelcomeBanner — no Recent Clients section (it would be empty), no Master Dashboard header + Add Entity button (the WelcomeBanner primary CTA is the discoverable affordance), no empty entity grid. CONTEXT decision: "Render location: inline within the existing MasterDashboard empty-state, NOT as a top-of-app banner. The POL-01 trust banner + 2 CTAs sit above (or replace) the existing 'no entities yet' affordance."
    6. The existing return statement is preserved for the activeEntities.length > 0 path. No other changes to MasterDashboard.
    7. Write `src/components/__tests__/MasterDashboard.test.tsx` (or modify existing — check first). Tests 1-4 above. Mock the props: pass `entities={[]}` / `entities=[oneActive]` / `entities=[oneArchived]`. The `onAddEntity` is the prop callback wired through to App.tsx in the existing implementation; in the test, pass a `vi.fn()` and assert it's called on click.
    8. For Test 4 (archived-only treated as empty): create an entity with `status: 'Archived'`; pass it in. The activeEntities filter strips it; activeEntities.length === 0 → WelcomeBanner renders. This locks the CONTEXT decision "Treats fresh install and 'deleted everything' as the same empty-state moment".
    9. Run a regression check against any existing MasterDashboard tests — if pre-Phase-14 tests assume entities.length===0 renders the Master Dashboard header, those tests now expect WelcomeBanner instead (they need updating). Grep `src/components/__tests__/MasterDashboard.test.tsx` (if exists) and update assertions accordingly.
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/MasterDashboard.test.tsx src/components/__tests__/PrivacyPage.test.tsx</automated>
  </verify>
  <done>
    - View union widened with 'privacy'
    - ViewRouter renders PrivacyPage when view === 'privacy'
    - MasterDashboard mounts WelcomeBanner conditionally when activeEntities.length === 0
    - 4 MasterDashboard tests GREEN
    - No regression in existing MasterDashboard tests (any pre-existing empty-state assertions updated to expect WelcomeBanner)
    - Archived-only entities also trigger the empty-state (CONTEXT-locked behaviour)
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 6: App.tsx pathname-dispatched initial view + integration regression check</name>
  <files>
    src/App.tsx (MODIFIED — getRouteKind() at mount sets initial view to 'privacy' when on /privacy)
    src/__tests__/App.routing.test.tsx (NEW — 3 integration tests)
  </files>
  <behavior>
    - Test 1: with `vi.stubGlobal('location', { pathname: '/' })`, App mounts with initial view 'master-dashboard' (current default)
    - Test 2: with `vi.stubGlobal('location', { pathname: '/privacy' })`, App mounts with initial view 'privacy' (PrivacyPage renders inside MainLayout)
    - Test 3: with `vi.stubGlobal('location', { pathname: '/demo' })`, App mounts with initial view 'master-dashboard' (demo doesn't change the view — it changes the underlying adapter DB via Plan 14-1, while the view stays at the default; DemoModeBanner renders at the top via Task 2)
  </behavior>
  <action>
    1. Open `src/App.tsx`. Add `import { getRouteKind } from './lib/route';` to the imports (around line 12 alongside the other lib imports).
    2. Modify the view state initialiser. CURRENT (line 21):
       ```tsx
       const [view, setView] = useState<View>('master-dashboard');
       ```
       NEW:
       ```tsx
       const [view, setView] = useState<View>(() =>
         getRouteKind() === 'privacy' ? 'privacy' : 'master-dashboard'
       );
       ```
       The lazy initialiser (`useState(() => ...)`) is called once on mount — getRouteKind() reads window.location.pathname at that moment, no useEffect needed. The /demo case maps to 'master-dashboard' because demo mode keeps the user inside the existing master-dashboard UX shell (with seeded fixtures from Plan 14-1 + DemoModeBanner at the top).
    3. NOTE: this is the ONLY change to App.tsx. The Phase 11 useBackupNag wiring, the Phase 11 isDirty derivation + beforeunload+visibilitychange listeners, the Phase 13 UpdateBanner mount — ALL byte-identical post-Phase-14. Regression-grep `src/App.tsx` for `useBackupNag` + `beforeunload` + `UpdateBanner` after the change — each must still be present.
    4. Write `src/__tests__/App.routing.test.tsx` with Apache 2.0 SPDX header. Tests 1-3 above. Pattern:
       ```ts
       import { render, screen } from '@testing-library/react';
       import App from '../App';
       import { _resetAdapter } from '../storage';

       beforeEach(() => {
         vi.stubGlobal('location', { ...window.location, pathname: '/' });
         _resetAdapter();
         localStorage.setItem('storageMode', 'local');  // force LocalAdapter; avoids probe
       });
       afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
       ```
       Test 1: pathname='/'; render App; assert `screen.queryByTestId('privacy-page')` is null AND `screen.queryByTestId('master-dashboard-empty')` is present (assuming no entities seeded → empty state path → WelcomeBanner shows).
       Test 2: pathname='/privacy'; render App; assert `screen.getByTestId('privacy-page')` is present.
       Test 3: pathname='/demo'; render App; assert `screen.queryByTestId('demo-mode-banner')` is present (the banner mounts on /demo) AND `screen.queryByTestId('privacy-page')` is null.
    5. The integration test exercises the full chain: Plan 14-1's getRouteKind() + Plan 14-1's initAdapter() DB selection + this plan's App.tsx view dispatch + this plan's component mounts. If any link in the chain is broken, the integration test catches it.
    6. NOTE: App.tsx integration tests already exist (App.test.tsx, App.beforeunload.test.tsx). Run them after the App.tsx change to verify zero regression. The useState init shape change is structurally compatible (same type signature, same default value when pathname='/'); existing tests under default jsdom (pathname='/') should be unaffected.
  </action>
  <verify>
    <automated>npx vitest run src/__tests__/App.routing.test.tsx src/__tests__/App.test.tsx src/__tests__/App.beforeunload.test.tsx</automated>
  </verify>
  <done>
    - App.tsx initial view dispatches off getRouteKind() at mount
    - 3 routing integration tests GREEN
    - Existing App.test.tsx + App.beforeunload.test.tsx still GREEN (byte-identical except for the useState initialiser)
    - The full chain (Plan 14-1 storage substrate + Plan 14-2 UI) wires up correctly:
      - pathname='/' → prod DB + master-dashboard view + WelcomeBanner (empty state) or normal entity grid
      - pathname='/demo' → demo DB + seeded fixtures + DemoModeBanner at top + master-dashboard view shows the seeded entity
      - pathname='/privacy' → prod DB + privacy view + PrivacyPage rendered inside MainLayout
  </done>
</task>

</tasks>

<verification>
After all 6 tasks land, run the full plan-level verification:

```
npx vitest run                              # ALL SPA tests GREEN (target: ~1170 GREEN)
npm run lint                                # EXIT 0
npm run build                               # EXIT 0 incl. AIza scan
```

Plus targeted greps for invariant preservation:

```
# Verbatim copy locks (each MUST match exactly)
grep -F "Your data stays in your browser — no servers, no accounts." src/components/WelcomeBanner.tsx
grep -F "Demo Mode — playing with sample data. Your real data is safe." src/components/DemoModeBanner.tsx
grep -F "Hosted AI (with user-supplied keys, direct browser-to-Google, never via AussieLedger) is planned for v5" src/components/PrivacyPage.tsx
grep -F "This output is a draft working paper, not tax advice." src/components/DisclaimerFooter.tsx

# Wiring greps
grep -n "getRouteKind" src/App.tsx                       # exactly 1 hit (the import was at top of file; useState initializer is the only consumer)
grep -n "DemoModeBanner" src/components/shell/MainLayout.tsx  # exactly 1 mount site
grep -n "WelcomeBanner" src/components/MasterDashboard.tsx    # exactly 1 mount site
grep -n "PrivacyPage" src/components/ViewRouter.tsx           # exactly 1 import + 1 render

# Phase 11 + Phase 13 regression
grep -n "useBackupNag\|beforeunload\|UpdateBanner" src/App.tsx
# (output should show: useBackupNag import, useBackupNag mount, isDirty derivation,
#  conditional beforeunload+visibilitychange registration, UpdateBanner JSX — ALL byte-identical to post-13-2)

# CSP / vercel.json unchanged
git diff vercel.json   # should be empty
git diff vite.pwa-options.ts   # should be empty
```
</verification>

<success_criteria>
Plan 14-2 is complete when:
- ALL 6 tasks have GREEN verification commands
- WelcomeBanner renders with verbatim trust copy + two CTAs; primary opens EntityForm via existing onAddEntity callback; secondary navigates to /demo
- DemoModeBanner renders on /demo only; Exit-demo reloads to /
- PrivacyPage renders ~12 bullets including byte-identical AI v5-deferral text
- DisclaimerFooter widened with /privacy link sibling; verbatim disclaimer copy preserved
- App.tsx initial-view selection driven by getRouteKind() at mount
- All POL-01, POL-02, POL-03 success criteria from CONTEXT and REQUIREMENTS map to a passing test
- Phase 11 IDB hardening invariants preserved (useBackupNag + isDirty + beforeunload + visibilitychange all byte-identical)
- Phase 13 PWA install path + UpdateBanner update flow unchanged (no PWA config changes)
- vercel.json CSP unchanged
- Full SPA test suite GREEN
- Lint EXIT 0
- Build EXIT 0 incl. AIza scan (PrivacyPage text + WelcomeBanner copy + DemoModeBanner copy contain no AIza-shaped strings — verified by build)
- Plan 14-3 can ship the README restructure (POL-04) with the live URL paths already correct
</success_criteria>

<output>
After completion, create `.planning/phases/14-release-polish/14-2-SUMMARY.md` documenting:
- 6 commits (one per Task; smaller commits OK if natural — e.g. Task 5 could be 2 commits: View widening + render integration, then MasterDashboard mount + tests)
- Final test count delta
- POL-01, POL-02, POL-03 close-out checklist mapping each REQUIREMENTS line to the test that proves it
- Visual smoke notes for the user-verify step: navigate to / (empty state shows WelcomeBanner), navigate to /demo (DemoModeBanner + seeded sole-trader entity), navigate to /privacy (PrivacyPage with all bullets), click footer Privacy link from any page (lands on /privacy)
- Notes for Plan 14-3 executor: live demo at https://aussieledger.techtaitan.com/demo (after Vercel auto-deploy) is the URL the README "Try the demo" CTA points to.

Commit message format:

```
feat(14-2): add WelcomeBanner empty-state component with verbatim POL-01 copy
feat(14-2): add DemoModeBanner + MainLayout mount with verbatim POL-02 copy
feat(14-2): add PrivacyPage with 12 trust bullets + verbatim AI v5-deferral
feat(14-2): widen DisclaimerFooter with /privacy link sibling
feat(14-2): mount WelcomeBanner in MasterDashboard empty-state + add PrivacyPage view
feat(14-2): dispatch initial view from getRouteKind() at App mount

Co-Authored-By: Claude <noreply@anthropic.com>
```
</output>
