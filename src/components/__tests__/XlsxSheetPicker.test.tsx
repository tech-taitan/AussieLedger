/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { XlsxSheetPicker } from '../XlsxSheetPicker';

describe('XlsxSheetPicker (IMP-01)', () => {
  it('auto-selects single matching sheet', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();
    render(
      <XlsxSheetPicker
        sheetNames={['Sheet1', 'Trial Balance', 'Other']}
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );
    // Modal should NOT be rendered because a single sheet matched.
    expect(screen.queryByTestId('xlsx-sheet-picker-modal')).toBeNull();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('Trial Balance');
  });

  it('modal shown when multiple sheets', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();
    render(
      <XlsxSheetPicker
        // Both names match the tightened TB-only matcher → can't auto-select.
        sheetNames={['Trial Balance', 'Trial Balance Detail']}
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );
    expect(screen.queryByTestId('xlsx-sheet-picker-modal')).not.toBeNull();
    expect(screen.queryByTestId('sheet-option-Trial Balance')).not.toBeNull();
    expect(screen.queryByTestId('sheet-option-Trial Balance Detail')).not.toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('Task 3: regex matches "TRIAL BALANCE" case-insensitive (TB-only, not Balance Sheet)', () => {
    const onSelect = vi.fn();
    render(
      <XlsxSheetPicker
        // The tightened matcher only fires on real TB sheets — "BALANCE_SHEET"
        // and "TB Adjustments" are no longer auto-selected, eliminating the
        // silent route to the wrong workbook sheet flagged by the audit.
        sheetNames={['TRIAL BALANCE', 'other']}
        onSelect={onSelect}
        onCancel={() => {}}
      />,
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('TRIAL BALANCE');
  });

  it('Task 3: tightened matcher does NOT auto-select "Balance Sheet" or "TB Detail"', () => {
    const onSelect = vi.fn();
    render(
      <XlsxSheetPicker
        sheetNames={['Balance Sheet', 'TB Detail', 'Other']}
        onSelect={onSelect}
        onCancel={() => {}}
      />,
    );
    // None match → modal renders so the user can pick explicitly.
    expect(screen.queryByTestId('xlsx-sheet-picker-modal')).not.toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('user pick fires onSelect with sheet name', () => {
    const onSelect = vi.fn();
    render(
      <XlsxSheetPicker
        // No sheet matches the regex, so the modal renders.
        sheetNames={['Foo', 'Bar']}
        onSelect={onSelect}
        onCancel={() => {}}
      />,
    );
    expect(screen.queryByTestId('xlsx-sheet-picker-modal')).not.toBeNull();
    fireEvent.click(screen.getByTestId('sheet-option-Foo'));
    expect(onSelect).toHaveBeenCalledWith('Foo');
  });

  it('cancel button fires onCancel', () => {
    const onCancel = vi.fn();
    render(
      <XlsxSheetPicker
        sheetNames={['Foo', 'Bar']}
        onSelect={() => {}}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByTestId('xlsx-sheet-picker-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
