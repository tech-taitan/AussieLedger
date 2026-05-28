/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import type { Anomaly } from '../lib/tax/returns/fy2026/types';

interface AnomalyBadgeProps {
  severity: Anomaly['severity'];
  message: string;
  /** Optional ATO label code; if provided, prefixes the message with "[label]". */
  label?: string;
}

/**
 * Inline badge for tax-return anomaly flags.
 * Reused across all 5 form renderers (Individual, Company, Trust, Partnership, BAS/IAS).
 *
 * warn → yellow background
 * info → blue background
 */
export function AnomalyBadge({
  severity,
  message,
  label,
}: AnomalyBadgeProps): React.JSX.Element {
  const baseClass =
    severity === 'warn'
      ? 'inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300'
      : 'inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300';

  return (
    <span className={baseClass} data-testid="anomaly-badge" data-severity={severity}>
      {label ? <span className="font-bold mr-1">[{label}]</span> : null}
      {message}
    </span>
  );
}
