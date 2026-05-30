/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { Decimal } from '../../../money';
import { medicareLevySingle, medicareLevySurcharge, medicareLevyFY2026, medicareLevyFamily, medicareLevySurchargeFamily } from '../fy2026/medicare';
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

  // Phase 8: family branch now uses real threshold engine; familyWarning is no longer emitted
  it('family filing: returns real-threshold levy + correct surcharge + no familyWarning (Phase 8)', () => {
    const result = medicareLevyFY2026({
      taxableIncome: new Decimal('80000'),
      hasPHC: false,
      filingStatus: 'family',
      dependants: 0,
      spouseIncome: '60000',
    });
    // Combined 140000 ≥ effUpper 59047 → levy = 80000 × 0.02
    expect(result.levy.toFixed(2)).toBe('1600.00');
    // Combined 140000 < family MLS Tier 1 base 202000 → surcharge = 0
    expect(result.surcharge.toFixed(2)).toBe('0.00');
    expect(result.familyWarning).toBeUndefined();
    expect(result.basis).toMatch(/Family/);
  });

  it('family filing with hasPHC=true zeros MLS regardless of family income (Phase 8)', () => {
    const result = medicareLevyFY2026({
      taxableIncome: new Decimal('150000'),
      hasPHC: true,
      filingStatus: 'family',
      dependants: 2,
      spouseIncome: '100000',
    });
    // Combined 250000 ≥ effUpper 69891 → levy = 150000 × 0.02
    expect(result.levy.toFixed(2)).toBe('3000.00');
    // PHC held → surcharge = 0
    expect(result.surcharge.toFixed(2)).toBe('0.00');
  });

  it('family filing with no spouseIncome treats it as $0 (Phase 8)', () => {
    const result = medicareLevyFY2026({
      taxableIncome: new Decimal('80000'),
      hasPHC: false,
      filingStatus: 'family',
      dependants: 2,
    });
    // spouseIncome undefined → treated as '0'; combined 80000 ≥ effUpper(59047+2×5422=69891)
    expect(result.levy.toFixed(2)).toBe('1600.00');
  });
});

describe('medicareLevyFamily (Phase 8 — MED-02)', () => {
  it('Test FLEVY-1: combined ≤ effective lower → $0 (no dependants, combined 40000 ≤ 47238)', () => {
    // effectiveLower = 47238 + 0 = 47238; combined = 40000 + 0 = 40000 → below lower
    const result = medicareLevyFamily(new Decimal('40000'), new Decimal('0'), 0);
    expect(result.toString()).toBe('0');
  });

  it('Test FLEVY-2: shade-in zone — combined just below upper (combined 50000, own 25000)', () => {
    // effectiveLower=47238, effectiveUpper=59047, combined=50000
    // shaded=(50000-47238)×0.10=276.20; full=25000×0.02=500; min=276.20
    const result = medicareLevyFamily(new Decimal('25000'), new Decimal('25000'), 0);
    expect(result.toFixed(2)).toBe('276.20');
  });

  it('Test FLEVY-3: combined ≥ effective upper → full 2% of OWN income (NOT combined)', () => {
    // combined=170000 ≥ 59047; levy=90000×0.02=1800.00 (NOT 170000×0.02=3400 — Pitfall 1)
    const result = medicareLevyFamily(new Decimal('90000'), new Decimal('80000'), 0);
    expect(result.toFixed(2)).toBe('1800.00');
  });

  it('Test FLEVY-4: per-dependant LOWER increment correct (2 dependants → effLower=55914)', () => {
    // effLower=47238+(2×4338)=55914; combined=54000 ≤ 55914 → $0
    const result = medicareLevyFamily(new Decimal('27000'), new Decimal('27000'), 2);
    expect(result.toString()).toBe('0');
  });

  it('Test FLEVY-5: per-dependant UPPER increment correct (2 dependants → effUpper=69891)', () => {
    // effUpper=59047+(2×5422)=69891; combined=69900 ≥ 69891 → full 2% of own=35000×0.02=700.00
    const result = medicareLevyFamily(new Decimal('35000'), new Decimal('34900'), 2);
    expect(result.toFixed(2)).toBe('700.00');
  });

  it('Test FLEVY-6: single-parent scenario (dependants=2, spouseIncome=$0) → $0 below threshold', () => {
    // effLower=47238+(2×4338)=55914; combined=45000+0=45000 ≤ 55914 → $0
    const result = medicareLevyFamily(new Decimal('45000'), new Decimal('0'), 2);
    expect(result.toString()).toBe('0');
  });

  it('Test FLEVY-7: DINK scenario (dependants=0, spouse=80000) → full 2% on own income', () => {
    // combined=170000 ≥ effUpper=59047; levy=90000×0.02=1800.00
    const result = medicareLevyFamily(new Decimal('90000'), new Decimal('80000'), 0);
    expect(result.toFixed(2)).toBe('1800.00');
  });

  it('Test FLEVY-8: shade-in capped at full 2% of own income (own=2000 constrains shade)', () => {
    // own=2000, spouse=55000, dependants=0 → combined=57000; effLower=47238; in shade zone (57000 < 59047)
    // shaded=(57000-47238)×0.10=976.20; full=2000×0.02=40.00; min=40.00
    const result = medicareLevyFamily(new Decimal('2000'), new Decimal('55000'), 0);
    expect(result.toFixed(2)).toBe('40.00');
  });
});

describe('medicareLevySurchargeFamily (Phase 8 — MED-02)', () => {
  it('Test FMLS-1: hasPHC=true → $0 regardless of income/dependants', () => {
    const result = medicareLevySurchargeFamily(
      new Decimal('500000'), new Decimal('300000'), true, 0,
    );
    expect(result.toString()).toBe('0');
  });

  it('Test FMLS-2: combined below Tier 1 base (202000) → $0', () => {
    const result = medicareLevySurchargeFamily(
      new Decimal('200000'), new Decimal('100000'), false, 0,
    );
    expect(result.toString()).toBe('0');
  });

  it('Test FMLS-3: combined in Tier 1 zone (>202000 ≤236000), 0 dependants → 1% × own', () => {
    // combined=220000 > t1=202000; 120000×0.01=1200.00
    const result = medicareLevySurchargeFamily(
      new Decimal('220000'), new Decimal('120000'), false, 0,
    );
    expect(result.toFixed(2)).toBe('1200.00');
  });

  it('Test FMLS-4: combined in Tier 2 zone (>236000 ≤316000) → 1.25% × own', () => {
    // combined=250000 > t2=236000; 150000×0.0125=1875.00
    const result = medicareLevySurchargeFamily(
      new Decimal('250000'), new Decimal('150000'), false, 0,
    );
    expect(result.toFixed(2)).toBe('1875.00');
  });

  it('Test FMLS-5: combined in Tier 3 zone (>316000) → 1.5% × own', () => {
    // combined=400000 > t3=316000; 200000×0.015=3000.00
    const result = medicareLevySurchargeFamily(
      new Decimal('400000'), new Decimal('200000'), false, 0,
    );
    expect(result.toFixed(2)).toBe('3000.00');
  });

  it('Test FMLS-6a: 2 dependants shifts Tier 1 threshold by 1500 (after-first rule)', () => {
    // increment=max(0,2-1)×1500=1500; effT1=202000+1500=203500
    // combined=203000 < 203500 → below Tier 1 → $0
    const result = medicareLevySurchargeFamily(
      new Decimal('203000'), new Decimal('120000'), false, 2,
    );
    expect(result.toString()).toBe('0');
  });

  it('Test FMLS-6b: 1 dependant has no increment (after-first — 1 child already in base)', () => {
    // increment=max(0,1-1)×1500=0; effT1=202000; combined=203000 > 202000 → Tier 1
    // 120000×0.01=1200.00
    const result = medicareLevySurchargeFamily(
      new Decimal('203000'), new Decimal('120000'), false, 1,
    );
    expect(result.toFixed(2)).toBe('1200.00');
  });

  it('Test FMLS-7: surcharge applied on OWN income, not combined (Pitfall 1 analogue)', () => {
    // combined=300000 > t2=236000; ownIncome=80000; 80000×0.0125=1000.00 (NOT 300000×0.0125=3750)
    const result = medicareLevySurchargeFamily(
      new Decimal('300000'), new Decimal('80000'), false, 0,
    );
    expect(result.toFixed(2)).toBe('1000.00');
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
