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
import { initAdapter, _resetAdapter } from '../../storage';
import { CURRENT_VERSION } from '../../lib/migrations';

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

describe('AdapterFallbackBanner (W5)', () => {
  it('renders banner when probe attempted and fell back to local', async () => {
    // beforeEach already triggered fall-back via fetch=throw
    render(<AdapterFallbackBanner />);
    const banner = await screen.findByTestId('adapter-fallback-banner');
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toMatch(/Server unreachable/);
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
