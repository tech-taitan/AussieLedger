/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * initAdapter pathname dispatch — Phase 14 Plan 14-1 Task 4.
 *
 * Verifies that initAdapter() reads getRouteKind() on the LocalAdapter
 * branches and selects the correct DB_NAME:
 *   - pathname='/'       → DB_NAME_PROD (production)
 *   - pathname='/demo'   → DB_NAME_DEMO + seedDemoData() called once
 *   - pathname='/privacy' → DB_NAME_PROD (privacy is view-only; storage
 *     stays prod)
 *
 * Uses vi.stubGlobal('location', { ...window.location, pathname: ... })
 * to drive the routing branch and _resetAdapter() to clear the memoised
 * adapterPromise between tests. localStorage.storageMode='local' forces
 * the LocalAdapter branch (avoids needing to mock probeServer fetch).
 *
 * The LocalAdapter#getDbName() duck-typed accessor (Plan 14-1 Task 2)
 * is the test seam — assert directly on the constructed adapter's DB
 * name rather than relying on fake-indexeddb's databases() API.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initAdapter, _resetAdapter } from '../index';
import { DB_NAME_PROD, DB_NAME_DEMO, type LocalAdapter } from '../local';

function asLocalAdapter(a: unknown): LocalAdapter {
  return a as LocalAdapter;
}

describe('initAdapter() — pathname-based DB dispatch', () => {
  beforeEach(() => {
    _resetAdapter();
    localStorage.clear();
    // Force the LocalAdapter branch so the probe is bypassed.
    localStorage.setItem('storageMode', 'local');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    _resetAdapter();
    localStorage.clear();
  });

  it('pathname="/" → LocalAdapter constructed against DB_NAME_PROD', async () => {
    vi.stubGlobal('location', { ...window.location, pathname: '/' });
    const adapter = await initAdapter();
    const local = asLocalAdapter(adapter);
    expect(local.getDbName()).toBe(DB_NAME_PROD);
    // No entities — production starts empty
    const entities = await adapter.getEntities();
    expect(entities).toEqual([]);
  });

  it('pathname="/demo" → LocalAdapter constructed against DB_NAME_DEMO and seedDemoData ran', async () => {
    vi.stubGlobal('location', { ...window.location, pathname: '/demo' });
    const adapter = await initAdapter();
    const local = asLocalAdapter(adapter);
    expect(local.getDbName()).toBe(DB_NAME_DEMO);
    // seedDemoData should have populated the demo entity immediately after init
    const entities = await adapter.getEntities();
    expect(entities).toHaveLength(1);
    expect(entities[0].type).toBe('SoleTrader');
    expect(entities[0].name).toMatch(/demo/i);
  });

  it('pathname="/privacy" → LocalAdapter constructed against DB_NAME_PROD (privacy is view-only)', async () => {
    vi.stubGlobal('location', { ...window.location, pathname: '/privacy' });
    const adapter = await initAdapter();
    const local = asLocalAdapter(adapter);
    expect(local.getDbName()).toBe(DB_NAME_PROD);
    // Production starts empty — privacy view must NOT seed demo data
    const entities = await adapter.getEntities();
    expect(entities).toEqual([]);
  });
});
