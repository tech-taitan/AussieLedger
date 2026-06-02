---
phase: 14
slug: release-polish
type: context
status: ready-for-planning
created: 2026-06-02
discussed_areas: [routing, demo-isolation, first-visit-empty-state, privacy-and-readme]
---

# Phase 14: Release Polish — Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

**Note on phase scope:** HOST-04 (custom domain) was originally Phase 14 scope but closed early during Phase 10's Cloudflare→Vercel pivot when the user already had `aussieledger.techtaitan.com` configured. Phase 14 effective scope: POL-01..04 (4 requirements). Phase 12 (AI) was deferred to v5 on 2026-06-01 — the privacy page must reflect that honestly.

<domain>
## Phase Boundary

Phase 14 closes the v1.2 release by turning `https://aussieledger.techtaitan.com` from a "deployed SPA" into an inviting onboarding surface for first-time visitors. Adds a first-visit empty-state with trust banner + two CTAs, a `/demo` route that runs against an isolated IndexedDB namespace, a `/privacy` page that itemises the trust signals, and a targeted README restructure with a top-of-fold live-demo CTA. After Phase 14 ships, v1.2 is releaseable — 10/14 active requirements complete (HOST-01..04 + IDB-01..05 + PWA-01 + POL-01..04); AI-01/02 remain deferred to v5.

**In scope (4 requirements: POL-01..04):**

- **POL-01 — First-visit empty-state in MasterDashboard** — inline trust banner above the existing empty-state with verbatim copy: *"Your data stays in your browser — no servers, no accounts."* + two CTAs: **"Create your first entity"** (primary; opens EntityForm) and **"Try the demo"** (secondary; navigates to `/demo` via `window.location.href`). Triggered when `adapter.getEntities().length === 0` at mount — treats fresh install and "deleted everything" as the same empty-state moment. Banner disappears the moment any entity exists. NO localStorage flag — the empty-state IS the trigger. No modal, no product tour, no progress-stepper. Canvas-native minimal style matching the existing calm-modernist palette.

- **POL-02 — `/demo` route with isolated `'aussieledger-demo'` IndexedDB database** —
  - **`LocalAdapter` constructor widened**: `new LocalAdapter(dbName?: string)` defaulting to `'aussieledger'`. Exported constants `DB_NAME_PROD = 'aussieledger'` and `DB_NAME_DEMO = 'aussieledger-demo'` for reuse + visibility.
  - **Routing**: DIY pathname-based dispatch in `src/storage/index.ts` `initAdapter()` — reads `window.location.pathname` once on mount; `/demo` → `new LocalAdapter(DB_NAME_DEMO)`; else default. No `react-router-dom` dependency. SPA fallback (Phase 10 `vercel.json` rewrites) makes deep links work.
  - **Pre-seeded demo data**: 1 sole-trader entity + standard small-biz Chart of Accounts + ~15 sample journal entries across one FY (FY2025-26). Hard-coded in new `src/storage/demo-seed.ts`; loaded on first demo-adapter init via a one-time check (`if (adapter.getEntities().length === 0) seedDemoData()`).
  - **`<DemoModeBanner />`** mounted at top of MainLayout when on `/demo` path. Copy: *"Demo Mode — playing with sample data. Your real data is safe."* + **"Exit demo"** button → `window.location.href = '/'`. Visual: blue tint to distinguish from neutral stone of AdapterFallbackBanner.
  - **Exit demo**: full page reload via `window.location.href = '/'`. Adapter singleton re-initialises with production DB on the new page load. User's real data is untouched (separate `'aussieledger'` DB; demo never wrote to it). One reload boundary is the deliberate clean separation.
  - **HARD-BLOCK enforcement**: PITFALLS #4 demo data leak. Unit test asserts `LocalAdapter` constructor with no args uses `DB_NAME_PROD`; with `DB_NAME_DEMO` uses the demo DB; cross-contamination impossible because IDB DB names are origin-scoped strings. Additional test: spinning up both adapters in the same browser session, writing to demo, checking production DB unchanged.

- **POL-03 — `/privacy` page** with friendly trust-signal bullet list (~12 bullets, one screen, no scroll):
  - **Tone**: plain English; one trust claim per bullet; verifiable specificity over legal-doc length.
  - **Verbatim AI bullet** (locked given Phase 12 deferral): *"AI features are not available on the public hosted version. Self-host with your own `GEMINI_API_KEY` to enable AI account-matching today. Hosted AI (with user-supplied keys, direct browser-to-Google, never via AussieLedger) is planned for v5 — the CSP allowlist is already in place."*
  - **Other bullets** (planner picks final wording; CONTEXT locks scope):
    - No third-party scripts loaded (CSP `script-src 'self'` enforced; verifiable via DevTools Network tab)
    - No cookies set (verifiable via DevTools Application → Cookies)
    - No analytics (no Google Analytics, no Plausible, no PostHog, nothing)
    - No server-side storage of your data (LocalAdapter writes only to YOUR browser's IndexedDB)
    - No telemetry of any kind (even opt-in)
    - Open source under Apache 2.0 — full source at https://github.com/tech-taitan/AussieLedger
    - Live AI footnote (above)
    - Custom domain + TLS via Vercel; static assets served from Vercel's CDN; no AussieLedger server
    - Print working papers via `window.print()` — no PDF library, no server-side rendering
    - Data export: JSON download via `<a download>` — never POSTed anywhere
    - All security headers + CSP visible in browser DevTools Network tab → /privacy is the receipts
    - Contact / contribute / report a security issue: GitHub Issues link
  - **Mount**: via DIY pathname dispatch — `/privacy` → `<PrivacyPage />` view; otherwise unchanged.
  - **Footer link**: `DisclaimerFooter` widened to include a `/privacy` link alongside the existing "Not tax advice" disclaimer. Visible on every view.

- **POL-04 — README targeted restructure (~120 lines final, from current 82)**:
  - **New top-of-fold**: `# AussieLedger` + 1-line elevator pitch (*"Free Australian bookkeeping → tax return tool. Your data stays in your browser."*) + **"Try the live demo at https://aussieledger.techtaitan.com"** + screenshot placeholder note *"[Screenshot coming v1.3]"* (NO image file; honest about not-yet-captured).
  - **Quick Start reordered to two clear options**:
    - **Option 1: Try the demo** → click link
    - **Option 2: Clone and self-host** → `git clone` + `npm install` + `npm run build` + the existing `npm run dev` and `npm run dev:full` paths
  - **Preserve existing sections** with light touch-ups: Deployment Shapes (`npm run dev` vs `npm run dev:full` vs `npm run build && serve dist/`), How It Works, Optional AI (annotated with v5 deferral note), Contributing, License
  - **Privacy footer link** at the bottom referencing `/privacy` on the live deploy
  - **CONTRIBUTING.md link** preserved (already exists)
  - **Out of scope** for POL-04: real screenshot capture (deferred to v1.3); persona-segmented sections (business owners / tax agents / developers) — deferred to v1.3
  - **NOT a full rewrite** — targeted restructure that satisfies the "rewrite" intent in REQUIREMENTS while keeping the proven existing content.

**Out of scope (deferred to v1.3+):**
- **Real README screenshot** — manual capture step deferred; v1.2 ships text-only top-of-fold with v1.3 placeholder
- **Persona-segmented README sections** (For business owners / For tax agents / For developers) — deferred to v1.3
- **`react-router-dom`** — DIY pathname dispatch is sufficient for two static routes; revisit if more routes accrue in v1.3+
- **Hot-swap LocalAdapter instances** (no-reload demo exit) — full page reload to `/` is the locked exit path; cleaner separation than swapping singletons
- **Multi-entity demo seed** (3 entities, multi-FY) — single sole-trader is sufficient for v1.2; richer demo can come later
- **Settings page link to demo/privacy** — `/demo` discovered via empty-state CTA, `/privacy` via footer link; no additional Settings entry
- **First-visit-once-only flag** (`aussieledger:has-seen-welcome`) — empty-state-based trigger is the locked behaviour; covers the "deleted everything" returning user too
- **Top-of-app POL-01 banner** (instead of MasterDashboard-scoped) — empty-state-only is the locked placement
- **`/welcome` route** — no new third route; existing master-dashboard handles the empty-state moment
- **Cookie banners** — explicit non-goal (no cookies = no banner required)
- **Formal legal-doc privacy policy** — friendly bullet list is the locked tone
- **AI bullet pretending AI is on hosted today** — honest v5-deferral wording is locked
- **`/demo/sole-trader` extensible path** — single `/demo` URL locked; YAGNI for the future-expansion variant

</domain>

<decisions>
## Implementation Decisions

### Routing approach (4 sub-decisions)

- **DIY pathname-based dispatch** — read `window.location.pathname` once on mount in `src/storage/index.ts` `initAdapter()` (for adapter selection) AND in `src/App.tsx` (for view selection). Zero new dependencies. ~30 lines total. The Phase 10 SPA fallback (`vercel.json` `rewrites: /(.*) → /index.html`) makes `/demo` and `/privacy` resolvable as deep links.
- **Internal navigation only via specific entry points** — `/demo` is reachable through the POL-01 empty-state secondary CTA + direct URL bar; `/privacy` is reachable through the `DisclaimerFooter` link + direct URL bar. No nav-bar additions; no Settings page links. Returning users with data don't see the demo CTA (their empty-state moment has passed) — they can still deep-link to `/demo` via URL bar if curious.
- **URL pattern**: `/demo` and `/privacy` are static paths. NOT `/demo/sole-trader` (premature future-proofing); NOT query params like `/?demo=1` (non-idiomatic).
- **Default route behaviour unchanged** — pathname check returns early when path is neither `/demo` nor `/privacy`; existing Phase 6 mode-prompt + Phase 11 backup-nag + master-dashboard flow runs untouched. Phase 14 is additive at the route layer.

### Demo isolation mechanism (4 sub-decisions)

- **`LocalAdapter` constructor accepts optional `dbName?: string`** defaulting to `'aussieledger'`. New exported constants `DB_NAME_PROD = 'aussieledger'` and `DB_NAME_DEMO = 'aussieledger-demo'`. `new LocalAdapter()` keeps every existing call site working; `new LocalAdapter(DB_NAME_DEMO)` is the demo path.
- **Conditional spin-up at `initAdapter()`** — single source of truth in `src/storage/index.ts`. Pseudo: `const dbName = window.location.pathname.startsWith('/demo') ? DB_NAME_DEMO : DB_NAME_PROD; const adapter = new LocalAdapter(dbName); ...`. Production code path unchanged when not on `/demo`. ServerAdapter path also unchanged (demo is local-only).
- **Exit demo via full page reload** to `/` (`window.location.href = '/'`). Adapter singleton re-initialises with production DB on the new page load. User's real data untouched (separate IDB namespace). One clean reload boundary; no hot-swap complexity; no stale-reference risk.
- **Pre-seeded demo data shape**: 1 sole-trader entity + standard small-biz Chart of Accounts + ~15 sample journal entries spanning one FY (FY2025-26). Hard-coded in new `src/storage/demo-seed.ts`. Seed-on-first-init: when demo adapter constructs and `getEntities().length === 0`, the adapter (or a `seedDemoData(adapter)` helper called by `initAdapter` on the demo branch) populates the demo DB. Subsequent `/demo` visits within the same browser see the seeded data; user can edit/delete within demo without affecting production. Re-seed never overwrites — if demo DB already has data, leave it alone (user might be mid-exploration).

### First-visit empty-state + edge cases (4 sub-decisions)

- **Trigger: zero entities, no localStorage flag** — `adapter.getEntities().length === 0` at MasterDashboard mount is the only signal. Treats fresh install and "deleted everything" as the same empty-state moment. Banner naturally disappears the instant any entity exists. No flag to maintain; no "first-visit-once-only" semantic.
- **Render location**: inline within the existing MasterDashboard empty-state, NOT as a top-of-app banner. The POL-01 trust banner + 2 CTAs sit above (or replace) the existing "no entities yet" affordance. Banner is scoped to the empty-state moment, not the global app surface — once user has data, the entire empty-state goes away.
- **Verbatim copy**: *"Your data stays in your browser — no servers, no accounts."* + primary CTA **"Create your first entity"** (opens existing EntityForm) + secondary CTA **"Try the demo"** (navigates to `/demo` via `window.location.href = '/demo'`).
- **Demo exit does NOT clear any storage** — sessionStorage flags (PWA update snooze, iOS ITP dismiss) are tab-scoped and survive the reload (correct: the user's tab environment doesn't reset just because they left demo). localStorage flags (backup-nag snooze, mode settings) survive (correct: their actual user preferences). The reload-to-`/` is the only state transition.

### Privacy page + README scope (4 sub-decisions)

- **Privacy tone: friendly bullet list, ~12 bullets, one screen, no scroll.** Plain English. Each bullet is a verifiable single-claim sentence. No legal-doc sections. No corporate boilerplate. The page IS the receipts — claims like "no cookies" are immediately verifiable in DevTools.
- **AI bullet verbatim** (locked given Phase 12 deferred to v5): *"AI features are not available on the public hosted version. Self-host with your own `GEMINI_API_KEY` to enable AI account-matching today. Hosted AI (with user-supplied keys, direct browser-to-Google, never via AussieLedger) is planned for v5 — the CSP allowlist is already in place."* Honest about current state; sets v5 expectation; explains the pre-positioned CSP that users may notice in DevTools.
- **README scope: targeted restructure (~120 lines from current 82)**. New top-of-fold with live-demo CTA + 1-line pitch + `[Screenshot coming v1.3]` placeholder note. Quick Start reordered to two options (1: try demo, 2: clone + self-host). Preserve existing Deployment Shapes / How It Works / Optional AI / Contributing / License sections with light touch-ups (Optional AI gains v5-deferral annotation). Add Privacy link in License/Contributing section. NOT a full audience-segmented rewrite.
- **Screenshot strategy: skip for v1.2; placeholder `[Screenshot coming v1.3]`**. Real screenshot capture is a manual step (run demo, take a clean shot, optimise PNG, commit). Defer to v1.3 polish; v1.2 ships text-only top-of-fold. Honest about the gap.

### Claude's Discretion

- **Exact PrivacyPage component name** — `src/components/PrivacyPage.tsx` or `src/views/PrivacyPage.tsx`; planner picks based on existing patterns (no `src/views/` dir exists; `src/components/` is the convention)
- **`DemoModeBanner` exact visual** — blue tint to distinguish from neutral-stone AdapterFallbackBanner/UpdateBanner; planner picks blue value matching existing brand (probably `bg-blue-50 border-blue-300 text-blue-900` or similar)
- **Demo seed exact journal entries** — 15 entries spanning one FY; planner picks realistic small-biz transactions (sales, expenses, drawings, etc.) — needs to populate TB + show meaningful Tax Return + BAS outputs but not overwhelm. Hard-coded in `src/storage/demo-seed.ts`.
- **Demo seed entity details** — sole-trader name (e.g. "Demo Sole Trader Pty Ltd" → no, sole traders aren't companies; planner picks a realistic name like "Demo Pty Ltd Trading" or "Sample Sole Trader" — keep it obviously demo-ish so users don't mistake for their own data)
- **`PrivacyPage` other bullet wording** — CONTEXT locks the AI bullet verbatim and the bullet COUNT (~12) + tone; planner picks final wording for the other ~11
- **`DisclaimerFooter` privacy link placement** — inline with the existing "Not tax advice" disclaimer or below it; planner picks based on visual fit
- **Pathname-dispatch implementation location** — pure inline check in `App.tsx` + `src/storage/index.ts`, OR extract to a tiny `src/lib/route.ts` helper exporting `getRouteKind(): 'demo' | 'privacy' | 'default'`. Helper is cleaner if there are >2 call sites. Planner picks.
- **Demo data — FY choice** — FY2025-26 (current FY at v1.2 release) recommended; planner picks based on what tax-engine FY modules support cleanly
- **README screenshot placeholder** — explicit `[Screenshot coming v1.3]` note vs simply omit. Planner picks; either is acceptable.
- **Tests for routing** — planner decides between (a) unit-test the pathname dispatch helper in isolation, (b) integration-test the full App.tsx routing via JSDOM with `vi.stubGlobal('location', ...)`, or (c) both. Coverage target: every routing branch reachable.
- **`<DemoModeBanner />` mount site** — same top-of-app banner row as AdapterFallbackBanner + UpdateBanner (sibling in MainLayout)
- **Privacy bullets non-AI exact wording** — planner picks final phrasing matching the calm-modernist tone

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 14 scope + prior decisions
- `.planning/PROJECT.md` — v1.2 milestone goal; anti-features (no cookie banners, no third-party scripts, no telemetry)
- `.planning/REQUIREMENTS.md` §Release Polish — POL-01..04 acceptance text; AI-01/02 deferred to v5
- `.planning/ROADMAP.md` Phase 14 entry — 5 success criteria (HOST-04 already closed early in Phase 10)
- `.planning/STATE.md` — architecture invariants; Phase 12 deferred note; Phase 13 PWA shipped
- `.planning/research/STACK.md` — no new dependencies needed for Phase 14
- `.planning/research/ARCHITECTURE.md` — `/demo` isolated IDB namespace pattern locked
- `.planning/research/PITFALLS.md` §4 — **HARD-BLOCK**: demo data leak prevention via `'aussieledger-demo'` IDB namespace
- `.planning/research/SUMMARY.md` — Phase 14 forced-last; depends on Phases 10–13 all complete
- `.planning/phases/10-public-build-ci-cd-to-cloudflare-pages/10-CONTEXT.md` — Vercel SPA fallback + CSP unchanged
- `.planning/phases/11-indexeddb-hardening/11-CONTEXT.md` — LocalAdapter duck-typing pattern (for any new methods)
- `.planning/phases/13-pwa-wrapper/13-CONTEXT.md` — top-of-app banner pattern (`role="status"` neutral-stone)

### Existing code Phase 14 must consume / extend
- `src/storage/local.ts` — LocalAdapter at line 57; `DB_NAME = 'aussieledger'` const at line 43; constructor at line 62. Phase 14 WIDENS constructor to accept optional `dbName?: string`; renames the const to `DB_NAME_PROD` and adds `DB_NAME_DEMO`; updates the `openDB(...)` call at line 71 to use `this.dbName ?? DB_NAME_PROD`.
- `src/storage/index.ts` — `initAdapter()` at line 56; Phase 14 ADDS pathname-based adapter selection before the existing probe logic.
- `src/App.tsx` — view state `useState<View>('master-dashboard')` at line 21; Phase 14 ADDS pathname-based initial view selection (`/privacy` → privacy view; `/demo` → still master-dashboard but with demo banner mount).
- `src/components/shell/MainLayout.tsx` line 77+ — existing top-of-app banner row; `<DemoModeBanner />` slots in.
- `src/components/DisclaimerFooter.tsx` — widen to include `/privacy` link.
- `src/components/EntityForm.tsx` — existing entity-creation modal; reused by POL-01 primary CTA.
- `src/components/MasterDashboard.tsx` (if exists; if not, look at where the entity-less empty state renders today) — POL-01 trust banner + 2 CTAs added.
- `vercel.json` (Phase 10) — SPA fallback `rewrites: /(.*) → /index.html` makes `/demo` and `/privacy` resolvable. No changes.
- `vite.config.ts` + `vite.pwa-options.ts` (Phase 13) — Workbox precache + manifest unchanged; `/demo` and `/privacy` work under PWA navigateFallbackDenylist (they're not `/api/*`).
- `README.md` (82 lines) — targeted restructure for top-of-fold + quick-start; preserve existing later sections with light annotation.

### New code Phase 14 creates
- `src/components/PrivacyPage.tsx` — privacy page view with ~12 trust-signal bullets
- `src/components/__tests__/PrivacyPage.test.tsx` — render tests verifying all locked bullets present, AI v5-deferral text verbatim, repo link present
- `src/components/DemoModeBanner.tsx` — top-of-app banner shown when on `/demo`
- `src/components/__tests__/DemoModeBanner.test.tsx` — render tests
- `src/components/WelcomeBanner.tsx` (or fold into existing MasterDashboard) — POL-01 trust banner + 2 CTAs
- `src/components/__tests__/WelcomeBanner.test.tsx`
- `src/storage/demo-seed.ts` — pre-seeded sole-trader + COA + ~15 journals; `export function seedDemoData(adapter: LocalAdapter): Promise<void>`
- `src/storage/__tests__/demo-isolation.test.ts` — HARD-BLOCK guard: instantiating both adapters in the same session, writing to demo, asserting production DB unchanged
- `src/lib/route.ts` (possibly) — `getRouteKind(): 'demo' | 'privacy' | 'default'` helper; tests for each branch

### External documentation
- MDN: `window.location.pathname` semantics
- W3C: IndexedDB origin-scoping (confirms namespace isolation IS the only safe mitigation per PITFALLS #4)
- Apache 2.0 license text (in repo at `LICENSE`)

### Repo facts
- **Live deploy**: `https://aussieledger.techtaitan.com` — Vercel custom domain
- **PWA shipped Phase 13** — `manifest.webmanifest` + `sw.js` live; `/demo` and `/privacy` will be precached as part of the SPA shell
- **Phase 12 deferred to v5** — privacy page AI bullet must be honest about this
- **Final v1.2 phase** — after Phase 14 ships, v1.2 is releaseable

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`LocalAdapter` constructor** is single-purpose with one default `DB_NAME` — small widen for `dbName?: string` is clean; matches the Phase 11 `nowIso()`-extraction pattern (small surgical interface expansion).
- **`hasExistingData` flag in DataPage.tsx:98** — same `getEntities().length` check pattern reusable for POL-01 empty-state trigger in MasterDashboard.
- **`DisclaimerFooter` in MainLayout.tsx:81** — already mounts on every view; natural insertion point for `/privacy` link.
- **`MainLayout` top-of-app banner row** (Phase 13) — `<AdapterFallbackBanner />` + `<UpdateBanner />` siblings; `<DemoModeBanner />` slots in alongside.
- **EntityForm** — reused by POL-01 primary CTA without modification.
- **Vercel SPA fallback** — `/demo` and `/privacy` resolve via the existing rewrites rule.

### Established Patterns
- **`role="status"` banner pattern** (Phase 11 AdapterFallbackBanner reframe) — informational tone, neutral palette, dismiss-X (DemoModeBanner uses this shape but with a blue tint + Exit-demo button instead of X)
- **Apache 2.0 SPDX header** on every new source file (Phase 1 invariant)
- **No `new Date()` outside `src/lib/period.ts`** (Phase 2 + Phase 11 structural-lint enforces) — Phase 14 demo seed needs FY-period timestamps; route through `nowIso()` or `today()` from `period.ts`
- **One-shot `useEffect` for module-init wiring** (Phase 11 pattern) — pathname read on App.tsx mount follows this shape
- **Conventional Commits** with co-author (every prior phase)
- **AIza scan in `npm run build`** — runs against the post-Phase-14 bundle; demo seed contains no key shapes; expect zero false positives

### Integration Points
- `src/storage/local.ts` constructor widened — single point of demo-vs-prod DB selection
- `src/storage/index.ts` `initAdapter()` — adds pathname dispatch before existing probe logic
- `src/App.tsx` view state — pathname dispatch adds `'privacy'` as a possible initial view value
- `src/components/shell/MainLayout.tsx` — `<DemoModeBanner />` mount alongside existing banners; `<DisclaimerFooter />` widened with privacy link
- `src/components/MasterDashboard.tsx` (or equivalent empty-state render path) — `<WelcomeBanner />` mounted inline when `entities.length === 0`
- `README.md` — top-of-fold restructured; existing sections preserved with light annotation

</code_context>

<specifics>
## Specific Ideas

- **`getRouteKind()` helper** — `src/lib/route.ts` exports `function getRouteKind(): 'demo' | 'privacy' | 'default'` that reads `window.location.pathname`. Centralises the dispatch decision; testable in isolation; consumed by both `App.tsx` (view selection) and `src/storage/index.ts` (adapter DB selection). Tests stub `window.location.pathname` with `vi.stubGlobal('location', { pathname: '/demo' })`.
- **Demo seed timestamps** — all journals dated within FY2025-26 (July 2025 – June 2026); route through `period.ts` `nowIso()` or use literal ISO strings inside the seed file (literal strings are fine since seed data is fixed not dynamic). Planner picks the cleanest pattern given the no-new-Date invariant.
- **`DemoModeBanner` blue tint** — matches the Phase 13 Calculator icon palette (`#3b82f6` blue); planner picks Tailwind classes (probably `bg-blue-50 border-blue-300 text-blue-900` for the panel) to differentiate from the neutral-stone Update + Adapter banners.
- **Privacy page rendering** — full-width content card, max-width prose container (~640px). No sidebar, no nav. Just the content. Footer disclaimer link works as expected (deep-link to /privacy from anywhere).
- **POL-01 banner styling** — matches the calm-modernist palette: paper-warm `--bg`, ink heading + body, ink-outlined buttons (primary filled, secondary outlined). NO progress steppers, NO icons, NO illustrations.
- **Demo entity name** — "Demo Sole Trader" or "Sample Trading Co" (planner picks something obviously-demo so users don't confuse with their own data)
- **`/demo` → real data exit handling** — clicking "Exit demo" in the banner sets `window.location.href = '/'`. The full page reload causes `initAdapter()` to re-run; production DB loads; the empty-state OR existing-data view renders as before.
- **README "Try the live demo" CTA copy** — `## Try the live demo` heading + 1-line + link. Visible immediately on GitHub repo page; pulls visitors in.
- **Privacy page accessibility** — `role="main"` on the content wrapper; semantic `<ul>` for trust-signal bullets; reasonable headings.

</specifics>

<deferred>
## Deferred Ideas

- **Real README screenshot** — manual capture; deferred to v1.3
- **Persona-segmented README sections** (For business owners / For tax agents / For developers) — v1.3
- **`react-router-dom`** — DIY dispatch sufficient for two routes; revisit in v1.3+ if more routes accrue
- **Hot-swap LocalAdapter instances** (no-reload demo exit) — full page reload is locked
- **Multi-entity demo seed** (3 entities, multi-FY) — single sole-trader is locked for v1.2
- **Settings page link to demo/privacy** — discoverability via empty-state CTA + footer is sufficient
- **First-visit-once-only flag** — empty-state trigger is the locked behaviour
- **Top-of-app POL-01 banner** — MasterDashboard-scoped is locked
- **`/welcome` route** — no third route
- **Cookie banner** — explicit non-goal (no cookies = no banner)
- **Formal legal-doc privacy page** — friendly bullet list is locked
- **AI bullet pretending AI is on hosted today** — REJECTED
- **`/demo/sole-trader` extensible path** — single `/demo` URL locked
- **Demo data reset button** — out of scope; demo data accumulates within the session, fresh on next page-close (sessionStorage doesn't apply; IDB DB persists). If user pollutes the demo DB, they can clear via DevTools or wait for v1.3 reset affordance.
- **Privacy page generation from a YAML manifest** — overkill; hard-code the bullets

</deferred>

---

*Phase: 14-release-polish*
*Context gathered: 2026-06-02*
