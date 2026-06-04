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

  it('migrates the legacy 10-row demo (acc-NNNN ids) to the full FY2026 sole-trader spine on next visit', async () => {
    const a = new LocalAdapter(DB_NAME_DEMO);
    await a.ready();
    // Pre-populate with the pre-expansion 10-row fixture — same shape as
    // shipped before commit 7492f22 (entity + 10 acc-NNNN accounts + 15
    // journals referencing those ids).
    await a.saveEntities([
      { id: 'demo-entity-sole-trader-001', name: 'Demo Sole Trader (Sample Data)', type: 'SoleTrader', status: 'Active' },
    ]);
    await a.saveAccounts([
      { id: 'acc-1000', code: '1000', name: 'Cash at Bank',     type: 'Asset',     gstCode: 'N-T' },
      { id: 'acc-1100', code: '1100', name: 'Equipment',        type: 'Asset',     gstCode: 'CAP' },
      { id: 'acc-2000', code: '2000', name: 'GST Payable',      type: 'Liability', gstCode: 'N-T' },
      { id: 'acc-2100', code: '2100', name: 'Loans Payable',    type: 'Liability', gstCode: 'N-T' },
      { id: 'acc-3000', code: '3000', name: "Owner's Capital",  type: 'Equity',    gstCode: 'N-T' },
      { id: 'acc-3100', code: '3100', name: "Owner's Drawings", type: 'Equity',    gstCode: 'N-T' },
      { id: 'acc-4000', code: '4000', name: 'Sales Revenue',    type: 'Revenue',   gstCode: 'GST' },
      { id: 'acc-5000', code: '5000', name: 'Rent Expense',     type: 'Expense',   gstCode: 'GST' },
      { id: 'acc-5100', code: '5100', name: 'Utilities Expense', type: 'Expense',  gstCode: 'GST' },
      { id: 'acc-5200', code: '5200', name: 'Office Supplies',  type: 'Expense',   gstCode: 'GST' },
    ]);

    await seedDemoData(a);

    const accounts = await a.getAccounts();
    expect(accounts.length).toBeGreaterThanOrEqual(80);
    expect(accounts.some((acc) => acc.id.startsWith('coa-FY2026-'))).toBe(true);
    expect(accounts.some((acc) => acc.id.startsWith('acc-'))).toBe(false);

    const entries = await a.getEntries();
    const journals = entries['demo-entity-sole-trader-001'] ?? [];
    expect(journals).toHaveLength(15);
    // Journal lines reference the new FY2026 account ids.
    const allLineIds = new Set(journals.flatMap((j) => j.lines.map((l) => l.accountId)));
    for (const id of allLineIds) {
      expect(id.startsWith('coa-FY2026-')).toBe(true);
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
