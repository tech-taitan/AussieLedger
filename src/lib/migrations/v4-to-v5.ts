/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Migration v4 → v5 (additive only — Phase 6).
 *
 * Adds two optional Entity fields:
 *   - returnStatusByFy?: Record<string, 'draft' | 'finalised'>
 *   - wizardState?: Record<string, WizardStateFy>
 *
 * Both default to undefined. Non-destructive: every existing field preserved.
 */

import type { Entity, WizardStateFy } from '../../types.js';
import type { PersistedRoot } from './index.js';

export function migrateV4ToV5(state: PersistedRoot): PersistedRoot {
  if (state._v >= 5) return state;

  const entities = ((state.entities as Entity[] | undefined) ?? []).map((e): Entity => ({
    ...e,
    // Both optional; absent = no wizard state or return status set
    returnStatusByFy: (e as Entity & { returnStatusByFy?: Record<string, 'draft' | 'finalised'> }).returnStatusByFy,
    wizardState: (e as Entity & { wizardState?: Record<string, WizardStateFy> }).wizardState,
  }));

  return { ...state, _v: 5, entities };
}
