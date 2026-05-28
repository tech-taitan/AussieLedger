/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Plan 05-4 tests for computeIas.
 */
import { describe, it, expect } from 'vitest';
import { computeIas } from '../ias';
import type { Account, JournalEntry, Entity } from '../../../../../types';
import type { Period } from '../../../../period';

const q1Period: Period = { type: 'quarter', fy: 'FY2026', q: 1 };

const nonGstEntity: Entity = {
  _v: 4,
  id: 'e1',
  name: 'Non-GST Sole Trader',
  type: 'Individual',
  status: 'Active',
  gstRegistered: false,
  paygInstalmentAmount: '750',
};

const accounts: Account[] = [
  { _v: 4, id: 'a-wages', code: '6100', name: 'Wages', type: 'Expense',   gstCode: 'N-T' },
  { _v: 4, id: 'a-payg',  code: '2100', name: 'PAYG Withholding', type: 'Liability', gstCode: 'N-T' },
  { _v: 4, id: 'a-cash',  code: '1010', name: 'Cash at Bank',    type: 'Asset',     gstCode: 'N-T' },
  { _v: 4, id: 'a-rev',   code: '4010', name: 'Services (GST)',  type: 'Revenue',   gstCode: 'GST' },
];

describe('computeIas', () => {
  it('W1 W2 T7 — non-GST entity → IAS labels only, no G1/1A', () => {
    const entries: JournalEntry[] = [
      {
        _v: 4, id: 'j1', date: '2025-07-31', reference: 'PAY-1', description: '',
        isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-wages', description: '', debit: 5000, credit: 0,    taxAmount: 0 },
          { accountId: 'a-payg',  description: '', debit: 0,    credit: 500,  taxAmount: 0 },
          { accountId: 'a-cash',  description: '', debit: 0,    credit: 4500, taxAmount: 0 },
        ],
      },
    ];

    const r = computeIas({ entity: nonGstEntity, accounts, entries, period: q1Period });

    // Should have PAYG labels
    expect(r.labels.W1?.value.toFixed(2)).toBe('5000.00');
    expect(r.labels.W2?.value.toFixed(2)).toBe('500.00');
    expect(r.labels.T7?.value.toFixed(2)).toBe('750.00');
    expect(r.meta.shape).toBe('IAS');

    // Should NOT have G1/1A/1B (IAS label set doesn't have them)
    const labelKeys = Object.keys(r.labels);
    expect(labelKeys).not.toContain('G1');
    expect(labelKeys).not.toContain('1A');
    expect(labelKeys).not.toContain('1B');
  });

  it('T7 from entity.paygInstalmentAmount when set', () => {
    const entityWithT7: Entity = { ...nonGstEntity, paygInstalmentAmount: '2500' };
    const r = computeIas({ entity: entityWithT7, accounts, entries: [], period: q1Period });
    expect(r.labels.T7?.value.toFixed(2)).toBe('2500.00');
  });
});
