/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalAdapter } from '../local';
import type { Entity, Account } from '../../types';
import { CURRENT_VERSION } from '../../lib/migrations';

beforeEach(() => {
  localStorage.clear();
});

describe('Import round-trip (FND-03)', () => {
  it('round-trip: importAll -> exportAll equals input', async () => {
    const a = new LocalAdapter();
    await a.ready();
    const root = {
      _v: CURRENT_VERSION,
      entities: [
        { _v: 2, id: 'e1', name: 'X', type: 'Company', status: 'Active' as const },
      ] as Entity[],
      accounts: [
        {
          _v: 2,
          id: 'a1',
          code: '100',
          name: 'Cash',
          type: 'Asset' as const,
          gstCode: 'N-T' as const,
        },
      ] as Account[],
      allEntries: {},
      auditLogs: [],
    };
    await a.importAll(root);
    expect(await a.exportAll()).toEqual(root);
  });

  it('importAll on populated adapter replaces all collections', async () => {
    const a = new LocalAdapter();
    await a.ready();
    await a.saveEntities([
      { _v: 2, id: 'OLD', name: 'Old', type: 'Company', status: 'Active' },
    ] as Entity[]);
    await a.importAll({
      _v: CURRENT_VERSION,
      entities: [
        { _v: 2, id: 'NEW', name: 'New', type: 'Trust', status: 'Active' },
      ] as Entity[],
      accounts: [],
      allEntries: {},
      auditLogs: [],
    });
    const loaded = await a.getEntities();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('NEW');
  });
});
