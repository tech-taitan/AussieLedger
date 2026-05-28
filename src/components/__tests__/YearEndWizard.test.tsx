/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { YearEndWizard } from '../YearEndWizard';
import type { Entity } from '../../types';

function makeEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: 'e1',
    name: 'Test Co',
    type: 'Company',
    status: 'Active',
    ...overrides,
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
});
