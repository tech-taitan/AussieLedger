/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { parseCurrency } from '../currencyParse';

describe('parseCurrency (IMP-08)', () => {
  it('parses "$1,234.56" to Decimal("1234.56") with high confidence', () => {
    const result = parseCurrency('$1,234.56');
    expect(result.decimal?.toString()).toBe('1234.56');
    expect(result.confidence).toBe('high');
  });

  it('parses "(1,234.56)" to Decimal("-1234.56") with high confidence', () => {
    const result = parseCurrency('(1,234.56)');
    expect(result.decimal?.toString()).toBe('-1234.56');
    expect(result.confidence).toBe('high');
  });

  it('parses "AUD 1234.56" to Decimal("1234.56") with high confidence', () => {
    const result = parseCurrency('AUD 1234.56');
    expect(result.decimal?.toString()).toBe('1234.56');
    expect(result.confidence).toBe('high');
  });

  it('parses "1,234.56 AUD" to Decimal("1234.56") with high confidence', () => {
    const result = parseCurrency('1,234.56 AUD');
    expect(result.decimal?.toString()).toBe('1234.56');
    expect(result.confidence).toBe('high');
  });

  it('parses "1234.56" to Decimal("1234.56") with high confidence', () => {
    const result = parseCurrency('1234.56');
    expect(result.decimal?.toString()).toBe('1234.56');
    expect(result.confidence).toBe('high');
  });

  it('parses "  1234.56  " (whitespace) to Decimal("1234.56") with high confidence', () => {
    const result = parseCurrency('  1234.56  ');
    expect(result.decimal?.toString()).toBe('1234.56');
    expect(result.confidence).toBe('high');
  });

  it('parses " $ -1,234.56 " to Decimal("-1234.56") with high confidence', () => {
    const result = parseCurrency(' $ -1,234.56 ');
    expect(result.decimal?.toString()).toBe('-1234.56');
    expect(result.confidence).toBe('high');
  });

  it('parses "1,234" (ambiguous AU/EU) to Decimal("1234") with LOW confidence', () => {
    const result = parseCurrency('1,234');
    expect(result.decimal?.toString()).toBe('1234');
    expect(result.confidence).toBe('low');
    expect(result.reason).toMatch(/ambiguous/);
  });

  it('parses "" (empty) to Decimal("0") with high confidence', () => {
    const result = parseCurrency('');
    expect(result.decimal?.toString()).toBe('0');
    expect(result.confidence).toBe('high');
  });

  it('parses "  " (whitespace-only) to Decimal("0") with high confidence', () => {
    const result = parseCurrency('  ');
    expect(result.decimal?.toString()).toBe('0');
    expect(result.confidence).toBe('high');
  });

  it('rejects "N/A" with decimal: null and reason "currency unparseable: N/A"', () => {
    const result = parseCurrency('N/A');
    expect(result.decimal).toBeNull();
    expect(result.confidence).toBe('low');
    expect(result.reason).toMatch(/currency unparseable: N\/A/);
  });

  it('rejects "pending" with decimal: null', () => {
    const result = parseCurrency('pending');
    expect(result.decimal).toBeNull();
    expect(result.confidence).toBe('low');
  });

  it('preserves 16-digit precision (round-trip "1234567890123456.78" identical, never via parseFloat/Number)', () => {
    const raw = '1234567890123456.78';
    const result = parseCurrency(raw);
    expect(result.decimal).not.toBeNull();
    // Critical: native parseFloat loses precision on 17+ sig figs. String round-trip must match exactly.
    expect(result.decimal!.toString()).toBe(raw);
    // Also: result must be a Decimal instance, not a number.
    expect(result.decimal).toBeInstanceOf(Decimal);
  });

  it('rejects "1.234,56" (EU format) with low confidence + reason "EU format detected"', () => {
    const result = parseCurrency('1.234,56');
    expect(result.decimal).toBeNull();
    expect(result.confidence).toBe('low');
    expect(result.reason).toMatch(/EU format detected/);
  });

  it('handles " (1234.56) " (leading-space paren — Excel Accounting format) correctly', () => {
    const result = parseCurrency(' (1234.56) ');
    expect(result.decimal?.toString()).toBe('-1234.56');
    expect(result.confidence).toBe('high');
  });
});
