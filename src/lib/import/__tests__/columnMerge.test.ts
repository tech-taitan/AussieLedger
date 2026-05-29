/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import {
  detectSplitColumns,
  mergeColumns,
  deriveRegexSignature,
  MISSING_CODE_THRESHOLD,
} from '../columnMerge';

describe('detectSplitColumns (IMP-10)', () => {
  it('detectSplitColumns identifies split code/name by header names ("Code"/"Account Name")', () => {
    const headers = ['Code', 'Account Name', 'Debit', 'Credit'];
    const rows = [
      { Code: '1100', 'Account Name': 'Cash', Debit: '500.00', Credit: '0.00' },
      { Code: '4000', 'Account Name': 'Sales', Debit: '0.00', Credit: '500.00' },
    ];
    const result = detectSplitColumns(headers, rows);
    expect(result.hasSplitColumns).toBe(true);
    expect(result.codeColHeader).toBe('Code');
    expect(result.nameColHeader).toBe('Account Name');
  });

  it('detectSplitColumns identifies split by header regex /account\\s*code/i', () => {
    const headers = ['Account Code', 'Account Name', 'Debit', 'Credit'];
    const rows = [
      { 'Account Code': '1100', 'Account Name': 'Cash', Debit: '500.00', Credit: '0.00' },
    ];
    const result = detectSplitColumns(headers, rows);
    expect(result.hasSplitColumns).toBe(true);
    expect(result.codeColHeader).toBe('Account Code');
    expect(result.nameColHeader).toBe('Account Name');
  });

  it('detectSplitColumns identifies split by value shape (short alphanumeric vs longer string) when headers ambiguous', () => {
    // Headers don't clearly identify code vs name — rely on value-shape heuristic.
    const headers = ['Col A', 'Col B', 'Debit', 'Credit'];
    const rows = [
      { 'Col A': '1100', 'Col B': 'Cash at Bank', Debit: '500.00', Credit: '0.00' },
      { 'Col A': '4000', 'Col B': 'Sales Revenue', Debit: '0.00', Credit: '500.00' },
      { 'Col A': '5100', 'Col B': 'Rent Expense', Debit: '100.00', Credit: '0.00' },
    ];
    const result = detectSplitColumns(headers, rows);
    // Col A values are short alphanumeric (code-like), Col B are longer strings (name-like).
    expect(result.hasSplitColumns).toBe(true);
    expect(result.codeColHeader).toBe('Col A');
    expect(result.nameColHeader).toBe('Col B');
  });

  it('detectSplitColumns returns hasSplitColumns: false when only one identifier column exists (QBO name-only)', () => {
    // QBO exports "Account" as a name-only column — no separate code column.
    const headers = ['Account', 'Debit', 'Credit'];
    const rows = [
      { Account: 'Cash at Bank', Debit: '500.00', Credit: '0.00' },
      { Account: 'Sales Revenue', Debit: '0.00', Credit: '500.00' },
    ];
    const result = detectSplitColumns(headers, rows);
    expect(result.hasSplitColumns).toBe(false);
    expect(result.codeColHeader).toBeNull();
  });

  it('detectSplitColumns returns missingCodeFraction > 0.5 when >50% of code-column cells are empty', () => {
    const headers = ['Code', 'Name', 'Debit', 'Credit'];
    const rows = [
      { Code: '1100', Name: 'Cash', Debit: '25000.00', Credit: '0.00' },
      { Code: '', Name: 'Total Assets', Debit: '25000.00', Credit: '0.00' },
      { Code: '', Name: 'Blank row name', Debit: '0.00', Credit: '0.00' },
    ];
    const result = detectSplitColumns(headers, rows);
    expect(result.hasSplitColumns).toBe(true);
    // 2 out of 3 code cells are empty → fraction = 2/3 ≈ 0.67 > 0.5.
    expect(result.missingCodeFraction).toBeGreaterThan(MISSING_CODE_THRESHOLD);
  });
});

describe('mergeColumns (IMP-10)', () => {
  it('mergeColumns produces combined "code — name" field with default em-dash separator', () => {
    const rows = [
      { Code: '1100', Name: 'Cash', Debit: '500.00', Credit: '0.00' },
      { Code: '4000', Name: 'Sales', Debit: '0.00', Credit: '500.00' },
    ];
    const merged = mergeColumns(rows, 'Code', 'Name');
    expect(merged[0].__merged_code_name).toBe('1100 — Cash');
    expect(merged[1].__merged_code_name).toBe('4000 — Sales');
  });

  it('mergeColumns accepts custom separator override', () => {
    const rows = [{ Code: '1100', Name: 'Cash', Debit: '500.00', Credit: '0.00' }];
    const merged = mergeColumns(rows, 'Code', 'Name', ' | ');
    expect(merged[0].__merged_code_name).toBe('1100 | Cash');
  });

  it('mergeColumns preserves all original columns (additive, returns new __merged_code_name key)', () => {
    const rows = [{ Code: '1100', Name: 'Cash', Debit: '500.00', Credit: '0.00' }];
    const merged = mergeColumns(rows, 'Code', 'Name');
    // Original columns preserved.
    expect(merged[0].Code).toBe('1100');
    expect(merged[0].Name).toBe('Cash');
    expect(merged[0].Debit).toBe('500.00');
    expect(merged[0].Credit).toBe('0.00');
    // New key added.
    expect(merged[0].__merged_code_name).toBe('1100 — Cash');
    // Row count unchanged.
    expect(merged.length).toBe(1);
  });
});

describe('deriveRegexSignature (IMP-11)', () => {
  it('deriveRegexSignature converts "$1,234.56 X" to "\\$\\d+,\\d+\\.\\d+ [A-Za-z]+"', () => {
    const sig = deriveRegexSignature('$1,234.56 X');
    expect(sig).toBe('\\$\\d+,\\d+\\.\\d+ [A-Za-z]+');
  });

  it('deriveRegexSignature converts "AUD 1234" to "[A-Za-z]+ \\d+"', () => {
    const sig = deriveRegexSignature('AUD 1234');
    expect(sig).toBe('[A-Za-z]+ \\d+');
  });

  it('deriveRegexSignature escapes regex special chars BEFORE generalising', () => {
    // '.' must be escaped as '\.' before generalisation turns it into something else.
    // '$' must become '\$' not '[A-Za-z]+'.
    const sig = deriveRegexSignature('$1.50');
    // $ → \$, 1 → \d+, . → \., 50 → \d+
    expect(sig).toBe('\\$\\d+\\.\\d+');
  });

  it('exports MISSING_CODE_THRESHOLD = 0.5', () => {
    expect(MISSING_CODE_THRESHOLD).toBe(0.5);
  });
});
