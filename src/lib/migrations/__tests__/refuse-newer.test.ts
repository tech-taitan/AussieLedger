/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { migrate, CURRENT_VERSION } from '../index';
import { LocalAdapter } from '../../../storage/local';

beforeEach(() => {
  localStorage.clear();
});

describe('Migration refuse-newer guard (FND-03)', () => {
  it('throws when _v > CURRENT_VERSION (refuses downgrade)', () => {
    const future: Record<string, unknown> = {
      _v: CURRENT_VERSION + 1,
      entities: [],
    };
    expect(() => migrate(future)).toThrow(/newer than the application version/);
  });

  it('caller (importAll) propagates the throw when migrating future _v', async () => {
    const a = new LocalAdapter();
    await a.ready();
    const future: Record<string, unknown> = { _v: CURRENT_VERSION + 1 };
    expect(() => migrate(future)).toThrow(/newer than the application version/);
  });
});
