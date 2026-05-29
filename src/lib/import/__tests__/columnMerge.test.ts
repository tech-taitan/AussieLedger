/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';
import { detectSplitColumns, mergeColumns, deriveRegexSignature } from '../columnMerge';

// Reference the imports so eslint/tsc don't complain about unused.
void detectSplitColumns; void mergeColumns; void deriveRegexSignature;

describe('detectSplitColumns (IMP-10)', () => {
  it.todo('detectSplitColumns identifies split code/name by header names ("Code"/"Account Name")');
  it.todo('detectSplitColumns identifies split by header regex /account\\s*code/i');
  it.todo('detectSplitColumns identifies split by value shape (short alphanumeric vs longer string) when headers ambiguous');
  it.todo('detectSplitColumns returns hasSplitColumns: false when only one identifier column exists (QBO name-only)');
  it.todo('detectSplitColumns returns missingCodeFraction > 0.5 when >50% of code-column cells are empty');
});

describe('mergeColumns (IMP-10)', () => {
  it.todo('mergeColumns produces combined "code — name" field with default em-dash separator');
  it.todo('mergeColumns accepts custom separator override');
  it.todo('mergeColumns preserves all original columns (additive, returns new __merged_code_name key)');
});

describe('deriveRegexSignature (IMP-11)', () => {
  it.todo('deriveRegexSignature converts "$1,234.56 X" to "\\$\\d+,\\d+\\.\\d+ [A-Za-z]+"');
  it.todo('deriveRegexSignature converts "AUD 1234" to "[A-Za-z]+ \\d+"');
  it.todo('deriveRegexSignature escapes regex special chars BEFORE generalising');
});
