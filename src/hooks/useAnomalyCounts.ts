/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useAnomalyCounts — real-time anomaly count computation for Sidebar badges.
 *
 * Counts are never persisted; computed via useMemo from live data.
 * Source of truth for "unbalanced journals" and "unmapped accounts" badges.
 */

import { useMemo } from 'react';
import type { Account, JournalEntry } from '../types.js';

export interface AnomalyCounts {
  journals: number; // unbalanced posted entries
  accounts: number; // accounts referenced in posted entries with no tax label
}

/**
 * Compute anomaly counts for Sidebar badges.
 *
 * @param accounts - All accounts (across all entities)
 * @param entries - Map of entityId → JournalEntry[]
 * @param activeEntityId - When set, restrict to that entity; null = all entities
 */
export function useAnomalyCounts(
  accounts: Account[],
  entries: Record<string, JournalEntry[]>,
  activeEntityId: string | null,
): AnomalyCounts {
  return useMemo(() => {
    // Gather relevant entries
    const entityEntries: JournalEntry[] = activeEntityId
      ? (entries[activeEntityId] ?? [])
      : Object.values(entries).flat();

    // Posted entries only (v3 status field; fall back to legacy isPosted flag)
    const postedEntries = entityEntries.filter(
      (e) => e.status === 'posted' || (e.status === undefined && e.isPosted),
    );

    // Journals: unbalanced posted entries (tolerance 0.005)
    const journalCount = postedEntries.filter((e) => {
      const debit = e.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
      const credit = e.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
      return Math.abs(debit - credit) > 0.005;
    }).length;

    // Accounts: referenced in posted entries but missing a tax label.
    // Asset / Liability / Equity rows + header rows aren't on a tax return
    // so they're excluded. A Revenue or Expense leaf counts as anomalous
    // when ANY of the 4 entity-specific labels is missing (matches the
    // strict seed-coverage rule in seed.test.ts).
    const referencedAccountIds = new Set(
      postedEntries.flatMap((e) => e.lines.map((l) => l.accountId)),
    );
    const accountCount = accounts.filter((a) => {
      if (!referencedAccountIds.has(a.id)) return false;
      const isHeader = a.parentCode === null || a.parentCode === undefined;
      if (isHeader) return false;
      if (a.type !== 'Revenue' && a.type !== 'Expense') return false;
      return (
        !a.taxLabel ||
        !a.companyTaxLabel ||
        !a.trustTaxLabel ||
        !a.partnershipTaxLabel
      );
    }).length;

    return { journals: journalCount, accounts: accountCount };
  }, [accounts, entries, activeEntityId]);
}
