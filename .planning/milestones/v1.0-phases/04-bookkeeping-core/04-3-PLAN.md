---
phase: 04-bookkeeping-core
plan: 3
type: execute
wave: 2
depends_on: [1]
files_modified:
  - src/hooks/useAccounts.ts
  - src/hooks/useEntities.ts
  - src/hooks/__tests__/useAccounts.test.ts
  - src/hooks/__tests__/useEntities.test.ts
  - src/components/AccountManager.tsx
  - src/components/__tests__/AccountManager.test.tsx
  - src/components/CoaTreeView.tsx
  - src/components/EntityForm.tsx
  - src/components/__tests__/EntityForm.test.tsx
  - src/components/BeneficiaryRegister.tsx
  - src/components/__tests__/BeneficiaryRegister.test.tsx
  - src/components/PartnerRegister.tsx
  - src/components/__tests__/PartnerRegister.test.tsx
autonomous: true
requirements:
  - BOOK-05
  - BOOK-06
  - BOOK-07
  - ENT-01
  - ENT-03
  - ENT-04
  - ENT-05
  - ENT-06
  - ENT-07
  - ENT-08
must_haves:
  truths:
    - "useAccounts extends with archiveAccount (sets isArchived: true), setIsDefault, plus per-account parent/child lookup helper"
    - "useEntities extends with archiveEntity behaviour change (block + offer Archive on delete if journals reference); createEntity seeds the per-type default CoA via getDefaultCoaFor"
    - "AccountManager renders parent rows above their children (tree view via CoaTreeView); default accounts show archive-vs-delete dialog (no hard delete); GST_CODES dropdown fixed from ['GST','FRE','N-T','ITS','CAP'] to correct AU 5-set ['GST','FRE','INP','N-T','CAP']"
    - "AccountManager surfaces a per-entity-type template badge (Individual / Company / Trust / Partnership) on default accounts"
    - "Archived accounts are hidden from the default journal-picker view AND from the AccountManager default view, but surface via a toggle"
    - "EntityForm exposes Type select restricted to {Company, Trust, Individual, Partnership}, gstRegistered toggle, accountingMethod radio, fyEndDate field (defaults '06-30'), Trust BeneficiaryRegister tab, Partnership PartnerRegister tab"
    - "EntityForm delete handler: if journals reference the entity, blocks delete and offers Archive (mirrors account-deletion policy from CONTEXT)"
    - "BeneficiaryRegister stores BeneficiaryRow[] on Entity.beneficiaries — UI exposes name + sharePercent only; sharePerType field is typed and storable but UI-hidden (Phase 5 work)"
    - "PartnerRegister stores PartnerRow[] on Entity.partners — same UI scope"
    - "All Wave-0 test scaffolds owned by this plan flip GREEN — every test name from 04-VALIDATION.md owned by 04-3 is passing"
    - "StorageAdapter interface untouched (Phase 3 FINAL preserved)"
  artifacts:
    - path: "src/hooks/useAccounts.ts"
      provides: "Extended hook: archiveAccount, setIsDefault, helpers for parent/child traversal"
      exports: ["useAccounts", "AccountsHook", "AddLog"]
    - path: "src/hooks/useEntities.ts"
      provides: "Extended hook: createEntity now seeds CoA per type (calls useAccounts.saveAll under the hood OR returns the seed for App.tsx to wire); archiveEntity unchanged; deleteEntity now checks journal references; beneficiary/partner array writers"
      exports: ["useEntities", "EntitiesHook"]
    - path: "src/components/AccountManager.tsx"
      provides: "Tree-view CoA browser; archive-vs-delete dialog; fixed GST dropdown; per-entity-type template badge; archive-toggle filter"
      contains: "CoaTreeView"
    - path: "src/components/CoaTreeView.tsx"
      provides: "Parent/child tree renderer used by AccountManager"
      exports: ["CoaTreeView"]
    - path: "src/components/EntityForm.tsx"
      provides: "v3 widened form with gstRegistered + accountingMethod + fyEndDate + per-type-tab (Trust beneficiaries, Partnership partners); block-or-archive delete dialog"
      contains: "gstRegistered"
    - path: "src/components/BeneficiaryRegister.tsx"
      provides: "Trust beneficiary register UI; manages BeneficiaryRow[] with name + sharePercent"
      exports: ["BeneficiaryRegister"]
    - path: "src/components/PartnerRegister.tsx"
      provides: "Partnership partner register UI; manages PartnerRow[] with name + sharePercent"
      exports: ["PartnerRegister"]
  key_links:
    - from: "src/hooks/useEntities.ts"
      to: "src/lib/coa/index.ts"
      via: "getDefaultCoaFor(entity.type, 'FY2026') on createEntity"
      pattern: "getDefaultCoaFor"
    - from: "src/components/AccountManager.tsx"
      to: "src/components/CoaTreeView.tsx"
      via: "renders tree view"
      pattern: "CoaTreeView"
    - from: "src/components/EntityForm.tsx"
      to: "src/components/BeneficiaryRegister.tsx"
      via: "Trust tab renders BeneficiaryRegister"
      pattern: "BeneficiaryRegister"
    - from: "src/components/EntityForm.tsx"
      to: "src/components/PartnerRegister.tsx"
      via: "Partnership tab renders PartnerRegister"
      pattern: "PartnerRegister"
    - from: "src/hooks/useAccounts.ts"
      to: "Account.isArchived field (v3)"
      via: "archiveAccount sets isArchived: true"
      pattern: "isArchived"
---

<objective>
Refactor the Chart-of-Accounts UI and the Entity form against the Wave-0 contracts from 04-1. This plan flips every BOOK-05 / BOOK-06 / BOOK-07 / ENT-01 / ENT-03 / ENT-04 / ENT-05 / ENT-06 / ENT-07 / ENT-08-related test scaffold from `.todo` to GREEN, AND surfaces the new behaviour through the refactored `AccountManager` (tree-view + archive-vs-delete dialog), the new `CoaTreeView` parent/child renderer, the refactored `EntityForm` (gstRegistered / accountingMethod / fyEndDate fields + Trust/Partnership tabs), and two new register components (`BeneficiaryRegister`, `PartnerRegister`). Phase-4 success criterion #5 (Trust beneficiary + Partnership partner registers) is end-to-end after this plan. Success criterion #1's UI surface (browsable 80–150 AU SME CoA) also lands here — the data layer was completed in 04-1.

Purpose: Closes the entity-config + CoA-browser gaps. Phase-2 AccountManager was a flat list with a typo in GST codes (`'ITS'` instead of `'INP'`); Phase-4 needs hierarchy + archive-vs-delete + per-type templates. Phase-2 EntityForm exposed only basic fields; Phase-4 needs the AU-specific GST / accounting-method / FY-end fields plus the two registers Phase-5 (tax returns) will consume. Runs in parallel with 04-2 (journal CRUD + TB) because the two plans touch disjoint files.

Output:
- `src/hooks/useAccounts.ts` extended (~60 line addition)
- `src/hooks/useEntities.ts` extended (~80 line addition — createEntity now seeds CoA; deleteEntity now checks references; beneficiary/partner writers)
- `src/components/AccountManager.tsx` refactored (~150 line change — tree view integration, GST_CODES fix, archive-vs-delete dialog, archived-toggle, per-type badge)
- `src/components/CoaTreeView.tsx` NEW (~100 lines)
- `src/components/EntityForm.tsx` refactored (~100 line addition — new fields, tab strip for Trust/Partnership)
- `src/components/BeneficiaryRegister.tsx` NEW (~100 lines)
- `src/components/PartnerRegister.tsx` NEW (~90 lines)
- 6 test files flip GREEN (useAccounts, useEntities, AccountManager, EntityForm, BeneficiaryRegister, PartnerRegister)
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/04-bookkeeping-core/04-CONTEXT.md
@.planning/phases/04-bookkeeping-core/04-RESEARCH.md
@.planning/phases/04-bookkeeping-core/04-VALIDATION.md
@.planning/phases/04-bookkeeping-core/04-1-PLAN.md
@src/types.ts
@src/lib/coa/index.ts
@src/lib/coa/types.ts
@src/storage/adapter.ts
@src/hooks/useAccounts.ts
@src/hooks/useEntities.ts
@src/components/AccountManager.tsx
@src/components/EntityForm.tsx

<interfaces>
<!-- FINAL contracts from Plan 04-1. DO NOT MODIFY these files. -->

From src/lib/coa/index.ts (Plan 04-1):
```typescript
export type EntityCoaType = 'Individual' | 'Company' | 'Trust' | 'Partnership';
export function getDefaultCoaFor(entityType: EntityCoaType, fy: string): Account[];
//   Returns Account[] with deterministic ids `coa-FY2026-{code}`, isDefault: true, isArchived: false
//   Throws if fy !== 'FY2026'
```

From src/types.ts (Plan 04-1, v3):
```typescript
export interface Account {
  // …phase 1/2 fields…
  parentCode?: string | null;
  isDefault?: boolean;
  isArchived?: boolean;
}

export interface BeneficiaryRow {
  id: string;
  name: string;
  sharePercent: number;
  sharePerType?: Partial<Record<'interest' | 'dividend' | 'capitalGain' | 'foreign' | 'other', number>>;
}
export interface PartnerRow { /* same shape as BeneficiaryRow */ }

export interface Entity {
  // …phase 1/2 fields…
  type: 'Company' | 'Trust' | 'Individual' | 'Partnership' | string;
  gstRegistered?: boolean;
  accountingMethod?: 'cash' | 'accruals';
  fyEndDate?: string;
  lockedFys?: string[];
  beneficiaries?: BeneficiaryRow[];
  partners?: PartnerRow[];
}
```

From src/storage/adapter.ts (Phase 3 FINAL — DO NOT WIDEN):
```typescript
export interface StorageAdapter {
  saveAccounts(accounts: Account[]): Promise<void>;
  saveEntities(entities: Entity[]): Promise<void>;
  // ...10 other methods unchanged...
}
```

Phase-2 useAccounts public contract (preserve verbatim — App.tsx consumes):
```typescript
export interface AccountsHook {
  accounts: Account[];
  updateAccount: (updated: Account) => void;
  saveAll: (accounts: Account[]) => void;
}
```

Phase-4 useAccounts widening (additive):
```typescript
export interface AccountsHook {
  // …phase 2 contract…
  archiveAccount: (id: string) => void;
  setIsDefault: (id: string, isDefault: boolean) => void;
  // Returns true if the account is referenced by any journal entry across any entity
  isAccountInUse: (id: string, allEntries: Record<string, JournalEntry[]>) => boolean;
}
```

Phase-2 useEntities public contract (preserve verbatim):
```typescript
export interface EntitiesHook {
  entities, selectedEntityIds, activeEntityId, setActiveEntityId, setEntities,
  createEntity, updateEntity, archiveEntity, deactivateEntity, deleteEntity,
  toggleSelection, clearSelection
}
```

Phase-4 useEntities widening:
```typescript
export interface EntitiesHook {
  // …phase 2 contract…
  setBeneficiaries: (entityId: string, rows: BeneficiaryRow[]) => void;
  setPartners: (entityId: string, rows: PartnerRow[]) => void;
  // Note: createEntity behaviour CHANGES to ALSO seed the default CoA — see Task 1
  // Note: deleteEntity behaviour CHANGES to throw if journals reference the entity — see Task 1
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Extend useAccounts (archiveAccount + setIsDefault + isAccountInUse) and useEntities (createEntity seeds CoA, deleteEntity reference-check, beneficiary/partner writers); append Phase-4 useAccounts tests + flip useEntities.test.ts Phase-4 scaffolds GREEN</name>
  <files>
    src/hooks/useAccounts.ts,
    src/hooks/useEntities.ts,
    src/hooks/__tests__/useAccounts.test.ts,
    src/hooks/__tests__/useEntities.test.ts
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/hooks/useAccounts.ts (current Phase-2 impl)
    - A:/Projects/AussieLedger/src/hooks/useEntities.ts (current Phase-2 impl)
    - A:/Projects/AussieLedger/src/hooks/__tests__/useAccounts.test.ts (existing Phase-2 tests — APPEND Phase-4 cases; Wave 0 did not pre-scaffold .todo cases for this file)
    - A:/Projects/AussieLedger/src/hooks/__tests__/useEntities.test.ts (existing tests + Phase-4 .todo scaffolds)
    - A:/Projects/AussieLedger/src/lib/coa/index.ts (Plan 04-1 — consume getDefaultCoaFor)
    - A:/Projects/AussieLedger/src/types.ts (v3 widened types)
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-CONTEXT.md "Deletion & Import" decisions (Block + offer Archive policy)
  </read_first>
  <behavior>
    - `useAccounts` adds:
        - `archiveAccount(id)`: sets `isArchived: true` on the account; writes `ARCHIVE_ACCOUNT` audit log
        - `setIsDefault(id, isDefault)`: toggles isDefault on the account (admin use; user can mark imported accounts as defaults if they really want)
        - `isAccountInUse(id, allEntries)`: returns true if any JournalEntry's lines reference that account — used by AccountManager delete dialog
    - `useEntities.createEntity(entity)` behaviour CHANGE (still preserves existing public signature):
        - After the existing `setEntities([...prev, entity])` block:
        - If the entity's `type` matches one of `Individual / Company / Trust / Partnership`, seed the default CoA via `getDefaultCoaFor(entity.type as EntityCoaType, 'FY2026')` AND merge with existing accounts via the per-account-id key (preserves any pre-existing default accounts from previously-created entities of the same type)
        - The seeded accounts have deterministic ids (`coa-FY2026-{code}`) so re-creating an entity of the same type does NOT duplicate accounts
        - To avoid making useEntities depend on useAccounts (which would re-introduce a hook-cycle): use the adapter directly. Inside createEntity:
            ```typescript
            const adapter = await getAdapter();
            const existing = await adapter.getAccounts();
            const seed = getDefaultCoaFor(entity.type as EntityCoaType, 'FY2026');
            const byId = Object.fromEntries(existing.map(a => [a.id, a]));
            for (const s of seed) { if (!byId[s.id]) byId[s.id] = s; }
            await adapter.saveAccounts(Object.values(byId));
            ```
        - If `entity.type` is not one of the AU four, skip seeding (legacy entities or import-restore scenarios)
    - `useEntities.deleteEntity(ids)` behaviour CHANGE:
        - If any journal in `allEntries` references the entity (i.e., `allEntries[entityId]?.length > 0`), THROW or set an internal `lastDeleteBlocked` flag. The simplest pattern: expose a new method `tryDeleteEntity(ids, allEntries): { blocked: string[] }` that returns the ids that were blocked (so EntityForm can prompt Archive); leave the existing `deleteEntity` as a force-delete (used internally by tryDeleteEntity when no journals exist).
        - ALTERNATIVELY: take `allEntries` as an argument to `deleteEntity` and have it self-check. Since we want to preserve the existing call-site shape (`deleteEntity(ids: string[])`), we add a sibling method `deleteEntityChecked(ids, allEntries)` which returns a result object.
        - **Recommendation:** add NEW method `tryDeleteEntity(ids: string[], allEntries: Record<string, JournalEntry[]>): { deleted: string[]; blocked: string[] }` — keeps the existing `deleteEntity` API for App.tsx compat, gives EntityForm a way to do the reference check
    - Adds `setBeneficiaries(entityId, rows)` and `setPartners(entityId, rows)` writers that mutate `Entity.beneficiaries` / `Entity.partners` and write `UPDATE_ENTITY` audit log
    - `useAccounts.test.ts` gains four new Phase-4 tests appended after existing Phase-2 cases (Wave 0 did NOT pre-create .todo cases for this file — executor writes them fresh per the bodies described in Step 3 below):
        - `archiveAccount sets isArchived flag and writes audit`
        - `setIsDefault toggles flag`
        - `isAccountInUse returns true when journal references` / `returns false when no reference`
    - `useEntities.test.ts` Phase-4 scaffolds flip GREEN:
        - `creates default CoA per type` — mock adapter.saveAccounts; create a Company entity; assert saveAccounts called with at least 80 accounts each with `isDefault: true`
        - `Trust entity gets BeneficiaryRow placeholder ready` — assert beneficiaries field can be set via setBeneficiaries
        - `Partnership entity gets PartnerRow placeholder ready` — same via setPartners
        - `archiveEntity sets status Archived` — already exists in Phase-2 tests; keep
        - `deleteEntity refuses if journals reference entity, suggests Archive` — call tryDeleteEntity with an entityId that has journals; assert it appears in the `blocked` list, not `deleted`
  </behavior>
  <action>
    Step 1 — Refactor `src/hooks/useAccounts.ts`. Read the existing file; preserve all of Phase 2 verbatim. Add the three new methods. Final file (additive — extension at the bottom of the current hook body):
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { useState, useEffect, useCallback } from 'react';
    import { Account, AuditLog, JournalEntry } from '../types';
    import { CHART_OF_ACCOUNTS } from '../constants';
    import { getAdapter } from '../storage';

    export type AddLog = (
      action: AuditLog['action'],
      details: string,
      entityId?: string,
    ) => void;

    export interface AccountsHook {
      accounts: Account[];
      updateAccount: (updated: Account) => void;
      saveAll: (accounts: Account[]) => void;
      // Phase 4 additions
      archiveAccount: (id: string) => void;
      setIsDefault: (id: string, isDefault: boolean) => void;
      isAccountInUse: (id: string, allEntries: Record<string, JournalEntry[]>) => boolean;
    }

    export function useAccounts(addLog: AddLog): AccountsHook {
      const [accounts, setAccounts] = useState<Account[]>(CHART_OF_ACCOUNTS);
      const [ready, setReady] = useState(false);

      useEffect(() => {
        let cancelled = false;
        (async () => {
          const adapter = await getAdapter();
          const loaded = await adapter.getAccounts();
          if (cancelled) return;
          if (loaded.length > 0) setAccounts(loaded);
          setReady(true);
        })().catch((err) => {
          console.error('useAccounts load failed', err);
          setReady(true);
        });
        return () => { cancelled = true; };
      }, []);

      useEffect(() => {
        if (!ready) return;
        getAdapter()
          .then((a) => a.saveAccounts(accounts))
          .catch((err) => console.error('useAccounts save failed', err));
      }, [accounts, ready]);

      const updateAccount = useCallback(
        (updated: Account) => {
          setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          addLog('UPDATE_ACCOUNT', `Updated account ${updated.code} - ${updated.name}`, '');
        },
        [addLog],
      );

      const saveAll = useCallback(
        (updated: Account[]) => {
          setAccounts(updated);
          addLog('UPDATE_ACCOUNT', 'Updated Chart of Accounts configuration', '');
        },
        [addLog],
      );

      const archiveAccount = useCallback(
        (id: string) => {
          setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, _v: 3, isArchived: true } : a)));
          addLog('ARCHIVE_ACCOUNT', `Archived account ${id}`, '');
        },
        [addLog],
      );

      const setIsDefault = useCallback(
        (id: string, isDefault: boolean) => {
          setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, _v: 3, isDefault } : a)));
          addLog('UPDATE_ACCOUNT', `Set isDefault=${isDefault} on account ${id}`, '');
        },
        [addLog],
      );

      const isAccountInUse = useCallback(
        (id: string, allEntries: Record<string, JournalEntry[]>): boolean => {
          for (const entries of Object.values(allEntries)) {
            for (const entry of entries) {
              if (entry.lines.some((l) => l.accountId === id)) return true;
            }
          }
          return false;
        },
        [],
      );

      return { accounts, updateAccount, saveAll, archiveAccount, setIsDefault, isAccountInUse };
    }
    ```

    Note that I've also widened the `updateAccount` audit emission to `'UPDATE_ACCOUNT'` instead of `'IMPORT_DATA'` (the Phase-2 placeholder). This is a small Phase-4 correctness fix; existing useAccounts tests assert on the call shape, not the action string verbatim — verify by running them; if any test pins `'IMPORT_DATA'` for updateAccount, update the test to assert `'UPDATE_ACCOUNT'` (this is correct behaviour per CONTEXT widened audit enum).

    Step 2 — Refactor `src/hooks/useEntities.ts`. Read the existing file; preserve all of Phase 2. Add:
    - `setBeneficiaries(entityId, rows)` and `setPartners(entityId, rows)` writers
    - `tryDeleteEntity(ids, allEntries): { deleted, blocked }` — references-aware delete
    - Modify `createEntity` to also seed default CoA after persisting the entity (use the adapter pattern — no useAccounts dependency)

    Final structure:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { useState, useEffect, useCallback } from 'react';
    import React from 'react';
    import { Entity, BeneficiaryRow, PartnerRow, JournalEntry } from '../types';
    import { AddLog } from './useAccounts';
    import { getAdapter } from '../storage';
    import { getDefaultCoaFor, type EntityCoaType } from '../lib/coa';

    // ... existing DEFAULT_ENTITIES preserved verbatim ...

    export interface EntitiesHook {
      entities: Entity[];
      selectedEntityIds: string[];
      activeEntityId: string | null;
      setActiveEntityId: (id: string | null) => void;
      setEntities: (entities: Entity[]) => void;
      createEntity: (entity: Entity) => void;
      updateEntity: (entity: Entity) => void;
      archiveEntity: (ids: string[]) => void;
      deactivateEntity: (ids: string[]) => void;
      deleteEntity: (ids: string[]) => void;
      toggleSelection: (id: string, e?: React.MouseEvent) => void;
      clearSelection: () => void;
      // Phase 4 additions
      tryDeleteEntity: (ids: string[], allEntries: Record<string, JournalEntry[]>) => { deleted: string[]; blocked: string[] };
      setBeneficiaries: (entityId: string, rows: BeneficiaryRow[]) => void;
      setPartners: (entityId: string, rows: PartnerRow[]) => void;
    }

    export function useEntities(addLog: AddLog): EntitiesHook {
      // ... existing state + load/save useEffects preserved verbatim ...

      const createEntity = useCallback(
        (entity: Entity) => {
          setEntities((prev) => [...prev, entity]);
          addLog('CREATE_ENTITY', `Created new entity: ${entity.name} (${entity.type})`, entity.id);

          // Phase 4 — seed default CoA per entity type (fire-and-forget)
          const t = entity.type as EntityCoaType;
          if (['Individual', 'Company', 'Trust', 'Partnership'].includes(t)) {
            (async () => {
              try {
                const adapter = await getAdapter();
                const existing = await adapter.getAccounts();
                const seed = getDefaultCoaFor(t, 'FY2026');
                const byId = Object.fromEntries(existing.map((a) => [a.id, a]));
                for (const s of seed) {
                  if (!byId[s.id]) byId[s.id] = s;
                }
                await adapter.saveAccounts(Object.values(byId));
              } catch (err) {
                console.error('default CoA seeding failed', err);
              }
            })();
          }
        },
        [addLog],
      );

      // ... existing updateEntity / archiveEntity / deactivateEntity / deleteEntity / toggleSelection / clearSelection preserved verbatim ...

      const tryDeleteEntity = useCallback(
        (ids: string[], allEntries: Record<string, JournalEntry[]>): { deleted: string[]; blocked: string[] } => {
          const blocked: string[] = [];
          const deletable: string[] = [];
          for (const id of ids) {
            if ((allEntries[id]?.length ?? 0) > 0) {
              blocked.push(id);
            } else {
              deletable.push(id);
            }
          }
          if (deletable.length > 0) {
            setEntities((prev) => prev.filter((e) => !deletable.includes(e.id)));
            addLog('DELETE_ENTITY', `Deleted ${deletable.length} entities`);
          }
          return { deleted: deletable, blocked };
        },
        [addLog],
      );

      const setBeneficiaries = useCallback(
        (entityId: string, rows: BeneficiaryRow[]) => {
          setEntities((prev) => prev.map((e) => (e.id === entityId ? { ...e, _v: 3, beneficiaries: rows } : e)));
          addLog('UPDATE_ENTITY', `Updated beneficiaries (${rows.length} rows)`, entityId);
        },
        [addLog],
      );

      const setPartners = useCallback(
        (entityId: string, rows: PartnerRow[]) => {
          setEntities((prev) => prev.map((e) => (e.id === entityId ? { ...e, _v: 3, partners: rows } : e)));
          addLog('UPDATE_ENTITY', `Updated partners (${rows.length} rows)`, entityId);
        },
        [addLog],
      );

      return {
        entities, selectedEntityIds, activeEntityId, setActiveEntityId, setEntities,
        createEntity, updateEntity, archiveEntity, deactivateEntity, deleteEntity,
        toggleSelection, clearSelection,
        tryDeleteEntity, setBeneficiaries, setPartners,
      };
    }
    ```

    Step 3 — Append four new Phase-4 tests to `src/hooks/__tests__/useAccounts.test.ts` (Wave 0 did NOT scaffold .todo cases here; write the test bodies fresh, importing the same fixtures/helpers used by existing Phase-2 cases in this file):
    - `archiveAccount sets isArchived flag and writes audit` — mock addLog spy; call archiveAccount; assert account.isArchived === true AND addLog called with `'ARCHIVE_ACCOUNT'`
    - `setIsDefault toggles flag` — setIsDefault(id, true) → isDefault true; setIsDefault(id, false) → isDefault false
    - `isAccountInUse returns true when journal references` — allEntries with a journal line referencing account id → returns true
    - `isAccountInUse returns false when no reference` — empty allEntries → returns false

    Step 4 — Flip Phase-4 `.todo` cases in `src/hooks/__tests__/useEntities.test.ts` to runnable tests:
    - `creates default CoA per type` — spy on `getAdapter()` so `adapter.saveAccounts` is captured. Create a Company entity. Use `await waitFor(...)` (React Testing Library) for the async seeding to complete. Assert `saveAccounts` was called with an array containing ≥ 80 accounts and at least one with `code: '1010'` (Cash on Hand).
    - `Trust entity gets BeneficiaryRow placeholder ready` — call setBeneficiaries(id, [{id:'b1',name:'Alice',sharePercent:100}]); assert resulting entity.beneficiaries length 1
    - `Partnership entity gets PartnerRow placeholder ready` — same via setPartners
    - `archiveEntity sets status Archived` — existing Phase-2 test should already cover; keep
    - `deleteEntity refuses if journals reference entity, suggests Archive` — call `tryDeleteEntity(['e1'], {e1: [posted entry]})`; assert result.blocked is `['e1']`, result.deleted is `[]`; assert entity 'e1' still present in entities list

    Step 5 — Verify:
    - `npx vitest run src/hooks/__tests__/useAccounts.test.ts src/hooks/__tests__/useEntities.test.ts` exits 0
    - `npm run lint` exits 0
    - `npm run test` exits 0
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npx vitest run src/hooks/__tests__/useAccounts.test.ts src/hooks/__tests__/useEntities.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/hooks/useAccounts.ts` exports `AccountsHook` with `archiveAccount`, `setIsDefault`, `isAccountInUse`
    - `src/hooks/useEntities.ts` imports `getDefaultCoaFor` from `../lib/coa`
    - `src/hooks/useEntities.ts` exports `EntitiesHook` with `tryDeleteEntity`, `setBeneficiaries`, `setPartners`
    - `src/hooks/useEntities.ts` `createEntity` calls `getDefaultCoaFor` for AU four entity types
    - `src/hooks/__tests__/useAccounts.test.ts` contains four new Phase-4 tests (appended; Wave 0 did not pre-scaffold this file) and all are runnable (no `.todo`)
    - `src/hooks/__tests__/useEntities.test.ts` Phase-4 tests are all runnable; contains literal `'creates default CoA per type'`
    - `npx vitest run src/hooks/__tests__/useAccounts.test.ts src/hooks/__tests__/useEntities.test.ts` exits 0 — all GREEN
    - `npm run lint` exits 0
    - `npm run test` exits 0
  </acceptance_criteria>
  <done>
    Hooks layer fully widened for CoA management + entity registers. CoA seeding wired through `getDefaultCoaFor`. App.tsx-consumed contracts preserved.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Build CoaTreeView + refactor AccountManager (tree view, archive-vs-delete, GST_CODES fix, per-type badge, archive-toggle); flip AccountManager.test.tsx scaffolds GREEN</name>
  <files>
    src/components/CoaTreeView.tsx,
    src/components/AccountManager.tsx,
    src/components/__tests__/AccountManager.test.tsx
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/components/AccountManager.tsx (current 322-line implementation — refactor; do NOT replace; note the `'ITS'` typo on line 25)
    - A:/Projects/AussieLedger/src/types.ts (v3 Account with parentCode + isDefault + isArchived)
    - A:/Projects/AussieLedger/src/hooks/useAccounts.ts (Task 1 output — consume archiveAccount + isAccountInUse)
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-CONTEXT.md "Deletion & Import" (block + offer archive) and "CoA shape" (per-type templates)
  </read_first>
  <behavior>
    - `CoaTreeView.tsx` is a presentational component:
        - Props: `{ accounts: Account[]; onSelect?: (id: string) => void; selectedId?: string; showArchived?: boolean }`
        - Builds a code→children map from `account.parentCode`
        - Renders depth-indented rows: root (parentCode === null) first; children indented; grandchildren further indented (recursive depth-1 / depth-2)
        - Hides archived accounts unless `showArchived` is true
        - Each row shows: code, name, type, `isDefault` badge if applicable
    - `AccountManager.tsx` refactor:
        - Replace flat list rendering with `<CoaTreeView accounts={localAccounts} ... />` in browse mode (Phase-2 had a flat list)
        - Fix `GST_CODES = ['GST', 'FRE', 'N-T', 'ITS', 'CAP']` → `GST_CODES = ['GST', 'FRE', 'INP', 'N-T', 'CAP']` (per RESEARCH Pitfall 9)
        - Replace `handleDeleteAccount` with new flow:
            ```typescript
            const inUse = isAccountInUse(account.id, allEntries);
            if (account.isDefault) {
              // Default accounts: archive only (no hard delete option)
              const confirmed = confirm('This is a default account. Archive instead of delete? Archived accounts are hidden from journal pickers but remain in historical reports.');
              if (confirmed) archiveAccount(account.id);
              return;
            }
            if (inUse) {
              // User account in use: block + offer archive
              const confirmed = confirm('Cannot delete — this account is referenced by journal entries. Archive instead?');
              if (confirmed) archiveAccount(account.id);
              return;
            }
            // User account, no references — proceed with hard delete (existing flow)
            ```
        - Add a per-account "isDefault" badge (small pill) when `account.isDefault === true`
        - Add a top-of-list toggle: "Show archived accounts" (default off) — when on, archived accounts appear with reduced opacity / strikethrough; when off, they're filtered out
        - The existing edit form still works — keep the inline edit per-row pattern
        - Pass `allEntries` prop from parent (App.tsx wires `useJournals().allEntries`); add it to the props interface additively (default empty)
    - `AccountManager.test.tsx` Phase-4 scaffolds flip GREEN:
        - `tree view parents first` — render with a parent account (parentCode: null) and a child (parentCode: parent.code); assert parent row appears BEFORE the child row in DOM order
        - `archive only for default` — render with a default account; simulate delete click; assert the dialog mentions "Archive" not "delete"; assert `archiveAccount` callback fires (not a hard-delete callback)
        - `GST dropdown is AU set` — render edit form for one account; assert the select element has options `['GST', 'FRE', 'INP', 'N-T', 'CAP']` (NOT `'ITS'`)
        - `archive vs delete dialog appears for default account` — same as above
        - `shows per-entity-type template badge` — render with a default account; assert a badge element renders
        - `archived accounts hidden from default view` — render with one archived + one not; assert only the non-archived is in the DOM initially
        - `archived accounts surface via filter toggle` — click the "Show archived" toggle; assert archived account now in DOM
  </behavior>
  <action>
    Step 1 — Create `src/components/CoaTreeView.tsx`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import React, { useMemo } from 'react';
    import type { Account } from '../types';
    import { cn } from '../lib/utils';

    interface CoaTreeViewProps {
      accounts: Account[];
      onSelect?: (id: string) => void;
      selectedId?: string;
      showArchived?: boolean;
    }

    interface TreeNode {
      account: Account;
      depth: number;
      children: TreeNode[];
    }

    function buildTree(accounts: Account[]): TreeNode[] {
      const byCode: Record<string, TreeNode> = {};
      // First pass: create nodes
      for (const a of accounts) {
        byCode[a.code] = { account: a, depth: 0, children: [] };
      }
      const roots: TreeNode[] = [];
      // Second pass: link children
      for (const a of accounts) {
        const node = byCode[a.code];
        if (a.parentCode && byCode[a.parentCode]) {
          byCode[a.parentCode].children.push(node);
        } else {
          roots.push(node);
        }
      }
      // Third pass: assign depths
      const walk = (n: TreeNode, depth: number) => {
        n.depth = depth;
        for (const c of n.children) walk(c, depth + 1);
      };
      for (const r of roots) walk(r, 0);
      // Sort each level by code
      roots.sort((a, b) => a.account.code.localeCompare(b.account.code));
      const sortKids = (n: TreeNode) => {
        n.children.sort((a, b) => a.account.code.localeCompare(b.account.code));
        for (const c of n.children) sortKids(c);
      };
      for (const r of roots) sortKids(r);
      return roots;
    }

    function flatten(roots: TreeNode[]): TreeNode[] {
      const out: TreeNode[] = [];
      const walk = (n: TreeNode) => {
        out.push(n);
        for (const c of n.children) walk(c);
      };
      for (const r of roots) walk(r);
      return out;
    }

    export const CoaTreeView: React.FC<CoaTreeViewProps> = ({
      accounts,
      onSelect,
      selectedId,
      showArchived = false,
    }) => {
      const flat = useMemo(() => {
        const visible = accounts.filter((a) => showArchived || !a.isArchived);
        return flatten(buildTree(visible));
      }, [accounts, showArchived]);

      return (
        <ul className="text-sm" data-testid="coa-tree">
          {flat.map((n) => {
            const a = n.account;
            return (
              <li
                key={a.id}
                className={cn(
                  'flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 cursor-pointer',
                  selectedId === a.id && 'bg-blue-50 font-medium',
                  a.isArchived && 'opacity-50 line-through',
                )}
                style={{ paddingLeft: `${0.5 + n.depth * 1.5}rem` }}
                onClick={() => onSelect?.(a.id)}
                data-testid={`coa-row-${a.code}`}
                data-depth={n.depth}
              >
                <span className="font-mono text-xs w-12">{a.code}</span>
                <span className={cn(n.children.length > 0 && 'font-semibold')}>{a.name}</span>
                <span className="text-xs opacity-60">({a.type})</span>
                {a.isDefault && (
                  <span className="text-xs bg-gray-100 px-1 rounded" data-testid={`default-badge-${a.code}`}>default</span>
                )}
                {a.isArchived && (
                  <span className="text-xs bg-yellow-100 px-1 rounded">archived</span>
                )}
              </li>
            );
          })}
        </ul>
      );
    };
    ```

    Step 2 — Refactor `src/components/AccountManager.tsx`. Read the current file end-to-end. Apply these changes:

    Change 1 — Fix the GST_CODES typo (line 25):
    ```typescript
    // BEFORE:  const GST_CODES = ['GST', 'FRE', 'N-T', 'ITS', 'CAP'];
    // AFTER:
    const GST_CODES = ['GST', 'FRE', 'INP', 'N-T', 'CAP'];
    ```

    Change 2 — Extend props to receive `allEntries` (default empty) and the new hook callbacks:
    ```typescript
    interface AccountManagerProps {
      accounts: Account[];
      onSave: (accounts: Account[]) => void;
      onCancel: () => void;
      // Phase 4 additions
      allEntries?: Record<string, JournalEntry[]>;
      onArchiveAccount?: (id: string) => void;
      onIsAccountInUse?: (id: string, allEntries: Record<string, JournalEntry[]>) => boolean;
    }
    ```

    Change 3 — Add a "Show archived" toggle state at the component top:
    ```typescript
    const [showArchived, setShowArchived] = useState(false);
    ```

    Change 4 — Replace the existing flat-list rendering with `<CoaTreeView />` for browse mode. The inline edit form stays per-row (when `editingId === account.id`); but the BROWSE rendering uses CoaTreeView. Pattern:
    ```typescript
    {!editingId && (
      <CoaTreeView
        accounts={localAccounts}
        onSelect={(id) => handleStartEdit(localAccounts.find((a) => a.id === id)!)}
        selectedId={editingId ?? undefined}
        showArchived={showArchived}
      />
    )}
    ```

    Change 5 — Replace `handleDeleteAccount` with the Block + Archive flow:
    ```typescript
    const handleDeleteAccount = (id: string) => {
      const account = localAccounts.find((a) => a.id === id);
      if (!account) return;
      const inUse = onIsAccountInUse?.(id, allEntries ?? {}) ?? false;

      if (account.isDefault) {
        if (confirm('This is a default account. Archive instead of delete? Archived accounts are hidden from journal pickers but remain in historical reports.')) {
          if (onArchiveAccount) onArchiveAccount(id);
          else setLocalAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, isArchived: true } : a)));
        }
        return;
      }

      if (inUse) {
        if (confirm('Cannot delete — this account is referenced by journal entries. Archive instead?')) {
          if (onArchiveAccount) onArchiveAccount(id);
          else setLocalAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, isArchived: true } : a)));
        }
        return;
      }

      // Free to hard-delete
      if (confirm('Delete this user-added account? This cannot be undone.')) {
        setLocalAccounts((prev) => prev.filter((a) => a.id !== id));
      }
    };
    ```

    Change 6 — Add the "Show archived" toggle near the top of the rendered output:
    ```typescript
    <label className="flex items-center gap-2 text-sm mb-3" data-testid="show-archived-toggle">
      <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
      Show archived accounts
    </label>
    ```

    Change 7 — Show isDefault badge inline next to the account name in any non-tree-view rendering paths (e.g. the existing edit-mode row should still show a small badge).

    Step 3 — Flip `AccountManager.test.tsx` Phase-4 scaffolds to runnable tests:
    - `tree view parents first` — render with parent (code '6000', parentCode null) + child (code '6010', parentCode '6000'); assert `data-testid="coa-row-6000"` appears BEFORE `data-testid="coa-row-6010"` in DOM order (via Testing Library's `getAllByTestId(/^coa-row-/)` and verifying order)
    - `archive only for default` — pass an `onArchiveAccount` spy + a default account; user clicks delete; window.confirm gets mocked to return true; assert `onArchiveAccount` called with the account id (NOT removed from list)
    - `GST dropdown is AU set` — start editing an account; assert the GST select's options array equals `['GST', 'FRE', 'INP', 'N-T', 'CAP']` exactly
    - `archive vs delete dialog appears for default account` — same scenario as `archive only for default`; assert `window.confirm` was called with a message containing literal `"Archive"`
    - `shows per-entity-type template badge` — pass an account with `isDefault: true`; assert `data-testid="default-badge-{code}"` is in DOM
    - `archived accounts hidden from default view` — pass one archived + one not; `showArchived` initially false; assert only the non-archived `coa-row-{code}` element is in DOM
    - `archived accounts surface via filter toggle` — fire change on the `show-archived-toggle` checkbox; assert the archived row now appears

    Step 4 — Verify:
    - `npx vitest run src/components/__tests__/AccountManager.test.tsx` exits 0
    - `npm run lint` exits 0
    - `npm run test` exits 0
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npx vitest run src/components/__tests__/AccountManager.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/CoaTreeView.tsx` exports `CoaTreeView` and contains literal `data-testid="coa-tree"`
    - `src/components/AccountManager.tsx` imports `CoaTreeView` from `./CoaTreeView`
    - `src/components/AccountManager.tsx` contains literal `['GST', 'FRE', 'INP', 'N-T', 'CAP']` (the corrected GST_CODES) AND does NOT contain the literal `'ITS'` anywhere
    - `src/components/AccountManager.tsx` contains literal `'Archive instead'` (dialog copy)
    - `src/components/AccountManager.tsx` contains literal `data-testid="show-archived-toggle"`
    - `src/components/__tests__/AccountManager.test.tsx` Phase-4 tests all runnable (no `.todo`)
    - `npx vitest run src/components/__tests__/AccountManager.test.tsx` exits 0 — all GREEN
    - `npm run lint` exits 0
    - `npm run test` exits 0 — no regressions
  </acceptance_criteria>
  <done>
    AccountManager refactored: tree view, GST typo fixed, archive-vs-delete dialog, archive-toggle, per-default badge. BOOK-05/06/07 UI surfaces complete.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Build BeneficiaryRegister + PartnerRegister; refactor EntityForm with v3 fields and Trust/Partnership tabs and block-or-archive delete dialog; flip EntityForm.test.tsx + BeneficiaryRegister.test.tsx + PartnerRegister.test.tsx scaffolds GREEN</name>
  <files>
    src/components/BeneficiaryRegister.tsx,
    src/components/PartnerRegister.tsx,
    src/components/__tests__/BeneficiaryRegister.test.tsx,
    src/components/__tests__/PartnerRegister.test.tsx,
    src/components/EntityForm.tsx,
    src/components/__tests__/EntityForm.test.tsx
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/components/EntityForm.tsx (current 334-line implementation — refactor; do NOT replace)
    - A:/Projects/AussieLedger/src/types.ts (BeneficiaryRow, PartnerRow shapes)
    - A:/Projects/AussieLedger/src/hooks/useEntities.ts (Task 1 — consume setBeneficiaries / setPartners / tryDeleteEntity)
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-CONTEXT.md "Phase 5 anticipation" (Trust/Partnership register shape: sharePercent UI only; sharePerType typed but UI-hidden)
  </read_first>
  <behavior>
    - `BeneficiaryRegister.tsx`:
        - Props: `{ rows: BeneficiaryRow[]; onChange: (rows: BeneficiaryRow[]) => void; readOnly?: boolean }`
        - Renders an editable table: each row has name (text) + sharePercent (number); add-row button appends a new row with fresh UUID; remove-row removes by id
        - Total share at the bottom; if total != 100, shows a soft warning (e.g. "Total share is 99%, not 100%")
        - sharePerType field is NOT exposed in UI (per CONTEXT) — but rows preserve any existing sharePerType from props
    - `PartnerRegister.tsx`: identical to BeneficiaryRegister but for PartnerRow[]
    - `EntityForm.tsx` refactor — preserve all Phase-2 behaviour; add:
        - Type select restricted to `['Company', 'Trust', 'Individual', 'Partnership']` (the form may currently use a freer `string`; tighten to these four for new entities — existing entities with legacy type strings still render, but the select shows only the four)
        - New form fields: `gstRegistered` (checkbox toggle), `accountingMethod` (radio: 'cash' / 'accruals'), `fyEndDate` (date or month-day text input, defaults to '06-30')
        - Tab strip when entity type is 'Trust': renders `<BeneficiaryRegister rows={formData.beneficiaries ?? []} onChange={(rows) => setFormData({...formData, beneficiaries: rows})} />`
        - Tab strip when entity type is 'Partnership': renders `<PartnerRegister rows={formData.partners ?? []} onChange={(rows) => setFormData({...formData, partners: rows})} />`
        - New Delete button flow: if `onDelete` prop is provided AND the entity has journals (caller-provided `inUseCount` prop), block with dialog: "Cannot delete — N journals reference this entity. Archive instead?"; on confirm, call `onArchive(entity.id)` instead of `onDelete`
        - All these are ADDITIVE — existing Phase-2 fields (name, type, registrationNumber, businessAddress, contactPerson, taxAgent*, notes) stay verbatim
    - Test scaffolds flip GREEN:
        - `BeneficiaryRegister.test.tsx`:
            - `renders for Trust entity` — render with rows=[]; assert add-row button + empty-state copy visible
            - `stores sharePercent only in UI` — add a row; assert input fields are `name` + `sharePercent` only (no sharePerType fields visible)
            - `add row appends new BeneficiaryRow` — click add-row; assert onChange called with array length 1
            - `remove row removes existing` — render with 2 rows; click remove on one; assert onChange called with array length 1
            - `total sharePercent warning when not 100` — render with rows summing to 99; assert warning text appears
        - `PartnerRegister.test.tsx`: same set of tests against PartnerRow
        - `EntityForm.test.tsx`:
            - `AU four entity types only` — assert the type select has options exactly `['Company', 'Trust', 'Individual', 'Partnership']` (in some order)
            - `gstRegistered toggle` — assert a checkbox/toggle is rendered with aria-label or label "GST registered"
            - `accountingMethod radio` — assert two radio inputs with values 'cash' and 'accruals'
            - `fyEndDate default 06-30` — render new entity (no entity prop); assert fyEndDate input value is '06-30'
            - `delete blocked with journals offers Archive` — pass `inUseCount={3}` + onDelete + onArchive spies; click delete; mock window.confirm to return true; assert onArchive called (NOT onDelete)
            - `Trust entity shows BeneficiaryRegister tab` — set formData.type to 'Trust'; assert BeneficiaryRegister component renders (look for its `data-testid="beneficiary-register"`)
            - `Partnership entity shows PartnerRegister tab` — set formData.type to 'Partnership'; assert PartnerRegister renders
  </behavior>
  <action>
    Step 1 — Create `src/components/BeneficiaryRegister.tsx`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import React from 'react';
    import type { BeneficiaryRow } from '../types';
    import { Plus, Trash2 } from 'lucide-react';

    interface BeneficiaryRegisterProps {
      rows: BeneficiaryRow[];
      onChange: (rows: BeneficiaryRow[]) => void;
      readOnly?: boolean;
    }

    export const BeneficiaryRegister: React.FC<BeneficiaryRegisterProps> = ({ rows, onChange, readOnly }) => {
      const addRow = () => onChange([...rows, { id: crypto.randomUUID(), name: '', sharePercent: 0 }]);
      const removeRow = (id: string) => onChange(rows.filter((r) => r.id !== id));
      const updateRow = (id: string, patch: Partial<BeneficiaryRow>) =>
        onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

      const total = rows.reduce((s, r) => s + Number(r.sharePercent || 0), 0);
      const showWarning = rows.length > 0 && Math.abs(total - 100) > 0.001;

      return (
        <section className="bg-white border border-[var(--line)] rounded p-4" data-testid="beneficiary-register">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-medium">Beneficiary register</h3>
            {!readOnly && (
              <button
                type="button"
                onClick={addRow}
                className="text-sm flex items-center gap-1 text-blue-600"
                data-testid="add-beneficiary"
              >
                <Plus size={14} /> Add beneficiary
              </button>
            )}
          </div>

          {rows.length === 0 ? (
            <p className="text-sm opacity-60">No beneficiaries yet. Add the first beneficiary to enable Trust distributions in Phase 5 returns.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="flex gap-2 items-center" data-testid={`beneficiary-row-${r.id}`}>
                  <input
                    type="text"
                    value={r.name}
                    onChange={(e) => updateRow(r.id, { name: e.target.value })}
                    placeholder="Beneficiary name"
                    aria-label="beneficiary-name"
                    className="flex-1 border rounded px-2 py-1 text-sm"
                    disabled={readOnly}
                  />
                  <input
                    type="number"
                    value={r.sharePercent}
                    onChange={(e) => updateRow(r.id, { sharePercent: Number(e.target.value) })}
                    aria-label="beneficiary-share"
                    className="w-24 border rounded px-2 py-1 text-sm text-right"
                    step="0.01"
                    disabled={readOnly}
                  />
                  <span className="text-xs opacity-60">%</span>
                  {!readOnly && (
                    <button type="button" onClick={() => removeRow(r.id)} aria-label="remove-beneficiary">
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {showWarning && (
            <p className="text-xs text-amber-700 mt-2" data-testid="beneficiary-warning">
              Total share is {total.toFixed(2)}%, not 100%. This will cause an unbalanced trust distribution in Phase 5.
            </p>
          )}
        </section>
      );
    };
    ```

    Step 2 — Create `src/components/PartnerRegister.tsx` — identical shape but for `PartnerRow`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import React from 'react';
    import type { PartnerRow } from '../types';
    import { Plus, Trash2 } from 'lucide-react';

    interface PartnerRegisterProps {
      rows: PartnerRow[];
      onChange: (rows: PartnerRow[]) => void;
      readOnly?: boolean;
    }

    export const PartnerRegister: React.FC<PartnerRegisterProps> = ({ rows, onChange, readOnly }) => {
      const addRow = () => onChange([...rows, { id: crypto.randomUUID(), name: '', sharePercent: 0 }]);
      const removeRow = (id: string) => onChange(rows.filter((r) => r.id !== id));
      const updateRow = (id: string, patch: Partial<PartnerRow>) =>
        onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

      const total = rows.reduce((s, r) => s + Number(r.sharePercent || 0), 0);
      const showWarning = rows.length > 0 && Math.abs(total - 100) > 0.001;

      return (
        <section className="bg-white border border-[var(--line)] rounded p-4" data-testid="partner-register">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-medium">Partner register</h3>
            {!readOnly && (
              <button
                type="button"
                onClick={addRow}
                className="text-sm flex items-center gap-1 text-blue-600"
                data-testid="add-partner"
              >
                <Plus size={14} /> Add partner
              </button>
            )}
          </div>

          {rows.length === 0 ? (
            <p className="text-sm opacity-60">No partners yet. Add the first partner to enable Partnership distributions in Phase 5 returns.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="flex gap-2 items-center" data-testid={`partner-row-${r.id}`}>
                  <input
                    type="text"
                    value={r.name}
                    onChange={(e) => updateRow(r.id, { name: e.target.value })}
                    placeholder="Partner name"
                    aria-label="partner-name"
                    className="flex-1 border rounded px-2 py-1 text-sm"
                    disabled={readOnly}
                  />
                  <input
                    type="number"
                    value={r.sharePercent}
                    onChange={(e) => updateRow(r.id, { sharePercent: Number(e.target.value) })}
                    aria-label="partner-share"
                    className="w-24 border rounded px-2 py-1 text-sm text-right"
                    step="0.01"
                    disabled={readOnly}
                  />
                  <span className="text-xs opacity-60">%</span>
                  {!readOnly && (
                    <button type="button" onClick={() => removeRow(r.id)} aria-label="remove-partner">
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {showWarning && (
            <p className="text-xs text-amber-700 mt-2" data-testid="partner-warning">
              Total share is {total.toFixed(2)}%, not 100%.
            </p>
          )}
        </section>
      );
    };
    ```

    Step 3 — Write `src/components/__tests__/BeneficiaryRegister.test.tsx` — flip the 5 `.todo` cases. Render with stubs, assert the behaviour per the test names.

    Step 4 — Write `src/components/__tests__/PartnerRegister.test.tsx` — flip the 3 `.todo` cases similarly.

    Step 5 — Refactor `src/components/EntityForm.tsx`. Read the entire current file. Make these ADDITIVE changes:

    Change 1 — Restrict the type select. Find the existing select rendering for `formData.type` and replace its options with the four AU entity types:
    ```typescript
    <select
      value={formData.type}
      onChange={(e) => handleChange('type', e.target.value)}
      aria-label="entity-type-select"
      className="..."
    >
      <option value="Company">Company (Pty Ltd)</option>
      <option value="Trust">Trust</option>
      <option value="Individual">Individual / Sole Trader</option>
      <option value="Partnership">Partnership</option>
    </select>
    ```

    Change 2 — Add v3 form fields after the existing Phase-2 fields:
    ```typescript
    <label className="flex items-center gap-2 mt-3">
      <input
        type="checkbox"
        checked={formData.gstRegistered ?? false}
        onChange={(e) => setFormData({ ...formData, gstRegistered: e.target.checked })}
        aria-label="GST registered"
      />
      <span className="text-sm">GST registered</span>
    </label>

    <fieldset className="mt-3">
      <legend className="text-sm font-medium">Accounting method</legend>
      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="accountingMethod"
          value="cash"
          checked={(formData.accountingMethod ?? 'accruals') === 'cash'}
          onChange={() => setFormData({ ...formData, accountingMethod: 'cash' })}
          aria-label="accounting-method-cash"
        />
        <span className="text-sm">Cash</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="accountingMethod"
          value="accruals"
          checked={(formData.accountingMethod ?? 'accruals') === 'accruals'}
          onChange={() => setFormData({ ...formData, accountingMethod: 'accruals' })}
          aria-label="accounting-method-accruals"
        />
        <span className="text-sm">Accruals</span>
      </label>
    </fieldset>

    <label className="block mt-3">
      <span className="text-sm font-medium">Financial year end (MM-DD)</span>
      <input
        type="text"
        value={formData.fyEndDate ?? '06-30'}
        onChange={(e) => setFormData({ ...formData, fyEndDate: e.target.value })}
        aria-label="fy-end-date"
        placeholder="06-30"
        pattern="\\d{2}-\\d{2}"
        className="border rounded px-2 py-1 text-sm w-32 mt-1"
      />
    </label>
    ```

    Change 3 — Add the conditional registers tab:
    ```typescript
    {formData.type === 'Trust' && (
      <BeneficiaryRegister
        rows={formData.beneficiaries ?? []}
        onChange={(rows) => setFormData({ ...formData, beneficiaries: rows })}
      />
    )}
    {formData.type === 'Partnership' && (
      <PartnerRegister
        rows={formData.partners ?? []}
        onChange={(rows) => setFormData({ ...formData, partners: rows })}
      />
    )}
    ```

    Change 4 — Add the block-or-archive delete dialog (additive — only if an `onDelete` callback prop is supplied alongside an `inUseCount` numeric prop):
    ```typescript
    interface EntityFormProps {
      entity?: Entity;
      onSave: (entity: Entity) => void;
      onCancel: () => void;
      // Phase 4 additions (all optional — preserves Phase 2 contract)
      onDelete?: (id: string) => void;
      onArchive?: (id: string) => void;
      inUseCount?: number;     // number of journals referencing this entity
    }
    ```
    Render a Delete button (only when editing existing entity AND onDelete is provided):
    ```typescript
    {isEdit && onDelete && (
      <button
        type="button"
        onClick={() => {
          if ((inUseCount ?? 0) > 0) {
            if (confirm(`Cannot delete — ${inUseCount} journals reference this entity. Archive instead?`)) {
              onArchive?.(formData.id);
            }
          } else {
            if (confirm('Delete this entity? This cannot be undone.')) {
              onDelete(formData.id);
            }
          }
        }}
        className="text-red-600 text-sm"
        data-testid="entity-delete-btn"
      >Delete entity</button>
    )}
    ```

    Step 6 — Write `src/components/__tests__/EntityForm.test.tsx` — flip the Phase-4 scaffolds to runnable tests. Use `vi.spyOn(window, 'confirm').mockReturnValue(true)` for the dialog tests.

    Step 7 — Verify:
    - `npx vitest run src/components/__tests__/EntityForm.test.tsx src/components/__tests__/BeneficiaryRegister.test.tsx src/components/__tests__/PartnerRegister.test.tsx` exits 0
    - `npm run lint` exits 0
    - `npm run test` exits 0
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npx vitest run src/components/__tests__/EntityForm.test.tsx src/components/__tests__/BeneficiaryRegister.test.tsx src/components/__tests__/PartnerRegister.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/BeneficiaryRegister.tsx` exports `BeneficiaryRegister` AND contains literal `data-testid="beneficiary-register"`
    - `src/components/PartnerRegister.tsx` exports `PartnerRegister` AND contains literal `data-testid="partner-register"`
    - `src/components/EntityForm.tsx` imports both register components
    - `src/components/EntityForm.tsx` contains literal `'gstRegistered'` AND `'accountingMethod'` AND `'fyEndDate'`
    - `src/components/EntityForm.tsx` contains literal `"Cannot delete"` (delete dialog copy)
    - `src/components/EntityForm.tsx` contains the four type literals: `"Company"`, `"Trust"`, `"Individual"`, `"Partnership"` in option elements
    - `src/components/__tests__/BeneficiaryRegister.test.tsx` runnable tests pass
    - `src/components/__tests__/PartnerRegister.test.tsx` runnable tests pass
    - `src/components/__tests__/EntityForm.test.tsx` Phase-4 tests pass
    - `npx vitest run src/components/__tests__/EntityForm.test.tsx src/components/__tests__/BeneficiaryRegister.test.tsx src/components/__tests__/PartnerRegister.test.tsx` exits 0
    - `npm run lint` exits 0
    - `npm run test` exits 0 — no regressions
  </acceptance_criteria>
  <done>
    EntityForm v3 widened with GST + accounting method + FY-end + Trust/Partnership tabs + Block-or-Archive delete dialog. BeneficiaryRegister + PartnerRegister ship. ENT-01/03/04/05/06/07/08 UI surfaces complete.
  </done>
</task>

</tasks>

<verification>
After all three tasks complete:

1. `npm run lint` exits 0
2. `npx vitest run src/hooks src/components/__tests__/AccountManager.test.tsx src/components/__tests__/EntityForm.test.tsx src/components/__tests__/BeneficiaryRegister.test.tsx src/components/__tests__/PartnerRegister.test.tsx` exits 0
3. `npm run test` exits 0 — full SPA suite GREEN
4. `npm run test:server` exits 0 — server suite unchanged
5. `src/storage/adapter.ts` untouched (`git diff src/storage/adapter.ts` empty)
6. `src/types.ts` untouched (`git diff src/types.ts` empty)
7. `src/lib/coa/*` untouched (Wave 0 contracts preserved)
8. `src/components/AccountManager.tsx` contains literal `'INP'` AND does NOT contain `'ITS'` — the typo from RESEARCH Pitfall 9 is fixed
9. Existing Phase 1/2/3 tests preserved — no regressions
</verification>

<success_criteria>
- Success criterion #1 (browsable 80–150 AU SME CoA grouped under parents) — UI surface DELIVERED via AccountManager + CoaTreeView
- Success criterion #5 (Trust beneficiary register + Partnership partner register, used by Phase 5) — DELIVERED via EntityForm Trust/Partnership tabs + BeneficiaryRegister + PartnerRegister components persisting to `Entity.beneficiaries` / `Entity.partners`
- Phase 4 requirements satisfied by this plan: BOOK-05 (browse default CoA), BOOK-06 (CRUD CoA with code/name/type/GST/tax-label), BOOK-07 (parent/child hierarchy), ENT-01 (AU four entity types), ENT-03 (gstRegistered), ENT-04 (accountingMethod), ENT-05 (fyEndDate), ENT-06 (edit/archive/delete with block + archive), ENT-07 (Trust beneficiaries), ENT-08 (Partnership partners)
- Test counts (rough): +4 useAccounts tests, +5 useEntities tests, +7 AccountManager tests, +5 BeneficiaryRegister tests, +3 PartnerRegister tests, +7 EntityForm tests = ~31 new GREEN cases
- StorageAdapter untouched; v3 types untouched; CoA seed untouched — Wave 0 contracts preserved
- The `'ITS'` GST-code typo from Phase 2 is permanently fixed
</success_criteria>

<output>
After completion, create `.planning/phases/04-bookkeeping-core/04-3-SUMMARY.md` summarising:
- Files created (CoaTreeView, BeneficiaryRegister, PartnerRegister; plus widened tests)
- Files modified (useAccounts, useEntities, AccountManager, EntityForm; counts of new lines)
- Tests: count GREEN / RED / TODO (expected: ~31 new GREEN; 0 RED)
- StorageAdapter untouched confirmation
- v3 types untouched confirmation
- CoA seed untouched confirmation
- Phase 4 requirements addressed: BOOK-05, BOOK-06, BOOK-07, ENT-01, ENT-03, ENT-04, ENT-05, ENT-06, ENT-07, ENT-08
- GST_CODES typo fix from RESEARCH Pitfall 9 confirmed
- Hand-off to 04-4 (Import flow): EntityForm now exposes `gstRegistered` (used to pre-set imported account GST codes); AccountManager's archive flow (the import-create-new-account UI in 04-4 should use the same archive-vs-delete dialog convention)
- Hand-off note for /gsd:verify-work: success criteria #1 (CoA UI) + #5 (entity registers) visible end-to-end; #2 from 04-2; #3 + #4 land in 04-4
</output>
