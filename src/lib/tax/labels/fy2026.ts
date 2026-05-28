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
// Source: NAT 2541 (Individual tax return) + NAT 2543 (B&P schedule) FY2025-26
// https://www.ato.gov.au/forms-and-instructions/individual-tax-return-2025-instructions
// https://www.ato.gov.au/api/public/content/5861f7f47efa45d5b76332ef12919ace
// (Phase 2 comment incorrectly said NAT 0660; corrected in Phase 5 Wave 0)

export type IndividualLabel =
  | '6S'   // Total business income (Phase 2 — preserved)
  | '6K'   // Gross interest (Phase 2 — preserved)
  | '6L'   // Salary and wage expenses (Phase 2 — preserved)
  | '6N'   // All other expenses (Phase 2 — preserved)
  | '6Q'   // Cost of sales (Phase 2 — preserved)
  | 'P1'   // Main business / professional income (NAT 2543)
  | 'P2'   // Business deductions (NAT 2543)
  | 'P8'   // Net business income or loss (NAT 2543, P1 − P2)
  | 'item15' // Item 15: net income from business (flow-through of P8 to main return)
  | 'B'    // P8 sub-label: gross income from business activities
  | 'C'    // P8 sub-label: cost of sales
  | 'E'    // P8 sub-label: rent expenses
  | 'F'    // P8 sub-label: interest expenses
  | 'G'    // P8 sub-label: salary and wages paid
  | 'H'    // P8 sub-label: super contributions
  | 'I'    // P8 sub-label: motor vehicle expenses
  | 'J'    // P8 sub-label: depreciation expenses
  | 'K'    // P8 sub-label: all other expenses
  | 'L'    // P8 sub-label: total expenses (derived: C+E+F+G+H+I+J+K)
  | 'N'    // P8 sub-label: net income from business (B − L)
  | 'M1'   // Medicare levy (disclosure line)
  | 'M2'   // Medicare levy surcharge (disclosure line)
  | 'T1'   // Low income tax offset (LITO) disclosure line
  | 'item7D'; // Small business income tax offset (IND-04, re-scoped from COY-04)

/** Full label catalogue for Individual return — maps every label to metadata. */
export const INDIVIDUAL_LABELS_FULL: Record<IndividualLabel, { title: string; description: string; natReference: string; plainEnglish: string; helpText: string }> = {
  '6S':     { title: 'Total Business Income',      description: 'Gross payments where ABN not quoted and other business income.', natReference: 'NAT 2541 item 6', plainEnglish: 'Total business income',
              helpText: 'Total gross business income for the year. Populated from accounts of type Revenue tagged with the 6S tax label in your Chart of Accounts.' },
  '6K':     { title: 'Gross Interest',             description: 'Total interest earned.',                                         natReference: 'NAT 2541 item 6', plainEnglish: 'Gross interest',
              helpText: 'Total interest income earned during the year. Populated from Revenue accounts tagged with the 6K tax label.' },
  '6L':     { title: 'Salary and Wage Expenses',   description: 'Gross salaries, wages, directors fees.',                        natReference: 'NAT 2541 item 6', plainEnglish: 'Salary and wage expenses',
              helpText: 'Gross salaries, wages, and director fees paid to employees. Populated from Expense accounts tagged with the 6L tax label.' },
  '6N':     { title: 'All Other Expenses',         description: 'Operational expenses not elsewhere categorised.',               natReference: 'NAT 2541 item 6', plainEnglish: 'All other expenses',
              helpText: 'Operational business expenses not elsewhere categorised. Populated from Expense accounts tagged with the 6N tax label.' },
  '6Q':     { title: 'Cost of Sales',              description: 'Direct costs of goods sold.',                                   natReference: 'NAT 2541 item 6', plainEnglish: 'Cost of sales',
              helpText: 'Direct costs of goods and services sold during the year. Populated from Expense accounts tagged with the 6Q tax label.' },
  'P1':     { title: 'Business income',            description: 'Gross income from primary business or professional activities.', natReference: 'NAT 2543 item P1', plainEnglish: 'Business income (P1)',
              helpText: 'Gross income from your main business or professional activities for the year. Populated from accounts of type Revenue tagged with the P1 tax label.' },
  'P2':     { title: 'Business deductions',        description: 'Allowable business deductions (cost of sales + expenses).',     natReference: 'NAT 2543 item P2', plainEnglish: 'Business deductions (P2)',
              helpText: 'Total business expenses for the year. Populated from accounts of type Expense tagged with the P2 tax label. Excludes private and non-business amounts.' },
  'P8':     { title: 'Net small business income',  description: 'P1 minus P2 — net income or loss from business activities.',   natReference: 'NAT 2543 item P8', plainEnglish: 'Net business income (P8)',
              helpText: 'Net income or loss from business activities. Derived by subtracting total business expenses (P2) from gross business income (P1).' },
  'item15': { title: 'Net income from business',   description: 'Item 15 on main return — equals P8 (flow-through).',           natReference: 'NAT 2541 item 15', plainEnglish: 'Net income/loss from business (item 15)',
              helpText: 'Net income or loss from business transferred to Item 15 of the main tax return. This figure flows directly from the Business and Professional schedule net result (P8).' },
  'B':      { title: 'Gross income',               description: 'Gross income from business activities (B&P schedule).',         natReference: 'NAT 2543 item P8 sub-label B', plainEnglish: 'Gross business income (B)',
              helpText: 'Gross income from business activities as reported in the Business and Professional Items schedule. Source of the P1 income figure before deducting cost of sales.' },
  'C':      { title: 'Cost of sales',              description: 'Direct costs of goods/services sold.',                          natReference: 'NAT 2543 item P8 sub-label C', plainEnglish: 'Cost of sales (C)',
              helpText: 'Direct costs of goods and services sold. Populated from Expense accounts tagged with the C sub-label in the Business and Professional Items schedule.' },
  'E':      { title: 'Rent expenses',              description: 'Business premises rent and lease costs.',                       natReference: 'NAT 2543 item P8 sub-label E', plainEnglish: 'Rent expenses (E)',
              helpText: 'Rental and lease costs for business premises. Populated from accounts tagged with the E sub-label in the Business and Professional Items schedule.' },
  'F':      { title: 'Interest expenses',          description: 'Business interest on loans and overdrafts.',                    natReference: 'NAT 2543 item P8 sub-label F', plainEnglish: 'Interest expenses (F)',
              helpText: 'Interest costs on business loans and overdrafts. Populated from Expense accounts tagged with the F sub-label in the Business and Professional Items schedule.' },
  'G':      { title: 'Salary and wages paid',      description: 'Gross wages and salaries paid to employees.',                  natReference: 'NAT 2543 item P8 sub-label G', plainEnglish: 'Salaries and wages (G)',
              helpText: 'Gross wages and salaries paid to employees during the year. Populated from Expense accounts tagged with the G sub-label in the Business and Professional Items schedule.' },
  'H':      { title: 'Superannuation contributions', description: 'Employer superannuation contributions.',                    natReference: 'NAT 2543 item P8 sub-label H', plainEnglish: 'Superannuation (H)',
              helpText: 'Employer superannuation contributions made on behalf of employees. Populated from Expense accounts tagged with the H sub-label in the Business and Professional Items schedule.' },
  'I':      { title: 'Motor vehicle expenses',     description: 'Fuel, registration, insurance, maintenance.',                  natReference: 'NAT 2543 item P8 sub-label I', plainEnglish: 'Motor vehicle expenses (I)',
              helpText: 'Motor vehicle running costs for business use, including fuel, registration, insurance, and maintenance. Populated from Expense accounts tagged with the I sub-label.' },
  'J':      { title: 'Depreciation expenses',      description: 'Decline in value of depreciating assets.',                     natReference: 'NAT 2543 item P8 sub-label J', plainEnglish: 'Depreciation (J)',
              helpText: 'Decline in value of depreciating business assets for the year. Populated from Expense accounts tagged with the J sub-label in the Business and Professional Items schedule.' },
  'K':      { title: 'All other expenses',         description: 'All remaining allowable business deductions not in C–J.',      natReference: 'NAT 2543 item P8 sub-label K', plainEnglish: 'All other expenses (K)',
              helpText: 'All remaining business expenses not captured in sub-labels C through J. Populated from Expense accounts tagged with the K sub-label in the Business and Professional Items schedule.' },
  'L':      { title: 'Total expenses',             description: 'Total deductions: C+E+F+G+H+I+J+K.',                          natReference: 'NAT 2543 item P8 sub-label L', plainEnglish: 'Total expenses (L)',
              helpText: 'Total business expenses derived by summing sub-labels C, E, F, G, H, I, J, and K from the Business and Professional Items schedule.' },
  'N':      { title: 'Net income from business',   description: 'B minus L — net business result on B&P schedule.',            natReference: 'NAT 2543 item P8 sub-label N', plainEnglish: 'Net business income (N)',
              helpText: 'Net result from business activities calculated as gross income (B) minus total expenses (L) on the Business and Professional Items schedule.' },
  'M1':     { title: 'Medicare levy',              description: 'Medicare levy at applicable rate (flat 2% or shaded-in).',     natReference: 'NAT 2541 Medicare levy calculation', plainEnglish: 'Medicare levy (M1)',
              helpText: 'Medicare levy at the applicable rate. Full 2% applies above the upper single threshold; a shaded-in rate applies between the lower and upper thresholds. Family thresholds require additional income data not yet captured.' },
  'M2':     { title: 'Medicare levy surcharge',    description: 'MLS where taxpayer has no private hospital cover.',            natReference: 'NAT 2541 Medicare levy surcharge', plainEnglish: 'Medicare levy surcharge (M2)',
              helpText: 'Medicare levy surcharge applies to high-income individuals without private hospital cover. The applicable rate is based on the income tier threshold for the year.' },
  'T1':     { title: 'Low income tax offset',      description: 'LITO: max $700, two-stage taper from $37,500.',               natReference: 'NAT 2541 item T1', plainEnglish: 'Low income tax offset (T1)',
              helpText: 'Low income tax offset up to $700, subject to a two-stage taper. Stage 1 reduces the offset from $37,500; stage 2 further reduces it from $45,000 until it phases out at $66,667.' },
  'item7D': { title: 'Small business income tax offset', description: '16% × tax payable on net small business income, capped at $1,000. Eligible if aggregated turnover < $5M.', natReference: 'NAT 2541 item 7D', plainEnglish: 'Small business income tax offset (item 7D)',
              helpText: 'Small business income tax offset of 16% of the tax attributable to net small business income, capped at $1,000. Applies to sole traders with aggregated turnover below $5 million.' },
};

/** Preserved for Phase 2 back-compat — maps legacy 5-key Phase-2 IndividualLabel subset. */
export const INDIVIDUAL_LABELS: Record<'6S' | '6K' | '6L' | '6N' | '6Q', { title: string; description: string }> = {
  '6S': { title: 'Total Business Income',      description: 'Gross payments where ABN not quoted and other business income. Source: NAT 2541 FY2025-26 item 6.' },
  '6K': { title: 'Gross Interest',             description: 'Total interest earned. Source: NAT 2541 FY2025-26 item 6.' },
  '6L': { title: 'Salary and Wage Expenses',   description: 'Gross salaries, wages, directors fees. Source: NAT 2541 FY2025-26 item 6.' },
  '6N': { title: 'All Other Expenses',         description: 'Operational expenses not elsewhere categorised. Source: NAT 2541 FY2025-26 item 6.' },
  '6Q': { title: 'Cost of Sales',              description: 'Direct costs of goods sold. Source: NAT 2541 FY2025-26 item 6.' },
};

// ── Company return label set ───────────────────────────────────────────────
// Source: NAT 0656 (Company tax return) FY2025-26
// https://www.ato.gov.au/forms-and-instructions/company-tax-return-instructions-2026

export type CompanyLabel =
  | '6A'   // Gross sales (Phase 2 — preserved)
  | '6F'   // Gross interest (Phase 2 — preserved)
  | '6T'   // Total income (Phase 2 — preserved, derived: 6A + 6F + ...)
  | '6C'   // Superannuation expenses (Phase 2 — preserved)
  | '6G'   // Rent expenses (Phase 2 — preserved)
  | '6X'   // All other expenses (Phase 2 — preserved)
  | '6S'   // Total expenses (Phase 2 — preserved, derived)
  | '7T'   // Taxable income or loss (Phase 2 — preserved, derived)
  | '6B'   // Gross rent and other leasing
  | '6D'   // Gross interest (alternate — passive)
  | '6E'   // Gross rent (alternate — passive)
  | '6H'   // Dividends received
  | '6R'   // Franked dividends paid to shareholders
  | '6U'   // Other income
  | '6V'   // Total deductions
  | '6W'   // Income tax (non-deductible)
  | '6Q'   // Cost of sales (alias from Phase 2 individual)
  | '6Z'   // Reserve
  | 'CS_A' // Franking account opening balance
  | 'CS_B' // Franking credits from tax paid
  | 'CS_J' // Franking debits from dividends paid
  | 'CS_S' // Franking account closing balance
  | 'franking_open'  // Opening balance (friendly alias)
  | 'franking_move'  // Net movement (friendly alias)
  | 'franking_close'; // Closing balance (friendly alias)

/** Full label catalogue for Company return. */
export const COMPANY_LABELS_FULL: Record<CompanyLabel, { title: string; description: string; natReference: string; plainEnglish: string; helpText: string }> = {
  '6A':          { title: 'Gross sales',                  description: 'Total sales of goods and services, ex GST.',                natReference: 'NAT 0656 item 6A', plainEnglish: 'Gross sales (6A)',
                  helpText: 'Total gross sales of goods and services for the year, excluding GST. Populated from Revenue accounts tagged with the 6A tax label.' },
  '6B':          { title: 'Gross rent and leasing income', description: 'Rental and other leasing income.',                        natReference: 'NAT 0656 item 6B', plainEnglish: 'Gross rent (6B)',
                  helpText: 'Gross rental and other leasing income received during the year. Populated from Revenue accounts tagged with the 6B tax label.' },
  '6D':          { title: 'Gross interest',               description: 'Interest from accounts and investments (passive income).',  natReference: 'NAT 0656 item 6D', plainEnglish: 'Gross interest (6D)',
                  helpText: 'Interest income from bank accounts and investments, treated as passive income for BRE testing purposes. Populated from Revenue accounts tagged 6D.' },
  '6E':          { title: 'Gross rent',                   description: 'Rent received on properties (passive income).',            natReference: 'NAT 0656 item 6E', plainEnglish: 'Gross rent (6E)',
                  helpText: 'Rent received on properties, treated as passive income for BRE testing purposes. Populated from Revenue accounts tagged with the 6E tax label.' },
  '6F':          { title: 'Gross interest (total)',       description: 'Interest from accounts and investments.',                   natReference: 'NAT 0656 item 6', plainEnglish: 'Gross interest (6F)',
                  helpText: 'Total gross interest income from all sources. Populated from Revenue accounts tagged with the 6F tax label in the company return.' },
  '6G':          { title: 'Rent expenses',                description: 'Business premises rent.',                                  natReference: 'NAT 0656 item 6G', plainEnglish: 'Rent expenses (6G)',
                  helpText: 'Business premises rental and leasing costs for the year. Populated from Expense accounts tagged with the 6G tax label.' },
  '6H':          { title: 'Dividends received',           description: 'Dividends from portfolio / related entities.',             natReference: 'NAT 0656 item 6H', plainEnglish: 'Dividends (6H)',
                  helpText: 'Dividends received from portfolio and related entity investments. Populated from Revenue accounts tagged with the 6H tax label.' },
  '6C':          { title: 'Superannuation expenses',      description: 'Employer superannuation contributions.',                   natReference: 'NAT 0656 item 6C', plainEnglish: 'Superannuation (6C)',
                  helpText: 'Employer superannuation guarantee contributions paid on behalf of employees. Populated from Expense accounts tagged with the 6C tax label.' },
  '6Q':          { title: 'Cost of sales',                description: 'Direct costs of goods/services sold.',                    natReference: 'NAT 0656 item 6Q', plainEnglish: 'Cost of sales (6Q)',
                  helpText: 'Direct costs of goods and services sold during the year. Populated from Expense accounts tagged with the 6Q tax label.' },
  '6R':          { title: 'Franked dividends paid',       description: 'Dividends paid to shareholders (franked portion).',        natReference: 'NAT 0656 item 6R', plainEnglish: 'Franked dividends paid (6R)',
                  helpText: 'Total franked dividends paid to shareholders during the year. This figure flows through to the franking account statement and reduces the franking account balance.' },
  '6S':          { title: 'Total expenses',               description: 'Sum of all expense items. Derived.',                       natReference: 'NAT 0656 item 6S', plainEnglish: 'Total expenses (6S)',
                  helpText: 'Total expenses for the company across all categories. Populated by summing all accounts of type Expense in the financial year.' },
  '6T':          { title: 'Total income',                 description: 'Sum of all income items. Derived.',                        natReference: 'NAT 0656 item 6T', plainEnglish: 'Total income (6T)',
                  helpText: 'Total assessable income for the company, derived by summing all income items across the return schedule.' },
  '6U':          { title: 'Other income',                 description: 'Other assessable income not elsewhere classified.',        natReference: 'NAT 0656 item 6U', plainEnglish: 'Other income (6U)',
                  helpText: 'Other assessable income not captured by any other income label. Populated from Revenue accounts tagged with the 6U tax label.' },
  '6V':          { title: 'Total deductions',             description: 'Total allowable deductions.',                             natReference: 'NAT 0656 item 6V', plainEnglish: 'Total deductions (6V)',
                  helpText: 'Total allowable expense items for the company. Derived by summing all applicable expense category labels on the return.' },
  '6W':          { title: 'Income tax (non-deductible)',  description: 'Income tax expense — not deductible for company tax.',    natReference: 'NAT 0656 item 6W', plainEnglish: 'Income tax expense (6W)',
                  helpText: 'Income tax expense recorded in the accounts. This amount is not allowable as an expense for company tax purposes and is excluded from the deductions total.' },
  '6X':          { title: 'All other expenses',           description: 'General business and admin expenses.',                    natReference: 'NAT 0656 item 6X', plainEnglish: 'All other expenses (6X)',
                  helpText: 'General business and administration expenses not captured by other specific expense labels. Populated from Expense accounts tagged with the 6X tax label.' },
  '6Z':          { title: 'Reserve',                      description: 'Amounts transferred to or from reserves.',                natReference: 'NAT 0656 item 6Z', plainEnglish: 'Reserve (6Z)',
                  helpText: 'Amounts transferred to or from retained earnings reserves during the year. Populated from Equity accounts tagged with the 6Z tax label.' },
  '7T':          { title: 'Taxable income or loss',       description: 'Income minus expenses. Derived.',                        natReference: 'NAT 0656 item 7T', plainEnglish: 'Taxable income or loss (7T)',
                  helpText: 'Net taxable income or loss for the company, derived by subtracting total deductions from total income. The rate applied depends on whether the company qualifies as a Base Rate Entity.' },
  'CS_A':        { title: 'Franking account opening balance', description: 'Opening balance of the franking account.',            natReference: 'NAT 0656 CS label A', plainEnglish: 'Franking account opening balance',
                  helpText: 'Opening balance of the company franking account at the start of the income year. Populated from Equity accounts tagged with the franking_open or CS_A label.' },
  'CS_B':        { title: 'Franking credits received',    description: 'Credits from company tax payments.',                     natReference: 'NAT 0656 CS label B', plainEnglish: 'Franking credits (CS_B)',
                  helpText: 'Franking credits arising from company tax instalments and income tax paid during the year. These credits are available to frank dividends paid to shareholders.' },
  'CS_J':        { title: 'Franking debits paid',         description: 'Debits from franked dividends paid to shareholders.',   natReference: 'NAT 0656 CS label J', plainEnglish: 'Franking debits (CS_J)',
                  helpText: 'Franking debits arising from franked dividends paid to shareholders. Each franked dividend reduces the franking account balance by the credits attached.' },
  'CS_S':        { title: 'Franking account closing balance', description: 'Closing balance = CS_A + CS_B − CS_J.',              natReference: 'NAT 0656 CS label S', plainEnglish: 'Franking account closing balance',
                  helpText: 'Closing balance of the company franking account at year end. Calculated as opening balance (CS_A) plus credits (CS_B) minus debits (CS_J).' },
  'franking_open':  { title: 'Franking opening balance', description: 'Opening franking account balance (alias CS_A).',         natReference: 'NAT 0656 CS label A', plainEnglish: 'Franking account opening',
                  helpText: 'Opening franking account balance at the start of the income year. This alias maps to CS_A in the company tax return statement of franking credits.' },
  'franking_move':  { title: 'Franking net movement',    description: 'Net credits minus debits in the FY (alias CS_B − CS_J).', natReference: 'NAT 0656 CS net', plainEnglish: 'Franking net movement',
                  helpText: 'Net change in the franking account during the year, calculated as franking credits received (CS_B) minus franking debits from dividends paid (CS_J).' },
  'franking_close': { title: 'Franking closing balance', description: 'Closing franking account balance (alias CS_S).',         natReference: 'NAT 0656 CS label S', plainEnglish: 'Franking account closing',
                  helpText: 'Closing franking account balance at year end. This alias maps to CS_S in the company tax return statement of franking credits.' },
};

/** Preserved for Phase 2 back-compat. */
export const COMPANY_LABELS: Record<'6A' | '6F' | '6T' | '6C' | '6G' | '6X' | '6S' | '7T', { title: string; description: string }> = {
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
// Source: NAT 0660 (Trust tax return) FY2025-26
// https://www.ato.gov.au/forms-and-instructions/trust-tax-return-instructions-2026
// (Phase 2 comment incorrectly said NAT 0659; corrected in Phase 5 Wave 0)

export type TrustLabel =
  | '5B'   // Gross payments (Phase 2 — preserved)
  | '11J'  // Gross interest (Phase 2 — preserved)
  | '5T'   // Total business income (Phase 2 — preserved, derived)
  | '5E'   // Cost of sales (Phase 2 — preserved)
  | '5F'   // Rent expenses (Phase 2 — preserved)
  | '5L'   // Superannuation expenses (Phase 2 — preserved)
  | '5M'   // Salary and wage expenses (Phase 2 — preserved)
  | '5N'   // All other expenses (Phase 2 — preserved)
  | '5S'   // Total expenses (Phase 2 — preserved, derived)
  | '26'   // Net income or loss (Phase 2 — preserved, derived)
  | '56'   // Total trust net income (Section 96/97)
  | '57_A' // Beneficiary distribution — ordinary income
  | '57_B' // Beneficiary distribution — interest income
  | '57_C' // Beneficiary distribution — dividend income
  | '57_D' // Beneficiary distribution — capital gain
  | '57_E' // Beneficiary distribution — foreign income
  | '57_F'; // Beneficiary distribution — other income

/** Full label catalogue for Trust return. */
export const TRUST_LABELS_FULL: Record<TrustLabel, { title: string; description: string; natReference: string; plainEnglish: string; helpText: string }> = {
  '5B':   { title: 'Gross payments (Sales)',       description: 'Total gross business income.',                              natReference: 'NAT 0660 item 5B', plainEnglish: 'Gross payments (5B)',
            helpText: 'Total gross business income and sales receipts for the trust. Populated from Revenue accounts tagged with the 5B tax label.' },
  '11J':  { title: 'Gross interest',               description: 'Interest income.',                                         natReference: 'NAT 0660 item 11J', plainEnglish: 'Gross interest (11J)',
            helpText: 'Total interest income earned by the trust during the year. Populated from Revenue accounts tagged with the 11J tax label.' },
  '5T':   { title: 'Total business income',        description: 'Sum of all income. Derived: 5B + 11J + other.',           natReference: 'NAT 0660 item 5T', plainEnglish: 'Total income (5T)',
            helpText: 'Total assessable income of the trust for the year, derived by summing all income category labels including business income, interest, and other receipts.' },
  '5E':   { title: 'Cost of sales',                description: 'Direct costs.',                                            natReference: 'NAT 0660 item 5E', plainEnglish: 'Cost of sales (5E)',
            helpText: 'Direct costs associated with goods and services sold by the trust. Populated from Expense accounts tagged with the 5E tax label.' },
  '5F':   { title: 'Rent expenses',                description: 'Business rent.',                                           natReference: 'NAT 0660 item 5F', plainEnglish: 'Rent (5F)',
            helpText: 'Business rental and occupancy costs incurred by the trust. Populated from Expense accounts tagged with the 5F tax label.' },
  '5L':   { title: 'Superannuation expenses',      description: 'Employer superannuation.',                                 natReference: 'NAT 0660 item 5L', plainEnglish: 'Superannuation (5L)',
            helpText: 'Employer superannuation guarantee contributions paid by the trust on behalf of employees. Populated from Expense accounts tagged with the 5L tax label.' },
  '5M':   { title: 'Salary and wage expenses',     description: 'Gross salaries and wages.',                               natReference: 'NAT 0660 item 5M', plainEnglish: 'Salaries and wages (5M)',
            helpText: 'Gross salaries and wages paid to employees by the trust during the year. Populated from Expense accounts tagged with the 5M tax label.' },
  '5N':   { title: 'All other expenses',           description: 'Miscellaneous deductions.',                               natReference: 'NAT 0660 item 5N', plainEnglish: 'All other expenses (5N)',
            helpText: 'Miscellaneous business expenses of the trust not captured by other specific labels. Populated from Expense accounts tagged with the 5N tax label.' },
  '5S':   { title: 'Total expenses',               description: 'Sum of all expenses. Derived: 5E+5F+5L+5M+5N.',          natReference: 'NAT 0660 item 5S', plainEnglish: 'Total expenses (5S)',
            helpText: 'Total expenses of the trust for the year, derived by summing expense sub-labels 5E, 5F, 5L, 5M, and 5N.' },
  '26':   { title: 'Net income or loss',           description: 'Distributable trust income. Derived: 5T − 5S.',           natReference: 'NAT 0660 item 26', plainEnglish: 'Net income or loss (item 26)',
            helpText: 'Net income or loss of the trust before distribution to beneficiaries. The amount distributed in Item 57 must reconcile to this figure.' },
  '56':   { title: 'Total trust net income',       description: 'Total trust net income available for distribution (s.96/97).',  natReference: 'NAT 0660 item 56', plainEnglish: 'Total trust net income (item 56)',
            helpText: 'Total trust net income available for distribution under sections 96 and 97 of the ITAA 1936. This is the base figure from which beneficiary distributions in Item 57 are calculated.' },
  '57_A': { title: 'Distribution — ordinary income', description: 'Ordinary income distributed to beneficiaries.',          natReference: 'NAT 0660 item 57', plainEnglish: 'Ordinary income distribution (57A)',
            helpText: 'Ordinary income portion distributed to beneficiaries. Source: the trust distribution resolution allocating ordinary income from the trust net income figure.' },
  '57_B': { title: 'Distribution — interest income', description: 'Interest income streamed to beneficiaries.',            natReference: 'NAT 0660 item 57', plainEnglish: 'Interest distribution (57B)',
            helpText: 'Interest income streamed to specific beneficiaries. Requires a valid trust deed streaming clause and a trustee resolution allocating this income class.' },
  '57_C': { title: 'Distribution — dividend income', description: 'Dividend income (incl. franked) streamed to beneficiaries.', natReference: 'NAT 0660 item 57', plainEnglish: 'Dividend distribution (57C)',
            helpText: 'Dividend income (including franked amounts) streamed to specific beneficiaries. Requires a valid streaming clause in the trust deed.' },
  '57_D': { title: 'Distribution — capital gain',    description: 'Capital gain streamed to specific beneficiaries.',      natReference: 'NAT 0660 item 57', plainEnglish: 'Capital gain distribution (57D)',
            helpText: 'Capital gain streamed to specific beneficiaries under a trust deed streaming clause. The CGT discount calculation is determined at the beneficiary level.' },
  '57_E': { title: 'Distribution — foreign income',  description: 'Foreign income streamed to beneficiaries.',             natReference: 'NAT 0660 item 57', plainEnglish: 'Foreign income distribution (57E)',
            helpText: 'Foreign-source income streamed to specific beneficiaries. The trust deed must support this streaming, and associated foreign tax offsets flow to the relevant beneficiary.' },
  '57_F': { title: 'Distribution — other income',    description: 'Other income distributed to beneficiaries.',            natReference: 'NAT 0660 item 57', plainEnglish: 'Other income distribution (57F)',
            helpText: 'Other income categories distributed to beneficiaries that do not fall into the ordinary, interest, dividend, capital gain, or foreign income classes.' },
};

/** Preserved for Phase 2 back-compat. */
export const TRUST_LABELS: Record<'5B' | '11J' | '5T' | '5E' | '5F' | '5L' | '5M' | '5N' | '5S' | '26', { title: string; description: string }> = {
  '5B':  { title: 'Gross payments (Sales)',     description: 'Total gross business income. Source: NAT 0660 FY2025-26.' },
  '11J': { title: 'Gross interest',             description: 'Interest income. Source: NAT 0660 FY2025-26.' },
  '5T':  { title: 'Total business income',      description: 'Sum of all income. Derived: 5B + 11J.' },
  '5E':  { title: 'Cost of sales',              description: 'Direct costs. Source: NAT 0660 FY2025-26.' },
  '5F':  { title: 'Rent expenses',              description: 'Business rent. Source: NAT 0660 FY2025-26.' },
  '5L':  { title: 'Superannuation expenses',    description: 'Employer superannuation. Source: NAT 0660 FY2025-26.' },
  '5M':  { title: 'Salary and wage expenses',   description: 'Gross salaries and wages. Source: NAT 0660 FY2025-26.' },
  '5N':  { title: 'All other expenses',         description: 'Miscellaneous deductions. Source: NAT 0660 FY2025-26.' },
  '5S':  { title: 'Total expenses',             description: 'Sum of all expenses. Derived: 5E + 5F + 5L + 5M + 5N.' },
  '26':  { title: 'Net income or loss',         description: 'Distributable trust income. Derived: 5T - 5S. Source: NAT 0660 FY2025-26.' },
};

// ── Partnership return label set ───────────────────────────────────────────
// Source: NAT 0659 (Partnership tax return) FY2025-26
// https://www.ato.gov.au/forms-and-instructions/partnership-tax-return-instructions-2026
// (Phase 2 comment incorrectly said NAT 0976; corrected in Phase 5 Wave 0)

export type PartnershipLabel =
  | 'P1'   // Gross income (Phase 2 — preserved)
  | 'P2'   // Total deductions (Phase 2 — preserved)
  | 'P8'   // Net income or loss (Phase 2 — preserved, derived: P1 − P2)
  | '5B'   // Gross payments (Sales)
  | '5E'   // Cost of sales
  | '5N'   // All other expenses
  | '5T'   // Total income
  | '54_A' // Per-partner distribution — partner A
  | '54_B'; // Per-partner distribution — partner B

/** Full label catalogue for Partnership return. */
export const PARTNERSHIP_LABELS_FULL: Record<PartnershipLabel, { title: string; description: string; natReference: string; plainEnglish: string; helpText: string }> = {
  'P1':   { title: 'Gross income',           description: 'Total partnership income.',              natReference: 'NAT 0659 item P1', plainEnglish: 'Gross income (P1)',
            helpText: 'Total gross income of the partnership from all sources. Populated from Revenue accounts tagged with the P1 tax label in the partnership Chart of Accounts.' },
  'P2':   { title: 'Total deductions',       description: 'Total allowable deductions.',            natReference: 'NAT 0659 item P2', plainEnglish: 'Total deductions (P2)',
            helpText: 'Total allowable expense items of the partnership for the year. Populated from Expense accounts tagged with the P2 tax label.' },
  'P8':   { title: 'Net income or loss',     description: 'P1 minus P2. Derived.',                 natReference: 'NAT 0659 item P8', plainEnglish: 'Net income or loss (P8)',
            helpText: 'Net income or loss of the partnership for the year, derived by subtracting total deductions (P2) from gross income (P1). This amount is distributed to partners per their share percentages.' },
  '5B':   { title: 'Gross payments (Sales)', description: 'Total gross business income.',          natReference: 'NAT 0659 item 5B', plainEnglish: 'Gross payments (5B)',
            helpText: 'Total gross business income and sales receipts of the partnership. Populated from Revenue accounts tagged with the 5B tax label.' },
  '5E':   { title: 'Cost of sales',          description: 'Direct costs of goods/services sold.', natReference: 'NAT 0659 item 5E', plainEnglish: 'Cost of sales (5E)',
            helpText: 'Direct costs of goods and services sold by the partnership. Populated from Expense accounts tagged with the 5E tax label.' },
  '5N':   { title: 'All other expenses',     description: 'Miscellaneous deductions.',             natReference: 'NAT 0659 item 5N', plainEnglish: 'All other expenses (5N)',
            helpText: 'Miscellaneous partnership expenses not captured by other specific labels. Populated from Expense accounts tagged with the 5N tax label.' },
  '5T':   { title: 'Total income',           description: 'Sum of all income items.',              natReference: 'NAT 0659 item 5T', plainEnglish: 'Total income (5T)',
            helpText: 'Total assessable income of the partnership, derived by summing all income category labels in the return.' },
  '54_A': { title: 'Partner A distribution', description: 'Net income distribution — Partner A.', natReference: 'NAT 0659 item 54', plainEnglish: 'Partner A distribution',
            helpText: "Net income or loss distributed to Partner A, calculated from the partnership net income figure and Partner A's share percentage recorded in the partner register." },
  '54_B': { title: 'Partner B distribution', description: 'Net income distribution — Partner B.', natReference: 'NAT 0659 item 54', plainEnglish: 'Partner B distribution',
            helpText: "Net income or loss distributed to Partner B, calculated from the partnership net income figure and Partner B's share percentage recorded in the partner register." },
};

/** Preserved for Phase 2 back-compat. */
export const PARTNERSHIP_LABELS: Record<'P1' | 'P2' | 'P8', { title: string; description: string }> = {
  'P1': { title: 'Gross income',       description: 'Total partnership income. Source: NAT 0659 FY2025-26.' },
  'P2': { title: 'Total deductions',   description: 'Total allowable deductions. Source: NAT 0659 FY2025-26.' },
  'P8': { title: 'Net income or loss', description: 'P1 minus P2. Derived.' },
};

// ── BAS label set ──────────────────────────────────────────────────────────
// Source: NAT 7392 (BAS instructions) + Simpler BAS NAT 74662 FY2025-26
// https://www.ato.gov.au/forms-and-instructions/bas-instructions-2026

export type BasLabel =
  | 'G1'  // Total sales (Phase 2 — preserved)
  | 'G2'  // Export sales (Phase 2 — preserved)
  | 'G3'  // Other GST-free sales (Phase 2 — preserved)
  | 'G10' // Capital purchases (Phase 2 — preserved)
  | 'G11' // Non-capital purchases (Phase 2 — preserved)
  | '1A'  // GST on sales (Phase 2 — preserved)
  | '1B'  // GST on purchases (Phase 2 — preserved)
  | 'W1'  // Total salary, wages and other payments (Phase 2 — preserved)
  | 'W2'  // Amounts withheld from W1 (Phase 2 — preserved)
  | 'W3'  // Amounts withheld where no TFN
  | 'W4'  // Amounts withheld from investment distributions where no TFN
  | 'W5'  // Total amount withheld (W2 + W3 + W4)
  | 'T7'; // PAYG instalment — option-1 ATO-calculated amount

/** Full label catalogue for BAS/IAS. */
export const BAS_LABELS_FULL: Record<BasLabel, { title: string; description: string; natReference: string; plainEnglish: string; helpText: string; internalOnly?: boolean }> = {
  'G1':  { title: 'Total sales',                               description: 'GST-inclusive total sales and other income.',           natReference: 'NAT 7392 G1', plainEnglish: 'Total sales (G1)',
           helpText: 'Total sales including GST for the BAS period. Populated from credits to Revenue accounts tagged GST in the accounts for the selected BAS period.' },
  'G2':  { title: 'Export sales',                              description: 'GST-free export sales.',                               natReference: 'NAT 7392 G2', plainEnglish: 'Export sales (G2)', internalOnly: true,
           helpText: 'GST-free export sales for the BAS period. Populated from Revenue accounts tagged G2 representing goods and services exported from Australia.' },
  'G3':  { title: 'Other GST-free sales',                      description: 'GST-free sales excluding exports.',                    natReference: 'NAT 7392 G3', plainEnglish: 'Other GST-free sales (G3)', internalOnly: true,
           helpText: 'GST-free sales other than exports (for example, basic food, some medical services). Populated from Revenue accounts tagged G3.' },
  'G10': { title: 'Capital purchases',                         description: 'GST-inclusive capital acquisitions.',                  natReference: 'NAT 7392 G10', plainEnglish: 'Capital purchases (G10)', internalOnly: true,
           helpText: 'GST-inclusive capital acquisitions for the period, such as plant and equipment. Populated from Asset accounts tagged G10 and used to calculate input tax credits at 1B.' },
  'G11': { title: 'Non-capital purchases',                     description: 'GST-inclusive non-capital acquisitions.',              natReference: 'NAT 7392 G11', plainEnglish: 'Non-capital purchases (G11)', internalOnly: true,
           helpText: 'GST-inclusive non-capital purchases for the period, such as trading stock and operational supplies. Populated from Expense accounts tagged G11.' },
  '1A':  { title: 'GST on sales',                              description: 'GST collected on taxable sales (G1 × 1/11).',          natReference: 'NAT 7392 1A', plainEnglish: 'GST on sales (1A)',
           helpText: 'Total GST collected on sales for the BAS period. Calculated as the sum of GST amounts on G1-tagged transactions, representing 1/11th of taxable sales.' },
  '1B':  { title: 'GST on purchases (input tax credit)',       description: 'GST input tax credits from purchases ((G10+G11) × 1/11).', natReference: 'NAT 7392 1B', plainEnglish: 'GST on purchases (1B)',
           helpText: 'GST input tax credits available for the BAS period, representing the GST component of capital (G10) and non-capital (G11) purchases. Calculated as 1/11th of G10 plus G11.' },
  'W1':  { title: 'Total salary, wages and other payments',   description: 'PAYG withholding base — total wages and payments.',    natReference: 'NAT 7392 W1', plainEnglish: 'Wages and payments (W1)',
           helpText: 'Total wages and salaries paid in the period before any amounts withheld. Source: accounts tagged W1 representing the gross payroll for PAYG withholding purposes.' },
  'W2':  { title: 'Amounts withheld from W1',                  description: 'PAYG withholding amounts from W1 payments.',           natReference: 'NAT 7392 W2', plainEnglish: 'PAYG withholding (W2)',
           helpText: 'Total PAYG withholding amounts deducted from wages and salary payments (W1). This is the amount remitted to the ATO on behalf of employees.' },
  'W3':  { title: 'Amounts withheld where no TFN quoted',     description: 'Tax withheld where no TFN provided.',                  natReference: 'NAT 7392 W3', plainEnglish: 'No-TFN withholding (W3)',
           helpText: 'Tax withheld at the maximum rate from payments where the payee did not quote a Tax File Number. Populated from accounts tracking no-TFN withholding obligations.' },
  'W4':  { title: 'Amounts withheld from investment distributions', description: 'Tax withheld from investment distributions where no TFN.', natReference: 'NAT 7392 W4', plainEnglish: 'Investment withholding (W4)',
           helpText: 'Tax withheld from investment income distributions (such as trust distributions or dividends) where the recipient has not quoted a Tax File Number.' },
  'W5':  { title: 'Total amount withheld',                    description: 'Total PAYG withholding: W2 + W3 + W4.',                natReference: 'NAT 7392 W5', plainEnglish: 'Total withheld (W5)',
           helpText: 'Total PAYG withholding for the period, calculated as the sum of W2 (from wages), W3 (no-TFN payees), and W4 (no-TFN investment distributions).' },
  'T7':  { title: 'PAYG instalment amount',                   description: 'Option-1 instalment amount from ATO portal.',          natReference: 'NAT 7392 T7', plainEnglish: 'PAYG instalment (T7)',
           helpText: 'PAYG instalment amount for the period. Populated from the entity\'s stored ATO instalment notice amount entered in the entity settings.' },
};

/** IAS label set (subset of BAS — PAYG-only for non-GST-registered entities) */
export type IasLabel = 'W1' | 'W2' | 'W3' | 'W4' | 'W5' | 'T7';

/** Full label catalogue for IAS (PAYG-only entities). */
export const IAS_LABELS_FULL: Record<IasLabel, { title: string; description: string; natReference: string; plainEnglish: string; helpText: string }> = {
  'W1': { title: 'Total salary, wages and other payments', description: 'PAYG withholding base — total wages and payments.', natReference: 'NAT 7392 W1', plainEnglish: 'Wages and payments (W1)',
          helpText: 'Total wages and salaries paid in the period before any amounts withheld. Source: accounts tagged W1.' },
  'W2': { title: 'Amounts withheld from W1', description: 'PAYG withholding amounts from W1 payments.', natReference: 'NAT 7392 W2', plainEnglish: 'PAYG withholding (W2)',
          helpText: 'Total PAYG withholding deducted from wages and salary payments and remitted to the ATO on behalf of employees.' },
  'W3': { title: 'Amounts withheld where no TFN quoted', description: 'Tax withheld where no TFN provided.', natReference: 'NAT 7392 W3', plainEnglish: 'No-TFN withholding (W3)',
          helpText: 'Tax withheld at the maximum rate from payments where the payee did not quote a Tax File Number.' },
  'W4': { title: 'Amounts withheld from investment distributions', description: 'Tax withheld from investment distributions where no TFN.', natReference: 'NAT 7392 W4', plainEnglish: 'Investment withholding (W4)',
          helpText: 'Tax withheld from investment income distributions where the recipient did not quote a Tax File Number.' },
  'W5': { title: 'Total amount withheld', description: 'Total PAYG withholding: W2 + W3 + W4.', natReference: 'NAT 7392 W5', plainEnglish: 'Total withheld (W5)',
          helpText: 'Total PAYG withholding for the IAS period, calculated as the sum of W2, W3, and W4 withholding amounts.' },
  'T7': { title: 'PAYG instalment amount', description: 'Option-1 instalment amount from ATO portal.', natReference: 'NAT 7392 T7', plainEnglish: 'PAYG instalment (T7)',
          helpText: 'PAYG instalment amount for the period. Populated from the entity\'s stored ATO instalment notice amount.' },
};

/** Preserved for Phase 2 back-compat. */
export const BAS_LABELS: Record<'G1' | 'G2' | 'G3' | 'G10' | 'G11' | '1A' | '1B' | 'W1' | 'W2', { title: string; description: string }> = {
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
export const GST_RATE = '0.1' as const;

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
 * If BREPI exceeds 80% of total assessable income, the BRE rate does NOT apply.
 * Source: Income Tax Rates Act 1986 s.23AA (BRE definition) + s.23AB (BREPI definition).
 * (Phase 2 comment incorrectly cited ITAA 1997; corrected in Phase 5 Wave 0.)
 */
export const BRE_PASSIVE_THRESHOLD = '0.80' as const;

/**
 * BRE aggregate turnover threshold: $50,000,000 AUD.
 * Companies with aggregate turnover at or above this amount are not BREs.
 * Source: Income Tax Rates Act 1986 s.23AB (paragraph defining BRE aggregated turnover).
 */
export const BRE_TURNOVER_THRESHOLD = '50000000' as const;

// ── FY2026 marginal-rate brackets ──────────────────────────────────────────
// Source: ATO "Tax rates – Australian resident" 2025-26 (post-Stage-3, in force from 1 Jul 2024).
// https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
// Format: tax = baseAt + rate × (taxableIncome − bracketLower)
// lowerBounds: 0, 18200, 45000, 135000, 190000

export const FY2026_MARGINAL_BRACKETS = [
  { upTo: '18200',    rate: '0.00', baseAt: '0',     lowerBound: '0' },
  { upTo: '45000',    rate: '0.16', baseAt: '0',     lowerBound: '18200' },
  { upTo: '135000',   rate: '0.30', baseAt: '4288',  lowerBound: '45000' },
  { upTo: '190000',   rate: '0.37', baseAt: '31288', lowerBound: '135000' },
  { upTo: 'Infinity', rate: '0.45', baseAt: '51638', lowerBound: '190000' },
] as const;

// ── LITO constants ─────────────────────────────────────────────────────────
// Source: ATO "Low income tax offset" FY2025-26
// https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset

/** Maximum LITO: $700 for taxable income ≤ $37,500. */
export const LITO_MAX = '700' as const;
/** Taper stage 1 starts at $37,500 — LITO reduces by 5c per $1. */
export const LITO_TAPER_1_FROM = '37500' as const;
/** Stage-1 taper rate: 5c per $1. */
export const LITO_TAPER_1_RATE = '0.05' as const;
/** Taper stage 2 starts at $45,000 — LITO reduces by 1.5c per $1. */
export const LITO_TAPER_2_FROM = '45000' as const;
/** Stage-2 taper rate: 1.5c per $1. */
export const LITO_TAPER_2_RATE = '0.015' as const;
/** LITO cuts out to $0 at $66,667 (stage-2 fully tapers residual $325). */
export const LITO_CUTOUT = '66667' as const;

// ── Medicare levy + MLS constants ──────────────────────────────────────────
// Source: ATO "Medicare levy" + "Medicare levy surcharge" FY2025-26
// https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction-for-low-income-earners

/** Medicare levy: 2% of taxable income above the shade-in upper threshold. */
export const MEDICARE_LEVY_RATE = '0.02' as const;
/** Single (no dependants) lower threshold — no levy below this. FY2026 value. */
export const MEDICARE_LEVY_SINGLE_LOWER = '27222' as const;
/** Single upper threshold — full 2% levy above this. FY2026 value. */
export const MEDICARE_LEVY_SINGLE_UPPER = '34028' as const;
/** Shade-in rate: 10c per $1 between lower and upper thresholds. */
export const MEDICARE_LEVY_SINGLE_SHADING_RATE = '0.10' as const;

// Medicare Levy Surcharge tiers (single — no private hospital cover)
// Source: ATO "Medicare levy surcharge" FY2025-26
export const MLS_SINGLE_TIER_1 = '101000' as const;
export const MLS_SINGLE_TIER_2 = '118000' as const;
export const MLS_SINGLE_TIER_3 = '144000' as const;
export const MLS_SINGLE_RATE_1 = '0.01' as const;   // 1.0%
export const MLS_SINGLE_RATE_2 = '0.0125' as const; // 1.25%
export const MLS_SINGLE_RATE_3 = '0.015' as const;  // 1.5%

// Family MLS thresholds (Medicare levy surcharge)
export const MLS_FAMILY_TIER_1 = '202000' as const;
export const MLS_FAMILY_TIER_2 = '236000' as const;
export const MLS_FAMILY_TIER_3 = '288000' as const;

// ── Small Business Income Tax Offset (IND-04) ─────────────────────────────
// Source: ITAA 1997 Subdiv 328-F
// Eligible if sole trader with aggregated turnover < $5M.
// Offset = 16% × (tax payable × SB income share), capped at $1,000.

/** Rate for SBITO: 16% of tax payable on the SB income share. */
export const SBI_OFFSET_RATE = '0.16' as const;
/** Maximum SBITO per income year. */
export const SBI_OFFSET_CAP = '1000' as const;
/** Aggregated turnover threshold — must be below this to be eligible. */
export const SBI_OFFSET_TURNOVER_THRESHOLD = '5000000' as const;
