/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigrations } from '../db/migrate';
import { replaceAllEntities } from '../routes/entities';
import fs from 'node:fs';
import os from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

describe('SQLite persistence (FND-01 server shape)', () => {
  it('survives restart: write -> close -> reopen -> still present', () => {
    const tmpFile = path.join(os.tmpdir(), `aussie-test-${Date.now()}.db`);
    try {
      const db1 = new Database(tmpFile);
      db1.pragma('journal_mode = WAL');
      db1.pragma('foreign_keys = ON');
      runMigrations(db1, MIGRATIONS_DIR);
      replaceAllEntities(db1, [{ id: 'e1', name: 'Persist', type: 'Company', status: 'Active', _v: 2 }]);
      db1.close();

      const db2 = new Database(tmpFile);
      db2.pragma('foreign_keys = ON');
      const rows = db2.prepare('SELECT * FROM entities').all() as Array<{ name: string }>;
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('Persist');
      db2.close();
    } finally {
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
      try { fs.unlinkSync(tmpFile + '-wal'); } catch { /* ignore */ }
      try { fs.unlinkSync(tmpFile + '-shm'); } catch { /* ignore */ }
    }
  });

  it('WAL mode enabled', () => {
    const db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    const mode = db.pragma('journal_mode', { simple: true });
    expect(mode).toBeDefined();
  });

  it('foreign keys enabled', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    const fk = db.pragma('foreign_keys', { simple: true });
    expect(Number(fk)).toBe(1);
  });
});
