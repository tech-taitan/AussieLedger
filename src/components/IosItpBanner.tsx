/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * IosItpBanner — Phase 11 IDB-04 iOS Safari ITP disclosure banner.
 *
 * Renders ONLY when ALL four gates pass (locked in 11-CONTEXT.md):
 *   1. isHostedMode() === true   (self-host users see their own data path; no banner)
 *   2. iOS Safari UA            (CriOS/FxiOS/EdgiOS rejected per locked regex)
 *   3. NOT standalone            (display-mode: standalone === false; PWA-installed
 *                                 users are not subject to iOS ITP's 7-day clear)
 *   4. NOT dismissed             (sessionStorage 'aussieledger:ios-itp-banner-dismissed'
 *                                 !== 'true'; per-session, cleared at session end)
 *
 * Copy is VERBATIM the locked text from 11-CONTEXT.md; do NOT word-smith.
 *
 * Mounted by DataPage (Plan 11-2 Task 3) — DataPage is the only place the banner
 * appears. The banner is NOT app-wide.
 */
import React, { useState } from 'react';
import { isHostedMode } from '../lib/env';

const ITP_BANNER_DISMISS_KEY = 'aussieledger:ios-itp-banner-dismissed';

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function isStandalone(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches === true
  );
}

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(ITP_BANNER_DISMISS_KEY) === 'true';
  } catch {
    return false;
  }
}

export const IosItpBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed());

  // Gate matrix — ALL four conditions must pass
  if (!isHostedMode()) return null;
  if (!isIosSafari()) return null;
  if (isStandalone()) return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(ITP_BANNER_DISMISS_KEY, 'true');
    } catch {
      /* ignore — sessionStorage may be unavailable in some embedded contexts */
    }
    setDismissed(true);
  };

  return (
    <div
      className="rounded-md bg-amber-50 border border-amber-200 p-3 my-3 text-sm text-amber-900"
      role="alert"
      data-testid="ios-itp-banner"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p>
            Heads up: iOS Safari may clear AussieLedger&apos;s stored data after 7 days of
            no use. Add this app to your Home Screen to keep your data safe.
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer underline">How?</summary>
            <ol className="list-decimal ml-5 mt-2 space-y-1">
              <li>Tap the Share button at the bottom of Safari (square with an up arrow).</li>
              <li>Scroll down and tap &quot;Add to Home Screen&quot;.</li>
              <li>Tap &quot;Add&quot; in the top-right corner.</li>
              <li>Launch AussieLedger from your Home Screen icon — your data will be preserved.</li>
            </ol>
          </details>
        </div>
        <button
          onClick={handleDismiss}
          className="text-amber-700 hover:text-amber-900 text-sm font-medium px-2"
          aria-label="Dismiss iOS storage banner"
          data-testid="ios-itp-banner-dismiss"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
