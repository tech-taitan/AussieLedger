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

export type RawRow = Record<string, string>;

/**
 * Compute sha256 fingerprint that is:
 *   - stable across row reorder (rows are sorted by code before hashing)
 *   - stable across whitespace differences (trim each cell)
 *   - stable across debit/credit number formatting (Number(x).toFixed(2))
 *   - distinct per entityId
 *   - distinct per asAtDate
 */
export async function computeImportFingerprint(
  rows: RawRow[],
  mapping: ColumnMappingByName,
  entityId: string,
  asAtDate: string,
): Promise<string> {
  const canonical = rows
    .map((r) => {
      const code = (r[mapping.code] ?? '').trim();
      const name = (r[mapping.name] ?? '').trim();
      const debit = Number(r[mapping.debit] ?? 0).toFixed(2);
      const credit = Number(r[mapping.credit] ?? 0).toFixed(2);
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
