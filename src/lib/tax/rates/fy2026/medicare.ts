/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Decimal } from '../../../money';
import {
  MEDICARE_LEVY_RATE,
  MEDICARE_LEVY_SINGLE_LOWER,
  MEDICARE_LEVY_SINGLE_UPPER,
  MEDICARE_LEVY_SINGLE_SHADING_RATE,
  MLS_SINGLE_TIER_1,
  MLS_SINGLE_TIER_2,
  MLS_SINGLE_TIER_3,
  MLS_SINGLE_RATE_1,
  MLS_SINGLE_RATE_2,
  MLS_SINGLE_RATE_3,
} from '../../labels/fy2026';

/**
 * Compute Medicare levy for a single taxpayer (no dependants) FY2025-26.
 *
 * Thresholds (FY2026):
 *   - ≤ $27,222       → $0
 *   - $27,223–$34,028 → shade-in: 10c per $1 above lower, capped at 2% of income
 *   - > $34,028       → full 2% of taxable income
 */
export function medicareLevySingle(taxableIncome: Decimal): Decimal {
  const lower = new Decimal(MEDICARE_LEVY_SINGLE_LOWER);
  const upper = new Decimal(MEDICARE_LEVY_SINGLE_UPPER);

  if (taxableIncome.lessThanOrEqualTo(lower)) {
    return new Decimal(0);
  }

  if (taxableIncome.lessThan(upper)) {
    // Shade-in 10c per $1 above lower, capped at full 2% of income
    const shaded = taxableIncome.minus(lower).times(MEDICARE_LEVY_SINGLE_SHADING_RATE);
    const full = taxableIncome.times(MEDICARE_LEVY_RATE);
    return Decimal.min(shaded, full).toDecimalPlaces(2);
  }

  return taxableIncome.times(MEDICARE_LEVY_RATE).toDecimalPlaces(2);
}

/**
 * Compute Medicare Levy Surcharge (MLS) for FY2025-26.
 *
 * - Returns $0 if hasPHC is true (private hospital cover held for full year).
 * - For family filing: returns $0 with warning emitted by orchestrator (family thresholds not implemented in v1).
 * - For single: applies tier-based rate above $101,000.
 */
export function medicareLevySurcharge(
  taxableIncome: Decimal,
  hasPHC: boolean,
  filingStatus: 'single' | 'family' = 'single',
): Decimal {
  if (hasPHC) return new Decimal(0);

  if (filingStatus !== 'single') {
    // Family thresholds deferred — Phase 5 v1 returns 0; orchestrator emits warning
    return new Decimal(0);
  }

  const t1 = new Decimal(MLS_SINGLE_TIER_1);
  const t2 = new Decimal(MLS_SINGLE_TIER_2);
  const t3 = new Decimal(MLS_SINGLE_TIER_3);

  let rate = new Decimal(0);
  if (taxableIncome.greaterThan(t3)) {
    rate = new Decimal(MLS_SINGLE_RATE_3);
  } else if (taxableIncome.greaterThan(t2)) {
    rate = new Decimal(MLS_SINGLE_RATE_2);
  } else if (taxableIncome.greaterThan(t1)) {
    rate = new Decimal(MLS_SINGLE_RATE_1);
  }

  return taxableIncome.times(rate).toDecimalPlaces(2);
}

export interface MedicareLevyInput {
  taxableIncome: Decimal;
  hasPHC: boolean;
  filingStatus: 'single' | 'family';
}

export interface MedicareLevyResult {
  levy: Decimal;
  surcharge: Decimal;
  basis: string;
  familyWarning?: string;
}

/**
 * Orchestrator: compute Medicare levy + MLS for FY2025-26.
 *
 * For family filing status, applies flat 2% Medicare levy with a warning note
 * (family thresholds not fully implemented in Phase 5 v1 per CONTEXT decision).
 */
export function medicareLevyFY2026(input: MedicareLevyInput): MedicareLevyResult {
  const { taxableIncome, hasPHC, filingStatus } = input;
  let levy: Decimal;
  let familyWarning: string | undefined;

  if (filingStatus === 'family') {
    // Phase 5 baseline: flat 2% for family + visible warning (CONTEXT decision)
    levy = taxableIncome.times(MEDICARE_LEVY_RATE).toDecimalPlaces(2);
    familyWarning =
      'Medicare levy family thresholds not yet supported — flat 2% applied; manual review required.';
  } else {
    levy = medicareLevySingle(taxableIncome);
  }

  const surcharge = medicareLevySurcharge(taxableIncome, hasPHC, filingStatus);

  let basis = `Medicare levy ${(Number(MEDICARE_LEVY_RATE) * 100).toFixed(0)}% applied`;
  if (surcharge.greaterThan(0)) {
    basis += ` + MLS (no private hospital cover)`;
  }
  if (hasPHC) {
    basis = 'Medicare levy applied; MLS $0 (private hospital cover held)';
  }

  return { levy, surcharge, basis, familyWarning };
}
