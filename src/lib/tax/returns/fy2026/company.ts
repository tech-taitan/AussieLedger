/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Decimal } from '../../../money';
import type { Account, Entity, JournalEntry } from '../../../../types';
import type { FyLabel } from '../../../period';
import type { ComputedReturn, CompanyReturnLabels } from './types';

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
 * Phase 5 Wave 0: signature only — empty body returning typed-empty result.
 * Plan 05-2 implements full Form C + BRE rate derivation + franking account.
 *
 * Post-05-2 behaviour:
 *  - Roll up Revenue + Expense accounts by companyTaxLabel into 6A/6B/6D/6E/6F/6G/6H/6T labels
 *  - Derive total income (6T) and total expenses (6S)
 *  - Derive taxable income (7T = 6T − 6S)
 *  - Run breTestFY2026 to derive company tax rate (25%/30%)
 *  - Compute franking account: CS_A (opening) + CS_B (credits) − CS_J (debits) = CS_S (closing)
 *  - Emit LOCKED FY anomaly if entity.lockedFys includes fy
 *  - Emit BRE borderline anomaly if passivePct in [70%, 90%]
 */
export function computeCompanyReturn(_input: ComputeCompanyInput): CompanyReturn {
  // TODO Phase 5 Plan 05-2: implement full Form C + BRE logic
  void new Decimal(0);
  return {
    labels: {} as CompanyReturnLabels,
    meta: {
      fy: _input.fy,
      entityType: 'Company',
      natReference: 'NAT 0656',
      locked: (_input.entity.lockedFys ?? []).includes(_input.fy),
      anomalies: [],
    },
  };
}
