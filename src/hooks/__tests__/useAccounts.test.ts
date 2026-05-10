/**
 * Hook test scaffold for useAccounts.
 *
 * RED-by-design until Plan 02-2 creates src/hooks/useAccounts.ts.
 * Once 02-2 lands, these tests must all pass (GREEN).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAccounts } from '../useAccounts';
import type { Account } from '../../types';

const CHART_SIZE = 16;

describe('useAccounts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with CHART_OF_ACCOUNTS default (16 accounts)', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useAccounts(addLog));
    expect(result.current.accounts).toHaveLength(CHART_SIZE);
  });

  it('loads from localStorage on mount when present', () => {
    const custom: Account[] = [
      {
        id: 'custom-1', code: '9999', name: 'Custom Account', type: 'Revenue', gstCode: 'GST',
      },
    ];
    localStorage.setItem('ledger_chart_of_accounts', JSON.stringify(custom));
    const addLog = vi.fn();
    const { result } = renderHook(() => useAccounts(addLog));
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].id).toBe('custom-1');
  });

  it('persists on updateAccount', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useAccounts(addLog));
    const firstAccount = result.current.accounts[0];
    act(() => {
      result.current.updateAccount({ ...firstAccount, name: 'Updated Name' });
    });
    const stored = JSON.parse(localStorage.getItem('ledger_chart_of_accounts') ?? '[]');
    const updated = stored.find((a: Account) => a.id === firstAccount.id);
    expect(updated?.name).toBe('Updated Name');
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
      { id: 'new-2', code: '2000', name: 'New Account 2', type: 'Revenue', gstCode: 'GST' },
    ];
    act(() => {
      result.current.saveAll(newAccounts);
    });
    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.accounts[0].id).toBe('new-1');
    expect(addLog).toHaveBeenCalledOnce();
  });
});
