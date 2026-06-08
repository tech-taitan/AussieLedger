/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PartnershipTaxReturn tests — Wave 0 + Phase 5 Plan 05-3.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PartnershipTaxReturn } from '../PartnershipTaxReturn';
import type { Entity, Account, JournalEntry } from '../../types';

const fixtureEntity: Entity = {
  _v: 4,
  id: 'p1',
  name: 'Smith & Jones Partnership',
  type: 'Partnership',
  status: 'Active',
  partners: [
    { id: 'pr1', name: 'Smith', sharePercent: 50 },
    { id: 'pr2', name: 'Jones', sharePercent: 50 },
  ],
};

const fixtureAccounts: Account[] = [
  {
    _v: 4,
    id: 'a-sales',
    code: '4010',
    name: 'Partnership Sales',
    type: 'Revenue',
    gstCode: 'GST',
    partnershipTaxLabel: 'P1',
  },
  {
    _v: 4,
    id: 'a-expenses',
    code: '6010',
    name: 'General Expenses',
    type: 'Expense',
    gstCode: 'N-T',
    partnershipTaxLabel: 'P2',
  },
  {
    _v: 4,
    id: 'a-cash',
    code: '1010',
    name: 'Cash at Bank',
    type: 'Asset',
    gstCode: 'N-T',
  },
];

const fixtureEntries: JournalEntry[] = [
  {
    _v: 4,
    id: 'j1',
    date: '2025-08-15',
    reference: 'INV-001',
    description: 'Partnership sales',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: 'a-sales', description: '', debit: 0, credit: 300000, taxAmount: 0 },
      { accountId: 'a-cash', description: '', debit: 300000, credit: 0, taxAmount: 0 },
    ],
  },
];

describe('PartnershipTaxReturn', () => {
  it('renders the Form P heading (Wave 0 skeleton)', () => {
    render(
      <PartnershipTaxReturn entity={fixtureEntity} accounts={[]} entries={[]} />,
    );
    // Multiple elements may contain "Form P" (header + PrintBanner)
    const headings = screen.getAllByText(/Form P,? Partnership Tax Return/);
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the entity name in placeholder text', () => {
    render(
      <PartnershipTaxReturn entity={fixtureEntity} accounts={[]} entries={[]} />,
    );
    // Entity name appears (may be in multiple places: header + PrintBanner)
    const entityNames = screen.getAllByText(/Smith & Jones Partnership/);
    expect(entityNames.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Form P with distribution — P1 P2 P8 + per-partner rows reconciling to net income', () => {
    render(
      <PartnershipTaxReturn
        entity={fixtureEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
      />,
    );
    // Form P label codes
    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();
    expect(screen.getByText('P8')).toBeInTheDocument();
    // Net income (P8)
    const p8Values = screen.getAllByText('$300,000.00');
    expect(p8Values.length).toBeGreaterThanOrEqual(1);
    // Partner rows
    expect(screen.getByText('Smith')).toBeInTheDocument();
    expect(screen.getByText('Jones')).toBeInTheDocument();
    // Partner shares
    const shares = screen.getAllByText('$150,000.00');
    expect(shares.length).toBeGreaterThanOrEqual(2); // Smith + Jones
    // Print button present
    expect(
      screen.getByRole('button', { name: /print working paper/i }),
    ).toBeInTheDocument();
  });

  it('print button emits audit — EXPORT_DATA log with { form: P, fy: FY2026 }', () => {
    const addLog = vi.fn();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    render(
      <PartnershipTaxReturn
        entity={fixtureEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
        addLog={addLog}
      />,
    );

    const printBtn = screen.getByRole('button', { name: /print working paper/i });
    fireEvent.click(printBtn);

    expect(addLog).toHaveBeenCalledWith(
      'EXPORT_DATA',
      expect.stringContaining('"form":"P"'),
      'p1',
    );
    expect(addLog).toHaveBeenCalledWith(
      'EXPORT_DATA',
      expect.stringContaining('"fy":"FY2026"'),
      'p1',
    );
    expect(printSpy).toHaveBeenCalledOnce();
    printSpy.mockRestore();
  });
});
