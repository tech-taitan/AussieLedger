/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Demo seed shape + idempotence — Phase 14 Plan 14-1 Task 3.
 *
 * Verifies seedDemoData(adapter):
 *   1. Populates 1 sole-trader entity + non-empty COA + ~15 FY2025-26
 *      journals on a fresh demo adapter
 *   2. All journals are balanced (sum DR === sum CR per entry, within
 *      0.005 decimal tolerance — matches existing JournalsView pattern)
 *   3. Calling seedDemoData() a second time is a no-op (idempotent guard
 *      protects user mid-exploration from being overwritten)
 *
 * setup.ts provisions a fresh IDBFactory per test, so each test starts
 * with an empty demo DB.
 */
import { describe, it, expect } from 'vitest';
import { LocalAdapter, DB_NAME_DEMO } from '../local';
import { seedDemoData } from '../demo-seed';

const FY_START = '2025-07-01';
const FY_END = '2026-06-30';
const TOLERANCE = 0.005;

describe('seedDemoData()', () => {
  it('populates 1 sole-trader entity + non-empty COA + ~15 FY2025-26 journals on a fresh demo adapter', async () => {
    const a = new LocalAdapter(DB_NAME_DEMO);
    await a.ready();
    await seedDemoData(a);

    const entities = await a.getEntities();
    expect(entities).toHaveLength(1);
    expect(entities[0].name).toMatch(/demo/i);
    expect(entities[0].type).toBe('SoleTrader');

    const accounts = await a.getAccounts();
    expect(accounts.length).toBeGreaterThanOrEqual(10);
    const types = new Set(accounts.map((acc) => acc.type));
    expect(types.has('Asset')).toBe(true);
    expect(types.has('Liability')).toBe(true);
    expect(types.has('Equity')).toBe(true);
    expect(types.has('Revenue')).toBe(true);
    expect(types.has('Expense')).toBe(true);

    const entriesByEntity = await a.getEntries();
    const entityId = entities[0].id;
    const journals = entriesByEntity[entityId] ?? [];
    expect(journals).toHaveLength(15);
    for (const j of journals) {
      expect(j.date >= FY_START).toBe(true);
      expect(j.date <= FY_END).toBe(true);
    }
  });

  it('every seeded journal entry is balanced (sum of debits === sum of credits within tolerance)', async () => {
    const a = new LocalAdapter(DB_NAME_DEMO);
    await a.ready();
    await seedDemoData(a);

    const entries = await a.getEntries();
    const entities = await a.getEntities();
    const entityId = entities[0].id;
    const journals = entries[entityId] ?? [];

    for (const j of journals) {
      const sumDr = j.lines.reduce((acc, l) => acc + Number(l.debit ?? 0), 0);
      const sumCr = j.lines.reduce((acc, l) => acc + Number(l.credit ?? 0), 0);
      expect(Math.abs(sumDr - sumCr)).toBeLessThan(TOLERANCE);
    }
  });

  it('is idempotent — second call when entities already exist is a no-op', async () => {
    const a = new LocalAdapter(DB_NAME_DEMO);
    await a.ready();
    await seedDemoData(a);

    const firstEntities = await a.getEntities();
    const firstAccounts = await a.getAccounts();
    const firstEntries = await a.getEntries();
    const entityId = firstEntities[0].id;
    const firstJournalCount = (firstEntries[entityId] ?? []).length;

    // Second call must NOT add duplicates
    await seedDemoData(a);

    const secondEntities = await a.getEntities();
    const secondAccounts = await a.getAccounts();
    const secondEntries = await a.getEntries();

    expect(secondEntities).toHaveLength(firstEntities.length);
    expect(secondAccounts).toHaveLength(firstAccounts.length);
    expect((secondEntries[entityId] ?? []).length).toBe(firstJournalCount);
  });
});
