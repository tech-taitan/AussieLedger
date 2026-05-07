/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Account, JournalEntry, TrialBalanceRow } from '../types';

interface TrialBalanceProps {
  accounts: Account[];
  entries: JournalEntry[];
}

export const TrialBalance: React.FC<TrialBalanceProps> = ({ accounts, entries }) => {
  const tbData = useMemo(() => {
    const balances: Record<string, { debit: number; credit: number }> = {};

    // Initialize with all accounts
    accounts.forEach(acc => {
      balances[acc.id] = { debit: 0, credit: 0 };
    });

    // Aggregate entries
    entries.forEach(entry => {
      entry.lines.forEach(line => {
        if (balances[line.accountId]) {
          balances[line.accountId].debit += Number(line.debit) || 0;
          balances[line.accountId].credit += Number(line.credit) || 0;
        }
      });
    });

    // Convert to rows
    const rows: TrialBalanceRow[] = accounts.map(acc => {
      const { debit, credit } = balances[acc.id];
      let balance = 0;
      
      // Calculate net balance based on account type
      if (['Asset', 'Expense'].includes(acc.type)) {
        balance = debit - credit;
      } else {
        balance = credit - debit;
      }

      return { account: acc, debit, credit, balance };
    }).filter(row => row.debit !== 0 || row.credit !== 0);

    return rows;
  }, [entries]);

  const totalDebits = tbData.reduce((sum, r) => sum + r.debit, 0);
  const totalCredits = tbData.reduce((sum, r) => sum + r.credit, 0);

  return (
    <div className="bg-white p-4 lg:p-6 shadow-sm border border-[var(--line-strong)]">
      <h2 className="text-xl font-medium mb-6">Trial Balance</h2>
      
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line-strong)]">
                <th className="col-header text-left py-2 px-4 whitespace-nowrap">Code</th>
                <th className="col-header text-left py-2 px-4 whitespace-nowrap">Account Name</th>
                <th className="col-header text-left py-2 px-4 hidden md:table-cell whitespace-nowrap">Type</th>
                <th className="col-header text-right py-2 px-4 whitespace-nowrap">Debit</th>
                <th className="col-header text-right py-2 px-4 whitespace-nowrap">Credit</th>
                <th className="col-header text-right py-2 px-4 hidden sm:table-cell whitespace-nowrap">YTD Balance</th>
              </tr>
            </thead>
            <tbody>
              {tbData.map((row) => (
                <tr key={row.account.id} className="data-row border-b border-[var(--line)]">
                  <td className="py-3 px-4 data-value whitespace-nowrap">{row.account.code}</td>
                  <td className="py-3 px-4 whitespace-nowrap">{row.account.name}</td>
                  <td className="py-3 px-4 text-xs opacity-60 hidden md:table-cell whitespace-nowrap">{row.account.type}</td>
                  <td className="py-3 px-4 text-right data-value whitespace-nowrap">
                    {row.debit > 0 ? row.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right data-value whitespace-nowrap">
                    {row.credit > 0 ? row.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right data-value font-medium hidden sm:table-cell whitespace-nowrap">
                    {row.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--ink)] font-bold">
                <td colSpan={2} className="py-4 px-4 text-right pr-4">Totals</td>
                <td className="hidden md:table-cell"></td>
                <td className="py-4 px-4 text-right data-value whitespace-nowrap">
                  {totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="py-4 px-4 text-right data-value whitespace-nowrap">
                  {totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="py-4 px-4 text-right data-value hidden sm:table-cell whitespace-nowrap">
                  {(totalDebits - totalCredits).toFixed(2) === '0.00' ? 'Balanced' : 'Out of Balance'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
