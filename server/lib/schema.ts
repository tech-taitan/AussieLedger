/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side Zod schemas. THIN RE-EXPORT from the canonical SPA module
 * (src/lib/schemas.ts, created in Plan 03-1). Single source of truth —
 * SPA `importAll()` validation AND server `POST /api/import` validation
 * use the same schemas.
 *
 * If a server-only schema is ever needed, add it here without disturbing
 * the shared exports.
 */
export {
  EntitySchema,
  AccountSchema,
  JournalLineSchema,
  JournalEntrySchema,
  AuditLogSchema,
  PersistedRootSchema,
  type ValidatedEntity,
  type ValidatedAccount,
  type ValidatedJournalEntry,
  type ValidatedAuditLog,
  type ValidatedPersistedRoot,
} from '../../src/lib/schemas.js';
