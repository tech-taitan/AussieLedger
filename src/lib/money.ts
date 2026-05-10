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
