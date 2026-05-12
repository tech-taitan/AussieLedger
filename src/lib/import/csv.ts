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

export async function parseCsvFile(file: File): Promise<ParsedCsv> {
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

/** Parse raw CSV TEXT (no File wrapper) — used by tests. */
export function parseCsvText(text: string): ParsedCsv {
  const result = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  });
  return { rows: result.data, headers: result.meta.fields ?? [] };
}
