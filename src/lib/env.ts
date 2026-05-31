/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Build-flag helpers — single source of truth for VITE_HOSTED_MODE.
 *
 * VITE_HOSTED_MODE is a build-time STRING signal (shell env vars are strings):
 *   - 'true'  → app was built by the project CI pipeline (.github/workflows/ci.yml).
 *               This covers BOTH production deploys (push to main → aussieledger.pages.dev)
 *               AND PR preview deploys (pull_request → pr-{N}.aussieledger.pages.dev).
 *               Every CI-built artifact runs in hosted mode, by design — PR previews
 *               MUST exercise the hosted-mode code paths so reviewers can verify them
 *               before merge. Both deploys lack an Express server.
 *   - unset / 'false' / anything else → app is running self-hosted (`npm run dev`,
 *               `npm run dev:full`, or a local `npm run build && npm run preview` without
 *               VITE_HOSTED_MODE in the build env). Express server may or may not be
 *               present; the StorageAdapter probe decides at runtime.
 *
 * Consumed by Phase 12 (AiGateNote hosted-mode link), Phase 13 (PWA registration gate),
 * and Phase 14 (iOS Safari banner + /demo route guard). This module is the ONLY place
 * that reads `import.meta.env.VITE_HOSTED_MODE` — downstream code calls isHostedMode().
 *
 * VITE_HOSTED_MODE is the ONLY new VITE_-prefixed env var allowed in this project:
 * it is a mode flag, not a secret. Secrets MUST NEVER be VITE_-prefixed (see PITFALLS.md
 * §1 — VITE_ env-leak hard-block). The existing process.env.GEMINI_API_KEY pattern in
 * vite.config.ts is the secret-safe path for server-assisted builds.
 */

/**
 * True when the app is running on the public hosted build (Cloudflare Pages).
 * Strict string-'true' check — defensive against boolean/non-string values.
 */
export function isHostedMode(): boolean {
  return import.meta.env.VITE_HOSTED_MODE === 'true';
}
