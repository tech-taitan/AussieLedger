/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';
import { HeaderRowPicker } from '../HeaderRowPicker';
void HeaderRowPicker;

describe('HeaderRowPicker (IMP-07 UI)', () => {
  it.todo('renders preview with auto-pick row highlighted (bg-blue-50)');
  it.todo('clicking any row in preview fires onPick(rowIndex)');
  it.todo('low-confidence path (autoPickRow: null) shows "Pick the header row" prompt + top-3 candidates with scores');
  it.todo('high-confidence path shows "We think row N is the header" with confidence percentage badge');
  it.todo('"pick a different row" link reveals top-3 alternatives');
  it.todo('Cancel link fires onCancel');
  it.todo('shows merged-header preview when two consecutive rows both qualify as header-like');
});
