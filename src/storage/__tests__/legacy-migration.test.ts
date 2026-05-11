/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';
// Phase 3 Plan 03-2 will implement legacy migration as part of LocalAdapter init.

describe('localStorage → IndexedDB legacy migration', () => {
  it.todo('reads ledger_entities_list, ledger_all_entries, ledger_chart_of_accounts, ledger_audit_logs');
  it.todo('runs assembled blob through migrate() ladder');
  it.todo('writes migrated state to IndexedDB');
  it.todo('clears the four legacy keys ONLY after writes succeed');
  it.todo('preserves on failure: parse error leaves localStorage untouched and surfaces MigrationError');
  it.todo('no-op when IndexedDB already populated');
  it.todo('uses navigator.locks.request when available');
});
