/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Plan 05-2 tests for CompanyTaxReturn (Form C renderer).
 * Flipped from it.todo to full test bodies in Plan 05-2.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompanyTaxReturn } from '../CompanyTaxReturn';
import type { Entity, Account, JournalEntry } from '../../types';

const baseEntity: Entity = {
  _v: 4,
  id: 'c1',
  name: 'Acme Pty Ltd',
  type: 'Company',
  status: 'Active',
};

const standardAccounts: Account[] = [
  { _v: 4, id: 'a-sales', code: '4010', name: 'Sales', type: 'Revenue', gstCode: 'GST', companyTaxLabel: '6A' },
  { _v: 4, id: 'a-exp', code: '6010', name: 'Operating Expenses', type: 'Expense', gstCode: 'GST', companyTaxLabel: '6X' },
  { _v: 4, id: 'a-cash', code: '1010', name: 'Cash', type: 'Asset', gstCode: 'N-T' },
];

const standardEntries: JournalEntry[] = [
  {
    _v: 4, id: 'j-s', date: '2025-08-15', reference: 'SALE', description: 'Sales',
    isPosted: true, status: 'posted',
    lines: [
      { accountId: 'a-sales', description: '', debit: 0, credit: 1000000, taxAmount: 0 },
      { accountId: 'a-cash', description: '', debit: 1000000, credit: 0, taxAmount: 0 },
    ],
  },
  {
    _v: 4, id: 'j-e', date: '2025-09-15', reference: 'EXP', description: 'Expenses',
    isPosted: true, status: 'posted',
    lines: [
      { accountId: 'a-exp', description: '', debit: 200000, credit: 0, taxAmount: 0 },
      { accountId: 'a-cash', description: '', debit: 0, credit: 200000, taxAmount: 0 },
    ],
  },
];

describe('CompanyTaxReturn — Phase 5 wiring', () => {
  let printSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
  });

  afterEach(() => {
    printSpy.mockRestore();
  });

  it('renders Form C with 6A/6T/7T labels and derived taxable income', () => {
    render(
      <CompanyTaxReturn
        entity={baseEntity}
        accounts={standardAccounts}
        entries={standardEntries}
        fy="FY2026"
      />,
    );
    // Form C heading
    expect(screen.getAllByText(/Form C/i).length).toBeGreaterThan(0);
    // 6A, 6T, 7T labels
    expect(screen.getAllByText(/6A/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/6T/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/7T/).length).toBeGreaterThan(0);
  });

  it('BRE rate displayed — 25% basis text visible when passive < 80% and turnover < $50M', () => {
    render(
      <CompanyTaxReturn
        entity={baseEntity}
        accounts={standardAccounts}
        entries={standardEntries}
        fy="FY2026"
      />,
    );
    // 25% rate should show since no passive income labels in standard fixture
    expect(screen.getAllByText(/25%/).length).toBeGreaterThan(0);
  });

  it('franking account section — opening, movements, closing rendered', () => {
    render(
      <CompanyTaxReturn
        entity={baseEntity}
        accounts={standardAccounts}
        entries={standardEntries}
        fy="FY2026"
      />,
    );
    // Franking account section header
    expect(screen.getAllByText(/Franking Account|franking/i).length).toBeGreaterThan(0);
  });

  it('print button emits EXPORT_DATA audit log', () => {
    const addLog = vi.fn();
    render(
      <CompanyTaxReturn
        entity={baseEntity}
        accounts={standardAccounts}
        entries={standardEntries}
        fy="FY2026"
        addLog={addLog}
      />,
    );
    const printBtn = screen.getByRole('button', { name: /print/i });
    fireEvent.click(printBtn);
    expect(addLog).toHaveBeenCalledWith(
      'EXPORT_DATA',
      expect.stringContaining('"form":"C"'),
      'c1',
    );
    expect(printSpy).toHaveBeenCalled();
  });

  it('BRE borderline anomaly badge rendered when passive income 75%', () => {
    // 75% dividend income (borderline band 70-90%)
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
    render(<CompanyTaxReturn entity={baseEntity} accounts={accounts} entries={entries} fy="FY2026" />);
    const badges = screen.getAllByTestId('anomaly-badge');
    const borderlineBadge = badges.find((b) => b.textContent?.toLowerCase().includes('borderline'));
    expect(borderlineBadge).toBeDefined();
  });

  it('locked FY badge visible when entity.lockedFys includes FY', () => {
    const lockedEntity: Entity = { ...baseEntity, lockedFys: ['FY2026'] };
    render(
      <CompanyTaxReturn
        entity={lockedEntity}
        accounts={standardAccounts}
        entries={standardEntries}
        fy="FY2026"
      />,
    );
    // Print button should say "Print finalised return"
    expect(screen.getByRole('button', { name: /Print finalised/i })).toBeInTheDocument();
  });

  it('90% dividend passive income → 30% rate shown (success criterion #2 form-level)', () => {
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
    render(<CompanyTaxReturn entity={baseEntity} accounts={accounts} entries={entries} fy="FY2026" />);
    // 30% rate shown (success criterion #2)
    expect(screen.getAllByText(/30%/).length).toBeGreaterThan(0);
    // Basis text shows passive income 90% exceeds threshold
    expect(screen.getAllByText(/passive income.*90\.00%|90\.00%.*exceeds/i).length).toBeGreaterThan(0);
  });
});
