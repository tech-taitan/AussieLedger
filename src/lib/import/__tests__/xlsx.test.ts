/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import path from 'node:path';
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

describe('parseXlsxBuffer with headerRowIndex (IMP-07 widened XLSX)', () => {
  it('parseXlsxBuffer with headerRowIndex: 4 parses QBO fixture data rows starting at row 5', () => {
    const fileBuf = fs.readFileSync(
      path.resolve(__dirname, '../__fixtures__/messy-tbs/quickbooks-tb.xlsx'),
    );
    // Node Buffer → ArrayBuffer — copy into a fresh ArrayBuffer to avoid
    // shared-pool offset issues (buf.buffer may be a large shared allocation).
    const ab = new Uint8Array(fileBuf).buffer;
    const { rows, headers } = parseXlsxBuffer(ab, { headerRowIndex: 4 });
    // Headers from row 4 of QBO fixture: Account, Debit, Credit
    expect(headers).toEqual(expect.arrayContaining(['Account', 'Debit', 'Credit']));
    // Sub-account row "  Bank Account" should be present in data rows.
    const bank = rows.find((r) => (r['Account'] ?? '').includes('Bank Account'));
    expect(bank).toBeDefined();
  });
});
