/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Account, JournalEntry } from '../types';
import { COMPANY_TAX_LABELS } from '../constants';
import { Building2, Info, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface CompanyTaxReturnProps {
  accounts: Account[];
  entries: JournalEntry[];
  onUpdateAccount: (account: Account) => void;
}

export const CompanyTaxReturn: React.FC<CompanyTaxReturnProps> = ({ accounts, entries, onUpdateAccount }) => {
  const [expandedLabels, setExpandedLabels] = useState<string[]>([]);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  const toggleLabel = (label: string) => {
    setExpandedLabels(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

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
  }, [entries, accounts]);

  const getAccountsForLabel = (label: string) => {
    return accounts.filter(a => a.companyTaxLabel === label);
  };

  const renderSection = (title: string, labels: Record<string, any>, data: Record<string, number>, highlightKeys: string[] = []) => (
    <div className="mb-8">
      <h3 className="col-header mb-4 border-b border-[var(--line-strong)] pb-2">{title}</h3>
      <div className="space-y-3">
        {Object.entries(labels).map(([label, info]) => {
          const value = data[label] || 0;
          const isHighlight = highlightKeys.includes(label);
          const isExpanded = expandedLabels.includes(label);
          const labelAccounts = getAccountsForLabel(label);
          const isCalculated = ['6T', '6S', '7T'].includes(label);

          return (
            <div key={label} className={cn(
              "border transition-all overflow-hidden",
              isHighlight ? "border-[var(--ink)] ring-1 ring-[var(--ink)]" : "border-[var(--line)]",
              isExpanded && "shadow-md"
            )}>
              <div 
                className={cn(
                  "flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 cursor-pointer transition-colors",
                  isHighlight ? "bg-gray-50" : "bg-white",
                  !isCalculated && "hover:bg-blue-50/30"
                )}
                onClick={() => !isCalculated && toggleLabel(label)}
              >
                <div className="flex items-start gap-4 flex-1">
                  <span className={cn(
                    "px-2 py-1 rounded text-[10px] font-mono font-bold shrink-0 w-16 text-center",
                    isHighlight ? "bg-[var(--ink)] text-white" : "bg-gray-100 text-gray-700"
                  )}>
                    {label.replace('_EXP', '')}
                  </span>
                  <div>
                    <div className={cn("text-sm", isHighlight ? "font-bold" : "font-bold")}>{info.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 max-w-md">{info.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6 mt-3 sm:mt-0">
                  <div className={cn("text-lg data-value", isHighlight ? "font-bold text-indigo-600" : "font-bold")}>
                    ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  {!isCalculated && (
                    <div className="text-gray-300">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && !isCalculated && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden bg-white border-t border-[var(--line)]"
                  >
                    <div className="p-4 bg-gray-50/50">
                      <div className="text-[10px] font-bold uppercase text-gray-400 mb-3 tracking-widest flex justify-between items-center">
                        Contributing Accounts
                        <span className="bg-white px-1.5 py-0.5 border border-gray-200 rounded">{labelAccounts.length}</span>
                      </div>
                      <div className="space-y-2">
                        {labelAccounts.length === 0 ? (
                          <div className="text-sm text-gray-400 italic py-2">No accounts mapped.</div>
                        ) : (
                          labelAccounts.map(account => (
                            <div key={account.id} className="flex justify-between items-center bg-white p-2 border border-[var(--line)] text-sm group">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-gray-400">{account.code}</span>
                                <span>{account.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                {editingAccountId === account.id ? (
                                  <select 
                                    className="text-xs border border-[var(--line)] p-1 bg-white"
                                    value={account.companyTaxLabel || ''}
                                    onChange={(e) => {
                                      onUpdateAccount({ ...account, companyTaxLabel: e.target.value });
                                      setEditingAccountId(null);
                                    }}
                                    onBlur={() => setEditingAccountId(null)}
                                    autoFocus
                                  >
                                    <option value="">Unmapped</option>
                                    {Object.entries(COMPANY_TAX_LABELS.INCOME).map(([l, i]) => <option key={l} value={l}>Income: {i.title}</option>)}
                                    {Object.entries(COMPANY_TAX_LABELS.EXPENSES).map(([l, i]) => <option key={l} value={l}>Expense: {i.title}</option>)}
                                  </select>
                                ) : (
                                  <button onClick={() => setEditingAccountId(account.id)} className="opacity-0 group-hover:opacity-100 p-1 text-blue-600">
                                    <Edit3 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                        <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                          <select 
                            className="w-full text-xs p-2 bg-white border border-[var(--line)]"
                            value=""
                            onChange={(e) => {
                              const acc = accounts.find(a => a.id === e.target.value);
                              if (acc) onUpdateAccount({ ...acc, companyTaxLabel: label });
                            }}
                          >
                            <option value="">Map additional account to {label}...</option>
                            {accounts
                              .filter(a => a.companyTaxLabel !== label && (a.type === 'Revenue' || a.type === 'Expense'))
                              .map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)
                            }
                          </select>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
          Values are calculated based on your posted journal entries. Click a label to view contributing accounts and edit mappings.
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
