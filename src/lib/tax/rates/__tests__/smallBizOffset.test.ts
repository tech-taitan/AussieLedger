/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { Decimal } from '../../../money';
import { smallBusinessIncomeOffset } from '../fy2026/smallBizOffset';

describe('smallBusinessIncomeOffset', () => {
  it('caps at $1,000 when computed offset exceeds cap', () => {
    // netSbIncome = 100000, totalTaxableIncome = 100000, taxBeforeOffsets = 20000
    // taxOnSb = 20000 * (100000/100000) = 20000; raw = 20000 * 0.16 = 3200 → capped at 1000
    const result = smallBusinessIncomeOffset({
      netSbIncome: new Decimal('100000'),
      aggregatedTurnover: new Decimal('500000'),
      totalTaxableIncome: new Decimal('100000'),
      taxBeforeOffsets: new Decimal('20000'),
    });
    expect(result.offset.toFixed(2)).toBe('1000.00');
    expect(result.basis).toMatch(/capped at/);
  });

  it('16% of tax on SB income (below cap)', () => {
    // netSbIncome = 30000, totalTaxableIncome = 30000, taxBeforeOffsets = 1888
    // taxOnSb = 1888 * (30000/30000) = 1888; raw = 1888 * 0.16 = 302.08 (below cap)
    const result = smallBusinessIncomeOffset({
      netSbIncome: new Decimal('30000'),
      aggregatedTurnover: new Decimal('4000000'),
      totalTaxableIncome: new Decimal('30000'),
      taxBeforeOffsets: new Decimal('1888'),
    });
    expect(result.offset.toFixed(2)).toBe('302.08');
    expect(result.basis).not.toMatch(/capped at/);
  });

  it('zero when aggregated turnover at or above $5M', () => {
    const result = smallBusinessIncomeOffset({
      netSbIncome: new Decimal('30000'),
      aggregatedTurnover: new Decimal('5000000'),
      totalTaxableIncome: new Decimal('30000'),
      taxBeforeOffsets: new Decimal('1888'),
    });
    expect(result.offset.toString()).toBe('0');
    expect(result.basis).toMatch(/Not eligible/);
  });

  it('zero when SB income is zero', () => {
    const result = smallBusinessIncomeOffset({
      netSbIncome: new Decimal('0'),
      aggregatedTurnover: new Decimal('100000'),
      totalTaxableIncome: new Decimal('30000'),
      taxBeforeOffsets: new Decimal('1888'),
    });
    expect(result.offset.toString()).toBe('0');
    expect(result.basis).toMatch(/Not eligible/);
  });

  it('zero when SB income is negative', () => {
    const result = smallBusinessIncomeOffset({
      netSbIncome: new Decimal('-5000'),
      aggregatedTurnover: new Decimal('100000'),
      totalTaxableIncome: new Decimal('30000'),
      taxBeforeOffsets: new Decimal('1888'),
    });
    expect(result.offset.toString()).toBe('0');
  });

  it('partial SB share — apportions correctly', () => {
    // netSbIncome = 50000, totalTaxableIncome = 100000 (50% SB share)
    // taxBeforeOffsets = 10000; taxOnSb = 10000 × 0.5 = 5000; raw = 5000 × 0.16 = 800 (below cap)
    const result = smallBusinessIncomeOffset({
      netSbIncome: new Decimal('50000'),
      aggregatedTurnover: new Decimal('1000000'),
      totalTaxableIncome: new Decimal('100000'),
      taxBeforeOffsets: new Decimal('10000'),
    });
    expect(result.offset.toFixed(2)).toBe('800.00');
  });
});
