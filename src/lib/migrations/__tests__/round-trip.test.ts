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

  it('v0 to v4 round-trip', () => {
    // Hand-built _v:0 blob (no _v field at all — pre-versioning prototype shape)
    const v0blob = {
      entities: [{ id: 'e1', name: 'Old Co', type: 'Company', status: 'Active' }],
      accounts: [
        { id: 'a1', code: '1000', name: 'Cash', type: 'Asset', gstCode: 'N-T' },
        { id: 'a2', code: '4000', name: 'Sales', type: 'Revenue', gstCode: 'GST' },
      ],
      allEntries: { e1: [
        { id: 'j1', date: '2026-01-15', reference: 'OLD-001', description: 'Old', lines: [
          { accountId: 'a1', description: '', debit: 100, credit: 0, taxAmount: 0 },
          { accountId: 'a2', description: '', debit: 0, credit: 100, taxAmount: 0 },
        ], isPosted: true },
      ] },
      auditLogs: [],
    };
    const out = migrate(v0blob);
    expect(out._v).toBe(4);
    // All original fields preserved
    expect((out.entities as Array<{ name: string }>)[0].name).toBe('Old Co');
    expect((out.accounts as unknown[]).length).toBe(2);
    expect(((out.allEntries as Record<string, Array<{ reference: string }>>).e1)[0].reference).toBe('OLD-001');
    // v2→v3 defaults applied
    expect((out.accounts as Array<{ parentCode?: string | null }>)[0].parentCode).toBeNull();
    expect((out.accounts as Array<{ isDefault?: boolean }>)[0].isDefault).toBe(false);
    expect(((out.allEntries as Record<string, Array<{ status?: string }>>).e1)[0].status).toBe('posted');
    expect((out.entities as Array<{ lockedFys?: string[] }>)[0].lockedFys).toEqual([]);
    expect((out.entities as Array<{ fyEndDate?: string }>)[0].fyEndDate).toBe('06-30');
    // v3→v4 new fields are undefined (not present)
    expect((out.entities as Array<{ aggregatedTurnover?: string }>)[0].aggregatedTurnover).toBeUndefined();
    expect((out.entities as Array<{ paygInstalmentAmount?: string }>)[0].paygInstalmentAmount).toBeUndefined();
  });
});
