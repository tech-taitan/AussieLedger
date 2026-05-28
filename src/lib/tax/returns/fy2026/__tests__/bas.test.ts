/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Plan 05-4 test scaffolds for computeBas.
 * All tests are it.todo — Plan 05-4 flips them to full test bodies.
 */
import { describe, it } from 'vitest';
import { computeBas } from '../bas';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
void computeBas;

describe('computeBas', () => {
  it.todo('G1 1A from GL — $11,000 GST-inclusive sale → G1=$11,000, 1A=$1,000 (success criterion #1)');
  it.todo('G10 G11 1B from GL — capital + non-capital purchases → ITC computed');
  it.todo('W1 W2 from GL — wages account + PAYG-withholding account → correct W labels');
  it.todo('T7 from entity.paygInstalmentAmount override');
  it.todo('IAS dispatch — gstRegistered=false → shape IAS, GST labels absent');
  it.todo('BAS dispatch — gstRegistered=true → shape BAS, all G labels present');
  it.todo('GST rounding 11-transaction total matches hand-calculation to-the-cent');
  it.todo('W5 derived — W2 + W3 + W4 sums correctly');
});
