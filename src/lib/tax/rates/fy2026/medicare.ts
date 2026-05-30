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
  MEDICARE_LEVY_FAMILY_LOWER,
  MEDICARE_LEVY_FAMILY_UPPER,
  MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER,
  MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER,
  MLS_SINGLE_TIER_1,
  MLS_SINGLE_TIER_2,
  MLS_SINGLE_TIER_3,
  MLS_SINGLE_RATE_1,
  MLS_SINGLE_RATE_2,
  MLS_SINGLE_RATE_3,
  MLS_FAMILY_TIER_1,
  MLS_FAMILY_TIER_2,
  MLS_FAMILY_TIER_3,
  MLS_FAMILY_DEPENDANT_INCREMENT,
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
 * Compute family Medicare levy for FY2025-26 (Phase 8 — MED-02).
 *
 * Algorithm:
 *   1. effLower = FAMILY_LOWER + dependants × DEPENDANT_INCREMENT_LOWER
 *   2. effUpper = FAMILY_UPPER + dependants × DEPENDANT_INCREMENT_UPPER
 *   3. combined = taxableIncome + spouseIncome
 *   4. combined ≤ effLower → $0
 *   5. combined < effUpper → shade-in: min((combined - effLower) × 0.10, taxableIncome × 0.02)
 *   6. combined ≥ effUpper → full 2% of TAXPAYER'S OWN taxableIncome (NOT combined — Pitfall 1)
 *
 * Note the two distinct per-dependant increments ($4,338 lower vs $5,422 upper — Pitfall 2).
 */
export function medicareLevyFamily(
  taxableIncome: Decimal,
  spouseIncome: Decimal,
  dependants: number,
): Decimal {
  const effectiveLower = new Decimal(MEDICARE_LEVY_FAMILY_LOWER)
    .plus(new Decimal(MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER).times(dependants));
  const effectiveUpper = new Decimal(MEDICARE_LEVY_FAMILY_UPPER)
    .plus(new Decimal(MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER).times(dependants));

  const combined = taxableIncome.plus(spouseIncome);

  if (combined.lessThanOrEqualTo(effectiveLower)) {
    return new Decimal(0);
  }

  if (combined.lessThan(effectiveUpper)) {
    // Shade-in: 10c per $1 of combined income above lower, capped at full 2% of own income
    const shaded = combined.minus(effectiveLower).times(MEDICARE_LEVY_SINGLE_SHADING_RATE);
    const full = taxableIncome.times(MEDICARE_LEVY_RATE);
    return Decimal.min(shaded, full).toDecimalPlaces(2);
  }

  // Above upper threshold: full 2% on taxpayer's own taxable income (NOT combined)
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

/**
 * Compute family Medicare Levy Surcharge for FY2025-26 (Phase 8 — MED-02).
 *
 * - PHC=true → $0 regardless (same as single behaviour).
 * - Combined income gates the tier; surcharge rate applies to TAXPAYER'S OWN income (Pitfall 1 analogue).
 * - Per-dependant-AFTER-FIRST increment: max(0, dependants - 1) × $1,500 shifts ALL 3 tier thresholds equally (Pitfall 3).
 */
export function medicareLevySurchargeFamily(
  combinedIncome: Decimal,
  ownTaxableIncome: Decimal,
  hasPHC: boolean,
  dependants: number,
): Decimal {
  if (hasPHC) return new Decimal(0);

  const increment = new Decimal(MLS_FAMILY_DEPENDANT_INCREMENT)
    .times(Math.max(0, dependants - 1));
  const t1 = new Decimal(MLS_FAMILY_TIER_1).plus(increment);
  const t2 = new Decimal(MLS_FAMILY_TIER_2).plus(increment);
  const t3 = new Decimal(MLS_FAMILY_TIER_3).plus(increment);

  let rate = new Decimal(0);
  if (combinedIncome.greaterThan(t3)) {
    rate = new Decimal(MLS_SINGLE_RATE_3); // 1.5% — same rate constants as single
  } else if (combinedIncome.greaterThan(t2)) {
    rate = new Decimal(MLS_SINGLE_RATE_2); // 1.25%
  } else if (combinedIncome.greaterThan(t1)) {
    rate = new Decimal(MLS_SINGLE_RATE_1); // 1.0%
  }

  return ownTaxableIncome.times(rate).toDecimalPlaces(2);
}

export interface MedicareLevyInput {
  taxableIncome: Decimal;
  hasPHC: boolean;
  filingStatus: 'single' | 'family';
  /** Phase 8 — dependant-child count (family branch only). Defaults to 0 when omitted. */
  dependants?: number;
  /** Phase 8 — spouse's taxable income as decimal string (family branch only). Defaults to '0' when omitted. */
  spouseIncome?: string;
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
 * Phase 8: family branch now calls real threshold engine (medicareLevyFamily +
 * medicareLevySurchargeFamily). Single branch is unchanged from Phase 5.
 */
export function medicareLevyFY2026(input: MedicareLevyInput): MedicareLevyResult {
  const { taxableIncome, hasPHC, filingStatus, dependants, spouseIncome } = input;
  let levy: Decimal;
  let surcharge: Decimal;
  let basis: string;
  const familyWarning: string | undefined = undefined;

  if (filingStatus === 'family') {
    // Phase 8 — real family threshold engine (MED-02).
    // Tolerant parse: missing spouseIncome → '0'; INVALID parse handled by computeIndividualReturn
    // upstream (it constructs a clean Decimal before calling this orchestrator) — anomaly emission
    // happens at compute layer per CONTEXT decision.
    const deps = dependants ?? 0;
    const spouseDecimal = spouseIncome !== undefined ? new Decimal(spouseIncome) : new Decimal(0);
    const combined = taxableIncome.plus(spouseDecimal);

    levy = medicareLevyFamily(taxableIncome, spouseDecimal, deps);
    surcharge = medicareLevySurchargeFamily(combined, taxableIncome, hasPHC, deps);

    if (hasPHC) {
      basis = 'Family Medicare levy applied; MLS $0 (private hospital cover held)';
    } else if (surcharge.greaterThan(0)) {
      basis = `Family Medicare levy (${deps} dependants, spouse income $${spouseIncome ?? '0'}) + family MLS`;
    } else {
      basis = `Family Medicare levy (${deps} dependants, spouse income $${spouseIncome ?? '0'})`;
    }
  } else {
    levy = medicareLevySingle(taxableIncome);
    surcharge = medicareLevySurcharge(taxableIncome, hasPHC, filingStatus);

    let singleBasis = `Medicare levy ${(Number(MEDICARE_LEVY_RATE) * 100).toFixed(0)}% applied`;
    if (surcharge.greaterThan(0)) {
      singleBasis += ` + MLS (no private hospital cover)`;
    }
    if (hasPHC) {
      singleBasis = 'Medicare levy applied; MLS $0 (private hospital cover held)';
    }
    basis = singleBasis;
  }

  return { levy, surcharge, basis, familyWarning };
}
