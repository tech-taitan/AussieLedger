---
phase: 15-code-polish
plan: 2
status: complete
subsystem: sidebar-shell,settings-shell,viewrouter-wiring,pol-code-03,pol-code-04,pol-code-05
tags: [button-in-button-refactor, span-role-button, keyboard-a11y, entity-aware-nav, sole-trader-individual-mapping, partnership-bas-only, settings-active-entity-section, duplicate-access-point, viewrouter-prop-widening]
dependency_graph:
  requires:
    - "Plan 15-1 SUMMARY (post-15-1 baseline 1187 SPA GREEN; clean Wave 2 start with zero file overlap)"
    - "Phase 14 demo-seed discriminator confirmed at execution: src/storage/demo-seed.ts:38 uses type: 'SoleTrader' — POL-CODE-04 switch must treat 'SoleTrader' as Form-I-equivalent to 'Individual'"
    - "src/types.ts:33 Entity type union 'Company' | 'Trust' | 'Individual' | 'Partnership' | string (defensive fallback)"
    - "Existing 14 Sidebar tests (S.1–S.7 + S.8–S.13 + S.8a) + 4 Settings tests (SET.1–SET.4) stay GREEN through both refactors"
    - "ViewRouter:594 const activeEntity = entities.find(e => e.id === activeEntityId); — already in scope before the Settings invocation block"
  provides:
    - "POL-CODE-03 closed end-to-end: Sidebar NavButton anomaly badge is a <span role='button' tabIndex={0}> with onKeyDown dispatching onBadgeClick on Enter + Space; Tailwind classes preserved verbatim plus cursor-pointer added; React's nested-interactive-elements console warning silenced"
    - "POL-CODE-04 closed end-to-end: Sidebar entity-scoped block filters the 3 specialised tax-section nav entries by activeEntity.type — Individual+SoleTrader → Tax Assistant; Company → Company Tax; Trust → Trust Tax; Partnership → none; BAS/IAS universal (always rendered inside the block)"
    - "POL-CODE-05 closed end-to-end: Settings has a 4th 'Active Entity' section between Primary Entity and First-Run Prompt; entity-present branch renders name + type chip + Edit button; entity-absent branch renders 'No active entity selected' prompt; ViewRouter widens <Settings/> invocation to pass activeEntity + onEditActiveEntity={() => setView('edit-entity')}; ViewRouter:179 header button stays UNCHANGED (duplicate access point per CONTEXT lock)"
    - "v1.2-audit-AMBER #3 (button-in-button) CLOSED via POL-CODE-03"
    - "Entity-aware tax nav UX shipped via POL-CODE-04"
    - "Settings duplicate access point shipped via POL-CODE-05"
  affects:
    - src/components/shell/Sidebar.tsx
    - src/components/__tests__/Sidebar.test.tsx
    - src/components/Settings.tsx
    - src/components/__tests__/Settings.test.tsx
    - src/components/ViewRouter.tsx
tech_stack:
  added: []
  patterns:
    - "WAI-ARIA span role=button + tabIndex={0} + onKeyDown {Enter, Space} → click pattern — idiomatic React for non-native interactive surfaces nested inside other interactives where the outer is the canonical button. e.preventDefault() on Space is mandatory (otherwise Space scrolls the page when the badge is focused)."
    - "Inline conditional render of nav entries via {(condition) && <NavButton .../>} blocks — 3 short conditional blocks chosen over a switch/config-object because the cardinality is small (3 specialised tax sections) and the readability win outweighs the structural-pattern win at N=3."
    - "Defensive type-string handling for the Entity.type union's trailing `| string` fallback — explicit canonical-AU-type matches (Individual / SoleTrader / Company / Trust) render the appropriate tax section; any other string (Partnership canonical or unknown) renders NONE of the 3 specialised sections. BAS/IAS unconditional inside the activeEntity block covers the universal case."
    - "Two-state JSX section pattern in Settings — { activeEntity ? <name + button branch /> : <empty-state copy branch /> } — matches the established Phase 6 pattern from the Primary Entity section's conditional. Both branches share the same heading + section <wrapper>, only the body changes."
    - "ViewRouter-internal wiring for new Settings props — activeEntity is reused from the existing line-594 lookup; onEditActiveEntity is constructed inline as () => setView('edit-entity'). No App.tsx changes needed; the wiring is purely inside ViewRouter where both the entity lookup and setView are already in scope. Minimal-surface diff."
    - "TDD RED → GREEN sequencing per task — RED commit edits/adds tests asserting the new contract; GREEN commit lands source change that makes the RED tests pass. Each pair (RED + GREEN) is a discrete unit; total 6 commits across 3 tasks."
key_files:
  created: []
  modified:
    - src/components/shell/Sidebar.tsx
    - src/components/__tests__/Sidebar.test.tsx
    - src/components/Settings.tsx
    - src/components/__tests__/Settings.test.tsx
    - src/components/ViewRouter.tsx
decisions:
  - "POL-CODE-03 badge tag-swap is byte-identical visually — same Tailwind classes (`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold hover:bg-red-600`) PLUS `cursor-pointer`. The S.8 + S.9 expectations had to be updated in the same RED commit (BUTTON → SPAN + role assertion) because they previously locked the now-broken pre-refactor shape; this is the test-doc-of-the-refactor pattern, not a regression. S.8a (parent tag ≠ BUTTON) stays GREEN unchanged because the parent is still the `<div className=\"relative\">` wrapper."
  - "POL-CODE-03 keyboard handler uses literal `e.key === ' '` (space character) not `e.key === 'Space'` (which is `e.code`, not `e.key`). preventDefault() is mandatory on Space to prevent page-scroll when the badge has focus (default action of Space on a focused element is to scroll the document)."
  - "POL-CODE-04 implementation chose 3 inline conditional blocks over a switch statement or a config-object lookup. At N=3 the inline blocks are the clearest representation; introducing structure here would add indirection without reducing complexity. The defensive `| string` fallback (Partnership + arbitrary strings) naturally falls through to 'no specialised tax section rendered' without an explicit else, which is the correct behaviour."
  - "POL-CODE-04 SoleTrader branch consolidated with Individual via OR clause `(activeEntity.type === 'Individual' || activeEntity.type === 'SoleTrader')` — confirmed at execution-time by reading src/storage/demo-seed.ts:38 which uses `type: 'SoleTrader'`. CONTEXT decision: SoleTrader = Individual for Form-I purposes (both are sole-trader / Individual-Return users)."
  - "POL-CODE-04 BAS/IAS render position preserved — stays where it was (between the 3 specialised tax entries and Import TB) inside the activeEntity block, UNCONDITIONAL. An inline comment marks it as universal-across-types."
  - "POL-CODE-05 Settings new section ALWAYS renders (not gated on mode or entity count). The empty-state branch handles the no-active-entity case rather than gating the whole section. This avoids the 'invisible section' problem when no entity is selected — the user always sees the 'Active Entity' heading and a clear next-step prompt."
  - "POL-CODE-05 entity-present branch renders entity name on one line followed by entity type in parentheses with the same 'text-xs text-gray-400' styling as the Primary Entity radio-list type chips — visual consistency across both Settings sections that surface entity-type information."
  - "POL-CODE-05 button onClick uses `() => onEditActiveEntity?.()` (optional-chain) so the component remains test-renderable without the prop (defaults to no-op). Matches the existing onClearSettings shape (zero-arg sync callback)."
  - "POL-CODE-05 ViewRouter widening kept inside ViewRouter — activeEntity is already computed at line 594 (existing const); setView is already a prop. Wiring `onEditActiveEntity={() => setView('edit-entity')}` is a closure created inline at the invocation site. No App.tsx source-level changes required (App.tsx files_modified entry from plan frontmatter was defensive only)."
  - "POL-CODE-05 ViewRouter:179 header 'Edit Entity Details' button stays UNCHANGED — verified by leaving the line 179 sub-tree out of the modification path. Both buttons now invoke the same `setView('edit-entity')` flow; the Settings access point is a duplicate, not a move, per CONTEXT lock."
metrics:
  duration: "~25 min executor wall-clock (3 tasks back-to-back; 2 full-suite runs + 1 lint+build cycle dominated; no human-action checkpoints in this plan)"
  completed: "2026-06-03"
  tasks_completed: 3
  files_changed: 5
  tests_added: 16
  tests_total: 1203
---

# Phase 15 Plan 2: POL-CODE-03 Sidebar refactor + POL-CODE-04 entity-aware tax nav + POL-CODE-05 Settings Active Entity section Summary

**One-liner:** Closes the remaining 3 of 5 Phase 15 active requirements end-to-end — POL-CODE-03 (Sidebar anomaly badge `<button>` → `<span role="button">` with Enter+Space keyboard handler + cursor-pointer; React nested-interactive warning silenced; visual byte-identical), POL-CODE-04 (Sidebar tax-section nav filters by `activeEntity.type` — Individual/SoleTrader → Tax Assistant; Company → Company Tax; Trust → Trust Tax; Partnership → none; BAS/IAS universal), POL-CODE-05 (Settings gains a 4th "Active Entity" section between Primary Entity and First-Run Prompt with name + Edit-button or empty-state prompt; ViewRouter widens Settings invocation to pass `activeEntity` + `onEditActiveEntity={() => setView('edit-entity')}`; ViewRouter:179 header button stays UNCHANGED — DUPLICATE access point, not a move). +16 SPA GREEN (1187 → 1203); StorageAdapter FINAL preserved; no new dependencies; CSP / vercel.json untouched; AIza scan still passes; App.tsx no-source-diff (wiring is purely inside ViewRouter).

## What Was Built

### Task 1 — POL-CODE-03: Sidebar NavButton anomaly badge refactor (TDD RED + GREEN)

**RED commit `7394346`** — `test(15-2): RED — Sidebar badge keyboard-a11y + tag-swap (POL-CODE-03)`

Updates to `src/components/__tests__/Sidebar.test.tsx`:
- **S.8** (lines 97-108): tag expectation flipped from `'BUTTON'` to `'SPAN'`; added assertion that `badge?.getAttribute('role') === 'button'`; inline comment documents the POL-CODE-03 refactor.
- **S.9** (lines 110-120): same swap as S.8 for the accounts badge — `'BUTTON'` → `'SPAN'` + role=button assertion.
- **K.1** (new): renders Sidebar with `mode='owner', anomalyCounts={journals: 3, accounts: 0}, onAnomalyScroll=mockFn`. Asserts badge `tagName === 'SPAN'`, `role === 'button'`, `tabindex === '0'`. `fireEvent.keyDown(badge, { key: 'Enter' })` → `expect(onAnomalyScroll).toHaveBeenCalledWith('journals', 0)`.
- **K.2** (new): same setup as K.1 but `fireEvent.keyDown(badge, { key: ' ' })` (literal space) → same expectation.

RED-state verified before commit: 4 failed (S.8 + S.9 expecting SPAN; K.1 + K.2 expecting SPAN + onAnomalyScroll dispatched). 12 passed (S.1–S.7 + S.8a + S.10–S.13 + the S.10 sibling). This is the expected RED shape.

**GREEN commit `0330e18`** — `refactor(15-2): Sidebar anomaly badge -> span role=button with keyboard handler (POL-CODE-03)`

Modified `src/components/shell/Sidebar.tsx` (+35 / −21):

NavButton internal component badge-as-button branch (lines 85-95 pre-refactor; lines 85-103 post-refactor):

```typescript
{badge != null && badge > 0 && onBadgeClick && (
  /* POL-CODE-03 — span role=button silences React's nested-interactive warning; Enter+Space dispatch via onKeyDown. */
  <span
    role="button"
    tabIndex={0}
    aria-label={`Show next anomaly for ${label}`}
    onClick={onBadgeClick}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onBadgeClick();
      }
    }}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold hover:bg-red-600 cursor-pointer"
    data-testid={badgeTestId}
  >
    {badge}
  </span>
)}
```

Tailwind classes preserved verbatim from the pre-refactor `<button>`; `cursor-pointer` added (spans don't get the pointer cursor by default; buttons do). `data-testid={badgeTestId}` + `aria-label={`Show next anomaly for ${label}`}` preserved verbatim. `e.preventDefault()` on Space is mandatory to prevent page-scroll when the badge has focus.

**GREEN-state verified** before commit:
- `npm test -- src/components/__tests__/Sidebar.test.tsx` → **16 GREEN** (14 pre-existing + 2 new keyboard-a11y).
- `npm test` (full suite) → **1189 SPA GREEN + 11 todo + 0 RED** (+2 from 1187 baseline).
- `grep -n 'role="button"' src/components/shell/Sidebar.tsx` → 1 match (line 88 — the badge span).
- `grep -n 'onKeyDown' src/components/shell/Sidebar.tsx` → 1 match (line 92 — the badge handler).

### Task 2 — POL-CODE-04: entity-type-aware tax-nav filter (TDD RED + GREEN)

**Pre-work** (per VERIFICATION round 1 + planner flag #3): Read `src/storage/demo-seed.ts` to confirm the demo entity type discriminator. Confirmed line 38: `type: 'SoleTrader'`. This validates the planned defensive switch that treats SoleTrader equivalently to Individual for Form-I purposes.

**RED commit `f67a0c3`** — `test(15-2): RED — Sidebar entity-type tax-nav filter (POL-CODE-04)`

Appended to `src/components/__tests__/Sidebar.test.tsx` — new describe `'Sidebar POL-CODE-04 — entity-type-aware tax-nav filter'` with 8 tests (ET.1–ET.8, where ET.7 is an `it.each` parametric expanding to 4 cases):

- **ET.1 (Individual):** Tax Assistant present; Company Tax + Trust Tax absent; BAS present.
- **ET.2 (Company):** Company Tax present; Tax Assistant + Trust Tax absent; BAS present.
- **ET.3 (Trust):** Trust Tax present; Tax Assistant + Company Tax absent; BAS present.
- **ET.4 (Partnership):** none of the 3 specialised tax sections; BAS present (universal lock).
- **ET.5 (SoleTrader):** Tax Assistant present (demo-seed discriminator equivalence); other 2 absent.
- **ET.6 (no active entity):** none of the 4 tax-section entries render (existing Phase 6 behaviour preserved).
- **ET.7 (BAS/IAS universal):** `it.each(['Individual', 'Company', 'Trust', 'Partnership'])` parametric — 4 cases — BAS always present.
- **ET.8 (Entity Dashboard universal):** type='Partnership' → Entity Dashboard button still present (proves non-tax entries are NOT type-filtered).

RED-state verified before commit: 5 failed (ET.1–ET.5 — pre-refactor code renders all 3 tax sections unconditionally). 22 passed (ET.6 no-entity case already correct; ET.7 parametric × 4 all green because BAS was already universal; ET.8 already correct).

**GREEN commit `3beb530`** — `feat(15-2): entity-type-aware tax-nav filter in Sidebar (POL-CODE-04)`

Modified `src/components/shell/Sidebar.tsx` entity-scoped block (lines 275-298 pre-refactor; lines 283-306 post-refactor): replaced the 4 unconditional NavButtons (Tax Assistant / Company Tax / Trust Tax / BAS & IAS) with 3 conditional NavButtons + 1 unconditional BAS:

```typescript
{/* POL-CODE-04 — tax-section nav entries filter by activeEntity.type. Partnership has no Form P view today; BAS/IAS universal. */}
{(activeEntity.type === 'Individual' || activeEntity.type === 'SoleTrader') && (
  <NavButton active={view === 'tax-return'} onClick={() => setView('tax-return')} icon={<Calculator size={18} />} label="Tax Assistant" />
)}
{activeEntity.type === 'Company' && (
  <NavButton active={view === 'company-tax'} onClick={() => setView('company-tax')} icon={<Building2 size={18} />} label="Company Tax" />
)}
{activeEntity.type === 'Trust' && (
  <NavButton active={view === 'trust-tax'} onClick={() => setView('trust-tax')} icon={<Landmark size={18} />} label="Trust Tax" />
)}
{/* BAS/IAS — universal across all entity types. GST applies regardless of type. */}
<NavButton active={view === 'bas-ias'} onClick={() => setView('bas-ias')} icon={<FileSpreadsheet size={18} />} label="BAS & IAS" />
```

Entity Dashboard / Journal Entries / Trial Balance / Accounts / Import TB stay UNCONDITIONAL inside the activeEntity block (universal across types).

**GREEN-state verified** before commit:
- `npm test -- src/components/__tests__/Sidebar.test.tsx` → **27 GREEN** (14 pre-existing + 2 K.* + 11 ET.* expansions).
- `npm test` (full suite) → **1200 SPA GREEN + 11 todo + 0 RED** (+11 from 1189 baseline: ET.1–6 = 6, ET.7 parametric × 4 = 4, ET.8 = 1).
- `grep -cE "activeEntity\.type === '(Individual|Company|Trust|SoleTrader)'" src/components/shell/Sidebar.tsx` → 3 matches (Individual+SoleTrader on one line; Company; Trust).
- `grep -n "label=\"BAS" src/components/shell/Sidebar.tsx` → 1 match (still rendered).

### Task 3 — POL-CODE-05: Settings Active Entity section + ViewRouter wiring (TDD RED + GREEN)

**RED commit `4312158`** — `test(15-2): RED — Settings Active Entity section (POL-CODE-05)`

Appended to `src/components/__tests__/Settings.test.tsx` — new describe `'Settings POL-CODE-05 — Active Entity section'` with 3 tests:

- **SET.5 (activeEntity present):** Asserts heading `Active Entity`, entity name `Acme Pty Ltd` visible, button `Edit Entity Details` present.
- **SET.6 (activeEntity undefined):** Asserts heading still present, copy `No active entity selected` + hint `Select an entity from the Master Dashboard to edit` visible, NO `Edit Entity Details` button.
- **SET.7 (button click):** Renders with `activeEntity={entityA}` + `onEditActiveEntity={vi.fn()}`; clicks button; expects callback called once.

RED-state verified before commit: 3 failed (SET.5 + SET.6 fail at heading-not-found; SET.7 fails at button-not-found). 4 passed (SET.1–SET.4 unchanged).

**GREEN commit `b9f6005`** — `feat(15-2): Settings Active Entity section duplicates Edit Entity Details (POL-CODE-05)`

Modified `src/components/Settings.tsx` (+30 / −0):

1. **SettingsProps widened** with two new optional props:
   ```typescript
   /** Phase 15 POL-CODE-05 — currently-active entity (looked up by ViewRouter from activeEntityId). */
   activeEntity?: Entity;
   /** Phase 15 POL-CODE-05 — invoked when the Active Entity Edit button is clicked; delegates to setView('edit-entity'). */
   onEditActiveEntity?: () => void;
   ```

2. **Function signature destructure** widened with `activeEntity` + `onEditActiveEntity`.

3. **New section inserted** between Primary Entity (lines 54-82) and First-Run Prompt (line 84):
   ```typescript
   <section className="bg-white border border-[var(--line-strong)] p-6 space-y-3">
     <h3 className="font-bold text-sm uppercase tracking-wider">Active Entity</h3>
     {activeEntity ? (
       <>
         <p className="text-sm">
           {activeEntity.name}
           <span className="text-xs text-gray-400 ml-2">({activeEntity.type})</span>
         </p>
         <button
           data-testid="settings-edit-active-entity"
           onClick={() => onEditActiveEntity?.()}
           className="text-sm text-blue-600 hover:underline font-medium"
         >
           Edit Entity Details
         </button>
       </>
     ) : (
       <>
         <p className="text-sm text-gray-500">No active entity selected</p>
         <p className="text-xs text-gray-400">Select an entity from the Master Dashboard to edit</p>
       </>
     )}
   </section>
   ```

   Section always renders (not gated on mode or entity count); the empty-state branch handles the no-entity case.

Modified `src/components/ViewRouter.tsx` (+2 / −0): widened Settings invocation:
```typescript
{view === 'settings' && setSettings && clearSettings && (
  <Settings
    settings={settings ?? null}
    onChange={setSettings}
    onClearSettings={clearSettings}
    entities={entities}
    activeEntity={activeEntity}
    onEditActiveEntity={() => setView('edit-entity')}
  />
)}
```

`activeEntity` reused from existing `const activeEntity = entities.find((e) => e.id === activeEntityId);` at line 594. `setView` already a ViewRouter prop. No App.tsx changes needed.

ViewRouter:179 header "Edit Entity Details" button stays UNCHANGED — verified by leaving lines 178-183 out of the modification path.

**GREEN-state verified** before commit:
- `npm test -- src/components/__tests__/Settings.test.tsx` → **7 GREEN** (4 pre-existing + 3 new Active Entity section).
- `npm test` (full suite) → **1203 SPA GREEN + 11 todo + 0 RED** (+3 from 1200 baseline).
- `npm run lint` → EXIT 0.
- `npm run build` → EXIT 0 with `scan-aiza: OK — no Gemini key shapes in dist/`.
- `grep -n 'Active Entity' src/components/Settings.tsx` → present (line 93 heading).
- `grep -n 'setView..edit-entity' src/components/ViewRouter.tsx` → 3 matches (line 179 existing header button + line 675 existing internal flow + line 824 new Settings wiring; the :179 invariant preserved).
- `git diff src/App.tsx` (scoped to this plan) → empty (no source-level changes; wiring inside ViewRouter only).

## Test Count Delta

| Boundary                               | SPA GREEN | Todo | RED | Test files |
| -------------------------------------- | --------- | ---- | --- | ---------- |
| Pre-Plan-15-2 baseline (post-15-1)     | 1187      | 11   | 0   | 124        |
| Post Task 1 GREEN commit `0330e18`     | 1189      | 11   | 0   | 124        |
| Post Task 2 GREEN commit `3beb530`     | 1200      | 11   | 0   | 124        |
| Post Task 3 GREEN commit `b9f6005`     | **1203**  | 11   | 0   | 124        |

**Net delta this plan: +16 SPA GREEN** (1187 → 1203):
- Task 1: +2 (K.1 + K.2 keyboard-a11y)
- Task 2: +11 (ET.1 + ET.2 + ET.3 + ET.4 + ET.5 + ET.6 = 6; ET.7 parametric × 4 = 4; ET.8 = 1)
- Task 3: +3 (SET.5 + SET.6 + SET.7)

Test count lands at 1203, slightly above the planner's projected window of 1195-1198 — the surplus comes from the ET.7 parametric `it.each` expanding to 4 named cases (the plan range assumed possible collapse via `it.each`, but the parametric still counts each case independently in the test runner; the plan's collapse-projection arithmetic over-counted the collapse benefit at this collapse-step). Outcome is more tests, not fewer — within tolerance.

## Commits

| # | Hash      | Type      | Files                                                              | Co-Author |
| - | --------- | --------- | ------------------------------------------------------------------ | --------- |
| 1 | `7394346` | test      | src/components/__tests__/Sidebar.test.tsx (MODIFIED, +49 / −11)    | Claude Opus 4.7 |
| 2 | `0330e18` | refactor  | src/components/shell/Sidebar.tsx (MODIFIED, +35 / −21)             | Claude Opus 4.7 |
| 3 | `f67a0c3` | test      | src/components/__tests__/Sidebar.test.tsx (MODIFIED, +65 / −0)     | Claude Opus 4.7 |
| 4 | `3beb530` | feat      | src/components/shell/Sidebar.tsx (MODIFIED, +26 / −18)             | Claude Opus 4.7 |
| 5 | `4312158` | test      | src/components/__tests__/Settings.test.tsx (MODIFIED, +52 / −0)    | Claude Opus 4.7 |
| 6 | `b9f6005` | feat      | src/components/Settings.tsx (MODIFIED, +30 / −0) + src/components/ViewRouter.tsx (MODIFIED, +2 / −0) | Claude Opus 4.7 |
| 7 | (this commit) | docs  | 15-2-SUMMARY.md + STATE.md + ROADMAP.md + REQUIREMENTS.md          | Claude Opus 4.7 |

Total: **6 source commits + 1 metadata commit = 7 commits** on `origin/main` from Plan 15-2.

## CI Verification

All 3 task pushes triggered GitHub Actions CI runs via anonymous probe of the public-repo Actions API (Plan 15-1 collateral benefit):

| # | Head SHA  | Run ID       | Status     | Conclusion | Wall-clock |
| - | --------- | ------------ | ---------- | ---------- | ---------- |
| 1 | `0330e18` | 26850183649  | completed  | success    | ~2 min     |
| 2 | `3beb530` | 26850324590  | completed  | success    | ~2 min     |
| 3 | `b9f6005` | 26850496912  | completed  | success    | ~2 min     |

Probed via `Invoke-WebRequest https://api.github.com/repos/tech-taitan/AussieLedger/actions/runs?per_page=1` — anonymous, no auth, since Plan 15-1's repo-flip made the Actions runs publicly readable.

## Architecture Invariants Verified

| # | Invariant                                                                  | Status | Evidence |
| - | -------------------------------------------------------------------------- | ------ | -------- |
| a | StorageAdapter interface FINAL (12 methods unchanged)                      | GREEN  | src/storage/adapter.ts untouched (not in files_modified); this plan is shell-UI only |
| b | DisclaimerFooter Phase 01 verbatim copy preserved                          | GREEN  | src/components/shell/DisclaimerFooter.tsx untouched |
| c | PrivacyPage non-AI bullets byte-identical                                  | GREEN  | src/components/PrivacyPage.tsx untouched |
| d | POL-CODE-03 Sidebar visual byte-identical                                  | GREEN  | All Tailwind classes preserved verbatim on the badge span; cursor-pointer added (only addition); data-testid + aria-label preserved verbatim |
| e | POL-CODE-04 BAS/IAS always universal                                       | GREEN  | BAS NavButton rendered UNCONDITIONAL inside activeEntity block; ET.7 parametric × 4 entity types all assert BAS present |
| f | POL-CODE-05 ViewRouter.tsx:179 header button UNCHANGED (duplicate, not move) | GREEN  | git diff src/components/ViewRouter.tsx scoped to this plan touches only the Settings invocation at line 818-826 (now line 818-828); lines 178-183 untouched; `grep -n "setView..edit-entity" ViewRouter.tsx` shows 3 matches incl. the preserved :179 button |
| g | No `new Date()` outside src/lib/period.ts (Phase 2 + Phase 11 lint)        | GREEN  | None of the 5 modified files introduce timestamp logic; structural-lint-period.test.ts stays GREEN |
| h | No new dependencies (no `npm install`)                                     | GREEN  | package.json untouched |
| i | CSP / vercel.json unchanged                                                | GREEN  | vercel.json untouched |
| j | AIza scan still passes (build EXIT 0)                                      | GREEN  | `scan-aiza: OK — no Gemini key shapes in dist/` in Task 3 build log |
| k | SPDX header invariant — no new source files                                | GREEN  | All 5 files are MODIFIED; no created files; SPDX parametric test row count unchanged |
| l | Conventional Commits + Co-Authored-By                                      | GREEN  | All 6 source commits + this metadata commit follow `type(scope): subject` + Co-Authored-By footer |
| m | App.tsx no-source-diff (wiring inside ViewRouter only)                     | GREEN  | git diff src/App.tsx scoped to this plan is empty |

**All 13 invariants: GREEN.**

## Deviations from Plan

### Auto-fixed Issues
None. Plan executed exactly as written; both planner-flagged hazards (the demo-seed discriminator + the S.8/S.9 BUTTON→SPAN test-update) were embedded in the plan and discharged on schedule.

### Authentication Gates
None. Plan 15-2 had no checkpoints; both source commits per task were pushed directly to origin/main, CI probed anonymously via the public-repo REST API (Plan 15-1 collateral benefit).

### Test-count Variance
**+16 vs planner's projected +10-13 window (1195-1198).** Source: the ET.7 `it.each(['Individual', 'Company', 'Trust', 'Partnership'])` parametric expanded to 4 named test cases (each counted independently by the test runner), and the plan's projection assumed possible collapse into ≤1 reported case. Outcome is MORE coverage than projected (one assertion per entity type, individually addressable in failure reports). No remediation required.

### Plan-Spec Acceptable-Variance Outcomes (logged for transparency; not deviations)
- The plan called out that POL-CODE-04 might collapse via `it.each` from 13 expected tests down to 10. Implementation used `it.each` for ET.7 only (the BAS/IAS-universal-across-types check), which keeps the 4 cases addressable while consolidating the body. ET.5 (SoleTrader) was kept as a discrete test rather than folded into a parametric — it carries non-trivial setup commentary about the demo-seed equivalence decision.

## Self-Check: PASSED

- File `src/components/shell/Sidebar.tsx` — FOUND (badge span + entity-type filters present)
- File `src/components/__tests__/Sidebar.test.tsx` — FOUND (27 tests, 2 keyboard-a11y + 11 entity-filter assertions added)
- File `src/components/Settings.tsx` — FOUND (Active Entity section present at line 91-115; new props on SettingsProps interface)
- File `src/components/__tests__/Settings.test.tsx` — FOUND (7 tests, 3 Active Entity section assertions added)
- File `src/components/ViewRouter.tsx` — FOUND (Settings invocation widened at lines 817-826; :179 header button untouched)
- Commit `7394346` — FOUND on origin/main
- Commit `0330e18` — FOUND on origin/main; CI run 26850183649 conclusion=success
- Commit `f67a0c3` — FOUND on origin/main
- Commit `3beb530` — FOUND on origin/main; CI run 26850324590 conclusion=success
- Commit `4312158` — FOUND on origin/main
- Commit `b9f6005` — FOUND on origin/main; CI run 26850496912 completed conclusion=success (final probe at metadata-commit time)
- All 13 architecture invariants GREEN
- All 5 plan success criteria GREEN (POL-CODE-03 + 04 + 05 closed end-to-end + 1203 SPA GREEN + 0 visual regressions + 0 dependency additions + ViewRouter:179 preserved)

Plan 15-2 closed; Phase 15 ready for milestone audit (or v1.3 close via /gsd:audit-milestone v1.3 after Phase 16).
