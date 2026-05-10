/**
 * Component test for ImportTB.
 *
 * Tests IS_AI_ENABLED gating and fuzzyMatch wiring implemented in Plan 02-3.
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

  describe('IS_AI_ENABLED gating', () => {
    it('does not render "Enhance with AI" button when IS_AI_ENABLED is false', async () => {
      vi.doMock('../../lib/ai', () => ({ IS_AI_ENABLED: false }));
      vi.doMock('../../lib/import/match', () => ({
        fuzzyMatch: vi.fn().mockReturnValue({ confidence: 0, candidates: [] }),
        HIGH_CONFIDENCE_THRESHOLD: 0.85,
        TOP_N_CANDIDATES: 3,
      }));
      const { ImportTB } = await import('../ImportTB');
      render(
        <ImportTB
          accounts={FIXTURE_ACCOUNTS}
          onImport={vi.fn()}
        />
      );
      // "Enhance with AI" should never appear when IS_AI_ENABLED is false
      expect(screen.queryByText(/Enhance with AI/i)).toBeNull();
      // Upload step renders the file selection UI
      expect(screen.queryByText(/Upload Trial Balance/i)).not.toBeNull();
    });

    it('component renders correctly when IS_AI_ENABLED is true', async () => {
      vi.doMock('../../lib/ai', () => ({ IS_AI_ENABLED: true }));
      vi.doMock('../../lib/import/match', () => ({
        fuzzyMatch: vi.fn().mockReturnValue({ confidence: 0, candidates: [] }),
        HIGH_CONFIDENCE_THRESHOLD: 0.85,
        TOP_N_CANDIDATES: 3,
      }));
      const { ImportTB } = await import('../ImportTB');
      render(
        <ImportTB
          accounts={FIXTURE_ACCOUNTS}
          onImport={vi.fn()}
        />
      );
      // Component renders the upload step
      expect(screen.queryByText(/Upload Trial Balance/i)).not.toBeNull();
    });
  });

  describe('deterministic mapping', () => {
    it('fuzzyMatch module is mockable and ImportTB renders with the mock', async () => {
      const mockFn = vi.fn().mockReturnValue({
        mappedAccountId: 'acc-1',
        confidence: 0.95,
        candidates: [{ accountId: 'acc-1', confidence: 0.95, name: 'Sales' }],
      });
      vi.doMock('../../lib/import/match', () => ({
        fuzzyMatch: mockFn,
        HIGH_CONFIDENCE_THRESHOLD: 0.85,
        TOP_N_CANDIDATES: 3,
      }));
      vi.doMock('../../lib/ai', () => ({ IS_AI_ENABLED: false }));
      const { ImportTB } = await import('../ImportTB');
      render(
        <ImportTB
          accounts={FIXTURE_ACCOUNTS}
          onImport={vi.fn()}
        />
      );
      // Component renders without error when fuzzyMatch is mocked
      expect(screen.queryByText(/Upload Trial Balance/i)).not.toBeNull();
      // Auto-match button only appears after column mapping step — not triggered yet
      expect(mockFn).not.toHaveBeenCalled();
    });
  });
});
