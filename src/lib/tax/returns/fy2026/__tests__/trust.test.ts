/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Plan 05-3 tests for computeTrustReturn + distributeTrustIncome.
 */
import { describe, it, expect } from 'vitest';
import { Decimal } from '../../../../money';
import { computeTrustReturn, distributeTrustIncome, STREAMING_DISCLAIMER } from '../trust';
import type { Entity, Account, JournalEntry } from '../../../../../types';

// ── Shared fixtures ────────────────────────────────────────────────────────

const fixtureEntity: Entity = {
  _v: 4,
  id: 't1',
  name: 'Smith Family Trust',
  type: 'Trust',
  status: 'Active',
  beneficiaries: [
    { id: 'b1', name: 'Alice', sharePercent: 60 },
    { id: 'b2', name: 'Bob', sharePercent: 40 },
  ],
};

const fixtureAccounts: Account[] = [
  {
    _v: 4,
    id: 'a-sales',
    code: '4010',
    name: 'Sales Revenue',
    type: 'Revenue',
    gstCode: 'GST',
    trustTaxLabel: '5B',
  },
  {
    _v: 4,
    id: 'a-interest',
    code: '4020',
    name: 'Interest Income',
    type: 'Revenue',
    gstCode: 'N-T',
    trustTaxLabel: '11J',
  },
  {
    _v: 4,
    id: 'a-wages',
    code: '6100',
    name: 'Wages Expense',
    type: 'Expense',
    gstCode: 'N-T',
    trustTaxLabel: '5M',
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
    description: 'Trust sales',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: 'a-sales', description: '', debit: 0, credit: 200000, taxAmount: 0 },
      { accountId: 'a-cash', description: '', debit: 200000, credit: 0, taxAmount: 0 },
    ],
  },
];

// ── computeTrustReturn tests ───────────────────────────────────────────────

describe('computeTrustReturn', () => {
  it('5B 5T 26 net income from GL — income + expenses → net distributable income', () => {
    // $200k sales, $0 expenses → 5B=200k, 5T=200k (net5T = 5B - 5S), 26=200k
    const r = computeTrustReturn({
      entity: fixtureEntity,
      accounts: fixtureAccounts,
      entries: fixtureEntries,
      fy: 'FY2026',
    });
    expect(r.labels['5B']?.value.toFixed(2)).toBe('200000.00');
    expect(r.labels['5T']?.value.toFixed(2)).toBe('200000.00');
    expect(r.labels['26']?.value.toFixed(2)).toBe('200000.00');
    expect(r.labels['56']?.value.toFixed(2)).toBe('200000.00');
  });

  it('per-beneficiary distribution — 2 beneficiaries at 60/40 split net income', () => {
    const r = computeTrustReturn({
      entity: fixtureEntity,
      accounts: fixtureAccounts,
      entries: fixtureEntries,
      fy: 'FY2026',
    });
    expect(r.meta.distribution).toHaveLength(2);
    expect(r.meta.distribution[0].name).toBe('Alice');
    expect(r.meta.distribution[0].totalShare.toFixed(2)).toBe('120000.00');
    expect(r.meta.distribution[1].name).toBe('Bob');
    expect(r.meta.distribution[1].totalShare.toFixed(2)).toBe('80000.00');
    // Reconciles to net income
    const sum = r.meta.distribution.reduce(
      (s, d) => s.plus(d.totalShare),
      new Decimal(0),
    );
    expect(sum.toFixed(2)).toBe('200000.00');
  });

  it('streaming ordinary income — no sharePerType → all in ordinary column', () => {
    const r = computeTrustReturn({
      entity: fixtureEntity,
      accounts: fixtureAccounts,
      entries: fixtureEntries,
      fy: 'FY2026',
    });
    // Components: ordinary = totalShare, all others = 0
    for (const row of r.meta.distribution) {
      expect(row.components.ordinary.toFixed(2)).toBe(row.totalShare.toFixed(2));
      expect(row.components.interest.toFixed(2)).toBe('0.00');
      expect(row.components.dividend.toFixed(2)).toBe('0.00');
    }
  });

  it('streaming with sharePerType — emits anomaly, sharePercent-only distribution proceeds', () => {
    const entityWithStream: Entity = {
      ...fixtureEntity,
      beneficiaries: [
        { id: 'b1', name: 'Alice', sharePercent: 60, sharePerType: { dividend: 100 } },
        { id: 'b2', name: 'Bob', sharePercent: 40 },
      ],
    };
    const r = computeTrustReturn({
      entity: entityWithStream,
      accounts: fixtureAccounts,
      entries: fixtureEntries,
      fy: 'FY2026',
    });
    // Anomaly emitted for Alice's sharePerType
    expect(
      r.meta.anomalies.some((a) => a.id.startsWith('sharePerType-unsupported')),
    ).toBe(true);
    // But distribution still proceeds using sharePercent
    expect(r.meta.distribution[0].totalShare.toFixed(2)).toBe('120000.00');
    expect(r.meta.distribution[1].totalShare.toFixed(2)).toBe('80000.00');
  });

  it('share total anomaly — beneficiary shares summing to 90% emits warn anomaly', () => {
    const badEntity: Entity = {
      ...fixtureEntity,
      beneficiaries: [
        { id: 'b1', name: 'Alice', sharePercent: 50 },
        { id: 'b2', name: 'Bob', sharePercent: 40 },
      ],
    };
    const r = computeTrustReturn({
      entity: badEntity,
      accounts: fixtureAccounts,
      entries: fixtureEntries,
      fy: 'FY2026',
    });
    expect(r.meta.anomalies.some((a) => a.id === 'shares-not-100')).toBe(true);
  });

  it('streaming disclaimer anomaly always present in meta', () => {
    const r = computeTrustReturn({
      entity: fixtureEntity,
      accounts: [],
      entries: [],
      fy: 'FY2026',
    });
    expect(r.meta.streamingDisclaimer).toBe(STREAMING_DISCLAIMER);
    expect(r.meta.streamingDisclaimer).toMatch(
      /Trust capital gains and franked distributions can only be streamed/,
    );
    expect(r.meta.streamingDisclaimer).toMatch(
      /Consult your tax agent if you stream income/,
    );
  });

  it('locked FY anomaly present in meta', () => {
    const lockedEntity: Entity = {
      ...fixtureEntity,
      lockedFys: ['FY2026'],
    };
    const r = computeTrustReturn({
      entity: lockedEntity,
      accounts: [],
      entries: [],
      fy: 'FY2026',
    });
    expect(r.meta.locked).toBe(true);
    expect(r.meta.anomalies.some((a) => a.id === 'locked-fy')).toBe(true);
  });
});

// ── distributeTrustIncome tests ────────────────────────────────────────────

describe('distributeTrustIncome', () => {
  it('distributes net income proportionally to 3 beneficiaries', () => {
    const result = distributeTrustIncome({
      netIncome: new Decimal(300000),
      beneficiaries: [
        { id: 'b1', name: 'Alice', sharePercent: 50 },
        { id: 'b2', name: 'Bob', sharePercent: 30 },
        { id: 'b3', name: 'Carol', sharePercent: 20 },
      ],
    });
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].totalShare.toFixed(2)).toBe('150000.00');
    expect(result.rows[1].totalShare.toFixed(2)).toBe('90000.00');
    expect(result.rows[2].totalShare.toFixed(2)).toBe('60000.00');
    expect(result.anomalies.some((a) => a.id === 'shares-not-100')).toBe(false);
  });

  it('returns empty array for zero beneficiaries', () => {
    const result = distributeTrustIncome({
      netIncome: new Decimal(100000),
      beneficiaries: [],
    });
    expect(result.rows).toHaveLength(0);
    expect(result.anomalies.some((a) => a.id === 'shares-not-100')).toBe(false);
  });

  it('handles negative net income (trust loss) per beneficiary', () => {
    const result = distributeTrustIncome({
      netIncome: new Decimal(-50000),
      beneficiaries: [
        { id: 'b1', name: 'Alice', sharePercent: 60 },
        { id: 'b2', name: 'Bob', sharePercent: 40 },
      ],
    });
    expect(result.rows[0].totalShare.toFixed(2)).toBe('-30000.00');
    expect(result.rows[1].totalShare.toFixed(2)).toBe('-20000.00');
  });
});
