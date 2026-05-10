/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ABN modulus-89 weights.
 * Algorithm (per abr.business.gov.au/Help/AbnFormat):
 *   1. Strip non-digits; expect exactly 11 digits.
 *   2. Subtract 1 from the first (leftmost) digit.
 *   3. Multiply each digit by its weight: [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19].
 *   4. Sum the products.
 *   5. ABN is valid iff sum % 89 === 0.
 */
const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19] as const;

export interface AbnValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates an Australian Business Number using the ABR modulus-89 checksum.
 * Accepts inputs with spaces, hyphens, or an "ABN " prefix.
 *
 * @param input - Raw user-entered string
 * @returns `{ valid: true }` if checksum passes, otherwise `{ valid: false, reason }`
 */
export function validateAbn(input: string): AbnValidationResult {
  if (typeof input !== 'string' || input.length === 0) {
    return { valid: false, reason: 'ABN is empty' };
  }
  const digits = input.replace(/[^0-9]/g, '');
  if (digits.length !== 11) {
    return { valid: false, reason: `Expected 11 digits, got ${digits.length}` };
  }

  const ds = digits.split('').map(Number);
  ds[0] -= 1;

  const sum = ds.reduce((acc, d, i) => acc + d * ABN_WEIGHTS[i], 0);
  if (sum % 89 !== 0) {
    return { valid: false, reason: 'ABN checksum invalid — please check the number' };
  }
  return { valid: true };
}
