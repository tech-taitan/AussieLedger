/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 13 PWA-01 — vite-plugin-pwa configuration, extracted into its own
 * module so that src/__tests__/pwa-config.test.ts can import the object
 * WITHOUT pulling in the full vite.config.ts (which transitively imports
 * vite/esbuild — incompatible with the jsdom test environment due to
 * esbuild's native TextEncoder invariant check).
 *
 * Single source of truth: vite.config.ts imports `pwaOptions` from this file
 * and passes it to VitePWA(); the test imports `pwaOptions` from this file
 * and asserts the locked shape. Per plan-checker R-2 hardening — replaces
 * three brittle grep-counts-lines guards (skipWaiting/clientsClaim/
 * cleanupOutdatedCaches + registerType + devOptions.enabled) with one
 * structural test that catches duplicate/commented-out drift the greps missed.
 *
 * Locked invariants (PITFALLS §3 HARDBLOCK + Pitfall #12):
 *   - workbox.skipWaiting + clientsClaim + cleanupOutdatedCaches ALL true
 *   - registerType: 'prompt' (NOT 'autoUpdate' — never force-reload mid-form)
 *   - devOptions.enabled: false (SW MUST NOT register in `npm run dev`)
 *   - injectRegister: false (Plan 13-2 useUpdateBanner controls registerSW)
 */
import type { VitePWAOptions } from 'vite-plugin-pwa';

export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: 'prompt',
  strategies: 'generateSW',
  injectRegister: false,
  devOptions: { enabled: false },
  includeAssets: ['apple-touch-icon.png'],
  workbox: {
    // PITFALLS §3 HARDBLOCK: all three required to prevent stale-cache
    // stranding users on old bundles after a deploy.
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    globPatterns: ['**/*.{js,css,html,svg,png,woff2,ico}'],
    navigateFallback: '/index.html',
    // Defensive: never let SW intercept /api/* (dev-only proxy concern;
    // harmless in production where /api routes 404 in hosted mode).
    navigateFallbackDenylist: [/^\/api\//],
  },
  manifest: {
    // CONTEXT-locked verbatim values; do NOT word-smith.
    name: 'AussieLedger',
    short_name: 'AussieLedger',
    description: 'Free Australian bookkeeping → tax return tool. Your data stays in your browser.',
    theme_color: '#141414',       // --ink
    background_color: '#E4E3E0',  // --bg paper-warm
    display: 'standalone',
    start_url: '/',
    categories: ['finance', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
};
