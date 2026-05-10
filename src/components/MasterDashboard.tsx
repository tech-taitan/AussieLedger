/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Plus, ListTree, Archive, Power, Trash2 } from 'lucide-react';
import { EntityCard } from './EntityCard';
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
  onConfigureAccounts: () => void;
  onSelectEntity: (id: string) => void;
  setView: (v: View) => void;
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
  onConfigureAccounts,
  onSelectEntity,
}: MasterDashboardProps) {
  return (
    <div className="space-y-6">
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

        {entities
          .filter((e) => e.status !== 'Archived')
          .map((entity) => {
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
              <EntityCard
                key={entity.id}
                entity={entity}
                isSelected={isSelected}
                toggleSelection={toggleSelection}
                onClick={() => onSelectEntity(entity.id)}
                rev={rev}
                exp={exp}
                profit={profit}
              />
            );
          })}
      </div>
    </div>
  );
}
