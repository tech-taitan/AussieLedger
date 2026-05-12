/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseXlsxBuffer, pickSheetByName } from '../xlsx';

function buildWorkbook(): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['Code', 'Name', 'Debit', 'Credit'],
    ['1000', 'Cash',  '500.00', '0.00'],
    ['4000', 'Sales', '0.00',   '500.00'],
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([
    ['Code', 'Name', 'Debit', 'Credit'],
    ['6100', 'Rent', '2000.00', '0.00'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Trial Balance');
  XLSX.utils.book_append_sheet(wb, ws2, 'Other');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

describe('parseXlsxBuffer (IMP-01)', () => {
  it('parses xlsx first sheet', () => {
    const buf = buildWorkbook();
    const { rows, headers, sheetNames } = parseXlsxBuffer(buf);
    expect(rows.length).toBe(2);
    expect(headers).toEqual(['Code', 'Name', 'Debit', 'Credit']);
    expect(sheetNames).toEqual(['Trial Balance', 'Other']);
  });

  it('returns sheetNames array', () => {
    const buf = buildWorkbook();
    const { sheetNames } = parseXlsxBuffer(buf);
    expect(sheetNames).toContain('Trial Balance');
    expect(sheetNames).toContain('Other');
  });

  it('pickSheetByName reads named sheet', () => {
    const buf = buildWorkbook();
    const { rows } = pickSheetByName(buf, 'Other');
    expect(rows[0].Code).toBe('6100');
  });

  it('pickSheetByName throws on unknown sheet', () => {
    const buf = buildWorkbook();
    expect(() => pickSheetByName(buf, 'NotThere')).toThrow(/not found/);
  });
});
