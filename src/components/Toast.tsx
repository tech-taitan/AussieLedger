/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Toast — lightweight transient-feedback primitive (Phase 9 UX-06 + FND-10/11/12 + Phase 11 IDB-03).
 *
 * Phase 11 v1.2 widening: optional `actions` ReactNode slot to support the
 * backup-nag's "Export now" + "Snooze 7 days" buttons. Justified by
 * ARCHITECTURE.md §5 explicit recommendation. The default click-to-dismiss
 * behaviour stays on the message body; action clicks bubble through
 * stopPropagation so they don't auto-dismiss the toast.
 * Do not widen further (e.g. icons, multi-line, modals) without a CONTEXT.md decision.
 */
import React, { useEffect } from 'react';

export interface ToastProps {
  message: string;
  duration?: number;     // default 3000ms
  onDismiss: () => void;
  tone?: 'info' | 'warn'; // default 'info'
  /**
   * Phase 11 — optional action buttons rendered below the message. Click
   * propagation is stopped so action clicks don't dismiss the toast.
   * Caller owns the buttons' onClick handlers + any post-click dismissal.
   */
  actions?: React.ReactNode;
}

export const Toast: React.FC<ToastProps> = ({ message, duration = 3000, onDismiss, tone = 'info', actions }) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  const toneClass = tone === 'warn' ? 'bg-amber-600' : 'bg-[var(--ink)]';

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ${toneClass} text-white px-4 py-2 text-sm font-medium shadow-lg`}
      role="status"
      data-testid="toast"
    >
      <div onClick={onDismiss} className="cursor-pointer" data-testid="toast-message">
        {message}
      </div>
      {actions && (
        <div
          className="mt-2 flex gap-2"
          data-testid="toast-actions"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </div>
  );
};
