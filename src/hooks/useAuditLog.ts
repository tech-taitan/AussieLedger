/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useCallback } from 'react';
import { AuditLog } from '../types';
import { today } from '../lib/period';

const STORAGE_KEY = 'ledger_audit_logs';

export interface AuditLogHook {
  auditLogs: AuditLog[];
  addLog: (action: AuditLog['action'], details: string, entityId?: string) => void;
}

export function useAuditLog(): AuditLogHook {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as AuditLog[];
      if (Array.isArray(parsed)) setAuditLogs(parsed);
    } catch (err) {
      console.error('Failed to parse ledger_audit_logs', err);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auditLogs));
  }, [auditLogs]);

  const addLog = useCallback(
    (action: AuditLog['action'], details: string, entityId?: string) => {
      const newLog: AuditLog = {
        id: crypto.randomUUID(),
        timestamp: today().toISOString(),
        user: 'Local user',
        action,
        entityId,
        details,
      };
      setAuditLogs(prev => [newLog, ...prev]);
    },
    []
  );

  return { auditLogs, addLog };
}
