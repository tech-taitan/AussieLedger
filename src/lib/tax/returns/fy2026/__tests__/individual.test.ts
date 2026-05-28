/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Plan 05-2 test scaffolds for computeIndividualReturn.
 * All tests are it.todo — Plan 05-2 flips them to full test bodies.
 */
import { describe, it } from 'vitest';
import { computeIndividualReturn } from '../individual';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
void computeIndividualReturn; // ensures import compiles

describe('computeIndividualReturn', () => {
  it.todo('P1 P2 P8 from GL — sole trader $50k revenue + $20k expenses → P1=50000, P2=20000, P8=30000');
  it.todo('item15 equals P8 — flow-through to main return');
  it.todo('LITO and Medicare applied — $30k taxable income → marginal $1888 + LITO $700 cap + Medicare $0');
  it.todo('small business offset eligible — $4M turnover + $30k SB income → offset > 0 capped at $1,000');
  it.todo('assumptions in meta — 5 assumed values present in anomalies');
  it.todo('locked FY surfaces anomaly — meta.locked true and anomaly with severity info');
  it.todo('empty entries returns zero labels and no anomalies');
});
