/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Account, JournalEntry } from '../types';
import { COMPANY_TAX_LABELS } from '../constants';
import { Building2, Info } from 'lucide-react';

interface CompanyTaxReturnProps {
  accounts: Account[];
  entries: JournalEntry[];
}

export const CompanyTaxReturn: React.FC<CompanyTaxReturnProps> = ({ accounts, entries }) => {
  const taxData = useMemo(() => {
    const labelBalances: Record<string, number> = {};

    // Aggregate by company tax label
    entries.forEach(entry => {
      entry.lines.forEach(line => {
        const account = accounts.find(a => a.id === line.accountId);
        if (account?.companyTaxLabel) {
          const amount = (Number(line.credit) || 0) - (Number(line.debit) || 0);
          // For expenses, we usually want positive values for the return
          const multiplier = account.type === 'Expense' ? -1 : 1;
          
          labelBalances[account.companyTaxLabel] = (labelBalances[account.companyTaxLabel] || 0) + (amount * multiplier);
        }
      });
    });

    // Calculate Totals
    const totalIncome = Object.entries(COMPANY_TAX_LABELS.INCOME)
      .filter(([key]) => key !== '6T')
      .reduce((sum, [key]) => sum + (labelBalances[key] || 0), 0);
      
    const totalExpenses = Object.entries(COMPANY_TAX_LABELS.EXPENSES)
      .filter(([key]) => key !== '6S')
      .reduce((sum, [key]) => sum + (labelBalances[key] || 0), 0);

    labelBalances['6T'] = totalIncome;
    labelBalances['6S'] = totalExpenses;
    labelBalances['7T'] = totalIncome - totalExpenses;

    return labelBalances;
  }, [entries]);

  const renderSection = (title: string, labels: Record<string, string>, data: Record<string, number>, highlightKeys: string[] = []) => (
    <div className="mb-8">
      <h3 className="col-header mb-4 border-b border-[var(--line-strong)] pb-2">{title}</h3>
      <div className="space-y-2">
        {Object.entries(labels).map(([label, description]) => {
          const value = data[label] || 0;
          const isHighlight = highlightKeys.includes(label);
          return (
            <div key={label} className={`flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 border ${isHighlight ? 'border-[var(--ink)] bg-gray-50' : 'border-[var(--line)]'} hover:border-[var(--ink)] transition-colors gap-2 sm:gap-4`}>
              <div className="flex items-start sm:items-center gap-3">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold shrink-0 ${isHighlight ? 'bg-[var(--ink)] text-white' : 'bg-gray-100 text-gray-700'}`}>
                  {label.replace('_EXP', '')}
                </span>
                <span className={`text-sm ${isHighlight ? 'font-bold' : 'font-medium'}`}>{description}</span>
              </div>
              <div className={`text-lg data-value ${isHighlight ? 'font-bold' : ''} text-right sm:text-left`}>
                ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="bg-white p-4 sm:p-6 shadow-sm border border-[var(--line-strong)]">
      <div className="flex items-center gap-2 mb-6">
        <Building2 className="text-indigo-600" />
        <h2 className="text-xl font-medium">Company Tax Return (CTR)</h2>
      </div>

      <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 mb-8 flex gap-3">
        <Info className="text-indigo-500 shrink-0" size={20} />
        <p className="text-sm text-indigo-800">
          This assistant maps your Chart of Accounts to standard ATO Company Tax Return labels (Item 6 and Item 7). 
          Values are calculated based on your posted journal entries.
        </p>
      </div>

      <div className="space-y-4">
        {renderSection('Item 6: Calculation of total profit or loss - Income', COMPANY_TAX_LABELS.INCOME, taxData, ['6T'])}
        {renderSection('Item 6: Calculation of total profit or loss - Expenses', COMPANY_TAX_LABELS.EXPENSES, taxData, ['6S'])}
        {renderSection('Item 7: Reconciliation to taxable income or loss', COMPANY_TAX_LABELS.RECONCILIATION, taxData, ['7T'])}
      </div>

      <div className="mt-8 pt-6 border-t border-[var(--line)]">
        <h3 className="col-header mb-4">Accountant's Reconciliation</h3>
        <div className="text-xs text-gray-500 italic">
          * Note: These figures are pre-tax and exclude GST. Ensure all BAS reconciliations and depreciation schedules are complete before finalising the company tax return.
        </div>
      </div>
    </div>
  );
};
