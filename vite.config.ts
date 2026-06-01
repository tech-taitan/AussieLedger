import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA, type VitePWAOptions } from 'vite-plugin-pwa';

/**
 * Phase 13 PWA-01 — single source of truth for vite-plugin-pwa configuration.
 *
 * Extracted as a named export (NOT inlined inside the defineConfig callback)
 * per plan-checker R-2 hardening so that src/__tests__/pwa-config.test.ts can
 * import this object and assert the locked shape directly. This replaces three
 * brittle grep-counts-lines guards with one structural test that catches
 * duplicate/commented-out drift the grep guards missed. Matches the Phase 11
 * addDaysIso / nowIso single-source-of-truth precedent (split a const out so
 * tests can import it).
 *
 * Locked invariants (PITFALLS §3 HARDBLOCK + Pitfall #12):
 *   - workbox.skipWaiting + clientsClaim + cleanupOutdatedCaches ALL true
 *   - registerType: 'prompt' (NOT 'autoUpdate' — never force-reload mid-form)
 *   - devOptions.enabled: false (SW MUST NOT register in `npm run dev`)
 *   - injectRegister: false (Plan 13-2 useUpdateBanner controls registerSW)
 */
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiTarget = env.API_PROXY_TARGET ?? 'http://localhost:4000';
  return {
    plugins: [react(), tailwindcss(), VitePWA(pwaOptions)],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        // Phase 3: forward /api/* to the Express server (dev:full).
        // When `npm run dev` runs without the server, fetch('/api/health')
        // simply 502s and the adapter probe falls back to LocalAdapter.
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          // ws: NOT enabled — Vite HMR uses its own websocket; do not intercept.
        },
      },
    },
  };
});
