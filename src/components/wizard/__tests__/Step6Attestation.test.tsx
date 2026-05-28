/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Step6Attestation } from '../Step6Attestation';
import type { Entity } from '../../../types';

function makeEntity(name: string = 'Acme Pty Ltd'): Entity {
  return {
    id: 'e1',
    name,
    type: 'Company',
    status: 'Active',
  };
}

describe('Step6Attestation', () => {
  it('Test S6.1: initial render — checkbox unchecked, text input empty, Finalise button disabled', () => {
    const entity = makeEntity();
    render(
      <Step6Attestation
        entity={entity}
        hasBlockingIssues={false}
        onBack={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    const finaliseBtn = screen.getByTestId('wizard-finalise');
    expect(finaliseBtn).toBeDisabled();
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('Test S6.2: check the box — button still disabled (name field empty)', async () => {
    const entity = makeEntity();
    render(
      <Step6Attestation
        entity={entity}
        hasBlockingIssues={false}
        onBack={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByTestId('wizard-finalise')).toBeDisabled();
  });

  it('Test S6.3: check box + type entity.name exactly → button enabled', async () => {
    const entity = makeEntity('Acme Pty Ltd');
    render(
      <Step6Attestation
        entity={entity}
        hasBlockingIssues={false}
        onBack={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.type(screen.getByRole('textbox'), 'Acme Pty Ltd');
    expect(screen.getByTestId('wizard-finalise')).not.toBeDisabled();
  });

  it('Test S6.4: check box + type entity.name in different case → button enabled (case-insensitive)', async () => {
    const entity = makeEntity('Acme Pty Ltd');
    render(
      <Step6Attestation
        entity={entity}
        hasBlockingIssues={false}
        onBack={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.type(screen.getByRole('textbox'), 'ACME PTY LTD');
    expect(screen.getByTestId('wizard-finalise')).not.toBeDisabled();
  });

  it('Test S6.5: check box + type partial match → button disabled', async () => {
    const entity = makeEntity('Acme Pty Ltd');
    render(
      <Step6Attestation
        entity={entity}
        hasBlockingIssues={false}
        onBack={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.type(screen.getByRole('textbox'), 'Acme');
    expect(screen.getByTestId('wizard-finalise')).toBeDisabled();
  });

  it('Test S6.6: component accepts onConfirm prop, called on Finalise click with no args', async () => {
    const entity = makeEntity('Acme Pty Ltd');
    const onConfirm = vi.fn();
    render(
      <Step6Attestation
        entity={entity}
        hasBlockingIssues={false}
        onBack={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.type(screen.getByRole('textbox'), 'Acme Pty Ltd');
    await userEvent.click(screen.getByTestId('wizard-finalise'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('Test S6.7: hasBlockingIssues=true → button disabled regardless of inputs', async () => {
    const entity = makeEntity('Acme Pty Ltd');
    render(
      <Step6Attestation
        entity={entity}
        hasBlockingIssues={true}
        onBack={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.type(screen.getByRole('textbox'), 'Acme Pty Ltd');
    expect(screen.getByTestId('wizard-finalise')).toBeDisabled();
  });
});
