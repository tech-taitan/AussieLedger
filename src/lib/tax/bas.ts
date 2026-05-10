/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Source: relocated from src/components/BasIasAssistant.tsx lines 11-86
// TODO Phase 5: replace with ATO-correct BAS rollup against NAT 7392 FY-year

import { Decimal } from '../money';
import type { BasInput, BasReturn, LabelResult } from './types';

/**
 * Compute BAS (Business Activity Statement) labels from journal entries.
 *
 * Phase 2: Relocates the demo rollup math from BasIasAssistant.tsx verbatim,
 * converted from raw number arithmetic to Decimal via money.ts.
 * Visual output of BasIasAssistant is unchanged after migration to consume this function.
 *
 * Math preserved from BasIasAssistant.tsx:
 * - G1: sum of all Revenue credit-debit amounts
 * - G3: FRE-coded Revenue amounts
 * - G10: Asset accounts with gstCode='GST' where debit > credit
 * - G11: non-Wage Expense amounts
 * - 1A: taxAmount sum on GST-coded Revenue
 * - 1B: taxAmount sum on GST-coded Expenses + GST-coded Asset capital purchases
 * - W1: Wage Expense amounts (account.name includes 'Wages')
 * - W2: PAYG Withholding credits (account.name includes 'PAYG Withholding')
 * - netGst: 1A - 1B
 *
 * Clamping: G1-G11, 1A, 1B, W1, W2 are clamped at 0 (Decimal.max), preserving the
 * existing BasIasAssistant Math.max(0, x) behaviour.
 *
 * Phase 5 will replace the internal logic with ATO-correct GST apportionment rules.
 */
export function computeBas(input: BasInput): BasReturn {
  const { entries, accounts } = input;

  let g1 = new Decimal(0); // Total sales
  const g2 = new Decimal(0); // Export sales (stub: 0 — no export flag on accounts yet)
  let g3 = new Decimal(0); // Other GST-free sales
  let g10 = new Decimal(0); // Capital purchases
  let g11 = new Decimal(0); // Non-capital purchases
  let gstOnSales1A = new Decimal(0);
  let gstOnPurchases1B = new Decimal(0);
  let w1 = new Decimal(0); // Total salary, wages
  let w2 = new Decimal(0); // Amounts withheld from W1

  for (const entry of entries) {
    for (const line of entry.lines) {
      const account = accounts.find(a => a.id === line.accountId);
      if (!account) continue;

      const creditAmount = new Decimal(line.credit || 0);
      const debitAmount  = new Decimal(line.debit  || 0);
      const taxAmount    = new Decimal(line.taxAmount || 0);

      // Revenue (Sales)
      if (account.type === 'Revenue') {
        const amount = creditAmount.minus(debitAmount);
        g1 = g1.plus(amount); // Total sales
        if (account.gstCode === 'FRE') {
          g3 = g3.plus(amount); // GST-free sales
        }
        if (account.gstCode === 'GST') {
          gstOnSales1A = gstOnSales1A.plus(taxAmount);
        }
      }

      // Expenses / Purchases
      if (account.type === 'Expense') {
        const expenseAmount = debitAmount.minus(creditAmount);
        if (account.name.includes('Wages')) {
          w1 = w1.plus(expenseAmount);
        } else {
          g11 = g11.plus(expenseAmount); // Non-capital purchases
          if (account.gstCode === 'GST') {
            gstOnPurchases1B = gstOnPurchases1B.plus(taxAmount);
          }
        }
      }

      // Assets (Capital purchases)
      if (account.type === 'Asset' && account.gstCode === 'GST') {
        const assetAmount = debitAmount.minus(creditAmount);
        if (assetAmount.greaterThan(0)) {
          g10 = g10.plus(assetAmount);
          gstOnPurchases1B = gstOnPurchases1B.plus(taxAmount);
        }
      }

      // PAYG Withholding (Liability credit = amount withheld)
      if (account.name.includes('PAYG Withholding')) {
        w2 = w2.plus(creditAmount.minus(debitAmount));
      }
    }
  }

  // Clamp at 0 — preserves existing Math.max(0, x) behaviour from BasIasAssistant.tsx
  const clamp = (v: Decimal): Decimal => Decimal.max(new Decimal(0), v);

  const clampedG1  = clamp(g1);
  const clampedG2  = clamp(g2);
  const clampedG3  = clamp(g3);
  const clampedG10 = clamp(g10);
  const clampedG11 = clamp(g11);
  const clamped1A  = clamp(gstOnSales1A);
  const clamped1B  = clamp(gstOnPurchases1B);
  const clampedW1  = clamp(w1);
  const clampedW2  = clamp(w2);

  const make = (v: Decimal): LabelResult => ({ value: v, source: [] });

  return {
    G1:     make(clampedG1),
    G2:     make(clampedG2),
    G3:     make(clampedG3),
    G10:    make(clampedG10),
    G11:    make(clampedG11),
    '1A':   make(clamped1A),
    '1B':   make(clamped1B),
    W1:     make(clampedW1),
    W2:     make(clampedW2),
    netGst: make(clamped1A.minus(clamped1B)),
  };
}
