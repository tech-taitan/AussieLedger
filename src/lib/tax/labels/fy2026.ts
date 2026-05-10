/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * FY2026 tax constants for AussieLedger.
 * Australian financial year: 1 July 2025 – 30 June 2026.
 *
 * MAINTENANCE: Update these values annually before the FY start.
 * Cross-check against current-year ATO publications before each release.
 * Stale constants are caught by golden tests in Phase 5.
 *
 * NO React imports — this is a pure constants module (structural lint enforces).
 */

export const FY = 'FY2026' as const;
export type FY2026 = typeof FY;

// ── Individual return label set ────────────────────────────────────────────
// Source: NAT 0660 (Individual tax return instructions) FY2025-26
// https://www.ato.gov.au/forms-and-instructions/individual-tax-return-instructions-2026

export type IndividualLabel =
  | '6S'   // Total business income
  | '6K'   // Gross interest
  | '6L'   // Salary and wage expenses
  | '6N'   // All other expenses
  | '6Q';  // Cost of sales

export const INDIVIDUAL_LABELS: Record<IndividualLabel, { title: string; description: string }> = {
  '6S': { title: 'Total Business Income',      description: 'Gross payments where ABN not quoted and other business income. Source: NAT 0660 FY2025-26 item 6.' },
  '6K': { title: 'Gross Interest',             description: 'Total interest earned. Source: NAT 0660 FY2025-26 item 6.' },
  '6L': { title: 'Salary and Wage Expenses',   description: 'Gross salaries, wages, directors fees. Source: NAT 0660 FY2025-26 item 6.' },
  '6N': { title: 'All Other Expenses',         description: 'Operational expenses not elsewhere categorised. Source: NAT 0660 FY2025-26 item 6.' },
  '6Q': { title: 'Cost of Sales',              description: 'Direct costs of goods sold. Source: NAT 0660 FY2025-26 item 6.' },
};

// ── Company return label set ───────────────────────────────────────────────
// Source: NAT 0656 (Company tax return instructions) FY2025-26
// https://www.ato.gov.au/forms-and-instructions/company-tax-return-instructions-2026

export type CompanyLabel =
  | '6A'   // Gross sales
  | '6F'   // Gross interest
  | '6T'   // Total income (derived: 6A + 6F)
  | '6C'   // Superannuation expenses
  | '6G'   // Rent expenses
  | '6X'   // All other expenses
  | '6S'   // Total expenses (derived: 6C + 6G + 6X)
  | '7T';  // Taxable income or loss (derived: 6T - 6S)

export const COMPANY_LABELS: Record<CompanyLabel, { title: string; description: string }> = {
  '6A': { title: 'Gross sales',              description: 'Total sales of goods and services, ex GST. Source: NAT 0656 FY2025-26.' },
  '6F': { title: 'Gross interest',           description: 'Interest from accounts and investments. Source: NAT 0656 FY2025-26.' },
  '6T': { title: 'Total income',             description: 'Sum of all income items. Derived: 6A + 6F.' },
  '6C': { title: 'Superannuation expenses',  description: 'Employer superannuation contributions. Source: NAT 0656 FY2025-26.' },
  '6G': { title: 'Rent expenses',            description: 'Business premises rent. Source: NAT 0656 FY2025-26.' },
  '6X': { title: 'All other expenses',       description: 'General business and admin expenses. Source: NAT 0656 FY2025-26.' },
  '6S': { title: 'Total expenses',           description: 'Sum of all expense items. Derived: 6C + 6G + 6X.' },
  '7T': { title: 'Taxable income or loss',   description: 'Income minus expenses. Source: NAT 0656 FY2025-26.' },
};

// ── Trust return label set ─────────────────────────────────────────────────
// Source: NAT 0659 (Trust tax return instructions) FY2025-26
// https://www.ato.gov.au/forms-and-instructions/trust-tax-return-instructions-2026

export type TrustLabel =
  | '5B' | '11J' | '5T' | '5E' | '5F' | '5L' | '5M' | '5N' | '5S' | '26';

export const TRUST_LABELS: Record<TrustLabel, { title: string; description: string }> = {
  '5B':  { title: 'Gross payments (Sales)',     description: 'Total gross business income. Source: NAT 0659 FY2025-26.' },
  '11J': { title: 'Gross interest',             description: 'Interest income. Source: NAT 0659 FY2025-26.' },
  '5T':  { title: 'Total business income',      description: 'Sum of all income. Derived: 5B + 11J.' },
  '5E':  { title: 'Cost of sales',              description: 'Direct costs. Source: NAT 0659 FY2025-26.' },
  '5F':  { title: 'Rent expenses',              description: 'Business rent. Source: NAT 0659 FY2025-26.' },
  '5L':  { title: 'Superannuation expenses',    description: 'Employer superannuation. Source: NAT 0659 FY2025-26.' },
  '5M':  { title: 'Salary and wage expenses',   description: 'Gross salaries and wages. Source: NAT 0659 FY2025-26.' },
  '5N':  { title: 'All other expenses',         description: 'Miscellaneous deductions. Source: NAT 0659 FY2025-26.' },
  '5S':  { title: 'Total expenses',             description: 'Sum of all expenses. Derived: 5E + 5F + 5L + 5M + 5N.' },
  '26':  { title: 'Net income or loss',         description: 'Distributable trust income. Derived: 5T - 5S. Source: NAT 0659 FY2025-26.' },
};

// ── Partnership return label set ───────────────────────────────────────────
// Source: NAT 0976 (Partnership tax return instructions) FY2025-26
// https://www.ato.gov.au/forms-and-instructions/partnership-tax-return-instructions-2026

export type PartnershipLabel = 'P1' | 'P2' | 'P8';

export const PARTNERSHIP_LABELS: Record<PartnershipLabel, { title: string; description: string }> = {
  'P1': { title: 'Gross income',       description: 'Total partnership income. Source: NAT 0976 FY2025-26.' },
  'P2': { title: 'Total deductions',   description: 'Total allowable deductions. Source: NAT 0976 FY2025-26.' },
  'P8': { title: 'Net income or loss', description: 'P1 minus P2. Derived.' },
};

// ── BAS label set ──────────────────────────────────────────────────────────
// Source: NAT 7392 (BAS instructions) FY2025-26
// https://www.ato.gov.au/forms-and-instructions/bas-instructions-2026

export type BasLabel = 'G1' | 'G2' | 'G3' | 'G10' | 'G11' | '1A' | '1B' | 'W1' | 'W2';

export const BAS_LABELS: Record<BasLabel, { title: string; description: string }> = {
  'G1':  { title: 'Total sales',                       description: 'GST-inclusive total sales. Source: NAT 7392.' },
  'G2':  { title: 'Export sales',                      description: 'GST-free export sales. Source: NAT 7392.' },
  'G3':  { title: 'Other GST-free sales',              description: 'GST-free sales excluding exports. Source: NAT 7392.' },
  'G10': { title: 'Capital purchases',                 description: 'GST-inclusive capital acquisitions. Source: NAT 7392.' },
  'G11': { title: 'Non-capital purchases',             description: 'GST-inclusive non-capital acquisitions. Source: NAT 7392.' },
  '1A':  { title: 'GST on sales',                      description: 'GST collected on taxable sales. Source: NAT 7392.' },
  '1B':  { title: 'GST on purchases',                  description: 'GST input tax credits. Source: NAT 7392.' },
  'W1':  { title: 'Total salary, wages and other payments', description: 'PAYG withholding base. Source: NAT 7392.' },
  'W2':  { title: 'Amounts withheld from W1',          description: 'PAYG withholding amounts. Source: NAT 7392.' },
};

// ── Rate constants ─────────────────────────────────────────────────────────
// Use these as Decimal constructor arguments — NEVER as raw floats in arithmetic.

/**
 * GST rate: 10%.
 * Source: A New Tax System (Goods and Services Tax) Act 1999, s 9-70.
 * Rate unchanged since introduction in 2000.
 */
export const GST_RATE = '0.1' as const;   // 10% — pass as new Decimal(GST_RATE)

/**
 * GST divisor for extracting GST from a GST-inclusive amount.
 * GST component = inclusive amount / 11.
 * Source: ATO BAS instructions — GST component = inclusive amount divided by eleven.
 */
export const GST_DIVISOR = '11' as const;

/**
 * Company tax rate — Base Rate Entity (BRE).
 * 25% applies to companies with aggregate turnover < BRE_TURNOVER_THRESHOLD
 * and passive income ≤ BRE_PASSIVE_THRESHOLD of assessable income.
 * Source: Income Tax Rates Act 1986, ATO company tax rates FY2025-26.
 */
export const COMPANY_TAX_RATE_BASE = '0.25' as const;

/**
 * Company tax rate — full rate (non-BRE).
 * Source: Income Tax Rates Act 1986, ATO company tax rates FY2025-26.
 */
export const COMPANY_TAX_RATE_FULL = '0.30' as const;

/**
 * BRE passive income threshold: 80%.
 * If passive income exceeds 80% of assessable income, BRE rate does not apply.
 * Source: ITAA 1997 s 23AA.
 */
export const BRE_PASSIVE_THRESHOLD = '0.80' as const;

/**
 * BRE aggregate turnover threshold: $50,000,000 AUD.
 * Companies with aggregate turnover at or above this amount are not BREs.
 * Source: ITAA 1997 s 23AB.
 */
export const BRE_TURNOVER_THRESHOLD = '50000000' as const;
