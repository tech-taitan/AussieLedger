/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';
import { RejectedRowsPanel } from '../RejectedRowsPanel';
void RejectedRowsPanel;

describe('RejectedRowsPanel (IMP-09 + IMP-11)', () => {
  it.todo('renders banner "N rows rejected — review" with chevron expander');
  it.todo('groups rejected rows by reason — subtotal / currency-unparseable / no-account-code / low-confidence-parse / other');
  it.todo('within each reason group, rows sorted by original file rowIndex ascending');
  it.todo('per-row edit-in-place fires onUpdate(rowIndex, patch) on field change');
  it.todo('"Re-parse and include" button fires onReparse(rowIndex)');
  it.todo('"Apply this fix to similar rows" identifies similar by reason + regex signature, shows diff preview');
  it.todo('diff preview includes confirm + cancel; cancel leaves rows unchanged');
  it.todo('"Include all subtotals" bulk button fires onIncludeAllSubtotals (only renders when subtotal group non-empty)');
  it.todo('low-confidence-parse section starts COLLAPSED by default; clicking expander reveals rows');
  it.todo('renders test-id "rejected-rows-banner" so ImportReviewPane integration tests can query it');
});
