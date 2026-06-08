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

  it('contains the install + run commands somewhere (Quick Start)', () => {
    expect(content).toContain('npm install');
    expect(content).toContain('npm run build');
    expect(content).toContain('npm run dev');
  });

  it('contains a "your own computer" deployment section', () => {
    expect(content).toMatch(/own computer|Single-user local/i);
  });

  it('contains a "Small-firm" deployment section', () => {
    expect(content).toMatch(/Small-firm/);
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

  it('documents the hosted browser-only storage pin (POL-04)', () => {
    expect(content).toMatch(/browser-only (IndexedDB )?storage/);
  });

  it('contains a "Try" / demo section (POL-04)', () => {
    expect(content).toMatch(/Try (the demo|it without installing)/i);
  });

  it('is at least 100 lines (POL-04 length sanity)', () => {
    const lineCount = content.split('\n').length;
    expect(lineCount).toBeGreaterThanOrEqual(100);
  });

  it('Test A.5 README has a Business owners persona section (POL-DOCS-02)', () => {
    expect(content).toMatch(/^###\s+(For )?Business owners\s*$/im);
    expect(content).toMatch(/plain English|walk away with|spreadsheet/i);
  });

  it('Test A.6 README has a Tax agents persona section (POL-DOCS-02)', () => {
    expect(content).toMatch(/^###\s+(For )?[Tt]ax agents( and accountants)?\s*$/m);
    expect(content).toMatch(/multi-client|fast entity switching|Multi-client/i);
  });

  it('Test A.7 README has a Developers persona section (POL-DOCS-02)', () => {
    expect(content).toMatch(/^###\s+(For )?Developers\s*$/m);
    expect(content).toMatch(/StorageAdapter|pure functions/);
  });
});
