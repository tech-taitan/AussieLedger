/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { computeAggregatedTurnover } from '../aggregatedTurnover';
import type { Account, Entity, JournalEntry } from '../../../types';

const baseEntity: Entity = {
  id: 'e1',
  name: 'Test Co',
  type: 'Company',
  status: 'Active',
};

const revenueAccount: Account = {
  id: 'rev1',
  code: '4000',
  name: 'Sales Revenue',
  type: 'Revenue',
  gstCode: 'GST',
};

const expenseAccount: Account = {
  id: 'exp1',
  code: '5000',
  name: 'Rent Expense',
  type: 'Expense',
  gstCode: 'N-T',
};

const makeEntry = (
  id: string,
  date: string,
  accountId: string,
  credit: number,
  status: JournalEntry['status'] = 'posted',
  replacedByEntryId?: string,
): JournalEntry => ({
  id,
  date,
  reference: `REF-${id}`,
  description: 'test',
  lines: [
    { accountId, description: '', debit: 0, credit, taxAmount: 0 },
    { accountId: 'bank', description: '', debit: credit, credit: 0, taxAmount: 0 },
  ],
  isPosted: status === 'posted',
  status,
  replacedByEntryId,
});

describe('computeAggregatedTurnover', () => {
  it('sums Revenue credits in FY period', () => {
    const entries: JournalEntry[] = [
      makeEntry('j1', '2025-10-01', 'rev1', 10000),
      makeEntry('j2', '2025-12-15', 'rev1', 5000),
    ];
    const result = computeAggregatedTurnover(baseEntity, [revenueAccount], entries, 'FY2026');
    expect(result.toFixed(2)).toBe('15000.00');
  });

  it('excludes entries outside FY period (before Jul 2025)', () => {
    const entries: JournalEntry[] = [
      makeEntry('j1', '2025-06-30', 'rev1', 10000), // outside FY2026 (FY2025)
      makeEntry('j2', '2025-07-01', 'rev1', 5000),  // inside FY2026
    ];
    const result = computeAggregatedTurnover(baseEntity, [revenueAccount], entries, 'FY2026');
    expect(result.toFixed(2)).toBe('5000.00');
  });

  it('excludes superseded/voided/draft entries', () => {
    const entries: JournalEntry[] = [
      makeEntry('j1', '2025-10-01', 'rev1', 10000, 'superseded'),
      makeEntry('j2', '2025-10-01', 'rev1', 5000, 'voided'),
      makeEntry('j3', '2025-10-01', 'rev1', 3000, 'draft'),
      makeEntry('j4', '2025-10-01', 'rev1', 1000, 'posted'),
    ];
    const result = computeAggregatedTurnover(baseEntity, [revenueAccount], entries, 'FY2026');
    expect(result.toFixed(2)).toBe('1000.00');
  });

  it('excludes entries with replacedByEntryId set', () => {
    const entries: JournalEntry[] = [
      makeEntry('j1', '2025-10-01', 'rev1', 10000, 'posted', 'j2'),
      makeEntry('j2', '2025-10-01', 'rev1', 12000, 'posted'),
    ];
    const result = computeAggregatedTurnover(baseEntity, [revenueAccount], entries, 'FY2026');
    expect(result.toFixed(2)).toBe('12000.00'); // only j2 counts (j1 replaced)
  });

  it('filters out non-Revenue accounts', () => {
    const entries: JournalEntry[] = [
      makeEntry('j1', '2025-10-01', 'rev1', 10000),
      makeEntry('j2', '2025-10-01', 'exp1', 5000),
    ];
    const result = computeAggregatedTurnover(baseEntity, [revenueAccount, expenseAccount], entries, 'FY2026');
    expect(result.toFixed(2)).toBe('10000.00'); // only revenue account
  });

  it('returns override when entity.aggregatedTurnover is set', () => {
    const entityWithOverride: Entity = {
      ...baseEntity,
      aggregatedTurnover: '4250000.00',
    };
    const entries: JournalEntry[] = [
      makeEntry('j1', '2025-10-01', 'rev1', 10000),
    ];
    const result = computeAggregatedTurnover(entityWithOverride, [revenueAccount], entries, 'FY2026');
    expect(result.toFixed(2)).toBe('4250000.00');
  });

  it('returns 0 for entity with no Revenue entries', () => {
    const result = computeAggregatedTurnover(baseEntity, [], [], 'FY2026');
    expect(result.toString()).toBe('0');
  });
});
