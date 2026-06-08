/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { DefaultAccountSeed } from '../types';

/** Company overlay — Pty Ltd specific. NAT 0656 labels. */
export const FY2026_COMPANY_OVERLAY: DefaultAccountSeed[] = [
  { code: '1710', name: 'Loan to Shareholder',              type: 'Asset',     parentCode: '1700', gstCode: 'N-T',
    notes: 'Div 7A tracking' },
  { code: '1720', name: 'Loan to Director',                 type: 'Asset',     parentCode: '1700', gstCode: 'N-T',
    notes: 'Div 7A tracking' },
  { code: '3091', name: 'Franking Account Credits',         type: 'Equity',    parentCode: '3090', gstCode: 'N-T',
    notes: 'COY-03 placeholder' },
  { code: '3092', name: 'Franking Account Debits',          type: 'Equity',    parentCode: '3090', gstCode: 'N-T',
    notes: 'COY-03 placeholder' },
  // Parent is '6000' (Expenses header), NOT '6900'. 6900 is "Depreciation
  // Expense" — a leaf account. Pre-fix this row's parentCode was '6900',
  // which silently promoted Depreciation to a parent in the TB rollup and
  // discarded any depreciation balance posted to 6900 (replaced with the
  // sum of these zero-balance income-tax children). Symptom: imported
  // depreciation balances vanished for Company entities.
  { code: '6911', name: 'Income Tax Expense — Company',     type: 'Expense',   parentCode: '6000', gstCode: 'N-T',
    taxLabel: '6N', companyTaxLabel: '7T', trustTaxLabel: '5N', partnershipTaxLabel: 'P2',
    notes: 'Coy 30%/25% — taxable income reconciliation 7T' },

  // Comprehensive additions — company specific
  { code: '3093', name: 'Franking Account — Opening Balance', type: 'Equity', parentCode: '3090', gstCode: 'N-T',
    notes: 'CS_A — opening balance carried from prior FY' },
  { code: '4215', name: 'Dividend Income from Related Company', type: 'Revenue', parentCode: '4000', gstCode: 'FRE',
    taxLabel: '6S', companyTaxLabel: '6H', trustTaxLabel: '11J', partnershipTaxLabel: 'P1',
    notes: 'Intercorporate dividends — may be s.23AJ exempt' },
  { code: '4218', name: 'R&D Tax Offset Refundable',        type: 'Revenue', parentCode: '4000', gstCode: 'N-T',
    taxLabel: '6S', companyTaxLabel: '6U', trustTaxLabel: '5B', partnershipTaxLabel: 'P1',
    notes: 'R&D tax incentive cash refund / non-refundable offset' },
  { code: '6121', name: 'ASIC Annual Review Fee',           type: 'Expense', parentCode: '6000', gstCode: 'FRE',
    taxLabel: '6N', companyTaxLabel: '6X', trustTaxLabel: '5N', partnershipTaxLabel: 'P2' },
  // Parent is '6000' for the same reason as 6911 above — keeping 6900
  // (Depreciation Expense) a leaf so its imported balance isn't silently
  // discarded by the parent-rollup.
  { code: '6912', name: 'Income Tax — Prior Year Adjustment', type: 'Expense', parentCode: '6000', gstCode: 'N-T',
    taxLabel: '6N', companyTaxLabel: '6X', trustTaxLabel: '5N', partnershipTaxLabel: 'P2' },
];
