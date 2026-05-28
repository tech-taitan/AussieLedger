/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BOOK-07 (parent subtotals) + BOOK-09 (period filter, status-aware filtering)
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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

/** Account with no taxLabel — appears as unmapped. */
function makeUnmappedAccount(id: string, code: string): Account {
  return {
    _v: 3,
    id,
    code,
    name: `Unmapped ${code}`,
    type: 'Expense',
    gstCode: 'N-T',
    // taxLabel intentionally absent
  };
}

describe('TrialBalance — Plan 06-3 AnomalyBadge + overflow-x-auto (UX-02 + UX-04)', () => {
  it('TB.1: account with no taxLabel referenced in posted entry shows anomaly-badge', () => {
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

  it('TB.2: all accounts mapped — no anomaly badges', () => {
    const mapped: Account = {
      _v: 3, id: 'mapped-1', code: '6010', name: 'Rent', type: 'Expense',
      gstCode: 'N-T', taxLabel: 'E',
    };
    // Cash account with taxLabel set — no anomaly expected
    const cash: Account = {
      _v: 3, id: 'a-cash', code: '1000', name: 'Cash', type: 'Asset',
      gstCode: 'N-T', taxLabel: '1A',
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
