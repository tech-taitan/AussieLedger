/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * One-time, automatic, transparent localStorage -> IndexedDB migration.
 * Reads 4 legacy keys, runs through migrate() (v0->v1->v2 ladder), writes to
 * IDB, and clears the legacy keys ONLY after writes succeed.
 *
 * Failure path: parse errors re-throw so main.tsx renders <MigrationError />.
 * Legacy keys are NEVER cleared on the failure path — original data is
 * preserved untouched (per CONTEXT.md "If any step throws, leave localStorage
 * untouched and surface MigrationError").
 */
import { migrate, type PersistedRoot } from '../lib/migrations';
import type { LocalAdapter } from './local';

const LEGACY_KEYS = [
  'ledger_entities_list',
  'ledger_all_entries',
  'ledger_chart_of_accounts',
  'ledger_audit_logs',
] as const;

export async function migrateLegacyLocalStorage(adapter: LocalAdapter): Promise<void> {
  if (typeof localStorage === 'undefined') return;

  const raw: Record<string, string | null> = {
    ledger_entities_list: localStorage.getItem('ledger_entities_list'),
    ledger_all_entries: localStorage.getItem('ledger_all_entries'),
    ledger_chart_of_accounts: localStorage.getItem('ledger_chart_of_accounts'),
    ledger_audit_logs: localStorage.getItem('ledger_audit_logs'),
  };

  const anyExist = Object.values(raw).some((v) => v !== null);
  if (!anyExist) return;

  const existing = await adapter.getEntities();
  if (existing.length > 0) {
    // Already migrated previously; defensively clear legacy keys.
    for (const k of LEGACY_KEYS) localStorage.removeItem(k);
    return;
  }

  const assembled: Record<string, unknown> = { _v: 0 };
  try {
    if (raw.ledger_entities_list) {
      assembled.entities = JSON.parse(raw.ledger_entities_list);
    }
    if (raw.ledger_all_entries) {
      assembled.allEntries = JSON.parse(raw.ledger_all_entries);
    }
    if (raw.ledger_chart_of_accounts) {
      assembled.accounts = JSON.parse(raw.ledger_chart_of_accounts);
    }
    if (raw.ledger_audit_logs) {
      assembled.auditLogs = JSON.parse(raw.ledger_audit_logs);
    }
    const stamp = localStorage.getItem('ledger_schema_version');
    if (stamp) assembled._v = Number(stamp);
  } catch (err) {
    // PRESERVE localStorage on parse error - re-throw for MigrationError gate.
    throw new Error(
      `Legacy localStorage parse failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const migrated: PersistedRoot = migrate(assembled);
  await adapter.importAll(migrated);

  // Writes succeeded — clear the four legacy keys.
  for (const k of LEGACY_KEYS) localStorage.removeItem(k);
}
