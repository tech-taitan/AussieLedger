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
import { useAccounts, repairStaleParentCodes } from '../useAccounts';
import type { Account, JournalEntry } from '../../types';
import { getAdapter } from '../../storage';

// Minimum size of the FY2026 Company default CoA seeded by useAccounts when the
// adapter is empty on first run. See `src/lib/coa/__tests__/seed.test.ts` for
// the contract (per-type size: 80..250).
const SEED_MIN_SIZE = 80;

describe('useAccounts', () => {
  it('starts empty in-memory, then seeds FY2026 Company default after mount', async () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useAccounts(addLog));
    // Synchronous initial state is empty — useEffect populates the seed.
    expect(result.current.accounts).toHaveLength(0);
    await waitFor(() => {
      expect(result.current.accounts.length).toBeGreaterThanOrEqual(SEED_MIN_SIZE);
    });
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
      expect(result.current.accounts.length).toBeGreaterThanOrEqual(SEED_MIN_SIZE);
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

  it('calls addLog on updateAccount', async () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useAccounts(addLog));
    await waitFor(() => {
      expect(result.current.accounts.length).toBeGreaterThanOrEqual(SEED_MIN_SIZE);
    });
    const firstAccount = result.current.accounts[0];
    act(() => {
      result.current.updateAccount({ ...firstAccount, name: 'Test Account' });
    });
    // First addLog is the seed's saveAll (if any); find the IMPORT_DATA edit log.
    const editCall = addLog.mock.calls.find(
      (c) => c[0] === 'IMPORT_DATA' && (c[1] as string).includes('Test Account'),
    );
    expect(editCall).toBeDefined();
  });

  describe('repairStaleParentCodes (pure)', () => {
    it('returns input unchanged + fixed:0 when no stale parents present', () => {
      const clean: Account[] = [
        { id: 'a', code: '6911', name: 'Income Tax', type: 'Expense', gstCode: 'N-T', parentCode: '6000' },
        { id: 'b', code: '6912', name: 'Prior Year', type: 'Expense', gstCode: 'N-T', parentCode: '6000' },
        { id: 'c', code: '6900', name: 'Depreciation', type: 'Expense', gstCode: 'N-T', parentCode: '6000' },
      ];
      const { repaired, fixed } = repairStaleParentCodes(clean);
      expect(fixed).toBe(0);
      expect(repaired).toEqual(clean);
    });

    it('rewrites 6911 parentCode from 6900 → 6000 (Income Tax misclassification fix)', () => {
      const stale: Account[] = [
        { id: 'a', code: '6911', name: 'Income Tax', type: 'Expense', gstCode: 'N-T', parentCode: '6900' },
        { id: 'b', code: '6900', name: 'Depreciation', type: 'Expense', gstCode: 'N-T', parentCode: '6000' },
      ];
      const { repaired, fixed } = repairStaleParentCodes(stale);
      expect(fixed).toBe(1);
      expect(repaired.find((a) => a.code === '6911')?.parentCode).toBe('6000');
      // Non-target rows untouched.
      expect(repaired.find((a) => a.code === '6900')?.parentCode).toBe('6000');
    });

    it('rewrites both 6911 and 6912 when both are stale (Company overlay bug)', () => {
      const stale: Account[] = [
        { id: 'a', code: '6911', name: 'Tax A', type: 'Expense', gstCode: 'N-T', parentCode: '6900' },
        { id: 'b', code: '6912', name: 'Tax B', type: 'Expense', gstCode: 'N-T', parentCode: '6900' },
      ];
      const { repaired, fixed } = repairStaleParentCodes(stale);
      expect(fixed).toBe(2);
      expect(repaired.every((a) => a.parentCode === '6000')).toBe(true);
    });

    it('idempotent — running twice does not change anything the second time', () => {
      const stale: Account[] = [
        { id: 'a', code: '6911', name: 'Tax A', type: 'Expense', gstCode: 'N-T', parentCode: '6900' },
      ];
      const first = repairStaleParentCodes(stale);
      const second = repairStaleParentCodes(first.repaired);
      expect(second.fixed).toBe(0);
      expect(second.repaired).toEqual(first.repaired);
    });

    it('leaves a row with matching code but different stale parentCode alone (defensive)', () => {
      const notTargeted: Account[] = [
        { id: 'a', code: '6911', name: 'Tax A', type: 'Expense', gstCode: 'N-T', parentCode: '6800' },
      ];
      const { repaired, fixed } = repairStaleParentCodes(notTargeted);
      expect(fixed).toBe(0);
      expect(repaired[0].parentCode).toBe('6800');
    });
  });

  it('useAccounts: self-repairs stale 6911 parentCode on load and persists the fix', async () => {
    const adapter = await getAdapter();
    const stale: Account[] = [
      { _v: 3, id: 'p-6000', code: '6000', name: 'Expenses', type: 'Expense', gstCode: 'N-T', parentCode: null, isDefault: true, isArchived: false },
      { _v: 3, id: 'p-6900', code: '6900', name: 'Depreciation', type: 'Expense', gstCode: 'N-T', parentCode: '6000', isDefault: true, isArchived: false },
      { _v: 3, id: 'c-6911', code: '6911', name: 'Income Tax', type: 'Expense', gstCode: 'N-T', parentCode: '6900', isDefault: true, isArchived: false },
    ];
    await adapter.saveAccounts(stale);
    const addLog = vi.fn();
    const { result } = renderHook(() => useAccounts(addLog));
    await waitFor(() => {
      const a6911 = result.current.accounts.find((a) => a.code === '6911');
      expect(a6911?.parentCode).toBe('6000');
    });
    // Persistence — the save effect should have rewritten IDB too.
    await waitFor(async () => {
      const persisted = await adapter.getAccounts();
      const a6911 = persisted.find((a) => a.code === '6911');
      expect(a6911?.parentCode).toBe('6000');
    });
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
