/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Decimal } from '../../../money';
import {
  SBI_OFFSET_RATE,
  SBI_OFFSET_CAP,
  SBI_OFFSET_TURNOVER_THRESHOLD,
} from '../../labels/fy2026';
import type { Anomaly } from '../../returns/fy2026/types';

export interface SmallBizOffsetInput {
  /** Net small-business income (P8 on the B&P schedule). */
  netSbIncome: Decimal;
  /** Aggregated turnover for the entity. */
  aggregatedTurnover: Decimal;
  /** Total taxable income (used for apportionment). */
  totalTaxableIncome: Decimal;
  /** Marginal tax before LITO + this offset. */
  taxBeforeOffsets: Decimal;
}

export interface SmallBizOffsetResult {
  offset: Decimal;
  basis: string;
  anomaly?: Anomaly;
}

/**
 * Small Business Income Tax Offset (item 7D on Form I — IND-04).
 *
 * Source: ITAA 1997 Subdiv 328-F.
 * 16% × (tax payable × SB share of total taxable income), capped at $1,000.
 *
 * Eligible conditions:
 *   - Individual (sole trader) — entity type enforced by the caller
 *   - Aggregated turnover < $5,000,000
 *   - Net small-business income > $0
 */
export function smallBusinessIncomeOffset(
  input: SmallBizOffsetInput,
): SmallBizOffsetResult {
  const cap = new Decimal(SBI_OFFSET_CAP);
  const rate = new Decimal(SBI_OFFSET_RATE);
  const turnoverThreshold = new Decimal(SBI_OFFSET_TURNOVER_THRESHOLD);

  if (input.aggregatedTurnover.greaterThanOrEqualTo(turnoverThreshold)) {
    return {
      offset: new Decimal(0),
      basis: `Not eligible: aggregated turnover $${input.aggregatedTurnover.toFixed(0)} ≥ $5M threshold`,
    };
  }

  if (input.netSbIncome.lessThanOrEqualTo(0)) {
    return {
      offset: new Decimal(0),
      basis: `Not eligible: no net small-business income (P8 ≤ $0)`,
    };
  }

  if (input.totalTaxableIncome.lessThanOrEqualTo(0)) {
    return {
      offset: new Decimal(0),
      basis: `Not eligible: total taxable income ≤ $0`,
    };
  }

  // Apportion tax payable to SB share of total taxable income
  const sbShare = input.netSbIncome.dividedBy(input.totalTaxableIncome);
  const taxOnSbPortion = input.taxBeforeOffsets.times(sbShare);
  const rawOffset = taxOnSbPortion.times(rate);
  const offset = Decimal.min(rawOffset, cap).toDecimalPlaces(2);

  const capped = rawOffset.greaterThan(cap);
  const basis =
    `16% × tax payable on SB income ($${taxOnSbPortion.toFixed(2)}) = $${rawOffset.toFixed(2)}` +
    (capped ? ` (capped at $${cap.toFixed(0)})` : '');

  return { offset, basis };
}
