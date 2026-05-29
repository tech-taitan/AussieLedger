/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';
import { parseCurrency } from '../currencyParse';

// Reference the imports so eslint/tsc don't complain about unused.
void parseCurrency;

describe('parseCurrency (IMP-08)', () => {
  it.todo('parses "$1,234.56" to Decimal("1234.56") with high confidence');
  it.todo('parses "(1,234.56)" to Decimal("-1234.56") with high confidence');
  it.todo('parses "AUD 1234.56" to Decimal("1234.56") with high confidence');
  it.todo('parses "1,234.56 AUD" to Decimal("1234.56") with high confidence');
  it.todo('parses "1234.56" to Decimal("1234.56") with high confidence');
  it.todo('parses "  1234.56  " (whitespace) to Decimal("1234.56") with high confidence');
  it.todo('parses " $ -1,234.56 " to Decimal("-1234.56") with high confidence');
  it.todo('parses "1,234" (ambiguous AU/EU) to Decimal("1234") with LOW confidence');
  it.todo('parses "" (empty) to Decimal("0") with high confidence');
  it.todo('parses "  " (whitespace-only) to Decimal("0") with high confidence');
  it.todo('rejects "N/A" with decimal: null and reason "currency unparseable: N/A"');
  it.todo('rejects "pending" with decimal: null');
  it.todo('preserves 16-digit precision (round-trip "1234567890123456.78" identical, never via parseFloat/Number)');
  it.todo('rejects "1.234,56" (EU format) with low confidence + reason "EU format detected"');
  it.todo('handles " (1234.56) " (leading-space paren — Excel Accounting format) correctly');
});
