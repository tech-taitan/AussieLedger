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
  { code: '6911', name: 'Income Tax Expense — Company',     type: 'Expense',   parentCode: '6900', gstCode: 'N-T',
    taxLabel: '6N', companyTaxLabel: '7T', trustTaxLabel: '5N', partnershipTaxLabel: 'P2',
    notes: 'Coy 30%/25% — taxable income reconciliation 7T' },
];
