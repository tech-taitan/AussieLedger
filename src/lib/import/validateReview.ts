/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure validation for the ImportTB review stage. Inspects the rows the
 * user has prepared and surfaces every issue we know how to detect
 * before the import is accepted — so the user sees exactly what will
 * (and won't) happen when they hit Accept.
 *
 * Severity model:
 *   - error:   the import will still post but produces incorrect
 *              accounting (e.g. unbalanced TB)
 *   - warning: rows will silently drop or post in surprising ways
 *              (e.g. unmapped accounts, zero-value lines)
 *   - info:    informational — things that WILL happen as a result
 *              of the import (e.g. N new accounts to be created)
 */
import type { ImportedAccount } from '../../types';

export type ImportIssueSeverity = 'error' | 'warning' | 'info';

export interface ImportIssue {
  severity: ImportIssueSeverity;
  /** Short stable kind so tests can target a specific check. */
  kind:
    | 'unbalanced'
    | 'unmapped'
    | 'new-accounts'
    | 'zero-value'
    | 'duplicate-code'
    | 'no-rows-included';
  message: string;
  /** Optional row indices the issue applies to. */
  rowIndices?: number[];
}

interface ReviewLike extends ImportedAccount {
  _include?: boolean;
}

/**
 * Compute the full set of pre-import issues for the current review state.
 * Rows the user has unchecked are excluded from balance + count checks.
 */
export function computeImportIssues(rows: ReviewLike[]): ImportIssue[] {
  const issues: ImportIssue[] = [];
  const included = rows
    .map((r, idx) => ({ row: r, idx }))
    .filter(({ row }) => row._include !== false);

  if (included.length === 0) {
    issues.push({
      severity: 'error',
      kind: 'no-rows-included',
      message:
        'No rows are selected to include — uncheck Include is set on every row. The import will be empty.',
    });
    return issues;
  }

  // Unmapped rows — these get DROPPED at post (no journal line written).
  // Surface them BEFORE the unbalanced check, and bump severity to error
  // whenever the dropped amount makes the post unbalance — this is the
  // common shape of "review showed balanced, post was unbalanced".
  const unmapped = included.filter(({ row }) => !row.mappedAccountId);
  const unmappedDebit = unmapped.reduce((s, { row }) => s + (Number(row.debit) || 0), 0);
  const unmappedCredit = unmapped.reduce((s, { row }) => s + (Number(row.credit) || 0), 0);
  if (unmapped.length > 0) {
    const carriesValue =
      Math.abs(unmappedDebit) > 0.005 || Math.abs(unmappedCredit) > 0.005;
    issues.push({
      severity: carriesValue ? 'error' : 'warning',
      kind: 'unmapped',
      message:
        `${unmapped.length} ${unmapped.length === 1 ? 'row is' : 'rows are'} unmapped — ` +
        `they will be dropped from the journal (debits ${unmappedDebit.toFixed(2)}, ` +
        `credits ${unmappedCredit.toFixed(2)}). Map them to an existing account or click "Create new account".`,
      rowIndices: unmapped.map(({ idx }) => idx),
    });
  }

  // Out-of-balance check — totals of rows that will ACTUALLY post (mapped +
  // included). Unmapped rows are excluded because they don't write a journal
  // line; counting their amounts here would make a "balanced upload with
  // unmapped row dropped" look balanced when the post is actually skewed.
  const willPost = included.filter(({ row }) => Boolean(row.mappedAccountId));
  let totalDebit = 0;
  let totalCredit = 0;
  for (const { row } of willPost) {
    totalDebit += Number(row.debit) || 0;
    totalCredit += Number(row.credit) || 0;
  }
  const diff = Math.abs(totalDebit - totalCredit);
  if (diff >= 0.005) {
    issues.push({
      severity: 'error',
      kind: 'unbalanced',
      message:
        `Trial Balance is out of balance — debits ${totalDebit.toFixed(2)} vs credits ${totalCredit.toFixed(2)} ` +
        `(difference ${diff.toFixed(2)}). The journal will post unbalanced.`,
    });
  }

  // New accounts that will be minted via the modal flow.
  const willCreate = included.filter(({ row }) =>
    row.mappedAccountId?.startsWith('NEW:'),
  );
  if (willCreate.length > 0) {
    issues.push({
      severity: 'info',
      kind: 'new-accounts',
      message:
        `${willCreate.length} new ${willCreate.length === 1 ? 'account' : 'accounts'} ` +
        `will be created in the Chart of Accounts.`,
      rowIndices: willCreate.map(({ idx }) => idx),
    });
  }

  // Zero-value rows — they'll post empty journal lines.
  const zeroValue = included.filter(
    ({ row }) =>
      (Number(row.debit) || 0) === 0 && (Number(row.credit) || 0) === 0,
  );
  if (zeroValue.length > 0) {
    issues.push({
      severity: 'warning',
      kind: 'zero-value',
      message:
        `${zeroValue.length} ${zeroValue.length === 1 ? 'row has' : 'rows have'} zero debit AND zero credit — ` +
        `they will post journal lines with no value.`,
      rowIndices: zeroValue.map(({ idx }) => idx),
    });
  }

  // Duplicate external codes — surface every code that appears more than once.
  const codeCount = new Map<string, number[]>();
  for (const { row, idx } of included) {
    const code = (row.externalCode ?? '').trim();
    if (!code) continue;
    const existing = codeCount.get(code) ?? [];
    existing.push(idx);
    codeCount.set(code, existing);
  }
  const duplicates: string[] = [];
  const duplicateIndices: number[] = [];
  for (const [code, indices] of codeCount) {
    if (indices.length > 1) {
      duplicates.push(code);
      duplicateIndices.push(...indices);
    }
  }
  if (duplicates.length > 0) {
    issues.push({
      severity: 'warning',
      kind: 'duplicate-code',
      message:
        `Duplicate external ${duplicates.length === 1 ? 'code' : 'codes'} in the upload: ${duplicates.join(', ')}. ` +
        `Each duplicate will post its own journal line under the same code.`,
      rowIndices: duplicateIndices,
    });
  }

  return issues;
}

/** True iff any issue is severity 'error'. */
export function hasBlockingErrors(issues: ImportIssue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}
