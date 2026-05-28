/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Step1Confirm — Year-End Wizard Step 1.
 * FY + entity confirmation step. Soft confirmation only — never blocks Next.
 */
import React from 'react';
import type { Entity, JournalEntry } from '../../types';

interface Step1ConfirmProps {
  entity: Entity;
  fy: string;
  entries: JournalEntry[];
  onNext: () => void;
}

export function Step1Confirm({ entity, fy, entries, onNext }: Step1ConfirmProps): React.JSX.Element {
  const draftCount = entries.filter(
    (e) => e.status === 'draft' || (!e.isPosted && e.status !== 'posted'),
  ).length;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Year-End Preparation — {entity.name} {fy}
      </h3>

      <p className="text-gray-700">
        Have you finished entering all transactions for the year?
      </p>

      <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 p-3">
        {draftCount > 0 ? (
          <span>
            <strong className="text-amber-700">{draftCount} draft journal{draftCount !== 1 ? 's' : ''} remain</strong> — review
            them before finalising.
          </span>
        ) : (
          <span>No draft journals outstanding.</span>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          data-testid="step1-confirm-yes"
          onClick={onNext}
          className="px-4 py-2 bg-[var(--ink)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Yes, continue
        </button>
        <button
          type="button"
          data-testid="step1-confirm-back"
          onClick={() => {/* no-op in v1 */}}
          className="px-4 py-2 border border-[var(--line)] text-sm font-medium hover:bg-gray-50"
        >
          Not yet — review my journals
        </button>
      </div>
    </div>
  );
}
