/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Decimal } from '../../../money';
import type { Account, Entity, JournalEntry, PartnerRow } from '../../../../types';
import type { FyLabel } from '../../../period';
import type { ComputedReturn, PartnershipReturnLabels } from './types';

export type PartnershipReturn = ComputedReturn<PartnershipReturnLabels>;

export interface ComputePartnershipInput {
  entity: Entity;
  accounts: Account[];
  entries: JournalEntry[];
  fy: FyLabel;
}

export interface PartnerDistributionRow {
  partner: PartnerRow;
  shareAmount: Decimal;
}

/**
 * Compute Partnership tax return (NAT 0659).
 *
 * Phase 5 Wave 0: signature only — empty body returning typed-empty result.
 * Plan 05-3 implements full Form P + per-partner distribution logic.
 *
 * Post-05-3 behaviour:
 *  - Roll up Revenue + Expense accounts by partnershipTaxLabel into P1/P2/P8
 *  - Derive net income = P8 (P1 − P2)
 *  - Distribute per entity.partners (sharePercent); check totals 100% ± 0.005%
 *  - Handle P8 < 0 (loss): surface "Loss share" warning per partner
 *  - Emit LOCKED FY anomaly if entity.lockedFys includes fy
 */
export function computePartnershipReturn(_input: ComputePartnershipInput): PartnershipReturn {
  // TODO Phase 5 Plan 05-3: implement full Form P + per-partner distribution
  void new Decimal(0);
  return {
    labels: {} as PartnershipReturnLabels,
    meta: {
      fy: _input.fy,
      entityType: 'Partnership',
      natReference: 'NAT 0659',
      locked: (_input.entity.lockedFys ?? []).includes(_input.fy),
      anomalies: [],
    },
  };
}
