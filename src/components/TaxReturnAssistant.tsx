/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Account, JournalEntry } from '../types';
import { TAX_LABELS } from '../constants';
import { FileText, Info, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface TaxReturnAssistantProps {
  accounts: Account[];
  entries: JournalEntry[];
  onUpdateAccount: (account: Account) => void;
}

export const TaxReturnAssistant: React.FC<TaxReturnAssistantProps> = ({ accounts, entries, onUpdateAccount }) => {
  const [expandedLabels, setExpandedLabels] = useState<string[]>([]);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  const toggleLabel = (label: string) => {
    setExpandedLabels(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const taxData = useMemo(() => {
    const labelBalances: Record<string, number> = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    // Aggregate by tax label
    entries.forEach(entry => {
      entry.lines.forEach(line => {
        const account = accounts.find(a => a.id === line.accountId);
        if (account?.taxLabel) {
          const amount = (Number(line.credit) || 0) - (Number(line.debit) || 0);
          const isExpense = ['6L', '6N', '6Q'].includes(account.taxLabel);
          const multiplier = isExpense ? -1 : 1;
          
          const adjustedAmount = amount * multiplier;
          labelBalances[account.taxLabel] = (labelBalances[account.taxLabel] || 0) + adjustedAmount;
          
          if (isExpense) {
            totalExpenses += adjustedAmount;
          } else {
            totalIncome += adjustedAmount;
          }
        }
      });
    });

    labelBalances['7T'] = totalIncome - totalExpenses;

    return labelBalances;
  }, [entries, accounts]);

  const getAccountsForLabel = (label: string) => {
    return accounts.filter(a => a.taxLabel === label);
  };

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
          Values are calculated based on your posted journal entries. You can directly edit mappings by expanding a label.
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(TAX_LABELS).map(([label, info]: [string, any]) => {
          const value = taxData[label] || 0;
          const isExpanded = expandedLabels.includes(label);
          const labelAccounts = getAccountsForLabel(label);

          return (
            <div key={label} className="border border-[var(--line)] overflow-hidden">
              <div 
                className={cn(
                  "flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors",
                  isExpanded && "bg-gray-50 border-b border-[var(--line)]"
                )}
                onClick={() => toggleLabel(label)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="bg-[var(--ink)] text-white px-2 py-1 rounded text-xs font-mono font-bold w-16 text-center">
                    {label}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{info.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{info.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-lg font-bold data-value">
                    ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden bg-gray-50/50"
                  >
                    <div className="p-4 pt-2">
                      <div className="text-[10px] font-bold uppercase text-gray-400 mb-3 tracking-widest flex justify-between items-center">
                        Mapped Accounts
                        <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{labelAccounts.length} accounts</span>
                      </div>
                      
                      <div className="space-y-2">
                        {labelAccounts.length === 0 ? (
                          <div className="text-sm text-gray-400 italic py-2">No accounts mapped to this label.</div>
                        ) : (
                          labelAccounts.map(account => (
                            <div key={account.id} className="flex justify-between items-center bg-white p-2 border border-[var(--line)] text-sm shadow-sm group">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-gray-400">{account.code}</span>
                                <span className="font-medium">{account.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                {editingAccountId === account.id ? (
                                  <select 
                                    className="text-xs border border-[var(--line)] p-1 bg-white outline-none focus:border-[var(--ink)]"
                                    value={account.taxLabel || ''}
                                    onChange={(e) => {
                                      onUpdateAccount({ ...account, taxLabel: e.target.value });
                                      setEditingAccountId(null);
                                    }}
                                    onBlur={() => setEditingAccountId(null)}
                                    autoFocus
                                  >
                                    <option value="">Unmapped</option>
                                    {Object.keys(TAX_LABELS).map(l => (
                                      <option key={l} value={l}>Label {l}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <button 
                                    onClick={() => setEditingAccountId(account.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded text-blue-600"
                                    title="Edit mapping"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                        
                        <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-2">Add mapping from Chart of Accounts</label>
                          <select 
                            className="w-full text-xs border border-[var(--line)] p-2 bg-white outline-none focus:border-[var(--ink)]"
                            value=""
                            onChange={(e) => {
                              const acc = accounts.find(a => a.id === e.target.value);
                              if (acc) onUpdateAccount({ ...acc, taxLabel: label });
                            }}
                          >
                            <option value="" disabled>Select account to map to {label}...</option>
                            {accounts
                              .filter(a => a.taxLabel !== label && (a.type === 'Revenue' || a.type === 'Expense'))
                              .sort((a,b) => a.code.localeCompare(b.code))
                              .map(a => (
                                <option key={a.id} value={a.id}>
                                  {a.code} - {a.name} (Current: {a.taxLabel || 'N/A'})
                                </option>
                              ))
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

        {/* Total Taxable Income Summary Row */}
        <div className="border-2 border-[var(--ink)] overflow-hidden shadow-sm mt-8">
          <div className="flex justify-between items-center p-4 bg-gray-900 text-white">
            <div className="flex items-center gap-4 flex-1">
              <div className="bg-white text-black px-2 py-1 rounded text-xs font-mono font-bold w-16 text-center">
                7T
              </div>
              <div>
                <div className="text-sm font-bold">Total Taxable Income</div>
                <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider font-bold">Calculated Reconciliation Item</div>
              </div>
            </div>
            <div className="text-xl font-bold font-mono">
              ${(taxData['7T'] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
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
