/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AccountPicker — searchable combobox over the active Chart of Accounts.
 * Replaces the native <select> in ImportReviewPane so users can filter
 * the 197-row FY2026 spine by code or name instead of scrolling.
 *
 * Behaviour:
 *   - Click the button → dropdown opens with a search input focused.
 *   - Type to filter by code or name (case-insensitive, substring match).
 *   - Click a result to pick it.
 *   - Click outside (handled by an overlay backdrop) or press Esc to close.
 *   - Archived accounts are hidden.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Account } from '../types';

interface AccountPickerProps {
  accounts: Account[];
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  ariaLabel: string;
  /** Optional testid prefix for the trigger button. Default 'account-picker'. */
  testIdPrefix?: string;
}

export const AccountPicker: React.FC<AccountPickerProps> = ({
  accounts,
  value,
  onChange,
  ariaLabel,
  testIdPrefix = 'account-picker',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = accounts.find((a) => a.id === value);

  const filtered = useMemo(() => {
    const live = accounts.filter((a) => !a.isArchived);
    const q = query.trim().toLowerCase();
    if (!q) return live;
    return live.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q),
    );
  }, [accounts, query]);

  useEffect(() => {
    if (open) {
      // Auto-focus the search input once the dropdown mounts.
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-expanded={open}
        data-testid={`${testIdPrefix}-trigger`}
        className="border rounded px-2 py-1 text-xs min-w-[200px] text-left bg-white hover:border-gray-400"
      >
        {selected
          ? `${selected.code} ${selected.name}`
          : <span className="text-gray-400">(unmapped, click to search)</span>}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            data-testid={`${testIdPrefix}-popover`}
            className="absolute z-40 top-full left-0 mt-1 bg-white border border-[var(--line-strong)] rounded shadow-lg w-[280px] max-h-[320px] overflow-hidden flex flex-col"
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by code or name"
              data-testid={`${testIdPrefix}-search`}
              className="w-full p-2 border-b border-[var(--line)] text-xs focus:outline-none"
            />
            <div className="overflow-y-auto">
              {filtered.length === 0 && (
                <div className="p-3 text-xs text-gray-500">No matches</div>
              )}
              {filtered.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onChange(a.id);
                    setQuery('');
                    setOpen(false);
                  }}
                  data-testid={`${testIdPrefix}-option-${a.code}`}
                  className="w-full text-left p-2 text-xs hover:bg-gray-50 border-b border-gray-50 last:border-0"
                >
                  <span className="font-mono">{a.code}</span> {a.name}
                  <span className="ml-2 text-[10px] text-gray-400 uppercase">{a.type}</span>
                </button>
              ))}
            </div>
            {selected && (
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setQuery('');
                  setOpen(false);
                }}
                data-testid={`${testIdPrefix}-clear`}
                className="border-t border-[var(--line)] p-2 text-xs text-rose-600 hover:bg-rose-50"
              >
                Clear selection
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
