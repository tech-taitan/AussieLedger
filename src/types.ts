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
  | 'partnership-tax'
  | 'bas-ias'
  | 'import'
  | 'edit-entity'
  | 'audit-trail'
  | 'coa-manager'
  | 'data'
  | 'year-end'
  | 'settings';

export interface Entity {
  _v?: number;
  id: string;
  name: string;
  /** Constrained to AU four for new entities; legacy seeds may carry other strings until v3 migration normalises. */
  type: 'Company' | 'Trust' | 'Individual' | 'Partnership' | string;
  registrationNumber?: string;
  businessAddress?: string;
  contactPerson?: string;
  status: 'Active' | 'Archived' | 'Deactivated';
  taxAgentName?: string;
  taxAgentPhone?: string;
  taxAgentEmail?: string;
  notes?: string;
  // _v:3 additions
  gstRegistered?: boolean;
  accountingMethod?: 'cash' | 'accruals';
  /** ISO MM-DD; defaults '06-30' for AU FY-end. */
  fyEndDate?: string;
  /** Phase 5/6 will populate; Phase 4 ships empty default. */
  lockedFys?: string[];
  /** Trust beneficiary register (ENT-07). */
  beneficiaries?: BeneficiaryRow[];
  /** Partnership partner register (ENT-08). */
  partners?: PartnerRow[];
  // _v:4 additions
  /** Aggregated turnover for s.328-115 BRE / small-biz-offset tests. Optional decimal string; auto-default from Revenue accounts via computeAggregatedTurnover. */
  aggregatedTurnover?: string;
  /** PAYG instalment Method-1 amount from ATO portal. Optional decimal string. */
  paygInstalmentAmount?: string;
  // _v:5 additions (Phase 6)
  /** Per-FY return lifecycle. 'draft' = working paper; 'finalised' = locked. */
  returnStatusByFy?: Record<string, 'draft' | 'finalised'>;
  /** Per-FY wizard resume state. */
  wizardState?: Record<string, WizardStateFy>;
}

export interface BeneficiaryRow {
  id: string;
  name: string;
  sharePercent: number;
  /** Phase 5 streaming overrides; Phase 4 ships shape only, UI exposes sharePercent. */
  sharePerType?: Partial<Record<'interest' | 'dividend' | 'capitalGain' | 'foreign' | 'other', number>>;
}

export interface PartnerRow {
  id: string;
  name: string;
  sharePercent: number;
  sharePerType?: Partial<Record<'interest' | 'dividend' | 'capitalGain' | 'foreign' | 'other', number>>;
}

export interface Account {
  _v?: number;
  id: string;
  code: string;
  name: string;
  type: AccountType;
  taxLabel?: string;
  companyTaxLabel?: string;
  trustTaxLabel?: string;
  partnershipTaxLabel?: string;
  gstCode: 'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP';
  _needsReview?: boolean;
  // _v:3 additions
  /** parent_code reference for hierarchy (BOOK-07). null for root headers. */
  parentCode?: string | null;
  /** Default seed account — UI blocks hard delete; archive only. */
  isDefault?: boolean;
  /** Soft-delete flag — hides from journal pickers and AccountManager default view. */
  isArchived?: boolean;
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

/** Journal entry lifecycle states. `draft` is pre-post; `posted` is authoritative;
 *  `superseded` means a later entry replaces this one via `replacedByEntryId`;
 *  `reversed` means a balancing entry references this one via `reversesEntryId`;
 *  `voided` is a soft-deleted draft. */
export type JournalEntryStatus = 'draft' | 'posted' | 'superseded' | 'reversed' | 'voided';

export interface JournalEntry {
  _v?: number;
  id: string;
  date: string;
  reference: string;
  description: string;
  lines: JournalLine[];
  /** Authoritative posting flag from Phase 1/2; v3 makes `status` the new source of truth but keeps this for compat. */
  isPosted: boolean;
  // _v:3 additions
  status?: JournalEntryStatus;
  /** Set on a reversal entry pointing back to the original (BOOK-03). */
  reversesEntryId?: string;
  /** Set on a supersedes (edit) entry pointing back to the prior version (BOOK-02). */
  replacesEntryId?: string;
  /** Set on the prior version pointing forward to its replacement. */
  replacedByEntryId?: string;
  /** sha256(canonical rows + entityId + asAtDate) — set on opening-balances journal from IMP-05. */
  importFingerprint?: string;
}

export interface TrialBalanceRow {
  account: Account;
  debit: number;
  credit: number;
  balance: number;
  /** _v:3 — depth in CoA tree (0=root, 1=child, ...). */
  depth?: number;
  /** _v:3 — true if any other Account has parentCode === this.account.code. */
  isParent?: boolean;
  /** _v:3 — pre-aggregated child sums for parent rows. */
  childTotals?: { debit: number; credit: number; balance: number };
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

/** Phase 4 widens the action enum to cover Phase 4 + 5 + 6 actions, avoiding a future v3→v4 migration. */
export type AuditAction =
  | 'CREATE_ENTITY' | 'UPDATE_ENTITY' | 'DELETE_ENTITY'
  | 'POST_JOURNAL' | 'EDIT_JOURNAL' | 'REVERSE_JOURNAL' | 'VOID_JOURNAL' | 'DELETE_JOURNAL'
  | 'CREATE_ACCOUNT' | 'UPDATE_ACCOUNT' | 'ARCHIVE_ACCOUNT' | 'DELETE_ACCOUNT'
  | 'IMPORT_TB' | 'IMPORT_DATA' | 'EXPORT_DATA'
  | 'LOCK_FY' | 'UNLOCK_FY';

export interface AuditLog {
  _v?: number;
  id: string;
  timestamp: string;
  user: string;
  action: AuditAction;
  entityId?: string;
  details: string;
}

/** _v:5 — Per-FY wizard resume state. Step 1–7. */
export interface WizardStateFy {
  _v?: number;
  step: number;
  dismissedAnomalies: string[];
  completedAt?: string; // ISO timestamp when finalised
}
