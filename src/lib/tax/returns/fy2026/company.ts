/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * computeCompanyReturn — Full Form C implementation.
 * Plan 05-2: replaces Wave-0 skeleton with complete business logic.
 *
 * Rolls up companyTaxLabel-mapped GL accounts into NAT 0656 label slots.
 * Applies BRE test (brePassiveIncomePct + breRate) for 25%/30% rate selection.
 * Computes franking account opening/movements/closing from 'franking_open'-labelled accounts.
 * Emits FDT anomaly when franking closing balance < 0.
 */
import { Decimal } from '../../../money';
import type { Account, Entity, JournalEntry } from '../../../../types';
import type { FyLabel, Period } from '../../../period';
import { isInPeriod } from '../../../period';
import type { ComputedReturn, CompanyReturnLabels, ReturnLabel, Anomaly } from './types';
import { rollupByLabel } from './_helpers';
import { computeAggregatedTurnover } from '../../aggregatedTurnover';
import { brePassiveIncomePct, breRate } from '../../rates/fy2026/bre';
import { COMPANY_LABELS_FULL } from '../../labels/fy2026';
import type { CompanyLabel } from '../../labels/fy2026';

export type CompanyReturn = ComputedReturn<CompanyReturnLabels>;

export interface ComputeCompanyInput {
  entity: Entity;
  accounts: Account[];
  entries: JournalEntry[];
  fy: FyLabel;
}

/**
 * Compute Company tax return (NAT 0656).
 *
 * Form C label rollup from GL via companyTaxLabel:
 *   Income:  6A (gross sales) + 6D/6E/6F/6H (passive items) + 6R/6U (other) → 6T (total)
 *   Expenses: 6C/6G/6Q/6U/6X → 6S (total)
 *   7T = 6T − 6S (taxable income)
 *
 * BRE test:
 *   - brePassiveIncomePct derives passivePct from BREPI labels {6D, 6E, 6F, 6H}
 *   - breRate determines 25% vs 30% + emits borderline anomaly if 70–90%
 *
 * Franking account:
 *   - Accounts with companyTaxLabel = 'franking_open' track the franking account
 *   - Opening = sum of entries BEFORE FY start (prior to 1 Jul FY-year)
 *   - Movements = sum of entries WITHIN FY period
 *   - Closing = Opening + Movements
 *   - FDT anomaly emitted if Closing < 0
 */
export function computeCompanyReturn(input: ComputeCompanyInput): CompanyReturn {
  const { entity, accounts, entries, fy } = input;

  // Step 1: aggregated turnover
  const aggregatedTurnover = computeAggregatedTurnover(entity, accounts, entries, fy);

  // Step 2: rollup GL by companyTaxLabel
  const raw = rollupByLabel<CompanyLabel>(entries, accounts, 'companyTaxLabel');

  const zero = new Decimal(0);
  const get = (key: CompanyLabel): Decimal => raw[key] ?? zero;

  // Step 3: Form C income/expense labels
  const income6A = get('6A');
  const income6D = get('6D');
  const income6E = get('6E');
  const income6F = get('6F');
  const income6H = get('6H');
  const income6R = get('6R');
  const income6U = get('6U');
  const total6T = income6A.plus(income6D).plus(income6E).plus(income6F)
    .plus(income6H).plus(income6R).plus(income6U);

  const exp6C = get('6C');
  const exp6G = get('6G');
  const exp6Q = get('6Q');
  const exp6X = get('6X');
  // Note: 6U can also be on expense side; rollup handles by account type polarity
  const total6S = exp6C.plus(exp6G).plus(exp6Q).plus(exp6X);

  const taxable7T = total6T.minus(total6S);

  // Step 4: BRE test
  const passive = brePassiveIncomePct(accounts, entries, fy);
  const bre = breRate({
    passivePct: passive.passivePct,
    aggregatedTurnover,
    totalAssessable: passive.totalAssessable,
  });
  const taxPayable = Decimal.max(0, taxable7T.times(bre.rate)).toDecimalPlaces(2);

  // Step 5: franking account
  // Look for any account labelled 'franking_open' to track the franking account
  const frankingAccounts = accounts.filter(
    (a) => a.companyTaxLabel === 'franking_open',
  );
  const frankingAccountIds = new Set(frankingAccounts.map((a) => a.id));

  // Derive the calendar year from the FY label: FY2026 = 1 Jul 2025 – 30 Jun 2026
  const fyYear = parseInt(fy.replace('FY', ''), 10);
  const fyStart = new Date(Date.UTC(fyYear - 1, 6, 1)); // 1 Jul of prior year
  const fyPeriod: Period = { type: 'fy', fy };

  let frankingOpen = zero;
  let frankingMove = zero;

  for (const entry of entries) {
    if (
      entry.status === 'superseded' ||
      entry.status === 'voided' ||
      entry.status === 'draft'
    ) {
      continue;
    }
    if (entry.replacedByEntryId) continue;

    const entryDate = new Date(entry.date);
    const inFy = isInPeriod(entryDate, fyPeriod);
    const beforeFy = entryDate < fyStart;

    for (const line of entry.lines) {
      if (!frankingAccountIds.has(line.accountId)) continue;

      const acc = accounts.find((a) => a.id === line.accountId);
      if (!acc) continue;

      // Franking accounts are Equity (credit-positive) or sometimes treated as Asset (debit-positive)
      // Use account type to determine polarity
      let amount: Decimal;
      if (acc.type === 'Equity' || acc.type === 'Liability') {
        // credit-positive
        amount = new Decimal(line.credit || 0).minus(line.debit || 0);
      } else {
        // debit-positive (Asset)
        amount = new Decimal(line.debit || 0).minus(line.credit || 0);
      }

      if (beforeFy) {
        frankingOpen = frankingOpen.plus(amount);
      } else if (inFy) {
        frankingMove = frankingMove.plus(amount);
      }
    }
  }

  const frankingClose = frankingOpen.plus(frankingMove);

  // Step 6: anomalies
  const anomalies: Anomaly[] = [];

  if (bre.anomaly) anomalies.push(bre.anomaly);

  if (frankingClose.lessThan(0)) {
    anomalies.push({
      id: 'fdt-warning',
      severity: 'warn',
      message: 'Franking account closing balance is negative — Franking Deficit Tax (FDT) may apply.',
    });
  }

  const locked = (entity.lockedFys ?? []).includes(fy);
  if (locked) {
    anomalies.push({ id: 'locked-fy', severity: 'info', message: 'Locked FY — read-only working paper.' });
  }

  // Step 7: build label map
  const makeLabel = (code: string, value: Decimal): ReturnLabel => {
    const meta = COMPANY_LABELS_FULL[code as CompanyLabel];
    return {
      code,
      value: value.toDecimalPlaces(2),
      plainEnglish: meta?.plainEnglish ?? code,
      natReference: meta?.natReference,
    };
  };

  return {
    labels: {
      '6A':          makeLabel('6A', income6A),
      '6D':          makeLabel('6D', income6D),
      '6E':          makeLabel('6E', income6E),
      '6F':          makeLabel('6F', income6F),
      '6H':          makeLabel('6H', income6H),
      '6R':          makeLabel('6R', income6R),
      '6U':          makeLabel('6U', income6U),
      '6T':          makeLabel('6T', total6T),
      '6C':          makeLabel('6C', exp6C),
      '6G':          makeLabel('6G', exp6G),
      '6Q':          makeLabel('6Q', exp6Q),
      '6X':          makeLabel('6X', exp6X),
      '6S':          makeLabel('6S', total6S),
      '7T':          makeLabel('7T', taxable7T),
      'CS_A':        makeLabel('CS_A', taxable7T),      // taxable income for CS calculation
      'CS_B':        makeLabel('CS_B', taxPayable),     // tax payable
      'CS_J':        makeLabel('CS_J', taxPayable),     // after offsets (none in v1)
      'CS_S':        makeLabel('CS_S', taxPayable),     // PAYG deducted at user step
      'franking_open':  makeLabel('franking_open', frankingOpen),
      'franking_move':  makeLabel('franking_move', frankingMove),
      'franking_close': makeLabel('franking_close', frankingClose),
    } as CompanyReturnLabels,
    meta: {
      fy,
      entityType: 'Company',
      natReference: 'NAT 0656',
      locked,
      anomalies,
      taxRate: bre.rate.toString(),
      taxRateBasis: bre.basis,
      breIsBre: bre.isBre,
      passivePct: passive.passivePct.toFixed(4),
      totalAssessable: passive.totalAssessable.toFixed(2),
      brepiTotal: passive.brepiTotal.toFixed(2),
      aggregatedTurnover: aggregatedTurnover.toFixed(2),
    },
  };
}
