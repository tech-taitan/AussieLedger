/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('print.css', () => {
  const css = readFileSync(join(__dirname, '..', 'print.css'), 'utf-8');

  it('@media print and .no-print rules present', () => {
    expect(css).toMatch(/@media print/);
    expect(css).toMatch(/\.no-print\s*\{[\s\S]*?display:\s*none\s*!important/);
  });

  it('.print-only rules present', () => {
    expect(css).toMatch(/\.print-only\s*\{[\s\S]*?display:\s*block\s*!important/);
  });

  it('per-form classes defined', () => {
    expect(css).toMatch(/\.print-form-i/);
    expect(css).toMatch(/\.print-form-c/);
    expect(css).toMatch(/\.print-form-t/);
    expect(css).toMatch(/\.print-form-p/);
    expect(css).toMatch(/\.print-form-bas/);
  });

  it('A4 page rule defined with portrait orientation', () => {
    expect(css).toMatch(/@page\s*\{[\s\S]*?size:\s*A4\s*portrait/);
  });

  it('.print-footer running-rule defined', () => {
    expect(css).toMatch(/\.print-footer/);
  });
});
