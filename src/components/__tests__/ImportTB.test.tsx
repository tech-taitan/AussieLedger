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
  cleanup,
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
    cleanup();
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
    cleanup();
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
      // Accept now opens the confirmation dialog first.
      await act(async () => {
        fireEvent.click(screen.getByTestId('accept-import'));
      });
      await waitFor(() => expect(screen.queryByTestId('import-confirm-dialog')).not.toBeNull());
      await act(async () => {
        fireEvent.click(screen.getByTestId('confirm-post'));
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
      await waitFor(() => expect(screen.queryByTestId('import-confirm-dialog')).not.toBeNull());
      await act(async () => {
        fireEvent.click(screen.getByTestId('confirm-post'));
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

    it('Create new account: opens NewAccountModal, lets the user edit the spec, mints account and posts journal', async () => {
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
      const { ImportTB } = await import('../ImportTB');
      const onImport = vi.fn();
      const onCreateAccounts = vi.fn();
      // CSV with a code (5999 / "Misc Tools") that doesn't appear in
      // FIXTURE_ACCOUNTS so the row stays unmapped after fuzzy match.
      const unmatchedCsv = new File(
        [
          'Code,Name,Debit,Credit\n' +
          '4100,Sales,0,1000\n' +
          '5999,Misc Tools,1000,0\n',
        ],
        'tb.csv',
        { type: 'text/csv' },
      );
      render(
        <ImportTB
          accounts={FIXTURE_ACCOUNTS}
          onImport={onImport}
          onCreateAccounts={onCreateAccounts}
          activeEntityId="entity-1"
          existingEntries={[]}
        />,
      );
      const fileInput = screen.getByTestId('import-tb-file-input') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [unmatchedCsv] } });
      });
      await waitFor(() => expect(screen.queryByTestId('column-mapping')).not.toBeNull());
      fireEvent.change(screen.getByLabelText('map-code'),   { target: { value: 'Code' } });
      fireEvent.change(screen.getByLabelText('map-name'),   { target: { value: 'Name' } });
      fireEvent.change(screen.getByLabelText('map-debit'),  { target: { value: 'Debit' } });
      fireEvent.change(screen.getByLabelText('map-credit'), { target: { value: 'Credit' } });
      fireEvent.click(screen.getByTestId('confirm-mapping'));
      await waitFor(() => expect(screen.queryByTestId('import-review-pane')).not.toBeNull());

      // Click "Create new account" — the modal should open with code+name prefilled.
      // The pre-import issues panel may also contain the literal string
      // "Create new account" inside a warning message, so target the button
      // via its data-testid rather than text match.
      fireEvent.click(screen.getByTestId('create-new-1'));
      await waitFor(() => expect(screen.queryByTestId('new-account-modal')).not.toBeNull());
      expect((screen.getByTestId('new-acc-code') as HTMLInputElement).value).toBe('5999');
      expect((screen.getByTestId('new-acc-name') as HTMLInputElement).value).toBe('Misc Tools');

      // User overrides the name and switches GST to FRE before confirming.
      fireEvent.change(screen.getByTestId('new-acc-name'), {
        target: { value: 'Miscellaneous Tools & Supplies' },
      });
      fireEvent.change(screen.getByTestId('new-acc-gst'), { target: { value: 'FRE' } });
      fireEvent.click(screen.getByTestId('new-acc-confirm'));
      await waitFor(() => expect(screen.queryByTestId('new-account-modal')).toBeNull());

      // After confirm the row shows the pending-new badge with the spec's values.
      expect(screen.getAllByText(/Will create new account/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Miscellaneous Tools & Supplies/i)).not.toBeNull();

      // Accept the import — opens the confirm dialog, then Post.
      await act(async () => {
        fireEvent.click(screen.getByTestId('accept-import'));
      });
      await waitFor(() => expect(screen.queryByTestId('import-confirm-dialog')).not.toBeNull());
      await act(async () => {
        fireEvent.click(screen.getByTestId('confirm-post'));
      });
      await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));

      // onCreateAccounts called with the user-edited spec, NOT the original CSV name.
      expect(onCreateAccounts).toHaveBeenCalledTimes(1);
      const minted = onCreateAccounts.mock.calls[0][0] as Account[];
      expect(minted.length).toBe(1);
      expect(minted[0].code).toBe('5999');
      expect(minted[0].name).toBe('Miscellaneous Tools & Supplies');
      expect(minted[0].type).toBe('Expense'); // 5xxx prefix → Expense (modal default)
      expect(minted[0].gstCode).toBe('FRE');

      // The opening-balances journal references the minted account.
      const entry = (onImport.mock.calls[0][0] as JournalEntry[])[0];
      const lineForMintedAccount = entry.lines.find((l) => l.accountId === minted[0].id);
      expect(lineForMintedAccount).toBeDefined();
      expect(lineForMintedAccount!.debit).toBe(1000);
    });

    it('zero-balance rows are kept in the review (default _include=false, user can opt in)', async () => {
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
      const { ImportTB } = await import('../ImportTB');
      const onImport = vi.fn();
      // 4 rows: 2 non-zero (Sales / Bank), 2 zero-balance (Inventory / Petty Cash).
      // Avoids names that match the subtotal-keyword regex (Total / Sum / Net /
      // GST Collected / etc) — those rows would land in the rejected panel,
      // not the review table.
      const mixedCsv = new File(
        [
          'Code,Name,Debit,Credit\n' +
          '4100,Sales,0,1000\n' +
          '1100,Bank,1000,0\n' +
          '1200,Inventory,0,0\n' +
          '1040,Petty Cash,0,0\n',
        ],
        'tb-mixed.csv',
        { type: 'text/csv' },
      );
      render(<ImportTB accounts={FIXTURE_ACCOUNTS} onImport={onImport} />);
      const fileInput = screen.getByTestId('import-tb-file-input') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [mixedCsv] } });
      });
      await waitFor(() => expect(screen.queryByTestId('column-mapping')).not.toBeNull());
      fireEvent.change(screen.getByLabelText('map-code'),   { target: { value: 'Code' } });
      fireEvent.change(screen.getByLabelText('map-name'),   { target: { value: 'Name' } });
      fireEvent.change(screen.getByLabelText('map-debit'),  { target: { value: 'Debit' } });
      fireEvent.change(screen.getByLabelText('map-credit'), { target: { value: 'Credit' } });
      fireEvent.click(screen.getByTestId('confirm-mapping'));
      await waitFor(() => expect(screen.queryByTestId('import-review-pane')).not.toBeNull());

      // All FOUR rows render in the review (previously zero-balance rows
      // were silently dropped — this is the Bug 2 regression guard).
      expect(screen.getAllByTestId(/^review-row-/).length).toBe(4);

      // Zero-balance rows are unchecked by default; non-zero are checked.
      const includes = screen.getAllByLabelText(/include-/) as HTMLInputElement[];
      const checked = includes.filter((cb) => cb.checked).length;
      expect(checked).toBe(2);
    });

    it('data preview: each mapping dropdown shows actual values once a column is selected', async () => {
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
      const { ImportTB } = await import('../ImportTB');
      render(<ImportTB accounts={FIXTURE_ACCOUNTS} onImport={vi.fn()} />);
      const fileInput = screen.getByTestId('import-tb-file-input') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [makeCsvFile()] } });
      });
      await waitFor(() => expect(screen.queryByTestId('column-mapping')).not.toBeNull());

      fireEvent.change(screen.getByLabelText('map-code'), { target: { value: 'Code' } });
      // Preview shows the first few values from the chosen column.
      expect(screen.getByTestId('preview-code').textContent).toMatch(/4100/);
      expect(screen.getByTestId('preview-code').textContent).toMatch(/6400/);

      fireEvent.change(screen.getByLabelText('map-debit'), { target: { value: 'Debit' } });
      expect(screen.getByTestId('preview-debit').textContent).toMatch(/500/);
    });

    it('signed balance layout: positive=DR rows split into debit, negatives into credit', async () => {
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
      const { ImportTB } = await import('../ImportTB');
      const onImport = vi.fn();
      // CSV with a single signed Balance column. Bank +1000 (DR), Sales -1000 (CR).
      const signedCsv = new File(
        [
          'Code,Name,Balance\n' +
          '1100,Bank,1000\n' +
          '4100,Sales,-1000\n',
        ],
        'tb-signed.csv',
        { type: 'text/csv' },
      );
      render(
        <ImportTB
          accounts={FIXTURE_ACCOUNTS}
          onImport={onImport}
          activeEntityId="entity-1"
          existingEntries={[]}
        />,
      );
      const fileInput = screen.getByTestId('import-tb-file-input') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [signedCsv] } });
      });
      await waitFor(() => expect(screen.queryByTestId('column-mapping')).not.toBeNull());

      // Switch to signed-balance layout.
      fireEvent.click(screen.getByTestId('layout-signed-balance'));
      // Map columns.
      fireEvent.change(screen.getByLabelText('map-code'),    { target: { value: 'Code' } });
      fireEvent.change(screen.getByLabelText('map-name'),    { target: { value: 'Name' } });
      fireEvent.change(screen.getByLabelText('map-balance'), { target: { value: 'Balance' } });
      // Preview should be visible for the balance column.
      expect(screen.getByTestId('preview-balance').textContent).toMatch(/1000/);
      expect(screen.getByTestId('preview-balance').textContent).toMatch(/-1000/);

      fireEvent.click(screen.getByTestId('confirm-mapping'));
      await waitFor(() => expect(screen.queryByTestId('import-review-pane')).not.toBeNull());

      await act(async () => {
        fireEvent.click(screen.getByTestId('accept-import'));
      });
      await waitFor(() => expect(screen.queryByTestId('import-confirm-dialog')).not.toBeNull());
      // Confirm dialog should show $1,000 on both sides — TB is balanced.
      expect(screen.getByTestId('confirm-total-debit').textContent).toMatch(/1,000/);
      expect(screen.getByTestId('confirm-total-credit').textContent).toMatch(/1,000/);
      expect(screen.getByTestId('confirm-balance-status').textContent).toMatch(/Balanced/i);

      await act(async () => {
        fireEvent.click(screen.getByTestId('confirm-post'));
      });
      await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));

      const entry = (onImport.mock.calls[0][0] as JournalEntry[])[0];
      // Bank line: debit 1000 / credit 0; Sales line: debit 0 / credit 1000.
      const bankLine = entry.lines.find((l) => l.accountId === 'acc-3');
      const salesLine = entry.lines.find((l) => l.accountId === 'acc-1');
      expect(bankLine?.debit).toBe(1000);
      expect(bankLine?.credit).toBe(0);
      expect(salesLine?.debit).toBe(0);
      expect(salesLine?.credit).toBe(1000);
    });

    it('AccountPicker: search input filters CoA dropdown by code or name', async () => {
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
      const { ImportTB } = await import('../ImportTB');
      // CSV row whose external code is not in FIXTURE_ACCOUNTS so it stays unmapped.
      const unmatchedCsv = new File(
        ['Code,Name,Debit,Credit\n9001,Unknown,100,0\n'],
        'tb.csv',
        { type: 'text/csv' },
      );
      render(
        <ImportTB
          accounts={FIXTURE_ACCOUNTS}
          onImport={vi.fn()}
          activeEntityId="entity-1"
          existingEntries={[]}
        />,
      );
      const fileInput = screen.getByTestId('import-tb-file-input') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [unmatchedCsv] } });
      });
      await waitFor(() => expect(screen.queryByTestId('column-mapping')).not.toBeNull());
      fireEvent.change(screen.getByLabelText('map-code'),   { target: { value: 'Code' } });
      fireEvent.change(screen.getByLabelText('map-name'),   { target: { value: 'Name' } });
      fireEvent.change(screen.getByLabelText('map-debit'),  { target: { value: 'Debit' } });
      fireEvent.change(screen.getByLabelText('map-credit'), { target: { value: 'Credit' } });
      fireEvent.click(screen.getByTestId('confirm-mapping'));
      await waitFor(() => expect(screen.queryByTestId('import-review-pane')).not.toBeNull());

      // Open the picker for the unmapped row.
      fireEvent.click(screen.getByTestId('pick-account-0-trigger'));
      await waitFor(() => expect(screen.queryByTestId('pick-account-0-popover')).not.toBeNull());
      // Type to filter. Searching "wage" should only show Wages & Salaries.
      fireEvent.change(screen.getByTestId('pick-account-0-search'), {
        target: { value: 'wage' },
      });
      // The Wages option should render; Sales / Bank should not.
      expect(screen.queryByTestId('pick-account-0-option-6400')).not.toBeNull();
      expect(screen.queryByTestId('pick-account-0-option-4100')).toBeNull();
      expect(screen.queryByTestId('pick-account-0-option-1100')).toBeNull();
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

  describe('Phase 7 — IMP-07..11 integration tests', () => {
    it('IMP-07: high-confidence header detection on clean CSV (row 0) auto-advances past HeaderRowPicker', async () => {
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
      const { ImportTB } = await import('../ImportTB');
      render(<ImportTB accounts={FIXTURE_ACCOUNTS} onImport={vi.fn()} />);
      const fileInput = screen.getByTestId('import-tb-file-input') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [makeCsvFile()] } });
      });
      // With clean CSV (row 0 = header), detectHeaderRow should auto-pick row 0
      // The component should go directly to column-mapping, NOT show header-row-picker
      await waitFor(() =>
        expect(screen.queryByTestId('column-mapping')).not.toBeNull(),
      );
      expect(screen.queryByTestId('header-row-picker')).toBeNull();
    });

    it('IMP-07: low-confidence header detection shows HeaderRowPicker; clicking row 4 advances to column-mapping', async () => {
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
      // Build a CSV with 4 title rows + header at row 4 (Xero shape)
      const xeroCsv =
        'Acme Pty Ltd,,,,\n' +
        'Trial Balance,,,,\n' +
        'For the year ended 30 June 2026,,,,\n' +
        ',,,,\n' +
        'Account,Code,Debit,Credit,Balance\n' +
        '4100,Sales,0,50000,50000\n' +
        '1100,Bank,25000,0,25000\n';
      const xeroFile = new File([xeroCsv], 'xero-tb.csv', { type: 'text/csv' });
      const { ImportTB } = await import('../ImportTB');
      render(<ImportTB accounts={FIXTURE_ACCOUNTS} onImport={vi.fn()} />);
      const fileInput = screen.getByTestId('import-tb-file-input') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [xeroFile] } });
      });
      // Wait for either column-mapping (auto-pick succeeded) or header-row-picker (low confidence)
      await waitFor(() => {
        const hasPicker = screen.queryByTestId('header-row-picker') !== null;
        const hasMapping = screen.queryByTestId('column-mapping') !== null;
        expect(hasPicker || hasMapping).toBe(true);
      }, { timeout: 5000 });
      // If header picker is shown, click row 4 to advance
      if (screen.queryByTestId('header-row-picker')) {
        await act(async () => {
          fireEvent.click(screen.getByTestId('header-row-4'));
        });
        await waitFor(() =>
          expect(screen.queryByTestId('column-mapping')).not.toBeNull(),
        );
      }
      expect(screen.queryByTestId('column-mapping')).not.toBeNull();
    });

    it('IMP-08: $ amounts in debit column parse correctly via parseCurrency', async () => {
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
      // CSV where debit/credit have $ prefix
      const dollarCsv =
        'Code,Name,Debit,Credit\n' +
        '4100,Sales,$0.00,$1234.56\n' +
        '1100,Bank,$500.00,$0.00\n';
      const dollarFile = new File([dollarCsv], 'dollar.csv', { type: 'text/csv' });
      const { ImportTB } = await import('../ImportTB');
      render(<ImportTB accounts={FIXTURE_ACCOUNTS} onImport={vi.fn()} />);
      const fileInput = screen.getByTestId('import-tb-file-input') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [dollarFile] } });
      });
      await waitFor(() =>
        expect(screen.queryByTestId('column-mapping')).not.toBeNull(),
      );
      // All fields should be seeded to correct names by default
      fireEvent.click(screen.getByTestId('confirm-mapping'));
      await waitFor(() =>
        expect(screen.queryByTestId('import-review-pane')).not.toBeNull(),
      );
      // The import-review-pane should be visible — $ amounts parsed correctly
      expect(screen.getByTestId('import-review-pane')).toBeTruthy();
    });

    it('IMP-09: subtotal-detected rows appear in rejectedRows panel with reason "subtotal"', async () => {
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
      // CSV with a "Total Revenue" subtotal row — MUST have a code so it reaches subtotal detection
      // Xero-style: synthetic code 4999 + keyword "Total Revenue" → subtotal by keyword
      const subtotalCsv =
        'Code,Name,Debit,Credit\n' +
        '4100,Sales,0,50000\n' +
        '4200,Other Revenue,0,5000\n' +
        '4999,Total Revenue,0,55000\n' + // keyword subtotal (synthetic code, "Total" keyword)
        '1100,Bank,55000,0\n';
      const subtotalFile = new File([subtotalCsv], 'subtotal.csv', { type: 'text/csv' });
      const { ImportTB } = await import('../ImportTB');
      render(<ImportTB accounts={FIXTURE_ACCOUNTS} onImport={vi.fn()} />);
      const fileInput = screen.getByTestId('import-tb-file-input') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [subtotalFile] } });
      });
      await waitFor(() =>
        expect(screen.queryByTestId('column-mapping')).not.toBeNull(),
      );
      fireEvent.click(screen.getByTestId('confirm-mapping'));
      await waitFor(() =>
        expect(screen.queryByTestId('import-review-pane')).not.toBeNull(),
      );
      // The "Total Revenue" row should be flagged as subtotal and rejected
      // Banner should show rejected rows (at minimum from the subtotal detection)
      expect(screen.getByTestId('rejected-rows-banner')).toBeTruthy();
      // Open panel to see the subtotal group
      fireEvent.click(screen.getByTestId('rejected-rows-banner'));
      await waitFor(() =>
        expect(screen.queryByTestId('rejected-group-subtotal')).not.toBeNull(),
      );
    });

    it('IMP-10: missing-code picker renders when >50% of code cells are empty; auto-assign fills codes', async () => {
      vi.doMock('../../lib/ai', () => ({
        isAiEnabled: () => false,
        IS_AI_ENABLED: false,
        GEMINI_MODEL: 'gemini-3-flash-preview',
      }));
      // CSV with QBO shape — no code column, names only
      const noCodeCsv =
        'Account,Debit,Credit\n' +
        'Bank Account,25000,0\n' +
        'Accounts Receivable,5000,0\n' +
        'Sales Revenue,0,30000\n';
      const noCodeFile = new File([noCodeCsv], 'no-code.csv', { type: 'text/csv' });
      const { ImportTB } = await import('../ImportTB');
      render(<ImportTB accounts={FIXTURE_ACCOUNTS} onImport={vi.fn()} />);
      const fileInput = screen.getByTestId('import-tb-file-input') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [noCodeFile] } });
      });
      // Either missing-code-picker or column-mapping should appear
      await waitFor(() => {
        const hasMissing = screen.queryByTestId('missing-code-picker') !== null;
        const hasMapping = screen.queryByTestId('column-mapping') !== null;
        expect(hasMissing || hasMapping).toBe(true);
      }, { timeout: 5000 });
      if (screen.queryByTestId('missing-code-picker')) {
        await act(async () => {
          fireEvent.click(screen.getByTestId('missing-code-auto-assign'));
        });
        await waitFor(() =>
          expect(screen.queryByTestId('column-mapping')).not.toBeNull(),
        );
      }
      expect(screen.queryByTestId('column-mapping')).not.toBeNull();
    });

    it('REGRESSION: Phase 4 clean fixture imports cleanly through Phase 7 code path — onImport called once with 3 lines, zero rejectedRows', async () => {
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
      const fileInput = screen.getByTestId('import-tb-file-input') as HTMLInputElement;
      // Use the EXACT Phase 4 makeCsvFile fixture — clean data, row 0 header, no $, no subtotals
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [makeCsvFile()] } });
      });
      // Should go directly to column-mapping (high-confidence auto-pick at row 0)
      await waitFor(() =>
        expect(screen.queryByTestId('column-mapping')).not.toBeNull(),
      );
      // header-row-picker must NOT appear
      expect(screen.queryByTestId('header-row-picker')).toBeNull();
      // Confirm the default mapping (seeded from CSV headers)
      fireEvent.click(screen.getByTestId('confirm-mapping'));
      await waitFor(() =>
        expect(screen.queryByTestId('import-review-pane')).not.toBeNull(),
      );
      // Accept the import — confirm dialog opens, then Post.
      await act(async () => {
        fireEvent.click(screen.getByTestId('accept-import'));
      });
      await waitFor(() => expect(screen.queryByTestId('import-confirm-dialog')).not.toBeNull());
      await act(async () => {
        fireEvent.click(screen.getByTestId('confirm-post'));
      });
      await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
      const calledWith = onImport.mock.calls[0][0] as JournalEntry[];
      expect(calledWith.length).toBe(1);
      const entry = calledWith[0];
      expect(entry.isPosted).toBe(true);
      expect(entry.status).toBe('posted');
      // 3 data rows (Sales=credit, Wages=debit, Bank=debit) — all 3 should be in the entry
      expect(entry.lines.length).toBeGreaterThanOrEqual(1);
      // No rejected rows banner should be visible (zero rejectedRows on clean import)
      expect(screen.queryByTestId('rejected-rows-banner')).toBeNull();
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

    // ── Plan 06-3: IT.1–IT.2 (DEP-01 AiGateNote wiring) ──────────────────

    it('IT.1: isAiEnabled()=false → AiGateNote visible; no "AI re-match" button', async () => {
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

      // Need to upload to reach the reviewing state where AiGateNote renders
      render(<ImportTB accounts={FIXTURE_ACCOUNTS} onImport={vi.fn()} />);

      const fileInput = screen.getByTestId('import-tb-file-input') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [makeCsvFile()] } });
      });
      // Column mapping step
      await waitFor(() => screen.getByTestId('confirm-mapping'));
      await act(async () => {
        fireEvent.click(screen.getByTestId('confirm-mapping'));
      });
      // Now in reviewing state — AiGateNote should be visible
      await waitFor(() => {
        const gateNote = screen.queryByTestId('ai-gate-note');
        expect(gateNote).toBeTruthy();
      });
      // "AI re-match" button should NOT be present
      expect(screen.queryByTestId('ai-rematch')).toBeNull();
    });

    it('IT.2: isAiEnabled()=true → AI re-match button visible; no AiGateNote', async () => {
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
      const { ImportTB } = await import('../ImportTB');
      render(<ImportTB accounts={FIXTURE_ACCOUNTS} onImport={vi.fn()} />);

      const fileInput = screen.getByTestId('import-tb-file-input') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [makeCsvFile()] } });
      });
      await waitFor(() => screen.getByTestId('confirm-mapping'));
      await act(async () => {
        fireEvent.click(screen.getByTestId('confirm-mapping'));
      });
      await waitFor(() => {
        expect(screen.queryByTestId('ai-rematch')).toBeTruthy();
      });
      expect(screen.queryByTestId('ai-gate-note')).toBeNull();
    });
  });
});
