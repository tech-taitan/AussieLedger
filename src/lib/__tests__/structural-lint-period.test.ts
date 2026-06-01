/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Structural lint — Phase 2 invariant: NO no-arg `new Date()` or `Date.now()`
 * outside src/lib/period.ts. All wall-clock reads MUST route through today() /
 * nowIso() / addDaysIso() so tests can inject deterministic timestamps via
 * _setNowProvider().
 *
 * Parsed-from-value uses like `new Date(isoString)` are NOT flagged — they take
 * an argument and do not capture the wall clock.
 *
 * Locked by: Plan 11-1 (LocalAdapter bumpWriteAt routes through nowIso) +
 * Plan 11-2 (useBackupNag addDaysIso, App.tsx isDirty derivation).
 *
 * Note: src/__tests__/structural.test.ts already enforces a very similar
 * invariant (added during Phase 2 Plan 02-4). This file is the Phase 11
 * Plan 11-1 Task 3 W1 deliverable — it adds a Phase-11-specific test with:
 *   (a) An explicit comment-stripper that mirrors the tax-module pattern in
 *       src/lib/tax/__tests__/structural-lint.test.ts (handles block-comment
 *       continuation lines like ` * comment text` in JSDoc which the older
 *       structural.test.ts comment-stripper does not).
 *   (b) A sanity test (Test 3) proving the comment-stripper does not
 *       false-negative on strings + line comments AND does not false-positive
 *       on real code.
 *   (c) Separate test cases for `new Date()` and `Date.now()` so a violation
 *       report points at the exact rule violated.
 * Two enforcers > one — defence in depth against accidental regression of the
 * single-source-of-Date invariant the Phase 11 deterministic-test-clock design
 * depends on.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, type Dirent } from 'fs';
import { join, relative, sep } from 'path';

const SRC_DIR = join(process.cwd(), 'src');
const PERIOD_FILE = join('src', 'lib', 'period.ts').split(sep).join('/');

function stripCommentsAndStrings(line: string): string {
  // Strip full-line block comment rows (e.g. " * comment text" in JSDoc)
  const trimmed = line.trimStart();
  if (trimmed.startsWith('*') || trimmed.startsWith('/*')) return '';
  return line
    .replace(/\/\/.*$/, '')
    .replace(/\/\*.*?\*\//g, '')
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
    .map((f) => join((f as unknown as { path: string }).path, String(f.name)))
    .filter((p) => {
      const rel = relative(process.cwd(), p).split(sep).join('/');
      return rel !== PERIOD_FILE;
    });
}

describe('Structural lint: no bare new Date() outside src/lib/period.ts', () => {
  it('no source file under src/ (excluding period.ts + tests) calls new Date() with no args', () => {
    const files = findSourceFiles(SRC_DIR);
    const violations: string[] = [];
    const NEW_DATE_NO_ARG = /\bnew\s+Date\s*\(\s*\)/;
    for (const file of files) {
      const lines = readFileSync(file, 'utf-8').split('\n');
      lines.forEach((raw, i) => {
        const line = stripCommentsAndStrings(raw);
        if (NEW_DATE_NO_ARG.test(line)) {
          violations.push(`${relative(process.cwd(), file)}:${i + 1}: ${raw.trim()}`);
        }
      });
    }
    if (violations.length > 0) {
      throw new Error(
        'Found bare new Date() outside src/lib/period.ts — route through today() / nowIso() / addDaysIso():\n' +
          violations.join('\n'),
      );
    }
  });

  it('no source file under src/ (excluding period.ts + tests) calls Date.now()', () => {
    const files = findSourceFiles(SRC_DIR);
    const violations: string[] = [];
    const DATE_NOW = /\bDate\.now\s*\(/;
    for (const file of files) {
      const lines = readFileSync(file, 'utf-8').split('\n');
      lines.forEach((raw, i) => {
        const line = stripCommentsAndStrings(raw);
        if (DATE_NOW.test(line)) {
          violations.push(`${relative(process.cwd(), file)}:${i + 1}: ${raw.trim()}`);
        }
      });
    }
    if (violations.length > 0) {
      throw new Error(
        'Found Date.now() outside src/lib/period.ts — route through today().getTime():\n' +
          violations.join('\n'),
      );
    }
  });

  it('stripCommentsAndStrings correctly ignores matches inside strings and comments (sanity)', () => {
    expect(stripCommentsAndStrings(`const s = 'new Date()';`)).not.toMatch(/\bnew\s+Date\s*\(\s*\)/);
    expect(stripCommentsAndStrings(`// new Date()`)).not.toMatch(/\bnew\s+Date\s*\(\s*\)/);
    expect(stripCommentsAndStrings(`const x = new Date();`)).toMatch(/\bnew\s+Date\s*\(\s*\)/);
    // Block-comment continuation line is also stripped (JSDoc bodies)
    expect(stripCommentsAndStrings(` * mentions new Date() in prose`)).not.toMatch(
      /\bnew\s+Date\s*\(\s*\)/,
    );
    // Date.now inside string literal is ignored
    expect(stripCommentsAndStrings(`const k = "Date.now()";`)).not.toMatch(/\bDate\.now\s*\(/);
    // Real Date.now call still fires
    expect(stripCommentsAndStrings(`const ms = Date.now();`)).toMatch(/\bDate\.now\s*\(/);
  });
});
