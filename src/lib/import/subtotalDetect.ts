/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure-function subtotal detector.
 * Flags rows by keyword OR sum-pattern (within ±SUM_TOLERANCE_AUD).
 * Section boundary = blank row OR account-code-prefix change.
 * Sum-pattern wins on coded rows (catches Xero's "4999 Total Revenue" pattern).
 */
import Decimal from 'decimal.js';

/** Tunable tolerance constant for sum-pattern matching. */
export const SUM_TOLERANCE_AUD = '0.01';

/**
 * Subtotal keyword regex — word-boundary aware, case-insensitive.
 * Matches AU-specific phrases: GST Collected, Trial Balance Total, Net Assets, Net Profit, Net Loss.
 */
export const SUBTOTAL_KEYWORD_RE =
  /\b(total|sum|net|grand\s+total|subtotal|sub[-\s]?total|gst\s+collected|trial\s+balance\s+total|net\s+assets|net\s+profit|net\s+loss)\b/i;

export interface ImportRow {
  rowIndex: number;
  code: string;
  name: string;
  debit: Decimal | null;
  credit: Decimal | null;
  rawDebit: string;
  rawCredit: string;
}

export interface SubtotalFlag {
  rowIndex: number;
  reason: 'keyword' | 'sum-pattern' | 'keyword+sum-pattern';
  keyword?: string;
  sumOf?: number[];
}

/** A row is blank when all four identifying fields are empty or zero. */
function isBlankRow(row: ImportRow): boolean {
  const codeBlank = !row.code || row.code.trim() === '';
  const nameBlank = !row.name || row.name.trim() === '';
  const debitZero = !row.debit || row.debit.isZero();
  const creditZero = !row.credit || row.credit.isZero();
  return codeBlank && nameBlank && debitZero && creditZero;
}

/**
 * Extract the code prefix (first character of the part before the first hyphen).
 * MYOB-aware: "1-1100" → "1". Standard "4100" → "4".
 */
function codePrefix(code: string): string {
  if (!code) return '';
  const beforeHyphen = code.split('-')[0] ?? '';
  return beforeHyphen[0] ?? '';
}

/**
 * Split a flat row list into sections.
 * A new section starts when:
 *   1. A blank row is encountered (blank row itself is discarded), OR
 *   2. The account-code prefix changes from the previous row.
 */
function splitIntoSections(rows: ImportRow[]): ImportRow[][] {
  const sections: ImportRow[][] = [];
  let current: ImportRow[] = [];

  for (const row of rows) {
    if (isBlankRow(row)) {
      if (current.length > 0) sections.push(current);
      current = [];
      continue;
    }

    // Code-prefix change boundary.
    if (current.length > 0 && row.code && current[current.length - 1].code) {
      const prevPrefix = codePrefix(current[current.length - 1].code);
      const currPrefix = codePrefix(row.code);
      if (prevPrefix && currPrefix && prevPrefix !== currPrefix) {
        sections.push(current);
        current = [];
      }
    }

    current.push(row);
  }

  if (current.length > 0) sections.push(current);
  return sections;
}

/**
 * Check whether the candidate row's debit or credit is the sum of preceding rows
 * within the same section, within ±SUM_TOLERANCE_AUD.
 *
 * Returns the rowIndexes of the rows that sum to the candidate, or null if no match.
 * Sum-pattern wins on coded rows (no code-presence filter).
 */
function isSumPattern(
  candidate: ImportRow,
  precedingRows: ImportRow[],
): number[] | null {
  if (precedingRows.length === 0) return null;
  const tol = new Decimal(SUM_TOLERANCE_AUD);
  const cDebit = candidate.debit ?? new Decimal('0');
  const cCredit = candidate.credit ?? new Decimal('0');

  // Try matching debit sum.
  const debitRows = precedingRows.filter((r) => r.debit && !r.debit.isZero());
  if (debitRows.length > 0 && !cDebit.isZero()) {
    const debitSum = debitRows.reduce(
      (acc, r) => acc.plus(r.debit!),
      new Decimal('0'),
    );
    if (debitSum.minus(cDebit).abs().lte(tol)) {
      return debitRows.map((r) => r.rowIndex);
    }
  }

  // Try matching credit sum.
  const creditRows = precedingRows.filter((r) => r.credit && !r.credit.isZero());
  if (creditRows.length > 0 && !cCredit.isZero()) {
    const creditSum = creditRows.reduce(
      (acc, r) => acc.plus(r.credit!),
      new Decimal('0'),
    );
    if (creditSum.minus(cCredit).abs().lte(tol)) {
      return creditRows.map((r) => r.rowIndex);
    }
  }

  return null;
}

/**
 * Detect subtotal rows in a flat ImportRow list.
 * Each returned SubtotalFlag identifies a row by its original rowIndex.
 */
export function detectSubtotals(rows: ImportRow[]): SubtotalFlag[] {
  const flags: SubtotalFlag[] = [];
  const sections = splitIntoSections(rows);

  for (const section of sections) {
    for (let i = 0; i < section.length; i++) {
      const row = section[i];
      const kwMatch = SUBTOTAL_KEYWORD_RE.exec(row.name);
      const preceding = section.slice(0, i);
      const sumIxs = isSumPattern(row, preceding);

      if (kwMatch && sumIxs) {
        flags.push({
          rowIndex: row.rowIndex,
          reason: 'keyword+sum-pattern',
          keyword: kwMatch[0],
          sumOf: sumIxs,
        });
      } else if (kwMatch) {
        flags.push({ rowIndex: row.rowIndex, reason: 'keyword', keyword: kwMatch[0] });
      } else if (sumIxs) {
        flags.push({ rowIndex: row.rowIndex, reason: 'sum-pattern', sumOf: sumIxs });
      }
    }
  }

  return flags;
}
