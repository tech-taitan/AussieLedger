/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { Account, JournalEntry, JournalLine } from '../types';
import { CHART_OF_ACCOUNTS } from '../constants';
import { cn } from '../lib/utils';

interface JournalFormProps {
  onSave: (entry: JournalEntry) => void;
  onCancel: () => void;
}

export const JournalForm: React.FC<JournalFormProps> = ({ onSave, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([
    { accountId: '', description: '', debit: 0, credit: 0, taxAmount: 0 },
    { accountId: '', description: '', debit: 0, credit: 0, taxAmount: 0 },
  ]);

  const addLine = () => {
    setLines([...lines, { accountId: '', description: '', debit: 0, credit: 0, taxAmount: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof JournalLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    if (field === 'taxAmount') {
      newLines[index].isManualTax = true;
    }

    // Auto-calculate GST if account is GST-coded and tax hasn't been manually overridden
    if (field === 'accountId' || field === 'debit' || field === 'credit') {
      if (field === 'accountId') {
        newLines[index].isManualTax = false; // Reset manual override on account change
      }
      
      if (!newLines[index].isManualTax) {
        const account = CHART_OF_ACCOUNTS.find(a => a.id === newLines[index].accountId);
        if (account?.gstCode === 'GST') {
          const amount = (Number(newLines[index].debit) || 0) + (Number(newLines[index].credit) || 0);
          newLines[index].taxAmount = amount / 11;
        } else {
          newLines[index].taxAmount = 0;
        }
      }
    }
    
    setLines(newLines);
  };

  const totalDebits = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredits = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.001;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) return;

    onSave({
      id: crypto.randomUUID(),
      date,
      reference,
      description,
      lines,
      isPosted: true,
    });
  };

  return (
    <div className="bg-white p-4 lg:p-6 shadow-sm border border-[var(--line-strong)]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-medium">New Journal Entry</h2>
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="col-header block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-[var(--line)] p-3 lg:p-2 focus:outline-none focus:border-[var(--ink)] text-base"
              required
            />
          </div>
          <div>
            <label className="col-header block mb-1">Reference</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. INV-001"
              className="w-full border border-[var(--line)] p-3 lg:p-2 focus:outline-none focus:border-[var(--ink)] text-base"
              required
            />
          </div>
          <div>
            <label className="col-header block mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="General description"
              className="w-full border border-[var(--line)] p-3 lg:p-2 focus:outline-none focus:border-[var(--ink)] text-base"
            />
          </div>
        </div>

        <div className="space-y-4 lg:space-y-0">
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line-strong)]">
                  <th className="col-header text-left py-2 px-1">Account</th>
                  <th className="col-header text-left py-2 px-1">Description</th>
                  <th className="col-header text-right py-2 px-1">Debit</th>
                  <th className="col-header text-right py-2 px-1">Credit</th>
                  <th className="col-header text-right py-2 px-1">GST</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index} className="border-b border-[var(--line)]">
                    <td className="py-2 px-1">
                      <select
                        value={line.accountId}
                        onChange={(e) => updateLine(index, 'accountId', e.target.value)}
                        className="w-full border-none focus:ring-0 bg-transparent text-sm"
                        required
                      >
                        <option value="">Select Account...</option>
                        {CHART_OF_ACCOUNTS.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(index, 'description', e.target.value)}
                        className="w-full border-none focus:ring-0 bg-transparent text-sm"
                        placeholder="Line description"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="0.01"
                        value={line.debit || ''}
                        onChange={(e) => updateLine(index, 'debit', parseFloat(e.target.value) || 0)}
                        className="w-full text-right border-none focus:ring-0 bg-transparent data-value text-sm"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="0.01"
                        value={line.credit || ''}
                        onChange={(e) => updateLine(index, 'credit', parseFloat(e.target.value) || 0)}
                        className="w-full text-right border-none focus:ring-0 bg-transparent data-value text-sm"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="0.01"
                        value={line.taxAmount === 0 && !line.isManualTax ? '' : Number(line.taxAmount.toFixed(2))}
                        onChange={(e) => updateLine(index, 'taxAmount', parseFloat(e.target.value) || 0)}
                        className="w-full text-right border-none focus:ring-0 bg-transparent data-value text-sm text-gray-600"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2 px-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Lines View */}
          <div className="lg:hidden space-y-4">
            {lines.map((line, index) => (
              <div key={index} className="p-4 border border-[var(--line)] bg-gray-50 space-y-3 relative">
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-600 p-2"
                >
                  <Trash2 size={18} />
                </button>
                
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Account</label>
                  <select
                    value={line.accountId}
                    onChange={(e) => updateLine(index, 'accountId', e.target.value)}
                    className="w-full border border-[var(--line)] p-2 bg-white text-sm"
                    required
                  >
                    <option value="">Select Account...</option>
                    {CHART_OF_ACCOUNTS.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Description</label>
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(index, 'description', e.target.value)}
                    className="w-full border border-[var(--line)] p-2 bg-white text-sm"
                    placeholder="Line description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Debit</label>
                    <input
                      type="number"
                      step="0.01"
                      value={line.debit || ''}
                      onChange={(e) => updateLine(index, 'debit', parseFloat(e.target.value) || 0)}
                      className="w-full border border-[var(--line)] p-2 bg-white text-sm data-value"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Credit</label>
                    <input
                      type="number"
                      step="0.01"
                      value={line.credit || ''}
                      onChange={(e) => updateLine(index, 'credit', parseFloat(e.target.value) || 0)}
                      className="w-full border border-[var(--line)] p-2 bg-white text-sm data-value"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--line)]">
                  <label className="text-[10px] font-bold uppercase text-gray-400">GST Amount</label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={line.taxAmount === 0 && !line.isManualTax ? '' : Number(line.taxAmount.toFixed(2))}
                      onChange={(e) => updateLine(index, 'taxAmount', parseFloat(e.target.value) || 0)}
                      className="w-24 border border-[var(--line)] p-1.5 bg-white text-sm data-value text-right"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4 border-t border-[var(--line-strong)]">
            <button
              type="button"
              onClick={addLine}
              className="w-full sm:w-auto flex justify-center items-center gap-1 text-sm font-medium p-3 sm:p-0 hover:underline bg-gray-100 sm:bg-transparent"
            >
              <Plus size={16} /> Add Line
            </button>
            
            <div className="w-full sm:w-auto grid grid-cols-2 gap-8 text-right">
              <div>
                <div className="text-[10px] font-bold uppercase text-gray-400">Total Debits</div>
                <div className={cn("text-lg font-bold data-value", !isBalanced && "text-red-600")}>
                  ${totalDebits.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-gray-400">Total Credits</div>
                <div className={cn("text-lg font-bold data-value", !isBalanced && "text-red-600")}>
                  ${totalCredits.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {!isBalanced && (
          <div className="text-red-600 text-sm italic text-center sm:text-right">
            Out of balance by {Math.abs(totalDebits - totalCredits).toFixed(2)}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[var(--line-strong)]">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 hover:bg-gray-100 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isBalanced || lines.some(l => !l.accountId)}
            className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-[var(--ink)] text-white disabled:opacity-50 flex justify-center items-center gap-2 text-sm font-medium"
          >
            <Save size={18} /> Post Journal
          </button>
        </div>
      </form>
    </div>
  );
};
