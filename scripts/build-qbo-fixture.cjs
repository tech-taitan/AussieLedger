/* @license SPDX-License-Identifier: Apache-2.0 */
const XLSX = require('xlsx');
const path = require('path');
const data = [
  ['Acme Pty Ltd', '', ''],
  ['Trial Balance', '', ''],
  ['As of June 30, 2026', '', ''],
  ['', '', ''],
  ['Account', 'Debit', 'Credit'],
  ['ASSETS', '', ''],
  ['  Bank Account', '25000.00', '0.00'],
  ['  Accounts Receivable', '5000.00', '0.00'],
  ['Total ASSETS', '30000.00', '0.00'],
  ['', '', ''],
  ['REVENUE', '', ''],
  ['  Sales', '0.00', '30000.00'],
  ['Total REVENUE', '0.00', '30000.00'],
  ['TOTAL', '30000.00', '30000.00'],
];
const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
const out = path.resolve(__dirname, '../src/lib/import/__fixtures__/messy-tbs/quickbooks-tb.xlsx');
XLSX.writeFile(wb, out);
console.log('Wrote', out);
