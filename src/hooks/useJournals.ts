/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { JournalEntry } from '../types';
import { AddLog } from './useAccounts';

const STORAGE_KEY = 'ledger_all_entries';
const LEGACY_KEY = 'ledger_entries';

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

export function useJournals(addLog: AddLog, activeEntityId: string | null): JournalsHook {
  const [allEntries, setAllEntries] = useState<Record<string, JournalEntry[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, JournalEntry[]>;
        if (parsed && typeof parsed === 'object') {
          setAllEntries(parsed);
          return;
        }
      } catch (err) {
        console.error('Failed to parse ledger_all_entries', err);
      }
    }
    // Legacy fallback: single-entity key (matches existing App.tsx:251-254 behaviour)
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw) as JournalEntry[];
        if (Array.isArray(legacy)) setAllEntries({ 'ent-1': legacy });
      } catch (err) {
        console.error('Failed to parse legacy ledger_entries', err);
      }
    }
  }, []);

  useEffect(() => {
    if (Object.keys(allEntries).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allEntries));
    }
  }, [allEntries]);

  const entries = useMemo(
    () => (activeEntityId ? (allEntries[activeEntityId] ?? []) : []),
    [allEntries, activeEntityId]
  );

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = !searchQuery ||
        entry.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDateFrom = !dateFrom || entry.date >= dateFrom;
      const matchesDateTo = !dateTo || entry.date <= dateTo;
      return matchesSearch && matchesDateFrom && matchesDateTo;
    });
  }, [entries, searchQuery, dateFrom, dateTo]);

  const addEntry = useCallback((entry: JournalEntry) => {
    if (!activeEntityId) return;
    setAllEntries(prev => ({
      ...prev,
      [activeEntityId]: [entry, ...(prev[activeEntityId] ?? [])],
    }));
    addLog('POST_JOURNAL', `Posted journal entry ${entry.reference}: ${entry.description}`, activeEntityId);
  }, [activeEntityId, addLog]);

  const importEntries = useCallback((newEntries: JournalEntry[]) => {
    if (!activeEntityId) return;
    setAllEntries(prev => ({
      ...prev,
      [activeEntityId]: [...newEntries, ...(prev[activeEntityId] ?? [])],
    }));
    addLog('IMPORT_DATA', `Imported ${newEntries.length} journal entries via Trial Balance import`, activeEntityId);
  }, [activeEntityId, addLog]);

  return {
    allEntries, entries, filteredEntries,
    addEntry, importEntries,
    searchQuery, setSearchQuery,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
  };
}
