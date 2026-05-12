/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JournalSearch — BOOK-12 expandable filter panel. Calls onSearch(filters)
 * via 150ms debounce. Account dropdown populates from accounts prop.
 */
import React, { useState, useEffect } from 'react';
import type { Account } from '../types';
import type { SearchFilters } from '../lib/ledger';

interface JournalSearchProps {
  accounts: Account[];
  onSearch: (filters: SearchFilters) => void;
  defaultFilters?: Partial<SearchFilters>;
}

export const JournalSearch: React.FC<JournalSearchProps> = ({
  accounts,
  onSearch,
  defaultFilters,
}) => {
  const [reference, setReference] = useState(defaultFilters?.reference ?? '');
  const [description, setDescription] = useState(defaultFilters?.description ?? '');
  const [accountId, setAccountId] = useState(defaultFilters?.accountId ?? '');
  const [dateFrom, setDateFrom] = useState(defaultFilters?.dateFrom ?? '');
  const [dateTo, setDateTo] = useState(defaultFilters?.dateTo ?? '');
  const [amountFrom, setAmountFrom] = useState<string>(
    defaultFilters?.amountFrom !== undefined ? String(defaultFilters.amountFrom) : '',
  );
  const [amountTo, setAmountTo] = useState<string>(
    defaultFilters?.amountTo !== undefined ? String(defaultFilters.amountTo) : '',
  );

  useEffect(() => {
    const filters: SearchFilters = {
      reference: reference || undefined,
      description: description || undefined,
      accountId: accountId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      amountFrom: amountFrom === '' ? undefined : Number(amountFrom),
      amountTo: amountTo === '' ? undefined : Number(amountTo),
    };
    const handle = setTimeout(() => onSearch(filters), 150);
    return () => clearTimeout(handle);
  }, [reference, description, accountId, dateFrom, dateTo, amountFrom, amountTo, onSearch]);

  const clearAll = () => {
    setReference('');
    setDescription('');
    setAccountId('');
    setDateFrom('');
    setDateTo('');
    setAmountFrom('');
    setAmountTo('');
  };

  return (
    <div
      className="bg-white border border-[var(--line)] rounded p-4 mb-4"
      data-testid="journal-search-panel"
    >
      <h3 className="text-sm font-medium mb-3">Search journals</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <label className="flex flex-col">
          <span className="text-[10px] font-bold uppercase text-gray-500 mb-1">
            Reference
          </span>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            aria-label="filter-reference"
            className="border border-[var(--line)] rounded px-2 py-1"
            placeholder="REF-001"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-[10px] font-bold uppercase text-gray-500 mb-1">
            Description
          </span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-label="filter-description"
            className="border border-[var(--line)] rounded px-2 py-1"
            placeholder="office supplies"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-[10px] font-bold uppercase text-gray-500 mb-1">
            Account
          </span>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            aria-label="filter-account"
            className="border border-[var(--line)] rounded px-2 py-1"
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-[10px] font-bold uppercase text-gray-500 mb-1">
            Date from
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="filter-date-from"
            className="border border-[var(--line)] rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-[10px] font-bold uppercase text-gray-500 mb-1">
            Date to
          </span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="filter-date-to"
            className="border border-[var(--line)] rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-[10px] font-bold uppercase text-gray-500 mb-1">
            Amount from
          </span>
          <input
            type="number"
            step="0.01"
            value={amountFrom}
            onChange={(e) => setAmountFrom(e.target.value)}
            aria-label="filter-amount-from"
            className="border border-[var(--line)] rounded px-2 py-1"
            placeholder="0.00"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-[10px] font-bold uppercase text-gray-500 mb-1">
            Amount to
          </span>
          <input
            type="number"
            step="0.01"
            value={amountTo}
            onChange={(e) => setAmountTo(e.target.value)}
            aria-label="filter-amount-to"
            className="border border-[var(--line)] rounded px-2 py-1"
            placeholder="0.00"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={clearAll}
            className="text-sm underline text-gray-600 hover:text-gray-900"
            data-testid="search-clear-all"
          >
            Clear all
          </button>
        </div>
      </div>
    </div>
  );
};
