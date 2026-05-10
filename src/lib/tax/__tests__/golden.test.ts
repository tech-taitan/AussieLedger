import { describe, it } from 'vitest';

// Phase 1 establishes the file. Phase 5 fills these with hand-calculated golden outputs.
describe('Tax engine golden outputs (one per AU return type)', () => {
  it.todo('Individual return: gross/deductions/net taxable income against fixture journal set');
  it.todo('Company return: items 6, 7, 7S against fixture journal set with 25%/30% BRE selection');
  it.todo('Trust return: net income reconciles to per-beneficiary distributions');
  it.todo('Partnership return: net income split per partner-register percentages');
});
