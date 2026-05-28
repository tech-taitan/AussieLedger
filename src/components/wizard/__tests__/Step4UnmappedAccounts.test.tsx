/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Step4UnmappedAccounts } from '../Step4UnmappedAccounts';
import type { Account } from '../../../types';

function makeAccount(id: string, name: string): Account {
  return {
    id,
    code: `${id}-code`,
    name,
    type: 'Expense',
    gstCode: 'N-T',
    // no taxLabel — unmapped
  };
}

describe('Step4UnmappedAccounts', () => {
  it('Test S4.1: empty unmapped list renders "All accounts mapped." with green check', () => {
    render(
      <Step4UnmappedAccounts
        unmapped={[]}
        onNavigateToAccount={vi.fn()}
        onBack={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText(/All accounts mapped/i)).toBeInTheDocument();
    // Root element should signal no blocking issues
    const root = screen.getByTestId('step4-root');
    expect(root).toHaveAttribute('data-blocking', 'false');
  });

  it('Test S4.2: two unmapped accounts each render as data-testid="unmapped-row"', () => {
    const accounts = [makeAccount('a1', 'Office Supplies'), makeAccount('a2', 'Rent')];
    render(
      <Step4UnmappedAccounts
        unmapped={accounts}
        onNavigateToAccount={vi.fn()}
        onBack={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getAllByTestId('unmapped-row')).toHaveLength(2);
  });

  it('Test S4.3: per-row "Map this account" button calls onNavigateToAccount(accountId)', async () => {
    const onNavigateToAccount = vi.fn();
    const accounts = [makeAccount('acc-xyz', 'Test Account')];
    render(
      <Step4UnmappedAccounts
        unmapped={accounts}
        onNavigateToAccount={onNavigateToAccount}
        onBack={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    const btn = screen.getByTestId('unmapped-map-acc-xyz');
    await userEvent.click(btn);
    expect(onNavigateToAccount).toHaveBeenCalledWith('acc-xyz');
  });

  it('Test S4.4: when unmappedCount > 0, root has data-blocking="true"', () => {
    const accounts = [makeAccount('a1', 'Account One')];
    render(
      <Step4UnmappedAccounts
        unmapped={accounts}
        onNavigateToAccount={vi.fn()}
        onBack={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    const root = screen.getByTestId('step4-root');
    expect(root).toHaveAttribute('data-blocking', 'true');
  });
});
