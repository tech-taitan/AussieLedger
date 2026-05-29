/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as XLSX from 'xlsx';
import type { RawRow } from './fingerprint';

export interface ParsedXlsx {
  rows: RawRow[];          // rows from the first sheet (or sheetNames[0])
  headers: string[];
  sheetNames: string[];    // all sheets in the workbook
}

export interface XlsxParseOptions {
  /**
   * When provided, treat the row at this 0-based index as the header row.
   * All rows BEFORE headerRowIndex are skipped (pre-header title rows).
   * Data rows start at headerRowIndex + 1; blank rows are excluded.
   *
   * When omitted (default), Phase 4 behaviour applies: SheetJS uses the first
   * non-empty row as the header via sheet_to_json. Existing callers unchanged.
   */
  headerRowIndex?: number;
}

/**
 * Build { rows, headers } from a raw string[][] given a specific header row index.
 * Rows before headerRowIndex are discarded. Blank data rows are skipped.
 */
function buildFromRaw(
  rawRows: string[][],
  headerRowIndex: number,
): { rows: RawRow[]; headers: string[] } {
  const headerRow = rawRows[headerRowIndex] ?? [];
  const dataRows = rawRows.slice(headerRowIndex + 1);
  const headers = headerRow.map((h) => String(h).trim());
  const rows: RawRow[] = dataRows
    .filter((row) => row.some((c) => String(c).trim() !== ''))
    .map((row) => {
      const record: RawRow = {};
      headers.forEach((h, i) => {
        record[h] = String(row[i] ?? '');
      });
      return record;
    });
  return { rows, headers };
}

/**
 * Parse an XLSX File into { rows, headers, sheetNames }.
 * Delegates to parseXlsxBuffer after reading the ArrayBuffer.
 */
export async function parseXlsxFile(file: File, options?: XlsxParseOptions): Promise<ParsedXlsx> {
  const buf = await file.arrayBuffer();
  return parseXlsxBuffer(buf, options);
}

/**
 * Parse an XLSX ArrayBuffer into { rows, headers, sheetNames }.
 *
 * Default (no options): Phase 4 behaviour — SheetJS sheet_to_json with header inferred
 * from the first row. Existing callers unchanged.
 *
 * With `{ headerRowIndex: N }`: uses row N as the header; pre-header rows discarded.
 */
export function parseXlsxBuffer(buf: ArrayBuffer, options?: XlsxParseOptions): ParsedXlsx {
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetNames = wb.SheetNames;
  const firstSheet = wb.Sheets[sheetNames[0]];
  if (!firstSheet) return { rows: [], headers: [], sheetNames };

  if (options?.headerRowIndex === undefined) {
    // Phase 4 behaviour — backward compatible.
    const rows = XLSX.utils.sheet_to_json<RawRow>(firstSheet, { defval: '', raw: false });
    const headers = Object.keys(rows[0] ?? {});
    return { rows, headers, sheetNames };
  }

  const raw = XLSX.utils.sheet_to_json<string[]>(firstSheet, {
    header: 1,
    defval: '',
    raw: false,
  });
  const { rows, headers } = buildFromRaw(raw, options.headerRowIndex);
  return { rows, headers, sheetNames };
}

/**
 * Read a specific sheet by name from a parsed workbook buffer.
 *
 * Default (no options): Phase 4 behaviour.
 * With `{ headerRowIndex: N }`: uses row N as the header.
 */
export function pickSheetByName(
  buf: ArrayBuffer,
  sheetName: string,
  options?: XlsxParseOptions,
): { rows: RawRow[]; headers: string[] } {
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found. Available: ${wb.SheetNames.join(', ')}`);
  }

  if (options?.headerRowIndex === undefined) {
    // Phase 4 behaviour — backward compatible.
    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '', raw: false });
    const headers = Object.keys(rows[0] ?? {});
    return { rows, headers };
  }

  const raw = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });
  return buildFromRaw(raw, options.headerRowIndex);
}

/**
 * Get ALL raw rows from a named sheet as string[][] (for header detection + section analysis).
 * Uses `header: 1, defval: '', raw: false` — returns formatted string values.
 */
export function getXlsxRawRows(buf: ArrayBuffer, sheetName: string): string[][] {
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });
}
