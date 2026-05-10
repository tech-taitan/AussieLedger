/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Entity, JournalEntry, AuditLog, Account } from './types';
import { useAuditLog } from './hooks/useAuditLog';
import { useAccounts } from './hooks/useAccounts';
import { useJournals } from './hooks/useJournals';
import { useEntities } from './hooks/useEntities';
import { migrate, CURRENT_VERSION } from './lib/migrations';
import { MainLayout } from './components/shell/MainLayout';
import { ViewRouter } from './components/ViewRouter';
import { MigrationError } from './components/MigrationError';
import type { View } from './types';

export default function App() {
  const [view, setView] = useState<View>('master-dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNewJournal, setShowNewJournal] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  // Hooks own state slices; addLog flows downward (no context provider).
  const { auditLogs, addLog } = useAuditLog();
  const { accounts, updateAccount, saveAll } = useAccounts(addLog);
  const {
    entities,
    selectedEntityIds,
    activeEntityId,
    setActiveEntityId,
    setEntities,
    createEntity,
    updateEntity,
    archiveEntity,
    deactivateEntity,
    deleteEntity,
    toggleSelection,
    clearSelection,
  } = useEntities(addLog);
  const journalsHook = useJournals(addLog, activeEntityId);

  // One-shot schema migration on mount. Reads localStorage, runs migrate(),
  // and writes back the upgraded shape ONLY when an actual upgrade occurred —
  // saveAll/setEntities emit audit-log entries; firing them on every cold start
  // would flood the log.
  useEffect(() => {
    try {
      const tryParse = <T,>(key: string): T | undefined => {
        const raw = localStorage.getItem(key);
        if (!raw) return undefined;
        try {
          return JSON.parse(raw) as T;
        } catch (e) {
          console.error(`Failed to parse "${key}"`, e);
          return undefined;
        }
      };

      const syntheticRoot: Record<string, unknown> = {};
      const parsedEntities = tryParse<Entity[]>('ledger_entities_list');
      if (parsedEntities) syntheticRoot.entities = parsedEntities;
      const parsedAll = tryParse<Record<string, JournalEntry[]>>('ledger_all_entries');
      if (parsedAll) syntheticRoot.allEntries = parsedAll;
      const parsedLogs = tryParse<AuditLog[]>('ledger_audit_logs');
      if (parsedLogs) syntheticRoot.auditLogs = parsedLogs;
      const parsedAccounts = tryParse<Account[]>('ledger_chart_of_accounts');
      if (parsedAccounts) syntheticRoot.accounts = parsedAccounts;
      const storedSchemaStr = localStorage.getItem('ledger_schema_version');
      if (storedSchemaStr) syntheticRoot._v = Number(storedSchemaStr);

      const storedVersion = (() => {
        try {
          const stamp = localStorage.getItem('ledger_state_version');
          return stamp ? Number(JSON.parse(stamp)) : 0;
        } catch {
          return 0;
        }
      })();

      const migrated = migrate(syntheticRoot);

      if (migrated._v > storedVersion) {
        // Migration upgraded the data — persist the upgraded shape and seed hooks.
        // saveAll() emits an audit-log entry; INTENDED here because this is an
        // actual upgrade event.
        if (migrated.accounts) {
          localStorage.setItem(
            'ledger_chart_of_accounts',
            JSON.stringify(migrated.accounts),
          );
          saveAll(migrated.accounts as Account[]);
        }
        if (migrated.entities) {
          localStorage.setItem(
            'ledger_entities_list',
            JSON.stringify(migrated.entities),
          );
          setEntities(migrated.entities as Entity[]);
        }
        localStorage.setItem(
          'ledger_state_version',
          JSON.stringify(migrated._v),
        );
      }
      localStorage.setItem('ledger_schema_version', String(CURRENT_VERSION));
    } catch (err) {
      setMigrationError(
        err instanceof Error ? err.message : 'Unknown migration error',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close sidebar on view change (mobile).
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [view]);

  if (migrationError) return <MigrationError message={migrationError} />;

  return (
    <MainLayout
      view={view}
      setView={setView}
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
      activeEntityId={activeEntityId}
      setActiveEntityId={setActiveEntityId}
      entities={entities}
      setShowNewJournal={setShowNewJournal}
    >
      <ViewRouter
        view={view}
        setView={setView}
        showNewJournal={showNewJournal}
        setShowNewJournal={setShowNewJournal}
        accounts={accounts}
        entities={entities}
        activeEntityId={activeEntityId}
        setActiveEntityId={setActiveEntityId}
        selectedEntityIds={selectedEntityIds}
        auditLogs={auditLogs}
        journals={journalsHook}
        entityActions={{
          createEntity,
          updateEntity,
          archiveEntity,
          deactivateEntity,
          deleteEntity,
          toggleSelection,
          clearSelection,
        }}
        onSaveCOA={(updated) => {
          saveAll(updated);
          setView('master-dashboard');
        }}
        onUpdateAccount={updateAccount}
      />
    </MainLayout>
  );
}
