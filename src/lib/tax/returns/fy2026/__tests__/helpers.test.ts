/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Wave 0 GREEN tests for _helpers.ts — filterPostedEntries + rollupByLabel.
 * These tests are GREEN immediately (no dependency on Plans 05-2/05-3/05-4).
 */
import { describe, it, expect } from 'vitest';
import { Decimal } from '../../../../money';
import { filterPostedEntries, rollupByLabel } from '../_helpers';
import type { Account, JournalEntry } from '../../../../../types';

const makeEntry = (
  id: string,
  status: JournalEntry['status'],
  replacedByEntryId?: string,
): JournalEntry => ({
  id,
  date: '2025-10-01',
  reference: `REF-${id}`,
  description: 'test',
  lines: [],
  isPosted: status === 'posted',
  status,
  replacedByEntryId,
});

describe('filterPostedEntries', () => {
  it('excludes superseded entries', () => {
    const entries = [
      makeEntry('j1', 'superseded'),
      makeEntry('j2', 'posted'),
    ];
    const result = filterPostedEntries(entries);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('j2');
  });

  it('excludes voided entries', () => {
    const entries = [
      makeEntry('j1', 'voided'),
      makeEntry('j2', 'posted'),
    ];
    const result = filterPostedEntries(entries);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('j2');
  });

  it('excludes draft entries', () => {
    const entries = [
      makeEntry('j1', 'draft'),
      makeEntry('j2', 'posted'),
    ];
    const result = filterPostedEntries(entries);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('j2');
  });

  it('excludes entries with replacedByEntryId set', () => {
    const entries = [
      makeEntry('j1', 'posted', 'j2'),
      makeEntry('j2', 'posted'),
    ];
    const result = filterPostedEntries(entries);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('j2');
  });

  it('preserves reversed entries (they are still valid postings)', () => {
    const entries = [makeEntry('j1', 'reversed')];
    const result = filterPostedEntries(entries);
    expect(result).toHaveLength(1);
  });
});

describe('rollupByLabel — Revenue polarity', () => {
  const revenueAccount: Account = {
    id: 'rev1',
    code: '4000',
    name: 'Sales',
    type: 'Revenue',
    gstCode: 'GST',
    taxLabel: '6S',
  };

  const expenseAccount: Account = {
    id: 'exp1',
    code: '5000',
    name: 'Wages',
    type: 'Expense',
    gstCode: 'N-T',
    taxLabel: '6L',
  };

  const entryWithLines = (
    id: string,
    accountId: string,
    credit: number,
    debit: number,
    status: JournalEntry['status'] = 'posted',
  ): JournalEntry => ({
    id,
    date: '2025-10-01',
    reference: `REF-${id}`,
    description: 'test',
    lines: [{ accountId, description: '', debit, credit, taxAmount: 0 }],
    isPosted: status === 'posted',
    status,
  });

  it('applies Revenue polarity correctly (credit - debit)', () => {
    const entries = [entryWithLines('j1', 'rev1', 10000, 0)];
    const result = rollupByLabel<'6S'>(entries, [revenueAccount], 'taxLabel');
    expect(result['6S']?.toFixed(2)).toBe('10000.00');
  });

  it('applies Expense polarity correctly (debit - credit)', () => {
    const entries = [entryWithLines('j1', 'exp1', 0, 5000)];
    const result = rollupByLabel<'6L'>(entries, [expenseAccount], 'taxLabel');
    expect(result['6L']?.toFixed(2)).toBe('5000.00');
  });

  it('aggregates multiple entries for the same label', () => {
    const entries = [
      entryWithLines('j1', 'rev1', 3000, 0),
      entryWithLines('j2', 'rev1', 7000, 0),
    ];
    const result = rollupByLabel<'6S'>(entries, [revenueAccount], 'taxLabel');
    expect(result['6S']?.toFixed(2)).toBe('10000.00');
  });

  it('skips superseded entries via filterPostedEntries', () => {
    const entries = [
      entryWithLines('j1', 'rev1', 10000, 0, 'superseded'),
      entryWithLines('j2', 'rev1', 5000, 0, 'posted'),
    ];
    const result = rollupByLabel<'6S'>(entries, [revenueAccount], 'taxLabel');
    expect(result['6S']?.toFixed(2)).toBe('5000.00');
  });

  it('skips lines whose account has no label for the given field', () => {
    const accountNoLabel: Account = { ...revenueAccount, taxLabel: undefined };
    const entries = [entryWithLines('j1', 'rev1', 10000, 0)];
    const result = rollupByLabel(entries, [accountNoLabel], 'taxLabel');
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('uses companyTaxLabel field when requested', () => {
    const companyAccount: Account = {
      ...revenueAccount,
      companyTaxLabel: '6A',
      taxLabel: undefined,
    };
    const entries = [entryWithLines('j1', 'rev1', 8000, 0)];
    const result = rollupByLabel<'6A'>(entries, [companyAccount], 'companyTaxLabel');
    expect(result['6A']?.toFixed(2)).toBe('8000.00');
  });
});
