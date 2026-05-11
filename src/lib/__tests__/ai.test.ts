import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('IS_AI_ENABLED', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is false when GEMINI_API_KEY is undefined', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const { IS_AI_ENABLED } = await import('../ai');
    expect(IS_AI_ENABLED).toBe(false);
  });

  it('is false when GEMINI_API_KEY is the placeholder value MY_GEMINI_API_KEY', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'MY_GEMINI_API_KEY');
    const { IS_AI_ENABLED } = await import('../ai');
    expect(IS_AI_ENABLED).toBe(false);
  });

  it('is true when GEMINI_API_KEY is a real key value', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'real-key-xyz');
    const { IS_AI_ENABLED } = await import('../ai');
    expect(IS_AI_ENABLED).toBe(true);
  });
});

describe('IS_AI_ENABLED widened (Phase 3)', () => {
  it.todo('local-mode flag derives from import.meta.env.VITE_GEMINI_API_KEY (unchanged from Phase 2)');
  it.todo('server-mode flag derives from /api/health.aiEnabled');
  it.todo('returns false when key is the placeholder MY_GEMINI_API_KEY');
});
