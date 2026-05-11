/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalAdapter } from '../local';

beforeEach(() => {
  localStorage.clear();
});

describe('localStorage -> IndexedDB legacy migration', () => {
  it('reads ledger_entities_list and writes through to IDB', async () => {
    const legacy = [
      { _v: 1, id: 'e1', name: 'Legacy', type: 'Company', status: 'Active' },
    ];
    localStorage.setItem('ledger_entities_list', JSON.stringify(legacy));
    const a = new LocalAdapter();
    await a.ready();
    const loaded = await a.getEntities();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Legacy');
  });

  it('clears the four legacy keys after success', async () => {
    localStorage.setItem(
      'ledger_entities_list',
      JSON.stringify([
        { id: 'e1', name: 'Z', type: 'Company', status: 'Active' },
      ]),
    );
    localStorage.setItem('ledger_all_entries', JSON.stringify({}));
    localStorage.setItem('ledger_chart_of_accounts', JSON.stringify([]));
    localStorage.setItem('ledger_audit_logs', JSON.stringify([]));
    const a = new LocalAdapter();
    await a.ready();
    expect(localStorage.getItem('ledger_entities_list')).toBeNull();
    expect(localStorage.getItem('ledger_all_entries')).toBeNull();
    expect(localStorage.getItem('ledger_chart_of_accounts')).toBeNull();
    expect(localStorage.getItem('ledger_audit_logs')).toBeNull();
  });

  it('preserves on failure: parse error leaves localStorage untouched', async () => {
    localStorage.setItem('ledger_entities_list', '{not valid json');
    localStorage.setItem('ledger_audit_logs', JSON.stringify([]));
    let threw = false;
    try {
      const a = new LocalAdapter();
      await a.ready();
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(localStorage.getItem('ledger_entities_list')).toBe('{not valid json');
    expect(localStorage.getItem('ledger_audit_logs')).not.toBeNull();
  });

  it('no-op when localStorage empty', async () => {
    const a = new LocalAdapter();
    await a.ready();
    expect(await a.getEntities()).toEqual([]);
  });

  it('no-op when IndexedDB already populated', async () => {
    const a1 = new LocalAdapter();
    await a1.ready();
    await a1.saveEntities([
      { _v: 2, id: 'e1', name: 'Already', type: 'Company', status: 'Active' },
    ]);
    localStorage.setItem(
      'ledger_entities_list',
      JSON.stringify([
        { id: 'OTHER', name: 'Other', type: 'Trust', status: 'Active' },
      ]),
    );
    const a2 = new LocalAdapter();
    await a2.ready();
    const loaded = await a2.getEntities();
    expect(loaded[0].name).toBe('Already');
    expect(localStorage.getItem('ledger_entities_list')).toBeNull();
  });
});
