/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * computeIndividualReturn — Full Form I + B&P schedule implementation.
 * Plan 05-2: replaces Wave-0 skeleton with complete business logic.
 *
 * Rolls up taxLabel-mapped GL accounts into NAT 2541 + NAT 2543 label slots.
 * Applies marginalTaxFY2026 + litoFY2026 + medicareLevyFY2026 + smallBusinessIncomeOffset.
 * Emits 5 fixed Assumptions as info-severity anomalies.
 */
import { Decimal } from '../../../money';
import type { Account, Entity, JournalEntry } from '../../../../types';
import type { FyLabel } from '../../../period';
import type { ComputedReturn, IndividualReturnLabels, ReturnLabel, Anomaly } from './types';
import { rollupByLabel, isFamilyFiling } from './_helpers';
import { computeAggregatedTurnover } from '../../aggregatedTurnover';
import { marginalTaxFY2026 } from '../../rates/fy2026/marginal';
import { litoFY2026 } from '../../rates/fy2026/lito';
import { medicareLevyFY2026 } from '../../rates/fy2026/medicare';
import { smallBusinessIncomeOffset } from '../../rates/fy2026/smallBizOffset';
import { INDIVIDUAL_LABELS_FULL, MEDICARE_LEVY_FAMILY_LOWER, MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER } from '../../labels/fy2026';
import type { IndividualLabel } from '../../labels/fy2026';

export type IndividualReturn = ComputedReturn<IndividualReturnLabels>;

export interface ComputeIndividualInput {
  entity: Entity;
  accounts: Account[];
  entries: JournalEntry[];
  fy: FyLabel;
}

/**
 * Compute Individual tax return (NAT 2541 + NAT 2543 B&P schedule).
 *
 * Form I + B&P rollup from GL via taxLabel:
 *   P1 = revenue labels: '6S', 'B', 'C', 'J' (gross income items)
 *   P2 = expense labels: '6L', '6N', '6Q', 'K', 'L', 'F', 'E', 'G', 'H', 'I' (deductions)
 *   P8 = P1 − P2 (net small business income)
 *   item15 = P8 (flow-through to main return)
 *
 * Tax computation:
 *   - marginalTaxFY2026(item15) → taxBeforeOffsets
 *   - litoFY2026(item15) → T1
 *   - medicareLevyFY2026({ taxableIncome: item15, hasPHC: true, filingStatus: 'single' }) → M1, M2
 *   - smallBusinessIncomeOffset({ netSbIncome: P8, aggregatedTurnover, totalTaxableIncome: item15, taxBeforeOffsets }) → item7D
 *   - taxAfterOffsets = max(0, taxBeforeOffsets − LITO − offset) + M1 + M2
 *
 * Anomalies emitted:
 *   - 5 fixed assumptions (info)
 *   - Locked-FY (info) if entity.lockedFys includes fy
 *   - Non-commercial loss warning (warn) if P8 < 0
 *   - SBI offset anomaly if returned from smallBusinessIncomeOffset
 */
export function computeIndividualReturn(input: ComputeIndividualInput): IndividualReturn {
  const { entity, accounts, entries, fy } = input;

  // Step 1: aggregated turnover
  const aggregatedTurnover = computeAggregatedTurnover(entity, accounts, entries, fy);

  // Step 2: rollup GL by taxLabel
  const raw = rollupByLabel<IndividualLabel>(entries, accounts, 'taxLabel');

  const zero = new Decimal(0);
  const get = (key: IndividualLabel): Decimal => raw[key] ?? zero;

  // Step 3: compose P1 / P2 / P8
  // P1 = sum of all revenue/gross-income labels
  const p1 = get('6S').plus(get('B')).plus(get('C')).plus(get('6K')).plus(get('J'));
  // P2 = sum of all deduction labels
  const p2 = get('6L').plus(get('6N')).plus(get('6Q'))
    .plus(get('K')).plus(get('L')).plus(get('F'))
    .plus(get('E')).plus(get('G')).plus(get('H')).plus(get('I'));
  const p8 = p1.minus(p2);
  const item15 = p8;

  // Phase 8 — family Medicare eligibility + tolerant spouseIncome parse (MED-02)
  const isFamily = isFamilyFiling(entity);
  const familyDependants = entity.dependants ?? 0;
  let familyBadDataAnomaly: Anomaly | undefined;
  let familySpouseIncomeForCall: string | undefined;
  if (isFamily) {
    if (entity.spouseIncome === undefined) {
      familySpouseIncomeForCall = '0';
    } else {
      // Tolerant parse: invalid or negative → treat as '0' + emit warn anomaly
      try {
        const parsed = new Decimal(entity.spouseIncome);
        if (parsed.isNaN() || !parsed.isFinite() || parsed.isNegative()) {
          throw new Error('invalid');
        }
        familySpouseIncomeForCall = entity.spouseIncome;
      } catch {
        familySpouseIncomeForCall = '0';
        familyBadDataAnomaly = {
          id: 'family-data-warn',
          severity: 'warn',
          label: 'M1',
          message: 'Spouse income data invalid; family thresholds applied with $0 — verify input',
        };
      }
    }
  }

  // Step 4: tax computation
  const taxBeforeOffsets = marginalTaxFY2026(item15);
  const lito = litoFY2026(item15);
  const medicare = medicareLevyFY2026({
    taxableIncome: item15,
    hasPHC: true,
    filingStatus: isFamily ? 'family' : 'single',
    dependants: isFamily ? familyDependants : undefined,
    spouseIncome: isFamily ? familySpouseIncomeForCall : undefined,
  });
  const sbOffset = smallBusinessIncomeOffset({
    netSbIncome: p8,
    aggregatedTurnover,
    totalTaxableIncome: item15,
    taxBeforeOffsets,
  });

  const taxAfterOffsets = Decimal.max(
    0,
    taxBeforeOffsets.minus(lito).minus(sbOffset.offset),
  ).plus(medicare.levy).plus(medicare.surcharge);

  // Step 5: anomalies
  const anomalies: Anomaly[] = [];

  // Phase 8 — assumption rows; family entity REPLACES marital/medicare-exempt/dependants with one family row
  if (isFamily) {
    const familySpouseDisplay = entity.spouseIncome ?? '0';
    const familyMessage =
      `Family Medicare levy applied — ${familyDependants} dependants, spouse income $${familySpouseDisplay}. ` +
      `Family threshold $${MEDICARE_LEVY_FAMILY_LOWER}; per-dependant adjustment $${MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER}.`;
    anomalies.push({ id: 'assumption-family-medicare', severity: 'info', message: familyMessage });
    // age + phc still apply (independent concerns)
    anomalies.push({ id: 'assumption-age', severity: 'info', message: 'Age: under 65 (no Seniors and Pensioners Tax Offset applied)' });
    anomalies.push({ id: 'assumption-phc', severity: 'info', message: 'Private health cover: assumed (no Medicare Levy Surcharge applied)' });
  } else {
    // Phase 5 baseline: 5 static rows preserved (regression-safe for v1.0 entities)
    const assumptionTexts: [string, string][] = [
      ['assumption-marital',        'Marital status: single (no spouse income captured)'],
      ['assumption-age',            'Age: under 65 (no Seniors and Pensioners Tax Offset applied)'],
      ['assumption-medicare-exempt','Medicare exemption: none (full 2% levy applied unless shading applies)'],
      ['assumption-phc',            'Private health cover: assumed (no Medicare Levy Surcharge applied)'],
      ['assumption-dependants',     'Dependants: zero'],
    ];
    for (const [id, message] of assumptionTexts) {
      anomalies.push({ id, severity: 'info', message });
    }
  }

  // Phase 8 — emit bad-data anomaly if spouseIncome failed parse
  if (familyBadDataAnomaly) {
    anomalies.push(familyBadDataAnomaly);
  }

  // SBI offset anomaly (e.g. ineligible message)
  if (sbOffset.anomaly) anomalies.push(sbOffset.anomaly);

  // Non-commercial loss warning
  if (p8.lessThan(0)) {
    anomalies.push({
      id: 'nc-loss-rule',
      severity: 'warn',
      message: 'Business loss detected. Non-commercial losses (Div 35) may restrict offset against other income — review with your tax agent.',
    });
  }

  // Locked FY
  const locked = (entity.lockedFys ?? []).includes(fy);
  if (locked) {
    anomalies.push({ id: 'locked-fy', severity: 'info', message: 'Locked FY — read-only working paper.' });
  }

  // Step 6: build label map
  const makeLabel = (code: string, value: Decimal): ReturnLabel => {
    const meta = INDIVIDUAL_LABELS_FULL[code as IndividualLabel];
    return {
      code,
      value: value.toDecimalPlaces(2),
      plainEnglish: meta?.plainEnglish ?? code,
      natReference: meta?.natReference,
    };
  };

  return {
    labels: {
      P1:      makeLabel('P1', p1),
      P2:      makeLabel('P2', p2),
      P8:      makeLabel('P8', p8),
      item15:  makeLabel('item15', item15),
      N:       makeLabel('N', p8),       // B&P sub-label N = net income (mirrors P8)
      '6S':    makeLabel('6S', get('6S')),
      '6K':    makeLabel('6K', get('6K')),
      '6L':    makeLabel('6L', get('6L')),
      '6N':    makeLabel('6N', get('6N')),
      '6Q':    makeLabel('6Q', get('6Q')),
      B:       makeLabel('B', get('B')),
      C:       makeLabel('C', get('C')),
      E:       makeLabel('E', get('E')),
      F:       makeLabel('F', get('F')),
      G:       makeLabel('G', get('G')),
      H:       makeLabel('H', get('H')),
      I:       makeLabel('I', get('I')),
      J:       makeLabel('J', get('J')),
      K:       makeLabel('K', get('K')),
      L:       makeLabel('L', get('L')),
      M1:      makeLabel('M1', medicare.levy),
      M2:      makeLabel('M2', medicare.surcharge),
      T1:      makeLabel('T1', lito),
      item7D:  makeLabel('item7D', sbOffset.offset),
    } as IndividualReturnLabels,
    meta: {
      fy,
      entityType: 'Individual',
      natReference: 'NAT 2541 + NAT 2543',
      locked,
      anomalies,
      taxBeforeOffsets,
      taxAfterOffsets,
      sbOffsetBasis: sbOffset.basis,
      medicareBasis: medicare.basis,
      aggregatedTurnover: aggregatedTurnover.toFixed(2),
    },
  };
}
