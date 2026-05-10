import { describe, it } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const TAX_LIB_DIR = join(process.cwd(), 'src', 'lib', 'tax');

function stripCommentsAndStrings(line: string): string {
  return line
    .replace(/\/\/.*$/, '')
    .replace(/'[^']*'/g, "''")
    .replace(/"[^"]*"/g, '""')
    .replace(/`[^`]*`/g, '``');
}

function findTsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((f) => f.isFile() && f.name.endsWith('.ts') && !f.name.endsWith('.test.ts'))
    .map((f) => join((f as unknown as { path: string }).path, f.name));
}

describe('Structural lint: no raw float arithmetic in src/lib/tax/', () => {
  it('does not contain bare division or multiplication operators on monetary values', () => {
    const files = findTsFiles(TAX_LIB_DIR);
    const violations: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, 'utf-8').split('\n');
      lines.forEach((raw, i) => {
        const line = stripCommentsAndStrings(raw);
        if (/[\d)]\s*[*/]\s*\d/.test(line)) {
          violations.push(`${file}:${i + 1}: ${raw.trim()}`);
        }
      });
    }
    if (violations.length > 0) {
      throw new Error(
        'Found raw arithmetic in src/lib/tax/ — use src/lib/money.ts wrappers instead:\n' +
          violations.join('\n'),
      );
    }
  });
});
