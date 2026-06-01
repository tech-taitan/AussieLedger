/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App.beforeunload — Phase 11 IDB-05 integration tests.
 *
 * Locks:
 *   1. Listener registered ONLY when isDirty=true (Firefox bfcache preserved).
 *   2. beforeunload + visibilitychange register as a PAIR under [isDirty] dep.
 *   3. beforeunload handler calls preventDefault() + sets returnValue=''.
 *   4. Cleanup runs when isDirty goes false.
 *   5. Nag Toast mounts under useBackupNag's trigger conditions.
 *   6. Toast actions slot carries both Export-now + Snooze-7-days buttons.
 *   7. visibilitychange handler performs settle-point flush via fire-and-forget
 *      adapter.getLastWriteAt() on document.hidden + isDirty (Blocker 2 fix).
 *   8. visibilitychange handler swallows rejected getLastWriteAt() (does not
 *      bubble into unhandled-rejection events).
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from '../App';
import { getAdapter, _resetAdapter, initAdapter } from '../storage';

const SNOOZE_KEY = 'aussieledger:backup-nag-snoozed-until';

async function freshLocalAdapter(): Promise<void> {
  _resetAdapter();
  localStorage.setItem('storageMode', 'local');
  await initAdapter();
  localStorage.removeItem('storageMode');
}

async function seedDirty(): Promise<void> {
  const adapter = await getAdapter();
  // Seeding entities triggers bumpWriteAt → lastWriteAt > lastExportAt (null)
  await adapter.saveEntities([
    { _v: 2, id: 'e1', name: 'Test', type: 'Company', status: 'Active' },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any);
}

describe('App — Phase 11 IDB-05 beforeunload + visibilitychange', () => {
  beforeEach(() => {
    localStorage.removeItem(SNOOZE_KEY);
    // Snooze the nag so it doesn't trigger setView('data') as a side effect
    // for tests focused on the listener registration. Tests 6/7 override.
    localStorage.setItem(SNOOZE_KEY, '2099-01-01T00:00:00.000Z');
  });

  afterEach(() => {
    localStorage.removeItem(SNOOZE_KEY);
    vi.restoreAllMocks();
  });

  it('Test 1: NO beforeunload listener registered when isDirty=false (clean state)', async () => {
    await freshLocalAdapter();
    const winAddSpy = vi.spyOn(window, 'addEventListener');

    render(<App />);
    // Allow the isDirty-deriving effect to resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    const beforeUnloadCalls = winAddSpy.mock.calls.filter(
      (c) => c[0] === 'beforeunload',
    );
    expect(beforeUnloadCalls.length).toBe(0);
  });

  it('Test 2: beforeunload listener registered when isDirty=true (after seedDirty)', async () => {
    await freshLocalAdapter();
    await seedDirty();
    const winAddSpy = vi.spyOn(window, 'addEventListener');

    render(<App />);
    await waitFor(() => {
      const calls = winAddSpy.mock.calls.filter((c) => c[0] === 'beforeunload');
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('Test 3: visibilitychange paired with beforeunload (both register together)', async () => {
    await freshLocalAdapter();
    await seedDirty();
    const winAddSpy = vi.spyOn(window, 'addEventListener');
    const docAddSpy = vi.spyOn(document, 'addEventListener');

    render(<App />);
    await waitFor(() => {
      const before = winAddSpy.mock.calls.filter((c) => c[0] === 'beforeunload');
      const vis = docAddSpy.mock.calls.filter((c) => c[0] === 'visibilitychange');
      expect(before.length).toBeGreaterThanOrEqual(1);
      expect(vis.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('Test 4: beforeunload handler calls preventDefault AND sets returnValue=""', async () => {
    await freshLocalAdapter();
    await seedDirty();
    const winAddSpy = vi.spyOn(window, 'addEventListener');

    render(<App />);
    let handler: ((e: BeforeUnloadEvent) => void) | undefined;
    await waitFor(() => {
      const call = winAddSpy.mock.calls.find((c) => c[0] === 'beforeunload');
      expect(call).toBeDefined();
      handler = call![1] as (e: BeforeUnloadEvent) => void;
    });

    const fakeEvent = {
      preventDefault: vi.fn(),
      returnValue: 'initial',
    } as unknown as BeforeUnloadEvent;
    handler!(fakeEvent);

    expect(fakeEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(fakeEvent.returnValue).toBe('');
  });

  it('Test 5: cleanup — removeEventListener called on unmount (after listener registers)', async () => {
    await freshLocalAdapter();
    await seedDirty();
    const winAddSpy = vi.spyOn(window, 'addEventListener');
    const winRemSpy = vi.spyOn(window, 'removeEventListener');
    const docRemSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = render(<App />);
    // Wait until the conditional listener has actually registered. Without
    // this the test races the async isDirty-derivation useEffect and may
    // unmount before any listener was added.
    await waitFor(() => {
      const calls = winAddSpy.mock.calls.filter((c) => c[0] === 'beforeunload');
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });
    // Now unmount fires the [isDirty] useEffect cleanup → removeEventListener for the pair
    unmount();
    expect(winRemSpy.mock.calls.some((c) => c[0] === 'beforeunload')).toBe(true);
    expect(docRemSpy.mock.calls.some((c) => c[0] === 'visibilitychange')).toBe(true);
  });

  it('Test 6: useBackupNag mounted — Toast renders under trigger conditions', async () => {
    // Allow the nag to fire: clear snooze + seed adapter so lastExportAt=null + non-empty
    localStorage.removeItem(SNOOZE_KEY);
    await freshLocalAdapter();
    await seedDirty();

    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument();
    });
  });

  it('Test 7: Toast actions include both Export-now + Snooze-7-days buttons', async () => {
    localStorage.removeItem(SNOOZE_KEY);
    await freshLocalAdapter();
    await seedDirty();

    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('backup-nag-export')).toBeInTheDocument();
      expect(screen.getByTestId('backup-nag-snooze')).toBeInTheDocument();
    });
  });

  it('Test 8 (Blocker 2 fix): visibilitychange handler invokes adapter.getLastWriteAt on document.hidden + isDirty', async () => {
    await freshLocalAdapter();
    await seedDirty();

    const docAddSpy = vi.spyOn(document, 'addEventListener');

    const adapter = await getAdapter();
    const getLastWriteAtSpy = vi.spyOn(
      adapter as unknown as { getLastWriteAt: () => Promise<string | null> },
      'getLastWriteAt',
    );

    render(<App />);
    let handler: (() => void) | undefined;
    await waitFor(() => {
      const call = docAddSpy.mock.calls.find((c) => c[0] === 'visibilitychange');
      expect(call).toBeDefined();
      handler = call![1] as () => void;
    });

    // Reset the spy so we only count handler-driven calls (init paths may have called it)
    getLastWriteAtSpy.mockClear();

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    handler!();
    // Wait a tick for the fire-and-forget IIFE to actually call getLastWriteAt
    await new Promise((r) => setTimeout(r, 50));

    expect(getLastWriteAtSpy).toHaveBeenCalledTimes(1);
  });

  it('Test 9 (Blocker 2 fix): visibilitychange handler swallows rejected getLastWriteAt — no unhandled rejection', async () => {
    await freshLocalAdapter();
    await seedDirty();

    const docAddSpy = vi.spyOn(document, 'addEventListener');

    const adapter = await getAdapter();
    const getLastWriteAtSpy = vi.spyOn(
      adapter as unknown as { getLastWriteAt: () => Promise<string | null> },
      'getLastWriteAt',
    );

    render(<App />);
    let handler: (() => void) | undefined;
    await waitFor(() => {
      const call = docAddSpy.mock.calls.find((c) => c[0] === 'visibilitychange');
      expect(call).toBeDefined();
      handler = call![1] as () => void;
    });

    // Make the next getLastWriteAt call reject
    getLastWriteAtSpy.mockRejectedValueOnce(new Error('boom'));

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });

    let unhandledFired = false;
    const onUnhandled = () => {
      unhandledFired = true;
    };
    process.on('unhandledRejection', onUnhandled);
    try {
      handler!();
      // Wait for the fire-and-forget IIFE to run and the rejection to settle
      await new Promise((r) => setTimeout(r, 100));
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }

    expect(unhandledFired).toBe(false);
  });
});
