/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Plan 05-3 tests for computePartnershipReturn + distributePartnershipNetIncome.
 */
import { describe, it, expect } from 'vitest';
import { Decimal } from '../../../../money';
import { computePartnershipReturn, distributePartnershipNetIncome } from '../partnership';
import type { Entity, Account, JournalEntry } from '../../../../../types';

// ── Shared fixtures ────────────────────────────────────────────────────────

const fixtureEntity: Entity = {
  _v: 4,
  id: 'p1',
  name: 'Smith & Jones Partnership',
  type: 'Partnership',
  status: 'Active',
  partners: [
    { id: 'pr1', name: 'Smith', sharePercent: 50 },
    { id: 'pr2', name: 'Jones', sharePercent: 50 },
  ],
};

const fixtureAccounts: Account[] = [
  {
    _v: 4,
    id: 'a-sales',
    code: '4010',
    name: 'Partnership Sales',
    type: 'Revenue',
    gstCode: 'GST',
    partnershipTaxLabel: 'P1',
  },
  {
    _v: 4,
    id: 'a-expenses',
    code: '6010',
    name: 'General Expenses',
    type: 'Expense',
    gstCode: 'N-T',
    partnershipTaxLabel: 'P2',
  },
  {
    _v: 4,
    id: 'a-cash',
    code: '1010',
    name: 'Cash at Bank',
    type: 'Asset',
    gstCode: 'N-T',
  },
];

const fixtureEntries: JournalEntry[] = [
  {
    _v: 4,
    id: 'j1',
    date: '2025-08-15',
    reference: 'INV-001',
    description: 'Partnership sales',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: 'a-sales', description: '', debit: 0, credit: 300000, taxAmount: 0 },
      { accountId: 'a-cash', description: '', debit: 300000, credit: 0, taxAmount: 0 },
    ],
  },
];

// ── computePartnershipReturn tests ─────────────────────────────────────────

describe('computePartnershipReturn', () => {
  it('P1 P2 P8 from GL — gross income + deductions → net income', () => {
    const r = computePartnershipReturn({
      entity: fixtureEntity,
      accounts: fixtureAccounts,
      entries: fixtureEntries,
      fy: 'FY2026',
    });
    expect(r.labels['P1']?.value.toFixed(2)).toBe('300000.00');
    expect(r.labels['P2']?.value.toFixed(2)).toBe('0.00');
    expect(r.labels['P8']?.value.toFixed(2)).toBe('300000.00');
  });

  it('per-partner distribution — 2 partners 50/50 split P8', () => {
    const r = computePartnershipReturn({
      entity: fixtureEntity,
      accounts: fixtureAccounts,
      entries: fixtureEntries,
      fy: 'FY2026',
    });
    expect(r.meta.distribution).toHaveLength(2);
    expect(r.meta.distribution[0].name).toBe('Smith');
    expect(r.meta.distribution[0].totalShare.toFixed(2)).toBe('150000.00');
    expect(r.meta.distribution[1].name).toBe('Jones');
    expect(r.meta.distribution[1].totalShare.toFixed(2)).toBe('150000.00');
    // Reconciles to P8
    const sum = r.meta.distribution.reduce(
      (s, d) => s.plus(d.totalShare),
      new Decimal(0),
    );
    expect(sum.toFixed(2)).toBe('300000.00');
  });

  it('partnership loss flows through with explicit loss-share warning per partner', () => {
    const lossEntries: JournalEntry[] = [
      {
        _v: 4,
        id: 'j-loss',
        date: '2025-10-01',
        reference: 'EXP-001',
        description: 'Heavy expenses',
        isPosted: true,
        status: 'posted',
        lines: [
          { accountId: 'a-expenses', description: '', debit: 50000, credit: 0, taxAmount: 0 },
          { accountId: 'a-cash', description: '', debit: 0, credit: 50000, taxAmount: 0 },
        ],
      },
    ];
    // No income → P1=0, P2=50000, P8=-50000
    const r = computePartnershipReturn({
      entity: fixtureEntity,
      accounts: fixtureAccounts,
      entries: lossEntries,
      fy: 'FY2026',
    });
    expect(r.labels['P8']?.value.toFixed(2)).toBe('-50000.00');
    // Loss warning emitted
    expect(r.meta.anomalies.some((a) => a.id === 'partnership-loss')).toBe(true);
    // Each partner gets negative share
    expect(r.meta.distribution[0].totalShare.toFixed(2)).toBe('-25000.00');
    expect(r.meta.distribution[1].totalShare.toFixed(2)).toBe('-25000.00');
  });

  it('partner share total not 100% emits warn anomaly', () => {
    const badEntity: Entity = {
      ...fixtureEntity,
      partners: [
        { id: 'pr1', name: 'Smith', sharePercent: 40 },
        { id: 'pr2', name: 'Jones', sharePercent: 40 },
      ],
    };
    const r = computePartnershipReturn({
      entity: badEntity,
      accounts: fixtureAccounts,
      entries: fixtureEntries,
      fy: 'FY2026',
    });
    expect(r.meta.anomalies.some((a) => a.id === 'partner-shares-not-100')).toBe(true);
  });

  it('locked FY anomaly present in meta', () => {
    const lockedEntity: Entity = {
      ...fixtureEntity,
      lockedFys: ['FY2026'],
    };
    const r = computePartnershipReturn({
      entity: lockedEntity,
      accounts: fixtureAccounts,
      entries: fixtureEntries,
      fy: 'FY2026',
    });
    expect(r.meta.locked).toBe(true);
    expect(r.meta.anomalies.some((a) => a.id === 'locked-fy')).toBe(true);
  });
});

// ── distributePartnershipNetIncome tests ────────────────────────────────────

describe('distributePartnershipNetIncome', () => {
  it('distributes $300k 50/50 correctly', () => {
    const result = distributePartnershipNetIncome({
      netIncome: new Decimal(300000),
      partners: [
        { id: 'pr1', name: 'Smith', sharePercent: 50 },
        { id: 'pr2', name: 'Jones', sharePercent: 50 },
      ],
    });
    expect(result.rows[0].totalShare.toFixed(2)).toBe('150000.00');
    expect(result.rows[1].totalShare.toFixed(2)).toBe('150000.00');
    expect(result.anomalies.some((a) => a.id === 'partnership-loss')).toBe(false);
  });

  it('emits loss warning for negative net income', () => {
    const result = distributePartnershipNetIncome({
      netIncome: new Decimal(-100000),
      partners: [
        { id: 'pr1', name: 'Smith', sharePercent: 50 },
        { id: 'pr2', name: 'Jones', sharePercent: 50 },
      ],
    });
    expect(result.anomalies.some((a) => a.id === 'partnership-loss')).toBe(true);
    expect(result.rows[0].totalShare.toFixed(2)).toBe('-50000.00');
  });
});
