/**
 * Hook test scaffold for useJournals.
 *
 * RED-by-design until Plan 02-2 creates src/hooks/useJournals.ts.
 * Once 02-2 lands, these tests must all pass (GREEN).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useJournals } from '../useJournals';
import type { JournalEntry } from '../../types';

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
  beforeEach(() => {
    localStorage.clear();
  });

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

  it('persists to ledger_all_entries on change', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));
    act(() => {
      result.current.addEntry(makeEntry('je-5'));
    });
    const stored = JSON.parse(localStorage.getItem('ledger_all_entries') ?? '{}');
    expect(stored['ent-1']).toHaveLength(1);
    expect(stored['ent-1'][0].id).toBe('je-5');
  });
});
