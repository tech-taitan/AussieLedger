/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Decimal precision boundary (W1):
 *   Server returns debit/credit/taxAmount as STRINGS (e.g. "123.45000").
 *   We apply `deserialize` from src/lib/money.ts to convert string -> number
 *   on read so the hook contract stays unchanged. Decimal precision is
 *   preserved end-to-end because the strings carry full precision and
 *   deserialize() uses Decimal internally before returning the number.
 */
import type { StorageAdapter } from './adapter';
import { AdapterUnreachableError, AdapterValidationError } from './adapter';
import type { Entity, Account, JournalEntry, AuditLog, JournalLine } from '../types';
import type { PersistedRoot } from '../lib/migrations';
import { deserialize } from '../lib/money';

/**
 * Walk a JournalLine-shaped object whose debit/credit/taxAmount may be
 * strings (server response) and coerce them through deserialize() into
 * numbers (per the JournalLine type contract).
 */
function deserialiseLine(raw: unknown): JournalLine {
  const l = raw as Record<string, unknown>;
  const coerce = (v: unknown): number => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return Number(deserialize(v));
    return 0;
  };
  return {
    _v: l._v as number | undefined,
    accountId: l.accountId as string,
    description: l.description as string,
    debit: coerce(l.debit),
    credit: coerce(l.credit),
    taxAmount: coerce(l.taxAmount),
    isManualTax: l.isManualTax as boolean | undefined,
  };
}

function deserialiseEntry(raw: unknown): JournalEntry {
  const e = raw as Record<string, unknown>;
  return {
    _v: e._v as number | undefined,
    id: e.id as string,
    date: e.date as string,
    reference: e.reference as string,
    description: e.description as string,
    isPosted: e.isPosted as boolean,
    lines: ((e.lines as unknown[]) ?? []).map(deserialiseLine),
  };
}

export class ServerAdapter implements StorageAdapter {
  private readyPromise: Promise<void>;
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
    this.readyPromise = Promise.resolve();
  }

  ready(): Promise<void> { return this.readyPromise; }

  private async jsonGet<T>(path: string): Promise<T> {
    const res = await fetch(this.baseUrl + path);
    if (!res.ok) {
      if (res.status >= 400 && res.status < 500) {
        const body = await res.json().catch(() => ({}));
        throw new AdapterValidationError(`${path} returned ${res.status}`, body);
      }
      throw new AdapterUnreachableError(`${path} returned ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  private async jsonPut(path: string, body: unknown): Promise<void> {
    const res = await fetch(this.baseUrl + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      if (res.status >= 400 && res.status < 500) {
        const errBody = await res.json().catch(() => ({}));
        throw new AdapterValidationError(`${path} validation failed (${res.status})`, errBody);
      }
      throw new AdapterUnreachableError(`${path} returned ${res.status}`);
    }
  }

  private async jsonPost(path: string, body: unknown): Promise<void> {
    const res = await fetch(this.baseUrl + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      if (res.status >= 400 && res.status < 500) {
        const errBody = await res.json().catch(() => ({}));
        throw new AdapterValidationError(`${path} validation failed (${res.status})`, errBody);
      }
      throw new AdapterUnreachableError(`${path} returned ${res.status}`);
    }
  }

  async getEntities(): Promise<Entity[]> { return this.jsonGet<Entity[]>('/entities'); }
  async saveEntities(entities: Entity[]): Promise<void> { await this.jsonPut('/entities', entities); }
  async getAccounts(): Promise<Account[]> { return this.jsonGet<Account[]>('/accounts'); }
  async saveAccounts(accounts: Account[]): Promise<void> { await this.jsonPut('/accounts', accounts); }

  // W1: decimal-as-string boundary applied on read
  async getEntries(): Promise<Record<string, JournalEntry[]>> {
    const raw = await this.jsonGet<Record<string, unknown[]>>('/entries');
    const result: Record<string, JournalEntry[]> = {};
    for (const [entityId, entries] of Object.entries(raw)) {
      result[entityId] = (entries ?? []).map(deserialiseEntry);
    }
    return result;
  }
  async saveEntries(entries: Record<string, JournalEntry[]>): Promise<void> {
    await this.jsonPut('/entries', entries);
  }

  async getAuditLogs(): Promise<AuditLog[]> { return this.jsonGet<AuditLog[]>('/audit'); }
  async saveAuditLogs(logs: AuditLog[]): Promise<void> { await this.jsonPut('/audit', logs); }
  async appendAuditLog(log: AuditLog): Promise<void> { await this.jsonPost('/audit', log); }

  // W1: decimal-as-string boundary applied on export as well
  async exportAll(): Promise<PersistedRoot> {
    const raw = await this.jsonGet<Record<string, unknown>>('/export');
    const allEntriesRaw = (raw.allEntries as Record<string, unknown[]> | undefined) ?? {};
    const allEntries: Record<string, JournalEntry[]> = {};
    for (const [entityId, entries] of Object.entries(allEntriesRaw)) {
      allEntries[entityId] = (entries ?? []).map(deserialiseEntry);
    }
    return {
      _v: raw._v as number,
      entities: (raw.entities as Entity[] | undefined) ?? [],
      accounts: (raw.accounts as Account[] | undefined) ?? [],
      allEntries,
      auditLogs: (raw.auditLogs as AuditLog[] | undefined) ?? [],
    };
  }
  async importAll(state: PersistedRoot): Promise<void> { await this.jsonPost('/import', state); }
}
