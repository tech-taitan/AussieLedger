/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, ArrowRight, X, Settings2 } from 'lucide-react';
import { ImportedAccount, JournalEntry, Account } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { IS_AI_ENABLED } from '../lib/ai';
import { fuzzyMatch, HIGH_CONFIDENCE_THRESHOLD } from '../lib/import/match';
import { today } from '../lib/period';

interface ColumnMapping {
  code: number;
  name: number;
  debit: number;
  credit: number;
}

interface ImportTBProps {
  accounts: Account[];
  onImport: (entries: JournalEntry[]) => void;
}

export const ImportTB: React.FC<ImportTBProps> = ({ accounts, onImport }) => {
  const [fileData, setFileData] = useState<ImportedAccount[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [isMapping, setIsMapping] = useState(false);
  const [isColumnMapping, setIsColumnMapping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mappingComplete, setMappingComplete] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    code: 0,
    name: 1,
    debit: 2,
    credit: 3
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim() !== '');
      const rows = lines.map(row => {
        // Simple CSV split handling some quoted values
        return row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
      });

      setRawRows(rows);
      setIsColumnMapping(true);
    };
    reader.readAsText(file);
  };

  const processColumnMapping = () => {
    // Skip header and map based on configuration
    const imported: ImportedAccount[] = rawRows.slice(1)
      .filter(row => row.length > Math.max(columnMapping.code, columnMapping.name, columnMapping.debit, columnMapping.credit))
      .map(row => ({
        externalCode: row[columnMapping.code] || '',
        externalName: row[columnMapping.name] || '',
        debit: parseFloat(row[columnMapping.debit]?.replace(/[^0-9.-]+/g, '')) || 0,
        credit: parseFloat(row[columnMapping.credit]?.replace(/[^0-9.-]+/g, '')) || 0,
      }));

    setFileData(imported);
    setIsColumnMapping(false);
    setIsMapping(true);
  };

  /**
   * Deterministic account mapping using fuzzyMatch from src/lib/import/match.ts.
   * This is the primary (always-visible) matching path.
   * Rows with confidence >= HIGH_CONFIDENCE_THRESHOLD are auto-matched.
   * Rows below threshold show top candidates for manual selection.
   */
  const runDeterministicMapping = () => {
    setIsProcessing(true);
    const mapped: ImportedAccount[] = fileData.map(imported => {
      const result = fuzzyMatch(imported, accounts);
      return {
        ...imported,
        mappedAccountId: result.mappedAccountId,
        confidence: result.confidence,
        reasoning: result.confidence >= HIGH_CONFIDENCE_THRESHOLD
          ? 'Auto-matched (deterministic)'
          : 'Manual review recommended',
      };
    });
    setFileData(mapped);
    setMappingComplete(true);
    setIsProcessing(false);
  };

  const runAIMapping = async () => {
    // Defence-in-depth: guard even if called programmatically when AI is disabled
    if (!IS_AI_ENABLED) return;

    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const prompt = `
        You are an expert Australian accountant.
        I have a list of accounts from an external system and I need to map them to my internal Chart of Accounts.

        Internal Chart of Accounts:
        ${accounts.map(a => `${a.id}: ${a.code} - ${a.name} (${a.type})`).join('\n')}

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
      date: today().toISOString().split('T')[0],
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
    setShowPreview(false);
  };

  return (
    <div className="space-y-6">
      {!isMapping && !isColumnMapping ? (
        <div className="bg-white p-6 sm:p-12 border-2 border-dashed border-[var(--line-strong)] flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Upload size={32} />
          </div>
          <h2 className="text-xl font-medium mb-2">Upload Trial Balance</h2>
          <p className="text-gray-500 text-sm max-w-md mb-6 px-4">
            Upload your existing Trial Balance in CSV format.
            You can configure column mappings and use account matching to map your accounts.
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
      ) : isColumnMapping ? (
        <div className="bg-white border border-[var(--line-strong)] shadow-sm">
          <div className="p-4 border-b border-[var(--line-strong)] flex items-center gap-3 bg-gray-50">
            <Settings2 className="text-blue-600" size={20} />
            <div>
              <h3 className="font-medium text-sm">Configure Column Mapping</h3>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Step 1 of 2: Define your data structure</p>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded flex items-start gap-3">
              <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={16} />
              <div className="text-xs text-blue-700 leading-relaxed">
                Matches the columns from your uploaded CSV to the required ledger fields.
                Common formats vary between software providers.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {(['code', 'name', 'debit', 'credit'] as const).map((field) => (
                <div key={field} className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                    {field} Column
                  </label>
                  <select
                    value={columnMapping[field]}
                    onChange={(e) => setColumnMapping(prev => ({ ...prev, [field]: parseInt(e.target.value) }))}
                    className="w-full border border-[var(--line)] p-2 text-sm bg-white focus:outline-none focus:border-[var(--ink)]"
                  >
                    {rawRows[0]?.map((header, colIdx) => (
                      <option key={colIdx} value={colIdx}>
                        Col {colIdx + 1}: {header || '(Empty)'}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="border border-[var(--line)] overflow-hidden">
              <div className="bg-gray-50 p-2 text-[10px] font-bold uppercase text-gray-400 tracking-wider border-b border-[var(--line)]">
                Data Preview (First 5 Rows)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white border-b border-[var(--line)]">
                      {rawRows[0]?.map((header, idx) => (
                        <th key={idx} className="p-2 text-left bg-gray-50/50 border-r border-[var(--line)] last:border-r-0">
                          <div className="text-gray-400 font-mono">Col {idx + 1}</div>
                          <div className="truncate max-w-[120px]">{header}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawRows.slice(1, 6).map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b border-[var(--line)] last:border-b-0">
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="p-2 border-r border-[var(--line)] last:border-r-0 text-gray-600">
                            <div className="truncate max-w-[120px]">{cell}</div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 border-t border-[var(--line-strong)] flex justify-end gap-3">
            <button
              onClick={() => setIsColumnMapping(false)}
              className="px-6 py-2 text-sm font-medium border border-[var(--line)] hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={processColumnMapping}
              className="bg-[var(--ink)] text-white px-8 py-2 text-sm font-bold uppercase tracking-widest hover:opacity-90"
            >
              Continue to Account Mapping
            </button>
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
                <div className="flex gap-2">
                  <button
                    onClick={runDeterministicMapping}
                    disabled={isProcessing}
                    className="bg-[var(--ink)] text-white px-4 py-2 text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                    Auto-match Accounts
                  </button>
                  {IS_AI_ENABLED && (
                    <button
                      onClick={runAIMapping}
                      disabled={isProcessing}
                      className="border border-[var(--line-strong)] bg-white px-4 py-2 text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <Sparkles size={16} className="text-amber-500" />
                      Enhance with AI
                    </button>
                  )}
                </div>
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
                        {accounts.map(acc => (
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
                      {accounts.map(acc => (
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
              onClick={() => setShowPreview(true)}
              disabled={!fileData.some(i => i.mappedAccountId)}
              className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3 font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Preview Import
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPreview(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white shadow-2xl border border-[var(--line-strong)] flex flex-col max-h-full"
            >
              <div className="p-6 border-b border-[var(--line-strong)] bg-gray-50 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <CheckCircle2 size={24} className="text-green-500" />
                    Review Import Data
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Please confirm the totals and mappings before finalizing.</p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="p-4 bg-blue-50 border border-blue-100">
                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Accounts</div>
                    <div className="text-2xl font-bold">{fileData.filter(i => i.mappedAccountId).length}</div>
                  </div>
                  <div className="p-4 bg-gray-100/50 border border-gray-200">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Debits</div>
                    <div className="text-2xl font-bold font-mono text-green-600">
                      ${fileData.filter(i => i.mappedAccountId).reduce((sum, i) => sum + i.debit, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-100/50 border border-gray-200">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Credits</div>
                    <div className="text-2xl font-bold font-mono text-rose-600">
                      ${fileData.filter(i => i.mappedAccountId).reduce((sum, i) => sum + i.credit, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {Math.abs(fileData.filter(i => i.mappedAccountId).reduce((sum, i) => sum + i.debit, 0) - fileData.filter(i => i.mappedAccountId).reduce((sum, i) => sum + i.credit, 0)) > 0.01 && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 flex items-start gap-3">
                    <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div className="text-sm text-amber-800">
                      <p className="font-bold">Caution: Trial Balance Out of Balance</p>
                      <p className="opacity-80">Finalizing this import will result in an unbalanced journal entry.</p>
                    </div>
                  </div>
                )}

                <div className="border border-[var(--line)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-[var(--line)]">
                        <th className="text-[10px] font-bold uppercase text-gray-400 p-3 text-left">Internal Mapping</th>
                        <th className="text-[10px] font-bold uppercase text-gray-400 p-3 text-left">External Source</th>
                        <th className="text-[10px] font-bold uppercase text-gray-400 p-3 text-right">Debit</th>
                        <th className="text-[10px] font-bold uppercase text-gray-400 p-3 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)]">
                      {fileData.filter(i => i.mappedAccountId).map((item, idx) => {
                        const mappedAccount = accounts.find(a => a.id === item.mappedAccountId);
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="p-3">
                              <div className="font-bold text-gray-800 text-xs">{mappedAccount?.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono italic">{mappedAccount?.code}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-gray-600 text-xs">{item.externalName}</div>
                              <div className="text-[10px] text-gray-400 font-mono">{item.externalCode}</div>
                            </td>
                            <td className="p-3 text-right font-mono text-xs">
                              {item.debit > 0 ? `$${item.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="p-3 text-right font-mono text-xs">
                              {item.credit > 0 ? `$${item.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-[var(--line-strong)] flex flex-col sm:flex-row justify-end items-center gap-4 shrink-0">
                <button
                  onClick={() => setShowPreview(false)}
                  className="w-full sm:w-auto px-6 py-2 text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="w-full sm:w-auto bg-[var(--ink)] text-white px-10 py-3 text-xs font-bold uppercase tracking-widest hover:bg-black transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-lg"
                >
                  <CheckCircle2 size={16} />
                  Confirm & Finalize
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
