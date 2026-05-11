/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * W5 — Adapter-fallback banner.
 *
 * Renders ONLY when the probe was attempted AND exhausted (i.e.
 * `getFellBackToLocal() === true`). On a clean local-only boot
 * (storageMode='local' override or no probe attempted) this is silent.
 *
 * Dismissal is session-state — the next page reload re-checks the flag.
 */
import React, { useEffect, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { getAdapterKind, getFellBackToLocal } from '../storage';

export const AdapterFallbackBanner: React.FC = () => {
  // Read once at mount. The flag only changes via _resetAdapter() + initAdapter(),
  // which in practice means a page reload.
  const [show, setShow] = useState<boolean>(() => {
    return getAdapterKind() === 'local' && getFellBackToLocal();
  });

  // Re-check after first paint in case the adapter init resolved later than render.
  useEffect(() => {
    if (getAdapterKind() === 'local' && getFellBackToLocal()) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 bg-amber-50 border-b border-amber-300 text-amber-900 px-4 py-2 text-sm"
      data-testid="adapter-fallback-banner"
    >
      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1">
        <strong className="font-semibold">Server unreachable</strong>
        &nbsp;— running in local mode. Refresh once the server is up.
      </div>
      <button
        onClick={() => setShow(false)}
        className="shrink-0 hover:opacity-70 transition-opacity"
        aria-label="Dismiss banner"
        data-testid="adapter-fallback-dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
};
