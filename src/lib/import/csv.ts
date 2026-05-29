/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import Papa from 'papaparse';
import type { RawRow } from './fingerprint';

export interface ParsedCsv {
  rows: RawRow[];
  headers: string[];
}

export interface CsvParseOptions {
  /**
   * When provided, treat the row at this 0-based index as the header row.
   * All rows BEFORE headerRowIndex are skipped (pre-header title rows).
   * Data rows start at headerRowIndex + 1.
   * Blank rows after the header are excluded from the returned rows.
   *
   * When omitted (default), Phase 4 behaviour applies: PapaParse uses row 0
   * as the header with `skipEmptyLines: 'greedy'`. Existing callers are
   * bit-for-bit unchanged.
   */
  headerRowIndex?: number;
}

/**
 * Read ALL raw rows from a CSV File (no header inference, no empty-line skipping).
 * Returns a string[][] preserving blank rows — required for section-boundary detection
 * in detectSubtotals (blank rows are section delimiters).
 */
export function parseCsvRaw(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: false,
      dynamicTyping: false,
      complete: (result) => resolve(result.data),
      error: (err: Error) => reject(err),
    });
  });
}

/**
 * Read ALL raw rows from a CSV text string (no header inference, no empty-line skipping).
 * Synchronous variant of parseCsvRaw — used in tests and subtotal/header detection.
 */
export function parseCsvRawText(text: string): string[][] {
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: false,
    dynamicTyping: false,
  });
  return result.data;
}

/**
 * Build a ParsedCsv from raw string[][] given a specific header row index.
 * Rows before headerRowIndex are discarded (pre-header title rows).
 * Blank rows after the header (all cells empty) are skipped.
 */
function buildParsedFromRaw(rawRows: string[][], headerRowIndex: number): ParsedCsv {
  const headerRow = rawRows[headerRowIndex] ?? [];
  const dataRows = rawRows.slice(headerRowIndex + 1);
  const headers = headerRow.map((h) => h.trim());
  const rows: RawRow[] = dataRows
    .filter((row) => row.some((c) => c.trim() !== ''))
    .map((row) => {
      const record: RawRow = {};
      headers.forEach((h, i) => {
        record[h] = row[i] ?? '';
      });
      return record;
    });
  return { rows, headers };
}

/**
 * Parse a CSV File into { rows, headers }.
 *
 * Default (no options): Phase 4 behaviour — PapaParse uses row 0 as the header,
 * `skipEmptyLines: 'greedy'`, `header: true`. Existing callers unchanged.
 *
 * With `{ headerRowIndex: N }`: uses row N as the header; rows before N are
 * discarded; data rows begin at N+1; blank data rows are skipped.
 */
export async function parseCsvFile(file: File, options?: CsvParseOptions): Promise<ParsedCsv> {
  if (options?.headerRowIndex === undefined) {
    // Phase 4 behaviour — backward compatible.
    return new Promise((resolve, reject) => {
      Papa.parse<RawRow>(file, {
        header: true,
        skipEmptyLines: 'greedy',
        dynamicTyping: false,
        transformHeader: (h) => h.trim(),
        complete: (result) => {
          if (result.errors.length > 0) {
            reject(new Error(result.errors.map((e) => e.message).join('; ')));
            return;
          }
          resolve({ rows: result.data, headers: result.meta.fields ?? [] });
        },
        error: (err: Error) => reject(err),
      });
    });
  }
  const rawRows = await parseCsvRaw(file);
  return buildParsedFromRaw(rawRows, options.headerRowIndex);
}

/**
 * Parse raw CSV TEXT (no File wrapper) — used by tests and other synchronous callers.
 *
 * Default (no options): Phase 4 behaviour unchanged.
 * With `{ headerRowIndex: N }`: uses row N as the header.
 */
export function parseCsvText(text: string, options?: CsvParseOptions): ParsedCsv {
  if (options?.headerRowIndex === undefined) {
    // Phase 4 behaviour — backward compatible.
    const result = Papa.parse<RawRow>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      transformHeader: (h) => h.trim(),
    });
    return { rows: result.data, headers: result.meta.fields ?? [] };
  }
  const rawRows = parseCsvRawText(text);
  return buildParsedFromRaw(rawRows, options.headerRowIndex);
}
