/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stub module — Plan 07-2 will implement this.
 * Created by Plan 07-1 (Wave 0 scaffold) so test files can import without
 * Vite module-resolution errors. All exports are no-op placeholders.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

export interface ColumnDetectResult {
  hasSplitColumns: boolean;
  codeColHeader: string | null;
  nameColHeader: string | null;
  missingCodeFraction: number;
}

export const MISSING_CODE_THRESHOLD = 0.5;

export function detectSplitColumns(
  _headers: string[],
  _rows: Record<string, string>[],
): ColumnDetectResult {
  throw new Error('Not implemented — Plan 07-2 will implement detectSplitColumns');
}

export function mergeColumns(
  _rows: Record<string, string>[],
  _codeCol: string,
  _nameCol: string,
  _separator?: string,
): Record<string, string>[] {
  throw new Error('Not implemented — Plan 07-2 will implement mergeColumns');
}

export function deriveRegexSignature(_failingCellValue: string): string {
  throw new Error('Not implemented — Plan 07-2 will implement deriveRegexSignature');
}
