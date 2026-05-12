/**
 * Hook test for useJournals.
 *
 * Phase 2: hooks persisted via localStorage.
 * Phase 3 (Plan 03-2): hooks persist via `StorageAdapter` (IndexedDB / SQLite).
 *
 * Tests preserve the hook public contract; persistence assertions now check
 * the adapter's `getEntries()` rather than `localStorage.getItem(...)`.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useJournals } from '../useJournals';
import type { JournalEntry } from '../../types';
import { getAdapter } from '../../storage';

function makeEntry(id: string, description: string = 'Test entry'): JournalEntry {
  return {
    id,
    date: '2026-01-15',
    reference: `REF-${id}`,
    description,
    lines: [],
    isPosted: true,
  };
}

describe('useJournals', () => {
  it('starts with empty allEntries', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useJournals(addLog, null));
    expect(Object.keys(result.current.allEntries)).toHaveLength(0);
  });

  it('entries selector returns [] when activeEntityId is null', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useJournals(addLog, null));
    expect(result.current.entries).toHaveLength(0);
  });

  it("entries selector returns the entity's slice for activeEntityId", () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));
    act(() => {
      result.current.addEntry(makeEntry('je-1'));
    });
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBe('je-1');
  });

  it('addEntry appends and calls addLog with POST_JOURNAL', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));
    act(() => {
      result.current.addEntry(makeEntry('je-2'));
    });
    expect(addLog).toHaveBeenCalledOnce();
    const [action] = addLog.mock.calls[0];
    expect(action).toBe('POST_JOURNAL');
  });

  it('filteredEntries respects searchQuery', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));
    act(() => {
      result.current.addEntry(makeEntry('je-3', 'Sales invoice for Customer A'));
      result.current.addEntry(makeEntry('je-4', 'Wages payment'));
    });
    act(() => {
      result.current.setSearchQuery('Sales');
    });
    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0].id).toBe('je-3');
  });

  it('persists to adapter on change', async () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));
    await waitFor(() => {
      // Hook starts with {} — wait until ready (post-load) before mutating.
      expect(result.current.allEntries).toEqual({});
    });
    act(() => {
      result.current.addEntry(makeEntry('je-5'));
    });
    await waitFor(async () => {
      const adapter = await getAdapter();
      const stored = await adapter.getEntries();
      expect(stored['ent-1']).toHaveLength(1);
      expect(stored['ent-1'][0].id).toBe('je-5');
    });
  });
});

describe('Phase 4 — supersession + reversal + void + audit (BOOK-02..04, BOOK-11)', () => {
  it.todo('postDraft enforces balance at data layer');
  it.todo('editPosted supersedes original');
  it.todo('editPosted writes EDIT_JOURNAL audit with before snapshot');
  it.todo('EDIT_JOURNAL audit has before snapshot');
  it.todo('reversePosted mirrors lines');
  it.todo('reversePosted writes REVERSE_JOURNAL audit');
  it.todo('reversesEntryId link');
  it.todo('voidDraft only on drafts');
  it.todo('voidDraft refuses posted');
  it.todo('searchJournals reference and description');
  it.todo('searchJournals by account');
  it.todo('searchJournals by amount range');
});
