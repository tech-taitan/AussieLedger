/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
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

  // Phase 9 UX-06 — anomaly badge deep-link state
  const [scrollToJournalIdx, setScrollToJournalIdx] = useState<number | undefined>(undefined);
  const [scrollToAccountIdx, setScrollToAccountIdx] = useState<number | undefined>(undefined);
  const [filterUnbalanced, setFilterUnbalanced] = useState(false);
  const [filterMissingMappings, setFilterMissingMappings] = useState(false);

  const handleAnomalyScroll = useCallback((target: 'journals' | 'accounts', cycleIdx: number) => {
    if (target === 'journals') {
      setFilterUnbalanced(true);
      setScrollToJournalIdx(cycleIdx);
    } else {
      setFilterMissingMappings(true);
      setScrollToAccountIdx(cycleIdx);
    }
  }, []);

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
      onAnomalyScroll={handleAnomalyScroll}
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
        scrollToJournalIdx={scrollToJournalIdx}
        scrollToAccountIdx={scrollToAccountIdx}
        filterUnbalanced={filterUnbalanced}
        filterMissingMappings={filterMissingMappings}
        onClearJournalFilter={() => { setFilterUnbalanced(false); setScrollToJournalIdx(undefined); }}
        onClearAccountFilter={() => { setFilterMissingMappings(false); setScrollToAccountIdx(undefined); }}
      />
    </MainLayout>
  );
}
