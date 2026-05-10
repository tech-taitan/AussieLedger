---
phase: 02-decompose-and-tax-engine
plan: 2
subsystem: hooks
tags: [hooks, audit-log, accounts, journals, entities, localStorage, addLog-pattern]
dependency_graph:
  requires: [period-lib, hook-type-stubs, test-scaffolds]
  provides: [useAuditLog, useAccounts, useJournals, useEntities]
  affects: [src/hooks/useAuditLog.ts, src/hooks/useAccounts.ts, src/hooks/useJournals.ts, src/hooks/useEntities.ts]
tech_stack:
  added: []
  patterns: [addLog-as-constructor-parameter, useEffect-load-save-localStorage, useMemo-derived-state, useCallback-stable-refs, legacy-localStorage-fallback]
key_files:
  created: []
  modified:
    - src/hooks/useAuditLog.ts
    - src/hooks/useAccounts.ts
    - src/hooks/useJournals.ts
    - src/hooks/useEntities.ts
decisions:
  - "AddLog type exported from useAccounts.ts as the canonical location — useJournals and useEntities import it from there to avoid re-declaration"
  - "useEntities exposes activeEntityId + setActiveEntityId + setEntities for plan 02-4 App.tsx wiring; these are not consumed by any component yet"
  - "useEntities does NOT call window.confirm — the UX confirm stays at the call site in App.tsx (to be moved to MasterDashboard in 02-4)"
  - "useJournals only writes to ledger_all_entries when allEntries is non-empty (mirrors App.tsx:296 guard) to avoid clearing data on first mount"
  - "today() from src/lib/period.ts used for useAuditLog timestamps — no raw new Date() calls in hook code"
metrics:
  duration: "~30 minutes"
  completed: "2026-05-10"
  tasks: 2
  files_created: 0
  files_modified: 4
  commits: 2
  tests_green: 189
  tests_skipped: 7
  tests_red_by_design: 0
---

# Phase 02 Plan 2: Custom Hooks Implementation Summary

Implemented 4 custom hooks (useAuditLog, useAccounts, useJournals, useEntities) using the addLog-as-constructor-parameter pattern, turning all 23 RED-by-design hook test scaffolds GREEN without modifying any test files or App.tsx.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | useAuditLog and useAccounts implementations | `86fc96e` | src/hooks/useAuditLog.ts, src/hooks/useAccounts.ts |
| 2 | useJournals and useEntities implementations | `1b6a4e0` | src/hooks/useJournals.ts, src/hooks/useEntities.ts |

## What Was Built

### src/hooks/useAuditLog.ts (50 lines)
Owns `ledger_audit_logs` localStorage key. Loads on mount via `useEffect`, saves on change. `addLog` uses `today()` from `src/lib/period.ts` for the timestamp field — NOT `new Date()`. Returns `{ auditLogs, addLog }`.

### src/hooks/useAccounts.ts (50 lines)
Owns `ledger_chart_of_accounts` localStorage key. Default value is `CHART_OF_ACCOUNTS` from `src/constants.ts`. Exports `AddLog` type alias as the canonical re-export point used by useJournals and useEntities. `updateAccount` calls `addLog('IMPORT_DATA', 'Updated tax mapping for account ${code} - ${name}', '')`. `saveAll` calls `addLog('IMPORT_DATA', 'Updated Chart of Accounts configuration', '')`. Returns `{ accounts, updateAccount, saveAll }`.

### src/hooks/useJournals.ts (97 lines)
Owns `ledger_all_entries` localStorage key with legacy `ledger_entries` fallback (matches App.tsx:251-254 behaviour exactly). `entries` and `filteredEntries` are derived via `useMemo`. Filter state (`searchQuery`, `dateFrom`, `dateTo`) lives in this hook per 02-CONTEXT.md decision. `addEntry` calls `addLog('POST_JOURNAL', ...)`. `importEntries` calls `addLog('IMPORT_DATA', 'Imported N journal entries via Trial Balance import', ...)`. Returns `{ allEntries, entries, filteredEntries, addEntry, importEntries, searchQuery, setSearchQuery, dateFrom, setDateFrom, dateTo, setDateTo }`.

### src/hooks/useEntities.ts (105 lines)
Owns `ledger_entities_list` localStorage key. `DEFAULT_ENTITIES` inlined verbatim (copy from App.tsx) to avoid hook→App import cycle. Exposes the full surface: `entities`, `selectedEntityIds`, `activeEntityId`, `setActiveEntityId`, `setEntities`, `createEntity`, `updateEntity`, `archiveEntity`, `deactivateEntity`, `deleteEntity`, `toggleSelection`, `clearSelection`. No `window.confirm` call — caller owns UX confirm. All mutators call `addLog` appropriately.

## Test Results

| State | Count | Notes |
|-------|-------|-------|
| GREEN | 189 | +23 from Plan 02-1 baseline (all 4 hook test files now GREEN) |
| Skipped | 7 | Pre-existing by design (future plan targets) |
| Todo | 11 | Pre-existing `.todo` tests (Phase 5 targets) |
| RED | 0 | All RED-by-design hook scaffolds resolved |

## Deviations from Plan

None — plan executed exactly as written. The hook implementations match the signatures in the `<interfaces>` block verbatim. No files outside `src/hooks/` were modified.

## Hand-off Notes for Plan 02-4

- **AddLog type**: canonical export is from `src/hooks/useAccounts.ts`. Import as `import type { AddLog } from './hooks/useAccounts'`.
- **Instantiation order in App.tsx**:
  ```ts
  const { auditLogs, addLog } = useAuditLog();
  const { accounts, updateAccount, saveAll } = useAccounts(addLog);
  const { entities, selectedEntityIds, activeEntityId, setActiveEntityId, setEntities, createEntity, updateEntity, archiveEntity, deactivateEntity, deleteEntity, toggleSelection, clearSelection } = useEntities(addLog);
  const { allEntries, entries, filteredEntries, addEntry, importEntries, searchQuery, setSearchQuery, dateFrom, setDateFrom, dateTo, setDateTo } = useJournals(addLog, activeEntityId);
  ```
- **window.confirm for deleteEntity**: `if (window.confirm(...)) deleteEntity(selectedEntityIds)` lives at the MasterDashboard call site — 02-4 wires this.
- **App.tsx is byte-identical** to its post-02-1 state — the hooks are not yet imported anywhere in App.tsx.

## Self-Check: PASSED

All 4 hook files exist on disk with implementations. Both task commits (`86fc96e`, `1b6a4e0`) present in git log. 189 tests GREEN, 0 RED.
