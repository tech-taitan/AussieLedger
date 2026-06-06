/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NewAccountModal — popup spawned from ImportReviewPane when the user
 * clicks "Create new account" on an unmapped TB row. Captures the
 * fields needed to mint a real Account (code, name, type, GST code,
 * optional parent header) instead of letting ImportTB guess.
 *
 * The dialog is intentionally lightweight — no portals, no animations
 * — to stay testable under jsdom and match the rest of the import
 * flow's chrome.
 */
import React, { useMemo, useState } from 'react';
import type { Account, AccountType } from '../types';

export interface NewAccountSpec {
  code: string;
  name: string;
  type: AccountType;
  gstCode: 'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP';
  parentCode?: string;
}

interface NewAccountModalProps {
  initialCode: string;
  initialName: string;
  existingAccounts: Account[];
  onConfirm: (spec: NewAccountSpec) => void;
  onCancel: () => void;
}

const ACCOUNT_TYPES: AccountType[] = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
const GST_CODES: NewAccountSpec['gstCode'][] = ['GST', 'FRE', 'INP', 'N-T', 'CAP'];

function guessTypeFromCode(code: string): AccountType {
  const m = code.match(/^(\d)/);
  if (!m) return 'Expense';
  switch (m[1]) {
    case '1': return 'Asset';
    case '2': return 'Liability';
    case '3': return 'Equity';
    case '4': return 'Revenue';
    default:  return 'Expense';
  }
}

export const NewAccountModal: React.FC<NewAccountModalProps> = ({
  initialCode,
  initialName,
  existingAccounts,
  onConfirm,
  onCancel,
}) => {
  const [code, setCode] = useState(initialCode.trim());
  const [name, setName] = useState(initialName.trim());
  const [type, setType] = useState<AccountType>(guessTypeFromCode(initialCode));
  const [gstCode, setGstCode] = useState<NewAccountSpec['gstCode']>('N-T');
  const [parentCode, setParentCode] = useState<string>('');

  const duplicate = useMemo(
    () => existingAccounts.find((a) => a.code === code.trim()),
    [existingAccounts, code],
  );
  // Possible parent rows: same type, parentCode === null (header rows).
  const parentOptions = useMemo(
    () => existingAccounts.filter((a) => a.type === type && (a.parentCode === null || a.parentCode === undefined)),
    [existingAccounts, type],
  );

  const canConfirm = code.trim().length > 0 && name.trim().length > 0 && !duplicate;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({
      code: code.trim(),
      name: name.trim(),
      type,
      gstCode,
      parentCode: parentCode || undefined,
    });
  };

  return (
    <div
      data-testid="new-account-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Create new account"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="bg-white border border-[var(--line-strong)] shadow-xl rounded-md w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-bold text-[var(--ink)]">Create new account</h3>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
              Code
            </span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              data-testid="new-acc-code"
              className="mt-1 w-full border border-[var(--line)] rounded px-2 py-1 text-sm font-mono focus:outline-none focus:border-[var(--ink)]"
            />
            {duplicate && (
              <span className="block mt-1 text-xs text-rose-600">
                Code {code} is already in use ({duplicate.name}).
              </span>
            )}
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
              Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="new-acc-name"
              className="mt-1 w-full border border-[var(--line)] rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--ink)]"
            />
          </label>

          <div className="flex gap-3">
            <label className="block flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Type
              </span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                data-testid="new-acc-type"
                className="mt-1 w-full border border-[var(--line)] rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-[var(--ink)]"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            <label className="block flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                GST
              </span>
              <select
                value={gstCode}
                onChange={(e) => setGstCode(e.target.value as NewAccountSpec['gstCode'])}
                data-testid="new-acc-gst"
                className="mt-1 w-full border border-[var(--line)] rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-[var(--ink)]"
              >
                {GST_CODES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>

          {parentOptions.length > 0 && (
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Group <span className="text-gray-400 normal-case">(optional)</span>
              </span>
              <select
                value={parentCode}
                onChange={(e) => setParentCode(e.target.value)}
                data-testid="new-acc-parent"
                className="mt-1 w-full border border-[var(--line)] rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-[var(--ink)]"
              >
                <option value="">(no group)</option>
                {parentOptions.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-[var(--line)]">
          <button
            type="button"
            onClick={onCancel}
            data-testid="new-acc-cancel"
            className="px-4 py-2 border border-[var(--line)] text-sm font-medium hover:bg-gray-50 rounded"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            data-testid="new-acc-confirm"
            className="px-4 py-2 bg-[var(--ink)] text-white text-sm font-semibold rounded disabled:opacity-40 hover:opacity-90"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};
