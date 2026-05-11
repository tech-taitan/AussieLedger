/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { migrate, CURRENT_VERSION } from '../index';
import { LocalAdapter } from '../../../storage/local';

beforeEach(() => {
  localStorage.clear();
});

describe('Migration round-trip (success criterion #5)', () => {
  it('hand-built _v:0 blob -> migrate -> importAll -> exportAll equals migrated', async () => {
    const v0Blob: Record<string, unknown> = {
      entities: [
        { id: 'e1', name: 'Old Co', type: 'Company', status: 'Active' },
      ],
      accounts: [
        {
          id: 'a1',
          code: '100',
          name: 'Sales',
          type: 'Revenue',
          gstCode: 'GST',
        },
      ],
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
