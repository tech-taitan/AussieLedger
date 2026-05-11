/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import express from 'express';
import type { Database as BetterSqliteDatabase } from 'better-sqlite3';
import { z } from 'zod';
import { AuditLogSchema, type ValidatedAuditLog } from '../lib/schema.js';

interface AuditLogRow {
  id: string; timestamp: string; user: string; action: string;
  entity_id: string | null; details: string; _v: number;
}

function rowToLog(r: AuditLogRow): ValidatedAuditLog {
  return {
    _v: r._v,
    id: r.id, timestamp: r.timestamp, user: r.user,
    action: r.action as ValidatedAuditLog['action'],
    entityId: r.entity_id ?? undefined,
    details: r.details,
  };
}

export function replaceAllAuditLogs(db: BetterSqliteDatabase, logs: ValidatedAuditLog[]): void {
  const txn = db.transaction((arr: ValidatedAuditLog[]) => {
    db.prepare('DELETE FROM audit_logs').run();
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, timestamp, user, action, entity_id, details, _v)
      VALUES (@id, @timestamp, @user, @action, @entityId, @details, @_v)
    `);
    for (const l of arr) {
      stmt.run({
        id: l.id, timestamp: l.timestamp, user: l.user, action: l.action,
        entityId: l.entityId ?? null, details: l.details,
        _v: l._v ?? 2,
      });
    }
  });
  txn(logs);
}

export function auditRouter(db: BetterSqliteDatabase): express.Router {
  const router = express.Router();
  router.get('/audit', (_req, res) => {
    const rows = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC').all() as AuditLogRow[];
    res.json(rows.map(rowToLog));
  });
  router.post('/audit', express.json({ limit: '5mb' }), (req, res) => {
    const parse = AuditLogSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'validation', issues: parse.error.issues });
    }
    const l = parse.data;
    try {
      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, user, action, entity_id, details, _v)
        VALUES (@id, @timestamp, @user, @action, @entityId, @details, @_v)
      `).run({
        id: l.id, timestamp: l.timestamp, user: l.user, action: l.action,
        entityId: l.entityId ?? null, details: l.details, _v: l._v ?? 2,
      });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'server', message: String(err) });
    }
  });
  router.put('/audit', express.json({ limit: '50mb' }), (req, res) => {
    const parse = z.array(AuditLogSchema).safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'validation', issues: parse.error.issues });
    }
    try {
      replaceAllAuditLogs(db, parse.data);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'server', message: String(err) });
    }
  });
  return router;
}
