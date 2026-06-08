/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Decimal } from 'decimal.js';

// Configure global rounding once at module load: banker's rounding (ROUND_HALF_EVEN = 6)
// Per CONTEXT.md "Rounding policy: Banker's rounding to 2 decimal places".
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -9,
  toExpPos: 20,
});

export { Decimal };

export function add(a: Decimal.Value, b: Decimal.Value): Decimal {
  return new Decimal(a).plus(new Decimal(b));
}

export function sub(a: Decimal.Value, b: Decimal.Value): Decimal {
  return new Decimal(a).minus(new Decimal(b));
}

export function mul(a: Decimal.Value, b: Decimal.Value): Decimal {
  return new Decimal(a).times(new Decimal(b));
}

export function div(a: Decimal.Value, b: Decimal.Value): Decimal {
  return new Decimal(a).dividedBy(new Decimal(b));
}

/**
 * Extract GST component from a GST-inclusive amount.
 * GST = amount / 11, rounded to nearest cent (banker's rounding).
 * Source: ATO BAS instructions — GST is 1/11 of the GST-inclusive price.
 */
export function gst(amountInclGST: Decimal.Value): Decimal {
  return new Decimal(amountInclGST).dividedBy(11).toDecimalPlaces(2);
}

/** Round to `dp` decimal places using the global banker's rounding mode. */
export function round(value: Decimal.Value, dp: number = 2): Decimal {
  return new Decimal(value).toDecimalPlaces(dp);
}

/** Serialize a monetary Decimal to a 2dp string for JSON storage. */
export function serialize(amount: Decimal): string {
  return amount.toFixed(2);
}

/** Deserialize a stored monetary string back to a Decimal. */
export function deserialize(stored: string | number): Decimal {
  return new Decimal(stored);
}

/**
 * Format a monetary amount for display as `#,###.##` (e.g. `1,234.56`).
 *
 * Single source of truth for AUD display formatting. Callers add the
 * leading `$` (or `-$` for negatives in parens-style) themselves so this
 * helper composes with both `$1,234.56` and `(1,234.56)` conventions.
 *
 * Locale is pinned to `en-AU` so the format does not drift with system
 * locale settings — keeps server-rendered and client-rendered values
 * byte-identical, and prevents EU-locale users from seeing `1.234,56`.
 *
 * Defensive: NaN and non-finite inputs render as `0.00` instead of
 * `NaN`. Decimal inputs are accepted via `.toNumber()` for convenience.
 */
export function formatAud(value: number | Decimal | null | undefined): string {
  if (value === null || value === undefined) return '0.00';
  const n = typeof value === 'number' ? value : value.toNumber();
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
