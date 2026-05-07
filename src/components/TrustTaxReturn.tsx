/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { JournalEntry } from '../types';
import { CHART_OF_ACCOUNTS, TRUST_TAX_LABELS } from '../constants';
import { Landmark, Info } from 'lucide-react';

interface TrustTaxReturnProps {
  entries: JournalEntry[];
}

export const TrustTaxReturn: React.FC<TrustTaxReturnProps> = ({ entries }) => {
  const taxData = useMemo(() => {
    const labelBalances: Record<string, number> = {};

    // Aggregate by trust tax label
    entries.forEach(entry => {
      entry.lines.forEach(line => {
        const account = CHART_OF_ACCOUNTS.find(a => a.id === line.accountId);
        if (account?.trustTaxLabel) {
          const amount = (Number(line.credit) || 0) - (Number(line.debit) || 0);
          // For expenses, we usually want positive values for the return
          const multiplier = account.type === 'Expense' ? -1 : 1;
          
          labelBalances[account.trustTaxLabel] = (labelBalances[account.trustTaxLabel] || 0) + (amount * multiplier);
        }
      });
    });

    // Calculate Totals
    const totalIncome = Object.entries(TRUST_TAX_LABELS.INCOME)
      .filter(([key]) => key !== '5T')
      .reduce((sum, [key]) => sum + (labelBalances[key] || 0), 0);
      
    const totalExpenses = Object.entries(TRUST_TAX_LABELS.EXPENSES)
      .filter(([key]) => key !== '5S')
      .reduce((sum, [key]) => sum + (labelBalances[key] || 0), 0);

    labelBalances['5T'] = totalIncome;
    labelBalances['5S'] = totalExpenses;
    labelBalances['26'] = totalIncome - totalExpenses;

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
                  {label}
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
        <Landmark className="text-emerald-600" />
        <h2 className="text-xl font-medium">Trust Tax Return</h2>
      </div>

      <div className="bg-emerald-50 border-l-4 border-emerald-400 p-4 mb-8 flex gap-3">
        <Info className="text-emerald-600 shrink-0" size={20} />
        <p className="text-sm text-emerald-800">
          This assistant maps your Chart of Accounts to standard ATO Trust Tax Return labels (Items 5, 11, and 26). 
          Values are calculated based on your posted journal entries.
        </p>
      </div>

      <div className="space-y-4">
        {renderSection('Item 5 & 11: Business Income and Interest', TRUST_TAX_LABELS.INCOME, taxData, ['5T'])}
        {renderSection('Item 5: Business Expenses', TRUST_TAX_LABELS.EXPENSES, taxData, ['5S'])}
        {renderSection('Item 26: Total net income or loss', TRUST_TAX_LABELS.RECONCILIATION, taxData, ['26'])}
      </div>

      <div className="mt-8 pt-6 border-t border-[var(--line)]">
        <h3 className="col-header mb-4">Accountant's Reconciliation</h3>
        <div className="text-xs text-gray-500 italic">
          * Note: These figures are pre-tax and exclude GST. Ensure all distributions to beneficiaries are correctly calculated from the net income at Item 26.
        </div>
      </div>
    </div>
  );
};
