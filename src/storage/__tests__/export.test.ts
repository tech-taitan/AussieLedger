/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalAdapter } from '../local';
import { CURRENT_VERSION } from '../../lib/migrations';

beforeEach(() => {
  localStorage.clear();
});

describe('Export shape (FND-02 JSON)', () => {
  it('returns { _v, entities, accounts, allEntries, auditLogs }', async () => {
    const a = new LocalAdapter();
    await a.ready();
    const exp = await a.exportAll();
    expect(Object.keys(exp).sort()).toEqual([
      '_v',
      'accounts',
      'allEntries',
      'auditLogs',
      'entities',
    ]);
  });

  it('_v matches CURRENT_VERSION', async () => {
    const a = new LocalAdapter();
    await a.ready();
    expect((await a.exportAll())._v).toBe(CURRENT_VERSION);
  });
});
