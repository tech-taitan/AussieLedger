/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Posting engine — pure functions only. No React. No adapter I/O. No `new Date()`.
 * Decimal arithmetic via src/lib/money.ts (Phase 1 boundary).
 */
import { Decimal } from './money';
import type { JournalEntry, JournalLine } from '../types';
import { today } from './period';

export class JournalNotBalancedError extends Error {
  constructor(public debit: string, public credit: string) {
    super(`Journal not balanced: D=${debit} C=${credit}`);
    this.name = 'JournalNotBalancedError';
  }
}

/** Tolerance for banker's-rounding cent drift across many lines. */
const BALANCE_TOLERANCE = '0.005';

/**
 * Decimal-exact balance check; throws on imbalance or insufficient lines.
 * Use BEFORE persisting (BOOK-01 data-layer enforcement).
 */
export function validateBalanced(lines: JournalLine[]): void {
  if (lines.length < 2) {
    throw new Error('Journal must have at least 2 lines');
  }
  const d = lines.reduce((s, l) => s.plus(new Decimal(l.debit || 0)), new Decimal(0));
  const c = lines.reduce((s, l) => s.plus(new Decimal(l.credit || 0)), new Decimal(0));
  const diff = d.minus(c).abs();
  if (diff.greaterThan(BALANCE_TOLERANCE)) {
    throw new JournalNotBalancedError(d.toFixed(2), c.toFixed(2));
  }
}

/**
 * Build a reversal entry that mirrors debits/credits of the original.
 * Original is NOT mutated. The reversal is itself a posted entry with
 * reversesEntryId pointing back. (BOOK-03)
 */
export function makeReversal(original: JournalEntry, reversalDate?: string): JournalEntry {
  const date = reversalDate ?? today().toISOString().split('T')[0];
  return {
    _v: 3,
    id: crypto.randomUUID(),
    date,
    reference: `REV-${original.reference}`,
    description: `Reversal of ${original.reference}: ${original.description}`,
    lines: original.lines.map((l): JournalLine => ({
      _v: 3,
      accountId: l.accountId,
      description: l.description,
      debit: l.credit,     // swap
      credit: l.debit,     // swap
      taxAmount: -l.taxAmount,
      isManualTax: l.isManualTax,
    })),
    isPosted: true,
    status: 'posted',
    reversesEntryId: original.id,
  };
}

/**
 * Produce a superseding edit — a new entry with replacesEntryId pointing back
 * to the original. Caller is responsible for marking the original as
 * `status: 'superseded'` + `replacedByEntryId: <new id>` in their hook state.
 * Throws JournalNotBalancedError if `edits.lines` is provided and unbalanced.
 */
export function makeSupersedingEdit(
  original: JournalEntry,
  edits: Partial<Pick<JournalEntry, 'date' | 'reference' | 'description' | 'lines'>>,
): JournalEntry {
  const lines = edits.lines ?? original.lines;
  validateBalanced(lines);
  return {
    ...original,
    ...edits,
    _v: 3,
    id: crypto.randomUUID(),
    lines,
    isPosted: true,
    status: 'posted',
    replacesEntryId: original.id,
    // Strip any old supersession pointer so chains stay clean
    replacedByEntryId: undefined,
    reversesEntryId: undefined,
  };
}

export interface SearchFilters {
  reference?: string;
  description?: string;
  accountId?: string;
  dateFrom?: string;     // ISO YYYY-MM-DD inclusive
  dateTo?: string;       // ISO YYYY-MM-DD inclusive
  amountFrom?: number;   // matches any line whose debit or credit >= amountFrom
  amountTo?: number;     // matches any line whose debit or credit <= amountTo
}

/**
 * Filter journal entries by BOOK-12 criteria. Pure function — no I/O.
 */
export function searchJournals(
  entries: JournalEntry[],
  filters: SearchFilters,
): JournalEntry[] {
  const refQ = filters.reference?.toLowerCase().trim() ?? '';
  const descQ = filters.description?.toLowerCase().trim() ?? '';
  const accId = filters.accountId?.trim() ?? '';
  const amtFrom = typeof filters.amountFrom === 'number' ? filters.amountFrom : -Infinity;
  const amtTo = typeof filters.amountTo === 'number' ? filters.amountTo : Infinity;
  const dateFrom = filters.dateFrom ?? '';
  const dateTo = filters.dateTo ?? '';

  return entries.filter((e) => {
    if (refQ && !e.reference.toLowerCase().includes(refQ)) return false;
    if (descQ && !e.description.toLowerCase().includes(descQ)) return false;
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;

    if (accId) {
      if (!e.lines.some((l) => l.accountId === accId)) return false;
    }

    if (filters.amountFrom !== undefined || filters.amountTo !== undefined) {
      const hit = e.lines.some((l) => {
        const debitInRange = l.debit > 0 && l.debit >= amtFrom && l.debit <= amtTo;
        const creditInRange = l.credit > 0 && l.credit >= amtFrom && l.credit <= amtTo;
        return debitInRange || creditInRange;
      });
      if (!hit) return false;
    }

    return true;
  });
}
