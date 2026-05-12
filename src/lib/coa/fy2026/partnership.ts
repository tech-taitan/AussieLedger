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
];
