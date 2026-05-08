/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  ListTree,
  Briefcase,
  Globe,
  Scale,
  Presentation,
  Search,
  Filter,
  Archive,
  Trash2,
  CheckSquare,
  Square,
  Power
} from 'lucide-react';
import { JournalEntry, Entity, AuditLog, Account } from './types';
import { JournalForm } from './components/JournalForm';
import { TrialBalance } from './components/TrialBalance';
import { TaxReturnAssistant } from './components/TaxReturnAssistant';
import { CompanyTaxReturn } from './components/CompanyTaxReturn';
import { TrustTaxReturn } from './components/TrustTaxReturn';
import { BasIasAssistant } from './components/BasIasAssistant';
import { ImportTB } from './components/ImportTB';
import { SlideGenerator } from './components/SlideGenerator';
import { EntityForm } from './components/EntityForm';
import { FinancialTrendChart } from './components/FinancialTrendChart';
import { AuditTrail } from './components/AuditTrail';
import { AccountManager } from './components/AccountManager';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { CHART_OF_ACCOUNTS } from './constants';

type View = 'master-dashboard' | 'dashboard' | 'journals' | 'trial-balance' | 'tax-return' | 'company-tax' | 'trust-tax' | 'bas-ias' | 'import' | 'slide-generator' | 'edit-entity' | 'audit-trail' | 'coa-manager';

const DEFAULT_ENTITIES: Entity[] = [
  { id: 'ent-1', name: 'Acme Corp Pty Ltd', type: 'Company', registrationNumber: 'ABN 12 345 678 901', businessAddress: '123 Business St, Sydney NSW 2000', contactPerson: 'John Smith', status: 'Active', taxAgentName: 'Sarah Jenkins', taxAgentPhone: '02 9999 8888', taxAgentEmail: 'sarah@taxpro.com.au' },
  { id: 'ent-2', name: 'Smith Family Trust', type: 'Trust', registrationNumber: 'ABN 98 765 432 109', businessAddress: '45 Family Ln, Melbourne VIC 3000', contactPerson: 'Jane Smith', status: 'Active', taxAgentName: 'Sarah Jenkins', taxAgentPhone: '02 9999 8888', taxAgentEmail: 'sarah@taxpro.com.au' },
  { id: 'ent-3', name: 'Tech Innovations', type: 'Company', registrationNumber: 'ABN 45 678 901 234', businessAddress: '101 Innovation Blvd, Brisbane QLD 4000', contactPerson: 'Mike Tech', status: 'Active' },
  { id: 'ent-4', name: 'Pearson Specter Litt', type: 'US Big Law Firm', registrationNumber: 'EIN 12-3456789', businessAddress: '601 Lexington Ave, New York, NY 10022', contactPerson: 'Harvey Specter', status: 'Active' },
];

interface EntityCardProps {
  key?: React.Key;
  entity: Entity;
  isSelected: boolean;
  toggleSelection: (id: string, e?: React.MouseEvent) => void;
  onClick: () => void;
  rev: number;
  exp: number;
  profit: number;
}

function EntityCard({ entity, isSelected, toggleSelection, onClick, rev, exp, profit }: EntityCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div 
      layout
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={cn(
        "bg-white p-6 border transition-all cursor-pointer flex flex-col group relative overflow-hidden",
        isSelected ? "border-indigo-600 ring-1 ring-indigo-600 shadow-md" : "border-[var(--line-strong)] hover:border-[var(--ink)] shadow-sm hover:shadow-md"
      )}
    >
      <div 
        className={cn(
          "absolute top-4 right-4 z-20 p-1 transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={(e) => toggleSelection(entity.id, e)}
      >
        {isSelected ? (
          <CheckSquare size={20} className="text-indigo-600" />
        ) : (
          <Square size={20} className="text-gray-300" />
        )}
      </div>

      <div className="flex justify-between items-start mb-4 pr-6">
        <div>
          <h3 className="font-bold text-lg group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{entity.name}</h3>
          <div className="flex gap-2 items-center mt-1">
            <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{entity.type}</span>
            {entity.status === 'Deactivated' && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-600 rounded-full">Deactivated</span>
            )}
            {entity.registrationNumber && (
              <span className="text-[10px] text-gray-400 font-mono">{entity.registrationNumber}</span>
            )}
          </div>
        </div>
        <div className="p-2 bg-gray-50 rounded-sm">
          {entity.type === 'US Big Law Firm' ? <Scale size={18} className="text-blue-600" /> : 
           entity.type === 'Trust' ? <Briefcase size={18} className="text-emerald-600" /> : 
           <Building2 size={18} className="text-gray-400" />}
        </div>
      </div>
      
      <div className="mb-4 space-y-1">
        {entity.businessAddress && (
          <div className="text-[10px] text-gray-500 flex items-center gap-1">
            <Globe size={10} />
            <span className="truncate">{entity.businessAddress}</span>
          </div>
        )}
        {entity.contactPerson && (
          <div className="text-[10px] text-gray-500 flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-200 flex items-center justify-center text-[8px]">👤</div>
            <span>{entity.contactPerson}</span>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-[var(--line)]">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Net Profit</div>
            <div className={cn(
              "text-xl font-bold font-mono tracking-tighter",
              profit >= 0 ? "text-green-600" : "text-rose-600"
            )}>
              ${profit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
          <motion.div
            animate={{ rotate: isHovered ? 180 : 0 }}
            className="text-gray-300"
          >
            <ArrowUpRight size={14} />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-dashed border-[var(--line)] space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500 uppercase font-bold tracking-wider">Gross Revenue</span>
                <span className="font-mono font-bold text-gray-900">${rev.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500 uppercase font-bold tracking-wider">Total Expenses</span>
                <span className="font-mono font-bold text-rose-500">-${exp.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[11px] pt-1 pt-2 border-t border-gray-50">
                <span className="text-gray-500 uppercase font-bold tracking-wider">Margin</span>
                <span className="font-mono font-bold text-indigo-600">
                  {rev > 0 ? ((profit / rev) * 100).toFixed(1) : "0"}%
                </span>
              </div>
              {entity.notes && (
                <div className="pt-2 border-t border-gray-100 mt-2">
                  <span className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Entity Notes</span>
                  <p className="text-[10px] text-gray-600 mt-0.5 line-clamp-3 italic leading-relaxed">
                    "{entity.notes}"
                  </p>
                </div>
              )}
            </div>
            <button 
              className="mt-6 w-full py-2 bg-[var(--ink)] text-white text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
              onClick={(e) => { e.stopPropagation(); onClick(); }}
            >
              Open Ledger →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!isHovered && (
        <div className="mt-4 text-center opacity-30 group-hover:opacity-100 transition-opacity">
          <span className="text-[9px] font-bold uppercase tracking-tighter text-gray-400">Hover for details</span>
        </div>
      )}
    </motion.div>
  );
};

export default function App() {
  const [view, setView] = useState<View>('master-dashboard');
  const [entities, setEntities] = useState<Entity[]>(DEFAULT_ENTITIES);
  const [accounts, setAccounts] = useState(CHART_OF_ACCOUNTS);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [allEntries, setAllEntries] = useState<Record<string, JournalEntry[]>>({});
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showNewJournal, setShowNewJournal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Close sidebar on view change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [view]);

  // Load data from localStorage
  useEffect(() => {
    const savedEntities = localStorage.getItem('ledger_entities_list');
    if (savedEntities) {
      try {
        setEntities(JSON.parse(savedEntities));
      } catch (e) {
        console.error('Failed to parse saved entities', e);
      }
    }

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

    const savedLogs = localStorage.getItem('ledger_audit_logs');
    if (savedLogs) {
      try {
        setAuditLogs(JSON.parse(savedLogs));
      } catch (e) {
        console.error('Failed to parse saved audit logs', e);
      }
    }

    const savedAccounts = localStorage.getItem('ledger_chart_of_accounts');
    if (savedAccounts) {
      try {
        setAccounts(JSON.parse(savedAccounts));
      } catch (e) {
        console.error('Failed to parse saved accounts', e);
      }
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('ledger_entities_list', JSON.stringify(entities));
  }, [entities]);

  useEffect(() => {
    localStorage.setItem('ledger_chart_of_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('ledger_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    if (Object.keys(allEntries).length > 0) {
      localStorage.setItem('ledger_all_entries', JSON.stringify(allEntries));
    }
  }, [allEntries]);

  const handleUpdateAccount = (updatedAccount: Account) => {
    setAccounts(prev => prev.map(a => a.id === updatedAccount.id ? updatedAccount : a));
    addAuditLog('IMPORT_DATA', `Updated tax mapping for account ${updatedAccount.code} - ${updatedAccount.name}`, '');
  };

  const entries = activeEntityId ? (allEntries[activeEntityId] || []) : [];

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = !searchQuery || 
        entry.reference.toLowerCase().includes(searchQuery.toLowerCase()) || 
        entry.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDateFrom = !dateFrom || entry.date >= dateFrom;
      const matchesDateTo = !dateTo || entry.date <= dateTo;

      return matchesSearch && matchesDateFrom && matchesDateTo;
    });
  }, [entries, searchQuery, dateFrom, dateTo]);

  const toggleEntitySelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedEntityIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkArchive = () => {
    setEntities(prev => prev.map(entity => 
      selectedEntityIds.includes(entity.id) ? { ...entity, status: 'Archived' as const } : entity
    ));
    addAuditLog('UPDATE_ENTITY', `Bulk archived ${selectedEntityIds.length} entities`);
    setSelectedEntityIds([]);
  };

  const handleBulkDeactivate = () => {
    setEntities(prev => prev.map(entity => 
      selectedEntityIds.includes(entity.id) ? { ...entity, status: 'Deactivated' as const } : entity
    ));
    addAuditLog('UPDATE_ENTITY', `Bulk deactivated ${selectedEntityIds.length} entities`);
    setSelectedEntityIds([]);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedEntityIds.length} entities? This action cannot be undone.`)) {
      setEntities(prev => prev.filter(entity => !selectedEntityIds.includes(entity.id)));
      addAuditLog('UPDATE_ENTITY', `Bulk deleted ${selectedEntityIds.length} entities`);
      setSelectedEntityIds([]);
    }
  };

  const addAuditLog = (action: AuditLog['action'], details: string, entityId?: string) => {
    const newLog: AuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user: 'Tristan (Admin)',
      action,
      entityId,
      details
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleSaveEntry = (entry: JournalEntry) => {
    if (!activeEntityId) return;
    setAllEntries(prev => ({
      ...prev,
      [activeEntityId]: [entry, ...(prev[activeEntityId] || [])]
    }));
    setShowNewJournal(false);
    addAuditLog('POST_JOURNAL', `Posted journal entry ${entry.reference}: ${entry.description}`, activeEntityId);
  };

  const handleImport = (newEntries: JournalEntry[]) => {
    if (!activeEntityId) return;
    setAllEntries(prev => ({
      ...prev,
      [activeEntityId]: [...newEntries, ...(prev[activeEntityId] || [])]
    }));
    addAuditLog('IMPORT_DATA', `Imported ${newEntries.length} journal entries via Trial Balance import`, activeEntityId);
  };

  const handleUpdateEntity = (updatedEntity: Entity) => {
    setEntities(prev => prev.map(e => e.id === updatedEntity.id ? updatedEntity : e));
    setView('dashboard');
    addAuditLog('UPDATE_ENTITY', `Updated entity details for ${updatedEntity.name}`, updatedEntity.id);
  };

  const handleCreateEntity = (newEntity: Entity) => {
    setEntities(prev => [...prev, newEntity]);
    setActiveEntityId(newEntity.id);
    setView('dashboard');
    addAuditLog('CREATE_ENTITY', `Created new entity: ${newEntity.name} (${newEntity.type})`, newEntity.id);
  };

  const handleSaveCOA = (updatedAccounts: any[]) => {
    setAccounts(updatedAccounts);
    setView('master-dashboard');
    addAuditLog('IMPORT_DATA', 'Updated Chart of Accounts configuration', '');
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
          <NavButton 
            active={view === 'audit-trail'} 
            onClick={() => setView('audit-trail')} 
            icon={<History size={18} />} 
            label="System Audit" 
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
                    {entities.filter(ent => ent.status !== 'Archived').map(ent => (
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
                  accounts={accounts}
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
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2">
                        <Layers className="text-indigo-600" size={24} />
                        <h2 className="text-2xl font-bold">Master Dashboard</h2>
                      </div>
                      <button 
                        onClick={() => setView('edit-entity')} // Reusing edit-entity view for creation if activeEntityId is null
                        className="bg-[var(--ink)] text-white px-4 py-2 text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                      >
                        <Plus size={18} />
                        Add Entity
                      </button>
                      <button 
                        onClick={() => setView('coa-manager')}
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
                                onClick={handleBulkArchive}
                                className="flex items-center gap-2 text-xs font-bold uppercase text-gray-600 hover:text-indigo-600 transition-colors"
                              >
                                <Archive size={16} />
                                Archive
                              </button>
                              <button 
                                onClick={handleBulkDeactivate}
                                className="flex items-center gap-2 text-xs font-bold uppercase text-gray-600 hover:text-orange-600 transition-colors"
                              >
                                <Power size={16} />
                                Deactivate
                              </button>
                              <button 
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 text-xs font-bold uppercase text-gray-600 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 size={16} />
                                Delete
                              </button>
                            </div>
                            
                            <button 
                               onClick={() => setSelectedEntityIds([])}
                               className="ml-4 text-xs font-bold uppercase text-gray-400 hover:text-[var(--ink)]"
                            >
                              Cancel
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {entities.filter(e => e.status !== 'Archived').map(entity => {
                        const entityEntries = allEntries[entity.id] || [];
                        const isSelected = selectedEntityIds.includes(entity.id);
                        const rev = entityEntries.reduce((sum, e) => sum + e.lines.reduce((ls, l) => {
                          const acc = accounts.find(a => a.id === l.accountId);
                          return acc?.type === 'Revenue' ? ls + (Number(l.credit) - Number(l.debit)) : ls;
                        }, 0), 0);
                        const exp = entityEntries.reduce((sum, e) => sum + e.lines.reduce((ls, l) => {
                          const acc = accounts.find(a => a.id === l.accountId);
                          return acc?.type === 'Expense' ? ls + (Number(l.debit) - Number(l.credit)) : ls;
                        }, 0), 0);
                        const profit = rev - exp;

                        return (
                          <EntityCard 
                            key={entity.id}
                            entity={entity}
                            isSelected={isSelected}
                            toggleSelection={toggleEntitySelection}
                            onClick={() => { setActiveEntityId(entity.id); setView('dashboard'); }}
                            rev={rev}
                            exp={exp}
                            profit={profit}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {view === 'dashboard' && activeEntityId && (
                  <div className="space-y-8">
                    {/* Entity Details Header */}
                    {entities.find(e => e.id === activeEntityId) && (
                      <div className="bg-white border border-[var(--line-strong)] shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h2 className="text-2xl font-bold">{entities.find(e => e.id === activeEntityId)?.name}</h2>
                          <div className="flex gap-3 text-xs text-gray-500 mt-1">
                            <span className="font-bold text-blue-600">{entities.find(e => e.id === activeEntityId)?.type}</span>
                            {entities.find(e => e.id === activeEntityId)?.registrationNumber && (
                              <span>• {entities.find(e => e.id === activeEntityId)?.registrationNumber}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs space-y-1">
                          {entities.find(e => e.id === activeEntityId)?.businessAddress && (
                            <div className="flex items-center md:justify-end gap-1 text-gray-400">
                              <Globe size={12} />
                              <span>{entities.find(e => e.id === activeEntityId)?.businessAddress}</span>
                            </div>
                          )}
                          {entities.find(e => e.id === activeEntityId)?.contactPerson && (
                            <div className="flex items-center md:justify-end gap-1 text-gray-400">
                              <span>Contact: {entities.find(e => e.id === activeEntityId)?.contactPerson}</span>
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
                    )}

                    {/* Entity Notes Dashboard Section */}
                    {entities.find(e => e.id === activeEntityId)?.notes && (
                      <div className="bg-amber-50 border border-amber-200 p-4 shadow-sm relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <BookOpen size={64} />
                        </div>
                        <div className="flex items-center gap-2 mb-2 text-amber-800">
                          <BookOpen size={16} />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Internal Entity Notes</h4>
                        </div>
                        <p className="text-sm text-amber-900 italic font-serif leading-relaxed relative z-10">
                          "{entities.find(e => e.id === activeEntityId)?.notes}"
                        </p>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <StatCard 
                        label="Total Revenue" 
                        value={filteredEntries.reduce((sum, entry) => {
                          return sum + entry.lines.reduce((lSum, line) => {
                            const account = accounts.find(a => a.id === line.accountId);
                            if (account?.type === 'Revenue') return lSum + (Number(line.credit) - Number(line.debit));
                            return lSum;
                          }, 0);
                        }, 0)} 
                        icon={<TrendingUp className="text-green-600" />} 
                        trend="+12% vs last month"
                      />
                      <StatCard 
                        label="Total Expenses" 
                        value={filteredEntries.reduce((sum, entry) => {
                          return sum + entry.lines.reduce((lSum, line) => {
                            const account = accounts.find(a => a.id === line.accountId);
                            if (account?.type === 'Expense') return lSum + (Number(line.debit) - Number(line.credit));
                            return lSum;
                          }, 0);
                        }, 0)} 
                        icon={<ArrowDownRight className="text-red-600" />} 
                        trend="-5% vs last month"
                      />
                      <StatCard 
                        label="Net Profit" 
                        value={filteredEntries.reduce((sum, entry) => {
                          return sum + entry.lines.reduce((lSum, line) => {
                            const account = accounts.find(a => a.id === line.accountId);
                            if (account?.type === 'Revenue') return lSum + (Number(line.credit) - Number(line.debit));
                            if (account?.type === 'Expense') return lSum - (Number(line.debit) - Number(line.credit));
                            return lSum;
                          }, 0);
                        }, 0)} 
                        icon={<ArrowUpRight className="text-blue-600" />} 
                        trend="Healthy margin"
                        highlight
                      />
                    </div>

                    {/* Financial Trend Chart */}
                    <FinancialTrendChart accounts={accounts} entries={filteredEntries} />

                    {/* Filter Bar */}
                    <div className="bg-white border border-[var(--line-strong)] p-4 flex flex-col sm:flex-row gap-4 items-end sm:items-center">
                      <div className="flex-1 w-full">
                        <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Search Entries</label>
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
                        <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">From Date</label>
                        <input 
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 border border-[var(--line)] text-sm focus:outline-none focus:border-[var(--ink)]"
                        />
                      </div>
                      <div className="w-full sm:w-auto">
                        <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">To Date</label>
                        <input 
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 border border-[var(--line)] text-sm focus:outline-none focus:border-[var(--ink)]"
                        />
                      </div>
                      {(searchQuery || dateFrom || dateTo) && (
                        <button 
                          onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo(''); }}
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
                          {searchQuery || dateFrom || dateTo ? 'Matching Journal Entries' : 'Recent Journal Entries'}
                        </h3>
                        <History size={16} className="text-gray-400" />
                      </div>
                      <div className="divide-y divide-[var(--line)]">
                        {filteredEntries.length === 0 ? (
                          <div className="p-12 text-center text-gray-400 italic">
                            No entries found matching filters.
                          </div>
                        ) : (
                          filteredEntries.slice(0, (searchQuery || dateFrom || dateTo) ? 20 : 5).map(entry => (
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
                          onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo(''); }}
                          className="text-xs text-rose-600 font-medium hover:underline pb-2 px-2"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="bg-white border border-[var(--line-strong)] shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-[var(--line-strong)] flex justify-between items-center">
                        <h3 className="col-header">Journal Ledger</h3>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{filteredEntries.length} entries FOUND</span>
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
                              {filteredEntries.map(entry => (
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
                </div>
              )}

                {view === 'trial-balance' && (
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
                          onClick={() => { setDateFrom(''); setDateTo(''); }}
                          className="text-xs text-rose-600 font-medium"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <TrialBalance accounts={accounts} entries={filteredEntries} />
                  </div>
                )}
                {view === 'tax-return' && <TaxReturnAssistant accounts={accounts} entries={filteredEntries} onUpdateAccount={handleUpdateAccount} />}
                {view === 'company-tax' && <CompanyTaxReturn accounts={accounts} entries={filteredEntries} onUpdateAccount={handleUpdateAccount} />}
                {view === 'trust-tax' && <TrustTaxReturn accounts={accounts} entries={filteredEntries} onUpdateAccount={handleUpdateAccount} />}
                {view === 'bas-ias' && <BasIasAssistant accounts={accounts} entries={filteredEntries} />}
                {view === 'slide-generator' && activeEntityId && (
                  <SlideGenerator 
                    accounts={accounts}
                    entries={filteredEntries} 
                    entity={entities.find(e => e.id === activeEntityId)!} 
                  />
                )}
                {view === 'edit-entity' && (
                  <EntityForm 
                    entity={activeEntityId ? entities.find(e => e.id === activeEntityId) : undefined}
                    onSave={activeEntityId ? handleUpdateEntity : handleCreateEntity}
                    onCancel={() => activeEntityId ? setView('dashboard') : setView('master-dashboard')}
                  />
                )}
                {view === 'audit-trail' && <AuditTrail logs={auditLogs} />}
                {view === 'coa-manager' && (
                  <AccountManager 
                    accounts={accounts} 
                    onSave={handleSaveCOA} 
                    onCancel={() => setView('master-dashboard')} 
                  />
                )}
                {view === 'import' && <ImportTB accounts={accounts} onImport={handleImport} />}
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
