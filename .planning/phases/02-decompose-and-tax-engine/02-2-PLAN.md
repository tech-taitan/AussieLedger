---
phase: 02-decompose-and-tax-engine
plan: 2
type: execute
wave: 1
depends_on: [1]
files_modified:
  - src/hooks/useAuditLog.ts
  - src/hooks/useAccounts.ts
  - src/hooks/useJournals.ts
  - src/hooks/useEntities.ts
autonomous: true
requirements: [TAX-05, BOOK-10]
gap_closure: false

must_haves:
  truths:
    - "useAuditLog returns { auditLogs, addLog }; addLog persists to ledger_audit_logs and prepends new entries"
    - "useAccounts(addLog) returns { accounts, updateAccount, saveAll }; updateAccount calls addLog with 'IMPORT_DATA'"
    - "useJournals(addLog, activeEntityId) returns { allEntries, entries, filteredEntries, addEntry, importEntries, searchQuery, setSearchQuery, dateFrom, setDateFrom, dateTo, setDateTo }"
    - "useEntities(addLog) returns the documented entity hook surface; mutators call addLog appropriately"
    - "Hook tests in src/hooks/__tests__/ all green; addLog is exercised via vi.fn() mock"
    - "All 12 existing component smoke tests remain green; no consumer of these hooks exists in App.tsx yet (plan 02-4 wires them)"
  artifacts:
    - path: "src/hooks/useAuditLog.ts"
      provides: "Audit log state + addLog dispatcher"
      contains: "export function useAuditLog"
    - path: "src/hooks/useAccounts.ts"
      provides: "Accounts state + updateAccount + saveAll, takes addLog as parameter"
      contains: "export function useAccounts"
    - path: "src/hooks/useJournals.ts"
      provides: "Per-entity journal state + filter state + entries selector + addEntry + importEntries"
      contains: "export function useJournals"
    - path: "src/hooks/useEntities.ts"
      provides: "Entity state + selection + bulk mutators"
      contains: "export function useEntities"
  key_links:
    - from: "src/hooks/useAccounts.ts"
      to: "src/hooks/useAuditLog.ts"
      via: "addLog passed as parameter (NOT imported directly — prevents circular import)"
      pattern: "function useAccounts\\(addLog"
    - from: "src/hooks/useAuditLog.ts"
      to: "src/lib/period.ts"
      via: "today() for log timestamp (not new Date())"
      pattern: "from '\\.\\./lib/period'"
    - from: "src/hooks/__tests__/useAuditLog.test.ts"
      to: "src/hooks/useAuditLog.ts"
      via: "renderHook + act assertions"
      pattern: "from '\\.\\./useAuditLog'"
---

<objective>
Land 4 custom hooks (useAuditLog, useAccounts, useJournals, useEntities) implementing the EXACT signatures the test scaffolds in plan 02-1 expect. These hooks DO NOT replace App.tsx's inline state yet — plan 02-4 does the App.tsx demolition and wires them up. This plan's job is to make the 4 hook test files green.

Purpose:
- Implement the addLog-as-parameter pattern from 02-RESEARCH.md § 1 to avoid circular imports
- Use today() from src/lib/period.ts for the audit-log timestamp (NOT `new Date().toISOString()` — the structural lint enabled in 02-4 forbids it)
- Preserve the existing localStorage keys exactly: ledger_audit_logs, ledger_chart_of_accounts, ledger_all_entries (with legacy ledger_entries fallback inside useJournals), ledger_entities_list — App.tsx in 02-4 will simply replace its inline blocks with hook calls

Output:
- 4 hook implementations
- 4 hook test files turn from RED to GREEN
- All 12 component smoke tests still green
- App.tsx is UNCHANGED by this plan (plan 02-4 wires the hooks)
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
@src/types.ts
@src/constants.ts
@src/lib/period.ts
@src/lib/migrations/index.ts
@src/App.tsx

<interfaces>
<!-- Hook signatures and behaviour locked by 02-RESEARCH.md § 1 — implement exactly. -->

```typescript
// src/hooks/useAuditLog.ts
import { AuditLog } from '../types';
export interface AuditLogHook {
  auditLogs: AuditLog[];
  addLog: (action: AuditLog['action'], details: string, entityId?: string) => void;
}
export function useAuditLog(): AuditLogHook;

// src/hooks/useAccounts.ts
import { Account, AuditLog } from '../types';
export type AddLog = (action: AuditLog['action'], details: string, entityId?: string) => void;
export interface AccountsHook {
  accounts: Account[];
  updateAccount: (updated: Account) => void;
  saveAll: (accounts: Account[]) => void;
}
export function useAccounts(addLog: AddLog): AccountsHook;

// src/hooks/useJournals.ts
import { JournalEntry } from '../types';
export interface JournalsHook {
  allEntries: Record<string, JournalEntry[]>;
  entries: JournalEntry[];           // computed: allEntries[activeEntityId] || []
  filteredEntries: JournalEntry[];   // entries filtered by searchQuery + dateFrom + dateTo
  addEntry: (entry: JournalEntry) => void;
  importEntries: (entries: JournalEntry[]) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  dateFrom: string;
  setDateFrom: (d: string) => void;
  dateTo: string;
  setDateTo: (d: string) => void;
}
export function useJournals(addLog: AddLog, activeEntityId: string | null): JournalsHook;

// src/hooks/useEntities.ts
import { Entity } from '../types';
export interface EntitiesHook {
  entities: Entity[];
  selectedEntityIds: string[];
  activeEntityId: string | null;
  setActiveEntityId: (id: string | null) => void;
  setEntities: (entities: Entity[]) => void;     // for direct seeding in App.tsx
  createEntity: (entity: Entity) => void;
  updateEntity: (entity: Entity) => void;
  archiveEntity: (ids: string[]) => void;
  deactivateEntity: (ids: string[]) => void;
  deleteEntity: (ids: string[]) => void;
  toggleSelection: (id: string, e?: React.MouseEvent) => void;
  clearSelection: () => void;
}
export function useEntities(addLog: AddLog): EntitiesHook;
```

LocalStorage keys (preserve verbatim — App.tsx demolition in 02-4 just replaces inline blocks with hook calls):
- useAuditLog: 'ledger_audit_logs'
- useAccounts: 'ledger_chart_of_accounts' (default value: CHART_OF_ACCOUNTS from src/constants.ts)
- useJournals: 'ledger_all_entries' (and legacy 'ledger_entries' fallback as in App.tsx:252-254)
- useEntities: 'ledger_entities_list' (default value: DEFAULT_ENTITIES — duplicated from App.tsx:55-58 to avoid hook→App import)

DEFAULT_ENTITIES (copy verbatim into useEntities.ts as a module-level const):
```typescript
const DEFAULT_ENTITIES: Entity[] = [
  { _v: 1, id: 'ent-1', name: 'Sample Pty Ltd', type: 'Company', registrationNumber: 'ABN 11 111 111 111', businessAddress: '1 Sample Street, Sydney NSW 2000', contactPerson: 'Demo Contact', status: 'Active' },
  { _v: 1, id: 'ent-2', name: 'Sample Family Trust', type: 'Trust', registrationNumber: 'ABN 22 222 222 222', businessAddress: '2 Sample Lane, Melbourne VIC 3000', contactPerson: 'Demo Contact', status: 'Active' },
];
```

today() usage (CRITICAL — structural lint in 02-4 will fail if you use raw `new Date()`):
```typescript
import { today } from '../lib/period';
const newLog: AuditLog = {
  id: crypto.randomUUID(),
  timestamp: today().toISOString(),
  user: 'Local user',
  action,
  entityId,
  details,
};
```

Filter logic (relocated verbatim from App.tsx:308-319):
```typescript
const filteredEntries = useMemo(() => {
  return entries.filter(entry => {
    const matchesSearch = !searchQuery ||
      entry.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDateFrom = !dateFrom || entry.date >= dateFrom;
    const matchesDateTo = !dateTo || entry.date <= dateTo;
    return matchesSearch && matchesDateFrom && matchesDateTo;
  });
}, [entries, searchQuery, dateFrom, dateTo]);
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: useAuditLog and useAccounts implementations</name>
  <read_first>
    - src/hooks/__tests__/useAuditLog.test.ts (created in plan 02-1 — your useAuditLog must satisfy its assertions)
    - src/hooks/__tests__/useAccounts.test.ts (created in plan 02-1 — your useAccounts must satisfy its assertions)
    - src/lib/period.ts (today() import)
    - src/types.ts (AuditLog, Account types — note widened gstCode union from plan 02-1)
    - src/constants.ts (CHART_OF_ACCOUNTS default)
    - src/App.tsx lines 228-280 (existing localStorage load shape — replicate)
    - src/App.tsx lines 282-299 (existing localStorage save shape — replicate)
    - src/App.tsx lines 352-362 (existing addAuditLog shape — relocate to useAuditLog)
    - src/App.tsx line 301-304 (handleUpdateAccount — relocate to useAccounts.updateAccount)
    - src/App.tsx line 396-400 (handleSaveCOA — relocate to useAccounts.saveAll)
    - 02-RESEARCH.md § 1 "Hook Extraction Recipe" and "Code Examples → Pattern: Hook that accepts addLog as parameter"
  </read_first>
  <behavior>
    useAuditLog (assertions in src/hooks/__tests__/useAuditLog.test.ts):
    - On mount with empty localStorage: auditLogs is []
    - addLog('CREATE_ENTITY', 'msg', 'ent-1'): prepends a log with action='CREATE_ENTITY', details='msg', entityId='ent-1', user='Local user', a non-empty id, a valid ISO timestamp
    - After addLog: localStorage 'ledger_audit_logs' contains the JSON-stringified array
    - On mount with seeded localStorage: state initialised from JSON

    useAccounts (assertions in src/hooks/__tests__/useAccounts.test.ts):
    - Default state: 16 accounts from CHART_OF_ACCOUNTS
    - Pre-seeded localStorage 'ledger_chart_of_accounts' with custom 3-account array overrides default
    - updateAccount({ ...account, taxLabel: '6N' }): replaces matching id, persists to localStorage, calls addLog('IMPORT_DATA', `Updated tax mapping for account ${code} - ${name}`, '')
    - saveAll([...]): replaces accounts entirely, calls addLog('IMPORT_DATA', 'Updated Chart of Accounts configuration', '')
  </behavior>
  <action>
    Step A — Create src/hooks/useAuditLog.ts:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { useState, useEffect, useCallback } from 'react';
    import { AuditLog } from '../types';
    import { today } from '../lib/period';

    const STORAGE_KEY = 'ledger_audit_logs';

    export interface AuditLogHook {
      auditLogs: AuditLog[];
      addLog: (action: AuditLog['action'], details: string, entityId?: string) => void;
    }

    export function useAuditLog(): AuditLogHook {
      const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

      useEffect(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw) as AuditLog[];
          if (Array.isArray(parsed)) setAuditLogs(parsed);
        } catch (err) {
          console.error('Failed to parse ledger_audit_logs', err);
        }
      }, []);

      useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(auditLogs));
      }, [auditLogs]);

      const addLog = useCallback(
        (action: AuditLog['action'], details: string, entityId?: string) => {
          const newLog: AuditLog = {
            id: crypto.randomUUID(),
            timestamp: today().toISOString(),
            user: 'Local user',
            action,
            entityId,
            details,
          };
          setAuditLogs(prev => [newLog, ...prev]);
        },
        []
      );

      return { auditLogs, addLog };
    }
    ```

    Step B — Create src/hooks/useAccounts.ts:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { useState, useEffect, useCallback } from 'react';
    import { Account, AuditLog } from '../types';
    import { CHART_OF_ACCOUNTS } from '../constants';

    const STORAGE_KEY = 'ledger_chart_of_accounts';

    export type AddLog = (action: AuditLog['action'], details: string, entityId?: string) => void;

    export interface AccountsHook {
      accounts: Account[];
      updateAccount: (updated: Account) => void;
      saveAll: (accounts: Account[]) => void;
    }

    export function useAccounts(addLog: AddLog): AccountsHook {
      const [accounts, setAccounts] = useState<Account[]>(CHART_OF_ACCOUNTS);

      useEffect(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw) as Account[];
          if (Array.isArray(parsed)) setAccounts(parsed);
        } catch (err) {
          console.error('Failed to parse ledger_chart_of_accounts', err);
        }
      }, []);

      useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
      }, [accounts]);

      const updateAccount = useCallback((updated: Account) => {
        setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
        addLog('IMPORT_DATA', `Updated tax mapping for account ${updated.code} - ${updated.name}`, '');
      }, [addLog]);

      const saveAll = useCallback((updated: Account[]) => {
        setAccounts(updated);
        addLog('IMPORT_DATA', 'Updated Chart of Accounts configuration', '');
      }, [addLog]);

      return { accounts, updateAccount, saveAll };
    }
    ```

    Step C — Run hook tests:
    `npx vitest run src/hooks/__tests__/useAuditLog.test.ts src/hooks/__tests__/useAccounts.test.ts`
    Both must be GREEN. If a test asserts on a localStorage write that hasn't happened yet (because of useEffect ordering), wrap the assertion in `await waitFor(() => ...)` from @testing-library/react.

    Step D — Re-run all of Phase 2's existing tests to confirm no regression:
    `npx vitest run src/lib/ src/hooks/__tests__/useAuditLog.test.ts src/hooks/__tests__/useAccounts.test.ts src/components/__tests__/smoke.test.tsx`
    All must be GREEN.
  </action>
  <verify>
    <automated>npx vitest run src/hooks/__tests__/useAuditLog.test.ts src/hooks/__tests__/useAccounts.test.ts src/components/__tests__/smoke.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - src/hooks/useAuditLog.ts exists; exports useAuditLog with the documented signature
    - src/hooks/useAccounts.ts exists; exports useAccounts(addLog) and AddLog type alias
    - useAuditLog imports today from '../lib/period' (NOT `new Date()`)
    - useAccounts.updateAccount calls addLog('IMPORT_DATA', `Updated tax mapping for account ${code} - ${name}`, '')
    - useAccounts.saveAll calls addLog('IMPORT_DATA', 'Updated Chart of Accounts configuration', '')
    - localStorage keys: ledger_audit_logs and ledger_chart_of_accounts
    - useAuditLog.test.ts and useAccounts.test.ts: ALL GREEN
    - All 12 component smoke tests: ALL GREEN
    - npm run lint passes
  </acceptance_criteria>
  <done>
    useAuditLog and useAccounts hooks land with their tests green. App.tsx is unchanged. Plan 02-4 will replace App.tsx's inline state for these slices with hook calls.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: useJournals and useEntities implementations</name>
  <read_first>
    - src/hooks/__tests__/useJournals.test.ts (created in plan 02-1 — your useJournals must satisfy)
    - src/hooks/__tests__/useEntities.test.ts (created in plan 02-1 — your useEntities must satisfy)
    - src/hooks/useAuditLog.ts and useAccounts.ts (Task 1 — pattern reference)
    - src/App.tsx lines 207-220 (entities, allEntries, selectedEntityIds, activeEntityId, filter state — relocate)
    - src/App.tsx lines 244-273 (entities + allEntries + legacy ledger_entries fallback — preserve)
    - src/App.tsx lines 308-319 (filteredEntries useMemo — relocate to useJournals verbatim)
    - src/App.tsx lines 321-350 (toggleEntitySelection, handleBulkArchive/Deactivate/Delete — relocate to useEntities)
    - src/App.tsx lines 364-393 (handleSaveEntry, handleImport, handleUpdateEntity, handleCreateEntity — relocate)
    - 02-RESEARCH.md § 1 "Hook Extraction Recipe" Note on filter state location
  </read_first>
  <behavior>
    useJournals (assertions in src/hooks/__tests__/useJournals.test.ts):
    - On mount with empty storage: allEntries is {}, entries is [], filteredEntries is []
    - With activeEntityId='ent-1' and one addEntry({...}): entries.length === 1 for that entityId; addLog called with 'POST_JOURNAL'
    - importEntries([entry1, entry2]): allEntries['ent-1'] grows by 2; addLog called with 'IMPORT_DATA' and message containing the count
    - Filter: setSearchQuery('reffy'); only entries with 'reffy' in reference or description appear in filteredEntries
    - Date filter: setDateFrom('2026-01-01'); entries with date < '2026-01-01' filtered out
    - Persistence: after addEntry, JSON.parse(localStorage.getItem('ledger_all_entries')) reflects the new state
    - Legacy fallback: pre-seed 'ledger_entries' (legacy single-entity) with a 2-entry array, no 'ledger_all_entries'; on mount expect allEntries['ent-1'] to equal the legacy array

    useEntities (assertions in src/hooks/__tests__/useEntities.test.ts):
    - On mount with empty storage: entities = DEFAULT_ENTITIES (length 2)
    - createEntity({ id:'ent-3', name:'New', type:'Company', status:'Active' }): entities.length === 3; addLog called with 'CREATE_ENTITY' and message containing the name
    - updateEntity({ ...existing, name:'Renamed' }): entities reflects rename; addLog called with 'UPDATE_ENTITY'
    - archiveEntity(['ent-1']): entities.find(e=>e.id==='ent-1').status === 'Archived'; addLog called once with 'UPDATE_ENTITY' and message containing 'archived'
    - deactivateEntity(['ent-1']): status flipped to 'Deactivated'
    - deleteEntity(['ent-1']): entities.length === 1
    - toggleSelection('ent-1'): selectedEntityIds becomes ['ent-1']; second call removes it
    - clearSelection(): selectedEntityIds = []
    - Persistence: after createEntity, JSON.parse(localStorage.getItem('ledger_entities_list')) reflects new state
  </behavior>
  <action>
    Step A — Create src/hooks/useJournals.ts:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { useState, useEffect, useMemo, useCallback } from 'react';
    import { JournalEntry } from '../types';
    import { AddLog } from './useAccounts';

    const STORAGE_KEY = 'ledger_all_entries';
    const LEGACY_KEY = 'ledger_entries';

    export interface JournalsHook {
      allEntries: Record<string, JournalEntry[]>;
      entries: JournalEntry[];
      filteredEntries: JournalEntry[];
      addEntry: (entry: JournalEntry) => void;
      importEntries: (entries: JournalEntry[]) => void;
      searchQuery: string;
      setSearchQuery: (q: string) => void;
      dateFrom: string;
      setDateFrom: (d: string) => void;
      dateTo: string;
      setDateTo: (d: string) => void;
    }

    export function useJournals(addLog: AddLog, activeEntityId: string | null): JournalsHook {
      const [allEntries, setAllEntries] = useState<Record<string, JournalEntry[]>>({});
      const [searchQuery, setSearchQuery] = useState('');
      const [dateFrom, setDateFrom] = useState('');
      const [dateTo, setDateTo] = useState('');

      useEffect(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Record<string, JournalEntry[]>;
            if (parsed && typeof parsed === 'object') setAllEntries(parsed);
            return;
          } catch (err) {
            console.error('Failed to parse ledger_all_entries', err);
          }
        }
        // Legacy fallback (matches existing App.tsx:251-254 behaviour)
        const legacyRaw = localStorage.getItem(LEGACY_KEY);
        if (legacyRaw) {
          try {
            const legacy = JSON.parse(legacyRaw) as JournalEntry[];
            if (Array.isArray(legacy)) setAllEntries({ 'ent-1': legacy });
          } catch (err) {
            console.error('Failed to parse legacy ledger_entries', err);
          }
        }
      }, []);

      useEffect(() => {
        if (Object.keys(allEntries).length > 0) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(allEntries));
        }
      }, [allEntries]);

      const entries = useMemo(
        () => (activeEntityId ? (allEntries[activeEntityId] ?? []) : []),
        [allEntries, activeEntityId]
      );

      const filteredEntries = useMemo(() => {
        return entries.filter(entry => {
          const matchesSearch = !searchQuery ||
            entry.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.description.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesDateFrom = !dateFrom || entry.date >= dateFrom;
          const matchesDateTo = !dateTo || entry.date <= dateTo;
          return matchesSearch && matchesDateFrom && matchesDateTo;
        });
      }, [entries, searchQuery, dateFrom, dateTo]);

      const addEntry = useCallback((entry: JournalEntry) => {
        if (!activeEntityId) return;
        setAllEntries(prev => ({
          ...prev,
          [activeEntityId]: [entry, ...(prev[activeEntityId] ?? [])],
        }));
        addLog('POST_JOURNAL', `Posted journal entry ${entry.reference}: ${entry.description}`, activeEntityId);
      }, [activeEntityId, addLog]);

      const importEntries = useCallback((newEntries: JournalEntry[]) => {
        if (!activeEntityId) return;
        setAllEntries(prev => ({
          ...prev,
          [activeEntityId]: [...newEntries, ...(prev[activeEntityId] ?? [])],
        }));
        addLog('IMPORT_DATA', `Imported ${newEntries.length} journal entries via Trial Balance import`, activeEntityId);
      }, [activeEntityId, addLog]);

      return {
        allEntries, entries, filteredEntries,
        addEntry, importEntries,
        searchQuery, setSearchQuery,
        dateFrom, setDateFrom,
        dateTo, setDateTo,
      };
    }
    ```

    Step B — Create src/hooks/useEntities.ts: relocate App.tsx:207-209 (entities + selectedEntityIds + activeEntityId), 321-350 (toggleEntitySelection + bulk handlers), 383-394 (handleUpdateEntity + handleCreateEntity). Module-level DEFAULT_ENTITIES per <interfaces>. Mutators:
    - createEntity: appends + addLog('CREATE_ENTITY', `Created new entity: ${entity.name} (${entity.type})`, entity.id)
    - updateEntity: replaces by id + addLog('UPDATE_ENTITY', `Updated entity details for ${entity.name}`, entity.id)
    - archiveEntity(ids): maps entities, sets status='Archived' for those in ids; addLog('UPDATE_ENTITY', `Bulk archived ${ids.length} entities`); clears selectedEntityIds
    - deactivateEntity(ids): same pattern with 'Deactivated'
    - deleteEntity(ids): filter remove + addLog('UPDATE_ENTITY', `Bulk deleted ${ids.length} entities`); clears selectedEntityIds
    - toggleSelection(id, e?): e?.stopPropagation(); flips id in selectedEntityIds
    - clearSelection: setSelectedEntityIds([])
    - setEntities: exposed for direct seeding from migrated state in plan 02-4
    Match the localStorage key 'ledger_entities_list' load+save pattern from useAccounts. Note: deleteEntity does NOT prompt window.confirm — that lives in the calling component (preserves existing UX where App.tsx:345 confirms before invoking the bulk handler). Plan 02-4 wires `if (window.confirm(...)) deleteEntity(selectedEntityIds)` into the MasterDashboard component.

    Step C — Run all hook tests:
    `npx vitest run src/hooks/__tests__/`
    All 4 hook test files must be GREEN.

    Step D — Re-run smoke and full Phase 2 suite:
    `npx vitest run --reporter=verbose`
    Expected: every test green except the documented RED-by-design tests handed to plans 02-3 and 02-4 (AccountManager partnership column, ImportTB AI gating, App.tsx ≤ 250, no raw new Date).
  </action>
  <verify>
    <automated>npx vitest run src/hooks/__tests__/ src/components/__tests__/smoke.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - src/hooks/useJournals.ts exists; exports useJournals(addLog, activeEntityId); preserves the legacy 'ledger_entries' fallback
    - src/hooks/useEntities.ts exists; exports useEntities(addLog) with all 11 documented surface members; DEFAULT_ENTITIES inlined verbatim
    - useEntities does NOT call window.confirm (UX-confirm lives at the call site in MasterDashboard, wired by 02-4)
    - All 4 hook test files: GREEN (useAuditLog, useAccounts, useJournals, useEntities)
    - Filter state behaviour matches App.tsx:308-319 verbatim (test asserts a fixture with 3 entries reduces correctly)
    - All 12 component smoke tests: GREEN
    - npm run lint passes
    - The 4 hooks are NOT yet imported anywhere in src/App.tsx — that's plan 02-4's job
  </acceptance_criteria>
  <done>
    All 4 hook tests green; hooks live in isolation under src/hooks/; ready for plan 02-4 to swap App.tsx's inline state for these.
  </done>
</task>

</tasks>

<verification>
- All 4 hook test files green
- All 12 component smoke tests still green
- npm run lint passes
- src/App.tsx is byte-identical to its state at end of plan 02-1 (no imports of hooks added yet)
</verification>

<success_criteria>
1. **All 4 hook signatures match the contract** in <interfaces> exactly
2. **addLog passed as parameter** (not imported by the consuming hooks — prevents circular import per 02-RESEARCH.md "Pitfall 1")
3. **today() used for timestamp** in useAuditLog (not `new Date()` — required for 02-4's structural lint to pass)
4. **localStorage keys preserved verbatim** so 02-4's wiring is a state-equivalent swap
5. **Hook tests turn from RED to GREEN** without modifying the test files
6. **All 12 component smoke tests stay green** (App.tsx is unchanged in this plan)
7. **App.tsx is byte-identical** to its post-02-1 state — plan 02-4 owns App.tsx demolition
</success_criteria>

<output>
After completion, create `.planning/phases/02-decompose-and-tax-engine/02-2-SUMMARY.md` documenting:
- 4 hook files created with line counts
- All 4 hook test files turned green
- Total green / red count delta from plan 02-1's baseline
- Confirmation that App.tsx is unchanged
- Hand-off notes for plan 02-4: hook signatures, AddLog type re-export from useAccounts (also OK to import from useAuditLog — pick one canonical location and document)
</output>
