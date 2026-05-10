/**
 * Component test scaffold for ImportTB.
 *
 * Tests RED-by-design until Plan 02-3 adds IS_AI_ENABLED gating and fuzzyMatch wiring.
 *
 * RED-by-design tests:
 *   - IS_AI_ENABLED gating: "Enhance with AI" button hidden when IS_AI_ENABLED is false
 *   - IS_AI_ENABLED gating: "Enhance with AI" button visible when IS_AI_ENABLED is true
 *   - deterministic mapping uses fuzzyMatch results
 *
 * The existing smoke test (smoke.test.tsx) already verifies ImportTB renders without crashing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Account } from '../../types';

const FIXTURE_ACCOUNTS: Account[] = [
  { id: 'acc-1', code: '4100', name: 'Sales', type: 'Revenue', gstCode: 'GST' },
  { id: 'acc-2', code: '6400', name: 'Wages & Salaries', type: 'Expense', gstCode: 'N-T' },
];

describe('ImportTB', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('IS_AI_ENABLED gating — RED-by-design until Plan 02-3', () => {
    // Plan 02-3 adds IS_AI_ENABLED import and conditional render to ImportTB.
    // Until then, these tests are expected to FAIL (component doesn't gate yet).

    it.skip('renders manual mapping flow only when IS_AI_ENABLED is false — no "Enhance with AI" button [RED until 02-3]', async () => {
      vi.mock('../../lib/ai', () => ({ IS_AI_ENABLED: false }));
      const { ImportTB } = await import('../ImportTB');
      render(
        <ImportTB
          accounts={FIXTURE_ACCOUNTS}
          onImport={vi.fn()}
          onClose={vi.fn()}
        />
      );
      // After 02-3: "Auto-match Accounts" button visible; "Enhance with AI" NOT visible
      expect(screen.queryByText(/Auto-match/i)).not.toBeNull();
      expect(screen.queryByText(/Enhance with AI/i)).toBeNull();
    });

    it.skip('renders both "Auto-match" and "Enhance with AI" buttons when IS_AI_ENABLED is true [RED until 02-3]', async () => {
      vi.mock('../../lib/ai', () => ({ IS_AI_ENABLED: true }));
      const { ImportTB } = await import('../ImportTB');
      render(
        <ImportTB
          accounts={FIXTURE_ACCOUNTS}
          onImport={vi.fn()}
          onClose={vi.fn()}
        />
      );
      // After 02-3: both buttons visible
      expect(screen.queryByText(/Auto-match/i)).not.toBeNull();
      expect(screen.queryByText(/Enhance with AI/i)).not.toBeNull();
    });
  });

  describe('deterministic mapping — RED-by-design until Plan 02-3', () => {
    it.skip('deterministic mapping uses fuzzyMatch results — called once per imported row [RED until 02-3]', async () => {
      const mockFuzzyMatch = vi.fn().mockReturnValue({
        mappedAccountId: 'acc-1',
        confidence: 0.95,
        candidates: [{ accountId: 'acc-1', confidence: 0.95, name: 'Sales' }],
      });
      vi.mock('../../lib/import/match', () => ({
        fuzzyMatch: mockFuzzyMatch,
        HIGH_CONFIDENCE_THRESHOLD: 0.85,
        TOP_N_CANDIDATES: 3,
      }));
      // After 02-3: uploading a file and clicking Auto-match triggers fuzzyMatch per row
      expect(mockFuzzyMatch).not.toHaveBeenCalled(); // placeholder assertion
    });
  });
});
