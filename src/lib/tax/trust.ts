/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Source: relocated from src/components/TrustTaxReturn.tsx lines 29-59
// TODO Phase 5: replace with ATO-correct rollup against NAT 0659 FY-year

import { Decimal } from '../money';
import type { TrustInput, TrustReturn, LabelResult } from './types';

/**
 * Compute Trust tax return labels from journal entries.
 *
 * Phase 2: Relocates the demo rollup math from TrustTaxReturn.tsx verbatim,
 * converted from raw number arithmetic to Decimal via money.ts.
 * Visual output of TrustTaxReturn is unchanged after migration to consume this function.
 *
 * Derived labels:
 *   5T = sum of income labels (5B + 11J)
 *   5S = sum of expense labels (5E + 5F + 5L + 5M + 5N)
 *   26 = 5T - 5S
 *
 * Phase 5 will replace the internal logic with ATO-correct label-set rollups.
 */
export function computeTrust(input: TrustInput): TrustReturn {
  const { entries, accounts } = input;
  const labelBalances: Record<string, Decimal> = {};

  for (const entry of entries) {
    for (const line of entry.lines) {
      const account = accounts.find(a => a.id === line.accountId);
      if (!account?.trustTaxLabel) continue;

      const credit = new Decimal(line.credit || 0);
      const debit  = new Decimal(line.debit  || 0);
      // Polarity: expenses are debit-heavy → amount = debit - credit; income = credit - debit
      const amount = account.type === 'Expense' ? debit.minus(credit) : credit.minus(debit);

      labelBalances[account.trustTaxLabel] = (labelBalances[account.trustTaxLabel] ?? new Decimal(0)).plus(amount);
    }
  }

  // Derived totals — mirror TrustTaxReturn.tsx lines 47-57
  // Income labels (excluding derived 5T)
  const incomeLabels = ['5B', '11J'];
  const totalIncome = incomeLabels.reduce(
    (sum, key) => sum.plus(labelBalances[key] ?? new Decimal(0)),
    new Decimal(0)
  );

  // Expense labels (excluding derived 5S)
  const expenseLabels = ['5E', '5F', '5L', '5M', '5N'];
  const totalExpenses = expenseLabels.reduce(
    (sum, key) => sum.plus(labelBalances[key] ?? new Decimal(0)),
    new Decimal(0)
  );

  const make = (label: string): LabelResult => ({
    value: labelBalances[label] ?? new Decimal(0),
    source: [],
  });

  return {
    '5B':  make('5B'),
    '11J': make('11J'),
    '5T':  { value: totalIncome,                   source: [] },
    '5E':  make('5E'),
    '5F':  make('5F'),
    '5L':  make('5L'),
    '5M':  make('5M'),
    '5N':  make('5N'),
    '5S':  { value: totalExpenses,                 source: [] },
    '26':  { value: totalIncome.minus(totalExpenses), source: [] },
  };
}
