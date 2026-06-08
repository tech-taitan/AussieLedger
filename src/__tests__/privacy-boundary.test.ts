/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('public hosted privacy boundary', () => {
  const repoRoot = resolve(__dirname, '../..');
  const read = (path: string) => readFileSync(resolve(repoRoot, path), 'utf8');

  it('does not inject Gemini secrets into the browser build', () => {
    expect(read('vite.config.ts')).not.toContain('process.env.GEMINI_API_KEY');
    expect(read('src/lib/ai.ts')).not.toContain('process.env.GEMINI_API_KEY');
  });

  it('does not load remote fonts or allow browser-to-Google API calls', () => {
    expect(read('src/index.css')).not.toContain('fonts.googleapis.com');
    expect(read('vercel.json')).not.toContain('generativelanguage.googleapis.com');
  });

  it('pins hosted builds to browser-only IndexedDB before server probing', () => {
    const source = read('src/storage/index.ts');
    const hostedGuard = source.indexOf('if (isHostedMode())');
    const serverProbe = source.indexOf('const health = await probeServer()');
    expect(hostedGuard).toBeGreaterThan(-1);
    expect(serverProbe).toBeGreaterThan(hostedGuard);
  });
});
