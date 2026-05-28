/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sidebar tests — PERS-01 (owner mode), UX-02 (anomaly count badges).
 * S.1–S.4 are placeholders (it.todo) until Plan 06-3 lands Sidebar widening.
 */
import { describe, it } from 'vitest';

describe('Sidebar (PERS-01 + UX-02 — Plan 06-3)', () => {
  it.todo(
    'Test S.1: owner mode with anomalyCounts={journals:3} — journals button subtree contains "3"',
  );

  it.todo(
    'Test S.2: owner mode with anomalyCounts={journals:0} — no bg-red-500 pill inside journals button',
  );

  it.todo(
    'Test S.3: mode="owner" — DOM does NOT contain a button labelled "Master Dashboard"',
  );

  it.todo(
    'Test S.4: mode="agent" — DOM contains "Clients" or "Master Dashboard" button',
  );
});
