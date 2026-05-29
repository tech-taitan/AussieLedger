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

export interface ParseResult {
  decimal: Decimal | null;
  confidence: 'high' | 'low';
  reason?: string;
}

export function parseCurrency(_raw: string, _locale?: 'AU'): ParseResult {
  throw new Error('Not implemented — Plan 07-2 will implement parseCurrency');
}
