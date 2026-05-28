/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { migrateV4ToV5 } from '../v4-to-v5';

const minimalV4 = () => ({
  _v: 4 as const,
  entities: [
    {
      _v: 4,
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
      aggregatedTurnover: undefined,
      paygInstalmentAmount: undefined,
    },
  ],
  accounts: [] as unknown[],
  allEntries: { e1: [] as unknown[] },
  auditLogs: [] as unknown[],
});

describe('migrateV4ToV5', () => {
  it('Test 1.1: bumps _v to 5 and returnStatusByFy + wizardState default undefined', () => {
    const out = migrateV4ToV5(minimalV4() as never);
    expect(out._v).toBe(5);
    const e = (out.entities as Array<Record<string, unknown>>)[0];
    expect(e.returnStatusByFy).toBeUndefined();
    expect(e.wizardState).toBeUndefined();
  });

  it('Test 1.2: idempotent — returns unchanged state if _v >= 5', () => {
    const alreadyV5 = { ...minimalV4(), _v: 5 as const };
    const out = migrateV4ToV5(alreadyV5 as never);
    expect(out._v).toBe(5);
    expect(out).toBe(alreadyV5); // same object reference
  });

  it('Test 1.3: preserves all Phase-4 + Phase-5 existing fields verbatim', () => {
    const input = minimalV4();
    const out = migrateV4ToV5(input as never);
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
    expect(e.aggregatedTurnover).toBeUndefined();
    expect(e.paygInstalmentAmount).toBeUndefined();
  });

  it('Test 1.4: entities: undefined treated as empty array', () => {
    const state = { _v: 4 as const } as never;
    const out = migrateV4ToV5(state);
    expect(out._v).toBe(5);
    expect((out.entities as unknown[]) ?? []).toEqual([]);
  });

  it('preserves preset returnStatusByFy when present', () => {
    const input = minimalV4() as never as {
      _v: number;
      entities: Array<Record<string, unknown>>;
      accounts: unknown[];
      allEntries: Record<string, unknown[]>;
      auditLogs: unknown[];
    };
    input.entities[0].returnStatusByFy = { FY2026: 'finalised' };
    const out = migrateV4ToV5(input as never);
    expect(
      (out.entities as Array<Record<string, unknown>>)[0].returnStatusByFy,
    ).toEqual({ FY2026: 'finalised' });
  });

  it('preserves preset wizardState when present', () => {
    const input = minimalV4() as never as {
      _v: number;
      entities: Array<Record<string, unknown>>;
      accounts: unknown[];
      allEntries: Record<string, unknown[]>;
      auditLogs: unknown[];
    };
    input.entities[0].wizardState = {
      FY2026: { step: 3, dismissedAnomalies: ['a1'] },
    };
    const out = migrateV4ToV5(input as never);
    expect(
      (out.entities as Array<Record<string, unknown>>)[0].wizardState,
    ).toEqual({ FY2026: { step: 3, dismissedAnomalies: ['a1'] } });
  });
});
