/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Migration v3 → v4 (additive only — see Phase 5 CONTEXT.md Wave 0).
 *
 * Adds two optional Entity fields:
 *   - aggregatedTurnover?: string  (decimal string for BRE + small-biz offset)
 *   - paygInstalmentAmount?: string (decimal string for BAS T7)
 *
 * Both default to undefined (i.e. absent). Migration is non-destructive:
 * every existing field is preserved verbatim.
 */

import type { Entity } from '../../types.js';
import type { PersistedRoot } from './index.js';

export function migrateV3ToV4(state: PersistedRoot): PersistedRoot {
  if (state._v >= 4) return state;

  const entities = ((state.entities as Entity[] | undefined) ?? []).map((e): Entity => ({
    ...e,
    // Both new fields default to undefined — explicit for round-trip clarity
    aggregatedTurnover: (e as Entity & { aggregatedTurnover?: string }).aggregatedTurnover,
    paygInstalmentAmount: (e as Entity & { paygInstalmentAmount?: string }).paygInstalmentAmount,
  }));

  return {
    ...state,
    _v: 4,
    entities,
  };
}
