/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';
import { detectHeaderRow, AUTO_PICK_THRESHOLD, mergeHeaderRows } from '../headerDetect';

// Reference the imports so eslint/tsc don't complain about unused.
void detectHeaderRow; void AUTO_PICK_THRESHOLD; void mergeHeaderRows;

describe('detectHeaderRow (IMP-07)', () => {
  it.todo('scores row 0 as header correctly on clean fixture (no title rows above)');
  it.todo('returns row 4 for Xero messy fixture (3-4 title rows above)');
  it.todo('merges 2-row header into composite labels ("Account/Code", "Account/Name")');
  it.todo('returns autoPickRow: null when top-candidate confidence < 0.60');
  it.todo('returns top-3 candidates sorted by confidence descending');
  it.todo('disqualifies rows with fewer than 3 non-empty cells from being a header');
  it.todo('exports AUTO_PICK_THRESHOLD = 0.60 as a tunable constant');
});

describe('mergeHeaderRows (IMP-07)', () => {
  it.todo('joins two header rows with " / " preserving empty cells correctly');
});
