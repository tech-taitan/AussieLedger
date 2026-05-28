---
phase: 01-safety-net
plan: 2
type: execute
wave: 1
depends_on: [1]
files_modified:
  - src/App.tsx
  - src/components/SlideGenerator.tsx
autonomous: true
requirements: [FND-05, FND-06, FND-09]
must_haves:
  truths:
    - "No view in the rendered app contains the strings 'ATO Connected', '(Simulated)', 'Pearson Specter Litt', 'US Big Law Firm', '+12% vs last month', '-5% vs last month', or 'Healthy margin'"
    - "Every page in the running app shows the locked-text DisclaimerFooter at the bottom of the main content column"
    - "Audit-log entries created by App.tsx use the literal user string 'Local user' (not 'Tristan (Admin)')"
    - "Demo seed entities are exactly two: 'Sample Pty Ltd' (Company, ABN '11 111 111 111') and 'Sample Family Trust' (Trust, ABN '22 222 222 222'); no other entities seeded"
    - "Slide generator surface is unreachable: SlideGenerator.tsx file deleted; App.tsx contains no 'slide-generator' / 'SlideGenerator' / 'Slide Generator' references"
    - "App.tsx wraps localStorage load through `migrate()` from src/lib/migrations; if `migrate()` throws, `<MigrationError>` mounts as a full-viewport early-return"
    - "StatCard `trend` prop receives the literal em-dash string '—' (U+2014) at all three call sites"
  artifacts:
    - path: src/App.tsx
      provides: "Cleaned-up root component with disclaimer footer mounted, migration runner wired, audit-log placeholder updated, demo seeds replaced"
      contains: "DisclaimerFooter"
    - path: src/components/SlideGenerator.tsx
      provides: "DELETED — file must not exist after this plan"
  key_links:
    - from: src/App.tsx
      to: src/components/DisclaimerFooter.tsx
      via: "<DisclaimerFooter /> mounted before closing </main> tag"
      pattern: "<DisclaimerFooter\\s*/>"
    - from: src/App.tsx
      to: src/lib/migrations/index.ts
      via: "`migrate()` wraps the parsed localStorage payload in the load `useEffect`"
      pattern: "migrate\\("
    - from: src/App.tsx
      to: src/components/MigrationError.tsx
      via: "early-return `<MigrationError message={…} />` when `migrationError` state is non-null"
      pattern: "<MigrationError"
---

<objective>
App.tsx demolition: strip ATO theatre, slide generator, and fake trend strings; replace demo seed entities with the locked AU samples; replace audit-log user with `'Local user'`; mount `<DisclaimerFooter>` on every view; wire the schema migration runner into the localStorage load `useEffect` and surface `<MigrationError>` on failure. Delete `src/components/SlideGenerator.tsx`. Touches ONLY `src/App.tsx` and the deleted `SlideGenerator.tsx` — runs in parallel with Plan 01-3 (EntityForm).

Purpose: This plan turns most of the Wave-0 RED tests (App.test.tsx and structural.test.ts) GREEN. It removes the misleading regulatory theatre (ATO Connected, foreign demo entities) and the off-mission slide generator, and locks in the always-visible compliance disclaimer.

Output: Cleaned-up App.tsx; SlideGenerator.tsx deleted; migration runner wired; disclaimer mounted; all FND-05 / FND-06 cleanup acceptance tests green.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/01-safety-net/01-CONTEXT.md
@.planning/phases/01-safety-net/01-RESEARCH.md
@.planning/phases/01-safety-net/01-VALIDATION.md
@.planning/phases/01-safety-net/01-1-PLAN.md
@src/App.tsx
@src/types.ts

<interfaces>
<!-- Wave 0 created the following — Plan 01-2 imports them. -->

From src/components/DisclaimerFooter.tsx (Wave 0):
```typescript
export function DisclaimerFooter(props: { className?: string }): JSX.Element;
```

From src/components/MigrationError.tsx (Wave 0):
```typescript
export function MigrationError(props: { message: string }): JSX.Element;
```

From src/lib/migrations/index.ts (Wave 0):
```typescript
export const CURRENT_VERSION: number; // = 1
export interface PersistedRoot {
  _v: number;
  entities?: unknown;
  allEntries?: unknown;
  auditLogs?: unknown;
  accounts?: unknown;
}
export function migrate(raw: Record<string, unknown>): PersistedRoot;
```

From src/types.ts (Wave 0 added optional _v?: number to persisted interfaces):
```typescript
export interface Entity {
  _v?: number;
  id: string;
  name: string;
  type: string;
  registrationNumber?: string;
  // ...
}
```
</interfaces>

<exact_removal_targets>
<!-- Pinned line numbers from RESEARCH.md "User Constraints > Cleanup boundary" — verified by direct file read. -->
<!-- Executor MUST verify line numbers before edit because lines shift as edits are applied. Use the surrounding code as anchor. -->

| What | Anchor (search target) | Action |
|---|---|---|
| `Presentation` icon import | `from 'lucide-react'` block; the line containing `Presentation,` | Remove the `Presentation,` line from the import (only if no other uses remain) |
| `import { SlideGenerator } from './components/SlideGenerator';` | exact match | Delete entire line |
| `'slide-generator'` token in the View union | `type View = 'master-dashboard' \| ...` | Remove `'slide-generator' \|` from the union |
| `DEFAULT_ENTITIES` constant | `const DEFAULT_ENTITIES: Entity[] = [` | Replace the four-element array with two-element array (Sample Pty Ltd + Sample Family Trust) |
| `'Tristan (Admin)'` audit-log user | `user: 'Tristan (Admin)'` | Replace with `user: 'Local user'` |
| Sidebar status indicator | `'Connected to ATO (Simulated)'` and the surrounding `<div className="flex items-center gap-2 text-xs">` block plus the `Accountant Mode` label | Delete both the label div and the indicator div (entire `<div className="p-4 border-t border-[var(--line)]">…</div>` block at the bottom of the `<aside>`) |
| Sidebar `NavButton` for slide-generator | `active={view === 'slide-generator'}` | Delete the entire `<NavButton …>` block (≈6 lines) |
| Render branch for slide-generator | `view === 'slide-generator'` | Delete the entire `{view === 'slide-generator' && activeEntityId && (…)}` block (≈7 lines) |
| StatCard trend strings | `trend="+12% vs last month"`, `trend="-5% vs last month"`, `trend="Healthy margin"` | Replace each with `trend="—"` (literal em-dash, U+2014) |
</exact_removal_targets>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Cleanup ATO theatre, slide generator, audit-log user, demo seeds, trend strings</name>
  <read_first>
    - src/App.tsx (entire file — line numbers in CONTEXT.md drift after edits, use string anchors)
    - .planning/phases/01-safety-net/01-CONTEXT.md (sections "Cleanup boundary" and "Specific Ideas")
    - .planning/phases/01-safety-net/01-RESEARCH.md (sections "Risks Specific to Phase 1" especially Risk 1, Risk 4, and "Pitfall 6: SlideGenerator References After Deletion")
    - src/__tests__/App.test.tsx (Wave 0 — defines the acceptance criteria; this task makes those tests green)
    - src/__tests__/structural.test.ts (Wave 0 — defines slide-generator removal acceptance)
  </read_first>
  <files>src/App.tsx, src/components/SlideGenerator.tsx</files>
  <behavior>
    - `src/App.tsx` source contains zero occurrences of `slide-generator`, `SlideGenerator`, `Slide Generator`
    - `src/App.tsx` source contains zero occurrences of `Pearson Specter Litt`, `US Big Law Firm`, `EIN 12-3456789`
    - `src/App.tsx` source contains zero occurrences of `ATO Connected`, `(Simulated)`, `Connected to ATO`, `Accountant Mode`
    - `src/App.tsx` source contains zero occurrences of `+12% vs last month`, `-5% vs last month`, `Healthy margin`
    - `src/App.tsx` source contains zero occurrences of `Tristan (Admin)`
    - `src/App.tsx` `DEFAULT_ENTITIES` const is exactly:
      ```typescript
      const DEFAULT_ENTITIES: Entity[] = [
        { _v: 1, id: 'ent-1', name: 'Sample Pty Ltd', type: 'Company', registrationNumber: 'ABN 11 111 111 111', businessAddress: '1 Sample Street, Sydney NSW 2000', contactPerson: 'Demo Contact', status: 'Active' },
        { _v: 1, id: 'ent-2', name: 'Sample Family Trust', type: 'Trust', registrationNumber: 'ABN 22 222 222 222', businessAddress: '2 Sample Lane, Melbourne VIC 3000', contactPerson: 'Demo Contact', status: 'Active' },
      ];
      ```
      (No tax agent fields; no TFN; no notes.)
    - The single audit-log construction in App.tsx (`addAuditLog` function) uses `user: 'Local user'`
    - All three `<StatCard … trend="…" …>` invocations on the dashboard pass `trend="—"` (literal em-dash character U+2014)
    - `src/components/SlideGenerator.tsx` file does NOT exist
    - The `View` type union does NOT contain `'slide-generator'`
    - The Sidebar `<aside>` does NOT contain the `Connected to ATO (Simulated)` block OR the `Accountant Mode` label OR the slide-generator `NavButton`
    - The render switch does NOT contain a `view === 'slide-generator'` branch
    - `npm run lint` (`tsc --noEmit`) passes — no dangling Presentation icon import or other reference
  </behavior>
  <action>
**Step 1 — Delete `src/components/SlideGenerator.tsx`** (the entire file).

**Step 2 — Edit `src/App.tsx`** in this exact order (each sub-step uses string anchors because line numbers shift):

**2a. Remove `Presentation` from the lucide-react import.** Find the `Presentation,` line inside the lucide-react import block (currently at App.tsx:27 per RESEARCH.md). Delete the entire `Presentation,` line. After deletion, run a quick grep mentally: if `Presentation` appears anywhere else in App.tsx, leave it alone — otherwise the import was only for the slide-generator NavButton.

**2b. Remove the SlideGenerator import.** Delete the line:
```typescript
import { SlideGenerator } from './components/SlideGenerator';
```

**2c. Remove `'slide-generator'` from the View union.** The current line is:
```typescript
type View = 'master-dashboard' | 'dashboard' | 'journals' | 'trial-balance' | 'tax-return' | 'company-tax' | 'trust-tax' | 'bas-ias' | 'import' | 'slide-generator' | 'edit-entity' | 'audit-trail' | 'coa-manager';
```
Replace with:
```typescript
type View = 'master-dashboard' | 'dashboard' | 'journals' | 'trial-balance' | 'tax-return' | 'company-tax' | 'trust-tax' | 'bas-ias' | 'import' | 'edit-entity' | 'audit-trail' | 'coa-manager';
```

**2d. Replace `DEFAULT_ENTITIES`.** The current four-element array (App.tsx:55-60) becomes a two-element array exactly as specified above:

```typescript
const DEFAULT_ENTITIES: Entity[] = [
  { _v: 1, id: 'ent-1', name: 'Sample Pty Ltd', type: 'Company', registrationNumber: 'ABN 11 111 111 111', businessAddress: '1 Sample Street, Sydney NSW 2000', contactPerson: 'Demo Contact', status: 'Active' },
  { _v: 1, id: 'ent-2', name: 'Sample Family Trust', type: 'Trust', registrationNumber: 'ABN 22 222 222 222', businessAddress: '2 Sample Lane, Melbourne VIC 3000', contactPerson: 'Demo Contact', status: 'Active' },
];
```

The `_v: 1` field is included because Wave 0's optional `_v?: number` is now being populated. Demo entities are clearly fake by design (repeated digits in ABN, "Sample" in names, generic addresses). Do not include `taxAgentName`, `taxAgentPhone`, `taxAgentEmail`, or `notes`.

**2e. Replace the audit-log user string.** Find the `addAuditLog` helper (currently around App.tsx:347-357). Locate the line:
```typescript
user: 'Tristan (Admin)',
```
Replace with:
```typescript
user: 'Local user',
```

**2f. Replace the three StatCard trend strings.** The em-dash character is U+2014. Type or paste it directly:
- Find `trend="+12% vs last month"` → replace with `trend="—"`
- Find `trend="-5% vs last month"` → replace with `trend="—"`
- Find `trend="Healthy margin"` → replace with `trend="—"`

Verify the character is the em-dash (U+2014) and NOT a hyphen (U+002D) or en-dash (U+2013). On Windows, paste from the CONTEXT.md file (the disclaimer section uses the same character) or use Alt+0151.

**2g. Delete the slide-generator NavButton.** Find the block:
```tsx
<NavButton 
  active={view === 'slide-generator'} 
  onClick={() => setView('slide-generator')} 
  icon={<Presentation size={18} />} 
  label="Slide Generator" 
/>
```
Delete the entire `<NavButton …/>` element (these ≈6 lines).

**2h. Delete the slide-generator render branch.** Find the block:
```tsx
{view === 'slide-generator' && activeEntityId && (
  <SlideGenerator 
    accounts={accounts}
    entries={filteredEntries} 
    entity={entities.find(e => e.id === activeEntityId)!} 
  />
)}
```
Delete the entire conditional render (these ≈7 lines).

**2i. Delete the "Accountant Mode" + "Connected to ATO (Simulated)" sidebar footer block.** Find the block (currently App.tsx:522-528):
```tsx
<div className="p-4 border-t border-[var(--line)]">
  <div className="text-[10px] text-gray-400 uppercase font-bold mb-2">Accountant Mode</div>
  <div className="flex items-center gap-2 text-xs">
    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
    Connected to ATO (Simulated)
  </div>
</div>
```
Delete the entire outer `<div className="p-4 border-t border-[var(--line)]">…</div>` block.

**Step 3 — Run `npm run lint`** (`tsc --noEmit`). Resolve any errors:
- If `Presentation` is still used elsewhere, restore it; otherwise it should be cleanly removed.
- If `SlideGenerator` is still referenced (it should not be), search and clean.
- No other type errors are expected.
  </action>
  <verify>
    <automated>npm run lint && npx vitest run src/__tests__/structural.test.ts src/__tests__/App.test.tsx --reporter=verbose -t "no slide-generator|no ATO Connected|no foreign demo seed|trend placeholder"</automated>
  </verify>
  <acceptance_criteria>
    - `npm run lint` exits 0
    - `npx vitest run src/__tests__/structural.test.ts` exits 0 (slide-generator removal asserted)
    - `npx vitest run src/__tests__/App.test.tsx -t "no ATO Connected"` passes
    - `npx vitest run src/__tests__/App.test.tsx -t "no foreign demo seed"` passes
    - `npx vitest run src/__tests__/App.test.tsx -t "trend placeholder"` passes
    - `src/components/SlideGenerator.tsx` does not exist on disk
    - `node -e "const s=require('fs').readFileSync('src/App.tsx','utf-8'); ['slide-generator','SlideGenerator','Pearson Specter','US Big Law','ATO Connected','Simulated','Tristan (Admin)','+12%','-5%','Healthy margin'].forEach(p=>{if(s.includes(p)){console.error('FOUND:',p);process.exit(1)}})"` exits 0
    - Maps to VALIDATION.md FND-05 rows 1-4
  </acceptance_criteria>
  <done>App.tsx demolition complete; SlideGenerator.tsx deleted; structural and FND-05 App tests green; lint clean.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Wire migration runner + mount DisclaimerFooter and MigrationError</name>
  <read_first>
    - src/App.tsx (after Task 1 edits)
    - .planning/phases/01-safety-net/01-RESEARCH.md (sections "Pattern 3: Schema Migration Runner — Integration into App.tsx:230 load useEffect" and "Pattern 5: Disclaimer Footer — Mount in App.tsx" and "Pattern 10: Migration Error UI — Mount point")
    - .planning/phases/01-safety-net/01-VALIDATION.md (FND-06 row "footer present on every view"; FND-09 rows)
    - src/lib/migrations/index.ts (Wave 0 — exports `migrate`, `CURRENT_VERSION`, `PersistedRoot`)
    - src/components/DisclaimerFooter.tsx (Wave 0)
    - src/components/MigrationError.tsx (Wave 0)
  </read_first>
  <files>src/App.tsx</files>
  <behavior>
    - App.tsx imports `DisclaimerFooter` from `./components/DisclaimerFooter`
    - App.tsx imports `MigrationError` from `./components/MigrationError`
    - App.tsx imports `migrate, CURRENT_VERSION` from `./lib/migrations`
    - A new state hook exists: `const [migrationError, setMigrationError] = useState<string | null>(null);`
    - The localStorage load `useEffect` (currently App.tsx:230-275) is replaced with one that:
      1. Reads each of the four `localStorage.getItem` slices inside its own try/catch
      2. Constructs a synthetic root `{ entities, allEntries, auditLogs, accounts }` from the parsed values
      3. Calls `migrate(syntheticRoot)` once
      4. Calls `setEntities` / `setAllEntries` / `setAuditLogs` / `setAccounts` on success
      5. Calls `setMigrationError(err.message)` on any thrown error from `migrate()`
    - The component's `return` statement is wrapped: if `migrationError` is non-null, return `<MigrationError message={migrationError} />` and skip the rest of the tree
    - `<DisclaimerFooter />` is mounted as the LAST child of the `<main>` element (immediately before `</main>`)
    - On every view (`master-dashboard`, `dashboard`, `journals`, `trial-balance`, `tax-return`, `company-tax`, `trust-tax`, `bas-ias`, `import`, `edit-entity`, `audit-trail`, `coa-manager`), the footer text "AussieLedger is not a tax agent" is in the rendered DOM
  </behavior>
  <action>
**Step 1 — Add three new imports near the top of `src/App.tsx`** (alongside existing imports per the import-order convention in CONVENTIONS.md):

After the existing component imports, add:
```typescript
import { DisclaimerFooter } from './components/DisclaimerFooter';
import { MigrationError } from './components/MigrationError';
```

After `import { cn } from './lib/utils';`, add:
```typescript
import { migrate, CURRENT_VERSION } from './lib/migrations';
```

**Step 2 — Add the migrationError state hook.** Inside the App component function, alongside the other `useState` calls (near the top of the component body), add:
```typescript
const [migrationError, setMigrationError] = useState<string | null>(null);
```

**Step 3 — Replace the localStorage load `useEffect`** (currently App.tsx:230-275). The new version constructs a synthetic root, runs migrations, and surfaces errors:

```typescript
// Load data from localStorage (with schema migration)
useEffect(() => {
  try {
    const syntheticRoot: Record<string, unknown> = {};

    const tryParse = <T,>(key: string): T | undefined => {
      const raw = localStorage.getItem(key);
      if (!raw) return undefined;
      try {
        return JSON.parse(raw) as T;
      } catch (e) {
        // Bad JSON in this slice — skip it (do not throw the whole load)
        console.error(`Failed to parse localStorage key "${key}"`, e);
        return undefined;
      }
    };

    const parsedEntities = tryParse<Entity[]>('ledger_entities_list');
    if (parsedEntities) syntheticRoot.entities = parsedEntities;

    const parsedAll = tryParse<Record<string, JournalEntry[]>>('ledger_all_entries');
    if (parsedAll) {
      syntheticRoot.allEntries = parsedAll;
    } else {
      // Legacy single-entity key — preserve existing fallback behavior
      const legacy = tryParse<JournalEntry[]>('ledger_entries');
      if (legacy) syntheticRoot.allEntries = { 'ent-1': legacy };
    }

    const parsedLogs = tryParse<AuditLog[]>('ledger_audit_logs');
    if (parsedLogs) syntheticRoot.auditLogs = parsedLogs;

    const parsedAccounts = tryParse<Account[]>('ledger_chart_of_accounts');
    if (parsedAccounts) syntheticRoot.accounts = parsedAccounts;

    // Stamp the persisted version (read from a separate key for Phase 1 — Phase 3 unifies storage)
    const storedVersion = localStorage.getItem('ledger_schema_version');
    if (storedVersion) {
      syntheticRoot._v = Number(storedVersion);
    }

    const migrated = migrate(syntheticRoot);

    if (migrated.entities) setEntities(migrated.entities as Entity[]);
    if (migrated.allEntries) setAllEntries(migrated.allEntries as Record<string, JournalEntry[]>);
    if (migrated.auditLogs) setAuditLogs(migrated.auditLogs as AuditLog[]);
    if (migrated.accounts) setAccounts(migrated.accounts as Account[]);

    // Persist the current schema version after a successful migration
    localStorage.setItem('ledger_schema_version', String(CURRENT_VERSION));
  } catch (err) {
    setMigrationError(err instanceof Error ? err.message : 'Unknown migration error');
  }
}, []);
```

This block REPLACES the entire existing load `useEffect` (the one currently containing the four separate `localStorage.getItem('ledger_entities_list' / 'ledger_all_entries' / 'ledger_audit_logs' / 'ledger_chart_of_accounts')` blocks). Do not delete the four SAVE useEffects below it (which write each slice on state change) — those continue to work.

**Step 4 — Add the migration-error early return** at the top of the component's JSX return. Find the existing `return (` statement and insert immediately after the opening:

```tsx
if (migrationError) {
  return <MigrationError message={migrationError} />;
}
```

This must come BEFORE the existing `<div className="flex h-screen ...">` outer wrapper so the migration error renders as a full-viewport gate, not inside the app shell.

**Step 5 — Mount `<DisclaimerFooter />`** as the last child of `<main>`. Find the closing `</main>` tag (currently App.tsx:1032) and insert immediately before it:

```tsx
<DisclaimerFooter />
```

The `<main>` element currently has `className="flex-1 flex flex-col overflow-hidden pb-16 lg:pb-0"`. The footer naturally stacks at the bottom of the column.

**Step 6 — Run `npm run lint`** to confirm no type errors.
  </action>
  <verify>
    <automated>npm run lint && npx vitest run src/__tests__/App.test.tsx -t "footer present on every view" --reporter=verbose && npx vitest run src/components/__tests__/smoke.test.tsx -t "App renders" --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `npm run lint` exits 0
    - `npx vitest run src/__tests__/App.test.tsx -t "footer present on every view"` passes
    - `npx vitest run src/components/__tests__/smoke.test.tsx -t "App renders"` passes
    - `node -e "const s=require('fs').readFileSync('src/App.tsx','utf-8'); ['DisclaimerFooter','MigrationError','migrate(','CURRENT_VERSION','migrationError'].forEach(p=>{if(!s.includes(p)){console.error('MISSING:',p);process.exit(1)}})"` exits 0
    - The literal `<DisclaimerFooter />` element appears exactly once (or more — at least once) in `src/App.tsx`
    - The literal `setMigrationError(` appears at least once in `src/App.tsx`
    - Maps to VALIDATION.md FND-06 row "footer present on every view"; FND-09 row "migration runner: missing _v treated as v0"
  </acceptance_criteria>
  <done>Migration runner wired; disclaimer footer mounted; migration-error gate in place; App + footer-present tests green.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Human verification — disclaimer visible on every view; no ATO theatre</name>
  <read_first>
    - .planning/phases/01-safety-net/01-VALIDATION.md (Manual-Only Verifications)
    - .planning/phases/01-safety-net/01-CONTEXT.md (Disclaimer placement)
  </read_first>
  <what-built>
    - Sidebar no longer shows the green-dot "Connected to ATO (Simulated)" footer or the "Accountant Mode" label
    - The slide generator is gone (no nav button, no view)
    - The dashboard StatCards show the em-dash character `—` instead of `+12% vs last month` / `-5% vs last month` / `Healthy margin`
    - DEFAULT_ENTITIES seeds two clearly-fake entities: `Sample Pty Ltd` and `Sample Family Trust`
    - A persistent disclaimer footer is mounted at the bottom of the main content column on every view: `"This output is a draft working paper, not tax advice. Verify all figures against your source records before lodging. AussieLedger is not a tax agent and does not lodge returns with the ATO."`
    - The audit log entries created from now on use `Local user` (not `Tristan (Admin)`)
    - Schema migration runs on load; if it throws, a non-dismissable full-viewport error UI mounts
  </what-built>
  <how-to-verify>
    1. Run `npm run dev` and open http://localhost:3000
    2. Look at the sidebar — confirm there is NO green-dot status indicator, NO "Connected to ATO (Simulated)" text, NO "Accountant Mode" label, NO "Slide Generator" nav button
    3. Click each sidebar entry in turn (`Master`, `Dashboard`, `Journals`, `Trial Balance`, `Tax Return`, `Company Tax`, `Trust Tax`, `BAS & IAS`, `Import TB`, `Edit Entity`, `Audit Trail`, `CoA Manager`) and confirm the disclaimer footer is visible at the bottom of the main column on each one. The exact text is: *"This output is a draft working paper, not tax advice. Verify all figures against your source records before lodging. AussieLedger is not a tax agent and does not lodge returns with the ATO."*
    4. Open the dashboard view (after selecting an entity). Confirm the three StatCards show the em-dash character `—` (not `+12%`, not `-5%`, not `Healthy margin`)
    5. Open the entity selector — confirm only `Sample Pty Ltd` and `Sample Family Trust` exist (no `Acme Corp Pty Ltd`, no `Smith Family Trust`, no `Tech Innovations`, no `Pearson Specter Litt`)
    6. Browser DevTools → Application → Local Storage. If `ledger_schema_version` is set to `1`, the migration ran successfully. If you have NO ledger_* keys, that is also fine — the app loads with defaults.
    7. (Optional) To verify the migration-error UI: in DevTools → Application → Local Storage, set the value of `ledger_schema_version` to `999` and reload the page. You should see the full-viewport "Data Migration Failed" red panel, non-dismissable. Reset `ledger_schema_version` back to `1` (or delete it) and reload.
  </how-to-verify>
  <resume-signal>Type "approved" or describe any visual issues observed.</resume-signal>
</task>

</tasks>

<verification>
After all tasks complete, run:

1. `npm run lint` — exits 0
2. `npm run build` — exits 0 (the build still succeeds with the cleaned-up app)
3. `npx vitest run --reporter=verbose` — the App-cleanup tests are now GREEN:
   - `src/__tests__/App.test.tsx`: all 4 tests pass
   - `src/__tests__/structural.test.ts`: all tests pass
   - `src/components/__tests__/smoke.test.tsx`: `App renders` and 13+ other components pass
   - `src/components/__tests__/EntityForm.test.tsx`: still RED — Plan 01-3 makes it green
4. Manual checkpoint completed (disclaimer visible on every view; migration runner verified)
</verification>

<success_criteria>
- App.tsx contains zero ATO-theatre, zero foreign demo seeds, zero hard-coded trend strings, zero slide-generator references, zero `Tristan (Admin)` strings.
- DisclaimerFooter is mounted on every view; verified manually + via App.test.
- Migration runner wired into the load `useEffect`; verified via successful page load + test.
- MigrationError mounts as a full-viewport gate when `migrate()` throws; verified manually with the v999 trick.
- Plan 01-3 is unaffected — touches a different file.
</success_criteria>

<output>
After completion, create `.planning/phases/01-safety-net/01-2-SUMMARY.md` documenting:
- Final App.tsx line count (down from ~1126)
- The set of `App.test.tsx` and `structural.test.ts` and `smoke.test.tsx -t "App renders"` tests now green
- Confirmation that no other plan (01-3) was disturbed
- Any deviation from the locked decisions (e.g., if Presentation icon was needed elsewhere and could not be removed)
</output>
