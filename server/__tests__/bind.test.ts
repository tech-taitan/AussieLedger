/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';

describe('Express bind security default (DEP-02)', () => {
  it.todo('binds to 127.0.0.1 by default (HOST env var unset)');
  it.todo('binds to 0.0.0.0 only when HOST=0.0.0.0 explicit');
  it.todo('uses PORT env var when set, else 4000');
});
