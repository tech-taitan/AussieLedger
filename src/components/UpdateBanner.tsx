/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 13 PWA-01 — UpdateBanner.
 *
 * Top-of-app banner that fires when vite-plugin-pwa's registerSW
 * onNeedRefresh callback signals a new service worker is waiting. Copy is
 * VERBATIM-locked from 13-CONTEXT.md; do NOT word-smith.
 *
 * Positioning: fixed top-0 left-0 right-0 z-50 floats above MainLayout
 * chrome WITHOUT requiring a MainLayout shape change (which would risk
 * disturbing layout-shell tests). Banner is rare — only visible after a
 * new build deploys; user updates or snoozes; per-session snooze key
 * means at most one re-fire per session.
 *
 * Update action: triggerUpdate() → vite-plugin-pwa updateSW(true) →
 * SKIP_WAITING postMessage to the waiting SW → controllerchange event →
 * window.location.reload. If the user has unsaved IDB writes, Phase 11's
 * beforeunload guard fires the native "are you sure?" dialog FIRST —
 * giving them a chance to export before the reload.
 *
 * Later action: snooze() → sessionStorage 'aussieledger:pwa-update-snoozed'
 * = 'true'. Banner re-fires on next browser session if SW still has a
 * pending update.
 */
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useUpdateBanner } from '../hooks/useUpdateBanner';

export const UpdateBanner: React.FC = () => {
  const { visible, triggerUpdate, snooze } = useUpdateBanner();

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 bg-stone-50 border-b border-stone-300 text-stone-700 px-4 py-2 text-sm shadow-sm"
      data-testid="update-banner"
    >
      <RefreshCw size={18} className="shrink-0" />
      <div className="flex-1">
        A new version of AussieLedger is available.
      </div>
      <button
        onClick={triggerUpdate}
        className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
        data-testid="update-banner-update"
      >
        Update
      </button>
      <button
        onClick={snooze}
        className="px-3 py-1 text-stone-700 text-xs font-medium underline hover:text-stone-900"
        data-testid="update-banner-later"
      >
        Later
      </button>
    </div>
  );
};
