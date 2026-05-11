/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { migrateV1ToV2 } from './v1-to-v2.js';

/**
 * Root shape of all persisted state. The `_v` field is the schema version.
 * Phase 1 registered the 0 → 1 identity migration; Phase 2 adds 1 → 2 which
 * populates per-entity-type tax labels (specifically partnershipTaxLabel) on
 * existing accounts via name inference and flags unmappable accounts with
 * _needsReview.
 */
export interface PersistedRoot {
  _v: number;
  entities?: unknown;
  allEntries?: unknown;
  auditLogs?: unknown;
  accounts?: unknown;
}

type MigrationFn = (state: PersistedRoot) => PersistedRoot;

/**
 * Registry: maps version N to the function that upgrades state from N to N+1.
 * Add a new entry here when a new schema version ships.
 */
const MIGRATIONS: Record<number, MigrationFn> = {
  // 0 → 1: identity. Existing prototype data is shape-compatible with v1;
  // we just stamp the new version field.
  0: (state) => ({ ...state, _v: 1 }),
  // 1 → 2: populate per-entity-type tax labels on accounts (Phase 2).
  1: migrateV1ToV2,
};

export const CURRENT_VERSION = 2;

/**
 * Run all pending migrations on the given state.
 * Treats missing `_v` as version 0 (pre-versioning prototype data).
 * Throws if a registered migration throws or no migration is registered for the current version.
 *
 * @param raw - Parsed JSON object (may lack `_v`)
 */
export function migrate(raw: Record<string, unknown>): PersistedRoot {
  let state = { ...raw, _v: (raw._v as number) ?? 0 } as PersistedRoot;

  while (state._v < CURRENT_VERSION) {
    const migrationFn = MIGRATIONS[state._v];
    if (!migrationFn) {
      throw new Error(
        `No migration registered for version ${state._v}. Cannot upgrade to version ${CURRENT_VERSION}.`,
      );
    }
    state = migrationFn(state);
  }

  if (state._v > CURRENT_VERSION) {
    throw new Error(
      `Persisted data version ${state._v} is newer than the application version ${CURRENT_VERSION}. Refusing to downgrade.`,
    );
  }

  return state;
}
