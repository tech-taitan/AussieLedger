/**
 * useAuditLog hook — stub for Plan 02-1 type resolution.
 *
 * TODO Plan 02-2: implement this hook with full persistence and addLog wiring.
 * This stub exists only so TypeScript can resolve imports in test files.
 */
import type { AuditLog } from '../types';

export interface AuditLogHook {
  auditLogs: AuditLog[];
  addLog: (action: AuditLog['action'], details: string, entityId?: string) => void;
}

/** @throws Not yet implemented — Plan 02-2 implements this hook. */
export function useAuditLog(): AuditLogHook {
  throw new Error('useAuditLog not yet implemented — landing in Plan 02-2');
}
