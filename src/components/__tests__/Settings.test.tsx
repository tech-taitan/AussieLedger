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
