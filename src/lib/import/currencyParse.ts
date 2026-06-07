/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure-function tolerant currency parser.
 * Handles $, AUD, A$, parentheses-negatives, thousands separators, and whitespace.
 * AU-locale-first with ambiguity flag for low-confidence parses.
 * Preserves decimal.js precision via string-only Decimal construction — never via parseFloat/Number.
 */
import Decimal from 'decimal.js';

export interface ParseResult {
  decimal: Decimal | null;
  confidence: 'high' | 'low';
  reason?: string;
}

// EU format like "1.234,56" — period as thousands, comma as decimal.
const EU_FORMAT_RE = /^\d{1,3}(\.\d{3})+(,\d+)?$/;

// Parens notation supporting optional leading/trailing $ and surrounding whitespace.
// Matches: (1,234.56)  ($1,234.56)  ( 1234.56 )  " (1234.56) " (after outer trim)
const PARENS_RE = /^\(\s*\$?\s*([\d,]+(?:\.\d+)?)\s*\)$/;

// AU numeric shape — digits, optional commas, optional period.
const AU_NUMERIC_RE = /^[\d,]*\.?\d*$/;

export function parseCurrency(raw: string, _locale: 'AU' = 'AU'): ParseResult {
  // Step 0: strip ALL whitespace (incl. NBSP U+00A0 common in Excel
  // currency exports, narrow no-break U+202F, figure space U+2007,
  // ideographic U+3000 — anything that matches \s in modern JS). Safe
  // under the AU-only locale because no valid AU number format has
  // meaningful internal whitespace. The legacy `.trim()` only stripped
  // ASCII whitespace so NBSP-padded "1 234.56" rows were rejected
  // silently at the AU_NUMERIC_RE check (step 6).
  const trimmed = (raw ?? '').replace(/\s/g, '');

  // Step 1: Empty / whitespace → Decimal('0'), high confidence.
  if (trimmed === '') return { decimal: new Decimal('0'), confidence: 'high' };

  // Step 2: Parens-negative BEFORE stripping currency markers.
  // EU_FORMAT_RE would not false-positive on parens (no digits before paren),
  // but we handle parens first to avoid ambiguity in the rest of the pipeline.
  const parens = PARENS_RE.exec(trimmed);
  if (parens) {
    const innerCleaned = parens[1].replace(/,/g, '');
    if (!/^\d+(\.\d+)?$/.test(innerCleaned) || innerCleaned === '') {
      return { decimal: null, confidence: 'low', reason: `currency unparseable: ${raw}` };
    }
    return { decimal: new Decimal(innerCleaned).negated(), confidence: 'high' };
  }

  // Step 3: Strip currency markers — order matters: A$ before AUD before $.
  const stripped = trimmed
    .replace(/^A\$\s*/i, '')
    .replace(/\s*A\$$/i, '')
    .replace(/^AUD\s*/i, '')
    .replace(/\s*AUD$/i, '')
    .replace(/^\$\s*/, '')
    .replace(/\s*\$$/, '')
    .trim();

  // Step 4: Detect minus, either leading ("$ -1,234.56") OR trailing
  // ("1234.56-" — common in SAP and older MYOB exports). The legacy
  // implementation only handled leading minus, so trailing-minus rows
  // were rejected silently with `currency unparseable`.
  const trailingMinus = stripped.endsWith('-') && !stripped.startsWith('-');
  const leadingMinus = stripped.startsWith('-');
  const negative = leadingMinus || trailingMinus;
  let absStr: string;
  if (leadingMinus) {
    absStr = stripped.slice(1).trim();
  } else if (trailingMinus) {
    absStr = stripped.slice(0, -1).trim();
  } else {
    absStr = stripped.trim();
  }

  // Step 5: Detect EU format before AU validation.
  // EU: "1.234,56" — period as thousands separator, comma as decimal.
  if (EU_FORMAT_RE.test(absStr)) {
    return { decimal: null, confidence: 'low', reason: `EU format detected: ${raw}` };
  }

  // Step 6: Validate AU numeric shape or reject.
  if (!AU_NUMERIC_RE.test(absStr) || absStr === '') {
    return { decimal: null, confidence: 'low', reason: `currency unparseable: ${raw}` };
  }

  // Step 7: Strip thousands separators (commas in AU format).
  const cleaned = absStr.replace(/,/g, '');

  // Step 8: Validate the cleaned value is a parseable decimal number string.
  if (!/^\d+\.?\d*$/.test(cleaned) && !/^\d*\.\d+$/.test(cleaned)) {
    return { decimal: null, confidence: 'low', reason: `currency unparseable: ${raw}` };
  }

  // Step 9: Ambiguity flag — comma present but no period means AU 1234 OR EU 1.234.
  const isAmbiguous = absStr.includes(',') && !absStr.includes('.');

  try {
    const dec = negative ? new Decimal(cleaned).negated() : new Decimal(cleaned);
    return {
      decimal: dec,
      confidence: isAmbiguous ? 'low' : 'high',
      reason: isAmbiguous
        ? `ambiguous: "${raw}" parsed as AU ${cleaned}; could be EU`
        : undefined,
    };
  } catch {
    // Defensive — Decimal should never throw on the cleaned string after regex pre-validation,
    // but if it does, never propagate; degrade gracefully to "unparseable".
    return { decimal: null, confidence: 'low', reason: `currency unparseable: ${raw}` };
  }
}
