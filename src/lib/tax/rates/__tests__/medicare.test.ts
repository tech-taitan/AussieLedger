/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { Decimal } from '../../../money';
import { medicareLevySingle, medicareLevySurcharge, medicareLevyFY2026 } from '../fy2026/medicare';
import {
  MEDICARE_LEVY_FAMILY_LOWER,
  MEDICARE_LEVY_FAMILY_UPPER,
  MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER,
  MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER,
  MLS_FAMILY_DEPENDANT_INCREMENT,
} from '../../labels/fy2026';

describe('medicareLevySingle', () => {
  it('zero below lower threshold (28011)', () => {
    expect(medicareLevySingle(new Decimal('28011')).toString()).toBe('0');
  });

  it('zero well below threshold (20000)', () => {
    expect(medicareLevySingle(new Decimal('20000')).toString()).toBe('0');
  });

  it('shade-in between lower and upper thresholds', () => {
    // At 30000: shade = (30000-28011)*0.10 = 198.90; full = 30000*0.02 = 600 → min(198.90, 600) = 198.90
    const levy = medicareLevySingle(new Decimal('30000'));
    expect(levy.toFixed(2)).toBe('198.90');
  });

  it('full 2% above upper threshold (35014)', () => {
    // 36000 > 35014 → full 2%: 36000 * 0.02 = 720
    expect(medicareLevySingle(new Decimal('36000')).toFixed(2)).toBe('720.00');
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

  it('tier 2 rate (1.25%) between 118000 and 158000', () => {
    // 130000 * 0.0125 = 1625
    expect(medicareLevySurcharge(new Decimal('130000'), false).toFixed(2)).toBe('1625.00');
  });

  it('tier 3 rate (1.5%) above 158000', () => {
    // 160000 * 0.015 = 2400
    expect(medicareLevySurcharge(new Decimal('160000'), false).toFixed(2)).toBe('2400.00');
  });

  it('family filing returns zero with family status (deferred)', () => {
    expect(medicareLevySurcharge(new Decimal('150000'), false, 'family').toString()).toBe('0');
  });
});

describe('medicareLevyFY2026', () => {
  it('returns levy + Tier 2 surcharge for single no-PHC at 150k (FY2025-26 corrected)', () => {
    const result = medicareLevyFY2026({
      taxableIncome: new Decimal('150000'),
      hasPHC: false,
      filingStatus: 'single',
    });
    expect(result.levy.toFixed(2)).toBe('3000.00'); // 150000 * 0.02
    // 150000 < 158000 (corrected Tier 3) → Tier 2 rate: 150000 * 0.0125 = 1875.00
    expect(result.surcharge.toFixed(2)).toBe('1875.00');
    expect(result.basis).toMatch(/MLS/);
    expect(result.familyWarning).toBeUndefined();
  });

  // Will be updated by Plan 08-2 when family branch is fully rewritten with real-engine orchestrator tests
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

describe('FY2025-26 family Medicare/MLS constants (MED-02)', () => {
  it('MEDICARE_LEVY_FAMILY_LOWER is 47238', () => {
    expect(MEDICARE_LEVY_FAMILY_LOWER).toBe('47238');
  });

  it('MEDICARE_LEVY_FAMILY_UPPER is 59047', () => {
    expect(MEDICARE_LEVY_FAMILY_UPPER).toBe('59047');
  });

  it('MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER is 4338', () => {
    expect(MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_LOWER).toBe('4338');
  });

  it('MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER is 5422', () => {
    expect(MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT_UPPER).toBe('5422');
  });

  it('MLS_FAMILY_DEPENDANT_INCREMENT is 1500', () => {
    expect(MLS_FAMILY_DEPENDANT_INCREMENT).toBe('1500');
  });
});
