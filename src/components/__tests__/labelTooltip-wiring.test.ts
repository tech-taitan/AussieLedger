/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Structural assertion: every tax-return component must contain LabelTooltip.
 * Plan 06-3 Task 3 (UX-03 consume).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const COMPONENTS_DIR = join(process.cwd(), 'src', 'components');

const TAX_RETURN_COMPONENTS = [
  'TaxReturnAssistant.tsx',
  'CompanyTaxReturn.tsx',
  'TrustTaxReturn.tsx',
  'PartnershipTaxReturn.tsx',
  'BasIasAssistant.tsx',
];

describe('Structural lint: LabelTooltip wired into all 5 tax-return components (UX-03)', () => {
  for (const filename of TAX_RETURN_COMPONENTS) {
    it(`${filename} contains LabelTooltip`, () => {
      const filePath = join(COMPONENTS_DIR, filename);
      const content = readFileSync(filePath, 'utf-8');
      expect(
        content.includes('LabelTooltip'),
        `Expected ${filename} to contain "LabelTooltip" — UX-03 requires LabelTooltip on at least one ATO label`,
      ).toBe(true);
    });
  }
});
