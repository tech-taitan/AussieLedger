/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import express from 'express';
import type { Database as BetterSqliteDatabase } from 'better-sqlite3';
import { z } from 'zod';
import { EntitySchema, type ValidatedEntity } from '../lib/schema.js';

interface EntityRow {
  id: string; name: string; type: string;
  registration_number: string | null;
  business_address: string | null;
  contact_person: string | null;
  status: string;
  tax_agent_name: string | null;
  tax_agent_phone: string | null;
  tax_agent_email: string | null;
  notes: string | null;
  _v: number;
}

function rowToEntity(row: EntityRow): ValidatedEntity {
  return {
    _v: row._v,
    id: row.id, name: row.name, type: row.type,
    registrationNumber: row.registration_number ?? undefined,
    businessAddress: row.business_address ?? undefined,
    contactPerson: row.contact_person ?? undefined,
    status: row.status as ValidatedEntity['status'],
    taxAgentName: row.tax_agent_name ?? undefined,
    taxAgentPhone: row.tax_agent_phone ?? undefined,
    taxAgentEmail: row.tax_agent_email ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export function replaceAllEntities(db: BetterSqliteDatabase, entities: ValidatedEntity[]): void {
  const txn = db.transaction((arr: ValidatedEntity[]) => {
    db.prepare('DELETE FROM entities').run();
    const stmt = db.prepare(`
      INSERT INTO entities (id, name, type, registration_number, business_address,
                            contact_person, status, tax_agent_name, tax_agent_phone,
                            tax_agent_email, notes, _v)
      VALUES (@id, @name, @type, @registrationNumber, @businessAddress,
              @contactPerson, @status, @taxAgentName, @taxAgentPhone,
              @taxAgentEmail, @notes, @_v)
    `);
    for (const e of arr) {
      stmt.run({
        id: e.id, name: e.name, type: e.type,
        registrationNumber: e.registrationNumber ?? null,
        businessAddress: e.businessAddress ?? null,
        contactPerson: e.contactPerson ?? null,
        status: e.status,
        taxAgentName: e.taxAgentName ?? null,
        taxAgentPhone: e.taxAgentPhone ?? null,
        taxAgentEmail: e.taxAgentEmail ?? null,
        notes: e.notes ?? null,
        _v: e._v ?? 2,
      });
    }
  });
  txn(entities);
}

export function entitiesRouter(db: BetterSqliteDatabase): express.Router {
  const router = express.Router();
  router.get('/entities', (_req, res) => {
    const rows = db.prepare('SELECT * FROM entities').all() as EntityRow[];
    res.json(rows.map(rowToEntity));
  });
  router.put('/entities', express.json({ limit: '50mb' }), (req, res) => {
    const parse = z.array(EntitySchema).safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'validation', issues: parse.error.issues });
    }
    try {
      replaceAllEntities(db, parse.data);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'server', message: String(err) });
    }
  });
  return router;
}
