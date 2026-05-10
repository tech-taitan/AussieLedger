import React, { useMemo } from 'react';
import { Account, JournalEntry } from '../types';
import { computeBas } from '../lib/tax/bas';
import { currentFy } from '../lib/period';
import { FileSignature, Info } from 'lucide-react';

interface BasIasAssistantProps {
  accounts: Account[];
  entries: JournalEntry[];
}

export const BasIasAssistant: React.FC<BasIasAssistantProps> = ({ accounts, entries }) => {
  const basReturn = useMemo(() => {
    const fy = currentFy();
    return computeBas({ fy, entries, accounts, period: { type: 'fy', fy } });
  }, [entries, accounts]);

  const netPayment = Number(basReturn.netGst.value.toFixed(2)) + Number(basReturn.W2.value.toFixed(2));

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
            {renderRow('G1', 'Total sales (including any GST)', Number(basReturn.G1.value.toFixed(2)))}
            {renderRow('G2', 'Export sales', Number(basReturn.G2.value.toFixed(2)))}
            {renderRow('G3', 'Other GST-free sales', Number(basReturn.G3.value.toFixed(2)))}
            {renderRow('G10', 'Capital purchases', Number(basReturn.G10.value.toFixed(2)))}
            {renderRow('G11', 'Non-capital purchases', Number(basReturn.G11.value.toFixed(2)))}
            <div className="my-4 border-t border-[var(--line-strong)]"></div>
            {renderRow('1A', 'GST on sales or GST instalment', Number(basReturn['1A'].value.toFixed(2)), true)}
            {renderRow('1B', 'GST on purchases', Number(basReturn['1B'].value.toFixed(2)), true)}
            {renderRow('9', 'Net GST amount', Number(basReturn.netGst.value.toFixed(2)), true)}
          </div>
        </div>

        <div>
          <h3 className="col-header mb-4 border-b border-[var(--line-strong)] pb-2">PAYG Tax Withheld</h3>
          <div className="space-y-2">
            {renderRow('W1', 'Total salary, wages and other payments', Number(basReturn.W1.value.toFixed(2)))}
            {renderRow('W2', 'Amounts withheld from payments shown at W1', Number(basReturn.W2.value.toFixed(2)), true)}
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
