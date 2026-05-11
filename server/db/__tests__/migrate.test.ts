/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';

describe('Server migration runner (DEP-02)', () => {
  it.todo('001-initial: creates entities, accounts, journal_entries, journal_lines, audit_logs, schema_migrations tables');
  it.todo('001-initial: accounts_code_idx exists as unique index');
  it.todo('001-initial: journal_entries.entity_id FK ON DELETE CASCADE');
  it.todo('runs migrations in alphabetical order');
  it.todo('idempotent: second run is no-op (no duplicate apply)');
  it.todo('records each applied migration in schema_migrations with timestamp');
  it.todo('throws on .sql syntax error and leaves transaction rolled back');
});
