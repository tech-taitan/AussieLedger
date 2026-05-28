/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { migrateV3ToV4 } from '../v3-to-v4';

const minimalV3 = () => ({
  _v: 3 as const,
  entities: [
    {
      _v: 3,
      id: 'e1',
      name: 'Acme Pty',
      type: 'Company',
      status: 'Active',
      gstRegistered: true,
      accountingMethod: 'accruals',
      fyEndDate: '06-30',
      lockedFys: [] as string[],
      beneficiaries: [] as unknown[],
      partners: [] as unknown[],
    },
  ],
  accounts: [] as unknown[],
  allEntries: { e1: [] as unknown[] },
  auditLogs: [] as unknown[],
});

describe('migrateV3ToV4', () => {
  it('bumps _v to 4', () => {
    const out = migrateV3ToV4(minimalV3() as never);
    expect(out._v).toBe(4);
  });

  it('aggregatedTurnover undefined default preserved', () => {
    const out = migrateV3ToV4(minimalV3() as never);
    expect((out.entities as Array<Record<string, unknown>>)[0].aggregatedTurnover).toBeUndefined();
  });

  it('paygInstalmentAmount undefined default preserved', () => {
    const out = migrateV3ToV4(minimalV3() as never);
    expect((out.entities as Array<Record<string, unknown>>)[0].paygInstalmentAmount).toBeUndefined();
  });

  it('v3 to v4 round-trip non-destructive — preserves every existing field', () => {
    const input = minimalV3();
    const out = migrateV3ToV4(input as never);
    const e = (out.entities as Array<Record<string, unknown>>)[0];
    expect(e.id).toBe('e1');
    expect(e.name).toBe('Acme Pty');
    expect(e.type).toBe('Company');
    expect(e.status).toBe('Active');
    expect(e.gstRegistered).toBe(true);
    expect(e.accountingMethod).toBe('accruals');
    expect(e.fyEndDate).toBe('06-30');
    expect(e.lockedFys).toEqual([]);
    expect(e.beneficiaries).toEqual([]);
    expect(e.partners).toEqual([]);
  });

  it('preserves preset aggregatedTurnover when present', () => {
    const input = minimalV3() as never as { _v: number; entities: Array<Record<string, unknown>>; accounts: unknown[]; allEntries: Record<string, unknown[]>; auditLogs: unknown[] };
    input.entities[0].aggregatedTurnover = '4250000.00';
    const out = migrateV3ToV4(input as never);
    expect((out.entities as Array<Record<string, unknown>>)[0].aggregatedTurnover).toBe('4250000.00');
  });

  it('is idempotent — returns unchanged state if _v >= 4', () => {
    const alreadyV4 = { ...minimalV3(), _v: 4 as const };
    const out = migrateV3ToV4(alreadyV4 as never);
    expect(out._v).toBe(4);
    expect(out).toBe(alreadyV4); // same object reference
  });
});
