/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef } from 'react';
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
import { PartnershipTaxReturn } from './PartnershipTaxReturn';
import { BasIasAssistant } from './BasIasAssistant';
import { ImportTB } from './ImportTB';
import { EntityForm } from './EntityForm';
import { AuditTrail } from './AuditTrail';
import { AccountManager } from './AccountManager';
import { SoleOwnerStartupWizard } from './wizard/SoleOwnerStartupWizard';
import { FinancialTrendChart } from './FinancialTrendChart';
import { MasterDashboard } from './MasterDashboard';
import { DataPage } from './DataPage';
import { YearEndWizard } from './YearEndWizard';
import { Settings } from './Settings';
import { PersonaModeModal } from './PersonaModeModal';
import { PrivacyPage } from './PrivacyPage';
import { cn } from '../lib/utils';
import { currentFy, today } from '../lib/period';
import type { FyLabel } from '../lib/period';
import { getPrimaryEntityId } from '../lib/persona';
import type { Settings as SettingsType } from '../lib/persona';
import type { View, Entity, Account, AuditLog, AuditAction } from '../types';
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
  /** Appends newly-minted accounts (e.g. from ImportTB "Create new account") to the CoA without nav side-effects. */
  onAppendAccounts?: (newAccounts: Account[]) => void;
  /** Plan 06-3 additions — settings + mode-gated routing */
  settings?: SettingsType | null;
  setSettings?: (s: SettingsType) => void;
  clearSettings?: () => void;
  addLog?: (action: AuditAction, details: string, entityId?: string) => void;
  /** Phase 9 UX-06 — anomaly badge deep-link props (provided by App, wired from Sidebar) */
  scrollToJournalIdx?: number;
  scrollToAccountIdx?: number;
  filterUnbalanced?: boolean;
  filterMissingMappings?: boolean;
  onClearJournalFilter?: () => void;
  onClearAccountFilter?: () => void;
}

// ─── Helper: compute lockedFy for a given entity + date ──────────────────────

/**
 * Returns the FY string if the given entity has it finalised, else undefined.
 * Uses the journal date (if provided) or current FY as context.
 */
function computeLockedFy(
  entity: Entity | undefined,
  journalDate?: string,
): string | undefined {
  if (!entity?.returnStatusByFy) return undefined;
  // Determine the FY from the journal date or current FY
  let fy: FyLabel;
  if (journalDate) {
    // Parse date string and derive FY: AU FY runs Jul 1 → Jun 30
    const d = new Date(journalDate); // date PARSE — allowed by structural-lint
    const year = d.getMonth() >= 6 ? d.getFullYear() + 1 : d.getFullYear();
    fy = `FY${year}` as FyLabel;
  } else {
    fy = currentFy(today());
  }
  return entity.returnStatusByFy[fy] === 'finalised' ? fy : undefined;
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
  filterUnbalanced?: boolean;
  scrollToJournalIdx?: number;
  onClearAnomalyFilter?: () => void;
}

function JournalsView({ journals, filterUnbalanced, scrollToJournalIdx, onClearAnomalyFilter }: JournalsViewProps) {
  const { filteredEntries, searchQuery, setSearchQuery, dateFrom, setDateFrom, dateTo, setDateTo } =
    journals;

  // Unbalanced entries: abs(sumDebits - sumCredits) > 0.005
  const unbalancedEntries = useMemo(() => {
    return filteredEntries.filter((e) => {
      const d = e.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
      const c = e.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
      return Math.abs(d - c) > 0.005;
    });
  }, [filteredEntries]);

  const visibleEntries = filterUnbalanced ? unbalancedEntries : filteredEntries;

  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  useEffect(() => {
    if (scrollToJournalIdx === undefined) return;
    const target = unbalancedEntries[scrollToJournalIdx];
    if (!target) return;
    const el = rowRefs.current.get(target.id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Re-trigger flash via void-reflow trick
    el.classList.remove('anomaly-flash');
    void el.offsetWidth; // synchronous reflow — restarts CSS animation
    el.classList.add('anomaly-flash');
    const t = setTimeout(() => el.classList.remove('anomaly-flash'), 300);
    return () => clearTimeout(t);
  }, [scrollToJournalIdx, unbalancedEntries]);

  return (
    <div className="space-y-4">
      {/* Anomaly filter banner (UX-06) */}
      {filterUnbalanced && (
        <div
          className="flex items-center gap-2 text-xs bg-yellow-50 border border-yellow-200 px-3 py-1.5"
          data-testid="anomaly-filter-banner"
        >
          <span>Filtered to anomalies</span>
          <button
            onClick={onClearAnomalyFilter}
            className="underline text-yellow-800 hover:text-yellow-900"
            data-testid="anomaly-filter-clear"
          >
            Clear filter
          </button>
        </div>
      )}

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
            {visibleEntries.length} entries FOUND
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
                {visibleEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="data-row"
                    ref={(el) => {
                      if (el) rowRefs.current.set(entry.id, el);
                      else rowRefs.current.delete(entry.id);
                    }}
                  >
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
  entityName?: string;
  entityId?: string;
  addLog?: (action: AuditAction, details: string, entityId?: string) => void;
}

function TrialBalanceView({ accounts, journals, entityName, entityId, addLog }: TrialBalanceViewProps) {
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
      <TrialBalance
          accounts={accounts}
          entries={filteredEntries}
          entityName={entityName}
          entityId={entityId}
          addLog={addLog}
          onClearAll={entityId ? journals.clearAllEntries : undefined}
        />
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
  onAppendAccounts,
  settings,
  setSettings,
  clearSettings,
  addLog,
  scrollToJournalIdx,
  scrollToAccountIdx,
  filterUnbalanced,
  filterMissingMappings,
  onClearJournalFilter,
  onClearAccountFilter,
}: ViewRouterProps) {
  const activeEntity = entities.find((e) => e.id === activeEntityId);

  // ── First-run gate: settings not yet set ─────────────────────────────────
  if (settings === null || settings === undefined) {
    if (setSettings) {
      return <PersonaModeModal onComplete={setSettings} />;
    }
  }

  // ── Owner mode auto-select + redirect ────────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!settings) return;
    if (settings.mode === 'owner' && activeEntityId === null && entities.length > 0) {
      const primaryId = getPrimaryEntityId(entities, settings) ?? entities[0].id;
      setActiveEntityId(primaryId);
      if (view !== 'edit-entity') {
        setView('dashboard');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.mode, entities.length, activeEntityId]);

  // ── Owner mode: block master-dashboard, redirect to dashboard ─────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!settings) return;
    if (settings.mode === 'owner' && view === 'master-dashboard') {
      setView('dashboard');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.mode, view]);

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
            lockedFy={computeLockedFy(activeEntity)}
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
          {view === 'master-dashboard' && settings?.mode !== 'owner' && (
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
              onSoleOwnerSetup={() => setView('sole-owner-startup')}
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

          {view === 'journals' && (
            <JournalsView
              journals={journals}
              filterUnbalanced={filterUnbalanced}
              scrollToJournalIdx={scrollToJournalIdx}
              onClearAnomalyFilter={onClearJournalFilter}
            />
          )}

          {view === 'trial-balance' && (
            <TrialBalanceView
              accounts={accounts}
              journals={journals}
              entityName={activeEntity?.name}
              entityId={activeEntity?.id}
              addLog={addLog}
            />
          )}

          {view === 'tax-return' && (
            <TaxReturnAssistant
              entity={activeEntity}
              accounts={accounts}
              entries={journals.filteredEntries}
              onUpdateAccount={onUpdateAccount}
              addLog={addLog}
            />
          )}

          {view === 'company-tax' && (
            <CompanyTaxReturn
              accounts={accounts}
              entries={journals.filteredEntries}
              onUpdateAccount={onUpdateAccount}
            />
          )}

          {view === 'trust-tax' && activeEntity && (
            <TrustTaxReturn
              entity={activeEntity}
              accounts={accounts}
              entries={journals.filteredEntries}
            />
          )}

          {view === 'partnership-tax' && activeEntity && (
            <PartnershipTaxReturn
              entity={activeEntity}
              accounts={accounts}
              entries={journals.filteredEntries}
            />
          )}

          {view === 'bas-ias' && activeEntity && (
            <BasIasAssistant
              entity={activeEntity}
              accounts={accounts}
              entries={journals.filteredEntries}
              addLog={addLog}
            />
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
              filterMissingMappings={filterMissingMappings}
              scrollToAccountIdx={scrollToAccountIdx}
              onClearAnomalyFilter={onClearAccountFilter}
            />
          )}

          {view === 'import' && (
            <ImportTB
              accounts={accounts}
              onImport={journals.importEntries}
              activeEntityId={activeEntityId ?? undefined}
              existingEntries={
                activeEntityId ? (journals.allEntries[activeEntityId] ?? []) : []
              }
              onReplace={journals.supersedeImport}
              onCreateAccounts={onAppendAccounts}
            />
          )}

          {view === 'data' && <DataPage />}

          {view === 'year-end' && activeEntity && (
            <YearEndWizard
              entity={activeEntity}
              accounts={accounts}
              entries={journals.filteredEntries}
              fy={currentFy(today())}
              onUpdateEntity={entityActions.updateEntity}
              onAddLog={(log) => addLog(log.action, log.details ?? '', log.entityId)}
              onNavigateToAccount={() => setView('coa-manager')}
            />
          )}

          {view === 'settings' && setSettings && clearSettings && (
            <Settings
              settings={settings ?? null}
              onChange={setSettings}
              onClearSettings={clearSettings}
              entities={entities}
              activeEntity={activeEntity}
              onEditActiveEntity={() => setView('edit-entity')}
              onAddEntity={() => {
                setActiveEntityId(null);
                setView('edit-entity');
              }}
            />
          )}

          {view === 'privacy' && <PrivacyPage />}

          {view === 'sole-owner-startup' && (
            <SoleOwnerStartupWizard
              onCancel={() => setView('master-dashboard')}
              onCreate={(entity) => {
                void entityActions.createEntity(entity).then(() => {
                  setActiveEntityId(entity.id);
                  setView('dashboard');
                });
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
