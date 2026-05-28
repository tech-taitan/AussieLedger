---
phase: 06-personas-wizard-and-deployment
plan: 3
type: execute
wave: 2
depends_on: [06-1]
files_modified:
  - src/types.ts
  - src/components/shell/Sidebar.tsx
  - src/components/__tests__/Sidebar.test.tsx
  - src/components/shell/MainLayout.tsx
  - src/components/ViewRouter.tsx
  - src/components/__tests__/ViewRouter.test.tsx
  - src/components/MasterDashboard.tsx
  - src/components/__tests__/MasterDashboard.test.tsx
  - src/components/Settings.tsx
  - src/components/__tests__/Settings.test.tsx
  - src/components/JournalForm.tsx
  - src/components/__tests__/JournalForm.test.tsx
  - src/components/TrialBalance.tsx
  - src/components/__tests__/TrialBalance.test.tsx
  - src/components/CoaTreeView.tsx
  - src/components/__tests__/CoaTreeView.test.tsx
  - src/components/ImportTB.tsx
  - src/components/__tests__/ImportTB.test.tsx
  - src/components/TaxReturnAssistant.tsx
  - src/components/CompanyTaxReturn.tsx
  - src/components/TrustTaxReturn.tsx
  - src/components/PartnershipTaxReturn.tsx
  - src/components/BasIasAssistant.tsx
autonomous: true
requirements: [UX-02, UX-03, UX-04, UX-05, PERS-01, PERS-02, DEP-01]

must_haves:
  truths:
    - "First-run (no Settings persisted) renders PersonaModeModal; selecting a mode persists to localStorage and routes to mode-appropriate landing"
    - "Owner mode hides Master Dashboard nav and lands on the primary entity's Entity Dashboard with a 'Start Year-End' CTA"
    - "Agent mode shows the Master Dashboard with per-entity year-end status badges and a 'Recent clients' quick-switch list"
    - "Sidebar items 'Journal Entries' and 'Accounts' show a red number badge when useAnomalyCounts returns > 0 for that screen"
    - "Inline AnomalyBadge renders on JournalForm (unbalanced), TrialBalance (unmapped row), CoaTreeView (missing GST code or tax label)"
    - "All 5 tax-return components render at least one LabelTooltip on a real ATO label"
    - "JournalForm + TrialBalance + tax return preview render without horizontal scroll at 375px width (specific responsive Tailwind classes present)"
    - "ImportTB shows AiGateNote inline when isAiEnabled() is false (instead of hiding the AI affordance)"
    - "Switching between owner ↔ agent mode does NOT mutate entities[], accounts[], or allEntries"
    - "New 'year-end' and 'settings' views routed by ViewRouter"
  artifacts:
    - path: "src/components/shell/Sidebar.tsx"
      provides: "Mode-aware nav with anomaly count badges"
    - path: "src/components/ViewRouter.tsx"
      provides: "Mode-gated landing + new 'year-end' + 'settings' routes + lockedFy prop computed for JournalForm"
    - path: "src/components/Settings.tsx"
      provides: "Settings page (mode toggle + primary entity radio + 'show first-run prompt again')"
    - path: "src/components/MasterDashboard.tsx"
      provides: "Agent-mode landing with FY26 status badges on each entity card"
  key_links:
    - from: "src/components/shell/MainLayout.tsx"
      to: "src/lib/persona.ts useSettings"
      via: "hook call + prop threading to Sidebar + ViewRouter"
      pattern: "useSettings\\(\\)"
    - from: "src/components/ViewRouter.tsx"
      to: "src/components/YearEndWizard.tsx"
      via: "view === 'year-end' render block"
      pattern: "view\\s*===\\s*['\"]year-end['\"]"
    - from: "src/components/JournalForm.tsx (existing renderers)"
      to: "src/components/AnomalyBadge.tsx"
      via: "import + inline render"
      pattern: "from\\s+['\"]\\.\\.?\\/AnomalyBadge['\"]?|from\\s+['\"]\\./AnomalyBadge['\"]"
    - from: "src/components/ImportTB.tsx"
      to: "src/components/AiGateNote.tsx"
      via: "Conditional render replacing the silently-hidden AI button"
      pattern: "AiGateNote"
---

<objective>
Wire the wizard into the app shell, add persona-mode awareness, surface anomalies in-context across all four screens, add LabelTooltip to all 5 tax-return components, mobile-responsive the three core flows, and surface the AI-disabled affordance in ImportTB.

Purpose: Land UX-02, UX-03 (consume), UX-04, UX-05, PERS-01, PERS-02, DEP-01 (visible AI affordance). This is the integration plan — every primitive built in 06-1 lands in the actual user experience here.

Output: persona-aware Sidebar + ViewRouter; first-run modal gate; Settings page; MasterDashboard agent badges; inline anomalies on Journal/TB/CoA; Sidebar count badges; mobile responsive classes; LabelTooltip in 5 tax returns; AiGateNote in ImportTB.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/06-personas-wizard-and-deployment/06-CONTEXT.md
@.planning/phases/06-personas-wizard-and-deployment/06-RESEARCH.md
@.planning/phases/06-personas-wizard-and-deployment/06-1-PLAN.md
@src/components/shell/Sidebar.tsx
@src/components/shell/MainLayout.tsx
@src/components/ViewRouter.tsx
@src/components/MasterDashboard.tsx
@src/components/JournalForm.tsx
@src/components/TrialBalance.tsx
@src/components/CoaTreeView.tsx
@src/components/ImportTB.tsx
@src/components/TaxReturnAssistant.tsx
@src/components/CompanyTaxReturn.tsx
@src/components/TrustTaxReturn.tsx
@src/components/PartnershipTaxReturn.tsx
@src/components/BasIasAssistant.tsx

<interfaces>
<!-- Pre-extracted contracts so the executor does not need to scan. -->

From src/lib/persona.ts (created in 06-1):
```typescript
export interface Settings { mode: 'owner' | 'agent'; primaryEntityId?: string; }
export function useSettings(): { settings: Settings | null; setSettings: (s: Settings) => void; clearSettings: () => void };
export function getPrimaryEntityId(entities: Entity[], settings: Settings | null): string | null;
```

From src/hooks/useAnomalyCounts.ts (created in 06-1):
```typescript
export interface AnomalyCounts { journals: number; accounts: number; }
export function useAnomalyCounts(accounts: Account[], entries: Record<string, JournalEntry[]>, activeEntityId: string | null): AnomalyCounts;
```

From src/components/AnomalyBadge.tsx (Phase 5 — consume):
```typescript
interface AnomalyBadgeProps { severity: 'warn' | 'info'; message: string; label?: string; }
```

From src/components/LabelTooltip.tsx (created in 06-1):
```typescript
interface LabelTooltipProps { helpText: string; labelCode: string; }
```

From src/components/AiGateNote.tsx (created in 06-1):
```typescript
export function AiGateNote(): JSX.Element | null;  // returns null when isAiEnabled() is true
```

From src/components/YearEndWizard.tsx (created in 06-2):
```typescript
interface YearEndWizardProps {
  entity: Entity; accounts: Account[]; entries: JournalEntry[]; fy?: string;
  onUpdateEntity: (e: Entity) => void;
  onAddLog: (log: Omit<AuditLog, 'id'|'timestamp'|'user'>) => void;
  onNavigateToAccount?: (id: string) => void;
}
```

From src/types.ts (current View union — must be widened):
```typescript
export type View =
  | 'master-dashboard' | 'dashboard' | 'journals' | 'trial-balance'
  | 'tax-return' | 'company-tax' | 'trust-tax' | 'partnership-tax' | 'bas-ias'
  | 'import' | 'edit-entity' | 'audit-trail' | 'coa-manager' | 'data';
// ADD: | 'year-end' | 'settings'
```

From src/lib/tax/labels/fy2026.ts (widened in 06-1 — consume helpText):
```typescript
export const INDIVIDUAL_LABELS_FULL: Record<IndividualLabel, { title; description; natReference; plainEnglish; helpText: string }>;
// (same shape: COMPANY_LABELS_FULL, TRUST_LABELS_FULL, PARTNERSHIP_LABELS_FULL, BAS_LABELS_FULL, IAS_LABELS_FULL)
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Persona-aware Sidebar + MainLayout settings threading + Settings page + View union widening + ViewRouter mode-gated landing + year-end/settings routes + first-run PersonaModeModal gate (TDD)</name>
  <files>
    src/types.ts,
    src/components/shell/Sidebar.tsx,
    src/components/__tests__/Sidebar.test.tsx,
    src/components/shell/MainLayout.tsx,
    src/components/ViewRouter.tsx,
    src/components/__tests__/ViewRouter.test.tsx,
    src/components/Settings.tsx,
    src/components/__tests__/Settings.test.tsx,
    src/components/MasterDashboard.tsx,
    src/components/__tests__/MasterDashboard.test.tsx
  </files>

  <read_first>
    - src/types.ts (View union — add 'year-end' and 'settings')
    - src/components/shell/Sidebar.tsx (entire file — current 189-line implementation; preserve every existing NavButton + section; add mode-aware filtering + anomalyCounts prop)
    - src/components/__tests__/Sidebar.test.tsx (created with `it.todo()` placeholders S.1–S.4 in Plan 06-1 — flip todos to `it()` in this plan)
    - src/components/shell/MainLayout.tsx (entire file — thread settings + anomalyCounts via useSettings + useAnomalyCounts and propagate to Sidebar)
    - src/components/ViewRouter.tsx (entire file — add mode-gated landing logic + year-end/settings route blocks)
    - src/components/MasterDashboard.tsx (current — add per-entity status badges + recent-clients quick-switch list)
    - src/lib/persona.ts (useSettings, getPrimaryEntityId)
    - src/hooks/useAnomalyCounts.ts (consume)
    - src/components/PersonaModeModal.tsx (created in 06-1 — mounted as first-run gate by MainLayout or ViewRouter)
    - src/components/YearEndWizard.tsx (created in 06-2 — mounted by ViewRouter at view === 'year-end')
  </read_first>

  <behavior>
    Tests RED first.

    **Sidebar.test.tsx — flip it.todo S.1–S.4 to it() and add S.5–S.7:**
    - S.1: `render(<Sidebar mode="owner" anomalyCounts={{journals: 3, accounts: 0}} ... />)` — a button labelled "Journal Entries" exists AND its subtree contains the text "3" inside an element whose className contains `"bg-red-500"`.
    - S.2: `anomalyCounts={{journals: 0, accounts: 0}}` — the "Journal Entries" button exists but no element with `bg-red-500` exists inside it.
    - S.3: `mode="owner"` — DOM does NOT contain a button labelled "Master Dashboard".
    - S.4: `mode="agent"` — DOM contains a button labelled "Clients" OR "Master Dashboard".
    - S.5: `mode="owner"` — DOM contains a button labelled "Year-End" (active when view === 'year-end').
    - S.6: `mode="owner"` — DOM contains a button labelled "Settings".
    - S.7: `mode="agent"` — DOM does NOT contain a button labelled "Year-End" at top level (in agent mode wizard is reached after picking an entity).

    **ViewRouter.test.tsx — add VR.1–VR.6:**
    - VR.1: `render(<ViewRouter settings={null} ... />)` — DOM contains the PersonaModeModal (data-testid="persona-mode-owner" exists). All other view content is suppressed.
    - VR.2: `render(<ViewRouter settings={{ mode: 'owner' }} entities={[{ id: 'e1', name: 'Acme', type: 'Company' }]} activeEntityId={null} view="dashboard" ... />)` — calls `setActiveEntityId('e1')` once via effect (auto-select).
    - VR.3: `render(<ViewRouter settings={{ mode: 'owner' }} ... view="master-dashboard" />)` — does NOT render MasterDashboard component (owner mode hides multi-client view); instead redirects via setView('dashboard').
    - VR.4: `render(<ViewRouter view="year-end" settings={{mode:'owner'}} activeEntityId="e1" ... />)` — DOM contains data-testid="wizard-step-indicator" (YearEndWizard mounted).
    - VR.5: `render(<ViewRouter view="settings" ... />)` — DOM contains Settings page with mode toggle (data-testid="settings-mode-toggle").
    - VR.6: For an entity with returnStatusByFy['FY2026'] === 'finalised' AND a journal with date in FY2026, the JournalForm rendered receives `lockedFy="FY2026"`.

    **Settings.test.tsx — SET.1–SET.4:**
    - SET.1: `render(<Settings settings={{mode:'owner'}} onChange={fn} entities={[]} />)` — DOM contains a select/radio with data-testid="settings-mode-toggle" with value 'owner'.
    - SET.2: Switching the toggle to 'agent' calls `onChange({mode:'agent', primaryEntityId: undefined})`.
    - SET.3: With ≥ 2 entities and mode='owner', a radio list with data-testid="settings-primary-entity" is shown; selecting an option calls onChange with primaryEntityId set.
    - SET.4: A button "Show mode prompt again" with data-testid="settings-clear" calls `onClearSettings` prop when clicked.

    **MasterDashboard.test.tsx — extend with MD.1–MD.3 (preserve existing):**
    - MD.1: `render(<MasterDashboard entities={[{id:'e1', name:'Acme', returnStatusByFy:{FY2026:'finalised'}, ...}]} allEntries={...} ... />)` — each entity card shows a status badge with text containing "FY26: finalised" OR similar (data-testid="entity-fy-badge").
    - MD.2: Entity with `returnStatusByFy['FY2026'] === undefined` AND no wizardState shows badge "FY26: not started".
    - MD.3: A "Recent clients" section with data-testid="recent-clients" appears in agent mode (when entities.length > 0). Lists the most recent 5 by last journal date or by last wizardState completion.
  </behavior>

  <action>
    Step 1 — Widen View union in src/types.ts:
    ```typescript
    export type View =
      | 'master-dashboard' | 'dashboard' | 'journals' | 'trial-balance'
      | 'tax-return' | 'company-tax' | 'trust-tax' | 'partnership-tax' | 'bas-ias'
      | 'import' | 'edit-entity' | 'audit-trail' | 'coa-manager' | 'data'
      | 'year-end' | 'settings';
    ```

    Step 2 — Refactor src/components/shell/Sidebar.tsx:
    - Extend props: add `mode: 'owner' | 'agent' | null` and `anomalyCounts: { journals: number; accounts: number }`.
    - Extend `NavButton` to accept optional `badge?: number` per RESEARCH Pattern 5 Sidebar code block. When badge > 0, render `<span className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">{badge}</span>`.
    - Conditional rendering:
      - When `mode === 'owner'`: hide the "Master Dashboard" button; add at top "Year-End" button (icon: WandSparkles or Calendar), "Settings" button. Keep entity section visible.
      - When `mode === 'agent'`: rename "Master Dashboard" to "Clients" (still data-testid does not matter; assertions look for label text). Hide "Year-End" top-level item (wizard accessed via Client cards instead). Add "Settings" button.
      - When `mode === null`: legacy rendering — preserve current behaviour (no breakage during first-run flash).
    - Wire badge prop: "Journal Entries" button gets `badge={anomalyCounts.journals}`; "Accounts" button (via the coa-manager route — check existing AccountManager nav button; if missing, add it: ‘Accounts’ → view 'coa-manager') gets `badge={anomalyCounts.accounts}`.

    Step 3 — Update src/components/shell/MainLayout.tsx:
    - Import `useSettings` from `../../lib/persona`.
    - Import `useAnomalyCounts` from `../../hooks/useAnomalyCounts`.
    - Call both inside the component:
      ```typescript
      const { settings, setSettings, clearSettings } = useSettings();
      const anomalyCounts = useAnomalyCounts(accounts, allEntries, activeEntityId);
      ```
    - Currently MainLayout doesn't receive `accounts` or `allEntries` — widen its props to receive them (App.tsx passes through). Acceptable: lift the hooks call into ViewRouter instead if cleaner — BUT then ViewRouter must thread settings + anomalyCounts back into the Sidebar via prop drilling. Choose whichever path requires the fewest prop additions; document choice in 06-3-SUMMARY.md.
    - Thread `mode={settings?.mode ?? null}`, `anomalyCounts={anomalyCounts}` to Sidebar.
    - Render `<PersonaModeModal onComplete={setSettings} />` ABOVE the main content when `settings === null` — first-run gate. The wrapping div should still mount Sidebar + Header structurally but the overlay covers everything.

    Step 4 — Create src/components/Settings.tsx with SPDX header:
    ```typescript
    import React from 'react';
    import type { Settings as SettingsType } from '../lib/persona';
    import type { Entity } from '../types';

    interface SettingsProps {
      settings: SettingsType | null;
      onChange: (s: SettingsType) => void;
      onClearSettings: () => void;
      entities: Entity[];
    }

    export function Settings({ settings, onChange, onClearSettings, entities }: SettingsProps): React.JSX.Element {
      const mode = settings?.mode ?? 'owner';
      return (
        <div className="space-y-6 max-w-2xl">
          <h2 className="text-xl font-bold">Settings</h2>

          <section>
            <h3 className="font-bold text-sm uppercase">Mode</h3>
            <p className="text-xs text-gray-500">Owner mode: simplified nav for running your own business. Agent mode: multi-client list for managing clients.</p>
            <select
              data-testid="settings-mode-toggle"
              value={mode}
              onChange={(e) => onChange({ mode: e.target.value as 'owner' | 'agent', primaryEntityId: settings?.primaryEntityId })}
              className="border px-3 py-2"
            >
              <option value="owner">Owner</option>
              <option value="agent">Agent</option>
            </select>
          </section>

          {mode === 'owner' && entities.length >= 2 && (
            <section>
              <h3 className="font-bold text-sm uppercase">Primary Entity</h3>
              <div data-testid="settings-primary-entity" className="space-y-2">
                {entities.map(e => (
                  <label key={e.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="primary-entity"
                      value={e.id}
                      checked={settings?.primaryEntityId === e.id}
                      onChange={() => onChange({ mode, primaryEntityId: e.id })}
                    />
                    {e.name}
                  </label>
                ))}
              </div>
            </section>
          )}

          <section>
            <button data-testid="settings-clear" onClick={onClearSettings} className="text-sm text-blue-600 hover:underline">
              Show mode prompt again
            </button>
          </section>
        </div>
      );
    }
    ```

    Step 5 — Extend src/components/MasterDashboard.tsx:
    - For each entity card, compute `fyStatus = entity.returnStatusByFy?.['FY2026']` and `wizardStep = entity.wizardState?.['FY2026']?.step`.
    - Render badge with `data-testid="entity-fy-badge"`:
      - 'finalised' → "FY26: finalised" green pill
      - if wizardStep is set (and not finalised) → "FY26: step {step}/7" yellow pill
      - if hasUnmappedAccounts (compute from accounts + entries) → "FY26: {N} unmapped" red pill
      - else → "FY26: not started" gray pill
    - Add a "Recent clients" section above the entity grid (use existing slot or insert at top), data-testid="recent-clients". Show last 5 entities by most-recent journal date (use allEntries map) OR by wizardState.completedAt — whichever is most recent per entity. Render as small clickable chips that call `onSelectEntity(entity.id)`.

    Step 6 — Refactor src/components/ViewRouter.tsx (main work):
    - Add new props: `settings: Settings | null`, `setSettings: (s: Settings) => void`, `clearSettings: () => void`, `addLog: (log: Omit<AuditLog,'id'|'timestamp'|'user'>) => void`. Keep all existing props.
    - At the top of the function: if `settings === null`, return `<PersonaModeModal onComplete={setSettings} />` (gating early).
    - Add effect: when `settings.mode === 'owner'` AND `activeEntityId === null` AND `entities.length > 0` AND `view !== 'edit-entity'`, call `setActiveEntityId(getPrimaryEntityId(entities, settings) ?? entities[0].id)` once, then `setView('dashboard')`.
    - Add effect: when `settings.mode === 'owner'` AND `view === 'master-dashboard'`, redirect: `setView('dashboard')`.
    - Add new view blocks:
      ```typescript
      {view === 'year-end' && activeEntity && (
        <YearEndWizard
          entity={activeEntity}
          accounts={accounts}
          entries={journals.filteredEntries}
          onUpdateEntity={entityActions.updateEntity}
          onAddLog={addLog}
          onNavigateToAccount={(_id) => setView('coa-manager')}
        />
      )}
      {view === 'settings' && (
        <Settings
          settings={settings}
          onChange={setSettings}
          onClearSettings={clearSettings}
          entities={entities}
        />
      )}
      ```
    - For the existing JournalForm + JournalsView render blocks: compute `lockedFy` from `activeEntity?.returnStatusByFy` + journal date. Helper:
      ```typescript
      function computeLockedFy(activeEntity: Entity | undefined, journalDate?: string): string | undefined {
        if (!activeEntity?.returnStatusByFy) return undefined;
        const fy = journalDate ? fyForDate(journalDate) : currentFy();
        return activeEntity.returnStatusByFy[fy] === 'finalised' ? fy : undefined;
      }
      ```
    - Pass `lockedFy={computeLockedFy(activeEntity, journal?.date)}` to JournalForm when rendering. (For the "new journal" flow, compute against currentFy().)

    Step 7 — Write Sidebar.test.tsx (flip todos), ViewRouter.test.tsx, Settings.test.tsx extension, MasterDashboard.test.tsx extension per <behavior>. Mock `useSettings`, `useAnomalyCounts`, and PersonaModeModal where useful to isolate.

    Step 8 — App.tsx-level wiring: ensure App.tsx (or MainLayout, depending on where useSettings lives) passes `addLog` from useAuditLog into ViewRouter. (Read App.tsx + check existing addLog plumbing.)

    Step 9 — Run vitest.
  </action>

  <verify>
    <automated>npx vitest run src/components/__tests__/Sidebar.test.tsx src/components/__tests__/ViewRouter.test.tsx src/components/__tests__/Settings.test.tsx src/components/__tests__/MasterDashboard.test.tsx --reporter=verbose</automated>
  </verify>

  <acceptance_criteria>
    - `grep -n "mode:" src/components/shell/Sidebar.tsx` returns matches (prop type + filter logic)
    - `grep -n "anomalyCounts" src/components/shell/Sidebar.tsx` returns matches
    - `grep -n "bg-red-500" src/components/shell/Sidebar.tsx` returns a match (badge style)
    - `grep -n "useSettings\\|useAnomalyCounts" src/components/shell/MainLayout.tsx` returns ≥ 2 matches
    - `grep -nE "view\\s*===\\s*['\"]year-end['\"]" src/components/ViewRouter.tsx` returns a match
    - `grep -nE "view\\s*===\\s*['\"]settings['\"]" src/components/ViewRouter.tsx` returns a match
    - `grep -n "PersonaModeModal" src/components/ViewRouter.tsx` returns a match
    - `grep -n "lockedFy" src/components/ViewRouter.tsx` returns ≥ 2 matches (compute helper + prop)
    - `grep -n "data-testid=\"settings-mode-toggle\"" src/components/Settings.tsx` returns a match
    - `grep -n "data-testid=\"entity-fy-badge\"" src/components/MasterDashboard.tsx` returns a match
    - `grep -n "data-testid=\"recent-clients\"" src/components/MasterDashboard.tsx` returns a match
    - `grep -nE "'year-end'\\|'settings'" src/types.ts` confirms View union widening
    - Vitest exits 0; ≥ 17 new GREEN tests
  </acceptance_criteria>

  <done>Sidebar mode-aware + anomaly count badges; ViewRouter mode-gated landing + year-end + settings routes; Settings page; MasterDashboard agent badges + recent-clients; lockedFy wired to JournalForm in finalised FYs.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Inline AnomalyBadge on JournalForm/TrialBalance/CoaTreeView + mobile responsive classes + AiGateNote in ImportTB (TDD)</name>
  <files>
    src/components/JournalForm.tsx,
    src/components/__tests__/JournalForm.test.tsx,
    src/components/TrialBalance.tsx,
    src/components/__tests__/TrialBalance.test.tsx,
    src/components/CoaTreeView.tsx,
    src/components/__tests__/CoaTreeView.test.tsx,
    src/components/ImportTB.tsx,
    src/components/__tests__/ImportTB.test.tsx
  </files>

  <read_first>
    - src/components/JournalForm.tsx (current state including lockedFy added in Plan 06-2; preserve every existing test path; add AnomalyBadge when isBalanced === false on save attempt)
    - src/components/TrialBalance.tsx (current — add AnomalyBadge to rows where account.taxLabel is missing; add `overflow-x-auto -mx-4 sm:mx-0` wrapper if not already there)
    - src/components/CoaTreeView.tsx (current — add AnomalyBadge to rows where gstCode missing or taxLabel missing)
    - src/components/ImportTB.tsx (current — find the `isAiEnabled() && <button>AI re-match</button>` block around line 512; replace with the AiGateNote pattern)
    - src/components/AnomalyBadge.tsx (existing — props: severity, message, label)
    - src/components/AiGateNote.tsx (created in 06-1)
    - src/lib/ai.ts (use isAiEnabled() function)
  </read_first>

  <behavior>
    **JournalForm.test.tsx — JF.5–JF.6 (add to existing):**
    - JF.5: Render with two lines where debit > credit by $10 — DOM contains a `data-testid="anomaly-badge"` with severity='warn' and message containing "unbalanced" OR "out of balance".
    - JF.6: When isBalanced (existing test pattern), no `data-testid="anomaly-badge"` is present.

    **TrialBalance.test.tsx — TB.1–TB.3:**
    - TB.1: Render with an account in entries that has `taxLabel: undefined` AND is referenced in a posted entry — the row for that account has at least one element with `data-testid="anomaly-badge"`.
    - TB.2: Render with all accounts mapped — no `data-testid="anomaly-badge"` elements anywhere.
    - TB.3: The TrialBalance table container has the CSS class `overflow-x-auto` (UX-04 mobile requirement).

    **CoaTreeView.test.tsx — CT.1–CT.2:**
    - CT.1: Render with an account whose `gstCode === undefined` OR `taxLabel === undefined` — that row contains at least one `data-testid="anomaly-badge"`.
    - CT.2: Render with all accounts fully mapped — no anomaly badges.

    **ImportTB.test.tsx — IT.1–IT.2:**
    - IT.1: With `isAiEnabled()` returning false (mock via vi.mock('../lib/ai', ...)), DOM contains the substring "AI suggestions disabled" via `<AiGateNote />` — and does NOT contain an "AI re-match" button.
    - IT.2: With `isAiEnabled()` returning true, the AI re-match affordance is rendered (current behaviour preserved).

    **JournalForm.test.tsx — JF.7 mobile responsive:**
    - JF.7: The journal line container element has Tailwind classes `flex flex-col` AND `sm:flex-row` (i.e. the substring `"flex-col sm:flex-row"` appears on a wrapper element). Source: RESEARCH Pattern 9 mobile pattern.
  </behavior>

  <action>
    Step 1 — JournalForm (UX-02 + UX-04):
    - Import `AnomalyBadge` from `./AnomalyBadge`.
    - When `!isBalanced` AND the user has touched at least one line (existing `touched` state) AND `Object.keys(lines).length >= 2`, render an AnomalyBadge above the totals row:
      ```typescript
      {!isBalanced && Object.keys(touched).length > 0 && (
        <div className="my-2">
          <AnomalyBadge severity="warn" message={`Out of balance: debits ${totalDebits.toFixed(2)} ≠ credits ${totalCredits.toFixed(2)}`} label="unbalanced" />
        </div>
      )}
      ```
    - For each journal line in the existing map, ensure the line wrapper div uses `flex flex-col sm:flex-row gap-2` (replace any existing `grid grid-cols-2`-style layout on mobile). This satisfies UX-04 (RESEARCH Pattern 9).
    - For the header row (date + reference + description), add `flex flex-col sm:flex-row` to the wrapper.

    Step 2 — TrialBalance (UX-02 + UX-04):
    - Compute unmapped-and-referenced once per render via existing `entries` and `accounts` props: `const referencedIds = new Set(entries.filter(posted).flatMap(e => e.lines.map(l => l.accountId)));`
    - For each table row whose `account.id ∈ referencedIds AND (!account.taxLabel || account.taxLabel === '')`, render `<AnomalyBadge severity="warn" message="No tax label mapping" label={account.code} />` in a new cell or inline next to the account name.
    - Wrap the table in `<div className="overflow-x-auto -mx-4 sm:mx-0"><table ...>...</table></div>` if not already wrapped. Search the file first for `overflow-x-auto` — if present in any existing wrapper, leave as is and confirm test TB.3 passes.

    Step 3 — CoaTreeView (UX-02):
    - For each rendered account row, when `!account.gstCode || !account.taxLabel`, render `<AnomalyBadge severity="warn" message={!account.gstCode ? "Missing GST code" : "Missing tax label"} label={account.code} />` inline.

    Step 4 — ImportTB (DEP-01 + FND-04):
    - Find the existing `{isAiEnabled() && <button>` (or similar) block around line 512.
    - Replace with:
      ```typescript
      {isAiEnabled() ? (
        <button onClick={...} className="...">AI re-match accounts</button>
      ) : (
        <AiGateNote />
      )}
      ```
    - Import `AiGateNote` from `./AiGateNote`.
    - If `IS_AI_ENABLED` is currently imported, replace with `isAiEnabled` function call (deprecated constant).

    Step 5 — Mobile responsive audit for the "return preview" target (UX-04 — manual UAT covers it but add structural assertions to the existing return-component tests if cheap):
    - Confirm each of TaxReturnAssistant / CompanyTaxReturn / TrustTaxReturn / PartnershipTaxReturn / BasIasAssistant wraps its table in `overflow-x-auto`. Spot check; only add the wrapper if currently absent. Read each component's render first.
    - Confirm each "Print working paper" button has class `w-full sm:w-auto`.

    Step 6 — Write JF.5–JF.7 + TB.1–TB.3 + CT.1–CT.2 + IT.1–IT.2 tests per <behavior>.

    Step 7 — Verify.
  </action>

  <verify>
    <automated>npx vitest run src/components/__tests__/JournalForm.test.tsx src/components/__tests__/TrialBalance.test.tsx src/components/__tests__/CoaTreeView.test.tsx src/components/__tests__/ImportTB.test.tsx --reporter=verbose</automated>
  </verify>

  <acceptance_criteria>
    - `grep -n "AnomalyBadge" src/components/JournalForm.tsx` returns ≥ 2 matches (import + render)
    - `grep -n "AnomalyBadge" src/components/TrialBalance.tsx` returns ≥ 2 matches
    - `grep -n "AnomalyBadge" src/components/CoaTreeView.tsx` returns ≥ 2 matches
    - `grep -n "AiGateNote" src/components/ImportTB.tsx` returns ≥ 2 matches
    - `grep -n "overflow-x-auto" src/components/TrialBalance.tsx` returns ≥ 1 match
    - `grep -n "flex-col sm:flex-row" src/components/JournalForm.tsx` returns ≥ 1 match
    - `grep -n "isAiEnabled" src/components/ImportTB.tsx` returns matches AND `grep -nE "\\bIS_AI_ENABLED\\b" src/components/ImportTB.tsx` returns ZERO matches (deprecated constant must not appear in new code paths)
    - Vitest exits 0; all listed tests GREEN; existing JournalForm/TrialBalance/CoaTreeView/ImportTB tests not regressed
  </acceptance_criteria>

  <done>Inline anomaly UI live on Journal/TB/CoA screens; mobile responsive classes verified on JournalForm + TrialBalance; ImportTB shows AiGateNote instead of hiding the AI affordance.</done>
</task>

<task type="auto">
  <name>Task 3: LabelTooltip wired into all 5 tax-return components (UX-03 consume)</name>
  <files>
    src/components/TaxReturnAssistant.tsx,
    src/components/CompanyTaxReturn.tsx,
    src/components/TrustTaxReturn.tsx,
    src/components/PartnershipTaxReturn.tsx,
    src/components/BasIasAssistant.tsx
  </files>

  <read_first>
    - src/components/LabelTooltip.tsx (created in 06-1 — props { helpText, labelCode })
    - src/lib/tax/labels/fy2026.ts (catalogues widened in 06-1; each entry now has helpText)
    - src/components/TaxReturnAssistant.tsx (entire file — find every ATO label render site; INDIVIDUAL_LABELS_FULL is the catalogue)
    - src/components/CompanyTaxReturn.tsx (entire file — COMPANY_LABELS_FULL)
    - src/components/TrustTaxReturn.tsx (entire file — TRUST_LABELS_FULL)
    - src/components/PartnershipTaxReturn.tsx (entire file — PARTNERSHIP_LABELS_FULL)
    - src/components/BasIasAssistant.tsx (entire file — BAS_LABELS_FULL + IAS_LABELS_FULL)
  </read_first>

  <action>
    For each of the 5 components, find at minimum one ATO-label render site (e.g. the "Gross business income (P1):" line) and wrap the label code with `<LabelTooltip helpText={INDIVIDUAL_LABELS_FULL['P1'].helpText} labelCode="P1" />` after the existing text. Concretely:

    1. **TaxReturnAssistant.tsx**: import `INDIVIDUAL_LABELS_FULL` and `LabelTooltip`. In the form section that renders labels P1, P2, P8, item15, B, C, E, F, G, H, I, J, K, L, N, M1, M2, T1, item7D — wherever the JSX renders the label code or plain English caption, insert `<LabelTooltip helpText={INDIVIDUAL_LABELS_FULL[labelKey].helpText} labelCode={labelKey} />` immediately after the label text. At MINIMUM cover labels P1, P2, P8 (the success-criterion #4 labels) — every other label widening is welcome but not strictly required.

    2. **CompanyTaxReturn.tsx**: same pattern with `COMPANY_LABELS_FULL`. At minimum cover labels 6A, 6S, 7S (the success-criterion #2 labels).

    3. **TrustTaxReturn.tsx**: same with `TRUST_LABELS_FULL`. At minimum cover 5T (net trust income — success criterion #3) and 57 (distribution — see plan 05-3 SUMMARY for actual rendered keys; if 57 is in meta not labels, cover 26 instead).

    4. **PartnershipTaxReturn.tsx**: same with `PARTNERSHIP_LABELS_FULL`. At minimum cover P1, P2, P8.

    5. **BasIasAssistant.tsx**: same with `BAS_LABELS_FULL` and `IAS_LABELS_FULL`. At minimum cover G1, 1A, 1B, W1, W2, T7 (success criterion #1).

    Add a structural-test extension in src/lib/tax/__tests__/structural-lint.test.ts (existing test file) asserting each of the 5 component files contains the substring `LabelTooltip` (1 line of grep-equivalent assertion per file). If the existing structural-lint test doesn't have an applicable pattern, add a focused test instead at `src/components/__tests__/labelTooltip-wiring.test.ts` that reads each file and asserts the substring.

    DO NOT modify the existing tax-engine math. The tooltips are pure rendering additions.
  </action>

  <verify>
    <automated>npx vitest run src/components/__tests__/TaxReturnAssistant.test.tsx src/components/__tests__/CompanyTaxReturn.test.tsx src/components/__tests__/TrustTaxReturn.test.tsx src/components/__tests__/PartnershipTaxReturn.test.tsx src/components/__tests__/BasIasAssistant.test.tsx --reporter=verbose</automated>
  </verify>

  <acceptance_criteria>
    - `grep -l "LabelTooltip" src/components/TaxReturnAssistant.tsx src/components/CompanyTaxReturn.tsx src/components/TrustTaxReturn.tsx src/components/PartnershipTaxReturn.tsx src/components/BasIasAssistant.tsx` returns all 5 paths
    - `grep -n "INDIVIDUAL_LABELS_FULL\\|COMPANY_LABELS_FULL\\|TRUST_LABELS_FULL\\|PARTNERSHIP_LABELS_FULL\\|BAS_LABELS_FULL\\|IAS_LABELS_FULL" src/components/TaxReturnAssistant.tsx src/components/CompanyTaxReturn.tsx src/components/TrustTaxReturn.tsx src/components/PartnershipTaxReturn.tsx src/components/BasIasAssistant.tsx` returns ≥ 5 matches total
    - All 5 existing Phase-5 component test files still GREEN
    - `npx vitest run` full suite exits 0 with no regressions
  </acceptance_criteria>

  <done>All 5 tax-return components consume LabelTooltip on at least one ATO label using the helpText catalogue widened in Plan 06-1; print mode renders the helpText inline (verified by LabelTooltip's print-only span class).</done>
</task>

</tasks>

<verification>
- All new + extended tests GREEN
- Existing tests not regressed
- `npx vitest run` full suite exits 0 — target ~575+ GREEN
- `npm run build` exits 0
- `npm run lint` exits 0
- App boots without console errors when settings is null (PersonaModeModal mounts) and when set to either mode
- LabelTooltip does NOT use `asChild` on `Tooltip.Content` (Pitfall 2)
</verification>

<success_criteria>
- src/components/shell/Sidebar.tsx is persona-mode aware; Master Dashboard hidden in owner mode; "Year-End" + "Settings" buttons visible; Sidebar count badges render on Journal Entries + Accounts when anomaly counts > 0
- src/components/shell/MainLayout.tsx calls useSettings + useAnomalyCounts and propagates to Sidebar
- src/components/ViewRouter.tsx renders PersonaModeModal when settings is null; auto-selects primary entity + redirects to dashboard in owner mode; routes 'year-end' to YearEndWizard; routes 'settings' to Settings; computes lockedFy from active entity returnStatusByFy and threads to JournalForm
- src/components/Settings.tsx exposes mode toggle + primary entity radio + "show prompt again" button
- src/components/MasterDashboard.tsx renders per-entity FY26 status badges + Recent clients section
- src/components/{JournalForm,TrialBalance,CoaTreeView}.tsx render inline AnomalyBadge for unbalanced / unmapped / missing-GST-code conditions
- JournalForm + TrialBalance render at 375px with `flex-col sm:flex-row` (UX-04 structural assertions)
- src/components/ImportTB.tsx renders AiGateNote when isAiEnabled() === false
- All 5 tax-return components consume LabelTooltip on at least the success-criterion labels
- Switching mode via Settings does NOT mutate entities/accounts/entries (PERS-03 confirmed by useEntities + structural inspection)
</success_criteria>

<output>
After completion, create `.planning/phases/06-personas-wizard-and-deployment/06-3-SUMMARY.md` documenting:
- ViewRouter prop additions (settings, setSettings, clearSettings, addLog) and how App.tsx now wires them
- Where useSettings and useAnomalyCounts are called (MainLayout vs ViewRouter — document the choice)
- Sidebar behaviour matrix per mode
- The 5 tax-return-component label-tooltip coverage (which labels got tooltips)
- Test count delta
- Verification command outputs (vitest + lint + build EXIT 0)
- Outstanding work expected by Plan 06-4 UAT (full end-to-end manual verification of all 5 success criteria)
</output>
