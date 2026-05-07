import React, { useMemo } from 'react';
import { Account, JournalEntry } from '../types';
import { FileSignature, Info } from 'lucide-react';

interface BasIasAssistantProps {
  accounts: Account[];
  entries: JournalEntry[];
}

export const BasIasAssistant: React.FC<BasIasAssistantProps> = ({ accounts, entries }) => {
  const basData = useMemo(() => {
    let g1 = 0; // Total sales
    let g2 = 0; // Export sales (assuming 0 for simplicity)
    let g3 = 0; // Other GST-free sales
    let g10 = 0; // Capital purchases
    let g11 = 0; // Non-capital purchases
    let gstOnSales1A = 0;
    let gstOnPurchases1B = 0;
    let w1 = 0; // Total salary, wages
    let w2 = 0; // Amounts withheld from W1

    entries.forEach(entry => {
      entry.lines.forEach(line => {
        const account = accounts.find(a => a.id === line.accountId);
        if (!account) return;

        const creditAmount = Number(line.credit) || 0;
        const debitAmount = Number(line.debit) || 0;
        const taxAmount = Number(line.taxAmount) || 0;

        // Revenue (Sales)
        if (account.type === 'Revenue') {
          const amount = creditAmount - debitAmount;
          g1 += amount; // Total sales
          if (account.gstCode === 'FRE') {
            g3 += amount; // GST-free sales
          }
          if (account.gstCode === 'GST') {
            gstOnSales1A += taxAmount;
          }
        }

        // Expenses / Purchases
        if (account.type === 'Expense') {
          const expenseAmount = debitAmount - creditAmount;
          if (account.name.includes('Wages')) {
            w1 += expenseAmount;
          } else {
            g11 += expenseAmount; // Non-capital purchases
            if (account.gstCode === 'GST') {
              gstOnPurchases1B += taxAmount;
            }
          }
        }

        // Assets (Capital purchases)
        if (account.type === 'Asset' && account.gstCode === 'GST') {
          const assetAmount = debitAmount - creditAmount;
          if (assetAmount > 0) {
             g10 += assetAmount;
             gstOnPurchases1B += taxAmount;
          }
        }

        // PAYG Withholding
        if (account.name.includes('PAYG Withholding')) {
          // PAYG withheld is usually a credit to the liability account
          w2 += creditAmount - debitAmount;
        }
      });
    });

    return {
      g1: Math.max(0, g1),
      g2: Math.max(0, g2),
      g3: Math.max(0, g3),
      g10: Math.max(0, g10),
      g11: Math.max(0, g11),
      gstOnSales1A: Math.max(0, gstOnSales1A),
      gstOnPurchases1B: Math.max(0, gstOnPurchases1B),
      w1: Math.max(0, w1),
      w2: Math.max(0, w2),
      netGst: Math.max(0, gstOnSales1A) - Math.max(0, gstOnPurchases1B),
      totalPayg: Math.max(0, w2),
    };
  }, [entries]);

  const netPayment = basData.netGst + basData.totalPayg;

  const renderRow = (label: string, description: string, value: number, isHighlight = false) => (
    <div key={label} className={`flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 border ${isHighlight ? 'border-[var(--ink)] bg-gray-50' : 'border-[var(--line)]'} hover:border-[var(--ink)] transition-colors gap-2 sm:gap-4`}>
      <div className="flex items-start sm:items-center gap-3">
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold shrink-0 ${isHighlight ? 'bg-[var(--ink)] text-white' : 'bg-gray-100 text-gray-700'}`}>
          {label}
        </span>
        <span className={`text-sm ${isHighlight ? 'font-bold' : 'font-medium'}`}>{description}</span>
      </div>
      <div className={`text-lg data-value ${isHighlight ? 'font-bold' : ''} text-right sm:text-left`}>
        ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </div>
    </div>
  );

  return (
    <div className="bg-white p-4 sm:p-6 shadow-sm border border-[var(--line-strong)]">
      <div className="flex items-center gap-2 mb-6">
        <FileSignature className="text-orange-600" />
        <h2 className="text-xl font-medium">BAS & IAS Assistant</h2>
      </div>

      <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-8 flex gap-3">
        <Info className="text-orange-600 shrink-0" size={20} />
        <p className="text-sm text-orange-800">
          This assistant calculates your Business Activity Statement (BAS) and Instalment Activity Statement (IAS) figures based on your posted journal entries and GST codes.
        </p>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="col-header mb-4 border-b border-[var(--line-strong)] pb-2">GST Calculation</h3>
          <div className="space-y-2">
            {renderRow('G1', 'Total sales (including any GST)', basData.g1)}
            {renderRow('G2', 'Export sales', basData.g2)}
            {renderRow('G3', 'Other GST-free sales', basData.g3)}
            {renderRow('G10', 'Capital purchases', basData.g10)}
            {renderRow('G11', 'Non-capital purchases', basData.g11)}
            <div className="my-4 border-t border-[var(--line-strong)]"></div>
            {renderRow('1A', 'GST on sales or GST instalment', basData.gstOnSales1A, true)}
            {renderRow('1B', 'GST on purchases', basData.gstOnPurchases1B, true)}
            {renderRow('9', 'Net GST amount', basData.netGst, true)}
          </div>
        </div>

        <div>
          <h3 className="col-header mb-4 border-b border-[var(--line-strong)] pb-2">PAYG Tax Withheld</h3>
          <div className="space-y-2">
            {renderRow('W1', 'Total salary, wages and other payments', basData.w1)}
            {renderRow('W2', 'Amounts withheld from payments shown at W1', basData.w2, true)}
          </div>
        </div>

        <div className="pt-6 border-t-2 border-[var(--ink)]">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="text-lg font-bold">Total Payment / (Refund)</h3>
            <div className={`text-2xl font-bold data-value ${netPayment < 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(netPayment).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              <span className="text-sm ml-2 text-gray-500">{netPayment < 0 ? 'Refund' : 'Payment'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
