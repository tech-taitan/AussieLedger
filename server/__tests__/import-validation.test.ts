/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { buildApp } from '../app';

describe('POST /api/import Zod validation (FND-03)', () => {
  it('rejects malformed body with 400', async () => {
    process.env.DB_PATH = ':memory:';
    const { app } = buildApp();
    const server = app.listen(0);
    try {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      const res = await fetch(`http://127.0.0.1:${port}/api/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totally: 'wrong shape' }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(['validation', 'migration', 'migration-newer']).toContain(body.error);
    } finally {
      server.close();
    }
  });

  it('accepts valid PersistedRoot', async () => {
    process.env.DB_PATH = ':memory:';
    const { app } = buildApp();
    const server = app.listen(0);
    try {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      const res = await fetch(`http://127.0.0.1:${port}/api/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _v: 2, entities: [], accounts: [], allEntries: {}, auditLogs: [],
        }),
      });
      expect(res.status).toBe(200);
    } finally {
      server.close();
    }
  });

  it('refuses _v > CURRENT_VERSION with 400', async () => {
    process.env.DB_PATH = ':memory:';
    const { app } = buildApp();
    const server = app.listen(0);
    try {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      const res = await fetch(`http://127.0.0.1:${port}/api/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _v: 999, entities: [], accounts: [], allEntries: {}, auditLogs: [],
        }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('migration-newer');
    } finally {
      server.close();
    }
  });
});
