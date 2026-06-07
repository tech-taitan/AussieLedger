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
import {
  INDIVIDUAL_LABELS,
  COMPANY_LABELS,
  TRUST_LABELS,
  PARTNERSHIP_LABELS,
} from '../lib/tax/labels/fy2026';

export interface NewAccountSpec {
  code: string;
  name: string;
  type: AccountType;
  gstCode: 'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP';
  parentCode?: string;
  /** Tax labels per entity-return type — populated only when the account
   *  is Revenue or Expense (Asset / Liability / Equity rows never appear
   *  on a tax return). Defaults seeded from a per-type heuristic; user
   *  can override or clear via the modal. */
  taxLabel?: string;
  companyTaxLabel?: string;
  trustTaxLabel?: string;
  partnershipTaxLabel?: string;
}

/**
 * Default tax-label suggestions by account type. Mirrors the
 * default-CoA pattern used across the 197-row FY2026 seed, so new
 * imported accounts land with the same label conventions and the
 * YearEndWizard's "unmapped" check doesn't immediately flag them.
 */
function defaultLabelsFor(type: AccountType): Pick<NewAccountSpec, 'taxLabel' | 'companyTaxLabel' | 'trustTaxLabel' | 'partnershipTaxLabel'> {
  if (type === 'Revenue') {
    return {
      taxLabel: '6S',
      companyTaxLabel: '6A',
      trustTaxLabel: '5B',
      partnershipTaxLabel: 'P1',
    };
  }
  if (type === 'Expense') {
    return {
      taxLabel: '6N',
      companyTaxLabel: '6X',
      trustTaxLabel: '5N',
      partnershipTaxLabel: 'P2',
    };
  }
  return {};
}

interface NewAccountModalProps {
  initialCode: string;
  initialName: string;
  existingAccounts: Account[];
  /**
   * Codes already reserved by OTHER pending NEW: rows in the same
   * import. Without this, two rows could both mint the same code in
   * a single accept-import flow because the duplicate check only
   * looked at existingAccounts.
   */
  reservedCodes?: string[];
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
  reservedCodes = [],
  onConfirm,
  onCancel,
}) => {
  const initialType = guessTypeFromCode(initialCode);
  const initialLabels = defaultLabelsFor(initialType);
  const [code, setCode] = useState(initialCode.trim());
  const [name, setName] = useState(initialName.trim());
  const [type, setType] = useState<AccountType>(initialType);
  const [gstCode, setGstCode] = useState<NewAccountSpec['gstCode']>('N-T');
  const [parentCode, setParentCode] = useState<string>('');
  const [taxLabel, setTaxLabel] = useState<string>(initialLabels.taxLabel ?? '');
  const [companyTaxLabel, setCompanyTaxLabel] = useState<string>(initialLabels.companyTaxLabel ?? '');
  const [trustTaxLabel, setTrustTaxLabel] = useState<string>(initialLabels.trustTaxLabel ?? '');
  const [partnershipTaxLabel, setPartnershipTaxLabel] = useState<string>(initialLabels.partnershipTaxLabel ?? '');

  // Changing type rotates the four label dropdowns to the new defaults.
  // Asset/Liability/Equity clears them (those rows never carry labels).
  const handleTypeChange = (nextType: AccountType) => {
    setType(nextType);
    const defaults = defaultLabelsFor(nextType);
    setTaxLabel(defaults.taxLabel ?? '');
    setCompanyTaxLabel(defaults.companyTaxLabel ?? '');
    setTrustTaxLabel(defaults.trustTaxLabel ?? '');
    setPartnershipTaxLabel(defaults.partnershipTaxLabel ?? '');
  };

  const showTaxLabels = type === 'Revenue' || type === 'Expense';

  // Task 11: Escape to cancel. Standard a11y for role="dialog".
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const duplicate = useMemo(
    () => existingAccounts.find((a) => a.code === code.trim()),
    [existingAccounts, code],
  );
  // Task 11: also block when another pending NEW: row already reserved
  // this code in the same import.
  const reservedDuplicate = useMemo(
    () => reservedCodes.includes(code.trim()) && code.trim().length > 0,
    [reservedCodes, code],
  );
  // Possible parent rows: same type, parentCode === null (header rows).
  const parentOptions = useMemo(
    () => existingAccounts.filter((a) => a.type === type && (a.parentCode === null || a.parentCode === undefined)),
    [existingAccounts, type],
  );

  const canConfirm =
    code.trim().length > 0 &&
    name.trim().length > 0 &&
    !duplicate &&
    !reservedDuplicate;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({
      code: code.trim(),
      name: name.trim(),
      type,
      gstCode,
      parentCode: parentCode || undefined,
      // Persist only when meaningful — Asset/Liability/Equity strip them
      // because they never appear on a tax return.
      taxLabel: showTaxLabels && taxLabel ? taxLabel : undefined,
      companyTaxLabel: showTaxLabels && companyTaxLabel ? companyTaxLabel : undefined,
      trustTaxLabel: showTaxLabels && trustTaxLabel ? trustTaxLabel : undefined,
      partnershipTaxLabel: showTaxLabels && partnershipTaxLabel ? partnershipTaxLabel : undefined,
    });
  };

  return (
    <div
      data-testid="new-account-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Create new account"
      // Task 11: clicking the backdrop dismisses the modal. The inner
      // card swallows the click so users can interact normally.
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        className="bg-white border border-[var(--line-strong)] shadow-xl rounded-md w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
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
            {!duplicate && reservedDuplicate && (
              <span
                className="block mt-1 text-xs text-rose-600"
                data-testid="reserved-code-warning"
              >
                Code {code} is already reserved by another pending new account in this import.
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
                onChange={(e) => handleTypeChange(e.target.value as AccountType)}
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

          {showTaxLabels && (
            <fieldset
              data-testid="new-acc-tax-labels"
              className="border border-[var(--line)] rounded p-3 space-y-2"
            >
              <legend className="text-xs font-bold uppercase tracking-wider text-gray-600 px-1">
                Tax labels
              </legend>
              <p className="text-[10px] text-gray-500 mb-1">
                One label per return type. Defaults seeded for the chosen
                account type — override if this account maps to a different
                schedule label (e.g. Interest income to 6K, Rent to 6G).
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Individual</span>
                  <select
                    value={taxLabel}
                    onChange={(e) => setTaxLabel(e.target.value)}
                    data-testid="new-acc-tax-label-ind"
                    className="border border-[var(--line)] rounded px-1 py-1 text-xs bg-white"
                  >
                    <option value="">(none)</option>
                    {Object.entries(INDIVIDUAL_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{k} — {v.title}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Company</span>
                  <select
                    value={companyTaxLabel}
                    onChange={(e) => setCompanyTaxLabel(e.target.value)}
                    data-testid="new-acc-tax-label-co"
                    className="border border-[var(--line)] rounded px-1 py-1 text-xs bg-white"
                  >
                    <option value="">(none)</option>
                    {Object.entries(COMPANY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{k} — {v.title}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Trust</span>
                  <select
                    value={trustTaxLabel}
                    onChange={(e) => setTrustTaxLabel(e.target.value)}
                    data-testid="new-acc-tax-label-tr"
                    className="border border-[var(--line)] rounded px-1 py-1 text-xs bg-white"
                  >
                    <option value="">(none)</option>
                    {Object.entries(TRUST_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{k} — {v.title}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Partnership</span>
                  <select
                    value={partnershipTaxLabel}
                    onChange={(e) => setPartnershipTaxLabel(e.target.value)}
                    data-testid="new-acc-tax-label-ps"
                    className="border border-[var(--line)] rounded px-1 py-1 text-xs bg-white"
                  >
                    <option value="">(none)</option>
                    {Object.entries(PARTNERSHIP_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{k} — {v.title}</option>
                    ))}
                  </select>
                </label>
              </div>
            </fieldset>
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
