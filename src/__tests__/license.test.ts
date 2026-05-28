/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('LICENSE (DEP-04)', () => {
  const repoRoot = resolve(__dirname, '../..');

  it('file exists at repo root and is > 10000 bytes', () => {
    const content = readFileSync(resolve(repoRoot, 'LICENSE'), 'utf8');
    expect(content.length).toBeGreaterThan(10000);
  });

  it('contains the Apache License header', () => {
    const content = readFileSync(resolve(repoRoot, 'LICENSE'), 'utf8');
    expect(content).toContain('Apache License');
    expect(content).toContain('Version 2.0');
  });

  it('package.json declares license: Apache-2.0', () => {
    const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as Record<string, unknown>;
    expect(pkg.license).toBe('Apache-2.0');
  });
});
