/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { JournalEntry } from '../types';
import { CHART_OF_ACCOUNTS, TAX_LABELS } from '../constants';
import { FileText, Info } from 'lucide-react';

interface TaxReturnAssistantProps {
  entries: JournalEntry[];
}

export const TaxReturnAssistant: React.FC<TaxReturnAssistantProps> = ({ entries }) => {
  const taxData = useMemo(() => {
    const labelBalances: Record<string, number> = {};

    // Aggregate by tax label
    entries.forEach(entry => {
      entry.lines.forEach(line => {
        const account = CHART_OF_ACCOUNTS.find(a => a.id === line.accountId);
        if (account?.taxLabel) {
          const amount = (Number(line.credit) || 0) - (Number(line.debit) || 0);
          // For expenses (6L, 6N, 6Q), we usually want positive values for the return
          const multiplier = ['6L', '6N', '6Q'].includes(account.taxLabel) ? -1 : 1;
          
          labelBalances[account.taxLabel] = (labelBalances[account.taxLabel] || 0) + (amount * multiplier);
        }
      });
    });

    return labelBalances;
  }, [entries]);

  return (
    <div className="bg-white p-6 shadow-sm border border-[var(--line-strong)]">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="text-blue-600" />
        <h2 className="text-xl font-medium">AU Income Tax Return Assistant</h2>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 flex gap-3">
        <Info className="text-blue-500 shrink-0" size={20} />
        <p className="text-sm text-blue-800">
          This assistant maps your Chart of Accounts to standard ATO Income Tax Return labels. 
          Values are calculated based on your posted journal entries.
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(TAX_LABELS).map(([label, description]) => {
          const value = taxData[label] || 0;
          return (
            <div key={label} className="flex justify-between items-center p-3 border border-[var(--line)] hover:border-[var(--ink)] transition-colors">
              <div>
                <span className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono font-bold mr-3">
                  Label {label}
                </span>
                <span className="text-sm font-medium">{description}</span>
              </div>
              <div className="text-lg font-bold data-value">
                ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-[var(--line)]">
        <h3 className="col-header mb-4">Accountant's Reconciliation</h3>
        <div className="text-xs text-gray-500 italic">
          * Note: These figures are pre-tax and exclude GST. Ensure all BAS reconciliations are complete before finalising the return.
        </div>
      </div>
    </div>
  );
};
