/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * IS_AI_ENABLED is a BUILD-TIME constant computed once at module load.
 * vite.config.ts injects process.env.GEMINI_API_KEY via the define block, so
 * this read is replaced with the literal value at build time.
 * 'MY_GEMINI_API_KEY' (the .env.example placeholder) is treated as "not configured".
 * SECURITY: the key is bundled into the client. Acceptable only for fully-private
 * self-hosted instances. Phase 3 introduces a server-side proxy for shared deployments.
 */
export const IS_AI_ENABLED: boolean = Boolean(
  process.env.GEMINI_API_KEY &&
  process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
);
