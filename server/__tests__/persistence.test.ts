/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';
// Phase 3 Plan 03-3 implements `server/db/client.ts` and the routes.

describe('SQLite persistence (FND-01)', () => {
  it.todo('survives restart: write entity → close DB → reopen → entity still present');
  it.todo('whole-collection replace via PUT /api/entities is atomic');
  it.todo('WAL mode enabled (pragma journal_mode = WAL)');
  it.todo('foreign keys enabled (pragma foreign_keys = ON)');
});
