/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tests for useBackupNag (Phase 11 IDB-03).
 *
 * Locks: once-per-mount firing, threshold (7d desktop / 5d iOS Safari),
 * empty-adapter suppression, snooze suppression, snooze-button arithmetic
 * via addDaysIso(7), iOS UA regex (rejects CriOS/FxiOS/EdgiOS).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useBackupNag, isIosSafariUA } from '../useBackupNag';
import { getAdapter } from '../../storage';
import { _setNowProvider, _resetNowProvider } from '../../lib/period';

const SNOOZE_KEY = 'aussieledger:backup-nag-snoozed-until';

const FIXED_NOW = new Date('2026-06-15T10:00:00.000Z');
const FIXED_NOW_MS = FIXED_NOW.getTime();
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IOS_CHROME_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1';

function mockUA(ua: string) {
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    get: () => ua,
  });
}

interface AdapterSeed {
  entities?: unknown[];
  entries?: Record<string, unknown[]>;
  lastExportAt?: string | null;
}

async function seedAdapter(seed: AdapterSeed): Promise<void> {
  const adapter = await getAdapter();
  const maybe = adapter as unknown as {
    setLastExportAt?: (iso: string) => Promise<void>;
  };
  if (seed.entities && seed.entities.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await adapter.saveEntities(seed.entities as any);
  }
  if (seed.entries && Object.keys(seed.entries).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await adapter.saveEntries(seed.entries as any);
  }
  if (seed.lastExportAt && typeof maybe.setLastExportAt === 'function') {
    await maybe.setLastExportAt(seed.lastExportAt);
  }
}

describe('isIosSafariUA (locked regex)', () => {
  it('returns true for iOS Safari', () => {
    expect(isIosSafariUA(IOS_SAFARI_UA)).toBe(true);
  });

  it('returns false for desktop Chrome', () => {
    expect(isIosSafariUA(DESKTOP_UA)).toBe(false);
  });

  it('returns false for Chrome-on-iOS (CriOS)', () => {
    expect(isIosSafariUA(IOS_CHROME_UA)).toBe(false);
  });

  it('returns false for Firefox-on-iOS (FxiOS)', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/604.1';
    expect(isIosSafariUA(ua)).toBe(false);
  });

  it('returns false for Edge-on-iOS (EdgiOS)', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/120.0 Mobile/15E148 Safari/604.1';
    expect(isIosSafariUA(ua)).toBe(false);
  });
});

describe('useBackupNag', () => {
  beforeEach(() => {
    localStorage.removeItem(SNOOZE_KEY);
    _setNowProvider(() => new Date(FIXED_NOW_MS));
    mockUA(DESKTOP_UA);
  });

  afterEach(() => {
    _resetNowProvider();
    localStorage.removeItem(SNOOZE_KEY);
  });

  it('Test 1: empty adapter → visible=false (no nag)', async () => {
    const { result } = renderHook(() => useBackupNag());
    // Allow the async effect to settle
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.visible).toBe(false);
  });

  it('Test 2: snoozed (future ISO) → visible=false', async () => {
    const future = new Date(FIXED_NOW_MS + 1 * MS_PER_DAY).toISOString();
    localStorage.setItem(SNOOZE_KEY, future);
    await seedAdapter({ entities: [{ _v: 2, id: 'e1', name: 'X', type: 'Company', status: 'Active' }] });

    const { result } = renderHook(() => useBackupNag());
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.visible).toBe(false);
  });

  it('Test 3: snooze expired + adapter has data + lastExportAt null → visible=true', async () => {
    const past = new Date(FIXED_NOW_MS - 1 * MS_PER_DAY).toISOString();
    localStorage.setItem(SNOOZE_KEY, past);
    await seedAdapter({ entities: [{ _v: 2, id: 'e1', name: 'X', type: 'Company', status: 'Active' }] });

    const { result } = renderHook(() => useBackupNag());
    await waitFor(() => expect(result.current.visible).toBe(true));
  });

  it('Test 4: never exported + non-empty adapter → visible=true', async () => {
    await seedAdapter({ entities: [{ _v: 2, id: 'e1', name: 'X', type: 'Company', status: 'Active' }] });
    const { result } = renderHook(() => useBackupNag());
    await waitFor(() => expect(result.current.visible).toBe(true));
    expect(result.current.message.toLowerCase()).toMatch(/export|back up/);
  });

  it('Test 5: threshold not crossed (5d ago, desktop, 7d threshold) → visible=false', async () => {
    const fiveDaysAgo = new Date(FIXED_NOW_MS - 5 * MS_PER_DAY).toISOString();
    await seedAdapter({
      entities: [{ _v: 2, id: 'e1', name: 'X', type: 'Company', status: 'Active' }],
      lastExportAt: fiveDaysAgo,
    });

    const { result } = renderHook(() => useBackupNag());
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.visible).toBe(false);
  });

  it('Test 6: threshold crossed (8d ago, desktop, 7d threshold) → visible=true', async () => {
    const eightDaysAgo = new Date(FIXED_NOW_MS - 8 * MS_PER_DAY).toISOString();
    await seedAdapter({
      entities: [{ _v: 2, id: 'e1', name: 'X', type: 'Company', status: 'Active' }],
      lastExportAt: eightDaysAgo,
    });

    const { result } = renderHook(() => useBackupNag());
    await waitFor(() => expect(result.current.visible).toBe(true));
  });

  it('Test 7: threshold not crossed (4d ago, iOS Safari UA, 5d threshold) → visible=false', async () => {
    mockUA(IOS_SAFARI_UA);
    const fourDaysAgo = new Date(FIXED_NOW_MS - 4 * MS_PER_DAY).toISOString();
    await seedAdapter({
      entities: [{ _v: 2, id: 'e1', name: 'X', type: 'Company', status: 'Active' }],
      lastExportAt: fourDaysAgo,
    });

    const { result } = renderHook(() => useBackupNag());
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.visible).toBe(false);
  });

  it('Test 8: threshold crossed (6d ago, iOS Safari UA, 5d threshold) → visible=true', async () => {
    mockUA(IOS_SAFARI_UA);
    const sixDaysAgo = new Date(FIXED_NOW_MS - 6 * MS_PER_DAY).toISOString();
    await seedAdapter({
      entities: [{ _v: 2, id: 'e1', name: 'X', type: 'Company', status: 'Active' }],
      lastExportAt: sixDaysAgo,
    });

    const { result } = renderHook(() => useBackupNag());
    await waitFor(() => expect(result.current.visible).toBe(true));
    // Message references the 5d iOS threshold
    expect(result.current.message).toMatch(/5 days/);
  });

  it('Test 9: Chrome-on-iOS (CriOS) uses desktop threshold (7d, not 5d)', async () => {
    mockUA(IOS_CHROME_UA);
    // 6d ago on CriOS UA → uses 7d threshold → NOT crossed (should be visible=false)
    const sixDaysAgo = new Date(FIXED_NOW_MS - 6 * MS_PER_DAY).toISOString();
    await seedAdapter({
      entities: [{ _v: 2, id: 'e1', name: 'X', type: 'Company', status: 'Active' }],
      lastExportAt: sixDaysAgo,
    });

    const { result } = renderHook(() => useBackupNag());
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.visible).toBe(false);
  });

  it('Test 10: onSnooze writes addDaysIso(7) to localStorage AND a remount returns visible=false', async () => {
    await seedAdapter({ entities: [{ _v: 2, id: 'e1', name: 'X', type: 'Company', status: 'Active' }] });

    const { result } = renderHook(() => useBackupNag());
    await waitFor(() => expect(result.current.visible).toBe(true));

    act(() => {
      result.current.onSnooze();
    });

    const stored = localStorage.getItem(SNOOZE_KEY);
    expect(stored).toBe(new Date(FIXED_NOW_MS + 7 * MS_PER_DAY).toISOString());

    // Remount and assert visible=false (snooze ISO is in the future)
    const second = renderHook(() => useBackupNag());
    await new Promise((r) => setTimeout(r, 50));
    expect(second.result.current.visible).toBe(false);
  });

  it('Test 11: onExport invokes navigateToData callback', async () => {
    await seedAdapter({ entities: [{ _v: 2, id: 'e1', name: 'X', type: 'Company', status: 'Active' }] });

    const navigateToData = vi.fn();
    const { result } = renderHook(() => useBackupNag(navigateToData));
    await waitFor(() => expect(result.current.visible).toBe(true));

    act(() => {
      result.current.onExport();
    });

    expect(navigateToData).toHaveBeenCalledTimes(1);
  });

  it('Test 12: fires once per mount (useEffect has empty deps; no re-poll on state changes)', async () => {
    await seedAdapter({ entities: [{ _v: 2, id: 'e1', name: 'X', type: 'Company', status: 'Active' }] });

    const { result, rerender } = renderHook(() => useBackupNag());
    await waitFor(() => expect(result.current.visible).toBe(true));

    // Dismiss → visible=false
    act(() => {
      result.current.onDismiss();
    });
    expect(result.current.visible).toBe(false);

    // Re-render: visible should NOT flip back to true on its own (effect has empty deps)
    rerender();
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.visible).toBe(false);
  });
});
