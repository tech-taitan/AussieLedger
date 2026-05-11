/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, afterEach } from 'vitest';
import { buildApp } from '../../app';

describe('GET /api/health', () => {
  const origKey = process.env.GEMINI_API_KEY;
  afterEach(() => { process.env.GEMINI_API_KEY = origKey; });

  it('returns { ok: true, version: 2, aiEnabled: boolean }', async () => {
    process.env.DB_PATH = ':memory:';
    delete process.env.GEMINI_API_KEY;
    const { app } = buildApp();
    const server = app.listen(0);
    try {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ ok: true, version: 2, aiEnabled: false });
    } finally { server.close(); }
  });

  it('aiEnabled = true when GEMINI_API_KEY set and not placeholder', async () => {
    process.env.DB_PATH = ':memory:';
    process.env.GEMINI_API_KEY = 'real-key-here';
    const { app } = buildApp();
    const server = app.listen(0);
    try {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      const body = await res.json();
      expect(body.aiEnabled).toBe(true);
    } finally { server.close(); }
  });

  it('aiEnabled = false when key is placeholder MY_GEMINI_API_KEY', async () => {
    process.env.DB_PATH = ':memory:';
    process.env.GEMINI_API_KEY = 'MY_GEMINI_API_KEY';
    const { app } = buildApp();
    const server = app.listen(0);
    try {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      const body = await res.json();
      expect(body.aiEnabled).toBe(false);
    } finally { server.close(); }
  });
});
