import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
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
