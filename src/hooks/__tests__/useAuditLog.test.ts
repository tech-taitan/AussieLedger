/**
 * Hook test scaffold for useAuditLog.
 *
 * RED-by-design until Plan 02-2 creates src/hooks/useAuditLog.ts.
 * Once 02-2 lands, these tests must all pass (GREEN).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuditLog } from '../useAuditLog';

describe('useAuditLog', () => {
  beforeEach(() => {
    localStorage.clear();
  });

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

  it('persists to localStorage on change', () => {
    const { result } = renderHook(() => useAuditLog());
    act(() => {
      result.current.addLog('POST_JOURNAL', 'Posted journal JE-001', 'ent-1');
    });
    const stored = JSON.parse(localStorage.getItem('ledger_audit_logs') ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].action).toBe('POST_JOURNAL');
  });

  it('loads from localStorage on mount', () => {
    // Pre-populate localStorage with a seeded log
    const seeded = [
      {
        id: 'log-seed-1',
        timestamp: new Date().toISOString(),
        user: 'Local user',
        action: 'CREATE_ENTITY',
        details: 'Seeded log',
      },
    ];
    localStorage.setItem('ledger_audit_logs', JSON.stringify(seeded));
    const { result } = renderHook(() => useAuditLog());
    expect(result.current.auditLogs).toHaveLength(1);
    expect(result.current.auditLogs[0].id).toBe('log-seed-1');
  });
});
