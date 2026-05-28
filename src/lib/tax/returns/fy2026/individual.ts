/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Decimal } from '../../../money';
import type { Account, Entity, JournalEntry } from '../../../../types';
import type { FyLabel } from '../../../period';
import type { ComputedReturn, IndividualReturnLabels } from './types';

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
 * Phase 5 Wave 0: signature only — empty body returning typed-empty result.
 * Plan 05-2 implements full Form I + B&P rollup + LITO + Medicare + IND-04 small-biz offset.
 *
 * Post-05-2 behaviour:
 *  - Roll up Revenue + Expense accounts by taxLabel into P1/P2/P8 + B&P sub-labels
 *  - item15 = P8 (flow-through to main return)
 *  - Compute marginalTaxFY2026(item15) → marginal tax
 *  - Apply litoFY2026 → T1
 *  - Apply medicareLevyFY2026 → M1 + M2
 *  - Apply smallBusinessIncomeOffset if eligible → item7D
 *  - Emit "Assumptions used" anomaly (info severity) listing 5 assumed values
 *  - Emit "LOCKED FY" anomaly (info) if entity.lockedFys includes fy
 */
export function computeIndividualReturn(_input: ComputeIndividualInput): IndividualReturn {
  // TODO Phase 5 Plan 05-2: implement full Form I + B&P logic
  void new Decimal(0); // keeps Decimal import referenced
  return {
    labels: {} as IndividualReturnLabels,
    meta: {
      fy: _input.fy,
      entityType: 'Individual',
      natReference: 'NAT 2541 + NAT 2543',
      locked: (_input.entity.lockedFys ?? []).includes(_input.fy),
      anomalies: [],
    },
  };
}
