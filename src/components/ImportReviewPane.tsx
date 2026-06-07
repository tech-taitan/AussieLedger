/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useMemo, useState } from 'react';
import type { Account, ImportedAccount } from '../types';
import { HIGH_CONFIDENCE_THRESHOLD } from '../lib/import/match';
import { cn } from '../lib/utils';
import type { RejectedRow } from './RejectedRowsPanel';
import { RejectedRowsPanel } from './RejectedRowsPanel';
import { AnomalyBadge } from './AnomalyBadge';
import { AccountPicker } from './AccountPicker';
import { NewAccountModal, type NewAccountSpec } from './NewAccountModal';
import { ImportIssuesPanel } from './ImportIssuesPanel';
import { ImportConfirmDialog } from './ImportConfirmDialog';
import { computeImportIssues, hasBlockingErrors } from '../lib/import/validateReview';

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
 *
 * Phase 7 additions (all OPTIONAL — backward-compatible with Phase 4 callers):
 * - `rejectedRows`: renders RejectedRowsPanel inline below accepted rows
 * - `tolerantParseCount`: shows "Tolerantly parsed currency in N cells" banner
 * - `lowConfidenceParseCount`: shows AnomalyBadge for ambiguous parses
 * - Callback props for rejected-row interactions
 */
interface ImportReviewPaneProps {
  rows: ImportedAccount[];
  accounts: Account[];
  onUpdate: (rows: ImportedAccount[]) => void;
  onAccept: () => void;
  onReject: () => void;
  // Phase 7 additions — optional, backward-compatible
  rejectedRows?: RejectedRow[];
  tolerantParseCount?: number;
  lowConfidenceParseCount?: number;
  onRejectedRowUpdate?: (rowIndex: number, patch: Partial<RejectedRow>) => void;
  onRejectedRowReparse?: (rowIndex: number) => void;
  onIncludeAllSubtotals?: () => void;
  onApplyToSimilar?: (sourceRowIndex: number) => void;
}

/**
 * Internal augmentation of `ImportedAccount` with review-pane-only fields.
 * The runtime fields live on the same object instance passed down from
 * ImportTB; they never leak into the persisted JournalEntry because
 * ImportTB filters by `_include !== false` before building lines and
 * `_newAccountSpec` is consumed (then dropped) at mint time.
 */
export interface ReviewRow extends ImportedAccount {
  _include?: boolean;
  /**
   * Set when the user has confirmed the NewAccountModal — carries the
   * user-chosen code/name/type/gstCode/parentCode for the to-be-minted
   * account. ImportTB.buildOpeningEntry reads this and falls back to
   * guesses if absent.
   */
  _newAccountSpec?: NewAccountSpec;
  /**
   * Set by fuzzyMatch when the imported code exactly matches an existing
   * CoA account but the NAMES diverge (similarity < NAME_DIVERGENCE_THRESHOLD).
   * The review pane renders the diff inline so the user can either confirm
   * the existing-account mapping or click "Create new account" to preserve
   * the imported name. validateReview emits a 'code-mismatch' warning
   * whenever any included row carries this flag.
   */
  _nameDivergence?: {
    importedName: string;
    existingName: string;
    similarity: number;
  };
}

export const ImportReviewPane: React.FC<ImportReviewPaneProps> = ({
  rows,
  accounts,
  onUpdate,
  onAccept,
  onReject,
  rejectedRows,
  tolerantParseCount,
  lowConfidenceParseCount,
  onRejectedRowUpdate,
  onRejectedRowReparse,
  onIncludeAllSubtotals,
  onApplyToSimilar,
}) => {
  // Which row's NewAccountModal is currently open. -1 = none.
  const [modalRowIndex, setModalRowIndex] = useState<number>(-1);

  // Pre-import health check — recomputed on every row mutation. Accounts
  // are passed in so the validator can flag code-mismatch warnings
  // (imported codes missing from the CoA, or exact-code matches with
  // divergent names that would silently rename the user's account).
  const issues = useMemo(
    () => computeImportIssues(rows as ReviewRow[], accounts),
    [rows, accounts],
  );
  const blocking = hasBlockingErrors(issues);

  // Totals reflect what will ACTUALLY POST to the journal — not just what
  // the user has selected. Unmapped rows (no mappedAccountId) get silently
  // filtered by ImportTB.buildOpeningEntry; previously their amounts were
  // counted in the review totals, so a balanced upload looked balanced even
  // though dropping unmapped rows would leave the post out of balance.
  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    let willPost = 0;
    let selected = 0;
    let unmapped = 0;
    let newAccounts = 0;
    for (const r of rows) {
      if ((r as ReviewRow)._include === false) continue;
      selected += 1;
      if (!r.mappedAccountId) {
        unmapped += 1;
        continue; // Don't count unmapped amounts — they won't post.
      }
      willPost += 1;
      debit += Number(r.debit) || 0;
      credit += Number(r.credit) || 0;
      if (r.mappedAccountId.startsWith('NEW:')) newAccounts += 1;
    }
    return { debit, credit, willPost, selected, unmapped, newAccounts };
  }, [rows]);

  const [showConfirm, setShowConfirm] = useState(false);

  const updateRow = (idx: number, patch: Partial<ReviewRow>) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onUpdate(next);
  };

  const handleConfirmNewAccount = (idx: number, spec: NewAccountSpec) => {
    updateRow(idx, {
      mappedAccountId: `NEW:${spec.code}:${spec.name}`,
      _newAccountSpec: spec,
    });
    setModalRowIndex(-1);
  };

  const hasRejectedRows =
    rejectedRows != null &&
    rejectedRows.length > 0 &&
    onRejectedRowUpdate != null &&
    onRejectedRowReparse != null &&
    onIncludeAllSubtotals != null &&
    onApplyToSimilar != null;

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
            onClick={() => setShowConfirm(true)}
            className={cn(
              'px-4 py-2 rounded text-sm text-white',
              blocking ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700',
            )}
            data-testid="accept-import"
            title={blocking ? 'Resolve the errors above before posting (or click to post anyway)' : undefined}
          >
            {blocking ? 'Accept import (with errors)' : 'Accept import'}
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

      <ImportIssuesPanel issues={issues} />

      {/* Phase 7: tolerant-parse banner */}
      {(tolerantParseCount ?? 0) > 0 && (
        <div
          data-testid="tolerant-parse-banner"
          className="bg-blue-50 border border-blue-100 p-2 text-xs mb-2 flex items-center gap-2"
        >
          <span>Tolerantly parsed currency in {tolerantParseCount} cells</span>
          {(lowConfidenceParseCount ?? 0) > 0 && (
            <AnomalyBadge
              severity="warn"
              message={`${lowConfidenceParseCount} cells low confidence`}
            />
          )}
        </div>
      )}

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
              const isPendingNew = !!r.mappedAccountId?.startsWith('NEW:');
              const conf = r.confidence ?? 0;
              const status = isPendingNew
                ? 'create'
                : matched && conf >= HIGH_CONFIDENCE_THRESHOLD
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
                        status === 'create' && 'bg-blue-100 text-blue-800',
                        status === 'review' && 'bg-amber-100 text-amber-800',
                        status === 'nomatch' && 'bg-red-100 text-red-800',
                      )}
                      data-testid={`status-${idx}`}
                    >
                      {status === 'auto' && 'Auto-matched'}
                      {status === 'create' && 'Will create new account'}
                      {status === 'review' && 'Review'}
                      {status === 'nomatch' && 'No match'}
                    </span>
                    {matched && (
                      <div className="text-xs mt-1">
                        → {matched.code} {matched.name}
                      </div>
                    )}
                    {(r as ReviewRow)._nameDivergence && matched && (
                      <div
                        className="mt-2 text-xs bg-rose-50 border border-rose-200 text-rose-900 rounded p-2"
                        data-testid={`name-divergence-${idx}`}
                      >
                        <div className="font-semibold mb-1">
                          Code matches but the names don't.
                        </div>
                        <div className="leading-snug">
                          Your TB row{' '}
                          <span className="font-mono">
                            {r.externalCode} {r.externalName}
                          </span>{' '}
                          will post under the existing account{' '}
                          <span className="font-mono">
                            {matched.code} {matched.name}
                          </span>
                          . If that's not the same account, click "Create new account"
                          below to keep your imported name.
                        </div>
                      </div>
                    )}
                    {isPendingNew && (
                      <div className="text-xs mt-1 text-blue-700" data-testid={`pending-new-${idx}`}>
                        → {(r as ReviewRow)._newAccountSpec?.code ?? r.externalCode}{' '}
                        {(r as ReviewRow)._newAccountSpec?.name ?? r.externalName} (new)
                        {(r as ReviewRow)._newAccountSpec?.type && (
                          <span className="ml-1 text-[10px] uppercase text-blue-500">
                            {(r as ReviewRow)._newAccountSpec!.type}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            updateRow(idx, {
                              mappedAccountId: undefined,
                              _newAccountSpec: undefined,
                            })
                          }
                          className="ml-2 underline text-blue-700"
                          data-testid={`undo-create-${idx}`}
                        >
                          undo
                        </button>
                      </div>
                    )}
                    {status !== 'auto' && status !== 'create' && (
                      <div className="mt-2 flex flex-wrap gap-2 items-center">
                        <AccountPicker
                          accounts={accounts}
                          value={r.mappedAccountId}
                          onChange={(id) =>
                            updateRow(idx, { mappedAccountId: id })
                          }
                          ariaLabel={`pick-account-${idx}`}
                          testIdPrefix={`pick-account-${idx}`}
                        />
                        <button
                          type="button"
                          onClick={() => setModalRowIndex(idx)}
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
                      step="0.01"
                      value={Number.isFinite(r.debit) ? r.debit : 0}
                      onChange={(e) => {
                        const raw = e.target.value;
                        // Empty cell → explicit 0. Non-numeric → reject the
                        // edit (NaN would silently coerce to 0 in the TB
                        // rollup, hiding the typo from the user).
                        if (raw === '') {
                          updateRow(idx, { debit: 0 });
                          return;
                        }
                        const parsed = Number(raw);
                        if (!Number.isFinite(parsed)) return;
                        updateRow(idx, { debit: parsed });
                      }}
                      className="w-24 border rounded px-1 py-1 text-right text-xs"
                      aria-label={`debit-${idx}`}
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={Number.isFinite(r.credit) ? r.credit : 0}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          updateRow(idx, { credit: 0 });
                          return;
                        }
                        const parsed = Number(raw);
                        if (!Number.isFinite(parsed)) return;
                        updateRow(idx, { credit: parsed });
                      }}
                      className="w-24 border rounded px-1 py-1 text-right text-xs"
                      aria-label={`credit-${idx}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--ink)] font-bold text-xs">
              <td className="py-2 px-2 text-right" colSpan={3}>
                Totals to post ({totals.willPost} row{totals.willPost === 1 ? '' : 's'})
              </td>
              <td className="py-2 px-2 text-right font-mono" data-testid="review-total-debit">
                {totals.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="py-2 px-2 text-right font-mono" data-testid="review-total-credit">
                {totals.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
            <tr className="text-[10px] text-gray-500">
              <td className="py-1 px-2 text-right" colSpan={3}>
                Difference
              </td>
              <td colSpan={2} className="py-1 px-2 text-right font-mono" data-testid="review-total-diff">
                {Math.abs(totals.debit - totals.credit) < 0.005
                  ? 'Balanced'
                  : `Out by ${Math.abs(totals.debit - totals.credit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </td>
            </tr>
            {totals.unmapped > 0 && (
              <tr className="text-[10px] text-amber-700 bg-amber-50">
                <td colSpan={5} className="py-1 px-2 text-right" data-testid="review-unmapped-warning">
                  {totals.unmapped} unmapped row{totals.unmapped === 1 ? '' : 's'} excluded from totals —
                  they will be dropped unless mapped to an account or marked "Create new account".
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Phase 7: Rejected Rows Panel — inline below accepted rows */}
      {hasRejectedRows && (
        <RejectedRowsPanel
          rejectedRows={rejectedRows!}
          onUpdate={onRejectedRowUpdate!}
          onReparse={onRejectedRowReparse!}
          onIncludeAllSubtotals={onIncludeAllSubtotals!}
          onApplyToSimilar={onApplyToSimilar!}
        />
      )}

      {modalRowIndex >= 0 && rows[modalRowIndex] && (
        <NewAccountModal
          initialCode={rows[modalRowIndex].externalCode || ''}
          initialName={rows[modalRowIndex].externalName || ''}
          existingAccounts={accounts}
          // Task 11: pass codes already reserved by OTHER pending NEW:
          // rows in this import so the modal can block a second mint
          // of the same code in the same accept-import flow.
          reservedCodes={rows.flatMap((r, i) =>
            i !== modalRowIndex && (r as ReviewRow)._newAccountSpec
              ? [(r as ReviewRow)._newAccountSpec!.code]
              : [],
          )}
          onConfirm={(spec) => handleConfirmNewAccount(modalRowIndex, spec)}
          onCancel={() => setModalRowIndex(-1)}
        />
      )}

      {showConfirm && (
        <ImportConfirmDialog
          includedCount={totals.willPost}
          unmappedDropCount={totals.unmapped}
          newAccountsCount={totals.newAccounts}
          totalDebit={totals.debit}
          totalCredit={totals.credit}
          issues={issues}
          onConfirm={() => {
            setShowConfirm(false);
            onAccept();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </section>
  );
};
