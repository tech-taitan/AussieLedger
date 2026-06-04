/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { DefaultAccountSeed } from '../types';

/** Partnership overlay — Partner Capital sub-rows. NAT 0659 labels. */
export const FY2026_PARTNERSHIP_OVERLAY: DefaultAccountSeed[] = [
  { code: '3081', name: 'Partner Capital — Partner A',          type: 'Equity', parentCode: '3080', gstCode: 'N-T' },
  { code: '3082', name: 'Partner Capital — Partner B',          type: 'Equity', parentCode: '3080', gstCode: 'N-T' },
  { code: '3083', name: 'Partner Drawings — Partner A',         type: 'Equity', parentCode: '3080', gstCode: 'N-T' },
  { code: '3084', name: 'Partner Drawings — Partner B',         type: 'Equity', parentCode: '3080', gstCode: 'N-T' },

  // Comprehensive additions — partnership specific
  { code: '3085', name: 'Partner Loan — Partner A',             type: 'Equity', parentCode: '3080', gstCode: 'N-T' },
  { code: '3086', name: 'Partner Loan — Partner B',             type: 'Equity', parentCode: '3080', gstCode: 'N-T' },
  { code: '3087', name: 'Partner Salary Allocation',            type: 'Equity', parentCode: '3080', gstCode: 'N-T',
    notes: 'Notional partner salary — affects P&L allocation' },
  { code: '3088', name: 'Interest on Partner Capital',          type: 'Equity', parentCode: '3080', gstCode: 'N-T' },
  { code: '3089', name: 'Goodwill on Partnership Formation',    type: 'Equity', parentCode: '3080', gstCode: 'N-T' },
];
