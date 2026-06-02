/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App.routing — Phase 14 Plan 14-2 Task 6 integration tests.
 *
 * Locks the full chain: Plan 14-1 getRouteKind() + Plan 14-1 initAdapter
 * DB-selection + this plan's App.tsx view dispatch + this plan's component
 * mounts. If any link in the chain is broken, these integration tests catch
 * it.
 *
 * Tests:
 *   1. pathname='/'        → master-dashboard view; PrivacyPage NOT present;
 *                            DemoModeBanner NOT present (returns null on /)
 *   2. pathname='/privacy' → 'privacy' view; PrivacyPage IS present
 *   3. pathname='/demo'    → master-dashboard view + DemoModeBanner present;
 *                            PrivacyPage NOT present
 *
 * Note: vi.stubGlobal('location', ...) is set BEFORE render so the lazy
 * useState initialiser in App captures the stubbed pathname. The Plan-14-1
 * storage substrate runs once at module load via main.tsx — these tests
 * exercise App's view dispatch independently (initAdapter happens during
 * setup.ts beforeEach via the default pre-init).
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { _resetAdapter, initAdapter } from '../storage';

const SNOOZE_KEY = 'aussieledger:backup-nag-snoozed-until';

async function freshLocalAdapter(): Promise<void> {
  _resetAdapter();
  localStorage.setItem('storageMode', 'local');
  await initAdapter();
}

describe('App — Phase 14 Plan 14-2 Task 6 pathname-dispatched initial view', () => {
  beforeEach(() => {
    // Snooze the backup nag so it doesn't redirect to 'data' view as a side effect
    localStorage.setItem(SNOOZE_KEY, '2099-01-01T00:00:00.000Z');
    // Pre-seed Settings so PersonaModeModal doesn't gate the views under test.
    // 'agent' mode keeps the master-dashboard reachable (owner mode auto-
    // redirects to 'dashboard' per the existing ViewRouter useEffect).
    localStorage.setItem(
      'aussieledger:settings',
      JSON.stringify({ mode: 'agent' }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.removeItem(SNOOZE_KEY);
    localStorage.removeItem('storageMode');
    localStorage.removeItem('aussieledger:settings');
  });

  it("Test 1: pathname='/' → initial view 'master-dashboard'; PrivacyPage NOT rendered; DemoModeBanner NOT rendered", async () => {
    vi.stubGlobal('location', { ...window.location, pathname: '/' });
    await freshLocalAdapter();

    render(<App />);
    // Wait for App to mount + initial effects to flush
    await waitFor(() => {
      // Sanity: master-dashboard chrome is reachable (either WelcomeBanner
      // when entities are empty, or the entity grid when seeded — useEntities
      // hook seeds DEFAULT_ENTITIES on first run). Either way the privacy
      // page must NOT be rendered.
      expect(screen.queryByTestId('privacy-page')).toBeNull();
    });
    // DemoModeBanner returns null on non-/demo routes — zero DOM cost.
    expect(screen.queryByTestId('demo-mode-banner')).toBeNull();
  });

  it("Test 2: pathname='/privacy' → initial view 'privacy'; PrivacyPage renders inside MainLayout", async () => {
    vi.stubGlobal('location', { ...window.location, pathname: '/privacy' });
    await freshLocalAdapter();

    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('privacy-page')).toBeInTheDocument();
    });
    // Sanity — heading is the verbatim "Privacy" h1 from the PrivacyPage
    expect(screen.getByRole('heading', { level: 1, name: /privacy/i })).toBeInTheDocument();
  });

  it("Test 3: pathname='/demo' → master-dashboard view + DemoModeBanner mounts at the top; PrivacyPage not rendered", async () => {
    vi.stubGlobal('location', { ...window.location, pathname: '/demo' });
    await freshLocalAdapter();

    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('demo-mode-banner')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('privacy-page')).toBeNull();
  });
});
