/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isAiEnabled, GEMINI_MODEL } from '../ai';
import { _resetAdapter, initAdapter } from '../../storage';

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

  it('local-mode (probe fails) keeps AI disabled so no secret enters the SPA', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));
    await initAdapter();
    expect(isAiEnabled()).toBe(false);
  });

  it('GEMINI_MODEL constant matches server/routes/ai.ts GEMINI_MODEL_DEFAULT literal', () => {
    // The server side intentionally hardcodes the same string to avoid pulling
    // src/lib/ai.ts (and its React/storage deps) into the server bundle.
    // This test pins them together — if either changes the other must too.
    expect(GEMINI_MODEL).toBe('gemini-3-flash-preview');
  });
});
