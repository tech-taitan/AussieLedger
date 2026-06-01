import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as period from '../period';

describe('currentFy', () => {
  it('returns FY2026 for 1-Jul-2025', () => {
    expect(period.currentFy(new Date(2025, 6, 1))).toBe('FY2026');
  });

  it('returns FY2026 for 30-Jun-2026', () => {
    expect(period.currentFy(new Date(2026, 5, 30))).toBe('FY2026');
  });

  it('returns FY2026 for 1-Jan-2026', () => {
    expect(period.currentFy(new Date(2026, 0, 1))).toBe('FY2026');
  });

  it('returns FY2027 for 1-Jul-2026', () => {
    expect(period.currentFy(new Date(2026, 6, 1))).toBe('FY2027');
  });

  it('returns FY2026 for 31-Dec-2025', () => {
    expect(period.currentFy(new Date(2025, 11, 31))).toBe('FY2026');
  });
});

describe('fyBoundaries', () => {
  it('FY2026 → from: 2025-07-01, to: 2026-06-30', () => {
    const { from, to } = period.fyBoundaries('FY2026');
    expect(from.toISOString().slice(0, 10)).toBe('2025-07-01');
    expect(to.toISOString().slice(0, 10)).toBe('2026-06-30');
  });

  it('FY2025 → from: 2024-07-01, to: 2025-06-30', () => {
    const { from, to } = period.fyBoundaries('FY2025');
    expect(from.toISOString().slice(0, 10)).toBe('2024-07-01');
    expect(to.toISOString().slice(0, 10)).toBe('2025-06-30');
  });

  it('throws on invalid FyLabel', () => {
    expect(() => period.fyBoundaries('FYBAD' as period.FyLabel)).toThrow();
  });
});

describe('quarterOf', () => {
  it('1-Jul-2025 → {fy: FY2026, q: 1}', () => {
    expect(period.quarterOf(new Date(2025, 6, 1))).toEqual({ fy: 'FY2026', q: 1 });
  });

  it('1-Oct-2025 → q: 2', () => {
    expect(period.quarterOf(new Date(2025, 9, 1))).toEqual({ fy: 'FY2026', q: 2 });
  });

  it('1-Jan-2026 → q: 3', () => {
    expect(period.quarterOf(new Date(2026, 0, 1))).toEqual({ fy: 'FY2026', q: 3 });
  });

  it('1-Apr-2026 → q: 4', () => {
    expect(period.quarterOf(new Date(2026, 3, 1))).toEqual({ fy: 'FY2026', q: 4 });
  });

  it('29-Feb-2028 (leap year) → {fy: FY2028, q: 3}', () => {
    expect(period.quarterOf(new Date(2028, 1, 29))).toEqual({ fy: 'FY2028', q: 3 });
  });

  it('30-Sep-2025 → q: 1 (end of Q1)', () => {
    expect(period.quarterOf(new Date(2025, 8, 30))).toEqual({ fy: 'FY2026', q: 1 });
  });

  it('31-Dec-2025 → q: 2 (end of Q2)', () => {
    expect(period.quarterOf(new Date(2025, 11, 31))).toEqual({ fy: 'FY2026', q: 2 });
  });

  it('31-Mar-2026 → q: 3 (end of Q3)', () => {
    expect(period.quarterOf(new Date(2026, 2, 31))).toEqual({ fy: 'FY2026', q: 3 });
  });

  it('30-Jun-2026 → q: 4 (end of Q4)', () => {
    expect(period.quarterOf(new Date(2026, 5, 30))).toEqual({ fy: 'FY2026', q: 4 });
  });
});

describe('quarterBoundaries', () => {
  it('FY2026 Q1 → Jul-Sep 2025', () => {
    const { from, to } = period.quarterBoundaries('FY2026', 1);
    expect(from.toISOString().slice(0, 10)).toBe('2025-07-01');
    expect(to.toISOString().slice(0, 10)).toBe('2025-09-30');
  });

  it('FY2026 Q2 → Oct-Dec 2025', () => {
    const { from, to } = period.quarterBoundaries('FY2026', 2);
    expect(from.toISOString().slice(0, 10)).toBe('2025-10-01');
    expect(to.toISOString().slice(0, 10)).toBe('2025-12-31');
  });

  it('FY2026 Q3 → Jan-Mar 2026', () => {
    const { from, to } = period.quarterBoundaries('FY2026', 3);
    expect(from.toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(to.toISOString().slice(0, 10)).toBe('2026-03-31');
  });

  it('FY2026 Q4 → Apr-Jun 2026', () => {
    const { from, to } = period.quarterBoundaries('FY2026', 4);
    expect(from.toISOString().slice(0, 10)).toBe('2026-04-01');
    expect(to.toISOString().slice(0, 10)).toBe('2026-06-30');
  });
});

describe('isInPeriod boundaries', () => {
  it('includes the from-date (inclusive lower bound)', () => {
    const fromDate = new Date(2025, 6, 1); // 1 Jul 2025
    expect(period.isInPeriod(fromDate, { type: 'fy', fy: 'FY2026' })).toBe(true);
  });

  it('includes the to-date (inclusive upper bound)', () => {
    const toDate = new Date(2026, 5, 30); // 30 Jun 2026
    expect(period.isInPeriod(toDate, { type: 'fy', fy: 'FY2026' })).toBe(true);
  });

  it('excludes a date one day before start', () => {
    const before = new Date(2025, 5, 30); // 30 Jun 2025
    expect(period.isInPeriod(before, { type: 'fy', fy: 'FY2026' })).toBe(false);
  });

  it('excludes a date one day after end', () => {
    const after = new Date(2026, 6, 1); // 1 Jul 2026
    expect(period.isInPeriod(after, { type: 'fy', fy: 'FY2026' })).toBe(false);
  });

  it('works with quarter periods', () => {
    const midQ1 = new Date(2025, 7, 15); // 15 Aug 2025
    expect(period.isInPeriod(midQ1, { type: 'quarter', fy: 'FY2026', q: 1 })).toBe(true);
    expect(period.isInPeriod(midQ1, { type: 'quarter', fy: 'FY2026', q: 2 })).toBe(false);
  });

  it('works with custom periods', () => {
    const customPeriod: period.Period = {
      type: 'custom',
      from: new Date(2026, 0, 1),
      to: new Date(2026, 2, 31),
    };
    expect(period.isInPeriod(new Date(2026, 1, 15), customPeriod)).toBe(true);
    expect(period.isInPeriod(new Date(2025, 11, 31), customPeriod)).toBe(false);
  });
});

describe('today injectable', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    period._resetNowProvider();
  });

  it('today() is mockable via vi.spyOn', () => {
    vi.spyOn(period, 'today').mockReturnValue(new Date('2026-02-15'));
    const result = period.today();
    expect(result.toISOString().slice(0, 10)).toBe('2026-02-15');
  });

  it('currentFy() uses _nowProvider seam (via _setNowProvider)', () => {
    // _setNowProvider sets the internal clock used by currentFy
    period._setNowProvider(() => new Date(2026, 1, 15)); // Feb 2026 → FY2026
    expect(period.currentFy()).toBe('FY2026');
  });

  it('currentFy() seam: July date yields FY2027', () => {
    period._setNowProvider(() => new Date(2026, 6, 5)); // Jul 2026 → FY2027
    expect(period.currentFy()).toBe('FY2027');
  });

  describe('_setNowProvider / _resetNowProvider', () => {
    afterEach(() => {
      period._resetNowProvider();
    });

    it('_setNowProvider overrides today()', () => {
      period._setNowProvider(() => new Date(2027, 0, 1));
      expect(period.today().getFullYear()).toBe(2027);
    });

    it('_resetNowProvider restores default', () => {
      period._setNowProvider(() => new Date(2027, 0, 1));
      period._resetNowProvider();
      const now = period.today();
      // After reset, today() should return a real date near now
      expect(now.getFullYear()).toBeGreaterThanOrEqual(2026);
    });
  });
});

describe('nowIso', () => {
  afterEach(() => {
    period._resetNowProvider();
  });

  it('returns an ISO-8601 UTC string (YYYY-MM-DDTHH:mm:ss.sssZ)', () => {
    const iso = period.nowIso();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('returns the injected provider clock as ISO when _setNowProvider is set', () => {
    period._setNowProvider(() => new Date('2026-06-15T10:30:00.000Z'));
    expect(period.nowIso()).toBe('2026-06-15T10:30:00.000Z');
  });

  it('nowIso() and today().toISOString() match at the same provider tick', () => {
    period._setNowProvider(() => new Date('2026-01-02T03:04:05.678Z'));
    expect(period.nowIso()).toBe(period.today().toISOString());
  });

  it('after _resetNowProvider, two consecutive nowIso() calls produce strings within 1 second of each other', () => {
    period._setNowProvider(() => new Date('2026-06-15T10:30:00.000Z'));
    period._resetNowProvider();
    const a = period.nowIso();
    const b = period.nowIso();
    const aMs = new Date(a).getTime();
    const bMs = new Date(b).getTime();
    expect(Math.abs(bMs - aMs)).toBeLessThan(1000);
  });
});
