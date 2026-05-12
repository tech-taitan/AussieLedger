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
        // Both names match /trial|TB|balance/i → can't auto-select.
        sheetNames={['Trial Balance', 'TB Detail']}
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );
    expect(screen.queryByTestId('xlsx-sheet-picker-modal')).not.toBeNull();
    expect(screen.queryByTestId('sheet-option-Trial Balance')).not.toBeNull();
    expect(screen.queryByTestId('sheet-option-TB Detail')).not.toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('regex matches trial / TB / balance case-insensitive', () => {
    const onSelect = vi.fn();
    render(
      <XlsxSheetPicker
        sheetNames={['BALANCE_SHEET', 'other']}
        onSelect={onSelect}
        onCancel={() => {}}
      />,
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('BALANCE_SHEET');
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
