/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * Recursively collect all .ts/.tsx files under `dir`,
 * skipping __tests__ directories and .d.ts files.
 */
function collect(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      collect(full, out);
    } else if (
      (name.endsWith('.ts') || name.endsWith('.tsx')) &&
      !name.endsWith('.d.ts')
    ) {
      out.push(full);
    }
  }
  return out;
}

describe('SPDX headers (DEP-04)', () => {
  const srcDir = resolve(__dirname, '..');
  const files = collect(srcDir);

  it(`at least 50 source files collected`, () => {
    expect(files.length).toBeGreaterThanOrEqual(50);
  });

  it.each(files)('%s has Apache-2.0 SPDX header', (file) => {
    const head = readFileSync(file, 'utf8').slice(0, 200);
    expect(head).toContain('SPDX-License-Identifier: Apache-2.0');
  });
});
