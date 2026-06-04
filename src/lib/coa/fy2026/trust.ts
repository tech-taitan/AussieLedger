/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { DefaultAccountSeed } from '../types';

/** Trust overlay — Beneficiary distribution clearing accounts. NAT 0660 labels. */
export const FY2026_TRUST_OVERLAY: DefaultAccountSeed[] = [
  { code: '3071', name: 'Beneficiary Distribution Clearing',    type: 'Equity', parentCode: '3070', gstCode: 'N-T',
    notes: 'Holds per-beneficiary distributions before year-end transfer to 3070' },
  { code: '3072', name: 'Trust Income to Distribute',           type: 'Equity', parentCode: '3070', gstCode: 'N-T',
    trustTaxLabel: '26',
    notes: 'NAT 0660 label 26 — total net income or loss' },

  // Comprehensive additions — trust specific
  { code: '3073', name: 'Corpus / Settled Sum',                  type: 'Equity', parentCode: '3000', gstCode: 'N-T',
    notes: 'Original settlement amount — initial trust corpus' },
  { code: '3075', name: 'Distribution Clearing — Capital Gain',  type: 'Equity', parentCode: '3070', gstCode: 'N-T',
    trustTaxLabel: '57_D',
    notes: 'Streaming — capital gains class' },
  { code: '3076', name: 'Distribution Clearing — Franked Dividends', type: 'Equity', parentCode: '3070', gstCode: 'N-T',
    trustTaxLabel: '57_C',
    notes: 'Streaming — franked dividend class' },
  { code: '3077', name: 'Distribution Clearing — Foreign Income', type: 'Equity', parentCode: '3070', gstCode: 'N-T',
    trustTaxLabel: '57_E',
    notes: 'Streaming — foreign income class (FITO flows to beneficiary)' },
  { code: '2700', name: 'Unpaid Present Entitlement (UPE)',     type: 'Liability', parentCode: '2500', gstCode: 'N-T',
    notes: 'Critical Div 7A control — unpaid beneficiary entitlement' },
  { code: '2710', name: 'Beneficiary Loan Account',             type: 'Liability', parentCode: '2500', gstCode: 'N-T' },
  { code: '2725', name: 'TFN Withholding from Beneficiaries',   type: 'Liability', parentCode: '2000', gstCode: 'N-T',
    notes: 'No-TFN withholding remitted to ATO' },
];
