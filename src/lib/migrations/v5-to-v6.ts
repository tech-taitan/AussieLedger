/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Migration v5 → v6 (additive only — Phase 8).
 *
 * Adds two optional Entity fields (Individual-only semantics, but stored on all entity types):
 *   - dependants?: number       — dependant-child count for Medicare family threshold (MED-01)
 *   - spouseIncome?: string     — decimal string; spouse's taxable income for FY (MED-01)
 *
 * Both default to undefined. Non-destructive: every existing field preserved.
 */

import type { Entity } from '../../types.js';
import type { PersistedRoot } from './index.js';

export function migrateV5ToV6(state: PersistedRoot): PersistedRoot {
  if (state._v >= 6) return state;

  const entities = ((state.entities as Entity[] | undefined) ?? []).map((e): Entity => ({
    ...e,
    // Both optional; absent = single-person Medicare thresholds applied (MED-04 default-undefined preservation)
    dependants: (e as Entity & { dependants?: number }).dependants,
    spouseIncome: (e as Entity & { spouseIncome?: string }).spouseIncome,
  }));

  return { ...state, _v: 6, entities };
}
