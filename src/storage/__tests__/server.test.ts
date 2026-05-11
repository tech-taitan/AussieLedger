/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';
// Phase 3 Plan 03-3 will implement `ServerAdapter` (HTTP shim).
// import { ServerAdapter } from '../server';

describe('ServerAdapter (HTTP)', () => {
  it.todo('getEntities issues GET /api/entities and parses JSON');
  it.todo('saveEntities issues PUT /api/entities with JSON body');
  it.todo('appendAuditLog issues POST /api/audit');
  it.todo('saveAuditLogs issues PUT /api/audit with array body');
  it.todo('exportAll issues GET /api/export');
  it.todo('importAll issues POST /api/import');
  it.todo('throws AdapterUnreachableError on 500');
  it.todo('throws AdapterValidationError on 400');
  it.todo('deserialises Decimal-as-string TEXT values from server via src/lib/money.ts');
});
