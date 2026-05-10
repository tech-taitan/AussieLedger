/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared type definitions for the AussieLedger tax engine.
 * All compute* functions consume TaxInput and return a typed return object
 * where every ATO label field is a LabelResult.
 *
 * Source: CONTEXT.md § Tax engine API shape (TAX-05)
 */

import type { Decimal } from '../money';
import type { JournalEntry, JournalLine, Account } from '../../types';
import type { FyLabel, Period } from '../period';

// ── Core result type ───────────────────────────────────────────────────────

/**
 * One ATO return label's value and supporting audit trail.
 * value: Decimal (never a raw number — use .toFixed(2) at JSX boundary)
 * source: the journal lines that contributed to this value (for Phase 6 drill-down)
 * basis: optional human-readable explanation of the calculation
 */
export interface LabelResult {
  value: Decimal;
  source: JournalLine[];
  basis?: string;
}

// ── Input types ────────────────────────────────────────────────────────────

/**
 * Base input for all tax engine compute functions.
 * fy is explicit — no defaulting to "current FY"; callers always specify.
 */
export interface TaxInput {
  fy: FyLabel;             // e.g. 'FY2026' — Source: CONTEXT.md § Tax engine API shape
  entries: JournalEntry[];
  accounts: Account[];
  period: Period;          // from src/lib/period.ts
}

/** Individual tax return input — no extra fields in Phase 2. */
export type IndividualInput = TaxInput;

/** Company tax return input — no extra fields in Phase 2. */
export type CompanyInput = TaxInput;

/** Trust tax return input — Phase 4 adds beneficiary register. */
export interface TrustInput extends TaxInput {
  beneficiaries?: Array<{ name: string; share: number }>; // stub for Phase 4
}

/** Partnership tax return input — Phase 4 adds partner register. */
export interface PartnershipInput extends TaxInput {
  partners?: Array<{ name: string; share: number }>; // stub for Phase 4
}

/** BAS input — FY or quarter period. */
export type BasInput = TaxInput;

// ── Return types ───────────────────────────────────────────────────────────

/**
 * Individual tax return (NAT 0660 FY2025-26).
 * 7T is derived: total income - total expenses.
 */
export interface IndividualReturn {
  '6S': LabelResult;   // Total business income
  '6K': LabelResult;   // Gross interest
  '6L': LabelResult;   // Salary and wage expenses
  '6N': LabelResult;   // All other expenses
  '6Q': LabelResult;   // Cost of sales
  '7T': LabelResult;   // Taxable income or loss (derived)
}

/**
 * Company tax return (NAT 0656 FY2025-26).
 * 6T = 6A + 6F (total income); 6S = 6C + 6G + 6X (total expenses); 7T = 6T - 6S.
 */
export interface CompanyReturn {
  '6A': LabelResult;   // Gross sales
  '6F': LabelResult;   // Gross interest
  '6T': LabelResult;   // Total income (derived)
  '6C': LabelResult;   // Superannuation expenses
  '6G': LabelResult;   // Rent expenses
  '6X': LabelResult;   // All other expenses
  '6S': LabelResult;   // Total expenses (derived)
  '7T': LabelResult;   // Taxable income or loss (derived)
}

/**
 * Trust tax return (NAT 0659 FY2025-26).
 * 5T = 5B + 11J; 5S = 5E + 5F + 5L + 5M + 5N; 26 = 5T - 5S.
 */
export interface TrustReturn {
  '5B':  LabelResult;  // Gross payments (Sales)
  '11J': LabelResult;  // Gross interest
  '5T':  LabelResult;  // Total business income (derived)
  '5E':  LabelResult;  // Cost of sales
  '5F':  LabelResult;  // Rent expenses
  '5L':  LabelResult;  // Superannuation expenses
  '5M':  LabelResult;  // Salary and wage expenses
  '5N':  LabelResult;  // All other expenses
  '5S':  LabelResult;  // Total expenses (derived)
  '26':  LabelResult;  // Net income or loss (derived)
}

/**
 * Partnership tax return (NAT 0976 FY2025-26).
 * P8 = P1 - P2 (net income or loss).
 */
export interface PartnershipReturn {
  'P1': LabelResult;   // Gross income
  'P2': LabelResult;   // Total deductions
  'P8': LabelResult;   // Net income or loss (derived)
}

/**
 * BAS return (NAT 7392).
 * netGst is derived: 1A - 1B.
 */
export interface BasReturn {
  G1:     LabelResult; // Total sales (GST-inclusive)
  G2:     LabelResult; // Export sales
  G3:     LabelResult; // Other GST-free sales
  G10:    LabelResult; // Capital purchases
  G11:    LabelResult; // Non-capital purchases
  '1A':   LabelResult; // GST on sales (GST collected)
  '1B':   LabelResult; // GST on purchases (input tax credits)
  W1:     LabelResult; // Total salary, wages and other payments
  W2:     LabelResult; // Amounts withheld from W1
  netGst: LabelResult; // Derived: 1A - 1B
}
