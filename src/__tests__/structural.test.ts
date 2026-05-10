import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, Dirent } from 'fs';
import { join } from 'path';

describe('Slide generator removal (FND-05 cleanup)', () => {
  const appPath = join(process.cwd(), 'src', 'App.tsx');

  it('no slide-generator — src/App.tsx contains no "slide-generator" view token, no "SlideGenerator" import, no "Slide Generator" nav label', () => {
    const source = readFileSync(appPath, 'utf-8');
    expect(source).not.toContain('slide-generator');
    expect(source).not.toContain('SlideGenerator');
    expect(source).not.toContain('Slide Generator');
  });

  it('no slide-generator — src/components/SlideGenerator.tsx file is deleted', () => {
    const slidePath = join(process.cwd(), 'src', 'components', 'SlideGenerator.tsx');
    expect(existsSync(slidePath)).toBe(false);
  });
});

describe('App.tsx ≤ 250 lines', () => {
  // RED-by-design until Plan 02-4 demolishes App.tsx.
  // App.tsx is currently ~1,116 lines. Plan 02-4 extracts hooks and shell components,
  // reducing it to ≤ 250 lines. This test turns GREEN after 02-4 completes.
  // Enabled at end of Plan 02-4 (remove .skip) once App.tsx is decomposed.
  it('src/App.tsx has ≤ 250 non-blank lines [RED until Plan 02-4 decomposes App.tsx]', () => {
    const appPath = join(process.cwd(), 'src', 'App.tsx');
    const source = readFileSync(appPath, 'utf-8');
    const nonBlankLines = source.split('\n').filter(line => !/^\s*$/.test(line));
    expect(
      nonBlankLines.length,
      `App.tsx has ${nonBlankLines.length} non-blank lines; must be ≤ 250 after Plan 02-4`
    ).toBeLessThanOrEqual(250);
  });
});

describe('No raw new Date() outside src/lib/period.ts', () => {
  // RED-by-design until Plan 02-4 removes new Date() usages from App.tsx.
  // App.tsx:355 uses `new Date().toISOString()` in addAuditLog.
  // After 02-4 extracts useAuditLog (which calls today()), this test turns GREEN.
  // Enabled at end of Plan 02-4 (remove .skip).

  function stripCommentsAndStrings(line: string): string {
    return line
      .replace(/\/\/.*$/, '')
      .replace(/'[^']*'/g, "''")
      .replace(/"[^"]*"/g, '""')
      .replace(/`[^`]*`/g, '``');
  }

  function findSourceFiles(dir: string): string[] {
    if (!existsSync(dir)) return [];
    const entries = readdirSync(dir, { withFileTypes: true, recursive: true }) as Dirent[];
    return entries
      .filter((f) => {
        const name = String(f.name);
        return (
          f.isFile() &&
          (name.endsWith('.ts') || name.endsWith('.tsx')) &&
          !name.endsWith('.test.ts') &&
          !name.endsWith('.test.tsx')
        );
      })
      .map((f) => join((f as unknown as { path: string }).path, String(f.name)));
  }

  it('no file outside src/lib/period.ts uses parameterless new Date() or Date.now() — use today() instead', () => {
    const srcDir = join(process.cwd(), 'src');
    const periodPath = join(srcDir, 'lib', 'period.ts');
    const allFiles = findSourceFiles(srcDir).filter(f => f !== periodPath);

    const violations: string[] = [];
    for (const file of allFiles) {
      const lines = readFileSync(file, 'utf-8').split('\n');
      lines.forEach((raw, i) => {
        const line = stripCommentsAndStrings(raw);
        // Only flag "now" producers: parameterless `new Date()` and `Date.now()`.
        // `new Date(someString)` is date PARSING (not now-generation) and is allowed.
        if (/\bnew Date\s*\(\s*\)/.test(line) || /\bDate\.now\s*\(/.test(line)) {
          violations.push(`${file}:${i + 1}: ${raw.trim()}`);
        }
      });
    }

    if (violations.length > 0) {
      throw new Error(
        'Found new Date() or Date.now() outside src/lib/period.ts — use today() instead:\n' +
          violations.join('\n')
      );
    }
  });
});
