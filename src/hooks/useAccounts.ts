/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useCallback } from 'react';
import { Account, AuditLog, JournalEntry } from '../types';
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
  /** Phase 4 — soft-delete: sets isArchived: true on the account. */
  archiveAccount: (id: string) => void;
  /** Phase 4 — toggle isDefault flag (admin / power-user surface). */
  setIsDefault: (id: string, isDefault: boolean) => void;
  /** Phase 4 — true if any JournalEntry across any entity references this account. */
  isAccountInUse: (id: string, allEntries: Record<string, JournalEntry[]>) => boolean;
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

  const archiveAccount = useCallback(
    (id: string) => {
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, _v: 3, isArchived: true } : a)),
      );
      addLog('ARCHIVE_ACCOUNT', `Archived account ${id}`, '');
    },
    [addLog],
  );

  const setIsDefault = useCallback(
    (id: string, isDefault: boolean) => {
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, _v: 3, isDefault } : a)),
      );
      addLog('UPDATE_ACCOUNT', `Set isDefault=${isDefault} on account ${id}`, '');
    },
    [addLog],
  );

  const isAccountInUse = useCallback(
    (id: string, allEntries: Record<string, JournalEntry[]>): boolean => {
      for (const entries of Object.values(allEntries)) {
        for (const entry of entries) {
          if (entry.lines.some((l) => l.accountId === id)) return true;
        }
      }
      return false;
    },
    [],
  );

  return {
    accounts,
    updateAccount,
    saveAll,
    archiveAccount,
    setIsDefault,
    isAccountInUse,
  };
}
