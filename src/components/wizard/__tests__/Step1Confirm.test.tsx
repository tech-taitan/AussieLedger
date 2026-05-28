/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Step1Confirm } from '../Step1Confirm';
import type { Entity, JournalEntry } from '../../../types';

function makeEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: 'e1',
    name: 'Acme Pty Ltd',
    type: 'Company',
    status: 'Active',
    ...overrides,
  };
}

function makeDraftEntry(): JournalEntry {
  return {
    _v: 3,
    id: 'je-1',
    date: '2026-01-01',
    reference: 'REF-001',
    description: 'Draft entry',
    lines: [
      { accountId: 'a1', description: '', debit: 100, credit: 0, taxAmount: 0 },
      { accountId: 'a2', description: '', debit: 0, credit: 100, taxAmount: 0 },
    ],
    isPosted: false,
    status: 'draft',
  };
}

describe('Step1Confirm', () => {
  it('Test S1.1: renders entity name and FY in the prompt', () => {
    const entity = makeEntity();
    render(
      <Step1Confirm
        entity={entity}
        fy="FY2026"
        entries={[]}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText(/Acme Pty Ltd/)).toBeInTheDocument();
    expect(screen.getByText(/FY2026/)).toBeInTheDocument();
  });

  it('Test S1.2: "Yes, continue" button has correct testid and clicking it calls onNext', async () => {
    const entity = makeEntity();
    const onNext = vi.fn();
    render(
      <Step1Confirm
        entity={entity}
        fy="FY2026"
        entries={[]}
        onNext={onNext}
      />,
    );
    const btn = screen.getByTestId('step1-confirm-yes');
    expect(btn).toBeInTheDocument();
    await userEvent.click(btn);
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('Test S1.3: shows the count of unreconciled draft journals in the stats line', () => {
    const entity = makeEntity();
    render(
      <Step1Confirm
        entity={entity}
        fy="FY2026"
        entries={[makeDraftEntry(), makeDraftEntry()]}
        onNext={vi.fn()}
      />,
    );
    // The stats line should mention how many draft journals remain
    expect(screen.getByText(/2 draft journal/i)).toBeInTheDocument();
  });
});
