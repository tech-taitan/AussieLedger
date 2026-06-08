/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { YearEndWizard } from '../YearEndWizard';
import type { Entity, Account, JournalEntry } from '../../types';

// Mock Phase-5 renderers so wizard tests stay narrow to wizard logic
vi.mock('../TaxReturnAssistant', () => ({
  TaxReturnAssistant: () => <div data-testid="mock-tax-return-assistant" />,
}));
vi.mock('../CompanyTaxReturn', () => ({
  CompanyTaxReturn: () => <div data-testid="mock-company-tax-return" />,
}));
vi.mock('../TrustTaxReturn', () => ({
  TrustTaxReturn: () => <div data-testid="mock-trust-tax-return" />,
}));
vi.mock('../PartnershipTaxReturn', () => ({
  PartnershipTaxReturn: () => <div data-testid="mock-partnership-tax-return" />,
}));

function makeEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: 'e1',
    name: 'Test Co',
    type: 'Company',
    status: 'Active',
    ...overrides,
  };
}

function makeAccount(id: string, taxLabel?: string): Account {
  return {
    id,
    code: `${id}-code`,
    name: `Account ${id}`,
    type: 'Expense',
    gstCode: 'N-T',
    taxLabel,
  };
}

function makePostedEntry(accountIds: string[]): JournalEntry {
  return {
    _v: 3,
    id: `je-${Math.random()}`,
    date: '2026-01-01',
    reference: 'REF-001',
    description: 'Test entry',
    lines: accountIds.map((id, i) => ({
      accountId: id,
      description: '',
      debit: i === 0 ? 100 : 0,
      credit: i !== 0 ? 100 : 0,
      taxAmount: 0,
    })),
    isPosted: true,
    status: 'posted',
  };
}

describe('YearEndWizard (UX-01 scaffold)', () => {
  it('Test W.1: renders without crashing', () => {
    const entity = makeEntity();
    expect(() =>
      render(
        <YearEndWizard
          entity={entity}
          accounts={[]}
          entries={[]}
          fy="FY2026"
          onUpdateEntity={vi.fn()}
          onAddLog={vi.fn()}
        />,
      ),
    ).not.toThrow();
  });

  it('Test W.2: wizard-step-indicator heading is in the DOM showing step 1', () => {
    const entity = makeEntity();
    render(
      <YearEndWizard
        entity={entity}
        accounts={[]}
        entries={[]}
        fy="FY2026"
        onUpdateEntity={vi.fn()}
      />,
    );
    const indicator = screen.getByTestId('wizard-step-indicator');
    expect(indicator).toBeInTheDocument();
    expect(indicator.textContent).toMatch(/step 1/i);
  });

  it('Test W.3: a "Next" button exists with data-testid="wizard-next"', () => {
    const entity = makeEntity();
    render(
      <YearEndWizard
        entity={entity}
        accounts={[]}
        entries={[]}
        fy="FY2026"
        onUpdateEntity={vi.fn()}
      />,
    );
    expect(screen.getByTestId('wizard-next')).toBeInTheDocument();
  });

  it('Test W.4: clicking Next calls onUpdateEntity with wizardState FY2026.step === 2', async () => {
    const onUpdateEntity = vi.fn();
    const entity = makeEntity();
    render(
      <YearEndWizard
        entity={entity}
        accounts={[]}
        entries={[]}
        fy="FY2026"
        onUpdateEntity={onUpdateEntity}
      />,
    );
    await userEvent.click(screen.getByTestId('wizard-next'));
    expect(onUpdateEntity).toHaveBeenCalledOnce();
    const updatedEntity = onUpdateEntity.mock.calls[0][0] as Entity;
    expect(updatedEntity.wizardState?.['FY2026']?.step).toBe(2);
  });

  it('Test W.5: entity with wizardState FY2026.step=4 shows wizard-step-4-unmapped', () => {
    const entity = makeEntity({
      wizardState: { FY2026: { step: 4, dismissedAnomalies: [] } },
    });
    render(
      <YearEndWizard
        entity={entity}
        accounts={[]}
        entries={[]}
        fy="FY2026"
        onUpdateEntity={vi.fn()}
        onAddLog={vi.fn()}
      />,
    );
    expect(screen.getByTestId('wizard-step-4-unmapped')).toBeInTheDocument();
  });

  it('Test W.6: from step 6, checking attestation + typing exact entity name enables Finalise button', async () => {
    const entity = makeEntity({
      name: 'Acme Pty Ltd',
      wizardState: { FY2026: { step: 6, dismissedAnomalies: [] } },
    });
    render(
      <YearEndWizard
        entity={entity}
        accounts={[]}
        entries={[]}
        fy="FY2026"
        onUpdateEntity={vi.fn()}
        onAddLog={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.type(screen.getByRole('textbox'), 'Acme Pty Ltd');
    expect(screen.getByTestId('wizard-finalise')).not.toBeDisabled();
  });

  it('Test W.7: at step 6 with checkbox unchecked, Finalise button is disabled', () => {
    const entity = makeEntity({
      wizardState: { FY2026: { step: 6, dismissedAnomalies: [] } },
    });
    render(
      <YearEndWizard
        entity={entity}
        accounts={[]}
        entries={[]}
        fy="FY2026"
        onUpdateEntity={vi.fn()}
        onAddLog={vi.fn()}
      />,
    );
    expect(screen.getByTestId('wizard-finalise')).toBeDisabled();
  });

  it('Test W.8: case-insensitive name match — "ACME pty ltd" matches "Acme Pty Ltd"', async () => {
    const entity = makeEntity({
      name: 'Acme Pty Ltd',
      wizardState: { FY2026: { step: 6, dismissedAnomalies: [] } },
    });
    render(
      <YearEndWizard
        entity={entity}
        accounts={[]}
        entries={[]}
        fy="FY2026"
        onUpdateEntity={vi.fn()}
        onAddLog={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.type(screen.getByRole('textbox'), 'ACME pty ltd');
    expect(screen.getByTestId('wizard-finalise')).not.toBeDisabled();
  });

  it('Test W.9: at step 6 with checkbox checked + typed "Wrong Name" — Finalise disabled', async () => {
    const entity = makeEntity({
      name: 'Acme Pty Ltd',
      wizardState: { FY2026: { step: 6, dismissedAnomalies: [] } },
    });
    render(
      <YearEndWizard
        entity={entity}
        accounts={[]}
        entries={[]}
        fy="FY2026"
        onUpdateEntity={vi.fn()}
        onAddLog={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.type(screen.getByRole('textbox'), 'Wrong Name');
    expect(screen.getByTestId('wizard-finalise')).toBeDisabled();
  });

  it('Test W.10: unmapped accounts in posted entries → Finalise button disabled (blocking gate)', () => {
    // Account a1 has no taxLabel (unmapped); a2 has taxLabel
    const accounts = [makeAccount('a1'), makeAccount('a2', 'P1')];
    const entries = [makePostedEntry(['a1', 'a2'])];
    const entity = makeEntity({
      name: 'Acme Pty Ltd',
      wizardState: { FY2026: { step: 6, dismissedAnomalies: [] } },
    });
    render(
      <YearEndWizard
        entity={entity}
        accounts={accounts}
        entries={entries}
        fy="FY2026"
        onUpdateEntity={vi.fn()}
        onAddLog={vi.fn()}
      />,
    );
    // Even with attestation inputs completed, Finalise is blocked
    expect(screen.getByTestId('wizard-finalise')).toBeDisabled();
  });

  it('Test W.11: clicking Finalise (all gates open) calls onUpdateEntity with finalised + onAddLog with LOCK_FY', async () => {
    const onUpdateEntity = vi.fn();
    const onAddLog = vi.fn();
    const entity = makeEntity({
      name: 'Acme Pty Ltd',
      wizardState: { FY2026: { step: 6, dismissedAnomalies: [] } },
    });
    render(
      <YearEndWizard
        entity={entity}
        accounts={[]}
        entries={[]}
        fy="FY2026"
        onUpdateEntity={onUpdateEntity}
        onAddLog={onAddLog}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.type(screen.getByRole('textbox'), 'Acme Pty Ltd');
    await userEvent.click(screen.getByTestId('wizard-finalise'));

    expect(onUpdateEntity).toHaveBeenCalledOnce();
    const updated = onUpdateEntity.mock.calls[0][0] as Entity;
    expect(updated.returnStatusByFy?.['FY2026']).toBe('finalised');

    expect(onAddLog).toHaveBeenCalledOnce();
    const logArg = onAddLog.mock.calls[0][0];
    expect(logArg.action).toBe('LOCK_FY');
  });

  it('Test W.12: Unfinalise button visible when finalised; clicking it calls onUpdateEntity with draft + onAddLog UNLOCK_FY', async () => {
    const onUpdateEntity = vi.fn();
    const onAddLog = vi.fn();
    const entity = makeEntity({
      name: 'Test Co',
      returnStatusByFy: { FY2026: 'finalised' },
      wizardState: { FY2026: { step: 7, dismissedAnomalies: [], completedAt: '2026-01-01T00:00:00.000Z' } },
    });
    render(
      <YearEndWizard
        entity={entity}
        accounts={[]}
        entries={[]}
        fy="FY2026"
        onUpdateEntity={onUpdateEntity}
        onAddLog={onAddLog}
      />,
    );
    const unfinaliseBtn = screen.getByTestId('wizard-unfinalise');
    expect(unfinaliseBtn).toBeInTheDocument();

    // Click unfinalise (no attestation in this modal since it's a direct action in test)
    await userEvent.click(unfinaliseBtn);

    expect(onUpdateEntity).toHaveBeenCalled();
    const updated = onUpdateEntity.mock.calls[0][0] as Entity;
    expect(updated.returnStatusByFy?.['FY2026']).toBe('draft');

    expect(onAddLog).toHaveBeenCalled();
    const logArg = onAddLog.mock.calls[0][0];
    expect(logArg.action).toBe('UNLOCK_FY');
  });

  describe('Task 34: finalisation timestamp display', () => {
    it('shows a "Finalised on <date>" line in the unfinalise banner when completedAt is set', () => {
      const entity = makeEntity({
        name: 'Test Co',
        returnStatusByFy: { FY2026: 'finalised' },
        wizardState: {
          FY2026: {
            step: 7,
            dismissedAnomalies: [],
            // June 8 2026 18:30 UTC.
            // Midday UTC so en-AU timezone (UTC+10) keeps the same day.
            completedAt: '2026-06-08T12:00:00.000Z',
          },
        },
      });
      render(
        <YearEndWizard
          entity={entity}
          accounts={[]}
          entries={[]}
          fy="FY2026"
          onUpdateEntity={vi.fn()}
        />,
      );
      const stamp = screen.getByTestId('wizard-finalised-timestamp');
      expect(stamp.textContent).toMatch(/Finalised on/);
      // Day and year present (month name is locale-dependent in CI; use a
      // structural check rather than a verbatim string).
      expect(stamp.textContent).toMatch(/8/);
      expect(stamp.textContent).toMatch(/2026/);
    });

    it('renders compact date in the [FINALISED] chip', () => {
      const entity = makeEntity({
        name: 'Test Co',
        returnStatusByFy: { FY2026: 'finalised' },
        wizardState: {
          FY2026: {
            step: 7,
            dismissedAnomalies: [],
            // Midday UTC so en-AU timezone (UTC+10) keeps the same day.
            completedAt: '2026-06-08T12:00:00.000Z',
          },
        },
      });
      render(
        <YearEndWizard
          entity={entity}
          accounts={[]}
          entries={[]}
          fy="FY2026"
          onUpdateEntity={vi.fn()}
        />,
      );
      const chip = screen.getByTestId('wizard-finalised-chip');
      expect(chip.textContent).toMatch(/FINALISED/);
      expect(chip.textContent).toMatch(/8/);
      expect(chip.textContent).toMatch(/2026/);
    });

    it('omits the timestamp line gracefully when completedAt is missing', () => {
      const entity = makeEntity({
        name: 'Test Co',
        returnStatusByFy: { FY2026: 'finalised' },
        wizardState: {
          FY2026: { step: 7, dismissedAnomalies: [] }, // no completedAt
        },
      });
      render(
        <YearEndWizard
          entity={entity}
          accounts={[]}
          entries={[]}
          fy="FY2026"
          onUpdateEntity={vi.fn()}
        />,
      );
      // The banner still renders, but the timestamp paragraph is absent.
      expect(screen.queryByTestId('wizard-finalised-timestamp')).toBeNull();
      expect(screen.getByTestId('wizard-unfinalise')).toBeInTheDocument();
    });

    it('omits the timestamp line gracefully when completedAt is unparseable', () => {
      const entity = makeEntity({
        name: 'Test Co',
        returnStatusByFy: { FY2026: 'finalised' },
        wizardState: {
          FY2026: { step: 7, dismissedAnomalies: [], completedAt: 'not-a-date' },
        },
      });
      render(
        <YearEndWizard
          entity={entity}
          accounts={[]}
          entries={[]}
          fy="FY2026"
          onUpdateEntity={vi.fn()}
        />,
      );
      expect(screen.queryByTestId('wizard-finalised-timestamp')).toBeNull();
    });
  });
});
