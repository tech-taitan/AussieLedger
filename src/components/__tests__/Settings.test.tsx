/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Settings component tests — SET.1–SET.4 (Plan 06-3 UX-05, PERS-01).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Settings } from '../Settings';
import type { Entity } from '../../types';

const entityA: Entity = {
  id: 'e1', name: 'Acme Pty Ltd', type: 'Company', status: 'Active',
};
const entityB: Entity = {
  id: 'e2', name: 'Beta Trust', type: 'Trust', status: 'Active',
};

describe('Settings component (Plan 06-3 SET.1–SET.4)', () => {
  it('SET.1: renders mode toggle with current value "owner"', () => {
    render(
      <Settings
        settings={{ mode: 'owner' }}
        onChange={vi.fn()}
        onClearSettings={vi.fn()}
        entities={[]}
      />
    );
    const toggle = screen.getByTestId('settings-mode-toggle') as HTMLSelectElement;
    expect(toggle.value).toBe('owner');
  });

  it('SET.2: switching toggle to "agent" calls onChange with {mode:"agent"}', () => {
    const onChange = vi.fn();
    render(
      <Settings
        settings={{ mode: 'owner' }}
        onChange={onChange}
        onClearSettings={vi.fn()}
        entities={[]}
      />
    );
    const toggle = screen.getByTestId('settings-mode-toggle');
    fireEvent.change(toggle, { target: { value: 'agent' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'agent' })
    );
  });

  it('SET.3: owner + 2 entities → primary-entity radio list shown; selecting calls onChange with primaryEntityId', () => {
    const onChange = vi.fn();
    render(
      <Settings
        settings={{ mode: 'owner' }}
        onChange={onChange}
        onClearSettings={vi.fn()}
        entities={[entityA, entityB]}
      />
    );
    const radioGroup = screen.getByTestId('settings-primary-entity');
    expect(radioGroup).toBeTruthy();
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(radios[1]);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ primaryEntityId: 'e2' })
    );
  });

  it('SET.4: "Show mode prompt again" button calls onClearSettings', () => {
    const onClearSettings = vi.fn();
    render(
      <Settings
        settings={{ mode: 'owner' }}
        onChange={vi.fn()}
        onClearSettings={onClearSettings}
        entities={[]}
      />
    );
    const btn = screen.getByTestId('settings-clear');
    fireEvent.click(btn);
    expect(onClearSettings).toHaveBeenCalledOnce();
  });
});

describe('Settings POL-CODE-05 — Active Entity section', () => {
  it('SET.5: activeEntity passed → section heading + entity name + Edit Entity Details button render', () => {
    render(
      <Settings
        settings={{ mode: 'owner' }}
        onChange={vi.fn()}
        onClearSettings={vi.fn()}
        entities={[entityA]}
        activeEntity={entityA}
        onEditActiveEntity={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { name: /active entity/i })).toBeTruthy();
    // Acme appears in both the Primary Entity card (1-entity display) and
    // the Active Entity card — assert presence via getAllByText, then
    // confirm the Edit button (Active Entity card affordance) is rendered.
    expect(screen.getAllByText(/acme pty ltd/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /edit entity details/i })).toBeTruthy();
  });

  it('SET.6: activeEntity undefined → section heading + empty-state copy + NO Edit button', () => {
    render(
      <Settings
        settings={{ mode: 'owner' }}
        onChange={vi.fn()}
        onClearSettings={vi.fn()}
        entities={[]}
        activeEntity={undefined}
        onEditActiveEntity={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { name: /active entity/i })).toBeTruthy();
    expect(screen.getByText(/no active entity selected/i)).toBeTruthy();
    expect(screen.getByText(/select an entity from the master dashboard to edit/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /edit entity details/i })).toBeNull();
  });

  it('SET.7: clicking Edit Entity Details invokes onEditActiveEntity callback', () => {
    const onEditActiveEntity = vi.fn();
    render(
      <Settings
        settings={{ mode: 'owner' }}
        onChange={vi.fn()}
        onClearSettings={vi.fn()}
        entities={[entityA]}
        activeEntity={entityA}
        onEditActiveEntity={onEditActiveEntity}
      />
    );
    const btn = screen.getByRole('button', { name: /edit entity details/i });
    fireEvent.click(btn);
    expect(onEditActiveEntity).toHaveBeenCalledOnce();
  });
});
