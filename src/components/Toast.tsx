/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Toast — lightweight transient-feedback primitive (Phase 9 UX-06 + FND-10/11/12).
 * Single-purpose: empty-CSV-export feedback + UX-06 anomaly cycle position.
 * Do NOT widen to other use cases in v1.1 — see 09-CONTEXT.md.
 */
import React, { useEffect } from 'react';

export interface ToastProps {
  message: string;
  duration?: number;     // default 3000ms
  onDismiss: () => void;
  tone?: 'info' | 'warn'; // default 'info'
}

export const Toast: React.FC<ToastProps> = ({ message, duration = 3000, onDismiss, tone = 'info' }) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  const toneClass = tone === 'warn' ? 'bg-amber-600' : 'bg-[var(--ink)]';

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ${toneClass} text-white px-4 py-2 text-sm font-medium shadow-lg cursor-pointer`}
      onClick={onDismiss}
      role="status"
      data-testid="toast"
    >
      {message}
    </div>
  );
};
