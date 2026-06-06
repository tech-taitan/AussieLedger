/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { computeImportFingerprint, type RawRow } from '../fingerprint';

const MAPPING = { code: 'Code', name: 'Name', debit: 'Debit', credit: 'Credit' };

function rows(): RawRow[] {
  return [
    { Code: '1000', Name: 'Cash',  Debit: '500.00', Credit: '0.00' },
    { Code: '4000', Name: 'Sales', Debit: '0.00',   Credit: '500.00' },
  ];
}

describe('computeImportFingerprint (IMP-05)', () => {
  it('stable across row reorder', async () => {
    const a = await computeImportFingerprint(rows(), MAPPING, 'e1', '2026-06-30');
    const reordered: RawRow[] = [...rows()].reverse();
    const b = await computeImportFingerprint(reordered, MAPPING, 'e1', '2026-06-30');
    expect(a).toBe(b);
  });

  it('stable across whitespace differences', async () => {
    const a = await computeImportFingerprint(rows(), MAPPING, 'e1', '2026-06-30');
    const padded: RawRow[] = rows().map((r) => ({
      Code: ' ' + r.Code + ' ',
      Name: r.Name + '  ',
      Debit: r.Debit,
      Credit: r.Credit,
    }));
    const b = await computeImportFingerprint(padded, MAPPING, 'e1', '2026-06-30');
    expect(a).toBe(b);
  });

  it('differs by entityId', async () => {
    const a = await computeImportFingerprint(rows(), MAPPING, 'e1', '2026-06-30');
    const b = await computeImportFingerprint(rows(), MAPPING, 'e2', '2026-06-30');
    expect(a).not.toBe(b);
  });

  it('differs by asAtDate', async () => {
    const a = await computeImportFingerprint(rows(), MAPPING, 'e1', '2026-06-30');
    const b = await computeImportFingerprint(rows(), MAPPING, 'e1', '2025-06-30');
    expect(a).not.toBe(b);
  });

  it('returns 64-char hex string', async () => {
    const a = await computeImportFingerprint(rows(), MAPPING, 'e1', '2026-06-30');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('signed-balance mode: positive=DR splits {balance: +500} into debit 500, credit 0', async () => {
    const signedRows: RawRow[] = [
      { Code: '1000', Name: 'Cash',  Balance: '500' },
      { Code: '4000', Name: 'Sales', Balance: '-500' },
    ];
    const SIGN_MAPPING = { code: 'Code', name: 'Name', debit: '', credit: '' };
    const signedFp = await computeImportFingerprint(
      signedRows,
      SIGN_MAPPING,
      'e1',
      '2026-06-30',
      { column: 'Balance', sign: 'positive-dr' },
    );
    // Equivalent separate-column rows should produce the SAME fingerprint —
    // the dedup path catches re-imports that flip layout but preserve data.
    const equivalentRows: RawRow[] = [
      { Code: '1000', Name: 'Cash',  Debit: '500', Credit: '0' },
      { Code: '4000', Name: 'Sales', Debit: '0',   Credit: '500' },
    ];
    const separateFp = await computeImportFingerprint(
      equivalentRows,
      { code: 'Code', name: 'Name', debit: 'Debit', credit: 'Credit' },
      'e1',
      '2026-06-30',
    );
    expect(signedFp).toBe(separateFp);
  });

  it('signed-balance mode: positive=CR inverts the split', async () => {
    const signedRows: RawRow[] = [
      { Code: '4000', Name: 'Sales', Balance: '500' },
    ];
    const fp = await computeImportFingerprint(
      signedRows,
      { code: 'Code', name: 'Name', debit: '', credit: '' },
      'e1',
      '2026-06-30',
      { column: 'Balance', sign: 'positive-cr' },
    );
    const equivalent = await computeImportFingerprint(
      [{ Code: '4000', Name: 'Sales', Debit: '0', Credit: '500' }],
      { code: 'Code', name: 'Name', debit: 'Debit', credit: 'Credit' },
      'e1',
      '2026-06-30',
    );
    expect(fp).toBe(equivalent);
  });
});
