/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { JournalEntry } from '../types';
import { AddLog } from './useAccounts';
import { getAdapter } from '../storage';
import {
  validateBalanced,
  makeReversal,
  makeSupersedingEdit,
  searchJournals as searchJournalsPure,
  type SearchFilters,
} from '../lib/ledger';
import { today } from '../lib/period';

export interface JournalsHook {
  // Phase 2 contract — keep verbatim
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

  // Phase 4 additions (BOOK-01..04, BOOK-11, BOOK-12)
  postDraft: (entry: JournalEntry) => void;
  editPosted: (
    original: JournalEntry,
    edits: Partial<Pick<JournalEntry, 'date' | 'reference' | 'description' | 'lines'>>,
  ) => void;
  reversePosted: (original: JournalEntry, reversalDate?: string) => void;
  voidDraft: (entry: JournalEntry) => void;
  searchJournals: (filters: SearchFilters) => JournalEntry[];
  /**
   * IMP-05 Replace path: supersede an existing opening-balances entry with a
   * new one in a single state update — mirrors `editPosted`'s supersession
   * arm but takes the fully-built replacement entry from ImportTB (which
   * already validated balance and computed the fingerprint). Without this
   * helper, ImportTB's Replace path would emit TWO posted entries with the
   * SAME importFingerprint (the original AND the replacement) — TrialBalance
   * (which filters out `status === 'superseded'`) would double-count.
   */
  supersedeImport: (existingId: string, newEntry: JournalEntry) => void;
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
    // Exclude superseded / voided so the legacy list view stays clean (BOOK-02/04)
    const live = entries.filter(
      (e) => e.status !== 'superseded' && e.status !== 'voided',
    );
    return live.filter((entry) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        entry.reference.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q);
      const matchesDateFrom = !dateFrom || entry.date >= dateFrom;
      const matchesDateTo = !dateTo || entry.date <= dateTo;
      return matchesSearch && matchesDateFrom && matchesDateTo;
    });
  }, [entries, searchQuery, dateFrom, dateTo]);

  // Phase 2 addEntry — preserved BUT now with data-layer balance enforcement (BOOK-01)
  const addEntry = useCallback(
    (entry: JournalEntry) => {
      if (!activeEntityId) return;
      if (entry.isPosted) {
        validateBalanced(entry.lines); // BOOK-01 — throws JournalNotBalancedError on imbalance
      }
      const v3entry: JournalEntry = {
        ...entry,
        _v: 3,
        status: entry.status ?? (entry.isPosted ? 'posted' : 'draft'),
      };
      setAllEntries((prev) => ({
        ...prev,
        [activeEntityId]: [v3entry, ...(prev[activeEntityId] ?? [])],
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

  // ── Phase 4 additions ─────────────────────────────────────────────────────

  const postDraft = useCallback(
    (entry: JournalEntry) => {
      if (!activeEntityId) return;
      validateBalanced(entry.lines); // BOOK-01
      const v3entry: JournalEntry = {
        ...entry,
        _v: 3,
        isPosted: true,
        status: 'posted',
      };
      setAllEntries((prev) => ({
        ...prev,
        [activeEntityId]: [v3entry, ...(prev[activeEntityId] ?? [])],
      }));
      addLog(
        'POST_JOURNAL',
        `Posted journal entry ${entry.reference}: ${entry.description}`,
        activeEntityId,
      );
    },
    [activeEntityId, addLog],
  );

  const emitAudit = useCallback(
    async (
      action: 'EDIT_JOURNAL' | 'REVERSE_JOURNAL' | 'VOID_JOURNAL',
      details: object,
    ) => {
      try {
        const a = await getAdapter();
        await a.appendAuditLog({
          _v: 3,
          id: crypto.randomUUID(),
          timestamp: today().toISOString(),
          user: 'Local user',
          action,
          entityId: activeEntityId ?? undefined,
          details: JSON.stringify(details),
        });
      } catch (err) {
        console.error('appendAuditLog failed', err);
      }
    },
    [activeEntityId],
  );

  const editPosted = useCallback(
    (
      original: JournalEntry,
      edits: Partial<Pick<JournalEntry, 'date' | 'reference' | 'description' | 'lines'>>,
    ) => {
      if (!activeEntityId) return;
      const replacement = makeSupersedingEdit(original, edits); // throws on unbalanced

      setAllEntries((prev) => {
        const list = prev[activeEntityId] ?? [];
        const updated = list.map((e) =>
          e.id === original.id
            ? {
                ...e,
                _v: 3,
                status: 'superseded' as const,
                replacedByEntryId: replacement.id,
              }
            : e,
        );
        return { ...prev, [activeEntityId]: [replacement, ...updated] };
      });

      void emitAudit('EDIT_JOURNAL', {
        summary: `Edited journal ${original.reference}`,
        before: {
          ref: original.reference,
          desc: original.description,
          date: original.date,
          lines: original.lines,
        },
        after: {
          ref: replacement.reference,
          desc: replacement.description,
          date: replacement.date,
          lines: replacement.lines,
        },
      });
    },
    [activeEntityId, emitAudit],
  );

  const reversePosted = useCallback(
    (original: JournalEntry, reversalDate?: string) => {
      if (!activeEntityId) return;
      const reversal = makeReversal(original, reversalDate);

      setAllEntries((prev) => {
        const list = prev[activeEntityId] ?? [];
        const updated = list.map((e) =>
          e.id === original.id ? { ...e, _v: 3, status: 'reversed' as const } : e,
        );
        return { ...prev, [activeEntityId]: [reversal, ...updated] };
      });

      void emitAudit('REVERSE_JOURNAL', {
        summary: `Reversed journal ${original.reference}`,
        original: original.id,
        reversalEntry: reversal.id,
      });
    },
    [activeEntityId, emitAudit],
  );

  const voidDraft = useCallback(
    (entry: JournalEntry) => {
      if (!activeEntityId) return;
      if (entry.isPosted || entry.status === 'posted') {
        throw new Error(
          'Cannot void a posted journal entry. Use Reverse instead.',
        );
      }
      setAllEntries((prev) => {
        const list = prev[activeEntityId] ?? [];
        return { ...prev, [activeEntityId]: list.filter((e) => e.id !== entry.id) };
      });

      void emitAudit('VOID_JOURNAL', {
        summary: `Voided draft journal ${entry.reference}`,
        before: entry,
      });
    },
    [activeEntityId, emitAudit],
  );

  const searchJournals = useCallback(
    (filters: SearchFilters): JournalEntry[] => {
      // Active-entity scope, excluding non-live statuses
      const live = entries.filter(
        (e) => e.status !== 'superseded' && e.status !== 'voided',
      );
      return searchJournalsPure(live, filters);
    },
    [entries],
  );

  /**
   * IMP-05 Replace path: in one setAllEntries call, mark the existing entry
   * as `status: 'superseded' + replacedByEntryId` AND prepend the new entry.
   * Mirrors editPosted's supersession arm but accepts a pre-built replacement
   * from ImportTB (which has already computed the fingerprint + validated the
   * balance). Emits an EDIT_JOURNAL audit row with before/after snapshots so
   * the Audit Trail surfaces the replace operation alongside regular edits.
   */
  const supersedeImport = useCallback(
    (existingId: string, newEntry: JournalEntry) => {
      if (!activeEntityId) return;
      // Validate the incoming entry's balance defensively — ImportTB already
      // does this, but a stray caller shouldn't be able to bypass BOOK-01.
      validateBalanced(newEntry.lines);

      let before: JournalEntry | undefined;
      setAllEntries((prev) => {
        const list = prev[activeEntityId] ?? [];
        const existing = list.find((e) => e.id === existingId);
        before = existing;
        const updated = list.map((e) =>
          e.id === existingId
            ? {
                ...e,
                _v: 3,
                status: 'superseded' as const,
                replacedByEntryId: newEntry.id,
              }
            : e,
        );
        return { ...prev, [activeEntityId]: [newEntry, ...updated] };
      });

      void emitAudit('EDIT_JOURNAL', {
        summary: 'Opening balance replaced via TB re-import',
        before: before ?? { id: existingId },
        after: newEntry,
      });
    },
    [activeEntityId, emitAudit],
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
    postDraft,
    editPosted,
    reversePosted,
    voidDraft,
    searchJournals,
    supersedeImport,
  };
}
