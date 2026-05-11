/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { migrate, CURRENT_VERSION } from '../index';

describe('Migration refuse-newer guard (FND-03)', () => {
  // This test CAN run today — migrate() already throws on newer _v.
  it('throws when _v > CURRENT_VERSION (refuses downgrade)', () => {
    const future: Record<string, unknown> = { _v: CURRENT_VERSION + 1, entities: [] };
    expect(() => migrate(future)).toThrow(/newer than the application version/);
  });

  it.todo('import flow renders MigrationError component when refuse-newer fires');
});
