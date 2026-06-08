/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { Account, JournalEntry, JournalLine } from '../types';
import { cn } from '../lib/utils';
import { today } from '../lib/period';
import { EditJournalDiff } from './EditJournalDiff';
import { AnomalyBadge } from './AnomalyBadge';
import { formatAud } from '../lib/money';

interface JournalFormProps {
  accounts: Account[];
  onSave: (entry: JournalEntry) => void;
  onCancel: () => void;
  /** Phase 4 (BOOK-02): when set, the form is in edit-supersedes mode. */
  editingOriginal?: JournalEntry;
  /** Phase 4: called when the user confirms a supersession edit. */
  onEdit?: (
    original: JournalEntry,
    edits: Partial<Pick<JournalEntry, 'date' | 'reference' | 'description' | 'lines'>>,
  ) => void;
  /** Phase 4 (BOOK-03): create a mirrored reversal entry. */
  onReverse?: (original: JournalEntry) => void;
  /** Phase 4 (BOOK-04): void a draft (no-ops on posted entries — hook throws). */
  onVoidDraft?: (entry: JournalEntry) => void;
  /** Phase 6 (UX-01): when set, the entry's FY is finalised — disable Save; banner directs user to Reverse-and-Re-post. */
  lockedFy?: string;
}

export const JournalForm: React.FC<JournalFormProps> = ({
  accounts,
  onSave,
  onCancel,
  editingOriginal,
  onEdit,
  onReverse,
  onVoidDraft,
  lockedFy,
}) => {
  const isEditMode = !!editingOriginal;
  const [date, setDate] = useState(
    editingOriginal?.date ?? today().toISOString().split('T')[0],
  );
  const [reference, setReference] = useState(editingOriginal?.reference ?? '');
  const [description, setDescription] = useState(editingOriginal?.description ?? '');
  const [lines, setLines] = useState<JournalLine[]>(
    editingOriginal?.lines && editingOriginal.lines.length > 0
      ? editingOriginal.lines.map((l) => ({ ...l }))
      : [
          { accountId: '', description: '', debit: 0, credit: 0, taxAmount: 0 },
          { accountId: '', description: '', debit: 0, credit: 0, taxAmount: 0 },
        ],
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [lineErrors, setLineErrors] = useState<Record<number, Record<string, string>>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  /** Edit-mode: true once the user clicks "Save Edit" and is reviewing the diff. */
  const [showDiff, setShowDiff] = useState(false);

  const totalDebits = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredits = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.001;
  const isLocked = !!lockedFy;

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!date) errors.date = 'Date is required';
    if (!reference.trim()) errors.reference = 'Reference is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    validateForm();
  }, [date, reference]);

  const validateLine = (line: JournalLine) => {
    const errors: Record<string, string> = {};
    if (line.debit > 0 && line.credit > 0) {
      errors.amount = 'Cannot have both Debit & Credit';
    }
    if (line.debit === 0 && line.credit === 0) {
      errors.amount = 'Enter a debit or credit';
    }
    if (!line.accountId) {
      errors.accountId = 'Account is required';
    }
    return errors;
  };

  const updateLine = (index: number, field: keyof JournalLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    if (field === 'taxAmount') {
      newLines[index].isManualTax = true;
    }

    // Auto-calculate GST
    if (field === 'accountId' || field === 'debit' || field === 'credit') {
      if (field === 'accountId') {
        newLines[index].isManualTax = false;
      }
      
      if (!newLines[index].isManualTax) {
        const account = accounts.find(a => a.id === newLines[index].accountId);
        if (account?.gstCode === 'GST') {
          const amount = (Number(newLines[index].debit) || 0) + (Number(newLines[index].credit) || 0);
          newLines[index].taxAmount = amount / 11;
        } else {
          newLines[index].taxAmount = 0;
        }
      }
    }
    
    // Update line-specific errors
    const errors = validateLine(newLines[index]);
    setLineErrors(prev => ({ ...prev, [index]: errors }));
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { accountId: '', description: '', debit: 0, credit: 0, taxAmount: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
      const newLineErrors = { ...lineErrors };
      delete newLineErrors[index];
      setLineErrors(newLineErrors);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Mark everything as touched
    const allTouched: Record<string, boolean> = { all: true, date: true, reference: true };
    setTouched(allTouched);

    const isFormValid = validateForm();
    const currentLineErrors: Record<number, Record<string, string>> = {};
    lines.forEach((line, index) => {
      const errs = validateLine(line);
      if (Object.keys(errs).length > 0) currentLineErrors[index] = errs;
    });
    setLineErrors(currentLineErrors);

    const hasLineErrors = Object.keys(currentLineErrors).length > 0;

    if (!isBalanced || hasLineErrors || !isFormValid) {
      return;
    }

    // BOOK-02: in edit-supersedes mode, show diff preview before committing.
    if (isEditMode && editingOriginal) {
      setShowDiff(true);
      return;
    }

    onSave({
      id: crypto.randomUUID(),
      date,
      reference,
      description,
      lines,
      isPosted: true,
    });
  };

  const handleConfirmEdit = () => {
    if (!editingOriginal || !onEdit) return;
    onEdit(editingOriginal, { date, reference, description, lines });
    setShowDiff(false);
  };

  /** Build the proposed JournalEntry shape for the diff preview. */
  const proposedEntry: JournalEntry | null = isEditMode && editingOriginal
    ? {
        ...editingOriginal,
        _v: 3,
        id: 'proposed-preview',
        date,
        reference,
        description,
        lines,
      }
    : null;

  return (
    <div className="bg-white p-4 lg:p-6 shadow-sm border border-[var(--line-strong)]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-medium">
          {isEditMode ? 'Edit Journal Entry (supersedes)' : 'New Journal Entry'}
        </h2>
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full">
          <X size={20} />
        </button>
      </div>

      {isLocked && (
        <div
          data-testid="locked-fy-banner"
          className="bg-amber-50 border border-amber-300 p-3 mb-4 text-sm text-amber-900"
        >
          <strong>FY is finalised — use Reverse and Re-post to correct.</strong>{' '}
          Post-finalise corrections must go through the Reverse workflow so the audit trail
          remains intact. ({lockedFy})
        </div>
      )}

      {isEditMode && (
        <div
          className="bg-amber-50 border border-amber-300 p-3 rounded mb-4 text-sm"
          data-testid="edit-banner"
        >
          <strong>This will replace the original.</strong> The original stays in the audit trail.
        </div>
      )}

      {showDiff && editingOriginal && proposedEntry && (
        <div data-testid="edit-confirm-step" className="mb-6">
          <EditJournalDiff
            original={editingOriginal}
            proposed={proposedEntry}
            accounts={accounts}
          />
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={handleConfirmEdit}
              className="bg-[var(--ink)] text-white px-4 py-2 rounded text-sm font-medium"
              data-testid="confirm-edit"
            >
              Confirm replace
            </button>
            <button
              type="button"
              onClick={() => setShowDiff(false)}
              className="px-4 py-2 text-sm"
              data-testid="back-to-edit"
            >
              Back to edit
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="col-header block mb-1 flex justify-between">
              Date
              {touched.date && formErrors.date && <span className="text-red-500 text-[10px] uppercase font-bold tracking-tight">{formErrors.date}</span>}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, date: true }))}
              className={cn(
                "w-full border p-3 lg:p-2 focus:outline-none text-base",
                touched.date && formErrors.date ? "border-red-500 bg-red-50" : "border-[var(--line)] focus:border-[var(--ink)]"
              )}
              required
            />
          </div>
          <div>
            <label className="col-header block mb-1 flex justify-between">
              Reference
              {touched.reference && formErrors.reference && <span className="text-red-500 text-[10px] uppercase font-bold tracking-tight">{formErrors.reference}</span>}
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, reference: true }))}
              placeholder="e.g. INV-001"
              className={cn(
                "w-full border p-3 lg:p-2 focus:outline-none text-base",
                touched.reference && formErrors.reference ? "border-red-500 bg-red-50" : "border-[var(--line)] focus:border-[var(--ink)]"
              )}
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
                  <tr key={index} className={cn(
                    "border-b transition-colors",
                    lineErrors[index] && Object.keys(lineErrors[index]).length > 0 ? "border-red-200 bg-red-50" : "border-[var(--line)]"
                  )}>
                    <td className="py-2 px-1 relative">
                      <select
                        value={line.accountId}
                        onChange={(e) => updateLine(index, 'accountId', e.target.value)}
                        className={cn(
                          "w-full border-none focus:ring-0 bg-transparent text-sm",
                          lineErrors[index]?.accountId ? "text-red-600 font-bold" : ""
                        )}
                        required
                      >
                        <option value="">Select Account...</option>
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </select>
                      {lineErrors[index]?.accountId && (
                        <div className="absolute -bottom-1 left-1 text-[8px] text-red-500 font-bold uppercase tracking-tighter">Required</div>
                      )}
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
                    <td className="py-2 px-1 relative">
                      <input
                        type="number"
                        step="0.01"
                        value={line.debit || ''}
                        onChange={(e) => updateLine(index, 'debit', parseFloat(e.target.value) || 0)}
                        className={cn(
                          "w-full text-right border-none focus:ring-0 bg-transparent data-value text-sm",
                          lineErrors[index]?.amount ? "text-red-600" : ""
                        )}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2 px-1 relative">
                      <input
                        type="number"
                        step="0.01"
                        value={line.credit || ''}
                        onChange={(e) => updateLine(index, 'credit', parseFloat(e.target.value) || 0)}
                        className={cn(
                          "w-full text-right border-none focus:ring-0 bg-transparent data-value text-sm",
                          lineErrors[index]?.amount ? "text-red-600" : ""
                        )}
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
                      {lineErrors[index]?.amount && (
                        <div className="absolute bottom-0 right-1 text-[8px] text-red-500 font-bold uppercase">{lineErrors[index].amount}</div>
                      )}
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
              <div 
                key={index} 
                className={cn(
                  "p-4 border relative space-y-3",
                  lineErrors[index] && Object.keys(lineErrors[index]).length > 0 ? "border-red-300 bg-red-50" : "border-[var(--line)] bg-gray-50"
                )}
              >
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-600 p-2"
                >
                  <Trash2 size={18} />
                </button>
                
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1 flex justify-between">
                    Account
                    {lineErrors[index]?.accountId && <span className="text-red-500 tracking-tighter">Required</span>}
                  </label>
                  <select
                    value={line.accountId}
                    onChange={(e) => updateLine(index, 'accountId', e.target.value)}
                    className={cn(
                      "w-full border p-2 bg-white text-sm",
                      lineErrors[index]?.accountId ? "border-red-500" : "border-[var(--line)]"
                    )}
                    required
                  >
                    <option value="">Select Account...</option>
                    {accounts.map((acc) => (
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
                      className={cn(
                        "w-full border p-2 bg-white text-sm data-value",
                        lineErrors[index]?.amount ? "border-red-500 text-red-600" : "border-[var(--line)]"
                      )}
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
                      className={cn(
                        "w-full border p-2 bg-white text-sm data-value",
                        lineErrors[index]?.amount ? "border-red-500 text-red-600" : "border-[var(--line)]"
                      )}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                {lineErrors[index]?.amount && (
                  <div className="text-[10px] text-red-600 font-bold uppercase text-center">{lineErrors[index].amount}</div>
                )}
                
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
                  ${formatAud(totalDebits)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-gray-400">Total Credits</div>
                <div className={cn("text-lg font-bold data-value", !isBalanced && "text-red-600")}>
                  ${formatAud(totalCredits)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {!isBalanced && (
          <div className="p-3 bg-red-50 border border-red-200 text-center rounded-sm flex justify-center">
            <AnomalyBadge
              severity="warn"
              label="Unbalanced"
              message={`Out of balance by $${formatAud(Math.abs(totalDebits - totalCredits))}. Journals must balance before posting.`}
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[var(--line-strong)]">
          {touched.all && (Object.keys(lineErrors).some(k => Object.keys(lineErrors[parseInt(k)]).length > 0) || lines.some(l => !l.accountId)) && (
            <div className="flex-1 flex items-center text-red-500 text-xs font-bold uppercase">
              Please fix accounting errors in lines
            </div>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 hover:bg-gray-100 text-sm font-medium"
          >
            Cancel
          </button>
          {isEditMode && onReverse && editingOriginal && (
            <button
              type="button"
              onClick={() => onReverse(editingOriginal)}
              data-testid="reverse-button"
              className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-[var(--ink)] text-sm font-medium hover:bg-gray-50"
            >
              Reverse original
            </button>
          )}
          {!isEditMode && editingOriginal && onVoidDraft && (
            <button
              type="button"
              onClick={() => onVoidDraft(editingOriginal)}
              data-testid="void-button"
              className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-red-400 text-red-600 text-sm font-medium hover:bg-red-50"
            >
              Void draft
            </button>
          )}
          <button
            type="submit"
            data-testid={isEditMode ? 'save-edit-button' : 'post-journal-button'}
            disabled={isLocked || (!isBalanced && !isEditMode)}
            className={cn(
              "w-full sm:w-auto px-6 py-3 sm:py-2 bg-[var(--ink)] text-white flex justify-center items-center gap-2 text-sm font-medium transition-opacity",
              (isLocked || !isBalanced || lines.some(l => !l.accountId) || Object.values(lineErrors).some(e => Object.keys(e).length > 0)) ? "opacity-50" : "hover:opacity-90"
            )}
          >
            <Save size={18} /> {isEditMode ? 'Save Edit' : 'Post Journal'}
          </button>
        </div>
      </form>
    </div>
  );
};
