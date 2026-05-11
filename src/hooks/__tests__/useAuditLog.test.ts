/**
 * Hook test for useAuditLog.
 *
 * Phase 2: hooks persisted via localStorage.
 * Phase 3 (Plan 03-2): hooks persist via `StorageAdapter` (IndexedDB / SQLite).
 *
 * Tests preserve the hook public contract; persistence assertions now check
 * the adapter's `getAuditLogs()` rather than `localStorage.getItem(...)`.
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuditLog } from '../useAuditLog';
import { getAdapter } from '../../storage';

describe('useAuditLog', () => {
  it('starts with empty audit log', () => {
    const { result } = renderHook(() => useAuditLog());
    expect(result.current.auditLogs).toHaveLength(0);
  });

  it('addLog prepends a new entry', () => {
    const { result } = renderHook(() => useAuditLog());
    act(() => {
      result.current.addLog('CREATE_ENTITY', 'Created Sample Pty Ltd', 'ent-1');
    });
    expect(result.current.auditLogs).toHaveLength(1);
    expect(result.current.auditLogs[0].action).toBe('CREATE_ENTITY');
  });

  it('persists to adapter on change', async () => {
    const { result } = renderHook(() => useAuditLog());
    // Wait for the load useEffect to mark the hook ready before adding,
    // otherwise the save useEffect is gated off.
    await waitFor(() => {
      expect(result.current.auditLogs).toEqual([]);
    });
    act(() => {
      result.current.addLog('POST_JOURNAL', 'Posted journal JE-001', 'ent-1');
    });
    await waitFor(async () => {
      const adapter = await getAdapter();
      const stored = await adapter.getAuditLogs();
      expect(stored).toHaveLength(1);
      expect(stored[0].action).toBe('POST_JOURNAL');
    });
  });

  it('loads from adapter on mount', async () => {
    // Pre-populate the adapter with a seeded log
    const adapter = await getAdapter();
    const seeded = [
      {
        id: 'log-seed-1',
        timestamp: '2026-01-01T00:00:00Z',
        user: 'Local user',
        action: 'CREATE_ENTITY' as const,
        details: 'Seeded log',
      },
    ];
    await adapter.saveAuditLogs(seeded);

    const { result } = renderHook(() => useAuditLog());
    await waitFor(() => {
      expect(result.current.auditLogs).toHaveLength(1);
    });
    expect(result.current.auditLogs[0].id).toBe('log-seed-1');
  });
});
