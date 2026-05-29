/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImportReviewPane } from '../ImportReviewPane';
import type { Account, ImportedAccount } from '../../types';
import type { RejectedRow } from '../RejectedRowsPanel';

const ACCOUNTS: Account[] = [
  { id: 'acc-1', code: '4100', name: 'Sales', type: 'Revenue', gstCode: 'GST' },
  {
    id: 'acc-2',
    code: '6400',
    name: 'Wages & Salaries',
    type: 'Expense',
    gstCode: 'N-T',
  },
  {
    id: 'acc-archived',
    code: '9999',
    name: 'Archived Account',
    type: 'Expense',
    gstCode: 'N-T',
    isArchived: true,
  },
];

describe('ImportReviewPane (IMP-03)', () => {
  it('auto-applies high confidence', () => {
    const row: ImportedAccount = {
      externalCode: 'X1',
      externalName: 'Sales Revenue',
      debit: 0,
      credit: 1000,
      mappedAccountId: 'acc-1',
      confidence: 0.92,
    };
    render(
      <ImportReviewPane
        rows={[row]}
        accounts={ACCOUNTS}
        onUpdate={vi.fn()}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    const badge = screen.getByTestId('status-0');
    expect(badge.textContent).toContain('Auto-matched');
  });

  it('create new account option', () => {
    const onUpdate = vi.fn();
    const row: ImportedAccount = {
      externalCode: 'X9',
      externalName: 'Mystery Account',
      debit: 50,
      credit: 0,
      confidence: 0.5,
    };
    render(
      <ImportReviewPane
        rows={[row]}
        accounts={ACCOUNTS}
        onUpdate={onUpdate}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    const createNewBtn = screen.getByTestId('create-new-0');
    expect(createNewBtn).not.toBeNull();
    fireEvent.click(createNewBtn);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    const updatedRows = onUpdate.mock.calls[0][0];
    expect(updatedRows[0].mappedAccountId).toMatch(/^NEW:/);
  });

  it('per-row include/exclude toggle', () => {
    const onUpdate = vi.fn();
    const row: ImportedAccount = {
      externalCode: 'X1',
      externalName: 'Sales',
      debit: 0,
      credit: 1000,
      mappedAccountId: 'acc-1',
      confidence: 0.92,
    };
    render(
      <ImportReviewPane
        rows={[row]}
        accounts={ACCOUNTS}
        onUpdate={onUpdate}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    const cb = screen.getByLabelText('include-0') as HTMLInputElement;
    expect(cb.checked).toBe(true);
    fireEvent.click(cb); // toggle off
    expect(onUpdate).toHaveBeenCalledTimes(1);
    const updatedRows = onUpdate.mock.calls[0][0];
    expect(updatedRows[0]._include).toBe(false);
  });

  it('per-row edit-inline', () => {
    const onUpdate = vi.fn();
    const row: ImportedAccount = {
      externalCode: 'X1',
      externalName: 'Sales',
      debit: 0,
      credit: 1000,
      mappedAccountId: 'acc-1',
      confidence: 0.92,
    };
    render(
      <ImportReviewPane
        rows={[row]}
        accounts={ACCOUNTS}
        onUpdate={onUpdate}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    const debitInput = screen.getByLabelText('debit-0') as HTMLInputElement;
    fireEvent.change(debitInput, { target: { value: '42' } });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    const updatedRows = onUpdate.mock.calls[0][0];
    expect(updatedRows[0].debit).toBe(42);
  });

  it('reject whole import button', () => {
    const onReject = vi.fn();
    render(
      <ImportReviewPane
        rows={[]}
        accounts={ACCOUNTS}
        onUpdate={vi.fn()}
        onAccept={vi.fn()}
        onReject={onReject}
      />,
    );
    fireEvent.click(screen.getByTestId('reject-import'));
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('archived accounts hidden from pick dropdown', () => {
    const row: ImportedAccount = {
      externalCode: 'X1',
      externalName: 'Mystery',
      debit: 50,
      credit: 0,
      confidence: 0.5,
    };
    render(
      <ImportReviewPane
        rows={[row]}
        accounts={ACCOUNTS}
        onUpdate={vi.fn()}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    const select = screen.getByLabelText('pick-account-0') as HTMLSelectElement;
    // The archived account ("Archived Account") MUST not be present in the options.
    const optionTexts = Array.from(select.options).map((o) => o.textContent ?? '');
    expect(optionTexts.some((t) => t.includes('Archived Account'))).toBe(false);
    expect(optionTexts.some((t) => t.includes('Sales'))).toBe(true);
  });

  // Phase 7 additions — backward-compatible new props

  it('IMP-08: tolerant-parse-banner renders when tolerantParseCount > 0', () => {
    const row: ImportedAccount = {
      externalCode: '1000',
      externalName: 'Cash',
      debit: 100,
      credit: 0,
      mappedAccountId: undefined,
      confidence: 0,
    };
    render(
      <ImportReviewPane
        rows={[row]}
        accounts={[]}
        onUpdate={vi.fn()}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        tolerantParseCount={3}
      />,
    );
    const banner = screen.getByTestId('tolerant-parse-banner');
    expect(banner.textContent).toMatch(/Tolerantly parsed currency in 3 cells/);
  });

  it('IMP-08: AnomalyBadge renders when lowConfidenceParseCount > 0', () => {
    const row: ImportedAccount = {
      externalCode: '1000',
      externalName: 'Cash',
      debit: 100,
      credit: 0,
      mappedAccountId: undefined,
      confidence: 0,
    };
    render(
      <ImportReviewPane
        rows={[row]}
        accounts={[]}
        onUpdate={vi.fn()}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        tolerantParseCount={3}
        lowConfidenceParseCount={2}
      />,
    );
    expect(screen.getByTestId('tolerant-parse-banner').textContent).toMatch(
      /2 cells low confidence/,
    );
  });

  it('IMP-09/11: RejectedRowsPanel renders inline when rejectedRows non-empty', () => {
    const row: ImportedAccount = {
      externalCode: '1000',
      externalName: 'Cash',
      debit: 100,
      credit: 0,
      mappedAccountId: undefined,
      confidence: 0,
    };
    const rejected: RejectedRow[] = [
      {
        rowIndex: 5,
        reason: 'subtotal',
        rawCode: '',
        rawName: 'Total Revenue',
        rawDebit: '0',
        rawCredit: '55000',
      },
    ];
    render(
      <ImportReviewPane
        rows={[row]}
        accounts={[]}
        onUpdate={vi.fn()}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        rejectedRows={rejected}
        onRejectedRowUpdate={vi.fn()}
        onRejectedRowReparse={vi.fn()}
        onIncludeAllSubtotals={vi.fn()}
        onApplyToSimilar={vi.fn()}
      />,
    );
    expect(screen.getByTestId('rejected-rows-banner')).toBeTruthy();
    expect(screen.getByTestId('rejected-rows-banner').textContent).toMatch(
      /1 rows rejected/,
    );
  });

  it('REGRESSION: omitting Phase 7 props (Phase 4 caller) does not render banner, badge, or panel', () => {
    const row: ImportedAccount = {
      externalCode: '1000',
      externalName: 'Cash',
      debit: 100,
      credit: 0,
      mappedAccountId: undefined,
      confidence: 0,
    };
    render(
      <ImportReviewPane
        rows={[row]}
        accounts={[]}
        onUpdate={vi.fn()}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('tolerant-parse-banner')).toBeNull();
    expect(screen.queryByTestId('rejected-rows-banner')).toBeNull();
  });
});
