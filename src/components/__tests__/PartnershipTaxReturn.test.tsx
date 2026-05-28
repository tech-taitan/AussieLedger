/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PartnershipTaxReturn } from '../PartnershipTaxReturn';
import type { Entity } from '../../types';

const fixtureEntity: Entity = {
  _v: 4,
  id: 'p1',
  name: 'Smith & Jones Partnership',
  type: 'Partnership',
  status: 'Active',
  partners: [
    { id: 'p1', name: 'Smith', sharePercent: 50 },
    { id: 'p2', name: 'Jones', sharePercent: 50 },
  ],
};

describe('PartnershipTaxReturn', () => {
  it('renders the Form P heading (Wave 0 skeleton)', () => {
    render(
      <PartnershipTaxReturn entity={fixtureEntity} accounts={[]} entries={[]} />,
    );
    expect(screen.getByText(/Form P — Partnership Tax Return/)).toBeInTheDocument();
  });

  it('renders the entity name in placeholder text', () => {
    render(
      <PartnershipTaxReturn entity={fixtureEntity} accounts={[]} entries={[]} />,
    );
    expect(screen.getByText(/Smith & Jones Partnership/)).toBeInTheDocument();
  });

  it.todo('renders Form P with distribution — P1 P2 P8 + per-partner rows reconciling to net income');
  it.todo('print button emits audit — EXPORT_DATA log with { form: P, fy: FY2026 }');
});
