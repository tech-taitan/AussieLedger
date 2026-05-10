/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// NOTE: No existing tax component to relocate from — partnership form is built in Phase 4.
// This stub implements the polarity logic correctly so Phase 4's form works without changes.
// Returns shape-correct results: accounts with partnershipTaxLabel roll up into P1/P2/P8.
// TODO Phase 5: replace with ATO-correct rollup against NAT 0976 FY-year

import { Decimal } from '../money';
import type { PartnershipInput, PartnershipReturn, LabelResult } from './types';

/**
 * Compute Partnership tax return labels from journal entries.
 *
 * Phase 2: No existing component to migrate from. This stub implements the correct
 * polarity logic so accounts with partnershipTaxLabel='P1' (Revenue) or 'P2' (Expense)
 * roll up correctly. The partnership form in Phase 4 will consume this function directly.
 *
 * P1 = gross income (Revenue credits minus debits)
 * P2 = total deductions (Expense debits minus credits)
 * P8 = P1 - P2 (net income or loss)
 *
 * With empty entries, all values are Decimal(0) — this is correct, not a defect.
 */
export function computePartnership(input: PartnershipInput): PartnershipReturn {
  const { entries, accounts } = input;
  const totals: Record<string, Decimal> = {};

  for (const entry of entries) {
    for (const line of entry.lines) {
      const account = accounts.find(a => a.id === line.accountId);
      if (!account?.partnershipTaxLabel) continue;

      const credit = new Decimal(line.credit || 0);
      const debit  = new Decimal(line.debit  || 0);
      // Polarity: expenses are debit-heavy; income = credit - debit
      const amount = account.type === 'Expense' ? debit.minus(credit) : credit.minus(debit);

      totals[account.partnershipTaxLabel] = (totals[account.partnershipTaxLabel] ?? new Decimal(0)).plus(amount);
    }
  }

  const make = (label: string): LabelResult => ({
    value: totals[label] ?? new Decimal(0),
    source: [],
  });

  const p1 = totals['P1'] ?? new Decimal(0);
  const p2 = totals['P2'] ?? new Decimal(0);

  return {
    'P1': make('P1'),
    'P2': make('P2'),
    'P8': { value: p1.minus(p2), source: [] },
  };
}
