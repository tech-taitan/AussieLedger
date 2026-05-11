/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useCallback } from 'react';
import { AuditLog } from '../types';
import { today } from '../lib/period';
import { getAdapter } from '../storage';

export interface AuditLogHook {
  auditLogs: AuditLog[];
  addLog: (action: AuditLog['action'], details: string, entityId?: string) => void;
}

export function useAuditLog(): AuditLogHook {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const adapter = await getAdapter();
      const loaded = await adapter.getAuditLogs();
      if (cancelled) return;
      if (loaded.length > 0) setAuditLogs(loaded);
      setReady(true);
    })().catch((err) => {
      console.error('useAuditLog load failed', err);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // saveAuditLogs is on the FINAL StorageAdapter interface (Plan 03-1).
  // Call it directly — no cast, no fallback, no exportAll/importAll dance.
  useEffect(() => {
    if (!ready) return;
    getAdapter()
      .then((a) => a.saveAuditLogs(auditLogs))
      .catch((err) => console.error('useAuditLog save failed', err));
  }, [auditLogs, ready]);

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
      setAuditLogs((prev) => [newLog, ...prev]);
    },
    [],
  );

  return { auditLogs, addLog };
}
