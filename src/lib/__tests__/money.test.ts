import { describe, it, expect } from 'vitest';
import { add, sub, mul, div, gst, round, serialize, deserialize, formatAud, Decimal } from '../money';

describe('money wrapper', () => {
  describe('add — no float drift', () => {
    it('0.1 + 0.2 === 0.3 (no float drift)', () => {
      expect(add('0.1', '0.2').toString()).toBe('0.3');
    });
    it('handles integers and strings interchangeably', () => {
      expect(add(10, '0.5').toString()).toBe('10.5');
    });
  });

  describe('sub', () => {
    it('1 - 0.9 === 0.1', () => {
      expect(sub('1', '0.9').toString()).toBe('0.1');
    });
  });

  describe('mul', () => {
    it('100 * 0.1 === 10 (no drift)', () => {
      expect(mul('100', '0.1').toString()).toBe('10');
    });
  });

  describe('div', () => {
    it('1 / 4 === 0.25', () => {
      expect(div('1', '4').toString()).toBe('0.25');
    });
  });

  describe('gst — divides by 11 with banker rounding', () => {
    it('gst(110) === 10.00', () => {
      expect(serialize(gst('110'))).toBe('10.00');
    });
    it('gst(100) === 9.09', () => {
      expect(serialize(gst('100'))).toBe('9.09');
    });
    it('gst(105.50) === 9.59', () => {
      expect(serialize(gst('105.50'))).toBe('9.59');
    });
  });

  describe('round — banker rounding to 2dp', () => {
    it('2.505 rounds to 2.50 (preceding digit even, rounds down)', () => {
      expect(serialize(round('2.505', 2))).toBe('2.50');
    });
    it('2.515 rounds to 2.52 (preceding digit odd, rounds up to even)', () => {
      expect(serialize(round('2.515', 2))).toBe('2.52');
    });
    it('default dp=2', () => {
      expect(serialize(round('1.234'))).toBe('1.23');
    });
  });

  describe('serialize / deserialize round-trip', () => {
    it('serializes to 2dp string', () => {
      expect(serialize(add('10.001', '0.009'))).toBe('10.01');
    });
    it('deserialize accepts string and number', () => {
      expect(deserialize('10.50').toString()).toBe('10.5');
      expect(deserialize(10.5).toString()).toBe('10.5');
    });
  });

  describe('formatAud — display formatting', () => {
    it('formats integers with thousands separator and 2dp', () => {
      expect(formatAud(1234)).toBe('1,234.00');
      expect(formatAud(50000)).toBe('50,000.00');
      expect(formatAud(1000000)).toBe('1,000,000.00');
    });

    it('rounds to 2dp using locale rounding', () => {
      expect(formatAud(1234.567)).toBe('1,234.57');
      expect(formatAud(1234.5)).toBe('1,234.50');
    });

    it('formats negatives with a leading minus', () => {
      expect(formatAud(-1234.56)).toBe('-1,234.56');
    });

    it('formats zero, small fractions, and unders-1000 cleanly', () => {
      expect(formatAud(0)).toBe('0.00');
      expect(formatAud(0.5)).toBe('0.50');
      expect(formatAud(999.99)).toBe('999.99');
    });

    it('defensively returns "0.00" for NaN / Infinity / null / undefined', () => {
      expect(formatAud(NaN)).toBe('0.00');
      expect(formatAud(Infinity)).toBe('0.00');
      expect(formatAud(-Infinity)).toBe('0.00');
      expect(formatAud(null)).toBe('0.00');
      expect(formatAud(undefined)).toBe('0.00');
    });

    it('accepts Decimal instances via .toNumber()', () => {
      expect(formatAud(new Decimal('12345.678'))).toBe('12,345.68');
      expect(formatAud(new Decimal('0'))).toBe('0.00');
    });

    it('locale pinned to en-AU — output uses comma thousands + dot decimal regardless of system locale', () => {
      // Without an explicit locale this could surface as "1.234,56" on EU
      // systems. The pinned en-AU keeps it stable.
      expect(formatAud(1234.56)).toMatch(/^1,234\.56$/);
    });
  });
});
