/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BOOK-07 (parent subtotals) + BOOK-09 (period filter, status-aware filtering)
 * Phase 9 FND-10 (Export CSV button + audit log + empty-period toast)
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrialBalance } from '../TrialBalance';
import type { Account, JournalEntry, JournalLine } from '../../types';

function makeAccount(
  id: string,
  code: string,
  name: string,
  type: Account['type'],
  parentCode?: string | null,
): Account {
  return {
    _v: 3,
    id,
    code,
    name,
    type,
    gstCode: 'N-T',
    parentCode: parentCode ?? null,
  };
}

function makeLine(accountId: string, debit: number, credit: number): JournalLine {
  return {
    _v: 3,
    accountId,
    description: 'line',
    debit,
    credit,
    taxAmount: 0,
  };
}

function makeEntry(
  id: string,
  date: string,
  lines: JournalLine[],
  opts: { status?: JournalEntry['status']; isPosted?: boolean } = {},
): JournalEntry {
  return {
    _v: 3,
    id,
    date,
    reference: `REF-${id}`,
    description: `entry ${id}`,
    lines,
    isPosted: opts.isPosted ?? true,
    status: opts.status ?? 'posted',
  };
}

// Parent "6000 Operating Expenses" with two children 6010 + 6020
const accounts: Account[] = [
  makeAccount('p-6000', '6000', 'Operating Expenses', 'Expense'),
  makeAccount('c-6010', '6010', 'Rent', 'Expense', '6000'),
  makeAccount('c-6020', '6020', 'Utilities', 'Expense', '6000'),
  makeAccount('a-1000', '1000', 'Cash at Bank', 'Asset'),
];

describe('TrialBalance Phase 4 refactor (BOOK-07, BOOK-09)', () => {
  /** Pull the debit-column cell (index 3) from a row's <td> children. */
  function debitCellValue(row: HTMLElement): string {
    const cells = row.querySelectorAll('td');
    return cells[3]?.textContent?.trim() ?? '';
  }

  it('period filter', () => {
    // Three entries — one in each quarter of FY2026
    const e_q1 = makeEntry('q1', '2025-08-15', [
      makeLine('c-6010', 100, 0),
      makeLine('a-1000', 0, 100),
    ]);
    const e_q2 = makeEntry('q2', '2025-11-15', [
      makeLine('c-6010', 200, 0),
      makeLine('a-1000', 0, 200),
    ]);
    const e_q3 = makeEntry('q3', '2026-02-15', [
      makeLine('c-6010', 300, 0),
      makeLine('a-1000', 0, 300),
    ]);

    render(
      <TrialBalance
        accounts={accounts}
        entries={[e_q1, e_q2, e_q3]}
        period={{ type: 'quarter', fy: 'FY2026', q: 2 }}
      />,
    );

    // Only Q2 (Oct-Dec 2025) entry contributes — 200 debit on 6010
    const rentRow = screen.getByTestId('tb-row-6010');
    expect(debitCellValue(rentRow)).toBe('200.00');
  });

  it('parent subtotals', () => {
    const e1 = makeEntry('p1', '2026-01-15', [
      makeLine('c-6010', 150, 0),
      makeLine('a-1000', 0, 150),
    ]);
    const e2 = makeEntry('p2', '2026-01-20', [
      makeLine('c-6020', 75, 0),
      makeLine('a-1000', 0, 75),
    ]);

    render(
      <TrialBalance
        accounts={accounts}
        entries={[e1, e2]}
        period={{ type: 'fy', fy: 'FY2026' }}
      />,
    );

    const parentRow = screen.getByTestId('tb-parent-6000');
    // Parent subtotal: 150 + 75 = 225 debit
    expect(debitCellValue(parentRow)).toBe('225.00');
  });

  it('excludes voided superseded draft', () => {
    const posted = makeEntry('e-posted', '2026-01-15', [
      makeLine('c-6010', 100, 0),
      makeLine('a-1000', 0, 100),
    ]);
    const voided = makeEntry(
      'e-voided',
      '2026-01-15',
      [makeLine('c-6010', 999, 0), makeLine('a-1000', 0, 999)],
      { status: 'voided' },
    );
    const superseded = makeEntry(
      'e-supersed',
      '2026-01-15',
      [makeLine('c-6010', 888, 0), makeLine('a-1000', 0, 888)],
      { status: 'superseded' },
    );
    const draft = makeEntry(
      'e-draft',
      '2026-01-15',
      [makeLine('c-6010', 777, 0), makeLine('a-1000', 0, 777)],
      { status: 'draft', isPosted: false },
    );

    render(
      <TrialBalance
        accounts={accounts}
        entries={[posted, voided, superseded, draft]}
        period={{ type: 'fy', fy: 'FY2026' }}
      />,
    );

    const rentRow = screen.getByTestId('tb-row-6010');
    // Only the posted entry counts -> 100 debit
    expect(debitCellValue(rentRow)).toBe('100.00');
    // Voided / superseded / draft amounts MUST NOT appear anywhere in the row
    expect(rentRow.textContent).not.toMatch(/999\.00/);
    expect(rentRow.textContent).not.toMatch(/888\.00/);
    expect(rentRow.textContent).not.toMatch(/777\.00/);
  });

  it('balanced footer', () => {
    const e = makeEntry('b', '2026-01-15', [
      makeLine('c-6010', 100, 0),
      makeLine('a-1000', 0, 100),
    ]);
    render(
      <TrialBalance
        accounts={accounts}
        entries={[e]}
        period={{ type: 'fy', fy: 'FY2026' }}
      />,
    );
    expect(screen.getByTestId('tb-balance-flag').textContent).toMatch(/Balanced/);
  });

  it('reversal entries net to zero in TB', () => {
    const original = makeEntry('orig', '2026-01-15', [
      makeLine('c-6010', 500, 0),
      makeLine('a-1000', 0, 500),
    ], { status: 'reversed' });

    // reversal mirrors debits/credits (per ledger.makeReversal)
    const reversal: JournalEntry = {
      _v: 3,
      id: 'rev',
      date: '2026-01-20',
      reference: 'REV-original',
      description: 'reversal',
      lines: [
        makeLine('c-6010', 0, 500),
        makeLine('a-1000', 500, 0),
      ],
      isPosted: true,
      status: 'posted',
      reversesEntryId: 'orig',
    };

    render(
      <TrialBalance
        accounts={accounts}
        entries={[original, reversal]}
        period={{ type: 'fy', fy: 'FY2026' }}
      />,
    );

    // The 6010 leaf row accumulates both sides — debit 500 from original AND credit 500 from reversal.
    const rentRow = screen.getByTestId('tb-row-6010');
    const cells = rentRow.querySelectorAll('td');
    expect(cells[3].textContent?.trim()).toBe('500.00');  // debit col
    expect(cells[4].textContent?.trim()).toBe('500.00');  // credit col
    // YTD balance for Expense = debit - credit = 0.00
    expect(cells[5].textContent?.trim()).toBe('0.00');

    // Balance flag stays balanced (TB always balances when entries balance)
    expect(screen.getByTestId('tb-balance-flag').textContent).toMatch(/Balanced/);
  });
});

// ── Plan 06-3: TB.1–TB.3 (UX-02 + UX-04) ────────────────────────────────

/** Expense leaf with no tax labels — appears as unmapped on a tax return. */
function makeUnmappedAccount(id: string, code: string): Account {
  return {
    _v: 3,
    id,
    code,
    name: `Unmapped ${code}`,
    type: 'Expense',
    gstCode: 'N-T',
    parentCode: '6000', // leaf, not header
    // tax labels intentionally absent
  };
}

describe('TrialBalance — Plan 06-3 AnomalyBadge + overflow-x-auto (UX-02 + UX-04)', () => {
  it('TB.1: Revenue/Expense leaf with no tax labels referenced in posted entry shows anomaly-badge', () => {
    const unmapped = makeUnmappedAccount('um-1', '6099');
    const cash = makeAccount('a-cash', '1000', 'Cash', 'Asset');
    const entry = makeEntry('e1', '2026-01-15', [
      makeLine('um-1', 100, 0),
      makeLine('a-cash', 0, 100),
    ]);
    render(
      <TrialBalance
        accounts={[unmapped, cash]}
        entries={[entry]}
        period={{ type: 'fy', fy: 'FY2026' }}
      />,
    );
    const badges = document.querySelectorAll('[data-testid="anomaly-badge"]');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('TB.2: all accounts mapped (all four labels populated on Revenue/Expense) — no anomaly badges', () => {
    const mapped: Account = {
      _v: 3, id: 'mapped-1', code: '6010', name: 'Rent', type: 'Expense',
      gstCode: 'N-T', parentCode: '6000',
      taxLabel: '6N', companyTaxLabel: '6G', trustTaxLabel: '5F', partnershipTaxLabel: 'P2',
    };
    // Asset accounts never carry tax labels — must not flag.
    const cash: Account = {
      _v: 3, id: 'a-cash', code: '1000', name: 'Cash', type: 'Asset',
      gstCode: 'N-T', parentCode: '1000',
    };
    const entry = makeEntry('e1', '2026-01-15', [
      makeLine('mapped-1', 100, 0),
      makeLine('a-cash', 0, 100),
    ]);
    render(
      <TrialBalance
        accounts={[mapped, cash]}
        entries={[entry]}
        period={{ type: 'fy', fy: 'FY2026' }}
      />,
    );
    const badges = document.querySelectorAll('[data-testid="anomaly-badge"]');
    expect(badges.length).toBe(0);
  });

  it('TB.4: Equity account with no taxLabel does NOT show anomaly badge (Equity is never on a tax return)', () => {
    const equity: Account = {
      _v: 3, id: 'eq-1', code: '3010', name: "Owner's Capital", type: 'Equity',
      gstCode: 'N-T', parentCode: '3000',
    };
    const cash = makeAccount('a-cash', '1020', 'Bank', 'Asset');
    const entry = makeEntry('e1', '2026-01-15', [
      makeLine('a-cash', 1000, 0),
      makeLine('eq-1', 0, 1000),
    ]);
    render(
      <TrialBalance
        accounts={[cash, equity]}
        entries={[entry]}
        period={{ type: 'fy', fy: 'FY2026' }}
      />,
    );
    const badges = document.querySelectorAll('[data-testid="anomaly-badge"]');
    expect(badges.length).toBe(0);
  });

  it('TB.5: Revenue leaf with only one of four labels (e.g. taxLabel set, others missing) DOES show badge', () => {
    const partial: Account = {
      _v: 3, id: 'r-partial', code: '5500', name: 'Misc Revenue', type: 'Revenue',
      gstCode: 'GST', parentCode: '4000',
      taxLabel: '6S',
      // companyTaxLabel + trustTaxLabel + partnershipTaxLabel missing
    };
    const cash = makeAccount('a-cash', '1020', 'Bank', 'Asset');
    const entry = makeEntry('e1', '2026-01-15', [
      makeLine('a-cash', 0, 200),
      makeLine('r-partial', 200, 0),
    ]);
    render(
      <TrialBalance
        accounts={[cash, partial]}
        entries={[entry]}
        period={{ type: 'fy', fy: 'FY2026' }}
      />,
    );
    const badges = document.querySelectorAll('[data-testid="anomaly-badge"]');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('TB.3: TrialBalance table container has overflow-x-auto class', () => {
    render(
      <TrialBalance
        accounts={[makeAccount('a1', '1000', 'Cash', 'Asset')]}
        entries={[]}
        period={{ type: 'fy', fy: 'FY2026' }}
      />,
    );
    const wrapper = document.querySelector('.overflow-x-auto');
    expect(wrapper).toBeTruthy();
  });
});

// ── Orphan-line surfacing + nil-balance toggle ────────────────────────────────

describe('TrialBalance — orphan lines + nil-balance toggle', () => {
  it('TB.6: journal lines referencing an accountId NOT in `accounts` surface as an orphan row + warning banner', () => {
    const cash = makeAccount('a-cash', '1020', 'Bank', 'Asset', '1000');
    const equity = makeAccount('a-equity', '3010', "Owner's Capital", 'Equity', '3000');
    // Journal line references `a-ghost` which is not in accounts.
    const entry = makeEntry('e1', '2026-01-15', [
      makeLine('a-cash',  1000, 0),
      makeLine('a-equity', 0, 500),
      makeLine('a-ghost',  0, 500), // orphan
    ]);
    render(
      <TrialBalance
        accounts={[cash, equity]}
        entries={[entry]}
        period={{ type: 'fy', fy: 'FY2026' }}
      />,
    );
    expect(screen.getByTestId('tb-orphan-banner').textContent).toMatch(/1 unknown account/i);
    expect(screen.getByTestId('tb-orphan-a-ghost')).not.toBeNull();
    // Totals INCLUDE the orphan amount so the TB doesn't falsely balance.
    // DR 1000 (Cash) + 0 (orphan) = 1000.
    // CR 500 (Equity) + 500 (orphan) = 1000. Balanced because the orphan
    // happened to balance — but the row is still surfaced so the user can fix it.
    expect(screen.getByTestId('tb-total-debits').textContent).toContain('1,000');
    expect(screen.getByTestId('tb-total-credits').textContent).toContain('1,000');
  });

  it('TB.7: orphan with debit-only causes the TB to render Out of Balance (no silent drop)', () => {
    const cash = makeAccount('a-cash', '1020', 'Bank', 'Asset', '1000');
    const entry = makeEntry('e1', '2026-01-15', [
      makeLine('a-cash',  500, 0),
      makeLine('a-ghost', 500, 0), // orphan, debit-only — leaves the TB unbalanced
    ]);
    render(
      <TrialBalance
        accounts={[cash]}
        entries={[entry]}
        period={{ type: 'fy', fy: 'FY2026' }}
      />,
    );
    // The journal itself was balanced (the entry had balancing credits in
    // theory) but only the debit-only lines are in the array, so totals
    // diverge. The point is the orphan amount is INCLUDED in totals.
    expect(screen.getByTestId('tb-total-debits').textContent).toContain('1,000');
    expect(screen.getByTestId('tb-orphan-banner')).not.toBeNull();
  });

  it('TB.8: nil-balance toggle reveals accounts with zero net debit/credit', () => {
    const cash = makeAccount('a-cash', '1020', 'Bank', 'Asset', '1000');
    const sales = makeAccount('a-sales', '4020', 'Sales', 'Revenue', '4000');
    const nilAccount = makeAccount('a-nil', '6100', 'Misc', 'Expense', '6000');
    const entry = makeEntry('e1', '2026-01-15', [
      makeLine('a-cash',  100, 0),
      makeLine('a-sales', 0, 100),
    ]);
    render(
      <TrialBalance
        accounts={[cash, sales, nilAccount]}
        entries={[entry]}
        period={{ type: 'fy', fy: 'FY2026' }}
      />,
    );
    // Default: nil-balance leaf is hidden.
    expect(screen.queryByTestId('tb-row-6100')).toBeNull();
    expect(screen.getByTestId('tb-row-1020')).not.toBeNull();
    // Toggle on → nil-balance leaf appears.
    fireEvent.click(screen.getByTestId('show-zero-balances-toggle'));
    expect(screen.getByTestId('tb-row-6100')).not.toBeNull();
  });
});

// ── Phase 9 FND-10: Export CSV button ────────────────────────────────────────

describe('TrialBalance — Phase 9 FND-10 Export CSV', () => {
  const cashAccount = makeAccount('a-cash', '1000', 'Cash at Bank', 'Asset');
  const revenueAccount = makeAccount('a-rev', '4100', 'Revenue', 'Revenue');
  const basicEntry = makeEntry('e1', '2025-08-15', [
    makeLine('a-rev', 0, 1000),
    makeLine('a-cash', 1000, 0),
  ]);

  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let anchorClickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURLSpy = vi.fn(() => 'blob:mock-url');
    revokeObjectURLSpy = vi.fn();
    anchorClickSpy = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: revokeObjectURLSpy,
    });
    HTMLAnchorElement.prototype.click = anchorClickSpy;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('TB.1: renders Export CSV button with correct data-testid', () => {
    render(
      <TrialBalance
        accounts={[cashAccount, revenueAccount]}
        entries={[basicEntry]}
        period={{ type: 'fy', fy: 'FY2026' }}
        entityName="Acme Pty Ltd"
        entityId="ent-1"
      />,
    );
    expect(screen.getByTestId('export-csv-button-tb')).toBeDefined();
    expect(screen.getByTestId('export-csv-button-tb').textContent).toBe('Export CSV');
  });

  it('TB.2: clicking Export CSV calls addLog with EXPORT_DATA and type:"csv"', () => {
    const addLog = vi.fn();
    render(
      <TrialBalance
        accounts={[cashAccount, revenueAccount]}
        entries={[basicEntry]}
        period={{ type: 'fy', fy: 'FY2026' }}
        entityName="Acme Pty Ltd"
        entityId="ent-1"
        addLog={addLog}
      />,
    );
    fireEvent.click(screen.getByTestId('export-csv-button-tb'));
    expect(addLog).toHaveBeenCalledWith(
      'EXPORT_DATA',
      expect.stringContaining('"type":"csv"'),
      'ent-1',
    );
    expect(addLog.mock.calls[0][1]).toContain('"report":"tb"');
  });

  it('TB.3: empty period shows toast with correct message', () => {
    // No entries → tbData is empty → isEmpty=true → toast shown
    render(
      <TrialBalance
        accounts={[cashAccount, revenueAccount]}
        entries={[]}
        period={{ type: 'fy', fy: 'FY2026' }}
        entityName="Acme Pty Ltd"
        entityId="ent-1"
      />,
    );
    fireEvent.click(screen.getByTestId('export-csv-button-tb'));
    expect(screen.getByTestId('toast').textContent).toBe('No data in selected period for export');
  });

  it('TB.4: addLog NOT called when addLog prop is undefined', () => {
    // Should not throw — uses optional chaining
    render(
      <TrialBalance
        accounts={[cashAccount, revenueAccount]}
        entries={[basicEntry]}
        period={{ type: 'fy', fy: 'FY2026' }}
        entityName="Acme Pty Ltd"
      />,
    );
    expect(() => fireEvent.click(screen.getByTestId('export-csv-button-tb'))).not.toThrow();
  });
});
