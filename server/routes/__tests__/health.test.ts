/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';

describe('GET /api/health (DEP-02 + AI proxy)', () => {
  it.todo('returns { ok: true, version: 2, aiEnabled: boolean }');
  it.todo('aiEnabled = true when GEMINI_API_KEY set and not MY_GEMINI_API_KEY');
  it.todo('aiEnabled = false when key unset');
  it.todo('aiEnabled = false when key is placeholder MY_GEMINI_API_KEY');
});
