/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useAuditLog } from './hooks/useAuditLog';
import { useAccounts } from './hooks/useAccounts';
import { useJournals } from './hooks/useJournals';
import { useEntities } from './hooks/useEntities';
import { useSettings } from './lib/persona';
import { MainLayout } from './components/shell/MainLayout';
import { ViewRouter } from './components/ViewRouter';
import type { View } from './types';

export default function App() {
  const [view, setView] = useState<View>('master-dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNewJournal, setShowNewJournal] = useState(false);

  // Hooks own state slices; addLog flows downward (no context provider).
  // Adapter init happens in main.tsx before render; legacy localStorage
  // migration is handled inside LocalAdapter.init() — App.tsx no longer
  // owns a synchronous migration useEffect.
  const { auditLogs, addLog } = useAuditLog();
  const { settings, setSettings, clearSettings } = useSettings();
  const { accounts, updateAccount, saveAll } = useAccounts(addLog);
  const {
    entities,
    selectedEntityIds,
    activeEntityId,
    setActiveEntityId,
    createEntity,
    updateEntity,
    archiveEntity,
    deactivateEntity,
    deleteEntity,
    toggleSelection,
    clearSelection,
  } = useEntities(addLog);
  const journalsHook = useJournals(addLog, activeEntityId);

  // Close sidebar on view change (mobile).
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [view]);

  return (
    <MainLayout
      view={view}
      setView={setView}
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
      activeEntityId={activeEntityId}
      setActiveEntityId={setActiveEntityId}
      entities={entities}
      accounts={accounts}
      allEntries={journalsHook.allEntries}
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
        settings={settings}
        setSettings={setSettings}
        clearSettings={clearSettings}
        addLog={(action, details, entityId) => addLog(action, details, entityId)}
      />
    </MainLayout>
  );
}
