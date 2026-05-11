/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initAdapter,
  getAdapterKind,
  getCachedHealth,
  getFellBackToLocal,
  _resetAdapter,
} from '../index';

beforeEach(() => {
  _resetAdapter();
  localStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Adapter selection probe', () => {
  it('selects server on health 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = typeof input === 'string' ? input : (input as Request).url;
        if (url.includes('/api/health')) {
          return new Response(
            JSON.stringify({ ok: true, version: 2, aiEnabled: true }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response('not found', { status: 404 });
      }),
    );
    await initAdapter();
    expect(getAdapterKind()).toBe('server');
    expect(getCachedHealth()).toEqual({ ok: true, version: 2, aiEnabled: true });
    expect(getFellBackToLocal()).toBe(false);
  });

  it('falls back to local', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    );
    await initAdapter();
    expect(getAdapterKind()).toBe('local');
    expect(getFellBackToLocal()).toBe(true);
  });

  it('honors storageMode override', async () => {
    localStorage.setItem('storageMode', 'local');
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ ok: true, version: 2, aiEnabled: false }),
            { status: 200 },
          ),
      ),
    );
    await initAdapter();
    expect(getAdapterKind()).toBe('local');
    // Override path is NOT a fallback — banner should not render
    expect(getFellBackToLocal()).toBe(false);
  });

  it('memoises adapter promise across calls', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('no server');
      }),
    );
    const a1 = await initAdapter();
    const a2 = await initAdapter();
    expect(a1).toBe(a2);
  });

  it('stashes /api/health aiEnabled flag for IS_AI_ENABLED', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ ok: true, version: 2, aiEnabled: false }),
            { status: 200 },
          ),
      ),
    );
    await initAdapter();
    expect(getCachedHealth()?.aiEnabled).toBe(false);
  });
});
