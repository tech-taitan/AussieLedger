/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';
// Phase 3 Plan 03-2 will wire migrate() to adapter.importAll/exportAll.

describe('Migration round-trip (success criterion #5)', () => {
  it.todo('hand-built _v:0 blob → migrate() → importAll → exportAll === migrated');
  it.todo('_v:0 fixture is the most-stale shape: no _v field, no partnershipTaxLabel, 3-code GST set');
  it.todo('no data loss across v0 → v1 → v2 ladder');
});
