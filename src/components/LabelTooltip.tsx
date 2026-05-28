/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LabelTooltip — accessible hover tooltip for ATO label help text.
 *
 * - Screen: renders a "?" button that triggers a Radix tooltip on hover/focus.
 * - Print: renders an always-visible inline subtitle using .print-only.
 *
 * IMPORTANT: Do NOT use asChild on Tooltip.Content (React 19 throws).
 * Tooltip.Trigger MAY use asChild (used here for the button).
 */

import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface LabelTooltipProps {
  helpText: string;
  labelCode: string;
}

export function LabelTooltip({
  helpText,
  labelCode,
}: LabelTooltipProps): React.JSX.Element {
  return (
    <>
      {/* Screen: hover tooltip */}
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type="button"
              aria-label={`Help for ${labelCode}`}
              data-testid="label-tooltip-trigger"
              className="no-print inline-flex items-center justify-center w-4 h-4 ml-1 rounded-full text-xs text-gray-400 border border-gray-300 hover:text-gray-700 hover:border-gray-500"
            >
              ?
            </button>
          </Tooltip.Trigger>
          {/* NOTE: do NOT use asChild on Tooltip.Content (React 19 throws) */}
          <Tooltip.Content
            className="z-50 max-w-xs p-2 text-xs bg-white border border-gray-200 shadow-lg rounded"
            sideOffset={4}
          >
            {helpText}
            <Tooltip.Arrow className="fill-white" />
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>

      {/* Print: always-expanded inline subtitle */}
      <span className="print-only label-help-text block text-xs text-gray-500 italic mt-0.5">
        {helpText}
      </span>
    </>
  );
}
