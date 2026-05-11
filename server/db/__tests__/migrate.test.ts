/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigrations } from '../migrate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

describe('Server migration runner (DEP-02)', () => {
  let db: Database.Database;
  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
  });

  it('001-initial: creates 6 tables', () => {
    runMigrations(db, MIGRATIONS_DIR);
    const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as Array<{ name: string }>;
    const names = rows.map(r => r.name);
    for (const t of ['entities', 'accounts', 'journal_entries', 'journal_lines', 'audit_logs', 'schema_migrations']) {
      expect(names).toContain(t);
    }
  });

  it('001-initial: accounts_code_idx exists as unique index', () => {
    runMigrations(db, MIGRATIONS_DIR);
    const idx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='accounts_code_idx'").get() as { name: string } | undefined;
    expect(idx).toBeDefined();
    // PRAGMA index_list returns rows with a "unique" column (0 or 1) per index.
    const list = db.prepare("PRAGMA index_list('accounts')").all() as Array<{ name: string; unique: number }>;
    const accountsCodeIdx = list.find(r => r.name === 'accounts_code_idx');
    expect(accountsCodeIdx).toBeDefined();
    expect(accountsCodeIdx!.unique).toBe(1);
  });

  it('001-initial: journal_entries.entity_id FK CASCADE works', () => {
    runMigrations(db, MIGRATIONS_DIR);
    db.prepare(`INSERT INTO entities (id, name, type, status) VALUES (?, ?, ?, ?)`).run('e1', 'X', 'Company', 'Active');
    db.prepare(`INSERT INTO journal_entries (id, entity_id, date, reference, description, is_posted) VALUES (?, ?, ?, ?, ?, ?)`).run('j1', 'e1', '2026-01-01', 'R1', 'd', 1);
    db.prepare('DELETE FROM entities WHERE id = ?').run('e1');
    const remaining = db.prepare('SELECT COUNT(*) AS c FROM journal_entries').get() as { c: number };
    expect(remaining.c).toBe(0);
  });

  it('idempotent: second run is no-op', () => {
    runMigrations(db, MIGRATIONS_DIR);
    const before = (db.prepare('SELECT COUNT(*) AS c FROM schema_migrations').get() as { c: number }).c;
    runMigrations(db, MIGRATIONS_DIR);
    const after = (db.prepare('SELECT COUNT(*) AS c FROM schema_migrations').get() as { c: number }).c;
    expect(after).toBe(before);
  });

  it('records each applied migration with timestamp', () => {
    runMigrations(db, MIGRATIONS_DIR);
    const row = db.prepare('SELECT name, applied_at FROM schema_migrations WHERE name = ?').get('001-initial.sql') as { name: string; applied_at: string } | undefined;
    expect(row).toBeDefined();
    expect(row!.applied_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
