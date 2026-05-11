/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Decimal precision contract:
 *   - SQLite stores debit/credit/taxAmount as TEXT (preserves precision).
 *   - GET /api/entries returns those values AS STRINGS in JSON — no parseFloat.
 *   - SPA ServerAdapter (Task 3) calls deserialize() from src/lib/money.ts.
 *
 * Inbound PUT validation: JournalLineSchema accepts numbers (the SPA hooks
 * serialise via src/lib/money.ts before sending, so values arrive as strings
 * even though zod typing says number — at write time we coerce String() before
 * INSERT, lossless).
 */
import express from 'express';
import type { Database as BetterSqliteDatabase } from 'better-sqlite3';
import { z } from 'zod';
import { JournalEntrySchema, type ValidatedJournalEntry } from '../lib/schema.js';

interface JournalEntryRow {
  id: string; entity_id: string; date: string; reference: string;
  description: string; is_posted: number; _v: number;
}
interface JournalLineRow {
  entry_id: string; line_index: number; account_id: string;
  description: string; debit: string; credit: string; tax_amount: string;
  is_manual_tax: number; _v: number;
}

export function replaceAllEntries(db: BetterSqliteDatabase, map: Record<string, ValidatedJournalEntry[]>): void {
  const txn = db.transaction((m: Record<string, ValidatedJournalEntry[]>) => {
    db.prepare('DELETE FROM journal_lines').run();
    db.prepare('DELETE FROM journal_entries').run();
    const insertEntry = db.prepare(`
      INSERT INTO journal_entries (id, entity_id, date, reference, description, is_posted, _v)
      VALUES (@id, @entityId, @date, @reference, @description, @isPosted, @_v)
    `);
    const insertLine = db.prepare(`
      INSERT INTO journal_lines (entry_id, line_index, account_id, description,
                                 debit, credit, tax_amount, is_manual_tax, _v)
      VALUES (@entryId, @lineIndex, @accountId, @description,
              @debit, @credit, @taxAmount, @isManualTax, @_v)
    `);
    for (const [entityId, entries] of Object.entries(m)) {
      for (const entry of entries) {
        insertEntry.run({
          id: entry.id, entityId,
          date: entry.date, reference: entry.reference,
          description: entry.description,
          isPosted: entry.isPosted ? 1 : 0,
          _v: entry._v ?? 2,
        });
        entry.lines.forEach((line, idx) => {
          insertLine.run({
            entryId: entry.id, lineIndex: idx,
            accountId: line.accountId, description: line.description,
            // String() coercion preserves precision: zod accepts numbers from
            // typing but the SPA serialises via src/lib/money.ts so values
            // are already decimal-strings shaped (e.g. "123.45000"). String()
            // is safe either way.
            debit: String(line.debit), credit: String(line.credit),
            taxAmount: String(line.taxAmount),
            isManualTax: line.isManualTax ? 1 : 0,
            _v: line._v ?? 2,
          });
        });
      }
    }
  });
  txn(map);
}

export function entriesRouter(db: BetterSqliteDatabase): express.Router {
  const router = express.Router();
  router.get('/entries', (_req, res) => {
    const entryRows = db.prepare('SELECT * FROM journal_entries ORDER BY date DESC').all() as JournalEntryRow[];
    const lineRows = db.prepare('SELECT * FROM journal_lines ORDER BY entry_id, line_index').all() as JournalLineRow[];
    const linesByEntry = new Map<string, JournalLineRow[]>();
    for (const r of lineRows) {
      if (!linesByEntry.has(r.entry_id)) linesByEntry.set(r.entry_id, []);
      linesByEntry.get(r.entry_id)!.push(r);
    }
    // W1: return decimals AS STRINGS (no parseFloat).
    // The SPA's ServerAdapter applies money.ts `deserialize()` on the read boundary.
    // Cast through `unknown` to satisfy the JournalLine typing (debit/credit/taxAmount
    // are typed as number on the SPA hook contract; the boundary deserialise hop
    // restores Decimal precision before the hook ever sees the value).
    const result: Record<string, unknown[]> = {};
    for (const er of entryRows) {
      if (!result[er.entity_id]) result[er.entity_id] = [];
      result[er.entity_id].push({
        _v: er._v,
        id: er.id, date: er.date, reference: er.reference,
        description: er.description, isPosted: er.is_posted === 1,
        lines: (linesByEntry.get(er.id) ?? []).map(l => ({
          _v: l._v,
          accountId: l.account_id, description: l.description,
          // Pass strings through verbatim. ServerAdapter will deserialise.
          debit: l.debit, credit: l.credit, taxAmount: l.tax_amount,
          isManualTax: l.is_manual_tax === 1 ? true : undefined,
        })),
      });
    }
    res.json(result);
  });
  router.put('/entries', express.json({ limit: '50mb' }), (req, res) => {
    const parse = z.record(z.string(), z.array(JournalEntrySchema)).safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'validation', issues: parse.error.issues });
    }
    try {
      replaceAllEntries(db, parse.data);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'server', message: String(err) });
    }
  });
  return router;
}
