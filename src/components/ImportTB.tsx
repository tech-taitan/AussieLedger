/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Settings2,
} from 'lucide-react';
import type { ImportedAccount, JournalEntry, JournalLine, Account } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { isAiEnabled, GEMINI_MODEL } from '../lib/ai';
import { fuzzyMatch, HIGH_CONFIDENCE_THRESHOLD } from '../lib/import/match';
import { parseCsvFile } from '../lib/import/csv';
import { parseXlsxBuffer, pickSheetByName } from '../lib/import/xlsx';
import {
  computeImportFingerprint,
  type ColumnMappingByName,
  type RawRow,
} from '../lib/import/fingerprint';
import { XlsxSheetPicker } from './XlsxSheetPicker';
import { ImportReviewPane, type ReviewRow } from './ImportReviewPane';
import { today } from '../lib/period';

interface ImportTBProps {
  accounts: Account[];
  onImport: (entries: JournalEntry[]) => void;
  /** Phase 4 — active entity for fingerprint scoping (IMP-05). */
  activeEntityId?: string;
  /** Phase 4 — active entity's existing journals for fingerprint dedup. */
  existingEntries?: JournalEntry[];
  /**
   * Phase 4 Replace-path correctness hook. When the fingerprint dialog's
   * Replace button fires, ImportTB calls onReplace(existingId, newEntry)
   * so the parent (App.tsx) can mark the existing entry as status:
   * 'superseded' + replacedByEntryId in a SINGLE state update. Without
   * this, the 04-2 TrialBalance rollup (which filters status !==
   * 'superseded') would double-count both the original and the
   * replacement opening balances. If onReplace is absent the component
   * falls back to onImport (best-effort, but TB will double-count —
   * App.tsx SHOULD wire this prop via useJournals.supersedeImport).
   */
  onReplace?: (existingId: string, newEntry: JournalEntry) => void;
}

export const ImportTB: React.FC<ImportTBProps> = ({
  accounts,
  onImport,
  activeEntityId,
  existingEntries,
  onReplace,
}) => {
  // ── Deterministic parse stage ─────────────────────────────────────────────
  const [parsedRows, setParsedRows] = useState<RawRow[] | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [xlsxBuffer, setXlsxBuffer] = useState<ArrayBuffer | null>(null);
  const [sheetPickerNames, setSheetPickerNames] = useState<string[] | null>(null);

  // ── Column mapping (by header NAME, not index) ────────────────────────────
  const [columnMappingByName, setColumnMappingByName] =
    useState<ColumnMappingByName>({ code: '', name: '', debit: '', credit: '' });
  const [isColumnMapping, setIsColumnMapping] = useState(false);

  // ── Review stage ──────────────────────────────────────────────────────────
  const [importedRows, setImportedRows] = useState<ReviewRow[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Fingerprint collision dialog ──────────────────────────────────────────
  const [fingerprintCollision, setFingerprintCollision] = useState<{
    fingerprint: string;
    existing: JournalEntry;
  } | null>(null);

  // ── As-at date (used for fingerprint + journal date) ──────────────────────
  const [asAtDate, setAsAtDate] = useState<string>(
    today().toISOString().split('T')[0],
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File pick → CSV or XLSX deterministic parse ───────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith('.csv')) {
        const { rows, headers } = await parseCsvFile(file);
        setParsedRows(rows);
        setParsedHeaders(headers);
        seedDefaultMapping(headers);
        setIsColumnMapping(true);
      } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        const buf = await file.arrayBuffer();
        setXlsxBuffer(buf);
        const { sheetNames, rows, headers } = parseXlsxBuffer(buf);
        if (sheetNames.length > 1) {
          setSheetPickerNames(sheetNames);
        } else {
          setParsedRows(rows);
          setParsedHeaders(headers);
          seedDefaultMapping(headers);
          setIsColumnMapping(true);
        }
      } else {
        alert('Unsupported file type. Please choose .csv, .xls, or .xlsx.');
      }
    } catch (err) {
      console.error('Import parse failed', err);
      alert(`Could not parse file: ${(err as Error).message}`);
    }
  };

  /**
   * Seed best-effort default column mapping by guessing common header names.
   * The user can override on the column-mapping screen — this is purely a UX
   * shortcut so most CSVs land on the correct mapping out of the gate.
   */
  const seedDefaultMapping = (headers: string[]) => {
    const find = (re: RegExp) => headers.find((h) => re.test(h)) ?? '';
    setColumnMappingByName({
      code: find(/^code$|account.*code|account_no|account#|acc_id/i),
      name: find(/^name$|account.*name|description$|account$/i),
      debit: find(/^debit$|dr$|debit.*amount/i),
      credit: find(/^credit$|cr$|credit.*amount/i),
    });
  };

  // ── Sheet picker → buffer-aware sheet selection ───────────────────────────
  const handleSheetPick = (name: string) => {
    if (!xlsxBuffer) return;
    try {
      const { rows, headers } = pickSheetByName(xlsxBuffer, name);
      setParsedRows(rows);
      setParsedHeaders(headers);
      seedDefaultMapping(headers);
      setSheetPickerNames(null);
      setIsColumnMapping(true);
    } catch (err) {
      console.error('Sheet pick failed', err);
      alert(`Could not read sheet "${name}": ${(err as Error).message}`);
    }
  };

  const handleSheetPickCancel = () => {
    setSheetPickerNames(null);
    setXlsxBuffer(null);
  };

  // ── Column mapping → review stage (deterministic fuzzyMatch baseline) ─────
  const processColumnMapping = () => {
    if (!parsedRows) return;
    const imported: ImportedAccount[] = parsedRows
      .map((r) => ({
        externalCode: (r[columnMappingByName.code] ?? '').toString().trim(),
        externalName: (r[columnMappingByName.name] ?? '').toString().trim(),
        debit: Number(r[columnMappingByName.debit] ?? 0) || 0,
        credit: Number(r[columnMappingByName.credit] ?? 0) || 0,
      }))
      .filter(
        (r) =>
          (r.externalCode || r.externalName) &&
          (r.debit !== 0 || r.credit !== 0),
      );

    // Deterministic baseline match — always runs (IMP-04 deterministic path).
    const matched: ReviewRow[] = imported.map((row) => {
      const result = fuzzyMatch(row, accounts);
      return {
        ...row,
        mappedAccountId: result.mappedAccountId,
        confidence: result.confidence,
        reasoning:
          result.confidence >= HIGH_CONFIDENCE_THRESHOLD
            ? 'Auto-matched (deterministic)'
            : 'Manual review recommended',
        _include: true,
      };
    });
    setImportedRows(matched);
    setIsColumnMapping(false);
    setReviewing(true);
  };

  // ── Optional AI re-match (gated on isAiEnabled() — IMP-04) ────────────────
  const runAIMapping = async () => {
    if (!isAiEnabled()) return; // defence-in-depth

    setIsProcessing(true);
    try {
      const prompt = `
        You are an expert Australian accountant.
        I have a list of accounts from an external system and I need to map them to my internal Chart of Accounts.

        Internal Chart of Accounts:
        ${accounts
          .filter((a) => !a.isArchived)
          .map((a) => `${a.id}: ${a.code} - ${a.name} (${a.type})`)
          .join('\n')}

        External Accounts to map:
        ${importedRows.map((a) => `${a.externalCode} ${a.externalName}`).join('\n')}

        Return a JSON array of objects with:
        - externalCode: string
        - mappedAccountId: string (must be one of the internal IDs provided)
        - confidence: number (0 to 1)
        - reasoning: string (briefly why)
      `;

      const responseSchema = {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            externalCode: { type: 'STRING' },
            mappedAccountId: { type: 'STRING' },
            confidence: { type: 'NUMBER' },
            reasoning: { type: 'STRING' },
          },
          required: ['externalCode', 'mappedAccountId', 'confidence'],
        },
      };

      const res = await fetch('/api/ai/match-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: GEMINI_MODEL, responseSchema }),
      });
      if (!res.ok) {
        console.error('AI Mapping failed', res.status, await res.text());
        alert('AI Mapping failed. Falling back to deterministic match.');
        return;
      }
      const geminiBody = await res.json();
      const textPart =
        geminiBody?.candidates?.[0]?.content?.parts?.[0]?.text;
      const mappings: Array<{
        externalCode: string;
        mappedAccountId: string;
        confidence: number;
        reasoning?: string;
      }> = typeof textPart === 'string' ? JSON.parse(textPart) : [];

      const updated: ReviewRow[] = importedRows.map((item) => {
        const m = mappings.find((x) => x.externalCode === item.externalCode);
        if (!m) return item;
        return {
          ...item,
          mappedAccountId: m.mappedAccountId,
          confidence: m.confidence,
          reasoning: m.reasoning ?? item.reasoning,
        };
      });
      setImportedRows(updated);
    } catch (error) {
      console.error('AI Mapping failed', error);
      alert('AI Mapping failed. Falling back to deterministic match.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Post path with fingerprint dedup (IMP-05) + single opening journal (IMP-06)
  const buildOpeningEntry = (
    rows: ReviewRow[],
    fingerprint: string | undefined,
    options?: { replacesEntryId?: string; referenceSuffix?: string },
  ): JournalEntry => {
    const lines: JournalLine[] = rows
      .filter(
        (r) =>
          r.mappedAccountId &&
          !r.mappedAccountId.startsWith('NEW:'), // unresolved create-new is dropped at post; user must pick a real account or skip
      )
      .map((r) => ({
        accountId: r.mappedAccountId!,
        description: `Opening: ${r.externalName}`,
        debit: r.debit,
        credit: r.credit,
        taxAmount: 0,
      }));
    const referenceBase = `OPENING-${asAtDate}`;
    const reference = options?.referenceSuffix
      ? `${referenceBase}-${options.referenceSuffix}`
      : referenceBase;
    return {
      _v: 3,
      id: crypto.randomUUID(),
      date: asAtDate,
      reference,
      description: options?.replacesEntryId
        ? `Opening balances replacing import ${options.replacesEntryId}`
        : `Opening balances imported ${asAtDate}`,
      lines,
      isPosted: true,
      status: 'posted',
      importFingerprint: fingerprint,
      ...(options?.replacesEntryId
        ? { replacesEntryId: options.replacesEntryId }
        : {}),
    };
  };

  const handleAcceptImport = async () => {
    const included = importedRows.filter((r) => r._include !== false);
    if (included.length === 0) {
      alert('No rows selected to include — nothing to post.');
      return;
    }

    // Fingerprint dedup only fires when we know the active entity AND have
    // existingEntries to compare against. Best-effort fallback otherwise.
    if (activeEntityId && parsedRows && parsedRows.length > 0) {
      try {
        const fingerprint = await computeImportFingerprint(
          parsedRows,
          columnMappingByName,
          activeEntityId,
          asAtDate,
        );
        const collision = (existingEntries ?? []).find(
          (e) => e.importFingerprint === fingerprint,
        );
        if (collision) {
          setFingerprintCollision({ fingerprint, existing: collision });
          return;
        }
        postEntry(buildOpeningEntry(included, fingerprint));
        return;
      } catch (err) {
        console.error('Fingerprint compute failed', err);
        // Fall through to post without fingerprint
      }
    }
    postEntry(buildOpeningEntry(included, undefined));
  };

  const postEntry = (entry: JournalEntry) => {
    onImport([entry]);
    resetState();
  };

  const resetState = () => {
    setImportedRows([]);
    setParsedRows(null);
    setParsedHeaders([]);
    setXlsxBuffer(null);
    setReviewing(false);
    setIsColumnMapping(false);
    setFingerprintCollision(null);
    setColumnMappingByName({ code: '', name: '', debit: '', credit: '' });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const showUploadScreen =
    !isColumnMapping && !reviewing && !sheetPickerNames && !fingerprintCollision;

  return (
    <div className="space-y-6">
      {showUploadScreen && (
        <div className="bg-white p-6 sm:p-12 border-2 border-dashed border-[var(--line-strong)] flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Upload size={32} />
          </div>
          <h2 className="text-xl font-medium mb-2">Upload Trial Balance</h2>
          <p className="text-gray-500 text-sm max-w-md mb-6 px-4">
            Upload your existing Trial Balance in CSV or XLSX format. You can
            configure column mappings and use account matching to map your
            accounts.
          </p>
          <input
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={handleFileUpload}
            className="hidden"
            ref={fileInputRef}
            data-testid="import-tb-file-input"
            aria-label="import-tb-file-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto bg-[var(--ink)] text-white px-8 py-3 font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            Select CSV or XLSX File
          </button>
          <div className="mt-4 text-[10px] text-gray-400 uppercase tracking-widest font-bold px-4">
            Supports Xero, MYOB, and QuickBooks exports
          </div>
          <div className="mt-6 w-full sm:w-auto">
            <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider block mb-1">
              As-at date
            </label>
            <input
              type="date"
              value={asAtDate}
              onChange={(e) => setAsAtDate(e.target.value)}
              className="border border-[var(--line)] p-2 text-sm bg-white focus:outline-none focus:border-[var(--ink)]"
              aria-label="import-as-at-date"
            />
          </div>
        </div>
      )}

      {sheetPickerNames && (
        <XlsxSheetPicker
          sheetNames={sheetPickerNames}
          onSelect={handleSheetPick}
          onCancel={handleSheetPickCancel}
        />
      )}

      {isColumnMapping && parsedRows && (
        <div
          className="bg-white border border-[var(--line-strong)] rounded p-4"
          data-testid="column-mapping"
        >
          <div className="flex items-center gap-3 mb-4">
            <Settings2 className="text-blue-600" size={20} />
            <div>
              <h3 className="font-medium text-sm">Confirm column mapping</h3>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                Step 1 of 2: Map your columns by name
              </p>
            </div>
          </div>

          <div className="mb-4 bg-blue-50 border border-blue-100 p-3 rounded flex items-start gap-2">
            <AlertCircle
              className="text-blue-500 shrink-0 mt-0.5"
              size={14}
            />
            <div className="text-xs text-blue-700 leading-relaxed">
              {parsedRows.length} rows parsed from{' '}
              {parsedHeaders.length} columns. Pick which header maps to each
              field below.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['code', 'name', 'debit', 'credit'] as const).map((role) => (
              <label key={role} className="flex flex-col text-sm">
                <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1">
                  {role.charAt(0).toUpperCase() + role.slice(1)} column
                </span>
                <select
                  value={columnMappingByName[role]}
                  onChange={(e) =>
                    setColumnMappingByName({
                      ...columnMappingByName,
                      [role]: e.target.value,
                    })
                  }
                  aria-label={`map-${role}`}
                  className="border border-[var(--line)] px-2 py-1.5 bg-white"
                >
                  <option value="">— select —</option>
                  {parsedHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={resetState}
              className="px-4 py-2 text-sm border border-[var(--line)] hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={processColumnMapping}
              disabled={
                !columnMappingByName.code ||
                !columnMappingByName.name ||
                !columnMappingByName.debit ||
                !columnMappingByName.credit
              }
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
              data-testid="confirm-mapping"
            >
              Continue to review
            </button>
          </div>
        </div>
      )}

      {reviewing && (
        <div className="space-y-4">
          <div className="bg-white p-3 border border-[var(--line)] rounded flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <FileText size={16} className="text-blue-600" />
              <span>
                {importedRows.length} rows parsed; review matches below.
              </span>
            </div>
            {isAiEnabled() && (
              <button
                type="button"
                onClick={runAIMapping}
                disabled={isProcessing}
                className="border border-[var(--line-strong)] bg-white px-3 py-1.5 text-xs font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
                data-testid="ai-rematch"
              >
                {isProcessing ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Sparkles size={14} className="text-amber-500" />
                )}
                Enhance with AI
              </button>
            )}
          </div>
          <ImportReviewPane
            rows={importedRows}
            accounts={accounts}
            onUpdate={(rs) => setImportedRows(rs as ReviewRow[])}
            onAccept={handleAcceptImport}
            onReject={resetState}
          />
        </div>
      )}

      <AnimatePresence>
        {fingerprintCollision && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            data-testid="fingerprint-collision-dialog"
          >
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="text-amber-600" size={18} />
                Duplicate trial balance detected
              </h3>
              <p className="text-sm mb-4 text-gray-700">
                A trial-balance import already exists for this entity as-at{' '}
                {fingerprintCollision.existing.date} (reference{' '}
                <span className="font-mono">
                  {fingerprintCollision.existing.reference}
                </span>
                ).
              </p>
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  data-testid="fp-skip"
                  onClick={() => setFingerprintCollision(null)}
                  className="text-sm underline px-3 py-1"
                >
                  Skip
                </button>
                <button
                  type="button"
                  data-testid="fp-replace"
                  onClick={() => {
                    const included = importedRows.filter(
                      (r) => r._include !== false,
                    );
                    const replacement = buildOpeningEntry(
                      included,
                      fingerprintCollision.fingerprint,
                      {
                        replacesEntryId: fingerprintCollision.existing.id,
                        referenceSuffix: 'REPLACE',
                      },
                    );
                    if (typeof onReplace === 'function') {
                      onReplace(
                        fingerprintCollision.existing.id,
                        replacement,
                      );
                    } else {
                      // Fallback: parent did not wire onReplace. TB will
                      // double-count the original AND replacement until the
                      // wiring is fixed in App.tsx via supersedeImport.
                      onImport([replacement]);
                    }
                    resetState();
                  }}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  Replace existing journal
                </button>
                <button
                  type="button"
                  data-testid="fp-additional"
                  onClick={() => {
                    const included = importedRows.filter(
                      (r) => r._include !== false,
                    );
                    // Append :additional-{ts} so dedup doesn't keep firing
                    const newFp = `${fingerprintCollision.fingerprint}:additional-${Date.now()}`;
                    postEntry(buildOpeningEntry(included, newFp));
                  }}
                  className="bg-gray-200 px-3 py-1 rounded text-sm"
                >
                  Import as additional
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {reviewing && importedRows.length > 0 && (
        <div className="text-xs text-gray-500 flex items-center gap-2 px-1">
          <CheckCircle2 size={14} className="text-green-500" />
          {importedRows.filter((r) => r.mappedAccountId && r._include !== false)
            .length}{' '}
          of {importedRows.length} rows mapped and included.
          <ArrowRight size={14} className="text-gray-300 ml-1" />
        </div>
      )}
    </div>
  );
};
