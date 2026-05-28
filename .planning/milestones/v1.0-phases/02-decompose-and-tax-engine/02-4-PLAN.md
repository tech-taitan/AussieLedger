---
phase: 02-decompose-and-tax-engine
plan: 4
type: execute
wave: 2
depends_on: [1, 2, 3]
files_modified:
  - src/App.tsx
  - src/components/shell/Sidebar.tsx
  - src/components/shell/Header.tsx
  - src/components/shell/BottomNav.tsx
  - src/components/shell/MainLayout.tsx
  - src/components/EntityCard.tsx
  - src/components/MasterDashboard.tsx
  - src/components/ViewRouter.tsx
  - src/lib/migrations/index.ts
  - src/lib/migrations/__tests__/runner.test.ts
autonomous: true
requirements: [TAX-03, TAX-05, BOOK-08, BOOK-10]
gap_closure: false

must_haves:
  truths:
    - "src/App.tsx is ≤ 250 non-blank lines (counted by structural test) and is a thin orchestrator: hook composition + migration startup + ViewRouter + MainLayout"
    - "src/components/shell/{Sidebar,Header,BottomNav,MainLayout}.tsx exist with the documented prop interfaces; visual output identical to pre-extraction"
    - "src/components/EntityCard.tsx, MasterDashboard.tsx, ViewRouter.tsx exist as standalone components consumed by App.tsx"
    - "src/lib/migrations/index.ts: CURRENT_VERSION === 2; the 1→2 migration is registered and invokes migrateV1ToV2 from ./v1-to-v2"
    - "App.tsx invokes migrate() once on mount; on success the persisted state's accounts/entities/allEntries/auditLogs are seeded into the hooks"
    - "saveAll(migrated.accounts) and setEntities(migrated.entities) are called ONLY when the migration upgraded the persisted version (migrated._v > storedVersion read from ledger_state_version) — guarded so no spurious audit-log entries fire on cold start"
    - "localStorage key ledger_state_version is written with the new _v after a successful upgrade so subsequent cold starts do not re-fire saveAll/setEntities"
    - "Structural test 'App.tsx ≤ 250 lines' is GREEN; structural test 'no raw new Date outside src/lib/period.ts' is GREEN"
    - "All 12 component smoke tests + the previous Phase 1 App.test.tsx assertions remain GREEN"
    - "npm run dev produces a working app with all views navigable; visual parity confirmed by smoke tests"
  artifacts:
    - path: "src/App.tsx"
      provides: "Thin orchestrator (≤ 250 non-blank lines)"
      min_lines: 60
    - path: "src/components/shell/Sidebar.tsx"
      provides: "Extracted sidebar component"
      contains: "function Sidebar"
    - path: "src/components/shell/Header.tsx"
      provides: "Extracted header"
      contains: "function Header"
    - path: "src/components/shell/BottomNav.tsx"
      provides: "Extracted mobile bottom nav"
      contains: "function BottomNav"
    - path: "src/components/shell/MainLayout.tsx"
      provides: "Composes shell components around children content slot"
      contains: "function MainLayout"
    - path: "src/components/EntityCard.tsx"
      provides: "Extracted master-dashboard entity card (~130 lines)"
      contains: "export function EntityCard"
    - path: "src/components/MasterDashboard.tsx"
      provides: "Extracted master dashboard view"
      contains: "export function MasterDashboard"
    - path: "src/components/ViewRouter.tsx"
      provides: "Routes the active view to the correct screen component"
      contains: "function ViewRouter"
    - path: "src/lib/migrations/index.ts"
      provides: "Updated runner with CURRENT_VERSION=2 and 1→2 migration registered"
      contains: "CURRENT_VERSION = 2"
  key_links:
    - from: "src/App.tsx"
      to: "src/hooks/useAuditLog.ts"
      via: "const { auditLogs, addLog } = useAuditLog();"
      pattern: "useAuditLog\\(\\)"
    - from: "src/App.tsx"
      to: "src/hooks/useAccounts.ts"
      via: "const { accounts, updateAccount, saveAll } = useAccounts(addLog);"
      pattern: "useAccounts\\(addLog\\)"
    - from: "src/App.tsx"
      to: "src/hooks/useJournals.ts"
      via: "useJournals(addLog, activeEntityId)"
      pattern: "useJournals\\(addLog,"
    - from: "src/App.tsx"
      to: "src/hooks/useEntities.ts"
      via: "useEntities(addLog)"
      pattern: "useEntities\\(addLog\\)"
    - from: "src/App.tsx"
      to: "src/lib/migrations/index.ts"
      via: "migrate() called on mount; CURRENT_VERSION=2 stamps after success"
      pattern: "migrate\\("
    - from: "src/lib/migrations/index.ts"
      to: "src/lib/migrations/v1-to-v2.ts"
      via: "MIGRATIONS[1] = migrateV1ToV2"
      pattern: "migrateV1ToV2"
---

<objective>
Final demolition. Replace App.tsx's monolithic 1,116-line god component with a thin orchestrator (≤ 250 lines) that composes the 4 hooks (plan 02-2), wires the shell components (this plan), and routes views. Register the 1→2 migration in the runner. Enable the App.tsx ≤ 250 lines and no-raw-new-Date structural lint assertions.

Purpose:
- Hit roadmap success criterion 1 (App.tsx ≤ 250 lines, hooks own state, shell extracted)
- Hit roadmap success criterion 5 (period model in place, no raw new Date outside period.ts)
- Hit roadmap success criterion 4 (CoA pre-mapping migration runs on existing user data)
- Preserve 100% visual parity — every view renders identically; existing component smoke tests stay green

Output:
- App.tsx reduced from ~1,116 lines to ≤ 250 non-blank lines
- 7 new component files (Sidebar, Header, BottomNav, MainLayout, EntityCard, MasterDashboard, ViewRouter)
- Migration 1→2 registered; persisted user data is upgraded automatically
- 2 structural tests turn from RED to GREEN
- All 12 smoke tests + App.test.tsx assertions green
- Phase 2 SUMMARY published documenting visual parity
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-decompose-and-tax-engine/02-CONTEXT.md
@.planning/phases/02-decompose-and-tax-engine/02-RESEARCH.md
@.planning/phases/02-decompose-and-tax-engine/02-VALIDATION.md
@.planning/phases/02-decompose-and-tax-engine/02-1-SUMMARY.md
@.planning/phases/02-decompose-and-tax-engine/02-2-SUMMARY.md
@.planning/phases/02-decompose-and-tax-engine/02-3-SUMMARY.md
@src/App.tsx
@src/hooks/useAuditLog.ts
@src/hooks/useAccounts.ts
@src/hooks/useJournals.ts
@src/hooks/useEntities.ts
@src/lib/period.ts
@src/lib/migrations/index.ts
@src/lib/migrations/v1-to-v2.ts
@src/components/DisclaimerFooter.tsx
@src/components/MigrationError.tsx

<interfaces>
<!-- Final App.tsx skeleton (≤ 250 non-blank lines target) -->

```typescript
// src/App.tsx (final shape)
import { useState, useEffect } from 'react';
import { JournalEntry, Entity, AuditLog, Account } from './types';
import { useAuditLog } from './hooks/useAuditLog';
import { useAccounts } from './hooks/useAccounts';
import { useJournals } from './hooks/useJournals';
import { useEntities } from './hooks/useEntities';
import { migrate, CURRENT_VERSION } from './lib/migrations';
import { MainLayout } from './components/shell/MainLayout';
import { ViewRouter } from './components/ViewRouter';
import { MigrationError } from './components/MigrationError';

export type View = 'master-dashboard' | 'dashboard' | 'journals' | 'trial-balance' | 'tax-return' | 'company-tax' | 'trust-tax' | 'bas-ias' | 'import' | 'edit-entity' | 'audit-trail' | 'coa-manager';

export default function App() {
  const [view, setView] = useState<View>('master-dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNewJournal, setShowNewJournal] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [migrationDone, setMigrationDone] = useState(false);

  // Hook composition (addLog passed downward — see 02-RESEARCH.md § 1)
  const { auditLogs, addLog } = useAuditLog();
  const { accounts, updateAccount, saveAll } = useAccounts(addLog);
  const entitiesHook = useEntities(addLog);
  const { entities, selectedEntityIds, activeEntityId, setActiveEntityId, setEntities, ...entityActions } = entitiesHook;
  const journalsHook = useJournals(addLog, activeEntityId);

  // One-shot migration startup. Reads localStorage, runs migrate(), seeds hook state.
  useEffect(() => {
    try {
      const syntheticRoot: Record<string, unknown> = {};
      const tryParse = <T,>(key: string): T | undefined => {
        const raw = localStorage.getItem(key);
        if (!raw) return undefined;
        try { return JSON.parse(raw) as T; } catch (e) { console.error(`Failed to parse "${key}"`, e); return undefined; }
      };
      const parsedEntities = tryParse<Entity[]>('ledger_entities_list');
      if (parsedEntities) syntheticRoot.entities = parsedEntities;
      const parsedAll = tryParse<Record<string, JournalEntry[]>>('ledger_all_entries');
      if (parsedAll) syntheticRoot.allEntries = parsedAll;
      const parsedLogs = tryParse<AuditLog[]>('ledger_audit_logs');
      if (parsedLogs) syntheticRoot.auditLogs = parsedLogs;
      const parsedAccounts = tryParse<Account[]>('ledger_chart_of_accounts');
      if (parsedAccounts) syntheticRoot.accounts = parsedAccounts;
      const storedSchemaStr = localStorage.getItem('ledger_schema_version');
      if (storedSchemaStr) syntheticRoot._v = Number(storedSchemaStr);

      // Read prior persisted version BEFORE migrating so we can detect actual upgrades.
      // Uses ledger_state_version (separate from ledger_schema_version) so we can compare
      // migrated._v against what was last persisted.
      const storedVersion = (() => {
        try {
          const stamp = localStorage.getItem('ledger_state_version');
          return stamp ? Number(JSON.parse(stamp)) : 0;
        } catch { return 0; }
      })();

      const migrated = migrate(syntheticRoot);

      // CRITICAL: only fire saveAll/setEntities when migration actually upgraded the persisted version.
      // saveAll() calls addLog('IMPORT_DATA', ...) — calling unconditionally on cold start would flood
      // the audit log with spurious 'Updated Chart of Accounts configuration' entries on every app load.
      if (migrated._v > storedVersion) {
        if (migrated.accounts) {
          localStorage.setItem('ledger_chart_of_accounts', JSON.stringify(migrated.accounts));
          saveAll(migrated.accounts as Account[]);  // also logs the upgrade — INTENDED on actual upgrade
        }
        if (migrated.entities) {
          localStorage.setItem('ledger_entities_list', JSON.stringify(migrated.entities));
          setEntities(migrated.entities as Entity[]);
        }
        // Persist the upgraded version so subsequent cold starts skip the saveAll/setEntities branch
        localStorage.setItem('ledger_state_version', JSON.stringify(migrated._v));
      }
      // (allEntries and auditLogs are not modified by 1→2 migration; hooks load them directly)
      localStorage.setItem('ledger_schema_version', String(CURRENT_VERSION));
    } catch (err) {
      setMigrationError(err instanceof Error ? err.message : 'Unknown migration error');
    } finally {
      setMigrationDone(true);
    }
  }, []); // run once

  // Close sidebar on view change (mobile)
  useEffect(() => { setIsSidebarOpen(false); }, [view]);

  if (migrationError) return <MigrationError message={migrationError} />;

  return (
    <MainLayout
      view={view} setView={setView}
      isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
      activeEntityId={activeEntityId} setActiveEntityId={setActiveEntityId}
      entities={entities}
      setShowNewJournal={setShowNewJournal}
    >
      <ViewRouter
        view={view} setView={setView}
        showNewJournal={showNewJournal} setShowNewJournal={setShowNewJournal}
        accounts={accounts}
        entities={entities}
        activeEntityId={activeEntityId} setActiveEntityId={setActiveEntityId}
        selectedEntityIds={selectedEntityIds}
        auditLogs={auditLogs}
        journals={journalsHook}
        entityActions={entityActions}
        onSaveCOA={(updated) => { saveAll(updated); setView('master-dashboard'); }}
        onUpdateAccount={updateAccount}
      />
    </MainLayout>
  );
}
```

Shell component prop interfaces (verbatim from 02-RESEARCH.md § 2):
```typescript
// MainLayout composes Sidebar + Header + BottomNav + DisclaimerFooter and renders children
interface MainLayoutProps {
  view: View; setView: (v: View) => void;
  isSidebarOpen: boolean; setIsSidebarOpen: (open: boolean) => void;
  activeEntityId: string | null; setActiveEntityId: (id: string | null) => void;
  entities: Entity[];
  setShowNewJournal: (show: boolean) => void;
  children: React.ReactNode;
}

interface SidebarProps {
  view: View; setView: (v: View) => void;
  activeEntity: Entity | undefined;
  entities: Entity[];
  isOpen: boolean; setIsOpen: (open: boolean) => void;
  setActiveEntityId: (id: string | null) => void;
}

interface HeaderProps {
  view: View; entities: Entity[];
  activeEntityId: string | null; setActiveEntityId: (id: string | null) => void;
  setView: (v: View) => void;
  setIsSidebarOpen: (open: boolean) => void;
  setShowNewJournal: (show: boolean) => void;
}

interface BottomNavProps {
  view: View; setView: (v: View) => void;
  setActiveEntityId: (id: string | null) => void;
  setIsSidebarOpen: (open: boolean) => void;
  activeEntityId: string | null;
}

interface ViewRouterProps {
  view: View; setView: (v: View) => void;
  showNewJournal: boolean; setShowNewJournal: (s: boolean) => void;
  accounts: Account[];
  entities: Entity[];
  activeEntityId: string | null; setActiveEntityId: (id: string | null) => void;
  selectedEntityIds: string[];
  auditLogs: AuditLog[];
  journals: JournalsHook;
  entityActions: Pick<EntitiesHook, 'createEntity' | 'updateEntity' | 'archiveEntity' | 'deactivateEntity' | 'deleteEntity' | 'toggleSelection' | 'clearSelection'>;
  onSaveCOA: (updated: Account[]) => void;
  onUpdateAccount: (updated: Account) => void;
}
```

Migration runner update (src/lib/migrations/index.ts):
```typescript
// At the top:
import { migrateV1ToV2 } from './v1-to-v2';

// Update CURRENT_VERSION:
export const CURRENT_VERSION = 2;

// Add to MIGRATIONS registry:
const MIGRATIONS: Record<number, MigrationFn> = {
  0: (state) => ({ ...state, _v: 1 }),
  1: migrateV1ToV2,
};
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Extract shell components, EntityCard, MasterDashboard, and ViewRouter</name>
  <read_first>
    - src/App.tsx (full — you will be deleting most of it; pay attention to lines 60-203 for EntityCard, 423-525 for sidebar, 528-576 for header, 600-700 for master dashboard, 1024-1062 for bottom nav, 962-1016 for view-routing block)
    - src/components/__tests__/smoke.test.tsx (must stay green — every component you extract must render correctly when smoke imports it)
    - src/components/DisclaimerFooter.tsx (already imported by current App.tsx; MainLayout takes ownership)
    - .planning/phases/02-decompose-and-tax-engine/02-RESEARCH.md § 2 "Shell Component Extraction", § 9 "App.tsx ≤ 250 Lines Audit"
    - .planning/phases/02-decompose-and-tax-engine/02-VALIDATION.md (App.tsx ≤ 250 lines structural test)
  </read_first>
  <behavior>
    Visual parity (asserted by component smoke tests + manual checks):
    - Sidebar renders the LedgerAU header, Master Dashboard / System Audit nav, and per-entity nav block when activeEntityId set
    - Header renders the view label, entity selector, and "New Entry" button
    - BottomNav renders Master / Entity / Journals / TB buttons + More button (mobile only)
    - MainLayout composes them into the same flex/grid layout currently in App.tsx (preserves AnimatePresence wrapper for sidebar overlay)
    - EntityCard renders identically to current App.tsx:71-203 (130 lines): entity card with hover-expanded details, selection checkbox, profit/revenue/expense breakdown
    - MasterDashboard renders the master dashboard JSX from App.tsx:601-700: header with Add Entity / Configure Accounts buttons, selection floating bar, grid of EntityCards
    - ViewRouter renders the correct screen component for each view value (replicates the 28 view conditionals at App.tsx:600-1016)

    Structural assertion (will be enabled in Task 3):
    - App.tsx final non-blank line count ≤ 250
  </behavior>
  <action>
    Step A — Create src/components/shell/Sidebar.tsx by relocating App.tsx:437-525 verbatim. Add `import` block at top (React, lucide icons used: LayoutDashboard, BookOpen, FileSpreadsheet, Calculator, History, UploadCloud, Building2, Landmark, Layers, ListTree, X, AnimatePresence/motion). RELOCATE the local `NavButton` helper (App.tsx:1081-1096) into this file as a private function (NOT exported — no other component uses it). Move the AnimatePresence overlay (App.tsx:425-435) inside this file co-located with the sidebar (per 02-RESEARCH.md "Pitfall 6: Animation Break"). Apache-2.0 SPDX header. Export named `Sidebar`.

    Step B — Create src/components/shell/Header.tsx by relocating App.tsx:529-576 verbatim. Imports: React, lucide (Menu, Plus). Apache-2.0 SPDX header. Export named `Header`. The `setShowNewJournal` prop is invoked by the "New Entry" button. Preserve the entity-selector <select> behaviour exactly.

    Step C — Create src/components/shell/BottomNav.tsx by relocating App.tsx:1024-1062 verbatim. RELOCATE the local `MobileNavButton` helper (App.tsx:1066-1079) into this file as a private function. Imports: React, lucide (Layers, LayoutDashboard, BookOpen, FileSpreadsheet, Menu). Apache-2.0 SPDX header. Export named `BottomNav`.

    Step D — Create src/components/shell/MainLayout.tsx. Composes Sidebar + main wrapper + Header + DisclaimerFooter + BottomNav and renders {children} in the main content slot. Use the layout JSX from App.tsx:423 + 527-528 (main wrapper) + 1021 (DisclaimerFooter) + 1024-1062 (bottom nav site). Threading: receives all shell-level props from App.tsx and passes the relevant subset to each shell component. Apache-2.0 SPDX header. Export named `MainLayout`.

    Step E — Create src/components/EntityCard.tsx by relocating App.tsx:60-203 verbatim. Imports: React (useState), motion+AnimatePresence, lucide (CheckSquare, Square, Building2, Briefcase, Globe, ArrowUpRight), cn from '../lib/utils'. Use `import { Entity } from '../types';` for the prop interface. Apache-2.0 SPDX header. Export named `EntityCard`.

    Step F — Create src/components/MasterDashboard.tsx by relocating App.tsx:601-700 verbatim. Imports: React, motion+AnimatePresence, lucide (Layers, Plus, ListTree, Archive, Power, Trash2). Receives props: { entities, accounts, allEntries, selectedEntityIds, toggleEntitySelection, onArchive, onDeactivate, onDelete, onClearSelection, onAddEntity, onConfigureAccounts, onSelectEntity }. The master-dashboard rev/exp/profit math (App.tsx:676-684) stays inline here — it's display logic, not domain logic. The EntityCard is imported and rendered for each non-archived entity. Apache-2.0 SPDX header. Export named `MasterDashboard`.

    Step G — Create src/components/ViewRouter.tsx. Routes by `view` to the correct screen component:
    ```tsx
    {view === 'master-dashboard' && <MasterDashboard ... />}
    {view === 'dashboard' && activeEntityId && <EntityDashboard ... />}  // SEE STEP H — extract or inline
    {view === 'journals' && <JournalsView ... />}                          // SEE STEP H
    {view === 'trial-balance' && <TrialBalanceView ... />}                 // SEE STEP H
    {view === 'tax-return' && <TaxReturnAssistant accounts={accounts} entries={journals.filteredEntries} onUpdateAccount={onUpdateAccount} />}
    {view === 'company-tax' && <CompanyTaxReturn ... />}
    {view === 'trust-tax' && <TrustTaxReturn ... />}
    {view === 'bas-ias' && <BasIasAssistant accounts={accounts} entries={journals.filteredEntries} />}
    {view === 'edit-entity' && <EntityForm entity={...} onSave={...} onCancel={...} />}
    {view === 'audit-trail' && <AuditTrail logs={auditLogs} />}
    {view === 'coa-manager' && <AccountManager accounts={accounts} onSave={onSaveCOA} onCancel={() => setView('master-dashboard')} />}
    {view === 'import' && <ImportTB accounts={accounts} onImport={journals.importEntries} />}
    ```
    Wraps everything in `<AnimatePresence mode="wait">` and a `<motion.div key={view} ...>` to preserve transitions (App.tsx:579-1019). The `showNewJournal ? <JournalForm ...> : <view content>` toggle stays here.

    Step H — Inline-or-extract decision for the dashboard / journals / trial-balance views:
    The current App.tsx has ~430 lines of inline JSX for these three views (lines 703-996). To hit ≤ 250 lines in App.tsx, ViewRouter must be substantial OR these views must be extracted. RECOMMENDATION: extract them as inline subcomponents within ViewRouter.tsx (so ViewRouter is large, App.tsx is small). For each view, copy its JSX block from App.tsx verbatim into a private helper component inside ViewRouter.tsx:
    - `function EntityDashboardView({ activeEntity, accounts, journals, setView }: ...)` — relocates App.tsx:703-876
    - `function JournalsView({ journals }: ...)` — relocates App.tsx:878-960
    - `function TrialBalanceView({ accounts, journals }: ...)` — relocates App.tsx:962-995
    Each helper takes the journals/entities slices it needs as props.

    Step I — DO NOT modify src/App.tsx in this task. Task 2 does the App.tsx demolition.

    Step J — Run smoke + lint to confirm new components render in isolation:
    `npx vitest run src/components/__tests__/smoke.test.tsx`
    Expect: all 12 GREEN (new shell + EntityCard + MasterDashboard files exist but are not imported by App.tsx yet — smoke tests still cover the components they originally covered).

    `npm run lint` — must pass. The new components should fully type-check.
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/smoke.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - 7 new component files exist: src/components/shell/{Sidebar,Header,BottomNav,MainLayout}.tsx, src/components/{EntityCard,MasterDashboard,ViewRouter}.tsx
    - Each new file has Apache-2.0 SPDX header
    - Sidebar.tsx contains the relocated AnimatePresence overlay (per Pitfall 6)
    - ViewRouter.tsx routes all 12 view values to a component
    - App.tsx is byte-identical to its post-plan-02-3 state (NO modifications in this task)
    - npm run lint passes
    - 12 component smoke tests: GREEN
  </acceptance_criteria>
  <done>
    All shell + dashboard + router components exist as standalone files. App.tsx is unmodified. Task 2 will rewrite App.tsx to consume them and the hooks.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Demolish App.tsx and register the 1→2 migration</name>
  <read_first>
    - src/App.tsx (current — you are about to rewrite this file from ~1,116 lines to ≤ 250 non-blank lines)
    - src/components/shell/MainLayout.tsx, src/components/ViewRouter.tsx (created in Task 1; consumed by new App.tsx)
    - src/hooks/useAuditLog.ts, useAccounts.ts, useJournals.ts, useEntities.ts (plan 02-2; consumed by new App.tsx)
    - src/lib/migrations/index.ts (current — CURRENT_VERSION=1, needs bump to 2)
    - src/lib/migrations/v1-to-v2.ts (created plan 02-1; consumed by index.ts)
    - src/__tests__/App.test.tsx (current Phase 1 assertions — must continue passing)
    - src/__tests__/structural.test.ts (currently has the App ≤ 250 lines + no-raw-new-Date assertions added by plan 02-1; both currently RED-by-design; this task turns them GREEN)
    - .planning/phases/02-decompose-and-tax-engine/02-RESEARCH.md § 9 "App.tsx ≤ 250 Lines Audit", "Risk 1: Refactor regression — safest extraction order"
  </read_first>
  <behavior>
    After Task 2 completes:
    - src/App.tsx ≤ 250 non-blank lines (counted by structural test)
    - src/App.tsx contains hook composition + migration startup + MainLayout + ViewRouter + MigrationError gate
    - src/lib/migrations/index.ts: CURRENT_VERSION=2, MIGRATIONS[1]=migrateV1ToV2
    - All existing localStorage data shapes survive: ledger_audit_logs, ledger_chart_of_accounts, ledger_all_entries (+ legacy ledger_entries fallback in useJournals), ledger_entities_list, ledger_schema_version
    - The migration runs once on mount; if a user has _v: 1 data with accounts missing partnershipTaxLabel, the migration adds them (via name inference) before the hooks finish settling, so the rendered UI shows full coverage
    - All 12 component smoke tests still green
    - src/__tests__/App.test.tsx assertions still green (no ATO Connected, footer present, no slide-generator, no foreign demo seed)
    - Both structural assertions GREEN (App ≤ 250 lines, no raw new Date outside period.ts)
    - npm run dev starts the app; manual visual check: every view renders identically to pre-Phase-2 state
  </behavior>
  <action>
    Step A — Update src/lib/migrations/index.ts:
    ```typescript
    // Add at top:
    import { migrateV1ToV2 } from './v1-to-v2';

    // Change CURRENT_VERSION:
    export const CURRENT_VERSION = 2;

    // Add to MIGRATIONS:
    const MIGRATIONS: Record<number, MigrationFn> = {
      0: (state) => ({ ...state, _v: 1 }),
      1: migrateV1ToV2,
    };
    ```
    Run the migration runner test: `npx vitest run src/lib/migrations/__tests__/`. The runner.test.ts (Phase 1) and v1-to-v2.test.ts (Plan 02-1) BOTH must pass — note: runner.test.ts may have an assertion like `expect(CURRENT_VERSION).toBe(1)` which will now fail. If so, update the test to `expect(CURRENT_VERSION).toBe(2)`.

    Step B — REWRITE src/App.tsx using the skeleton in <interfaces>. Specifically:
    1. DELETE every line currently in App.tsx (1,116 lines).
    2. INSERT the new App.tsx body per the skeleton.
    3. Add Apache-2.0 SPDX header.
    4. Imports section (~10 lines): React useState/useEffect; types; 4 hooks; migrate + CURRENT_VERSION; MainLayout; ViewRouter; MigrationError.
    5. View type union as exported (so ViewRouter and shell components import it from App).
    6. App function body:
       - 4 useState (view, isSidebarOpen, showNewJournal, migrationError; possibly migrationDone)
       - 4 hook calls (useAuditLog → addLog; useAccounts(addLog); useEntities(addLog); useJournals(addLog, activeEntityId))
       - Migration startup useEffect (~30 lines — read syntheticRoot from localStorage, call migrate(), seed hooks via setEntities + saveAll **only when migrated._v > storedVersion**, write back ledger_schema_version + ledger_state_version)
       - **CRITICAL VERSION-GUARD PATTERN — paste verbatim into the useEffect body** (replaces the unconditional saveAll/setEntities calls in early drafts):
         ```ts
         const storedVersion = (() => {
           try {
             const stamp = localStorage.getItem('ledger_state_version');
             return stamp ? Number(JSON.parse(stamp)) : 0;
           } catch { return 0; }
         })();
         const migrated = migrate(loadedState);
         if (migrated._v > storedVersion) {
           // Migration upgraded the data — persist the upgraded shape.
           // saveAll() emits an audit log entry — INTENDED here because this is an actual upgrade event.
           if (migrated.accounts) saveAll(migrated.accounts);
           if (migrated.entities) setEntities(migrated.entities);
           localStorage.setItem('ledger_state_version', JSON.stringify(migrated._v));
         }
         ```
         WHY: saveAll() calls addLog('IMPORT_DATA', 'Updated Chart of Accounts configuration'). Calling it on every cold start (i.e. without the migrated._v > storedVersion guard) floods the audit log with spurious entries. The new ledger_state_version key persists the version so subsequent reads can compare and skip the saveAll/setEntities branch when no upgrade is needed.
       - Mobile-sidebar-on-view-change useEffect (1 line)
       - migrationError early return (1 line)
       - Return MainLayout > ViewRouter (~15 lines of prop threading)
    7. Verify the file is ≤ 250 non-blank lines.

    NOTE on the migration startup logic: the hooks already load from their own localStorage keys on mount. The migration `migrate()` call here UPGRADES that data IN PLACE (writes back the upgraded JSON to the same key) BEFORE the hooks settle. The hooks then load the upgraded data normally. To ensure ordering: the migration useEffect runs first (empty deps); it WRITES the upgraded JSON back to localStorage. Then the hook useEffects load from those keys. React's useEffect ordering is deterministic per render but NOT across hook boundaries — to be safe, call `setEntities(migrated.entities)` directly via the exposed setter from useEntities (this overrides the hook's freshly-loaded state). This is the pattern shown in the <interfaces> skeleton.

    Step C — Verify the structural assertions:
    `npx vitest run src/__tests__/structural.test.ts`
    Expect: "App.tsx ≤ 250 lines" GREEN; "no raw new Date outside src/lib/period.ts" GREEN.

    If the App.tsx line count exceeds 250, REDUCE it by:
    - Moving prop-threading-heavy JSX into a helper variable
    - Confirming nothing was duplicated from ViewRouter or MainLayout
    - Splitting the migration startup useEffect into a helper function in src/App.tsx (still keeps it in App but factors it out — that's allowed)

    If the no-raw-new-Date test fails, scan src/App.tsx + src/components/* for any remaining `new Date(` and replace with `today()` from '../lib/period'. The most likely remaining offender is in the rewritten EntityCard or MasterDashboard if you copied a `new Date()` from the old App.tsx — search and replace.

    Step D — Verify Phase 1 assertions:
    `npx vitest run src/__tests__/App.test.tsx`
    All 4 must remain GREEN: no ATO Connected, no Pearson Specter Litt, no trend placeholder, footer present.

    Step E — Run the full Phase 2 suite + smoke + Phase 1 carry-over:
    `npx vitest run --reporter=verbose`
    Expected:
    - 0 RED tests
    - 0 RED-by-design tests (all turned GREEN)
    - All Phase 1 carry-over: GREEN
    - All Phase 2 (period, ai, match, v1-to-v2 + index migration runner, tax engine shapes, hooks, AccountManager, ImportTB, smoke, App, structural): GREEN

    `npm run lint` — must pass.
    `npm run build` — must succeed (sanity check that production bundle path is unbroken).

    Step F — Manual smoke test on dev server:
    1. `npm run dev`
    2. Visit http://localhost:3000
    3. Confirm: master dashboard renders with 2 default entities; clicking an entity opens the dashboard; navigating to Journals/TB/Tax Return/BAS/Import all render; AI button visible only if GEMINI_API_KEY set; Configure Accounts shows partnership column; "Review needed" banner appears for any unmapped account
    4. Open dev tools → Application → Local Storage → confirm ledger_schema_version === '2' after first load
    5. (If you have a v_1 fixture: pre-seed localStorage with {accounts: [Sales without partnershipTaxLabel]}, reload, confirm partnershipTaxLabel === 'P1' is now present)

    Document the manual result in the SUMMARY.
  </action>
  <verify>
    <automated>npx vitest run src/__tests__/structural.test.ts src/__tests__/App.test.tsx src/components/__tests__/smoke.test.tsx src/lib/migrations/__tests__/</automated>
  </verify>
  <acceptance_criteria>
    - src/App.tsx exists with ≤ 250 non-blank lines (structural test passes)
    - src/App.tsx imports useAuditLog, useAccounts, useJournals, useEntities, MainLayout, ViewRouter, MigrationError, migrate, CURRENT_VERSION
    - src/App.tsx contains NO inline NavButton, MobileNavButton, EntityCard, StatCard helper functions (all relocated)
    - src/App.tsx contains NO `new Date(` or `Date.now(` (structural test passes)
    - src/lib/migrations/index.ts: `CURRENT_VERSION = 2`; MIGRATIONS[1] is migrateV1ToV2
    - src/lib/migrations/__tests__/runner.test.ts assertions updated for CURRENT_VERSION=2 (the existing `expect(CURRENT_VERSION).toBe(1)` is changed to `toBe(2)`)
    - src/App.tsx migration startup useEffect contains the version-guard pattern: `if (migrated._v > storedVersion) { ... saveAll/setEntities/persist ledger_state_version ... }` — saveAll/setEntities are NOT called on cold-start when no upgrade occurred (grep for the literal string `migrated._v > storedVersion` in src/App.tsx)
    - src/App.tsx writes `localStorage.setItem('ledger_state_version', JSON.stringify(migrated._v))` only inside the upgrade branch
    - All 12 component smoke tests: GREEN
    - All Phase 1 App.test.tsx assertions: GREEN
    - Both structural assertions: GREEN ("App.tsx ≤ 250 lines", "no raw new Date outside period.ts")
    - npm run lint: passes
    - npm run build: succeeds
    - Manual dev-server smoke confirmed (documented in SUMMARY)
  </acceptance_criteria>
  <done>
    App.tsx demolished to a thin orchestrator. Migration 1→2 registered and runs on every load. Structural lints enforce App size + period model usage going forward. Phase 2 is fully delivered.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Visual parity verification + Phase 2 SUMMARY publish</name>
  <what-built>
    The Phase 2 refactor is complete:
    - App.tsx is ≤ 250 lines (was 1,116)
    - 4 hooks own their state slices
    - 4 shell components + EntityCard + MasterDashboard + ViewRouter extracted
    - Tax engine in src/lib/tax/ consumed by 4 tax components (no inline rollup remains)
    - Period model centralised; no raw new Date() outside period.ts
    - GEMINI_API_KEY is no longer load-bearing — ImportTB works without it
    - Schema migration 1→2 adds partnershipTaxLabel to existing user data
    - All 5 GST codes (GST/FRE/INP/N-T/CAP) accepted in the type system
    - All 16 default CoA accounts have full per-entity-type label coverage
  </what-built>
  <how-to-verify>
    1. Run `npm run dev` and confirm the app loads at http://localhost:3000 without console errors
    2. Click through every view: Master Dashboard → click an entity → Entity Dashboard → Journals → Trial Balance → Tax Return Assistant → Company Tax → Trust Tax → BAS & IAS → Import TB → Configure Accounts → Audit Trail → Edit Entity. Confirm all render without errors.
    3. Confirm visual parity: each view should look identical to the pre-Phase-2 state (compare against any saved screenshots if available; otherwise check that no layout has obviously broken).
    4. With NO `.env.local` (or rename it temporarily): in Import TB, confirm the "Auto-match Accounts" button is visible and the "Enhance with AI" button is HIDDEN. Auto-match should produce results without an API key.
    5. With a `GEMINI_API_KEY` set in `.env.local` (and dev server restarted): in Import TB, confirm BOTH buttons appear.
    6. In Configure Accounts: confirm the "Partnership Label" column is visible and editable for Revenue/Expense rows; Asset/Liability/Equity rows show "—" placeholder.
    7. Open browser dev tools → Application → Local Storage → confirm `ledger_schema_version` reads `'2'`.
    8. (Optional) Pre-seed v1 data: in dev tools, set `ledger_chart_of_accounts` to a JSON array containing `[{"id":"x","code":"X","name":"Sales","type":"Revenue","gstCode":"GST","taxLabel":"6S","companyTaxLabel":"6A","trustTaxLabel":"5B"}]` (note: NO partnershipTaxLabel) and `ledger_schema_version` to `"1"`. Reload. Confirm the Sales account now has `partnershipTaxLabel: "P1"` and the schema version is `"2"`.

    Type "approved" if all 8 checks pass. Otherwise describe the issue.
  </how-to-verify>
  <resume-signal>
    Type "approved" or describe issues. On approval, also confirm the Phase 2 SUMMARY at `.planning/phases/02-decompose-and-tax-engine/02-4-SUMMARY.md` accurately enumerates:
    - All files created/modified across plans 02-1 through 02-4
    - Final test counts (green / red / todo)
    - App.tsx line count (was 1,116; now N where N ≤ 250)
    - Confirmation that all 7 phase requirement IDs are addressed
    - Hand-off notes for Phase 3 (StorageAdapter will replace the localStorage useEffect blocks in each hook)
  </resume-signal>
</task>

</tasks>

<verification>
- App.tsx ≤ 250 non-blank lines (structural test asserts)
- 0 raw `new Date(` / `Date.now(` outside src/lib/period.ts (structural test asserts)
- Migration 1→2 registered; CURRENT_VERSION=2
- All 12 smoke tests green; all hook tests green; all tax-engine shape tests green; all period/ai/match/migration tests green; all Phase 1 tests still green
- npm run lint, npm run build, npm run test all green
- Manual dev-server walkthrough confirms visual parity + all 8 verification checks
</verification>

<success_criteria>
1. **App.tsx ≤ 250 non-blank lines** — structural test enforces; was 1,116
2. **All 4 hooks composed in App.tsx** with addLog passed downward
3. **MainLayout + Sidebar + Header + BottomNav + ViewRouter + EntityCard + MasterDashboard** exist and are consumed by App.tsx
4. **Migration 1→2 registered** — CURRENT_VERSION=2; migrateV1ToV2 runs on mount; existing user data upgraded automatically
5. **No raw `new Date(` outside period.ts** — structural test enforces; uses `today()` everywhere
6. **All 12 smoke tests + all Phase 2 tests + all Phase 1 carry-over tests GREEN**
7. **npm run dev produces a working app** with all views navigable; visual parity confirmed
8. **GEMINI_API_KEY is optional** — confirmed by manual test in both modes (set and unset)
9. **Phase 2 SUMMARY published** with file inventory, test counts, and Phase 3 hand-off notes
</success_criteria>

<output>
After completion, create `.planning/phases/02-decompose-and-tax-engine/02-4-SUMMARY.md` documenting:
- Final App.tsx line count vs target (was 1,116; now N)
- 7 component files created in this plan with line counts
- Migration runner update (CURRENT_VERSION 1 → 2; 1→2 registered)
- Structural lint assertions enabled (App size + no-raw-new-Date)
- Final test totals: green / todo / red (red MUST be 0)
- Manual smoke results from Task 3 checkpoint (all 8 checks)
- Cross-plan summary table: which plan landed which file (link to 02-1, 02-2, 02-3 SUMMARYs)
- Hand-off to Phase 3: StorageAdapter will replace the per-hook `useEffect` localStorage load/save blocks; the migration startup in App.tsx will move into the StorageAdapter; AI server-side proxy lands when the Express server arrives
</output>
