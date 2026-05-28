/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Plan 05-2 test scaffolds for CompanyTaxReturn (Form C renderer).
 * All phase-5 tests are it.todo — Plan 05-2 flips them to full test bodies.
 */
import { describe, it } from 'vitest';

describe('CompanyTaxReturn — Phase 5 wiring', () => {
  it.todo('renders Form C with 6A/6T/7T labels and derived taxable income');
  it.todo('BRE rate displayed — 25% basis text visible when passive < 80% and turnover < $50M');
  it.todo('franking account section — CS_A/CS_B/CS_J/CS_S rows rendered');
  it.todo('print button emits EXPORT_DATA audit log');
  it.todo('BRE borderline anomaly badge rendered when passive income 75%');
  it.todo('locked FY badge visible when entity.lockedFys includes FY');
  it.todo('90% dividend passive income → 30% rate shown (success criterion #2 form-level)');
});
