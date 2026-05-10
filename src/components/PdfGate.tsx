/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { cn } from '../lib/utils';

export interface PdfGateProps {
  /** Called only after user has ticked the confirmation checkbox AND clicks the action button. */
  onConfirmed: () => void;
  /** Label for the action button. Defaults to 'Download Working Paper'. */
  actionLabel?: string;
  /** Whether the action is currently processing (disables the button regardless of confirmation). */
  isLoading?: boolean;
  className?: string;
}

export function PdfGate({
  onConfirmed,
  actionLabel = 'Download Working Paper',
  isLoading = false,
  className,
}: PdfGateProps) {
  const [confirmed, setConfirmed] = useState(false);
  const disabled = !confirmed || isLoading;

  return (
    <div className={cn('border border-[var(--line)] p-4 bg-amber-50/50', className)}>
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[var(--ink)]"
        />
        <span className="text-sm text-gray-700">
          I confirm I have reviewed these figures and understand this is a working paper, not
          lodged advice.
        </span>
      </label>

      <div className="mt-3 flex justify-end">
        <button
          onClick={() => {
            if (!disabled) onConfirmed();
          }}
          disabled={disabled}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-opacity',
            !disabled
              ? 'bg-[var(--ink)] text-white hover:opacity-90'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed',
          )}
          aria-disabled={disabled}
        >
          {isLoading ? 'Generating...' : actionLabel}
        </button>
      </div>
    </div>
  );
}
