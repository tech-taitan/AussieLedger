---
phase: 15
slug: code-polish
type: context
status: ready-for-planning
created: 2026-06-02
discussed_areas: [repo-visibility, sidebar-refactor, entity-aware-nav]
---

# Phase 15: Code Polish — Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

**Phase scope:** POL-CODE-01 through POL-CODE-05 (5 active requirements; POL-CODE-06 PWA install desktop CTA deferred to a future milestone on 2026-06-02). Closes the documented v1.2 audit tech debt + ships the entity-aware Sidebar nav UX + duplicates Edit Entity Details into Settings. All source-code work; docs polish (POL-DOCS-01/02) lives in Phase 16.

<domain>
## Phase Boundary

Phase 15 closes the four v1.2-audit-documented code-side issues and ships the entity-aware Sidebar nav UX that was captured as a todo on 2026-06-02. Single deferred slot from this phase (POL-CODE-06 PWA install desktop CTA) was lifted out at discuss-time; browser-native URL-bar install affordance + Phase 11's IosItpBanner cover the install discovery paths in v1.3 without a new CTA.

**In scope (5 requirements: POL-CODE-01..05):**

- **POL-CODE-01 — Repo visibility fix.** User flips `github.com/tech-taitan/AussieLedger` to public via GitHub Settings → Danger Zone → Change visibility. Zero code changes; this is a `checkpoint:human-action` task — orchestrator pauses, user flips via GitHub UI, replies "done", anonymous GitHub API call re-verifies (`/repos/tech-taitan/AussieLedger` returns 200 + `private: false`). Alongside the flip, user also sets GitHub repo metadata: description, topics, website URL. PrivacyPage AI bullet receives a small wording fix in the SAME task (CSP allowlist for `generativelanguage.googleapis.com` was tightened OUT of `vercel.json` during v1.2 close — bullet now reads "will be added in v5 alongside the AI flows" instead of "already in place").
- **POL-CODE-02 — Legacy-migration demo-DB guard.** `src/storage/legacy-migration.ts` `migrateLegacyLocalStorage(adapter)` widened with an early-return guard: when `adapter.getDbName() === DB_NAME_DEMO`, skip the migration entirely (do not read, do not write, do not clear legacy keys). Phase 14's `LocalAdapter.getDbName()` getter is the canonical source. Unit test in `src/storage/__tests__/legacy-migration-demo-guard.test.ts`: pre-populate legacy localStorage keys → instantiate `new LocalAdapter(DB_NAME_DEMO)` → assert demo DB stays empty AND legacy keys NOT cleared. Closes v1.2 audit AMBER #2.
- **POL-CODE-03 — `<button>`-in-`<button>` Sidebar refactor.** `src/components/shell/Sidebar.tsx` NavButton anomaly badge (lines 85-95) converted from nested `<button>` to `<span role="button" tabIndex={0}>` with `onKeyDown` handler for Enter + Space → onBadgeClick. Visual byte-identical: `bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold hover:bg-red-600 cursor-pointer`. React's nested-interactive-elements console warning disappears. Tests: existing 13 Sidebar tests stay GREEN; 2 NEW tests verify Enter + Space both fire onBadgeClick. Pre-existing from Phase 6; carried through v1.1 + v1.2 audits.
- **POL-CODE-04 — Entity-aware tax nav.** `src/components/shell/Sidebar.tsx` entity-scoped block (lines 241-300) restructured so the 4 tax-section nav entries filter by `activeEntity.type`. Mapping (locked):
  - `Individual` → Tax Assistant (Form I) only
  - `Company` → Company Tax (Form C) only
  - `Trust` → Trust Tax (Form T) only
  - `Partnership` → no Form P view exists today → Partnership entities see BAS/IAS only
  - `Sole Trader` (verify discriminator in `src/types.ts`) → same as Individual (Tax Assistant)
  - BAS/IAS always visible for all entity types (universal — GST applies regardless of type)
  - `master-dashboard` (no `activeEntity`) → nav already gates everything entity-scoped on `activeEntity && (...)` at line 242, so this case is already covered (none of the 4 render)
- **POL-CODE-05 — Edit Entity Details in Settings.** `src/components/Settings.tsx` gains a 4th section between "Primary Entity" and "First-Run Prompt" — heading `<h3>Active Entity</h3>`, body shows `activeEntity?.name` or "No active entity selected", plus an "Edit Entity Details" button that wires `onEditActiveEntity` prop callback (App.tsx passes a setter that delegates to the same `setView('edit-entity')` flow `ViewRouter.tsx:179` uses today). The existing `ViewRouter.tsx:179` "Edit Entity Details" header button stays unchanged — this is a DUPLICATE access point, not a move. No-active-entity state shows the "select an entity" prompt instead of the button.

**Out of scope (deferred):**

- **POL-CODE-06 PWA install desktop CTA** — deferred to a future milestone 2026-06-02. Rationale: browser-native URL-bar install affordance (Chrome/Edge/Brave) + Phase 11's IosItpBanner already cover both desktop + iOS install paths. Adding an in-app CTA was scoped but the user opted to defer; reactivate if user research shows the browser-native affordance isn't discoverable enough.
- **GitHub repo hygiene additions** (CODE_OF_CONDUCT.md, SECURITY.md, branch protection rules) — out of POL-CODE-01 scope per discuss-time decision; keep POL-CODE-01 tight.
- **Sidebar visual refresh** — POL-CODE-03 refactor preserves visual byte-identical. Any redesign is a separate todo for a future polish phase.
- **GST-registered boolean on Entity** to allow BAS/IAS filtering by registration status — not v1.3 scope; BAS/IAS stays universal.
- **Partnership Form P view** — adding a `partnership-tax` route would be its own phase. v1.3 entity-aware nav just hides the irrelevant Sidebar entries; Partnership entities currently see BAS/IAS only.
- **Sole-Trader-specific entity type** (if codebase has `Individual | SoleTrader` distinction) — verify at execution time; same mapping (both → Tax Assistant).
- **CSP `connect-src` Gemini allowlist** — explicitly tightened out of `vercel.json` during v1.2 close; re-adds when v5 ships.
- **VALIDATION.md re-introduction** — v1.2 used VERIFICATION.md as single audit artifact; v1.3 follows the same convention.

</domain>

<decisions>
## Implementation Decisions

### Repo visibility (4 sub-decisions)

- **Flip the GitHub repo public** (NOT strip URLs). User does the flip via GitHub Settings → Danger Zone → Change visibility → Make public. One-click; zero code changes for the README + PrivacyPage URL paths.
- **Flip during Phase 15 execution** (NOT pre-emptively). POL-CODE-01 becomes a `checkpoint:human-action` task — orchestrator pauses; user flips + replies "done"; orchestrator re-verifies via anonymous GitHub REST API call (`/repos/tech-taitan/AussieLedger` returns 200 + JSON body `private: false`); proceed to next task. Same pattern as Phase 10's Cloudflare token gate.
- **No additional repo hygiene in scope** — just the visibility flip. CODE_OF_CONDUCT.md, SECURITY.md, branch protection are NOT added in this phase. Keep POL-CODE-01 tight.
- **Add GitHub repo metadata during the flip** — user also sets description (`"Free Australian bookkeeping → tax return tool. Your data stays in your browser."`), topics (`australia, tax, accounting, bookkeeping, open-source, react, typescript`), website (`https://aussieledger.techtaitan.com`) while in Settings. Improves discoverability; one-time configuration.
- **Bonus PrivacyPage AI bullet wording fix** folded into POL-CODE-01: change "the CSP allowlist is already in place" → "the CSP allowlist will be added in v5 alongside the AI flows" (~2-line edit to `src/components/PrivacyPage.tsx`). Reflects the v1.2-close CSP tightening accurately.

### Sidebar refactor (4 sub-decisions)

- **Badge becomes `<span role="button" tabIndex={0}>` with Enter+Space keyboard handlers.** Keeps NavButton as `<button>` (correct semantics for the nav item). The badge as a `<span role="button">` stops React's nested-interactive-elements warning. Idiomatic; aligns with WAI-ARIA spec for non-button elements taking on button behaviour.
- **Test depth: Enter + Space both fire `onBadgeClick`.** Two unit tests: `fireEvent.keyDown(badge, { key: 'Enter' })` → `expect(onBadgeClick).toHaveBeenCalled()`; same for `' '` (Space key). Locks WAI-ARIA expectation. Existing 13 Sidebar tests stay GREEN — minimal regression risk since visual + click behavior unchanged.
- **Visual byte-identical** — span gets same Tailwind classes as the existing button: `bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold hover:bg-red-600`. Existing `data-testid` (`nav-{label}-badge`) preserved. Existing `aria-label` (`Show next anomaly for ${label}`) preserved.
- **Cursor styling: add `cursor-pointer`.** Spans don't get the pointer cursor by default (buttons do). One Tailwind class addition to maintain the existing click-affordance feel.

### Entity-aware tax nav (4 sub-decisions)

- **Sole Trader = Individual mapping.** Verify at execution time by reading `src/types.ts`; if there's a discrete `SoleTrader` discriminator alongside `Individual`, both map to Tax Assistant. If `Sole Trader / Individual` is a single discriminator (the existing pattern from earlier scouts suggests this), even simpler — one branch.
- **Partnership gets BAS/IAS only** for v1.3. No `partnership-tax` view exists today; entity-aware filter just doesn't render Tax Assistant / Company Tax / Trust Tax for Partnership entities. BAS/IAS always universal. If a Partnership-specific Form P view is added later (separate phase), the mapping updates.
- **Demo mode (`/demo`) mirrors production semantics** — demo seeds a sole-trader entity (Phase 14-1 `demo-seed.ts`), so entity-aware nav shows Tax Assistant (Form I) only. Demo accurately previews the real-user experience for a sole-trader user. Pedagogical "show all tax sections" approach explicitly rejected (would confuse users; clicking Company Tax with a sole-trader entity loaded would show empty/wrong-shape return).
- **BAS/IAS always visible** regardless of entity type — GST applies across all AU entity types; BAS lodgement universal. REQUIREMENTS locks this. NOT filtered by a GST-registered boolean (no such field on Entity today; out of v1.3 scope).

### Edit Entity Details in Settings — sub-decisions confirmed from REQUIREMENTS

- **New "Active Entity" section** in `src/components/Settings.tsx`, positioned BETWEEN "Primary Entity" and "First-Run Prompt" sections. Heading `<h3 className="font-bold text-sm uppercase tracking-wider">Active Entity</h3>`.
- **Two states:**
  - `activeEntity != null` → render entity name + entity type + "Edit Entity Details" button
  - `activeEntity == null` → render "No active entity selected" prompt with hint "Select an entity from the Master Dashboard to edit"
- **Button wiring** — new prop `onEditActiveEntity?: () => void` on Settings, defaulting to App.tsx's existing setter that wires `setView('edit-entity')`. ViewRouter.tsx:179 header button stays unchanged — duplicate access point, not a move.
- **Tests:** 3 new tests — section renders entity name when `activeEntity` present; section renders empty-state prompt when `activeEntity == null`; button click invokes `onEditActiveEntity` callback.

### Legacy-migration demo-DB guard — sub-decisions confirmed from REQUIREMENTS

- **Guard location:** at the top of `migrateLegacyLocalStorage(adapter)` function in `src/storage/legacy-migration.ts`. Read `adapter.getDbName()`; if `=== DB_NAME_DEMO`, return early (no side effects). Single source of truth; no caller-side check needed.
- **Test file:** new `src/storage/__tests__/legacy-migration-demo-guard.test.ts` with 2 tests:
  - Pre-populate all 4 legacy localStorage keys → `new LocalAdapter(DB_NAME_DEMO)` → demo DB has 0 entities AND legacy keys still present
  - Pre-populate all 4 legacy localStorage keys → `new LocalAdapter(DB_NAME_PROD)` → prod DB has migrated entities AND legacy keys cleared (regression guard for the prod path)
- **No production behavior change** for the prod path — guard fires only on demo adapter construction.

### Claude's Discretion

- **PrivacyPage AI bullet exact new wording** — planner picks the exact replacement phrase within the "CSP allowlist will be added in v5 alongside the AI flows" sense. Verbatim suggestion: "Hosted AI (with user-supplied keys, direct browser-to-Google, never via AussieLedger) is planned for v5 — the CSP `connect-src` allowlist will be added alongside the AI flows when v5 ships."
- **Sidebar refactor — exact element structure** for the new `<span role="button">` — wrapper, key handler placement, ref/focus management. Planner picks based on existing keyboard-handler patterns in other components (e.g. EntityForm's text input handlers).
- **Settings "Active Entity" section visual** — Tailwind classes match existing Settings sections (`<section className="bg-white border border-[var(--line-strong)] p-6 space-y-3">`); planner replicates the established pattern.
- **`src/types.ts` Entity discriminator check** — planner verifies at execution time whether `Sole Trader` is a discrete type or folded into `Individual`. If discrete, both branches map to Tax Assistant.
- **Tests file naming** for legacy-migration guard — `legacy-migration-demo-guard.test.ts` vs adding to existing test file. Planner picks based on existing test file shape (if `legacy-migration.test.ts` exists, append; else create new).
- **POL-CODE-01 checkpoint copy** for the human-action gate ("Open https://github.com/tech-taitan/AussieLedger/settings → Danger Zone → Change visibility..."). Planner writes the explicit step-by-step in the task description.
- **Settings prop signature for `onEditActiveEntity`** — function vs callback shape; planner picks based on existing Settings props.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 15 scope + prior decisions
- `.planning/PROJECT.md` — v1.3 milestone goal (Polish + Cleanup)
- `.planning/REQUIREMENTS.md` §Code Polish — POL-CODE-01..05 acceptance text (POL-CODE-06 deferred)
- `.planning/ROADMAP.md` Phase 15 entry
- `.planning/STATE.md` — architecture invariants (StorageAdapter FINAL; no `new Date()` outside period.ts; SPDX header)
- `.planning/milestones/v1.2-MILESTONE-AUDIT.md` — captures the 4 tech-debt items Phase 15 closes (private repo URL, legacy-migration demo-DB coupling, button-in-button Sidebar, UpdateBanner z-index — the last NOT in scope per CONTEXT)
- `.planning/milestones/v1.2-phases/14-release-polish/14-CONTEXT.md` — locked PrivacyPage AI bullet copy (needs the v5-CSP wording amendment in POL-CODE-01)

### Existing code Phase 15 must consume / modify
- `src/components/shell/Sidebar.tsx` (~330 lines): NavButton at 50-98 (refactor target — POL-CODE-03); entity-scoped block at 242-300 (POL-CODE-04 target); tax-section entries at lines 277-300
- `src/components/Settings.tsx` (~102 lines): 3 existing sections (Mode 32-52, Primary Entity 54-82, First-Run Prompt 84-98); POL-CODE-05 adds 4th "Active Entity" section between Primary Entity and First-Run Prompt
- `src/storage/legacy-migration.ts`: `migrateLegacyLocalStorage(adapter)` exported function (POL-CODE-02 target — early-return guard at the top)
- `src/storage/local.ts`: `LocalAdapter.getDbName()` getter (Phase 14 deliverable; POL-CODE-02 consumes it)
- `src/types.ts`: Entity type discriminator (`type: 'Individual' | 'Company' | 'Trust' | 'Partnership'` and possibly `'Sole Trader'`); POL-CODE-04 verifies discriminator shape at execution time
- `src/App.tsx`: setView('edit-entity') flow that POL-CODE-05's Settings button wires into
- `src/components/PrivacyPage.tsx` (~145 lines): AI bullet wording fix folded into POL-CODE-01
- `README.md`: NO changes in Phase 15 (POL-CODE-01 might touch if user chooses strip path; chose flip-public path, so no README changes)

### New code Phase 15 creates
- `src/storage/__tests__/legacy-migration-demo-guard.test.ts` — POL-CODE-02 unit tests (2 cases: demo-skips-migration + prod-still-migrates)
- 2 new tests added to `src/components/shell/__tests__/Sidebar.test.tsx` (POL-CODE-03 keyboard accessibility — Enter + Space → onBadgeClick)
- ~6-8 new tests added to `src/components/shell/__tests__/Sidebar.test.tsx` (POL-CODE-04 entity-type filtering — 4 type branches + no-entity case)
- ~3 new tests added to `src/components/__tests__/Settings.test.tsx` (POL-CODE-05 — Active Entity section render states + button click)
- Plus the existing test file expansions noted above

### External documentation
- WAI-ARIA Authoring Practices: button role on non-button elements + keyboard handling expectation
- React docs: `KeyboardEvent` handling patterns
- GitHub REST API: `/repos/{owner}/{repo}` (used for POL-CODE-01 anonymous public-flip verification)

### Repo facts
- **Live deploy:** `https://aussieledger.techtaitan.com` (Vercel)
- **Current test count:** 1183 SPA GREEN + 11 todo + 0 RED
- **Phase 15 target:** ~1198-1208 SPA GREEN (+15-25 new across the 4 source-code requirements; POL-CODE-01 adds no new tests since it's a settings-flip + AI bullet wording fix)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`LocalAdapter.getDbName()`** (Phase 14) — the duck-typed getter POL-CODE-02 uses for the demo-guard check
- **Existing `<Toast>` primitive** — not consumed by Phase 15 (no toast-firing scenarios)
- **Existing 3 Settings sections** — `bg-white border border-[var(--line-strong)] p-6 space-y-3` pattern; new "Active Entity" section mirrors
- **Existing Sidebar NavButton + badge structure** — POL-CODE-03 refactor preserves all existing data-testid, aria-label, visual classes
- **`activeEntity` prop already threaded through Sidebar** at line 37 — POL-CODE-04 just reads `activeEntity.type` in the existing block

### Established Patterns
- **Apache 2.0 SPDX header** on every new source file (Phase 1 invariant)
- **No `new Date()` outside `src/lib/period.ts`** (Phase 2 + Phase 11 structural-lint enforces) — Phase 15 shouldn't need timestamps
- **Conventional Commits** with co-author (every prior phase)
- **`role="status"` / `role="button"` ARIA pattern** for non-native interactive elements (Phase 11 banner refactor precedent)
- **One-shot keyboard handlers** — Enter + Space dispatch as separate cases in `onKeyDown` switch (idiomatic React + ARIA)
- **`checkpoint:human-action` task** — Phase 10 Plan 10-2's Cloudflare token gate is the canonical precedent
- **Anonymous GitHub REST API verification** — Phase 13/14 executors used this pattern for CI status; POL-CODE-01 reuses for repo-visibility verify

### Integration Points
- `src/components/shell/Sidebar.tsx` — POL-CODE-03 + POL-CODE-04 both modify (overlap; planner sequences carefully)
- `src/components/Settings.tsx` — POL-CODE-05 adds section; new props from App.tsx
- `src/App.tsx` — POL-CODE-05 wires Settings's new `onEditActiveEntity` callback; threading existing `activeEntity` to Settings
- `src/storage/legacy-migration.ts` — POL-CODE-02 single-line guard at function top
- `src/components/PrivacyPage.tsx` — POL-CODE-01 AI bullet wording fix (only)
- No changes to `vercel.json`, `vite.config.ts`, `vite.pwa-options.ts`, `package.json`, or test infrastructure

</code_context>

<specifics>
## Specific Ideas

- **POL-CODE-01 checkpoint copy** (suggested): "Open https://github.com/tech-taitan/AussieLedger/settings in your browser. Scroll to the bottom 'Danger Zone' section. Click 'Change visibility' → 'Change to public' → confirm by typing the repo name. While you're in Settings, also set: Description = 'Free Australian bookkeeping → tax return tool. Your data stays in your browser.'; Topics = 'australia, tax, accounting, bookkeeping, open-source, react, typescript'; Website = 'https://aussieledger.techtaitan.com'. Reply 'done' when you've flipped visibility + set metadata."
- **POL-CODE-01 verify command** (PowerShell): `Invoke-WebRequest -Uri 'https://api.github.com/repos/tech-taitan/AussieLedger' -Method Get -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json | Select-Object private, visibility, description` — expects `private: false`, `visibility: 'public'`, description set
- **POL-CODE-02 guard implementation** — `if (adapter.getDbName() === DB_NAME_DEMO) return;` at the top of `migrateLegacyLocalStorage()` BEFORE the localStorage reads. Two-line addition (guard + import for `DB_NAME_DEMO` from `./local`).
- **POL-CODE-03 keyboard handler** — `onKeyDown: (e: KeyboardEvent<HTMLSpanElement>) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBadgeClick(); } }`. Standard pattern.
- **POL-CODE-04 entity-type switch** — inside the `activeEntity && (...)` block in Sidebar.tsx, conditionally render tax-section entries based on `activeEntity.type`. Use a `switch (activeEntity.type)` or a config object mapping type → array of view IDs. Planner picks the cleanest shape.
- **POL-CODE-05 Active Entity section** — `<section className="bg-white border border-[var(--line-strong)] p-6 space-y-3">` matching existing Settings sections. Heading + entity name display + button or empty-state prompt.

</specifics>

<deferred>
## Deferred Ideas

- **POL-CODE-06 PWA install desktop CTA** — deferred to a future milestone 2026-06-02; browser-native + Phase 11 IosItpBanner cover the install paths
- **CODE_OF_CONDUCT.md** — out of POL-CODE-01 scope; future polish todo
- **SECURITY.md (vulnerability reporting policy)** — out of POL-CODE-01 scope; future polish todo (especially relevant for tax-data-adjacent project)
- **GitHub branch protection rules** — out of POL-CODE-01 scope
- **Sidebar visual refresh** — POL-CODE-03 preserves visual byte-identical; redesign is a separate todo
- **GST-registered boolean on Entity** — would allow BAS/IAS filtering; out of v1.3 scope (no new entity fields)
- **Partnership Form P view** — adding `partnership-tax` route would be its own phase
- **CSP `connect-src` Gemini allowlist** — re-added in v5 when AI flows ship
- **VALIDATION.md re-introduction** — v1.2 convention shift carries forward (VERIFICATION.md is the single audit artifact)
- **AdapterFallbackBanner reframe revisit** — "Running on Local Browser Storage" copy stays from v1.2
- **UpdateBanner z-index** — v1.2 audit AMBER; revisit only if a third floating banner accrues; v1.3 introduces no new floating banner

</deferred>

---

*Phase: 15-code-polish*
*Context gathered: 2026-06-02*
