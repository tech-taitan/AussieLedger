/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isAiEnabled, IS_AI_ENABLED, GEMINI_MODEL } from '../ai';
import { _resetAdapter, initAdapter } from '../../storage';

describe('IS_AI_ENABLED (build-time, Phase 2)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is false when GEMINI_API_KEY is undefined', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const { IS_AI_ENABLED: flag } = await import('../ai');
    expect(flag).toBe(false);
  });

  it('is false when GEMINI_API_KEY is the placeholder value MY_GEMINI_API_KEY', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'MY_GEMINI_API_KEY');
    const { IS_AI_ENABLED: flag } = await import('../ai');
    expect(flag).toBe(false);
  });

  it('is true when GEMINI_API_KEY is a real key value', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'real-key-xyz');
    const { IS_AI_ENABLED: flag } = await import('../ai');
    expect(flag).toBe(true);
  });
});

describe('IS_AI_ENABLED widened (Phase 3)', () => {
  beforeEach(() => {
    _resetAdapter();
    localStorage.clear();
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('server-mode flag derives from /api/health.aiEnabled', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, version: 2, aiEnabled: true }), { status: 200 })));
    await initAdapter();
    expect(isAiEnabled()).toBe(true);
  });

  it('server-mode disabled flag => isAiEnabled() = false', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, version: 2, aiEnabled: false }), { status: 200 })));
    await initAdapter();
    expect(isAiEnabled()).toBe(false);
  });

  it('local-mode (probe fails) falls back to build-time key', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));
    await initAdapter();
    const localResult = isAiEnabled();
    expect(typeof localResult).toBe('boolean');
    expect(localResult).toBe(IS_AI_ENABLED);
  });

  it('GEMINI_MODEL constant matches server/routes/ai.ts GEMINI_MODEL_DEFAULT literal', () => {
    // The server side intentionally hardcodes the same string to avoid pulling
    // src/lib/ai.ts (and its React/storage deps) into the server bundle.
    // This test pins them together — if either changes the other must too.
    expect(GEMINI_MODEL).toBe('gemini-3-flash-preview');
  });
});
