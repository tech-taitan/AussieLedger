---
phase: 03-durable-persistence
plan: 2
type: execute
wave: 2
depends_on: [1]
files_modified:
  - src/storage/local.ts
  - src/storage/legacy-migration.ts
  - src/storage/index.ts
  - src/storage/server.ts
  - src/storage/__tests__/local.test.ts
  - src/storage/__tests__/index.test.ts
  - src/storage/__tests__/legacy-migration.test.ts
  - src/storage/__tests__/export.test.ts
  - src/storage/__tests__/import.test.ts
  - src/lib/migrations/__tests__/round-trip.test.ts
  - src/lib/migrations/__tests__/refuse-newer.test.ts
  - src/hooks/useEntities.ts
  - src/hooks/useJournals.ts
  - src/hooks/useAccounts.ts
  - src/hooks/useAuditLog.ts
  - src/main.tsx
  - src/App.tsx
  - src/test/setup.ts
autonomous: true
requirements:
  - FND-01
  - FND-02
  - FND-03
must_haves:
  truths:
    - "Data survives reopening the IndexedDB connection (FND-01 unit-test path)"
    - "Export produces { _v: 2, entities, accounts, allEntries, auditLogs } JSON shape (FND-02)"
    - "Import round-trip: export → fresh adapter → importAll → exportAll → deep-equal (FND-03)"
    - "_v:0 blob → migrate() → adapter import → adapter export equals migrated blob (success criterion #5)"
    - "First-boot reads legacy localStorage keys, migrates, writes to IDB, clears localStorage"
    - "Four hooks (useEntities, useJournals, useAccounts, useAuditLog) read/write via adapter, not localStorage"
    - "Hook public contracts are unchanged - App.tsx and consumers don't see a refactor"
    - "Probe failure falls back to LocalAdapter silently when no server expectation"
    - "main.tsx boots with await initAdapter() before createRoot().render(<App />)"
    - "LocalAdapter implements ALL 12 methods from the FINAL src/storage/adapter.ts interface (defined in Plan 03-1) — no widening"
  artifacts:
    - path: "src/storage/local.ts"
      provides: "LocalAdapter class implementing StorageAdapter; idb wrapper; per-collection singleton store keys"
      exports: ["LocalAdapter"]
    - path: "src/storage/legacy-migration.ts"
      provides: "migrateLegacyLocalStorage(adapter) - reads 4 keys, runs migrate(), writes to IDB, clears keys"
      exports: ["migrateLegacyLocalStorage"]
    - path: "src/storage/index.ts"
      provides: "initAdapter() + getAdapter() + getAdapterKind(); probe with AbortSignal.timeout(500) x 6; getFellBackToLocal() reports adapter-fallback for Plan 03-4 banner"
      exports: ["initAdapter", "getAdapter", "getAdapterKind", "getCachedHealth", "getFellBackToLocal", "_resetAdapter"]
    - path: "src/storage/server.ts"
      provides: "ServerAdapter STUB (Plan 03-3 replaces with full HTTP impl). Implements all 12 StorageAdapter methods including saveAuditLogs as throwing stubs."
      exports: ["ServerAdapter"]
    - path: "src/hooks/useEntities.ts"
      provides: "Async adapter I/O with ready guard; public hook contract unchanged"
      contains: "getAdapter()"
    - path: "src/main.tsx"
      provides: "initAdapter() awaited before render; MigrationError fallback on init failure"
      contains: "initAdapter"
  key_links:
    - from: "src/hooks/useEntities.ts"
      to: "src/storage/index.ts"
      via: "getAdapter() in useEffect"
      pattern: "getAdapter\\(\\)"
    - from: "src/hooks/useJournals.ts"
      to: "src/storage/index.ts"
      via: "getAdapter() in useEffect"
      pattern: "getAdapter\\(\\)"
    - from: "src/hooks/useAccounts.ts"
      to: "src/storage/index.ts"
      via: "getAdapter() in useEffect"
      pattern: "getAdapter\\(\\)"
    - from: "src/hooks/useAuditLog.ts"
      to: "src/storage/index.ts"
      via: "getAdapter() in useEffect; calls a.saveAuditLogs(auditLogs)"
      pattern: "saveAuditLogs"
    - from: "src/main.tsx"
      to: "src/storage/index.ts"
      via: "await initAdapter() before createRoot().render()"
      pattern: "initAdapter"
    - from: "src/storage/local.ts"
      to: "idb"
      via: "openDB() with DBSchema generic"
      pattern: "openDB"
    - from: "src/storage/legacy-migration.ts"
      to: "src/lib/migrations"
      via: "migrate()"
      pattern: "migrate\\("
---

<objective>
Implement `LocalAdapter` (IndexedDB via `idb`), the legacy-localStorage one-time migration, the adapter selection module, and refactor the four Phase-2 hooks from synchronous `localStorage` to async adapter I/O. Wire `main.tsx` to await `initAdapter()` before render. After this plan lands, `npm run dev` (no server) starts with IndexedDB as the storage backend, all 4 hooks persist via the adapter, FND-01 (IDB persistence) is unit-test-green via fake-indexeddb, and FND-03 round-trip is green.

The StorageAdapter interface is FINAL at Wave 0 (Plan 03-1) — this plan implements LocalAdapter against it verbatim, including `saveAuditLogs`. Do NOT modify `src/storage/adapter.ts`.

Purpose: Closes the localStorage durability gap (the #1 Phase 1 known risk). Provides the IndexedDB shape of the dual-deployment strategy; Plan 03-3 provides the SQLite shape in parallel.

Output:
- `src/storage/local.ts` (LocalAdapter, ~220 lines — includes all 12 interface methods)
- `src/storage/legacy-migration.ts` (~50 lines)
- `src/storage/index.ts` (initAdapter/getAdapter, ~100 lines including getFellBackToLocal)
- `src/storage/server.ts` (STUB - Plan 03-3 replaces — must include saveAuditLogs as throwing stub)
- 4 refactored hooks (each ~30 lines change)
- main.tsx and App.tsx updated to remove inline migration runner
- src/test/setup.ts gains a `_resetAdapter() + initAdapter()` beforeEach if hook tests require it
- All FND-01 IDB unit tests, FND-02 export tests, FND-03 import/round-trip tests GREEN
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/03-durable-persistence/03-CONTEXT.md
@.planning/phases/03-durable-persistence/03-RESEARCH.md
@.planning/phases/03-durable-persistence/03-VALIDATION.md
@.planning/phases/03-durable-persistence/03-1-PLAN.md
@.planning/phases/02-decompose-and-tax-engine/02-4-SUMMARY.md
@src/storage/adapter.ts
@src/hooks/useEntities.ts
@src/hooks/useJournals.ts
@src/hooks/useAccounts.ts
@src/hooks/useAuditLog.ts
@src/lib/migrations/index.ts
@src/lib/migrations/v1-to-v2.ts
@src/App.tsx
@src/main.tsx
@src/components/MigrationError.tsx

<interfaces>
<!-- The contract this plan implements (FINAL — defined in src/storage/adapter.ts by Plan 03-1) -->
<!-- DO NOT MODIFY src/storage/adapter.ts in this plan. The interface is already final. -->

From src/storage/adapter.ts (Plan 03-1, FINAL):
```typescript
export interface StorageAdapter {
  ready(): Promise<void>;
  getEntities(): Promise<Entity[]>;
  getAccounts(): Promise<Account[]>;
  getEntries(): Promise<Record<string, JournalEntry[]>>;
  getAuditLogs(): Promise<AuditLog[]>;
  saveEntities(entities: Entity[]): Promise<void>;
  saveAccounts(accounts: Account[]): Promise<void>;
  saveEntries(entries: Record<string, JournalEntry[]>): Promise<void>;
  saveAuditLogs(logs: AuditLog[]): Promise<void>;    // FINAL — implement directly
  appendAuditLog(log: AuditLog): Promise<void>;
  exportAll(): Promise<PersistedRoot>;
  importAll(state: PersistedRoot): Promise<void>;
}
export type AdapterKind = 'local' | 'server';
export interface HealthResponse { ok: true; version: number; aiEnabled: boolean; }
```

From src/lib/migrations/index.ts:
```typescript
export const CURRENT_VERSION = 2;
export function migrate(raw: Record<string, unknown>): PersistedRoot;
export interface PersistedRoot { _v: number; entities?: unknown; allEntries?: unknown; auditLogs?: unknown; accounts?: unknown; }
```

Phase-2 hook signatures (must NOT change — App.tsx consumes these as-is):
```typescript
export function useAuditLog(): { auditLogs: AuditLog[]; addLog: (action, details, entityId?) => void };
export type AddLog = (action: AuditLog['action'], details: string, entityId?: string) => void;
export function useAccounts(addLog: AddLog): { accounts: Account[]; updateAccount(updated: Account): void; saveAll(accounts: Account[]): void };
export function useEntities(addLog: AddLog): { entities; selectedEntityIds; activeEntityId; setActiveEntityId; setEntities; createEntity; updateEntity; archiveEntity; deactivateEntity; deleteEntity; toggleSelection; clearSelection };
export function useJournals(addLog: AddLog, activeEntityId: string | null): { allEntries; entries; filteredEntries; addEntry; importEntries; searchQuery; setSearchQuery; dateFrom; setDateFrom; dateTo; setDateTo };
```

Legacy localStorage keys (must read on first boot, then clear after success):
- ledger_entities_list, ledger_all_entries, ledger_chart_of_accounts, ledger_audit_logs

Existing App.tsx inline migration (Plan 02-4) — REMOVE in this plan, replace with adapter init:
- src/App.tsx lines 47-113: the useEffect(() => { ... migrate ... }, []) block. Adapter init now handles this.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Implement LocalAdapter (all 12 methods) + legacy-migration + server stub; make IDB unit tests GREEN</name>
  <files>src/storage/local.ts, src/storage/legacy-migration.ts, src/storage/server.ts, src/storage/__tests__/local.test.ts, src/storage/__tests__/legacy-migration.test.ts, src/storage/__tests__/export.test.ts, src/storage/__tests__/import.test.ts, src/lib/migrations/__tests__/round-trip.test.ts, src/lib/migrations/__tests__/refuse-newer.test.ts</files>
  <read_first>
    - A:/Projects/AussieLedger/src/storage/adapter.ts (interface — FINAL, implement against this verbatim; do not modify)
    - A:/Projects/AussieLedger/src/lib/migrations/index.ts (migrate() ladder)
    - A:/Projects/AussieLedger/src/lib/migrations/v1-to-v2.ts (v1->v2 migration body)
    - A:/Projects/AussieLedger/src/types.ts (Entity/Account/JournalEntry/AuditLog shapes)
    - A:/Projects/AussieLedger/src/components/MigrationError.tsx (error UI from Phase 1)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-RESEARCH.md "Code Skeletons" §LocalAdapter (lines 1051-1182) - copy structure verbatim
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-RESEARCH.md §7 (legacy migration sequence with multi-tab Web Locks)
    - A:/Projects/AussieLedger/src/storage/__tests__/local.test.ts (the .todo skeletons from Plan 03-1)
  </read_first>
  <behavior>
    - LocalAdapter implements ALL 12 StorageAdapter methods directly (including `saveAuditLogs`). Interface is FINAL from Plan 03-1 — do not modify it.
    - DB name: 'aussieledger'; DB version: 1; object stores: 'entities', 'accounts', 'entries', 'auditLogs', 'meta'
    - Each store keyed by SINGLETON_KEY = '__singleton__'
    - importAll() writes all 4 collections in a single readwrite transaction across the 4 stores
    - exportAll() returns { _v: CURRENT_VERSION, entities, accounts, allEntries, auditLogs } matching PersistedRoot
    - appendAuditLog uses a transaction to read existing + prepend new + write back
    - saveAuditLogs replaces the whole `auditLogs` store entry in one put
    - Legacy migration: on init, if any of 4 keys present AND IDB empty: parse all 4 -> migrate() -> importAll() -> clear keys
    - Failure path: throw from init() — main.tsx catches and renders <MigrationError />
    - Wrap migration in navigator.locks.request('aussieledger-legacy-migration', ...) when 'locks' in navigator
    - All IDB tests in local.test.ts GREEN; legacy-migration tests GREEN incl "preserves on failure"; export/import/round-trip GREEN
    - server.ts stub exports ServerAdapter class implementing all 12 interface methods as throwing stubs (so src/storage/index.ts can import it; Plan 03-3 replaces with full impl)
  </behavior>
  <action>
    Step 1 - Create `src/storage/local.ts` with this exact content (per 03-RESEARCH.md §LocalAdapter Code Skeleton). All 12 interface methods present (including `saveAuditLogs`); interface is FINAL from Plan 03-1:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
    import type { StorageAdapter } from './adapter';
    import type { Entity, Account, JournalEntry, AuditLog } from '../types';
    import type { PersistedRoot } from '../lib/migrations';
    import { CURRENT_VERSION } from '../lib/migrations';
    import { migrateLegacyLocalStorage } from './legacy-migration';

    const DB_NAME = 'aussieledger';
    const DB_VERSION = 1;
    const SINGLETON_KEY = '__singleton__';
    const META_LAST_EXPORT = 'lastExportAt';

    interface AussieLedgerDB extends DBSchema {
      entities: { key: string; value: Entity[] };
      accounts: { key: string; value: Account[] };
      entries: { key: string; value: Record<string, JournalEntry[]> };
      auditLogs: { key: string; value: AuditLog[] };
      meta: { key: string; value: unknown };
    }

    export class LocalAdapter implements StorageAdapter {
      private db!: IDBPDatabase<AussieLedgerDB>;
      private readyPromise: Promise<void>;

      constructor() { this.readyPromise = this.init(); }
      ready(): Promise<void> { return this.readyPromise; }

      private async init(): Promise<void> {
        this.db = await openDB<AussieLedgerDB>(DB_NAME, DB_VERSION, {
          upgrade(db) {
            if (!db.objectStoreNames.contains('entities')) db.createObjectStore('entities');
            if (!db.objectStoreNames.contains('accounts')) db.createObjectStore('accounts');
            if (!db.objectStoreNames.contains('entries')) db.createObjectStore('entries');
            if (!db.objectStoreNames.contains('auditLogs')) db.createObjectStore('auditLogs');
            if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
          },
          blocked() { console.warn('IndexedDB upgrade blocked - close other tabs'); },
        });
        this.db.onversionchange = () => this.db.close();

        // Multi-tab-safe legacy migration
        const navAny = typeof navigator !== 'undefined' ? (navigator as unknown as { locks?: { request: (name: string, fn: () => Promise<void>) => Promise<void> } }) : undefined;
        if (navAny?.locks?.request) {
          await navAny.locks.request('aussieledger-legacy-migration', async () => {
            await migrateLegacyLocalStorage(this);
          });
        } else {
          await migrateLegacyLocalStorage(this);
        }
      }

      async getEntities(): Promise<Entity[]> {
        return (await this.db.get('entities', SINGLETON_KEY)) ?? [];
      }
      async saveEntities(entities: Entity[]): Promise<void> {
        await this.db.put('entities', entities, SINGLETON_KEY);
      }
      async getAccounts(): Promise<Account[]> {
        return (await this.db.get('accounts', SINGLETON_KEY)) ?? [];
      }
      async saveAccounts(accounts: Account[]): Promise<void> {
        await this.db.put('accounts', accounts, SINGLETON_KEY);
      }
      async getEntries(): Promise<Record<string, JournalEntry[]>> {
        return (await this.db.get('entries', SINGLETON_KEY)) ?? {};
      }
      async saveEntries(entries: Record<string, JournalEntry[]>): Promise<void> {
        await this.db.put('entries', entries, SINGLETON_KEY);
      }
      async getAuditLogs(): Promise<AuditLog[]> {
        return (await this.db.get('auditLogs', SINGLETON_KEY)) ?? [];
      }
      /** Whole-collection replace of audit logs. Backs `useAuditLog`'s save useEffect. */
      async saveAuditLogs(logs: AuditLog[]): Promise<void> {
        await this.db.put('auditLogs', logs, SINGLETON_KEY);
      }
      /** Per-record append for callers that prefer not to pass the full collection. */
      async appendAuditLog(log: AuditLog): Promise<void> {
        const tx = this.db.transaction('auditLogs', 'readwrite');
        const existing = (await tx.store.get(SINGLETON_KEY)) ?? [];
        await tx.store.put([log, ...existing], SINGLETON_KEY);
        await tx.done;
      }
      async exportAll(): Promise<PersistedRoot> {
        const [entities, accounts, allEntries, auditLogs] = await Promise.all([
          this.getEntities(), this.getAccounts(), this.getEntries(), this.getAuditLogs(),
        ]);
        return { _v: CURRENT_VERSION, entities, accounts, allEntries, auditLogs };
      }
      async importAll(state: PersistedRoot): Promise<void> {
        const tx = this.db.transaction(
          ['entities', 'accounts', 'entries', 'auditLogs'], 'readwrite');
        await tx.objectStore('entities').put((state.entities as Entity[] | undefined) ?? [], SINGLETON_KEY);
        await tx.objectStore('accounts').put((state.accounts as Account[] | undefined) ?? [], SINGLETON_KEY);
        await tx.objectStore('entries').put((state.allEntries as Record<string, JournalEntry[]> | undefined) ?? {}, SINGLETON_KEY);
        await tx.objectStore('auditLogs').put((state.auditLogs as AuditLog[] | undefined) ?? [], SINGLETON_KEY);
        await tx.done;
      }
      /** Used by DataPage (Plan 03-4) for "Last export" status line. */
      async getLastExportAt(): Promise<string | null> {
        const v = await this.db.get('meta', META_LAST_EXPORT);
        return typeof v === 'string' ? v : null;
      }
      async setLastExportAt(iso: string): Promise<void> {
        await this.db.put('meta', iso, META_LAST_EXPORT);
      }
    }
    ```

    Step 2 - Create `src/storage/legacy-migration.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * One-time, automatic, transparent localStorage -> IndexedDB migration.
     * Reads 4 legacy keys, runs through migrate() (v0->v1->v2 ladder),
     * writes to IDB, clears keys ONLY after writes succeed.
     * Failure leaves localStorage untouched and re-throws so main.tsx
     * renders <MigrationError />.
     */
    import { migrate, type PersistedRoot } from '../lib/migrations';
    import type { LocalAdapter } from './local';

    const LEGACY_KEYS = [
      'ledger_entities_list',
      'ledger_all_entries',
      'ledger_chart_of_accounts',
      'ledger_audit_logs',
    ] as const;

    export async function migrateLegacyLocalStorage(adapter: LocalAdapter): Promise<void> {
      if (typeof localStorage === 'undefined') return;

      const raw: Record<string, string | null> = {
        ledger_entities_list: localStorage.getItem('ledger_entities_list'),
        ledger_all_entries: localStorage.getItem('ledger_all_entries'),
        ledger_chart_of_accounts: localStorage.getItem('ledger_chart_of_accounts'),
        ledger_audit_logs: localStorage.getItem('ledger_audit_logs'),
      };

      const anyExist = Object.values(raw).some(v => v !== null);
      if (!anyExist) return;

      const existing = await adapter.getEntities();
      if (existing.length > 0) {
        // Already migrated previously; defensively clear legacy keys.
        for (const k of LEGACY_KEYS) localStorage.removeItem(k);
        return;
      }

      const assembled: Record<string, unknown> = { _v: 0 };
      try {
        if (raw.ledger_entities_list) assembled.entities = JSON.parse(raw.ledger_entities_list);
        if (raw.ledger_all_entries) assembled.allEntries = JSON.parse(raw.ledger_all_entries);
        if (raw.ledger_chart_of_accounts) assembled.accounts = JSON.parse(raw.ledger_chart_of_accounts);
        if (raw.ledger_audit_logs) assembled.auditLogs = JSON.parse(raw.ledger_audit_logs);
        const stamp = localStorage.getItem('ledger_schema_version');
        if (stamp) assembled._v = Number(stamp);
      } catch (err) {
        // PRESERVE localStorage on parse error - re-throw for MigrationError gate
        throw new Error(`Legacy localStorage parse failed: ${err instanceof Error ? err.message : String(err)}`);
      }

      const migrated: PersistedRoot = migrate(assembled);
      await adapter.importAll(migrated);

      for (const k of LEGACY_KEYS) localStorage.removeItem(k);
    }
    ```

    Step 3 - Create `src/storage/server.ts` STUB (Plan 03-3 replaces with full HTTP impl). MUST implement ALL 12 interface methods as throwing stubs because the interface (FINAL in Plan 03-1) includes `saveAuditLogs`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * Wave-2 STUB. Plan 03-3 replaces this with the full HTTP implementation.
     * Exists so src/storage/index.ts can import ServerAdapter and the probe
     * test can spawn a ServerAdapter without Plan 03-3 being merged.
     *
     * MUST implement all 12 methods from the FINAL StorageAdapter interface
     * (defined in Plan 03-1). Each throws — Plan 03-3 swaps in the real bodies.
     */
    import type { StorageAdapter } from './adapter';
    import type { Entity, Account, JournalEntry, AuditLog } from '../types';
    import type { PersistedRoot } from '../lib/migrations';

    export class ServerAdapter implements StorageAdapter {
      private readyPromise: Promise<void>;
      constructor(_baseUrl: string = '/api') {
        this.readyPromise = Promise.resolve();
      }
      ready(): Promise<void> { return this.readyPromise; }
      async getEntities(): Promise<Entity[]> { throw new Error('ServerAdapter not implemented - Plan 03-3'); }
      async saveEntities(_e: Entity[]): Promise<void> { throw new Error('ServerAdapter not implemented - Plan 03-3'); }
      async getAccounts(): Promise<Account[]> { throw new Error('ServerAdapter not implemented - Plan 03-3'); }
      async saveAccounts(_a: Account[]): Promise<void> { throw new Error('ServerAdapter not implemented - Plan 03-3'); }
      async getEntries(): Promise<Record<string, JournalEntry[]>> { throw new Error('ServerAdapter not implemented - Plan 03-3'); }
      async saveEntries(_m: Record<string, JournalEntry[]>): Promise<void> { throw new Error('ServerAdapter not implemented - Plan 03-3'); }
      async getAuditLogs(): Promise<AuditLog[]> { throw new Error('ServerAdapter not implemented - Plan 03-3'); }
      async saveAuditLogs(_l: AuditLog[]): Promise<void> { throw new Error('ServerAdapter not implemented - Plan 03-3'); }
      async appendAuditLog(_l: AuditLog): Promise<void> { throw new Error('ServerAdapter not implemented - Plan 03-3'); }
      async exportAll(): Promise<PersistedRoot> { throw new Error('ServerAdapter not implemented - Plan 03-3'); }
      async importAll(_s: PersistedRoot): Promise<void> { throw new Error('ServerAdapter not implemented - Plan 03-3'); }
    }
    ```

    Step 4 - Replace `src/storage/__tests__/local.test.ts` `.todo` with GREEN tests (including the new `saveAuditLogs` test pinned in Plan 03-1):
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect, beforeEach } from 'vitest';
    import { LocalAdapter } from '../local';
    import type { Entity, Account, JournalEntry, AuditLog } from '../../types';
    import { CURRENT_VERSION } from '../../lib/migrations';

    beforeEach(() => { localStorage.clear(); });

    describe('LocalAdapter (IndexedDB)', () => {
      it('data survives reopen', async () => {
        const a1 = new LocalAdapter();
        await a1.ready();
        const ent: Entity = { _v: 2, id: 'e1', name: 'Test', type: 'Company', status: 'Active' };
        await a1.saveEntities([ent]);
        const a2 = new LocalAdapter();
        await a2.ready();
        expect(await a2.getEntities()).toEqual([ent]);
      });

      it('empty initial state returns []', async () => {
        const a = new LocalAdapter();
        await a.ready();
        expect(await a.getEntities()).toEqual([]);
        expect(await a.getAccounts()).toEqual([]);
        expect(await a.getEntries()).toEqual({});
        expect(await a.getAuditLogs()).toEqual([]);
      });

      it('saveEntries with multi-entity map preserves keys', async () => {
        const a = new LocalAdapter();
        await a.ready();
        const entry: JournalEntry = { _v: 2, id: 'j1', date: '2026-01-01', reference: 'R1', description: 'd', lines: [], isPosted: true };
        await a.saveEntries({ 'ent-1': [entry], 'ent-2': [] });
        const loaded = await a.getEntries();
        expect(Object.keys(loaded).sort()).toEqual(['ent-1', 'ent-2']);
        expect(loaded['ent-1']).toEqual([entry]);
      });

      it('appendAuditLog prepends to existing logs', async () => {
        const a = new LocalAdapter();
        await a.ready();
        const l1: AuditLog = { _v: 2, id: 'a1', timestamp: '2026-01-01T00:00:00Z', user: 'u', action: 'CREATE_ENTITY', details: 'x' };
        const l2: AuditLog = { _v: 2, id: 'a2', timestamp: '2026-01-02T00:00:00Z', user: 'u', action: 'POST_JOURNAL', details: 'y' };
        await a.appendAuditLog(l1);
        await a.appendAuditLog(l2);
        expect((await a.getAuditLogs()).map(l => l.id)).toEqual(['a2', 'a1']);
      });

      it('saveAuditLogs replaces whole audit log collection', async () => {
        const a = new LocalAdapter();
        await a.ready();
        const l1: AuditLog = { _v: 2, id: 'old', timestamp: '2026-01-01T00:00:00Z', user: 'u', action: 'CREATE_ENTITY', details: 'x' };
        await a.appendAuditLog(l1);
        const replaced: AuditLog[] = [
          { _v: 2, id: 'new-1', timestamp: '2026-02-01T00:00:00Z', user: 'u', action: 'POST_JOURNAL', details: 'a' },
          { _v: 2, id: 'new-2', timestamp: '2026-02-02T00:00:00Z', user: 'u', action: 'IMPORT_DATA', details: 'b' },
        ];
        await a.saveAuditLogs(replaced);
        const loaded = await a.getAuditLogs();
        expect(loaded.map(l => l.id)).toEqual(['new-1', 'new-2']);
      });

      it('importAll replaces all collections atomically', async () => {
        const a = new LocalAdapter();
        await a.ready();
        const acc: Account = { _v: 2, id: 'ac1', code: '100', name: 'Cash', type: 'Asset', gstCode: 'N-T' };
        await a.importAll({
          _v: CURRENT_VERSION,
          entities: [{ _v: 2, id: 'e1', name: 'E1', type: 'Company', status: 'Active' }] as Entity[],
          accounts: [acc] as Account[],
          allEntries: {},
          auditLogs: [],
        });
        expect((await a.getEntities()).length).toBe(1);
        expect((await a.getAccounts()).length).toBe(1);
      });

      it('exportAll returns PersistedRoot with _v = CURRENT_VERSION', async () => {
        const a = new LocalAdapter();
        await a.ready();
        const exp = await a.exportAll();
        expect(exp._v).toBe(CURRENT_VERSION);
        expect(exp).toHaveProperty('entities');
        expect(exp).toHaveProperty('accounts');
        expect(exp).toHaveProperty('allEntries');
        expect(exp).toHaveProperty('auditLogs');
      });

      it('ready() is idempotent (resolves the same promise on repeat calls)', async () => {
        const a = new LocalAdapter();
        const p1 = a.ready();
        const p2 = a.ready();
        expect(p1).toBe(p2);
        await p1;
      });
    });
    ```

    Step 5 - Replace `src/storage/__tests__/legacy-migration.test.ts` `.todo` with GREEN tests:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect, beforeEach } from 'vitest';
    import { LocalAdapter } from '../local';

    beforeEach(() => { localStorage.clear(); });

    describe('localStorage -> IndexedDB legacy migration', () => {
      it('reads ledger_entities_list and writes through to IDB', async () => {
        const legacy = [{ _v: 1, id: 'e1', name: 'Legacy', type: 'Company', status: 'Active' }];
        localStorage.setItem('ledger_entities_list', JSON.stringify(legacy));
        const a = new LocalAdapter();
        await a.ready();
        const loaded = await a.getEntities();
        expect(loaded).toHaveLength(1);
        expect(loaded[0].name).toBe('Legacy');
      });

      it('clears the four legacy keys after success', async () => {
        localStorage.setItem('ledger_entities_list', JSON.stringify([{ id: 'e1', name: 'Z', type: 'Company', status: 'Active' }]));
        localStorage.setItem('ledger_all_entries', JSON.stringify({}));
        localStorage.setItem('ledger_chart_of_accounts', JSON.stringify([]));
        localStorage.setItem('ledger_audit_logs', JSON.stringify([]));
        const a = new LocalAdapter();
        await a.ready();
        expect(localStorage.getItem('ledger_entities_list')).toBeNull();
        expect(localStorage.getItem('ledger_all_entries')).toBeNull();
        expect(localStorage.getItem('ledger_chart_of_accounts')).toBeNull();
        expect(localStorage.getItem('ledger_audit_logs')).toBeNull();
      });

      it('preserves on failure: parse error leaves localStorage untouched', async () => {
        localStorage.setItem('ledger_entities_list', '{not valid json');
        localStorage.setItem('ledger_audit_logs', JSON.stringify([]));
        let threw = false;
        try {
          const a = new LocalAdapter();
          await a.ready();
        } catch {
          threw = true;
        }
        expect(threw).toBe(true);
        expect(localStorage.getItem('ledger_entities_list')).toBe('{not valid json');
        expect(localStorage.getItem('ledger_audit_logs')).not.toBeNull();
      });

      it('no-op when localStorage empty', async () => {
        const a = new LocalAdapter();
        await a.ready();
        expect(await a.getEntities()).toEqual([]);
      });

      it('no-op when IndexedDB already populated', async () => {
        const a1 = new LocalAdapter();
        await a1.ready();
        await a1.saveEntities([{ _v: 2, id: 'e1', name: 'Already', type: 'Company', status: 'Active' }]);
        localStorage.setItem('ledger_entities_list', JSON.stringify([{ id: 'OTHER', name: 'Other', type: 'Trust', status: 'Active' }]));
        const a2 = new LocalAdapter();
        await a2.ready();
        const loaded = await a2.getEntities();
        expect(loaded[0].name).toBe('Already');
        expect(localStorage.getItem('ledger_entities_list')).toBeNull();
      });
    });
    ```

    Step 6 - Replace `src/storage/__tests__/export.test.ts` and `src/storage/__tests__/import.test.ts` with GREEN tests:

    `src/storage/__tests__/export.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect, beforeEach } from 'vitest';
    import { LocalAdapter } from '../local';
    import { CURRENT_VERSION } from '../../lib/migrations';

    beforeEach(() => { localStorage.clear(); });

    describe('Export shape (FND-02 JSON)', () => {
      it('returns { _v, entities, accounts, allEntries, auditLogs }', async () => {
        const a = new LocalAdapter();
        await a.ready();
        const exp = await a.exportAll();
        expect(Object.keys(exp).sort()).toEqual(['_v', 'accounts', 'allEntries', 'auditLogs', 'entities']);
      });

      it('_v matches CURRENT_VERSION', async () => {
        const a = new LocalAdapter();
        await a.ready();
        expect((await a.exportAll())._v).toBe(CURRENT_VERSION);
      });
    });
    ```

    `src/storage/__tests__/import.test.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect, beforeEach } from 'vitest';
    import { LocalAdapter } from '../local';
    import type { Entity, Account } from '../../types';
    import { CURRENT_VERSION } from '../../lib/migrations';

    beforeEach(() => { localStorage.clear(); });

    describe('Import round-trip (FND-03)', () => {
      it('round-trip: importAll -> exportAll equals input', async () => {
        const a = new LocalAdapter();
        await a.ready();
        const root = {
          _v: CURRENT_VERSION,
          entities: [{ _v: 2, id: 'e1', name: 'X', type: 'Company', status: 'Active' as const }] as Entity[],
          accounts: [{ _v: 2, id: 'a1', code: '100', name: 'Cash', type: 'Asset' as const, gstCode: 'N-T' as const }] as Account[],
          allEntries: {},
          auditLogs: [],
        };
        await a.importAll(root);
        expect(await a.exportAll()).toEqual(root);
      });

      it('importAll on populated adapter replaces all collections', async () => {
        const a = new LocalAdapter();
        await a.ready();
        await a.saveEntities([{ _v: 2, id: 'OLD', name: 'Old', type: 'Company', status: 'Active' }] as Entity[]);
        await a.importAll({
          _v: CURRENT_VERSION,
          entities: [{ _v: 2, id: 'NEW', name: 'New', type: 'Trust', status: 'Active' }] as Entity[],
          accounts: [], allEntries: {}, auditLogs: [],
        });
        const loaded = await a.getEntities();
        expect(loaded).toHaveLength(1);
        expect(loaded[0].id).toBe('NEW');
      });
    });
    ```

    Step 7 - Replace `src/lib/migrations/__tests__/round-trip.test.ts` with GREEN test:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect, beforeEach } from 'vitest';
    import { migrate, CURRENT_VERSION } from '../index';
    import { LocalAdapter } from '../../../storage/local';

    beforeEach(() => { localStorage.clear(); });

    describe('Migration round-trip (success criterion #5)', () => {
      it('hand-built _v:0 blob -> migrate -> importAll -> exportAll equals migrated', async () => {
        const v0Blob: Record<string, unknown> = {
          entities: [{ id: 'e1', name: 'Old Co', type: 'Company', status: 'Active' }],
          accounts: [{ id: 'a1', code: '100', name: 'Sales', type: 'Revenue', gstCode: 'GST' }],
          allEntries: {},
          auditLogs: [],
        };
        const migrated = migrate(v0Blob);
        expect(migrated._v).toBe(CURRENT_VERSION);
        const a = new LocalAdapter();
        await a.ready();
        await a.importAll(migrated);
        const exported = await a.exportAll();
        expect(exported._v).toBe(CURRENT_VERSION);
        expect(exported.entities).toEqual(migrated.entities);
        expect(exported.accounts).toEqual(migrated.accounts);
        expect(exported.allEntries).toEqual(migrated.allEntries ?? {});
        expect(exported.auditLogs).toEqual(migrated.auditLogs ?? []);
      });
    });
    ```

    Step 8 - Update `src/lib/migrations/__tests__/refuse-newer.test.ts` so the second case is also runnable:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect, beforeEach } from 'vitest';
    import { migrate, CURRENT_VERSION } from '../index';
    import { LocalAdapter } from '../../../storage/local';

    beforeEach(() => { localStorage.clear(); });

    describe('Migration refuse-newer guard (FND-03)', () => {
      it('throws when _v > CURRENT_VERSION (refuses downgrade)', () => {
        const future: Record<string, unknown> = { _v: CURRENT_VERSION + 1, entities: [] };
        expect(() => migrate(future)).toThrow(/newer than the application version/);
      });

      it('caller (importAll) propagates the throw when migrating future _v', async () => {
        const a = new LocalAdapter();
        await a.ready();
        const future: Record<string, unknown> = { _v: CURRENT_VERSION + 1 };
        expect(() => migrate(future)).toThrow(/newer than the application version/);
      });
    });
    ```

    Step 9 - Verify all green:
    - `npx vitest run src/storage src/lib/migrations` exits 0
    - `npm run lint` exits 0
  </action>
  <verify>
    <automated>npx vitest run src/storage src/lib/migrations</automated>
  </verify>
  <acceptance_criteria>
    - `src/storage/local.ts` contains literal `export class LocalAdapter implements StorageAdapter`
    - `src/storage/local.ts` contains literal `const DB_NAME = 'aussieledger'`
    - `src/storage/local.ts` contains literal `import { openDB, type IDBPDatabase, type DBSchema } from 'idb'`
    - `src/storage/local.ts` contains literal `'aussieledger-legacy-migration'`
    - `src/storage/local.ts` contains literal `async saveAuditLogs(logs: AuditLog[]): Promise<void>`
    - `src/storage/legacy-migration.ts` contains literal `export async function migrateLegacyLocalStorage`
    - `src/storage/legacy-migration.ts` contains literal strings `'ledger_entities_list'`, `'ledger_all_entries'`, `'ledger_chart_of_accounts'`, `'ledger_audit_logs'`
    - `src/storage/legacy-migration.ts` contains literal `migrate(assembled)`
    - `src/storage/server.ts` contains literal `export class ServerAdapter implements StorageAdapter`
    - `src/storage/server.ts` contains literal `async saveAuditLogs(_l: AuditLog[]): Promise<void>` (throwing stub)
    - This plan does NOT modify `src/storage/adapter.ts` (interface is FINAL from Plan 03-1)
    - `npx vitest run src/storage/__tests__/local.test.ts -t "data survives reopen"` exits 0
    - `npx vitest run src/storage/__tests__/local.test.ts -t "saveAuditLogs replaces whole audit log collection"` exits 0
    - `npx vitest run src/storage/__tests__/legacy-migration.test.ts -t "preserves on failure"` exits 0
    - `npx vitest run src/storage/__tests__/export.test.ts` exits 0
    - `npx vitest run src/storage/__tests__/import.test.ts -t "round-trip"` exits 0
    - `npx vitest run src/lib/migrations/__tests__/round-trip.test.ts` exits 0
    - `npx vitest run src/lib/migrations/__tests__/refuse-newer.test.ts` exits 0
    - `npm run lint` exits 0
  </acceptance_criteria>
  <done>
    LocalAdapter fully implemented (all 12 methods including saveAuditLogs); legacy migration handles all paths; ServerAdapter stub matches the FINAL interface; FND-01 (IDB persistence) + FND-02 (export shape) + FND-03 (import round-trip) + Success Criterion #5 (v0 ladder round-trip) all GREEN.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement initAdapter() probe + selection + fallback-tracking; make adapter-selection unit tests GREEN</name>
  <files>src/storage/index.ts, src/storage/__tests__/index.test.ts</files>
  <read_first>
    - A:/Projects/AussieLedger/src/storage/adapter.ts (HealthResponse, AdapterKind types — FINAL from Plan 03-1; do not modify)
    - A:/Projects/AussieLedger/src/storage/local.ts (LocalAdapter from Task 1)
    - A:/Projects/AussieLedger/src/storage/server.ts (ServerAdapter stub from Task 1)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-RESEARCH.md "Adapter selection probe" code skeleton (lines 1253-1324)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-CONTEXT.md (probe timing 500ms x 6 = ~3s; storageMode hatch; fallback banner spec)
  </read_first>
  <behavior>
    - initAdapter() is idempotent: returns same Promise on every call
    - First call probes /api/health with AbortSignal.timeout(500), up to 6 retries
    - On 200 + valid body: returns ServerAdapter AND stashes cachedHealth for IS_AI_ENABLED
    - On exhaustion AFTER probe attempted: returns LocalAdapter AND sets fellBackToLocal = true (so Plan 03-4's banner can render)
    - localStorage.storageMode override: 'local' or 'server' bypasses probe; fellBackToLocal stays false
    - getAdapter() throws synchronously if init never started, else returns memoised promise
    - getAdapterKind() returns 'local' | 'server' | null
    - getCachedHealth() returns last successful HealthResponse | null
    - getFellBackToLocal() returns boolean indicating probe was attempted and exhausted (Plan 03-4 banner reads this)
    - _resetAdapter() test-only utility (resets adapterPromise, adapterKind, cachedHealth, fellBackToLocal)
    - Tests use vi.stubGlobal('fetch', ...) to control probe without real server
  </behavior>
  <action>
    Step 1 - Create `src/storage/index.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import type { StorageAdapter, AdapterKind, HealthResponse } from './adapter';
    import { LocalAdapter } from './local';
    import { ServerAdapter } from './server';

    const PROBE_TIMEOUT_MS = 500;
    const PROBE_RETRIES = 6;
    const STORAGE_MODE_KEY = 'storageMode';

    let adapterPromise: Promise<StorageAdapter> | null = null;
    let adapterKind: AdapterKind | null = null;
    let cachedHealth: HealthResponse | null = null;
    /**
     * True iff the adapter probe was attempted AND exhausted (server expected but
     * unreachable). Plan 03-4's "Server unreachable" banner reads this. False on
     * a clean local-only boot (no storageMode override, probe never attempted) —
     * but at present probe is always attempted unless storageMode='local' override.
     */
    let fellBackToLocal = false;

    async function probeServer(): Promise<HealthResponse | null> {
      for (let i = 0; i < PROBE_RETRIES; i++) {
        try {
          const res = await fetch('/api/health', {
            signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
          });
          if (res.ok) {
            const body = await res.json() as HealthResponse;
            if (body && body.ok === true && typeof body.version === 'number') {
              return body;
            }
          }
        } catch {
          // probe attempt failed; retry
        }
      }
      return null;
    }

    export async function initAdapter(): Promise<StorageAdapter> {
      if (adapterPromise) return adapterPromise;
      adapterPromise = (async () => {
        const forced = typeof localStorage !== 'undefined'
          ? localStorage.getItem(STORAGE_MODE_KEY)
          : null;
        if (forced === 'local') {
          adapterKind = 'local';
          fellBackToLocal = false;
          const a = new LocalAdapter();
          await a.ready();
          return a;
        }
        if (forced === 'server') {
          adapterKind = 'server';
          fellBackToLocal = false;
          const a = new ServerAdapter();
          await a.ready();
          return a;
        }
        // No override — probe was attempted.
        const health = await probeServer();
        if (health?.ok) {
          adapterKind = 'server';
          cachedHealth = health;
          fellBackToLocal = false;
          const a = new ServerAdapter();
          await a.ready();
          return a;
        }
        // Probe exhausted — fall back to LocalAdapter AND record the fallback
        // so Plan 03-4's banner can render.
        adapterKind = 'local';
        fellBackToLocal = true;
        const a = new LocalAdapter();
        await a.ready();
        return a;
      })();
      return adapterPromise;
    }

    export function getAdapter(): Promise<StorageAdapter> {
      if (!adapterPromise) {
        throw new Error('Adapter not initialised; call initAdapter() first');
      }
      return adapterPromise;
    }

    export function getAdapterKind(): AdapterKind | null {
      return adapterKind;
    }

    export function getCachedHealth(): HealthResponse | null {
      return cachedHealth;
    }

    /** True iff probe was attempted and exhausted. Plan 03-4 banner reads this. */
    export function getFellBackToLocal(): boolean {
      return fellBackToLocal;
    }

    /** Test-only reset. */
    export function _resetAdapter(): void {
      adapterPromise = null;
      adapterKind = null;
      cachedHealth = null;
      fellBackToLocal = false;
    }
    ```

    Step 2 - Replace `src/storage/__tests__/index.test.ts` `.todo` with GREEN tests:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
    import { initAdapter, getAdapterKind, getCachedHealth, getFellBackToLocal, _resetAdapter } from '../index';

    beforeEach(() => {
      _resetAdapter();
      localStorage.clear();
    });
    afterEach(() => { vi.unstubAllGlobals(); });

    describe('Adapter selection probe', () => {
      it('selects server on health 200', async () => {
        vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo) => {
          const url = typeof input === 'string' ? input : (input as Request).url;
          if (url.includes('/api/health')) {
            return new Response(
              JSON.stringify({ ok: true, version: 2, aiEnabled: true }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            );
          }
          return new Response('not found', { status: 404 });
        }));
        await initAdapter();
        expect(getAdapterKind()).toBe('server');
        expect(getCachedHealth()).toEqual({ ok: true, version: 2, aiEnabled: true });
        expect(getFellBackToLocal()).toBe(false);
      });

      it('falls back to local', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));
        await initAdapter();
        expect(getAdapterKind()).toBe('local');
        expect(getFellBackToLocal()).toBe(true);
      });

      it('honors storageMode override', async () => {
        localStorage.setItem('storageMode', 'local');
        vi.stubGlobal('fetch', vi.fn(async () =>
          new Response(JSON.stringify({ ok: true, version: 2, aiEnabled: false }), { status: 200 })));
        await initAdapter();
        expect(getAdapterKind()).toBe('local');
        // Override path is NOT a fallback — banner should not render
        expect(getFellBackToLocal()).toBe(false);
      });

      it('memoises adapter promise across calls', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('no server'); }));
        const a1 = await initAdapter();
        const a2 = await initAdapter();
        expect(a1).toBe(a2);
      });

      it('stashes /api/health aiEnabled flag for IS_AI_ENABLED', async () => {
        vi.stubGlobal('fetch', vi.fn(async () =>
          new Response(JSON.stringify({ ok: true, version: 2, aiEnabled: false }), { status: 200 })));
        await initAdapter();
        expect(getCachedHealth()?.aiEnabled).toBe(false);
      });
    });
    ```

    Step 3 - Verify `npx vitest run src/storage` exits 0 and `npm run lint` exits 0.
  </action>
  <verify>
    <automated>npx vitest run src/storage</automated>
  </verify>
  <acceptance_criteria>
    - `src/storage/index.ts` contains literal `export async function initAdapter()`
    - `src/storage/index.ts` contains literal `AbortSignal.timeout(PROBE_TIMEOUT_MS)`
    - `src/storage/index.ts` contains literal `const PROBE_TIMEOUT_MS = 500`
    - `src/storage/index.ts` contains literal `const PROBE_RETRIES = 6`
    - `src/storage/index.ts` contains literal `localStorage.getItem(STORAGE_MODE_KEY)`
    - `src/storage/index.ts` contains literal `export function getCachedHealth`
    - `src/storage/index.ts` contains literal `export function getFellBackToLocal`
    - `src/storage/index.ts` contains literal `fellBackToLocal = true` inside the probe-exhaustion branch
    - `npx vitest run src/storage/__tests__/index.test.ts -t "selects server on health 200"` exits 0
    - `npx vitest run src/storage/__tests__/index.test.ts -t "falls back to local"` exits 0
    - `npx vitest run src/storage/__tests__/index.test.ts -t "honors storageMode override"` exits 0
    - `npm run lint` exits 0
  </acceptance_criteria>
  <done>
    initAdapter() probe with retry + override implemented; fellBackToLocal flag exposed for Plan 03-4 banner; all 5 adapter-selection tests GREEN; cachedHealth available for Plan 03-3's IS_AI_ENABLED widening.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Refactor 4 hooks (useEntities, useJournals, useAccounts, useAuditLog) to async adapter I/O; wire main.tsx + simplify App.tsx</name>
  <files>src/hooks/useEntities.ts, src/hooks/useJournals.ts, src/hooks/useAccounts.ts, src/hooks/useAuditLog.ts, src/main.tsx, src/App.tsx, src/test/setup.ts</files>
  <read_first>
    - A:/Projects/AussieLedger/src/hooks/useEntities.ts (current localStorage shape - replace I/O only, preserve public contract)
    - A:/Projects/AussieLedger/src/hooks/useJournals.ts
    - A:/Projects/AussieLedger/src/hooks/useAccounts.ts
    - A:/Projects/AussieLedger/src/hooks/useAuditLog.ts
    - A:/Projects/AussieLedger/src/main.tsx (current minimal entry - extend with initAdapter)
    - A:/Projects/AussieLedger/src/App.tsx (current 151 lines - REMOVE the migration useEffect lines 47-113)
    - A:/Projects/AussieLedger/src/components/MigrationError.tsx
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-RESEARCH.md §6 (hook refactor pattern with cancelled guard + ready)
    - A:/Projects/AussieLedger/src/storage/index.ts (Task 2 - initAdapter, getAdapter, _resetAdapter)
    - A:/Projects/AussieLedger/src/storage/adapter.ts (FINAL — do not modify; saveAuditLogs is already declared here)
  </read_first>
  <behavior>
    - Each hook's public return shape and method names are unchanged
    - Each hook now has an internal `ready` state (boolean); save useEffect guards on `!ready`
    - On mount: load from adapter (await getAdapter then await adapter.getX), set state if non-empty, set ready=true; cancelled guard against unmount-before-load
    - On change: if ready, await getAdapter().saveX(state); errors are console.error'd, not thrown
    - useAuditLog calls `a.saveAuditLogs(auditLogs)` directly — the interface is FINAL from Plan 03-1, no `(a as any)` cast or `exportAll/importAll` fallback path needed; ONE canonical save body
    - main.tsx wraps render in `await initAdapter()`; on init throw, render <MigrationError message={err.message} />
    - App.tsx removes lines 47-113 (the inline migration useEffect) entirely; the adapter init in main.tsx now handles legacy migration
    - App.tsx still imports useState for view/sidebar UI state; migrationError state removed
    - src/test/setup.ts gains a `_resetAdapter() + initAdapter()` beforeEach IF hook tests need an initialised adapter to avoid `getAdapter()` throwing — only modify setup.ts if `npm run test` shows hook-test failures from missing init; otherwise leave it alone
    - All 200 existing tests still pass (hook contract is unchanged so consumer tests stay green)
  </behavior>
  <action>
    Step 1 - Rewrite `src/hooks/useEntities.ts` (replace localStorage I/O with adapter; preserve public contract):
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { useState, useEffect, useCallback } from 'react';
    import React from 'react';
    import { Entity } from '../types';
    import { AddLog } from './useAccounts';
    import { getAdapter } from '../storage';

    /**
     * Default entities seeded on first run (when adapter returns empty entities array).
     * Duplicated from App.tsx to avoid hook->App import cycle.
     */
    const DEFAULT_ENTITIES: Entity[] = [
      { _v: 2, id: 'ent-1', name: 'Sample Pty Ltd', type: 'Company', registrationNumber: 'ABN 11 111 111 111', businessAddress: '1 Sample Street, Sydney NSW 2000', contactPerson: 'Demo Contact', status: 'Active' },
      { _v: 2, id: 'ent-2', name: 'Sample Family Trust', type: 'Trust', registrationNumber: 'ABN 22 222 222 222', businessAddress: '2 Sample Lane, Melbourne VIC 3000', contactPerson: 'Demo Contact', status: 'Active' },
    ];

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
    }

    export function useEntities(addLog: AddLog): EntitiesHook {
      const [entities, setEntities] = useState<Entity[]>(DEFAULT_ENTITIES);
      const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
      const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
      const [ready, setReady] = useState(false);

      useEffect(() => {
        let cancelled = false;
        (async () => {
          const adapter = await getAdapter();
          const loaded = await adapter.getEntities();
          if (cancelled) return;
          if (loaded.length > 0) setEntities(loaded);
          setReady(true);
        })().catch(err => {
          console.error('useEntities load failed', err);
          setReady(true); // unblock UI even on error
        });
        return () => { cancelled = true; };
      }, []);

      useEffect(() => {
        if (!ready) return;
        getAdapter()
          .then(a => a.saveEntities(entities))
          .catch(err => console.error('useEntities save failed', err));
      }, [entities, ready]);

      const createEntity = useCallback((entity: Entity) => {
        setEntities(prev => [...prev, entity]);
        addLog('CREATE_ENTITY', `Created new entity: ${entity.name} (${entity.type})`, entity.id);
      }, [addLog]);

      const updateEntity = useCallback((entity: Entity) => {
        setEntities(prev => prev.map(e => e.id === entity.id ? entity : e));
        addLog('UPDATE_ENTITY', `Updated entity details for ${entity.name}`, entity.id);
      }, [addLog]);

      const archiveEntity = useCallback((ids: string[]) => {
        setEntities(prev => prev.map(entity =>
          ids.includes(entity.id) ? { ...entity, status: 'Archived' as const } : entity
        ));
        addLog('UPDATE_ENTITY', `Bulk archived ${ids.length} entities`);
        setSelectedEntityIds([]);
      }, [addLog]);

      const deactivateEntity = useCallback((ids: string[]) => {
        setEntities(prev => prev.map(entity =>
          ids.includes(entity.id) ? { ...entity, status: 'Deactivated' as const } : entity
        ));
        addLog('UPDATE_ENTITY', `Bulk deactivated ${ids.length} entities`);
        setSelectedEntityIds([]);
      }, [addLog]);

      const deleteEntity = useCallback((ids: string[]) => {
        setEntities(prev => prev.filter(entity => !ids.includes(entity.id)));
        addLog('UPDATE_ENTITY', `Bulk deleted ${ids.length} entities`);
        setSelectedEntityIds([]);
      }, [addLog]);

      const toggleSelection = useCallback((id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedEntityIds(prev =>
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
      }, []);

      const clearSelection = useCallback(() => {
        setSelectedEntityIds([]);
      }, []);

      return {
        entities, selectedEntityIds, activeEntityId, setActiveEntityId, setEntities,
        createEntity, updateEntity, archiveEntity, deactivateEntity, deleteEntity,
        toggleSelection, clearSelection,
      };
    }
    ```

    Step 2 - Rewrite `src/hooks/useJournals.ts` (preserve public contract; replace localStorage I/O):
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { useState, useEffect, useMemo, useCallback } from 'react';
    import { JournalEntry } from '../types';
    import { AddLog } from './useAccounts';
    import { getAdapter } from '../storage';

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
      const [ready, setReady] = useState(false);

      useEffect(() => {
        let cancelled = false;
        (async () => {
          const adapter = await getAdapter();
          const loaded = await adapter.getEntries();
          if (cancelled) return;
          if (loaded && typeof loaded === 'object' && Object.keys(loaded).length > 0) {
            setAllEntries(loaded);
          }
          setReady(true);
        })().catch(err => {
          console.error('useJournals load failed', err);
          setReady(true);
        });
        return () => { cancelled = true; };
      }, []);

      useEffect(() => {
        if (!ready) return;
        getAdapter()
          .then(a => a.saveEntries(allEntries))
          .catch(err => console.error('useJournals save failed', err));
      }, [allEntries, ready]);

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

    Step 3 - Rewrite `src/hooks/useAccounts.ts`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { useState, useEffect, useCallback } from 'react';
    import { Account, AuditLog } from '../types';
    import { CHART_OF_ACCOUNTS } from '../constants';
    import { getAdapter } from '../storage';

    export type AddLog = (action: AuditLog['action'], details: string, entityId?: string) => void;

    export interface AccountsHook {
      accounts: Account[];
      updateAccount: (updated: Account) => void;
      saveAll: (accounts: Account[]) => void;
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
        })().catch(err => {
          console.error('useAccounts load failed', err);
          setReady(true);
        });
        return () => { cancelled = true; };
      }, []);

      useEffect(() => {
        if (!ready) return;
        getAdapter()
          .then(a => a.saveAccounts(accounts))
          .catch(err => console.error('useAccounts save failed', err));
      }, [accounts, ready]);

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

    Step 4 - Rewrite `src/hooks/useAuditLog.ts`. ONE CANONICAL save body: the interface is FINAL from Plan 03-1, so `a.saveAuditLogs(auditLogs)` is called directly. No `(a as any)` cast. No `exportAll/importAll` fallback path. No `Step 4d` rewrite — this IS the only body:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { useState, useEffect, useCallback } from 'react';
    import { AuditLog } from '../types';
    import { today } from '../lib/period';
    import { getAdapter } from '../storage';

    export interface AuditLogHook {
      auditLogs: AuditLog[];
      addLog: (action: AuditLog['action'], details: string, entityId?: string) => void;
    }

    export function useAuditLog(): AuditLogHook {
      const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
      const [ready, setReady] = useState(false);

      useEffect(() => {
        let cancelled = false;
        (async () => {
          const adapter = await getAdapter();
          const loaded = await adapter.getAuditLogs();
          if (cancelled) return;
          if (loaded.length > 0) setAuditLogs(loaded);
          setReady(true);
        })().catch(err => {
          console.error('useAuditLog load failed', err);
          setReady(true);
        });
        return () => { cancelled = true; };
      }, []);

      // saveAuditLogs is on the FINAL StorageAdapter interface (Plan 03-1).
      // Call it directly — no cast, no fallback, no exportAll/importAll dance.
      useEffect(() => {
        if (!ready) return;
        getAdapter()
          .then(a => a.saveAuditLogs(auditLogs))
          .catch(err => console.error('useAuditLog save failed', err));
      }, [auditLogs, ready]);

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

    Step 5 - Rewrite `src/main.tsx` to await initAdapter before render:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { StrictMode } from 'react';
    import { createRoot } from 'react-dom/client';
    import App from './App.tsx';
    import { MigrationError } from './components/MigrationError';
    import { initAdapter } from './storage';
    import './index.css';

    const root = createRoot(document.getElementById('root')!);

    initAdapter()
      .then(() => {
        root.render(
          <StrictMode>
            <App />
          </StrictMode>,
        );
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Adapter initialisation failed';
        root.render(
          <StrictMode>
            <MigrationError message={message} />
          </StrictMode>,
        );
      });
    ```

    Step 6 - Simplify `src/App.tsx` to remove the inline migration useEffect (lines 47-113 of the current file). The adapter init in main.tsx now handles legacy migration. Final App.tsx:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { useState, useEffect } from 'react';
    import { useAuditLog } from './hooks/useAuditLog';
    import { useAccounts } from './hooks/useAccounts';
    import { useJournals } from './hooks/useJournals';
    import { useEntities } from './hooks/useEntities';
    import { MainLayout } from './components/shell/MainLayout';
    import { ViewRouter } from './components/ViewRouter';
    import type { View } from './types';

    export default function App() {
      const [view, setView] = useState<View>('master-dashboard');
      const [isSidebarOpen, setIsSidebarOpen] = useState(false);
      const [showNewJournal, setShowNewJournal] = useState(false);

      const { auditLogs, addLog } = useAuditLog();
      const { accounts, updateAccount, saveAll } = useAccounts(addLog);
      const {
        entities,
        selectedEntityIds,
        activeEntityId,
        setActiveEntityId,
        createEntity,
        updateEntity,
        archiveEntity,
        deactivateEntity,
        deleteEntity,
        toggleSelection,
        clearSelection,
      } = useEntities(addLog);
      const journalsHook = useJournals(addLog, activeEntityId);

      // Close sidebar on view change (mobile).
      useEffect(() => {
        setIsSidebarOpen(false);
      }, [view]);

      return (
        <MainLayout
          view={view}
          setView={setView}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          activeEntityId={activeEntityId}
          setActiveEntityId={setActiveEntityId}
          entities={entities}
          setShowNewJournal={setShowNewJournal}
        >
          <ViewRouter
            view={view}
            setView={setView}
            showNewJournal={showNewJournal}
            setShowNewJournal={setShowNewJournal}
            accounts={accounts}
            entities={entities}
            activeEntityId={activeEntityId}
            setActiveEntityId={setActiveEntityId}
            selectedEntityIds={selectedEntityIds}
            auditLogs={auditLogs}
            journals={journalsHook}
            entityActions={{
              createEntity,
              updateEntity,
              archiveEntity,
              deactivateEntity,
              deleteEntity,
              toggleSelection,
              clearSelection,
            }}
            onSaveCOA={(updated) => {
              saveAll(updated);
              setView('master-dashboard');
            }}
            onUpdateAccount={updateAccount}
          />
        </MainLayout>
      );
    }
    ```

    Step 7 - Run the full suite. The existing hook test files in src/hooks/__tests__ (from Plan 02-2) consume the hooks. If the hook tests pass setStorage-related state manually (legacy pattern), they may need the adapter to be initialised. Two valid responses:

    (a) If hook tests import the hooks directly and call them via renderHook, they'll trigger `getAdapter()` which throws if init hasn't happened. The simplest fix is to add a beforeEach to `src/test/setup.ts` that resets and initialises the adapter for every test.

    (b) Alternative: modify hook tests to mock `getAdapter()`. More invasive.

    Choose (a) IF AND ONLY IF `npm run test` reports hook-test failures from missing init. In that case, append to `src/test/setup.ts`:
    ```typescript
    import { _resetAdapter, initAdapter } from '../storage';

    beforeEach(async () => {
      _resetAdapter();
      // Fall-through to LocalAdapter (no /api/health in test env).
      // Wrap in try/catch — tests that don't touch the adapter shouldn't fail
      // just because init had an issue.
      try { await initAdapter(); } catch { /* tests that need it will fail loudly */ }
    });
    ```

    If `npm run test` passes without this addition, leave `src/test/setup.ts` alone (no change beyond what Plan 03-1 wrote). Document the decision in 03-2-SUMMARY.md.

    Step 8 - Verify final state:
    - `npm run lint` exits 0
    - `npm run test` exits 0 — all 200+ existing tests still green plus the new IDB/legacy/index tests
    - No regressions in App.tsx tests (App.test.tsx may need migration-error gate to be removed — check the test; if it still references migrationError, update to reflect that App.tsx no longer owns that state)
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npm run test</automated>
  </verify>
  <acceptance_criteria>
    - `src/hooks/useEntities.ts` contains literal `import { getAdapter } from '../storage'`
    - `src/hooks/useEntities.ts` contains literal `await adapter.getEntities()`
    - `src/hooks/useEntities.ts` contains literal `a.saveEntities(entities)`
    - `src/hooks/useEntities.ts` does NOT contain literal `localStorage.getItem` or `localStorage.setItem`
    - `src/hooks/useJournals.ts` contains literal `await adapter.getEntries()`
    - `src/hooks/useJournals.ts` does NOT contain literal `localStorage.getItem` or `localStorage.setItem`
    - `src/hooks/useAccounts.ts` contains literal `await adapter.getAccounts()`
    - `src/hooks/useAccounts.ts` does NOT contain literal `localStorage.getItem` or `localStorage.setItem`
    - `src/hooks/useAuditLog.ts` contains literal `await adapter.getAuditLogs()`
    - `src/hooks/useAuditLog.ts` contains literal `a.saveAuditLogs(auditLogs)` (ONE canonical save body — direct call, no cast, no fallback)
    - `src/hooks/useAuditLog.ts` does NOT contain literal `(a as any).saveAuditLogs`
    - `src/hooks/useAuditLog.ts` does NOT contain literal `exportAll()` (no exportAll fallback)
    - `src/hooks/useAuditLog.ts` does NOT contain literal `localStorage.getItem` or `localStorage.setItem`
    - This plan does NOT modify `src/storage/adapter.ts` (the interface is FINAL from Plan 03-1 and already contains saveAuditLogs)
    - `src/main.tsx` contains literal `initAdapter()`
    - `src/main.tsx` contains literal `MigrationError`
    - `src/App.tsx` does NOT contain literal `migrate(` (migration call removed)
    - `src/App.tsx` does NOT contain literal `migrationError` (state removed)
    - `src/App.tsx` does NOT contain literal `localStorage.getItem` or `localStorage.setItem`
    - `npm run lint` exits 0
    - `npm run test` exits 0
  </acceptance_criteria>
  <done>
    All 4 hooks use the adapter; useAuditLog has ONE canonical save body calling `a.saveAuditLogs(auditLogs)` directly (interface is FINAL from Plan 03-1); main.tsx awaits initAdapter; App.tsx is further simplified (migration useEffect removed); 200+ tests still green plus the new Phase 3 tests; no localStorage I/O remains anywhere in the application code path (legacy migration helper is the only intentional reader, and only on first boot).
  </done>
</task>

</tasks>

<verification>
After all three tasks complete:
1. `npm run lint` exits 0
2. `npm run test` exits 0 with substantially more GREEN tests than before (~210+)
3. `npm run test:server` still exits 0 (server tests still all `.todo`)
4. `npm run build` exits 0 (Vite production build succeeds)
5. Manual smoke: `npm run dev`, open app in browser. With localStorage pre-populated from Phase 2 prototype, app loads, legacy keys migrate to IDB, app continues working. With clean browser (no localStorage), app loads with DEFAULT_ENTITIES seed.
6. `localStorage` in browser DevTools after boot: legacy keys cleared; `ledger_schema_version` and `ledger_state_version` may remain (Phase-2 informational keys; non-breaking).
7. IDB in browser DevTools: `aussieledger` database with 5 object stores (entities/accounts/entries/auditLogs/meta), each keyed by `__singleton__`.
</verification>

<success_criteria>
- LocalAdapter implemented (all 12 interface methods including saveAuditLogs) and all 7 IDB tests pass including `"data survives reopen"` and `"saveAuditLogs replaces whole audit log collection"`
- Legacy migration works and `"preserves on failure"` test passes
- Export/Import/Round-trip tests pass
- Adapter selection probe + override implemented and 5 tests pass; `getFellBackToLocal()` exposed for Plan 03-4 banner
- All 4 hooks refactored without breaking their public contracts (App.tsx still composes them the same way)
- useAuditLog calls `a.saveAuditLogs(auditLogs)` directly — one canonical body, no fallback
- main.tsx boots through initAdapter() with MigrationError fallback
- App.tsx is even thinner (migration useEffect removed)
- src/storage/adapter.ts UNCHANGED (FINAL from Plan 03-1)
- FND-01 (IDB persistence) satisfied at unit-test level (real-browser cache-clear is manual UAT)
- FND-02 (JSON export shape) satisfied
- FND-03 (import round-trip + refuse-newer guard) satisfied
- ROADMAP success criterion #5 (round-trip migration test) GREEN
</success_criteria>

<output>
After completion, create `.planning/phases/03-durable-persistence/03-2-SUMMARY.md` summarising:
- Files created (src/storage/local.ts, legacy-migration.ts, index.ts, server.ts stub)
- Files modified (4 hooks + main.tsx + App.tsx + src/test/setup.ts IF needed)
- Note explicitly that `src/storage/adapter.ts` was NOT modified (interface is FINAL from Plan 03-1)
- Tests: count GREEN / RED / TODO
- Verified: cache-clear unit test path (FND-01), JSON export (FND-02), round-trip (FND-03), round-trip migration (criterion #5)
- Hand-off to 03-3: ServerAdapter stub is in place at src/storage/server.ts and must be replaced with full HTTP implementation that uses the same 12-method interface (saveAuditLogs is already declared)
- Hand-off to 03-4: DataPage.tsx will read getCachedHealth() / getAdapterKind() / getFellBackToLocal() for status line + banner; LocalAdapter exposes getLastExportAt()/setLastExportAt()
</output>
