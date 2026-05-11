/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import express from 'express';
import type { Database as BetterSqliteDatabase } from 'better-sqlite3';
import { z } from 'zod';
import { AccountSchema, type ValidatedAccount } from '../lib/schema.js';

interface AccountRow {
  id: string; code: string; name: string; type: string;
  tax_label: string | null;
  company_tax_label: string | null;
  trust_tax_label: string | null;
  partnership_tax_label: string | null;
  gst_code: string;
  needs_review: number;
  _v: number;
}

function rowToAccount(row: AccountRow): ValidatedAccount {
  return {
    _v: row._v,
    id: row.id, code: row.code, name: row.name,
    type: row.type as ValidatedAccount['type'],
    taxLabel: row.tax_label ?? undefined,
    companyTaxLabel: row.company_tax_label ?? undefined,
    trustTaxLabel: row.trust_tax_label ?? undefined,
    partnershipTaxLabel: row.partnership_tax_label ?? undefined,
    gstCode: row.gst_code as ValidatedAccount['gstCode'],
    _needsReview: row.needs_review ? true : undefined,
  };
}

export function replaceAllAccounts(db: BetterSqliteDatabase, accounts: ValidatedAccount[]): void {
  const txn = db.transaction((arr: ValidatedAccount[]) => {
    db.prepare('DELETE FROM accounts').run();
    const stmt = db.prepare(`
      INSERT INTO accounts (id, code, name, type, tax_label, company_tax_label,
                            trust_tax_label, partnership_tax_label, gst_code,
                            needs_review, _v)
      VALUES (@id, @code, @name, @type, @taxLabel, @companyTaxLabel,
              @trustTaxLabel, @partnershipTaxLabel, @gstCode,
              @needsReview, @_v)
    `);
    for (const a of arr) {
      stmt.run({
        id: a.id, code: a.code, name: a.name, type: a.type,
        taxLabel: a.taxLabel ?? null,
        companyTaxLabel: a.companyTaxLabel ?? null,
        trustTaxLabel: a.trustTaxLabel ?? null,
        partnershipTaxLabel: a.partnershipTaxLabel ?? null,
        gstCode: a.gstCode,
        needsReview: a._needsReview ? 1 : 0,
        _v: a._v ?? 2,
      });
    }
  });
  txn(accounts);
}

export function accountsRouter(db: BetterSqliteDatabase): express.Router {
  const router = express.Router();
  router.get('/accounts', (_req, res) => {
    const rows = db.prepare('SELECT * FROM accounts').all() as AccountRow[];
    res.json(rows.map(rowToAccount));
  });
  router.put('/accounts', express.json({ limit: '50mb' }), (req, res) => {
    const parse = z.array(AccountSchema).safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'validation', issues: parse.error.issues });
    }
    try {
      replaceAllAccounts(db, parse.data);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'server', message: String(err) });
    }
  });
  return router;
}
