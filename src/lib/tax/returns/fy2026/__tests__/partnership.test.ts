/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Plan 05-3 test scaffolds for computePartnershipReturn.
 * All tests are it.todo — Plan 05-3 flips them to full test bodies.
 */
import { describe, it } from 'vitest';
import { computePartnershipReturn } from '../partnership';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
void computePartnershipReturn;

describe('computePartnershipReturn', () => {
  it.todo('P1 P2 P8 from GL — gross income + deductions → net income');
  it.todo('per-partner distribution — 2 partners 50/50 split P8');
  it.todo('partnership loss flows through with explicit loss-share warning per partner');
  it.todo('partner share total not 100% emits warn anomaly');
  it.todo('locked FY anomaly present in meta');
});
