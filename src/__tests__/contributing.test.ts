/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('CONTRIBUTING.md (DEP-04)', () => {
  const repoRoot = resolve(__dirname, '../..');
  let content: string;

  try {
    content = readFileSync(resolve(repoRoot, 'CONTRIBUTING.md'), 'utf8');
  } catch {
    content = '';
  }

  it('file exists at repo root and is > 1000 chars', () => {
    expect(content.length).toBeGreaterThan(1000);
  });

  it('contains "Schema Migrations"', () => {
    expect(content).toContain('Schema Migrations');
  });

  it('contains "Additive only"', () => {
    expect(content).toContain('Additive only');
  });

  it('contains "round-trip"', () => {
    expect(content).toContain('round-trip');
  });

  it('contains "migration"', () => {
    expect(content).toContain('migration');
  });

  it('contains "Adding a New Financial Year"', () => {
    expect(content).toContain('Adding a New Financial Year');
  });

  it('contains "Pull Request Template"', () => {
    expect(content).toContain('Pull Request Template');
  });

  it('contains "CURRENT_VERSION"', () => {
    expect(content).toContain('CURRENT_VERSION');
  });
});
