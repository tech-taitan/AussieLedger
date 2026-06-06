/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ImportIssuesPanel — pre-import health check rendered at the top of
 * ImportReviewPane. Lists every issue computed by validateReview so
 * users see what's wrong (and what WILL happen) before they hit Accept.
 *
 * Severities visualised:
 *   - error   → rose banner with AlertCircle
 *   - warning → amber banner with AlertTriangle
 *   - info    → blue  banner with Info
 *
 * Zero-issue case renders a small green "All checks passed" affordance
 * so users know the panel was evaluated.
 */
import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import type { ImportIssue, ImportIssueSeverity } from '../lib/import/validateReview';

interface ImportIssuesPanelProps {
  issues: ImportIssue[];
}

const STYLE_BY_SEVERITY: Record<
  ImportIssueSeverity,
  { container: string; icon: React.ReactElement }
> = {
  error: {
    container: 'bg-rose-50 border-rose-200 text-rose-800',
    icon: <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />,
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />,
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: <Info size={16} className="shrink-0 mt-0.5" aria-hidden="true" />,
  },
};

export const ImportIssuesPanel: React.FC<ImportIssuesPanelProps> = ({ issues }) => {
  if (issues.length === 0) {
    return (
      <div
        data-testid="import-issues-panel-ok"
        className="bg-green-50 border border-green-200 text-green-800 text-xs p-2 mb-3 flex items-center gap-2 rounded"
      >
        <CheckCircle2 size={14} aria-hidden="true" />
        <span>Pre-import check: ready to post.</span>
      </div>
    );
  }

  // Surface counts in the heading so the user knows at a glance.
  const counts = issues.reduce(
    (acc, i) => {
      acc[i.severity] += 1;
      return acc;
    },
    { error: 0, warning: 0, info: 0 } as Record<ImportIssueSeverity, number>,
  );

  return (
    <div data-testid="import-issues-panel" className="mb-3 space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
        Pre-import check
        <span className="ml-2 normal-case font-medium text-gray-500">
          {counts.error > 0 && (
            <span className="text-rose-700 mr-2">{counts.error} {counts.error === 1 ? 'error' : 'errors'}</span>
          )}
          {counts.warning > 0 && (
            <span className="text-amber-700 mr-2">{counts.warning} {counts.warning === 1 ? 'warning' : 'warnings'}</span>
          )}
          {counts.info > 0 && (
            <span className="text-blue-700">{counts.info} info</span>
          )}
        </span>
      </h4>
      {issues.map((issue, idx) => {
        const style = STYLE_BY_SEVERITY[issue.severity];
        return (
          <div
            key={`${issue.kind}-${idx}`}
            data-testid={`import-issue-${issue.severity}`}
            data-issue-kind={issue.kind}
            className={cn(
              'flex items-start gap-2 text-xs p-2 border rounded',
              style.container,
            )}
          >
            {style.icon}
            <span>{issue.message}</span>
          </div>
        );
      })}
    </div>
  );
};
