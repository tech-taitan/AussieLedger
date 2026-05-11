/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';
// Phase 3 Plan 03-2 will implement `LocalAdapter` and these tests will go GREEN.
// import { LocalAdapter } from '../local';

describe('LocalAdapter (IndexedDB)', () => {
  it.todo('data survives reopen (FND-01 IDB persistence)');
  it.todo('empty initial state returns DEFAULT_ENTITIES via hook, not from adapter');
  it.todo('saveEntities then getEntities returns identical array');
  it.todo('saveEntries with multi-entity map preserves keys');
  it.todo('appendAuditLog prepends to existing logs');
  it.todo('saveAuditLogs replaces whole audit log collection');
  it.todo('importAll replaces all collections atomically');
  it.todo('exportAll returns PersistedRoot with _v = CURRENT_VERSION');
  it.todo('ready() resolves after init completes');
  it.todo('ready() is idempotent (resolves the same promise on repeat calls)');
});
