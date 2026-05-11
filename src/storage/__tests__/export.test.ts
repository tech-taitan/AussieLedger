/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';
// Phase 3 Plan 03-2 will implement exportAll() on LocalAdapter.

describe('Export shape (FND-02 JSON)', () => {
  it.todo('returns { _v: 2, entities, accounts, allEntries, auditLogs }');
  it.todo('_v matches CURRENT_VERSION from src/lib/migrations');
  it.todo('allEntries is keyed by entity id');
  it.todo('empty collections serialise as empty arrays / empty object');
});
