/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Wave-2 STUB for `ServerAdapter`. Plan 03-3 replaces this file with the full
 * HTTP implementation (fetch -> Express -> better-sqlite3). This stub exists
 * so `src/storage/index.ts` can import `ServerAdapter` and the adapter-selection
 * code path can spawn a `ServerAdapter` instance without Plan 03-3 being
 * merged.
 *
 * MUST implement ALL 12 methods from the FINAL `StorageAdapter` interface
 * (defined in src/storage/adapter.ts by Plan 03-1). Each method throws —
 * Plan 03-3 swaps in the real implementations.
 */
import type { StorageAdapter } from './adapter';
import type { Entity, Account, JournalEntry, AuditLog } from '../types';
import type { PersistedRoot } from '../lib/migrations';

const NOT_IMPL = 'ServerAdapter not implemented - Plan 03-3';

export class ServerAdapter implements StorageAdapter {
  private readyPromise: Promise<void>;

  constructor(_baseUrl: string = '/api') {
    this.readyPromise = Promise.resolve();
  }

  ready(): Promise<void> {
    return this.readyPromise;
  }

  async getEntities(): Promise<Entity[]> {
    throw new Error(NOT_IMPL);
  }
  async saveEntities(_e: Entity[]): Promise<void> {
    throw new Error(NOT_IMPL);
  }
  async getAccounts(): Promise<Account[]> {
    throw new Error(NOT_IMPL);
  }
  async saveAccounts(_a: Account[]): Promise<void> {
    throw new Error(NOT_IMPL);
  }
  async getEntries(): Promise<Record<string, JournalEntry[]>> {
    throw new Error(NOT_IMPL);
  }
  async saveEntries(_m: Record<string, JournalEntry[]>): Promise<void> {
    throw new Error(NOT_IMPL);
  }
  async getAuditLogs(): Promise<AuditLog[]> {
    throw new Error(NOT_IMPL);
  }
  async saveAuditLogs(_l: AuditLog[]): Promise<void> {
    throw new Error(NOT_IMPL);
  }
  async appendAuditLog(_l: AuditLog): Promise<void> {
    throw new Error(NOT_IMPL);
  }
  async exportAll(): Promise<PersistedRoot> {
    throw new Error(NOT_IMPL);
  }
  async importAll(_s: PersistedRoot): Promise<void> {
    throw new Error(NOT_IMPL);
  }
}
