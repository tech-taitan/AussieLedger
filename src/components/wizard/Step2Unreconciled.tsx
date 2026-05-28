/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Step2Unreconciled — Year-End Wizard Step 2.
 * Lists draft journals. Soft warning only — never blocks Next.
 */
import React from 'react';
import type { JournalEntry } from '../../types';

interface Step2UnreconciledProps {
  entries: JournalEntry[];
  onBack: () => void;
  onNext: () => void;
}

export function Step2Unreconciled({ entries, onBack, onNext }: Step2UnreconciledProps): React.JSX.Element {
  const draftEntries = entries.filter(
    (e) => e.status === 'draft' || (!e.isPosted && e.status !== 'posted'),
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Review Unreconciled Items</h3>

      {draftEntries.length === 0 ? (
        <p className="text-sm text-green-700 font-medium">No unreconciled items.</p>
      ) : (
        <>
          <p className="text-sm text-amber-700">
            {draftEntries.length} draft journal{draftEntries.length !== 1 ? 's' : ''} found.
            These will not appear in your return. Review and post or void them.
          </p>
          <ul className="text-sm space-y-1 border border-amber-200 bg-amber-50 p-3">
            {draftEntries.map((e) => (
              <li key={e.id} className="text-gray-700">
                {e.date} — {e.reference} — {e.description}
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
