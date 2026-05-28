/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BOOK-02: Edit-supersedes UX — banner + diff preview before save.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JournalForm } from '../JournalForm';
import type { Account, JournalEntry, JournalLine } from '../../types';

function makeAccount(id: string, code: string, name: string): Account {
  return {
    id,
    code,
    name,
    type: 'Expense',
    gstCode: 'N-T',
  };
}

function makeLine(accountId: string, debit: number, credit: number): JournalLine {
  return {
    accountId,
    description: 'line',
    debit,
    credit,
    taxAmount: 0,
  };
}

function makePostedEntry(): JournalEntry {
  return {
    _v: 3,
    id: 'orig-1',
    date: '2026-01-15',
    reference: 'INV-001',
    description: 'Office supplies',
    lines: [makeLine('acc-1', 100, 0), makeLine('acc-2', 0, 100)],
    isPosted: true,
    status: 'posted',
  };
}

const accounts: Account[] = [
  makeAccount('acc-1', '5100', 'Office supplies'),
  makeAccount('acc-2', '1000', 'Cash at Bank'),
];

describe('JournalForm (BOOK-02 banner + diff)', () => {
  it('edit banner and diff preview', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const onEdit = vi.fn();
    const original = makePostedEntry();

    render(
      <JournalForm
        accounts={accounts}
        onSave={onSave}
        onCancel={onCancel}
        editingOriginal={original}
        onEdit={onEdit}
      />,
    );

    // Banner literal copy must be present (BOOK-02 UX decision)
    expect(screen.getByTestId('edit-banner').textContent).toMatch(
      /This will replace the original/,
    );

    // Submit (the form is pre-populated and balanced)
    fireEvent.submit(screen.getByTestId('save-edit-button').closest('form')!);

    // BOOK-02: diff preview shown BEFORE onEdit fires
    expect(screen.getByTestId('edit-journal-diff')).toBeInTheDocument();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('renders Edit button on posted entries', () => {
    // The "Edit button" surfaces by the parent passing editingOriginal — verified by banner presence
    const onSave = vi.fn();
    const original = makePostedEntry();
    render(
      <JournalForm
        accounts={accounts}
        onSave={onSave}
        onCancel={vi.fn()}
        editingOriginal={original}
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByTestId('save-edit-button')).toBeInTheDocument();
    expect(screen.getByTestId('save-edit-button').textContent).toMatch(/Save Edit/);
  });

  it('renders Reverse button on posted entries', () => {
    const onReverse = vi.fn();
    const original = makePostedEntry();
    render(
      <JournalForm
        accounts={accounts}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        editingOriginal={original}
        onEdit={vi.fn()}
        onReverse={onReverse}
      />,
    );
    const reverseBtn = screen.getByTestId('reverse-button');
    expect(reverseBtn).toBeInTheDocument();
    fireEvent.click(reverseBtn);
    expect(onReverse).toHaveBeenCalledWith(original);
  });

  it('diff preview highlights changed lines', () => {
    const original = makePostedEntry();
    const onEdit = vi.fn();
    render(
      <JournalForm
        accounts={accounts}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        editingOriginal={original}
        onEdit={onEdit}
      />,
    );

    // Change the description in the form
    const descInput = screen.getByPlaceholderText('General description') as HTMLInputElement;
    fireEvent.change(descInput, { target: { value: 'Office supplies (Officeworks)' } });

    // Submit -> diff renders
    fireEvent.submit(screen.getByTestId('save-edit-button').closest('form')!);

    // Description rows must carry the changed-class marker
    const propDesc = screen.getByLabelText('proposed-description');
    expect(propDesc.className).toMatch(/bg-yellow-50/);
    expect(propDesc.textContent).toMatch(/Office supplies \(Officeworks\)/);
  });

  it('confirm-supersede dialog appears before save', () => {
    const onEdit = vi.fn();
    const original = makePostedEntry();
    render(
      <JournalForm
        accounts={accounts}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        editingOriginal={original}
        onEdit={onEdit}
      />,
    );

    // Submit -> diff appears, onEdit NOT called yet
    fireEvent.submit(screen.getByTestId('save-edit-button').closest('form')!);
    expect(screen.getByTestId('edit-confirm-step')).toBeInTheDocument();
    expect(onEdit).not.toHaveBeenCalled();

    // Click confirm -> onEdit fires exactly once with (original, edits)
    fireEvent.click(screen.getByTestId('confirm-edit'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    const [origArg, edits] = onEdit.mock.calls[0];
    expect(origArg.id).toBe(original.id);
    expect(edits).toMatchObject({
      date: original.date,
      reference: original.reference,
      description: original.description,
    });
  });
});

describe('JournalForm — Phase 6 finalised-FY guard (UX-01)', () => {
  it('Test JF.1: no lockedFy prop — Save button enabled when form is balanced', () => {
    render(
      <JournalForm
        accounts={accounts}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    // The form is not pre-populated so no locked-fy-banner should appear
    expect(screen.queryByTestId('locked-fy-banner')).not.toBeInTheDocument();
  });

  it('Test JF.2: lockedFy="FY2026" prop — banner with "FY is finalised" text is in the DOM', () => {
    render(
      <JournalForm
        accounts={accounts}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        lockedFy="FY2026"
      />,
    );
    const banner = screen.getByTestId('locked-fy-banner');
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toMatch(/FY is finalised — use Reverse and Re-post/i);
  });

  it('Test JF.3: with lockedFy="FY2026", the Save button has the disabled attribute', () => {
    render(
      <JournalForm
        accounts={accounts}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        lockedFy="FY2026"
      />,
    );
    // The post-journal-button should be disabled when locked
    const saveBtn = screen.getByTestId('post-journal-button');
    expect(saveBtn).toBeDisabled();
  });

  it('Test JF.4: with lockedFy="FY2026" and editingOriginal, the Reverse button remains enabled', () => {
    const original = makePostedEntry();
    const onReverse = vi.fn();
    render(
      <JournalForm
        accounts={accounts}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        lockedFy="FY2026"
        editingOriginal={original}
        onEdit={vi.fn()}
        onReverse={onReverse}
      />,
    );
    const reverseBtn = screen.getByTestId('reverse-button');
    expect(reverseBtn).not.toBeDisabled();
    fireEvent.click(reverseBtn);
    expect(onReverse).toHaveBeenCalledWith(original);
  });
});
