/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AiGateNote — visible inline note when AI features are unavailable.
 * DEP-01: AI features are visibly gated with a clear affordance when disabled.
 * Uses isAiEnabled() function only — IS_AI_ENABLED constant is @deprecated.
 *
 * Branches on isHostedMode() so the hosted Vercel build doesn't tell users
 * to configure a local server that doesn't apply to them. AI on the hosted
 * version is deferred to a future milestone; the self-hosted Express server
 * is the only AI affordance until then.
 */

import React from 'react';
import { isAiEnabled } from '../lib/ai';
import { isHostedMode } from '../lib/env';

export function AiGateNote(): React.JSX.Element | null {
  if (isAiEnabled()) return null;
  if (isHostedMode()) {
    return (
      <p
        className="text-xs text-gray-500 italic mt-1"
        data-testid="ai-gate-note"
      >
        AI suggestions disabled. Gemini API key support is not available on the
        hosted version (optional). Clone the repo to self-host with AI enabled.
      </p>
    );
  }
  return (
    <p
      className="text-xs text-gray-500 italic mt-1"
      data-testid="ai-gate-note"
    >
      AI suggestions disabled. Set <code>GEMINI_API_KEY</code> on the
      self-hosted Express server to enable (optional).
    </p>
  );
}
