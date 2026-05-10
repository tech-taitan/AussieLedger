/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Migration: schema version 1 → 2.
 *
 * Changes in _v: 2:
 * - Account.partnershipTaxLabel added (NAT 0976)
 * - Account.gstCode union widened to include 'INP' and 'CAP'
 * - Account._needsReview added (persisted flag for accounts needing manual label review)
 *
 * This function is written here but NOT registered in migrations/index.ts until Plan 02-4
 * (which also bumps CURRENT_VERSION to 2). Do not register it early.
 */

import type { Account } from '../../types';
import type { PersistedRoot } from './index';

/**
 * Name → label inference table for migration 1 → 2.
 * Covers the 16 default CoA accounts plus common real-world synonyms.
 * Format: normalised name (lowercase, alphanumeric+space) → per-entity-type labels
 *
 * Phase 4 extends this table to cover the 80–150-account expansion.
 * Sources: NAT 0660 (Individual), NAT 0656 (Company), NAT 0659 (Trust), NAT 0976 (Partnership)
 */
const INFERENCE_TABLE: Record<string, Partial<{
  taxLabel: string;
  companyTaxLabel: string;
  trustTaxLabel: string;
  partnershipTaxLabel: string;
}>> = {
  // Revenue accounts
  'sales':                 { taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B',  partnershipTaxLabel: 'P1' },
  'gross sales':           { taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B',  partnershipTaxLabel: 'P1' },
  'service income':        { taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B',  partnershipTaxLabel: 'P1' },
  'consulting income':     { taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B',  partnershipTaxLabel: 'P1' },
  'interest income':       { taxLabel: '6K', companyTaxLabel: '6F', trustTaxLabel: '11J', partnershipTaxLabel: 'P1' },
  'bank interest':         { taxLabel: '6K', companyTaxLabel: '6F', trustTaxLabel: '11J', partnershipTaxLabel: 'P1' },
  // Expense accounts
  'advertising':           { taxLabel: '6N', companyTaxLabel: '6X', trustTaxLabel: '5N',  partnershipTaxLabel: 'P2' },
  'marketing':             { taxLabel: '6N', companyTaxLabel: '6X', trustTaxLabel: '5N',  partnershipTaxLabel: 'P2' },
  'bank charges':          { taxLabel: '6N', companyTaxLabel: '6X', trustTaxLabel: '5N',  partnershipTaxLabel: 'P2' },
  'bank fees':             { taxLabel: '6N', companyTaxLabel: '6X', trustTaxLabel: '5N',  partnershipTaxLabel: 'P2' },
  'rent':                  { taxLabel: '6N', companyTaxLabel: '6G', trustTaxLabel: '5F',  partnershipTaxLabel: 'P2' },
  'rent expense':          { taxLabel: '6N', companyTaxLabel: '6G', trustTaxLabel: '5F',  partnershipTaxLabel: 'P2' },
  'wages':                 { taxLabel: '6L', companyTaxLabel: '6X', trustTaxLabel: '5M',  partnershipTaxLabel: 'P2' },
  'salaries':              { taxLabel: '6L', companyTaxLabel: '6X', trustTaxLabel: '5M',  partnershipTaxLabel: 'P2' },
  'wages salaries':        { taxLabel: '6L', companyTaxLabel: '6X', trustTaxLabel: '5M',  partnershipTaxLabel: 'P2' },
  'wages and salaries':    { taxLabel: '6L', companyTaxLabel: '6X', trustTaxLabel: '5M',  partnershipTaxLabel: 'P2' },
  'director fees':         { taxLabel: '6L', companyTaxLabel: '6X', trustTaxLabel: '5M',  partnershipTaxLabel: 'P2' },
  'superannuation':        { taxLabel: '6L', companyTaxLabel: '6C', trustTaxLabel: '5L',  partnershipTaxLabel: 'P2' },
  'super':                 { taxLabel: '6L', companyTaxLabel: '6C', trustTaxLabel: '5L',  partnershipTaxLabel: 'P2' },
  'cost of sales':         { taxLabel: '6Q', companyTaxLabel: '6X', trustTaxLabel: '5E',  partnershipTaxLabel: 'P2' },
  'cost of goods sold':    { taxLabel: '6Q', companyTaxLabel: '6X', trustTaxLabel: '5E',  partnershipTaxLabel: 'P2' },
  'cogs':                  { taxLabel: '6Q', companyTaxLabel: '6X', trustTaxLabel: '5E',  partnershipTaxLabel: 'P2' },
};

function normaliseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Migrate persisted state from schema version 1 to version 2.
 *
 * - Adds partnershipTaxLabel to accounts via name inference
 * - Marks Revenue/Expense accounts that can't be fully inferred as _needsReview: true
 * - Non-destructive: never removes or overwrites existing field values
 * - Idempotent: safe to call twice (guard: _v >= 2 → return unchanged)
 *
 * NOTE: This function is written here but NOT registered in migrations/index.ts
 * until Plan 02-4 bumps CURRENT_VERSION to 2.
 */
export function migrateV1ToV2(state: PersistedRoot): PersistedRoot {
  // Idempotency guard
  if (state._v >= 2) return state;

  const accounts = (state.accounts as Account[] | undefined) ?? [];

  const migratedAccounts = accounts.map((account): Account => {
    const normalised = normaliseName(account.name);
    const inferred = INFERENCE_TABLE[normalised];

    // Non-destructive: prefer existing values; fill missing via inference table
    const partnershipTaxLabel = account.partnershipTaxLabel ?? inferred?.partnershipTaxLabel;
    const taxLabel = account.taxLabel ?? inferred?.taxLabel;
    const companyTaxLabel = account.companyTaxLabel ?? inferred?.companyTaxLabel;
    const trustTaxLabel = account.trustTaxLabel ?? inferred?.trustTaxLabel;

    // Mark Revenue/Expense accounts that couldn't be fully inferred
    const needsReview =
      account.type === 'Revenue' || account.type === 'Expense'
        ? !taxLabel || !companyTaxLabel || !trustTaxLabel || !partnershipTaxLabel
        : false; // Asset/Liability/Equity don't appear on tax returns

    return {
      ...account,
      taxLabel,
      companyTaxLabel,
      trustTaxLabel,
      partnershipTaxLabel,
      ...(needsReview ? { _needsReview: true } : {}),
    };
  });

  return {
    ...state,
    _v: 2,
    accounts: migratedAccounts,
  };
}
