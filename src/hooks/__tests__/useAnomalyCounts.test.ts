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

  it('Test 4.5: account with taxLabel=undefined referenced by posted entry → accounts=1', () => {
    const accounts = [
      makeAccount({ id: 'a1', taxLabel: undefined }),
      makeAccount({ id: 'a2', taxLabel: 'P2' }),
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

  it('Test 4.6: unmapped account NOT referenced in any posted entry → accounts=0', () => {
    const accounts = [
      makeAccount({ id: 'a1', taxLabel: undefined }), // unmapped but not referenced
      makeAccount({ id: 'a2', taxLabel: 'P2' }),
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

  it("Test 4.7: account with taxLabel='' (empty string) referenced in posted entry → accounts=1", () => {
    const accounts = [
      makeAccount({ id: 'a1', taxLabel: '' }),
      makeAccount({ id: 'a2', taxLabel: 'P2' }),
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
