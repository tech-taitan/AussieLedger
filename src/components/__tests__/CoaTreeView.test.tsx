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
