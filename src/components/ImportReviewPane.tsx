/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import type { Account, ImportedAccount } from '../types';
import { HIGH_CONFIDENCE_THRESHOLD } from '../lib/import/match';
import { cn } from '../lib/utils';

/**
 * Row-level review UI between fuzzy match and post.
 *
 * Behaviour (IMP-03):
 * - Each row shows match status — Auto-matched (≥ 0.85 + mappedAccountId set),
 *   Review (0 < confidence < 0.85), or No match (confidence === 0).
 * - For Review / No match rows the user can pick a different account from
 *   the dropdown, or "Create new account" (encodes a NEW: sentinel into
 *   `mappedAccountId` that ImportTB later resolves on accept).
 * - Per-row include/exclude toggle stored on a `_include` boolean (lives on
 *   `ImportedAccount` via the extension type below — initial state defaults
 *   to TRUE; rows are excluded only when explicitly unchecked).
 * - Debit and credit are editable inline.
 * - `onAccept` and `onReject` fire the parent's accept/reject paths.
 */
interface ImportReviewPaneProps {
  rows: ImportedAccount[];
  accounts: Account[];
  onUpdate: (rows: ImportedAccount[]) => void;
  onAccept: () => void;
  onReject: () => void;
}

/**
 * Internal augmentation of `ImportedAccount` with the review-pane-only
 * `_include` flag. The runtime field lives on the same object instance
 * passed down from ImportTB; it never leaks into the persisted JournalEntry
 * because ImportTB filters by `_include !== false` before building lines.
 */
export interface ReviewRow extends ImportedAccount {
  _include?: boolean;
}

export const ImportReviewPane: React.FC<ImportReviewPaneProps> = ({
  rows,
  accounts,
  onUpdate,
  onAccept,
  onReject,
}) => {
  const updateRow = (idx: number, patch: Partial<ReviewRow>) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onUpdate(next);
  };

  return (
    <section
      className="bg-white border border-[var(--line)] rounded p-4"
      data-testid="import-review-pane"
    >
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-lg font-medium">Review {rows.length} rows</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAccept}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
            data-testid="accept-import"
          >
            Accept import
          </button>
          <button
            type="button"
            onClick={onReject}
            className="px-4 py-2 text-sm underline"
            data-testid="reject-import"
          >
            Reject all
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Include</th>
              <th className="text-left py-2 px-2">External</th>
              <th className="text-left py-2 px-2">Match</th>
              <th className="text-right py-2 px-2">Debit</th>
              <th className="text-right py-2 px-2">Credit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const matched = accounts.find((a) => a.id === r.mappedAccountId);
              const conf = r.confidence ?? 0;
              const status =
                matched && conf >= HIGH_CONFIDENCE_THRESHOLD
                  ? 'auto'
                  : conf > 0
                    ? 'review'
                    : 'nomatch';
              const included = (r as ReviewRow)._include !== false;

              return (
                <tr
                  key={`${r.externalCode}-${idx}`}
                  className="border-b"
                  data-testid={`review-row-${idx}`}
                >
                  <td className="py-2 px-2">
                    <input
                      type="checkbox"
                      checked={included}
                      onChange={(e) =>
                        updateRow(idx, { _include: e.target.checked })
                      }
                      aria-label={`include-${idx}`}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <div className="font-mono text-xs">{r.externalCode}</div>
                    <div>{r.externalName}</div>
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={cn(
                        'text-xs px-2 py-1 rounded inline-block',
                        status === 'auto' && 'bg-green-100 text-green-800',
                        status === 'review' && 'bg-amber-100 text-amber-800',
                        status === 'nomatch' && 'bg-red-100 text-red-800',
                      )}
                      data-testid={`status-${idx}`}
                    >
                      {status === 'auto' && 'Auto-matched'}
                      {status === 'review' && 'Review'}
                      {status === 'nomatch' && 'No match'}
                    </span>
                    {matched && (
                      <div className="text-xs mt-1">
                        → {matched.code} {matched.name}
                      </div>
                    )}
                    {status !== 'auto' && (
                      <div className="mt-2 flex flex-wrap gap-2 items-center">
                        <select
                          value={r.mappedAccountId ?? ''}
                          onChange={(e) =>
                            updateRow(idx, {
                              mappedAccountId: e.target.value || undefined,
                            })
                          }
                          aria-label={`pick-account-${idx}`}
                          className="border rounded px-2 py-1 text-xs"
                        >
                          <option value="">(unmapped)</option>
                          {accounts
                            .filter((a) => !a.isArchived)
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} — {a.name}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            updateRow(idx, {
                              mappedAccountId: `NEW:${r.externalCode}:${r.externalName}`,
                            })
                          }
                          className="text-xs text-blue-600 underline"
                          data-testid={`create-new-${idx}`}
                        >
                          Create new account
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      value={r.debit}
                      onChange={(e) =>
                        updateRow(idx, { debit: Number(e.target.value) })
                      }
                      className="w-24 border rounded px-1 py-1 text-right text-xs"
                      aria-label={`debit-${idx}`}
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      value={r.credit}
                      onChange={(e) =>
                        updateRow(idx, { credit: Number(e.target.value) })
                      }
                      className="w-24 border rounded px-1 py-1 text-right text-xs"
                      aria-label={`credit-${idx}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
