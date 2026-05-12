/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Migration v2 → v3 (additive only — see Phase 4 CONTEXT.md decisions).
 *
 * Changes in _v:3:
 *   Account:        parentCode (default null), isDefault (default false), isArchived (default false)
 *   JournalEntry:   status (default from isPosted), reversesEntryId, replacesEntryId,
 *                    replacedByEntryId, importFingerprint
 *   Entity:         gstRegistered (default false), accountingMethod (default 'accruals'),
 *                    fyEndDate (default '06-30'), lockedFys (default []),
 *                    beneficiaries / partners stay undefined (Plan 04-3 fills them via UI)
 *   AuditLog.action: widened enum (see src/types.ts AuditAction) — older actions remain valid
 *
 * Idempotent: returns state unchanged if _v >= 3.
 */

import type { Account, JournalEntry, Entity } from '../../types.js';
import type { PersistedRoot } from './index.js';

export function migrateV2ToV3(state: PersistedRoot): PersistedRoot {
  if (state._v >= 3) return state;

  const accounts = ((state.accounts as Account[] | undefined) ?? []).map((a): Account => ({
    ...a,
    parentCode: a.parentCode ?? null,
    isDefault: a.isDefault ?? false,
    isArchived: a.isArchived ?? false,
  }));

  const allEntriesRaw = (state.allEntries as Record<string, JournalEntry[]> | undefined) ?? {};
  const allEntries: Record<string, JournalEntry[]> = {};
  for (const [entityId, entries] of Object.entries(allEntriesRaw)) {
    allEntries[entityId] = entries.map((e): JournalEntry => ({
      ...e,
      status: e.status ?? (e.isPosted ? 'posted' : 'draft'),
    }));
  }

  const entities = ((state.entities as Entity[] | undefined) ?? []).map((e): Entity => ({
    ...e,
    gstRegistered: e.gstRegistered ?? false,
    accountingMethod: e.accountingMethod ?? 'accruals',
    fyEndDate: e.fyEndDate ?? '06-30',
    lockedFys: e.lockedFys ?? [],
  }));

  return {
    ...state,
    _v: 3,
    accounts,
    allEntries,
    entities,
  };
}
