import { describe, it, expect } from 'vitest';
import { migrateV1ToV2 } from '../v1-to-v2';
import type { PersistedRoot } from '../index';
import type { Account } from '../../../types';

/**
 * v1 fixture — the kind of state a user would have before migration.
 * Includes named accounts matching the INFERENCE_TABLE plus one unmappable account.
 */
function makeV1State(accounts: Partial<Account>[]): PersistedRoot {
  return {
    _v: 1,
    accounts: accounts.map((a, i) => ({
      id: `acc-${i}`,
      code: `${1000 + i}`,
      name: `Account ${i}`,
      type: 'Revenue' as const,
      gstCode: 'GST' as const,
      ...a,
    })),
  };
}

describe('migrateV1ToV2', () => {
  describe('version bump', () => {
    it('bumps _v from 1 to 2', () => {
      const result = migrateV1ToV2(makeV1State([]));
      expect(result._v).toBe(2);
    });
  });

  describe('partnershipTaxLabel inference', () => {
    it('infers partnershipTaxLabel P1 for "Sales" (Revenue)', () => {
      const state = makeV1State([{ name: 'Sales', type: 'Revenue' }]);
      const result = migrateV1ToV2(state);
      const accounts = result.accounts as Account[];
      expect(accounts[0].partnershipTaxLabel).toBe('P1');
    });

    it('infers partnershipTaxLabel P2 for "Wages & Salaries" (Expense)', () => {
      const state = makeV1State([{ name: 'Wages & Salaries', type: 'Expense', gstCode: 'N-T' }]);
      const result = migrateV1ToV2(state);
      const accounts = result.accounts as Account[];
      expect(accounts[0].partnershipTaxLabel).toBe('P2');
    });

    it('infers P1 for "Interest Income"', () => {
      const state = makeV1State([{ name: 'Interest Income', type: 'Revenue', gstCode: 'FRE' }]);
      const result = migrateV1ToV2(state);
      const accounts = result.accounts as Account[];
      expect(accounts[0].partnershipTaxLabel).toBe('P1');
    });

    it('infers P2 for "Superannuation"', () => {
      const state = makeV1State([{ name: 'Superannuation', type: 'Expense', gstCode: 'N-T' }]);
      const result = migrateV1ToV2(state);
      const accounts = result.accounts as Account[];
      expect(accounts[0].partnershipTaxLabel).toBe('P2');
    });
  });

  describe('existing labels preserved', () => {
    it('preserves existing taxLabel verbatim without overwriting', () => {
      const state = makeV1State([{ name: 'Sales', type: 'Revenue', taxLabel: '6S' }]);
      const result = migrateV1ToV2(state);
      const accounts = result.accounts as Account[];
      expect(accounts[0].taxLabel).toBe('6S');
    });

    it('preserves existing companyTaxLabel verbatim', () => {
      const state = makeV1State([{ name: 'Sales', type: 'Revenue', companyTaxLabel: '6A' }]);
      const result = migrateV1ToV2(state);
      const accounts = result.accounts as Account[];
      expect(accounts[0].companyTaxLabel).toBe('6A');
    });
  });

  describe('_needsReview flagging', () => {
    it('marks unmapped Expense account (no inference match) as _needsReview: true', () => {
      const state = makeV1State([{ name: 'Obscure Account XYZ', type: 'Expense', gstCode: 'GST' }]);
      const result = migrateV1ToV2(state);
      const accounts = result.accounts as Account[];
      expect(accounts[0]._needsReview).toBe(true);
    });

    it('does NOT mark Asset account as _needsReview', () => {
      const state = makeV1State([{ name: 'General Check Account', type: 'Asset', gstCode: 'N-T' }]);
      const result = migrateV1ToV2(state);
      const accounts = result.accounts as Account[];
      expect(accounts[0]._needsReview).toBeFalsy();
    });

    it('does NOT mark Liability account as _needsReview', () => {
      const state = makeV1State([{ name: 'Some Unknown Liability', type: 'Liability', gstCode: 'N-T' }]);
      const result = migrateV1ToV2(state);
      const accounts = result.accounts as Account[];
      expect(accounts[0]._needsReview).toBeFalsy();
    });

    it('does NOT mark fully-inferred Revenue account as _needsReview', () => {
      const state = makeV1State([{ name: 'Sales', type: 'Revenue' }]);
      const result = migrateV1ToV2(state);
      const accounts = result.accounts as Account[];
      expect(accounts[0]._needsReview).toBeFalsy();
    });
  });

  describe('idempotency', () => {
    it('applying migrateV1ToV2 twice produces identical accounts', () => {
      const state = makeV1State([
        { name: 'Sales', type: 'Revenue' },
        { name: 'Wages & Salaries', type: 'Expense', gstCode: 'N-T' },
      ]);
      const once = migrateV1ToV2(state);
      // Need to reset _v to 1 to simulate a double-call scenario manually
      // But the idempotency guard means calling on _v:2 returns unchanged
      const twice = migrateV1ToV2(once);
      expect(twice).toEqual(once);
    });

    it('migration is idempotent: accounts after second call equal first call', () => {
      const state = makeV1State([{ name: 'Advertising', type: 'Expense' }]);
      const firstResult = migrateV1ToV2(state);
      // Call on already-migrated state returns it unchanged
      const secondResult = migrateV1ToV2(firstResult);
      const firstAccounts = firstResult.accounts as Account[];
      const secondAccounts = secondResult.accounts as Account[];
      expect(secondAccounts[0]).toEqual(firstAccounts[0]);
    });
  });

  describe('gstCode preservation', () => {
    it('preserves gstCode GST after migration', () => {
      const state = makeV1State([{ name: 'Sales', type: 'Revenue', gstCode: 'GST' }]);
      const result = migrateV1ToV2(state);
      const accounts = result.accounts as Account[];
      expect(accounts[0].gstCode).toBe('GST');
    });

    it('passes through gstCode INP without throwing', () => {
      const state = makeV1State([{ name: 'Some Liability', type: 'Liability', gstCode: 'INP' as const }]);
      expect(() => migrateV1ToV2(state)).not.toThrow();
      const result = migrateV1ToV2(state);
      const accounts = result.accounts as Account[];
      expect(accounts[0].gstCode).toBe('INP');
    });

    it('passes through gstCode CAP without throwing', () => {
      const state = makeV1State([{ name: 'Equipment', type: 'Asset', gstCode: 'CAP' as const }]);
      expect(() => migrateV1ToV2(state)).not.toThrow();
      const result = migrateV1ToV2(state);
      const accounts = result.accounts as Account[];
      expect(accounts[0].gstCode).toBe('CAP');
    });
  });

  describe('multiple accounts', () => {
    it('handles a realistic v1 state with all account types', () => {
      const state = makeV1State([
        { name: 'Sales', type: 'Revenue', taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B' },
        { name: 'Wages & Salaries', type: 'Expense', gstCode: 'N-T' },
        { name: 'General Check Account', type: 'Asset', gstCode: 'N-T' },
        { name: 'Obscure Account XYZ', type: 'Expense', gstCode: 'GST' },
      ]);
      const result = migrateV1ToV2(state);
      const accounts = result.accounts as Account[];

      // Sales — inferred P1, existing labels preserved
      expect(accounts[0].partnershipTaxLabel).toBe('P1');
      expect(accounts[0].taxLabel).toBe('6S');
      expect(accounts[0]._needsReview).toBeFalsy();

      // Wages — inferred all labels
      expect(accounts[1].partnershipTaxLabel).toBe('P2');
      expect(accounts[1]._needsReview).toBeFalsy();

      // Asset — no review needed
      expect(accounts[2]._needsReview).toBeFalsy();

      // Obscure — needs review
      expect(accounts[3]._needsReview).toBe(true);
    });
  });
});
