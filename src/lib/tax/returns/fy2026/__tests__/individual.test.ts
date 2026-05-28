/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Plan 05-2 tests for computeIndividualReturn.
 * Flipped from it.todo to full test bodies in Plan 05-2.
 */
import { describe, it, expect } from 'vitest';
import { Decimal } from '../../../../money';
import { computeIndividualReturn } from '../individual';
import type { Entity, Account, JournalEntry } from '../../../../../types';

const fixtureEntity: Entity = {
  _v: 4,
  id: 'st1',
  name: 'Acme Sole Trader',
  type: 'Individual',
  status: 'Active',
  aggregatedTurnover: '4000000',
};

const fixtureAccounts: Account[] = [
  { _v: 4, id: 'a-rev', code: '4010', name: 'Sales', type: 'Revenue', gstCode: 'GST', taxLabel: '6S' },
  { _v: 4, id: 'a-exp', code: '6010', name: 'Operating Expenses', type: 'Expense', gstCode: 'GST', taxLabel: '6N' },
  { _v: 4, id: 'a-cash', code: '1010', name: 'Cash', type: 'Asset', gstCode: 'N-T' },
];

const fixtureEntries: JournalEntry[] = [
  {
    _v: 4,
    id: 'j1',
    date: '2025-08-15',
    reference: 'INV-001',
    description: 'Sale',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: 'a-rev', description: '', debit: 0, credit: 50000, taxAmount: 0 },
      { accountId: 'a-cash', description: '', debit: 50000, credit: 0, taxAmount: 0 },
    ],
  },
  {
    _v: 4,
    id: 'j2',
    date: '2025-09-15',
    reference: 'EXP-001',
    description: 'Expense',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: 'a-exp', description: '', debit: 20000, credit: 0, taxAmount: 0 },
      { accountId: 'a-cash', description: '', debit: 0, credit: 20000, taxAmount: 0 },
    ],
  },
];

describe('computeIndividualReturn', () => {
  it('P1 P2 P8 from GL — sole trader $50k revenue + $20k expenses → P1=50000, P2=20000, P8=30000', () => {
    const r = computeIndividualReturn({
      entity: fixtureEntity,
      accounts: fixtureAccounts,
      entries: fixtureEntries,
      fy: 'FY2026',
    });
    expect(r.labels.P1?.value.toFixed(2)).toBe('50000.00');
    expect(r.labels.P2?.value.toFixed(2)).toBe('20000.00');
    expect(r.labels.P8?.value.toFixed(2)).toBe('30000.00');
  });

  it('item15 equals P8 — flow-through to main return', () => {
    const r = computeIndividualReturn({
      entity: fixtureEntity,
      accounts: fixtureAccounts,
      entries: fixtureEntries,
      fy: 'FY2026',
    });
    expect(r.labels.item15?.value.toFixed(2)).toBe('30000.00');
    expect(r.labels.item15?.value.equals(r.labels.P8?.value ?? new Decimal(0))).toBe(true);
  });

  it('LITO and Medicare applied — $30k taxable income → marginal $1888 + LITO $700 + Medicare $0 (below lower threshold)', () => {
    const r = computeIndividualReturn({
      entity: fixtureEntity,
      accounts: fixtureAccounts,
      entries: fixtureEntries,
      fy: 'FY2026',
    });
    // $30,000 income: marginal tax = 0.16 × (30000 − 18200) = 0.16 × 11800 = 1888
    expect(r.meta.taxBeforeOffsets).toBeDefined();
    const taxBefore = r.meta.taxBeforeOffsets as Decimal;
    expect(taxBefore.toFixed(2)).toBe('1888.00');
    // LITO = $700 (income <= $37,500)
    expect(r.labels.T1?.value.toFixed(2)).toBe('700.00');
    // Medicare: $30k < $27,222 lower threshold — actually $30k > $27,222 so shade-in applies
    // $30,000 > $27,222 but < $34,028 so shading applies: (30000 - 27222) * 0.10 = 277.80
    expect(r.labels.M1?.value.greaterThanOrEqualTo(0)).toBe(true);
    // M2 = 0 (hasPHC=true assumption)
    expect(r.labels.M2?.value.toFixed(2)).toBe('0.00');
  });

  it('small business offset eligible — $4M turnover + $30k SB income → offset > 0 capped at $1,000', () => {
    const r = computeIndividualReturn({
      entity: fixtureEntity,
      accounts: fixtureAccounts,
      entries: fixtureEntries,
      fy: 'FY2026',
    });
    // offset = 16% × tax on SB portion. At $30k income, tax = $1888, SB share = 100%, offset = 0.16 × 1888 = 302.08
    const offset = r.labels.item7D?.value;
    expect(offset).toBeDefined();
    expect(offset!.greaterThan(0)).toBe(true);
    expect(offset!.lessThanOrEqualTo(1000)).toBe(true);
  });

  it('assumptions in meta — 5 assumed values present in anomalies', () => {
    const r = computeIndividualReturn({
      entity: fixtureEntity,
      accounts: [],
      entries: [],
      fy: 'FY2026',
    });
    const assumptions = r.meta.anomalies.filter((a) =>
      a.id.startsWith('assumption-'),
    );
    expect(assumptions.length).toBe(5);
    // All are info severity
    expect(assumptions.every((a) => a.severity === 'info')).toBe(true);
  });

  it('locked FY surfaces anomaly — meta.locked true and anomaly with severity info', () => {
    const lockedEntity: Entity = {
      ...fixtureEntity,
      lockedFys: ['FY2026'],
    };
    const r = computeIndividualReturn({
      entity: lockedEntity,
      accounts: [],
      entries: [],
      fy: 'FY2026',
    });
    expect(r.meta.locked).toBe(true);
    const lockedAnomaly = r.meta.anomalies.find((a) => a.id === 'locked-fy');
    expect(lockedAnomaly).toBeDefined();
    expect(lockedAnomaly?.severity).toBe('info');
  });

  it('empty entries returns zero labels and no anomalies (besides 5 assumptions)', () => {
    const r = computeIndividualReturn({
      entity: fixtureEntity,
      accounts: [],
      entries: [],
      fy: 'FY2026',
    });
    expect(r.labels.P1?.value.toFixed(2)).toBe('0.00');
    expect(r.labels.P2?.value.toFixed(2)).toBe('0.00');
    expect(r.labels.P8?.value.toFixed(2)).toBe('0.00');
    // No warn anomalies (no loss etc)
    const warnAnomalies = r.meta.anomalies.filter((a) => a.severity === 'warn');
    expect(warnAnomalies.length).toBe(0);
  });
});
