/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RejectedRowsPanel, type RejectedRow } from '../RejectedRowsPanel';

const baseRow = (
  rowIndex: number,
  reason: RejectedRow['reason'],
  overrides: Partial<RejectedRow> = {},
): RejectedRow => ({
  rowIndex,
  reason,
  rawCode: '',
  rawName: '',
  rawDebit: '',
  rawCredit: '',
  ...overrides,
});

const rows: RejectedRow[] = [
  baseRow(2, 'subtotal', {
    rawName: 'Total Revenue',
    rawDebit: '0',
    rawCredit: '55000',
  }),
  baseRow(8, 'currency-unparseable', {
    rawName: 'Other',
    rawDebit: '$1,234.56 X',
    failingCellValue: '$1,234.56 X',
    failingColumn: 'debit',
  }),
  baseRow(9, 'currency-unparseable', {
    rawName: 'Misc',
    rawDebit: '$5,678.90 X',
    failingCellValue: '$5,678.90 X',
    failingColumn: 'debit',
  }),
  baseRow(11, 'low-confidence-parse', {
    rawName: 'Sales',
    rawDebit: '0',
    rawCredit: '1,234',
  }),
];

describe('RejectedRowsPanel (IMP-09 + IMP-11)', () => {
  it('renders banner "N rows rejected — review" with chevron expander', () => {
    render(
      <RejectedRowsPanel
        rejectedRows={rows}
        onUpdate={vi.fn()}
        onReparse={vi.fn()}
        onApplyToSimilar={vi.fn()}
        onIncludeAllSubtotals={vi.fn()}
      />,
    );
    const banner = screen.getByTestId('rejected-rows-banner');
    expect(banner.textContent).toMatch(/4 rows rejected/);
  });

  it('groups rejected rows by reason', () => {
    render(
      <RejectedRowsPanel
        rejectedRows={rows}
        onUpdate={vi.fn()}
        onReparse={vi.fn()}
        onApplyToSimilar={vi.fn()}
        onIncludeAllSubtotals={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('rejected-rows-banner'));
    expect(screen.getByTestId('rejected-group-subtotal')).toBeTruthy();
    expect(screen.getByTestId('rejected-group-currency-unparseable')).toBeTruthy();
    expect(screen.getByTestId('rejected-group-low-confidence-parse')).toBeTruthy();
  });

  it('within each reason group, rows sorted by original file rowIndex ascending', () => {
    const reversed: RejectedRow[] = [
      baseRow(20, 'currency-unparseable', { failingCellValue: '$X' }),
      baseRow(5, 'currency-unparseable', { failingCellValue: '$Y' }),
    ];
    render(
      <RejectedRowsPanel
        rejectedRows={reversed}
        onUpdate={vi.fn()}
        onReparse={vi.fn()}
        onApplyToSimilar={vi.fn()}
        onIncludeAllSubtotals={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('rejected-rows-banner'));
    const group = screen.getByTestId('rejected-group-currency-unparseable');
    const ids = Array.from(
      group.querySelectorAll('[data-testid^="rejected-row-"]'),
    ).map((el) => el.getAttribute('data-testid'));
    // Row 5 must appear before Row 20
    expect(ids.indexOf('rejected-row-5')).toBeLessThan(
      ids.indexOf('rejected-row-20'),
    );
  });

  it('per-row edit-in-place fires onUpdate(rowIndex, patch) on field change', () => {
    const onUpdate = vi.fn();
    render(
      <RejectedRowsPanel
        rejectedRows={rows}
        onUpdate={onUpdate}
        onReparse={vi.fn()}
        onApplyToSimilar={vi.fn()}
        onIncludeAllSubtotals={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('rejected-rows-banner'));
    const input = screen.getByLabelText('rejected-8-debit');
    fireEvent.change(input, { target: { value: '1234.56' } });
    expect(onUpdate).toHaveBeenCalledWith(8, { editedDebit: '1234.56' });
  });

  it('"Re-parse and include" button fires onReparse(rowIndex)', () => {
    const onReparse = vi.fn();
    render(
      <RejectedRowsPanel
        rejectedRows={rows}
        onUpdate={vi.fn()}
        onReparse={onReparse}
        onApplyToSimilar={vi.fn()}
        onIncludeAllSubtotals={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('rejected-rows-banner'));
    fireEvent.click(screen.getByTestId('rejected-row-8-reparse'));
    expect(onReparse).toHaveBeenCalledWith(8);
  });

  it('"Apply this fix to similar rows" identifies similar by reason + regex signature, shows diff preview', () => {
    render(
      <RejectedRowsPanel
        rejectedRows={rows}
        onUpdate={vi.fn()}
        onReparse={vi.fn()}
        onApplyToSimilar={vi.fn()}
        onIncludeAllSubtotals={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('rejected-rows-banner'));
    // Rows 8 + 9 both have failingCellValue matching "$d+,d+.d+ X" shape
    fireEvent.click(screen.getByTestId('rejected-row-8-apply-similar'));
    expect(screen.getByTestId('rejected-row-8-similar-preview')).toBeTruthy();
  });

  it('diff preview includes confirm + cancel; cancel leaves rows unchanged', () => {
    const onApply = vi.fn();
    render(
      <RejectedRowsPanel
        rejectedRows={rows}
        onUpdate={vi.fn()}
        onReparse={vi.fn()}
        onApplyToSimilar={onApply}
        onIncludeAllSubtotals={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('rejected-rows-banner'));
    fireEvent.click(screen.getByTestId('rejected-row-8-apply-similar'));
    fireEvent.click(screen.getByTestId('rejected-row-8-similar-cancel'));
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.queryByTestId('rejected-row-8-similar-preview')).toBeNull();
  });

  it('"Include all subtotals" bulk button fires onIncludeAllSubtotals (only renders when subtotal group non-empty)', () => {
    const onInclude = vi.fn();
    render(
      <RejectedRowsPanel
        rejectedRows={rows}
        onUpdate={vi.fn()}
        onReparse={vi.fn()}
        onApplyToSimilar={vi.fn()}
        onIncludeAllSubtotals={onInclude}
      />,
    );
    fireEvent.click(screen.getByTestId('rejected-rows-banner'));
    fireEvent.click(screen.getByTestId('include-all-subtotals'));
    expect(onInclude).toHaveBeenCalled();
  });

  it('low-confidence-parse section starts COLLAPSED by default; clicking expander reveals rows', () => {
    render(
      <RejectedRowsPanel
        rejectedRows={rows}
        onUpdate={vi.fn()}
        onReparse={vi.fn()}
        onApplyToSimilar={vi.fn()}
        onIncludeAllSubtotals={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('rejected-rows-banner'));
    // Row 11 is low-confidence — must NOT render before expander click
    expect(screen.queryByTestId('rejected-row-11')).toBeNull();
    fireEvent.click(screen.getByTestId('low-confidence-section-expander'));
    expect(screen.getByTestId('rejected-row-11')).toBeTruthy();
  });

  it('renders test-id "rejected-rows-banner" so ImportReviewPane integration tests can query it', () => {
    render(
      <RejectedRowsPanel
        rejectedRows={rows}
        onUpdate={vi.fn()}
        onReparse={vi.fn()}
        onApplyToSimilar={vi.fn()}
        onIncludeAllSubtotals={vi.fn()}
      />,
    );
    expect(screen.getByTestId('rejected-rows-banner')).toBeTruthy();
  });
});
