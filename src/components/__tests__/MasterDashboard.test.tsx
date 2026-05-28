/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MasterDashboard tests — MD.1–MD.3 (Plan 06-3 PERS-02).
 * Per-entity FY26 status badges + Recent clients section.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MasterDashboard } from '../MasterDashboard';
import type { Entity } from '../../types';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...p }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('div', p, children),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

const noop = () => {};

const finalisedEntity: Entity = {
  id: 'e1', name: 'Acme Pty Ltd', type: 'Company', status: 'Active',
  returnStatusByFy: { FY2026: 'finalised' },
};

const notStartedEntity: Entity = {
  id: 'e2', name: 'Beta Trust', type: 'Trust', status: 'Active',
};

const inProgressEntity: Entity = {
  id: 'e3', name: 'Gamma Partnership', type: 'Partnership', status: 'Active',
  wizardState: { FY2026: { step: 3, dismissedAnomalies: [] } },
};

const defaultProps = {
  accounts: [],
  allEntries: {},
  selectedEntityIds: [],
  toggleSelection: noop,
  onArchive: noop,
  onDeactivate: noop,
  onDelete: noop,
  onClearSelection: noop,
  onAddEntity: noop,
  onConfigureAccounts: noop,
  onSelectEntity: noop,
  setView: noop,
};

describe('MasterDashboard (Plan 06-3 MD.1–MD.3)', () => {
  it('MD.1: entity with FY2026=finalised shows entity-fy-badge with "finalised"', () => {
    render(
      <MasterDashboard
        {...defaultProps}
        entities={[finalisedEntity]}
      />
    );
    const badges = screen.getAllByTestId('entity-fy-badge');
    expect(badges.length).toBeGreaterThan(0);
    expect(badges[0].textContent).toMatch(/finalised/i);
  });

  it('MD.2: entity with no returnStatusByFy shows "not started" badge', () => {
    render(
      <MasterDashboard
        {...defaultProps}
        entities={[notStartedEntity]}
      />
    );
    const badges = screen.getAllByTestId('entity-fy-badge');
    expect(badges.length).toBeGreaterThan(0);
    expect(badges[0].textContent).toMatch(/not started/i);
  });

  it('MD.3: "recent-clients" section shown when entities.length > 0', () => {
    render(
      <MasterDashboard
        {...defaultProps}
        entities={[finalisedEntity, notStartedEntity]}
      />
    );
    const section = screen.getByTestId('recent-clients');
    expect(section).toBeTruthy();
  });
});
