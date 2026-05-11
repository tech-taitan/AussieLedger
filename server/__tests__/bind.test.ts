/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, afterEach } from 'vitest';
import { loadEnv } from '../env';

describe('Express bind security default (DEP-02)', () => {
  const origHost = process.env.HOST;
  const origPort = process.env.PORT;
  afterEach(() => {
    process.env.HOST = origHost;
    process.env.PORT = origPort;
  });

  it('binds to 127.0.0.1 by default (HOST env var unset)', () => {
    delete process.env.HOST;
    const env = loadEnv();
    expect(env.host).toBe('127.0.0.1');
  });

  it('binds to 0.0.0.0 only when HOST=0.0.0.0 explicit', () => {
    process.env.HOST = '0.0.0.0';
    const env = loadEnv();
    expect(env.host).toBe('0.0.0.0');
  });

  it('uses PORT env var when set, else 4000', () => {
    delete process.env.PORT;
    expect(loadEnv().port).toBe(4000);
    process.env.PORT = '5050';
    expect(loadEnv().port).toBe(5050);
  });
});
