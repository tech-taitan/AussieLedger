/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Decimal precision contract (same as routes/entries.ts):
 *   exportSnapshot() returns debit/credit/taxAmount AS STRINGS (no parseFloat).
 */
import express from 'express';
import type { Database as BetterSqliteDatabase } from 'better-sqlite3';
import { PersistedRootSchema } from '../lib/schema.js';
import { replaceAllEntities } from './entities.js';
import { replaceAllAccounts } from './accounts.js';
import { replaceAllEntries } from './entries.js';
import { replaceAllAuditLogs } from './audit.js';
// Server reuses the SPA's migration runner via cross-dir import (rootDir='..').
// server/tsconfig.json includes ../src/lib/migrations/**/*.ts so this compiles.
import { migrate, CURRENT_VERSION } from '../../src/lib/migrations/index.js';

interface EntityRow { id: string; name: string; type: string; registration_number: string | null; business_address: string | null; contact_person: string | null; status: string; tax_agent_name: string | null; tax_agent_phone: string | null; tax_agent_email: string | null; notes: string | null; _v: number; }
interface AccountRow { id: string; code: string; name: string; type: string; tax_label: string | null; company_tax_label: string | null; trust_tax_label: string | null; partnership_tax_label: string | null; gst_code: string; needs_review: number; _v: number; }
interface JournalEntryRow { id: string; entity_id: string; date: string; reference: string; description: string; is_posted: number; _v: number; }
interface JournalLineRow { entry_id: string; line_index: number; account_id: string; description: string; debit: string; credit: string; tax_amount: string; is_manual_tax: number; _v: number; }
interface AuditLogRow { id: string; timestamp: string; user: string; action: string; entity_id: string | null; details: string; _v: number; }

function exportSnapshot(db: BetterSqliteDatabase): unknown {
  const entRows = db.prepare('SELECT * FROM entities').all() as EntityRow[];
  const accRows = db.prepare('SELECT * FROM accounts').all() as AccountRow[];
  const jeRows = db.prepare('SELECT * FROM journal_entries').all() as JournalEntryRow[];
  const jlRows = db.prepare('SELECT * FROM journal_lines ORDER BY entry_id, line_index').all() as JournalLineRow[];
  const auRows = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC').all() as AuditLogRow[];

  const linesByEntry = new Map<string, JournalLineRow[]>();
  for (const l of jlRows) {
    if (!linesByEntry.has(l.entry_id)) linesByEntry.set(l.entry_id, []);
    linesByEntry.get(l.entry_id)!.push(l);
  }
  // W1: decimals AS STRINGS, no parseFloat.
  const allEntries: Record<string, unknown[]> = {};
  for (const er of jeRows) {
    if (!allEntries[er.entity_id]) allEntries[er.entity_id] = [];
    allEntries[er.entity_id].push({
      _v: er._v, id: er.id, date: er.date, reference: er.reference,
      description: er.description, isPosted: er.is_posted === 1,
      lines: (linesByEntry.get(er.id) ?? []).map(l => ({
        _v: l._v, accountId: l.account_id, description: l.description,
        debit: l.debit, credit: l.credit, taxAmount: l.tax_amount,
        isManualTax: l.is_manual_tax === 1 ? true : undefined,
      })),
    });
  }
  return {
    _v: CURRENT_VERSION,
    entities: entRows.map(r => ({
      _v: r._v, id: r.id, name: r.name, type: r.type,
      registrationNumber: r.registration_number ?? undefined,
      businessAddress: r.business_address ?? undefined,
      contactPerson: r.contact_person ?? undefined,
      status: r.status,
      taxAgentName: r.tax_agent_name ?? undefined,
      taxAgentPhone: r.tax_agent_phone ?? undefined,
      taxAgentEmail: r.tax_agent_email ?? undefined,
      notes: r.notes ?? undefined,
    })),
    accounts: accRows.map(r => ({
      _v: r._v, id: r.id, code: r.code, name: r.name, type: r.type,
      taxLabel: r.tax_label ?? undefined,
      companyTaxLabel: r.company_tax_label ?? undefined,
      trustTaxLabel: r.trust_tax_label ?? undefined,
      partnershipTaxLabel: r.partnership_tax_label ?? undefined,
      gstCode: r.gst_code,
      _needsReview: r.needs_review ? true : undefined,
    })),
    allEntries,
    auditLogs: auRows.map(r => ({
      _v: r._v, id: r.id, timestamp: r.timestamp, user: r.user,
      action: r.action, entityId: r.entity_id ?? undefined, details: r.details,
    })),
  };
}

export function exportImportRouter(db: BetterSqliteDatabase): express.Router {
  const router = express.Router();

  router.get('/export', (_req, res) => {
    res.json(exportSnapshot(db));
  });

  router.post('/import', express.json({ limit: '50mb' }), (req, res) => {
    try {
      // 1. Run migrate() FIRST (allows older _v import)
      const migrated = migrate(req.body as Record<string, unknown>);
      // 2. Validate the migrated shape against shared PersistedRootSchema
      const parse = PersistedRootSchema.safeParse(migrated);
      if (!parse.success) {
        return res.status(400).json({ error: 'validation', issues: parse.error.issues });
      }
      // 3. Atomic replace — single outer transaction wraps all four
      const importAll = db.transaction(() => {
        replaceAllEntities(db, parse.data.entities);
        replaceAllAccounts(db, parse.data.accounts);
        replaceAllEntries(db, parse.data.allEntries);
        replaceAllAuditLogs(db, parse.data.auditLogs);
      });
      importAll();
      res.json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('newer than the application version')) {
        return res.status(400).json({ error: 'migration-newer', message: msg });
      }
      res.status(400).json({ error: 'migration', message: msg });
    }
  });

  return router;
}
