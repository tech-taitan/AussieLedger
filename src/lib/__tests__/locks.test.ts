/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Task 13 — Coverage for the navigator.locks wrapper + in-memory
 * fallback. jsdom doesn't expose navigator.locks so these tests exercise
 * the fallback path. We additionally stub navigator.locks once to prove
 * the wrapper delegates when the API is present.
 */
import { describe, it, expect, vi } from 'vitest';

describe('withLock — in-memory fallback (jsdom path)', () => {
  it('serializes concurrent callers under the same name', async () => {
    const { withLock } = await import('../locks');
    const order: string[] = [];
    const slow = (label: string, ms: number) =>
      withLock('coa-write', async () => {
        order.push(`${label}:start`);
        await new Promise((r) => setTimeout(r, ms));
        order.push(`${label}:end`);
      });

    await Promise.all([slow('A', 20), slow('B', 5), slow('C', 5)]);

    // Strict serialization: B can't start before A ends, C can't start
    // before B ends — even though B's own work is shorter than A's.
    expect(order).toEqual([
      'A:start',
      'A:end',
      'B:start',
      'B:end',
      'C:start',
      'C:end',
    ]);
  });

  it('does NOT serialize callers under different lock names', async () => {
    const { withLock } = await import('../locks');
    const order: string[] = [];
    const work = (name: string, label: string, ms: number) =>
      withLock(name, async () => {
        order.push(`${label}:start`);
        await new Promise((r) => setTimeout(r, ms));
        order.push(`${label}:end`);
      });

    await Promise.all([work('a', 'X', 20), work('b', 'Y', 5)]);

    // Y runs concurrently with X — its start lands before X ends.
    const xEndIdx = order.indexOf('X:end');
    const yStartIdx = order.indexOf('Y:start');
    expect(yStartIdx).toBeLessThan(xEndIdx);
  });

  it('does not poison the queue when one caller throws', async () => {
    const { withLock } = await import('../locks');
    await expect(
      withLock('q', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    // Next caller MUST still acquire and run to completion.
    const result = await withLock('q', async () => 42);
    expect(result).toBe(42);
  });
});

describe('withLock — delegates to navigator.locks when present', () => {
  it('calls navigator.locks.request with the lock name', async () => {
    const requestSpy = vi.fn(
      async <T,>(_name: string, cb: () => Promise<T>): Promise<T> => cb(),
    );
    const originalLocks = (navigator as { locks?: unknown }).locks;
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request: requestSpy },
    });

    try {
      vi.resetModules();
      const { withLock } = await import('../locks');
      const result = await withLock('coa-write', async () => 'ok');
      expect(result).toBe('ok');
      expect(requestSpy).toHaveBeenCalledTimes(1);
      expect(requestSpy.mock.calls[0][0]).toBe('coa-write');
    } finally {
      if (originalLocks === undefined) {
        delete (navigator as { locks?: unknown }).locks;
      } else {
        Object.defineProperty(navigator, 'locks', {
          configurable: true,
          value: originalLocks,
        });
      }
    }
  });
});
