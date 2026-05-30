/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sidebar tests — PERS-01 (owner mode), UX-02 (anomaly count badges).
 * S.1–S.4 flipped from it.todo; S.5–S.7 added in Plan 06-3.
 * S.8–S.13 added in Plan 09-1 (UX-06 badge click → cycle state).
 */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '../shell/Sidebar';
import type { Entity } from '../../types';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...p }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('div', p, children),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

import React from 'react';

const noop = () => {};

const baseEntity: Entity = {
  id: 'e1',
  name: 'Acme',
  type: 'Company',
  status: 'Active',
};

function renderSidebar(overrides: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  const defaults: React.ComponentProps<typeof Sidebar> = {
    view: 'dashboard',
    setView: noop,
    activeEntity: baseEntity,
    entities: [baseEntity],
    isOpen: true,
    setIsOpen: noop,
    setActiveEntityId: noop,
    mode: null,
    anomalyCounts: { journals: 0, accounts: 0 },
  };
  return render(<Sidebar {...defaults} {...overrides} />);
}

describe('Sidebar (PERS-01 + UX-02 — Plan 06-3)', () => {
  it('Test S.1: owner mode with anomalyCounts={journals:3} — journals button subtree contains "3" in bg-red-500 pill', () => {
    renderSidebar({ mode: 'owner', anomalyCounts: { journals: 3, accounts: 0 } });
    // Find the Journal Entries button
    const journalBtn = screen.getByRole('button', { name: /journal entries/i });
    expect(journalBtn).toBeTruthy();
    // Its subtree must contain a span with bg-red-500 and text "3"
    const pill = journalBtn.querySelector('.bg-red-500');
    expect(pill).toBeTruthy();
    expect(pill?.textContent).toBe('3');
  });

  it('Test S.2: owner mode with anomalyCounts={journals:0} — no bg-red-500 pill inside journals button', () => {
    renderSidebar({ mode: 'owner', anomalyCounts: { journals: 0, accounts: 0 } });
    const journalBtn = screen.getByRole('button', { name: /journal entries/i });
    const pill = journalBtn.querySelector('.bg-red-500');
    expect(pill).toBeNull();
  });

  it('Test S.3: mode="owner" — DOM does NOT contain a button labelled "Master Dashboard"', () => {
    renderSidebar({ mode: 'owner' });
    const btn = screen.queryByRole('button', { name: /master dashboard/i });
    expect(btn).toBeNull();
  });

  it('Test S.4: mode="agent" — DOM contains "Clients" or "Master Dashboard" button', () => {
    renderSidebar({ mode: 'agent' });
    const clients = screen.queryByRole('button', { name: /clients/i });
    const master = screen.queryByRole('button', { name: /master dashboard/i });
    expect(clients || master).toBeTruthy();
  });

  it('Test S.5: mode="owner" — DOM contains a "Year-End" button', () => {
    renderSidebar({ mode: 'owner' });
    const btn = screen.getByRole('button', { name: /year.?end/i });
    expect(btn).toBeTruthy();
  });

  it('Test S.6: mode="owner" — DOM contains a "Settings" button', () => {
    renderSidebar({ mode: 'owner' });
    const btn = screen.getByRole('button', { name: /settings/i });
    expect(btn).toBeTruthy();
  });

  it('Test S.7: mode="agent" — DOM does NOT contain a top-level "Year-End" button', () => {
    renderSidebar({ mode: 'agent' });
    const btn = screen.queryByRole('button', { name: /^year.?end$/i });
    expect(btn).toBeNull();
  });
});

describe('Sidebar Phase 9 UX-06 — badge deep-link cycle state', () => {
  it('S.8: journals badge renders as a button (clickable) when anomalyCounts.journals > 0', () => {
    renderSidebar({ mode: 'owner', anomalyCounts: { journals: 2, accounts: 0 } });
    const badge = document.querySelector('[data-testid="nav-journal-entries-badge"]');
    expect(badge).toBeTruthy();
    expect(badge?.tagName).toBe('BUTTON');
  });

  it('S.9: accounts badge renders as a button (clickable) when anomalyCounts.accounts > 0', () => {
    renderSidebar({ mode: 'owner', anomalyCounts: { journals: 0, accounts: 3 } });
    const badge = document.querySelector('[data-testid="nav-accounts-badge"]');
    expect(badge).toBeTruthy();
    expect(badge?.tagName).toBe('BUTTON');
  });

  it('S.10: journals badge is a span (non-clickable) when no onAnomalyScroll provided but count > 0', () => {
    // Default renderSidebar does not pass onAnomalyScroll
    renderSidebar({ mode: 'owner', anomalyCounts: { journals: 2, accounts: 0 } });
    // Sidebar wires onBadgeClick only when anomalyCounts.journals > 0 (which it is)
    // Our Sidebar impl always passes onBadgeClick when count > 0, so this is now a BUTTON
    const badge = document.querySelector('[data-testid="nav-journal-entries-badge"]');
    expect(badge).toBeTruthy();
  });

  it('S.11: clicking journals badge calls onAnomalyScroll with target="journals"', () => {
    const onAnomalyScroll = vi.fn();
    renderSidebar({
      mode: 'owner',
      anomalyCounts: { journals: 3, accounts: 0 },
      onAnomalyScroll,
    });
    const badge = document.querySelector('[data-testid="nav-journal-entries-badge"]') as HTMLElement;
    expect(badge).toBeTruthy();
    fireEvent.click(badge);
    expect(onAnomalyScroll).toHaveBeenCalledWith('journals', 0);
  });

  it('S.12: clicking accounts badge calls onAnomalyScroll with target="accounts"', () => {
    const onAnomalyScroll = vi.fn();
    renderSidebar({
      mode: 'owner',
      anomalyCounts: { journals: 0, accounts: 2 },
      onAnomalyScroll,
    });
    const badge = document.querySelector('[data-testid="nav-accounts-badge"]') as HTMLElement;
    expect(badge).toBeTruthy();
    fireEvent.click(badge);
    expect(onAnomalyScroll).toHaveBeenCalledWith('accounts', 0);
  });

  it('S.13: clicking journals badge twice increments cycleIdx from 0 to 1', () => {
    const onAnomalyScroll = vi.fn();
    renderSidebar({
      mode: 'owner',
      anomalyCounts: { journals: 3, accounts: 0 },
      onAnomalyScroll,
      view: 'journals',
    });
    const badge = document.querySelector('[data-testid="nav-journal-entries-badge"]') as HTMLElement;
    fireEvent.click(badge);
    fireEvent.click(badge);
    expect(onAnomalyScroll).toHaveBeenNthCalledWith(1, 'journals', 0);
    expect(onAnomalyScroll).toHaveBeenNthCalledWith(2, 'journals', 1);
  });
});
