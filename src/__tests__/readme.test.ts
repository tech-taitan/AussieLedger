/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('README.md (DEP-03)', () => {
  const repoRoot = resolve(__dirname, '../..');
  const content = readFileSync(resolve(repoRoot, 'README.md'), 'utf8');

  it('contains quick-start command: npm install && npm run build', () => {
    expect(content).toContain('npm install && npm run build');
  });

  it('contains "Single-user local" deployment section', () => {
    expect(content).toContain('Single-user local');
  });

  it('contains "Small-firm VPS" deployment section', () => {
    expect(content).toContain('Small-firm VPS');
  });

  it('contains "StorageAdapter" (architecture section)', () => {
    expect(content).toContain('StorageAdapter');
  });

  it('contains "owner mode" (audience section)', () => {
    expect(content).toContain('owner mode');
  });

  it('contains "agent mode" (audience section)', () => {
    expect(content).toContain('agent mode');
  });

  it('contains "Apache 2.0" (license section)', () => {
    expect(content).toContain('Apache 2.0');
  });

  it('contains the live-demo URL (POL-04)', () => {
    expect(content).toContain('https://aussieledger.techtaitan.com');
  });

  it('contains the /demo deep-link (POL-04)', () => {
    expect(content).toContain('/demo');
  });

  it('contains the /privacy deep-link (POL-04)', () => {
    expect(content).toContain('/privacy');
  });

  it('contains a Privacy section heading (POL-04)', () => {
    expect(content).toMatch(/^##\s+Privacy/m);
  });

  it('contains the v5-deferral language for AI (POL-04)', () => {
    expect(content).toContain('planned for v5');
  });

  it('contains "Try the demo" Quick Start sub-heading (POL-04)', () => {
    expect(content).toContain('Try the demo');
  });

  it('is at least 100 lines (POL-04 length sanity)', () => {
    const lineCount = content.split('\n').length;
    expect(lineCount).toBeGreaterThanOrEqual(100);
  });
});
