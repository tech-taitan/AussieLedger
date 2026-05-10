/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { JournalEntry } from '../../types';

export const balancedJournal: JournalEntry = {
  _v: 1,
  id: 'jrn-1',
  date: '2025-07-01',
  reference: 'INV-001',
  description: 'Sample sales invoice (GST inclusive)',
  isPosted: true,
  lines: [
    { _v: 1, accountId: '1-001', description: 'Bank receipt', debit: 110, credit: 0, taxAmount: 0 },
    { _v: 1, accountId: '4-001', description: 'Sales (incl GST)', debit: 0, credit: 100, taxAmount: 10 },
    { _v: 1, accountId: '2-001', description: 'GST payable', debit: 0, credit: 10, taxAmount: 0 },
  ],
};

export const sampleJournals: JournalEntry[] = [balancedJournal];
