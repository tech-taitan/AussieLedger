/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { migrateV1ToV2 } from './v1-to-v2.js';
import { migrateV2ToV3 } from './v2-to-v3.js';
import { migrateV3ToV4 } from './v3-to-v4.js';

/**
 * Root shape of all persisted state. The `_v` field is the schema version.
 * Phase 1 registered the 0 → 1 identity migration; Phase 2 adds 1 → 2 which
 * populates per-entity-type tax labels (specifically partnershipTaxLabel) on
 * existing accounts via name inference and flags unmappable accounts with
 * _needsReview. Phase 4 adds 2 → 3 which widens Account/JournalEntry/Entity/
 * AuditLog with additive defaults (see migrations/v2-to-v3.ts).
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
  // 2 → 3: additive Phase 4 widening (Account.parentCode/isDefault/isArchived,
  //         JournalEntry.status + reverses/replaces links + importFingerprint,
  //         Entity.gstRegistered/accountingMethod/fyEndDate/lockedFys,
  //         AuditLog.action enum widening).
  2: migrateV2ToV3,
  // 3 → 4: additive Phase 5 Wave 0 widening (Entity.aggregatedTurnover + paygInstalmentAmount).
  3: migrateV3ToV4,
};

export const CURRENT_VERSION = 4;

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
