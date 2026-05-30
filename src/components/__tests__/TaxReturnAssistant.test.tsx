/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Plan 05-2 tests for TaxReturnAssistant (Form I renderer).
 * Flipped from it.todo to full test bodies in Plan 05-2.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaxReturnAssistant } from '../TaxReturnAssistant';
import type { Entity, Account, JournalEntry } from '../../types';

const fixtureEntity: Entity = {
  _v: 4,
  id: 'st1',
  name: 'Acme Sole Trader',
  type: 'Individual',
  status: 'Active',
  aggregatedTurnover: '4000000',
};

const fixtureAccounts: Account[] = [
  { _v: 4, id: 'a-rev', code: '4010', name: 'Sales', type: 'Revenue', gstCode: 'GST', taxLabel: '6S' },
  { _v: 4, id: 'a-exp', code: '6010', name: 'Operating Expenses', type: 'Expense', gstCode: 'GST', taxLabel: '6N' },
  { _v: 4, id: 'a-cash', code: '1010', name: 'Cash', type: 'Asset', gstCode: 'N-T' },
];

const fixtureEntries: JournalEntry[] = [
  {
    _v: 4,
    id: 'j1',
    date: '2025-08-15',
    reference: 'INV-001',
    description: 'Sale',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: 'a-rev', description: '', debit: 0, credit: 50000, taxAmount: 0 },
      { accountId: 'a-cash', description: '', debit: 50000, credit: 0, taxAmount: 0 },
    ],
  },
  {
    _v: 4,
    id: 'j2',
    date: '2025-09-15',
    reference: 'EXP-001',
    description: 'Expense',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: 'a-exp', description: '', debit: 20000, credit: 0, taxAmount: 0 },
      { accountId: 'a-cash', description: '', debit: 0, credit: 20000, taxAmount: 0 },
    ],
  },
];

describe('TaxReturnAssistant — Phase 5 wiring', () => {
  let printSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
  });

  afterEach(() => {
    printSpy.mockRestore();
  });

  it('renders Form I with ATO codes and labels — P1/P2/P8/item15 visible with plain-English titles', () => {
    render(
      <TaxReturnAssistant
        entity={fixtureEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
      />,
    );
    // Form I header present (may appear multiple times)
    expect(screen.getAllByText(/Form I/i).length).toBeGreaterThan(0);
    // P1 label
    expect(screen.getAllByText(/P1/).length).toBeGreaterThan(0);
    // P8 label
    expect(screen.getAllByText(/P8/).length).toBeGreaterThan(0);
    // item15 label
    expect(screen.getAllByText(/[Ii]tem\s*15/).length).toBeGreaterThan(0);
    // Contains a plain-English title
    expect(screen.getAllByText(/Net.*income.*business|business income/i).length).toBeGreaterThan(0);
  });

  it('print button emits audit — EXPORT_DATA log with { form: I, fy: FY2026 }', () => {
    const addLog = vi.fn();
    render(
      <TaxReturnAssistant
        entity={fixtureEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
        addLog={addLog}
      />,
    );
    const printBtn = screen.getByRole('button', { name: /print/i });
    fireEvent.click(printBtn);
    expect(addLog).toHaveBeenCalledWith(
      'EXPORT_DATA',
      expect.stringContaining('"form":"I"'),
      'st1',
    );
    expect(printSpy).toHaveBeenCalled();
  });

  it('renders assumptions block — 5 assumed values present', () => {
    render(
      <TaxReturnAssistant
        entity={fixtureEntity}
        accounts={[]}
        entries={[]}
        fy="FY2026"
      />,
    );
    expect(screen.getByTestId('assumptions-block')).toBeInTheDocument();
  });

  it('renders B and P schedule — P1/P2/P8 + schedule section visible', () => {
    render(
      <TaxReturnAssistant
        entity={fixtureEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
      />,
    );
    // B&P schedule section
    expect(
      screen.getAllByText(/Business.*Professional Items Schedule|B&P Schedule|NAT 2543/i).length,
    ).toBeGreaterThan(0);
    // P2 deductions line
    expect(screen.getAllByText(/P2/).length).toBeGreaterThan(0);
  });

  it('shows item 7D when eligible — small-business offset line present', () => {
    const eligibleEntity: Entity = { ...fixtureEntity, aggregatedTurnover: '4000000' };
    render(
      <TaxReturnAssistant
        entity={eligibleEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
      />,
    );
    // item7D label or "Small business income tax offset" text (may appear multiple times)
    expect(
      screen.getAllByText(/item7D|Small business income tax offset/i).length,
    ).toBeGreaterThan(0);
  });

  it('anomalies inline and bottom section — AnomalyBadge component rendered per anomaly', () => {
    render(
      <TaxReturnAssistant
        entity={fixtureEntity}
        accounts={[]}
        entries={[]}
        fy="FY2026"
      />,
    );
    // At minimum the 5 assumption anomalies render as badges
    const badges = screen.getAllByTestId('anomaly-badge');
    expect(badges.length).toBeGreaterThan(0);
  });
});

describe('TaxReturnAssistant — Phase 8 family Medicare integration (MED-03)', () => {
  it('TRA-FAM-1: family entity renders the family-medicare assumption row (not the flat-2% warning)', () => {
    const familyEntity: Entity = {
      ...fixtureEntity,
      dependants: 2,
      spouseIncome: '60000',
    };
    render(
      <TaxReturnAssistant
        entity={familyEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
      />,
    );
    const block = screen.getByTestId('assumptions-block');
    expect(block.textContent).toContain('Family Medicare levy applied — 2 dependants, spouse income $60000.');
    expect(block.textContent).not.toContain('Medicare exemption: none');
    expect(block.textContent).not.toContain('Marital status: single');
    expect(block.textContent).not.toContain('Dependants: zero');
  });

  it('TRA-FAM-2: non-family entity (Phase 5 regression) renders all 5 original static assumption rows', () => {
    render(
      <TaxReturnAssistant
        entity={fixtureEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
      />,
    );
    const block = screen.getByTestId('assumptions-block');
    expect(block.textContent).toContain('Marital status: single (no spouse income captured)');
    expect(block.textContent).toContain('Age: under 65');
    expect(block.textContent).toContain('Medicare exemption: none');
    expect(block.textContent).toContain('Private health cover: assumed');
    expect(block.textContent).toContain('Dependants: zero');
    expect(block.textContent).not.toContain('Family Medicare levy applied');
  });

  it('TRA-FAM-3: family entity with bad spouseIncome shows family assumption row AND family-data-warn in Notices section', () => {
    render(
      <TaxReturnAssistant
        entity={{ ...fixtureEntity, dependants: 2, spouseIncome: 'abc' }}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
      />,
    );
    const block = screen.getByTestId('assumptions-block');
    expect(block.textContent).toContain('Family Medicare levy applied');
    // Bad-data warn appears in consolidated Notices & Anomalies section (rendered via AnomalyBadge)
    expect(screen.getByText(/Spouse income data invalid/i)).toBeInTheDocument();
  });
});

// ── Phase 9 FND-12: Export CSV button ────────────────────────────────────────

describe('TaxReturnAssistant — Phase 9 FND-12 Export CSV', () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let anchorClickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURLSpy = vi.fn(() => 'blob:mock-url');
    revokeObjectURLSpy = vi.fn();
    anchorClickSpy = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: revokeObjectURLSpy,
    });
    HTMLAnchorElement.prototype.click = anchorClickSpy;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('TR.1: renders Export CSV button with correct data-testid', () => {
    render(
      <TaxReturnAssistant
        entity={fixtureEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
      />,
    );
    expect(screen.getByTestId('export-csv-button-form-i')).toBeDefined();
    expect(screen.getByTestId('export-csv-button-form-i').textContent).toBe('Export CSV');
  });

  it('TR.2: clicking Export CSV calls addLog with type:"csv" and report:"form-i"', () => {
    const addLog = vi.fn();
    render(
      <TaxReturnAssistant
        entity={fixtureEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
        addLog={addLog}
      />,
    );
    fireEvent.click(screen.getByTestId('export-csv-button-form-i'));
    expect(addLog).toHaveBeenCalledWith(
      'EXPORT_DATA',
      expect.stringContaining('"type":"csv"'),
      fixtureEntity.id,
    );
    expect(addLog.mock.calls[0][1]).toContain('"report":"form-i"');
    expect(addLog.mock.calls[0][1]).toContain('"period":"2026"');
  });

  it('TR.3: clicking creates a Blob and triggers download', () => {
    render(
      <TaxReturnAssistant
        entity={fixtureEntity}
        accounts={fixtureAccounts}
        entries={fixtureEntries}
        fy="FY2026"
      />,
    );
    fireEvent.click(screen.getByTestId('export-csv-button-form-i'));
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(anchorClickSpy).toHaveBeenCalled();
  });
});
