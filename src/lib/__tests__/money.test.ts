import { describe, it, expect } from 'vitest';
import { add, sub, mul, div, gst, round, serialize, deserialize } from '../money';

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
});
