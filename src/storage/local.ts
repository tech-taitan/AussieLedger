/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LocalAdapter — IndexedDB implementation of `StorageAdapter` (Phase 3 Plan 03-2).
 *
 * Storage shape: one database `aussieledger`, one object store per collection
 * (entities / accounts / entries / auditLogs / meta) each keyed by the literal
 * SINGLETON_KEY `'__singleton__'`. This mirrors how Phase-2 hooks persisted —
 * whole-collection writes on every state change — so the hook refactor is
 * I/O-swap only.
 *
 * On first construction, runs the one-time localStorage → IndexedDB migration
 * (see legacy-migration.ts) under a `navigator.locks` request when available
 * so multiple tabs cannot race the upgrade.
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

  constructor() {
    this.readyPromise = this.init();
  }

  ready(): Promise<void> {
    return this.readyPromise;
  }

  private async init(): Promise<void> {
    this.db = await openDB<AussieLedgerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('entities')) db.createObjectStore('entities');
        if (!db.objectStoreNames.contains('accounts')) db.createObjectStore('accounts');
        if (!db.objectStoreNames.contains('entries')) db.createObjectStore('entries');
        if (!db.objectStoreNames.contains('auditLogs')) db.createObjectStore('auditLogs');
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      },
      blocked() {
        console.warn('IndexedDB upgrade blocked - close other tabs');
      },
    });
    this.db.onversionchange = () => this.db.close();

    // Multi-tab-safe legacy migration (Web Locks API; fallback when unavailable).
    const navAny =
      typeof navigator !== 'undefined'
        ? (navigator as unknown as {
            locks?: { request: (name: string, fn: () => Promise<void>) => Promise<void> };
          })
        : undefined;
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
      this.getEntities(),
      this.getAccounts(),
      this.getEntries(),
      this.getAuditLogs(),
    ]);
    return {
      _v: CURRENT_VERSION,
      entities,
      accounts,
      allEntries,
      auditLogs,
    } as PersistedRoot;
  }
  async importAll(state: PersistedRoot): Promise<void> {
    const tx = this.db.transaction(
      ['entities', 'accounts', 'entries', 'auditLogs'],
      'readwrite',
    );
    await tx.objectStore('entities').put(
      (state.entities as Entity[] | undefined) ?? [],
      SINGLETON_KEY,
    );
    await tx.objectStore('accounts').put(
      (state.accounts as Account[] | undefined) ?? [],
      SINGLETON_KEY,
    );
    await tx.objectStore('entries').put(
      (state.allEntries as Record<string, JournalEntry[]> | undefined) ?? {},
      SINGLETON_KEY,
    );
    await tx.objectStore('auditLogs').put(
      (state.auditLogs as AuditLog[] | undefined) ?? [],
      SINGLETON_KEY,
    );
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
