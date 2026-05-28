/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { Decimal } from '../../../money';
import { breRate, brePassiveIncomePct } from '../fy2026/bre';
import type { Account, JournalEntry } from '../../../../types';

describe('breRate', () => {
  it('90% passive income triggers 30% rate (success criterion #2)', () => {
    const result = breRate({
      passivePct: new Decimal('0.90'),
      aggregatedTurnover: new Decimal('1000000'),
      totalAssessable: new Decimal('500000'),
    });
    expect(result.rate.toString()).toBe('0.3');
    expect(result.isBre).toBe(false);
    expect(result.basis).toMatch(/30%/);
  });

  it('10% passive income stays at 25% rate', () => {
    const result = breRate({
      passivePct: new Decimal('0.10'),
      aggregatedTurnover: new Decimal('1000000'),
      totalAssessable: new Decimal('500000'),
    });
    expect(result.rate.toString()).toBe('0.25');
    expect(result.isBre).toBe(true);
    expect(result.basis).toMatch(/25%/);
  });

  it('80% passive income boundary — exactly 80% stays at 25% (threshold is strictly >80%)', () => {
    // BRE_PASSIVE_THRESHOLD = '0.80'; breRate uses passivePct.greaterThan(threshold)
    const result = breRate({
      passivePct: new Decimal('0.80'),
      aggregatedTurnover: new Decimal('1000000'),
      totalAssessable: new Decimal('500000'),
    });
    expect(result.rate.toString()).toBe('0.25');
    expect(result.isBre).toBe(true);
  });

  it('aggregated turnover ≥ $50M forces 30%', () => {
    const result = breRate({
      passivePct: new Decimal('0.10'),
      aggregatedTurnover: new Decimal('50000000'),
      totalAssessable: new Decimal('1000000'),
    });
    expect(result.rate.toString()).toBe('0.3');
    expect(result.isBre).toBe(false);
    expect(result.basis).toMatch(/\$50M/);
  });

  it('passive income 70–90% borderline emits anomaly', () => {
    const result = breRate({
      passivePct: new Decimal('0.75'),
      aggregatedTurnover: new Decimal('1000000'),
      totalAssessable: new Decimal('100000'),
    });
    expect(result.anomaly).toBeDefined();
    expect(result.anomaly!.severity).toBe('warn');
    expect(result.anomaly!.message).toMatch(/borderline/);
  });

  it('no anomaly when passive income outside 70–90% band', () => {
    const result = breRate({
      passivePct: new Decimal('0.50'),
      aggregatedTurnover: new Decimal('1000000'),
      totalAssessable: new Decimal('100000'),
    });
    expect(result.anomaly).toBeUndefined();
  });
});

describe('brePassiveIncomePct', () => {
  const makeRevAccount = (id: string, companyTaxLabel: string): Account => ({
    id,
    code: `400${id}`,
    name: `Revenue ${id}`,
    type: 'Revenue',
    gstCode: 'GST',
    companyTaxLabel,
  });

  const makeEntry = (
    id: string,
    date: string,
    accountId: string,
    credit: number,
  ): JournalEntry => ({
    id,
    date,
    reference: `REF-${id}`,
    description: 'test entry',
    lines: [
      { accountId, description: '', debit: 0, credit, taxAmount: 0 },
      { accountId: 'bank', description: '', debit: credit, credit: 0, taxAmount: 0 },
    ],
    isPosted: true,
    status: 'posted',
  });

  it('BREPI sums passive labels (interest + dividend + rent)', () => {
    const accounts: Account[] = [
      makeRevAccount('a1', '6A'),  // non-passive (sales)
      makeRevAccount('a2', '6H'),  // passive (dividends)
      makeRevAccount('a3', '6D'),  // passive (interest)
    ];
    const entries: JournalEntry[] = [
      makeEntry('j1', '2025-10-01', 'a1', 10000),
      makeEntry('j2', '2025-10-01', 'a2', 5000),  // dividend
      makeEntry('j3', '2025-10-01', 'a3', 3000),  // interest
    ];
    const result = brePassiveIncomePct(accounts, entries, 'FY2026');
    expect(result.brepiTotal.toFixed(2)).toBe('8000.00');  // 5000 + 3000
    expect(result.totalAssessable.toFixed(2)).toBe('18000.00'); // 10000 + 5000 + 3000
    expect(result.passivePct.toFixed(4)).toBe('0.4444');  // 8000/18000
  });

  it('excludes superseded entries', () => {
    const accounts: Account[] = [makeRevAccount('a1', '6H')];
    const entries: JournalEntry[] = [
      { ...makeEntry('j1', '2025-10-01', 'a1', 5000), status: 'superseded' },
    ];
    const result = brePassiveIncomePct(accounts, entries, 'FY2026');
    expect(result.brepiTotal.toFixed(2)).toBe('0.00');
    expect(result.totalAssessable.toFixed(2)).toBe('0.00');
  });

  it('excludes entries with replacedByEntryId', () => {
    const accounts: Account[] = [makeRevAccount('a1', '6H')];
    const entries: JournalEntry[] = [
      { ...makeEntry('j1', '2025-10-01', 'a1', 5000), replacedByEntryId: 'j2' },
    ];
    const result = brePassiveIncomePct(accounts, entries, 'FY2026');
    expect(result.brepiTotal.toFixed(2)).toBe('0.00');
  });

  it('returns zero pct when no assessable income', () => {
    const result = brePassiveIncomePct([], [], 'FY2026');
    expect(result.passivePct.toString()).toBe('0');
  });
});
