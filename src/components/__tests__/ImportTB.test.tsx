/**
 * Component test for ImportTB.
 *
 * Phase 3 (Plan 03-3): Gemini SDK call replaced with fetch('/api/ai/match-accounts');
 * IS_AI_ENABLED replaced with isAiEnabled() runtime check.
 * Phase 4 (Plan 04-4): refactor consumes parseCsvFile + parseXlsxFile +
 * XlsxSheetPicker + ImportReviewPane + computeImportFingerprint; AI-assist
 * gated behind isAiEnabled().
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import * as XLSX from 'xlsx';
import type { Account, JournalEntry } from '../../types';

const FIXTURE_ACCOUNTS: Account[] = [
  { id: 'acc-1', code: '4100', name: 'Sales', type: 'Revenue', gstCode: 'GST' },
  {
    id: 'acc-2',
    code: '6400',
    name: 'Wages & Salaries',
    type: 'Expense',
    gstCode: 'N-T',
  },
  {
    id: 'acc-3',
    code: '1100',
    name: 'Bank',
    type: 'Asset',
    gstCode: 'N-T',
  },
];

/** Build a CSV File for the file-input change event. */
function makeCsvFile(): File {
  const csv =
    'Code,Name,Debit,Credit\n' +
    '4100,Sales,0,1000\n' +
    '6400,Wages & Salaries,500,0\n' +
    '1100,Bank,500,0\n';
  return new File([csv], 'tb.csv', { type: 'text/csv' });
}

/** Build an XLSX File with the named sheets. The first sheet is `Trial Balance`. */
function makeXlsxFile(sheetNames: string[]): File {
  const wb = XLSX.utils.book_new();
  for (const name of sheetNames) {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Code', 'Name', 'Debit', 'Credit'],
      ['4100', 'Sales', '0', '1000'],
      ['1100', 'Bank', '1000', '0'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const file = new File([buf], 'tb.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  // jsdom's File does not implement arrayBuffer(); back-stop with the raw
  // buffer we already have so the component code path (file.arrayBuffer())
  // works without depending on FileReader.
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => buf,
    configurable: true,
  });
  return file;
}

describe('ImportTB', () => {
  beforeEach(() => {
    // Clear module cache AND all registered mocks so doMock calls in one
    // test don't leak into the next. `resetModules` alone doesn't clear
    // doMock factories — `doUnmock` removes them so the next dynamic import
    // gets the REAL module.
    vi.resetModules();
    vi.doUnmock('../../lib/import/match');
    vi.doUnmock('../../lib/ai');
    // Silence jsdom's alert() / scrollIntoView shims that some flows hit
    // when an error is logged.
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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
      render(<ImportTB accounts={FIXTURE_ACCOUNTS} onImport={vi.fn()} />);
      expect(screen.queryByText(/Enhance with AI/i)).toBeNull();
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
      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: RequestInfo) => {
          const url =
            typeof input === 'string' ? input : (input as Request).url;
          if (url.includes('/api/ai/match-accounts')) {
            return new Response(
              JSON.stringify({
                candidates: [
                  {
                    content: {
                      parts: [
                        {
                          text: JSON.stringify([
                            {
                              externalCode: 'X1',
                              mappedAccountId: 'acc-1',
                              confidence: 0.9,
                              reasoning: 'match',
                            },
                          ]),
                        },
                      ],
                    },
                  },
                ],
              }),
              { status: 200 },
            );
          }
          return new Response('not found', { status: 404 });
        }),
      );
      const { ImportTB } = await import('../ImportTB');
      render(<ImportTB accounts={FIXTURE_ACCOUNTS} onImport={vi.fn()} />);
      expect(screen.queryByText(/Upload Trial Balance/i)).not.toBeNull();
    });
  });

  describe('Phase 4 — ImportTB refactor (IMP-01..06)', () => {
    it('column mapping UI confirmation', async () => {
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
      const { ImportTB } = await import('../ImportTB');
      render(<ImportTB accounts={FIXTURE_ACCOUNTS} onImport={vi.fn()} />);
      const fileInput = screen.getByTestId(
        'import-tb-file-input',
      ) as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [makeCsvFile()] } });
      });
      await waitFor(() =>
        expect(screen.queryByTestId('column-mapping')).not.toBeNull(),
      );
      // 4 mapping dropdowns
      expect(screen.getByLabelText('map-code')).not.toBeNull();
      expect(screen.getByLabelText('map-name')).not.toBeNull();
      expect(screen.getByLabelText('map-debit')).not.toBeNull();
      expect(screen.getByLabelText('map-credit')).not.toBeNull();
      // Default-mapping seeding should have set these to the CSV header names
      fireEvent.change(screen.getByLabelText('map-code'), {
        target: { value: 'Code' },
      });
      fireEvent.change(screen.getByLabelText('map-name'), {
        target: { value: 'Name' },
      });
      fireEvent.change(screen.getByLabelText('map-debit'), {
        target: { value: 'Debit' },
      });
      fireEvent.change(screen.getByLabelText('map-credit'), {
        target: { value: 'Credit' },
      });
      fireEvent.click(screen.getByTestId('confirm-mapping'));
      await waitFor(() =>
        expect(screen.queryByTestId('import-review-pane')).not.toBeNull(),
      );
    });

    it('deterministic path works without AI', async () => {
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
      const { ImportTB } = await import('../ImportTB');
      const onImport = vi.fn();
      render(<ImportTB accounts={FIXTURE_ACCOUNTS} onImport={onImport} />);
      // AI section should NOT be in DOM
      expect(screen.queryByText(/Enhance with AI/i)).toBeNull();
      // Walk through deterministic flow
      const fileInput = screen.getByTestId(
        'import-tb-file-input',
      ) as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [makeCsvFile()] } });
      });
      await waitFor(() =>
        expect(screen.queryByTestId('column-mapping')).not.toBeNull(),
      );
      fireEvent.change(screen.getByLabelText('map-code'), {
        target: { value: 'Code' },
      });
      fireEvent.change(screen.getByLabelText('map-name'), {
        target: { value: 'Name' },
      });
      fireEvent.change(screen.getByLabelText('map-debit'), {
        target: { value: 'Debit' },
      });
      fireEvent.change(screen.getByLabelText('map-credit'), {
        target: { value: 'Credit' },
      });
      fireEvent.click(screen.getByTestId('confirm-mapping'));
      await waitFor(() =>
        expect(screen.queryByTestId('import-review-pane')).not.toBeNull(),
      );
      // The AI re-match button is still absent in the review stage (no key).
      expect(screen.queryByTestId('ai-rematch')).toBeNull();
    });

    it('fingerprint Skip Replace dialog', async () => {
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
      const { ImportTB } = await import('../ImportTB');
      const { computeImportFingerprint } = await import(
        '../../lib/import/fingerprint'
      );
      // Pre-compute the fingerprint the component WILL compute on accept so we
      // can seed an existingEntries entry that collides.
      const csvRows = [
        { Code: '4100', Name: 'Sales', Debit: '0', Credit: '1000' },
        { Code: '6400', Name: 'Wages & Salaries', Debit: '500', Credit: '0' },
        { Code: '1100', Name: 'Bank', Debit: '500', Credit: '0' },
      ];
      const asAt = new Date().toISOString().split('T')[0];
      const fp = await computeImportFingerprint(
        csvRows,
        { code: 'Code', name: 'Name', debit: 'Debit', credit: 'Credit' },
        'entity-1',
        asAt,
      );
      const existing: JournalEntry[] = [
        {
          _v: 3,
          id: 'existing-entry-1',
          date: asAt,
          reference: `OPENING-${asAt}`,
          description: 'prior import',
          isPosted: true,
          status: 'posted',
          lines: [
            {
              accountId: 'acc-1',
              description: 'old',
              debit: 0,
              credit: 1000,
              taxAmount: 0,
            },
          ],
          importFingerprint: fp,
        },
      ];
      const onImport = vi.fn();
      const onReplace = vi.fn();
      render(
        <ImportTB
          accounts={FIXTURE_ACCOUNTS}
          onImport={onImport}
          activeEntityId="entity-1"
          existingEntries={existing}
          onReplace={onReplace}
        />,
      );
      const fileInput = screen.getByTestId(
        'import-tb-file-input',
      ) as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [makeCsvFile()] } });
      });
      await waitFor(() =>
        expect(screen.queryByTestId('column-mapping')).not.toBeNull(),
      );
      fireEvent.change(screen.getByLabelText('map-code'), {
        target: { value: 'Code' },
      });
      fireEvent.change(screen.getByLabelText('map-name'), {
        target: { value: 'Name' },
      });
      fireEvent.change(screen.getByLabelText('map-debit'), {
        target: { value: 'Debit' },
      });
      fireEvent.change(screen.getByLabelText('map-credit'), {
        target: { value: 'Credit' },
      });
      fireEvent.click(screen.getByTestId('confirm-mapping'));
      await waitFor(() =>
        expect(screen.queryByTestId('import-review-pane')).not.toBeNull(),
      );
      await act(async () => {
        fireEvent.click(screen.getByTestId('accept-import'));
      });
      await waitFor(() =>
        expect(
          screen.queryByTestId('fingerprint-collision-dialog'),
        ).not.toBeNull(),
      );
      expect(screen.getByTestId('fp-skip')).not.toBeNull();
      expect(screen.getByTestId('fp-replace')).not.toBeNull();
      expect(screen.getByTestId('fp-additional')).not.toBeNull();
      // The Replace button MUST call onReplace, not onImport — this is the
      // TB double-count regression check.
      await act(async () => {
        fireEvent.click(screen.getByTestId('fp-replace'));
      });
      expect(onReplace).toHaveBeenCalledTimes(1);
      expect(onReplace.mock.calls[0][0]).toBe('existing-entry-1');
      const replacement = onReplace.mock.calls[0][1] as JournalEntry;
      expect(replacement.replacesEntryId).toBe('existing-entry-1');
      expect(replacement.status).toBe('posted');
      expect(onImport).not.toHaveBeenCalled();
    });

    it('single opening journal posted', async () => {
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
      const { ImportTB } = await import('../ImportTB');
      const onImport = vi.fn();
      render(
        <ImportTB
          accounts={FIXTURE_ACCOUNTS}
          onImport={onImport}
          activeEntityId="entity-1"
          existingEntries={[]}
        />,
      );
      const fileInput = screen.getByTestId(
        'import-tb-file-input',
      ) as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [makeCsvFile()] } });
      });
      await waitFor(() =>
        expect(screen.queryByTestId('column-mapping')).not.toBeNull(),
      );
      fireEvent.change(screen.getByLabelText('map-code'), {
        target: { value: 'Code' },
      });
      fireEvent.change(screen.getByLabelText('map-name'), {
        target: { value: 'Name' },
      });
      fireEvent.change(screen.getByLabelText('map-debit'), {
        target: { value: 'Debit' },
      });
      fireEvent.change(screen.getByLabelText('map-credit'), {
        target: { value: 'Credit' },
      });
      fireEvent.click(screen.getByTestId('confirm-mapping'));
      await waitFor(() =>
        expect(screen.queryByTestId('import-review-pane')).not.toBeNull(),
      );
      await act(async () => {
        fireEvent.click(screen.getByTestId('accept-import'));
      });
      await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
      const calledWith = onImport.mock.calls[0][0] as JournalEntry[];
      expect(calledWith.length).toBe(1);
      const entry = calledWith[0];
      expect(entry.isPosted).toBe(true);
      expect(entry.status).toBe('posted');
      expect(typeof entry.importFingerprint).toBe('string');
      expect(entry.importFingerprint!.length).toBe(64);
      expect(entry.lines.length).toBeGreaterThan(0);
    });

    it('XLSX flow opens sheet picker when multi-sheet', async () => {
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
      const { ImportTB } = await import('../ImportTB');
      render(<ImportTB accounts={FIXTURE_ACCOUNTS} onImport={vi.fn()} />);
      const fileInput = screen.getByTestId(
        'import-tb-file-input',
      ) as HTMLInputElement;
      // Two sheets, BOTH matching the regex (so the picker cannot auto-resolve)
      await act(async () => {
        fireEvent.change(fileInput, {
          target: { files: [makeXlsxFile(['Trial Balance', 'TB Detail'])] },
        });
      });
      await waitFor(() =>
        expect(
          screen.queryByTestId('xlsx-sheet-picker-modal'),
        ).not.toBeNull(),
      );
    });

    it('XLSX flow auto-selects single matching sheet', async () => {
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
      const { ImportTB } = await import('../ImportTB');
      render(<ImportTB accounts={FIXTURE_ACCOUNTS} onImport={vi.fn()} />);
      const fileInput = screen.getByTestId(
        'import-tb-file-input',
      ) as HTMLInputElement;
      // Two sheets — only 'Trial Balance' matches /trial|TB|balance/i;
      // 'Notes' does not. The picker should auto-select and never render.
      // But wait — 'TB' regex matches 'Notes'? No: 'Notes' contains no
      // 'trial', 'TB', or 'balance' (case-insensitive). Good.
      await act(async () => {
        fireEvent.change(fileInput, {
          target: { files: [makeXlsxFile(['Trial Balance', 'Notes'])] },
        });
      });
      // Picker modal should NOT render — the auto-select fires.
      await waitFor(() =>
        expect(screen.queryByTestId('column-mapping')).not.toBeNull(),
      );
      expect(screen.queryByTestId('xlsx-sheet-picker-modal')).toBeNull();
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
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
      const { ImportTB } = await import('../ImportTB');
      render(<ImportTB accounts={FIXTURE_ACCOUNTS} onImport={vi.fn()} />);
      expect(screen.queryByText(/Upload Trial Balance/i)).not.toBeNull();
      expect(mockFn).not.toHaveBeenCalled();
    });
  });
});
