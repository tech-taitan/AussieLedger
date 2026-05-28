/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Plan 05-3 tests for TrustTaxReturn (Form T renderer).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrustTaxReturn } from '../TrustTaxReturn';
import type { Entity, Account, JournalEntry } from '../../types';

// ── Shared fixtures ────────────────────────────────────────────────────────

const fixtureEntity: Entity = {
  _v: 4,
  id: 't1',
  name: 'Family Trust',
  type: 'Trust',
  status: 'Active',
  beneficiaries: [
    { id: 'b1', name: 'Alice', sharePercent: 60 },
    { id: 'b2', name: 'Bob', sharePercent: 40 },
  ],
};

const fixtureAccounts: Account[] = [
  {
    _v: 4,
    id: 'a-sales',
    code: '4010',
    name: 'Sales Revenue',
    type: 'Revenue',
    gstCode: 'GST',
    trustTaxLabel: '5B',
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
    description: 'Trust sales',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: 'a-sales', description: '', debit: 0, credit: 200000, taxAmount: 0 },
      { accountId: 'a-cash', description: '', debit: 200000, credit: 0, taxAmount: 0 },
    ],
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────

describe('TrustTaxReturn — Phase 5 wiring', () => {
  it('renders Form T with 5B/5T/26 net income from GL', () => {
    render(
      <TrustTaxReturn
        entity={fixtureEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
      />,
    );
    // Form T heading (multiple elements include PrintBanner and screen header)
    const formTHeadings = screen.getAllByText(/Form T/);
    expect(formTHeadings.length).toBeGreaterThanOrEqual(1);
    // Label codes visible
    expect(screen.getByText('5B')).toBeInTheDocument();
    expect(screen.getByText('26')).toBeInTheDocument();
    // Net income value visible (may appear multiple times: 5T/26/56/distTotal)
    const netIncomeVals = screen.getAllByText('$200000.00');
    expect(netIncomeVals.length).toBeGreaterThanOrEqual(1);
    // Print button present
    expect(
      screen.getByRole('button', { name: /print working paper/i }),
    ).toBeInTheDocument();
  });

  it('per-beneficiary distribution table — 2 beneficiaries at 60/40 rendered', () => {
    render(
      <TrustTaxReturn
        entity={fixtureEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
      />,
    );
    // Beneficiary names in table
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    // Distribution amounts (getAll because totalShare + ordinary component both show)
    const alice = screen.getAllByText('$120000.00');
    expect(alice.length).toBeGreaterThanOrEqual(1);
    const bob = screen.getAllByText('$80000.00');
    expect(bob.length).toBeGreaterThanOrEqual(1);
    // Total row — net income + distribution total appear multiple times
    const totals = screen.getAllByText('$200000.00');
    expect(totals.length).toBeGreaterThanOrEqual(2); // net income + distribution total
  });

  it('streaming disclaimer anomaly always present', () => {
    render(
      <TrustTaxReturn
        entity={fixtureEntity}
        accounts={[]}
        entries={[]}
        fy="FY2026"
      />,
    );
    expect(
      screen.getByText(/Trust capital gains and franked distributions can only be streamed/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Consult your tax agent if you stream income/),
    ).toBeInTheDocument();
  });

  it('share-total anomaly badge shown when beneficiaries sum to 90%', () => {
    const badEntity: Entity = {
      ...fixtureEntity,
      beneficiaries: [
        { id: 'b1', name: 'Alice', sharePercent: 50 },
        { id: 'b2', name: 'Bob', sharePercent: 40 },
      ],
    };
    render(
      <TrustTaxReturn
        entity={badEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
      />,
    );
    // Anomaly badge with shares-not-100 message visible
    expect(
      screen.getByText(/Beneficiary shares sum to 90.00%/),
    ).toBeInTheDocument();
  });

  it('print button emits EXPORT_DATA audit log', () => {
    const addLog = vi.fn();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    render(
      <TrustTaxReturn
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
      expect.stringContaining('"form":"T"'),
      't1',
    );
    expect(printSpy).toHaveBeenCalledOnce();
    printSpy.mockRestore();
  });

  it('locked FY badge visible when entity.lockedFys includes FY', () => {
    const lockedEntity: Entity = {
      ...fixtureEntity,
      lockedFys: ['FY2026'],
    };
    render(
      <TrustTaxReturn
        entity={lockedEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
      />,
    );
    // Locked return button text
    expect(
      screen.getByRole('button', { name: /print finalised return/i }),
    ).toBeInTheDocument();
  });
});
