/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalAdapter } from '../local';
import type { Entity, Account, JournalEntry, AuditLog } from '../../types';
import { CURRENT_VERSION } from '../../lib/migrations';

beforeEach(() => {
  localStorage.clear();
});

describe('LocalAdapter (IndexedDB)', () => {
  it('data survives reopen', async () => {
    const a1 = new LocalAdapter();
    await a1.ready();
    const ent: Entity = {
      _v: 2,
      id: 'e1',
      name: 'Test',
      type: 'Company',
      status: 'Active',
    };
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
    const entry: JournalEntry = {
      _v: 2,
      id: 'j1',
      date: '2026-01-01',
      reference: 'R1',
      description: 'd',
      lines: [],
      isPosted: true,
    };
    await a.saveEntries({ 'ent-1': [entry], 'ent-2': [] });
    const loaded = await a.getEntries();
    expect(Object.keys(loaded).sort()).toEqual(['ent-1', 'ent-2']);
    expect(loaded['ent-1']).toEqual([entry]);
  });

  it('appendAuditLog prepends to existing logs', async () => {
    const a = new LocalAdapter();
    await a.ready();
    const l1: AuditLog = {
      _v: 2,
      id: 'a1',
      timestamp: '2026-01-01T00:00:00Z',
      user: 'u',
      action: 'CREATE_ENTITY',
      details: 'x',
    };
    const l2: AuditLog = {
      _v: 2,
      id: 'a2',
      timestamp: '2026-01-02T00:00:00Z',
      user: 'u',
      action: 'POST_JOURNAL',
      details: 'y',
    };
    await a.appendAuditLog(l1);
    await a.appendAuditLog(l2);
    expect((await a.getAuditLogs()).map((l) => l.id)).toEqual(['a2', 'a1']);
  });

  it('saveAuditLogs replaces whole audit log collection', async () => {
    const a = new LocalAdapter();
    await a.ready();
    const l1: AuditLog = {
      _v: 2,
      id: 'old',
      timestamp: '2026-01-01T00:00:00Z',
      user: 'u',
      action: 'CREATE_ENTITY',
      details: 'x',
    };
    await a.appendAuditLog(l1);
    const replaced: AuditLog[] = [
      {
        _v: 2,
        id: 'new-1',
        timestamp: '2026-02-01T00:00:00Z',
        user: 'u',
        action: 'POST_JOURNAL',
        details: 'a',
      },
      {
        _v: 2,
        id: 'new-2',
        timestamp: '2026-02-02T00:00:00Z',
        user: 'u',
        action: 'IMPORT_DATA',
        details: 'b',
      },
    ];
    await a.saveAuditLogs(replaced);
    const loaded = await a.getAuditLogs();
    expect(loaded.map((l) => l.id)).toEqual(['new-1', 'new-2']);
  });

  it('importAll replaces all collections atomically', async () => {
    const a = new LocalAdapter();
    await a.ready();
    const acc: Account = {
      _v: 2,
      id: 'ac1',
      code: '100',
      name: 'Cash',
      type: 'Asset',
      gstCode: 'N-T',
    };
    await a.importAll({
      _v: CURRENT_VERSION,
      entities: [
        { _v: 2, id: 'e1', name: 'E1', type: 'Company', status: 'Active' },
      ] as Entity[],
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
