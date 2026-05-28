/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { Decimal } from '../../../money';
import { marginalTaxFY2026 } from '../fy2026/marginal';

describe('marginalTaxFY2026', () => {
  it('zero at 18200 (upper bound of tax-free threshold)', () => {
    expect(marginalTaxFY2026(new Decimal('18200')).toString()).toBe('0');
  });

  it('zero at 18000 (below threshold)', () => {
    expect(marginalTaxFY2026(new Decimal('18000')).toString()).toBe('0');
  });

  it('4288.00 at 45000 — (45000-18200) × 0.16 = 4288', () => {
    expect(marginalTaxFY2026(new Decimal('45000')).toFixed(2)).toBe('4288.00');
  });

  it('31288.00 at 135000 — 4288 + (135000-45000) × 0.30 = 31288', () => {
    expect(marginalTaxFY2026(new Decimal('135000')).toFixed(2)).toBe('31288.00');
  });

  it('51638.00 at 190000 — 31288 + (190000-135000) × 0.37 = 51638', () => {
    expect(marginalTaxFY2026(new Decimal('190000')).toFixed(2)).toBe('51638.00');
  });

  it('45 percent above 190000 — 300000 → 51638 + (300000-190000) × 0.45 = 101138', () => {
    expect(marginalTaxFY2026(new Decimal('300000')).toFixed(2)).toBe('101138.00');
  });

  it('mid-bracket 100000 — 4288 + (100000-45000) × 0.30 = 20788', () => {
    expect(marginalTaxFY2026(new Decimal('100000')).toFixed(2)).toBe('20788.00');
  });
});
