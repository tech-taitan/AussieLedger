/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileSpreadsheet, 
  Calculator, 
  Plus,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  History,
  UploadCloud,
  Building2,
  Landmark,
  Menu,
  X,
  Layers,
  Briefcase,
  Globe,
  Scale,
  Presentation
} from 'lucide-react';
import { JournalEntry, Entity } from './types';
import { JournalForm } from './components/JournalForm';
import { TrialBalance } from './components/TrialBalance';
import { TaxReturnAssistant } from './components/TaxReturnAssistant';
import { CompanyTaxReturn } from './components/CompanyTaxReturn';
import { TrustTaxReturn } from './components/TrustTaxReturn';
import { BasIasAssistant } from './components/BasIasAssistant';
import { ImportTB } from './components/ImportTB';
import { SlideGenerator } from './components/SlideGenerator';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

type View = 'master-dashboard' | 'dashboard' | 'journals' | 'trial-balance' | 'tax-return' | 'company-tax' | 'trust-tax' | 'bas-ias' | 'import' | 'slide-generator';

const DEFAULT_ENTITIES: Entity[] = [
  { id: 'ent-1', name: 'Acme Corp Pty Ltd', type: 'Company' },
  { id: 'ent-2', name: 'Smith Family Trust', type: 'Trust' },
  { id: 'ent-3', name: 'Tech Innovations', type: 'Company' },
  { id: 'ent-4', name: 'Pearson Specter Litt', type: 'US Big Law Firm' },
];

export default function App() {
  const [view, setView] = useState<View>('master-dashboard');
  const [entities] = useState<Entity[]>(DEFAULT_ENTITIES);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [allEntries, setAllEntries] = useState<Record<string, JournalEntry[]>>({});
  const [showNewJournal, setShowNewJournal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on view change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [view]);

  // Load data from localStorage
  useEffect(() => {
    const savedAll = localStorage.getItem('ledger_all_entries');
    if (savedAll) {
      try {
        setAllEntries(JSON.parse(savedAll));
      } catch (e) {
        console.error('Failed to parse saved all entries', e);
      }
    } else {
      const saved = localStorage.getItem('ledger_entries');
      if (saved) {
        try {
          setAllEntries({ 'ent-1': JSON.parse(saved) });
        } catch (e) {
          console.error('Failed to parse saved entries', e);
        }
      }
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    if (Object.keys(allEntries).length > 0) {
      localStorage.setItem('ledger_all_entries', JSON.stringify(allEntries));
    }
  }, [allEntries]);

  const entries = activeEntityId ? (allEntries[activeEntityId] || []) : [];

  const handleSaveEntry = (entry: JournalEntry) => {
    if (!activeEntityId) return;
    setAllEntries(prev => ({
      ...prev,
      [activeEntityId]: [entry, ...(prev[activeEntityId] || [])]
    }));
    setShowNewJournal(false);
  };

  const handleImport = (newEntries: JournalEntry[]) => {
    if (!activeEntityId) return;
    setAllEntries(prev => ({
      ...prev,
      [activeEntityId]: [...newEntries, ...(prev[activeEntityId] || [])]
    }));
  };

  const totalRevenue = entries.reduce((sum, entry) => {
    return sum + entry.lines.reduce((lSum, line) => {
      if (line.accountId.startsWith('4-')) return lSum + (Number(line.credit) - Number(line.debit));
      return lSum;
    }, 0);
  }, 0);

  const totalExpenses = entries.reduce((sum, entry) => {
    return sum + entry.lines.reduce((lSum, line) => {
      if (line.accountId.startsWith('6-')) return lSum + (Number(line.debit) - Number(line.credit));
      return lSum;
    }, 0);
  }, 0);

  const netProfit = totalRevenue - totalExpenses;

  return (
    <div className="min-h-screen flex bg-[var(--bg)] relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r border-[var(--line-strong)] flex flex-col bg-white transition-transform duration-300 lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-[var(--line-strong)] flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tighter flex items-center gap-2">
              <Calculator className="text-blue-600" />
              LedgerAU
            </h1>
            <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold mt-1">Professional Accounting</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <NavButton 
            active={view === 'master-dashboard'} 
            onClick={() => { setView('master-dashboard'); setActiveEntityId(null); }} 
            icon={<Layers size={18} />} 
            label="Master Dashboard" 
          />
          {activeEntityId && (
            <>
              <div className="py-2 mt-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-t border-[var(--line)]">
                {entities.find(e => e.id === activeEntityId)?.name}
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
              />
              <NavButton 
                active={view === 'trial-balance'} 
                onClick={() => setView('trial-balance')} 
                icon={<FileSpreadsheet size={18} />} 
                label="Trial Balance" 
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
                active={view === 'slide-generator'} 
                onClick={() => setView('slide-generator')} 
                icon={<Presentation size={18} />} 
                label="Slide Generator" 
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

        <div className="p-4 border-t border-[var(--line)]">
          <div className="text-[10px] text-gray-400 uppercase font-bold mb-2">Accountant Mode</div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Connected to ATO (Simulated)
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden pb-16 lg:pb-0">
        <header className="h-16 border-b border-[var(--line-strong)] bg-white flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-md"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider hidden sm:block">
                {view.replace('-', ' ')}
              </h2>
              {view !== 'master-dashboard' && (
                <>
                  <span className="text-gray-300 hidden sm:block">/</span>
                  <select
                    value={activeEntityId || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setActiveEntityId(e.target.value);
                        if (view === 'master-dashboard') setView('dashboard');
                      } else {
                        setActiveEntityId(null);
                        setView('master-dashboard');
                      }
                    }}
                    className="text-sm font-bold bg-transparent border-none focus:ring-0 cursor-pointer hover:bg-gray-50 p-1 rounded outline-none"
                  >
                    <option value="" disabled>Select Entity</option>
                    {entities.map(ent => (
                      <option key={ent.id} value={ent.id}>{ent.name}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {activeEntityId && view !== 'master-dashboard' && (
              <button 
                onClick={() => setShowNewJournal(true)}
                className="bg-[var(--ink)] text-white px-3 lg:px-4 py-2 text-xs lg:text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity rounded-sm"
              >
                <Plus size={16} /> <span className="hidden sm:inline">New Entry</span>
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <AnimatePresence mode="wait">
            {showNewJournal ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <JournalForm 
                  onSave={handleSaveEntry} 
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
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Layers className="text-indigo-600" size={24} />
                      <h2 className="text-2xl font-bold">Master Dashboard</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                      {entities.map(entity => {
                        const entityEntries = allEntries[entity.id] || [];
                        const rev = entityEntries.reduce((sum, e) => sum + e.lines.reduce((ls, l) => l.accountId.startsWith('4-') ? ls + (Number(l.credit) - Number(l.debit)) : ls, 0), 0);
                        const exp = entityEntries.reduce((sum, e) => sum + e.lines.reduce((ls, l) => l.accountId.startsWith('6-') ? ls + (Number(l.debit) - Number(l.credit)) : ls, 0), 0);
                        const profit = rev - exp;

                        return (
                          <div 
                            key={entity.id} 
                            className="bg-white p-6 border border-[var(--line-strong)] shadow-sm hover:border-[var(--ink)] transition-colors cursor-pointer flex flex-col group"
                            onClick={() => { setActiveEntityId(entity.id); setView('dashboard'); }}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-bold text-lg group-hover:underline">{entity.name}</h3>
                                <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full mt-2 inline-block">{entity.type}</span>
                              </div>
                              {entity.type === 'US Big Law Firm' ? <Scale className="text-blue-600" /> : 
                               entity.type === 'Trust' ? <Briefcase className="text-emerald-600" /> : 
                               <Building2 className="text-gray-400" />}
                            </div>
                            <div className="mt-auto space-y-3 pt-4 border-t border-[var(--line)]">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Revenue</span>
                                <span className="font-medium data-value">${rev.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Expenses</span>
                                <span className="font-medium data-value">${exp.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-sm font-bold pt-2 border-t border-[var(--line)]">
                                <span>Net Profit</span>
                                <span className={`data-value ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                            <button className="mt-6 w-full py-2 bg-gray-50 group-hover:bg-[var(--ink)] group-hover:text-white text-sm font-medium border border-[var(--line)] transition-colors">
                              Manage Entity
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {view === 'dashboard' && (
                  <div className="space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <StatCard 
                        label="Total Revenue" 
                        value={totalRevenue} 
                        icon={<TrendingUp className="text-green-600" />} 
                        trend="+12% vs last month"
                      />
                      <StatCard 
                        label="Total Expenses" 
                        value={totalExpenses} 
                        icon={<ArrowDownRight className="text-red-600" />} 
                        trend="-5% vs last month"
                      />
                      <StatCard 
                        label="Net Profit" 
                        value={netProfit} 
                        icon={<ArrowUpRight className="text-blue-600" />} 
                        trend="Healthy margin"
                        highlight
                      />
                    </div>

                    {/* Recent Entries */}
                    <div className="bg-white border border-[var(--line-strong)] shadow-sm">
                      <div className="p-4 border-b border-[var(--line)] flex justify-between items-center">
                        <h3 className="col-header">Recent Journal Entries</h3>
                        <History size={16} className="text-gray-400" />
                      </div>
                      <div className="divide-y divide-[var(--line)]">
                        {entries.length === 0 ? (
                          <div className="p-12 text-center text-gray-400 italic">
                            No entries found. Create your first journal to see data.
                          </div>
                        ) : (
                          entries.slice(0, 5).map(entry => (
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
                )}

                {view === 'journals' && (
                  <div className="bg-white border border-[var(--line-strong)] shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-[var(--line-strong)]">
                      <h3 className="col-header">All Journal Entries</h3>
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
                            {entries.map(entry => (
                              <tr key={entry.id} className="data-row">
                                <td className="p-4 data-value whitespace-nowrap">{entry.date}</td>
                                <td className="p-4 font-medium whitespace-nowrap">{entry.reference}</td>
                                <td className="p-4 text-gray-600 hidden md:table-cell">{entry.description}</td>
                                <td className="p-4 text-right data-value font-bold whitespace-nowrap">
                                  ${entry.lines.reduce((s, l) => s + (l.debit || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 text-center hidden sm:table-cell">
                                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">Posted</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {view === 'trial-balance' && <TrialBalance entries={entries} />}
                {view === 'tax-return' && <TaxReturnAssistant entries={entries} />}
                {view === 'company-tax' && <CompanyTaxReturn entries={entries} />}
                {view === 'trust-tax' && <TrustTaxReturn entries={entries} />}
                {view === 'bas-ias' && <BasIasAssistant entries={entries} />}
                {view === 'slide-generator' && activeEntityId && (
                  <SlideGenerator 
                    entries={entries} 
                    entity={entities.find(e => e.id === activeEntityId)!} 
                  />
                )}
                {view === 'import' && <ImportTB onImport={handleImport} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[var(--line-strong)] h-16 flex items-center justify-around px-2 z-40">
        <MobileNavButton 
          active={view === 'master-dashboard'} 
          onClick={() => { setView('master-dashboard'); setActiveEntityId(null); }} 
          icon={<Layers size={20} />} 
          label="Master" 
        />
        {activeEntityId && (
          <>
            <MobileNavButton 
              active={view === 'dashboard'} 
              onClick={() => setView('dashboard')} 
              icon={<LayoutDashboard size={20} />} 
              label="Entity" 
            />
            <MobileNavButton 
              active={view === 'journals'} 
              onClick={() => setView('journals')} 
              icon={<BookOpen size={20} />} 
              label="Journals" 
            />
            <MobileNavButton 
              active={view === 'trial-balance'} 
              onClick={() => setView('trial-balance')} 
              icon={<FileSpreadsheet size={20} />} 
              label="TB" 
            />
          </>
        )}
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="flex flex-col items-center gap-1 text-gray-500"
        >
          <Menu size={20} />
          <span className="text-[10px] font-bold uppercase">More</span>
        </button>
      </nav>
    </div>
  );
}

function MobileNavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-colors",
        active ? "text-blue-600" : "text-gray-500"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase">{label}</span>
    </button>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors",
        active 
          ? "bg-[var(--ink)] text-white" 
          : "text-gray-600 hover:bg-gray-100"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ label, value, icon, trend, highlight }: { label: string, value: number, icon: React.ReactNode, trend: string, highlight?: boolean }) {
  return (
    <div className={cn(
      "p-6 border border-[var(--line-strong)] shadow-sm",
      highlight ? "bg-white ring-2 ring-[var(--ink)]" : "bg-white"
    )}>
      <div className="flex justify-between items-start mb-4">
        <span className="col-header">{label}</span>
        {icon}
      </div>
      <div className="text-3xl font-bold data-value mb-2">
        ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </div>
      <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
        {trend}
      </div>
    </div>
  );
}
