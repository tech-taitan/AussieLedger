/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useCallback } from 'react';
import { Account, AuditLog, JournalEntry } from '../types';
import { getAdapter } from '../storage';
import { getDefaultCoaFor } from '../lib/coa';
import { withLock } from '../lib/locks';

export type AddLog = (
  action: AuditLog['action'],
  details: string,
  entityId?: string,
) => void;

/**
 * Detect the pre-Phase-4 legacy 16-row CHART_OF_ACCOUNTS seed that some
 * existing users still have persisted. The legacy seed had a unique ID
 * pattern of `{typePrefix}-{code}` (e.g. `1-1110`, `2-2100`), no `_v`
 * stamp, no `isDefault` flag, and no `parentCode` (it was flat). All
 * four conjuncts must hold — keeps user-curated accounts and demo data
 * safe even when they happen to lack one signal.
 */
function isLegacyCoa(loaded: Account[]): boolean {
  if (loaded.length === 0 || loaded.length > 20) return false;
  return loaded.every(
    (a) =>
      a._v === undefined &&
      a.isDefault === undefined &&
      a.parentCode === undefined &&
      /^\d-\d{4}$/.test(a.id),
  );
}

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
  /**
   * Re-read accounts from the storage adapter and replace in-memory state.
   * Call after another writer (e.g. `useEntities.createEntity`) has seeded
   * default CoA rows directly to the adapter, so the AccountManager surface
   * reflects the latest persisted list.
   */
  reload: () => Promise<void>;
  /**
   * Append accounts AND await the adapter write before resolving. ImportTB
   * calls this on its "Create new account" path so a subsequent journal write
   * can safely reference the minted account ids — without this serialization,
   * a browser refresh between the journal save and the account save left
   * journals with dangling accountId references that the TrialBalance rollup
   * silently drops (the Critical #2 race).
   */
  appendAndPersist: (newAccounts: Account[]) => Promise<void>;
}

export function useAccounts(addLog: AddLog): AccountsHook {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const adapter = await getAdapter();
      const loaded = await adapter.getAccounts();
      if (cancelled) return;
      if (loaded.length === 0) {
        // First run — seed the comprehensive FY2026 Company default CoA
        // so the AccountManager shows a usable starting set. Subsequent
        // entity creations merge their entity-type overlays on top (via
        // `useEntities.createEntity` direct adapter write + `reload()`).
        const seed = getDefaultCoaFor('Company', 'FY2026');
        setAccounts(seed);
      } else if (isLegacyCoa(loaded)) {
        // One-time replacement — pre-Phase-4 users have the legacy 16-row
        // CHART_OF_ACCOUNTS from constants.ts persisted in IDB. It's
        // inadequate for AU SME bookkeeping; swap it for the FY2026
        // Company default so they get the same comprehensive set fresh
        // users get. Replacement is safe because the legacy seed has no
        // `_v` stamp and no `isDefault` flag — distinguishable from
        // user-curated accounts.
        setAccounts(getDefaultCoaFor('Company', 'FY2026'));
      } else {
        setAccounts(loaded);
      }
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

  const reload = useCallback(async () => {
    try {
      const adapter = await getAdapter();
      const loaded = await adapter.getAccounts();
      setAccounts(loaded);
    } catch (err) {
      console.error('useAccounts reload failed', err);
    }
  }, []);

  const appendAndPersist = useCallback(
    async (newAccounts: Account[]) => {
      // Task 13: serialize the read-modify-write under the shared
      // 'coa-write' lock so a concurrent appendAndPersist / saveAll
      // effect / reload can't clobber the merged list. Without this, two
      // overlapping import flows last-write-wins and the loser's new
      // accounts vanish on next reload.
      await withLock('coa-write', async () => {
        // Read adapter state directly so we don't append on top of a stale
        // closure copy of `accounts` from an earlier render.
        const adapter = await getAdapter();
        const existing = await adapter.getAccounts();
        const merged = [...existing, ...newAccounts];
        await adapter.saveAccounts(merged);
        // Mirror the persisted list into React state so downstream renders
        // (AccountManager, anomaly counts, …) see the new rows immediately.
        setAccounts(merged);
        addLog(
          'IMPORT_DATA',
          `Created ${newAccounts.length} account${newAccounts.length === 1 ? '' : 's'} via TB import`,
          '',
        );
      });
    },
    [addLog],
  );

  return {
    accounts,
    updateAccount,
    saveAll,
    archiveAccount,
    setIsDefault,
    isAccountInUse,
    reload,
    appendAndPersist,
  };
}
