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
 * Build-time fallback for local-mode (no server in this install).
 * vite.config.ts injects process.env.GEMINI_API_KEY via the define block,
 * so this read is replaced with the literal value at build time.
 * 'MY_GEMINI_API_KEY' (the .env.example placeholder) = "not configured".
 */
function buildTimeKeyConfigured(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  );
}

/**
 * Runtime AI availability gate. Widened in Phase 3 to be runtime-aware.
 *
 * - server mode: reads from /api/health.aiEnabled (the server holds the key)
 * - local mode: falls back to build-time env-injected key (Phase 2 behaviour)
 *
 * Components MUST call this as a function, not import a constant.
 */
export function isAiEnabled(): boolean {
  if (getAdapterKind() === 'server') {
    return Boolean(getCachedHealth()?.aiEnabled);
  }
  return buildTimeKeyConfigured();
}

/**
 * @deprecated Use `isAiEnabled()` instead. Retained for backwards
 * compatibility; resolves at module-load to the local-mode value.
 * Will be removed once all call sites migrate to the function form.
 */
export const IS_AI_ENABLED: boolean = buildTimeKeyConfigured();
