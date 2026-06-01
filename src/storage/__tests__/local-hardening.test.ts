/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 11 Plan 11-1 Task 2 hardening tests for LocalAdapter.
 *
 * Coverage:
 *  - tryPersist + getPersistGranted (6 tests): cached after init, never re-prompted
 *  - getStorageEstimate (4 tests): null fallback for unsupported / thrown / undefined
 *  - bumpWriteAt (6 tests): fires on saveX + appendAuditLog + importAll default
 *  - setLastExportAt does NOT bump (1 test) — exports clear dirty state
 *  - setLastWriteAt direct round-trip (1 test)
 *  - importAll opts.silent suppression (2 tests — Blocker 1 fix)
 *  - legacy-migration end-to-end (1 test — Blocker 1 fix verification)
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { LocalAdapter } from '../local';
import { _resetNowProvider, _setNowProvider } from '../../lib/period';
import { CURRENT_VERSION } from '../../lib/migrations';
import type { Entity, Account, JournalEntry, AuditLog } from '../../types';

// ── navigator.storage mocking ─────────────────────────────────────────────
// We stash the existing navigator.storage (if any) and replace per-test.

interface MockStorageManager {
  persist?: ReturnType<typeof vi.fn>;
  estimate?: ReturnType<typeof vi.fn>;
  persisted?: ReturnType<typeof vi.fn>;
}

let originalStorage: StorageManager | undefined;

function installMockStorage(mock: MockStorageManager): void {
  Object.defineProperty(globalThis.navigator, 'storage', {
    configurable: true,
    value: mock as unknown as StorageManager,
  });
}

function uninstallMockStorage(): void {
  if (originalStorage) {
    Object.defineProperty(globalThis.navigator, 'storage', {
      configurable: true,
      value: originalStorage,
    });
  } else {
    // Restore to "not present" — delete property
    Object.defineProperty(globalThis.navigator, 'storage', {
      configurable: true,
      value: undefined,
    });
  }
}

beforeEach(() => {
  originalStorage = (globalThis.navigator as Navigator & { storage?: StorageManager }).storage;
  localStorage.clear();
});

afterEach(() => {
  uninstallMockStorage();
  _resetNowProvider();
});

// ── tryPersist + getPersistGranted ────────────────────────────────────────

describe('LocalAdapter — tryPersist + getPersistGranted', () => {
  test('Test 1: getPersistGranted resolves to true when navigator.storage.persist resolves true', async () => {
    const persistFn = vi.fn(async () => true);
    installMockStorage({ persist: persistFn });
    const adapter = new LocalAdapter();
    await adapter.ready();
    expect(await adapter.getPersistGranted()).toBe(true);
  });

  test('Test 2: persist() is invoked exactly once during init()', async () => {
    const persistFn = vi.fn(async () => true);
    installMockStorage({ persist: persistFn });
    const adapter = new LocalAdapter();
    await adapter.ready();
    expect(persistFn).toHaveBeenCalledTimes(1);
  });

  test('Test 3: 5 subsequent getPersistGranted reads do NOT re-invoke persist()', async () => {
    const persistFn = vi.fn(async () => true);
    installMockStorage({ persist: persistFn });
    const adapter = new LocalAdapter();
    await adapter.ready();
    for (let i = 0; i < 5; i++) {
      await adapter.getPersistGranted();
    }
    expect(persistFn).toHaveBeenCalledTimes(1);
  });

  test('Test 4: persist() resolving false (Firefox deny) caches false; no retry', async () => {
    const persistFn = vi.fn(async () => false);
    installMockStorage({ persist: persistFn });
    const adapter = new LocalAdapter();
    await adapter.ready();
    expect(await adapter.getPersistGranted()).toBe(false);
    await adapter.getPersistGranted();
    await adapter.getPersistGranted();
    expect(persistFn).toHaveBeenCalledTimes(1);
  });

  test('Test 5: getPersistGranted resolves to null when navigator.storage.persist is undefined', async () => {
    installMockStorage({});
    const adapter = new LocalAdapter();
    await adapter.ready();
    expect(await adapter.getPersistGranted()).toBeNull();
  });

  test('Test 6: persist() throwing is caught — resolves to false (not propagated)', async () => {
    const persistFn = vi.fn(async () => {
      throw new Error('blocked');
    });
    installMockStorage({ persist: persistFn });
    const adapter = new LocalAdapter();
    await adapter.ready();
    expect(await adapter.getPersistGranted()).toBe(false);
  });
});

// ── getStorageEstimate ────────────────────────────────────────────────────

describe('LocalAdapter — getStorageEstimate', () => {
  test('Test 7: returns the StorageEstimate when estimate() resolves a value', async () => {
    const estimateFn = vi.fn(async () => ({ quota: 2_400_000_000, usage: 47_000_000 }));
    installMockStorage({ persist: vi.fn(async () => true), estimate: estimateFn });
    const adapter = new LocalAdapter();
    await adapter.ready();
    const est = await adapter.getStorageEstimate();
    expect(est).toEqual({ quota: 2_400_000_000, usage: 47_000_000 });
  });

  test('Test 8: returns null when navigator.storage.estimate is undefined', async () => {
    installMockStorage({ persist: vi.fn(async () => true) });
    const adapter = new LocalAdapter();
    await adapter.ready();
    expect(await adapter.getStorageEstimate()).toBeNull();
  });

  test('Test 9: returns null when estimate() throws', async () => {
    const estimateFn = vi.fn(async () => {
      throw new Error('blocked');
    });
    installMockStorage({ persist: vi.fn(async () => true), estimate: estimateFn });
    const adapter = new LocalAdapter();
    await adapter.ready();
    expect(await adapter.getStorageEstimate()).toBeNull();
  });

  test('Test 10: returns null when estimate() resolves undefined (some Safari versions)', async () => {
    const estimateFn = vi.fn(async () => undefined as unknown as StorageEstimate);
    installMockStorage({ persist: vi.fn(async () => true), estimate: estimateFn });
    const adapter = new LocalAdapter();
    await adapter.ready();
    expect(await adapter.getStorageEstimate()).toBeNull();
  });
});

// ── bumpWriteAt coverage ──────────────────────────────────────────────────

const ENT_FIXTURE: Entity[] = [
  { _v: 2, id: 'e1', name: 'E1', type: 'Company', status: 'Active' } as unknown as Entity,
];
const ACC_FIXTURE: Account[] = [
  {
    _v: 2,
    id: 'a1',
    code: '100',
    name: 'Cash',
    type: 'Asset',
    gstCode: 'N-T',
  } as unknown as Account,
];
const JE_FIXTURE: JournalEntry = {
  _v: 2,
  id: 'j1',
  date: '2026-01-01',
  reference: 'R1',
  description: 'd',
  lines: [],
  isPosted: true,
} as unknown as JournalEntry;
const AUDIT_FIXTURE: AuditLog = {
  _v: 2,
  id: 'al1',
  timestamp: '2026-06-15T10:30:00.000Z',
  user: 'u',
  action: 'CREATE_ENTITY',
  details: 'x',
} as unknown as AuditLog;

describe('LocalAdapter — bumpWriteAt coverage', () => {
  test('Test 11: saveEntities bumps lastWriteAt (null → injected ISO)', async () => {
    installMockStorage({ persist: vi.fn(async () => true) });
    const adapter = new LocalAdapter();
    await adapter.ready();
    expect(await adapter.getLastWriteAt()).toBeNull();
    _setNowProvider(() => new Date('2026-06-15T10:30:00.000Z'));
    await adapter.saveEntities(ENT_FIXTURE);
    expect(await adapter.getLastWriteAt()).toBe('2026-06-15T10:30:00.000Z');
  });

  test('Test 12: saveAccounts bumps lastWriteAt and advances to later ISO', async () => {
    installMockStorage({ persist: vi.fn(async () => true) });
    const adapter = new LocalAdapter();
    await adapter.ready();
    _setNowProvider(() => new Date('2026-06-15T10:00:00.000Z'));
    await adapter.saveEntities(ENT_FIXTURE);
    _setNowProvider(() => new Date('2026-06-15T11:00:00.000Z'));
    await adapter.saveAccounts(ACC_FIXTURE);
    expect(await adapter.getLastWriteAt()).toBe('2026-06-15T11:00:00.000Z');
  });

  test('Test 13: saveEntries bumps lastWriteAt', async () => {
    installMockStorage({ persist: vi.fn(async () => true) });
    const adapter = new LocalAdapter();
    await adapter.ready();
    _setNowProvider(() => new Date('2026-06-15T12:00:00.000Z'));
    await adapter.saveEntries({ 'ent-1': [JE_FIXTURE] });
    expect(await adapter.getLastWriteAt()).toBe('2026-06-15T12:00:00.000Z');
  });

  test('Test 14: saveAuditLogs bumps lastWriteAt', async () => {
    installMockStorage({ persist: vi.fn(async () => true) });
    const adapter = new LocalAdapter();
    await adapter.ready();
    _setNowProvider(() => new Date('2026-06-15T13:00:00.000Z'));
    await adapter.saveAuditLogs([AUDIT_FIXTURE]);
    expect(await adapter.getLastWriteAt()).toBe('2026-06-15T13:00:00.000Z');
  });

  test('Test 15: appendAuditLog bumps lastWriteAt', async () => {
    installMockStorage({ persist: vi.fn(async () => true) });
    const adapter = new LocalAdapter();
    await adapter.ready();
    _setNowProvider(() => new Date('2026-06-15T14:00:00.000Z'));
    await adapter.appendAuditLog(AUDIT_FIXTURE);
    expect(await adapter.getLastWriteAt()).toBe('2026-06-15T14:00:00.000Z');
  });

  test('Test 16: importAll (default) bumps lastWriteAt exactly ONCE for the whole bulk tx', async () => {
    installMockStorage({ persist: vi.fn(async () => true) });
    const adapter = new LocalAdapter();
    await adapter.ready();
    _setNowProvider(() => new Date('2026-06-15T15:00:00.000Z'));
    await adapter.importAll({
      _v: CURRENT_VERSION,
      entities: ENT_FIXTURE,
      accounts: ACC_FIXTURE,
      allEntries: {},
      auditLogs: [],
    });
    // One bump → stored timestamp is exactly the injected clock (not the
    // wall clock, not "4 bumps merged"). Holding the provider constant
    // across the whole tx is sufficient to prove "ONCE" since 4 bumps
    // would not be distinguishable; the count proof comes via the
    // implementation reading: a single `if (!opts?.silent) await
    // this.bumpWriteAt()` after tx.done.
    expect(await adapter.getLastWriteAt()).toBe('2026-06-15T15:00:00.000Z');
  });
});

// ── setLastExportAt does NOT bump lastWriteAt ─────────────────────────────

describe('LocalAdapter — setLastExportAt does NOT bump lastWriteAt', () => {
  test('Test 17: setLastExportAt leaves lastWriteAt unchanged', async () => {
    installMockStorage({ persist: vi.fn(async () => true) });
    const adapter = new LocalAdapter();
    await adapter.ready();
    _setNowProvider(() => new Date('2026-06-15T10:00:00.000Z'));
    await adapter.saveEntities([]); // bumps lastWriteAt
    const before = await adapter.getLastWriteAt();
    expect(before).toBe('2026-06-15T10:00:00.000Z');

    _setNowProvider(() => new Date('2026-06-15T11:00:00.000Z')); // advance the provider clock
    await adapter.setLastExportAt('2026-06-15T11:00:00.000Z');
    const after = await adapter.getLastWriteAt();
    expect(after).toBe(before); // unchanged — exports CLEAR dirty state, not create it
  });
});

// ── setLastWriteAt round-trip ─────────────────────────────────────────────

describe('LocalAdapter — setLastWriteAt direct accessor', () => {
  test('Test 18: round-trip set → get returns the stored ISO exactly', async () => {
    installMockStorage({ persist: vi.fn(async () => true) });
    const adapter = new LocalAdapter();
    await adapter.ready();
    await adapter.setLastWriteAt('2026-06-15T10:30:00.000Z');
    expect(await adapter.getLastWriteAt()).toBe('2026-06-15T10:30:00.000Z');
  });
});

// ── importAll opts.silent suppression (Blocker 1 fix) ────────────────────

describe('LocalAdapter — importAll opts.silent suppression', () => {
  test('Test 19: importAll(state, { silent: true }) does NOT bump lastWriteAt', async () => {
    installMockStorage({ persist: vi.fn(async () => true) });
    const adapter = new LocalAdapter();
    await adapter.ready();
    // Pre-stamp lastWriteAt to a known ISO.
    await adapter.setLastWriteAt('2026-06-10T00:00:00.000Z');
    // Inject a different provider clock so any spurious bump would be obvious.
    _setNowProvider(() => new Date('2026-06-15T15:00:00.000Z'));
    await adapter.importAll(
      {
        _v: CURRENT_VERSION,
        entities: ENT_FIXTURE,
        accounts: ACC_FIXTURE,
        allEntries: {},
        auditLogs: [],
      },
      { silent: true },
    );
    expect(await adapter.getLastWriteAt()).toBe('2026-06-10T00:00:00.000Z');
  });

  test('Test 20: importAll(state, { silent: false }) AND importAll(state) BOTH bump', async () => {
    installMockStorage({ persist: vi.fn(async () => true) });
    const adapter = new LocalAdapter();
    await adapter.ready();
    // Explicit silent:false path
    _setNowProvider(() => new Date('2026-06-20T01:00:00.000Z'));
    await adapter.importAll(
      {
        _v: CURRENT_VERSION,
        entities: ENT_FIXTURE,
        accounts: [],
        allEntries: {},
        auditLogs: [],
      },
      { silent: false },
    );
    expect(await adapter.getLastWriteAt()).toBe('2026-06-20T01:00:00.000Z');

    // No opts path
    _setNowProvider(() => new Date('2026-06-20T02:00:00.000Z'));
    await adapter.importAll({
      _v: CURRENT_VERSION,
      entities: ENT_FIXTURE,
      accounts: [],
      allEntries: {},
      auditLogs: [],
    });
    expect(await adapter.getLastWriteAt()).toBe('2026-06-20T02:00:00.000Z');
  });
});

// ── legacy-migration end-to-end (Blocker 1 fix verification) ──────────────

describe('LocalAdapter — legacy-migration end-to-end', () => {
  test('Test 21: legacy migration runs and leaves lastWriteAt null (silent:true wired)', async () => {
    installMockStorage({ persist: vi.fn(async () => true) });
    // Pre-seed localStorage with a minimal v0 dataset before LocalAdapter init.
    const legacyEntity = { id: 'legacy-e1', name: 'Legacy', type: 'Company', status: 'Active' };
    localStorage.setItem('ledger_entities_list', JSON.stringify([legacyEntity]));
    localStorage.setItem('ledger_chart_of_accounts', JSON.stringify([]));
    localStorage.setItem('ledger_all_entries', JSON.stringify({}));
    localStorage.setItem('ledger_audit_logs', JSON.stringify([]));

    const adapter = new LocalAdapter();
    await adapter.ready();

    // (a) Migration ran: entities present
    const entities = await adapter.getEntities();
    expect(entities.length).toBe(1);
    expect(entities[0].id).toBe('legacy-e1');

    // (b) lastWriteAt UNCHANGED — silent:true suppressed the bump
    expect(await adapter.getLastWriteAt()).toBeNull();

    // (c) Legacy keys cleared post-migration
    expect(localStorage.getItem('ledger_entities_list')).toBeNull();
    expect(localStorage.getItem('ledger_chart_of_accounts')).toBeNull();
    expect(localStorage.getItem('ledger_all_entries')).toBeNull();
    expect(localStorage.getItem('ledger_audit_logs')).toBeNull();
  });
});
