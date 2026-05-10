import { describe, it, expect } from 'vitest';
import { fuzzyMatch, HIGH_CONFIDENCE_THRESHOLD, TOP_N_CANDIDATES } from '../match';
import type { Account } from '../../../types';

const makeAccount = (id: string, code: string, name: string): Account => ({
  id,
  code,
  name,
  type: 'Revenue',
  gstCode: 'GST',
});

const ACCOUNTS: Account[] = [
  makeAccount('acc-1', '4100', 'Sales'),
  makeAccount('acc-2', '4200', 'Interest Income'),
  makeAccount('acc-3', '6100', 'Advertising'),
  makeAccount('acc-4', '6400', 'Wages & Salaries'),
  makeAccount('acc-5', '6500', 'Superannuation'),
];

describe('fuzzyMatch', () => {
  it('exports HIGH_CONFIDENCE_THRESHOLD = 0.85', () => {
    expect(HIGH_CONFIDENCE_THRESHOLD).toBe(0.85);
  });

  it('exports TOP_N_CANDIDATES = 3', () => {
    expect(TOP_N_CANDIDATES).toBe(3);
  });

  describe('exact code match', () => {
    it('returns confidence 1.0 and mappedAccountId when code matches exactly', () => {
      const result = fuzzyMatch({ externalCode: '4100', externalName: 'Something Else' }, ACCOUNTS);
      expect(result.confidence).toBe(1.0);
      expect(result.mappedAccountId).toBe('acc-1');
    });

    it('exact code match ignores name distance', () => {
      const result = fuzzyMatch({ externalCode: '6500', externalName: 'Completely Different Name' }, ACCOUNTS);
      expect(result.mappedAccountId).toBe('acc-5');
      expect(result.confidence).toBe(1.0);
    });

    it('code match returns single candidate', () => {
      const result = fuzzyMatch({ externalCode: '4100', externalName: 'whatever' }, ACCOUNTS);
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].accountId).toBe('acc-1');
    });
  });

  describe('Levenshtein name ranking', () => {
    it('identical name returns confidence 1.0', () => {
      const result = fuzzyMatch({ externalCode: '', externalName: 'Sales' }, ACCOUNTS);
      expect(result.confidence).toBe(1.0);
      expect(result.mappedAccountId).toBe('acc-1');
    });

    it('normalisation: punctuation and case stripped before comparison', () => {
      // 'Wages & Salaries!' normalised → 'wages salaries', 'Wages & Salaries' normalised → 'wages  salaries'
      // They should compare closely
      const result = fuzzyMatch({ externalCode: '', externalName: 'wages and salaries' }, ACCOUNTS);
      // 'wages and salaries' vs 'wages  salaries' (Wages & Salaries normalised = 'wages  salaries')
      // Should be close to or exceed threshold given high similarity
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('best match is ranked first in candidates', () => {
      const result = fuzzyMatch({ externalCode: '', externalName: 'Sales Revenue' }, ACCOUNTS);
      expect(result.candidates[0].name).toBe('Sales');
    });

    it('candidates contains at most TOP_N_CANDIDATES entries', () => {
      const result = fuzzyMatch({ externalCode: '', externalName: 'xyz' }, ACCOUNTS);
      expect(result.candidates.length).toBeLessThanOrEqual(TOP_N_CANDIDATES);
    });
  });

  describe('confidence threshold', () => {
    it('confidence >= 0.85 → mappedAccountId is set', () => {
      const result = fuzzyMatch({ externalCode: '', externalName: 'Sales' }, ACCOUNTS);
      expect(result.confidence).toBeGreaterThanOrEqual(HIGH_CONFIDENCE_THRESHOLD);
      expect(result.mappedAccountId).toBeDefined();
    });

    it('low-confidence match → mappedAccountId is undefined', () => {
      const result = fuzzyMatch({ externalCode: '', externalName: 'ZZZZZZZZZZZ_No_Match' }, ACCOUNTS);
      expect(result.confidence).toBeLessThan(HIGH_CONFIDENCE_THRESHOLD);
      expect(result.mappedAccountId).toBeUndefined();
    });

    it('low-confidence match → candidates still populated', () => {
      const result = fuzzyMatch({ externalCode: '', externalName: 'ZZZZZZZZZZZ_No_Match' }, ACCOUNTS);
      expect(result.candidates.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('empty accounts array returns confidence 0, no candidates', () => {
      const result = fuzzyMatch({ externalCode: '4100', externalName: 'Sales' }, []);
      expect(result.confidence).toBe(0);
      expect(result.candidates).toHaveLength(0);
      expect(result.mappedAccountId).toBeUndefined();
    });

    it('empty externalCode does not crash', () => {
      const result = fuzzyMatch({ externalCode: '', externalName: 'Sales' }, ACCOUNTS);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('normalisation: mixed case and punctuation match', () => {
      // 'Wages & Salaries!' → normalised 'wages  salaries' (& stripped, ! stripped)
      const result = fuzzyMatch({ externalCode: '', externalName: 'Wages & Salaries!' }, ACCOUNTS);
      // Should match 'Wages & Salaries' (acc-4) at high confidence
      expect(result.confidence).toBeGreaterThan(0.85);
      expect(result.mappedAccountId).toBe('acc-4');
    });

    it('exact code match takes precedence over name similarity', () => {
      // Even if name has 0 similarity, code match wins
      const result = fuzzyMatch({ externalCode: '4200', externalName: 'ZZZZZ' }, ACCOUNTS);
      expect(result.mappedAccountId).toBe('acc-2');
      expect(result.confidence).toBe(1.0);
    });
  });
});
