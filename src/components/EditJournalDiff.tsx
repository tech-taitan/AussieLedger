/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EditJournalDiff — side-by-side preview pane comparing an existing posted
 * JournalEntry with a proposed superseding edit. Pure presentational.
 *
 * BOOK-02 UX: "This will replace the original. The original stays in the
 * audit trail." The form caller (JournalForm) shows the banner; this
 * component shows the visual delta the user is about to commit.
 */
import React from 'react';
import type { JournalEntry, JournalLine, Account } from '../types';
import { cn } from '../lib/utils';

interface EditJournalDiffProps {
  original: JournalEntry;
  proposed: JournalEntry;
  accounts?: Account[];
}

function changedClass(a: unknown, b: unknown): string {
  return a === b ? '' : 'bg-yellow-50 font-medium';
}

function renderLine(line: JournalLine, accounts?: Account[]): string {
  const acc = accounts?.find((a) => a.id === line.accountId);
  const accLabel = acc ? `${acc.code} ${acc.name}` : line.accountId;
  const side =
    (line.debit ?? 0) > 0
      ? `D ${(line.debit ?? 0).toFixed(2)}`
      : `C ${(line.credit ?? 0).toFixed(2)}`;
  return `${accLabel} ${side} — ${line.description}`;
}

function lineChanged(a: JournalLine | undefined, b: JournalLine | undefined): boolean {
  if (!a || !b) return true;
  return (
    a.accountId !== b.accountId ||
    a.debit !== b.debit ||
    a.credit !== b.credit ||
    a.description !== b.description
  );
}

export const EditJournalDiff: React.FC<EditJournalDiffProps> = ({
  original,
  proposed,
  accounts,
}) => {
  if (original.id === proposed.id) {
    return (
      <div className="text-red-600 text-sm" data-testid="edit-journal-diff-error">
        Diff preview unavailable: supersession not detected (original and proposed share id).
      </div>
    );
  }

  const maxLines = Math.max(original.lines.length, proposed.lines.length);

  return (
    <div
      className="border border-[var(--line)] rounded p-4 mt-4 bg-white"
      data-testid="edit-journal-diff"
    >
      <h3 className="text-lg font-medium mb-3">Diff preview</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div data-testid="diff-original">
          <h4 className="font-medium mb-2">Original</h4>
          <div
            className={changedClass(original.date, proposed.date)}
            aria-label="original-date"
          >
            Date: {original.date}
          </div>
          <div
            className={changedClass(original.reference, proposed.reference)}
            aria-label="original-reference"
          >
            Ref: {original.reference}
          </div>
          <div
            className={changedClass(original.description, proposed.description)}
            aria-label="original-description"
          >
            Description: {original.description}
          </div>
          <h5 className="mt-3 mb-1 font-medium">Lines</h5>
          <ul className="list-disc pl-5">
            {Array.from({ length: maxLines }).map((_, i) => {
              const l = original.lines[i];
              if (!l) return null;
              const changed = lineChanged(l, proposed.lines[i]);
              return (
                <li
                  key={`o-${i}`}
                  className={cn(changed && 'bg-yellow-50 font-medium')}
                  data-testid={`original-line-${i}`}
                >
                  {renderLine(l, accounts)}
                </li>
              );
            })}
          </ul>
        </div>
        <div data-testid="diff-proposed">
          <h4 className="font-medium mb-2">Proposed</h4>
          <div
            className={changedClass(original.date, proposed.date)}
            aria-label="proposed-date"
          >
            Date: {proposed.date}
          </div>
          <div
            className={changedClass(original.reference, proposed.reference)}
            aria-label="proposed-reference"
          >
            Ref: {proposed.reference}
          </div>
          <div
            className={changedClass(original.description, proposed.description)}
            aria-label="proposed-description"
          >
            Description: {proposed.description}
          </div>
          <h5 className="mt-3 mb-1 font-medium">Lines</h5>
          <ul className="list-disc pl-5">
            {Array.from({ length: maxLines }).map((_, i) => {
              const l = proposed.lines[i];
              if (!l) return null;
              const changed = lineChanged(original.lines[i], l);
              return (
                <li
                  key={`p-${i}`}
                  className={cn(changed && 'bg-yellow-50 font-medium')}
                  data-testid={`proposed-line-${i}`}
                >
                  {renderLine(l, accounts)}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};
