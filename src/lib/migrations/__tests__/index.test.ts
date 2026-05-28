/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { CURRENT_VERSION } from '../index';

describe('migrations index', () => {
  it('CURRENT_VERSION is 4', () => {
    expect(CURRENT_VERSION).toBe(4);
  });
});
