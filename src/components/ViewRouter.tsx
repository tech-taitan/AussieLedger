/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  History,
  BookOpen,
  Globe,
  Search,
  Filter,
} from 'lucide-react';
import { JournalForm } from './JournalForm';
import { TrialBalance } from './TrialBalance';
import { TaxReturnAssistant } from './TaxReturnAssistant';
import { CompanyTaxReturn } from './CompanyTaxReturn';
import { TrustTaxReturn } from './TrustTaxReturn';
import { BasIasAssistant } from './BasIasAssistant';
import { ImportTB } from './ImportTB';
import { EntityForm } from './EntityForm';
import { AuditTrail } from './AuditTrail';
import { AccountManager } from './AccountManager';
import { FinancialTrendChart } from './FinancialTrendChart';
import { MasterDashboard } from './MasterDashboard';
import { DataPage } from './DataPage';
import { cn } from '../lib/utils';
import type { View, Entity, Account, AuditLog } from '../types';
import type { JournalsHook } from '../hooks/useJournals';
import type { EntitiesHook } from '../hooks/useEntities';

interface ViewRouterProps {
  view: View;
  setView: (v: View) => void;
  showNewJournal: boolean;
  setShowNewJournal: (s: boolean) => void;
  accounts: Account[];
  entities: Entity[];
  activeEntityId: string | null;
  setActiveEntityId: (id: string | null) => void;
  selectedEntityIds: string[];
  auditLogs: AuditLog[];
  journals: JournalsHook;
  entityActions: Pick<
    EntitiesHook,
    | 'createEntity'
    | 'updateEntity'
    | 'archiveEntity'
    | 'deactivateEntity'
    | 'deleteEntity'
    | 'toggleSelection'
    | 'clearSelection'
  >;
  onSaveCOA: (updated: Account[]) => void;
  onUpdateAccount: (updated: Account) => void;
}

// ─── Private view helpers ──────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend: string;
  highlight?: boolean;
}

function StatCard({ label, value, icon, trend, highlight }: StatCardProps) {
  return (
    <div
      className={cn(
        'p-6 border border-[var(--line-strong)] shadow-sm',
        highlight ? 'bg-white ring-2 ring-[var(--ink)]' : 'bg-white',
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <span className="col-header">{label}</span>
        {icon}
      </div>
      <div className="text-3xl font-bold data-value mb-2">
        ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </div>
      <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{trend}</div>
    </div>
  );
}

interface EntityDashboardViewProps {
  activeEntity: Entity;
  accounts: Account[];
  journals: JournalsHook;
  setView: (v: View) => void;
}

function EntityDashboardView({
  activeEntity,
  accounts,
  journals,
  setView,
}: EntityDashboardViewProps) {
  const { filteredEntries, searchQuery, setSearchQuery, dateFrom, setDateFrom, dateTo, setDateTo } =
    journals;

  return (
    <div className="space-y-8">
      {/* Entity Details Header */}
      <div className="bg-white border border-[var(--line-strong)] shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{activeEntity.name}</h2>
          <div className="flex gap-3 text-xs text-gray-500 mt-1">
            <span className="font-bold text-blue-600">{activeEntity.type}</span>
            {activeEntity.registrationNumber && (
              <span>• {activeEntity.registrationNumber}</span>
            )}
          </div>
        </div>
        <div className="text-right text-xs space-y-1">
          {activeEntity.businessAddress && (
            <div className="flex items-center md:justify-end gap-1 text-gray-400">
              <Globe size={12} />
              <span>{activeEntity.businessAddress}</span>
            </div>
          )}
          {activeEntity.contactPerson && (
            <div className="flex items-center md:justify-end gap-1 text-gray-400">
              <span>Contact: {activeEntity.contactPerson}</span>
            </div>
          )}
          <button
            onClick={() => setView('edit-entity')}
            className="text-blue-600 hover:underline mt-2 inline-block font-medium"
          >
            Edit Entity Details
          </button>
        </div>
      </div>

      {/* Entity Notes Dashboard Section */}
      {activeEntity.notes && (
        <div className="bg-amber-50 border border-amber-200 p-4 shadow-sm relative group overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <BookOpen size={64} />
          </div>
          <div className="flex items-center gap-2 mb-2 text-amber-800">
            <BookOpen size={16} />
            <h4 className="text-xs font-bold uppercase tracking-wider">Internal Entity Notes</h4>
          </div>
          <p className="text-sm text-amber-900 italic font-serif leading-relaxed relative z-10">
            &ldquo;{activeEntity.notes}&rdquo;
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Total Revenue"
          value={filteredEntries.reduce((sum, entry) => {
            return (
              sum +
              entry.lines.reduce((lSum, line) => {
                const account = accounts.find((a) => a.id === line.accountId);
                if (account?.type === 'Revenue') return lSum + (Number(line.credit) - Number(line.debit));
                return lSum;
              }, 0)
            );
          }, 0)}
          icon={<TrendingUp className="text-green-600" />}
          trend="—"
        />
        <StatCard
          label="Total Expenses"
          value={filteredEntries.reduce((sum, entry) => {
            return (
              sum +
              entry.lines.reduce((lSum, line) => {
                const account = accounts.find((a) => a.id === line.accountId);
                if (account?.type === 'Expense') return lSum + (Number(line.debit) - Number(line.credit));
                return lSum;
              }, 0)
            );
          }, 0)}
          icon={<ArrowDownRight className="text-red-600" />}
          trend="—"
        />
        <StatCard
          label="Net Profit"
          value={filteredEntries.reduce((sum, entry) => {
            return (
              sum +
              entry.lines.reduce((lSum, line) => {
                const account = accounts.find((a) => a.id === line.accountId);
                if (account?.type === 'Revenue') return lSum + (Number(line.credit) - Number(line.debit));
                if (account?.type === 'Expense') return lSum - (Number(line.debit) - Number(line.credit));
                return lSum;
              }, 0)
            );
          }, 0)}
          icon={<ArrowUpRight className="text-blue-600" />}
          trend="—"
          highlight
        />
      </div>

      {/* Financial Trend Chart */}
      <FinancialTrendChart accounts={accounts} entries={filteredEntries} />

      {/* Filter Bar */}
      <div className="bg-white border border-[var(--line-strong)] p-4 flex flex-col sm:flex-row gap-4 items-end sm:items-center">
        <div className="flex-1 w-full">
          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
            Search Entries
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search reference or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-[var(--line)] text-sm focus:outline-none focus:border-[var(--ink)]"
            />
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
            From Date
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-[var(--line)] text-sm focus:outline-none focus:border-[var(--ink)]"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
            To Date
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-[var(--line)] text-sm focus:outline-none focus:border-[var(--ink)]"
          />
        </div>
        {(searchQuery || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setDateFrom('');
              setDateTo('');
            }}
            className="text-xs text-rose-600 font-medium hover:underline pb-2 px-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Recent Entries */}
      <div className="bg-white border border-[var(--line-strong)] shadow-sm">
        <div className="p-4 border-b border-[var(--line)] flex justify-between items-center">
          <h3 className="col-header">
            {searchQuery || dateFrom || dateTo
              ? 'Matching Journal Entries'
              : 'Recent Journal Entries'}
          </h3>
          <History size={16} className="text-gray-400" />
        </div>
        <div className="divide-y divide-[var(--line)]">
          {filteredEntries.length === 0 ? (
            <div className="p-12 text-center text-gray-400 italic">
              No entries found matching filters.
            </div>
          ) : (
            filteredEntries
              .slice(0, searchQuery || dateFrom || dateTo ? 20 : 5)
              .map((entry) => (
                <div key={entry.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{entry.description || 'No description'}</div>
                    <div className="text-xs text-gray-500 flex gap-2">
                      <span className="data-value">{entry.date}</span>
                      <span>•</span>
                      <span>Ref: {entry.reference}</span>
                    </div>
                  </div>
                  <div className="data-value font-bold">
                    ${entry.lines.reduce((s, l) => s + (l.debit || 0), 0).toLocaleString()}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

interface JournalsViewProps {
  journals: JournalsHook;
}

function JournalsView({ journals }: JournalsViewProps) {
  const { filteredEntries, searchQuery, setSearchQuery, dateFrom, setDateFrom, dateTo, setDateTo } =
    journals;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-white border border-[var(--line-strong)] p-4 flex flex-col sm:flex-row gap-4 items-end sm:items-center">
        <div className="flex-1 w-full">
          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Filter by reference or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-[var(--line)] text-sm focus:outline-none focus:border-[var(--ink)]"
            />
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-[var(--line)] text-sm focus:outline-none focus:border-[var(--ink)]"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-[var(--line)] text-sm focus:outline-none focus:border-[var(--ink)]"
          />
        </div>
        {(searchQuery || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setDateFrom('');
              setDateTo('');
            }}
            className="text-xs text-rose-600 font-medium hover:underline pb-2 px-2"
          >
            Clear
          </button>
        )}
      </div>

      <div className="bg-white border border-[var(--line-strong)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--line-strong)] flex justify-between items-center">
          <h3 className="col-header">Journal Ledger</h3>
          <span className="text-[10px] font-bold text-gray-400 uppercase">
            {filteredEntries.length} entries FOUND
          </span>
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)]">
                  <th className="col-header text-left p-4 whitespace-nowrap">Date</th>
                  <th className="col-header text-left p-4 whitespace-nowrap">Reference</th>
                  <th className="col-header text-left p-4 hidden md:table-cell">Description</th>
                  <th className="col-header text-right p-4 whitespace-nowrap">Amount</th>
                  <th className="col-header text-center p-4 hidden sm:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="data-row">
                    <td className="p-4 data-value whitespace-nowrap">{entry.date}</td>
                    <td className="p-4 font-medium whitespace-nowrap">{entry.reference}</td>
                    <td className="p-4 text-gray-600 hidden md:table-cell">{entry.description}</td>
                    <td className="p-4 text-right data-value font-bold whitespace-nowrap">
                      $
                      {entry.lines
                        .reduce((s, l) => s + (l.debit || 0), 0)
                        .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center hidden sm:table-cell">
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">
                        Posted
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TrialBalanceViewProps {
  accounts: Account[];
  journals: JournalsHook;
}

function TrialBalanceView({ accounts, journals }: TrialBalanceViewProps) {
  const { filteredEntries, dateFrom, setDateFrom, dateTo, setDateTo } = journals;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[var(--line-strong)] p-4 flex gap-4 items-center">
        <div className="flex items-center gap-2 text-indigo-600">
          <Filter size={18} />
          <span className="text-xs font-bold uppercase">Report Filters</span>
        </div>
        <div className="h-4 w-[1px] bg-gray-200 mx-2" />
        <div className="flex-1 flex gap-4">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-transparent border-b border-gray-200 text-sm focus:outline-none focus:border-indigo-600 px-1"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-transparent border-b border-gray-200 text-sm focus:outline-none focus:border-indigo-600 px-1"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => {
              setDateFrom('');
              setDateTo('');
            }}
            className="text-xs text-rose-600 font-medium"
          >
            Reset
          </button>
        )}
      </div>
      <TrialBalance accounts={accounts} entries={filteredEntries} />
    </div>
  );
}

// ─── ViewRouter ────────────────────────────────────────────────────────────

export function ViewRouter({
  view,
  setView,
  showNewJournal,
  setShowNewJournal,
  accounts,
  entities,
  activeEntityId,
  setActiveEntityId,
  selectedEntityIds,
  auditLogs,
  journals,
  entityActions,
  onSaveCOA,
  onUpdateAccount,
}: ViewRouterProps) {
  const activeEntity = entities.find((e) => e.id === activeEntityId);

  return (
    <AnimatePresence mode="wait">
      {showNewJournal ? (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <JournalForm
            accounts={accounts}
            onSave={(entry) => {
              journals.addEntry(entry);
              setShowNewJournal(false);
            }}
            onCancel={() => setShowNewJournal(false)}
          />
        </motion.div>
      ) : (
        <motion.div
          key={view}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {view === 'master-dashboard' && (
            <MasterDashboard
              entities={entities}
              accounts={accounts}
              allEntries={journals.allEntries}
              selectedEntityIds={selectedEntityIds}
              toggleSelection={entityActions.toggleSelection}
              onArchive={() => entityActions.archiveEntity(selectedEntityIds)}
              onDeactivate={() => entityActions.deactivateEntity(selectedEntityIds)}
              onDelete={() => {
                if (
                  window.confirm(
                    `Are you sure you want to delete ${selectedEntityIds.length} entities? This action cannot be undone.`,
                  )
                ) {
                  entityActions.deleteEntity(selectedEntityIds);
                }
              }}
              onClearSelection={entityActions.clearSelection}
              onAddEntity={() => {
                setActiveEntityId(null);
                setView('edit-entity');
              }}
              onConfigureAccounts={() => setView('coa-manager')}
              onSelectEntity={(id) => {
                setActiveEntityId(id);
                setView('dashboard');
              }}
              setView={setView}
            />
          )}

          {view === 'dashboard' && activeEntity && (
            <EntityDashboardView
              activeEntity={activeEntity}
              accounts={accounts}
              journals={journals}
              setView={setView}
            />
          )}

          {view === 'journals' && <JournalsView journals={journals} />}

          {view === 'trial-balance' && (
            <TrialBalanceView accounts={accounts} journals={journals} />
          )}

          {view === 'tax-return' && (
            <TaxReturnAssistant
              accounts={accounts}
              entries={journals.filteredEntries}
              onUpdateAccount={onUpdateAccount}
            />
          )}

          {view === 'company-tax' && (
            <CompanyTaxReturn
              accounts={accounts}
              entries={journals.filteredEntries}
              onUpdateAccount={onUpdateAccount}
            />
          )}

          {view === 'trust-tax' && (
            <TrustTaxReturn
              accounts={accounts}
              entries={journals.filteredEntries}
              onUpdateAccount={onUpdateAccount}
            />
          )}

          {view === 'bas-ias' && (
            <BasIasAssistant accounts={accounts} entries={journals.filteredEntries} />
          )}

          {view === 'edit-entity' && (
            <EntityForm
              entity={activeEntityId ? entities.find((e) => e.id === activeEntityId) : undefined}
              onSave={
                activeEntityId
                  ? (updated) => {
                      entityActions.updateEntity(updated);
                      setView('dashboard');
                    }
                  : (created) => {
                      entityActions.createEntity(created);
                      setActiveEntityId(created.id);
                      setView('dashboard');
                    }
              }
              onCancel={() =>
                activeEntityId ? setView('dashboard') : setView('master-dashboard')
              }
            />
          )}

          {view === 'audit-trail' && <AuditTrail logs={auditLogs} />}

          {view === 'coa-manager' && (
            <AccountManager
              accounts={accounts}
              onSave={onSaveCOA}
              onCancel={() => setView('master-dashboard')}
            />
          )}

          {view === 'import' && (
            <ImportTB accounts={accounts} onImport={journals.importEntries} />
          )}

          {view === 'data' && <DataPage />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
