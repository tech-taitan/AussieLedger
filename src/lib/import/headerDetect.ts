/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stub module — Plan 07-2 will implement this.
 * Created by Plan 07-1 (Wave 0 scaffold) so test files can import without
 * Vite module-resolution errors. All exports are no-op placeholders.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

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

export const AUTO_PICK_THRESHOLD = 0.60;

export function detectHeaderRow(
  _rawRows: string[][],
  _options?: { maxScanRows?: number },
): HeaderDetectResult {
  throw new Error('Not implemented — Plan 07-2 will implement detectHeaderRow');
}

export function mergeHeaderRows(_rowA: string[], _rowB: string[]): string[] {
  throw new Error('Not implemented — Plan 07-2 will implement mergeHeaderRows');
}
