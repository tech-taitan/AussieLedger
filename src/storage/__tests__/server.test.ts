/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ServerAdapter } from '../server';
import { AdapterUnreachableError, AdapterValidationError } from '../adapter';
import type { Entity, AuditLog } from '../../types';

afterEach(() => { vi.unstubAllGlobals(); });

describe('ServerAdapter (HTTP)', () => {
  it('getEntities issues GET /api/entities and parses JSON', async () => {
    const ent: Entity = { _v: 2, id: 'e1', name: 'X', type: 'Company', status: 'Active' };
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify([ent]), { status: 200 })));
    const a = new ServerAdapter();
    expect(await a.getEntities()).toEqual([ent]);
  });

  it('saveEntities issues PUT /api/entities with JSON body', async () => {
    const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const a = new ServerAdapter();
    await a.saveEntities([{ _v: 2, id: 'e1', name: 'X', type: 'Company', status: 'Active' }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/entities', expect.objectContaining({
      method: 'PUT',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
  });

  it('appendAuditLog issues POST /api/audit', async () => {
    const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const a = new ServerAdapter();
    await a.appendAuditLog({ _v: 2, id: 'a1', timestamp: '2026-01-01T00:00:00Z', user: 'u', action: 'CREATE_ENTITY', details: 'd' });
    expect(fetchMock).toHaveBeenCalledWith('/api/audit', expect.objectContaining({ method: 'POST' }));
  });

  it('saveAuditLogs issues PUT /api/audit', async () => {
    const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const a = new ServerAdapter();
    const logs: AuditLog[] = [{ _v: 2, id: 'a1', timestamp: '2026-01-01T00:00:00Z', user: 'u', action: 'CREATE_ENTITY', details: 'd' }];
    await a.saveAuditLogs(logs);
    expect(fetchMock).toHaveBeenCalledWith('/api/audit', expect.objectContaining({ method: 'PUT' }));
  });

  it('exportAll issues GET /api/export', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ _v: 2, entities: [], accounts: [], allEntries: {}, auditLogs: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const a = new ServerAdapter();
    const result = await a.exportAll();
    expect(result._v).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith('/api/export');
  });

  it('importAll issues POST /api/import', async () => {
    const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const a = new ServerAdapter();
    await a.importAll({ _v: 2, entities: [], accounts: [], allEntries: {}, auditLogs: [] });
    expect(fetchMock).toHaveBeenCalledWith('/api/import', expect.objectContaining({ method: 'POST' }));
  });

  it('throws AdapterUnreachableError on 500', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));
    const a = new ServerAdapter();
    await expect(a.getEntities()).rejects.toBeInstanceOf(AdapterUnreachableError);
  });

  it('throws AdapterValidationError on 400', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"validation"}', { status: 400 })));
    const a = new ServerAdapter();
    await expect(a.saveEntities([])).rejects.toBeInstanceOf(AdapterValidationError);
  });

  it('getEntries deserialises decimal-as-string TEXT values via money.ts (W1 boundary)', async () => {
    // Server returns debit/credit/taxAmount as strings ("12.34500" preserves Decimal precision).
    // ServerAdapter must call deserialize() so the returned JournalLine has numbers.
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      'ent-1': [{
        _v: 2,
        id: 'j1', date: '2026-01-01', reference: 'R1', description: 'd', isPosted: true,
        lines: [{
          _v: 2,
          accountId: 'acc-1', description: 'l',
          debit: '100.50000', credit: '0.00000', taxAmount: '10.05000',
          isManualTax: undefined,
        }],
      }],
    }), { status: 200 })));
    const a = new ServerAdapter();
    const result = await a.getEntries();
    const line = result['ent-1'][0].lines[0];
    // After deserialize, the values must be numbers (not strings).
    expect(typeof line.debit).toBe('number');
    expect(typeof line.credit).toBe('number');
    expect(typeof line.taxAmount).toBe('number');
    expect(line.debit).toBeCloseTo(100.5, 4);
    expect(line.taxAmount).toBeCloseTo(10.05, 4);
  });
});
