/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Trial Balance — period-filtered with parent-row subtotals (BOOK-07, BOOK-09).
 *
 * Status filter (BOOK-09): only entries that are `posted` or `reversed`
 * contribute to the rollup. Drafts, supersededs, and voideds are excluded.
 * A reversal entry's mirrored debits/credits cancel out the original — so
 * a posted + reversal pair correctly net to zero per account.
 *
 * Parent subtotals: each Account with `parentCode === code` is a child;
 * the parent row renders an aggregated subtotal across all its children.
 */
import React, { useMemo, useState } from 'react';
import type { Account, JournalEntry, TrialBalanceRow } from '../types';
import { isInPeriod, currentFy, type Period } from '../lib/period';
import { AnomalyBadge } from './AnomalyBadge';

interface TrialBalanceProps {
  accounts: Account[];
  entries: JournalEntry[];
  period?: Period;
  onPeriodChange?: (period: Period) => void;
}

/** BOOK-09 status filter — only posted + reversed entries roll into the TB.
 *  A reversal entry is itself `status: 'posted'` (per ledger.makeReversal),
 *  so the "reversed" status applies to the ORIGINAL whose mirror cancels it. */
function isLiveForTB(e: JournalEntry): boolean {
  if (e.status === 'voided' || e.status === 'superseded' || e.status === 'draft') {
    return false;
  }
  // Treat absent-status v2 entries as live iff isPosted; otherwise drop.
  if (!e.status) return e.isPosted === true;
  return e.status === 'posted' || e.status === 'reversed';
}

export const TrialBalance: React.FC<TrialBalanceProps> = ({
  accounts,
  entries,
  period: periodProp,
  onPeriodChange,
}) => {
  const [internalPeriod, setInternalPeriod] = useState<Period>(
    periodProp ?? { type: 'fy', fy: currentFy() },
  );
  const period = periodProp ?? internalPeriod;

  const setPeriod = (p: Period) => {
    if (onPeriodChange) onPeriodChange(p);
    else setInternalPeriod(p);
  };

  const tbData = useMemo(() => {
    const balances: Record<string, { debit: number; credit: number }> = {};
    accounts.forEach((acc) => {
      balances[acc.id] = { debit: 0, credit: 0 };
    });

    // Filter: live status + in-period
    const liveEntries = entries.filter((e) => {
      if (!isLiveForTB(e)) return false;
      const d = new Date(e.date); // date PARSE — allowed by structural-lint
      return isInPeriod(d, period);
    });

    liveEntries.forEach((entry) => {
      entry.lines.forEach((line) => {
        if (balances[line.accountId]) {
          balances[line.accountId].debit += Number(line.debit) || 0;
          balances[line.accountId].credit += Number(line.credit) || 0;
        }
      });
    });

    // Build base rows
    const baseRows: TrialBalanceRow[] = accounts.map((acc) => {
      const { debit, credit } = balances[acc.id];
      let balance = 0;
      if (['Asset', 'Expense'].includes(acc.type)) balance = debit - credit;
      else balance = credit - debit;
      return { account: acc, debit, credit, balance };
    });

    // Compute parent subtotals using parentCode
    const childrenOf: Record<string, TrialBalanceRow[]> = {};
    for (const r of baseRows) {
      const p = r.account.parentCode;
      if (p) {
        (childrenOf[p] ??= []).push(r);
      }
    }

    const enriched = baseRows.map((r): TrialBalanceRow => {
      const kids = childrenOf[r.account.code] ?? [];
      const isParent = kids.length > 0;
      if (!isParent) return r;
      const debit = kids.reduce((s, k) => s + k.debit, 0);
      const credit = kids.reduce((s, k) => s + k.credit, 0);
      const balance = ['Asset', 'Expense'].includes(r.account.type)
        ? debit - credit
        : credit - debit;
      return {
        account: r.account,
        debit,
        credit,
        balance,
        isParent: true,
        childTotals: { debit, credit, balance },
      };
    });

    // Keep rows with activity OR parent headers (parents still render at zero)
    return enriched.filter((r) => r.debit !== 0 || r.credit !== 0 || r.isParent);
  }, [accounts, entries, period]);

  // Compute IDs of accounts referenced in posted entries (for anomaly badge)
  const referencedAccountIds = useMemo(() => {
    const ids = new Set<string>();
    entries.forEach((e) => {
      const isPostedEntry = e.status === 'posted' || (e.status === undefined && e.isPosted);
      if (isPostedEntry) {
        e.lines.forEach((l) => ids.add(l.accountId));
      }
    });
    return ids;
  }, [entries]);

  // Totals exclude parent rows to avoid double-counting
  const totalDebits = tbData
    .filter((r) => !r.isParent)
    .reduce((s, r) => s + r.debit, 0);
  const totalCredits = tbData
    .filter((r) => !r.isParent)
    .reduce((s, r) => s + r.credit, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.005;

  return (
    <div className="bg-white p-4 lg:p-6 shadow-sm border border-[var(--line-strong)]">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 mb-4">
        <h2 className="text-xl font-medium">Trial Balance</h2>
        <div
          className="flex gap-2 items-center text-sm"
          data-testid="tb-period-controls"
        >
          <label className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-gray-500">
              Period
            </span>
            <select
              value={period.type}
              onChange={(e) => {
                const t = e.target.value as Period['type'];
                if (t === 'fy') setPeriod({ type: 'fy', fy: currentFy() });
                else if (t === 'quarter')
                  setPeriod({ type: 'quarter', fy: currentFy(), q: 1 });
                else
                  setPeriod({
                    type: 'custom',
                    from: new Date('2025-07-01'),
                    to: new Date('2026-06-30'),
                  });
              }}
              aria-label="period-type"
              className="border border-[var(--line)] rounded px-2 py-1"
            >
              <option value="fy">Financial Year</option>
              <option value="quarter">Quarter</option>
              <option value="custom">Custom range</option>
            </select>
          </label>
          {period.type === 'quarter' && (
            <label className="flex items-center gap-1">
              <span className="text-[10px] font-bold uppercase text-gray-500">Q</span>
              <select
                value={period.q}
                onChange={(e) =>
                  setPeriod({ ...period, q: Number(e.target.value) as 1 | 2 | 3 | 4 })
                }
                aria-label="period-quarter"
                className="border border-[var(--line)] rounded px-1 py-1"
              >
                <option value={1}>Q1</option>
                <option value={2}>Q2</option>
                <option value={3}>Q3</option>
                <option value={4}>Q4</option>
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line-strong)]">
                <th className="col-header text-left py-2 px-4 whitespace-nowrap">Code</th>
                <th className="col-header text-left py-2 px-4 whitespace-nowrap">
                  Account Name
                </th>
                <th className="col-header text-left py-2 px-4 hidden md:table-cell whitespace-nowrap">
                  Type
                </th>
                <th className="col-header text-right py-2 px-4 whitespace-nowrap">Debit</th>
                <th className="col-header text-right py-2 px-4 whitespace-nowrap">Credit</th>
                <th className="col-header text-right py-2 px-4 hidden sm:table-cell whitespace-nowrap">
                  YTD Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {tbData.map((row) => (
                <tr
                  key={row.account.id}
                  className={
                    row.isParent
                      ? 'bg-gray-50 font-semibold border-b border-[var(--line)]'
                      : 'data-row border-b border-[var(--line)]'
                  }
                  data-testid={
                    row.isParent
                      ? `tb-parent-${row.account.code}`
                      : `tb-row-${row.account.code}`
                  }
                >
                  <td className="py-3 px-4 data-value whitespace-nowrap">
                    {row.account.code}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span>{row.account.name}</span>
                    {row.isParent && <span> (subtotal)</span>}
                    {!row.isParent &&
                      referencedAccountIds.has(row.account.id) &&
                      (!row.account.taxLabel || row.account.taxLabel === '') && (
                        <span className="ml-2 inline-block">
                          <AnomalyBadge
                            severity="warn"
                            message="No tax label mapping"
                            label={row.account.code}
                          />
                        </span>
                      )}
                  </td>
                  <td className="py-3 px-4 text-xs opacity-60 hidden md:table-cell whitespace-nowrap">
                    {row.account.type}
                  </td>
                  <td className="py-3 px-4 text-right data-value whitespace-nowrap">
                    {row.debit > 0
                      ? row.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })
                      : '-'}
                  </td>
                  <td className="py-3 px-4 text-right data-value whitespace-nowrap">
                    {row.credit > 0
                      ? row.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })
                      : '-'}
                  </td>
                  <td className="py-3 px-4 text-right data-value font-medium hidden sm:table-cell whitespace-nowrap">
                    {row.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--ink)] font-bold">
                <td colSpan={2} className="py-4 px-4 text-right pr-4">
                  Totals
                </td>
                <td className="hidden md:table-cell"></td>
                <td
                  className="py-4 px-4 text-right data-value whitespace-nowrap"
                  data-testid="tb-total-debits"
                >
                  {totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td
                  className="py-4 px-4 text-right data-value whitespace-nowrap"
                  data-testid="tb-total-credits"
                >
                  {totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td
                  className="py-4 px-4 text-right data-value hidden sm:table-cell whitespace-nowrap"
                  data-testid="tb-balance-flag"
                >
                  {isBalanced ? 'Balanced' : 'Out of Balance'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
