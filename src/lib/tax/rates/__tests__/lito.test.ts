/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { Decimal } from '../../../money';
import { litoFY2026 } from '../fy2026/lito';

describe('litoFY2026', () => {
  it('700 at 37500 (max LITO threshold)', () => {
    expect(litoFY2026(new Decimal('37500')).toFixed(2)).toBe('700.00');
  });

  it('700 below 37500 (income 20000)', () => {
    expect(litoFY2026(new Decimal('20000')).toFixed(2)).toBe('700.00');
  });

  it('325 at 45000 — stage 1 to stage 2 transition', () => {
    // 700 - (45000 - 37500) × 0.05 = 700 - 375 = 325
    expect(litoFY2026(new Decimal('45000')).toFixed(2)).toBe('325.00');
  });

  it('250 at 50000 — mid stage 2', () => {
    // 325 - (50000 - 45000) × 0.015 = 325 - 75 = 250
    expect(litoFY2026(new Decimal('50000')).toFixed(2)).toBe('250.00');
  });

  it('zero (or near-zero) at 66667 — cutout', () => {
    // 325 - (66667 - 45000) × 0.015 = 325 - 325.005 = -0.005 → clamped to 0
    const v = litoFY2026(new Decimal('66667'));
    expect(Number(v.toFixed(2))).toBeCloseTo(0, 1);
  });

  it('zero above 66667', () => {
    expect(litoFY2026(new Decimal('100000')).toString()).toBe('0');
  });
});
