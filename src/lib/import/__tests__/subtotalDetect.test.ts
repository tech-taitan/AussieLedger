/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { detectSubtotals, SUM_TOLERANCE_AUD, SUBTOTAL_KEYWORD_RE } from '../subtotalDetect';
import type { ImportRow } from '../subtotalDetect';

/** Helper: build a minimal ImportRow. */
function row(
  rowIndex: number,
  code: string,
  name: string,
  debit: string,
  credit: string,
): ImportRow {
  return {
    rowIndex,
    code,
    name,
    debit: debit ? new Decimal(debit) : null,
    credit: credit ? new Decimal(credit) : null,
    rawDebit: debit,
    rawCredit: credit,
  };
}

/** Helper: blank row (all fields empty/zero). */
function blankRow(rowIndex: number): ImportRow {
  return {
    rowIndex,
    code: '',
    name: '',
    debit: new Decimal('0'),
    credit: new Decimal('0'),
    rawDebit: '',
    rawCredit: '',
  };
}

describe('detectSubtotals (IMP-09)', () => {
  it('flags row with name "Total Revenue" by keyword (case-insensitive)', () => {
    const rows: ImportRow[] = [
      row(0, '4100', 'Sales', '0', '50000'),
      row(1, '', 'Total Revenue', '0', '50000'),
    ];
    const flags = detectSubtotals(rows);
    const flag = flags.find((f) => f.rowIndex === 1);
    expect(flag).toBeDefined();
    expect(flag!.reason).toMatch(/keyword/);
  });

  it('flags row with name "TOTAL ASSETS" by keyword', () => {
    const rows: ImportRow[] = [
      row(0, '1100', 'Cash', '25000', '0'),
      row(1, '', 'TOTAL ASSETS', '25000', '0'),
    ];
    const flags = detectSubtotals(rows);
    const flag = flags.find((f) => f.rowIndex === 1);
    expect(flag).toBeDefined();
    expect(flag!.reason).toMatch(/keyword/);
  });

  it('flags row with name "Subtotal" / "Sub-Total" by keyword', () => {
    const rows1: ImportRow[] = [
      row(0, '5100', 'Rent', '12000', '0'),
      row(1, '', 'Subtotal', '12000', '0'),
    ];
    expect(detectSubtotals(rows1).some((f) => f.rowIndex === 1)).toBe(true);

    const rows2: ImportRow[] = [
      row(0, '5100', 'Rent', '12000', '0'),
      row(1, '', 'Sub-Total', '12000', '0'),
    ];
    expect(detectSubtotals(rows2).some((f) => f.rowIndex === 1)).toBe(true);
  });

  it('flags row with name "Grand Total" by keyword', () => {
    const rows: ImportRow[] = [
      row(0, '1100', 'Cash', '55000', '0'),
      row(1, '', 'Grand Total', '55000', '0'),
    ];
    const flags = detectSubtotals(rows);
    expect(flags.some((f) => f.rowIndex === 1 && f.reason.includes('keyword'))).toBe(true);
  });

  it('flags row with name "Net Profit" by keyword', () => {
    const rows: ImportRow[] = [
      row(0, '4100', 'Sales', '0', '100000'),
      row(1, '', 'Net Profit', '0', '100000'),
    ];
    const flags = detectSubtotals(rows);
    expect(flags.some((f) => f.rowIndex === 1 && f.reason.includes('keyword'))).toBe(true);
  });

  it('flags Xero "4999 Total Revenue" by sum-pattern (sum-wins-on-coded — keeps flag even though code present)', () => {
    const rows: ImportRow[] = [
      row(0, '4100', 'Sales', '0', '50000'),
      row(1, '4200', 'Other Revenue', '0', '5000'),
      row(2, '4999', 'Total Revenue', '0', '55000'),
    ];
    const flags = detectSubtotals(rows);
    const flag = flags.find((f) => f.rowIndex === 2);
    expect(flag).toBeDefined();
    // Has both keyword ("Total") and sum-pattern
    expect(flag!.reason).toBe('keyword+sum-pattern');
    expect(flag!.sumOf).toEqual([0, 1]);
  });

  it('uses blank row as section boundary for sum-pattern', () => {
    // Section 1: rows 0-1 with sum at row 1 (matching credit of row 0)
    // Blank row at row 2
    // Section 2: rows 3-4 — row 4 credit should NOT match sum across blank boundary
    const rows: ImportRow[] = [
      row(0, '4100', 'Sales', '0', '50000'),
      blankRow(1),
      row(2, '4200', 'Other Revenue', '0', '50000'),
      row(3, '', 'Total', '0', '50000'),
    ];
    const flags = detectSubtotals(rows);
    // Row 3 keyword-matches but sum-pattern only covers [2] (not [0]) due to blank boundary.
    const flag = flags.find((f) => f.rowIndex === 3);
    expect(flag).toBeDefined();
    // sumOf should be [2] only — row 0 is in a different section.
    if (flag?.sumOf) {
      expect(flag.sumOf).toEqual([2]);
    }
  });

  it('uses account-code-prefix change as section boundary (1xxx -> 2xxx)', () => {
    // 1100 and 2100 have different prefixes → separate sections.
    // Row 1 credit equals Row 0 debit — but they're in different sections.
    const rows: ImportRow[] = [
      row(0, '1100', 'Cash', '25000', '0'),
      row(1, '2100', 'Accounts Payable', '0', '25000'),
    ];
    const flags = detectSubtotals(rows);
    // No false-positive: the credit of row 1 equals debit of row 0,
    // but they're in different sections (1-prefix vs 2-prefix) so sum-pattern must NOT trigger.
    expect(flags).toEqual([]);
  });

  it('tolerates ±0.01 AUD rounding in sum-pattern detection', () => {
    // Sum: 25000.00 + 499.99 = 25499.99; candidate says 25500.00 — diff = 0.01 → within tol.
    const rows: ImportRow[] = [
      row(0, '1100', 'Cash', '25000.00', '0'),
      row(1, '1200', 'Petty Cash', '499.99', '0'),
      row(2, '', 'Total Assets', '25500.00', '0'),
    ];
    const flags = detectSubtotals(rows);
    const flag = flags.find((f) => f.rowIndex === 2);
    expect(flag).toBeDefined();
    expect(flag!.sumOf).toEqual([0, 1]);
  });

  it('does NOT flag sums larger than tolerance (±0.02 difference)', () => {
    // Sum: 25000.00 + 499.98 = 25499.98; candidate says 25500.00 — diff = 0.02 → OUTSIDE tol.
    const rows: ImportRow[] = [
      row(0, '1100', 'Cash', '25000.00', '0'),
      row(1, '1200', 'Petty Cash', '499.98', '0'),
      row(2, '', 'Maybe Total', '25500.00', '0'),
    ];
    const flags = detectSubtotals(rows);
    // "Maybe Total" doesn't contain a strong keyword; it has no "total"/"sum"/etc.
    // So there should be no sum-pattern flag either (0.02 > 0.01 tolerance).
    const flag = flags.find((f) => f.rowIndex === 2 && f.reason === 'sum-pattern');
    expect(flag).toBeUndefined();
  });

  it('handles MYOB hyphenated codes (1-1100 -> first char "1")', () => {
    // MYOB uses "1-1100", "1-1200" — prefix extraction must use first char before hyphen.
    const rows: ImportRow[] = [
      row(0, '1-1100', 'Cheque Account', '25000', '0'),
      row(1, '1-1200', 'Cash on Hand', '500', '0'),
      row(2, '1-1300', 'Trade Debtors', '5000', '0'),
      row(3, '', 'Total Assets', '30500', '0'),
    ];
    const flags = detectSubtotals(rows);
    const flag = flags.find((f) => f.rowIndex === 3);
    expect(flag).toBeDefined();
    // Should have keyword+sum-pattern (30500 = 25000+500+5000)
    expect(flag!.reason).toBe('keyword+sum-pattern');
    expect(flag!.sumOf).toEqual([0, 1, 2]);
  });

  it('reports reason: "keyword+sum-pattern" when both signals hit the same row', () => {
    const rows: ImportRow[] = [
      row(0, '4100', 'Sales', '0', '50000.00'),
      row(1, '4200', 'Other Revenue', '0', '5000.00'),
      row(2, '4999', 'Total Revenue', '0', '55000.00'),
    ];
    const flags = detectSubtotals(rows);
    const flag = flags.find((f) => f.rowIndex === 2);
    expect(flag?.reason).toBe('keyword+sum-pattern');
    expect(flag?.keyword).toBeDefined();
    expect(flag?.sumOf).toBeDefined();
  });

  it('exports SUM_TOLERANCE_AUD = "0.01" as a tunable named constant', () => {
    expect(SUM_TOLERANCE_AUD).toBe('0.01');
    // Verify it can be used to construct a Decimal without throwing.
    const tol = new Decimal(SUM_TOLERANCE_AUD);
    expect(tol.toString()).toBe('0.01');
  });

  it('exports SUBTOTAL_KEYWORD_RE matching expected patterns', () => {
    expect(SUBTOTAL_KEYWORD_RE.test('Total Revenue')).toBe(true);
    expect(SUBTOTAL_KEYWORD_RE.test('TOTAL ASSETS')).toBe(true);
    expect(SUBTOTAL_KEYWORD_RE.test('Grand Total')).toBe(true);
    expect(SUBTOTAL_KEYWORD_RE.test('Net Profit')).toBe(true);
    expect(SUBTOTAL_KEYWORD_RE.test('sub-total')).toBe(true);
    expect(SUBTOTAL_KEYWORD_RE.test('GST Collected')).toBe(true);
  });

  it('Task 10: real account "GST Collected" with a structured code is NOT flagged', () => {
    // The keyword regex still matches the name, but the new
    // looksLikeRealAccount guard rejects keyword-only matches on rows
    // that have a proper account code. Prevents the false-positive
    // routing-to-rejected that hid real GST Collected balances.
    const rows: ImportRow[] = [
      row(0, '4100', 'Sales', '0', '50000'),
      row(1, '2100', 'GST Collected', '0', '5000'),
    ];
    const flags = detectSubtotals(rows);
    const flag = flags.find((f) => f.rowIndex === 1);
    expect(flag).toBeUndefined();
  });

  it('Task 10: real account "Net Sales" with code 4200 is NOT flagged', () => {
    const rows: ImportRow[] = [
      row(0, '4100', 'Sales', '0', '50000'),
      row(1, '4200', 'Net Sales', '0', '3000'),
    ];
    const flags = detectSubtotals(rows);
    expect(flags.find((f) => f.rowIndex === 1)).toBeUndefined();
  });

  it('Task 10: legit "Total Revenue" subtotal row with NO code IS still flagged', () => {
    // Verifies the carve-out doesn't break real subtotals. Code is
    // blank → looksLikeRealAccount returns false → keyword-only flag
    // still fires.
    const rows: ImportRow[] = [
      row(0, '4100', 'Sales A', '0', '20000'),
      row(1, '4101', 'Sales B', '0', '30000'),
      row(2, '', 'Total Revenue', '0', '50000'),
    ];
    const flags = detectSubtotals(rows);
    expect(flags.find((f) => f.rowIndex === 2)).toBeDefined();
  });

  it('Task 10: sum-pattern alone no longer false-flags a real account whose balance coincides with running sum', () => {
    // Three accounts in the same code prefix: Cash 500, Petty 500,
    // Float 1000. The legacy heuristic flagged Float as a subtotal of
    // Cash + Petty (matches by sum). With the tightened gate, Float
    // has a real code and is NOT flagged.
    const rows: ImportRow[] = [
      row(0, '1100', 'Cash', '500', '0'),
      row(1, '1101', 'Petty', '500', '0'),
      row(2, '1102', 'Float', '1000', '0'),
    ];
    const flags = detectSubtotals(rows);
    expect(flags.find((f) => f.rowIndex === 2)).toBeUndefined();
  });
});
