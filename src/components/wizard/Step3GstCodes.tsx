/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Step3GstCodes — Year-End Wizard Step 3.
 * Lists accounts where gstCode may be mismatched. Soft warning only — never blocks Next.
 */
import React from 'react';
import type { Account } from '../../types';

interface Step3GstCodesProps {
  accounts: Account[];
  onBack: () => void;
  onNext: () => void;
}

export function Step3GstCodes({ accounts, onBack, onNext }: Step3GstCodesProps): React.JSX.Element {
  // Flag Revenue/Expense accounts with missing gstCode or 'N-T' (may warrant review)
  const flaggedAccounts = accounts.filter(
    (a) =>
      (a.type === 'Revenue' || a.type === 'Expense') &&
      (!a.gstCode || a.gstCode === 'N-T'),
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Review GST Codes</h3>

      {flaggedAccounts.length === 0 ? (
        <p className="text-sm text-green-700 font-medium">All GST codes look correct.</p>
      ) : (
        <>
          <p className="text-sm text-amber-700">
            {flaggedAccounts.length} account{flaggedAccounts.length !== 1 ? 's' : ''} may need
            GST code review.
          </p>
          <ul className="text-sm space-y-1 border border-amber-200 bg-amber-50 p-3">
            {flaggedAccounts.map((a) => (
              <li key={a.id} className="text-gray-700">
                {a.code} — {a.name} (GST: {a.gstCode || 'not set'})
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-[var(--line)] text-sm font-medium hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-4 py-2 bg-[var(--ink)] text-white text-sm font-medium hover:opacity-90"
        >
          Next
        </button>
      </div>
    </div>
  );
}
