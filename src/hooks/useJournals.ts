/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { JournalEntry } from '../types';
import { AddLog } from './useAccounts';
import { getAdapter } from '../storage';

export interface JournalsHook {
  allEntries: Record<string, JournalEntry[]>;
  entries: JournalEntry[];
  filteredEntries: JournalEntry[];
  addEntry: (entry: JournalEntry) => void;
  importEntries: (entries: JournalEntry[]) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  dateFrom: string;
  setDateFrom: (d: string) => void;
  dateTo: string;
  setDateTo: (d: string) => void;
}

export function useJournals(
  addLog: AddLog,
  activeEntityId: string | null,
): JournalsHook {
  const [allEntries, setAllEntries] = useState<Record<string, JournalEntry[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const adapter = await getAdapter();
      const loaded = await adapter.getEntries();
      if (cancelled) return;
      if (loaded && typeof loaded === 'object' && Object.keys(loaded).length > 0) {
        setAllEntries(loaded);
      }
      setReady(true);
    })().catch((err) => {
      console.error('useJournals load failed', err);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    getAdapter()
      .then((a) => a.saveEntries(allEntries))
      .catch((err) => console.error('useJournals save failed', err));
  }, [allEntries, ready]);

  const entries = useMemo(
    () => (activeEntityId ? (allEntries[activeEntityId] ?? []) : []),
    [allEntries, activeEntityId],
  );

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        !searchQuery ||
        entry.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDateFrom = !dateFrom || entry.date >= dateFrom;
      const matchesDateTo = !dateTo || entry.date <= dateTo;
      return matchesSearch && matchesDateFrom && matchesDateTo;
    });
  }, [entries, searchQuery, dateFrom, dateTo]);

  const addEntry = useCallback(
    (entry: JournalEntry) => {
      if (!activeEntityId) return;
      setAllEntries((prev) => ({
        ...prev,
        [activeEntityId]: [entry, ...(prev[activeEntityId] ?? [])],
      }));
      addLog(
        'POST_JOURNAL',
        `Posted journal entry ${entry.reference}: ${entry.description}`,
        activeEntityId,
      );
    },
    [activeEntityId, addLog],
  );

  const importEntries = useCallback(
    (newEntries: JournalEntry[]) => {
      if (!activeEntityId) return;
      setAllEntries((prev) => ({
        ...prev,
        [activeEntityId]: [...newEntries, ...(prev[activeEntityId] ?? [])],
      }));
      addLog(
        'IMPORT_DATA',
        `Imported ${newEntries.length} journal entries via Trial Balance import`,
        activeEntityId,
      );
    },
    [activeEntityId, addLog],
  );

  return {
    allEntries,
    entries,
    filteredEntries,
    addEntry,
    importEntries,
    searchQuery,
    setSearchQuery,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  };
}
