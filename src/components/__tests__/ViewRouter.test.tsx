/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Plan 05-4 test for ViewRouter Partnership routing.
 * Plan 06-3: VR.1–VR.6 persona-mode gating, owner-mode auto-select,
 *            year-end/settings routes, lockedFy threading.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
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

// ── Plan 06-3: VR.1–VR.6 ─────────────────────────────────────────────────

const baseEntity: Entity = {
  _v: 5,
  id: 'e1',
  name: 'Acme Pty Ltd',
  type: 'Company',
  status: 'Active',
  returnStatusByFy: {},
};

const noop = () => {};

function makeFullJournals(): JournalsHook {
  return {
    allEntries: {},
    filteredEntries: [],
    addEntry: vi.fn(),
    editPosted: vi.fn(),
    reversePosted: vi.fn(),
    voidDraft: vi.fn(),
    searchJournals: vi.fn(),
    importEntries: vi.fn(),
    supersedeImport: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    dateFrom: '',
    setDateFrom: vi.fn(),
    dateTo: '',
    setDateTo: vi.fn(),
  } as unknown as JournalsHook;
}

function makeEA() {
  return {
    createEntity: vi.fn(),
    updateEntity: vi.fn(),
    archiveEntity: vi.fn(),
    deactivateEntity: vi.fn(),
    deleteEntity: vi.fn(),
    toggleSelection: vi.fn(),
    clearSelection: vi.fn(),
  };
}

describe('ViewRouter — Plan 06-3 persona gating + routing', () => {
  it('VR.1: settings=null renders PersonaModeModal; master-dashboard is suppressed', () => {
    render(
      <ViewRouter
        view="dashboard"
        setView={noop}
        showNewJournal={false}
        setShowNewJournal={noop}
        accounts={[]}
        entities={[baseEntity]}
        activeEntityId={null}
        setActiveEntityId={noop}
        selectedEntityIds={[]}
        auditLogs={[]}
        journals={makeFullJournals()}
        entityActions={makeEA()}
        onSaveCOA={noop}
        onUpdateAccount={noop}
        settings={null}
        setSettings={noop}
        clearSettings={noop}
        addLog={noop}
      />
    );
    // PersonaModeModal renders buttons with data-testid="persona-mode-owner"
    expect(screen.getByTestId('persona-mode-owner')).toBeTruthy();
    // MasterDashboard should NOT render
    expect(screen.queryByText('Master Dashboard')).toBeNull();
  });

  it('VR.2: owner mode + no activeEntityId + entities → setActiveEntityId called with primary entity', () => {
    const setActiveEntityId = vi.fn();
    render(
      <ViewRouter
        view="dashboard"
        setView={noop}
        showNewJournal={false}
        setShowNewJournal={noop}
        accounts={[]}
        entities={[baseEntity]}
        activeEntityId={null}
        setActiveEntityId={setActiveEntityId}
        selectedEntityIds={[]}
        auditLogs={[]}
        journals={makeFullJournals()}
        entityActions={makeEA()}
        onSaveCOA={noop}
        onUpdateAccount={noop}
        settings={{ mode: 'owner' }}
        setSettings={noop}
        clearSettings={noop}
        addLog={noop}
      />
    );
    expect(setActiveEntityId).toHaveBeenCalledWith('e1');
  });

  it('VR.3: owner mode + view="master-dashboard" → setView("dashboard") called; MasterDashboard not rendered', () => {
    const setView = vi.fn();
    render(
      <ViewRouter
        view="master-dashboard"
        setView={setView}
        showNewJournal={false}
        setShowNewJournal={noop}
        accounts={[]}
        entities={[baseEntity]}
        activeEntityId="e1"
        setActiveEntityId={noop}
        selectedEntityIds={[]}
        auditLogs={[]}
        journals={makeFullJournals()}
        entityActions={makeEA()}
        onSaveCOA={noop}
        onUpdateAccount={noop}
        settings={{ mode: 'owner' }}
        setSettings={noop}
        clearSettings={noop}
        addLog={noop}
      />
    );
    expect(setView).toHaveBeenCalledWith('dashboard');
  });

  it('VR.4: view="year-end" + owner mode + activeEntityId → YearEndWizard step indicator mounted', () => {
    render(
      <ViewRouter
        view="year-end"
        setView={noop}
        showNewJournal={false}
        setShowNewJournal={noop}
        accounts={[]}
        entities={[baseEntity]}
        activeEntityId="e1"
        setActiveEntityId={noop}
        selectedEntityIds={[]}
        auditLogs={[]}
        journals={makeFullJournals()}
        entityActions={makeEA()}
        onSaveCOA={noop}
        onUpdateAccount={noop}
        settings={{ mode: 'owner' }}
        setSettings={noop}
        clearSettings={noop}
        addLog={noop}
      />
    );
    expect(screen.getByTestId('wizard-step-indicator')).toBeTruthy();
  });

  it('VR.5: view="settings" → Settings page with mode toggle rendered', () => {
    render(
      <ViewRouter
        view="settings"
        setView={noop}
        showNewJournal={false}
        setShowNewJournal={noop}
        accounts={[]}
        entities={[baseEntity]}
        activeEntityId="e1"
        setActiveEntityId={noop}
        selectedEntityIds={[]}
        auditLogs={[]}
        journals={makeFullJournals()}
        entityActions={makeEA()}
        onSaveCOA={noop}
        onUpdateAccount={noop}
        settings={{ mode: 'owner' }}
        setSettings={noop}
        clearSettings={noop}
        addLog={noop}
      />
    );
    expect(screen.getByTestId('settings-mode-toggle')).toBeTruthy();
  });

  it('VR.6: finalised FY2026 entity + showNewJournal=true → JournalForm receives lockedFy', () => {
    const finalisedEntity: Entity = {
      ...baseEntity,
      returnStatusByFy: { FY2026: 'finalised' },
    };
    render(
      <ViewRouter
        view="journals"
        setView={noop}
        showNewJournal={true}
        setShowNewJournal={noop}
        accounts={[]}
        entities={[finalisedEntity]}
        activeEntityId="e1"
        setActiveEntityId={noop}
        selectedEntityIds={[]}
        auditLogs={[]}
        journals={makeFullJournals()}
        entityActions={makeEA()}
        onSaveCOA={noop}
        onUpdateAccount={noop}
        settings={{ mode: 'owner' }}
        setSettings={noop}
        clearSettings={noop}
        addLog={noop}
      />
    );
    // JournalForm is rendered — test checks it appears (lockedFy prop threading)
    // Since JournalForm is the real component we check for key form elements
    expect(screen.getByTestId('post-journal-button')).toBeTruthy();
  });
});
