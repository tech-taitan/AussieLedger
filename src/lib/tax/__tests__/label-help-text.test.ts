/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Content-integrity lint for ATO label helpText fields.
 * UX-03: every label has a non-empty helpText; no deductibility language.
 */
import { describe, it, expect } from 'vitest';
import {
  INDIVIDUAL_LABELS_FULL,
  COMPANY_LABELS_FULL,
  TRUST_LABELS_FULL,
  PARTNERSHIP_LABELS_FULL,
  BAS_LABELS_FULL,
  IAS_LABELS_FULL,
} from '../labels/fy2026';

const FORBIDDEN = /deductibility|deductible|write[- ]off|tax advantage|\bclaim\b/i;
const MIN_LEN = 20;

function checkCatalogue(
  name: string,
  catalogue: Record<string, { helpText: string }>,
): void {
  describe(`${name} helpText (UX-03)`, () => {
    const keys = Object.keys(catalogue);

    it(`all ${keys.length} entries have helpText field present and non-empty (>= ${MIN_LEN} chars)`, () => {
      for (const key of keys) {
        const entry = catalogue[key];
        expect(
          entry.helpText,
          `${name}['${key}'].helpText is missing`,
        ).toBeDefined();
        expect(
          entry.helpText.trim().length,
          `${name}['${key}'].helpText is too short: "${entry.helpText}"`,
        ).toBeGreaterThanOrEqual(MIN_LEN);
      }
    });
  });
}

// Individual
checkCatalogue('INDIVIDUAL_LABELS_FULL', INDIVIDUAL_LABELS_FULL as Record<string, { helpText: string }>);
// Company
checkCatalogue('COMPANY_LABELS_FULL', COMPANY_LABELS_FULL as Record<string, { helpText: string }>);
// Trust
checkCatalogue('TRUST_LABELS_FULL', TRUST_LABELS_FULL as Record<string, { helpText: string }>);
// Partnership
checkCatalogue('PARTNERSHIP_LABELS_FULL', PARTNERSHIP_LABELS_FULL as Record<string, { helpText: string }>);
// BAS
checkCatalogue('BAS_LABELS_FULL', BAS_LABELS_FULL as Record<string, { helpText: string }>);
// IAS (NEW)
checkCatalogue('IAS_LABELS_FULL', IAS_LABELS_FULL as Record<string, { helpText: string }>);

describe('Global helpText content lint (UX-03)', () => {
  it('Test L.7: no helpText contains forbidden deductibility language', () => {
    const allCatalogues: Array<[string, Record<string, { helpText: string }>]> = [
      ['INDIVIDUAL', INDIVIDUAL_LABELS_FULL as Record<string, { helpText: string }>],
      ['COMPANY', COMPANY_LABELS_FULL as Record<string, { helpText: string }>],
      ['TRUST', TRUST_LABELS_FULL as Record<string, { helpText: string }>],
      ['PARTNERSHIP', PARTNERSHIP_LABELS_FULL as Record<string, { helpText: string }>],
      ['BAS', BAS_LABELS_FULL as Record<string, { helpText: string }>],
      ['IAS', IAS_LABELS_FULL as Record<string, { helpText: string }>],
    ];
    for (const [catalogueName, catalogue] of allCatalogues) {
      for (const [key, entry] of Object.entries(catalogue)) {
        const match = entry.helpText.match(FORBIDDEN);
        expect(
          match,
          `${catalogueName}['${key}'].helpText contains forbidden word "${match?.[0]}": "${entry.helpText}"`,
        ).toBeNull();
      }
    }
  });
});
