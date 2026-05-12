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
});
