/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';

describe('POST /api/import Zod validation (FND-03)', () => {
  it.todo('rejects malformed body with 400 and { error: "validation", details: ... }');
  it.todo('accepts valid PersistedRoot');
  it.todo('runs migrate() before validation (older _v accepted)');
  it.todo('refuses _v > CURRENT_VERSION with 400');
  it.todo('uses PersistedRootSchema from src/lib/schemas.ts (shared with SPA)');
});
