/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getCachedHealth, getAdapterKind } from '../storage';

/**
 * Gemini model literal. Single source of truth — imported by:
 *   - src/components/ImportTB.tsx (the SPA AI flow)
 *   - server/routes/ai.ts (uses the same literal in GEMINI_MODEL_DEFAULT;
 *     a test in this file asserts the two stay in sync)
 */
export const GEMINI_MODEL = 'gemini-3-flash-preview';

/**
 * Runtime AI availability gate. Widened in Phase 3 to be runtime-aware.
 *
 * - server mode: reads from /api/health.aiEnabled (the server holds the key)
 * - local mode: always disabled; secrets must never be bundled into the SPA
 *
 * Components MUST call this as a function, not import a constant.
 */
export function isAiEnabled(): boolean {
  return getAdapterKind() === 'server' && Boolean(getCachedHealth()?.aiEnabled);
}

/**
 * @deprecated Use `isAiEnabled()` instead. Retained for backwards
 * compatibility. Browser-only mode never enables AI.
 * Will be removed once all call sites migrate to the function form.
 */
export const IS_AI_ENABLED = false;
