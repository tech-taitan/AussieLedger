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
 *
 * Phase 11 hardening (Plan 11-1):
 *  - `META_LAST_WRITE = 'lastWriteAt'` mirror-pattern alongside META_LAST_EXPORT.
 *  - Private `bumpWriteAt()` helper called after every data-changing put
 *    (saveEntities / saveAccounts / saveEntries / saveAuditLogs /
 *     appendAuditLog / importAll non-silent path).
 *  - Private `tryPersist()` called ONCE from init() — never re-prompted.
 *  - Four NEW duck-typed accessors NOT added to the StorageAdapter interface:
 *      getPersistGranted(): Promise<boolean | null>
 *      getStorageEstimate(): Promise<StorageEstimate | null>
 *      getLastWriteAt(): Promise<string | null>
 *      setLastWriteAt(iso: string): Promise<void>
 *  - importAll signature widened to (state, opts?: { silent?: boolean }).
 *    opts.silent === true SKIPS the bump — reserved for schema/legacy migration
 *    call sites that must not fire backup-nag on every existing user's first
 *    launch under Phase 11.
 *  - All timestamps route through nowIso() from src/lib/period.ts (single source
 *    of Date for the codebase per Phase 2 invariant + Plan 11-1 Task 3 lint).
 *
 * Phase 14 (Plan 14-1 Task 2):
 *  - Constructor widened to accept optional `dbName: string = DB_NAME_PROD`.
 *    Zero-arg call sites (src/storage/index.ts + tests) keep working byte-
 *    identically. The demo route passes DB_NAME_DEMO to isolate from production
 *    data per PITFALLS §4 HARD-BLOCK.
 *  - Two new exported constants: DB_NAME_PROD = 'aussieledger' (production),
 *    DB_NAME_DEMO = 'aussieledger-demo' (demo). IDB DB-names are origin-scoped
 *    strings; namespace isolation is the only safe mitigation for cross-DB
 *    contamination per PITFALLS §4.
 *  - New duck-typed `getDbName()` accessor (test-only introspection) — NOT on
 *    the StorageAdapter interface; consistent with Phase 11's duck-typed
 *    accessor pattern (getPersistGranted / getStorageEstimate / getLastWriteAt
 *    / setLastWriteAt).
 *  - The legacy-migration Web Lock name ('aussieledger-legacy-migration') stays
 *    HARD-CODED — the lock is origin-scoped and serialises a one-time idempotent
 *    legacy-localStorage check; sharing it across prod + demo is harmless.
 */
import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { StorageAdapter } from './adapter';
import type { Entity, Account, JournalEntry, AuditLog } from '../types';
import type { PersistedRoot } from '../lib/migrations';
import { CURRENT_VERSION } from '../lib/migrations';
import { migrateLegacyLocalStorage } from './legacy-migration';
import { nowIso } from '../lib/period';

/** Production IDB database name. Used by default-constructed adapters and
 *  every existing call site in src/storage/index.ts. */
export const DB_NAME_PROD = 'aussieledger';
/** Demo IDB database name. Used by the /demo route per PITFALLS §4 HARD-BLOCK
 *  — keeping demo writes byte-isolated from the production 'aussieledger' DB. */
export const DB_NAME_DEMO = 'aussieledger-demo';
const DB_VERSION = 1;
const SINGLETON_KEY = '__singleton__';
const META_LAST_EXPORT = 'lastExportAt';
const META_LAST_WRITE = 'lastWriteAt';

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
  private _persistGranted: boolean | null = null;
  private readonly dbName: string;

  constructor(dbName: string = DB_NAME_PROD) {
    this.dbName = dbName;
    this.readyPromise = this.init();
  }

  ready(): Promise<void> {
    return this.readyPromise;
  }

  private async init(): Promise<void> {
    this.db = await openDB<AussieLedgerDB>(this.dbName, DB_VERSION, {
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

    // Phase 11 IDB-01 — request persistent storage ONCE per LocalAdapter
    // instance, AFTER the legacy migration block so returning users' engagement
    // score has had time to accumulate. The cached outcome is consumed by
    // DataPage via duck-typed getPersistGranted() (Plan 11-2).
    await this.tryPersist();
  }

  /**
   * Request persistent storage from the browser ONCE, cache the outcome.
   *
   * Engagement-aware: by the time init() runs, returning users have prior
   * engagement recorded so Chrome/Edge auto-grant; Firefox shows the prompt
   * (or auto-denies based on engagement); Safari heuristically grants if
   * installed as a PWA. We do NOT re-prompt under any circumstance — false
   * is a respected user decision (see 11-CONTEXT.md decision: "Never re-prompt
   * after user deny").
   *
   * Cached as:
   *   true  → granted
   *   false → denied (or persist() threw)
   *   null  → API not supported (degrade silently)
   */
  private async tryPersist(): Promise<void> {
    try {
      if (typeof navigator === 'undefined') {
        this._persistGranted = null;
        return;
      }
      const sm = navigator.storage;
      if (!sm || typeof sm.persist !== 'function') {
        this._persistGranted = null;
        return;
      }
      this._persistGranted = await sm.persist().catch(() => false);
    } catch {
      this._persistGranted = null;
    }
  }

  /**
   * Stamp meta-store `lastWriteAt` to the current instant. Called from every
   * data-changing put. NOT called from setLastExportAt (exports clear dirty
   * state, not create it). NOT called from schema migrations (those are
   * app-version upgrades; legacy-migration.ts passes { silent: true } to
   * importAll specifically to suppress this bump).
   *
   * Routed through nowIso() from src/lib/period.ts so the Phase 2 structural
   * lint invariant ("no new Date() outside period.ts") holds.
   */
  private async bumpWriteAt(): Promise<void> {
    await this.db.put('meta', nowIso(), META_LAST_WRITE);
  }

  async getEntities(): Promise<Entity[]> {
    return (await this.db.get('entities', SINGLETON_KEY)) ?? [];
  }
  async saveEntities(entities: Entity[]): Promise<void> {
    await this.db.put('entities', entities, SINGLETON_KEY);
    await this.bumpWriteAt();
  }
  async getAccounts(): Promise<Account[]> {
    return (await this.db.get('accounts', SINGLETON_KEY)) ?? [];
  }
  async saveAccounts(accounts: Account[]): Promise<void> {
    await this.db.put('accounts', accounts, SINGLETON_KEY);
    await this.bumpWriteAt();
  }
  async getEntries(): Promise<Record<string, JournalEntry[]>> {
    return (await this.db.get('entries', SINGLETON_KEY)) ?? {};
  }
  async saveEntries(entries: Record<string, JournalEntry[]>): Promise<void> {
    await this.db.put('entries', entries, SINGLETON_KEY);
    await this.bumpWriteAt();
  }
  async getAuditLogs(): Promise<AuditLog[]> {
    return (await this.db.get('auditLogs', SINGLETON_KEY)) ?? [];
  }
  /** Whole-collection replace of audit logs. Backs `useAuditLog`'s save useEffect. */
  async saveAuditLogs(logs: AuditLog[]): Promise<void> {
    await this.db.put('auditLogs', logs, SINGLETON_KEY);
    await this.bumpWriteAt();
  }
  /** Per-record append for callers that prefer not to pass the full collection. */
  async appendAuditLog(log: AuditLog): Promise<void> {
    const tx = this.db.transaction('auditLogs', 'readwrite');
    const existing = (await tx.store.get(SINGLETON_KEY)) ?? [];
    await tx.store.put([log, ...existing], SINGLETON_KEY);
    await tx.done;
    // Bump AFTER tx.done so the bump is its own micro-tx (the auditLogs tx
    // does not include the meta store; opening meta inside a single tx with
    // auditLogs would require widening the tx scope unnecessarily).
    await this.bumpWriteAt();
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
  /**
   * Bulk-import the full PersistedRoot. Default behaviour bumps lastWriteAt
   * (bulk imports ARE user-affecting content changes per 11-CONTEXT decision).
   *
   * opts.silent === true: skip the lastWriteAt bump — RESERVED for the
   * legacy-migration call site (src/storage/legacy-migration.ts) and any
   * future schema-migration runner. Migrations are app-version upgrades,
   * not user content changes; bumping would fire backup-nag on every
   * Phase X release for every existing user. The opts.silent flag is the
   * single supported escape hatch — adding more migration call sites in
   * the future requires explicit opt-in.
   */
  async importAll(state: PersistedRoot, opts?: { silent?: boolean }): Promise<void> {
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
    // Phase 11 IDB-05 / Blocker 1 fix — bump UNLESS the caller opted out.
    // Default behaviour (opts undefined OR opts.silent === false) bumps
    // lastWriteAt exactly once after tx.done.
    if (!opts?.silent) {
      await this.bumpWriteAt();
    }
  }
  /** Used by DataPage (Plan 03-4) for "Last export" status line. */
  async getLastExportAt(): Promise<string | null> {
    const v = await this.db.get('meta', META_LAST_EXPORT);
    return typeof v === 'string' ? v : null;
  }
  async setLastExportAt(iso: string): Promise<void> {
    // Intentionally NO bumpWriteAt() — exports CLEAR dirty state (they reset
    // the lastWriteAt > lastExportAt condition the beforeunload guard reads),
    // they don't create new dirtiness. Bumping here would recurse the dirty
    // state forever and the guard would always fire.
    await this.db.put('meta', iso, META_LAST_EXPORT);
  }

  // ── Phase 11 duck-typed accessors (NOT on StorageAdapter interface) ────────

  /** Cached result of navigator.storage.persist() called once in init().
   *  true = granted; false = denied; null = API unsupported. Never re-prompts. */
  async getPersistGranted(): Promise<boolean | null> {
    return this._persistGranted;
  }

  /** Snapshot of navigator.storage.estimate() — { quota, usage } or null on
   *  unsupported / thrown / undefined-return. NOT cached; called per-invocation
   *  (DataPage only calls it once on mount, so caching is unnecessary). */
  async getStorageEstimate(): Promise<StorageEstimate | null> {
    try {
      if (typeof navigator === 'undefined') return null;
      const sm = navigator.storage;
      if (!sm || typeof sm.estimate !== 'function') return null;
      const est = await sm.estimate().catch(() => null);
      return est ?? null;
    } catch {
      return null;
    }
  }

  /** Read meta-store lastWriteAt — null if never written. */
  async getLastWriteAt(): Promise<string | null> {
    const v = await this.db.get('meta', META_LAST_WRITE);
    return typeof v === 'string' ? v : null;
  }

  /** Direct setter — used by Plan 11-2's bulk-import wiring in DataPage.handleImport
   *  to bump lastWriteAt explicitly post-import. Standard data-changing puts go
   *  through bumpWriteAt() internally. */
  async setLastWriteAt(iso: string): Promise<void> {
    await this.db.put('meta', iso, META_LAST_WRITE);
  }

  // ── Phase 14 duck-typed accessor (NOT on StorageAdapter interface) ─────────

  /** Return the IDB DB-name this adapter was constructed against.
   *  Test-only introspection — used by Plan 14-1 Task 4's initAdapter routing
   *  tests to assert /demo and / dispatch the correct DB without relying on
   *  fake-indexeddb's databases() API. Do NOT rely on this in production code. */
  getDbName(): string {
    return this.dbName;
  }
}
