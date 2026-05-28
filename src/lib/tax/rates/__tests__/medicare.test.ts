/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { Decimal } from '../../../money';
import { medicareLevySingle, medicareLevySurcharge, medicareLevyFY2026 } from '../fy2026/medicare';

describe('medicareLevySingle', () => {
  it('zero below lower threshold (27222)', () => {
    expect(medicareLevySingle(new Decimal('27222')).toString()).toBe('0');
  });

  it('zero well below threshold (20000)', () => {
    expect(medicareLevySingle(new Decimal('20000')).toString()).toBe('0');
  });

  it('shade-in between lower and upper thresholds', () => {
    // At 30000: shade = (30000-27222)*0.10 = 277.8; full = 30000*0.02 = 600 → min(277.8, 600) = 277.80
    const levy = medicareLevySingle(new Decimal('30000'));
    expect(levy.toFixed(2)).toBe('277.80');
  });

  it('full 2% above upper threshold (34028)', () => {
    // 35000 * 0.02 = 700
    expect(medicareLevySingle(new Decimal('35000')).toFixed(2)).toBe('700.00');
  });

  it('full 2% on high income (100000)', () => {
    // 100000 * 0.02 = 2000
    expect(medicareLevySingle(new Decimal('100000')).toFixed(2)).toBe('2000.00');
  });
});

describe('medicareLevySurcharge', () => {
  it('zero when PHC held', () => {
    expect(medicareLevySurcharge(new Decimal('150000'), true).toString()).toBe('0');
  });

  it('zero below tier 1 threshold (101000)', () => {
    expect(medicareLevySurcharge(new Decimal('100000'), false).toString()).toBe('0');
  });

  it('tier 1 rate (1%) between 101000 and 118000', () => {
    // 110000 * 0.01 = 1100
    expect(medicareLevySurcharge(new Decimal('110000'), false).toFixed(2)).toBe('1100.00');
  });

  it('tier 2 rate (1.25%) between 118000 and 144000', () => {
    // 130000 * 0.0125 = 1625
    expect(medicareLevySurcharge(new Decimal('130000'), false).toFixed(2)).toBe('1625.00');
  });

  it('tier 3 rate (1.5%) above 144000', () => {
    // 160000 * 0.015 = 2400
    expect(medicareLevySurcharge(new Decimal('160000'), false).toFixed(2)).toBe('2400.00');
  });

  it('family filing returns zero with family status (deferred)', () => {
    expect(medicareLevySurcharge(new Decimal('150000'), false, 'family').toString()).toBe('0');
  });
});

describe('medicareLevyFY2026', () => {
  it('returns levy + surcharge + basis for single no-PHC high income', () => {
    const result = medicareLevyFY2026({
      taxableIncome: new Decimal('150000'),
      hasPHC: false,
      filingStatus: 'single',
    });
    expect(result.levy.toFixed(2)).toBe('3000.00'); // 150000 * 0.02
    expect(result.surcharge.toFixed(2)).toBe('2250.00'); // 150000 * 0.015 (tier 3)
    expect(result.basis).toMatch(/MLS/);
    expect(result.familyWarning).toBeUndefined();
  });

  it('family filing returns flat-2% levy with familyWarning', () => {
    const result = medicareLevyFY2026({
      taxableIncome: new Decimal('80000'),
      hasPHC: false,
      filingStatus: 'family',
    });
    expect(result.levy.toFixed(2)).toBe('1600.00'); // 80000 * 0.02 flat
    expect(result.familyWarning).toMatch(/family thresholds not yet supported/);
  });
});
