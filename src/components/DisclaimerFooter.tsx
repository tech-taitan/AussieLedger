/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface DisclaimerFooterProps {
  className?: string;
}

/**
 * Persistent compliance footer mounted on every view.
 * Copy is locked verbatim per .planning/phases/01-safety-net/01-CONTEXT.md.
 * Do not paraphrase, abbreviate, or substitute.
 *
 * Phase 14 Plan 14-2 Task 4 — widened with a /privacy sibling link via
 * flex justify-between. The disclaimer span text is byte-identical to the
 * Phase 01 lock; the privacy link is a structural addition only.
 */
export function DisclaimerFooter({ className }: DisclaimerFooterProps) {
  return (
    <footer
      className={cn(
        'border-t border-[var(--line)] bg-gray-50/80 px-4 py-2',
        'flex items-start justify-between gap-4 text-[11px] text-gray-500 leading-snug',
        className,
      )}
      role="contentinfo"
      aria-label="Compliance disclaimer"
    >
      <div className="flex items-start gap-2 flex-1">
        <Info size={13} className="mt-0.5 flex-shrink-0 text-gray-400" />
        <span>
          This output is a draft working paper, not tax advice. Verify all figures against your
          source records before lodging. AussieLedger is not a tax agent and does not lodge returns
          with the ATO.
        </span>
      </div>
      <a
        href="/privacy"
        className="text-gray-500 underline hover:text-gray-700 flex-shrink-0 mt-0.5"
        data-testid="disclaimer-privacy-link"
      >
        Privacy
      </a>
    </footer>
  );
}
