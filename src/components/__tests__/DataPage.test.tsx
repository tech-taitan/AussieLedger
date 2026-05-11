/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';
// Phase 3 Plan 03-4 will implement DataPage.tsx.

describe('DataPage (FND-02 / FND-03 UI)', () => {
  it.todo('renders Export button');
  it.todo('renders Import file picker');
  it.todo('shows current adapter kind ("Local (IndexedDB)" or "Server (SQLite)")');
  it.todo('shows current schema version');
  it.todo('shows last-export timestamp from meta store');
  it.todo('shows empty-state copy when no exports yet');
  it.todo('import on empty: single confirmation, then importAll fires');
  it.todo('import with existing data: REPLACE confirmation required (literal uppercase, case-sensitive)');
  it.todo('rejects REPLACE when user types wrong text (case mismatch or partial)');
  it.todo('Export action downloads file named aussieledger-YYYY-MM-DD-HHmm.json');
  it.todo('renders adapter-fallback banner when probe attempted and exhausted');
});
