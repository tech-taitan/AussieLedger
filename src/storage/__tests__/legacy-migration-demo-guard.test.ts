/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 15 POL-CODE-02 — legacy-migration demo-DB guard tests.
 *
 * Locks the v1.2-audit-AMBER #2 fix: `migrateLegacyLocalStorage(adapter)` MUST
 * early-return when `adapter.getDbName() === DB_NAME_DEMO`. Without the guard,
 * a pre-Phase-11 user who lands on /demo BEFORE / has their legacy localStorage
 * migrated INTO the demo DB and the 4 legacy keys cleared, leaving the
 * production DB empty on their subsequent / visit. The guard is single source
 * of truth — no caller-side check.
 *
 * Test 1 (demo skips migration):
 *   Pre-populate 4 legacy localStorage keys → `new LocalAdapter(DB_NAME_DEMO)`
 *   → demo DB stays empty AND all 4 legacy keys still present in localStorage.
 *
 * Test 2 (prod still migrates — regression guard):
 *   Pre-populate 4 legacy localStorage keys with 1 entity → `new LocalAdapter(
 *   DB_NAME_PROD)` → prod DB has migrated entity AND all 4 legacy keys cleared
 *   (Phase 11 contract preserved; guard does NOT fire on the prod path).
 *
 * fake-indexeddb persists databases across tests within a vitest file by
 * default, so `beforeEach` MUST delete both prod + demo IDB databases as well
 * as clear localStorage. The deleteDatabase Promise wrapper resolves on
 * success / error / blocked uniformly so a stuck blocked-state never wedges
 * the suite.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalAdapter, DB_NAME_PROD, DB_NAME_DEMO } from '../local';

function deleteDb(name: string): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  localStorage.clear();
  await deleteDb(DB_NAME_PROD);
  await deleteDb(DB_NAME_DEMO);
});

describe('Phase 15 POL-CODE-02 — legacy-migration demo-DB guard', () => {
  it('demo adapter skips legacy migration: demo DB stays empty AND legacy keys preserved', async () => {
    const legacyEntities = [
      { _v: 1, id: 'e-legacy', name: 'Legacy Co', type: 'Company', status: 'Active' },
    ];
    localStorage.setItem('ledger_entities_list', JSON.stringify(legacyEntities));
    localStorage.setItem('ledger_all_entries', JSON.stringify({}));
    localStorage.setItem('ledger_chart_of_accounts', JSON.stringify([]));
    localStorage.setItem('ledger_audit_logs', JSON.stringify([]));

    const demo = new LocalAdapter(DB_NAME_DEMO);
    await demo.ready();

    // Demo DB MUST be empty — guard fired, no migration ran.
    expect(await demo.getEntities()).toHaveLength(0);

    // All 4 legacy keys MUST still be present — guard did not clear.
    expect(localStorage.getItem('ledger_entities_list')).not.toBeNull();
    expect(localStorage.getItem('ledger_all_entries')).not.toBeNull();
    expect(localStorage.getItem('ledger_chart_of_accounts')).not.toBeNull();
    expect(localStorage.getItem('ledger_audit_logs')).not.toBeNull();

    // Verify the entities payload is byte-identical to what we wrote.
    expect(localStorage.getItem('ledger_entities_list')).toBe(
      JSON.stringify(legacyEntities),
    );
  });

  it('prod adapter still migrates (regression guard): entity migrated AND legacy keys cleared', async () => {
    const legacyEntities = [
      { _v: 1, id: 'e-prod', name: 'Prod Co', type: 'Company', status: 'Active' },
    ];
    localStorage.setItem('ledger_entities_list', JSON.stringify(legacyEntities));
    localStorage.setItem('ledger_all_entries', JSON.stringify({}));
    localStorage.setItem('ledger_chart_of_accounts', JSON.stringify([]));
    localStorage.setItem('ledger_audit_logs', JSON.stringify([]));

    const prod = new LocalAdapter(DB_NAME_PROD);
    await prod.ready();

    // Prod DB MUST have the migrated entity — guard did NOT fire on prod path.
    const loaded = await prod.getEntities();
    expect(loaded.length).toBeGreaterThanOrEqual(1);
    expect(loaded[0].name).toBe('Prod Co');

    // All 4 legacy keys MUST be cleared after successful migration.
    expect(localStorage.getItem('ledger_entities_list')).toBeNull();
    expect(localStorage.getItem('ledger_all_entries')).toBeNull();
    expect(localStorage.getItem('ledger_chart_of_accounts')).toBeNull();
    expect(localStorage.getItem('ledger_audit_logs')).toBeNull();
  });
});
