/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared pure helpers for Phase 5 tax-return compute functions.
 * These are consumed by all 6 compute*Return modules (individual, company, trust,
 * partnership, bas, ias). NO React, NO adapter I/O, NO parameterless `new Date()`.
 */

import { Decimal } from '../../../money';
import type { Account, Entity, JournalEntry } from '../../../../types';

/**
 * Filter entries to those that contribute to a posted tax return.
 *
 * Excludes:
 *   - status in { 'superseded', 'voided', 'draft' }
 *   - entries with `replacedByEntryId` set (defence-in-depth, Phase 4 invariant)
 */
export function filterPostedEntries(entries: JournalEntry[]): JournalEntry[] {
  return entries.filter((e) => {
    if (
      e.status === 'superseded' ||
      e.status === 'voided' ||
      e.status === 'draft'
    ) {
      return false;
    }
    if (e.replacedByEntryId) return false;
    return true;
  });
}

/**
 * Roll up posted journal entries by tax label, applying account-type polarity.
 *
 * Polarity:
 *   Revenue:   credit − debit   (credit-positive)
 *   Expense:   debit − credit   (debit-positive)
 *   Asset:     debit − credit   (debit-positive)
 *   Liability: credit − debit   (credit-positive)
 *   Equity:    credit − debit   (credit-positive)
 *
 * @param entries     - All journal entries (function calls filterPostedEntries internally)
 * @param accounts    - All accounts (used to look up account type + label)
 * @param labelField  - Which account label field to use for classification
 *
 * @returns Record mapping each label key to its rolled-up Decimal total.
 *          Keys not present in any account are absent from the result.
 */
export function rollupByLabel<LabelKey extends string>(
  entries: JournalEntry[],
  accounts: Account[],
  labelField: 'taxLabel' | 'companyTaxLabel' | 'trustTaxLabel' | 'partnershipTaxLabel',
): Record<LabelKey, Decimal> {
  const totals: Record<string, Decimal> = {};
  const posted = filterPostedEntries(entries);

  for (const entry of posted) {
    for (const line of entry.lines) {
      const account = accounts.find((a) => a.id === line.accountId);
      if (!account) continue;

      const label = (account as unknown as Record<string, string | undefined>)[labelField];
      if (!label) continue;

      const credit = new Decimal(line.credit || 0);
      const debit = new Decimal(line.debit || 0);

      // Apply polarity per account type
      const amount =
        account.type === 'Revenue' ||
        account.type === 'Liability' ||
        account.type === 'Equity'
          ? credit.minus(debit)   // credit-positive
          : debit.minus(credit);  // debit-positive (Expense, Asset)

      totals[label] = (totals[label] ?? new Decimal(0)).plus(amount);
    }
  }

  return totals as Record<LabelKey, Decimal>;
}

/**
 * Phase 8 — Family filing eligibility predicate (MED-02).
 *
 * Family iff:
 *   - `dependants ?? 0 >= 1` (at least one dependant child), OR
 *   - `spouseIncome !== undefined` (any spouse income field present — including explicit "0")
 *
 * Both undefined → single filing (Phase 5 behaviour preserved; zero regression for v1.0 entities
 * per MED-04 default-undefined preservation).
 *
 * Critical: `spouseIncome: "0"` triggers family (spouse exists but earned $0).
 * Use explicit `!== undefined` check — do NOT use falsy/truthy on the string.
 */
export function isFamilyFiling(entity: Entity): boolean {
  const hasDependants = (entity.dependants ?? 0) >= 1;
  const hasSpouseIncome = entity.spouseIncome !== undefined;
  return hasDependants || hasSpouseIncome;
}
