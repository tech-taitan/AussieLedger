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
  { id: '4-4100', code: '4100', name: 'Sales', type: 'Revenue', taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B', gstCode: 'GST' },
  { id: '4-4200', code: '4200', name: 'Interest Income', type: 'Revenue', taxLabel: '6K', companyTaxLabel: '6F', trustTaxLabel: '11J', gstCode: 'FRE' },

  // Expenses
  { id: '6-6100', code: '6100', name: 'Advertising', type: 'Expense', taxLabel: '6N', companyTaxLabel: '6X', trustTaxLabel: '5N', gstCode: 'GST' },
  { id: '6-6200', code: '6200', name: 'Bank Charges', type: 'Expense', taxLabel: '6N', companyTaxLabel: '6X', trustTaxLabel: '5N', gstCode: 'N-T' },
  { id: '6-6300', code: '6300', name: 'Rent', type: 'Expense', taxLabel: '6N', companyTaxLabel: '6G', trustTaxLabel: '5F', gstCode: 'GST' },
  { id: '6-6400', code: '6400', name: 'Wages & Salaries', type: 'Expense', taxLabel: '6L', companyTaxLabel: '6X', trustTaxLabel: '5M', gstCode: 'N-T' },
  { id: '6-6500', code: '6500', name: 'Superannuation', type: 'Expense', taxLabel: '6L', companyTaxLabel: '6C', trustTaxLabel: '5L', gstCode: 'N-T' },
];

export const TAX_LABELS = {
  '6S': 'Total Business Income',
  '6K': 'Gross Interest',
  '6L': 'Salary and Wage Expenses',
  '6N': 'All Other Expenses',
  '6Q': 'Cost of Sales',
};

export const COMPANY_TAX_LABELS = {
  INCOME: {
    '6A': 'Gross sales',
    '6F': 'Gross interest',
    '6T': 'Total income (Calculated)'
  },
  EXPENSES: {
    '6A_EXP': 'Cost of sales',
    '6C': 'Superannuation expenses',
    '6G': 'Rent expenses',
    '6X': 'All other expenses',
    '6S': 'Total expenses (Calculated)'
  },
  RECONCILIATION: {
    '7T': 'Taxable income or loss'
  }
};

export const TRUST_TAX_LABELS = {
  INCOME: {
    '5B': 'Gross payments (Sales)',
    '11J': 'Gross interest',
    '5T': 'Total business income (Calculated)'
  },
  EXPENSES: {
    '5E': 'Cost of sales',
    '5F': 'Rent expenses',
    '5L': 'Superannuation expenses',
    '5M': 'Total salary and wage expenses',
    '5N': 'All other expenses',
    '5S': 'Total expenses (Calculated)'
  },
  RECONCILIATION: {
    '26': 'Total net income or loss'
  }
};

