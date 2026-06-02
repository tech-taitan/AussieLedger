/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PITFALLS §4 HARD-BLOCK — Phase 14 Plan 14-1 Task 4.
 *
 * Demo data leak prevention is a HARD-BLOCK invariant: writing to the demo
 * adapter MUST NEVER contaminate the production 'aussieledger' IDB database,
 * and vice-versa. This file proves the contract is executable-testable.
 *
 * Why this works (W3C IndexedDB + fake-indexeddb): IDB databases are scoped
 * by the (origin, dbName) tuple. Two LocalAdapter instances with different
 * dbName strings open distinct in-memory stores under fake-indexeddb (matching
 * real-browser behaviour). Writes to one are completely invisible to the other.
 *
 * setup.ts provisions a fresh IDBFactory per test so each test starts from
 * a clean slate (no cross-test residue).
 */
import { describe, it, expect } from 'vitest';
import { LocalAdapter, DB_NAME_PROD, DB_NAME_DEMO } from '../local';
import { seedDemoData } from '../demo-seed';
import type { Entity } from '../../types';

const PROD_SENTINEL: Entity = {
  _v: 6,
  id: 'prod-sentinel-001',
  name: 'Real User Entity',
  type: 'Company',
  status: 'Active',
};

const NEW_DEMO_ENTITY: Entity = {
  _v: 6,
  id: 'new-demo-entity-test',
  name: 'New demo write',
  type: 'SoleTrader',
  status: 'Active',
};

describe('PITFALLS §4 HARD-BLOCK: demo data leak prevention', () => {
  it('Test 1: prod-then-demo — writing prod sentinel then seeding demo leaves prod unchanged', async () => {
    // 1. Write a sentinel to prod
    const prod = new LocalAdapter(DB_NAME_PROD);
    await prod.ready();
    await prod.saveEntities([PROD_SENTINEL]);

    // 2. Construct demo adapter and call seedDemoData
    const demo = new LocalAdapter(DB_NAME_DEMO);
    await demo.ready();
    await seedDemoData(demo);

    // 3. Re-open prod — it must still have ONLY the sentinel (no demo leak)
    const prodReopen = new LocalAdapter(DB_NAME_PROD);
    await prodReopen.ready();
    const prodEntities = await prodReopen.getEntities();
    expect(prodEntities).toEqual([PROD_SENTINEL]);
  });

  it('Test 2: demo-then-prod — seeding demo then opening fresh prod yields zero entities', async () => {
    // 1. Seed demo data
    const demo = new LocalAdapter(DB_NAME_DEMO);
    await demo.ready();
    await seedDemoData(demo);

    // 2. Open a fresh prod adapter — must be empty (no contamination from demo writes)
    const prod = new LocalAdapter(DB_NAME_PROD);
    await prod.ready();
    const prodEntities = await prod.getEntities();
    expect(prodEntities).toEqual([]);
  });

  it('Test 3: same-session both adapters — demo write invisible to prod adapter', async () => {
    // Both adapters live in the same session
    const prod = new LocalAdapter(DB_NAME_PROD);
    const demo = new LocalAdapter(DB_NAME_DEMO);
    await prod.ready();
    await demo.ready();

    // Write a new entity ONLY to demo
    await demo.saveEntities([NEW_DEMO_ENTITY]);

    // Read from prod — must NOT see NEW_DEMO_ENTITY
    const prodEntities = await prod.getEntities();
    expect(prodEntities.find((e) => e.id === NEW_DEMO_ENTITY.id)).toBeUndefined();
    expect(prodEntities).toEqual([]);

    // Sanity: demo really did get the write
    const demoEntities = await demo.getEntities();
    expect(demoEntities).toEqual([NEW_DEMO_ENTITY]);
  });
});
