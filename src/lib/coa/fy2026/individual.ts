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
    taxLabel: 'P1', companyTaxLabel: '6A', trustTaxLabel: '5B', partnershipTaxLabel: 'P1' },

  // Comprehensive additions — sole trader / individual specific
  { code: '4160', name: 'Personal Use of Stock (Div 70-110)', type: 'Revenue', parentCode: '4000', gstCode: 'N-T',
    taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B', partnershipTaxLabel: 'P1',
    notes: 'Trading stock disposed otherwise than in ordinary business — s.70-110' },
  { code: '6011', name: 'Wages — Personal Services Income',type: 'Expense', parentCode: '6010', gstCode: 'N-T',
    taxLabel: '6L', companyTaxLabel: '6X', trustTaxLabel: '5M', partnershipTaxLabel: 'P2',
    notes: 'PSI rules — Subdiv 87 attribution' },
  { code: '6325', name: 'Motor Vehicle — Private Use Adjustment', type: 'Expense', parentCode: '6300', gstCode: 'N-T',
    taxLabel: '6N', companyTaxLabel: '6X', trustTaxLabel: '5N', partnershipTaxLabel: 'P2',
    notes: 'Contra-expense — logbook % private use reduces deductible MV' },
  { code: '6350', name: 'Home Office — Running Costs',     type: 'Expense', parentCode: '6000', gstCode: 'FRE',
    taxLabel: '6N', companyTaxLabel: '6X', trustTaxLabel: '5N', partnershipTaxLabel: 'P2',
    notes: 'Electricity, internet % — fixed-rate or actual method' },
  { code: '6360', name: 'Home Office — Occupancy Costs',   type: 'Expense', parentCode: '6000', gstCode: 'FRE',
    taxLabel: '6N', companyTaxLabel: '6X', trustTaxLabel: '5N', partnershipTaxLabel: 'P2',
    notes: 'Sole trader only; affects CGT main residence exemption' },
];
