/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigrations } from '../db/migrate';
import { replaceAllEntities } from '../routes/entities';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

describe('Transactional whole-collection replace (DEP-02)', () => {
  let db: Database.Database;
  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db, MIGRATIONS_DIR);
  });

  it('rolls back PUT /api/entities on insert error (duplicate id)', () => {
    replaceAllEntities(db, [{ id: 'e1', name: 'Original', type: 'Company', status: 'Active', _v: 2 }]);
    const bad = [
      { id: 'dup', name: 'A', type: 'Company', status: 'Active' as const, _v: 2 },
      { id: 'dup', name: 'B', type: 'Company', status: 'Active' as const, _v: 2 },
    ];
    let threw = false;
    try {
      replaceAllEntities(db, bad);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    const rows = db.prepare('SELECT * FROM entities').all() as Array<{ name: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Original');
  });
});
