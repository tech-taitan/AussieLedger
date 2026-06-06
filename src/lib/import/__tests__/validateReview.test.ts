/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { computeImportIssues, hasBlockingErrors } from '../validateReview';
import type { ImportedAccount } from '../../../types';

interface ReviewLike extends ImportedAccount {
  _include?: boolean;
}

function mk(overrides: Partial<ReviewLike>): ReviewLike {
  return {
    externalCode: '1000',
    externalName: 'Test Account',
    debit: 0,
    credit: 0,
    confidence: 0.95,
    mappedAccountId: 'acc-1',
    ...overrides,
  };
}

describe('computeImportIssues', () => {
  it('returns no issues when rows are balanced, mapped, non-zero, and unique', () => {
    const rows: ReviewLike[] = [
      mk({ externalCode: '1100', externalName: 'Bank', debit: 1000, credit: 0, mappedAccountId: 'acc-1' }),
      mk({ externalCode: '3000', externalName: 'Capital', debit: 0, credit: 1000, mappedAccountId: 'acc-2' }),
    ];
    expect(computeImportIssues(rows)).toEqual([]);
  });

  it('flags out-of-balance as an error', () => {
    const rows: ReviewLike[] = [
      mk({ debit: 1000, credit: 0, mappedAccountId: 'acc-1', externalCode: '1100' }),
      mk({ debit: 0, credit: 950, mappedAccountId: 'acc-2', externalCode: '3000' }),
    ];
    const issues = computeImportIssues(rows);
    const balErr = issues.find((i) => i.kind === 'unbalanced');
    expect(balErr).toBeDefined();
    expect(balErr!.severity).toBe('error');
    expect(balErr!.message).toMatch(/out of balance/i);
    expect(hasBlockingErrors(issues)).toBe(true);
  });

  it('treats sub-half-cent imbalance as balanced (rounding tolerance)', () => {
    const rows: ReviewLike[] = [
      mk({ debit: 100.001, credit: 0, mappedAccountId: 'acc-1', externalCode: '1100' }),
      mk({ debit: 0, credit: 100, mappedAccountId: 'acc-2', externalCode: '3000' }),
    ];
    const issues = computeImportIssues(rows);
    expect(issues.find((i) => i.kind === 'unbalanced')).toBeUndefined();
  });

  it('flags zero-value unmapped rows as warning (no data loss)', () => {
    const rows: ReviewLike[] = [
      mk({ debit: 500, mappedAccountId: 'acc-1', externalCode: '1100' }),
      // Zero-value unmapped — dropping doesn't change totals.
      mk({ debit: 0, credit: 0, mappedAccountId: undefined, externalCode: '9999' }),
      mk({ credit: 500, mappedAccountId: 'acc-2', externalCode: '3000' }),
    ];
    const issues = computeImportIssues(rows);
    const um = issues.find((i) => i.kind === 'unmapped');
    expect(um).toBeDefined();
    expect(um!.severity).toBe('warning');
    expect(um!.rowIndices).toEqual([1]);
  });

  it('flags value-carrying unmapped rows as ERROR (post will unbalance)', () => {
    // The bug fix: a balanced upload with an unmapped row that carries
    // value used to look balanced in the review, then unbalance on post.
    const rows: ReviewLike[] = [
      mk({ debit: 1500, mappedAccountId: 'acc-1', externalCode: '1100' }),
      mk({ debit: 0, credit: 1000, mappedAccountId: 'acc-2', externalCode: '3000' }),
      // Carries $500 credit — drop will leave the post out of balance.
      mk({ debit: 0, credit: 500, mappedAccountId: undefined, externalCode: '9999' }),
    ];
    const issues = computeImportIssues(rows);
    const um = issues.find((i) => i.kind === 'unmapped');
    expect(um).toBeDefined();
    expect(um!.severity).toBe('error');
    expect(um!.message).toMatch(/credits 500/);
  });

  it('unbalanced check uses WILL-POST totals (excludes unmapped row amounts)', () => {
    // 1500 DR mapped + 1500 CR (1000 mapped + 500 unmapped). The unmapped
    // row is excluded from the post total, so DR 1500 vs CR 1000 should
    // surface as unbalanced — that's what will actually happen at post.
    const rows: ReviewLike[] = [
      mk({ debit: 1500, mappedAccountId: 'acc-1', externalCode: '1100' }),
      mk({ debit: 0, credit: 1000, mappedAccountId: 'acc-2', externalCode: '3000' }),
      mk({ debit: 0, credit: 500, mappedAccountId: undefined, externalCode: '9999' }),
    ];
    const issues = computeImportIssues(rows);
    const balErr = issues.find((i) => i.kind === 'unbalanced');
    expect(balErr).toBeDefined();
    expect(balErr!.message).toMatch(/difference 500/);
  });

  it('counts NEW: rows as info, not unmapped', () => {
    const rows: ReviewLike[] = [
      mk({ debit: 500, mappedAccountId: 'NEW:5999:Misc', externalCode: '5999' }),
      mk({ credit: 500, mappedAccountId: 'acc-1', externalCode: '4000' }),
    ];
    const issues = computeImportIssues(rows);
    expect(issues.find((i) => i.kind === 'unmapped')).toBeUndefined();
    const info = issues.find((i) => i.kind === 'new-accounts');
    expect(info).toBeDefined();
    expect(info!.severity).toBe('info');
    expect(info!.message).toMatch(/1 new account/i);
  });

  it('warns on zero-value rows', () => {
    const rows: ReviewLike[] = [
      mk({ debit: 0, credit: 0, mappedAccountId: 'acc-1', externalCode: '1100' }),
      mk({ debit: 1000, credit: 0, mappedAccountId: 'acc-2', externalCode: '4000' }),
      mk({ debit: 0, credit: 1000, mappedAccountId: 'acc-3', externalCode: '3000' }),
    ];
    const issues = computeImportIssues(rows);
    const zv = issues.find((i) => i.kind === 'zero-value');
    expect(zv).toBeDefined();
    expect(zv!.severity).toBe('warning');
    expect(zv!.rowIndices).toEqual([0]);
  });

  it('warns on duplicate external codes', () => {
    const rows: ReviewLike[] = [
      mk({ externalCode: '4100', externalName: 'Sales A', debit: 0, credit: 600, mappedAccountId: 'acc-1' }),
      mk({ externalCode: '4100', externalName: 'Sales B', debit: 0, credit: 400, mappedAccountId: 'acc-2' }),
      mk({ externalCode: '1100', externalName: 'Bank', debit: 1000, credit: 0, mappedAccountId: 'acc-3' }),
    ];
    const issues = computeImportIssues(rows);
    const dup = issues.find((i) => i.kind === 'duplicate-code');
    expect(dup).toBeDefined();
    expect(dup!.severity).toBe('warning');
    expect(dup!.message).toMatch(/4100/);
    expect(dup!.rowIndices).toEqual([0, 1]);
  });

  it('skips unchecked (_include === false) rows from all checks', () => {
    const rows: ReviewLike[] = [
      mk({ debit: 999, credit: 0, mappedAccountId: 'acc-1', externalCode: '1100' }),
      mk({ debit: 0, credit: 999, mappedAccountId: 'acc-2', externalCode: '3000' }),
      // This row would push the TB out of balance + cause a duplicate code,
      // but it's excluded so neither issue should fire.
      mk({ debit: 1000, credit: 0, mappedAccountId: undefined, externalCode: '1100', _include: false }),
    ];
    expect(computeImportIssues(rows)).toEqual([]);
  });

  it('flags zero included rows as a blocking error', () => {
    const rows: ReviewLike[] = [
      mk({ _include: false }),
      mk({ _include: false }),
    ];
    const issues = computeImportIssues(rows);
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe('no-rows-included');
    expect(issues[0].severity).toBe('error');
    expect(hasBlockingErrors(issues)).toBe(true);
  });
});
