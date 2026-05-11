/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Entity, Account, JournalEntry, AuditLog } from '../types';
import type { PersistedRoot } from '../lib/migrations';

/**
 * Per-collection coarse adapter API. Implementations: LocalAdapter (IndexedDB)
 * and ServerAdapter (HTTP → Express → better-sqlite3). Hooks consume only this
 * interface — they never know which backend is in use.
 *
 * Whole-collection save pattern is preserved from Phase 2 hooks: hooks pass
 * the full collection on every state change. Adapters MUST treat saveX() as
 * transactional whole-collection replace.
 *
 * Interface is FINAL at Wave 0 — Plans 03-2 (LocalAdapter) and 03-3
 * (ServerAdapter) implement this contract verbatim without widening.
 */
export interface StorageAdapter {
  /** Resolves once the adapter is fully initialised and first read has landed. Idempotent. */
  ready(): Promise<void>;

  /** Per-collection coarse reads. Always returns the current full collection. */
  getEntities(): Promise<Entity[]>;
  getAccounts(): Promise<Account[]>;
  getEntries(): Promise<Record<string, JournalEntry[]>>;
  getAuditLogs(): Promise<AuditLog[]>;

  /** Per-collection coarse writes. Whole-collection replace, transactional. */
  saveEntities(entities: Entity[]): Promise<void>;
  saveAccounts(accounts: Account[]): Promise<void>;
  saveEntries(entries: Record<string, JournalEntry[]>): Promise<void>;
  /** Whole-collection replace of audit logs. Backs `useAuditLog`'s save useEffect. */
  saveAuditLogs(logs: AuditLog[]): Promise<void>;

  /** Append-only audit log; cheaper than full re-save when only one log is added. */
  appendAuditLog(log: AuditLog): Promise<void>;

  /** Full state snapshot for export. */
  exportAll(): Promise<PersistedRoot>;

  /** Replace all state from a (migrated) PersistedRoot. Atomic. */
  importAll(state: PersistedRoot): Promise<void>;
}

/** Discriminator for diagnostics / status line on Data page. */
export type AdapterKind = 'local' | 'server';

/** Health probe response shape from /api/health. */
export interface HealthResponse {
  ok: true;
  version: number;
  aiEnabled: boolean;
}

/** Thrown when a network adapter cannot reach its server. */
export class AdapterUnreachableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdapterUnreachableError';
  }
}

/** Thrown when a payload fails Zod validation at the adapter boundary. */
export class AdapterValidationError extends Error {
  constructor(message: string, public issues?: unknown) {
    super(message);
    this.name = 'AdapterValidationError';
  }
}
