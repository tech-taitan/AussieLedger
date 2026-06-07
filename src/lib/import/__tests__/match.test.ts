import { describe, it, expect } from 'vitest';
import {
  fuzzyMatch,
  HIGH_CONFIDENCE_THRESHOLD,
  TOP_N_CANDIDATES,
  NAME_DIVERGENCE_THRESHOLD,
  DEMOTED_NAME_DIVERGENCE_CONFIDENCE,
} from '../match';
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
    it('returns confidence 1.0 and mappedAccountId when code matches exactly (and name aligns)', () => {
      // Post-Task-A: an exact-code match with a CLOSE name still wins at 1.0.
      // (A wildly different name would demote — covered in the divergence
      // tests below.)
      const result = fuzzyMatch({ externalCode: '4100', externalName: 'Sales' }, ACCOUNTS);
      expect(result.confidence).toBe(1.0);
      expect(result.mappedAccountId).toBe('acc-1');
    });

    it('Task A: exact code match with DIVERGENT name demotes to nameDivergence (was 1.0 silently)', () => {
      // Pre-Task-A behaviour: confidence 1.0, silent auto-map under the
      // existing account's name. Hid renames like "Cash at Bank" silently
      // posting under "Business Bank Account" because both used code 1020.
      const result = fuzzyMatch(
        { externalCode: '6500', externalName: 'Completely Different Name' },
        ACCOUNTS,
      );
      expect(result.mappedAccountId).toBe('acc-5');
      expect(result.confidence).toBe(DEMOTED_NAME_DIVERGENCE_CONFIDENCE);
      expect(result.confidence).toBeLessThan(HIGH_CONFIDENCE_THRESHOLD);
      expect(result.nameDivergence).toBeDefined();
      expect(result.nameDivergence!.importedName).toBe('Completely Different Name');
      expect(result.nameDivergence!.existingName).toBe('Superannuation');
      expect(result.nameDivergence!.similarity).toBeLessThan(NAME_DIVERGENCE_THRESHOLD);
    });

    it('Task A: exact code match with CLOSE name keeps confidence 1.0 (no divergence)', () => {
      // Sales vs Sale (typo) — well above 0.60 threshold → no divergence.
      const result = fuzzyMatch({ externalCode: '4100', externalName: 'Sale' }, ACCOUNTS);
      expect(result.mappedAccountId).toBe('acc-1');
      expect(result.confidence).toBe(1.0);
      expect(result.nameDivergence).toBeUndefined();
    });

    it('Task A: exact code match with IDENTICAL name keeps confidence 1.0', () => {
      const result = fuzzyMatch({ externalCode: '4100', externalName: 'Sales' }, ACCOUNTS);
      expect(result.mappedAccountId).toBe('acc-1');
      expect(result.confidence).toBe(1.0);
      expect(result.nameDivergence).toBeUndefined();
    });

    it('Task A: exact code match with EMPTY imported name keeps confidence 1.0', () => {
      // Label-only imports (no name) shouldn't trigger divergence — nothing
      // to diverge from. Defensive: don't break legitimate code-only matches.
      const result = fuzzyMatch({ externalCode: '4100', externalName: '' }, ACCOUNTS);
      expect(result.mappedAccountId).toBe('acc-1');
      expect(result.confidence).toBe(1.0);
      expect(result.nameDivergence).toBeUndefined();
    });

    it('Task A: classic regression — "Cash at Bank" + code 1020 vs "Business Bank Account" 1020 → divergence', () => {
      const COA: Account[] = [
        { id: 'a1', code: '1020', name: 'Business Bank Account', type: 'Asset', gstCode: 'N-T' },
      ];
      const result = fuzzyMatch(
        { externalCode: '1020', externalName: 'Cash at Bank' },
        COA,
      );
      expect(result.mappedAccountId).toBe('a1');
      expect(result.nameDivergence).toBeDefined();
      expect(result.nameDivergence!.importedName).toBe('Cash at Bank');
      expect(result.nameDivergence!.existingName).toBe('Business Bank Account');
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

    it('exact code match still binds the accountId even when name diverges (but at demoted confidence)', () => {
      // Pre-Task-A this asserted confidence 1.0 silently. Post-Task-A the
      // code match still wins (so the user can confirm by inaction) but
      // confidence is demoted so the row routes to Review with the diff.
      const result = fuzzyMatch({ externalCode: '4200', externalName: 'ZZZZZ' }, ACCOUNTS);
      expect(result.mappedAccountId).toBe('acc-2');
      expect(result.confidence).toBe(DEMOTED_NAME_DIVERGENCE_CONFIDENCE);
      expect(result.nameDivergence).toBeDefined();
    });
  });
});
