/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Decimal } from '../../../money';
import {
  LITO_MAX,
  LITO_TAPER_1_FROM,
  LITO_TAPER_1_RATE,
  LITO_TAPER_2_FROM,
  LITO_TAPER_2_RATE,
  LITO_CUTOUT,
} from '../../labels/fy2026';

/**
 * Compute Low Income Tax Offset (LITO) for FY2025-26.
 * Source: ATO "Low income tax offset"
 * https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset
 *
 * Two-stage taper:
 *   - income ≤ $37,500       → $700 (max)
 *   - $37,501 – $45,000      → $700 − (income − 37,500) × 0.05
 *   - $45,001 – $66,667      → max(0, $325 − (income − 45,000) × 0.015)
 *   - > $66,667              → $0
 */
export function litoFY2026(taxableIncome: Decimal): Decimal {
  const max = new Decimal(LITO_MAX);
  const taper1From = new Decimal(LITO_TAPER_1_FROM);
  const taper2From = new Decimal(LITO_TAPER_2_FROM);
  const cutout = new Decimal(LITO_CUTOUT);

  if (taxableIncome.lessThanOrEqualTo(taper1From)) {
    return max;
  }

  if (taxableIncome.lessThanOrEqualTo(taper2From)) {
    // Stage 1 taper: 5c per $1 above $37,500
    return max
      .minus(taxableIncome.minus(taper1From).times(LITO_TAPER_1_RATE))
      .toDecimalPlaces(2);
  }

  if (taxableIncome.lessThanOrEqualTo(cutout)) {
    // At $45,000 residual = 700 - (45000 - 37500) × 0.05 = 700 - 375 = 325
    const residualAtTaper2Start = max.minus(
      taper2From.minus(taper1From).times(LITO_TAPER_1_RATE),
    );
    // Stage 2 taper: 1.5c per $1 above $45,000
    return Decimal.max(
      0,
      residualAtTaper2Start.minus(
        taxableIncome.minus(taper2From).times(LITO_TAPER_2_RATE),
      ),
    ).toDecimalPlaces(2);
  }

  return new Decimal(0);
}
