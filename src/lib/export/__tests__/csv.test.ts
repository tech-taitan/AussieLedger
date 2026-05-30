/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for src/lib/export/csv.ts (FND-10/11/12).
 * Pure-function tests — no mocks needed.
 */
import { describe, it, expect } from 'vitest';
import { Decimal } from '../../money';
import type { ReturnLabel } from '../../tax/returns/fy2026/types';
import type { Account, TrialBalanceRow } from '../../../types';
import type { Period } from '../../period';
import {
  slugify,
  fmtPeriodSlug,
  applyLeadingZeroPrefix,
  periodBoundaryStrings,
  exportTrialBalanceCsv,
  exportBasLabelsCsv,
  exportFormILabelsCsv,
} from '../csv';

// ── Test helpers ────────────────────────────────────────────────────────────

function makeLabel(
  code: string,
  plainEnglish: string,
  value: string,
  internalOnly?: boolean,
): ReturnLabel {
  return { code, plainEnglish, value: new Decimal(value), internalOnly };
}

function makeAccount(code: string, name: string, taxLabel?: string): Account {
  return {
    id: `acc-${code}`,
    code,
    name,
    type: 'Revenue',
    gstCode: 'GST',
    taxLabel,
  };
}

function makeTbRow(
  code: string,
  name: string,
  debit: number,
  credit: number,
  balance: number,
  isParent = false,
): TrialBalanceRow {
  return {
    account: makeAccount(code, name),
    debit,
    credit,
    balance,
    isParent,
  };
}

const FY_PERIOD: Period = { type: 'fy', fy: 'FY2026' };
const Q2_PERIOD: Period = { type: 'quarter', fy: 'FY2026', q: 2 };
const CUSTOM_PERIOD: Period = {
  type: 'custom',
  from: new Date(Date.UTC(2025, 6, 1)),
  to: new Date(Date.UTC(2026, 5, 30)),
};

// ── slugify ─────────────────────────────────────────────────────────────────

describe('slugify', () => {
  it('1.1: converts "Acme Pty Ltd" to "acme-pty-ltd"', () => {
    expect(slugify('Acme Pty Ltd')).toBe('acme-pty-ltd');
  });

  it('1.2: converts "Smith & Sons (AU)" to "smith-sons-au"', () => {
    expect(slugify('Smith & Sons (AU)')).toBe('smith-sons-au');
  });

  it("1.3: converts \"O'Brien Family Trust\" to 'o-brien-family-trust'", () => {
    expect(slugify("O'Brien Family Trust")).toBe('o-brien-family-trust');
  });

  it('1.4: strips leading/trailing dashes from "   leading   "', () => {
    expect(slugify('   leading   ')).toBe('leading');
  });
});

// ── fmtPeriodSlug ────────────────────────────────────────────────────────────

describe('fmtPeriodSlug', () => {
  it('2.1: FY period returns just the year number', () => {
    expect(fmtPeriodSlug(FY_PERIOD)).toBe('2026');
  });

  it('2.2: Quarter period returns "2026-Q2"', () => {
    expect(fmtPeriodSlug(Q2_PERIOD)).toBe('2026-Q2');
  });

  it('2.3: Custom period returns ISO date range', () => {
    expect(fmtPeriodSlug(CUSTOM_PERIOD)).toBe('2025-07-01_2026-06-30');
  });
});

// ── applyLeadingZeroPrefix ───────────────────────────────────────────────────

describe('applyLeadingZeroPrefix', () => {
  it("3.1: code '0410' gets apostrophe prefix", () => {
    expect(applyLeadingZeroPrefix('0410')).toBe("'0410");
  });

  it('3.2: code "4100" unchanged (no leading zero)', () => {
    expect(applyLeadingZeroPrefix('4100')).toBe('4100');
  });

  it('3.3: empty string returns empty string (no crash)', () => {
    expect(applyLeadingZeroPrefix('')).toBe('');
  });
});

// ── periodBoundaryStrings ────────────────────────────────────────────────────

describe('periodBoundaryStrings', () => {
  it('returns FY2026 boundaries as ISO date strings', () => {
    const { periodStart, periodEnd } = periodBoundaryStrings(FY_PERIOD);
    expect(periodStart).toBe('2025-07-01');
    expect(periodEnd).toBe('2026-06-30');
  });

  it('returns Q2 FY2026 boundaries as ISO date strings', () => {
    const { periodStart, periodEnd } = periodBoundaryStrings(Q2_PERIOD);
    // Q2 = Oct–Dec of start year (FY2026 start year = 2025)
    expect(periodStart).toBe('2025-10-01');
    expect(periodEnd).toBe('2025-12-31');
  });

  it('returns custom period boundaries directly', () => {
    const { periodStart, periodEnd } = periodBoundaryStrings(CUSTOM_PERIOD);
    expect(periodStart).toBe('2025-07-01');
    expect(periodEnd).toBe('2026-06-30');
  });
});

// ── exportTrialBalanceCsv (FND-10) ──────────────────────────────────────────

describe('exportTrialBalanceCsv', () => {
  const singleRow = [makeTbRow('4100', 'Revenue Account', 0, 5000, 5000)];

  it('4.1: returns object with { filename, csv, isEmpty }', () => {
    const result = exportTrialBalanceCsv(singleRow, FY_PERIOD, 'Acme Pty Ltd');
    expect(result).toHaveProperty('filename');
    expect(result).toHaveProperty('csv');
    expect(result).toHaveProperty('isEmpty');
  });

  it('4.2: filename is correct for FY period', () => {
    const { filename } = exportTrialBalanceCsv(singleRow, FY_PERIOD, 'Acme Pty Ltd');
    expect(filename).toBe('acme-pty-ltd-tb-2026.csv');
  });

  it('4.3: csv starts with UTF-8 BOM (U+FEFF)', () => {
    const { csv } = exportTrialBalanceCsv(singleRow, FY_PERIOD, 'Acme Pty Ltd');
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });

  it('4.4: csv contains correct header line with CRLF', () => {
    const { csv } = exportTrialBalanceCsv(singleRow, FY_PERIOD, 'Acme Pty Ltd');
    // After the BOM, the first line is the header
    const withoutBom = csv.slice(1);
    const firstLine = withoutBom.split('\r\n')[0];
    expect(firstLine).toBe('"code","name","type","debit","credit","balance","period_start","period_end"');
  });

  it('4.5: empty rows returns isEmpty=true and header-only CSV', () => {
    const { csv, isEmpty } = exportTrialBalanceCsv([], FY_PERIOD, 'Acme Pty Ltd');
    expect(isEmpty).toBe(true);
    // BOM + header + trailing CRLF (papaparse adds newline after header)
    const withoutBom = csv.slice(1);
    const lines = withoutBom.split('\r\n').filter(l => l.length > 0);
    expect(lines).toHaveLength(1); // only header
  });

  it('4.6: leading-zero code gets apostrophe prefix in CSV cell', () => {
    const row = [makeTbRow('0410', 'Cash Account', 1000, 0, 1000)];
    const { csv } = exportTrialBalanceCsv(row, FY_PERIOD, 'Acme Pty Ltd');
    // papaparse with quotes:true wraps the apostrophe-prefixed code in double quotes
    expect(csv).toContain('"\'0410"');
  });

  it('4.7: account name with comma is preserved inside quotes', () => {
    const row = [makeTbRow('4100', 'Sales, Domestic', 0, 5000, 5000)];
    const { csv } = exportTrialBalanceCsv(row, FY_PERIOD, 'Acme Pty Ltd');
    expect(csv).toContain('"Sales, Domestic"');
    // Verify the row isn't split (comma inside quotes is safe)
    const withoutBom = csv.slice(1);
    const dataLines = withoutBom.split('\r\n').filter(l => l.length > 0);
    expect(dataLines).toHaveLength(2); // header + 1 data row
  });

  it('4.8: decimal precision preserved — 16-digit money string not coerced', () => {
    const highPrecisionRow: TrialBalanceRow = {
      account: makeAccount('4100', 'Revenue'),
      debit: 1234.567890123456,
      credit: 0,
      balance: 1234.567890123456,
    };
    const { csv } = exportTrialBalanceCsv([highPrecisionRow], FY_PERIOD, 'Acme Pty Ltd');
    // The number is passed as-is via .toString() — JavaScript number toString
    expect(csv).toContain('"1234.567890123456"');
  });

  it('4.9: period_start and period_end columns are ISO date strings', () => {
    const { csv } = exportTrialBalanceCsv(singleRow, FY_PERIOD, 'Acme Pty Ltd');
    expect(csv).toContain('"2025-07-01"');
    expect(csv).toContain('"2026-06-30"');
  });

  it('excludes parent (subtotal) rows', () => {
    const parentRow = makeTbRow('4000', 'Revenue Group', 0, 10000, 10000, true);
    const childRow = makeTbRow('4100', 'Revenue Account', 0, 10000, 10000, false);
    const { csv, isEmpty } = exportTrialBalanceCsv([parentRow, childRow], FY_PERIOD, 'Acme Pty Ltd');
    expect(isEmpty).toBe(false);
    // Only the child row appears
    const withoutBom = csv.slice(1);
    const dataLines = withoutBom.split('\r\n').filter(l => l.length > 0);
    expect(dataLines).toHaveLength(2); // header + 1 child
    expect(csv).toContain('"Revenue Account"');
    expect(csv).not.toContain('"Revenue Group"');
  });
});

// ── exportBasLabelsCsv (FND-11) ─────────────────────────────────────────────

describe('exportBasLabelsCsv', () => {
  const labels = {
    G1: makeLabel('G1', 'Total sales', '5000.00', false),
    G2: makeLabel('G2', 'Export sales', '500.00', true),
  };

  it('5.1: filename uses quarter period slug', () => {
    const { filename } = exportBasLabelsCsv(labels, Q2_PERIOD, 'Acme Pty Ltd');
    expect(filename).toBe('acme-pty-ltd-bas-2026-Q2.csv');
  });

  it('5.2: csv has correct BAS header', () => {
    const { csv } = exportBasLabelsCsv(labels, Q2_PERIOD, 'Acme Pty Ltd');
    const withoutBom = csv.slice(1);
    const firstLine = withoutBom.split('\r\n')[0];
    expect(firstLine).toBe('"label_code","plain_english","value","source"');
  });

  it('5.3: internalOnly=true label has source="internal-only"', () => {
    const { csv } = exportBasLabelsCsv(labels, Q2_PERIOD, 'Acme Pty Ltd');
    expect(csv).toContain('"internal-only"');
  });

  it('5.4: internalOnly=false label has source="lodgement"', () => {
    const { csv } = exportBasLabelsCsv(labels, Q2_PERIOD, 'Acme Pty Ltd');
    expect(csv).toContain('"lodgement"');
  });

  it('5.5: empty labels object returns isEmpty=true and header-only CSV', () => {
    const { csv, isEmpty } = exportBasLabelsCsv({}, Q2_PERIOD, 'Acme Pty Ltd');
    expect(isEmpty).toBe(true);
    const withoutBom = csv.slice(1);
    const lines = withoutBom.split('\r\n').filter(l => l.length > 0);
    expect(lines).toHaveLength(1);
  });

  it('5.6: Decimal value preserved as string via .toString()', () => {
    const precisionLabels = {
      G1: makeLabel('G1', 'Total sales', '12345.67890'),
    };
    const { csv } = exportBasLabelsCsv(precisionLabels, Q2_PERIOD, 'Acme Pty Ltd');
    // Decimal.toString() on '12345.67890' should give '12345.6789' (trailing zero dropped by Decimal)
    // The important thing is the raw decimal string is preserved, not converted via parseFloat
    expect(csv).toContain('"12345.6789"');
  });

  it('csv starts with BOM', () => {
    const { csv } = exportBasLabelsCsv(labels, Q2_PERIOD, 'Acme Pty Ltd');
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });
});

// ── exportFormILabelsCsv (FND-12) ────────────────────────────────────────────

describe('exportFormILabelsCsv', () => {
  const accounts = [
    makeAccount('4100', 'Revenue Account 1', 'P1'),
    makeAccount('4110', 'Revenue Account 2', 'P1'),
    makeAccount('5100', 'Expense Account', 'P2'),
  ];

  const labels = {
    P1: makeLabel('P1', 'Business income', '10000.00'),
    P2: makeLabel('P2', 'Business expenses', '5000.00'),
  };

  it('6.1: filename is correct for FY period', () => {
    const { filename } = exportFormILabelsCsv(labels, accounts, FY_PERIOD, 'Acme Pty Ltd');
    expect(filename).toBe('acme-pty-ltd-form-i-2026.csv');
  });

  it('6.2: csv has correct Form I header', () => {
    const { csv } = exportFormILabelsCsv(labels, accounts, FY_PERIOD, 'Acme Pty Ltd');
    const withoutBom = csv.slice(1);
    const firstLine = withoutBom.split('\r\n')[0];
    expect(firstLine).toBe('"label_code","plain_english","value","source_account_codes"');
  });

  it('6.3: source_account_codes joins matching account codes with comma', () => {
    const { csv } = exportFormILabelsCsv(labels, accounts, FY_PERIOD, 'Acme Pty Ltd');
    // P1 maps to accounts 4100 and 4110
    expect(csv).toContain('"4100,4110"');
  });

  it('6.4: label with no matching accounts has empty source_account_codes', () => {
    const onlyP3Labels = {
      P3: makeLabel('P3', 'Other income', '0.00'),
    };
    const { csv } = exportFormILabelsCsv(onlyP3Labels, accounts, FY_PERIOD, 'Acme Pty Ltd');
    // P3 has no matching accounts — source_account_codes should be empty
    expect(csv).toContain('""');
  });

  it('6.5: accounts in source_account_codes are sorted ascending by code', () => {
    // Deliberately put 4110 before 4100 to test sort
    const unsortedAccounts = [
      makeAccount('4110', 'Revenue Account 2', 'P1'),
      makeAccount('4100', 'Revenue Account 1', 'P1'),
    ];
    const { csv } = exportFormILabelsCsv(
      { P1: makeLabel('P1', 'Business income', '10000.00') },
      unsortedAccounts,
      FY_PERIOD,
      'Acme Pty Ltd',
    );
    expect(csv).toContain('"4100,4110"');
  });

  it('csv starts with BOM', () => {
    const { csv } = exportFormILabelsCsv(labels, accounts, FY_PERIOD, 'Acme Pty Ltd');
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });

  it('returns isEmpty=true when labels is empty', () => {
    const { isEmpty } = exportFormILabelsCsv({}, accounts, FY_PERIOD, 'Acme Pty Ltd');
    expect(isEmpty).toBe(true);
  });
});
