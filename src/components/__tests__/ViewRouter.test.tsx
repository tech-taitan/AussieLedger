/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Plan 05-4 test for ViewRouter Partnership routing.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ViewRouter } from '../ViewRouter';
import type { Entity, Account } from '../../types';
import type { JournalsHook } from '../../hooks/useJournals';

const partnershipEntity: Entity = {
  _v: 4,
  id: 'p1',
  name: 'Smith & Jones',
  type: 'Partnership',
  status: 'Active',
  partners: [
    { id: 'p1', name: 'Smith', sharePercent: 50 },
    { id: 'p2', name: 'Jones', sharePercent: 50 },
  ],
};

const accounts: Account[] = [
  { _v: 4, id: 'a-rev', code: '4010', name: 'Revenue', type: 'Revenue', gstCode: 'GST', partnershipTaxLabel: 'P1' },
];

// Minimal JournalsHook stub
const mockJournals: Partial<JournalsHook> = {
  allEntries: {},
  filteredEntries: [],
  searchQuery: '',
  setSearchQuery: vi.fn(),
  dateFrom: '',
  setDateFrom: vi.fn(),
  dateTo: '',
  setDateTo: vi.fn(),
  addEntry: vi.fn(),
  importEntries: vi.fn(),
  supersedeImport: vi.fn(),
};

const mockEntityActions = {
  createEntity: vi.fn(),
  updateEntity: vi.fn(),
  archiveEntity: vi.fn(),
  deactivateEntity: vi.fn(),
  deleteEntity: vi.fn(),
  toggleSelection: vi.fn(),
  clearSelection: vi.fn(),
};

describe('ViewRouter — Phase 5 routing scaffolds', () => {
  it('routes partnership to PartnershipTaxReturn — renders Form P heading', () => {
    render(
      <ViewRouter
        view="partnership-tax"
        setView={vi.fn()}
        showNewJournal={false}
        setShowNewJournal={vi.fn()}
        accounts={accounts}
        entities={[partnershipEntity]}
        activeEntityId={partnershipEntity.id}
        setActiveEntityId={vi.fn()}
        selectedEntityIds={[]}
        auditLogs={[]}
        journals={mockJournals as JournalsHook}
        entityActions={mockEntityActions}
        onSaveCOA={vi.fn()}
        onUpdateAccount={vi.fn()}
      />
    );

    // PartnershipTaxReturn renders "Form P — Partnership Tax Return"
    expect(screen.getAllByText(/Form P — Partnership/i).length).toBeGreaterThan(0);
  });
});
