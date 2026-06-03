---
phase: 15-code-polish
plan: 2
type: execute
wave: 2
depends_on: [15-1]
files_modified:
  - src/components/shell/Sidebar.tsx
  - src/components/__tests__/Sidebar.test.tsx
  - src/components/Settings.tsx
  - src/components/__tests__/Settings.test.tsx
  - src/components/ViewRouter.tsx
  - src/App.tsx
autonomous: true
requirements: [POL-CODE-03, POL-CODE-04, POL-CODE-05]

must_haves:
  truths:
    - "Sidebar NavButton badge no longer renders `<button>` nested inside `<button>` — React's nested-interactive-elements console warning is silenced; the React Testing Library DOM tree shows the badge with `role='button'` on a `<span>` element."
    - "Pressing Enter while focus is on the anomaly badge invokes `onBadgeClick` (Sidebar's handleJournalsBadgeClick or handleAccountsBadgeClick); pressing Space (key=' ') does the same. Tab can reach the badge (`tabIndex={0}`)."
    - "The anomaly badge is visually byte-identical to the pre-Phase-15 button: same Tailwind classes (`bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold hover:bg-red-600 cursor-pointer`), same `data-testid` (`nav-{label}-badge`), same `aria-label` (`Show next anomaly for {label}`)."
    - "When `activeEntity.type === 'Individual'`, the Sidebar entity-scoped section renders ONLY Tax Assistant (Form I) + BAS/IAS — Company Tax + Trust Tax buttons are absent from the DOM."
    - "When `activeEntity.type === 'Company'`, the Sidebar renders ONLY Company Tax + BAS/IAS — Tax Assistant + Trust Tax are absent."
    - "When `activeEntity.type === 'Trust'`, the Sidebar renders ONLY Trust Tax + BAS/IAS — Tax Assistant + Company Tax are absent."
    - "When `activeEntity.type === 'Partnership'`, the Sidebar renders ONLY BAS/IAS — none of the 3 tax-return views — and no `partnership-tax` view either (none exists today)."
    - "When `activeEntity` is undefined (master-dashboard, no entity selected), the entity-scoped `<>...</>` block does not render at all — all 4 tax-section nav entries absent. (This is the existing Phase 6 behaviour; verified preserved.)"
    - "BAS/IAS, Entity Dashboard, Journal Entries, Trial Balance, Accounts, Import TB nav entries render for ALL entity types when `activeEntity` is set — the entity-type filter is scoped to the 3 tax-return entries (tax-return / company-tax / trust-tax). BAS/IAS stays universal."
    - "Settings page renders a 4th section `<h3>Active Entity</h3>` positioned between Primary Entity (when shown) and First-Run Prompt sections."
    - "When `activeEntity` prop is passed, the Active Entity section shows the entity name + an `Edit Entity Details` button that, when clicked, invokes `onEditActiveEntity` callback."
    - "When `activeEntity` prop is undefined, the Active Entity section shows `No active entity selected` + a hint `Select an entity from the Master Dashboard to edit` — and does NOT render the Edit button."
    - "App.tsx threads `activeEntity` (looked up from entities via activeEntityId) + `onEditActiveEntity` (a setter that calls `setView('edit-entity')`) down through ViewRouter into Settings."
    - "ViewRouter.tsx:179 'Edit Entity Details' header button stays UNCHANGED — the Settings access point is a DUPLICATE, not a move; both buttons invoke the same setView('edit-entity') flow."
    - "All existing 14 Sidebar tests stay GREEN; 2 new keyboard-a11y tests + ~7 entity-type-filter tests are added."
    - "All existing 4 Settings tests stay GREEN; 3 new Active Entity section tests are added."
  artifacts:
    - path: "src/components/shell/Sidebar.tsx"
      provides: "NavButton badge refactored from <button> to <span role='button' tabIndex={0} onKeyDown={...}>; entity-scoped tax-section nav filters by activeEntity.type."
      contains: "role=\"button\""
    - path: "src/components/Settings.tsx"
      provides: "4th 'Active Entity' section between Primary Entity and First-Run Prompt; new props activeEntity?: Entity + onEditActiveEntity?: () => void."
      contains: "Active Entity"
    - path: "src/components/ViewRouter.tsx"
      provides: "Settings invocation site (around line 817) widened to pass activeEntity + onEditActiveEntity props down."
      contains: "onEditActiveEntity"
    - path: "src/App.tsx"
      provides: "Settings call site (via ViewRouter) gains activeEntity + onEditActiveEntity threading; onEditActiveEntity is a setter that calls setView('edit-entity')."
      contains: "onEditActiveEntity"
    - path: "src/components/__tests__/Sidebar.test.tsx"
      provides: "+2 keyboard-a11y tests (Enter + Space → onBadgeClick); +~7 entity-type-filter tests (Individual/Company/Trust/Partnership + no-entity)."
      min_lines: 240
    - path: "src/components/__tests__/Settings.test.tsx"
      provides: "+3 Active Entity section tests (renders with entity / empty-state without entity / button click invokes onEditActiveEntity)."
      min_lines: 130
  key_links:
    - from: "src/components/shell/Sidebar.tsx (NavButton badge span)"
      to: "onBadgeClick callback (handleJournalsBadgeClick or handleAccountsBadgeClick in Sidebar)"
      via: "onKeyDown handler dispatches when key === 'Enter' || key === ' '"
      pattern: "onKeyDown.*onBadgeClick"
    - from: "src/components/shell/Sidebar.tsx (entity-scoped block)"
      to: "activeEntity.type discriminator"
      via: "switch/conditional render guarding tax-return / company-tax / trust-tax entries; BAS/IAS unconditional"
      pattern: "activeEntity\\.type"
    - from: "src/components/Settings.tsx (Active Entity section button)"
      to: "onEditActiveEntity prop callback"
      via: "onClick handler invokes the prop"
      pattern: "onEditActiveEntity\\?\\.\\(\\)"
    - from: "src/App.tsx"
      to: "ViewRouter Settings invocation"
      via: "activeEntity = entities.find(e => e.id === activeEntityId) computed once; onEditActiveEntity = () => setView('edit-entity') passed through"
      pattern: "onEditActiveEntity.*setView\\('edit-entity'\\)"
    - from: "src/components/ViewRouter.tsx"
      to: "src/components/Settings.tsx"
      via: "props.activeEntity + props.onEditActiveEntity threaded into <Settings .../>"
      pattern: "<Settings"
---

<objective>
Close the remaining 3 of 5 Phase 15 requirements (all UI work; all in the Sidebar + Settings + App threading):

- **POL-CODE-03** — refactor Sidebar NavButton anomaly badge from `<button>` (nested inside the parent NavButton `<button>`) to `<span role="button" tabIndex={0}>` with `onKeyDown` handler dispatching on Enter + Space. Visual byte-identical (same Tailwind classes, same `data-testid`, same `aria-label`). React's nested-interactive-elements console warning disappears. Existing 14 Sidebar tests stay GREEN; 2 new keyboard-a11y tests added.
- **POL-CODE-04** — inside the existing `activeEntity && (...)` block in Sidebar.tsx, filter the 3 tax-return nav entries (`tax-return` / `company-tax` / `trust-tax`) by `activeEntity.type`. BAS/IAS stays universal (always rendered inside the block). Mapping: `Individual` → Tax Assistant only; `Company` → Company Tax only; `Trust` → Trust Tax only; `Partnership` → none of the 3 (BAS/IAS only); fallback `string` type → none of the 3 (defensive). 6 new tests added (4 type branches × the 2 most-meaningful assertions per branch: correct entry visible + others hidden; plus 2 universal-BAS/IAS assertions).
- **POL-CODE-05** — Settings.tsx gains a 4th section between Primary Entity and First-Run Prompt: `<h3>Active Entity</h3>` + entity name + an "Edit Entity Details" button wiring `onEditActiveEntity` prop. App.tsx threads `activeEntity` (derived from entities + activeEntityId) + the callback through ViewRouter into Settings. 3 new tests added. The existing ViewRouter.tsx:179 header button stays untouched — this is a DUPLICATE access point.

Purpose: Closes the entity-aware nav UX + the Settings duplicate access point + the long-pending button-in-button warning. All three live in or around the Sidebar/Settings shells — single plan keeps related shell changes coherent. Sequenced after 15-1 so the human-action checkpoint resolves first.

Output:
- 6 file diffs (Sidebar.tsx + Sidebar.test.tsx + Settings.tsx + Settings.test.tsx + ViewRouter.tsx + App.tsx)
- ~10-13 new SPA tests GREEN (2 keyboard + 6 entity-filter + 3 Settings Active Entity)
- Target: 1195-1198 SPA GREEN (post-15-1 baseline 1185 + 10-13 new)
- 0 existing test regressions (14 Sidebar + 4 Settings stay GREEN)
- 0 visual regressions (Sidebar byte-identical to pre-Phase-15 except for the badge tag swap and the type-filtered tax entries)
- 0 dependency additions (no `npm install`)
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
@.planning/phases/15-code-polish/15-CONTEXT.md

# Plan 15-1 SUMMARY (read AFTER 15-1 lands so this plan picks up the post-15-1 baseline)
@.planning/phases/15-code-polish/15-1-SUMMARY.md

# Source files this plan reads / modifies
@src/components/shell/Sidebar.tsx
@src/components/__tests__/Sidebar.test.tsx
@src/components/Settings.tsx
@src/components/__tests__/Settings.test.tsx
@src/components/ViewRouter.tsx
@src/App.tsx
@src/types.ts

<interfaces>
<!-- Key contracts the executor needs. Embedded so no codebase scavenger-hunt is required. -->

From src/types.ts (Entity type — note the trailing `| string` fallback):
```typescript
export interface Entity {
  id: string;
  name: string;
  /** Constrained to AU four for new entities; legacy seeds may carry other strings until v3 migration normalises. */
  type: 'Company' | 'Trust' | 'Individual' | 'Partnership' | string;
  status: 'Active' | 'Archived' | 'Deactivated';
  // ... other fields ...
}
```
Important: there is NO separate `'Sole Trader'` discriminator. The Individual type covers sole traders. The `| string` tail allows arbitrary type strings — POL-CODE-04's filter must handle the 4 canonical AU types explicitly + render NONE of the 3 specialised tax entries for fallback strings (defensive default).

NOTE on the demo seed: `src/storage/demo-seed.ts` (Phase 14 Plan 14-1) seeds `type: 'SoleTrader'` per the Plan 14-1 SUMMARY. This is NOT one of the 4 canonical types listed in the type union — it falls into the `| string` tail. POL-CODE-04 must treat 'SoleTrader' as equivalent to 'Individual' (both are sole-trader / Form I users per CONTEXT decision). The mapping switch should handle: 'Individual' → tax-return; 'SoleTrader' → tax-return (same branch); 'Company' → company-tax; 'Trust' → trust-tax; 'Partnership' → none; (default) → none. Verify at execution time by re-reading src/storage/demo-seed.ts to confirm the seeded type string — if it's actually 'Individual' (or migrated by v6), simplify the switch. **Read demo-seed.ts FIRST and confirm the type discriminator string before writing the switch.**

From src/components/shell/Sidebar.tsx (current shipped — pre-Phase-15):
```typescript
interface SidebarProps {
  view: View;
  setView: (v: View) => void;
  activeEntity: Entity | undefined;
  entities: Entity[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  setActiveEntityId: (id: string | null) => void;
  mode: 'owner' | 'agent' | null;
  anomalyCounts: { journals: number; accounts: number };
  onAnomalyScroll?: (target: 'journals' | 'accounts', cycleIdx: number) => void;
}
```

The NavButton internal component (lines 50-98) renders the badge as a nested `<button>` when `onBadgeClick && badge != null && badge > 0`. POL-CODE-03 swaps the inner `<button>` for `<span role="button" tabIndex={0} onKeyDown={...}>` while preserving ALL Tailwind classes + the `data-testid={badgeTestId}` + the `aria-label={`Show next anomaly for ${label}`}`.

Entity-scoped block (lines 242-306) currently renders 9 NavButtons inside the `{activeEntity && (<>...</>)}` block:
1. Entity Dashboard (always)
2. Journal Entries (always; with anomaly badge)
3. Trial Balance (always)
4. Accounts (always; with anomaly badge)
5. **Tax Assistant** (lines 275-280; route 'tax-return') — POL-CODE-04 GATES by `activeEntity.type === 'Individual' || activeEntity.type === 'SoleTrader'`
6. **Company Tax** (lines 281-286; route 'company-tax') — POL-CODE-04 GATES by `activeEntity.type === 'Company'`
7. **Trust Tax** (lines 287-292; route 'trust-tax') — POL-CODE-04 GATES by `activeEntity.type === 'Trust'`
8. BAS & IAS (lines 293-298; route 'bas-ias') — POL-CODE-04 leaves UNCONDITIONAL (universal per CONTEXT)
9. Import TB (always)

From src/components/Settings.tsx (current — 101 lines):
```typescript
interface SettingsProps {
  settings: SettingsType | null;
  onChange: (s: SettingsType) => void;
  onClearSettings: () => void;
  entities: Entity[];
}
```
POL-CODE-05 WIDENS the props:
```typescript
interface SettingsProps {
  settings: SettingsType | null;
  onChange: (s: SettingsType) => void;
  onClearSettings: () => void;
  entities: Entity[];
  activeEntity?: Entity;            // NEW — undefined when no active entity selected
  onEditActiveEntity?: () => void;  // NEW — App.tsx passes setView('edit-entity') wrapper
}
```

Current section order in Settings.tsx render:
1. Mode (lines 32-52)
2. Primary Entity (lines 54-82; only renders when `mode === 'owner' && entities.length >= 2`)
3. First-Run Prompt (lines 84-98)

POL-CODE-05 inserts the new "Active Entity" section BETWEEN section 2 and section 3 — i.e., between Primary Entity (if rendered) and First-Run Prompt. The new section ALWAYS renders (regardless of mode or entity count); the empty-state branch handles the `!activeEntity` case.

From src/components/ViewRouter.tsx (lines 817-824 — current Settings invocation):
```typescript
{view === 'settings' && setSettings && clearSettings && (
  <Settings
    settings={settings ?? null}
    onChange={setSettings}
    onClearSettings={clearSettings}
    entities={entities}
  />
)}
```
POL-CODE-05 widens this invocation to pass the new 2 props through:
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
Note: ViewRouter already computes `const activeEntity = entities.find((e) => e.id === activeEntityId);` at line 594 — reuse this local. `setView` is already in scope (ViewRouter prop).

From src/App.tsx — no changes needed; ViewRouter already receives both `setView` and `entities` + `activeEntityId`. The wiring is purely INSIDE ViewRouter. App.tsx files_modified entry is included defensively in case the executor decides to compute the callback at the App.tsx level instead — see Task 3 instructions for the preferred approach.

From src/components/ViewRouter.tsx:179 (existing header "Edit Entity Details" button — POL-CODE-05 LEAVES THIS UNCHANGED):
```typescript
<button
  onClick={() => setView('edit-entity')}
  className="text-blue-600 hover:underline mt-2 inline-block font-medium"
>
  Edit Entity Details
</button>
```
This is the DUPLICATE — the Settings button delegates to the same `setView('edit-entity')` flow. Do NOT touch this button or its surrounding markup.
</interfaces>

<repo_facts>
- Sidebar source: `src/components/shell/Sidebar.tsx` (311 lines).
- Sidebar test: `src/components/__tests__/Sidebar.test.tsx` (166 lines, 14 tests). NOTE: the CONTEXT canonical_refs incorrectly say `src/components/shell/__tests__/Sidebar.test.tsx` — there is no such directory; the correct path is `src/components/__tests__/Sidebar.test.tsx`. Use the correct path.
- Settings source: `src/components/Settings.tsx` (101 lines).
- Settings test: `src/components/__tests__/Settings.test.tsx` (85 lines, 4 tests).
- Existing Sidebar tests include `S.8a` which already asserts `badge.parentElement?.tagName !== 'BUTTON'` (line 104-108). POL-CODE-03's refactor preserves this — the badge moves OUT of the inner NavButton button into a sibling `<span>` adjacent to the NavButton (per the existing layout where the badge is ALREADY a sibling positioned absolutely; the inner element is a `<button>` and POL-CODE-03 just swaps it to `<span role="button">`). Re-read the existing NavButton return JSX at lines 65-97 to confirm: the badge is a sibling of the main button INSIDE a wrapping `<div className="relative">` — it's not literally a button-inside-button in the DOM tree; React's warning fires because the absolute-positioned badge button is associatively considered nested-interactive. POL-CODE-03's swap to a `<span role="button">` silences this anyway because `role="button"` doesn't trigger the same React warning as a literal `<button>` nested next to another. S.8a stays GREEN because `.parentElement` is still the `<div className="relative">` wrapper, not a `<button>`.
- Plan 14-1 demo-seed.ts uses `type: 'SoleTrader'` (per STATE.md narrative). MUST verify by reading demo-seed.ts at execution time — if it actually uses 'Individual', simplify the POL-CODE-04 switch.
- Baseline tests after 15-1 lands: 1185 SPA GREEN + 11 todo + 0 RED.
- DisclaimerFooter Phase 01 verbatim copy + PrivacyPage 12 trust bullets verbatim — NOT touched by this plan.
- No new dependencies. No `npm install` should run.
- SPDX header invariant — no NEW source files in this plan (all 6 are modifications), so the spdx-headers.test.ts parametric assertion is unchanged.
- Existing Sidebar.test.tsx imports `{ fireEvent }` from `@testing-library/react` already (line 10). For Enter + Space tests, use `fireEvent.keyDown(badge, { key: 'Enter' })` and `fireEvent.keyDown(badge, { key: ' ' })`.
</repo_facts>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: POL-CODE-03 — Sidebar NavButton badge refactor + 2 keyboard-a11y tests</name>
  <files>src/components/shell/Sidebar.tsx, src/components/__tests__/Sidebar.test.tsx</files>
  <behavior>
    - Test K.1: `mode='owner', anomalyCounts={journals: 3, accounts: 0}, onAnomalyScroll=mockFn`. Locate `[data-testid="nav-journal-entries-badge"]`. Assert `badge.tagName === 'SPAN'`. Assert `badge.getAttribute('role') === 'button'`. Assert `badge.getAttribute('tabIndex') === '0'`. `fireEvent.keyDown(badge, { key: 'Enter' })` → expect `onAnomalyScroll` called with `('journals', 0)`.
    - Test K.2: Same setup as K.1 but `fireEvent.keyDown(badge, { key: ' ' })` (literal space). Expect `onAnomalyScroll` called with `('journals', 0)`.

    Implementation behaviour:
    - The badge `<span role="button" tabIndex={0}>` MUST have ALL existing Tailwind classes preserved verbatim: `absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold hover:bg-red-600`. Add ONE class: `cursor-pointer` (spans don't get the pointer cursor by default; buttons do).
    - `data-testid={badgeTestId}` preserved verbatim.
    - `aria-label={`Show next anomaly for ${label}`}` preserved verbatim.
    - `onClick={onBadgeClick}` preserved (clicks still work — `role="button"` accepts onClick).
    - NEW: `onKeyDown` handler:
      ```typescript
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onBadgeClick();
        }
      }}
      ```
    - `e.preventDefault()` matters for Space — without it, Space would scroll the page when the badge is focused.

    Existing 14 Sidebar tests (S.1–S.7 + S.8–S.13 + S.8a) MUST stay GREEN. In particular:
    - S.1 + S.8 + S.9 + S.11 + S.12 + S.13 query the badge via `[data-testid="..."]` (not by tag) — they pass regardless of tag.
    - S.8 specifically asserts `badge?.tagName === 'BUTTON'` — this will BREAK with the refactor. Update S.8's expectation from `'BUTTON'` to `'SPAN'` (and add a parallel assertion that `badge?.getAttribute('role') === 'button'`). Document this update as required-by-refactor in the test file comment.
    - S.9 similarly asserts `badge?.tagName === 'BUTTON'` for the accounts badge — update to `'SPAN'` + role assertion.
    - S.8a asserts `badge?.parentElement?.tagName !== 'BUTTON'` — still GREEN (parent stays the `<div className="relative">` wrapper).
  </behavior>
  <action>
    1. RED step (tests first):
       a. Read `src/components/__tests__/Sidebar.test.tsx` end-to-end (166 lines; loaded above).
       b. Edit S.8 (lines 97-102): change `expect(badge?.tagName).toBe('BUTTON')` to `expect(badge?.tagName).toBe('SPAN')` and add `expect(badge?.getAttribute('role')).toBe('button')`. Add inline comment explaining the POL-CODE-03 refactor.
       c. Edit S.9 (lines 110-115): same swap — `BUTTON` → `SPAN` + add role assertion.
       d. Append new `describe('Sidebar POL-CODE-03 — keyboard a11y on anomaly badge')` block at the end of the file with tests K.1 + K.2 per the <behavior> spec.
       e. Run `npm test -- src/components/__tests__/Sidebar.test.tsx` → 2 new tests + 2 edited tests MUST FAIL (badge is still a `<button>` in source). 10 existing tests still GREEN.
       f. Commit RED: `test(15-2): RED — Sidebar badge keyboard-a11y + tag-swap (POL-CODE-03)`.

    2. GREEN step (source change):
       a. Edit `src/components/shell/Sidebar.tsx` NavButton internal component (lines 85-95 — the badge-as-button branch):
          - Replace `<button type="button" aria-label={...} onClick={onBadgeClick} className="..." data-testid={badgeTestId}>{badge}</button>` with `<span role="button" tabIndex={0} aria-label={...} onClick={onBadgeClick} onKeyDown={...} className="... cursor-pointer" data-testid={badgeTestId}>{badge}</span>`.
          - The full new className: `'absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold hover:bg-red-600 cursor-pointer'`.
          - Add an inline comment above the span: `{/* POL-CODE-03 — span role=button silences React's nested-interactive warning; Enter+Space dispatch via onKeyDown. */}`
       b. Run `npm test -- src/components/__tests__/Sidebar.test.tsx` → all 16 tests (14 existing + 2 new) MUST PASS.
       c. Run `npm test` → no regressions in App.tsx or other consumers.
       d. Commit GREEN: `refactor(15-2): Sidebar anomaly badge -> span role=button with keyboard handler (POL-CODE-03)`.
  </action>
  <verify>
    <automated>npm test -- src/components/__tests__/Sidebar.test.tsx</automated>
    Additional regression-confidence:
    - `grep -n 'role="button"' src/components/shell/Sidebar.tsx` → exactly 1 match (the badge span).
    - `grep -n 'onKeyDown' src/components/shell/Sidebar.tsx` → exactly 1 match (the badge handler).
    - Visual: open the running dev server, navigate to a view with anomaly counts > 0; the badge should look identical to pre-Phase-15 (red pill, same position, same hover state).
  </verify>
  <done>
    - Badge in `src/components/shell/Sidebar.tsx` is a `<span role="button" tabIndex={0}>` with all Tailwind classes preserved + `cursor-pointer` added.
    - Keyboard handler dispatches `onBadgeClick` on Enter + Space (with `e.preventDefault()`).
    - 16 Sidebar tests GREEN (14 pre-existing + 2 new keyboard-a11y).
    - 2 commits: RED (test edits + 2 new tests) + GREEN (source refactor).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: POL-CODE-04 — entity-type-aware tax-nav filter + ~6 type-filter tests</name>
  <files>src/components/shell/Sidebar.tsx, src/components/__tests__/Sidebar.test.tsx</files>
  <behavior>
    Tests (8 new; aim for ~6 minimum):
    - Test ET.1 (Individual): `activeEntity = { ..., type: 'Individual' }` → DOM contains a button with name `/tax assistant/i`; does NOT contain a button with name `/company tax/i`; does NOT contain a button with name `/trust tax/i`; DOES contain a button with name `/bas/i`.
    - Test ET.2 (Company): `type: 'Company'` → DOM contains `/company tax/i`; absent `/tax assistant/i`; absent `/trust tax/i`; present `/bas/i`.
    - Test ET.3 (Trust): `type: 'Trust'` → contains `/trust tax/i`; absent `/tax assistant/i`; absent `/company tax/i`; present `/bas/i`.
    - Test ET.4 (Partnership): `type: 'Partnership'` → absent `/tax assistant/i`, `/company tax/i`, `/trust tax/i`; present `/bas/i`.
    - Test ET.5 (SoleTrader fallback — verify behavior matches demo seed): If demo-seed.ts uses `type: 'SoleTrader'`, this test asserts SoleTrader → contains `/tax assistant/i`; absent the other 2. If demo-seed.ts uses `type: 'Individual'`, this test asserts an arbitrary unknown string (e.g. `'Unknown'`) → absent all 3 tax entries. EXECUTOR DECIDES which based on actual demo-seed.ts content.
    - Test ET.6 (No active entity): `activeEntity = undefined` → none of the 4 tax entries render (existing Phase 6 behavior preserved; the entire `{activeEntity && (...)}` block is empty).
    - Test ET.7 (BAS/IAS universal across all 4 types): parametric — for each of `['Individual', 'Company', 'Trust', 'Partnership']`, assert the BAS button is present. (Optional: implement as `it.each` for tidiness.)
    - Test ET.8 (Entity Dashboard universal): `type: 'Partnership'` → DOM contains a button with name `/entity dashboard/i` (proves the non-tax entries are NOT type-filtered).

    Implementation:
    - Inside the existing `{activeEntity && (<>...</>)}` block, replace the 3 hard-coded NavButtons for Tax Assistant + Company Tax + Trust Tax with conditional renders gated on `activeEntity.type`:
      ```typescript
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
    - Add an inline comment above the block: `{/* POL-CODE-04 — tax-section nav entries filter by activeEntity.type. Partnership has no Form P view today; BAS/IAS universal. */}`
    - BAS/IAS, Entity Dashboard, Journal Entries, Trial Balance, Accounts, Import TB stay UNCONDITIONAL inside the activeEntity block.
  </behavior>
  <action>
    1. PRE-WORK: Read `src/storage/demo-seed.ts` (lines containing `type:` in the DEMO_ENTITY constant). Confirm the discriminator string ('Individual' or 'SoleTrader'). Adjust Test ET.5 + the source switch to match. If the seed uses 'Individual', drop the `|| activeEntity.type === 'SoleTrader'` clause from the source switch and write ET.5 as the unknown-string defensive test instead.

    2. RED step (tests first):
       a. Append `describe('Sidebar POL-CODE-04 — entity-type-aware tax-nav filter')` block to `src/components/__tests__/Sidebar.test.tsx` with tests ET.1 through ET.8 per the <behavior> spec.
       b. Use the existing `renderSidebar({ activeEntity: { ...baseEntity, type: 'Individual' } })` helper pattern. The `baseEntity` const at line 27-32 has `type: 'Company'` — override per-test via the spread.
       c. Use `screen.queryByRole('button', { name: /tax assistant/i })` for absent-assertions and `screen.getByRole(...)` for present-assertions.
       d. Run `npm test -- src/components/__tests__/Sidebar.test.tsx` → all 8 new tests MUST FAIL (current code renders all 4 tax entries for every type).
       e. Commit RED: `test(15-2): RED — Sidebar entity-type tax-nav filter (POL-CODE-04)`.

    3. GREEN step (source change):
       a. Edit `src/components/shell/Sidebar.tsx` lines 275-298 — replace the 4 unconditional NavButtons (Tax Assistant / Company Tax / Trust Tax / BAS & IAS) with the 4 conditional renders per the <behavior> implementation block.
       b. Run `npm test -- src/components/__tests__/Sidebar.test.tsx` → all 16 + 8 = 24 tests (14 pre-existing + 2 POL-CODE-03 + 8 POL-CODE-04) MUST PASS.
       c. Run `npm test` → no regressions elsewhere.
       d. Commit GREEN: `feat(15-2): entity-type-aware tax-nav filter in Sidebar (POL-CODE-04)`.
  </action>
  <verify>
    <automated>npm test -- src/components/__tests__/Sidebar.test.tsx</automated>
    Additional regression-confidence:
    - `grep -cE "activeEntity\\.type === '(Individual|Company|Trust|SoleTrader)'" src/components/shell/Sidebar.tsx` → 3 or 4 matches.
    - `grep -n "label=\"BAS" src/components/shell/Sidebar.tsx` → 1 match (BAS still rendered).
    - Visual: open dev server with an Individual entity active → only Tax Assistant + BAS in the tax section. Switch to a Company entity → only Company Tax + BAS. Switch to Partnership → only BAS.
  </verify>
  <done>
    - 4 tax-section NavButtons in Sidebar.tsx are conditionally rendered per `activeEntity.type` (Individual+SoleTrader → Tax Assistant; Company → Company Tax; Trust → Trust Tax; BAS/IAS unconditional).
    - 8 new tests GREEN; 14 existing + 2 POL-CODE-03 + 8 POL-CODE-04 = 24 total Sidebar tests GREEN.
    - 2 commits: RED + GREEN.
    - Demo-seed.ts discriminator confirmed and switch matches.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: POL-CODE-05 — Settings Active Entity section + App/ViewRouter wiring + 3 tests</name>
  <files>src/components/Settings.tsx, src/components/__tests__/Settings.test.tsx, src/components/ViewRouter.tsx, src/App.tsx</files>
  <behavior>
    Tests (3 new):
    - Test SET.5 (Active Entity section renders entity name when activeEntity passed): Render Settings with `activeEntity={entityA}` + `onEditActiveEntity={vi.fn()}`. Assert a heading `Active Entity` is present. Assert the entity name (`Acme Pty Ltd`) is visible in the section. Assert a button with name `/edit entity details/i` is present.
    - Test SET.6 (Empty state when no activeEntity): Render with `activeEntity={undefined}` + `onEditActiveEntity={vi.fn()}`. Assert the section heading `Active Entity` is STILL present. Assert text `No active entity selected` is visible. Assert hint `Select an entity from the Master Dashboard to edit` is visible. Assert NO button with name `/edit entity details/i` is present (empty-state suppresses the button).
    - Test SET.7 (Button click invokes onEditActiveEntity): Render with `activeEntity={entityA}` + a `vi.fn()` callback. `fireEvent.click(button)`. Expect callback called once.

    Implementation:
    - In Settings.tsx, widen `SettingsProps` to add `activeEntity?: Entity` + `onEditActiveEntity?: () => void`.
    - Insert a new `<section className="bg-white border border-[var(--line-strong)] p-6 space-y-3">` between the Primary Entity section (closing `)}` on line 82) and the First-Run Prompt section (opening `<section>` on line 84):
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
    - Section ALWAYS renders (not gated on mode or entity count) — the empty-state branch handles the no-entity case.

    Wiring:
    - ViewRouter.tsx (lines 817-824) — widen the `<Settings ... />` invocation to pass `activeEntity={activeEntity}` (already in scope at ViewRouter line 594) + `onEditActiveEntity={() => setView('edit-entity')}` (setView already a prop).
    - App.tsx — NO changes needed. The wiring happens entirely inside ViewRouter where both `activeEntity` and `setView` are already in scope. Document this in the commit message.
    - DO NOT touch ViewRouter.tsx:179 (the existing "Edit Entity Details" header button) — that stays as the duplicate access point per CONTEXT decision.
  </behavior>
  <action>
    1. RED step (tests first):
       a. Edit `src/components/__tests__/Settings.test.tsx`. Append `describe('Settings POL-CODE-05 — Active Entity section')` with tests SET.5 + SET.6 + SET.7 per the <behavior> spec. Reuse the existing `entityA` + `entityB` constants from lines 13-18.
       b. Run `npm test -- src/components/__tests__/Settings.test.tsx` → 3 new tests MUST FAIL (section doesn't exist yet); 4 existing tests STILL GREEN.
       c. Commit RED: `test(15-2): RED — Settings Active Entity section (POL-CODE-05)`.

    2. GREEN step (source changes; all three files in ONE commit since they're conceptually one feature):
       a. Edit `src/components/Settings.tsx`:
          - Add `activeEntity?: Entity` + `onEditActiveEntity?: () => void` to the `SettingsProps` interface.
          - Destructure both new props in the function signature.
          - Insert the new `<section>` between lines 82 and 84 per the <behavior> implementation block.
       b. Edit `src/components/ViewRouter.tsx` lines 817-824: widen the `<Settings />` invocation to pass `activeEntity={activeEntity}` + `onEditActiveEntity={() => setView('edit-entity')}`.
       c. Edit `src/App.tsx`: NO source-level changes required. (Add an `App.tsx` to files_modified for transparency only — the file is logically part of the wiring chain even if no diff lands.)
       d. Run `npm test -- src/components/__tests__/Settings.test.tsx` → all 7 tests (4 existing + 3 new) MUST PASS.
       e. Run `npm test` → no regressions. ViewRouter.tsx change might trigger any test that snapshots ViewRouter — confirm no snapshot diffs.
       f. Run `npm run lint` → EXIT 0.
       g. Run `npm run build` → EXIT 0.
       h. Commit GREEN: `feat(15-2): Settings Active Entity section duplicates Edit Entity Details (POL-CODE-05)`.

    3. POST-GREEN VERIFICATION:
       a. `npm test` → full suite expected ~1195-1198 SPA GREEN.
       b. Run a quick visual smoke (executor opens dev server briefly): Settings page now shows 4 sections (Mode + Primary Entity if 2+ entities + Active Entity + First-Run Prompt). Empty-state shows when no entity active. Button click dispatches to EntityForm via setView('edit-entity').
  </action>
  <verify>
    <automated>npm test -- src/components/__tests__/Settings.test.tsx</automated>
    Additional plan-level verification commands (orchestrator runs at end of plan):
    - `npm test` → 1195-1198 SPA GREEN; 11 todo; 0 RED.
    - `npm run lint` → EXIT 0.
    - `npm run build` → EXIT 0 (incl. AIza scan; PWA contract tests; spdx-headers parametric — no new source files so no new rows).
    - `grep -n 'Active Entity' src/components/Settings.tsx` → 1 match.
    - `grep -n 'onEditActiveEntity' src/components/Settings.tsx src/components/ViewRouter.tsx` → at least 3 matches (interface, destructure, onClick in Settings; passed-in in ViewRouter).
    - `grep -n "setView('edit-entity')" src/components/ViewRouter.tsx` → 2 matches (the existing :179 header button + the new Settings wiring).
  </verify>
  <done>
    - Settings.tsx has a 4th Active Entity section between Primary Entity and First-Run Prompt, always rendered, with name+button (entity present) or empty-state copy (entity absent).
    - ViewRouter.tsx passes activeEntity + onEditActiveEntity into Settings.
    - ViewRouter.tsx:179 header button UNCHANGED (verified by diff).
    - Settings tests: 4 pre-existing + 3 new = 7 GREEN.
    - Full SPA suite 1195-1198 GREEN; lint EXIT 0; build EXIT 0.
    - 2 commits: RED (3 new Settings tests) + GREEN (Settings.tsx + ViewRouter.tsx in one commit).
  </done>
</task>

</tasks>

<verification>
Plan-level verification (orchestrator runs after Task 3):

1. **POL-CODE-03 verified:**
   - `npm test -- src/components/__tests__/Sidebar.test.tsx` → 16 GREEN (14 pre-existing + 2 keyboard-a11y).
   - `grep -n 'role="button"' src/components/shell/Sidebar.tsx` → 1 match (badge span).
   - `grep -n 'onKeyDown' src/components/shell/Sidebar.tsx` → 1 match (badge handler).
   - Manual: run dev server with anomaly counts > 0; badge visually byte-identical; React console clean (no nested-interactive warning).

2. **POL-CODE-04 verified:**
   - `npm test -- src/components/__tests__/Sidebar.test.tsx` → 24 GREEN (14 + 2 + 8).
   - `grep -cE "activeEntity\\.type === '(Individual|Company|Trust|SoleTrader)'" src/components/shell/Sidebar.tsx` → 3-4 matches.
   - Visual smoke: switch active entity in the app between an Individual + Company + Trust + Partnership; tax-section nav entries change accordingly; BAS/IAS always present.

3. **POL-CODE-05 verified:**
   - `npm test -- src/components/__tests__/Settings.test.tsx` → 7 GREEN (4 + 3).
   - `grep -n 'Active Entity' src/components/Settings.tsx` → 1 match.
   - `grep -n 'setView..edit-entity' src/components/ViewRouter.tsx` → 2 matches (existing :179 + new Settings wiring).
   - `git diff src/App.tsx` → empty (no App.tsx changes needed; documented in commit message).

4. **Full suite:**
   - `npm test` → 1195-1198 SPA GREEN + 11 todo + 0 RED.
   - `npm run lint` → EXIT 0.
   - `npm run build` → EXIT 0 (incl. AIza scan).
   - `git log --oneline origin/main..HEAD` → 6 commits (Task 1 RED + GREEN + Task 2 RED + GREEN + Task 3 RED + GREEN).
   - `grep -c "DB_NAME_DEMO" src/storage/legacy-migration.ts` → 2 matches (carry-forward sanity check from 15-1).
</verification>

<success_criteria>
- POL-CODE-03 closed end-to-end: badge is a `<span role="button">` with keyboard handler; React warning gone; 16 Sidebar tests GREEN.
- POL-CODE-04 closed end-to-end: tax-section nav entries filter by entity type; 24 Sidebar tests GREEN.
- POL-CODE-05 closed end-to-end: Settings has Active Entity section; 7 Settings tests GREEN; ViewRouter:179 button untouched.
- 1195-1198 SPA GREEN (baseline post-15-1: 1185; +10-13 new).
- 0 visual regressions (Sidebar byte-identical except badge tag + filtered tax entries).
- 0 dependency additions.
- 0 architecture invariant violations (StorageAdapter still FINAL; no new `new Date()` outside period.ts; SPDX header invariant unchanged since no new source files).
- Phase 15 fully closed across both plans; ready for `/gsd:verify-phase 15`.
</success_criteria>

<output>
After completion, create `.planning/phases/15-code-polish/15-2-SUMMARY.md` covering:
- Sidebar badge tag swap diff (~5-line source change + className addition of `cursor-pointer` + ~12-line onKeyDown handler)
- S.8 + S.9 expectation update (BUTTON → SPAN + role assertion)
- Entity-type filter switch shape (3-4 conditional blocks + 1 universal BAS/IAS render)
- demo-seed.ts discriminator confirmation (Individual vs SoleTrader — which branch was wired)
- Settings Active Entity section shape (heading + name+button OR empty-state-copy)
- ViewRouter widening (2-prop addition to Settings invocation)
- App.tsx no-op confirmation
- New test count (2 keyboard + 8 entity-filter + 3 Settings = 13 expected; or fewer if some collapse via it.each)
- Final SPA test count delta (+10-13)
- Commit list (6 commits)
- Any deviations from plan documented (Rule-3 transparency)
</output>
