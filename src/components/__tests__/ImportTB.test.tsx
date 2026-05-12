/**
 * Component test for ImportTB.
 *
 * Phase 3 (Plan 03-3): Gemini SDK call replaced with fetch('/api/ai/match-accounts');
 * IS_AI_ENABLED replaced with isAiEnabled() runtime check.
 *
 * Tests AI-button gating via isAiEnabled() and fuzzyMatch wiring.
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

  describe('isAiEnabled() gating', () => {
    it('does not render "Enhance with AI" button when isAiEnabled() returns false', async () => {
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
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
      // "Enhance with AI" should never appear when isAiEnabled() is false
      expect(screen.queryByText(/Enhance with AI/i)).toBeNull();
      // Upload step renders the file selection UI
      expect(screen.queryByText(/Upload Trial Balance/i)).not.toBeNull();
    });

    it('component renders correctly when isAiEnabled() returns true', async () => {
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => true,
        IS_AI_ENABLED: true,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
      vi.doMock('../../lib/import/match', () => ({
        fuzzyMatch: vi.fn().mockReturnValue({ confidence: 0, candidates: [] }),
        HIGH_CONFIDENCE_THRESHOLD: 0.85,
        TOP_N_CANDIDATES: 3,
      }));
      // Stub fetch in case any rendered effect tries to hit /api/ai/match-accounts
      vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo) => {
        const url = typeof input === 'string' ? input : (input as Request).url;
        if (url.includes('/api/ai/match-accounts')) {
          return new Response(JSON.stringify({
            candidates: [{
              content: { parts: [{ text: JSON.stringify([
                { externalCode: 'X1', mappedAccountId: 'acc-1', confidence: 0.9, reasoning: 'match' },
              ]) }] },
            }],
          }), { status: 200 });
        }
        return new Response('not found', { status: 404 });
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

  describe('Phase 4 — ImportTB refactor (IMP-01..06)', () => {
    it.todo('column mapping UI confirmation');
    it.todo('deterministic path works without AI');
    it.todo('fingerprint Skip Replace dialog');
    it.todo('single opening journal posted');
    it.todo('XLSX flow opens sheet picker when multi-sheet');
    it.todo('XLSX flow auto-selects single matching sheet');
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
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
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
