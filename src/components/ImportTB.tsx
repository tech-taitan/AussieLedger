/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { ImportedAccount, JournalEntry, Account } from '../types';
import { CHART_OF_ACCOUNTS } from '../constants';
import { GoogleGenAI, Type } from "@google/genai";
import { cn } from '../lib/utils';

interface ImportTBProps {
  onImport: (entries: JournalEntry[]) => void;
}

export const ImportTB: React.FC<ImportTBProps> = ({ onImport }) => {
  const [fileData, setFileData] = useState<ImportedAccount[]>([]);
  const [isMapping, setIsMapping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mappingComplete, setMappingComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').map(row => row.split(','));
      
      // Basic CSV parsing (assuming Code, Name, Debit, Credit)
      // Skip header
      const imported: ImportedAccount[] = rows.slice(1)
        .filter(row => row.length >= 4 && (row[2] || row[3]))
        .map(row => ({
          externalCode: row[0]?.trim() || '',
          externalName: row[1]?.trim() || '',
          debit: parseFloat(row[2]) || 0,
          credit: parseFloat(row[3]) || 0,
        }));

      setFileData(imported);
      setIsMapping(true);
    };
    reader.readAsText(file);
  };

  const runAIMapping = async () => {
    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
        You are an expert Australian accountant. 
        I have a list of accounts from an external system and I need to map them to my internal Chart of Accounts.
        
        Internal Chart of Accounts:
        ${CHART_OF_ACCOUNTS.map(a => `${a.id}: ${a.code} - ${a.name} (${a.type})`).join('\n')}
        
        External Accounts to map:
        ${fileData.map(a => `${a.externalCode} ${a.externalName}`).join('\n')}
        
        Return a JSON array of objects with:
        - externalCode: string
        - mappedAccountId: string (must be one of the internal IDs provided)
        - confidence: number (0 to 1)
        - reasoning: string (briefly why)
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                externalCode: { type: Type.STRING },
                mappedAccountId: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                reasoning: { type: Type.STRING },
              },
              required: ["externalCode", "mappedAccountId", "confidence"]
            }
          }
        }
      });

      const mappings = JSON.parse(response.text);
      
      const updatedData = fileData.map(item => {
        const mapping = mappings.find((m: any) => m.externalCode === item.externalCode);
        return {
          ...item,
          mappedAccountId: mapping?.mappedAccountId,
          confidence: mapping?.confidence,
          reasoning: mapping?.reasoning
        };
      });

      setFileData(updatedData);
      setMappingComplete(true);
    } catch (error) {
      console.error('AI Mapping failed', error);
      alert('AI Mapping failed. Please map manually.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    // Create a single journal entry for the opening balances
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      reference: 'IMPORT-TB',
      description: 'Opening balances from imported Trial Balance',
      isPosted: true,
      lines: fileData
        .filter(item => item.mappedAccountId)
        .map(item => ({
          accountId: item.mappedAccountId!,
          description: `Imported: ${item.externalName}`,
          debit: item.debit,
          credit: item.credit,
          taxAmount: 0 // Opening balances usually don't carry GST lines
        }))
    };

    onImport([entry]);
    setFileData([]);
    setIsMapping(false);
    setMappingComplete(false);
  };

  return (
    <div className="space-y-6">
      {!isMapping ? (
        <div className="bg-white p-6 sm:p-12 border-2 border-dashed border-[var(--line-strong)] flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Upload size={32} />
          </div>
          <h2 className="text-xl font-medium mb-2">Upload Trial Balance</h2>
          <p className="text-gray-500 text-sm max-w-md mb-6 px-4">
            Upload your existing Trial Balance in CSV format (Code, Name, Debit, Credit). 
            Our AI will automatically map your accounts to the LedgerAU Chart of Accounts.
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            ref={fileInputRef}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto bg-[var(--ink)] text-white px-8 py-3 font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            Select CSV File
          </button>
          <div className="mt-4 text-[10px] text-gray-400 uppercase tracking-widest font-bold px-4">
            Supports Xero, MYOB, and QuickBooks exports
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[var(--line-strong)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--line-strong)] flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 gap-4">
            <div>
              <h3 className="font-medium flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                Mapping Imported Accounts
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {fileData.length} accounts found in file.
              </p>
            </div>
            <div className="flex w-full sm:w-auto gap-3">
              {!mappingComplete && (
                <button
                  onClick={runAIMapping}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  Run AI Mapping
                </button>
              )}
              <button
                onClick={() => setIsMapping(false)}
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium border border-[var(--line)] hover:bg-gray-100 flex items-center justify-center"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] bg-gray-50">
                  <th className="col-header text-left p-4">External Account</th>
                  <th className="col-header text-right p-4">Debit</th>
                  <th className="col-header text-right p-4">Credit</th>
                  <th className="w-12 text-center"></th>
                  <th className="col-header text-left p-4">LedgerAU Account (Mapping)</th>
                  <th className="col-header text-center p-4">Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {fileData.map((item, idx) => (
                  <tr key={idx} className="data-row">
                    <td className="p-4">
                      <div className="font-medium">{item.externalName}</div>
                      <div className="text-xs text-gray-400 font-mono">{item.externalCode}</div>
                      {item.reasoning && (
                        <div className="mt-2 text-[11px] text-blue-700 bg-blue-50 p-2 rounded border border-blue-100 flex items-start gap-1.5 leading-tight">
                          <Sparkles size={12} className="shrink-0 mt-0.5 text-blue-500" />
                          <span>{item.reasoning}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right data-value">
                      {item.debit > 0 ? item.debit.toLocaleString() : '-'}
                    </td>
                    <td className="p-4 text-right data-value">
                      {item.credit > 0 ? item.credit.toLocaleString() : '-'}
                    </td>
                    <td className="text-center text-gray-300">
                      <ArrowRight size={16} />
                    </td>
                    <td className="p-4">
                      <select
                        value={item.mappedAccountId || ''}
                        onChange={(e) => {
                          const newData = [...fileData];
                          newData[idx].mappedAccountId = e.target.value;
                          setFileData(newData);
                        }}
                        className={cn(
                          "w-full border p-1 text-sm focus:outline-none",
                          item.mappedAccountId ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                        )}
                      >
                        <option value="">Select Mapping...</option>
                        {CHART_OF_ACCOUNTS.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4 text-center">
                      {item.confidence ? (
                        <div className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full inline-block",
                          item.confidence > 0.8 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        )}>
                          {Math.round(item.confidence * 100)}%
                        </div>
                      ) : (
                        <AlertCircle size={16} className="text-gray-300 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-[var(--line)]">
            {fileData.map((item, idx) => (
              <div key={idx} className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{item.externalName}</div>
                    <div className="text-xs text-gray-400 font-mono">{item.externalCode}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600">
                      {item.debit > 0 ? `DR: ${item.debit.toLocaleString()}` : ''}
                    </div>
                    <div className="text-sm font-medium text-red-600">
                      {item.credit > 0 ? `CR: ${item.credit.toLocaleString()}` : ''}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Mapping</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={item.mappedAccountId || ''}
                      onChange={(e) => {
                        const newData = [...fileData];
                        newData[idx].mappedAccountId = e.target.value;
                        setFileData(newData);
                      }}
                      className={cn(
                        "flex-1 border p-2 text-sm focus:outline-none rounded",
                        item.mappedAccountId ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                      )}
                    >
                      <option value="">Select Mapping...</option>
                      {CHART_OF_ACCOUNTS.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
                    {item.confidence && (
                      <div className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap",
                        item.confidence > 0.8 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      )}>
                        {Math.round(item.confidence * 100)}%
                      </div>
                    )}
                  </div>
                </div>

                {item.reasoning && (
                  <div className="text-[11px] text-blue-700 bg-blue-50 p-2 rounded border border-blue-100 flex items-start gap-1.5 leading-tight">
                    <Sparkles size={12} className="shrink-0 mt-0.5 text-blue-500" />
                    <span>{item.reasoning}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 sm:p-6 bg-gray-50 border-t border-[var(--line-strong)] flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              Ready to import {fileData.filter(i => i.mappedAccountId).length} of {fileData.length} accounts.
            </div>
            <button
              onClick={handleConfirmImport}
              disabled={!fileData.some(i => i.mappedAccountId)}
              className="w-full sm:w-auto bg-[var(--ink)] text-white px-8 py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Confirm & Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
