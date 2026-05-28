/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Decimal } from '../../../money';
import type { Account, BeneficiaryRow, Entity, JournalEntry } from '../../../../types';
import type { FyLabel } from '../../../period';
import type { ComputedReturn, TrustReturnLabels } from './types';

export type TrustReturn = ComputedReturn<TrustReturnLabels>;

export interface ComputeTrustInput {
  entity: Entity;
  accounts: Account[];
  entries: JournalEntry[];
  fy: FyLabel;
}

export interface TrustDistributionRow {
  beneficiary: BeneficiaryRow;
  shareAmount: Decimal;
  ordinary: Decimal;
  interest: Decimal;
  dividend: Decimal;
  capitalGain: Decimal;
  foreign: Decimal;
  other: Decimal;
}

/**
 * Compute Trust tax return (NAT 0660).
 *
 * Phase 5 Wave 0: signature only — empty body returning typed-empty result.
 * Plan 05-3 implements full Form T + per-beneficiary distribution logic.
 *
 * Post-05-3 behaviour:
 *  - Roll up Revenue + Expense accounts by trustTaxLabel into 5B/11J/5T/5E/5F/5L/5M/5N/5S/26
 *  - Compute net income = item 26 (5T − 5S)
 *  - Distribute net income per entity.beneficiaries (sharePercent or sharePerType)
 *  - Check share totals sum to 100% ± 0.005%; emit anomaly if not
 *  - Emit streaming disclaimer anomaly (info) always
 *  - Emit LOCKED FY anomaly if entity.lockedFys includes fy
 */
export function computeTrustReturn(_input: ComputeTrustInput): TrustReturn {
  // TODO Phase 5 Plan 05-3: implement full Form T + per-beneficiary distribution
  void new Decimal(0);
  return {
    labels: {} as TrustReturnLabels,
    meta: {
      fy: _input.fy,
      entityType: 'Trust',
      natReference: 'NAT 0660',
      locked: (_input.entity.lockedFys ?? []).includes(_input.fy),
      anomalies: [],
    },
  };
}

/**
 * Distribute trust net income to beneficiaries.
 *
 * Phase 5 Wave 0: signature only — empty body.
 * Plan 05-3 implements full streaming distribution logic (Subdiv 115-C / 207-B aware).
 */
export function distributeTrustIncome(
  _netIncome: Decimal,
  _beneficiaries: BeneficiaryRow[],
  _incomeBreakdown?: Partial<Record<'interest' | 'dividend' | 'capitalGain' | 'foreign' | 'other', Decimal>>,
): TrustDistributionRow[] {
  // TODO Phase 5 Plan 05-3: implement streaming distribution
  return [];
}
