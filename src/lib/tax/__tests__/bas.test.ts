import { describe, it, expect } from 'vitest';
import { Decimal } from '../../money';
import { computeBas } from '../bas';
import type { BasInput } from '../types';
import type { Account, JournalEntry } from '../../../types';

const baseInput: BasInput = {
  fy: 'FY2026',
  entries: [],
  accounts: [],
  period: { type: 'fy', fy: 'FY2026' },
};

// ── Shape tests ────────────────────────────────────────────────────────────

describe('BAS per-label arithmetic', () => {
  describe('bas shape', () => {
    it('computeBas returns all required fields with Decimal values and source arrays', () => {
      const result = computeBas(baseInput);
      const keys = ['G1', 'G2', 'G3', 'G10', 'G11', '1A', '1B', 'W1', 'W2', 'netGst'] as const;
      for (const key of keys) {
        expect(result[key].value, `${key}.value must be Decimal`).toBeInstanceOf(Decimal);
        expect(Array.isArray(result[key].source), `${key}.source must be array`).toBe(true);
      }
    });

    it('returns zero Decimal for all labels when entries are empty', () => {
      const result = computeBas(baseInput);
      expect(result.G1.value.eq(0)).toBe(true);
      expect(result.netGst.value.eq(0)).toBe(true);
    });
  });

  // ── Relocated-math tests ────────────────────────────────────────────────

  describe('G1 Total sales (incl GST) sums GST-coded revenue lines', () => {
    it('Revenue credit of $1100 → G1 = 1100', () => {
      const account: Account = {
        id: 'acc-sales', code: '4100', name: 'Sales', type: 'Revenue',
        gstCode: 'GST',
      };
      const entry: JournalEntry = {
        id: 'je-1', date: '2026-01-01', reference: 'R1', description: 'Sale',
        isPosted: true,
        lines: [{ accountId: 'acc-sales', description: '', credit: 1100, debit: 0, taxAmount: 100 }],
      };
      const result = computeBas({ ...baseInput, entries: [entry], accounts: [account] });
      expect(result.G1.value.eq(new Decimal(1100))).toBe(true);
    });

    it('1A is populated from taxAmount on GST-coded revenue', () => {
      const account: Account = {
        id: 'acc-sales', code: '4100', name: 'Sales', type: 'Revenue',
        gstCode: 'GST',
      };
      const entry: JournalEntry = {
        id: 'je-1', date: '2026-01-01', reference: 'R1', description: 'Sale',
        isPosted: true,
        lines: [{ accountId: 'acc-sales', description: '', credit: 1100, debit: 0, taxAmount: 100 }],
      };
      const result = computeBas({ ...baseInput, entries: [entry], accounts: [account] });
      expect(result['1A'].value.eq(new Decimal(100))).toBe(true);
    });
  });

  describe('G3 Other GST-free sales (FRE-coded revenue)', () => {
    it('FRE-coded Revenue credit → G3 populated', () => {
      const account: Account = {
        id: 'acc-interest', code: '4200', name: 'Interest Income', type: 'Revenue',
        gstCode: 'FRE',
      };
      const entry: JournalEntry = {
        id: 'je-2', date: '2026-01-01', reference: 'R2', description: 'Interest',
        isPosted: true,
        lines: [{ accountId: 'acc-interest', description: '', credit: 500, debit: 0, taxAmount: 0 }],
      };
      const result = computeBas({ ...baseInput, entries: [entry], accounts: [account] });
      expect(result.G3.value.eq(new Decimal(500))).toBe(true);
    });

    it('FRE-coded revenue also contributes to G1', () => {
      const account: Account = {
        id: 'acc-interest', code: '4200', name: 'Interest Income', type: 'Revenue',
        gstCode: 'FRE',
      };
      const entry: JournalEntry = {
        id: 'je-2', date: '2026-01-01', reference: 'R2', description: 'Interest',
        isPosted: true,
        lines: [{ accountId: 'acc-interest', description: '', credit: 500, debit: 0, taxAmount: 0 }],
      };
      const result = computeBas({ ...baseInput, entries: [entry], accounts: [account] });
      expect(result.G1.value.eq(new Decimal(500))).toBe(true);
    });
  });

  describe('G10 Capital purchases', () => {
    it('Asset with gstCode GST and positive debit → G10 populated', () => {
      const account: Account = {
        id: 'acc-asset', code: '1200', name: 'Equipment', type: 'Asset',
        gstCode: 'GST',
      };
      const entry: JournalEntry = {
        id: 'je-3', date: '2026-01-01', reference: 'R3', description: 'Equipment purchase',
        isPosted: true,
        lines: [{ accountId: 'acc-asset', description: '', credit: 0, debit: 2200, taxAmount: 200 }],
      };
      const result = computeBas({ ...baseInput, entries: [entry], accounts: [account] });
      expect(result.G10.value.eq(new Decimal(2200))).toBe(true);
      expect(result['1B'].value.eq(new Decimal(200))).toBe(true);
    });
  });

  describe('G11 Non-capital purchases (incl GST)', () => {
    it('Non-wage Expense debit → G11 populated', () => {
      const account: Account = {
        id: 'acc-adv', code: '6100', name: 'Advertising', type: 'Expense',
        gstCode: 'GST',
      };
      const entry: JournalEntry = {
        id: 'je-4', date: '2026-01-01', reference: 'R4', description: 'Ad spend',
        isPosted: true,
        lines: [{ accountId: 'acc-adv', description: '', credit: 0, debit: 550, taxAmount: 50 }],
      };
      const result = computeBas({ ...baseInput, entries: [entry], accounts: [account] });
      expect(result.G11.value.eq(new Decimal(550))).toBe(true);
      expect(result['1B'].value.eq(new Decimal(50))).toBe(true);
    });
  });

  describe('W1 and W2', () => {
    it('Wage Expense → W1 populated, not G11', () => {
      const account: Account = {
        id: 'acc-wages', code: '6400', name: 'Wages & Salaries', type: 'Expense',
        gstCode: 'N-T',
      };
      const entry: JournalEntry = {
        id: 'je-5', date: '2026-01-01', reference: 'R5', description: 'Payroll',
        isPosted: true,
        lines: [{ accountId: 'acc-wages', description: '', credit: 0, debit: 3000, taxAmount: 0 }],
      };
      const result = computeBas({ ...baseInput, entries: [entry], accounts: [account] });
      expect(result.W1.value.eq(new Decimal(3000))).toBe(true);
      expect(result.G11.value.eq(new Decimal(0))).toBe(true);
    });
  });

  describe('netGst', () => {
    it('netGst = 1A - 1B', () => {
      const salesAcc: Account = {
        id: 'acc-s', code: '4100', name: 'Sales', type: 'Revenue', gstCode: 'GST',
      };
      const expenseAcc: Account = {
        id: 'acc-e', code: '6100', name: 'Advertising', type: 'Expense', gstCode: 'GST',
      };
      const entries: JournalEntry[] = [
        {
          id: 'je-s', date: '2026-01-01', reference: 'R1', description: 'Sales',
          isPosted: true,
          lines: [{ accountId: 'acc-s', description: '', credit: 1100, debit: 0, taxAmount: 100 }],
        },
        {
          id: 'je-e', date: '2026-01-15', reference: 'R2', description: 'Ad spend',
          isPosted: true,
          lines: [{ accountId: 'acc-e', description: '', credit: 0, debit: 550, taxAmount: 50 }],
        },
      ];
      const result = computeBas({ ...baseInput, entries, accounts: [salesAcc, expenseAcc] });
      expect(result['1A'].value.eq(new Decimal(100))).toBe(true);
      expect(result['1B'].value.eq(new Decimal(50))).toBe(true);
      expect(result.netGst.value.eq(new Decimal(50))).toBe(true);
    });
  });

  // ── Phase 5 golden output placeholders ─────────────────────────────────

  it.todo('G1 Total sales (incl GST) sums GST-coded revenue lines — Phase 5 full fixture');
  it.todo('G2 Export sales — Phase 5 when export flag is added to Account');
  it.todo('G3 Other GST-free sales (FRE-coded revenue) — Phase 5 full fixture');
  it.todo('G10 Capital purchases — Phase 5 full fixture');
  it.todo('G11 Non-capital purchases (incl GST) — Phase 5 full fixture');
  it.todo('1A GST on sales — Phase 5 full fixture');
  it.todo('1B GST on purchases — Phase 5 full fixture');
});
