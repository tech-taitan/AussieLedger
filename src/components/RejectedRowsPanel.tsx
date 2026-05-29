/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { deriveRegexSignature } from '../lib/import/columnMerge';

export type RejectedRowReason =
  | 'subtotal'
  | 'currency-unparseable'
  | 'no-account-code'
  | 'low-confidence-parse'
  | 'other';

export interface RejectedRow {
  rowIndex: number;
  reason: RejectedRowReason;
  rawCode: string;
  rawName: string;
  rawDebit: string;
  rawCredit: string;
  editedCode?: string;
  editedName?: string;
  editedDebit?: string;
  editedCredit?: string;
  failingCellValue?: string;
  failingColumn?: 'debit' | 'credit' | 'code' | 'name';
}

interface RejectedRowsPanelProps {
  rejectedRows: RejectedRow[];
  onUpdate: (rowIndex: number, patch: Partial<RejectedRow>) => void;
  onReparse: (rowIndex: number) => void;
  onApplyToSimilar: (sourceRowIndex: number) => void;
  onIncludeAllSubtotals: () => void;
}

const REASON_ORDER: RejectedRowReason[] = [
  'subtotal',
  'currency-unparseable',
  'no-account-code',
  'low-confidence-parse',
  'other',
];

const REASON_LABELS: Record<RejectedRowReason, string> = {
  subtotal: 'Detected as subtotal',
  'currency-unparseable': 'Currency unparseable',
  'no-account-code': 'No account code',
  'low-confidence-parse': 'Low confidence parse',
  other: 'Other',
};

type FieldKey = 'code' | 'name' | 'debit' | 'credit';

function getEditedValue(row: RejectedRow, field: FieldKey): string {
  switch (field) {
    case 'code': return row.editedCode ?? row.rawCode;
    case 'name': return row.editedName ?? row.rawName;
    case 'debit': return row.editedDebit ?? row.rawDebit;
    case 'credit': return row.editedCredit ?? row.rawCredit;
  }
}

function makePatch(field: FieldKey, value: string): Partial<RejectedRow> {
  switch (field) {
    case 'code': return { editedCode: value };
    case 'name': return { editedName: value };
    case 'debit': return { editedDebit: value };
    case 'credit': return { editedCredit: value };
  }
}

export const RejectedRowsPanel: React.FC<RejectedRowsPanelProps> = ({
  rejectedRows,
  onUpdate,
  onReparse,
  onApplyToSimilar,
  onIncludeAllSubtotals,
}) => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [lowConfOpen, setLowConfOpen] = useState(false);
  const [openSimilar, setOpenSimilar] = useState<number | null>(null);

  const grouped = REASON_ORDER.map((reason) => ({
    reason,
    rows: rejectedRows
      .filter((r) => r.reason === reason)
      .sort((a, b) => a.rowIndex - b.rowIndex),
  })).filter((g) => g.rows.length > 0);

  const similarRowsFor = (source: RejectedRow): RejectedRow[] => {
    if (!source.failingCellValue) return [];
    const sig = deriveRegexSignature(source.failingCellValue);
    const re = new RegExp(`^${sig}$`);
    return rejectedRows.filter(
      (r) =>
        r.reason === source.reason &&
        r.failingCellValue != null &&
        re.test(r.failingCellValue),
    );
  };

  return (
    <div data-testid="rejected-rows-panel" className="mt-4 border border-amber-200 bg-amber-50 rounded">
      <button
        type="button"
        data-testid="rejected-rows-banner"
        onClick={() => setPanelOpen((o) => !o)}
        className="w-full flex items-center gap-2 p-3 text-left text-sm font-medium"
      >
        {panelOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {rejectedRows.length} rows rejected — review
      </button>

      {panelOpen &&
        grouped.map((group) => (
          <div
            key={group.reason}
            data-testid={`rejected-group-${group.reason}`}
            className="border-t border-amber-200 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase">
                {REASON_LABELS[group.reason]} ({group.rows.length})
              </h4>
              {group.reason === 'subtotal' && (
                <button
                  type="button"
                  data-testid="include-all-subtotals"
                  onClick={onIncludeAllSubtotals}
                  className="text-xs underline text-blue-700"
                >
                  Include all subtotals
                </button>
              )}
              {group.reason === 'low-confidence-parse' && (
                <button
                  type="button"
                  data-testid="low-confidence-section-expander"
                  onClick={() => setLowConfOpen((o) => !o)}
                  className="text-xs underline"
                >
                  {lowConfOpen ? 'Hide' : 'Show'}
                </button>
              )}
            </div>

            {(group.reason !== 'low-confidence-parse' || lowConfOpen) &&
              group.rows.map((row) => {
                const similar = similarRowsFor(row);
                const isPreviewOpen = openSimilar === row.rowIndex;

                return (
                  <div
                    key={row.rowIndex}
                    data-testid={`rejected-row-${row.rowIndex}`}
                    className="bg-white border border-gray-200 p-2 rounded text-xs"
                  >
                    <div className="grid grid-cols-4 gap-2">
                      {(['code', 'name', 'debit', 'credit'] as FieldKey[]).map((field) => (
                        <input
                          key={field}
                          aria-label={`rejected-${row.rowIndex}-${field}`}
                          value={getEditedValue(row, field)}
                          onChange={(e) =>
                            onUpdate(row.rowIndex, makePatch(field, e.target.value))
                          }
                          className="border rounded px-1 py-0.5"
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        data-testid={`rejected-row-${row.rowIndex}-reparse`}
                        onClick={() => onReparse(row.rowIndex)}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                      >
                        Re-parse and include
                      </button>
                      {similar.length > 1 && (
                        <button
                          type="button"
                          data-testid={`rejected-row-${row.rowIndex}-apply-similar`}
                          onClick={() =>
                            setOpenSimilar(isPreviewOpen ? null : row.rowIndex)
                          }
                          className="text-xs underline"
                        >
                          Apply to similar ({similar.length} rows)
                        </button>
                      )}
                    </div>
                    {isPreviewOpen && similar.length > 1 && (
                      <div
                        data-testid={`rejected-row-${row.rowIndex}-similar-preview`}
                        className="mt-2 bg-gray-50 border border-gray-200 p-2 rounded"
                      >
                        <table className="text-xs w-full">
                          <thead>
                            <tr>
                              <th>Row</th>
                              <th>Current</th>
                              <th>Proposed</th>
                            </tr>
                          </thead>
                          <tbody>
                            {similar.map((s) => (
                              <tr key={s.rowIndex}>
                                <td>{s.rowIndex + 1}</td>
                                <td>{s.failingCellValue}</td>
                                <td>
                                  {row.editedCode ??
                                    row.editedName ??
                                    row.editedDebit ??
                                    row.editedCredit ??
                                    '(edit source row first)'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-2 flex gap-2 justify-end">
                          <button
                            type="button"
                            data-testid={`rejected-row-${row.rowIndex}-similar-cancel`}
                            onClick={() => setOpenSimilar(null)}
                            className="text-xs underline"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            data-testid={`rejected-row-${row.rowIndex}-similar-confirm`}
                            onClick={() => {
                              onApplyToSimilar(row.rowIndex);
                              setOpenSimilar(null);
                            }}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                          >
                            Apply to all {similar.length}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
    </div>
  );
};
