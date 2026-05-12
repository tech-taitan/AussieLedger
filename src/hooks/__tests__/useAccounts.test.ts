/**
 * Hook test for useAccounts.
 *
 * Phase 2: hooks persisted via localStorage.
 * Phase 3 (Plan 03-2): hooks persist via `StorageAdapter` (IndexedDB / SQLite).
 *
 * Tests preserve the hook public contract; persistence assertions now check
 * the adapter's `getAccounts()` rather than `localStorage.getItem(...)`.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAccounts } from '../useAccounts';
import type { Account, JournalEntry } from '../../types';
import { getAdapter } from '../../storage';

const CHART_SIZE = 16;

describe('useAccounts', () => {
  it('starts with CHART_OF_ACCOUNTS default (16 accounts)', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useAccounts(addLog));
    expect(result.current.accounts).toHaveLength(CHART_SIZE);
  });

  it('loads from adapter on mount when present', async () => {
    const adapter = await getAdapter();
    const custom: Account[] = [
      {
        id: 'custom-1',
        code: '9999',
        name: 'Custom Account',
        type: 'Revenue',
        gstCode: 'GST',
      },
    ];
    await adapter.saveAccounts(custom);
    const addLog = vi.fn();
    const { result } = renderHook(() => useAccounts(addLog));
    await waitFor(() => {
      expect(result.current.accounts).toHaveLength(1);
    });
    expect(result.current.accounts[0].id).toBe('custom-1');
  });

  it('persists on updateAccount', async () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useAccounts(addLog));
    await waitFor(() => {
      expect(result.current.accounts).toHaveLength(CHART_SIZE);
    });
    const firstAccount = result.current.accounts[0];
    act(() => {
      result.current.updateAccount({ ...firstAccount, name: 'Updated Name' });
    });
    await waitFor(async () => {
      const adapter = await getAdapter();
      const stored = await adapter.getAccounts();
      const updated = stored.find((a) => a.id === firstAccount.id);
      expect(updated?.name).toBe('Updated Name');
    });
  });

  it('calls addLog on updateAccount', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useAccounts(addLog));
    const firstAccount = result.current.accounts[0];
    act(() => {
      result.current.updateAccount({ ...firstAccount, name: 'Test Account' });
    });
    expect(addLog).toHaveBeenCalledOnce();
    const [action, details] = addLog.mock.calls[0];
    expect(action).toBe('IMPORT_DATA');
    expect(details).toContain('Test Account');
  });

  it('saveAll replaces all accounts and calls addLog', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useAccounts(addLog));
    const newAccounts: Account[] = [
      { id: 'new-1', code: '1000', name: 'New Account', type: 'Asset', gstCode: 'N-T' },
      {
        id: 'new-2',
        code: '2000',
        name: 'New Account 2',
        type: 'Revenue',
        gstCode: 'GST',
      },
    ];
    act(() => {
      result.current.saveAll(newAccounts);
    });
    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.accounts[0].id).toBe('new-1');
    expect(addLog).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 — Plan 04-3: archiveAccount / setIsDefault / isAccountInUse
// (Wave 0 did NOT pre-scaffold .todo cases for this file; tests appended fresh.)
// ─────────────────────────────────────────────────────────────────────────────
describe('useAccounts — Phase 4 widening (BOOK-06, BOOK-07)', () => {
  it('archiveAccount sets isArchived flag and writes audit', async () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useAccounts(addLog));
    await waitFor(() => {
      expect(result.current.accounts.length).toBeGreaterThan(0);
    });
    const target = result.current.accounts[0];
    act(() => {
      result.current.archiveAccount(target.id);
    });
    const after = result.current.accounts.find((a) => a.id === target.id);
    expect(after?.isArchived).toBe(true);
    const archiveCall = addLog.mock.calls.find((c) => c[0] === 'ARCHIVE_ACCOUNT');
    expect(archiveCall).toBeDefined();
    expect(archiveCall?.[1]).toContain(target.id);
  });

  it('setIsDefault toggles flag', async () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useAccounts(addLog));
    await waitFor(() => {
      expect(result.current.accounts.length).toBeGreaterThan(0);
    });
    const target = result.current.accounts[0];
    act(() => {
      result.current.setIsDefault(target.id, true);
    });
    expect(result.current.accounts.find((a) => a.id === target.id)?.isDefault).toBe(true);
    act(() => {
      result.current.setIsDefault(target.id, false);
    });
    expect(result.current.accounts.find((a) => a.id === target.id)?.isDefault).toBe(false);
  });

  it('isAccountInUse returns true when journal references', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useAccounts(addLog));
    const allEntries: Record<string, JournalEntry[]> = {
      'ent-1': [
        {
          id: 'je-1',
          date: '2025-07-01',
          reference: 'OPEN',
          description: 'Test',
          isPosted: true,
          lines: [
            { accountId: 'acc-foo', description: '', debit: 100, credit: 0, taxAmount: 0 },
            { accountId: 'acc-bar', description: '', debit: 0, credit: 100, taxAmount: 0 },
          ],
        },
      ],
    };
    expect(result.current.isAccountInUse('acc-foo', allEntries)).toBe(true);
  });

  it('isAccountInUse returns false when no reference', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useAccounts(addLog));
    expect(result.current.isAccountInUse('acc-foo', {})).toBe(false);
    const noMatch: Record<string, JournalEntry[]> = {
      'ent-1': [
        {
          id: 'je-1',
          date: '2025-07-01',
          reference: 'OPEN',
          description: 'Test',
          isPosted: true,
          lines: [
            { accountId: 'acc-baz', description: '', debit: 50, credit: 0, taxAmount: 0 },
            { accountId: 'acc-qux', description: '', debit: 0, credit: 50, taxAmount: 0 },
          ],
        },
      ],
    };
    expect(result.current.isAccountInUse('acc-foo', noMatch)).toBe(false);
  });
});
