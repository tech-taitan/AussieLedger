/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuditLog } from './hooks/useAuditLog';
import { useAccounts } from './hooks/useAccounts';
import { useJournals } from './hooks/useJournals';
import { useEntities } from './hooks/useEntities';
import { useBackupNag } from './hooks/useBackupNag';
import { useSettings } from './lib/persona';
import { MainLayout } from './components/shell/MainLayout';
import { ViewRouter } from './components/ViewRouter';
import { Toast } from './components/Toast';
import { getAdapter } from './storage';
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

  // Phase 11 IDB-03 — backup-nag hook. Fires AT MOST ONCE per App mount;
  // CONTEXT-locked. The Export-now button routes back to DataPage via setView.
  const nag = useBackupNag(() => setView('data'));

  // Phase 11 IDB-05 — derive isDirty (lastWriteAt > lastExportAt) for the
  // beforeunload + visibilitychange guard. Re-polls after each save by
  // including the state slices that change post-save in the dep list
  // (entities / journals / auditLogs / accounts). The cost is one IDB read
  // per save (cheap; matches the existing DataPage status-pane re-poll cost).
  const [isDirty, setIsDirty] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const adapter = await getAdapter();
        const maybe = adapter as unknown as {
          getLastWriteAt?: () => Promise<string | null>;
          getLastExportAt?: () => Promise<string | null>;
        };
        const lw = maybe.getLastWriteAt ? await maybe.getLastWriteAt() : null;
        const le = maybe.getLastExportAt ? await maybe.getLastExportAt() : null;
        if (cancelled) return;
        setIsDirty(!!lw && (!le || lw > le));
      } catch {
        /* ignore — defaults to not dirty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entities, journalsHook.allEntries, auditLogs, accounts]);

  // Phase 11 IDB-05 — conditional beforeunload + visibilitychange registration.
  // CRITICAL: when isDirty=false we register NOTHING (early return). This
  // keeps the page eligible for Firefox bfcache; an always-on beforeunload
  // listener (even one that returns early internally) disqualifies bfcache.
  useEffect(() => {
    if (!isDirty) return;

    const beforeHandler = (e: BeforeUnloadEvent) => {
      // Chrome 119+ requires preventDefault(); legacy fallback sets returnValue.
      e.preventDefault();
      e.returnValue = '';
    };

    // Phase 11 IDB-05 (Blocker 2 fix) — visibilitychange settle-point flush.
    // visibilitychange CANNOT fire a confirmation dialog (the "are you sure?"
    // prompt is a beforeunload-exclusive browser capability). What it CAN do:
    // on document.hidden + isDirty, kick off an IDB read against the meta
    // store. Awaiting a read forces any in-flight write transaction (e.g. a
    // sub-second-prior bumpWriteAt from a save that just completed) to settle
    // before iOS Safari may suspend the tab. Fire-and-forget pattern because
    // visibilitychange handlers cannot block. The async body swallows errors
    // so a rejected getLastWriteAt() can never bubble into an unhandled
    // promise rejection at the event-loop level. Per REQUIREMENTS.md IDB-05
    // trailing note, this is HONESTLY all visibilitychange can do.
    const visHandler = () => {
      if (document.visibilityState !== 'hidden') return;
      if (!isDirty) return;
      void (async () => {
        try {
          const adapter = await getAdapter();
          const maybe = adapter as unknown as {
            getLastWriteAt?: () => Promise<string | null>;
          };
          if (typeof maybe.getLastWriteAt === 'function') {
            await maybe.getLastWriteAt();
          }
        } catch {
          /* visibilitychange must NEVER throw */
        }
      })();
    };

    window.addEventListener('beforeunload', beforeHandler);
    document.addEventListener('visibilitychange', visHandler);
    return () => {
      window.removeEventListener('beforeunload', beforeHandler);
      document.removeEventListener('visibilitychange', visHandler);
    };
  }, [isDirty]);

  return (
    <>
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
      {nag.visible && (
        <Toast
          message={nag.message}
          tone="warn"
          duration={10000}
          onDismiss={nag.onDismiss}
          actions={
            <>
              <button
                onClick={nag.onExport}
                className="px-3 py-1 bg-white text-amber-700 text-xs font-medium rounded"
                data-testid="backup-nag-export"
              >
                Export now
              </button>
              <button
                onClick={nag.onSnooze}
                className="px-3 py-1 bg-amber-700 text-white text-xs font-medium rounded"
                data-testid="backup-nag-snooze"
              >
                Snooze 7 days
              </button>
            </>
          }
        />
      )}
    </>
  );
}
