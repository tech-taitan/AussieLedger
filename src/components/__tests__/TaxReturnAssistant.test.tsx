/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Plan 05-2 test scaffolds for TaxReturnAssistant (Form I renderer).
 * All phase-5 tests are it.todo — Plan 05-2 flips them to full test bodies.
 */
import { describe, it } from 'vitest';

describe('TaxReturnAssistant — Phase 5 wiring', () => {
  it.todo('renders Form I with ATO codes and labels — P1/P2/P8/item15 visible with plain-English titles');
  it.todo('print button emits audit — EXPORT_DATA log with { form: I, fy: FY2026 }');
  it.todo('renders assumptions block — 5 assumed values present');
  it.todo('renders B and P schedule — P1/P2/P8/item15 + sub-labels visible');
  it.todo('shows item 7D when eligible — small-business offset line with $1,000-cap basis text');
  it.todo('anomalies inline and bottom section — AnomalyBadge component rendered per anomaly + consolidated list');
});
