/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LocalAdapter DB-name selection — Phase 14 Plan 14-1 Task 2.
 *
 * Verifies the widened constructor:
 *   - new LocalAdapter()              → opens DB_NAME_PROD ('aussieledger')
 *   - new LocalAdapter(DB_NAME_PROD)  → same as above (explicit)
 *   - new LocalAdapter(DB_NAME_DEMO)  → opens DB_NAME_DEMO ('aussieledger-demo')
 *
 * fake-indexeddb scopes its in-memory store by DB-name string, matching
 * real-browser IDB DB-name scoping per W3C IndexedDB. Writing a sentinel
 * to one DB and reading from the other proves the namespaces are isolated.
 *
 * setup.ts already provisions a fresh IDBFactory per test (beforeEach),
 * so each test starts from a clean slate.
 */
import { describe, it, expect } from 'vitest';
import { LocalAdapter, DB_NAME_PROD, DB_NAME_DEMO } from '../local';
import type { Entity } from '../../types';

const PROD_SENTINEL: Entity = {
  _v: 6,
  id: 'prod-sentinel-001',
  name: 'Production Sentinel',
  type: 'Company',
  status: 'Active',
};

const DEMO_SENTINEL: Entity = {
  _v: 6,
  id: 'demo-sentinel-001',
  name: 'Demo Sentinel',
  type: 'SoleTrader',
  status: 'Active',
};

describe('LocalAdapter constructor — DB_NAME widening', () => {
  it('exposes DB_NAME_PROD = "aussieledger" and DB_NAME_DEMO = "aussieledger-demo"', () => {
    expect(DB_NAME_PROD).toBe('aussieledger');
    expect(DB_NAME_DEMO).toBe('aussieledger-demo');
  });

  it('new LocalAdapter() (no args) and new LocalAdapter(DB_NAME_PROD) share the same DB', async () => {
    const a1 = new LocalAdapter();
    await a1.ready();
    await a1.saveEntities([PROD_SENTINEL]);

    // Explicit-arg construct should see the same DB content
    const a2 = new LocalAdapter(DB_NAME_PROD);
    await a2.ready();
    const got = await a2.getEntities();
    expect(got).toEqual([PROD_SENTINEL]);
  });

  it('new LocalAdapter(DB_NAME_DEMO) opens an isolated DB — no leak to default', async () => {
    // Write demo sentinel to the demo DB
    const demo = new LocalAdapter(DB_NAME_DEMO);
    await demo.ready();
    await demo.saveEntities([DEMO_SENTINEL]);

    // Fresh default-constructed adapter must NOT see the demo sentinel
    const prod = new LocalAdapter();
    await prod.ready();
    const prodEntities = await prod.getEntities();
    expect(prodEntities).toEqual([]);

    // And confirm the demo DB still has the sentinel
    const demo2 = new LocalAdapter(DB_NAME_DEMO);
    await demo2.ready();
    const demoEntities = await demo2.getEntities();
    expect(demoEntities).toEqual([DEMO_SENTINEL]);
  });
});
