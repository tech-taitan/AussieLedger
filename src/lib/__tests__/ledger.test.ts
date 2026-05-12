/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validateBalanced,
  makeReversal,
  makeSupersedingEdit,
  searchJournals,
  JournalNotBalancedError,
} from '../ledger';
import { _setNowProvider, _resetNowProvider } from '../period';
import type { JournalEntry, JournalLine } from '../../types';

function mkLine(d: number, c: number, accountId = 'a1'): JournalLine {
  return { accountId, description: '', debit: d, credit: c, taxAmount: 0 };
}

function mkEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    date: '2026-01-15',
    reference: 'JE-001',
    description: 'Test',
    lines: [mkLine(100, 0, 'a1'), mkLine(0, 100, 'a2')],
    isPosted: true,
    status: 'posted',
    ...overrides,
  };
}

describe('validateBalanced (BOOK-01)', () => {
  it('validates balance to 2dp', () => {
    // 33.33 + 33.33 + 33.34 = 100.00
    expect(() =>
      validateBalanced([
        mkLine(33.33, 0),
        mkLine(33.33, 0),
        mkLine(33.34, 0),
        mkLine(0, 100),
      ]),
    ).not.toThrow();
  });

  it('throws JournalNotBalancedError', () => {
    expect(() => validateBalanced([mkLine(100, 0), mkLine(0, 99.99)])).toThrow(JournalNotBalancedError);
  });

  it('rejects fewer than 2 lines', () => {
    expect(() => validateBalanced([mkLine(100, 0)])).toThrow(/at least 2/);
    expect(() => validateBalanced([])).toThrow(/at least 2/);
  });
});

describe('makeReversal (BOOK-03)', () => {
  beforeEach(() => _setNowProvider(() => new Date('2026-02-01T00:00:00Z')));
  afterEach(() => _resetNowProvider());

  it('mirrors lines', () => {
    const original = mkEntry();
    const rev = makeReversal(original);
    expect(rev.lines[0].debit).toBe(original.lines[0].credit);
    expect(rev.lines[0].credit).toBe(original.lines[0].debit);
  });

  it('reversesEntryId link', () => {
    const original = mkEntry({ id: 'orig-1' });
    const rev = makeReversal(original);
    expect(rev.reversesEntryId).toBe('orig-1');
    expect(rev.id).not.toBe('orig-1');
    expect(rev.status).toBe('posted');
    expect(rev.reference.startsWith('REV-')).toBe(true);
  });

  it('defaults reversal date to today()', () => {
    const rev = makeReversal(mkEntry());
    expect(rev.date).toBe('2026-02-01');
  });
});

describe('makeSupersedingEdit (BOOK-02)', () => {
  it('sets replacesEntryId on new entry', () => {
    const orig = mkEntry({ id: 'orig-1' });
    const sup = makeSupersedingEdit(orig, { description: 'Edited' });
    expect(sup.replacesEntryId).toBe('orig-1');
    expect(sup.id).not.toBe('orig-1');
    expect(sup.description).toBe('Edited');
  });

  it('throws on unbalanced edit', () => {
    const orig = mkEntry();
    expect(() =>
      makeSupersedingEdit(orig, { lines: [mkLine(100, 0), mkLine(0, 50)] }),
    ).toThrow(JournalNotBalancedError);
  });
});

describe('searchJournals (BOOK-12)', () => {
  const ENTRIES: JournalEntry[] = [
    mkEntry({ id: '1', reference: 'INV-001', description: 'Sale to ABC', date: '2026-01-10',
      lines: [mkLine(500, 0, 'a-cash'), mkLine(0, 500, 'a-sales')] }),
    mkEntry({ id: '2', reference: 'INV-002', description: 'Sale to XYZ', date: '2026-02-15',
      lines: [mkLine(120, 0, 'a-cash'), mkLine(0, 120, 'a-sales')] }),
    mkEntry({ id: '3', reference: 'BILL-100', description: 'Rent', date: '2026-03-01',
      lines: [mkLine(2000, 0, 'a-rent'), mkLine(0, 2000, 'a-cash')] }),
  ];

  it('searchJournals reference and description', () => {
    expect(searchJournals(ENTRIES, { reference: 'inv' }).map((e) => e.id)).toEqual(['1', '2']);
    expect(searchJournals(ENTRIES, { description: 'rent' }).map((e) => e.id)).toEqual(['3']);
  });

  it('searchJournals by account', () => {
    expect(searchJournals(ENTRIES, { accountId: 'a-rent' }).map((e) => e.id)).toEqual(['3']);
    expect(searchJournals(ENTRIES, { accountId: 'a-cash' }).map((e) => e.id)).toEqual(['1', '2', '3']);
  });

  it('searchJournals by amount range', () => {
    // Match any line whose debit OR credit falls in [400, 600]
    expect(searchJournals(ENTRIES, { amountFrom: 400, amountTo: 600 }).map((e) => e.id)).toEqual(['1']);
  });

  it('searchJournals by date range', () => {
    expect(searchJournals(ENTRIES, { dateFrom: '2026-02-01', dateTo: '2026-02-28' }).map((e) => e.id))
      .toEqual(['2']);
  });

  it('searchJournals perf 1000 entries', () => {
    const big: JournalEntry[] = Array.from({ length: 1000 }, (_, i) =>
      mkEntry({
        id: `e-${i}`,
        reference: `R-${i}`,
        description: `D-${i}`,
        lines: [mkLine(i, 0, `a-${i % 50}`), mkLine(0, i, 'a-bank')],
      }),
    );
    const t0 = performance.now();
    const out = searchJournals(big, { accountId: 'a-bank', amountFrom: 500, amountTo: 600 });
    const t1 = performance.now();
    expect(out.length).toBeGreaterThan(0);
    expect(t1 - t0).toBeLessThan(50);
  });
});
