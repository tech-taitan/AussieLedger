/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useCallback } from 'react';
import { Account, AuditLog } from '../types';
import { CHART_OF_ACCOUNTS } from '../constants';

const STORAGE_KEY = 'ledger_chart_of_accounts';

export type AddLog = (action: AuditLog['action'], details: string, entityId?: string) => void;

export interface AccountsHook {
  accounts: Account[];
  updateAccount: (updated: Account) => void;
  saveAll: (accounts: Account[]) => void;
}

export function useAccounts(addLog: AddLog): AccountsHook {
  const [accounts, setAccounts] = useState<Account[]>(CHART_OF_ACCOUNTS);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Account[];
      if (Array.isArray(parsed)) setAccounts(parsed);
    } catch (err) {
      console.error('Failed to parse ledger_chart_of_accounts', err);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  }, [accounts]);

  const updateAccount = useCallback((updated: Account) => {
    setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
    addLog('IMPORT_DATA', `Updated tax mapping for account ${updated.code} - ${updated.name}`, '');
  }, [addLog]);

  const saveAll = useCallback((updated: Account[]) => {
    setAccounts(updated);
    addLog('IMPORT_DATA', 'Updated Chart of Accounts configuration', '');
  }, [addLog]);

  return { accounts, updateAccount, saveAll };
}
