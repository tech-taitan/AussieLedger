/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isHostedMode } from '../env';

describe('isHostedMode()', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true when VITE_HOSTED_MODE === 'true'", () => {
    vi.stubEnv('VITE_HOSTED_MODE', 'true');
    expect(isHostedMode()).toBe(true);
  });

  it("returns false when VITE_HOSTED_MODE === 'false'", () => {
    vi.stubEnv('VITE_HOSTED_MODE', 'false');
    expect(isHostedMode()).toBe(false);
  });

  it('returns false when VITE_HOSTED_MODE is undefined', () => {
    vi.stubEnv('VITE_HOSTED_MODE', undefined as unknown as string);
    expect(isHostedMode()).toBe(false);
  });

  it("returns false when VITE_HOSTED_MODE is the empty string ''", () => {
    vi.stubEnv('VITE_HOSTED_MODE', '');
    expect(isHostedMode()).toBe(false);
  });

  it("returns false when VITE_HOSTED_MODE === '1' (only literal 'true' counts)", () => {
    vi.stubEnv('VITE_HOSTED_MODE', '1');
    expect(isHostedMode()).toBe(false);
  });

  it("returns false when VITE_HOSTED_MODE === 'TRUE' (case-sensitive)", () => {
    vi.stubEnv('VITE_HOSTED_MODE', 'TRUE');
    expect(isHostedMode()).toBe(false);
  });

  it("returns false when VITE_HOSTED_MODE === 'true ' (trailing whitespace)", () => {
    // Defensive boundary check: the strict === 'true' equality must reject
    // values that look 'almost true'. Vite/Vitest coerce ALL non-string
    // assignments to import.meta.env into strings (verified: assigning
    // boolean true yields the string 'true'), so a real boolean cannot
    // reach the helper at runtime. The remaining failure mode is a
    // shell or YAML serialisation that introduces stray whitespace.
    vi.stubEnv('VITE_HOSTED_MODE', 'true ');
    expect(isHostedMode()).toBe(false);
  });
});
