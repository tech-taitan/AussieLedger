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
];
