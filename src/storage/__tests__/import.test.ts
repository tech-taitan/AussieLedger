/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';
// Phase 3 Plan 03-2 will implement importAll() on LocalAdapter.

describe('Import round-trip (FND-03)', () => {
  it.todo('round-trip: export → fresh adapter → importAll → exportAll equal');
  it.todo('importAll on populated adapter replaces all collections atomically');
  it.todo('importAll runs Zod validation (PersistedRootSchema from src/lib/schemas.ts) before write');
  it.todo('importAll passes input through migrate() ladder first');
});
