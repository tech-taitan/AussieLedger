/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * IAS (Instalment Activity Statement) compute function.
 * Source: NAT 4159 (IAS) FY2025-26
 *
 * Phase 5 Plan 05-4: full implementation.
 *
 * IAS is for PAYG-only entities (entity.gstRegistered === false).
 * It covers W1/W2/W3/W4/W5/T7 only — no GST labels.
 *
 * Implementation: delegates to computeBas internals and returns only the
 * PAYG labels, forcing meta.shape = 'IAS'.
 */

import { computeBas, type ComputeBasInput, type BasReturn } from './bas';
import type { ComputedReturn, IasReturnLabels } from './types';

// ── Extended return type ──────────────────────────────────────────────────

export type IasReturn = ComputedReturn<IasReturnLabels> & {
  meta: ComputedReturn<IasReturnLabels>['meta'] & {
    shape: 'IAS';
    period: BasReturn['meta']['period'];
  };
};

// Re-export input type so callers can use ComputeIasInput or ComputeBasInput interchangeably
export type ComputeIasInput = ComputeBasInput;

/**
 * Compute Instalment Activity Statement (IAS) for PAYG-only entities.
 *
 * Delegates to computeBas and returns only the PAYG subset (W1/W2/W3/W4/W5/T7).
 * GST labels (G1/G2/G3/G10/G11/1A/1B/netGst) are excluded from the returned labels.
 *
 * Callers should pass an entity with gstRegistered === false; if gstRegistered === true,
 * a 'not-gst-registered' warn anomaly will NOT be emitted (it only fires when explicitly false).
 */
export function computeIas(input: ComputeIasInput): IasReturn {
  const bas = computeBas(input);

  // Extract PAYG-only labels — drop all G* + 1A/1B/netGst
  const { W1, W2, W3, W4, W5, T7 } = bas.labels;

  return {
    labels: {
      W1, W2, W3, W4, W5, T7,
    } as IasReturnLabels,
    meta: {
      ...bas.meta,
      shape: 'IAS',
      natReference: 'NAT 4159 (IAS)',
    },
  };
}
