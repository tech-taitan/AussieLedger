import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('GitHub Actions CI workflow (DEP-05)', () => {
  const ciPath = join(process.cwd(), '.github', 'workflows', 'ci.yml');

  it('CI workflow file exists at .github/workflows/ci.yml', () => {
    expect(existsSync(ciPath)).toBe(true);
  });

  it('triggers on push to main', () => {
    const yml = readFileSync(ciPath, 'utf-8');
    expect(yml).toMatch(/on:[\s\S]*push:[\s\S]*branches:\s*\[main\]/);
  });

  it('triggers on pull_request to main', () => {
    const yml = readFileSync(ciPath, 'utf-8');
    expect(yml).toMatch(/pull_request:[\s\S]*branches:\s*\[main\]/);
  });

  it('runs build, lint, and test jobs', () => {
    const yml = readFileSync(ciPath, 'utf-8');
    expect(yml).toContain('npm ci');
    expect(yml).toContain('npm run build');
    expect(yml).toContain('npm run lint');
    expect(yml).toMatch(/vitest run|npm run test/);
  });

  it('runs on ubuntu-latest with Node 20', () => {
    const yml = readFileSync(ciPath, 'utf-8');
    expect(yml).toContain('ubuntu-latest');
    expect(yml).toMatch(/node-version:\s*['"]?20/);
  });
});
