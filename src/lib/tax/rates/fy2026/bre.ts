/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Decimal } from '../../../money';
import {
  BRE_PASSIVE_THRESHOLD,
  BRE_TURNOVER_THRESHOLD,
  COMPANY_TAX_RATE_BASE,
  COMPANY_TAX_RATE_FULL,
} from '../../labels/fy2026';
import { isInPeriod, type FyLabel } from '../../../period';
import type { Account, JournalEntry } from '../../../../types';
import type { Anomaly } from '../../returns/fy2026/types';

/**
 * Company tax labels that classify as Base Rate Entity Passive Income (BREPI).
 *
 * Conservative approach per CONTEXT decision: all dividends are treated as BREPI
 * (i.e. the non-portfolio exception in s.23AB is NOT applied unless the user
 * explicitly overrides — see anomaly for borderline band).
 *
 *   '6D' — Gross interest (passive)
 *   '6E' — Gross rent (passive)
 *   '6F' — Gross interest (alias used in Phase 2)
 *   '6H' — Dividends received (all treated as BREPI, conservative per CONTEXT)
 */
const PASSIVE_COMPANY_LABELS = new Set(['6D', '6E', '6F', '6H']);

/**
 * Compute the ratio of Base Rate Entity Passive Income (BREPI) to total assessable income.
 *
 * Filters entries to the given FY period; excludes superseded/voided/draft entries
 * and entries with replacedByEntryId set (defence-in-depth per Phase 4 invariant).
 */
export function brePassiveIncomePct(
  accounts: Account[],
  entries: JournalEntry[],
  fy: FyLabel,
): { passivePct: Decimal; brepiTotal: Decimal; totalAssessable: Decimal; basis: string } {
  const period = { type: 'fy', fy } as const;
  let brepiTotal = new Decimal(0);
  let totalAssessable = new Decimal(0);

  for (const entry of entries) {
    if (
      entry.status === 'superseded' ||
      entry.status === 'voided' ||
      entry.status === 'draft'
    ) {
      continue;
    }
    if (entry.replacedByEntryId) continue;
    if (!isInPeriod(new Date(entry.date), period)) continue;

    for (const line of entry.lines) {
      const acc = accounts.find((a) => a.id === line.accountId);
      if (!acc || acc.type !== 'Revenue') continue;
      const amount = new Decimal(line.credit || 0).minus(line.debit || 0);
      if (amount.lessThanOrEqualTo(0)) continue;
      totalAssessable = totalAssessable.plus(amount);
      if (acc.companyTaxLabel && PASSIVE_COMPANY_LABELS.has(acc.companyTaxLabel)) {
        brepiTotal = brepiTotal.plus(amount);
      }
    }
  }

  const passivePct = totalAssessable.greaterThan(0)
    ? brepiTotal.dividedBy(totalAssessable).toDecimalPlaces(4)
    : new Decimal(0);

  const basis = `Passive income (BREPI) ${passivePct.times(100).toFixed(2)}% of total assessable income $${totalAssessable.toFixed(2)} (BREPI labels: 6D/6E/6F/6H — conservative)`;

  return { passivePct, brepiTotal, totalAssessable, basis };
}

export interface BreRateInput {
  passivePct: Decimal;
  aggregatedTurnover: Decimal;
  totalAssessable: Decimal;
}

/**
 * Determine the applicable company tax rate given the BRE test inputs.
 *
 * BRE rate (25%) applies when:
 *   - aggregatedTurnover < $50M, AND
 *   - BREPI ≤ 80% of total assessable income
 *
 * Full rate (30%) applies otherwise.
 *
 * Borderline anomaly: emitted when BREPI is between 70% and 90% to warn of
 * non-portfolio dividend exception (s.23AB of Income Tax Rates Act 1986).
 */
export function breRate(
  input: BreRateInput,
): { rate: Decimal; isBre: boolean; basis: string; anomaly?: Anomaly } {
  const passiveThreshold = new Decimal(BRE_PASSIVE_THRESHOLD);
  const turnoverThreshold = new Decimal(BRE_TURNOVER_THRESHOLD);
  const rateBre = new Decimal(COMPANY_TAX_RATE_BASE);
  const rateFull = new Decimal(COMPANY_TAX_RATE_FULL);

  let anomaly: Anomaly | undefined;

  // 70–90% borderline band — warn of potential non-portfolio dividend exception
  if (
    input.passivePct.greaterThanOrEqualTo('0.70') &&
    input.passivePct.lessThanOrEqualTo('0.90')
  ) {
    anomaly = {
      id: 'bre-borderline',
      severity: 'warn',
      message: `BRE check: passive income ${input.passivePct.times(100).toFixed(2)}% is borderline (70–90%). If non-portfolio dividends (≥10% voting interest) are present, the s.23AB exception may reduce BREPI below 80% — review with your tax agent.`,
    };
  }

  // No assessable income — default to BRE rate
  if (input.totalAssessable.lessThanOrEqualTo(0)) {
    return {
      rate: rateBre,
      isBre: true,
      basis: `25% applied — no assessable income (BRE default)`,
      anomaly,
    };
  }

  // Turnover ≥ $50M → full rate
  if (input.aggregatedTurnover.greaterThanOrEqualTo(turnoverThreshold)) {
    return {
      rate: rateFull,
      isBre: false,
      basis: `30% applied — aggregated turnover $${input.aggregatedTurnover.toFixed(0)} ≥ $50M BRE threshold`,
      anomaly,
    };
  }

  // BREPI > 80% → full rate
  if (input.passivePct.greaterThan(passiveThreshold)) {
    return {
      rate: rateFull,
      isBre: false,
      basis: `30% applied — passive income (BREPI) ${input.passivePct.times(100).toFixed(2)}% exceeds 80% threshold (s.23AA + s.23AB, Income Tax Rates Act 1986)`,
      anomaly,
    };
  }

  // BRE rate applies
  return {
    rate: rateBre,
    isBre: true,
    basis: `25% applied — passive income ${input.passivePct.times(100).toFixed(2)}% ≤ 80% threshold; aggregated turnover < $50M`,
    anomaly,
  };
}

/** Back-compat alias matching RESEARCH.md naming pattern. */
export const breTestFY2026 = breRate;
