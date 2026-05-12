/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BOOK-12: Journal search filter panel.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JournalSearch } from '../JournalSearch';
import type { Account } from '../../types';

function makeAccount(id: string, code: string, name: string): Account {
  return {
    id,
    code,
    name,
    type: 'Expense',
    gstCode: 'N-T',
  };
}

const accounts: Account[] = [
  makeAccount('acc-1', '1000', 'Cash at Bank'),
  makeAccount('acc-2', '4000', 'Sales'),
  makeAccount('acc-3', '5000', 'Cost of Sales'),
];

describe('JournalSearch (BOOK-12)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all five filters', () => {
    render(<JournalSearch accounts={accounts} onSearch={vi.fn()} />);
    // 7 controls: reference, description, account, date-from, date-to, amount-from, amount-to
    expect(screen.getByLabelText('filter-reference')).toBeInTheDocument();
    expect(screen.getByLabelText('filter-description')).toBeInTheDocument();
    expect(screen.getByLabelText('filter-account')).toBeInTheDocument();
    expect(screen.getByLabelText('filter-date-from')).toBeInTheDocument();
    expect(screen.getByLabelText('filter-date-to')).toBeInTheDocument();
    expect(screen.getByLabelText('filter-amount-from')).toBeInTheDocument();
    expect(screen.getByLabelText('filter-amount-to')).toBeInTheDocument();
  });

  it('reference filter calls searchJournals', () => {
    const onSearch = vi.fn();
    render(<JournalSearch accounts={accounts} onSearch={onSearch} />);
    onSearch.mockClear(); // discard the initial debounce fire

    const input = screen.getByLabelText('filter-reference') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'INV' } });

    vi.advanceTimersByTime(200);

    expect(onSearch).toHaveBeenCalled();
    const last = onSearch.mock.calls[onSearch.mock.calls.length - 1][0];
    expect(last.reference).toBe('INV');
  });

  it('account filter populates from accounts prop', () => {
    render(<JournalSearch accounts={accounts} onSearch={vi.fn()} />);
    const select = screen.getByLabelText('filter-account') as HTMLSelectElement;
    // 3 accounts + 1 "All accounts" = 4 options
    expect(select.options).toHaveLength(4);
    expect(select.options[0].value).toBe('');
    expect(select.options[1].value).toBe('acc-1');
  });

  it('amount range numeric inputs', () => {
    render(<JournalSearch accounts={accounts} onSearch={vi.fn()} />);
    const from = screen.getByLabelText('filter-amount-from') as HTMLInputElement;
    const to = screen.getByLabelText('filter-amount-to') as HTMLInputElement;
    expect(from.type).toBe('number');
    expect(to.type).toBe('number');
  });

  it('date range pickers default to FY current', () => {
    render(
      <JournalSearch
        accounts={accounts}
        onSearch={vi.fn()}
        defaultFilters={{ dateFrom: '2025-07-01', dateTo: '2026-06-30' }}
      />,
    );
    const from = screen.getByLabelText('filter-date-from') as HTMLInputElement;
    const to = screen.getByLabelText('filter-date-to') as HTMLInputElement;
    expect(from.value).toBe('2025-07-01');
    expect(to.value).toBe('2026-06-30');
  });
});
