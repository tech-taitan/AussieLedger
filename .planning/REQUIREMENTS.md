# Requirements: AussieLedger v1.3

**Defined:** 2026-06-02
**Milestone:** v1.3 — Polish + Cleanup
**Core Value (unchanged from v1.0):** A non-accountant business owner can take their trial balance, record their year's adjustments and journals in plain English, and walk away with a print-ready tax return — without paying for software.

**v1.3 thesis:** Close documented v1.2 audit tech debt (private repo URL, legacy-migration demo-DB coupling, `<button>`-in-`<button>` Sidebar warning) + ship the entity-aware tax-nav UX polish + reactivate deferred-from-POL-04 README items (real screenshot, persona-segmented sections) + add an optional PWA install desktop CTA. Two phases, slow + thoughtful cadence, no architectural changes. Sets up a clean baseline before v2.0's sqlite-wasm + FSA + Tauri pivot.

## v1.3 Requirements

### Code Polish — Phase 15 (POL-CODE)

Close v1.2 audit tech debt + ship the entity-aware navigation UX. All source-code work.

- [ ] **POL-CODE-01 (repo-visibility-fix)**: Either (a) the GitHub repository at `github.com/tech-taitan/AussieLedger` is flipped to public via GitHub Settings → Danger Zone → Change visibility, OR (b) all anonymous-broken repo URL references are stripped/replaced in `README.md:91` + `src/components/PrivacyPage.tsx:55,59,89` with an honest "source available on request" line. User decision at execution-discussion time. Closes v1.2 audit RED.
- [ ] **POL-CODE-02 (legacy-migration-demo-guard)**: `src/storage/local.ts` constructor (line 117-122) skips `migrateLegacyLocalStorage(this)` when `this.dbName === DB_NAME_DEMO`. Prevents the v1.2-audit-AMBER scenario where a pre-Phase-11 user who lands on `/demo` BEFORE ever loading `/` has their legacy localStorage data migrated INTO the demo DB and legacy keys cleared. Unit test: `new LocalAdapter(DB_NAME_DEMO)` + pre-populated legacy keys → demo DB stays empty + legacy keys NOT cleared.
- [ ] **POL-CODE-03 (button-in-button-sidebar-refactor)**: Sidebar's NavButton anomaly badge (`src/components/shell/Sidebar.tsx:85-95`) restructured so it does NOT render `<button>` nested inside `<button>`. Either (a) anomaly badge becomes `<span role="button" tabIndex={0}>` with keyboard handling (Enter + Space → click), or (b) NavButton becomes a `<div role="link">` and the badge stays a real `<button>`. React console warning gone. All existing Sidebar tests still GREEN; new keyboard-accessibility test added. Pre-existing from Phase 6; carried through v1.1 + v1.2.
- [ ] **POL-CODE-04 (entity-aware-tax-nav)**: Sidebar tax-section nav entries (`setView('tax-return' | 'company-tax' | 'trust-tax' | 'bas-ias')` in `src/components/shell/Sidebar.tsx`) filter by `activeEntity?.type`. Mapping: Individual / Sole Trader → Tax Assist (Form I) only; Company → Company Tax (Form C) only; Trust → Trust Tax (Form T) only; Partnership → Partnership Tax (Form P) only. BAS/IAS stays visible regardless (universal across entity types). When no active entity selected (master-dashboard), all 4 tax-section entries hidden. Tests: each entity type renders the correct subset; no-entity case hides all 4.
- [ ] **POL-CODE-05 (edit-entity-details-in-settings)**: A new "Active Entity" section added to `src/components/Settings.tsx` (after existing "Mode" and "Primary Entity" sections). Section shows active entity name + an "Edit Entity Details" button that opens `EntityForm` for the active entity. When no active entity selected, section shows "No active entity selected" prompt. The existing `ViewRouter.tsx:179` "Edit Entity Details" header button stays unchanged (duplicate, NOT move).
- [ ] **POL-CODE-06 (pwa-install-desktop-cta)**: Captures `window.addEventListener('beforeinstallprompt', ...)` and surfaces a manual "Install AussieLedger" CTA at the bottom of Settings page. Button calls the captured event's `prompt()` method. Hides itself once installed (`window.matchMedia('(display-mode: standalone)').matches === true`) or if `beforeinstallprompt` never fires (Safari, already installed, unsupported browser). Tests: button hidden by default; appears when `beforeinstallprompt` event fires; hides on standalone-mode detection.

### Docs Polish — Phase 16 (POL-DOCS)

README + screenshot work. No source-code changes in this phase.

- [ ] **POL-DOCS-01 (real-readme-screenshot)**: Replaces the `> _Screenshot coming v1.3._` italic blockquote placeholder in README.md (Phase 14 POL-04 deferred) with a real screenshot. Manual capture: run AussieLedger `/demo` route → capture a clean shot of MasterDashboard with demo data visible → save as `docs/screenshot.png` (or `.webp` if smaller) → wire into README.md top-of-fold as `![AussieLedger screenshot](docs/screenshot.png)`. Image checked into git. Optional: optimise via `pngquant` before commit (target ≤ 200KB).
- [ ] **POL-DOCS-02 (persona-segmented-readme)**: README "What This Is" section expanded with three persona-targeted subsections: **"For business owners"** (existing copy; lightly refined), **"For tax agents"** (existing copy; lightly refined), and a NEW **"For developers"** subsection covering architecture-at-a-glance (StorageAdapter FINAL, tax-engine pure functions, no PDF library, Apache 2.0, CONTRIBUTING.md pointer). ~25 line README expansion. Three new readme.test.ts assertions verifying each subsection heading present + a key phrase per persona.

## Considerations carried over from v1.2 (informational, not requirements)

These were noted during v1.2 close but don't need their own POL- requirements:

- **PrivacyPage AI bullet wording drift**: The verbatim Phase 14 POL-03 AI bullet says *"the CSP allowlist is already in place"* — but the user tightened `vercel.json` post-v1.2-ship to remove `https://generativelanguage.googleapis.com` from `connect-src`. The bullet is now slightly inaccurate (CSP allowlist will need to be re-added when v5 AI ships). **Action:** fold a small wording fix into POL-CODE-01 when touching PrivacyPage — change wording to *"the CSP allowlist will be added in v5 alongside the AI flows"* or similar. ~2 line edit.

## Future Requirements (deferred from v1.3)

- **sqlite-wasm + File System Access API** — v2.0's locked direction
- **Tauri desktop wrapper** — v2.0 follow-on
- **AI-01 + AI-02 (User-Supplied Gemini Key + Direct-Browser Gemini)** — still deferred to v5; CSP allowlist re-added to vercel.json when v5 ships
- **Anonymous voluntary error reporting** — opt-in telemetry contradicts the privacy thesis
- **Multi-FY catch-up wizard** — carried since v1.0
- **MyTax XML lodgement export** — possible v1.4 or v2.x scope

## Out of Scope (explicit non-goals)

- **File System Access API · sqlite-wasm · Tauri packaging** — v2.0 territory
- **AI features on hosted version** — v5 territory
- **Multi-user accounts / auth** — same explicit non-goal as v1.2
- **New entity-type or tax-form additions** — out of v1.3 scope
- **Test-coverage drive** — no new tests beyond the polish-item assertions
- **README full audience-segmented rewrite** — POL-DOCS-02 adds persona subsections WITHIN existing structure; does NOT restructure the whole README into per-persona top-level sections
- **Replacing the AdapterFallbackBanner reframe from v1.2** — "Running on Local Browser Storage" copy stays
- **PWA install on iOS** — Safari doesn't fire `beforeinstallprompt`; iOS path remains the Phase 11 IosItpBanner Share-menu instructions
- **UpdateBanner z-index revisit** — v1.2 audit AMBER said revisit IF a third floating banner accrues; v1.3 introduces no new floating banner
- **Re-adding the CSP `connect-src` Gemini allowlist** — v5 territory; user explicitly tightened it during v1.2 close

## Traceability

To be confirmed by `/gsd:plan-phase` once Phase 15 + 16 plans land. Each REQ-ID maps to exactly one phase.

| Req | Phase | Status |
|-----|-------|--------|
| POL-CODE-01 | Phase 15 | Pending |
| POL-CODE-02 | Phase 15 | Pending |
| POL-CODE-03 | Phase 15 | Pending |
| POL-CODE-04 | Phase 15 | Pending |
| POL-CODE-05 | Phase 15 | Pending |
| POL-CODE-06 | Phase 15 | Pending |
| POL-DOCS-01 | Phase 16 | Pending |
| POL-DOCS-02 | Phase 16 | Pending |

**Total v1.3 requirements: 8**
**Phase coverage: 15 + 16 (2 phases continuing from v1.2's 10/11/13/14; Phase 12 stays as deferred-slot per v1.2 commit-history-stability policy)**
