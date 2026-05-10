/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Source: relocated from src/components/CompanyTaxReturn.tsx lines 29-59
// TODO Phase 5: replace with ATO-correct rollup against NAT 0656 FY-year

import { Decimal } from '../money';
import type { CompanyInput, CompanyReturn, LabelResult } from './types';

/**
 * Compute Company tax return labels from journal entries.
 *
 * Phase 2: Relocates the demo rollup math from CompanyTaxReturn.tsx verbatim,
 * converted from raw number arithmetic to Decimal via money.ts.
 * Visual output of CompanyTaxReturn is unchanged after migration to consume this function.
 *
 * Derived labels:
 *   6T = sum of income labels (6A + 6F)
 *   6S = sum of expense labels (6C + 6G + 6X)
 *   7T = 6T - 6S
 *
 * Phase 5 will replace the internal logic with ATO-correct label-set rollups.
 */
export function computeCompany(input: CompanyInput): CompanyReturn {
  const { entries, accounts } = input;
  const labelBalances: Record<string, Decimal> = {};

  for (const entry of entries) {
    for (const line of entry.lines) {
      const account = accounts.find(a => a.id === line.accountId);
      if (!account?.companyTaxLabel) continue;

      const credit = new Decimal(line.credit || 0);
      const debit  = new Decimal(line.debit  || 0);
      // Polarity: expenses are debit-heavy → amount = debit - credit; income = credit - debit
      const amount = account.type === 'Expense' ? debit.minus(credit) : credit.minus(debit);

      labelBalances[account.companyTaxLabel] = (labelBalances[account.companyTaxLabel] ?? new Decimal(0)).plus(amount);
    }
  }

  // Derived totals — mirror CompanyTaxReturn.tsx lines 47-58
  // Income labels (excluding the derived 6T)
  const incomeLabels = ['6A', '6F'];
  const totalIncome = incomeLabels.reduce(
    (sum, key) => sum.plus(labelBalances[key] ?? new Decimal(0)),
    new Decimal(0)
  );

  // Expense labels (excluding the derived 6S)
  const expenseLabels = ['6C', '6G', '6X'];
  const totalExpenses = expenseLabels.reduce(
    (sum, key) => sum.plus(labelBalances[key] ?? new Decimal(0)),
    new Decimal(0)
  );

  const make = (label: string): LabelResult => ({
    value: labelBalances[label] ?? new Decimal(0),
    source: [],
  });

  return {
    '6A': make('6A'),
    '6F': make('6F'),
    '6T': { value: totalIncome,                   source: [] },
    '6C': make('6C'),
    '6G': make('6G'),
    '6X': make('6X'),
    '6S': { value: totalExpenses,                 source: [] },
    '7T': { value: totalIncome.minus(totalExpenses), source: [] },
  };
}
