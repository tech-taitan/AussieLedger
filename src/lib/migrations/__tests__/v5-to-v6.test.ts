/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { migrateV5ToV6 } from '../v5-to-v6';

const minimalV5 = () => ({
  _v: 5 as const,
  entities: [
    {
      _v: 5,
      id: 'e1',
      name: 'Acme Pty',
      type: 'Individual',
      status: 'Active',
      gstRegistered: true,
      accountingMethod: 'accruals',
      fyEndDate: '06-30',
      lockedFys: [] as string[],
      beneficiaries: [] as unknown[],
      partners: [] as unknown[],
      aggregatedTurnover: undefined,
      paygInstalmentAmount: undefined,
      returnStatusByFy: undefined,
      wizardState: undefined,
    },
  ],
  accounts: [] as unknown[],
  allEntries: { e1: [] as unknown[] },
  auditLogs: [] as unknown[],
});

describe('migrateV5ToV6', () => {
  it('Test V5V6-1: bumps _v to 6 and dependants + spouseIncome default undefined', () => {
    const out = migrateV5ToV6(minimalV5() as never);
    expect(out._v).toBe(6);
    const e = (out.entities as Array<Record<string, unknown>>)[0];
    expect(e.dependants).toBeUndefined();
    expect(e.spouseIncome).toBeUndefined();
  });

  it('Test V5V6-2: idempotent — returns unchanged state if _v >= 6', () => {
    const alreadyV6 = { ...minimalV5(), _v: 6 as const };
    const out = migrateV5ToV6(alreadyV6 as never);
    expect(out._v).toBe(6);
    expect(out).toBe(alreadyV6); // same object reference
  });

  it('Test V5V6-3: preserves ALL existing v3/v4/v5 fields verbatim', () => {
    const input = minimalV5();
    const out = migrateV5ToV6(input as never);
    const e = (out.entities as Array<Record<string, unknown>>)[0];
    expect(e.id).toBe('e1');
    expect(e.name).toBe('Acme Pty');
    expect(e.type).toBe('Individual');
    expect(e.status).toBe('Active');
    expect(e.gstRegistered).toBe(true);
    expect(e.accountingMethod).toBe('accruals');
    expect(e.fyEndDate).toBe('06-30');
    expect(e.lockedFys).toEqual([]);
    expect(e.beneficiaries).toEqual([]);
    expect(e.partners).toEqual([]);
    expect(e.aggregatedTurnover).toBeUndefined();
    expect(e.paygInstalmentAmount).toBeUndefined();
    expect(e.returnStatusByFy).toBeUndefined();
    expect(e.wizardState).toBeUndefined();
  });

  it('Test V5V6-4: entities: undefined treated as empty array', () => {
    const state = { _v: 5 as const } as never;
    const out = migrateV5ToV6(state);
    expect(out._v).toBe(6);
    expect((out.entities as unknown[]) ?? []).toEqual([]);
  });

  it('Test V5V6-5: preserves preset dependants when present on input', () => {
    const input = minimalV5() as never as {
      _v: number;
      entities: Array<Record<string, unknown>>;
      accounts: unknown[];
      allEntries: Record<string, unknown[]>;
      auditLogs: unknown[];
    };
    input.entities[0].dependants = 2;
    const out = migrateV5ToV6(input as never);
    expect(
      (out.entities as Array<Record<string, unknown>>)[0].dependants,
    ).toBe(2);
  });

  it('Test V5V6-6: preserves preset spouseIncome when present on input', () => {
    const input = minimalV5() as never as {
      _v: number;
      entities: Array<Record<string, unknown>>;
      accounts: unknown[];
      allEntries: Record<string, unknown[]>;
      auditLogs: unknown[];
    };
    input.entities[0].spouseIncome = '60000';
    const out = migrateV5ToV6(input as never);
    expect(
      (out.entities as Array<Record<string, unknown>>)[0].spouseIncome,
    ).toBe('60000');
  });
});
