/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Column-mapping shape used by the import flow. */
export interface ColumnMappingByName {
  code: string;
  name: string;
  debit: string;
  credit: string;
}

/**
 * Optional signed-balance layout. When provided to
 * `computeImportFingerprint`, the canonical row form derives debit + credit
 * from a single signed column rather than reading `mapping.debit` /
 * `mapping.credit`. `sign: 'positive-dr'` means positive values become debit
 * and negatives become credit (the common Australian TB shape).
 */
export interface SignedBalanceMode {
  column: string;
  sign: 'positive-dr' | 'positive-cr';
}

export type RawRow = Record<string, string>;

/**
 * Compute sha256 fingerprint that is:
 *   - stable across row reorder (rows are sorted by code before hashing)
 *   - stable across whitespace differences (trim each cell)
 *   - stable across debit/credit number formatting (Number(x).toFixed(2))
 *   - distinct per entityId
 *   - distinct per asAtDate
 *
 * When `signedBalance` is supplied the canonical form is derived from the
 * single signed column instead of separate debit/credit columns. The
 * fingerprint shape is otherwise unchanged — a re-import that flips the
 * layout between separate ↔ signed for the SAME underlying numbers will
 * still collide via the dedup path because the debit/credit pair after
 * sign-split is identical.
 */
export async function computeImportFingerprint(
  rows: RawRow[],
  mapping: ColumnMappingByName,
  entityId: string,
  asAtDate: string,
  signedBalance?: SignedBalanceMode,
): Promise<string> {
  const canonical = rows
    .map((r) => {
      const code = (r[mapping.code] ?? '').trim();
      const name = (r[mapping.name] ?? '').trim();
      let debit: string;
      let credit: string;
      if (signedBalance) {
        const raw = Number(r[signedBalance.column] ?? 0);
        const v = Number.isFinite(raw) ? raw : 0;
        const drIsPositive = signedBalance.sign === 'positive-dr';
        const positiveSide = v >= 0 ? v : 0;
        const negativeSide = v < 0 ? -v : 0;
        debit = (drIsPositive ? positiveSide : negativeSide).toFixed(2);
        credit = (drIsPositive ? negativeSide : positiveSide).toFixed(2);
      } else {
        debit = Number(r[mapping.debit] ?? 0).toFixed(2);
        credit = Number(r[mapping.credit] ?? 0).toFixed(2);
      }
      return `${code}|${name}|${debit}|${credit}`;
    })
    .sort()
    .join('\n');
  const payload = `${entityId}|${asAtDate}|${canonical}`;
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
