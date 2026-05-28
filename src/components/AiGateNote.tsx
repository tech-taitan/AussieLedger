/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AiGateNote — visible inline note when AI features are unavailable.
 * DEP-01: AI features are visibly gated with a clear affordance when disabled.
 * Uses isAiEnabled() function only — IS_AI_ENABLED constant is @deprecated.
 */

import React from 'react';
import { isAiEnabled } from '../lib/ai';

export function AiGateNote(): React.JSX.Element | null {
  if (isAiEnabled()) return null;
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
