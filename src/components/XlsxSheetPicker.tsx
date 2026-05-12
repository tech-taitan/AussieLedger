/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect } from 'react';

interface XlsxSheetPickerProps {
  sheetNames: string[];
  onSelect: (sheetName: string) => void;
  onCancel: () => void;
  /** Regex matched against each sheet name. If exactly ONE name matches, auto-select. */
  autoSelectMatcher?: RegExp;
}

const DEFAULT_MATCHER = /trial|TB|balance/i;

/**
 * Modal that picks a sheet from a multi-sheet XLSX workbook.
 *
 * Behaviour (IMP-01):
 * - If exactly one sheet name matches `autoSelectMatcher` (default
 *   `/trial|TB|balance/i`), the picker auto-fires `onSelect` on mount
 *   and renders nothing — the user does not see a modal at all.
 * - Otherwise it renders a list of buttons (one per sheet) plus a
 *   Cancel button. Clicking a sheet button fires `onSelect(name)`.
 */
export const XlsxSheetPicker: React.FC<XlsxSheetPickerProps> = ({
  sheetNames,
  onSelect,
  onCancel,
  autoSelectMatcher = DEFAULT_MATCHER,
}) => {
  const matches = sheetNames.filter((n) => autoSelectMatcher.test(n));

  useEffect(() => {
    if (matches.length === 1) {
      onSelect(matches[0]);
    }
    // We intentionally depend only on the join'd sheet names + matcher source
    // so re-renders with the same input don't re-fire onSelect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetNames.join('|'), autoSelectMatcher.source]);

  if (matches.length === 1) {
    // Auto-select fired in the effect; render nothing.
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      data-testid="xlsx-sheet-picker-modal"
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium mb-2">
          This workbook has {sheetNames.length} sheets
        </h3>
        <p className="text-sm opacity-60 mb-4">
          Which sheet contains the trial balance?
        </p>
        <ul className="space-y-2 mb-4">
          {sheetNames.map((name) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => onSelect(name)}
                className="w-full text-left px-3 py-2 border rounded hover:bg-gray-50"
                data-testid={`sheet-option-${name}`}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm underline"
            data-testid="xlsx-sheet-picker-cancel"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
