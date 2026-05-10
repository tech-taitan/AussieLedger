/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Account } from './types';

export const CHART_OF_ACCOUNTS: Account[] = [
  // Assets
  { id: '1-1110', code: '1110', name: 'General Check Account', type: 'Asset', gstCode: 'N-T' },
  { id: '1-1200', code: '1200', name: 'Accounts Receivable', type: 'Asset', gstCode: 'GST' },
  { id: '1-1300', code: '1300', name: 'Inventory', type: 'Asset', gstCode: 'GST' },
  
  // Liabilities
  { id: '2-2100', code: '2100', name: 'Accounts Payable', type: 'Liability', gstCode: 'GST' },
  { id: '2-2200', code: '2200', name: 'GST Collected', type: 'Liability', gstCode: 'N-T' },
  { id: '2-2210', code: '2210', name: 'GST Paid', type: 'Liability', gstCode: 'N-T' },
  { id: '2-2300', code: '2300', name: 'PAYG Withholding Payable', type: 'Liability', gstCode: 'N-T' },

  // Equity
  { id: '3-3100', code: '3100', name: 'Retained Earnings', type: 'Equity', gstCode: 'N-T' },
  { id: '3-3200', code: '3200', name: 'Owner Contribution', type: 'Equity', gstCode: 'N-T' },

  // Revenue
  { id: '4-4100', code: '4100', name: 'Sales', type: 'Revenue', taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B', partnershipTaxLabel: 'P1', gstCode: 'GST' },
  { id: '4-4200', code: '4200', name: 'Interest Income', type: 'Revenue', taxLabel: '6K', companyTaxLabel: '6F', trustTaxLabel: '11J', partnershipTaxLabel: 'P1', gstCode: 'FRE' },

  // Expenses
  { id: '6-6100', code: '6100', name: 'Advertising', type: 'Expense', taxLabel: '6N', companyTaxLabel: '6X', trustTaxLabel: '5N', partnershipTaxLabel: 'P2', gstCode: 'GST' },
  { id: '6-6200', code: '6200', name: 'Bank Charges', type: 'Expense', taxLabel: '6N', companyTaxLabel: '6X', trustTaxLabel: '5N', partnershipTaxLabel: 'P2', gstCode: 'N-T' },
  { id: '6-6300', code: '6300', name: 'Rent', type: 'Expense', taxLabel: '6N', companyTaxLabel: '6G', trustTaxLabel: '5F', partnershipTaxLabel: 'P2', gstCode: 'GST' },
  { id: '6-6400', code: '6400', name: 'Wages & Salaries', type: 'Expense', taxLabel: '6L', companyTaxLabel: '6X', trustTaxLabel: '5M', partnershipTaxLabel: 'P2', gstCode: 'N-T' },
  { id: '6-6500', code: '6500', name: 'Superannuation', type: 'Expense', taxLabel: '6L', companyTaxLabel: '6C', trustTaxLabel: '5L', partnershipTaxLabel: 'P2', gstCode: 'N-T' },
];

export const TAX_LABELS = {
  '6S': { title: 'Total Business Income', description: 'Includes gross payments where ABN not quoted and other business income.' },
  '6K': { title: 'Gross Interest', description: 'Total interest earned from bank accounts, term deposits, and other investments.' },
  '6L': { title: 'Salary and Wage Expenses', description: 'Total gross salaries and wages paid to employees, including directors fees.' },
  '6N': { title: 'All Other Expenses', description: 'Operational expenses not specifically categorised elsewhere in the return.' },
  '6Q': { title: 'Cost of Sales', description: 'Direct costs attributable to the production of the goods sold by the business.' },
};

export const COMPANY_TAX_LABELS = {
  INCOME: {
    '6A': { title: 'Gross sales', description: 'Total sales of goods and services, excluding GST.' },
    '6F': { title: 'Gross interest', description: 'Income from interest-bearing accounts and investments.' },
    '6T': { title: 'Total income', description: 'Calculated sum of all income items for the period.' }
  },
  EXPENSES: {
    '6A_EXP': { title: 'Cost of sales', description: 'Direct costs of goods sold or services provided.' },
    '6C': { title: 'Superannuation expenses', description: 'Employer superannuation contributions for employees.' },
    '6G': { title: 'Rent expenses', description: 'Expenses for rent on business premises.' },
    '6X': { title: 'All other expenses', description: 'General business and administrative expenses.' },
    '6S': { title: 'Total expenses', description: 'Calculated sum of all expense items for the period.' }
  },
  RECONCILIATION: {
    '7T': { title: 'Taxable income or loss', description: 'The final figure on which tax is calculated after adjustments.' }
  }
};

export const TRUST_TAX_LABELS = {
  INCOME: {
    '5B': { title: 'Gross payments (Sales)', description: 'Total gross business income from sales of goods or services.' },
    '11J': { title: 'Gross interest', description: 'Interest income derived by the trust.' },
    '5T': { title: 'Total business income', description: 'Aggregate business income from all sources.' }
  },
  EXPENSES: {
    '5E': { title: 'Cost of sales', description: 'Direct costs associated with earning business income.' },
    '5F': { title: 'Rent expenses', description: 'Lease and rent payments for business-related properties.' },
    '5L': { title: 'Superannuation expenses', description: 'Compulsory superannuation for trust employees.' },
    '5M': { title: 'Total salary and wage expenses', description: 'Gross salaries, wages and other benefits paid.' },
    '5N': { title: 'All other expenses', description: 'Miscellaneous business deductions.' },
    '5S': { title: 'Total expenses', description: 'Sum of all deductible expenses for the trust.' }
  },
  RECONCILIATION: {
    '26': { title: 'Total net income or loss', description: 'Net trust income to be distributed to beneficiaries.' }
  }
};

