/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface Entity {
  id: string;
  name: string;
  type: string;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  taxLabel?: string; // ATO Income Tax Return Label (e.g., '6S', '6K')
  companyTaxLabel?: string; // ATO Company Tax Return Label (e.g., '6S', '6F')
  trustTaxLabel?: string; // ATO Trust Tax Return Label (e.g., '5B', '11J')
  gstCode: 'GST' | 'FRE' | 'N-T';
}

export interface JournalLine {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
  taxAmount: number;
  isManualTax?: boolean;
}

export interface JournalEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  lines: JournalLine[];
  isPosted: boolean;
}

export interface TrialBalanceRow {
  account: Account;
  debit: number;
  credit: number;
  balance: number;
}

export interface ImportedAccount {
  externalCode: string;
  externalName: string;
  debit: number;
  credit: number;
  mappedAccountId?: string;
  confidence?: number;
  reasoning?: string;
}
