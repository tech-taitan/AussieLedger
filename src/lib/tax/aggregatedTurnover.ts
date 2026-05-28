/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Decimal } from '../money';
import { isInPeriod, type FyLabel } from '../period';
import type { Account, Entity, JournalEntry } from '../../types';

/**
 * Compute aggregated turnover from journal entries in the given FY period.
 *
 * If `entity.aggregatedTurnover` is set (override), return that value directly.
 * Otherwise, sum credit-minus-debit on Revenue accounts for all posted, non-superseded,
 * non-voided, non-draft entries in the FY period.
 *
 * Used by:
 *   - BRE test (bre.ts) — turnover < $50M check
 *   - Small business income tax offset (smallBizOffset.ts) — turnover < $5M check
 */
export function computeAggregatedTurnover(
  entity: Entity,
  accounts: Account[],
  entries: JournalEntry[],
  fy: FyLabel,
): Decimal {
  // Override: if entity has a manually set aggregated turnover, use it
  if (entity.aggregatedTurnover !== undefined && entity.aggregatedTurnover !== '') {
    return new Decimal(entity.aggregatedTurnover);
  }

  let total = new Decimal(0);
  const period = { type: 'fy', fy } as const;

  for (const entry of entries) {
    if (
      entry.status === 'superseded' ||
      entry.status === 'voided' ||
      entry.status === 'draft'
    ) {
      continue;
    }
    if (entry.replacedByEntryId) continue;
    if (!isInPeriod(new Date(entry.date), period)) continue;

    for (const line of entry.lines) {
      const acc = accounts.find((a) => a.id === line.accountId);
      if (!acc || acc.type !== 'Revenue') continue;
      // Revenue polarity: credit-positive
      const amount = new Decimal(line.credit || 0).minus(line.debit || 0);
      total = total.plus(amount);
    }
  }

  return total.toDecimalPlaces(2);
}
