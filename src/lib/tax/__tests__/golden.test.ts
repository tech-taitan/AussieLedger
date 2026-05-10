import { describe, it, expect } from 'vitest';
import { Decimal } from '../../money';
import { computeIndividual } from '../individual';
import { computeCompany } from '../company';
import { computeTrust } from '../trust';
import { computePartnership } from '../partnership';
import type { TaxInput, IndividualInput, CompanyInput, TrustInput, PartnershipInput } from '../types';
import type { Account, JournalEntry } from '../../../types';

// Base input with empty entries/accounts — used for shape tests
const baseInput: TaxInput = {
  fy: 'FY2026',
  entries: [],
  accounts: [],
  period: { type: 'fy', fy: 'FY2026' },
};

// ── Shape tests ────────────────────────────────────────────────────────────

describe('Tax engine golden outputs (one per AU return type)', () => {
  describe('individual shape', () => {
    it('computeIndividual returns all required labels with Decimal values and source arrays', () => {
      const result = computeIndividual(baseInput as IndividualInput);
      const keys = ['6S', '6K', '6L', '6N', '6Q', '7T'] as const;
      for (const key of keys) {
        expect(result[key].value, `${key}.value must be Decimal`).toBeInstanceOf(Decimal);
        expect(Array.isArray(result[key].source), `${key}.source must be array`).toBe(true);
      }
    });
  });

  describe('company shape', () => {
    it('computeCompany returns all required labels with Decimal values and source arrays', () => {
      const result = computeCompany(baseInput as CompanyInput);
      const keys = ['6A', '6F', '6T', '6C', '6G', '6X', '6S', '7T'] as const;
      for (const key of keys) {
        expect(result[key].value, `${key}.value must be Decimal`).toBeInstanceOf(Decimal);
        expect(Array.isArray(result[key].source), `${key}.source must be array`).toBe(true);
      }
    });
  });

  describe('trust shape', () => {
    it('computeTrust returns all required labels with Decimal values and source arrays', () => {
      const result = computeTrust(baseInput as TrustInput);
      const keys = ['5B', '11J', '5T', '5E', '5F', '5L', '5M', '5N', '5S', '26'] as const;
      for (const key of keys) {
        expect(result[key].value, `${key}.value must be Decimal`).toBeInstanceOf(Decimal);
        expect(Array.isArray(result[key].source), `${key}.source must be array`).toBe(true);
      }
    });
  });

  describe('partnership shape', () => {
    it('computePartnership returns all required labels with Decimal values and source arrays', () => {
      const result = computePartnership(baseInput as PartnershipInput);
      const keys = ['P1', 'P2', 'P8'] as const;
      for (const key of keys) {
        expect(result[key].value, `${key}.value must be Decimal`).toBeInstanceOf(Decimal);
        expect(Array.isArray(result[key].source), `${key}.source must be array`).toBe(true);
      }
    });
  });

  // ── Relocated-math tests ────────────────────────────────────────────────

  describe('individual relocated math', () => {
    it('$1000 credit on Revenue account (taxLabel 6S) → computeIndividual 6S = 1000', () => {
      const account: Account = {
        id: 'acc-sales', code: '4100', name: 'Sales', type: 'Revenue',
        taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B', partnershipTaxLabel: 'P1',
        gstCode: 'GST',
      };
      const entry: JournalEntry = {
        id: 'je-1', date: '2026-01-01', reference: 'REF-001', description: 'Test',
        isPosted: true,
        lines: [{ accountId: 'acc-sales', description: 'Sale', credit: 1000, debit: 0, taxAmount: 0 }],
      };
      const input: IndividualInput = { ...baseInput, entries: [entry], accounts: [account] };
      const result = computeIndividual(input);
      expect(result['6S'].value.eq(new Decimal(1000))).toBe(true);
    });

    it('$500 debit on Expense account (taxLabel 6L) → computeIndividual 6L = 500', () => {
      const account: Account = {
        id: 'acc-wages', code: '6400', name: 'Wages & Salaries', type: 'Expense',
        taxLabel: '6L', companyTaxLabel: '6X', trustTaxLabel: '5M', partnershipTaxLabel: 'P2',
        gstCode: 'N-T',
      };
      const entry: JournalEntry = {
        id: 'je-2', date: '2026-01-01', reference: 'REF-002', description: 'Wages',
        isPosted: true,
        lines: [{ accountId: 'acc-wages', description: 'Wages', credit: 0, debit: 500, taxAmount: 0 }],
      };
      const input: IndividualInput = { ...baseInput, entries: [entry], accounts: [account] };
      const result = computeIndividual(input);
      expect(result['6L'].value.eq(new Decimal(500))).toBe(true);
    });

    it('7T = income - expenses', () => {
      const salesAccount: Account = {
        id: 'acc-s', code: '4100', name: 'Sales', type: 'Revenue',
        taxLabel: '6S', gstCode: 'GST',
      };
      const wagesAccount: Account = {
        id: 'acc-w', code: '6400', name: 'Wages', type: 'Expense',
        taxLabel: '6L', gstCode: 'N-T',
      };
      const entries: JournalEntry[] = [
        {
          id: 'je-s', date: '2026-01-01', reference: 'R1', description: 'Sales',
          isPosted: true,
          lines: [{ accountId: 'acc-s', description: '', credit: 2000, debit: 0, taxAmount: 0 }],
        },
        {
          id: 'je-w', date: '2026-01-15', reference: 'R2', description: 'Wages',
          isPosted: true,
          lines: [{ accountId: 'acc-w', description: '', credit: 0, debit: 800, taxAmount: 0 }],
        },
      ];
      const input: IndividualInput = { ...baseInput, entries, accounts: [salesAccount, wagesAccount] };
      const result = computeIndividual(input);
      // 7T = 2000 (income) - 800 (expenses) = 1200
      expect(result['7T'].value.eq(new Decimal(1200))).toBe(true);
    });
  });

  describe('company relocated math', () => {
    it('$1000 credit on Revenue account (companyTaxLabel 6A) → computeCompany 6A = 1000', () => {
      const account: Account = {
        id: 'acc-sales', code: '4100', name: 'Sales', type: 'Revenue',
        taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B', partnershipTaxLabel: 'P1',
        gstCode: 'GST',
      };
      const entry: JournalEntry = {
        id: 'je-1', date: '2026-01-01', reference: 'REF-001', description: 'Test',
        isPosted: true,
        lines: [{ accountId: 'acc-sales', description: 'Sale', credit: 1000, debit: 0, taxAmount: 0 }],
      };
      const input: CompanyInput = { ...baseInput, entries: [entry], accounts: [account] };
      const result = computeCompany(input);
      expect(result['6A'].value.eq(new Decimal(1000))).toBe(true);
    });
  });

  describe('trust relocated math', () => {
    it('$1000 credit on Revenue account (trustTaxLabel 5B) → computeTrust 5B = 1000', () => {
      const account: Account = {
        id: 'acc-sales', code: '4100', name: 'Sales', type: 'Revenue',
        taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B', partnershipTaxLabel: 'P1',
        gstCode: 'GST',
      };
      const entry: JournalEntry = {
        id: 'je-1', date: '2026-01-01', reference: 'REF-001', description: 'Test',
        isPosted: true,
        lines: [{ accountId: 'acc-sales', description: 'Sale', credit: 1000, debit: 0, taxAmount: 0 }],
      };
      const input: TrustInput = { ...baseInput, entries: [entry], accounts: [account] };
      const result = computeTrust(input);
      expect(result['5B'].value.eq(new Decimal(1000))).toBe(true);
    });
  });

  describe('partnership stub', () => {
    it('$800 credit on Revenue account (partnershipTaxLabel P1) → computePartnership P1 = 800', () => {
      const account: Account = {
        id: 'acc-sales', code: '4100', name: 'Sales', type: 'Revenue',
        taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B', partnershipTaxLabel: 'P1',
        gstCode: 'GST',
      };
      const entry: JournalEntry = {
        id: 'je-1', date: '2026-01-01', reference: 'REF-001', description: 'Test',
        isPosted: true,
        lines: [{ accountId: 'acc-sales', description: 'Sale', credit: 800, debit: 0, taxAmount: 0 }],
      };
      const input: PartnershipInput = { ...baseInput, entries: [entry], accounts: [account] };
      const result = computePartnership(input);
      expect(result['P1'].value.eq(new Decimal(800))).toBe(true);
    });

    it('P8 = P1 - P2', () => {
      const salesAccount: Account = {
        id: 'acc-s', code: '4100', name: 'Sales', type: 'Revenue',
        partnershipTaxLabel: 'P1', gstCode: 'GST',
      };
      const wagesAccount: Account = {
        id: 'acc-w', code: '6400', name: 'Wages', type: 'Expense',
        partnershipTaxLabel: 'P2', gstCode: 'N-T',
      };
      const entries: JournalEntry[] = [
        {
          id: 'je-s', date: '2026-01-01', reference: 'R1', description: 'Sales',
          isPosted: true,
          lines: [{ accountId: 'acc-s', description: '', credit: 5000, debit: 0, taxAmount: 0 }],
        },
        {
          id: 'je-w', date: '2026-01-15', reference: 'R2', description: 'Wages',
          isPosted: true,
          lines: [{ accountId: 'acc-w', description: '', credit: 0, debit: 2000, taxAmount: 0 }],
        },
      ];
      const input: PartnershipInput = { ...baseInput, entries, accounts: [salesAccount, wagesAccount] };
      const result = computePartnership(input);
      expect(result['P1'].value.eq(new Decimal(5000))).toBe(true);
      expect(result['P2'].value.eq(new Decimal(2000))).toBe(true);
      expect(result['P8'].value.eq(new Decimal(3000))).toBe(true);
    });
  });

  // ── Phase 5 golden output placeholders ─────────────────────────────────

  it.todo('computeIndividual returns ATO-correct 6S for fixture with known sales — Phase 5');
  it.todo('computeCompany returns ATO-correct BRE rate selection for 25%/30% threshold — Phase 5');
  it.todo('computeTrust net income reconciles to per-beneficiary distributions — Phase 5');
  it.todo('computePartnership net income split per partner-register percentages — Phase 5');
});
