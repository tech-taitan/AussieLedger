/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DataPage + AdapterFallbackBanner tests — Phase 3 Plan 03-4.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DataPage } from '../DataPage';
import { AdapterFallbackBanner } from '../AdapterFallbackBanner';
import { initAdapter, _resetAdapter, getAdapter } from '../../storage';
import { CURRENT_VERSION } from '../../lib/migrations';
import * as envModule from '../../lib/env';

beforeEach(async () => {
  _resetAdapter();
  localStorage.clear();
  // Force LocalAdapter path (no /api/health) — probe will throw and fall back,
  // so getFellBackToLocal() returns true (W5 banner renders).
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('no server');
    }),
  );
  await initAdapter();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DataPage (FND-02 / FND-03 UI)', () => {
  it('renders Export button', async () => {
    render(<DataPage />);
    expect(await screen.findByTestId('export-button')).toBeInTheDocument();
  });

  it('renders Import file picker', async () => {
    render(<DataPage />);
    expect(await screen.findByTestId('import-button')).toBeInTheDocument();
    expect(screen.getByTestId('import-file-input')).toBeInTheDocument();
  });

  it('shows current adapter kind ("Local (IndexedDB)")', async () => {
    render(<DataPage />);
    const adapter = await screen.findByTestId('adapter-kind');
    expect(adapter).toHaveTextContent('Local (IndexedDB)');
  });

  it('shows current schema version', async () => {
    render(<DataPage />);
    const v = await screen.findByTestId('schema-version');
    expect(v).toHaveTextContent(`v${CURRENT_VERSION}`);
  });

  it('shows "Never" empty-state for last-export', async () => {
    render(<DataPage />);
    const ts = await screen.findByTestId('last-export');
    expect(ts).toHaveTextContent('Never');
  });

  it('import on empty: single confirmation, then importAll fires', async () => {
    render(<DataPage />);
    const fileInput = await screen.findByTestId('import-file-input');
    const file = new File(
      [
        JSON.stringify({
          _v: CURRENT_VERSION,
          entities: [],
          accounts: [],
          allEntries: {},
          auditLogs: [],
        }),
      ],
      'test.json',
      { type: 'application/json' },
    );
    await waitFor(() => {
      // ensure existing-data probe completed (renders the "no existing data" copy)
      expect(screen.getByText(/No existing data/i)).toBeInTheDocument();
    });
    fireEvent.change(fileInput, { target: { files: [file] } });
    const confirm = await screen.findByTestId('confirm-import');
    // Empty instance: no REPLACE typing required; button is enabled immediately
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    await screen.findByTestId('import-success');
  });

  it('REPLACE confirmation required when existing data', async () => {
    // Pre-populate via adapter
    const { getAdapter } = await import('../../storage');
    const a = await getAdapter();
    await a.saveEntities([
      { _v: 2, id: 'e1', name: 'Existing', type: 'Company', status: 'Active' },
    ]);

    render(<DataPage />);
    await waitFor(() => {
      expect(screen.getByText(/REPLACE all current data/i)).toBeInTheDocument();
    });
    const fileInput = screen.getByTestId('import-file-input');
    const file = new File(
      [
        JSON.stringify({
          _v: CURRENT_VERSION,
          entities: [],
          accounts: [],
          allEntries: {},
          auditLogs: [],
        }),
      ],
      'test.json',
      { type: 'application/json' },
    );
    fireEvent.change(fileInput, { target: { files: [file] } });
    const confirmBtn = await screen.findByTestId('confirm-import');
    expect(confirmBtn).toBeDisabled();
    // Wrong text doesn't enable
    const txt = screen.getByTestId('confirm-text');
    fireEvent.change(txt, { target: { value: 'replace' } });
    expect(confirmBtn).toBeDisabled();
    // Correct uppercase text enables
    fireEvent.change(txt, { target: { value: 'REPLACE' } });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('shows MigrationError when import _v > CURRENT_VERSION', async () => {
    render(<DataPage />);
    const fileInput = await screen.findByTestId('import-file-input');
    const futureFile = new File(
      [
        JSON.stringify({
          _v: CURRENT_VERSION + 1,
          entities: [],
          accounts: [],
          allEntries: {},
          auditLogs: [],
        }),
      ],
      'future.json',
      { type: 'application/json' },
    );
    fireEvent.change(fileInput, { target: { files: [futureFile] } });
    const err = await screen.findByTestId('migration-error');
    expect(err.textContent).toMatch(/newer version/);
  });
});

describe('DataPage Phase 11 hardening UI (IDB-01/02/03/04/05)', () => {
  const SNOOZE_KEY = 'aussieledger:backup-nag-snoozed-until';
  // Snapshot the original navigator.storage descriptor so we can restore it
  // after tests that override it (preventing cross-suite leakage).
  const ORIGINAL_NAV_STORAGE = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(globalThis.navigator),
    'storage',
  );

  afterEach(() => {
    localStorage.removeItem(SNOOZE_KEY);
    sessionStorage.removeItem('aussieledger:ios-itp-banner-dismissed');
    // Restore navigator.storage — Object.defineProperty overrides leak across
    // tests and can cause App.beforeunload tests downstream to see the wrong
    // persist()/estimate() implementations.
    if (ORIGINAL_NAV_STORAGE) {
      Object.defineProperty(globalThis.navigator, 'storage', ORIGINAL_NAV_STORAGE);
    } else {
      // Property was added directly on the instance; delete it.
      delete (globalThis.navigator as unknown as Record<string, unknown>).storage;
    }
    vi.restoreAllMocks();
  });

  function mockEstimate(value: StorageEstimate | null | undefined): void {
    const stor = {
      estimate: vi.fn(async () => value),
      persist: vi.fn(async () => true),
      persisted: vi.fn(async () => true),
    };
    Object.defineProperty(globalThis.navigator, 'storage', {
      configurable: true,
      value: stor,
    });
  }

  it('Test 1 (IDB-02): renders quota line "~2.4 GB allocated · 47 MB used" when estimate present', async () => {
    mockEstimate({ quota: 2_400_000_000, usage: 47_000_000 });
    _resetAdapter();
    localStorage.setItem('storageMode', 'local');
    await initAdapter();
    localStorage.removeItem('storageMode');

    render(<DataPage />);
    const el = await screen.findByTestId('storage-quota');
    expect(el.textContent).toBe('~2.4 GB allocated · 47 MB used');
  });

  it('Test 2 (IDB-02): hides quota line when estimate is null', async () => {
    mockEstimate(null);
    _resetAdapter();
    localStorage.setItem('storageMode', 'local');
    await initAdapter();
    localStorage.removeItem('storageMode');

    render(<DataPage />);
    await screen.findByTestId('adapter-kind'); // wait for init
    expect(screen.queryByTestId('storage-quota')).toBeNull();
  });

  it('Test 3 (IDB-02): hides quota line when estimate is partial (quota undefined)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockEstimate({ usage: 47_000_000 } as any);
    _resetAdapter();
    localStorage.setItem('storageMode', 'local');
    await initAdapter();
    localStorage.removeItem('storageMode');

    render(<DataPage />);
    await screen.findByTestId('adapter-kind');
    expect(screen.queryByTestId('storage-quota')).toBeNull();
  });

  it('Test 4 (IDB-01): renders "Storage protected" when getPersistGranted=true', async () => {
    // Default beforeEach fall-back path init'd LocalAdapter; persist() returned true in setup
    // because the default mocked navigator.storage in test setup has persist() as undefined.
    // Force a fresh init with a navigator.storage that returns true.
    Object.defineProperty(globalThis.navigator, 'storage', {
      configurable: true,
      value: {
        persist: vi.fn(async () => true),
        estimate: vi.fn(async () => null),
      },
    });
    _resetAdapter();
    localStorage.setItem('storageMode', 'local');
    await initAdapter();
    localStorage.removeItem('storageMode');

    render(<DataPage />);
    const el = await screen.findByTestId('persist-status');
    expect(el.textContent).toBe('Storage protected');
  });

  it('Test 5 (IDB-01): renders "Storage not protected — back up regularly" when getPersistGranted=false', async () => {
    Object.defineProperty(globalThis.navigator, 'storage', {
      configurable: true,
      value: {
        persist: vi.fn(async () => false),
        estimate: vi.fn(async () => null),
      },
    });
    _resetAdapter();
    localStorage.setItem('storageMode', 'local');
    await initAdapter();
    localStorage.removeItem('storageMode');

    render(<DataPage />);
    const el = await screen.findByTestId('persist-status');
    expect(el.textContent).toBe('Storage not protected — back up regularly');
  });

  it('Test 6 (IDB-01): hides persist-status when API unsupported (null cached)', async () => {
    // Remove navigator.storage entirely → tryPersist caches null
    Object.defineProperty(globalThis.navigator, 'storage', {
      configurable: true,
      value: undefined,
    });
    _resetAdapter();
    localStorage.setItem('storageMode', 'local');
    await initAdapter();
    localStorage.removeItem('storageMode');

    render(<DataPage />);
    await screen.findByTestId('adapter-kind');
    expect(screen.queryByTestId('persist-status')).toBeNull();
  });

  it('Test 7 (IDB-04): mounts IosItpBanner under hosted-mode + iOS Safari + non-standalone gates', async () => {
    // Set up all 4 banner gates: isHostedMode=true; iOS Safari UA; matchMedia(standalone)=false; sessionStorage clear
    vi.spyOn(envModule, 'isHostedMode').mockReturnValue(true);
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: () => ({ matches: false, media: '', onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
    });
    sessionStorage.removeItem('aussieledger:ios-itp-banner-dismissed');

    _resetAdapter();
    localStorage.setItem('storageMode', 'local');
    await initAdapter();
    localStorage.removeItem('storageMode');

    render(<DataPage />);
    expect(await screen.findByTestId('ios-itp-banner')).toBeInTheDocument();
  });

  it('Test 8 (IDB-05): handleImport bumps lastWriteAt via explicit setLastWriteAt(nowIso())', async () => {
    _resetAdapter();
    localStorage.setItem('storageMode', 'local');
    await initAdapter();
    localStorage.removeItem('storageMode');

    const adapter = await getAdapter();
    const setLastWriteAtSpy = vi.spyOn(
      adapter as unknown as { setLastWriteAt: (iso: string) => Promise<void> },
      'setLastWriteAt',
    );

    render(<DataPage />);
    const fileInput = await screen.findByTestId('import-file-input');
    const file = new File(
      [
        JSON.stringify({
          _v: CURRENT_VERSION,
          entities: [],
          accounts: [],
          allEntries: {},
          auditLogs: [],
        }),
      ],
      'test.json',
      { type: 'application/json' },
    );
    await waitFor(() => {
      expect(screen.getByText(/No existing data/i)).toBeInTheDocument();
    });
    fireEvent.change(fileInput, { target: { files: [file] } });
    const confirm = await screen.findByTestId('confirm-import');
    fireEvent.click(confirm);
    await screen.findByTestId('import-success');

    expect(setLastWriteAtSpy).toHaveBeenCalledTimes(1);
    // The arg must be an ISO-8601 UTC string
    const arg = setLastWriteAtSpy.mock.calls[0][0];
    expect(typeof arg).toBe('string');
    expect(arg).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('Test 9 (IDB-03): handleExport clears the backup-nag snooze localStorage key', async () => {
    _resetAdapter();
    localStorage.setItem('storageMode', 'local');
    await initAdapter();
    localStorage.removeItem('storageMode');

    // Pre-populate a future snooze ISO
    localStorage.setItem(SNOOZE_KEY, '2030-01-01T00:00:00.000Z');

    // Stub URL.createObjectURL + revokeObjectURL (jsdom doesn't provide them)
    const createObjUrl = vi.fn(() => 'blob:fake');
    const revokeObjUrl = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjUrl });

    render(<DataPage />);
    const exportBtn = await screen.findByTestId('export-button');
    fireEvent.click(exportBtn);

    // Wait for the async export flow to complete
    await waitFor(() => {
      expect(localStorage.getItem(SNOOZE_KEY)).toBeNull();
    });
  });

  it('Test 10 (IDB-05 sanity): handleExport does NOT bump lastWriteAt', async () => {
    _resetAdapter();
    localStorage.setItem('storageMode', 'local');
    await initAdapter();
    localStorage.removeItem('storageMode');

    const adapter = await getAdapter();
    const setLastWriteAtSpy = vi.spyOn(
      adapter as unknown as { setLastWriteAt: (iso: string) => Promise<void> },
      'setLastWriteAt',
    );

    const createObjUrl = vi.fn(() => 'blob:fake');
    const revokeObjUrl = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjUrl });

    render(<DataPage />);
    const exportBtn = await screen.findByTestId('export-button');
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(screen.getByTestId('last-export').textContent).not.toBe('Never');
    });
    expect(setLastWriteAtSpy).not.toHaveBeenCalled();
  });
});

describe('AdapterFallbackBanner (W5)', () => {
  it('renders banner when probe attempted and fell back to local', async () => {
    // beforeEach already triggered fall-back via fetch=throw
    render(<AdapterFallbackBanner />);
    const banner = await screen.findByTestId('adapter-fallback-banner');
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toMatch(/Running on Local Browser Storage/);
  });

  it('banner is dismissible', async () => {
    render(<AdapterFallbackBanner />);
    const banner = await screen.findByTestId('adapter-fallback-banner');
    expect(banner).toBeInTheDocument();
    const dismiss = screen.getByTestId('adapter-fallback-dismiss');
    fireEvent.click(dismiss);
    await waitFor(() => {
      expect(
        screen.queryByTestId('adapter-fallback-banner'),
      ).not.toBeInTheDocument();
    });
  });

  it('does NOT render when storageMode override forced local (no probe attempted)', async () => {
    // Reset and force local via override (no probe = no fallback)
    _resetAdapter();
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
    render(<AdapterFallbackBanner />);
    expect(
      screen.queryByTestId('adapter-fallback-banner'),
    ).not.toBeInTheDocument();
  });
});
