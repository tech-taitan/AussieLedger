/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure-function split-column detector + merger + regex signature generator.
 * Detects when account code and name are in separate columns and merges them.
 * Also generates regex signatures for "Apply to similar" bulk-fix feature.
 */

/** Fraction of empty code-column cells above which we consider codes "missing". */
export const MISSING_CODE_THRESHOLD = 0.5;

const CODE_HEADER_RE =
  /^(code|account\s*code|acct|acc\.?\s*no\.?|account\s*no\.?|account\s*number)/i;

const NAME_HEADER_RE = /^(name|account\s*name|description|account$)/i;

export interface ColumnDetectResult {
  hasSplitColumns: boolean;
  codeColHeader: string | null;
  nameColHeader: string | null;
  missingCodeFraction: number;
}

/** Return all values for a given header column. */
function columnValues(rows: Record<string, string>[], header: string): string[] {
  return rows.map((r) => (r[header] ?? '').toString());
}

/**
 * Heuristic: does this column look like account codes?
 * Code-like = > 70% of non-empty cells are short alphanumeric (length 2-8).
 */
function isCodeLike(values: string[]): boolean {
  const nonEmpty = values.filter((v) => v.trim() !== '');
  if (nonEmpty.length === 0) return false;
  const shortAlphanumeric = nonEmpty.filter((v) => /^[\w-]{2,8}$/.test(v.trim()));
  return shortAlphanumeric.length / nonEmpty.length > 0.7;
}

/**
 * Heuristic: does this column look like account names?
 * Name-like = average length of non-empty cells > 8 characters.
 */
function isNameLike(values: string[]): boolean {
  const nonEmpty = values.filter((v) => v.trim() !== '');
  if (nonEmpty.length === 0) return false;
  const avgLen = nonEmpty.reduce((acc, v) => acc + v.trim().length, 0) / nonEmpty.length;
  return avgLen > 8;
}

/**
 * Detect whether headers + rows suggest separate code and name columns.
 * Handles Xero's reversed column order (name first, then code) and QBO name-only exports.
 *
 * Falls back to value-shape heuristic when headers are ambiguous (no obvious match).
 */
export function detectSplitColumns(
  headers: string[],
  rows: Record<string, string>[],
): ColumnDetectResult {
  let codeCol = headers.find((h) => CODE_HEADER_RE.test(h.trim())) ?? null;
  let nameCol = headers.find((h) => NAME_HEADER_RE.test(h.trim())) ?? null;

  // Fallback to value-shape heuristic when header names are ambiguous.
  if (!codeCol && nameCol) {
    // Name matched but code didn't — scan others for code-like values.
    const others = headers.filter((h) => h !== nameCol);
    codeCol = others.find((h) => isCodeLike(columnValues(rows, h))) ?? null;
  } else if (!nameCol && codeCol) {
    // Code matched but name didn't — scan others for name-like values.
    const others = headers.filter((h) => h !== codeCol);
    nameCol = others.find((h) => isNameLike(columnValues(rows, h))) ?? null;
  } else if (!codeCol && !nameCol) {
    // Neither header matched — try value-shape heuristic on all non-numeric columns.
    const numericRE = /^(debit|credit|amount|balance|dr|cr)$/i;
    const candidates = headers.filter((h) => !numericRE.test(h.trim()));
    codeCol = candidates.find((h) => isCodeLike(columnValues(rows, h))) ?? null;
    if (codeCol) {
      const others = candidates.filter((h) => h !== codeCol);
      nameCol = others.find((h) => isNameLike(columnValues(rows, h))) ?? null;
    }
  }

  const hasSplitColumns = !!codeCol && !!nameCol;

  let missingCodeFraction = 0;
  if (codeCol) {
    const vals = columnValues(rows, codeCol);
    const empty = vals.filter((v) => v.trim() === '').length;
    missingCodeFraction = vals.length === 0 ? 0 : empty / vals.length;
  }

  return {
    hasSplitColumns,
    codeColHeader: codeCol,
    nameColHeader: nameCol,
    missingCodeFraction,
  };
}

/**
 * Merge code and name columns into a new `__merged_code_name` column.
 * Returns a NEW array of rows — original columns are preserved (additive merge).
 * Default separator is ' — ' (em-dash with spaces).
 */
export function mergeColumns(
  rows: Record<string, string>[],
  codeCol: string,
  nameCol: string,
  separator = ' — ',
): Record<string, string>[] {
  return rows.map((r) => {
    const code = (r[codeCol] ?? '').toString().trim();
    const name = (r[nameCol] ?? '').toString().trim();
    const merged = code && name ? `${code}${separator}${name}` : code || name;
    return { ...r, __merged_code_name: merged };
  });
}

/**
 * Derive a regex signature from a failing cell value.
 * Used for "Apply this fix to similar rows" feature — identifies cells with the same shape.
 *
 * Algorithm (order matters):
 *   1. Escape all regex special characters.
 *   2. Generalise digit sequences: \d+
 *   3. Generalise letter sequences: [A-Za-z]+
 *
 * Example: '$1,234.56 X' → '\\$\\d+,\\d+\\.\\d+ [A-Za-z]+'
 * Example: 'AUD 1234'    → '[A-Za-z]+ \\d+'
 */
export function deriveRegexSignature(failingCellValue: string): string {
  // Step 1: escape all regex special characters.
  // Step 2: generalise standalone digit sequences → \d+
  // Step 3: generalise letter sequences that are NOT preceded by a backslash
  //         (avoids replacing the 'd' in '\d+' that step 2 just inserted).
  const escaped = failingCellValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withDigits = escaped.replace(/\d+/g, '\\d+');
  // Use negative lookbehind to skip the 'd' in '\d+'.
  const withLetters = withDigits.replace(/(?<!\\)[a-zA-Z]+/g, '[A-Za-z]+');
  return withLetters;
}
