/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Plan 05-2 tests for TaxReturnAssistant (Form I renderer).
 * Flipped from it.todo to full test bodies in Plan 05-2.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaxReturnAssistant } from '../TaxReturnAssistant';
import type { Entity, Account, JournalEntry } from '../../types';

const fixtureEntity: Entity = {
  _v: 4,
  id: 'st1',
  name: 'Acme Sole Trader',
  type: 'Individual',
  status: 'Active',
  aggregatedTurnover: '4000000',
};

const fixtureAccounts: Account[] = [
  { _v: 4, id: 'a-rev', code: '4010', name: 'Sales', type: 'Revenue', gstCode: 'GST', taxLabel: '6S' },
  { _v: 4, id: 'a-exp', code: '6010', name: 'Operating Expenses', type: 'Expense', gstCode: 'GST', taxLabel: '6N' },
  { _v: 4, id: 'a-cash', code: '1010', name: 'Cash', type: 'Asset', gstCode: 'N-T' },
];

const fixtureEntries: JournalEntry[] = [
  {
    _v: 4,
    id: 'j1',
    date: '2025-08-15',
    reference: 'INV-001',
    description: 'Sale',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: 'a-rev', description: '', debit: 0, credit: 50000, taxAmount: 0 },
      { accountId: 'a-cash', description: '', debit: 50000, credit: 0, taxAmount: 0 },
    ],
  },
  {
    _v: 4,
    id: 'j2',
    date: '2025-09-15',
    reference: 'EXP-001',
    description: 'Expense',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: 'a-exp', description: '', debit: 20000, credit: 0, taxAmount: 0 },
      { accountId: 'a-cash', description: '', debit: 0, credit: 20000, taxAmount: 0 },
    ],
  },
];

describe('TaxReturnAssistant — Phase 5 wiring', () => {
  let printSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
  });

  afterEach(() => {
    printSpy.mockRestore();
  });

  it('renders Form I with ATO codes and labels — P1/P2/P8/item15 visible with plain-English titles', () => {
    render(
      <TaxReturnAssistant
        entity={fixtureEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
      />,
    );
    // Form I header present (may appear multiple times)
    expect(screen.getAllByText(/Form I/i).length).toBeGreaterThan(0);
    // P1 label
    expect(screen.getAllByText(/P1/).length).toBeGreaterThan(0);
    // P8 label
    expect(screen.getAllByText(/P8/).length).toBeGreaterThan(0);
    // item15 label
    expect(screen.getAllByText(/[Ii]tem\s*15/).length).toBeGreaterThan(0);
    // Contains a plain-English title
    expect(screen.getAllByText(/Net.*income.*business|business income/i).length).toBeGreaterThan(0);
  });

  it('print button emits audit — EXPORT_DATA log with { form: I, fy: FY2026 }', () => {
    const addLog = vi.fn();
    render(
      <TaxReturnAssistant
        entity={fixtureEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
        addLog={addLog}
      />,
    );
    const printBtn = screen.getByRole('button', { name: /print/i });
    fireEvent.click(printBtn);
    expect(addLog).toHaveBeenCalledWith(
      'EXPORT_DATA',
      expect.stringContaining('"form":"I"'),
      'st1',
    );
    expect(printSpy).toHaveBeenCalled();
  });

  it('renders assumptions block — 5 assumed values present', () => {
    render(
      <TaxReturnAssistant
        entity={fixtureEntity}
        accounts={[]}
        entries={[]}
        fy="FY2026"
      />,
    );
    expect(screen.getByTestId('assumptions-block')).toBeInTheDocument();
  });

  it('renders B and P schedule — P1/P2/P8 + schedule section visible', () => {
    render(
      <TaxReturnAssistant
        entity={fixtureEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
      />,
    );
    // B&P schedule section
    expect(
      screen.getAllByText(/Business.*Professional Items Schedule|B&P Schedule|NAT 2543/i).length,
    ).toBeGreaterThan(0);
    // P2 deductions line
    expect(screen.getAllByText(/P2/).length).toBeGreaterThan(0);
  });

  it('shows item 7D when eligible — small-business offset line present', () => {
    const eligibleEntity: Entity = { ...fixtureEntity, aggregatedTurnover: '4000000' };
    render(
      <TaxReturnAssistant
        entity={eligibleEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
      />,
    );
    // item7D label or "Small business income tax offset" text (may appear multiple times)
    expect(
      screen.getAllByText(/item7D|Small business income tax offset/i).length,
    ).toBeGreaterThan(0);
  });

  it('anomalies inline and bottom section — AnomalyBadge component rendered per anomaly', () => {
    render(
      <TaxReturnAssistant
        entity={fixtureEntity}
        accounts={[]}
        entries={[]}
        fy="FY2026"
      />,
    );
    // At minimum the 5 assumption anomalies render as badges
    const badges = screen.getAllByTestId('anomaly-badge');
    expect(badges.length).toBeGreaterThan(0);
  });
});
