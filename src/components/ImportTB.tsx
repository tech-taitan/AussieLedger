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
import type { ImportedAccount, JournalEntry, JournalLine, Account, AccountType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { isAiEnabled, GEMINI_MODEL } from '../lib/ai';
import { fuzzyMatch, HIGH_CONFIDENCE_THRESHOLD } from '../lib/import/match';
import { parseCsvFile, parseCsvRaw } from '../lib/import/csv';
import { parseXlsxBuffer, pickSheetByName, getXlsxRawRows } from '../lib/import/xlsx';
import {
  computeImportFingerprint,
  type ColumnMappingByName,
  type RawRow,
} from '../lib/import/fingerprint';
import { detectHeaderRow, type HeaderDetectResult } from '../lib/import/headerDetect';
import { parseCurrency } from '../lib/import/currencyParse';
import { detectSubtotals, type ImportRow as SubtotalImportRow } from '../lib/import/subtotalDetect';
import { detectSplitColumns, mergeColumns, deriveRegexSignature } from '../lib/import/columnMerge';
import Decimal from 'decimal.js';
import { XlsxSheetPicker } from './XlsxSheetPicker';
import { ImportReviewPane, type ReviewRow } from './ImportReviewPane';
import { HeaderRowPicker } from './HeaderRowPicker';
import type { RejectedRow } from './RejectedRowsPanel';
import { AiGateNote } from './AiGateNote';
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
  /**
   * Called when the user clicked "Create new account" on one or more review
   * rows and accepted the import. Receives the freshly-built Account objects
   * (with deterministic ids already wired into the opening-balances journal
   * lines). App.tsx forwards these to useAccounts so the new rows show up
   * in the CoA and the journal can resolve its accountId references.
   */
  onCreateAccounts?: (newAccounts: Account[]) => void;
}

/**
 * Map an external-system account code to one of the AU SME types. We honour
 * the 4-digit prefix convention (1xxx Asset, 2xxx Liability, 3xxx Equity,
 * 4xxx Revenue, 5xxx/6xxx Expense). When the code is missing or non-numeric,
 * fall back to a debit/credit heuristic — debit-heavy looks like an Expense,
 * credit-heavy like a Liability. Worst case the user fixes the type in the
 * Configure Accounts editor; the row still imports without data loss.
 */
function guessAccountType(code: string, debit: number, credit: number): AccountType {
  const m = code.match(/^(\d)/);
  if (m) {
    switch (m[1]) {
      case '1': return 'Asset';
      case '2': return 'Liability';
      case '3': return 'Equity';
      case '4': return 'Revenue';
      case '5':
      case '6': return 'Expense';
    }
  }
  return debit >= credit ? 'Expense' : 'Liability';
}

export const ImportTB: React.FC<ImportTBProps> = ({
  accounts,
  onImport,
  activeEntityId,
  existingEntries,
  onReplace,
  onCreateAccounts,
}) => {
  // ── Deterministic parse stage ─────────────────────────────────────────────
  const [parsedRows, setParsedRows] = useState<RawRow[] | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [xlsxBuffer, setXlsxBuffer] = useState<ArrayBuffer | null>(null);
  const [sheetPickerNames, setSheetPickerNames] = useState<string[] | null>(null);

  // ── Phase 7: Header-row detection state ────────────────────────────────────
  const [rawRows, setRawRows] = useState<string[][] | null>(null);
  const [headerDetectResult, setHeaderDetectResult] = useState<HeaderDetectResult | null>(null);
  const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null);
  const [isPickingHeader, setIsPickingHeader] = useState(false);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [pickedSheetName, setPickedSheetName] = useState<string | null>(null);

  // ── Phase 7: Missing-code mode ─────────────────────────────────────────────
  const [missingCodeMode, setMissingCodeMode] = useState<'pick' | null>(null);

  // ── Phase 7: Rejected rows + parse counters ────────────────────────────────
  const [rejectedRows, setRejectedRows] = useState<RejectedRow[]>([]);
  const [tolerantParseCount, setTolerantParseCount] = useState(0);
  const [lowConfidenceParseCount, setLowConfidenceParseCount] = useState(0);

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
        setPickedFile(file);
        const raw = await parseCsvRaw(file);
        setRawRows(raw);
        const detect = detectHeaderRow(raw);
        setHeaderDetectResult(detect);
        if (detect.autoPickRow !== null) {
          await proceedAfterHeaderPick(detect.autoPickRow, file, null, null);
        } else {
          setIsPickingHeader(true);
        }
      } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        const buf = await file.arrayBuffer();
        setXlsxBuffer(buf);
        setPickedFile(file);
        const { sheetNames } = parseXlsxBuffer(buf);
        if (sheetNames.length > 1) {
          setSheetPickerNames(sheetNames);
        } else {
          setPickedSheetName(sheetNames[0]);
          const raw = getXlsxRawRows(buf, sheetNames[0]);
          setRawRows(raw);
          const detect = detectHeaderRow(raw);
          setHeaderDetectResult(detect);
          if (detect.autoPickRow !== null) {
            await proceedAfterHeaderPick(detect.autoPickRow, file, buf, sheetNames[0]);
          } else {
            setIsPickingHeader(true);
          }
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

  // ── Sheet picker → header detection then column mapping ───────────────────
  const handleSheetPick = async (name: string) => {
    if (!xlsxBuffer) return;
    setSheetPickerNames(null);
    setPickedSheetName(name);
    const raw = getXlsxRawRows(xlsxBuffer, name);
    setRawRows(raw);
    const detect = detectHeaderRow(raw);
    setHeaderDetectResult(detect);
    if (detect.autoPickRow !== null) {
      await proceedAfterHeaderPick(detect.autoPickRow, pickedFile, xlsxBuffer, name);
    } else {
      setIsPickingHeader(true);
    }
  };

  const handleSheetPickCancel = () => {
    setSheetPickerNames(null);
    setXlsxBuffer(null);
  };

  // ── Header row pick → proceed to column mapping ───────────────────────────
  const handleHeaderPick = async (rowIndex: number) => {
    setHeaderRowIndex(rowIndex);
    setIsPickingHeader(false);
    await proceedAfterHeaderPick(rowIndex, pickedFile, xlsxBuffer, pickedSheetName);
  };

  /**
   * After header row is chosen (auto-picked or user-selected), parse the file
   * with the correct headerRowIndex, run split-column detection, then advance
   * to the column-mapping step (or missing-code picker if needed).
   */
  const proceedAfterHeaderPick = async (
    rowIdx: number,
    file: File | null,
    buf: ArrayBuffer | null,
    sheet: string | null,
  ) => {
    try {
      let parsed: { rows: RawRow[]; headers: string[] };
      if (buf && sheet) {
        parsed = pickSheetByName(buf, sheet, { headerRowIndex: rowIdx });
      } else if (file) {
        parsed = await parseCsvFile(file, { headerRowIndex: rowIdx });
      } else {
        throw new Error('No file or buffer available');
      }

      // Split-column detection
      const splitResult = detectSplitColumns(parsed.headers, parsed.rows);
      let effectiveRows = parsed.rows;
      let effectiveHeaders = parsed.headers;

      if (
        splitResult.hasSplitColumns &&
        splitResult.missingCodeFraction < 0.5 &&
        splitResult.codeColHeader &&
        splitResult.nameColHeader
      ) {
        effectiveRows = mergeColumns(
          parsed.rows,
          splitResult.codeColHeader,
          splitResult.nameColHeader,
        );
        effectiveHeaders = [...parsed.headers, '__merged_code_name'];
      }

      setParsedRows(effectiveRows);
      setParsedHeaders(effectiveHeaders);
      seedDefaultMapping(effectiveHeaders);

      if (splitResult.codeColHeader && splitResult.missingCodeFraction > 0.5) {
        setMissingCodeMode('pick');
      } else {
        setIsColumnMapping(true);
      }
    } catch (err) {
      console.error('proceedAfterHeaderPick failed', err);
      alert(
        `Could not parse file with header row ${rowIdx + 1}: ${(err as Error).message}`,
      );
    }
  };

  // ── Column mapping → review stage (deterministic fuzzyMatch + currency-parse)
  const processColumnMapping = () => {
    if (!parsedRows) return;
    const accepted: ReviewRow[] = [];
    const rejected: RejectedRow[] = [];
    let tolerant = 0;
    let lowConf = 0;

    parsedRows.forEach((r, idx) => {
      const code = (r[columnMappingByName.code] ?? '').toString().trim();
      const name = (r[columnMappingByName.name] ?? '').toString().trim();
      const rawDebit = (r[columnMappingByName.debit] ?? '').toString();
      const rawCredit = (r[columnMappingByName.credit] ?? '').toString();
      const debitResult = parseCurrency(rawDebit);
      const creditResult = parseCurrency(rawCredit);

      // Track tolerant parses (high-confidence but had formatting stripped)
      if (rawDebit.trim() !== '' && debitResult.confidence === 'high' && /[$,A]/.test(rawDebit))
        tolerant++;
      if (rawCredit.trim() !== '' && creditResult.confidence === 'high' && /[$,A]/.test(rawCredit))
        tolerant++;
      // Track low-confidence parses (ambiguous — e.g. "1,234" AU or EU?)
      if (debitResult.confidence === 'low' && debitResult.decimal !== null) lowConf++;
      if (creditResult.confidence === 'low' && creditResult.decimal !== null) lowConf++;

      // Reject if either parse returned null (non-empty unparseable cell)
      if (debitResult.decimal === null || creditResult.decimal === null) {
        const failingColumn: RejectedRow['failingColumn'] =
          debitResult.decimal === null ? 'debit' : 'credit';
        const failingCellValue =
          debitResult.decimal === null ? rawDebit : rawCredit;
        rejected.push({
          rowIndex: idx,
          reason: 'currency-unparseable',
          rawCode: code,
          rawName: name,
          rawDebit,
          rawCredit,
          failingCellValue,
          failingColumn,
        });
        return;
      }

      // Drop empty rows silently
      if (!code && !name) return;

      // Rows with name but no code go to rejected for review
      if (!code && name) {
        rejected.push({
          rowIndex: idx,
          reason: 'no-account-code',
          rawCode: code,
          rawName: name,
          rawDebit,
          rawCredit,
        });
        return;
      }

      const debitNum = debitResult.decimal.toNumber();
      const creditNum = creditResult.decimal.toNumber();
      // Drop rows with zero amounts (likely blank / section-heading rows)
      if (debitNum === 0 && creditNum === 0) return;

      accepted.push({
        externalCode: code,
        externalName: name,
        debit: debitNum,
        credit: creditNum,
        mappedAccountId: undefined,
        confidence: 0,
        reasoning: 'Pending fuzzy match',
        _include: true,
      });
    });

    // Run subtotal detection on accepted rows
    const subtotalInput: SubtotalImportRow[] = accepted.map((a, i) => ({
      rowIndex: i,
      code: a.externalCode,
      name: a.externalName,
      debit: new Decimal(a.debit),
      credit: new Decimal(a.credit),
      rawDebit: String(a.debit),
      rawCredit: String(a.credit),
    }));
    const subtotalFlags = detectSubtotals(subtotalInput);
    const subtotalIxs = new Set(subtotalFlags.map((f) => f.rowIndex));

    const finalAccepted: ReviewRow[] = [];
    accepted.forEach((row, i) => {
      if (subtotalIxs.has(i)) {
        rejected.push({
          rowIndex: i,
          reason: 'subtotal',
          rawCode: row.externalCode,
          rawName: row.externalName,
          rawDebit: String(row.debit),
          rawCredit: String(row.credit),
        });
        return;
      }
      // Deterministic fuzzy match — preserves Phase 4 behavior (IMP-04)
      const result = fuzzyMatch(row, accounts);
      finalAccepted.push({
        ...row,
        mappedAccountId: result.mappedAccountId,
        confidence: result.confidence,
        reasoning:
          result.confidence >= HIGH_CONFIDENCE_THRESHOLD
            ? 'Auto-matched (deterministic)'
            : 'Manual review recommended',
      });
    });

    setImportedRows(finalAccepted);
    setRejectedRows(rejected);
    setTolerantParseCount(tolerant);
    setLowConfidenceParseCount(lowConf);
    setIsColumnMapping(false);
    setReviewing(true);
  };

  // ── Rejected row handlers ─────────────────────────────────────────────────
  const handleRejectedRowUpdate = (rowIndex: number, patch: Partial<RejectedRow>) => {
    setRejectedRows((curr) =>
      curr.map((r) => (r.rowIndex === rowIndex ? { ...r, ...patch } : r)),
    );
  };

  const handleRejectedRowReparse = (rowIndex: number) => {
    const row = rejectedRows.find((r) => r.rowIndex === rowIndex);
    if (!row) return;
    const debitResult = parseCurrency(row.editedDebit ?? row.rawDebit);
    const creditResult = parseCurrency(row.editedCredit ?? row.rawCredit);
    if (debitResult.decimal === null || creditResult.decimal === null) return;
    setRejectedRows((curr) => curr.filter((r) => r.rowIndex !== rowIndex));
    setImportedRows((curr) => [
      ...curr,
      {
        externalCode: row.editedCode ?? row.rawCode,
        externalName: row.editedName ?? row.rawName,
        debit: debitResult.decimal!.toNumber(),
        credit: creditResult.decimal!.toNumber(),
        mappedAccountId: undefined,
        confidence: 0,
        reasoning: 'Re-parsed from rejected',
        _include: true,
      } as ReviewRow,
    ]);
  };

  const handleIncludeAllSubtotals = () => {
    const subtotals = rejectedRows.filter((r) => r.reason === 'subtotal');
    setRejectedRows((curr) => curr.filter((r) => r.reason !== 'subtotal'));
    setImportedRows((curr) => [
      ...curr,
      ...subtotals.map((s) => {
        const debit = parseCurrency(s.rawDebit).decimal?.toNumber() ?? 0;
        const credit = parseCurrency(s.rawCredit).decimal?.toNumber() ?? 0;
        return {
          externalCode: s.rawCode,
          externalName: s.rawName,
          debit,
          credit,
          mappedAccountId: undefined,
          confidence: 0,
          reasoning: 'Subtotal manually included',
          _include: true,
        } as ReviewRow;
      }),
    ]);
  };

  const handleApplyToSimilar = (sourceRowIndex: number) => {
    const source = rejectedRows.find((r) => r.rowIndex === sourceRowIndex);
    if (!source || !source.failingCellValue) return;
    const sig = deriveRegexSignature(source.failingCellValue);
    const re = new RegExp(`^${sig}$`);
    const similar = rejectedRows.filter(
      (r) =>
        r.reason === source.reason &&
        r.failingCellValue != null &&
        re.test(r.failingCellValue),
    );
    // For each similar row, swap in the source's edited values then attempt re-parse
    similar.forEach((s) => {
      const patched: RejectedRow = {
        ...s,
        editedCode: source.editedCode ?? s.editedCode,
        editedName: source.editedName ?? s.editedName,
        editedDebit: source.editedDebit ?? s.editedDebit,
        editedCredit: source.editedCredit ?? s.editedCredit,
      };
      handleRejectedRowUpdate(s.rowIndex, patched);
      handleRejectedRowReparse(s.rowIndex);
    });
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
    // IMP-07: resolve "Create new account" sentinels by minting a real
    // Account for each NEW:-tagged row. The Account ids are reused as the
    // mapped accountId on the journal line so debits/credits land on the
    // correct row even before the parent's account state has settled.
    const newAccountsCreated: Account[] = [];
    const resolvedRows: ReviewRow[] = rows.map((r) => {
      if (r.mappedAccountId && r.mappedAccountId.startsWith('NEW:')) {
        const code = (r.externalCode || '').trim() || `IMP-${Date.now()}`;
        const name = (r.externalName || '').trim() || 'Imported account';
        const newAccount: Account = {
          _v: 3,
          id: `acc-imp-${crypto.randomUUID()}`,
          code,
          name,
          type: guessAccountType(code, r.debit, r.credit),
          gstCode: 'N-T',
          isDefault: false,
        };
        newAccountsCreated.push(newAccount);
        return { ...r, mappedAccountId: newAccount.id };
      }
      return r;
    });
    if (newAccountsCreated.length > 0 && onCreateAccounts) {
      onCreateAccounts(newAccountsCreated);
    }

    const lines: JournalLine[] = resolvedRows
      .filter((r) => r.mappedAccountId && !r.mappedAccountId.startsWith('NEW:'))
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
    // Phase 7 state reset
    setRawRows(null);
    setHeaderDetectResult(null);
    setHeaderRowIndex(null);
    setIsPickingHeader(false);
    setPickedFile(null);
    setPickedSheetName(null);
    setMissingCodeMode(null);
    setRejectedRows([]);
    setTolerantParseCount(0);
    setLowConfidenceParseCount(0);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const showUploadScreen =
    !isColumnMapping &&
    !reviewing &&
    !sheetPickerNames &&
    !fingerprintCollision &&
    !isPickingHeader &&
    !missingCodeMode;

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

      {isPickingHeader && rawRows && (
        <HeaderRowPicker
          rows={rawRows}
          detectResult={headerDetectResult}
          onPick={handleHeaderPick}
          onCancel={resetState}
        />
      )}

      {missingCodeMode && (
        <div
          data-testid="missing-code-picker"
          className="bg-white border border-amber-200 p-4 rounded space-y-2"
        >
          <p className="text-sm">
            More than half the rows are missing an account code. How would you
            like to proceed?
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              data-testid="missing-code-auto-assign"
              onClick={() => {
                // Auto-assign sequential codes '001', '002', ...
                const codeKey =
                  columnMappingByName.code || '__assigned_code';
                setParsedRows(
                  (parsedRows ?? []).map((r, i) => ({
                    ...r,
                    [codeKey]: String(i + 1).padStart(3, '0'),
                  })),
                );
                setColumnMappingByName({
                  ...columnMappingByName,
                  code: codeKey,
                });
                setMissingCodeMode(null);
                setIsColumnMapping(true);
              }}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Auto-assign codes sequentially
            </button>
            <button
              type="button"
              data-testid="missing-code-name-only"
              onClick={() => {
                setMissingCodeMode(null);
                setIsColumnMapping(true);
              }}
              className="border px-3 py-1 rounded text-sm"
            >
              Import name-only and map manually
            </button>
            <button
              type="button"
              data-testid="missing-code-cancel"
              onClick={resetState}
              className="underline text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
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
            {isAiEnabled() ? (
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
            ) : (
              <AiGateNote />
            )}
          </div>
          <ImportReviewPane
            rows={importedRows}
            accounts={accounts}
            onUpdate={(rs) => setImportedRows(rs as ReviewRow[])}
            onAccept={handleAcceptImport}
            onReject={resetState}
            rejectedRows={rejectedRows}
            tolerantParseCount={tolerantParseCount}
            lowConfidenceParseCount={lowConfidenceParseCount}
            onRejectedRowUpdate={handleRejectedRowUpdate}
            onRejectedRowReparse={handleRejectedRowReparse}
            onIncludeAllSubtotals={handleIncludeAllSubtotals}
            onApplyToSimilar={handleApplyToSimilar}
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
