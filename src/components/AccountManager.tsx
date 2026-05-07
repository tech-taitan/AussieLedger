/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Account, AccountType } from '../types';
import { Save, X, Plus, Trash2, Edit2, ListTree, Hash, Tag } from 'lucide-react';
import { cn } from '../lib/utils';
import { COMPANY_TAX_LABELS, TRUST_TAX_LABELS, TAX_LABELS } from '../constants';

interface AccountManagerProps {
  accounts: Account[];
  onSave: (accounts: Account[]) => void;
  onCancel: () => void;
}

export const AccountManager: React.FC<AccountManagerProps> = ({ accounts, onSave, onCancel }) => {
  const [localAccounts, setLocalAccounts] = useState<Account[]>([...accounts]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Account>>({});

  const ACCOUNT_TYPES: AccountType[] = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
  const GST_CODES = ['GST', 'FRE', 'N-T', 'ITS', 'CAP'];

  const handleStartEdit = (account: Account) => {
    setEditingId(account.id);
    setEditFormData({ ...account });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleSaveEdit = () => {
    if (!editFormData.code || !editFormData.name) return;
    
    setLocalAccounts(prev => prev.map(a => 
      a.id === editingId ? { ...a, ...editFormData } as Account : a
    ));
    setEditingId(null);
    setEditFormData({});
  };

  const handleAddAccount = () => {
    const newAccount: Account = {
      id: `acc-${Date.now()}`,
      code: '',
      name: 'New Account',
      type: 'Expense',
      gstCode: 'GST'
    };
    setLocalAccounts([newAccount, ...localAccounts]);
    setEditingId(newAccount.id);
    setEditFormData(newAccount);
  };

  const handleDeleteAccount = (id: string) => {
    if (confirm('Are you sure you want to delete this account? Any existing transactions using this account may cause errors.')) {
      setLocalAccounts(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleSaveAll = () => {
    onSave(localAccounts);
  };

  // Group labels for UI selection
  const allTaxLabels = [
    ...Object.keys(TAX_LABELS),
    ...Object.keys(COMPANY_TAX_LABELS.INCOME),
    ...Object.keys(COMPANY_TAX_LABELS.EXPENSES),
    ...Object.keys(TRUST_TAX_LABELS.INCOME),
    ...Object.keys(TRUST_TAX_LABELS.EXPENSES)
  ].filter((v, i, a) => a.indexOf(v) === i); // Deduplicate

  return (
    <div className="bg-white border border-[var(--line-strong)] shadow-sm">
      <div className="p-4 border-b border-[var(--line)] bg-gray-50 flex justify-between items-center">
        <h3 className="col-header flex items-center gap-2">
          <ListTree size={16} />
          Configure Chart of Accounts
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleAddAccount}
            className="bg-[var(--ink)] text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> Add Account
          </button>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--line-strong)]">
                <th className="p-2 text-[10px] font-bold uppercase text-gray-500">Code</th>
                <th className="p-2 text-[10px] font-bold uppercase text-gray-500">Account Name</th>
                <th className="p-2 text-[10px] font-bold uppercase text-gray-500">Type</th>
                <th className="p-2 text-[10px] font-bold uppercase text-gray-500">GST</th>
                <th className="p-2 text-[10px] font-bold uppercase text-gray-500">Tax Mapping</th>
                <th className="p-2 text-[10px] font-bold uppercase text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {localAccounts.sort((a, b) => a.code.localeCompare(b.code)).map((account) => (
                <tr key={account.id} className={cn(
                  "hover:bg-gray-50/50 transition-colors",
                  editingId === account.id ? "bg-indigo-50/50" : ""
                )}>
                  <td className="p-2 text-xs font-mono">
                    {editingId === account.id ? (
                      <input
                        type="text"
                        value={editFormData.code}
                        onChange={e => setEditFormData({ ...editFormData, code: e.target.value })}
                        className="w-20 p-1 border border-[var(--line-strong)] focus:outline-none"
                      />
                    ) : (
                      account.code
                    )}
                  </td>
                  <td className="p-2 text-xs font-medium">
                    {editingId === account.id ? (
                      <input
                        type="text"
                        value={editFormData.name}
                        onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full p-1 border border-[var(--line-strong)] focus:outline-none"
                      />
                    ) : (
                      account.name
                    )}
                  </td>
                  <td className="p-2 text-xs">
                    {editingId === account.id ? (
                      <select
                        value={editFormData.type}
                        onChange={e => setEditFormData({ ...editFormData, type: e.target.value as AccountType })}
                        className="p-1 border border-[var(--line-strong)] focus:outline-none text-xs bg-white"
                      >
                        {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold uppercase">
                        {account.type}
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-xs font-bold text-blue-600">
                    {editingId === account.id ? (
                      <select
                        value={editFormData.gstCode}
                        onChange={e => setEditFormData({ ...editFormData, gstCode: e.target.value })}
                        className="p-1 border border-[var(--line-strong)] focus:outline-none text-xs bg-white"
                      >
                        {GST_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      account.gstCode
                    )}
                  </td>
                  <td className="p-2 text-[10px] text-gray-500">
                    {editingId === account.id ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="w-8 text-[8px] font-bold text-gray-400">IND:</span>
                          <select
                            value={editFormData.taxLabel || ''}
                            onChange={e => setEditFormData({ ...editFormData, taxLabel: e.target.value })}
                            className="flex-1 p-1 border border-[var(--line-strong)] focus:outline-none text-[10px] bg-white"
                          >
                            <option value="">None</option>
                            {Object.entries(TAX_LABELS).map(([k, v]) => <option key={k} value={k}>{k}: {v}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-8 text-[8px] font-bold text-gray-400">CO:</span>
                          <select
                            value={editFormData.companyTaxLabel || ''}
                            onChange={e => setEditFormData({ ...editFormData, companyTaxLabel: e.target.value })}
                            className="flex-1 p-1 border border-[var(--line-strong)] focus:outline-none text-[10px] bg-white"
                          >
                            <option value="">None</option>
                            {[...Object.entries(COMPANY_TAX_LABELS.INCOME), ...Object.entries(COMPANY_TAX_LABELS.EXPENSES)].map(([k, v]) => (
                              <option key={k} value={k}>{k}: {v}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-8 text-[8px] font-bold text-gray-400">TRU:</span>
                          <select
                            value={editFormData.trustTaxLabel || ''}
                            onChange={e => setEditFormData({ ...editFormData, trustTaxLabel: e.target.value })}
                            className="flex-1 p-1 border border-[var(--line-strong)] focus:outline-none text-[10px] bg-white"
                          >
                            <option value="">None</option>
                            {[...Object.entries(TRUST_TAX_LABELS.INCOME), ...Object.entries(TRUST_TAX_LABELS.EXPENSES)].map(([k, v]) => (
                              <option key={k} value={k}>{k}: {v}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {account.taxLabel && <span className="bg-amber-50 text-amber-700 px-1 border border-amber-200">Ind: {account.taxLabel}</span>}
                        {account.companyTaxLabel && <span className="bg-blue-50 text-blue-700 px-1 border border-blue-200">Co: {account.companyTaxLabel}</span>}
                        {account.trustTaxLabel && <span className="bg-emerald-50 text-emerald-700 px-1 border border-emerald-200">Tr: {account.trustTaxLabel}</span>}
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-right">
                    {editingId === account.id ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={handleSaveEdit} className="text-emerald-600 hover:text-emerald-700">
                          <Save size={16} />
                        </button>
                        <button onClick={handleCancelEdit} className="text-rose-600 hover:text-rose-700">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleStartEdit(account)} className="text-gray-400 hover:text-indigo-600">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteAccount(account.id)} className="text-gray-400 hover:text-rose-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--line)] flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium border border-[var(--line)] hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAll}
            className="bg-[var(--ink)] text-white px-6 py-2 text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Save size={16} />
            Commit Changes to Chart of Accounts
          </button>
        </div>
      </div>
    </div>
  );
};
