/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Plan 05-2 test scaffolds for computeCompanyReturn.
 * All tests are it.todo — Plan 05-2 flips them to full test bodies.
 */
import { describe, it } from 'vitest';
import { computeCompanyReturn } from '../company';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
void computeCompanyReturn;

describe('computeCompanyReturn', () => {
  it.todo('6A 6T 7T from GL — gross sales + expenses → taxable income derived');
  it.todo('BRE 25% rate — passive income 10% of total, turnover < $50M');
  it.todo('BRE 30% rate — 90% dividend income triggers full rate (success criterion #2 form-level)');
  it.todo('franking account CS_A + CS_B − CS_J = CS_S closing balance');
  it.todo('franking deficit warning — CS_S < 0 emits warn anomaly');
  it.todo('BRE borderline anomaly — 75% passive emits warn with non-portfolio dividend caveat');
  it.todo('locked FY anomaly present in meta');
});
