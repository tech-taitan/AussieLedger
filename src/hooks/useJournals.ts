/**
 * useJournals hook — stub for Plan 02-1 type resolution.
 *
 * TODO Plan 02-2: implement this hook with full persistence and addLog wiring.
 * This stub exists only so TypeScript can resolve imports in test files.
 */
import type { JournalEntry, AuditLog } from '../types';

type AddLogFn = (action: AuditLog['action'], details: string, entityId?: string) => void;

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

/** @throws Not yet implemented — Plan 02-2 implements this hook. */
export function useJournals(_addLog: AddLogFn, _activeEntityId: string | null): JournalsHook {
  throw new Error('useJournals not yet implemented — landing in Plan 02-2');
}
