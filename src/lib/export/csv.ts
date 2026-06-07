/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 9 — per-report CSV exporters (FND-10/11/12).
 * Pure functions. UI orchestrates the Blob+anchor download.
 *
 * CSV conventions (locked per 09-CONTEXT.md):
 *   - Header row always emitted (Papa.unparse object form)
 *   - quotes: true + newline: '\r\n' + UTF-8 BOM prepend
 *   - Money cells = raw decimal strings (no $, no thousands)
 *   - Leading-zero codes apostrophe-prefixed for Excel text affinity
 *   - Filename: {entity-slug}-{report}-{period}.csv
 */
import Papa from 'papaparse';
import type { Account, TrialBalanceRow } from '../../types';
import type { Period } from '../period';
import { fyBoundaries, quarterBoundaries } from '../period';
import type { ReturnLabel } from '../tax/returns/fy2026/types';

const BOM = '﻿'; // U+FEFF — encodes to bytes EF BB BF when written to a UTF-8 Blob

// ── Public types ─────────────────────────────────────────────────────────

export interface CsvExportResult {
  filename: string;
  csv: string;      // BOM-prefixed; always contains at least the header row
  isEmpty: boolean; // true when zero data rows (caller shows toast)
}

// ── Inlined helpers (exported for unit tests; not for external consumers) ─

/** Lowercase, non-alphanumeric runs → '-', strip leading/trailing dashes. */
export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Period → filename segment. FY:'2026', Quarter:'2026-Q2', Custom:'2025-07-01_2026-06-30'. */
export function fmtPeriodSlug(period: Period): string {
  if (period.type === 'fy') return period.fy.replace('FY', '');
  if (period.type === 'quarter') return `${period.fy.replace('FY', '')}-Q${period.q}`;
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `${fmt(period.from)}_${fmt(period.to)}`;
}

/** Period → ISO date range as { periodStart, periodEnd } strings for CSV columns. */
export function periodBoundaryStrings(period: Period): { periodStart: string; periodEnd: string } {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (period.type === 'fy') {
    const { from, to } = fyBoundaries(period.fy);
    return { periodStart: fmt(from), periodEnd: fmt(to) };
  }
  if (period.type === 'quarter') {
    const { from, to } = quarterBoundaries(period.fy, period.q);
    return { periodStart: fmt(from), periodEnd: fmt(to) };
  }
  return { periodStart: fmt(period.from), periodEnd: fmt(period.to) };
}

/** Excel leading-zero preservation: prefix codes starting with '0' with an apostrophe. */
export function applyLeadingZeroPrefix(code: string): string {
  return code.startsWith('0') ? `'${code}` : code;
}

// ── Shared serialiser (private) ─────────────────────────────────────────

function serialise(fields: readonly string[], data: Record<string, string>[]): string {
  const csv = Papa.unparse(
    { fields: [...fields], data },
    { quotes: true, newline: '\r\n' },
  );
  return BOM + csv;
}

// ── FND-10: Trial Balance CSV ───────────────────────────────────────────

const TB_FIELDS = [
  'code', 'name', 'type', 'debit', 'credit', 'balance', 'period_start', 'period_end',
] as const;

/** Orphan rows surfaced in the TrialBalance UI when a journal line's
 *  accountId doesn't resolve to any account. The TB display includes
 *  these in its totals so the user sees an honest balance flag; the CSV
 *  must include them too or the exported file silently differs from
 *  what was on screen. */
export interface OrphanLineForExport {
  accountId: string;
  debit: number;
  credit: number;
  lineCount: number;
  sampleDescription?: string;
}

export function exportTrialBalanceCsv(
  tbRows: TrialBalanceRow[],
  period: Period,
  entityName: string,
  orphanList: OrphanLineForExport[] = [],
): CsvExportResult {
  const filename = `${slugify(entityName)}-tb-${fmtPeriodSlug(period)}.csv`;
  const { periodStart, periodEnd } = periodBoundaryStrings(period);
  // Exclude parent (subtotal) rows — CSV is account-level only; consumers can sum.
  const dataRows = tbRows.filter((r) => !r.isParent);
  const isEmpty = dataRows.length === 0 && orphanList.length === 0;
  const data: Record<string, string>[] = dataRows.map((r) => ({
    code:         applyLeadingZeroPrefix(r.account.code),
    name:         r.account.name,
    type:         r.account.type,
    debit:        r.debit.toString(),   // raw decimal — NEVER parseFloat
    credit:       r.credit.toString(),
    balance:      r.balance.toString(),
    period_start: periodStart,
    period_end:   periodEnd,
  }));
  // Append orphan lines so the CSV matches the on-screen TB. The "code"
  // column carries the literal orphan id so spreadsheets can group by it.
  for (const o of orphanList) {
    data.push({
      code:         o.accountId,
      name:         `ORPHAN: ${o.sampleDescription ?? 'unknown account'} (${o.lineCount} ${o.lineCount === 1 ? 'line' : 'lines'})`,
      type:         'Orphan',
      debit:        o.debit.toString(),
      credit:       o.credit.toString(),
      balance:      (o.debit - o.credit).toString(),
      period_start: periodStart,
      period_end:   periodEnd,
    });
  }
  return { filename, csv: serialise(TB_FIELDS, data), isEmpty };
}

// ── FND-11: Simpler BAS labels CSV ──────────────────────────────────────

const BAS_FIELDS = ['label_code', 'plain_english', 'value', 'source'] as const;

export function exportBasLabelsCsv(
  labels: Partial<Record<string, ReturnLabel>>,
  period: Period,
  entityName: string,
): CsvExportResult {
  const filename = `${slugify(entityName)}-bas-${fmtPeriodSlug(period)}.csv`;
  const entries = Object.entries(labels).filter(([, v]) => v !== undefined) as Array<[string, ReturnLabel]>;
  const isEmpty = entries.length === 0;
  const data = entries.map(([code, label]) => ({
    label_code:    code,
    plain_english: label.plainEnglish,
    value:         label.value.toString(), // Decimal.toString() — precision preserved
    source:        label.internalOnly ? 'internal-only' : 'lodgement',
  }));
  return { filename, csv: serialise(BAS_FIELDS, data), isEmpty };
}

// ── FND-12: Form I labels CSV ────────────────────────────────────────────

const FORMI_FIELDS = ['label_code', 'plain_english', 'value', 'source_account_codes'] as const;

/**
 * Derives source_account_codes for each label via accounts.filter(a => a.taxLabel === code).
 * Codes joined by ',' and sorted ascending for deterministic output.
 */
export function exportFormILabelsCsv(
  labels: Partial<Record<string, ReturnLabel>>,
  accounts: Account[],
  period: Period,
  entityName: string,
): CsvExportResult {
  const filename = `${slugify(entityName)}-form-i-${fmtPeriodSlug(period)}.csv`;
  const entries = Object.entries(labels).filter(([, v]) => v !== undefined) as Array<[string, ReturnLabel]>;
  const isEmpty = entries.length === 0;
  const sourceCodesFor = (labelCode: string): string =>
    accounts
      .filter((a) => a.taxLabel === labelCode)
      .map((a) => a.code)
      .sort((x, y) => x.localeCompare(y))
      .join(',');
  const data = entries.map(([code, label]) => ({
    label_code:           code,
    plain_english:        label.plainEnglish,
    value:                label.value.toString(),
    source_account_codes: sourceCodesFor(code),
  }));
  return { filename, csv: serialise(FORMI_FIELDS, data), isEmpty };
}
