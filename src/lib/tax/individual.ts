/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Source: relocated from src/components/TaxReturnAssistant.tsx lines 29-58
// TODO Phase 5: replace with ATO-correct rollup against NAT 0660 FY-year

import { Decimal } from '../money';
import type { IndividualInput, IndividualReturn, LabelResult } from './types';

/**
 * Compute Individual tax return labels from journal entries.
 *
 * Phase 2: Relocates the demo rollup math from TaxReturnAssistant.tsx verbatim,
 * converted from raw number arithmetic to Decimal via money.ts.
 * Visual output of TaxReturnAssistant is unchanged after migration to consume this function.
 *
 * Phase 5 will replace the internal logic with ATO-correct label-set rollups.
 */
export function computeIndividual(input: IndividualInput): IndividualReturn {
  const { entries, accounts } = input;
  const labelBalances: Record<string, Decimal> = {};
  let totalIncome = new Decimal(0);
  let totalExpenses = new Decimal(0);

  for (const entry of entries) {
    for (const line of entry.lines) {
      const account = accounts.find(a => a.id === line.accountId);
      if (!account?.taxLabel) continue;

      const credit = new Decimal(line.credit || 0);
      const debit  = new Decimal(line.debit  || 0);
      // amount = credit - debit (positive = credit, negative = debit)
      const amount = credit.minus(debit);
      const isExpense = ['6L', '6N', '6Q'].includes(account.taxLabel);
      // Expenses use multiplier -1 so the stored balance is positive for debit-heavy lines
      const adjusted = isExpense ? amount.negated() : amount;

      labelBalances[account.taxLabel] = (labelBalances[account.taxLabel] ?? new Decimal(0)).plus(adjusted);

      if (isExpense) {
        totalExpenses = totalExpenses.plus(adjusted);
      } else {
        totalIncome = totalIncome.plus(adjusted);
      }
    }
  }

  const make = (label: string): LabelResult => ({
    value: labelBalances[label] ?? new Decimal(0),
    source: [],
  });

  return {
    '6S': make('6S'),
    '6K': make('6K'),
    '6L': make('6L'),
    '6N': make('6N'),
    '6Q': make('6Q'),
    '7T': { value: totalIncome.minus(totalExpenses), source: [] },
  };
}
