/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The AIza regex Phase 10-2 CI scan uses to grep dist/ for accidentally
 * leaked Gemini API keys. Standard Google API key shape: literal "AIza"
 * prefix + 35 chars from [0-9A-Za-z_-] = 39 chars total.
 *
 * This test fixture lives at __fixtures__/aiza-secret-leak.txt (repo root,
 * OUTSIDE dist/) so the Phase 10-2 CI scan (`grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/`)
 * never picks it up at scan-time. The fixture exists solely to prove the
 * regex shape would catch a real leak.
 */
const AIZA_REGEX = /AIza[0-9A-Za-z_-]{35}/;
const FIXTURE_PATH = join(process.cwd(), '__fixtures__', 'aiza-secret-leak.txt');

describe('AIza secret-leak regex (CI scan shape — used by Phase 10-2)', () => {
  const fixture = readFileSync(FIXTURE_PATH, 'utf8');

  // ── Positive matches ─────────────────────────────────────────────────────

  it('matches the synthetic key shape in the fixture', () => {
    const match = fixture.match(AIZA_REGEX);
    expect(match).not.toBeNull();
  });

  it('matched string is exactly 39 characters long', () => {
    const match = fixture.match(AIZA_REGEX);
    expect(match).not.toBeNull();
    expect(match![0].length).toBe(39);
  });

  it('matched string starts with the literal four characters AIza', () => {
    const match = fixture.match(AIZA_REGEX);
    expect(match).not.toBeNull();
    expect(match![0].slice(0, 4)).toBe('AIza');
  });

  it('matches the canonical synthetic fixture string verbatim', () => {
    const match = fixture.match(AIZA_REGEX);
    expect(match).not.toBeNull();
    expect(match![0]).toBe('AIzaSyDUMMY_SyntheticFixture_NotAReal-K');
  });

  // ── Negative matches (false-positive avoidance) ──────────────────────────

  it('does NOT match the bare string "AIza" (too short)', () => {
    expect('AIza'.match(AIZA_REGEX)).toBeNull();
  });

  it('does NOT match "AIza-12345" (10 chars total — too short)', () => {
    expect('AIza-12345'.match(AIZA_REGEX)).toBeNull();
  });

  it('does NOT match a 38-char string (off-by-one boundary check)', () => {
    // AIza (4) + 34 valid chars = 38 chars total; need 39
    const tooShort = 'AIza' + 'A'.repeat(34);
    expect(tooShort.length).toBe(38);
    expect(tooShort.match(AIZA_REGEX)).toBeNull();
  });

  it('matches only the valid 39-char prefix when followed by invalid char', () => {
    // The bare regex without anchors WILL match the valid 39-char prefix
    // even when a trailing invalid char follows. Assert the match LENGTH
    // is 39 (not 40) — this is the correct non-greedy boundary behaviour.
    const fortyChars = 'AIza' + 'A'.repeat(35) + '!';
    const match = fortyChars.match(AIZA_REGEX);
    expect(match).not.toBeNull();
    expect(match![0].length).toBe(39);
  });
});
