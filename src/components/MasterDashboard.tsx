/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Plus, ListTree, Archive, Power, Trash2 } from 'lucide-react';
import { EntityCard } from './EntityCard';
import { WelcomeBanner } from './WelcomeBanner';
import type { View, Entity, Account, JournalEntry } from '../types';

interface MasterDashboardProps {
  entities: Entity[];
  accounts: Account[];
  allEntries: Record<string, JournalEntry[]>;
  selectedEntityIds: string[];
  toggleSelection: (id: string, e?: React.MouseEvent) => void;
  onArchive: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  onAddEntity: () => void;
  /** Optional — when provided, the WelcomeBanner empty state surfaces a Sole Owner setup CTA. */
  onSoleOwnerSetup?: () => void;
  onConfigureAccounts: () => void;
  onSelectEntity: (id: string) => void;
  setView: (v: View) => void;
}

/** Compute the most-recent journal date for an entity (ISO string or empty). */
function lastJournalDate(entries: JournalEntry[]): string {
  if (!entries.length) return '';
  return entries.reduce((max, e) => (e.date > max ? e.date : max), '');
}

/** FY26 badge for an entity — green/yellow/gray pill. */
function FyBadge({ entity }: { entity: Entity }) {
  const fyStatus = entity.returnStatusByFy?.['FY2026'];
  const wizardStep = entity.wizardState?.['FY2026']?.step;

  let label: string;
  let className: string;

  if (fyStatus === 'finalised') {
    label = 'FY26: finalised';
    className = 'bg-green-100 text-green-700';
  } else if (wizardStep != null && wizardStep > 1) {
    label = `FY26: step ${wizardStep}/7`;
    className = 'bg-yellow-100 text-yellow-700';
  } else if (fyStatus === 'draft') {
    label = 'FY26: draft';
    className = 'bg-blue-100 text-blue-700';
  } else {
    label = 'FY26: not started';
    className = 'bg-gray-100 text-gray-500';
  }

  return (
    <span
      data-testid="entity-fy-badge"
      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${className}`}
    >
      {label}
    </span>
  );
}

export function MasterDashboard({
  entities,
  accounts,
  allEntries,
  selectedEntityIds,
  toggleSelection,
  onArchive,
  onDeactivate,
  onDelete,
  onClearSelection,
  onAddEntity,
  onSoleOwnerSetup,
  onConfigureAccounts,
  onSelectEntity,
}: MasterDashboardProps) {
  const activeEntities = entities.filter((e) => e.status !== 'Archived');

  // Phase 14 POL-01 — when zero active entities (fresh install OR
  // deleted-everything returning user), render ONLY the WelcomeBanner.
  // No Recent Clients (would be empty), no Master Dashboard header (the
  // primary CTA is the discoverable affordance), no entity grid. CONTEXT
  // decision: "inline within the existing MasterDashboard empty-state".
  if (activeEntities.length === 0) {
    return (
      <div className="space-y-6" data-testid="master-dashboard-empty">
        <WelcomeBanner
          onCreateEntity={onAddEntity}
          onSoleOwnerSetup={onSoleOwnerSetup}
        />
      </div>
    );
  }

  /** Recent clients: top 5 by last journal date or wizardState.completedAt */
  const recentClients = useMemo(() => {
    return [...activeEntities]
      .map((e) => {
        const entries = allEntries[e.id] ?? [];
        const lastJournal = lastJournalDate(entries);
        const completedAt = e.wizardState?.['FY2026']?.completedAt ?? '';
        const recent = lastJournal > completedAt ? lastJournal : completedAt;
        return { entity: e, recent };
      })
      .sort((a, b) => b.recent.localeCompare(a.recent))
      .slice(0, 5)
      .map((x) => x.entity);
  }, [activeEntities, allEntries]);

  return (
    <div className="space-y-6">
      {/* Recent Clients quick-switch */}
      {activeEntities.length > 0 && (
        <div data-testid="recent-clients" className="bg-white border border-[var(--line-strong)] p-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
            Recent Clients
          </h3>
          <div className="flex flex-wrap gap-2">
            {recentClients.map((e) => (
              <button
                key={e.id}
                onClick={() => onSelectEntity(e.id)}
                className="text-xs px-3 py-1.5 border border-[var(--line-strong)] bg-gray-50 hover:bg-gray-100 transition-colors font-medium"
              >
                {e.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Layers className="text-indigo-600" size={24} />
          <h2 className="text-2xl font-bold">Master Dashboard</h2>
        </div>
        <button
          onClick={onAddEntity}
          className="bg-[var(--ink)] text-white px-4 py-2 text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          Add Entity
        </button>
        <button
          onClick={onConfigureAccounts}
          className="border border-[var(--line-strong)] bg-white px-4 py-2 text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <ListTree size={18} className="text-gray-400" />
          Configure Accounts
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 relative">
        <AnimatePresence>
          {selectedEntityIds.length > 0 && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white border border-[var(--ink)] shadow-2xl p-4 flex items-center gap-6 rounded-sm min-w-[300px]"
            >
              <div className="flex items-center gap-2 pr-6 border-r border-[var(--line)]">
                <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                  {selectedEntityIds.length}
                </div>
                <span className="text-sm font-bold uppercase tracking-tight">Selected</span>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={onArchive}
                  className="flex items-center gap-2 text-xs font-bold uppercase text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  <Archive size={16} />
                  Archive
                </button>
                <button
                  onClick={onDeactivate}
                  className="flex items-center gap-2 text-xs font-bold uppercase text-gray-600 hover:text-orange-600 transition-colors"
                >
                  <Power size={16} />
                  Deactivate
                </button>
                <button
                  onClick={onDelete}
                  className="flex items-center gap-2 text-xs font-bold uppercase text-gray-600 hover:text-rose-600 transition-colors"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>

              <button
                onClick={onClearSelection}
                className="ml-4 text-xs font-bold uppercase text-gray-400 hover:text-[var(--ink)]"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {activeEntities.map((entity) => {
          const entityEntries = allEntries[entity.id] || [];
          const isSelected = selectedEntityIds.includes(entity.id);
          const rev = entityEntries.reduce(
            (sum, e) =>
              sum +
              e.lines.reduce((ls, l) => {
                const acc = accounts.find((a) => a.id === l.accountId);
                return acc?.type === 'Revenue' ? ls + (Number(l.credit) - Number(l.debit)) : ls;
              }, 0),
            0,
          );
          const exp = entityEntries.reduce(
            (sum, e) =>
              sum +
              e.lines.reduce((ls, l) => {
                const acc = accounts.find((a) => a.id === l.accountId);
                return acc?.type === 'Expense' ? ls + (Number(l.debit) - Number(l.credit)) : ls;
              }, 0),
            0,
          );
          const profit = rev - exp;

          return (
            <div key={entity.id} className="relative">
              <EntityCard
                entity={entity}
                isSelected={isSelected}
                toggleSelection={toggleSelection}
                onClick={() => onSelectEntity(entity.id)}
                rev={rev}
                exp={exp}
                profit={profit}
              />
              {/* FY26 status badge overlaid at top-right of each card */}
              <div className="absolute top-2 right-2">
                <FyBadge entity={entity} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
