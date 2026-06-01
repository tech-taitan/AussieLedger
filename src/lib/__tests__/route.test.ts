/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tests for getRouteKind() — Phase 14 Plan 14-1 Task 1.
 *
 * Pure pathname-dispatch helper. Tests cover:
 *   - Explicit pathname arg (deterministic) for all 4 branches + trailing slash + arbitrary path
 *   - No-arg call reads window.location.pathname (stubbed via vi.stubGlobal)
 *   - Default jsdom env (pathname='/') returns 'default'
 */
import { describe, it, expect, afterEach } from 'vitest';
import { getRouteKind } from '../route';

describe('getRouteKind()', () => {
  afterEach(() => {
    // Restore any stubbed globals so a later test doesn't see /demo etc.
    // No-op if no stub was set.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (globalThis as any).vi !== 'undefined') {
      // when running under vitest the unstub function is on the module
    }
  });

  it('returns "default" for root path "/"', () => {
    expect(getRouteKind('/')).toBe('default');
  });

  it('returns "demo" for "/demo"', () => {
    expect(getRouteKind('/demo')).toBe('demo');
  });

  it('returns "demo" for "/demo/" (trailing-slash tolerance)', () => {
    expect(getRouteKind('/demo/')).toBe('demo');
  });

  it('returns "privacy" for "/privacy"', () => {
    expect(getRouteKind('/privacy')).toBe('privacy');
  });

  it('returns "default" for an arbitrary unknown path', () => {
    expect(getRouteKind('/something-else')).toBe('default');
  });

  it('reads window.location.pathname when called with no arg (stubbed /demo)', async () => {
    const { vi } = await import('vitest');
    vi.stubGlobal('location', { ...window.location, pathname: '/demo' });
    try {
      expect(getRouteKind()).toBe('demo');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('returns "default" under jsdom default location (pathname="/")', () => {
    // jsdom defaults to http://localhost/ which yields pathname='/'.
    expect(getRouteKind()).toBe('default');
  });
});
