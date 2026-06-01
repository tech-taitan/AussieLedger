/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AiGateNote — visible inline note when AI features are unavailable.
 * DEP-01: AI features are visibly gated with a clear affordance when disabled.
 * Uses isAiEnabled() function only — IS_AI_ENABLED constant is @deprecated.
 *
 * Branches on isHostedMode() so the hosted Vercel build doesn't tell users
 * to edit a .env.local file that doesn't apply to them. AI on the hosted
 * version is deferred to a future milestone (v5); the self-host path
 * (clone + GEMINI_API_KEY in .env.local) is the only AI affordance until then.
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
        AI suggestions disabled — Gemini API key support is not available on the
        hosted version (optional). Clone the repo to self-host with AI enabled.
      </p>
    );
  }
  return (
    <p
      className="text-xs text-gray-500 italic mt-1"
      data-testid="ai-gate-note"
    >
      AI suggestions disabled — add a Gemini API key to{' '}
      <code>.env.local</code> to enable (optional).
    </p>
  );
}
