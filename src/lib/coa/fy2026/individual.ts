/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { DefaultAccountSeed } from '../types';

/**
 * Sole Trader / Individual overlay — extends the FY2026 base spine with sole-trader-
 * specific accounts and refines tax-label pre-mappings to NAT 2541 (Individual return)
 * + NAT 2543 (Business and Professional Items schedule) labels.
 *
 * Overlay rows MAY add new codes OR override fields on existing base rows
 * (overlay wins per-field at merge time in src/lib/coa/index.ts).
 */
export const FY2026_INDIVIDUAL_OVERLAY: DefaultAccountSeed[] = [
  // Sole-trader-specific Owner's Drawings sub-rows (under 3020 Owner's Drawings)
  { code: '3021', name: "Owner's Drawings — Cash",         type: 'Equity',  parentCode: '3020', gstCode: 'N-T' },
  { code: '3022', name: "Owner's Personal Expenses Paid",  type: 'Equity',  parentCode: '3020', gstCode: 'N-T' },
  // P8 net small business income tracker (NAT 2543 schedule)
  { code: '4150', name: 'Personal Services Income',        type: 'Revenue', parentCode: '4000', gstCode: 'GST',
    taxLabel: 'P1', partnershipTaxLabel: 'P1' },
];
