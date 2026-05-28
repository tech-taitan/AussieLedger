/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Decimal } from '../../../money';
import type { Account, Entity, JournalEntry } from '../../../../types';
import type { FyLabel } from '../../../period';
import type { ComputedReturn, BasReturnLabels } from './types';

export type BasReturn = ComputedReturn<BasReturnLabels> & {
  meta: {
    fy: string;
    entityType: 'Individual' | 'Company' | 'Trust' | 'Partnership';
    natReference: string;
    locked: boolean;
    anomalies: import('./types').Anomaly[];
    /** 'BAS' for GST-registered entities; 'IAS' for PAYG-only entities. */
    shape: 'BAS' | 'IAS';
    [extra: string]: unknown;
  };
};

export interface ComputeBasInput {
  entity: Entity;
  accounts: Account[];
  entries: JournalEntry[];
  fy: FyLabel;
  /** BAS quarter (1–4), or 'annual'. Passed to Period filter. */
  quarter?: 1 | 2 | 3 | 4 | 'annual';
}

/**
 * Compute Business Activity Statement (BAS) or Instalment Activity Statement (IAS).
 *
 * Dispatches based on entity.gstRegistered:
 *   - true  → returns full BAS (G1/G2/G3/G10/G11/1A/1B/W1/W2/W3/W4/W5/T7)
 *   - false → returns IAS only (W1/W2/W3/W4/W5/T7; GST labels suppressed)
 *
 * Phase 5 Wave 0: signature only — empty body returning typed-empty result.
 * Plan 05-4 implements full BAS + IAS compute logic including GST decimal rounding.
 *
 * Post-05-4 behaviour:
 *  - Filter entries to quarter period via quarterBoundaries + isInPeriod
 *  - Sum G1 (total GST-inclusive sales); derive 1A = G1 × (1/11) per-line rounded
 *  - Sum G10 + G11 (capital + non-capital purchases); derive 1B
 *  - Sum W1 (wages); read W2 from PAYG-withholding accounts
 *  - Add T7 from entity.paygInstalmentAmount (option-1 method)
 *  - Emit GST-rounding anomaly if per-line sum differs from aggregate
 *  - Emit LOCKED FY anomaly if entity.lockedFys includes fy
 */
export function computeBas(_input: ComputeBasInput): BasReturn {
  // TODO Phase 5 Plan 05-4: implement full BAS + IAS logic
  void new Decimal(0);
  const entityType = (_input.entity.type as string) as 'Individual' | 'Company' | 'Trust' | 'Partnership';
  return {
    labels: {} as BasReturnLabels,
    meta: {
      fy: _input.fy,
      entityType,
      natReference: 'NAT 7392',
      locked: (_input.entity.lockedFys ?? []).includes(_input.fy),
      anomalies: [],
      shape: _input.entity.gstRegistered ? 'BAS' : 'IAS',
    },
  };
}
