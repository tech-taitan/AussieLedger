/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { HeaderDetectResult } from '../lib/import/headerDetect';
import { mergeHeaderRows } from '../lib/import/headerDetect';

interface HeaderRowPickerProps {
  rows: string[][];
  detectResult: HeaderDetectResult | null;
  onPick: (rowIndex: number) => void;
  onCancel: () => void;
}

export const HeaderRowPicker: React.FC<HeaderRowPickerProps> = ({
  rows,
  detectResult,
  onPick,
  onCancel,
}) => {
  const autoPick = detectResult?.autoPickRow ?? null;
  const isManualMode = autoPick === null;
  const [altsOpen, setAltsOpen] = useState(isManualMode);
  const preview = rows.slice(0, 15);
  const top = detectResult?.topCandidate ?? null;
  const conf = top ? Math.round(top.confidence * 100) : 0;

  // Detect multi-row header preview opportunity:
  // when autoPick is set AND the next row also scores > 0.40
  const multiRowMerged: string[] | null = (() => {
    if (autoPick === null || !rows[autoPick] || !rows[autoPick + 1]) return null;
    const nextCandidate = detectResult?.alternatives.find(
      (a) => a.rowIndex === autoPick + 1,
    );
    if (nextCandidate && nextCandidate.score > 0.40) {
      return mergeHeaderRows(rows[autoPick], rows[autoPick + 1]);
    }
    return null;
  })();

  return (
    <div data-testid="header-row-picker" className="bg-white border border-[var(--line-strong)] rounded p-4 space-y-3">
      {!isManualMode && top && (
        <div data-testid="header-auto-pick-banner" className="bg-blue-50 border border-blue-100 p-3 text-sm">
          We think row {top.rowIndex + 1} is the header — confidence {conf}%.{' '}
          <button
            type="button"
            onClick={() => setAltsOpen((o) => !o)}
            data-testid="header-show-alternatives"
            className="underline text-blue-700"
          >
            pick a different row
          </button>
        </div>
      )}

      {isManualMode && (
        <div data-testid="header-manual-prompt" className="bg-amber-50 border border-amber-100 p-3 text-sm">
          Pick the header row
        </div>
      )}

      {(altsOpen || isManualMode) && detectResult && (
        <div className="text-xs text-gray-600 space-y-1">
          {detectResult.alternatives.map((c) => (
            <div key={c.rowIndex} data-testid={`header-candidate-${c.rowIndex}`}>
              Row {c.rowIndex + 1} — score {Math.round(c.score * 100)}%
            </div>
          ))}
        </div>
      )}

      {multiRowMerged && (
        <div data-testid="header-multi-row-preview" className="bg-gray-50 border border-gray-200 p-2 text-xs">
          Merged composite header: {multiRowMerged.join(' | ')}
        </div>
      )}

      <div className="overflow-x-auto max-h-80 overflow-y-auto border border-gray-200">
        <table className="min-w-full text-xs">
          <tbody>
            {preview.map((row, i) => {
              const isAuto = i === autoPick;
              return (
                <tr
                  key={i}
                  data-testid={`header-row-${i}`}
                  role="button"
                  tabIndex={0}
                  className={`cursor-pointer border-b ${isAuto ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onClick={() => onPick(i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onPick(i);
                  }}
                >
                  <td className="px-2 py-1 text-gray-400 w-10">{i + 1}</td>
                  {row.map((cell, j) => (
                    <td key={j} className="px-2 py-1">
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          data-testid="header-row-picker-cancel"
          onClick={onCancel}
          className="text-sm underline px-3 py-1"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
