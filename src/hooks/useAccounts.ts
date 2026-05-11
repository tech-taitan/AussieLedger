/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useCallback } from 'react';
import { Account, AuditLog } from '../types';
import { CHART_OF_ACCOUNTS } from '../constants';
import { getAdapter } from '../storage';

export type AddLog = (
  action: AuditLog['action'],
  details: string,
  entityId?: string,
) => void;

export interface AccountsHook {
  accounts: Account[];
  updateAccount: (updated: Account) => void;
  saveAll: (accounts: Account[]) => void;
}

export function useAccounts(addLog: AddLog): AccountsHook {
  const [accounts, setAccounts] = useState<Account[]>(CHART_OF_ACCOUNTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const adapter = await getAdapter();
      const loaded = await adapter.getAccounts();
      if (cancelled) return;
      if (loaded.length > 0) setAccounts(loaded);
      setReady(true);
    })().catch((err) => {
      console.error('useAccounts load failed', err);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    getAdapter()
      .then((a) => a.saveAccounts(accounts))
      .catch((err) => console.error('useAccounts save failed', err));
  }, [accounts, ready]);

  const updateAccount = useCallback(
    (updated: Account) => {
      setAccounts((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );
      addLog(
        'IMPORT_DATA',
        `Updated tax mapping for account ${updated.code} - ${updated.name}`,
        '',
      );
    },
    [addLog],
  );

  const saveAll = useCallback(
    (updated: Account[]) => {
      setAccounts(updated);
      addLog('IMPORT_DATA', 'Updated Chart of Accounts configuration', '');
    },
    [addLog],
  );

  return { accounts, updateAccount, saveAll };
}
