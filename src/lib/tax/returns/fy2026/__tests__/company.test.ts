/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Plan 05-2 tests for computeCompanyReturn.
 * Flipped from it.todo to full test bodies in Plan 05-2.
 */
import { describe, it, expect } from 'vitest';
import { computeCompanyReturn } from '../company';
import type { Entity, Account, JournalEntry } from '../../../../../types';

const baseEntity: Entity = {
  _v: 4,
  id: 'c1',
  name: 'Acme Pty Ltd',
  type: 'Company',
  status: 'Active',
};

// Standard fixture: $1M sales, $200k expenses → taxable $800k, passive < 80%
const standardAccounts: Account[] = [
  { _v: 4, id: 'a-sales', code: '4010', name: 'Sales', type: 'Revenue', gstCode: 'GST', companyTaxLabel: '6A' },
  { _v: 4, id: 'a-exp', code: '6010', name: 'Operating Expenses', type: 'Expense', gstCode: 'GST', companyTaxLabel: '6X' },
  { _v: 4, id: 'a-cash', code: '1010', name: 'Cash', type: 'Asset', gstCode: 'N-T' },
];

const standardEntries: JournalEntry[] = [
  {
    _v: 4,
    id: 'j-s',
    date: '2025-08-15',
    reference: 'SALE',
    description: 'Sales revenue',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: 'a-sales', description: '', debit: 0, credit: 1000000, taxAmount: 0 },
      { accountId: 'a-cash', description: '', debit: 1000000, credit: 0, taxAmount: 0 },
    ],
  },
  {
    _v: 4,
    id: 'j-e',
    date: '2025-09-15',
    reference: 'EXP',
    description: 'Expenses',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: 'a-exp', description: '', debit: 200000, credit: 0, taxAmount: 0 },
      { accountId: 'a-cash', description: '', debit: 0, credit: 200000, taxAmount: 0 },
    ],
  },
];

describe('computeCompanyReturn', () => {
  it('6A 6T 7T from GL — gross sales + expenses → taxable income derived', () => {
    const r = computeCompanyReturn({
      entity: baseEntity,
      accounts: standardAccounts,
      entries: standardEntries,
      fy: 'FY2026',
    });
    expect(r.labels['6A']?.value.toFixed(2)).toBe('1000000.00');
    expect(r.labels['6T']?.value.toFixed(2)).toBe('1000000.00');
    expect(r.labels['6S']?.value.toFixed(2)).toBe('200000.00');
    expect(r.labels['7T']?.value.toFixed(2)).toBe('800000.00');
  });

  it('BRE 25% rate — passive income 10% of total, turnover < $50M', () => {
    // $1M sales (active 6A) + $100k interest (passive 6F)
    const accounts: Account[] = [
      { _v: 4, id: 'a-sales', code: '4010', name: 'Sales', type: 'Revenue', gstCode: 'GST', companyTaxLabel: '6A' },
      { _v: 4, id: 'a-int', code: '4210', name: 'Interest Income', type: 'Revenue', gstCode: 'N-T', companyTaxLabel: '6F' },
      { _v: 4, id: 'a-cash', code: '1010', name: 'Cash', type: 'Asset', gstCode: 'N-T' },
    ];
    const entries: JournalEntry[] = [
      {
        _v: 4, id: 'j-s', date: '2025-08-15', reference: 'SALE', description: '', isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-sales', description: '', debit: 0, credit: 1000000, taxAmount: 0 },
          { accountId: 'a-cash', description: '', debit: 1000000, credit: 0, taxAmount: 0 },
        ],
      },
      {
        _v: 4, id: 'j-i', date: '2025-09-15', reference: 'INT', description: '', isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-int', description: '', debit: 0, credit: 100000, taxAmount: 0 },
          { accountId: 'a-cash', description: '', debit: 100000, credit: 0, taxAmount: 0 },
        ],
      },
    ];
    const r = computeCompanyReturn({ entity: baseEntity, accounts, entries, fy: 'FY2026' });
    expect(r.meta.taxRate).toBe('0.25');
    expect(r.meta.taxRateBasis as string).toMatch(/25%/);
  });

  it('BRE 30% rate — 90% dividend income triggers full rate (success criterion #2 form-level)', () => {
    const accounts: Account[] = [
      { _v: 4, id: 'a-sales', code: '4010', name: 'Sales', type: 'Revenue', gstCode: 'GST', companyTaxLabel: '6A' },
      { _v: 4, id: 'a-div', code: '4210', name: 'Dividend Income', type: 'Revenue', gstCode: 'N-T', companyTaxLabel: '6H' },
      { _v: 4, id: 'a-cash', code: '1010', name: 'Cash', type: 'Asset', gstCode: 'N-T' },
    ];
    const entries: JournalEntry[] = [
      {
        _v: 4, id: 'j-s', date: '2025-08-15', reference: 'SALE', description: '', isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-sales', description: '', debit: 0, credit: 100000, taxAmount: 0 },
          { accountId: 'a-cash', description: '', debit: 100000, credit: 0, taxAmount: 0 },
        ],
      },
      {
        _v: 4, id: 'j-d', date: '2025-09-15', reference: 'DIV', description: '', isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-div', description: '', debit: 0, credit: 900000, taxAmount: 0 },
          { accountId: 'a-cash', description: '', debit: 900000, credit: 0, taxAmount: 0 },
        ],
      },
    ];
    const r = computeCompanyReturn({ entity: baseEntity, accounts, entries, fy: 'FY2026' });
    expect(r.meta.taxRate).toBe('0.3');
    // Success criterion #2: basis text must match (plan requires 'passive income 90.00% exceeds 80% BREPI threshold')
    // bre.ts produces: "30% applied — passive income (BREPI) 90.00% exceeds 80% threshold ..."
    expect(r.meta.taxRateBasis as string).toMatch(/passive income.*90\.00%.*exceeds 80%/);
  });

  it('franking account CS_A + CS_B − CS_J = CS_S closing balance', () => {
    const frankingAccounts: Account[] = [
      ...standardAccounts,
      {
        _v: 4, id: 'a-frank', code: '3090', name: 'Franking Account Balance',
        type: 'Equity', gstCode: 'N-T', companyTaxLabel: 'franking_open',
      },
    ];
    // Opening balance entry BEFORE FY2026 start (pre-1-Jul-2025)
    const openingEntry: JournalEntry = {
      _v: 4, id: 'j-frank-open', date: '2025-06-30', reference: 'FRANK-OPEN', description: 'Franking opening',
      isPosted: true, status: 'posted',
      lines: [
        { accountId: 'a-frank', description: '', debit: 0, credit: 10000, taxAmount: 0 },
        { accountId: 'a-cash', description: '', debit: 0, credit: 0, taxAmount: 0 },
      ],
    };
    const r = computeCompanyReturn({
      entity: baseEntity,
      accounts: frankingAccounts,
      entries: [...standardEntries, openingEntry],
      fy: 'FY2026',
    });
    // franking labels should be present
    expect(r.labels['franking_open']).toBeDefined();
    expect(r.labels['franking_move']).toBeDefined();
    expect(r.labels['franking_close']).toBeDefined();
    // Closing = opening + movements
    const open = r.labels['franking_open']!.value;
    const move = r.labels['franking_move']!.value;
    const close = r.labels['franking_close']!.value;
    expect(close.toFixed(2)).toBe(open.plus(move).toFixed(2));
  });

  it('franking deficit warning — CS_S < 0 emits warn anomaly', () => {
    const frankingAccounts: Account[] = [
      ...standardAccounts,
      {
        _v: 4, id: 'a-frank', code: '3090', name: 'Franking Account Balance',
        type: 'Equity', gstCode: 'N-T', companyTaxLabel: 'franking_open',
      },
    ];
    // Debit entry causes negative franking balance in FY (no prior positive balance)
    const deficitEntry: JournalEntry = {
      _v: 4, id: 'j-frank-def', date: '2025-08-15', reference: 'FRANK-DEF', description: 'Franking debit',
      isPosted: true, status: 'posted',
      lines: [
        { accountId: 'a-frank', description: '', debit: 50000, credit: 0, taxAmount: 0 },
        { accountId: 'a-cash', description: '', debit: 0, credit: 0, taxAmount: 0 },
      ],
    };
    const r = computeCompanyReturn({
      entity: baseEntity,
      accounts: frankingAccounts,
      entries: [deficitEntry], // No prior balance → negative
      fy: 'FY2026',
    });
    const fdtAnomaly = r.meta.anomalies.find((a) => a.id === 'fdt-warning');
    expect(fdtAnomaly).toBeDefined();
    expect(fdtAnomaly?.severity).toBe('warn');
  });

  it('BRE borderline anomaly — 75% passive emits warn with non-portfolio dividend caveat', () => {
    // 75% of income from dividends (borderline band 70–90%)
    const accounts: Account[] = [
      { _v: 4, id: 'a-sales', code: '4010', name: 'Sales', type: 'Revenue', gstCode: 'GST', companyTaxLabel: '6A' },
      { _v: 4, id: 'a-div', code: '4210', name: 'Dividends', type: 'Revenue', gstCode: 'N-T', companyTaxLabel: '6H' },
      { _v: 4, id: 'a-cash', code: '1010', name: 'Cash', type: 'Asset', gstCode: 'N-T' },
    ];
    const entries: JournalEntry[] = [
      {
        _v: 4, id: 'j-s', date: '2025-08-15', reference: 'SALE', description: '', isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-sales', description: '', debit: 0, credit: 250000, taxAmount: 0 },
          { accountId: 'a-cash', description: '', debit: 250000, credit: 0, taxAmount: 0 },
        ],
      },
      {
        _v: 4, id: 'j-d', date: '2025-09-15', reference: 'DIV', description: '', isPosted: true, status: 'posted',
        lines: [
          { accountId: 'a-div', description: '', debit: 0, credit: 750000, taxAmount: 0 },
          { accountId: 'a-cash', description: '', debit: 750000, credit: 0, taxAmount: 0 },
        ],
      },
    ];
    const r = computeCompanyReturn({ entity: baseEntity, accounts, entries, fy: 'FY2026' });
    const borderlineAnomaly = r.meta.anomalies.find((a) => a.id === 'bre-borderline');
    expect(borderlineAnomaly).toBeDefined();
    expect(borderlineAnomaly?.severity).toBe('warn');
    expect(borderlineAnomaly?.message).toMatch(/borderline/i);
  });

  it('locked FY anomaly present in meta', () => {
    const lockedEntity: Entity = { ...baseEntity, lockedFys: ['FY2026'] };
    const r = computeCompanyReturn({
      entity: lockedEntity,
      accounts: [],
      entries: [],
      fy: 'FY2026',
    });
    expect(r.meta.locked).toBe(true);
    const lockedAnomaly = r.meta.anomalies.find((a) => a.id === 'locked-fy');
    expect(lockedAnomaly).toBeDefined();
    expect(lockedAnomaly?.severity).toBe('info');
  });
});
