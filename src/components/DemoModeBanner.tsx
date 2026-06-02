/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POL-02 — top-of-app banner shown on /demo.
 *
 * Reads getRouteKind() at render time. Blue tint distinguishes the demo-mode
 * banner from the neutral-stone AdapterFallbackBanner + UpdateBanner. Exit-
 * demo button triggers a full page reload to '/' which causes initAdapter()
 * to re-init against the production DB.
 *
 * On non-/demo routes the component returns null, so the layout collapses to
 * its pre-Phase-14 shape with zero DOM cost.
 *
 * Copy is CONTEXT-locked verbatim — em-dash is the canonical character.
 */

import { FlaskConical } from 'lucide-react';
import { getRouteKind } from '../lib/route';

export function DemoModeBanner() {
  if (getRouteKind() !== 'demo') return null;
  return (
    <div
      role="status"
      data-testid="demo-mode-banner"
      className="flex items-center justify-between gap-3 bg-blue-50 border-b border-blue-300 text-blue-900 px-4 py-2 text-sm"
    >
      <div className="flex items-center gap-2">
        <FlaskConical size={16} className="flex-shrink-0" />
        <span data-testid="demo-mode-copy">
          Demo Mode — playing with sample data. Your real data is safe.
        </span>
      </div>
      <button
        onClick={() => {
          window.location.href = '/';
        }}
        className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
        data-testid="demo-mode-exit"
      >
        Exit demo
      </button>
    </div>
  );
}
