/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure-function header-row detector.
 * Scores rows by string-density + AU TB header keyword hits.
 * Auto-picks the best candidate when confidence >= AUTO_PICK_THRESHOLD.
 * Returns top-3 alternatives for manual-pick fallback.
 */

export const AUTO_PICK_THRESHOLD = 0.60;
export const MIN_HEADER_COLS = 3;

const DENSITY_WEIGHT = 0.4;
const KEYWORD_WEIGHT = 0.6;
const DEFAULT_MAX_SCAN_ROWS = 15;

export const AU_TB_HEADER_KEYWORDS = [
  // Account identification
  'account', 'code', 'name', 'description', 'acc', 'acct',
  // Amounts
  'debit', 'credit', 'balance', 'amount', 'dr', 'cr',
  // MYOB-specific
  'account number', 'account name',
  // Xero-specific
  'account code', 'ytd debit', 'ytd credit',
] as const;

export interface HeaderCandidate {
  rowIndex: number;
  score: number;
  confidence: number;
  matchedKeywords: string[];
  stringDensity: number;
}

export interface HeaderDetectResult {
  topCandidate: HeaderCandidate | null;
  alternatives: HeaderCandidate[];
  autoPickRow: number | null;
  searchedRows: number;
}

/** Calculate the fraction of non-empty cells that are non-numeric strings. */
function calcStringDensity(row: string[]): number {
  const nonEmpty = row.filter((c) => c.trim() !== '');
  if (nonEmpty.length === 0) return 0;
  // A cell is "string" if it fails numeric parse (after stripping $, comma for AU currency)
  const strings = nonEmpty.filter((c) => isNaN(Number(c.replace(/[$,]/g, ''))));
  return strings.length / nonEmpty.length;
}

/** Return which AU TB header keywords are matched (case-insensitive partial-match). */
function matchKeywords(row: string[]): string[] {
  const matched: string[] = [];
  for (const cell of row) {
    const lc = cell.toLowerCase();
    for (const kw of AU_TB_HEADER_KEYWORDS) {
      if (lc.includes(kw) && !matched.includes(kw)) {
        matched.push(kw);
      }
    }
  }
  return matched;
}

/** Score a single row as a potential header row. */
function scoreRow(row: string[]): { score: number; matchedKeywords: string[]; stringDensity: number } {
  const nonEmpty = row.filter((c) => c.trim() !== '').length;
  if (nonEmpty < MIN_HEADER_COLS) {
    // Pitfall 5: disqualify single-text section headings (e.g. "Revenue,,,,,").
    return { score: 0, matchedKeywords: [], stringDensity: 0 };
  }
  const density = calcStringDensity(row);
  const matched = matchKeywords(row);
  const keywordFrac = Math.min(1, matched.length / AU_TB_HEADER_KEYWORDS.length);
  const score = density * DENSITY_WEIGHT + keywordFrac * KEYWORD_WEIGHT;
  return { score, matchedKeywords: matched, stringDensity: density };
}

/**
 * Detect the most likely header row in a raw string[][] matrix.
 * Scans up to `options.maxScanRows` rows (default 15).
 * Returns top candidate, up to 3 alternatives, and the auto-picked row index (or null).
 */
export function detectHeaderRow(
  rawRows: string[][],
  options?: { maxScanRows?: number },
): HeaderDetectResult {
  const maxScan = Math.min(rawRows.length, options?.maxScanRows ?? DEFAULT_MAX_SCAN_ROWS);
  const scored: HeaderCandidate[] = [];

  for (let i = 0; i < maxScan; i++) {
    const { score, matchedKeywords, stringDensity } = scoreRow(rawRows[i] ?? []);
    scored.push({ rowIndex: i, score, confidence: 0, matchedKeywords, stringDensity });
  }

  // Sort by score descending.
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const top = sorted[0] ?? null;
  const second = sorted[1] ?? null;

  // Confidence = relative gap between the top and second-best scores.
  if (top && top.score > 0) {
    top.confidence =
      second && second.score > 0 ? (top.score - second.score) / top.score : 1;
  }

  const autoPickRow =
    top && top.score > 0 && top.confidence >= AUTO_PICK_THRESHOLD ? top.rowIndex : null;

  return {
    topCandidate: top && top.score > 0 ? top : null,
    alternatives: sorted.slice(1, 4).filter((c) => c.score > 0),
    autoPickRow,
    searchedRows: maxScan,
  };
}

/**
 * Merge two adjacent header rows into one composite row.
 * When both rows have non-empty values at position i: join with " / ".
 * When only rowA has a value: use rowA's value.
 * When only rowB has a value: carry-forward the last non-empty rowA value as the prefix.
 *   (Handles Xero's "Account" in row N that spans sub-columns "Code" / "Name" in row N+1.)
 * When neither has a value: empty string.
 *
 * Example:
 *   rowA = ['Account', '', 'Debit', 'Credit']
 *   rowB = ['Code', 'Name', '', '']
 *   result = ['Account / Code', 'Account / Name', 'Debit', 'Credit']
 */
export function mergeHeaderRows(rowA: string[], rowB: string[]): string[] {
  const maxLen = Math.max(rowA.length, rowB.length);
  const merged: string[] = [];
  let lastRowAValue = '';

  for (let i = 0; i < maxLen; i++) {
    const a = (rowA[i] ?? '').trim();
    const b = (rowB[i] ?? '').trim();

    if (a) lastRowAValue = a;

    if (a && b) {
      merged.push(`${a} / ${b}`);
    } else if (a) {
      merged.push(a);
    } else if (b) {
      // Carry-forward: use the last non-empty rowA value as prefix for rowB sub-column.
      merged.push(lastRowAValue ? `${lastRowAValue} / ${b}` : b);
    } else {
      merged.push('');
    }
  }
  return merged;
}
