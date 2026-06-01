/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 13 PWA-01 — locks the CONTEXT-locked manifest values against drift.
 * Reads dist/manifest.webmanifest after vite-plugin-pwa emission.
 *
 * Skip-mode: if dist/manifest.webmanifest does not exist (developer ran
 * `npm test` without `npm run build` first), the suite skips with a console
 * warning. CI runs `npm run build` before `npm test` so on CI the artifact
 * exists and assertions run.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const MANIFEST_PATH = 'dist/manifest.webmanifest';
const hasManifest = existsSync(MANIFEST_PATH);

describe.skipIf(!hasManifest)('PWA manifest contract (dist/manifest.webmanifest)', () => {
  const manifest = hasManifest
    ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
    : {};

  it('name === "AussieLedger"', () => {
    expect(manifest.name).toBe('AussieLedger');
  });

  it('short_name === "AussieLedger"', () => {
    expect(manifest.short_name).toBe('AussieLedger');
  });

  it('description matches locked verbatim CONTEXT string', () => {
    expect(manifest.description).toBe(
      'Free Australian bookkeeping → tax return tool. Your data stays in your browser.'
    );
  });

  it('theme_color === "#141414" (--ink)', () => {
    expect(manifest.theme_color).toBe('#141414');
  });

  it('background_color === "#E4E3E0" (--bg paper-warm)', () => {
    expect(manifest.background_color).toBe('#E4E3E0');
  });

  it('display === "standalone"', () => {
    expect(manifest.display).toBe('standalone');
  });

  it('start_url === "/"', () => {
    expect(manifest.start_url).toBe('/');
  });

  it('categories deep-equals ["finance", "productivity"]', () => {
    expect(manifest.categories).toEqual(['finance', 'productivity']);
  });

  it('icons has 4 entries: 192/512 standard + 192/512 maskable', () => {
    expect(manifest.icons).toHaveLength(4);
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes.filter((s: string) => s === '192x192')).toHaveLength(2);
    expect(sizes.filter((s: string) => s === '512x512')).toHaveLength(2);
    const purposes = manifest.icons
      .map((i: { purpose?: string }) => i.purpose)
      .filter((p: string | undefined) => p === 'maskable');
    expect(purposes).toHaveLength(2);
    manifest.icons.forEach((icon: { type: string }) => {
      expect(icon.type).toBe('image/png');
    });
  });
});

if (!hasManifest) {
  // eslint-disable-next-line no-console
  console.warn(
    'pwa-manifest.test.ts: dist/manifest.webmanifest not found — skipping suite. Run `npm run build` first to validate the manifest contract.'
  );
}
