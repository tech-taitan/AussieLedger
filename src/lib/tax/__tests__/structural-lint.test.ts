import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const TAX_LIB_DIR = join(process.cwd(), 'src', 'lib', 'tax');
const SRC_DIR = join(process.cwd(), 'src');

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

describe('Structural lint: no React imports in src/lib/tax/**', () => {
  it('no file in src/lib/tax/**/*.ts (excluding tests) imports from react or react-dom', () => {
    const files = findTsFiles(TAX_LIB_DIR);
    const violations: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, 'utf-8').split('\n');
      lines.forEach((raw, i) => {
        const line = stripCommentsAndStrings(raw);
        if (/import\s+.*\s+from\s+['"]react['"]/.test(line) ||
            /import\s+.*\s+from\s+['"]react-dom['"]/.test(line)) {
          violations.push(`${file}:${i + 1}: ${raw.trim()}`);
        }
      });
    }
    if (violations.length > 0) {
      throw new Error(
        'Found React imports in src/lib/tax/ — tax engine modules must be React-free:\n' +
          violations.join('\n'),
      );
    }
  });
});

describe('Structural lint: fy2026 exports', () => {
  it('fy2026.ts exports all required constants and label sets', () => {
    const fy2026Path = join(TAX_LIB_DIR, 'labels', 'fy2026.ts');
    expect(existsSync(fy2026Path), `fy2026.ts must exist at ${fy2026Path}`).toBe(true);
    const content = readFileSync(fy2026Path, 'utf-8');

    const requiredExports = [
      'INDIVIDUAL_LABELS',
      'COMPANY_LABELS',
      'TRUST_LABELS',
      'PARTNERSHIP_LABELS',
      'BAS_LABELS',
      'GST_RATE',
      'COMPANY_TAX_RATE_BASE',
      'COMPANY_TAX_RATE_FULL',
      'BRE_PASSIVE_THRESHOLD',
    ];

    const missing = requiredExports.filter(token => !content.includes(token));
    if (missing.length > 0) {
      throw new Error(`fy2026.ts is missing exports: ${missing.join(', ')}`);
    }
  });
});

describe('Structural lint: seed CoA fully mapped', () => {
  it('every Revenue and Expense account in CHART_OF_ACCOUNTS has all 4 entity-type labels populated', async () => {
    const { CHART_OF_ACCOUNTS } = await import('../../../constants');
    const incomeExpenseAccounts = CHART_OF_ACCOUNTS.filter(
      a => a.type === 'Revenue' || a.type === 'Expense'
    );

    const unmapped: string[] = [];
    for (const account of incomeExpenseAccounts) {
      const missingFields: string[] = [];
      if (!account.taxLabel) missingFields.push('taxLabel');
      if (!account.companyTaxLabel) missingFields.push('companyTaxLabel');
      if (!account.trustTaxLabel) missingFields.push('trustTaxLabel');
      if (!account.partnershipTaxLabel) missingFields.push('partnershipTaxLabel');
      if (missingFields.length > 0) {
        unmapped.push(`${account.code} ${account.name}: missing ${missingFields.join(', ')}`);
      }
    }

    if (unmapped.length > 0) {
      throw new Error(
        'The following Revenue/Expense accounts in CHART_OF_ACCOUNTS are missing tax labels:\n' +
          unmapped.join('\n'),
      );
    }
  });
});
