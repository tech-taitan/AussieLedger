/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { parseCsvText } from '../csv';

describe('parseCsvText (IMP-01)', () => {
  it('handles UTF-8 BOM', () => {
    const csv = '﻿Code,Name,Debit,Credit\n1000,Cash,500.00,0.00\n4000,Sales,0.00,500.00\n';
    const { rows, headers } = parseCsvText(csv);
    expect(headers).toEqual(['Code', 'Name', 'Debit', 'Credit']);
    expect(rows[0].Code).toBe('1000');
  });

  it('parses CSV with quoted commas', () => {
    const csv = 'Code,Name,Debit,Credit\n1000,"Cash, on hand",500.00,0.00\n';
    const { rows } = parseCsvText(csv);
    expect(rows[0].Name).toBe('Cash, on hand');
  });

  it('skips empty rows greedy', () => {
    const csv = 'Code,Name,Debit,Credit\n1000,Cash,500.00,0.00\n\n\n4000,Sales,0.00,500.00\n';
    const { rows } = parseCsvText(csv);
    expect(rows.length).toBe(2);
  });

  it('trims surrounding whitespace from headers', () => {
    const csv = ' Code ,  Name ,Debit, Credit \n1000,Cash,500.00,0.00\n';
    const { headers } = parseCsvText(csv);
    expect(headers).toEqual(['Code', 'Name', 'Debit', 'Credit']);
  });
});

describe('parseCsvText with headerRowIndex (IMP-07 widened CSV)', () => {
  it('parseCsvText with headerRowIndex: 4 parses Xero fixture data rows starting at row 5', () => {
    const csv = fs.readFileSync(
      path.resolve(__dirname, '../__fixtures__/messy-tbs/xero-tb.csv'),
      'utf8',
    );
    const { rows, headers } = parseCsvText(csv, { headerRowIndex: 4 });
    expect(headers).toContain('Account Code');
    expect(headers).toContain('Debit');
    expect(headers).toContain('Credit');
    // The Sales row (file row 6, data row after "Revenue" section heading) maps correctly:
    const sales = rows.find((r) => r['Account Code'] === '4100');
    expect(sales).toBeDefined();
    expect(sales?.['Credit']).toBe('50000.00');
  });
});
