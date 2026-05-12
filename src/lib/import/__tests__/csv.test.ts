/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
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
