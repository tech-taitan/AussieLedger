/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Account, JournalEntry } from '../types';

interface FinancialTrendChartProps {
  accounts: Account[];
  entries: JournalEntry[];
}

export const FinancialTrendChart: React.FC<FinancialTrendChartProps> = ({ accounts, entries }) => {
  const chartData = useMemo(() => {
    const monthlyData: Record<string, { month: string; revenue: number; expenses: number }> = {};

    // Sort entries by date to ensure chronological order
    const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedEntries.forEach(entry => {
      const date = new Date(entry.date);
      // Format as "MMM YYYY" for grouping
      const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, revenue: 0, expenses: 0 };
      }

      entry.lines.forEach(line => {
        const account = accounts.find(a => a.id === line.accountId);
        if (!account) return;

        // Revenue accounts
        if (account.type === 'Revenue') {
          monthlyData[monthKey].revenue += (Number(line.credit) - Number(line.debit));
        }
        // Expense accounts
        else if (account.type === 'Expense') {
          monthlyData[monthKey].expenses += (Number(line.debit) - Number(line.credit));
        }
      });
    });

    // Convert to array and take last 6 months
    return Object.values(monthlyData).slice(-6);
  }, [entries]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-[var(--line-strong)] shadow-sm p-6">
      <h3 className="col-header mb-6">Financial Performance Trend</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: '#6b7280' }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: '#6b7280' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '0px', 
                border: '1px solid var(--line-strong)',
                fontSize: '12px',
                fontWeight: 'bold'
              }} 
            />
            <Legend 
              wrapperStyle={{ 
                paddingTop: '20px',
                fontSize: '10px',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }} 
            />
            <Bar 
              dataKey="revenue" 
              name="Revenue" 
              fill="#2563eb" 
              radius={[2, 2, 0, 0]} 
            />
            <Bar 
              dataKey="expenses" 
              name="Expenses" 
              fill="#dc2626" 
              radius={[2, 2, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
