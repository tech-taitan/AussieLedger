/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calculator,
  LayoutDashboard,
  BookOpen,
  FileSpreadsheet,
  History,
  UploadCloud,
  Building2,
  Landmark,
  Layers,
  HardDriveDownload,
  X,
  Settings,
  CalendarCheck,
  Users,
  ListTree,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { View, Entity } from '../../types';
import { Toast } from '../Toast';

interface AnomalyCounts {
  journals: number;
  accounts: number;
}

interface SidebarProps {
  view: View;
  setView: (v: View) => void;
  activeEntity: Entity | undefined;
  entities: Entity[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  setActiveEntityId: (id: string | null) => void;
  /** Current persona mode; null = not yet set (first-run). */
  mode: 'owner' | 'agent' | null;
  /** Anomaly counts for badge display. */
  anomalyCounts: AnomalyCounts;
  /** Phase 9 UX-06 — invoked when a clickable anomaly badge is clicked. */
  onAnomalyScroll?: (target: 'journals' | 'accounts', cycleIdx: number) => void;
}

function NavButton({
  active,
  onClick,
  icon,
  label,
  badge,
  onBadgeClick,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onBadgeClick?: () => void; // when present, badge becomes a clickable button
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-[var(--ink)] text-white' : 'text-gray-600 hover:bg-gray-100',
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge != null && badge > 0 && (
        onBadgeClick ? (
          <button
            onClick={(e) => { e.stopPropagation(); onBadgeClick(); }}
            className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold hover:bg-red-600"
            data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}-badge`}
          >
            {badge}
          </button>
        ) : (
          <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">
            {badge}
          </span>
        )
      )}
    </button>
  );
}

export function Sidebar({
  view,
  setView,
  activeEntity,
  entities,
  isOpen,
  setIsOpen,
  setActiveEntityId,
  mode,
  anomalyCounts,
  onAnomalyScroll,
}: SidebarProps) {
  const [journalCycleIdx, setJournalCycleIdx] = useState(0);
  const [accountCycleIdx, setAccountCycleIdx] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Reset cycle when navigating away from the relevant view (S.6)
  useEffect(() => {
    if (view !== 'journals') setJournalCycleIdx(0);
    if (view !== 'coa-manager') setAccountCycleIdx(0);
  }, [view]);

  const handleJournalsBadgeClick = () => {
    const total = anomalyCounts.journals;
    if (total === 0) return;
    const next = journalCycleIdx % total;
    setView('journals');
    onAnomalyScroll?.('journals', next);
    setJournalCycleIdx((i) => (i + 1) % total);
    setToast(`Showing anomaly ${next + 1} of ${total} in Journal Entries`);
  };

  const handleAccountsBadgeClick = () => {
    const total = anomalyCounts.accounts;
    if (total === 0) return;
    const next = accountCycleIdx % total;
    setView('coa-manager');
    onAnomalyScroll?.('accounts', next);
    setAccountCycleIdx((i) => (i + 1) % total);
    setToast(`Showing anomaly ${next + 1} of ${total} in Accounts`);
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r border-[var(--line-strong)] flex flex-col bg-white transition-transform duration-300 lg:relative lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="p-6 border-b border-[var(--line-strong)] flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tighter flex items-center gap-2">
              <Calculator className="text-blue-600" />
              LedgerAU
            </h1>
            <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold mt-1">
              Professional Accounting
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* ── Agent mode: top-level "Clients" (replaces Master Dashboard) ── */}
          {mode === 'agent' && (
            <NavButton
              active={view === 'master-dashboard'}
              onClick={() => {
                setView('master-dashboard');
                setActiveEntityId(null);
              }}
              icon={<Users size={18} />}
              label="Clients"
            />
          )}

          {/* ── Legacy / null mode: show Master Dashboard ── */}
          {(mode === null) && (
            <NavButton
              active={view === 'master-dashboard'}
              onClick={() => {
                setView('master-dashboard');
                setActiveEntityId(null);
              }}
              icon={<Layers size={18} />}
              label="Master Dashboard"
            />
          )}

          {/* ── Owner mode: Year-End at top ── */}
          {mode === 'owner' && activeEntity && (
            <NavButton
              active={view === 'year-end'}
              onClick={() => setView('year-end')}
              icon={<CalendarCheck size={18} />}
              label="Year-End"
            />
          )}

          {/* ── Global items for all modes ── */}
          <NavButton
            active={view === 'audit-trail'}
            onClick={() => setView('audit-trail')}
            icon={<History size={18} />}
            label="System Audit"
          />
          <NavButton
            active={view === 'data'}
            onClick={() => setView('data')}
            icon={<HardDriveDownload size={18} />}
            label="Data"
          />
          {/* ── Settings (all modes) ── */}
          <NavButton
            active={view === 'settings'}
            onClick={() => setView('settings')}
            icon={<Settings size={18} />}
            label="Settings"
          />

          {/* ── Entity-scoped items ── */}
          {activeEntity && (
            <>
              <div className="py-2 mt-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-t border-[var(--line)]">
                {activeEntity.name}
              </div>
              <NavButton
                active={view === 'dashboard'}
                onClick={() => setView('dashboard')}
                icon={<LayoutDashboard size={18} />}
                label="Entity Dashboard"
              />
              <NavButton
                active={view === 'journals'}
                onClick={() => setView('journals')}
                icon={<BookOpen size={18} />}
                label="Journal Entries"
                badge={anomalyCounts.journals}
                onBadgeClick={anomalyCounts.journals > 0 ? handleJournalsBadgeClick : undefined}
              />
              <NavButton
                active={view === 'trial-balance'}
                onClick={() => setView('trial-balance')}
                icon={<FileSpreadsheet size={18} />}
                label="Trial Balance"
              />
              <NavButton
                active={view === 'coa-manager'}
                onClick={() => setView('coa-manager')}
                icon={<ListTree size={18} />}
                label="Accounts"
                badge={anomalyCounts.accounts}
                onBadgeClick={anomalyCounts.accounts > 0 ? handleAccountsBadgeClick : undefined}
              />
              <NavButton
                active={view === 'tax-return'}
                onClick={() => setView('tax-return')}
                icon={<Calculator size={18} />}
                label="Tax Assistant"
              />
              <NavButton
                active={view === 'company-tax'}
                onClick={() => setView('company-tax')}
                icon={<Building2 size={18} />}
                label="Company Tax"
              />
              <NavButton
                active={view === 'trust-tax'}
                onClick={() => setView('trust-tax')}
                icon={<Landmark size={18} />}
                label="Trust Tax"
              />
              <NavButton
                active={view === 'bas-ias'}
                onClick={() => setView('bas-ias')}
                icon={<FileSpreadsheet size={18} />}
                label="BAS & IAS"
              />
              <NavButton
                active={view === 'import'}
                onClick={() => setView('import')}
                icon={<UploadCloud size={18} />}
                label="Import TB"
              />
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
