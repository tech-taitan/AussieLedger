/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Account } from '../../types';

export const sampleAccounts: Account[] = [
  { _v: 1, id: '1-001', code: '1-001', name: 'Cash at Bank', type: 'Asset', gstCode: 'N-T' },
  { _v: 1, id: '4-001', code: '4-001', name: 'Sales Revenue', type: 'Revenue', gstCode: 'GST' },
  { _v: 1, id: '6-001', code: '6-001', name: 'Operating Expense', type: 'Expense', gstCode: 'GST' },
];
