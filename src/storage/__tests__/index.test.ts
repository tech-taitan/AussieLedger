/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';
// Phase 3 Plan 03-2 / 03-3 will implement `initAdapter()` / `getAdapter()`.
// import { initAdapter, getAdapter, getAdapterKind } from '../index';

describe('Adapter selection probe', () => {
  it.todo('selects server on health 200');
  it.todo('falls back to local');
  it.todo('honors storageMode override');
  it.todo('memoises adapter promise across calls');
  it.todo('stashes /api/health aiEnabled flag for IS_AI_ENABLED');
  it.todo('records fallback-occurred flag when probe was attempted and exhausted');
});
