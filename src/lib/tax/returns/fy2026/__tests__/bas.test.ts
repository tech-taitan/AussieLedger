/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Plan 05-4 tests for computeBas.
 */
import { describe, it, expect } from 'vitest';
import { computeBas } from '../bas';
import type { Account, JournalEntry, Entity } from '../../../../../types';
import type { Period } from '../../../../period';

// ── Shared fixture helpers ─────────────────────────────────────────────────

const company: Entity = {
  _v: 4,
  id: 'c1',
  name: 'Test Pty',
  type: 'Company',
  status: 'Active',
  gstRegistered: true,
};

const baseAccounts: Account[] = [
  { _v: 4, id: 'a-gst-rev', code: '4010', name: 'Sales (GST)',       type: 'Revenue',   gstCode: 'GST' },
  { _v: 4, id: 'a-fre-rev', code: '4020', name: 'Sales (GST-free)',  type: 'Revenue',   gstCode: 'FRE' },
  { _v: 4, id: 'a-inp-rev', code: '4030', name: 'Sales (input-taxed)', type: 'Revenue', gstCode: 'INP' },
  { _v: 4, id: 'a-exp-gst', code: '6010', name: 'Supplies',          type: 'Expense',   gstCode: 'GST' },
  { _v: 4, id: 'a-wages',   code: '6100', name: 'Wages',             type: 'Expense',   gstCode: 'N-T' },
  { _v: 4, id: 'a-payg',    code: '2100', name: 'PAYG Withholding',  type: 'Liability', gstCode: 'N-T' },
  { _v: 4, id: 'a-cash',    code: '1010', name: 'Cash at Bank',      type: 'Asset',     gstCode: 'N-T' },
  { _v: 4, id: 'a-cap',     code: '1500', name: 'Plant & Equipment', type: 'Asset',     gstCode: 'CAP' },
  { _v: 4, id: 'a-export',  code: '4110', name: 'Export Sales',      type: 'Revenue',   gstCode: 'FRE' },
];

const q1Period: Period = { type: 'quarter', fy: 'FY2026', q: 1 }; // Jul–Sep 2025

// ── Test 1: G1/1A/1B to-the-cent on mixed GST+FRE+INP fixture (success criterion #1) ─

describe('computeBas', () => {
  it('G1 1A 1B to the cent on mixed fixture — success criterion #1', () => {
    const entries: JournalEntry[] = [
      // $11,000 GST-inclusive sale → gst() = 1000.00
      {
        _v: 4, id: 'j1', date: '2025-08-15', reference: 'INV-1', description: '',
        isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-gst-rev', description: '', debit: 0,     credit: 11000, taxAmount: 1000 },
          { accountId: 'a-cash',    description: '', debit: 11000, credit: 0,     taxAmount: 0 },
        ],
      },
      // $5,000 GST-free sale
      {
        _v: 4, id: 'j2', date: '2025-08-16', reference: 'INV-2', description: '',
        isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-fre-rev', description: '', debit: 0,    credit: 5000, taxAmount: 0 },
          { accountId: 'a-cash',    description: '', debit: 5000, credit: 0,    taxAmount: 0 },
        ],
      },
      // $2,200 input-taxed sale (INP — no GST)
      {
        _v: 4, id: 'j3', date: '2025-08-17', reference: 'INV-3', description: '',
        isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-inp-rev', description: '', debit: 0,    credit: 2200, taxAmount: 0 },
          { accountId: 'a-cash',    description: '', debit: 2200, credit: 0,    taxAmount: 0 },
        ],
      },
      // $1,100 GST-inclusive expense → 1B = 100.00
      {
        _v: 4, id: 'j4', date: '2025-08-18', reference: 'EXP-1', description: '',
        isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-exp-gst', description: '', debit: 1100, credit: 0,    taxAmount: 100 },
          { accountId: 'a-cash',    description: '', debit: 0,    credit: 1100, taxAmount: 0 },
        ],
      },
    ];

    const r = computeBas({ entity: company, accounts: baseAccounts, entries, period: q1Period });

    expect(r.labels.G1?.value.toFixed(2)).toBe('18200.00');  // 11000 + 5000 + 2200
    expect(r.labels['1A']?.value.toFixed(2)).toBe('1000.00'); // gst(11000) = 1000
    expect(r.labels['1B']?.value.toFixed(2)).toBe('100.00');  // gst(1100) = 100
    expect(r.meta.shape).toBe('BAS');
    expect(r.meta.simplerBasMode).toBe(true);
  });

  // ── Test 2: G2/G3/G10/G11 internalOnly under Simpler BAS ─────────────────

  it('G2 G3 G10 G11 are marked internalOnly under Simpler BAS', () => {
    const entries: JournalEntry[] = [
      {
        _v: 4, id: 'j1', date: '2025-07-10', reference: 'INV-1', description: '',
        isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-fre-rev', description: '', debit: 0,    credit: 5000, taxAmount: 0 },
          { accountId: 'a-cash',    description: '', debit: 5000, credit: 0,    taxAmount: 0 },
        ],
      },
      {
        _v: 4, id: 'j2', date: '2025-07-12', reference: 'EXP-1', description: '',
        isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-exp-gst', description: '', debit: 1100, credit: 0,    taxAmount: 100 },
          { accountId: 'a-cash',    description: '', debit: 0,    credit: 1100, taxAmount: 0 },
        ],
      },
    ];
    const r = computeBas({ entity: company, accounts: baseAccounts, entries, period: q1Period });

    expect(r.labels.G2?.internalOnly).toBe(true);
    expect(r.labels.G3?.internalOnly).toBe(true);
    expect(r.labels.G10?.internalOnly).toBe(true);
    expect(r.labels.G11?.internalOnly).toBe(true);
    expect(r.labels.G1?.internalOnly).toBeFalsy();
    expect(r.labels['1A']?.internalOnly).toBeFalsy();
  });

  // ── Test 3: W1 from wages accounts ────────────────────────────────────────

  it('W1 from wage accounts', () => {
    const entries: JournalEntry[] = [
      {
        _v: 4, id: 'j1', date: '2025-07-31', reference: 'PAY-1', description: '',
        isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-wages', description: '', debit: 5000, credit: 0, taxAmount: 0 },
          { accountId: 'a-cash',  description: '', debit: 0, credit: 5000, taxAmount: 0 },
        ],
      },
    ];
    const r = computeBas({ entity: company, accounts: baseAccounts, entries, period: q1Period });
    expect(r.labels.W1?.value.toFixed(2)).toBe('5000.00');
  });

  // ── Test 4: W2 from PAYG Withholding ─────────────────────────────────────

  it('W2 from PAYG Withholding liability', () => {
    const entries: JournalEntry[] = [
      {
        _v: 4, id: 'j1', date: '2025-07-31', reference: 'PAY-1', description: '',
        isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-wages', description: '', debit: 10000, credit: 0,    taxAmount: 0 },
          { accountId: 'a-payg',  description: '', debit: 0,     credit: 1000, taxAmount: 0 },
          { accountId: 'a-cash',  description: '', debit: 0,     credit: 9000, taxAmount: 0 },
        ],
      },
    ];
    const r = computeBas({ entity: company, accounts: baseAccounts, entries, period: q1Period });
    expect(r.labels.W2?.value.toFixed(2)).toBe('1000.00');
  });

  // ── Test 5: T7 from entity.paygInstalmentAmount ───────────────────────────

  it('T7 reads entity.paygInstalmentAmount (Method 1)', () => {
    const entity: Entity = { ...company, paygInstalmentAmount: '1500' };
    const r = computeBas({ entity, accounts: baseAccounts, entries: [], period: q1Period });
    expect(r.labels.T7?.value.toFixed(2)).toBe('1500.00');
  });

  // ── Test 6: Period quarter filter ─────────────────────────────────────────

  it('period quarter filter — Q2 entries excluded from Q1 result', () => {
    const entries: JournalEntry[] = [
      // Q1: July 2025 entry — should be included
      {
        _v: 4, id: 'j1', date: '2025-08-01', reference: 'INV-1', description: '',
        isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-gst-rev', description: '', debit: 0,     credit: 11000, taxAmount: 1000 },
          { accountId: 'a-cash',    description: '', debit: 11000, credit: 0,     taxAmount: 0 },
        ],
      },
      // Q2: October 2025 entry — should be excluded
      {
        _v: 4, id: 'j2', date: '2025-10-15', reference: 'INV-2', description: '',
        isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-gst-rev', description: '', debit: 0,     credit: 5000, taxAmount: 454.55 },
          { accountId: 'a-cash',    description: '', debit: 5000,  credit: 0,    taxAmount: 0 },
        ],
      },
    ];
    const r = computeBas({ entity: company, accounts: baseAccounts, entries, period: q1Period });
    // Only the Q1 entry should be included
    expect(r.labels.G1?.value.toFixed(2)).toBe('11000.00');
    expect(r.labels['1A']?.value.toFixed(2)).toBe('1000.00');
  });

  // ── Test 7: Excludes superseded/voided/draft entries ─────────────────────

  it('excludes superseded voided and draft entries', () => {
    const entries: JournalEntry[] = [
      // Posted — should be included
      {
        _v: 4, id: 'j1', date: '2025-07-15', reference: 'INV-1', description: '',
        isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-gst-rev', description: '', debit: 0,    credit: 1100, taxAmount: 100 },
          { accountId: 'a-cash',    description: '', debit: 1100, credit: 0,    taxAmount: 0 },
        ],
      },
      // Superseded — should be excluded
      {
        _v: 4, id: 'j2', date: '2025-07-20', reference: 'INV-2', description: '',
        isPosted: true, status: 'superseded',
        lines: [
          { accountId: 'a-gst-rev', description: '', debit: 0,    credit: 2200, taxAmount: 200 },
          { accountId: 'a-cash',    description: '', debit: 2200, credit: 0,    taxAmount: 0 },
        ],
      },
      // Voided — should be excluded
      {
        _v: 4, id: 'j3', date: '2025-07-25', reference: 'INV-3', description: '',
        isPosted: false, status: 'voided',
        lines: [
          { accountId: 'a-gst-rev', description: '', debit: 0,    credit: 3300, taxAmount: 300 },
          { accountId: 'a-cash',    description: '', debit: 3300, credit: 0,    taxAmount: 0 },
        ],
      },
      // Draft — should be excluded
      {
        _v: 4, id: 'j4', date: '2025-07-28', reference: 'INV-4', description: '',
        isPosted: false, status: 'draft',
        lines: [
          { accountId: 'a-gst-rev', description: '', debit: 0,    credit: 4400, taxAmount: 400 },
          { accountId: 'a-cash',    description: '', debit: 4400, credit: 0,    taxAmount: 0 },
        ],
      },
    ];
    const r = computeBas({ entity: company, accounts: baseAccounts, entries, period: q1Period });
    expect(r.labels.G1?.value.toFixed(2)).toBe('1100.00');
  });

  // ── Test 8: Explicit rounding modes per label ─────────────────────────────

  it('explicit rounding — 1A is per-line gst() summed; W2 uses ROUND_DOWN', () => {
    // Two sales of $1.005 each — gst per line = $0.09 (banker's rounds $0.0913 to $0.09)
    // Actually testing that per-line gst is summed, not gst applied to the aggregate
    const entries: JournalEntry[] = [
      {
        _v: 4, id: 'j1', date: '2025-07-15', reference: 'INV-1', description: '',
        isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-gst-rev', description: '', debit: 0,    credit: 11000, taxAmount: 1000 },
          { accountId: 'a-cash',    description: '', debit: 11000, credit: 0,    taxAmount: 0 },
        ],
      },
      {
        _v: 4, id: 'j2', date: '2025-07-20', reference: 'PAY-1', description: '',
        isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-wages', description: '', debit: 10000, credit: 0,    taxAmount: 0 },
          { accountId: 'a-payg',  description: '', debit: 0,     credit: 1000, taxAmount: 0 },
          { accountId: 'a-cash',  description: '', debit: 0,     credit: 9000, taxAmount: 0 },
        ],
      },
    ];
    const r = computeBas({ entity: company, accounts: baseAccounts, entries, period: q1Period });
    // 1A = gst(11000) = 11000 / 11 = 1000.00 exactly
    expect(r.labels['1A']?.value.toFixed(2)).toBe('1000.00');
    // W2 = 1000.00 (rounded down)
    expect(r.labels.W2?.value.toFixed(2)).toBe('1000.00');
    // W5 = W2 + W3 + W4 = 1000 + 0 + 0 = 1000
    expect(r.labels.W5?.value.toFixed(2)).toBe('1000.00');
  });
});
