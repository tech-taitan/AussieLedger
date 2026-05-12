/**
 * Hook test for useJournals.
 *
 * Phase 2: hooks persisted via localStorage.
 * Phase 3 (Plan 03-2): hooks persist via `StorageAdapter` (IndexedDB / SQLite).
 * Phase 4 (Plan 04-2): widened with postDraft / editPosted / reversePosted /
 *   voidDraft / searchJournals against the Wave-0 ledger.ts pure functions.
 *
 * Tests preserve the hook public contract; persistence assertions now check
 * the adapter's `getEntries()` rather than `localStorage.getItem(...)`.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useJournals } from '../useJournals';
import type { JournalEntry, JournalLine } from '../../types';
import { getAdapter } from '../../storage';

function makeLine(accountId: string, debit: number, credit: number): JournalLine {
  return {
    _v: 3,
    accountId,
    description: 'line',
    debit,
    credit,
    taxAmount: 0,
  };
}

function makeBalancedEntry(
  id: string,
  description: string = 'Test entry',
  opts: { lines?: JournalLine[]; isPosted?: boolean; date?: string } = {},
): JournalEntry {
  const lines =
    opts.lines ?? [makeLine('acc-1', 100, 0), makeLine('acc-2', 0, 100)];
  return {
    _v: 3,
    id,
    date: opts.date ?? '2026-01-15',
    reference: `REF-${id}`,
    description,
    lines,
    isPosted: opts.isPosted ?? true,
    status: opts.isPosted === false ? 'draft' : 'posted',
  };
}

function makeEntry(id: string, description: string = 'Test entry'): JournalEntry {
  // Legacy helper preserved for Phase-2 tests that don't care about line balance
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
      // Use isPosted: false to bypass data-layer balance check for the legacy fixture
      result.current.addEntry({ ...makeEntry('je-1'), isPosted: false });
    });
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBe('je-1');
  });

  it('addEntry appends and calls addLog with POST_JOURNAL', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));
    act(() => {
      result.current.addEntry({ ...makeEntry('je-2'), isPosted: false });
    });
    expect(addLog).toHaveBeenCalledOnce();
    const [action] = addLog.mock.calls[0];
    expect(action).toBe('POST_JOURNAL');
  });

  it('filteredEntries respects searchQuery', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));
    act(() => {
      result.current.addEntry({
        ...makeEntry('je-3', 'Sales invoice for Customer A'),
        isPosted: false,
      });
      result.current.addEntry({
        ...makeEntry('je-4', 'Wages payment'),
        isPosted: false,
      });
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
      result.current.addEntry({ ...makeEntry('je-5'), isPosted: false });
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
  it('postDraft enforces balance at data layer', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));

    // Balanced — OK
    act(() => {
      result.current.postDraft(makeBalancedEntry('je-pd-1'));
    });
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].status).toBe('posted');

    // Unbalanced — throws JournalNotBalancedError
    const unbalanced: JournalEntry = {
      ...makeBalancedEntry('je-pd-2'),
      lines: [makeLine('acc-1', 100, 0), makeLine('acc-2', 0, 50)],
    };
    expect(() => {
      act(() => {
        result.current.postDraft(unbalanced);
      });
    }).toThrow();
  });

  it('editPosted supersedes original', async () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));

    const original = makeBalancedEntry('je-orig-1', 'Original description');
    act(() => {
      result.current.postDraft(original);
    });

    act(() => {
      result.current.editPosted(original, { description: 'Edited description' });
    });

    const list = result.current.entries;
    expect(list).toHaveLength(2);

    const supersededOriginal = list.find((e) => e.id === original.id);
    expect(supersededOriginal).toBeDefined();
    expect(supersededOriginal?.status).toBe('superseded');
    expect(supersededOriginal?.replacedByEntryId).toBeDefined();

    const replacement = list.find((e) => e.replacesEntryId === original.id);
    expect(replacement).toBeDefined();
    expect(replacement?.description).toBe('Edited description');
    expect(supersededOriginal?.replacedByEntryId).toBe(replacement?.id);
  });

  it('editPosted writes EDIT_JOURNAL audit with before snapshot', async () => {
    const addLog = vi.fn();
    const adapter = await getAdapter();
    const auditSpy = vi.spyOn(adapter, 'appendAuditLog');
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));

    const original = makeBalancedEntry('je-orig-2', 'Pre-edit');
    act(() => {
      result.current.postDraft(original);
    });

    act(() => {
      result.current.editPosted(original, { description: 'Post-edit' });
    });

    await waitFor(() => {
      expect(auditSpy).toHaveBeenCalled();
    });

    const editCall = auditSpy.mock.calls.find(
      (c) => c[0].action === 'EDIT_JOURNAL',
    );
    expect(editCall).toBeDefined();
    const log = editCall![0];
    expect(log.action).toBe('EDIT_JOURNAL');
    const parsed = JSON.parse(log.details);
    expect(parsed.before).toBeDefined();
    expect(parsed.before.ref).toBe(original.reference);
    expect(parsed.before.desc).toBe('Pre-edit');
    expect(parsed.after.desc).toBe('Post-edit');
    auditSpy.mockRestore();
  });

  it('EDIT_JOURNAL audit has before snapshot', async () => {
    const addLog = vi.fn();
    const adapter = await getAdapter();
    const auditSpy = vi.spyOn(adapter, 'appendAuditLog');
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));

    const original = makeBalancedEntry('je-orig-3');
    act(() => {
      result.current.postDraft(original);
    });

    act(() => {
      result.current.editPosted(original, { reference: 'REF-ALT' });
    });

    await waitFor(() => {
      const editCall = auditSpy.mock.calls.find(
        (c) => c[0].action === 'EDIT_JOURNAL',
      );
      expect(editCall).toBeDefined();
      const parsed = JSON.parse(editCall![0].details);
      expect(parsed.before.lines).toBeDefined();
      expect(Array.isArray(parsed.before.lines)).toBe(true);
      expect(parsed.before.lines).toHaveLength(original.lines.length);
    });
    auditSpy.mockRestore();
  });

  it('reversePosted mirrors lines', async () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));

    const original = makeBalancedEntry('je-rev-1');
    act(() => {
      result.current.postDraft(original);
    });

    act(() => {
      result.current.reversePosted(original, '2026-02-01');
    });

    const reversal = result.current.entries.find(
      (e) => e.reversesEntryId === original.id,
    );
    expect(reversal).toBeDefined();
    reversal!.lines.forEach((line, i) => {
      expect(line.debit).toBe(original.lines[i].credit);
      expect(line.credit).toBe(original.lines[i].debit);
    });
  });

  it('reversesEntryId link', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));

    const original = makeBalancedEntry('je-rev-2');
    act(() => {
      result.current.postDraft(original);
    });
    act(() => {
      result.current.reversePosted(original);
    });

    const reversal = result.current.entries.find(
      (e) => e.reversesEntryId === original.id,
    );
    const originalNow = result.current.entries.find((e) => e.id === original.id);
    expect(reversal?.reversesEntryId).toBe(original.id);
    expect(originalNow?.status).toBe('reversed');
  });

  it('reversePosted writes REVERSE_JOURNAL audit', async () => {
    const addLog = vi.fn();
    const adapter = await getAdapter();
    const auditSpy = vi.spyOn(adapter, 'appendAuditLog');
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));

    const original = makeBalancedEntry('je-rev-3');
    act(() => {
      result.current.postDraft(original);
    });
    act(() => {
      result.current.reversePosted(original);
    });

    await waitFor(() => {
      const revCall = auditSpy.mock.calls.find(
        (c) => c[0].action === 'REVERSE_JOURNAL',
      );
      expect(revCall).toBeDefined();
    });
    auditSpy.mockRestore();
  });

  it('voidDraft only on drafts', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));

    const draft = makeBalancedEntry('je-draft-1', 'draft', { isPosted: false });
    act(() => {
      result.current.addEntry(draft);
    });
    expect(result.current.entries).toHaveLength(1);

    act(() => {
      result.current.voidDraft(draft);
    });
    expect(result.current.entries.find((e) => e.id === draft.id)).toBeUndefined();
  });

  it('voidDraft refuses posted', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));

    const posted = makeBalancedEntry('je-posted-1');
    act(() => {
      result.current.postDraft(posted);
    });
    // The hook now holds the posted entry in state
    const stored = result.current.entries.find((e) => e.id === posted.id)!;
    expect(stored.isPosted).toBe(true);

    expect(() => {
      act(() => {
        result.current.voidDraft(stored);
      });
    }).toThrow();
  });

  it('searchJournals reference and description', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));

    act(() => {
      result.current.postDraft({
        ...makeBalancedEntry('s1', 'Office supplies'),
        reference: 'REF-INV-001',
      });
      result.current.postDraft({
        ...makeBalancedEntry('s2', 'Wages payment'),
        reference: 'REF-WAG-002',
      });
    });

    const byRef = result.current.searchJournals({ reference: 'INV' });
    expect(byRef.map((e) => e.id)).toEqual(['s1']);

    const byDesc = result.current.searchJournals({ description: 'wages' });
    expect(byDesc.map((e) => e.id)).toEqual(['s2']);
  });

  it('searchJournals by account', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));

    act(() => {
      result.current.postDraft({
        ...makeBalancedEntry('s3'),
        lines: [makeLine('acc-A', 50, 0), makeLine('acc-B', 0, 50)],
      });
      result.current.postDraft({
        ...makeBalancedEntry('s4'),
        lines: [makeLine('acc-C', 75, 0), makeLine('acc-D', 0, 75)],
      });
    });

    const hit = result.current.searchJournals({ accountId: 'acc-A' });
    expect(hit.map((e) => e.id)).toEqual(['s3']);
  });

  it('searchJournals by amount range', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useJournals(addLog, 'ent-1'));

    act(() => {
      result.current.postDraft({
        ...makeBalancedEntry('s5'),
        lines: [makeLine('acc-A', 25, 0), makeLine('acc-B', 0, 25)],
      });
      result.current.postDraft({
        ...makeBalancedEntry('s6'),
        lines: [makeLine('acc-A', 500, 0), makeLine('acc-B', 0, 500)],
      });
    });

    const hit = result.current.searchJournals({
      amountFrom: 100,
      amountTo: 1000,
    });
    expect(hit.map((e) => e.id)).toEqual(['s6']);
  });
});
