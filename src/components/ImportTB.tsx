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
  type SignedBalanceMode,
} from '../lib/import/fingerprint';
import { detectHeaderRow, type HeaderDetectResult } from '../lib/import/headerDetect';
import { parseCurrency } from '../lib/import/currencyParse';
import { detectSubtotals, type ImportRow as SubtotalImportRow } from '../lib/import/subtotalDetect';
import { detectSplitColumns, mergeColumns, deriveRegexSignature } from '../lib/import/columnMerge';
import { computeImportIssues, hasBlockingErrors } from '../lib/import/validateReview';
import Decimal from 'decimal.js';
import { XlsxSheetPicker } from './XlsxSheetPicker';
import { ImportReviewPane, type ReviewRow } from './ImportReviewPane';
import { HeaderRowPicker } from './HeaderRowPicker';
import type { RejectedRow } from './RejectedRowsPanel';
import { AiGateNote } from './AiGateNote';
import { RawUploadPreview } from './RawUploadPreview';
import { today } from '../lib/period';

interface ImportTBProps {
  accounts: Account[];
  /**
   * Persist journal entries. May return Promise<void> to indicate the
   * adapter write has completed — ImportTB awaits this when present so it
   * can guarantee account-then-journal ordering and surface adapter
   * errors as user-facing alerts instead of silently failing.
   */
  onImport: (entries: JournalEntry[]) => void | Promise<void>;
  /** Phase 4 — active entity for fingerprint scoping (IMP-05). */
  activeEntityId?: string;
  /** Display name of the active entity — surfaced in the upload chrome so
   *  the user can verify they're importing into the right entity. */
  activeEntityName?: string;
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
  /**
   * Append the minted accounts to the CoA. May return Promise<void> to
   * signal the adapter persist has completed. ImportTB awaits this BEFORE
   * calling onImport so the journal's accountId references are durable
   * even if the user refreshes between the two writes.
   */
  onCreateAccounts?: (newAccounts: Account[]) => void | Promise<void>;
}

/**
 * Map an external-system account code to one of the AU SME types. We honour
 * the 4-digit prefix convention (1xxx Asset, 2xxx Liability, 3xxx Equity,
 * 4xxx Revenue, 5xxx/6xxx Expense). When the code is missing or non-numeric,
 * fall back to a debit/credit heuristic — debit-heavy looks like an Expense,
 * credit-heavy like a Liability. Worst case the user fixes the type in the
 * Configure Accounts editor; the row still imports without data loss.
 */
/**
 * Build a deterministic suffix for the "Import as additional" fingerprint.
 * Replaces the legacy `Date.now()` which produced a fresh fingerprint on
 * every click — defeating dedup and allowing N duplicate journals from
 * the same data. Deriving the suffix from the canonical row form means
 * clicking "Import as additional" twice on the same rows produces the
 * SAME fingerprint the second time, and the dedup dialog re-fires
 * normally.
 */
async function buildAdditionalSuffix(
  rows: { externalCode: string; externalName: string; debit: number; credit: number }[],
  asAtDate: string,
): Promise<string> {
  const canonical = rows
    .map((r) => `${r.externalCode}|${r.externalName}|${r.debit.toFixed(2)}|${r.credit.toFixed(2)}`)
    .sort()
    .join('\n');
  const bytes = new TextEncoder().encode(`${asAtDate}|additional|${canonical}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .slice(0, 8) // 16-hex-char suffix is plenty for separation
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

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

/**
 * Render one mapping dropdown + a small data preview underneath. The preview
 * shows the first ~6 non-empty values from the chosen column so users can
 * confirm by eye instead of guessing from header names (#1).
 */
function renderMappingField(
  role: string,
  label: string,
  value: string,
  rows: RawRow[],
  onChange: (v: string) => void,
  headers: string[],
): React.ReactElement {
  const preview = value
    ? rows
        .map((r) => (r[value] ?? '').toString().trim())
        .filter((v) => v !== '')
        .slice(0, 6)
    : [];
  return (
    <label key={role} className="flex flex-col text-sm">
      <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`map-${role}`}
        className="border border-[var(--line)] px-2 py-1.5 bg-white"
      >
        <option value="">— select —</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      {value && (
        <div
          data-testid={`preview-${role}`}
          className="mt-1 text-[10px] text-gray-500 bg-gray-50 border border-[var(--line)] rounded px-2 py-1"
        >
          <span className="font-bold uppercase tracking-wider text-gray-400 mr-1">Preview:</span>
          {preview.length === 0 ? (
            <span className="italic text-gray-400">(no values)</span>
          ) : (
            <span className="font-mono">{preview.join(' · ')}</span>
          )}
        </div>
      )}
    </label>
  );
}

export const ImportTB: React.FC<ImportTBProps> = ({
  accounts,
  onImport,
  activeEntityId,
  activeEntityName,
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

  // TB layout selector — 'separate' uses Debit + Credit columns (default);
  // 'signed-balance' uses ONE signed numeric column where the sign chooses
  // DR vs CR. Covers the common AU export shape (DR Movement / CR Movement
  // is just 'separate' with renamed columns; Final Balance with positives =
  // DR and negatives = CR is 'signed-balance' with sign='positive-dr').
  const [layout, setLayout] = useState<'separate' | 'signed-balance'>('separate');
  const [balanceColumn, setBalanceColumn] = useState<string>('');
  const [signConvention, setSignConvention] = useState<'positive-dr' | 'positive-cr'>('positive-dr');

  // ── Review stage ──────────────────────────────────────────────────────────
  const [importedRows, setImportedRows] = useState<ReviewRow[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // Task 12: dedicated post-in-flight guard for accept/replace/additional
  // post buttons. The state drives visual disable; the ref is the true
  // race-safe guard (state updates aren't synchronous so two clicks landing
  // in the same React batch could both see isPosting === false).
  const [isPosting, setIsPosting] = useState(false);
  const isPostingRef = useRef(false);

  // ── Post-import success summary ──────────────────────────────────────────
  // Surfaced after onImport so the user sees exactly what was posted vs
  // skipped — avoids the "I uploaded 80 rows, only 50 made it" surprise.
  const [postSummary, setPostSummary] = useState<{
    posted: number;
    skippedUnmapped: number;
    skippedZero: number;
    newAccounts: number;
  } | null>(null);

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
    // Task 5: clear stale signed-balance / layout state from a prior file
    // so it can't point at a header that doesn't exist in the new upload.
    // columnMappingByName is reseeded later by seedDefaultMapping.
    setLayout('separate');
    setBalanceColumn('');
    setSignConvention('positive-dr');
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

      // Resolve rawDebit / rawCredit by layout. Signed-balance reads the
      // single balance column and splits by sign; separate reads two
      // dedicated columns. Downstream code (parseCurrency, subtotal
      // detection, etc) stays unchanged because we still produce
      // {rawDebit, rawCredit} strings.
      let rawDebit: string;
      let rawCredit: string;
      if (layout === 'signed-balance') {
        const rawBalance = (r[balanceColumn] ?? '').toString();
        const balanceResult = parseCurrency(rawBalance);
        if (rawBalance.trim() !== '' && balanceResult.confidence === 'high' && /[$,A]/.test(rawBalance)) tolerant++;
        if (balanceResult.confidence === 'low' && balanceResult.decimal !== null) lowConf++;
        if (balanceResult.decimal === null && rawBalance.trim() !== '') {
          rejected.push({
            rowIndex: idx,
            reason: 'currency-unparseable',
            rawCode: code,
            rawName: name,
            rawDebit: rawBalance,
            rawCredit: '',
            failingCellValue: rawBalance,
            failingColumn: 'debit',
          });
          return;
        }
        const v = balanceResult.decimal ? balanceResult.decimal.toNumber() : 0;
        const drIsPositive = signConvention === 'positive-dr';
        const debitNumeric = drIsPositive ? Math.max(v, 0) : Math.max(-v, 0);
        const creditNumeric = drIsPositive ? Math.max(-v, 0) : Math.max(v, 0);
        rawDebit = debitNumeric === 0 ? '' : debitNumeric.toString();
        rawCredit = creditNumeric === 0 ? '' : creditNumeric.toString();
      } else {
        rawDebit = (r[columnMappingByName.debit] ?? '').toString();
        rawCredit = (r[columnMappingByName.credit] ?? '').toString();
      }

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
      // Zero-balance rows are kept and shown in the review, but default
      // _include to false so they don't post empty journal lines unless
      // the user explicitly opts in. Section-heading-style pseudo-rows
      // are still caught downstream by the subtotal detector.
      const isZero = debitNum === 0 && creditNum === 0;

      accepted.push({
        externalCode: code,
        externalName: name,
        debit: debitNum,
        credit: creditNum,
        mappedAccountId: undefined,
        confidence: 0,
        reasoning: 'Pending fuzzy match',
        _include: !isZero,
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
      // Deterministic fuzzy match — preserves Phase 4 behavior (IMP-04).
      // nameDivergence is forwarded onto the review row so the pane can
      // render the rename diff and the validator can flag 'code-mismatch'.
      const result = fuzzyMatch(row, accounts);
      finalAccepted.push({
        ...row,
        mappedAccountId: result.mappedAccountId,
        confidence: result.confidence,
        reasoning:
          result.confidence >= HIGH_CONFIDENCE_THRESHOLD
            ? 'Auto-matched (deterministic)'
            : result.nameDivergence
              ? 'Code matches but name differs — confirm before posting'
              : 'Manual review recommended',
        _nameDivergence: result.nameDivergence,
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
  // IMP-07: resolve "Create new account" sentinels. Returns the minted
  // Account[] (to await persistence) and the resolved rows (whose
  // mappedAccountId now points at a real id, not a NEW: sentinel).
  // CRITICAL #2 race fix: callers MUST await onCreateAccounts(minted)
  // before posting the journal that references these ids.
  const resolveNewAccounts = (
    rows: ReviewRow[],
  ): { minted: Account[]; resolvedRows: ReviewRow[] } => {
    const minted: Account[] = [];
    const resolvedRows: ReviewRow[] = rows.map((r) => {
      if (r.mappedAccountId && r.mappedAccountId.startsWith('NEW:')) {
        const spec = r._newAccountSpec;
        const code = (spec?.code ?? r.externalCode ?? '').trim() || `IMP-${Date.now()}`;
        const name = (spec?.name ?? r.externalName ?? '').trim() || 'Imported account';
        const newAccount: Account = {
          _v: 3,
          id: `acc-imp-${crypto.randomUUID()}`,
          code,
          name,
          type: spec?.type ?? guessAccountType(code, r.debit, r.credit),
          gstCode: spec?.gstCode ?? 'N-T',
          parentCode: spec?.parentCode,
          isDefault: false,
          // HIGH #4: carry tax labels from the modal spec so the minted
          // account passes the YearEndWizard's unmapped check and the
          // tax engine can aggregate it under the right return label.
          taxLabel: spec?.taxLabel,
          companyTaxLabel: spec?.companyTaxLabel,
          trustTaxLabel: spec?.trustTaxLabel,
          partnershipTaxLabel: spec?.partnershipTaxLabel,
        };
        minted.push(newAccount);
        return { ...r, mappedAccountId: newAccount.id };
      }
      return r;
    });
    return { minted, resolvedRows };
  };

  const buildOpeningEntry = (
    resolvedRows: ReviewRow[],
    fingerprint: string | undefined,
    options?: { replacesEntryId?: string; referenceSuffix?: string },
  ): JournalEntry => {
    const lines: JournalLine[] = resolvedRows
      .filter((r) => r.mappedAccountId && !r.mappedAccountId.startsWith('NEW:'))
      .map((r) => ({
        accountId: r.mappedAccountId!,
        description: `Opening: ${r.externalName}`,
        // CRITICAL #3 defence in depth: any NaN that slipped past the
        // review-pane validation becomes an explicit 0 here, so the journal
        // line is always a finite number. TrialBalance's `Number(x) || 0`
        // would silently swallow NaN otherwise.
        debit: Number.isFinite(r.debit) ? r.debit : 0,
        credit: Number.isFinite(r.credit) ? r.credit : 0,
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
    // Task 12: race-safe double-click guard. The ref check beats the
    // state update because React batches setState — two clicks in the
    // same event loop turn would otherwise both see isPosting === false.
    if (isPostingRef.current) return;

    // CRITICAL #1: block silent data loss when no entity is selected.
    if (!activeEntityId) {
      alert('Select an entity before posting the import. The journal must belong to a specific entity.');
      return;
    }
    const included = importedRows.filter((r) => r._include !== false);
    if (included.length === 0) {
      alert('No rows selected to include — nothing to post.');
      return;
    }

    const issues = computeImportIssues(importedRows, accounts);
    if (hasBlockingErrors(issues)) {
      const messages = issues
        .filter((issue) => issue.severity === 'error')
        .map((issue) => issue.message)
        .join('\n\n');
      alert(`Resolve the import errors before posting:\n\n${messages}`);
      return;
    }

    isPostingRef.current = true;
    setIsPosting(true);
    try {
      // Mint accounts FIRST so the journal lines built from `resolvedRows`
      // never reference a NEW:-sentinel that hasn't been persisted yet.
      const { minted, resolvedRows } = resolveNewAccounts(included);

      // Fingerprint dedup only fires when we know the active entity AND have
      // existingEntries to compare against. Best-effort fallback otherwise.
      if (parsedRows && parsedRows.length > 0) {
        try {
          const signedBalance: SignedBalanceMode | undefined =
            layout === 'signed-balance'
              ? { column: balanceColumn, sign: signConvention }
              : undefined;
          const fingerprint = await computeImportFingerprint(
            parsedRows,
            columnMappingByName,
            activeEntityId,
            asAtDate,
            signedBalance,
          );
          const collision = (existingEntries ?? []).find(
            (e) => e.importFingerprint === fingerprint,
          );
          if (collision) {
            setFingerprintCollision({ fingerprint, existing: collision });
            return;
          }
          await postEntry(buildOpeningEntry(resolvedRows, fingerprint), minted, included, resolvedRows);
          return;
        } catch (err) {
          console.error('Fingerprint compute failed', err);
          // Fall through to post without fingerprint
        }
      }
      await postEntry(buildOpeningEntry(resolvedRows, undefined), minted, included, resolvedRows);
    } finally {
      isPostingRef.current = false;
      setIsPosting(false);
    }
  };

  /**
   * Persist accounts AND the journal in a deterministic order:
   *   1. await onCreateAccounts(minted)   — adapter has the new accounts
   *   2. await onImport([entry])           — adapter has the journal
   *   3. Build the post-import summary
   *   4. Reset the in-progress UI state
   *
   * Step 1 must complete before step 2 — otherwise a refresh between the
   * writes leaves journal lines pointing at a non-existent accountId and
   * the TrialBalance rollup silently drops the line.
   *
   * If step 1 throws (adapter error), the journal is NOT posted; if step 2
   * throws, the user is told the accounts are saved but the journal isn't,
   * so they can re-attempt.
   */
  /**
   * Task 8: after a successful mint, write the real accountIds back onto
   * `importedRows` so a retry (e.g. after a journal-write failure) sees
   * the resolved ids and does NOT remint with fresh UUIDs. Without this,
   * every retry adds a duplicate Account to the CoA.
   */
  const writeBackMintedIds = (
    includedRows: ReviewRow[],
    resolvedRows: ReviewRow[],
  ) => {
    const sentinelToId = new Map<string, string>();
    for (let i = 0; i < includedRows.length; i++) {
      const orig = includedRows[i].mappedAccountId;
      const res = resolvedRows[i].mappedAccountId;
      if (orig && orig.startsWith('NEW:') && res && !res.startsWith('NEW:')) {
        sentinelToId.set(orig, res);
      }
    }
    if (sentinelToId.size === 0) return;
    setImportedRows((prev) =>
      prev.map((r) => {
        if (r.mappedAccountId && sentinelToId.has(r.mappedAccountId)) {
          return {
            ...r,
            mappedAccountId: sentinelToId.get(r.mappedAccountId)!,
            _newAccountSpec: undefined,
          };
        }
        return r;
      }),
    );
  };

  const postEntry = async (
    entry: JournalEntry,
    minted: Account[],
    includedRows: ReviewRow[] = [],
    resolvedRows: ReviewRow[] = [],
  ): Promise<void> => {
    // Snapshot the row breakdown BEFORE resetState wipes importedRows.
    const skippedUnmapped = importedRows.filter(
      (r) => r._include !== false && !r.mappedAccountId,
    ).length;
    const skippedZero = importedRows.filter(
      (r) => r._include === false && (Number(r.debit) || 0) === 0 && (Number(r.credit) || 0) === 0,
    ).length;

    if (minted.length > 0 && onCreateAccounts) {
      try {
        await onCreateAccounts(minted);
        // Write the resolved ids back to the review rows so a retry does
        // not duplicate the mint.
        writeBackMintedIds(includedRows, resolvedRows);
      } catch (err) {
        console.error('Failed to persist new accounts before journal post', err);
        alert(
          `Failed to save ${minted.length} new account(s). The journal was NOT posted — please retry.`,
        );
        return;
      }
    }

    try {
      await onImport([entry]);
    } catch (err) {
      console.error('Failed to persist journal entries', err);
      alert(
        `Failed to save the journal entries. ${minted.length > 0 ? `The ${minted.length} new account(s) ARE saved; ` : ''}` +
          `please try the import again.`,
      );
      return;
    }

    setPostSummary({
      posted: entry.lines.length,
      skippedUnmapped,
      skippedZero,
      newAccounts: minted.length,
    });
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
    setLayout('separate');
    setBalanceColumn('');
    setSignConvention('positive-dr');
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
      {!activeEntityId && (
        <div
          data-testid="import-no-entity-banner"
          className="bg-rose-50 border border-rose-200 rounded p-4 flex items-start gap-3"
        >
          <AlertCircle size={20} className="text-rose-700 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900">
            <div className="font-semibold mb-1">No entity selected</div>
            <p className="text-xs leading-relaxed">
              Pick an entity from the master dashboard before importing a Trial
              Balance. The journal must belong to a specific entity — without
              one, the import would silently produce nothing.
            </p>
          </div>
        </div>
      )}
      {activeEntityName && (
        <div
          data-testid="import-active-entity-banner"
          className="bg-blue-50 border border-blue-100 rounded p-3 flex items-center gap-2 text-xs"
        >
          <FileText size={14} className="text-blue-600 shrink-0" />
          <span className="text-blue-900">
            Importing into <strong>{activeEntityName}</strong>. If this isn't
            the right entity, switch from the master dashboard before
            uploading.
          </span>
        </div>
      )}
      {showUploadScreen && postSummary && (
        <div
          data-testid="post-import-summary"
          className="bg-green-50 border border-green-200 rounded p-4 flex items-start gap-3"
        >
          <CheckCircle2 size={20} className="text-green-700 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-green-900">
            <div className="font-semibold mb-1">Import complete</div>
            <ul className="text-xs space-y-0.5">
              <li>
                <span className="font-mono font-bold">{postSummary.posted}</span> journal line
                {postSummary.posted === 1 ? '' : 's'} posted to the Trial Balance.
              </li>
              {postSummary.skippedUnmapped > 0 && (
                <li className="text-amber-800">
                  <span className="font-mono font-bold">{postSummary.skippedUnmapped}</span> unmapped
                  row{postSummary.skippedUnmapped === 1 ? '' : 's'} skipped — re-import and map them
                  to an account if you need their balances in the TB.
                </li>
              )}
              {postSummary.skippedZero > 0 && (
                <li className="text-gray-600">
                  <span className="font-mono font-bold">{postSummary.skippedZero}</span> zero-balance
                  row{postSummary.skippedZero === 1 ? '' : 's'} skipped by default (you can opt them
                  in row-by-row on re-import).
                </li>
              )}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setPostSummary(null)}
            className="text-xs text-green-800 underline hover:text-green-900"
            data-testid="dismiss-post-summary"
          >
            Dismiss
          </button>
        </div>
      )}
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
            disabled={!activeEntityId}
            data-testid="import-tb-select-file"
            className="w-full sm:w-auto bg-[var(--ink)] text-white px-8 py-3 font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            title={!activeEntityId ? 'Select an entity first' : undefined}
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

          {/* Layout selector (#2): how the file represents debits / credits. */}
          <fieldset
            data-testid="layout-selector"
            className="mb-4 border border-[var(--line)] rounded p-3 space-y-2"
          >
            <legend className="text-[10px] font-bold uppercase text-gray-500 tracking-wider px-1">
              File layout
            </legend>
            <label className="flex items-start gap-2 cursor-pointer text-xs">
              <input
                type="radio"
                name="tb-layout"
                checked={layout === 'separate'}
                onChange={() => setLayout('separate')}
                data-testid="layout-separate"
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Separate Debit + Credit columns</span>
                <span className="text-gray-500"> — also use this if your file uses "DR Movement" + "CR Movement"</span>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer text-xs">
              <input
                type="radio"
                name="tb-layout"
                checked={layout === 'signed-balance'}
                onChange={() => setLayout('signed-balance')}
                data-testid="layout-signed-balance"
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Single signed balance column</span>
                <span className="text-gray-500"> — common Australian TB export ("Final Balance" with positive = DR)</span>
              </span>
            </label>
            {layout === 'signed-balance' && (
              <div className="ml-6 mt-2 pt-2 border-t border-[var(--line)] flex gap-4 text-xs">
                <span className="font-medium text-gray-600">Sign convention:</span>
                <label className="cursor-pointer flex items-center gap-1">
                  <input
                    type="radio"
                    name="sign-convention"
                    checked={signConvention === 'positive-dr'}
                    onChange={() => setSignConvention('positive-dr')}
                    data-testid="sign-positive-dr"
                  />
                  Positive = Debit (DR)
                </label>
                <label className="cursor-pointer flex items-center gap-1">
                  <input
                    type="radio"
                    name="sign-convention"
                    checked={signConvention === 'positive-cr'}
                    onChange={() => setSignConvention('positive-cr')}
                    data-testid="sign-positive-cr"
                  />
                  Positive = Credit (CR)
                </label>
              </div>
            )}
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {renderMappingField('code', 'Code column', columnMappingByName.code, parsedRows ?? [], (v) =>
              setColumnMappingByName({ ...columnMappingByName, code: v }),
              parsedHeaders,
            )}
            {renderMappingField('name', 'Name column', columnMappingByName.name, parsedRows ?? [], (v) =>
              setColumnMappingByName({ ...columnMappingByName, name: v }),
              parsedHeaders,
            )}
            {layout === 'separate' && (
              <>
                {renderMappingField('debit', 'Debit column', columnMappingByName.debit, parsedRows ?? [], (v) =>
                  setColumnMappingByName({ ...columnMappingByName, debit: v }),
                  parsedHeaders,
                )}
                {renderMappingField('credit', 'Credit column', columnMappingByName.credit, parsedRows ?? [], (v) =>
                  setColumnMappingByName({ ...columnMappingByName, credit: v }),
                  parsedHeaders,
                )}
              </>
            )}
            {layout === 'signed-balance' && (
              renderMappingField('balance', 'Signed balance column', balanceColumn, parsedRows ?? [], setBalanceColumn, parsedHeaders)
            )}
          </div>

          {parsedRows && parsedRows.length > 0 && (
            <RawUploadPreview
              headers={parsedHeaders}
              rows={parsedRows}
              mapped={{
                code: columnMappingByName.code || undefined,
                name: columnMappingByName.name || undefined,
                debit: layout === 'separate' ? (columnMappingByName.debit || undefined) : undefined,
                credit: layout === 'separate' ? (columnMappingByName.credit || undefined) : undefined,
                balance: layout === 'signed-balance' ? (balanceColumn || undefined) : undefined,
              }}
            />
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={resetState}
              className="px-4 py-2 text-sm border border-[var(--line)] hover:bg-gray-100"
            >
              Cancel
            </button>
            {(() => {
              // Task 2: detect duplicate column mappings before allowing
              // the user to proceed. Mapping the same header to two roles
              // (e.g. "Amount" → both Debit AND Credit) makes every line
              // identical on both sides → TB falsely balances at zero
              // activity. Hard-block at the dropdown step so the bad data
              // never reaches the review pane.
              const picked: Record<string, string[]> = {};
              const add = (role: string, header: string | undefined) => {
                if (!header) return;
                (picked[header] ??= []).push(role);
              };
              add('code', columnMappingByName.code);
              add('name', columnMappingByName.name);
              if (layout === 'separate') {
                add('debit', columnMappingByName.debit);
                add('credit', columnMappingByName.credit);
              } else {
                add('balance', balanceColumn);
              }
              const duplicates = Object.entries(picked).filter(
                ([, roles]) => roles.length > 1,
              );
              const missingRequired =
                !columnMappingByName.code ||
                !columnMappingByName.name ||
                (layout === 'separate'
                  ? !columnMappingByName.debit || !columnMappingByName.credit
                  : !balanceColumn);
              return (
                <>
                  {duplicates.length > 0 && (
                    <div
                      data-testid="mapping-duplicate-warning"
                      className="text-xs bg-rose-50 border border-rose-200 text-rose-900 rounded p-2 mb-2"
                    >
                      Two roles map to the same column —{' '}
                      {duplicates.map(([header, roles]) => (
                        <span key={header} className="font-mono">
                          {header} ({roles.join(' + ')})
                        </span>
                      ))}
                      . Each role must point at a different column or the
                      import will silently corrupt every row.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={processColumnMapping}
                    disabled={missingRequired || duplicates.length > 0}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                    data-testid="confirm-mapping"
                  >
                    Continue to review
                  </button>
                </>
              );
            })()}
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
                  disabled={isPosting}
                  aria-disabled={isPosting}
                  onClick={async () => {
                    // Task 12: race-safe double-click guard.
                    if (isPostingRef.current) return;
                    // Same blocking-errors gate as the main accept path —
                    // a fingerprint hit must not let an unbalanced /
                    // unmapped-laden journal slip through Replace.
                    const issues = computeImportIssues(importedRows, accounts);
                    if (hasBlockingErrors(issues)) {
                      const messages = issues
                        .filter((i) => i.severity === 'error')
                        .map((i) => i.message)
                        .join('\n\n');
                      alert(
                        `Resolve the import errors before replacing the existing journal:\n\n${messages}`,
                      );
                      return;
                    }
                    isPostingRef.current = true;
                    setIsPosting(true);
                    try {
                      const included = importedRows.filter(
                        (r) => r._include !== false,
                      );
                      const { minted, resolvedRows } = resolveNewAccounts(included);
                      // Persist accounts before posting the replacement journal.
                      if (minted.length > 0 && onCreateAccounts) {
                        try {
                          await onCreateAccounts(minted);
                          writeBackMintedIds(included, resolvedRows);
                        } catch (err) {
                          console.error('Failed to persist new accounts before replace', err);
                          alert(`Failed to save ${minted.length} new account(s). Replace aborted.`);
                          return;
                        }
                      }
                      const replacement = buildOpeningEntry(
                        resolvedRows,
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
                        try {
                          await onImport([replacement]);
                        } catch (err) {
                          console.error('Failed to persist replacement journal', err);
                          alert('Failed to save the replacement journal — accounts ARE saved.');
                          return;
                        }
                      }
                      resetState();
                    } finally {
                      isPostingRef.current = false;
                      setIsPosting(false);
                    }
                  }}
                  className={
                    isPosting
                      ? 'bg-blue-300 text-white px-3 py-1 rounded text-sm cursor-not-allowed'
                      : 'bg-blue-600 text-white px-3 py-1 rounded text-sm'
                  }
                >
                  {isPosting ? 'Posting…' : 'Replace existing journal'}
                </button>
                <button
                  type="button"
                  data-testid="fp-additional"
                  disabled={isPosting}
                  aria-disabled={isPosting}
                  onClick={async () => {
                    // Task 12: race-safe double-click guard.
                    if (isPostingRef.current) return;
                    // Same blocking-errors gate as the main accept path.
                    const issues = computeImportIssues(importedRows, accounts);
                    if (hasBlockingErrors(issues)) {
                      const messages = issues
                        .filter((i) => i.severity === 'error')
                        .map((i) => i.message)
                        .join('\n\n');
                      alert(
                        `Resolve the import errors before posting an additional import:\n\n${messages}`,
                      );
                      return;
                    }
                    isPostingRef.current = true;
                    setIsPosting(true);
                    try {
                      const included = importedRows.filter(
                        (r) => r._include !== false,
                      );
                      const { minted, resolvedRows } = resolveNewAccounts(included);
                      // Task 7: derive a DETERMINISTIC additional suffix from
                      // the canonical rows so re-clicking on the same data
                      // doesn't keep producing fresh fingerprints (dedup would
                      // otherwise never catch the repeat).
                      const newFp = `${fingerprintCollision.fingerprint}:additional-${await buildAdditionalSuffix(resolvedRows, asAtDate)}`;
                      await postEntry(buildOpeningEntry(resolvedRows, newFp), minted, included, resolvedRows);
                    } finally {
                      isPostingRef.current = false;
                      setIsPosting(false);
                    }
                  }}
                  className={
                    isPosting
                      ? 'bg-gray-100 text-gray-400 px-3 py-1 rounded text-sm cursor-not-allowed'
                      : 'bg-gray-200 px-3 py-1 rounded text-sm'
                  }
                >
                  {isPosting ? 'Posting…' : 'Import as additional'}
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
