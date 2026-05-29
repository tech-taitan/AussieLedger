/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stub module — Plan 07-2 will implement this.
 * Created by Plan 07-1 (Wave 0 scaffold) so test files can import without
 * Vite module-resolution errors. All exports are no-op placeholders.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import Decimal from 'decimal.js';

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

export const SUM_TOLERANCE_AUD = '0.01';

export function detectSubtotals(_rows: ImportRow[]): SubtotalFlag[] {
  throw new Error('Not implemented — Plan 07-2 will implement detectSubtotals');
}
