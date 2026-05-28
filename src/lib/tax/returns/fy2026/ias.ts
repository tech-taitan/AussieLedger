/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Decimal } from '../../../money';
import type { Account, Entity, JournalEntry } from '../../../../types';
import type { FyLabel } from '../../../period';
import type { ComputedReturn, IasReturnLabels } from './types';

export type IasReturn = ComputedReturn<IasReturnLabels>;

export interface ComputeIasInput {
  entity: Entity;
  accounts: Account[];
  entries: JournalEntry[];
  fy: FyLabel;
  quarter?: 1 | 2 | 3 | 4 | 'annual';
}

/**
 * Compute Instalment Activity Statement (IAS) for PAYG-only entities.
 *
 * IAS is for entities that are NOT GST-registered. It covers only:
 *   W1 (total wages), W2 (PAYG withholding), W3/W4/W5 (other withholding), T7 (instalment).
 *
 * Phase 5 Wave 0: signature only — empty body returning typed-empty result.
 * Plan 05-4 implements full IAS compute logic (shared code path with computeBas).
 *
 * Note: In Plan 05-4, computeBas() dispatches internally to this same logic
 * when entity.gstRegistered === false. This standalone export is provided for
 * callers that specifically know they need IAS only.
 */
export function computeIas(_input: ComputeIasInput): IasReturn {
  // TODO Phase 5 Plan 05-4: implement IAS logic (shared code path with computeBas)
  void new Decimal(0);
  const entityType = (_input.entity.type as string) as 'Individual' | 'Company' | 'Trust' | 'Partnership';
  return {
    labels: {} as IasReturnLabels,
    meta: {
      fy: _input.fy,
      entityType,
      natReference: 'NAT 4159 (IAS)',
      locked: (_input.entity.lockedFys ?? []).includes(_input.fy),
      anomalies: [],
    },
  };
}
