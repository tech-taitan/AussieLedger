/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CoaTreeView tests — CT.1–CT.2 (Plan 06-3 UX-02: inline anomaly badges).
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CoaTreeView } from '../CoaTreeView';
import type { Account } from '../../types';

function makeAccount(overrides: Partial<Account>): Account {
  return {
    id: 'a1', code: '5000', name: 'Test Account', type: 'Expense',
    gstCode: 'N-T', taxLabel: 'E',
    ...overrides,
  };
}

describe('CoaTreeView — Plan 06-3 AnomalyBadge wiring (UX-02)', () => {
  it('CT.1: account with no gstCode shows anomaly-badge', () => {
    const account = makeAccount({ id: 'a1', code: '5001', gstCode: undefined as never });
    render(<CoaTreeView accounts={[account]} />);
    const badges = document.querySelectorAll('[data-testid="anomaly-badge"]');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('CT.2: all accounts mapped — no anomaly badges', () => {
    const account = makeAccount({ id: 'a2', code: '5002', gstCode: 'N-T', taxLabel: 'E' });
    render(<CoaTreeView accounts={[account]} />);
    const badges = document.querySelectorAll('[data-testid="anomaly-badge"]');
    expect(badges.length).toBe(0);
  });
});
