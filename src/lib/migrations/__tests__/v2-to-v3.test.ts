/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { migrateV2ToV3 } from '../v2-to-v3';
import type { PersistedRoot } from '../index';

function buildV2Root(overrides: Partial<PersistedRoot> = {}): PersistedRoot {
  return {
    _v: 2,
    entities: [{ id: 'e1', name: 'Co', type: 'Company', status: 'Active' }],
    accounts: [
      { id: 'a1', code: '1000', name: 'Cash', type: 'Asset', gstCode: 'N-T' },
      { id: 'a2', code: '4000', name: 'Sales', type: 'Revenue', gstCode: 'GST',
        taxLabel: '6S', companyTaxLabel: '6A' },
    ],
    allEntries: { e1: [
      { id: 'j1', date: '2026-01-15', reference: 'JE-001', description: 'Test', lines: [], isPosted: true },
      { id: 'j2', date: '2026-01-16', reference: 'JE-002', description: 'Draft', lines: [], isPosted: false },
    ] },
    auditLogs: [],
    ...overrides,
  };
}

describe('migrateV2ToV3', () => {
  it('Account parentCode default null', () => {
    const out = migrateV2ToV3(buildV2Root());
    const accs = (out.accounts as Array<{ parentCode?: string | null }>);
    expect(accs[0].parentCode).toBeNull();
    expect(accs[1].parentCode).toBeNull();
  });

  it('Account isDefault default false', () => {
    const out = migrateV2ToV3(buildV2Root());
    const accs = (out.accounts as Array<{ isDefault?: boolean }>);
    expect(accs[0].isDefault).toBe(false);
    expect(accs[1].isDefault).toBe(false);
  });

  it('JournalEntry status from isPosted', () => {
    const out = migrateV2ToV3(buildV2Root());
    const entries = (out.allEntries as Record<string, Array<{ status?: string }>>).e1;
    expect(entries[0].status).toBe('posted');
    expect(entries[1].status).toBe('draft');
  });

  it('Entity lockedFys default empty', () => {
    const out = migrateV2ToV3(buildV2Root());
    const ents = (out.entities as Array<{ lockedFys?: string[] }>);
    expect(ents[0].lockedFys).toEqual([]);
  });

  it('Entity gstRegistered default false', () => {
    const out = migrateV2ToV3(buildV2Root());
    const ents = (out.entities as Array<{ gstRegistered?: boolean }>);
    expect(ents[0].gstRegistered).toBe(false);
  });

  it('Entity accountingMethod default accruals', () => {
    const out = migrateV2ToV3(buildV2Root());
    const ents = (out.entities as Array<{ accountingMethod?: string }>);
    expect(ents[0].accountingMethod).toBe('accruals');
  });

  it('Entity fyEndDate default 06-30', () => {
    const out = migrateV2ToV3(buildV2Root());
    const ents = (out.entities as Array<{ fyEndDate?: string }>);
    expect(ents[0].fyEndDate).toBe('06-30');
  });

  it('AuditLog action enum widened', () => {
    // Verify the migration accepts new actions and preserves them on round-trip
    const root = buildV2Root({
      auditLogs: [
        { id: 'al1', timestamp: '2026-01-15T00:00:00Z', user: 'u', action: 'EDIT_JOURNAL', details: '{}' },
        { id: 'al2', timestamp: '2026-01-15T00:00:00Z', user: 'u', action: 'REVERSE_JOURNAL', details: '{}' },
        { id: 'al3', timestamp: '2026-01-15T00:00:00Z', user: 'u', action: 'IMPORT_TB', details: '{}' },
      ] as unknown as PersistedRoot['auditLogs'],
    });
    const out = migrateV2ToV3(root);
    expect(out._v).toBe(3);
    expect((out.auditLogs as unknown[]).length).toBe(3);
  });

  it('idempotent: applies once', () => {
    const out1 = migrateV2ToV3(buildV2Root());
    const out2 = migrateV2ToV3({ ...out1, _v: 3 });
    expect(out2).toEqual({ ...out1, _v: 3 });
  });

  it('preserves existing field values (non-destructive)', () => {
    const root = buildV2Root({
      entities: [{ id: 'e1', name: 'Pre-set', type: 'Trust', status: 'Active',
        gstRegistered: true, accountingMethod: 'cash', fyEndDate: '03-31',
        lockedFys: ['FY2024'] }] as unknown as PersistedRoot['entities'],
    });
    const out = migrateV2ToV3(root);
    const ent = (out.entities as Array<{
      gstRegistered?: boolean; accountingMethod?: string; fyEndDate?: string; lockedFys?: string[];
    }>)[0];
    expect(ent.gstRegistered).toBe(true);
    expect(ent.accountingMethod).toBe('cash');
    expect(ent.fyEndDate).toBe('03-31');
    expect(ent.lockedFys).toEqual(['FY2024']);
  });
});
