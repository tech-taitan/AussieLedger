/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

/** All navigable view identifiers in the application. */
export type View =
  | 'master-dashboard'
  | 'dashboard'
  | 'journals'
  | 'trial-balance'
  | 'tax-return'
  | 'company-tax'
  | 'trust-tax'
  | 'bas-ias'
  | 'import'
  | 'edit-entity'
  | 'audit-trail'
  | 'coa-manager'
  | 'data';

export interface Entity {
  _v?: number;
  id: string;
  name: string;
  type: string;
  registrationNumber?: string;
  businessAddress?: string;
  contactPerson?: string;
  status: 'Active' | 'Archived' | 'Deactivated';
  taxAgentName?: string;
  taxAgentPhone?: string;
  taxAgentEmail?: string;
  notes?: string;
}

export interface Account {
  _v?: number;
  id: string;
  code: string;
  name: string;
  type: AccountType;
  taxLabel?: string;            // Individual ATO label (NAT 0660)
  companyTaxLabel?: string;     // Company ATO label (NAT 0656)
  trustTaxLabel?: string;       // Trust ATO label (NAT 0659)
  partnershipTaxLabel?: string; // NEW _v: 2 — Partnership ATO label (NAT 0976)
  gstCode: 'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP'; // WIDENED _v: 2 — added INP and CAP
  _needsReview?: boolean;       // NEW _v: 2 — set by migration when label inference fails for Revenue/Expense
}

export interface JournalLine {
  _v?: number;
  accountId: string;
  description: string;
  debit: number;
  credit: number;
  taxAmount: number;
  isManualTax?: boolean;
}

export interface JournalEntry {
  _v?: number;
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

export interface AuditLog {
  _v?: number;
  id: string;
  timestamp: string;
  user: string;
  action: 'CREATE_ENTITY' | 'UPDATE_ENTITY' | 'POST_JOURNAL' | 'DELETE_JOURNAL' | 'IMPORT_DATA';
  entityId?: string;
  details: string;
}
