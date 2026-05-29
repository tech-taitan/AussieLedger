/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';
import { detectSubtotals, SUM_TOLERANCE_AUD } from '../subtotalDetect';

// Reference the imports so eslint/tsc don't complain about unused.
void detectSubtotals; void SUM_TOLERANCE_AUD;

describe('detectSubtotals (IMP-09)', () => {
  it.todo('flags row with name "Total Revenue" by keyword (case-insensitive)');
  it.todo('flags row with name "TOTAL ASSETS" by keyword');
  it.todo('flags row with name "Subtotal" / "Sub-Total" by keyword');
  it.todo('flags row with name "Grand Total" by keyword');
  it.todo('flags row with name "Net Profit" by keyword');
  it.todo('flags Xero "4999 Total Revenue" by sum-pattern (sum-wins-on-coded — keeps flag even though code present)');
  it.todo('uses blank row as section boundary for sum-pattern');
  it.todo('uses account-code-prefix change as section boundary (1xxx -> 2xxx)');
  it.todo('tolerates ±0.01 AUD rounding in sum-pattern detection');
  it.todo('does NOT flag sums larger than tolerance (±0.02 difference)');
  it.todo('handles MYOB hyphenated codes (1-1100 -> first char "1")');
  it.todo('reports reason: "keyword+sum-pattern" when both signals hit the same row');
  it.todo('exports SUM_TOLERANCE_AUD = "0.01" as a tunable named constant');
});
