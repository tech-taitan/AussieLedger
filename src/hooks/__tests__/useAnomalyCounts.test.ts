/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAnomalyCounts } from '../useAnomalyCounts';
import type { Account, JournalEntry } from '../../types';

// ── Minimal fixtures ──────────────────────────────────────────────────────

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'a1',
    code: '1000',
    name: 'Cash',
    type: 'Asset',
    gstCode: 'N-T',
    taxLabel: 'P1',
    ...overrides,
  };
}

function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 'j1',
    date: '2026-01-01',
    reference: 'J-001',
    description: 'Test entry',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: 'a1', description: '', debit: 100, credit: 0, taxAmount: 0 },
      { accountId: 'a2', description: '', debit: 0, credit: 100, taxAmount: 0 },
    ],
    ...overrides,
  };
}

describe('useAnomalyCounts (UX-02)', () => {
  it('Test 4.1: empty inputs returns { journals: 0, accounts: 0 }', () => {
    const { result } = renderHook(() =>
      useAnomalyCounts([], {}, null),
    );
    expect(result.current).toEqual({ journals: 0, accounts: 0 });
  });

  it('Test 4.2: one posted entry debit=100, credit=50 (unbalanced) → journals=1', () => {
    const accounts = [makeAccount({ id: 'a1' }), makeAccount({ id: 'a2' })];
    const entries: Record<string, JournalEntry[]> = {
      e1: [
        makeEntry({
          lines: [
            { accountId: 'a1', description: '', debit: 100, credit: 0, taxAmount: 0 },
            { accountId: 'a2', description: '', debit: 0, credit: 50, taxAmount: 0 },
          ],
        }),
      ],
    };
    const { result } = renderHook(() => useAnomalyCounts(accounts, entries, null));
    expect(result.current.journals).toBe(1);
  });

  it('Test 4.3: posted entry with debit=100.005, credit=100 (within tolerance 0.005) → journals=0', () => {
    const accounts = [makeAccount({ id: 'a1' }), makeAccount({ id: 'a2' })];
    const entries: Record<string, JournalEntry[]> = {
      e1: [
        makeEntry({
          lines: [
            { accountId: 'a1', description: '', debit: 100.005, credit: 0, taxAmount: 0 },
            { accountId: 'a2', description: '', debit: 0, credit: 100, taxAmount: 0 },
          ],
        }),
      ],
    };
    const { result } = renderHook(() => useAnomalyCounts(accounts, entries, null));
    expect(result.current.journals).toBe(0);
  });

  it('Test 4.4: draft entry unbalanced → journals=0 (only posted entries count)', () => {
    const accounts = [makeAccount({ id: 'a1' }), makeAccount({ id: 'a2' })];
    const entries: Record<string, JournalEntry[]> = {
      e1: [
        makeEntry({
          status: 'draft',
          isPosted: false,
          lines: [
            { accountId: 'a1', description: '', debit: 100, credit: 0, taxAmount: 0 },
            { accountId: 'a2', description: '', debit: 0, credit: 50, taxAmount: 0 },
          ],
        }),
      ],
    };
    const { result } = renderHook(() => useAnomalyCounts(accounts, entries, null));
    expect(result.current.journals).toBe(0);
  });

  it('Test 4.5: Revenue/Expense leaf with no taxLabel referenced by posted entry → accounts=1', () => {
    // Asset/Liability/Equity rows legitimately don't carry tax labels, so the
    // hook only flags Revenue/Expense leaves with at least one missing label.
    const accounts: Account[] = [
      { id: 'a1', code: '5500', name: 'Misc Expense', type: 'Expense',
        gstCode: 'GST', parentCode: '6000' }, // no tax labels — anomaly
      { id: 'a2', code: '4100', name: 'Sales', type: 'Revenue',
        gstCode: 'GST', parentCode: '4000',
        taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B', partnershipTaxLabel: 'P1' },
    ];
    const entries: Record<string, JournalEntry[]> = {
      e1: [makeEntry({ lines: [
        { accountId: 'a1', description: '', debit: 100, credit: 0, taxAmount: 0 },
        { accountId: 'a2', description: '', debit: 0, credit: 100, taxAmount: 0 },
      ] })],
    };
    const { result } = renderHook(() => useAnomalyCounts(accounts, entries, null));
    expect(result.current.accounts).toBe(1);
  });

  it('Test 4.6: unmapped Revenue/Expense NOT referenced in any posted entry → accounts=0', () => {
    const accounts: Account[] = [
      { id: 'a1', code: '5500', name: 'Misc Expense', type: 'Expense',
        gstCode: 'GST', parentCode: '6000' }, // unmapped but not referenced
      { id: 'a2', code: '4100', name: 'Sales', type: 'Revenue',
        gstCode: 'GST', parentCode: '4000',
        taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B', partnershipTaxLabel: 'P1' },
    ];
    const entries: Record<string, JournalEntry[]> = {
      e1: [makeEntry({ lines: [
        { accountId: 'a2', description: '', debit: 100, credit: 0, taxAmount: 0 },
        { accountId: 'a2', description: '', debit: 0, credit: 100, taxAmount: 0 },
      ] })],
    };
    const { result } = renderHook(() => useAnomalyCounts(accounts, entries, null));
    expect(result.current.accounts).toBe(0);
  });

  it("Test 4.7: Revenue/Expense leaf with taxLabel='' referenced in posted entry → accounts=1", () => {
    const accounts: Account[] = [
      { id: 'a1', code: '5500', name: 'Misc Expense', type: 'Expense',
        gstCode: 'GST', parentCode: '6000', taxLabel: '' },
      { id: 'a2', code: '4100', name: 'Sales', type: 'Revenue',
        gstCode: 'GST', parentCode: '4000',
        taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B', partnershipTaxLabel: 'P1' },
    ];
    const entries: Record<string, JournalEntry[]> = {
      e1: [makeEntry({ lines: [
        { accountId: 'a1', description: '', debit: 100, credit: 0, taxAmount: 0 },
        { accountId: 'a2', description: '', debit: 0, credit: 100, taxAmount: 0 },
      ] })],
    };
    const { result } = renderHook(() => useAnomalyCounts(accounts, entries, null));
    expect(result.current.accounts).toBe(1);
  });

  it('Test 4.7a: Asset/Liability/Equity referenced with no tax label is NOT an anomaly', () => {
    // The fix for the tree-view "missing tax label" badge appearing on every
    // Asset / Liability / Equity row. Same rule applies to the anomaly count.
    const accounts: Account[] = [
      { id: 'a1', code: '1020', name: 'Bank', type: 'Asset',
        gstCode: 'N-T', parentCode: '1000' }, // no labels — legitimately
      { id: 'a2', code: '3010', name: "Owner's Capital", type: 'Equity',
        gstCode: 'N-T', parentCode: '3000' }, // no labels — legitimately
    ];
    const entries: Record<string, JournalEntry[]> = {
      e1: [makeEntry({ lines: [
        { accountId: 'a1', description: '', debit: 1000, credit: 0, taxAmount: 0 },
        { accountId: 'a2', description: '', debit: 0, credit: 1000, taxAmount: 0 },
      ] })],
    };
    const { result } = renderHook(() => useAnomalyCounts(accounts, entries, null));
    expect(result.current.accounts).toBe(0);
  });

  it('Test 4.8: when activeEntityId provided, count only that entity entries', () => {
    const accounts = [makeAccount({ id: 'a1' }), makeAccount({ id: 'a2' })];
    const unbalancedLine = {
      lines: [
        { accountId: 'a1', description: '', debit: 100, credit: 0, taxAmount: 0 },
        { accountId: 'a2', description: '', debit: 0, credit: 50, taxAmount: 0 },
      ],
    };
    const entries: Record<string, JournalEntry[]> = {
      e1: [makeEntry({ id: 'j1', ...unbalancedLine })],
      e2: [makeEntry({ id: 'j2', ...unbalancedLine })],
    };
    const { result } = renderHook(() => useAnomalyCounts(accounts, entries, 'e1'));
    expect(result.current.journals).toBe(1); // only e1
  });

  it('Test 4.9: when activeEntityId=null, count across all entities', () => {
    const accounts = [makeAccount({ id: 'a1' }), makeAccount({ id: 'a2' })];
    const unbalancedLine = {
      lines: [
        { accountId: 'a1', description: '', debit: 100, credit: 0, taxAmount: 0 },
        { accountId: 'a2', description: '', debit: 0, credit: 50, taxAmount: 0 },
      ],
    };
    const entries: Record<string, JournalEntry[]> = {
      e1: [makeEntry({ id: 'j1', ...unbalancedLine })],
      e2: [makeEntry({ id: 'j2', ...unbalancedLine })],
    };
    const { result } = renderHook(() => useAnomalyCounts(accounts, entries, null));
    expect(result.current.journals).toBe(2); // both e1 + e2
  });
});
