/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AccountType } from '../../types';

/** Pure data shape — the seed table row. Hooks convert these to runtime Account[]. */
export interface DefaultAccountSeed {
  code: string;                       // 4-digit (1xxx..6xxx)
  name: string;
  type: AccountType;
  parentCode: string | null;          // null for root headers
  gstCode: 'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP';
  taxLabel?: string;                  // Individual NAT 2541/2543 schedule labels (6S, 6K, 6L, 6N, 6Q)
  companyTaxLabel?: string;           // Company NAT 0656 (6A, 6F, 6X, 6C, 6G)
  trustTaxLabel?: string;             // Trust NAT 0660 (5B, 5E, 5F, 5L, 5M, 5N, 11J)
  partnershipTaxLabel?: string;       // Partnership NAT 0659 (P1, P2, P8)
  notes?: string;
}

/** Entity types that map to a per-type CoA overlay. */
export type EntityCoaType = 'Individual' | 'Company' | 'Trust' | 'Partnership';
