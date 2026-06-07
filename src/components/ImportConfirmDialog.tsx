/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ImportConfirmDialog — final confirmation modal shown when the user
 * clicks "Accept import" in ImportReviewPane. Surfaces the post summary
 * (row count, totals, balance flag, new-account count) so the user has
 * one last chance to back out before journals are written.
 */
import React from 'react';
import type { ImportIssue } from '../lib/import/validateReview';

interface ImportConfirmDialogProps {
  includedCount: number;
  /** Rows that will be dropped because they have no mappedAccountId. Surfaced
   *  prominently so the user knows the post will lose data unless they go
   *  back and map them. */
  unmappedDropCount?: number;
  newAccountsCount: number;
  totalDebit: number;
  totalCredit: number;
  issues: ImportIssue[];
  onConfirm: () => void;
  onCancel: () => void;
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const ImportConfirmDialog: React.FC<ImportConfirmDialogProps> = ({
  includedCount,
  unmappedDropCount = 0,
  newAccountsCount,
  totalDebit,
  totalCredit,
  issues,
  onConfirm,
  onCancel,
}) => {
  const diff = Math.abs(totalDebit - totalCredit);
  const isBalanced = diff < 0.005;
  const hasErrors = issues.some((i) => i.severity === 'error');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm import"
      data-testid="import-confirm-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="bg-white border border-[var(--line-strong)] shadow-xl rounded-md w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-bold text-[var(--ink)]">Confirm import</h3>
        <p className="text-xs text-gray-500">
          Review the totals below. This will post one opening-balances journal
          and (if any new accounts are tagged) add them to the Chart of
          Accounts. You can reverse it later via Reverse and Re-post.
        </p>

        <dl className="bg-gray-50 border border-[var(--line)] p-3 text-sm space-y-2">
          <div className="flex justify-between">
            <dt className="text-gray-500">Rows to post</dt>
            <dd className="font-medium" data-testid="confirm-included">{includedCount}</dd>
          </div>
          {unmappedDropCount > 0 && (
            <div className="flex justify-between text-amber-700">
              <dt>Unmapped rows dropped</dt>
              <dd className="font-medium" data-testid="confirm-unmapped-dropped">{unmappedDropCount}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-500">New accounts to create</dt>
            <dd className="font-medium" data-testid="confirm-new-accounts">{newAccountsCount}</dd>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <dt className="text-gray-500">Total debits</dt>
            <dd className="font-mono" data-testid="confirm-total-debit">${fmt(totalDebit)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Total credits</dt>
            <dd className="font-mono" data-testid="confirm-total-credit">${fmt(totalCredit)}</dd>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <dt className="text-gray-500">Balance status</dt>
            <dd
              className={
                isBalanced
                  ? 'font-semibold text-green-700'
                  : 'font-semibold text-rose-700'
              }
              data-testid="confirm-balance-status"
            >
              {isBalanced
                ? 'Balanced'
                : `Out of balance by $${fmt(diff)}`}
            </dd>
          </div>
        </dl>

        {hasErrors && (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded">
            The pre-import check flagged {issues.filter((i) => i.severity === 'error').length} error
            {issues.filter((i) => i.severity === 'error').length === 1 ? '' : 's'}.
            Resolve these before posting so every selected TB row is transferred.
          </p>
        )}

        <div className="flex gap-2 justify-end pt-2 border-t border-[var(--line)]">
          <button
            type="button"
            onClick={onCancel}
            data-testid="confirm-cancel"
            className="px-4 py-2 border border-[var(--line)] text-sm font-medium hover:bg-gray-50 rounded"
          >
            Back to review
          </button>
          <button
            type="button"
            onClick={hasErrors ? undefined : onConfirm}
            disabled={hasErrors}
            aria-disabled={hasErrors}
            data-testid="confirm-post"
            className={
              hasErrors
                ? 'px-4 py-2 bg-gray-300 text-gray-600 text-sm font-semibold rounded cursor-not-allowed'
                : 'px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded hover:bg-green-800'
            }
          >
            {hasErrors ? 'Resolve errors first' : 'Post journal'}
          </button>
        </div>
      </div>
    </div>
  );
};
