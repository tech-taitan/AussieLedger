/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CoaTreeView tests — CT.1–CT.2 (Plan 06-3 UX-02: inline anomaly badges).
 * C.1–C.6 added in Plan 09-1 (UX-06: anomaly filter + scroll-to + flash).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('CT.3: Equity / Asset / Liability rows with no taxLabel do NOT show missing-tax-label badge', () => {
    const accounts: Account[] = [
      { id: 'eq', code: '3010', name: "Owner's Capital", type: 'Equity',
        gstCode: 'N-T', parentCode: '3000' },
      { id: 'as', code: '1020', name: 'Business Bank Account', type: 'Asset',
        gstCode: 'N-T', parentCode: '1000' },
      { id: 'li', code: '2100', name: 'GST Collected', type: 'Liability',
        gstCode: 'N-T', parentCode: '2000' },
    ];
    render(<CoaTreeView accounts={accounts} />);
    const badges = document.querySelectorAll('[data-testid="anomaly-badge"]');
    expect(badges.length).toBe(0);
  });

  it('CT.4: Revenue leaf with all four tax labels shows NO missing-tax-label badge', () => {
    const account: Account = {
      id: 'r1', code: '4020', name: 'Sales of Services', type: 'Revenue',
      gstCode: 'GST', parentCode: '4000',
      taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B', partnershipTaxLabel: 'P1',
    };
    render(<CoaTreeView accounts={[account]} />);
    const badges = document.querySelectorAll('[data-testid="anomaly-badge"]');
    expect(badges.length).toBe(0);
  });

  it('CT.5: Revenue leaf missing one of four tax labels DOES show missing-tax-label badge', () => {
    const account: Account = {
      id: 'r2', code: '5500', name: 'New Account', type: 'Revenue',
      gstCode: 'GST', parentCode: '4000',
      taxLabel: '6S', // only Individual label set; missing CO/TR/PS
    };
    render(<CoaTreeView accounts={[account]} />);
    const badges = document.querySelectorAll('[data-testid="anomaly-badge"]');
    expect(badges.length).toBeGreaterThan(0);
  });
});

describe('CoaTreeView Phase 9 UX-06 — anomaly filter + scroll-to-anomaly', () => {
  const mapped = makeAccount({ id: 'b1', code: '4000', name: 'Revenue', gstCode: 'GST', taxLabel: 'R' });
  const unmapped = makeAccount({ id: 'b2', code: '5000', name: 'Expenses', gstCode: undefined as never, taxLabel: undefined });
  const accounts = [mapped, unmapped];

  it('C.1: filterMissingMappings=false — both accounts visible', () => {
    render(<CoaTreeView accounts={accounts} filterMissingMappings={false} />);
    expect(screen.queryByTestId('coa-row-4000')).toBeTruthy();
    expect(screen.queryByTestId('coa-row-5000')).toBeTruthy();
  });

  it('C.2: filterMissingMappings=true — only unmapped account visible', () => {
    render(<CoaTreeView accounts={accounts} filterMissingMappings={true} />);
    expect(screen.queryByTestId('coa-row-4000')).toBeNull();
    expect(screen.queryByTestId('coa-row-5000')).toBeTruthy();
  });

  it('C.3: filterMissingMappings=true — anomaly-filter-banner shown', () => {
    render(<CoaTreeView accounts={accounts} filterMissingMappings={true} />);
    expect(screen.getByTestId('anomaly-filter-banner')).toBeTruthy();
  });

  it('C.4: filterMissingMappings=false — anomaly-filter-banner NOT shown', () => {
    render(<CoaTreeView accounts={accounts} filterMissingMappings={false} />);
    expect(screen.queryByTestId('anomaly-filter-banner')).toBeNull();
  });

  it('C.5: clicking "Clear filter" button invokes onClearAnomalyFilter', () => {
    const onClear = vi.fn();
    render(
      <CoaTreeView
        accounts={accounts}
        filterMissingMappings={true}
        onClearAnomalyFilter={onClear}
      />
    );
    fireEvent.click(screen.getByTestId('anomaly-filter-clear'));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('C.6: scrollToAccountIdx=0 — scrollIntoView called on the target row element', () => {
    const scrollMock = vi.fn();
    Element.prototype.scrollIntoView = scrollMock;
    render(
      <CoaTreeView
        accounts={accounts}
        filterMissingMappings={true}
        scrollToAccountIdx={0}
      />
    );
    expect(scrollMock).toHaveBeenCalled();
  });
});
