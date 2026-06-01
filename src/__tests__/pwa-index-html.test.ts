/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 13 PWA-01 — locks index.html shape:
 *   - exactly one <link rel="apple-touch-icon" href="/apple-touch-icon.png">
 *   - exactly one <meta name="theme-color" content="#141414">
 *   - NO manual <link rel="manifest"> (we rely on vite-plugin-pwa auto-injection)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('index.html PWA tags', () => {
  const html = readFileSync('index.html', 'utf8');

  it('contains exactly one apple-touch-icon link with the expected href', () => {
    const matches = html.match(
      /<link\s+rel=["']apple-touch-icon["']\s+href=["']\/apple-touch-icon\.png["']\s*\/?>/g
    );
    expect(matches).not.toBeNull();
    expect(matches).toHaveLength(1);
  });

  it('contains exactly one theme-color meta with value #141414', () => {
    const matches = html.match(
      /<meta\s+name=["']theme-color["']\s+content=["']#141414["']\s*\/?>/g
    );
    expect(matches).not.toBeNull();
    expect(matches).toHaveLength(1);
  });

  it('does NOT contain a manually-added <link rel="manifest"> tag', () => {
    // vite-plugin-pwa auto-injects this at build time; a manual entry would create a duplicate
    const matches = html.match(/<link\s+rel=["']manifest["']/g);
    expect(matches).toBeNull();
  });

  it('still has the existing <title>AussieLedger</title>', () => {
    expect(html).toContain('<title>AussieLedger</title>');
  });
});
