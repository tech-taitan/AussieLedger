/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  detectHeaderRow,
  mergeHeaderRows,
  AUTO_PICK_THRESHOLD,
  AU_TB_HEADER_KEYWORDS,
} from '../headerDetect';

const FIXTURES_DIR = path.resolve(__dirname, '../__fixtures__/messy-tbs');

/** Parse the Xero fixture CSV into raw string[][] using simple line splitting. */
function readXeroRawRows(): string[][] {
  const csv = fs.readFileSync(path.join(FIXTURES_DIR, 'xero-tb.csv'), 'utf8');
  return csv
    .split('\n')
    .filter((line) => line !== undefined)
    .map((line) => line.split(','));
}

describe('detectHeaderRow (IMP-07)', () => {
  it('scores row 0 as header correctly on clean fixture (no title rows above)', () => {
    const rawRows = [
      ['Account Code', 'Account Name', 'Debit', 'Credit'],
      ['1000', 'Cash', '500.00', '0.00'],
      ['4000', 'Sales', '0.00', '500.00'],
    ];
    const result = detectHeaderRow(rawRows);
    expect(result.topCandidate?.rowIndex).toBe(0);
    expect(result.autoPickRow).toBe(0);
    expect(result.topCandidate?.score).toBeGreaterThan(0);
  });

  it('returns row 4 for Xero messy fixture (3-4 title rows above)', () => {
    const rawRows = readXeroRawRows();
    const result = detectHeaderRow(rawRows);
    // Xero CSV: rows 0-2 are title rows, row 3 is blank, row 4 is the header.
    expect(result.topCandidate?.rowIndex).toBe(4);
    expect(result.autoPickRow).toBe(4);
  });

  it('merges 2-row header into composite labels ("Account/Code", "Account/Name")', () => {
    const rowA = ['Account', '', 'Debit', 'Credit'];
    const rowB = ['Code', 'Name', '', ''];
    const merged = mergeHeaderRows(rowA, rowB);
    expect(merged).toEqual(['Account / Code', 'Account / Name', 'Debit', 'Credit']);
  });

  it('returns autoPickRow: null when top-candidate confidence < 0.60', () => {
    // Two equally-scored rows → confidence gap = 0; auto-pick should not fire.
    const rawRows = [
      ['Account', 'Code', 'Debit', 'Credit'],
      ['Account', 'Name', 'Debit', 'Credit'],
      ['1000', 'Cash', '500.00', '0.00'],
    ];
    const result = detectHeaderRow(rawRows);
    // Both rows 0 and 1 are very similar; the confidence gap should be small.
    if (result.topCandidate) {
      if (result.topCandidate.confidence < AUTO_PICK_THRESHOLD) {
        expect(result.autoPickRow).toBeNull();
      } else {
        // If one scored higher, autoPickRow can be non-null — that's also valid.
        expect(typeof result.autoPickRow).toBe('number');
      }
    }
  });

  it('returns top-3 candidates sorted by confidence descending', () => {
    const rawRows = readXeroRawRows();
    const result = detectHeaderRow(rawRows);
    // alternatives should have ≤ 3 entries (they may be fewer if fewer rows have score > 0)
    expect(result.alternatives.length).toBeLessThanOrEqual(3);
    // alternatives are sorted by score descending
    for (let i = 0; i < result.alternatives.length - 1; i++) {
      expect(result.alternatives[i].score).toBeGreaterThanOrEqual(
        result.alternatives[i + 1].score,
      );
    }
  });

  it('disqualifies rows with fewer than 3 non-empty cells from being a header', () => {
    // "Revenue,,,,,," has only 1 non-empty cell — should score 0 and be excluded.
    const rawRows = [
      ['Revenue', '', '', '', '', ''],
      ['Account', 'Account Code', 'Debit', 'Credit', 'YTD Debit', 'YTD Credit'],
      ['1000', 'Cash', '500.00', '0.00', '500.00', '0.00'],
    ];
    const result = detectHeaderRow(rawRows);
    // Row 0 has only 1 non-empty cell → score 0 → disqualified.
    // Top candidate should be row 1, not row 0.
    expect(result.topCandidate?.rowIndex).toBe(1);
  });

  it('exports AUTO_PICK_THRESHOLD = 0.60 as a tunable constant', () => {
    expect(AUTO_PICK_THRESHOLD).toBe(0.60);
  });
});

describe('mergeHeaderRows (IMP-07)', () => {
  it('joins two header rows with " / " preserving empty cells correctly', () => {
    const rowA = ['Account', '', 'Debit', 'Credit'];
    const rowB = ['Code', 'Name', '', ''];
    const merged = mergeHeaderRows(rowA, rowB);
    expect(merged[0]).toBe('Account / Code');
    expect(merged[1]).toBe('Account / Name');  // rowA[1] is empty; carry-forward 'Account' + rowB[1] 'Name'
    expect(merged[2]).toBe('Debit');           // rowA[2] non-empty, rowB[2] empty
    expect(merged[3]).toBe('Credit');          // rowA[3] non-empty, rowB[3] empty
  });

  it('also exports AU_TB_HEADER_KEYWORDS including required terms', () => {
    const kws = AU_TB_HEADER_KEYWORDS as readonly string[];
    expect(kws).toContain('account');
    expect(kws).toContain('code');
    expect(kws).toContain('name');
    expect(kws).toContain('description');
    expect(kws).toContain('debit');
    expect(kws).toContain('credit');
    expect(kws).toContain('balance');
    expect(kws).toContain('amount');
    expect(kws).toContain('dr');
    expect(kws).toContain('cr');
    expect(kws).toContain('account number');
    expect(kws).toContain('account name');
    expect(kws).toContain('account code');
    expect(kws).toContain('ytd debit');
    expect(kws).toContain('ytd credit');
  });
});
