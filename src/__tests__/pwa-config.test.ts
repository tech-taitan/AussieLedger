/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 13 PWA-01 — locks the vite-plugin-pwa configuration shape.
 *
 * Imports `pwaOptions` from vite.pwa-options.ts (the named-export single
 * source of truth that vite.config.ts also consumes) and asserts the
 * structural shape. Per plan-checker R-2: replaces three brittle grep-based
 * guards in the original verification block (skipWaiting / clientsClaim /
 * cleanupOutdatedCaches LINE count, registerType lookup, devOptions.enabled
 * lookup) with one hardened structural assertion that catches duplicate /
 * commented-out drift the grep guards missed.
 *
 * Covers:
 *   - PITFALLS §3 HARDBLOCK (all three stale-cache flags must be true)
 *   - Pitfall #12 (registerType MUST be 'prompt', NOT 'autoUpdate')
 *   - Phase 13 invariant (devOptions.enabled MUST be false — no SW in npm run dev)
 *   - injectRegister:false (Plan 13-2 useUpdateBanner controls registerSW)
 *   - navigateFallbackDenylist guards /api/* against SW interception
 *   - CONTEXT-locked manifest values
 *
 * Note: imports from vite.pwa-options.ts, NOT vite.config.ts directly.
 * Importing vite.config.ts transitively pulls in vite/esbuild, which fails
 * the jsdom test environment's TextEncoder polyfill invariant check.
 * vite.pwa-options.ts uses ONLY a type-only `import type` for VitePWAOptions
 * (erased at runtime) — no runtime vite-plugin-pwa import — so it's safe to
 * load in jsdom.
 */
import { describe, it, expect } from 'vitest';
import type { ManifestOptions } from 'vite-plugin-pwa';
import { pwaOptions } from '../../vite.pwa-options';

// pwaOptions.manifest is typed as `false | Partial<ManifestOptions>` (the
// vite-plugin-pwa API allows `manifest: false` to disable manifest emission
// entirely). We never use that escape hatch — narrow once for ergonomic
// asserts below. If the runtime value ever becomes `false`, the icons-length
// assertion will catch it (4 expected, 0 received).
const manifest = pwaOptions.manifest as Partial<ManifestOptions>;

describe('vite-plugin-pwa configuration (pwaOptions named export)', () => {
  describe('PITFALLS §3 HARDBLOCK — stale-cache prevention', () => {
    it('workbox.skipWaiting === true', () => {
      expect(pwaOptions.workbox?.skipWaiting).toBe(true);
    });
    it('workbox.clientsClaim === true', () => {
      expect(pwaOptions.workbox?.clientsClaim).toBe(true);
    });
    it('workbox.cleanupOutdatedCaches === true', () => {
      expect(pwaOptions.workbox?.cleanupOutdatedCaches).toBe(true);
    });
  });

  describe('Pitfall #12 — registerType lock', () => {
    it("registerType === 'prompt' (NOT 'autoUpdate' — never force-reload mid-form)", () => {
      expect(pwaOptions.registerType).toBe('prompt');
    });
  });

  describe('npm run dev SW absence lock', () => {
    it('devOptions.enabled === false (SW MUST NOT register in dev)', () => {
      expect(pwaOptions.devOptions?.enabled).toBe(false);
    });
  });

  describe('Workbox strategy + register-injection lock', () => {
    it("strategies === 'generateSW' (NOT 'injectManifest')", () => {
      expect(pwaOptions.strategies).toBe('generateSW');
    });
    it('injectRegister === false (Plan 13-2 useUpdateBanner controls registerSW)', () => {
      expect(pwaOptions.injectRegister).toBe(false);
    });
    it('workbox.globPatterns includes the locked extension list', () => {
      const patterns = pwaOptions.workbox?.globPatterns ?? [];
      expect(patterns).toContain('**/*.{js,css,html,svg,png,woff2,ico}');
    });
    it('navigateFallbackDenylist contains /^\\/api\\// regex (SW never intercepts /api/*)', () => {
      const denylist = pwaOptions.workbox?.navigateFallbackDenylist as RegExp[];
      expect(denylist).toBeDefined();
      expect(denylist).toHaveLength(1);
      expect(denylist[0].source).toBe('^\\/api\\/');
    });
  });

  describe('CONTEXT-locked manifest values', () => {
    it("manifest.name === 'AussieLedger'", () => {
      expect(manifest.name).toBe('AussieLedger');
    });
    it("manifest.short_name === 'AussieLedger'", () => {
      expect(manifest.short_name).toBe('AussieLedger');
    });
    it('manifest.description matches verbatim CONTEXT-locked string', () => {
      expect(manifest.description).toBe(
        'Free Australian bookkeeping → tax return tool. Your data stays in your browser.'
      );
    });
    it("manifest.theme_color === '#141414' (--ink)", () => {
      expect(manifest.theme_color).toBe('#141414');
    });
    it("manifest.background_color === '#E4E3E0' (--bg paper-warm)", () => {
      expect(manifest.background_color).toBe('#E4E3E0');
    });
    it("manifest.display === 'standalone'", () => {
      expect(manifest.display).toBe('standalone');
    });
    it("manifest.start_url === '/'", () => {
      expect(manifest.start_url).toBe('/');
    });
    it('manifest.icons has 4 entries (2 standard + 2 maskable)', () => {
      expect(manifest.icons).toHaveLength(4);
      const maskable = manifest.icons!.filter((i) => i.purpose === 'maskable');
      expect(maskable).toHaveLength(2);
    });
  });
});
