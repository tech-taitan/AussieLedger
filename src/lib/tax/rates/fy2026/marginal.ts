/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Decimal } from '../../../money';
import { FY2026_MARGINAL_BRACKETS } from '../../labels/fy2026';

/**
 * Compute Australian-resident marginal tax for FY2025-26.
 * Source: ATO "Tax rates – Australian resident" 2025-26 (post-Stage-3, in force from 1 Jul 2024).
 * https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
 *
 * Formula: tax = baseAt + rate × (income − bracketLower)
 *
 * Boundaries (to-the-cent):
 *   $18,200 → $0
 *   $45,000 → $4,288.00
 *   $135,000 → $31,288.00
 *   $190,000 → $51,638.00
 */
export { FY2026_MARGINAL_BRACKETS };

export function marginalTaxFY2026(taxableIncome: Decimal): Decimal {
  if (taxableIncome.lessThanOrEqualTo(FY2026_MARGINAL_BRACKETS[0].upTo)) {
    return new Decimal(0);
  }

  for (let i = 1; i < FY2026_MARGINAL_BRACKETS.length; i++) {
    const bracket = FY2026_MARGINAL_BRACKETS[i];
    const upToDec = bracket.upTo === 'Infinity' ? null : new Decimal(bracket.upTo);
    if (upToDec === null || taxableIncome.lessThanOrEqualTo(upToDec)) {
      return new Decimal(bracket.baseAt)
        .plus(new Decimal(bracket.rate).times(taxableIncome.minus(new Decimal(bracket.lowerBound))))
        .toDecimalPlaces(2);
    }
  }

  // Unreachable — top bracket has upTo='Infinity'
  throw new Error('marginalTaxFY2026: bracket lookup fell through');
}
