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

export async function parseXlsxFile(file: File): Promise<ParsedXlsx> {
  const buf = await file.arrayBuffer();
  return parseXlsxBuffer(buf);
}

export function parseXlsxBuffer(buf: ArrayBuffer): ParsedXlsx {
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetNames = wb.SheetNames;
  const firstSheet = wb.Sheets[sheetNames[0]];
  const rows = firstSheet
    ? XLSX.utils.sheet_to_json<RawRow>(firstSheet, { defval: '', raw: false })
    : [];
  const headers = Object.keys(rows[0] ?? {});
  return { rows, headers, sheetNames };
}

/** Read a specific sheet by name from a parsed workbook buffer. */
export function pickSheetByName(buf: ArrayBuffer, sheetName: string): { rows: RawRow[]; headers: string[] } {
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found. Available: ${wb.SheetNames.join(', ')}`);
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '', raw: false });
  const headers = Object.keys(rows[0] ?? {});
  return { rows, headers };
}
