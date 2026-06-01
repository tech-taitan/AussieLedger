/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tests for useUpdateBanner (Phase 13 PWA-01).
 *
 * Locks: onNeedRefresh flips visible to true; onOfflineReady is silent;
 * snooze writes the sessionStorage key + flips visible to false; pre-set
 * sessionStorage suppresses the banner; triggerUpdate calls updateSW(true);
 * snooze persists across hook unmount + remount within the same session
 * (Hook Test #6 — canonical lock for Smoke C behaviour).
 *
 * Uses the __setRegisterSWForTests injectable seam — avoids needing a Vitest
 * virtual-module mock for 'virtual:pwa-register' (the virtual module is
 * unavailable in jsdom anyway; the hook's dynamic-import path catches the
 * resolution error and falls back to a no-op updateSW ref).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useUpdateBanner,
  __setRegisterSWForTests,
  PWA_UPDATE_SNOOZE_KEY,
} from '../useUpdateBanner';

beforeEach(() => {
  sessionStorage.clear();
  __setRegisterSWForTests(undefined);
});

interface MockHandlers {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
}

function buildMockRegisterSW() {
  const handlers: MockHandlers = {};
  const updateSW = vi.fn().mockResolvedValue(undefined);
  const mockRegisterSW = vi.fn(
    (opts: { onNeedRefresh?: () => void; onOfflineReady?: () => void }) => {
      handlers.onNeedRefresh = opts.onNeedRefresh;
      handlers.onOfflineReady = opts.onOfflineReady;
      return updateSW;
    },
  );
  return { handlers, updateSW, mockRegisterSW };
}

async function waitForRegisterSW(mockRegisterSW: ReturnType<typeof vi.fn>) {
  // The hook's useEffect dynamic-imports + assigns the updateSW ref async.
  // We need to wait one microtask tick for the awaited Promise.resolve()
  // path to complete so handlers are populated.
  await act(async () => {
    await Promise.resolve();
  });
  expect(mockRegisterSW).toHaveBeenCalled();
}

describe('useUpdateBanner — registerSW wiring', () => {
  it('flips visible to true when onNeedRefresh fires', async () => {
    const { handlers, mockRegisterSW } = buildMockRegisterSW();
    __setRegisterSWForTests(mockRegisterSW);
    const { result } = renderHook(() => useUpdateBanner());
    await waitForRegisterSW(mockRegisterSW);
    expect(result.current.visible).toBe(false);
    expect(result.current.needRefresh).toBe(false);
    act(() => {
      handlers.onNeedRefresh?.();
    });
    expect(result.current.needRefresh).toBe(true);
    expect(result.current.visible).toBe(true);
  });

  it('onOfflineReady callback does NOT flip needRefresh (silent first-install)', async () => {
    const { handlers, mockRegisterSW } = buildMockRegisterSW();
    __setRegisterSWForTests(mockRegisterSW);
    const { result } = renderHook(() => useUpdateBanner());
    await waitForRegisterSW(mockRegisterSW);
    act(() => {
      handlers.onOfflineReady?.();
    });
    expect(result.current.needRefresh).toBe(false);
    expect(result.current.visible).toBe(false);
  });
});

describe('useUpdateBanner — sessionStorage snooze', () => {
  it('snooze() writes the sessionStorage key and flips visible to false', async () => {
    const { handlers, mockRegisterSW } = buildMockRegisterSW();
    __setRegisterSWForTests(mockRegisterSW);
    const { result } = renderHook(() => useUpdateBanner());
    await waitForRegisterSW(mockRegisterSW);
    act(() => {
      handlers.onNeedRefresh?.();
    });
    expect(result.current.visible).toBe(true);
    act(() => {
      result.current.snooze();
    });
    expect(sessionStorage.getItem(PWA_UPDATE_SNOOZE_KEY)).toBe('true');
    expect(result.current.visible).toBe(false);
    // needRefresh stays true — only visible is suppressed by the snooze
    expect(result.current.needRefresh).toBe(true);
  });

  it('pre-set sessionStorage snooze suppresses visible even when needRefresh fires', async () => {
    sessionStorage.setItem(PWA_UPDATE_SNOOZE_KEY, 'true');
    const { handlers, mockRegisterSW } = buildMockRegisterSW();
    __setRegisterSWForTests(mockRegisterSW);
    const { result } = renderHook(() => useUpdateBanner());
    await waitForRegisterSW(mockRegisterSW);
    act(() => {
      handlers.onNeedRefresh?.();
    });
    expect(result.current.needRefresh).toBe(true);
    expect(result.current.visible).toBe(false);
  });
});

describe('useUpdateBanner — triggerUpdate', () => {
  it('triggerUpdate() calls updateSW(true)', async () => {
    const { handlers, updateSW, mockRegisterSW } = buildMockRegisterSW();
    __setRegisterSWForTests(mockRegisterSW);
    const { result } = renderHook(() => useUpdateBanner());
    await waitForRegisterSW(mockRegisterSW);
    act(() => {
      handlers.onNeedRefresh?.();
    });
    act(() => {
      result.current.triggerUpdate();
    });
    expect(updateSW).toHaveBeenCalledTimes(1);
    expect(updateSW).toHaveBeenCalledWith(true);
  });
});

describe('useUpdateBanner — Hook Test #6 (canonical Smoke C lock)', () => {
  it('snooze persists across hook unmount + remount within same session', async () => {
    const { handlers: h1, mockRegisterSW: m1 } = buildMockRegisterSW();
    __setRegisterSWForTests(m1);
    const { result: r1, unmount } = renderHook(() => useUpdateBanner());
    await waitForRegisterSW(m1);
    act(() => {
      h1.onNeedRefresh?.();
    });
    expect(r1.current.visible).toBe(true);
    act(() => {
      r1.current.snooze();
    });
    expect(sessionStorage.getItem(PWA_UPDATE_SNOOZE_KEY)).toBe('true');
    expect(r1.current.visible).toBe(false);
    unmount();

    // Fresh hook mount within same session — sessionStorage persists.
    const { handlers: h2, mockRegisterSW: m2 } = buildMockRegisterSW();
    __setRegisterSWForTests(m2);
    const { result: r2 } = renderHook(() => useUpdateBanner());
    await waitForRegisterSW(m2);
    act(() => {
      h2.onNeedRefresh?.();
    });
    // needRefresh true, but visible STAYS false because sessionStorage snooze
    // survives the React-lifecycle remount (the locked Smoke C behaviour).
    expect(r2.current.needRefresh).toBe(true);
    expect(r2.current.visible).toBe(false);
  });
});
