/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Account, AccountType, JournalEntry } from '../types';
import { Save, X, Plus, Trash2, Edit2, ListTree } from 'lucide-react';
import { cn } from '../lib/utils';
import { COMPANY_TAX_LABELS, TRUST_TAX_LABELS, TAX_LABELS } from '../constants';
import { PARTNERSHIP_LABELS } from '../lib/tax/labels/fy2026';
import { CoaTreeView } from './CoaTreeView';

interface AccountManagerProps {
  accounts: Account[];
  onSave: (accounts: Account[]) => void;
  onCancel: () => void;
  // Phase 4 additions (all optional — preserves the Phase 2 contract)
  allEntries?: Record<string, JournalEntry[]>;
  onArchiveAccount?: (id: string) => void;
  onIsAccountInUse?: (
    id: string,
    allEntries: Record<string, JournalEntry[]>,
  ) => boolean;
}

export const AccountManager: React.FC<AccountManagerProps> = ({
  accounts,
  onSave,
  onCancel,
  allEntries,
  onArchiveAccount,
  onIsAccountInUse,
}) => {
  const [localAccounts, setLocalAccounts] = useState<Account[]>([...accounts]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Account>>({});
  const [showArchived, setShowArchived] = useState(false);

  const ACCOUNT_TYPES: AccountType[] = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
  // Phase 4 — corrected to the AU GST set per RESEARCH Pitfall 9.
  // Set: GST / FRE / INP (Input-taxed) / N-T / CAP. CONTEXT "CoA shape" decisions.
  const GST_CODES = ['GST', 'FRE', 'INP', 'N-T', 'CAP'];

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
      a.id === editingId
        ? { ...a, ...editFormData, _needsReview: undefined } as Account
        : a
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

  // Phase 4 — Block-or-Archive deletion policy (CONTEXT "Deletion & Import").
  // Default accounts: archive only (no hard delete).
  // User accounts in use: block + offer archive.
  // User accounts free of references: hard delete allowed.
  const handleDeleteAccount = (id: string) => {
    const account = localAccounts.find((a) => a.id === id);
    if (!account) return;

    const inUse = onIsAccountInUse?.(id, allEntries ?? {}) ?? false;

    if (account.isDefault) {
      const confirmed = confirm(
        'This is a default account. Archive instead of delete? Archived accounts are hidden from journal pickers but remain in historical reports.',
      );
      if (confirmed) {
        if (onArchiveAccount) {
          onArchiveAccount(id);
        } else {
          setLocalAccounts((prev) =>
            prev.map((a) => (a.id === id ? { ...a, isArchived: true } : a)),
          );
        }
      }
      return;
    }

    if (inUse) {
      const confirmed = confirm(
        'Cannot delete — this account is referenced by journal entries. Archive instead?',
      );
      if (confirmed) {
        if (onArchiveAccount) {
          onArchiveAccount(id);
        } else {
          setLocalAccounts((prev) =>
            prev.map((a) => (a.id === id ? { ...a, isArchived: true } : a)),
          );
        }
      }
      return;
    }

    if (confirm('Delete this user-added account? This cannot be undone.')) {
      setLocalAccounts((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleSaveAll = () => {
    onSave(localAccounts);
  };

  // Accounts requiring review after migration
  const needsReviewAccounts = localAccounts.filter(a => a._needsReview);

  // Phase 4 — filter the table rows by archived toggle (same source feeds tree view).
  const visibleAccounts = localAccounts.filter((a) => showArchived || !a.isArchived);

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
        {/* Review-needed banner */}
        {needsReviewAccounts.length > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
            <h4 className="font-bold text-amber-900">Review needed</h4>
            <p className="text-sm text-amber-800">The following accounts have incomplete tax-label mappings (added by schema migration):</p>
            <ul className="mt-2 text-sm text-amber-800 list-disc list-inside">
              {needsReviewAccounts.map(a => (
                <li key={a.id}>{a.code} – {a.name}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Phase 4 — archived-toggle (CONTEXT: archived accounts hidden by default,
            filterable to show; consistent with journal-picker behaviour). */}
        <label
          className="flex items-center gap-2 text-sm mb-3"
          data-testid="show-archived-toggle"
        >
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived accounts
        </label>

        {/* Phase 4 — tree view for browse mode (BOOK-07 parent/child). Inline edit
            stays per-row in the table below when editingId is set. */}
        {!editingId && (
          <div className="mb-4 border border-[var(--line)] rounded">
            <CoaTreeView
              accounts={localAccounts}
              onSelect={(id) => {
                const a = localAccounts.find((x) => x.id === id);
                if (a) handleStartEdit(a);
              }}
              selectedId={editingId ?? undefined}
              showArchived={showArchived}
            />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--line-strong)]">
                <th className="p-2 text-[10px] font-bold uppercase text-gray-500">Code</th>
                <th className="p-2 text-[10px] font-bold uppercase text-gray-500">Account Name</th>
                <th className="p-2 text-[10px] font-bold uppercase text-gray-500">Type</th>
                <th className="p-2 text-[10px] font-bold uppercase text-gray-500">GST</th>
                <th className="p-2 text-[10px] font-bold uppercase text-gray-500">Tax Mapping</th>
                <th className="p-2 text-[10px] font-bold uppercase text-gray-500">Partnership Label</th>
                <th className="p-2 text-[10px] font-bold uppercase text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {visibleAccounts.sort((a, b) => a.code.localeCompare(b.code)).map((account) => (
                <tr key={account.id} className={cn(
                  "hover:bg-gray-50/50 transition-colors",
                  editingId === account.id ? "bg-indigo-50/50" : "",
                  account._needsReview ? "border-l-2 border-amber-400" : "",
                  account.isArchived ? "opacity-60" : ""
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
                      <span className="flex items-center gap-1">
                        {account.name}
                        {account.isDefault && (
                          <span
                            className="text-[9px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-1 rounded uppercase tracking-wider"
                            data-testid={`default-badge-row-${account.code}`}
                          >
                            default
                          </span>
                        )}
                        {account.isArchived && (
                          <span className="text-[9px] font-bold text-yellow-700 bg-yellow-50 border border-yellow-200 px-1 rounded uppercase">archived</span>
                        )}
                        {account._needsReview && (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded">review</span>
                        )}
                      </span>
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
                        onChange={e => setEditFormData({ ...editFormData, gstCode: e.target.value as Account['gstCode'] })}
                        className="p-1 border border-[var(--line-strong)] focus:outline-none text-xs bg-white"
                        aria-label={`GST code for ${account.name}`}
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
                            {Object.entries(TAX_LABELS).map(([k, v]) => <option key={k} value={k}>{k}: {(v as { title: string }).title}</option>)}
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
                              <option key={k} value={k}>{k}: {(v as { title: string }).title}</option>
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
                              <option key={k} value={k}>{k}: {(v as { title: string }).title}</option>
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
                  {/* Partnership Label column */}
                  <td className="p-2 text-[10px] text-gray-500">
                    {(account.type === 'Revenue' || account.type === 'Expense') ? (
                      editingId === account.id ? (
                        <select
                          value={editFormData.partnershipTaxLabel || ''}
                          onChange={e => setEditFormData({ ...editFormData, partnershipTaxLabel: e.target.value || undefined })}
                          className="flex-1 p-1 border border-[var(--line-strong)] focus:outline-none text-[10px] bg-white w-full"
                          aria-label={`Partnership label for ${account.name}`}
                        >
                          <option value="">None</option>
                          {Object.entries(PARTNERSHIP_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{k}: {v.title}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={account.partnershipTaxLabel ?? ''}
                          readOnly
                          aria-label={`Partnership label for ${account.name}`}
                          className="w-full p-1 border border-[var(--line)] bg-gray-50 text-[10px] text-gray-500 cursor-default focus:outline-none"
                          onClick={() => handleStartEdit(account)}
                          title="Click Edit to change"
                        />
                      )
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="p-2 text-right">
                    {editingId === account.id ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={handleSaveEdit} aria-label={`Save ${account.name}`} className="text-emerald-600 hover:text-emerald-700">
                          <Save size={16} />
                        </button>
                        <button onClick={handleCancelEdit} aria-label={`Cancel editing ${account.name}`} className="text-rose-600 hover:text-rose-700">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleStartEdit(account)} aria-label={`Edit ${account.name}`} className="text-gray-400 hover:text-indigo-600">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteAccount(account.id)} aria-label={`Delete ${account.name}`} className="text-gray-400 hover:text-rose-600">
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
